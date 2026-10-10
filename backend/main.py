
import os
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from hindsight_client import Hindsight
from groq import AsyncGroq

load_dotenv()

# -----------------------------
# Configuration
# -----------------------------

HINDSIGHT_API_KEY = os.getenv("HINDSIGHT_API_KEY")
HINDSIGHT_API_URL = os.getenv(
    "HINDSIGHT_API_URL",
    "https://api.hindsight.vectorize.io",
)
HINDSIGHT_BANK_ID = os.getenv(
    "HINDSIGHT_BANK_ID",
    "incident-memory",
)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not HINDSIGHT_API_KEY:
    raise RuntimeError("HINDSIGHT_API_KEY is missing from environment variables")

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is missing from environment variables")

hindsight = Hindsight(
    base_url=HINDSIGHT_API_URL,
    api_key=HINDSIGHT_API_KEY,
)

groq = AsyncGroq(api_key=GROQ_API_KEY)

app = FastAPI(
    title="RecallOps",
    description="AI incident response powered by Hindsight persistent memory",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://hindsight-incident-agent.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------
# Request models
# -----------------------------

class Incident(BaseModel):
    incident_id: str = Field(default_factory=lambda: str(uuid4()))
    service: str = "Unknown service"
    environment: str = "Unknown environment"
    deployment: str = "Unknown version"
    symptoms: str = ""
    investigation: str = ""
    root_cause: str = "Not confirmed"
    attempted_actions: str = ""
    successful_resolution: str = "Not recorded"
    lesson: str = ""


class RecallRequest(BaseModel):
    query: str


class AnalyzeRequest(BaseModel):
    incident: str
    use_memory: bool = True


# -----------------------------
# Helpers
# -----------------------------

def format_incident(incident: Incident) -> str:
    return f"""
Incident ID: {incident.incident_id}
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
""".strip()


def has_recalled_content(result) -> bool:
    """Best-effort check for whether recall returned useful content."""
    if result is None:
        return False

    if isinstance(result, (list, tuple, dict, str)):
        if len(result) == 0:
            return False
        if isinstance(result, str):
            return result.strip().lower() not in {
                "", "[]", "{}", "none", "null"
            }

    return True


# -----------------------------
# Health check
# -----------------------------

@app.get("/")
async def root():
    return {
        "message": "RecallOps is running",
        "ai": "Groq",
        "memory_provider": "Hindsight",
        "bank_id": HINDSIGHT_BANK_ID,
    }


@app.get("/health")
async def health():
    return {"status": "ok", "service": "RecallOps"}


# -----------------------------
# Store incident in persistent memory
# -----------------------------

@app.post("/incidents")
async def store_incident(incident: Incident):
    incident_memory = format_incident(incident)

    try:
        result = await hindsight.aretain(
            bank_id=HINDSIGHT_BANK_ID,
            content=incident_memory,
            context="production incident response",
        )

        return {
            "success": True,
            "message": "Incident submitted to Hindsight memory",
            "incident_id": incident.incident_id,
            "hindsight_response": str(result),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to store incident in Hindsight: {str(exc)}",
        ) from exc


# -----------------------------
# Recall previous incidents
# -----------------------------

@app.post("/incidents/recall")
async def recall_incident(request: RecallRequest):
    if not request.query.strip():
        raise HTTPException(
            status_code=400,
            detail="Please provide a query to search incident memory.",
        )

    try:
        result = await hindsight.arecall(
            bank_id=HINDSIGHT_BANK_ID,
            query=request.query,
        )

        return {
            "success": True,
            "query": request.query,
            "memories": str(result),
            "memory_found": has_recalled_content(result),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to recall Hindsight memory: {str(exc)}",
        ) from exc


# -----------------------------
# Analyze incident with or without memory
# -----------------------------

@app.post("/incidents/analyze")
async def analyze_incident(request: AnalyzeRequest):
    if not request.incident.strip():
        raise HTTPException(
            status_code=400,
            detail="Please provide an incident description.",
        )

    memories = ""
    memory_found = False

    try:
        # Retrieve real organizational memory when requested.
        if request.use_memory:
            memory_result = await hindsight.arecall(
                bank_id=HINDSIGHT_BANK_ID,
                query=request.incident,
            )

            memories = str(memory_result)
            memory_found = has_recalled_content(memory_result)

        if not request.use_memory:
            memory_context = (
                "Memory retrieval was disabled. "
                "Do not claim that past incidents were retrieved."
            )
        elif memory_found:
            memory_context = memories
        else:
            memory_context = (
                "The recall request completed, but no usable past incident "
                "content was identified. Do not invent historical incidents."
            )

        prompt = f"""
You are RecallOps, a production incident response assistant.

Analyze the following incident using the supplied evidence.

NEW INCIDENT:
{request.incident}

RECALLED ORGANIZATIONAL MEMORY:
{memory_context}

Instructions:
- Use only the supplied memory as historical evidence.
- Never invent previous incidents, root causes, or resolutions.
- If relevant past incidents are available, explain their relevance.
- Separate observed evidence from hypotheses.
- Prioritize safe, practical troubleshooting steps.
- Do not claim a fix is successful unless the evidence confirms it.
- If evidence is insufficient, state what needs to be checked.

Return exactly these sections:

SIMILAR PAST INCIDENTS:
Identify relevant recalled incidents, or clearly state if none were available.

WHAT WE LEARNED:
Summarize relevant lessons from recalled incidents. If none were available,
give a general engineering principle without presenting it as past experience.

LIKELY CAUSE:
Explain the most likely cause and the evidence supporting it.
Mention uncertainty where appropriate.

RECOMMENDED ACTIONS:
Give 3 to 5 specific, ordered troubleshooting or remediation actions.

WHY MEMORY MATTERS:
Explain whether recalled organizational memory affected the recommendations.
Be explicit if no usable memory was available.
"""

        response = await groq.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a careful production incident response engineer. "
                        "Never fabricate historical incidents or claim that a "
                        "diagnosis has been verified when it has not."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=1200,
        )

        answer = response.choices[0].message.content or (
            "The AI returned an empty response. Please try again."
        )

        return {
            "success": True,
            "incident": request.incident,
            "use_memory": request.use_memory,
            "memory_used": request.use_memory and memory_found,
            "memory_found": memory_found,
            "recalled_memory": memories if request.use_memory else None,
            "analysis": answer,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze incident: {str(exc)}",
        ) from exc
