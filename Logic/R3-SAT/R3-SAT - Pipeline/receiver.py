# R3-SAT - Communication Antenna
    # Workflow -> Accepts JSON -> Validates Fields -> confirms reception

from fastapi import FastAPI
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal
from storage import initialize_database, save_telemetry

# Create the R3-SAT receiver application
app = FastAPI(title="R3-SAT Telemetry Receiver")

initialize_database()


# Define the expected telemetry structure
class Location(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class WasteObject(BaseModel):
    category: str
    mass_kg: float = Field(ge=0)


class TelemetryMessage(BaseModel):
    message_id: str
    robot_id: str
    waste_id: str
    timestamp_utc: datetime
    event_type: Literal["waste_detected", "waste_collected"]
    location: Location
    object: WasteObject


# Endpoint for receiving R3-BOT messages

@app.post("/telemetry")
def receive_telemetry(message: TelemetryMessage):

    # Convert the validated Pydantic model to a JSON-compatible dict
    telemetry_data = message.model_dump(mode="json")

    # Save the message in SQLite
    inserted = save_telemetry(telemetry_data)

    if inserted:
        print(f"Stored new telemetry: {message.message_id}")
        status = "stored"
    else:
        print(f"Duplicate telemetry: {message.message_id}")
        status = "already_stored"

    return {
        "status": status,
        "message_id": message.message_id
    }

# Endpoint to check whether R3-SAT is running
@app.get("/health")
def health_check():
    return {
        "satellite": "R3-SAT",
        "status": "online"
    }

