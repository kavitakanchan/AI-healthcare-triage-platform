import json
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.database import engine, Base, get_db
from app.triage.schemas import SymptomInput, TriageAssessment
from app.triage.service import run_triage_assessment
from app.triage.models import User, TriageRecord
from app.auth import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    SECRET_KEY, 
    ALGORITHM
)

# Initialize database tables
Base.metadata.create_all(bind=engine, checkfirst=True)

app = FastAPI(
    title="AI Healthcare Access Triage Platform",
    description="Safety-first clinical triage backend avoiding medical diagnosis",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic auth schemas
class UserAuth(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    email: str

# Optional authentication dependency for triage submission
security = HTTPBearer(auto_error=False)

def get_optional_user_id(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[int]:
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")
        return int(user_id_str) if user_id_str else None
    except JWTError:
        return None

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "triage-backend"}

# --- AUTH ROUTES ---
@app.post("/api/v1/auth/signup", response_model=TokenResponse)
def signup(payload: UserAuth, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email is already registered.")
    
    new_user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    token = create_access_token(data={"sub": str(new_user.id)})
    return {"access_token": token, "token_type": "bearer", "email": new_user.email}

@app.post("/api/v1/auth/login", response_model=TokenResponse)
def login(payload: UserAuth, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    
    token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "email": user.email}

# --- TRIAGE ROUTES ---
@app.post("/api/v1/triage", response_model=TriageAssessment)
def triage_endpoint(
    payload: SymptomInput, 
    user_id: Optional[int] = Depends(get_optional_user_id), 
    db: Session = Depends(get_db)
):
    assessment = run_triage_assessment(payload)

    db_record = TriageRecord(
        user_id=user_id,
        message=payload.message,
        age=payload.age,
        gender=payload.gender,
        duration_days=payload.duration_days,
        urgency_level=assessment.urgency_level.value if hasattr(assessment.urgency_level, 'value') else str(assessment.urgency_level),
        recommended_timeframe=assessment.recommended_timeframe,
        recommended_next_action=assessment.recommended_next_action,
        rationale=assessment.rationale,
        clarifying_questions_json=json.dumps(assessment.clarifying_questions or []),
    )
    db.add(db_record)
    db.commit()
    db.refresh(db_record)

    return assessment

@app.get("/api/v1/triage/history")
def get_triage_history(
    user_id: Optional[int] = Depends(get_optional_user_id),
    db: Session = Depends(get_db)
):
    query = db.query(TriageRecord)
    if user_id:
        # Fetch only records belonging to the authenticated user
        query = query.filter(TriageRecord.user_id == user_id)
    else:
        # Fetch unauthenticated / guest records
        query = query.filter(TriageRecord.user_id.is_(None))

    records = query.order_by(TriageRecord.created_at.desc()).limit(30).all()
    return [r.to_dict() for r in records]

@app.delete("/api/v1/triage/history/{record_id}")
def delete_triage_record(
    record_id: int,
    user_id: Optional[int] = Depends(get_optional_user_id),
    db: Session = Depends(get_db)
):
    record = db.query(TriageRecord).filter(TriageRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found.")

    # Restrict deletion: authenticated users can only delete their own records
    if record.user_id is not None and record.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized to delete this record.")

    db.delete(record)
    db.commit()
    return {"message": "Record deleted successfully", "id": record_id}