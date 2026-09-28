import asyncio

from hindsight_client import Hindsight
from dotenv import load_dotenv
import os


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


hindsight = Hindsight(
    base_url=API_URL,
    api_key=API_KEY
)


incidents = [

    {
        "id": "INC-002",
        "text": """
Production Incident INC-002

Service: Authentication API
Environment: Production
Deployment: v3.4.2

Symptoms:
Users began receiving intermittent HTTP 401 errors immediately after
the authentication service was deployed.

Investigation:
Application logs showed token validation failures. The signing-key
configuration had changed during deployment.

Root Cause:
The authentication service was using an expired signing key after the
deployment.

Actions Attempted:
Restarted authentication pods and checked user credentials.

Successful Resolution:
Rotated the signing key and restarted the authentication service.

Lesson Learned:
When authentication failures appear immediately after deployment,
check token signing-key configuration and expiration before investigating
user credentials.
"""
    },

    {
        "id": "INC-003",
        "text": """
Production Incident INC-003

Service: Order API
Environment: Production
Deployment: v5.1.0

Symptoms:
Order requests became increasingly slow during peak traffic.
Average response time increased from approximately 300ms to more than
2 seconds.

Investigation:
Database CPU was elevated and order-history queries were performing
large table scans.

Root Cause:
A frequently used query was missing an index on the customer_id column.

Actions Attempted:
Restarted API instances and increased application CPU resources.

Successful Resolution:
Added an index for customer_id and verified query execution plans.

Lesson Learned:
When API latency increases while database CPU is high, inspect slow
queries and database indexes before scaling application instances.
"""
    },

    {
        "id": "INC-004",
        "text": """
Production Incident INC-004

Service: Notification API
Environment: Production
Deployment: v2.6.0

Symptoms:
Large numbers of notification requests began failing and the retry
queue grew rapidly.

Investigation:
The external notification provider was returning HTTP 429 responses.

Root Cause:
The application exceeded the provider's request-rate limit.

Actions Attempted:
Restarted notification workers and increased worker count.

Successful Resolution:
Reduced request concurrency, added exponential backoff, and respected
the provider's rate-limit headers.

Lesson Learned:
When notification failures occur with HTTP 429 responses, check
external provider rate limits before increasing worker capacity.
"""
    }
]


async def seed():

    for incident in incidents:

        print(f"Storing {incident['id']}...")

        result = await hindsight.aretain(
            bank_id=BANK_ID,
            content=incident["text"],
            context="production incident response"
        )

        print(f"{incident['id']} stored.")
        print(str(result)[:300])
        print("-" * 60)


if __name__ == "__main__":
    asyncio.run(seed())