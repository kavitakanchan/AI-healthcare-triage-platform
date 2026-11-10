from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class UrgencyLevel(str, Enum):
    EMERGENCY = "EMERGENCY"
    URGENT_CLINIC = "URGENT_CLINIC"
    ROUTINE = "ROUTINE"
    SELF_CARE = "SELF_CARE"


class SymptomInput(BaseModel):
    message: str = Field(..., description="Patient symptom narrative")
    age: Optional[int] = Field(None, ge=0, le=120)
    gender: Optional[str] = Field(None)
    duration_days: Optional[int] = Field(None, ge=0)


class TriageAssessment(BaseModel):
    urgency_level: UrgencyLevel
    rationale: str = Field(..., description="Non-diagnostic explanation")
    recommended_timeframe: str = Field(..., description="Action timeframe")
    is_red_flag: bool = Field(default=False)
    recommended_next_action: str = Field(..., description="Where to seek care")
    clarifying_questions: List[str] = Field(default_factory=list)