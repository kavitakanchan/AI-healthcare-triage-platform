# AI-Powered Healthcare Access & Triage Platform

A full-stack clinical care navigation and symptom triage platform designed to assess patient symptoms, prioritize medical emergencies, provide supportive self-care guidance, and maintain isolated medical assessment histories.

---

## Key Features

- **Hybrid Triage Intelligence**:
  - **Deterministic Rule Engine**: Instantly flags red-flag symptoms (cardiac events, severe respiratory distress, acute trauma) with zero AI latency, directing users to emergency services (112 / 108).
  - **Generative AI Assessment**: Routine and non-emergency cases are analyzed using Google Gemini to provide home-care steps, evaluation timelines, and clinical consultation questions.
- **Role Isolation & Security**: User sessions are isolated with JWT authentication, and passwords are protected using PBKDF2 hashing.
- **Patient History & Record Management**: Searchable and filterable assessment logs with full deletion control.
- **Printable Medical Summaries**: Clean, dedicated print formatting for physical clinical handoffs.
- **Automated Test Suite**: Tested with Pytest covering triage logic, authorization boundaries, and API reliability.

---

## Tech Stack

- **Frontend**: React, Vite, Lucide Icons, Axios
- **Backend**: FastAPI (Python), Pydantic
- **Database & ORM**: SQLite, SQLAlchemy
- **Authentication**: JWT, Passlib (PBKDF2)
- **AI Integration**: Google GenAI SDK (Gemini API)
- **Testing**: Pytest, HTTPX, FastAPI TestClient

---

## Getting Started

### 1. Prerequisites
- Python 3.10+
- Node.js 18+

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate
pip install -r requirements.txt


## ⚡ Quick Start Guide (Run Project Locally)

Ensure you have **Python (3.10+)** and **Node.js (18+)** installed.

### Step 1: Start Backend Server
Open a terminal in the project root directory and run:

```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

# Install all backend dependencies in one go
pip install fastapi uvicorn sqlalchemy pydantic passlib bcrypt python-jose google-genai pytest httpx

# (Optional) Add your Gemini API key if testing routine AI guidance:
# Create a .env file inside the 'backend' folder and add:
# GEMINI_API_KEY=your_gemini_api_key_here

# Start the API server
uvicorn app.main:app --reload

#For Frontened
cd frontend
npm install
npm run dev

#For Automated Test Suite
cd backend
pytest -v test_triage.py
