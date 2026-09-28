import os
import asyncio

from dotenv import load_dotenv
from hindsight_client import Hindsight


load_dotenv()

API_KEY = os.getenv("HINDSIGHT_API_KEY")
API_URL = os.getenv(
    "HINDSIGHT_API_URL",
    "https://api.hindsight.vectorize.io"
)

BANK_ID = os.getenv(
    "HINDSIGHT_BANK_ID",
    "incident-memory"
)


async def main():
    if not API_KEY:
        print("ERROR: HINDSIGHT_API_KEY is missing")
        return

    client = Hindsight(
        base_url=API_URL,
        api_key=API_KEY
    )

    print("\n1. Retaining incident memory...")

    retain_response = await client.aretain(
        bank_id=BANK_ID,
        content="""
Incident INC-001:

Service: Payment API
Environment: Production
Deployment: v2.8.0

Symptoms:
The Payment API started returning HTTP 503 errors.
Checkout requests were failing for approximately 18% of users.

Investigation:
The database connection pool was exhausted after the deployment.

Actions attempted:
- Restarting the API temporarily reduced errors but did not solve the issue.
- Increasing the database connection pool from 50 to 100 resolved the incident.

Root cause:
The new deployment increased concurrent database requests and exhausted
the existing connection pool.

Resolution:
Increase the connection pool and deploy the connection-pool configuration.

Lesson:
When Payment API 503 errors appear shortly after a deployment,
check database connection-pool utilization before repeatedly restarting
the service.
""",
        context="production incident"
    )

    print("Retain response:")
    print(retain_response)

    print("\n2. Recalling memory...")

    recall_response = await client.arecall(
        bank_id=BANK_ID,
        query=(
            "A Payment API is returning HTTP 503 errors after a deployment. "
            "What happened in similar incidents before, what was the root cause, "
            "and what solution worked?"
        )
    )

    print("\nRecall results:")
    print(recall_response)


if __name__ == "__main__":
    asyncio.run(main())