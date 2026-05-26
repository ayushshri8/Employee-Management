"""
Seed Script — Diagonal HRMS
----------------------------
Reads employee_record_sample_dataset(Employees).csv
Inserts all employees into MongoDB `users` collection.
Password for each user = their Employee ID (bcrypt hashed).

Run from Backend/ folder:
    python -m app.utils.seed
"""

import csv
import os
import bcrypt
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME")

client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]
users_collection = db["users"]

CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "employee_record_sample_dataset(Employees).csv")


def seed():
    csv_path = os.path.abspath(CSV_PATH)

    if not os.path.exists(csv_path):
        print(f"[ERROR] CSV not found at: {csv_path}")
        return

    inserted = 0
    skipped = 0

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            employee_id = row.get("Employee ID", "").strip()
            if not employee_id:
                continue

            # Skip if already exists
            if users_collection.find_one({"employee_id": employee_id}):
                print(f"[SKIP] {employee_id} already exists")
                skipped += 1
                continue

            # Password = Employee ID (bcrypt hashed directly — no passlib)
            hashed_password = bcrypt.hashpw(
                employee_id.encode("utf-8"), bcrypt.gensalt()
            ).decode("utf-8")

            doc = {
                "employee_id": employee_id,
                "first_name": row.get("First Name", "").strip(),
                "last_name": row.get("Last Name", "").strip(),
                "email": row.get("Email", "").strip(),
                "password": hashed_password,
                "role": row.get("Role", "").strip(),
                "department": row.get("Department", "").strip(),
                "manager_id": row.get("Manager ID", "").strip(),
                "joining_date": row.get("Joining Date", "").strip(),
                "status": row.get("Status", "Active").strip(),
                "is_active": row.get("Status", "Active").strip().lower() == "active",
                "mfa_enabled": False,
                "created_at": datetime.now(timezone.utc),
            }

            users_collection.insert_one(doc)
            print(f"[OK] Inserted {employee_id} — {doc['first_name']} {doc['last_name']} — {doc['role']}")
            inserted += 1

    print(f"\nSeeding complete — Inserted: {inserted} | Skipped: {skipped}")


if __name__ == "__main__":
    seed()
