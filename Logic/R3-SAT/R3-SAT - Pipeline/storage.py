# R3-SAT - Satellite Telemetry Storage
    # Workflow -> Stores validated R3-BOT JSON messages in SQLite without losing original message data.

import sqlite3
import json
from pathlib import Path
from datetime import datetime, timezone


# Store the database inside the R3-SAT project folder
DB_PATH = Path(__file__).resolve().parent / "telemetry.db"


# Create database and telemetry table
def initialize_database():

    with sqlite3.connect(DB_PATH) as connection:

        connection.execute("""
            CREATE TABLE IF NOT EXISTS telemetry (
                message_id TEXT PRIMARY KEY,
                robot_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                data TEXT NOT NULL,
                received_at TEXT NOT NULL,
                delivered INTEGER NOT NULL DEFAULT 0
            )
        """)

        connection.commit()


# Save a received JSON message
def save_telemetry(message: dict):

    received_at = datetime.now(timezone.utc).isoformat()

    with sqlite3.connect(DB_PATH) as connection:

        cursor = connection.execute("""
            INSERT OR IGNORE INTO telemetry
            (message_id, robot_id, event_type, data, received_at)
            VALUES (?, ?, ?, ?, ?)
        """, (
            message["message_id"],
            message["robot_id"],
            message["event_type"],
            json.dumps(message),
            received_at
        ))

        connection.commit()

        # True means a new message was inserted.
        # False means the message_id already exists.
        return cursor.rowcount == 1


# STEP 3: Retrieve messages awaiting transmission
def get_pending_telemetry():

    with sqlite3.connect(DB_PATH) as connection:

        cursor = connection.execute("""
            SELECT data
            FROM telemetry
            WHERE delivered = 0
            ORDER BY received_at ASC, rowid ASC
        """)

        rows = cursor.fetchall()

    return [json.loads(row[0]) for row in rows]


# STEP 4: Mark acknowledged messages as delivered
def mark_as_delivered(message_ids: list[str]):

    if not message_ids:
        return

    with sqlite3.connect(DB_PATH) as connection:

        connection.executemany("""
            UPDATE telemetry
            SET delivered = 1
            WHERE message_id = ?
        """, [(message_id,) for message_id in message_ids])

        connection.commit()


# STEP 5: Get satellite storage statistics
def get_storage_status():

    with sqlite3.connect(DB_PATH) as connection:

        total = connection.execute(
            "SELECT COUNT(*) FROM telemetry"
        ).fetchone()[0]

        pending = connection.execute(
            "SELECT COUNT(*) FROM telemetry WHERE delivered = 0"
        ).fetchone()[0]

    return {
        "total_messages": total,
        "pending_messages": pending,
        "delivered_messages": total - pending
    }


# Initialize the database when this file is run directly
if __name__ == "__main__":

    initialize_database()

    print("R3-SAT SQLite database initialized.")
    print(get_storage_status())
