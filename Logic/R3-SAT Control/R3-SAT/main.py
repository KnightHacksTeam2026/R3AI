# R3-SAT — Main Satellite Controller
# -> One functioning satellite telemetry system.

# Connects receiving, storage, and downlink operations.

from contextlib import asynccontextmanager
from fastapi import FastAPI
from pydantic import BaseModel

# Import R3-SAT modules
from receiver import app as receiver_app
from storage import initialize_database, get_storage_status
from downlink import send_downlink


# Simulated satellite-ground communication availability
ground_contact = False


# Initialize SQLite when the server starts
@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    print("R3-SAT initialized. SQLite storage ready.")
    yield


# Main R3-SAT application
app = FastAPI(
    title="R3-SAT Satellite Telemetry System",
    lifespan=lifespan
)


# Add the R3-BOT receiver to the main application
app.mount("/", receiver_app)


# Request format for simulated contact control
class ContactRequest(BaseModel):
    available: bool


# Enable or disable satellite-ground contact
@app.post("/contact")
def set_ground_contact(request: ContactRequest):
    global ground_contact
    ground_contact = request.available

    return {
        "satellite": "R3-SAT-01",
        "ground_contact": ground_contact
    }


# Send pending telemetry to R3-WEB
@app.post("/downlink/send")
def trigger_downlink():
    return send_downlink(
        contact_available=ground_contact
    )


# View current satellite storage and connection status
@app.get("/satellite/status")
def satellite_status():
    return {
        "satellite": "R3-SAT-01",
        "ground_contact": ground_contact,
        "storage": get_storage_status()
    }
