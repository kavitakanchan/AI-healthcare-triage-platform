import os
import re
import json
import time
from typing import Optional
from app.triage.schemas import SymptomInput, TriageAssessment, UrgencyLevel
from google import genai
from google.genai import types
from google.genai.errors import ServerError

# 1. Immediate Safety Filter
RED_FLAGS = [
    r"\bchest pain\b",
    r"\bheart attack\b",
    r"\bdifficulty breathing\b",
    r"\bcan't breathe\b",
    r"\bcoughing blood\b",
    r"\bsudden numbness\b",
    r"\bsudden weakness\b",
    r"\bfacial drooping\b",
    r"\bunconscious\b",
    r"\bsevere head injury\b",
    r"\bpoison\b",
]

TRIAGE_SYSTEM_PROMPT = """
You are a Medical Triage Assistant. You evaluate urgency and direct patients to appropriate care.
NEVER DIAGNOSE. Do not mention specific disease or condition names.

Classify urgency into strictly one of these 4 values:
- EMERGENCY (immediate danger, life-threat)
- URGENT_CLINIC (needs medical evaluation within 12-24 hours)
- ROUTINE (non-acute issue, scheduled clinic visit)
- SELF_CARE (mild, self-limiting issue safe for home care)

Return valid JSON with these exact keys:
{
  "urgency_level": "EMERGENCY" | "URGENT_CLINIC" | "ROUTINE" | "SELF_CARE",
  "rationale": "non-diagnostic explanation",
  "recommended_timeframe": "timeframe string",
  "is_red_flag": false,
  "recommended_next_action": "action to take",
  "clarifying_questions": []
}
"""


def check_deterministic_red_flags(text: str) -> Optional[TriageAssessment]:
    lowered = text.lower()
    for pattern in RED_FLAGS:
        if re.search(pattern, lowered):
            return TriageAssessment(
                urgency_level=UrgencyLevel.EMERGENCY,
                rationale="Critical warning symptoms detected that require immediate emergency evaluation.",
                recommended_timeframe="Immediate (Now)",
                is_red_flag=True,
                recommended_next_action="Call emergency services (108/112) or reach the nearest emergency hospital immediately.",
                clarifying_questions=[]
            )
    return None


def run_triage_assessment(user_input: SymptomInput) -> TriageAssessment:
    # 1. Deterministic instant check
    immediate_alert = check_deterministic_red_flags(user_input.message)
    if immediate_alert:
        return immediate_alert

    # 2. AI Assessment
    api_key  = os.getenv("GEMINI_API_KEY", "")
    client = genai.Client(api_key=api_key)

    patient_context = (
        f"Patient Age: {user_input.age or 'Not provided'}, "
        f"Gender: {user_input.gender or 'Not provided'}, "
        f"Duration: {user_input.duration_days or 'Unknown'} days.\n"
        f"Symptom: {user_input.message}"
    )

    # Retry loop to handle temporary 503 traffic spikes smoothly
    response = None
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model="gemini-3.5-flash-lite",
                contents=patient_context,
                config=types.GenerateContentConfig(
                    system_instruction=TRIAGE_SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )
            break
        except ServerError:
            if attempt < 2:
                time.sleep(2)  # Wait 2 seconds and retry
            else:
                raise

    clean_text = response.text.strip()
    if clean_text.startswith("```json"):
        clean_text = clean_text[7:]
    if clean_text.startswith("```"):
        clean_text = clean_text[3:]
    if clean_text.endswith("```"):
        clean_text = clean_text[:-3]

    data = json.loads(clean_text.strip())

    # Map keys in case model returned alternate naming
    if "urgency_tier" in data and "urgency_level" not in data:
        data["urgency_level"] = data.pop("urgency_tier")

    return TriageAssessment(**data)