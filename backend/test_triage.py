import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.triage.schemas import SymptomInput, UrgencyLevel
from app.triage.service import run_triage_assessment

TEST_DB_FILE = "test_temp.db"
SQLALCHEMY_TEST_DATABASE_URL = f"sqlite:///./{TEST_DB_FILE}"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_and_teardown_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except OSError:
            pass


# ==========================================
# 1. UNIT TESTS: RULE ENGINE EVALUATION
# ==========================================

def test_rule_engine_chest_pain_emergency():
    """Verify red-flag keywords trigger EMERGENCY deterministically"""
    payload = SymptomInput(
        message="Severe chest pain radiating to left arm and shortness of breath",
        age=45,
        gender="male",
        duration_days=1
    )
    assessment = run_triage_assessment(payload)
    assert assessment.urgency_level == UrgencyLevel.EMERGENCY
    assert "Immediate" in assessment.recommended_timeframe


def test_rule_engine_mild_symptoms_self_care():
    """Verify non-emergency symptoms evaluate safely without red flags"""
    payload = SymptomInput(
        message="Mild runny nose and scratchy throat",
        age=22,
        gender="female",
        duration_days=2
    )
    assessment = run_triage_assessment(payload)
    assert assessment.urgency_level in [UrgencyLevel.SELF_CARE, UrgencyLevel.ROUTINE]
    assert assessment.rationale != ""


# ==========================================
# 2. INTEGRATION TESTS: AUTH & API ENDPOINTS
# ==========================================

def test_user_signup_and_login():
    """Verify user registration and JWT token issue"""
    user_data = {"email": "doctor@hospital.com", "password": "SecurePassword123!"}
    
    # 1. Sign Up
    signup_res = client.post("/api/v1/auth/signup", json=user_data)
    assert signup_res.status_code == 200
    assert "access_token" in signup_res.json()
    assert signup_res.json()["email"] == user_data["email"]

    # 2. Duplicate prevention
    dup_res = client.post("/api/v1/auth/signup", json=user_data)
    assert dup_res.status_code == 400

    # 3. Login
    login_res = client.post("/api/v1/auth/login", json=user_data)
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_authenticated_triage_and_history_isolation():
    """Verify triage submissions are saved and isolated per user"""
    # Create User A
    user_a = {"email": "userA@test.com", "password": "PassWordA123!"}
    res_a = client.post("/api/v1/auth/signup", json=user_a)
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Create User B
    user_b = {"email": "userB@test.com", "password": "PassWordB123!"}
    res_b = client.post("/api/v1/auth/signup", json=user_b)
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A submits symptoms
    triage_payload = {
        "message": "Persistent dry cough for 3 days",
        "age": 28,
        "gender": "female",
        "duration_days": 3
    }
    submit_res = client.post("/api/v1/triage", json=triage_payload, headers=headers_a)
    assert submit_res.status_code == 200

    # User A fetches history -> should contain 1 record
    history_a = client.get("/api/v1/triage/history", headers=headers_a)
    assert history_a.status_code == 200
    assert len(history_a.json()) == 1
    record_id = history_a.json()[0]["id"]

    # User B fetches history -> should be 0 records (isolated)
    history_b = client.get("/api/v1/triage/history", headers=headers_b)
    assert history_b.status_code == 200
    assert len(history_b.json()) == 0

    # User B attempts to delete User A's record -> Unauthorized (403)
    del_unauth = client.delete(f"/api/v1/triage/history/{record_id}", headers=headers_b)
    assert del_unauth.status_code == 403

    # User A deletes their own record -> Success (200)
    del_auth = client.delete(f"/api/v1/triage/history/{record_id}", headers=headers_a)
    assert del_auth.status_code == 200

    # History now empty
    history_after = client.get("/api/v1/triage/history", headers=headers_a)
    assert len(history_after.json()) == 0