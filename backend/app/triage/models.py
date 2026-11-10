import datetime
import json
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    records = relationship("TriageRecord", back_populates="owner")

class TriageRecord(Base):
    __tablename__ = "triage_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    message = Column(Text, nullable=False)
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    duration_days = Column(Integer, nullable=True)
    
    urgency_level = Column(String(50), nullable=False)
    recommended_timeframe = Column(String(100), nullable=False)
    recommended_next_action = Column(Text, nullable=False)
    rationale = Column(Text, nullable=False)
    clarifying_questions_json = Column(Text, default="[]")
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="records")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "message": self.message,
            "age": self.age,
            "gender": self.gender,
            "duration_days": self.duration_days,
            "urgency_level": self.urgency_level,
            "recommended_timeframe": self.recommended_timeframe,
            "recommended_next_action": self.recommended_next_action,
            "rationale": self.rationale,
            "clarifying_questions": json.loads(self.clarifying_questions_json or "[]"),
            "created_at": self.created_at.isoformat() if self.created_at else None
        }