# RecallOps

**AI-powered incident response with persistent organizational memory**

RecallOps is an AI-powered production incident response assistant that helps engineering teams use knowledge from previous incidents when investigating new production problems.

Instead of treating every incident as a completely new problem, RecallOps uses Hindsight as a persistent organizational memory layer to recall previous incidents, root causes, successful resolutions, and lessons learned.

> **Disclaimer:** This project uses synthetic production incidents for demonstration purposes. The incident data and AI recommendations are not connected to a real production environment.

---

## Table of Contents

1. [Live Demo](#live-demo)
2. [Problem](#problem)
3. [Solution](#solution)
4. [Key Features](#key-features)
5. [System Workflow](#system-workflow)
6. [Architecture](#architecture)
7. [Technology Stack](#technology-stack)
8. [How Hindsight Is Used](#how-hindsight-is-used)
9. [API Endpoints](#api-endpoints)
10. [Example Incident](#example-incident)
11. [Memory Comparison](#memory-comparison)
12. [Continuous Learning](#continuous-learning)
13. [Project Structure](#project-structure)
14. [Running Locally](#running-locally)
15. [Example API Tests](#example-api-tests)
16. [Design Principles](#design-principles)
17. [Limitations](#limitations)
18. [Future Improvements](#future-improvements)
19. [Hindsight Resources](#hindsight-resources)
20. [Author](#author)

---

## Live Demo

The deployed application will be available here:

**Frontend:**  
`<frontend-url>`

**Backend API:**  
`<backend-url>`

**API Documentation:**  
`<backend-url>/docs`

---

## Problem

Production engineering teams often troubleshoot similar incidents repeatedly.

A previous incident may already contain the information needed to understand a new failure, but that knowledge can be scattered across incident reports, tickets, documentation, chat conversations, and engineer experience.

For example, a team may encounter:

```text
Payment API
HTTP 503 errors
Recent deployment
High database connections
```

Without access to previous incident knowledge, the investigation may start with generic troubleshooting steps.

If the organization previously experienced the same failure because of database connection pool exhaustion, that information could immediately help narrow the investigation.

The problem is therefore not only finding an answer.

It is also remembering what the organization has already learned.

---

## Solution

RecallOps adds persistent organizational memory to the incident response workflow.

When a new incident is submitted:

1. The incident is received by the FastAPI backend.
2. Hindsight searches organizational memory for relevant incidents.
3. Relevant memories are provided to the AI model.
4. The AI uses previous incidents, resolutions, and lessons to analyze the new incident.
5. The response explains how previous organizational knowledge influenced the investigation.
6. Once the incident is resolved, its root cause, successful resolution, and lesson can be stored back into Hindsight.

This creates a continuous learning cycle where resolved incidents become useful knowledge for future incidents.

---

## Key Features

Persistent incident memory using Hindsight

AI-powered incident analysis

Relevant previous incident recall

Memory-informed troubleshooting recommendations

Without-memory vs. with-memory comparison

Incident root cause recording

Successful resolution recording

Lesson learned storage

Continuous organizational learning

Synthetic production incident dataset

FastAPI backend

React and Vite frontend

---

## System Workflow

```text
                         New Incident
                              |
                              v
                    FastAPI Backend
                              |
                              v
                       Hindsight Recall
                              |
                              v
                 Relevant Past Incidents
                              |
                              v
                         Groq LLM
                              |
                              v
                    Incident Analysis
                              |
                              v
                    Recommended Actions
                              |
                              v
                     Incident Resolution
                              |
                              v
                    Root Cause + Lesson
                              |
                              v
                       Hindsight Retain
                              |
                              v
                     Future Incidents
```

The important part of the workflow is that the system does not stop after generating an AI response.

The resolution and lesson from the current incident can become part of the organizational memory used by future investigations.

---

## Architecture

```text
                         React + Vite
                         Frontend UI
                              |
                              | REST API
                              v
                     FastAPI Backend
                              |
                 +------------+------------+
                 |                         |
                 v                         v
         Hindsight Memory              Groq LLM
                 |                         |
                 |                         |
                 +------------+------------+
                              |
                              v
                    Memory-Informed
                       Analysis
                              |
                              v
                    Incident Resolution
                              |
                              v
                       Hindsight
                         Retain
```

### Main Components

**React + Vite**

Provides the user interface for submitting incidents, viewing recalled memories, comparing AI responses, and storing incident resolutions.

**FastAPI**

Handles API requests, communicates with Hindsight, sends incident context to the AI model, and returns analysis results to the frontend.

**Hindsight**

Acts as the persistent organizational memory layer. It stores and recalls incident knowledge across different investigations.

**Groq**

Provides the language model used to reason over the current incident and the recalled organizational memory.

---

## Technology Stack

### Frontend

React

Vite

JavaScript

CSS

### Backend

Python

FastAPI

Pydantic

Uvicorn

python-dotenv

### AI

Groq

OpenAI GPT-OSS 120B through Groq

### Memory

Hindsight by Vectorize

### Development Tools

Git

GitHub

VS Code

Postman

---

## How Hindsight Is Used

Hindsight is the central memory layer of RecallOps.

When an incident is resolved, the application stores information including:

- Incident symptoms
- Investigation details
- Root cause
- Actions attempted
- Successful resolution
- Lesson learned

The information is retained using Hindsight.

```python
result = await hindsight.aretain(
    bank_id=HINDSIGHT_BANK_ID,
    content=incident_memory,
    context="production incident response"
)
```

When another incident occurs, RecallOps searches the organizational memory.

```python
memory_result = await hindsight.arecall(
    bank_id=HINDSIGHT_BANK_ID,
    query=request.incident
)
```

The recalled information is then provided to the AI model as organizational context.

This allows the AI to use previous incident experience instead of relying only on general troubleshooting knowledge.

---

## API Endpoints

### Health Check

```text
GET /
```

Returns the current application status.

Example response:

```json
{
  "message": "RecallOps is running",
  "memory": "Hindsight",
  "ai": "Groq",
  "bank_id": "incident-memory"
}
```

### Store Incident

```text
POST /incidents
```

Stores an incident and its resolution details in Hindsight.

Request fields:

```text
incident_id
service
environment
deployment
symptoms
investigation
root_cause
attempted_actions
successful_resolution
lesson
```

### Recall Incident Memory

```text
POST /incidents/recall
```

Retrieves relevant organizational memories for a query.

Example request:

```json
{
  "query": "What happened in previous Payment API incidents involving 503 errors?"
}
```

### Analyze Incident

```text
POST /incidents/analyze
```

Analyzes an incident using organizational memory.

Example request:

```json
{
  "incident": "Payment API is returning 503 errors after a deployment with high database connections.",
  "use_memory": true
}
```

The `use_memory` parameter can be set to `false` to generate an analysis without organizational memory.

This makes it possible to compare a general AI response with a memory-informed response.

---

## Example Incident

### Previous Incident

```text
Incident ID: INC-001

Service: Payment API

Environment: Production

Deployment: v2.8.0

Symptoms:
HTTP 503 errors started occurring after deployment.

Root Cause:
Database connection pool exhaustion.

Successful Resolution:
Increased the database connection pool from 50 to 100.

Lesson Learned:
Check database connection utilization before repeated
restarts when 503 errors appear after deployment.
```

### New Incident

A later Payment API deployment produces:

```text
HTTP 503 errors
High database connections
Recent deployment
```

RecallOps sends this incident to Hindsight and retrieves the previous Payment API incident.

The AI can then identify the previous incident as relevant and prioritize database connection pool investigation.

---

## Memory Comparison

RecallOps provides a direct comparison between incident analysis with and without organizational memory.

### Without Memory

The AI receives only the current incident.

Typical investigation areas include:

- Application logs
- Database health
- Deployment changes
- Service configuration
- Recent code changes
- Possible rollback

The response is based on general production troubleshooting principles.

### With Hindsight

The AI receives both the current incident and relevant organizational memory.

For the Payment API example, Hindsight recalls the previous incident involving database connection pool exhaustion.

The AI can therefore prioritize:

- Database connection pool utilization
- Deployment configuration
- Connection pool settings
- Similarity with the previous incident
- The previous successful resolution

The application also explains how memory influenced the recommendation.

This provides a visible demonstration of the value of persistent organizational memory.

---

## Continuous Learning

RecallOps supports a complete incident learning loop.

```text
Incident
   |
   v
Recall Previous Knowledge
   |
   v
AI Investigation
   |
   v
Recommended Actions
   |
   v
Resolution
   |
   v
Root Cause
   |
   v
Lesson Learned
   |
   v
Hindsight Retain
   |
   v
Future Incident
```

The system was tested by storing a new Payment API incident and subsequently querying Hindsight for the lesson related to database connection pools and 503 errors.

The recalled memory included:

```text
Database connection pool exhaustion

Increase the connection pool from 50 to 100

Check database connection utilization before
repeated restarts
```

This demonstrates that the resolution and lesson were persisted and could be recalled later.

---

## Project Structure

```text
hindsight-incident-agent/

├── backend/
│   ├── main.py
│   ├── seed_incidents.py
│   ├── .env
│   └── .venv/
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.css
│   ├── package.json
│   └── package-lock.json
│
├── .gitignore
└── README.md
```

The `backend/.env` file contains API credentials and is excluded from Git using `.gitignore`.

---

## Running Locally

### 1. Clone the Repository

```bash
git clone <repository-url>
cd hindsight-incident-agent
```

### 2. Backend Setup

Navigate to the backend:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate the environment on Git Bash:

```bash
source .venv/Scripts/activate
```

Install dependencies:

```bash
pip install fastapi uvicorn hindsight-client python-dotenv groq
```

### 3. Configure Environment Variables

Create:

```text
backend/.env
```

Add:

```env
HINDSIGHT_API_KEY=your_hindsight_api_key
HINDSIGHT_API_URL=https://api.hindsight.vectorize.io
HINDSIGHT_BANK_ID=incident-memory
GROQ_API_KEY=your_groq_api_key
```

API keys should never be committed to the repository.

### 4. Start the Backend

From the `backend` directory:

```bash
uvicorn main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

FastAPI documentation:

```text
http://127.0.0.1:8000/docs
```

### 5. Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## Example API Tests

### Check the Backend

```bash
curl http://127.0.0.1:8000/
```

### Recall Previous Incidents

```bash
curl -X POST "http://127.0.0.1:8000/incidents/recall" \
-H "Content-Type: application/json" \
-d '{"query":"What happened in previous Payment API incidents involving 503 errors?"}'
```

### Analyze With Memory

```bash
curl -X POST "http://127.0.0.1:8000/incidents/analyze" \
-H "Content-Type: application/json" \
-d '{"incident":"Payment API is returning 503 errors after deployment with high database connections.","use_memory":true}'
```

### Analyze Without Memory

```bash
curl -X POST "http://127.0.0.1:8000/incidents/analyze" \
-H "Content-Type: application/json" \
-d '{"incident":"Payment API is returning 503 errors after deployment with high database connections.","use_memory":false}'
```

### Store a Resolved Incident

```text
POST /incidents
```

The request stores the incident's root cause, successful resolution, and lesson in Hindsight.

---

## Design Principles

### 1. Memory Before Repetition

Previous incident knowledge should be available when similar problems occur again.

### 2. Memory Should Influence the Response

Hindsight should not simply store information.

The recalled information should affect the investigation and recommendations produced by the AI.

### 3. Explain the Influence of Memory

The system explicitly shows how previous organizational knowledge affected the current investigation.

### 4. Close the Learning Loop

A resolved incident should be capable of becoming knowledge for future incidents.

### 5. Avoid Inventing History

When organizational memory is unavailable, the AI is instructed not to invent previous incidents or claim to remember events that were never stored.

---

## Limitations

This project uses synthetic production incidents for demonstration purposes.

It is not connected to a real production infrastructure, monitoring platform, incident management system, or company communication platform.

The current system requires incidents to be explicitly stored before they can become part of the organizational memory.

The quality of the recalled information depends on the quality and completeness of the incident information stored in Hindsight.

The AI response is advisory and does not automatically execute production remediation actions.

A production implementation would require additional security, access control, observability, validation, and integration work.

---

## Future Improvements

Real incident management platform integration

Slack and ticket ingestion

Automatic incident ingestion from monitoring systems

Log and trace analysis

Automatic incident summarization

Similar incident clustering

Incident severity classification

Automated post-incident reports

Role-based access control

Production observability integrations

Incident timeline generation

More advanced memory filtering

Automated incident knowledge extraction

---

## Hindsight Resources

Hindsight GitHub:

https://github.com/vectorize-io/hindsight

Hindsight Documentation:

https://hindsight.vectorize.io/

Vectorize:

https://vectorize.io/

---

## Author

Blessy K.

B.Tech — Computer Science and Engineering (Data Science)

ACE Engineering College, Hyderabad