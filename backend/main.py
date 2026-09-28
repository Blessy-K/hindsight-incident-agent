import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from hindsight_client import Hindsight
from groq import AsyncGroq


load_dotenv()


HINDSIGHT_API_KEY = os.getenv("HINDSIGHT_API_KEY")
HINDSIGHT_API_URL = os.getenv(
    "HINDSIGHT_API_URL",
    "https://api.hindsight.vectorize.io"
)
HINDSIGHT_BANK_ID = os.getenv(
    "HINDSIGHT_BANK_ID",
    "incident-memory"
)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")


if not HINDSIGHT_API_KEY:
    raise RuntimeError("HINDSIGHT_API_KEY is missing from .env")

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is missing from .env")


hindsight = Hindsight(
    base_url=HINDSIGHT_API_URL,
    api_key=HINDSIGHT_API_KEY
)

groq = AsyncGroq(api_key=GROQ_API_KEY)


app = FastAPI(
    title="RecallOps",
    description="AI incident response powered by persistent Hindsight memory",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://hindsight-incident-agent.vercel.app",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------
# Request models
# -----------------------------

class Incident(BaseModel):
    incident_id: str
    service: str
    environment: str
    deployment: str
    symptoms: str
    investigation: str
    root_cause: str
    attempted_actions: str
    successful_resolution: str
    lesson: str


class RecallRequest(BaseModel):
    query: str


class AnalyzeRequest(BaseModel):
    incident: str
    use_memory: bool = True


# -----------------------------
# Root endpoint
# -----------------------------

@app.get("/")
async def root():
    return {
        "message": "RecallOps is running",
        "memory": "Hindsight",
        "ai": "Groq",
        "bank_id": HINDSIGHT_BANK_ID
    }


# -----------------------------
# Store incident in Hindsight
# -----------------------------

@app.post("/incidents")
async def store_incident(incident: Incident):

    incident_memory = f"""
Production Incident {incident.incident_id}

Service: {incident.service}
Environment: {incident.environment}
Deployment: {incident.deployment}

Symptoms:
{incident.symptoms}

Investigation:
{incident.investigation}

Root Cause:
{incident.root_cause}

Actions Attempted:
{incident.attempted_actions}

Successful Resolution:
{incident.successful_resolution}

Lesson Learned:
{incident.lesson}
"""

    try:
        result = await hindsight.aretain(
            bank_id=HINDSIGHT_BANK_ID,
            content=incident_memory,
            context="production incident response"
        )

        return {
            "success": True,
            "message": "Incident stored in Hindsight memory",
            "incident_id": incident.incident_id,
            "hindsight_response": str(result)
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to store incident: {str(e)}"
        )


# -----------------------------
# Recall organizational memory
# -----------------------------

@app.post("/incidents/recall")
async def recall_incident(request: RecallRequest):

    try:
        result = await hindsight.arecall(
            bank_id=HINDSIGHT_BANK_ID,
            query=request.query
        )

        return {
            "success": True,
            "query": request.query,
            "memories": str(result)
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to recall memory: {str(e)}"
        )


# -----------------------------
# Analyze incident
# -----------------------------

@app.post("/incidents/analyze")
async def analyze_incident(request: AnalyzeRequest):

    try:

        # -----------------------------------------
        # STEP 1: Retrieve memory only when enabled
        # -----------------------------------------

        if request.use_memory:

            memory_result = await hindsight.arecall(
                bank_id=HINDSIGHT_BANK_ID,
                query=request.incident
            )

            memories = str(memory_result)

        else:

            memories = "No organizational incident memory was provided."


        # -----------------------------------------
        # STEP 2: Build prompt
        # -----------------------------------------

        prompt = f"""
You are an experienced production incident response engineer.

A new production incident has occurred.

NEW INCIDENT:
{request.incident}

ORGANIZATIONAL MEMORY:
{memories}

Analyze the incident.

If organizational memory is available:
- Use it to identify relevant previous incidents.
- Use previous lessons to prioritize investigation.
- Use previous successful resolutions where appropriate.
- Clearly explain how memory influenced your recommendation.

If no organizational memory is available:
- Do not invent previous incidents.
- Do not claim that you remember anything.
- Provide a general production troubleshooting response.

Return your answer with exactly these sections:

SIMILAR PAST INCIDENTS:
Explain which previous incidents are relevant.
If no memory is available, say that no previous organizational incidents were provided.

WHAT WE LEARNED:
Explain useful lessons from previous incidents.
If no memory is available, explain the general engineering principle instead.

LIKELY CAUSE:
Give the most likely cause based only on the evidence available.

RECOMMENDED ACTIONS:
Give 3 to 5 concrete troubleshooting or remediation actions.

WHY MEMORY MATTERS:
Explain whether organizational memory changed the investigation.
If no memory was provided, explicitly say that the response was generated without organizational memory.

Do not claim certainty when the evidence is insufficient.
"""


        # -----------------------------------------
        # STEP 3: Ask Groq
        # -----------------------------------------

        response = await groq.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a production incident response assistant. "
                        "Use organizational memory carefully and never invent "
                        "historical incidents."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.2,
            max_tokens=1200
        )


        answer = response.choices[0].message.content


        # -----------------------------------------
        # STEP 4: Return analysis + memory status
        # -----------------------------------------

        return {
            "success": True,
            "incident": request.incident,
            "use_memory": request.use_memory,
            "memory_used": request.use_memory,
            "recalled_memory": memories if request.use_memory else None,
            "analysis": answer
        }


    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze incident: {str(e)}"
        )