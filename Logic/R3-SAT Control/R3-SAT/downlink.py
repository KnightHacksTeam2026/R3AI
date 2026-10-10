# R3-SAT — Satellite Telemetry Downlink
    # -> R3-SAT's transmitter to the ground station.
        # -> Retrieve telemetry stored in SQLite and sned it to the R3-WEB in JSON format.

    # Sends stored JSON telemetry to R3-WEB.

import os
import httpx

from storage import (
    initialize_database,
    get_pending_telemetry,
    mark_as_delivered
)


# URL of the receiving R3-WEB API
WEB_URL = os.getenv(
    "R3_WEB_URL",
    "http://127.0.0.1:3000/api/telemetry"
)

SATELLITE_ID = "R3-SAT-01"


def send_downlink(contact_available: bool = True):
    """
    Transmit pending telemetry when ground contact exists.

    Returns a dictionary describing the transmission result.
    """

    # STEP 1: Check satellite-ground contact
    if not contact_available:
        return {
            "status": "no_contact",
            "message": "Satellite is outside the ground contact window."
        }

    # STEP 2: Retrieve pending telemetry from SQLite
    initialize_database()
    messages = get_pending_telemetry()

    if not messages:
        return {
            "status": "empty",
            "message": "No pending telemetry to transmit."
        }

    # STEP 3: Build the JSON transmission batch
    payload = {
        "satellite_id": SATELLITE_ID,
        "messages": messages
    }

    pending_ids = {
        message["message_id"]
        for message in messages
    }

    # STEP 4: Transmit telemetry to R3-WEB
    try:
        response = httpx.post(
            WEB_URL,
            json=payload,
            timeout=10.0
        )

        response.raise_for_status()

        # STEP 5: Read the website acknowledgment
        response_data = response.json()

        acknowledged_ids = response_data.get(
            "acknowledged_ids", []
        )

        # Only accept acknowledgments for messages we sent.
        confirmed_ids = [
            message_id
            for message_id in acknowledged_ids
            if isinstance(message_id, str)
            and message_id in pending_ids
        ]

        # STEP 6: Mark acknowledged messages as delivered
        mark_as_delivered(confirmed_ids)

        return {
            "status": (
                "delivered"
                if len(set(confirmed_ids)) == len(pending_ids)
                else "partially_delivered"
            ),
            "sent": len(messages),
            "acknowledged": len(set(confirmed_ids)),
            "pending": len(pending_ids) - len(set(confirmed_ids))
        }

    except (httpx.HTTPError, ValueError, TypeError, AttributeError) as error:

        # Messages remain pending if transmission fails.
        print(f"R3-SAT downlink failure: {error}")

        return {
            "status": "failed",
            "message": str(error)
        }


# Allow this file to run independently
if __name__ == "__main__":

    result = send_downlink(contact_available=True)
    print(result)
