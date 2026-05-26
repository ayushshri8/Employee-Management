# Diagonal HRMS — Backend

> Enterprise-grade Human Resource Management System built with FastAPI, MongoDB, and JWT Authentication.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Environment Setup](#environment-setup)
- [How to Run](#how-to-run)
- [Database & Seeding](#database--seeding)
- [Roles & Permissions](#roles--permissions)
- [Modules & API Reference](#modules--api-reference)
  - [Authentication](#1-authentication)
  - [Dashboard](#2-dashboard)
  - [Employees](#3-employees)
  - [Hiring](#4-hiring)
  - [Onboarding](#5-onboarding)
  - [Hierarchy](#6-hierarchy)
  - [Resignations](#7-resignations)
  - [Terminations](#8-terminations)
  - [Notifications](#9-notifications)
  - [Activity Logs](#10-activity-logs)
- [Workflow Diagrams](#workflow-diagrams)
- [MongoDB Collections](#mongodb-collections)
- [Error Handling](#error-handling)
- [Testing Guide](#testing-guide)

---

## Project Overview

Diagonal HRMS is a full-stack enterprise HR platform that manages the complete employee lifecycle inside an organization — from hiring to exit. It simulates real-world HR operations with proper role-based access, multi-step approval workflows, and automated notifications.

**What the system handles:**
- Secure employee login with optional MFA
- Role-based access control (8 roles)
- Hiring request approval chain (Manager → HR → CEO)
- Employee onboarding via time-limited invite links
- Organization hierarchy management with circular cycle prevention
- Resignation workflow with 30-day notice period tracking
- Termination workflow with critical alerts and instant account deactivation
- In-app notification system
- Full activity audit logs
- Role-specific dashboards with live stats and events

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI 0.111 |
| Database | MongoDB (PyMongo) |
| Authentication | JWT (python-jose) |
| Password Hashing | bcrypt |
| MFA | TOTP via pyotp |
| Validation | Pydantic v2 |
| Server | Uvicorn |
| Environment | python-dotenv |

---

## Folder Structure

```
Backend/
│
├── app/
│   ├── auth/
│   │   ├── hash.py              # bcrypt password hashing & verification
│   │   ├── jwt_handler.py       # JWT token creation & verification
│   │   └── oauth2.py            # FastAPI dependency — get_current_user
│   │
│   ├── config/
│   │   └── settings.py          # All env variables loaded here
│   │
│   ├── database/
│   │   └── db.py                # MongoDB connection via PyMongo
│   │
│   ├── middleware/
│   │   └── role_checker.py      # require_roles() dependency factory
│   │
│   ├── models/
│   │   └── user_model.py        # MongoDB document builders & serializers
│   │
│   ├── routes/
│   │   ├── auth_routes.py       # Login, MFA, change password, logout
│   │   ├── dashboard_routes.py  # Role-specific dashboards
│   │   ├── employee_routes.py   # Employee directory, profile, search
│   │   ├── hiring_routes.py     # Hiring request workflow
│   │   ├── onboarding_routes.py # Invite, profile setup, HR approval
│   │   ├── resignation_routes.py# Resignation workflow
│   │   ├── termination_routes.py# Termination workflow
│   │   ├── hierarchy_routes.py  # Org tree, reassignment
│   │   ├── notification_routes.py # In-app notifications
│   │   └── activity_routes.py   # Audit logs
│   │
│   ├── schemas/
│   │   ├── user_schema.py       # Login, token, profile schemas
│   │   ├── hiring_schema.py     # Hiring request schemas
│   │   ├── onboarding_schema.py # Invite & onboarding schemas
│   │   ├── resignation_schema.py# Resignation schemas
│   │   ├── termination_schema.py# Termination schemas
│   │   └── employee_schema.py   # Employee update & hierarchy schemas
│   │
│   ├── services/
│   │   ├── notification_service.py # Creates notifications in MongoDB
│   │   ├── activity_service.py     # Logs actions to activity_logs
│   │   └── hierarchy_service.py    # Org tree builder, cycle detection
│   │
│   ├── utils/
│   │   ├── generate_id.py       # Unique ID generators (HIR-, RES-, etc.)
│   │   ├── date_utils.py        # UTC time, notice period, expiry helpers
│   │   └── seed.py              # CSV → MongoDB seeder script
│   │
│   └── main.py                  # FastAPI app, all routers registered
│
├── .env                         # Environment variables
├── requirements.txt             # Python dependencies
└── employee_record_sample_dataset(Employees).csv
```

---

## Environment Setup

`.env` file:

```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/
DATABASE_NAME=EmployeeManagement
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
MFA_ISSUER=DiagonalHRMS
INVITE_EXPIRE_HOURS=24
NOTICE_PERIOD_DAYS=30
```

---

## How to Run

```bash
# Step 1 — Go to Backend folder
cd "c:\Users\HP\Desktop\Diagonal\PROJECT - 2\Backend"

# Step 2 — Activate virtual environment
venv\Scripts\activate

# Step 3 — Install dependencies (first time only)
pip install -r requirements.txt

# Step 4 — Seed database (first time only)
python -m app.utils.seed

# Step 5 — Start server
uvicorn app.main:app --reload
```

**URLs:**
```
API Server  →  http://127.0.0.1:8000
Swagger UI  →  http://127.0.0.1:8000/docs
ReDoc       →  http://127.0.0.1:8000/redoc
```

---

## Database & Seeding

The seed script reads `employee_record_sample_dataset(Employees).csv` and inserts all 102 employees into MongoDB.

- Each employee's **password = their Employee ID** (bcrypt hashed)
- Duplicate employees are automatically skipped

```bash
python -m app.utils.seed
```

**Sample login credentials:**

| Role | Employee ID | Password |
|---|---|---|
| CEO | EMP001 | EMP001 |
| CFO | EMP002 | EMP002 |
| CIO | EMP003 | EMP003 |
| CTO | EMP004 | EMP004 |
| HR | EMP005 | EMP005 |
| Manager | EMP007 | EMP007 |
| Employee | EMP018 | EMP018 |
| Intern | EMP093 | EMP093 |

---

## Roles & Permissions

The system supports 8 roles with different access levels:

| Role | Access Level |
|---|---|
| CEO | Full access — all modules, final approvals |
| CFO | Executive dashboard, employee directory |
| CIO | Executive dashboard, employee directory |
| CTO | Executive dashboard, employee directory |
| HR | Employee management, onboarding, resignations, terminations |
| Manager | Own team only, hiring requests, termination requests |
| Employee | Own profile, resignation submission |
| Intern | Own profile only |

---

## Modules & API Reference

> All protected routes require `Authorization: Bearer <token>` header.
> Get token from `POST /auth/login`.

---

### 1. Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Login with Employee ID + password |
| GET | `/auth/me` | All | Get logged-in user profile |
| POST | `/auth/change-password` | All | Change own password |
| POST | `/auth/mfa/setup` | All | Generate TOTP secret & QR URI |
| POST | `/auth/mfa/verify` | All | Activate MFA with authenticator code |
| POST | `/auth/mfa/disable` | All | Disable MFA |
| POST | `/auth/logout` | All | Logout (logs activity) |

**Login Request:**
```json
{
  "employee_id": "EMP001",
  "password": "EMP001",
  "mfa_code": "123456"   // optional, only if MFA is enabled
}
```

**Login Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "employee_id": "EMP001",
  "role": "CEO",
  "full_name": "Jivika Bandi",
  "mfa_enabled": false
}
```

**MFA Flow:**
1. `POST /auth/mfa/setup` → get `otp_uri` and `secret`
2. Scan `otp_uri` with Google Authenticator or Authy
3. `POST /auth/mfa/verify` with `{ "code": "123456" }` → MFA activated
4. Next login requires `mfa_code` field

---

### 2. Dashboard

Each role gets a different dashboard with relevant data.

| Method | Endpoint | Access | Returns |
|---|---|---|---|
| GET | `/dashboard/executive` | CEO, CFO, CIO, CTO | Org stats, pending counts, recent activity, events |
| GET | `/dashboard/hr` | HR, CEO | Employee stats, pending onboarding/resignations |
| GET | `/dashboard/manager` | Manager+ | Own team, pending resignations to review |
| GET | `/dashboard/employee` | All | Own profile, manager info, notice period status |

**Executive Dashboard Response includes:**
- Total employees (active/inactive)
- Headcount by role and department
- Pending hiring, onboarding, resignation, termination counts
- Unread notification count
- Recent activity logs
- Current month birthdays, work anniversaries, new joiners

---

### 3. Employees

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/employees/` | HR, Executives | List all employees with filters |
| GET | `/employees/me` | All | Own profile |
| PATCH | `/employees/me` | All | Update own profile |
| GET | `/employees/my-team` | Manager+ | Direct reports |
| GET | `/employees/{employee_id}` | Role-based | Single employee profile |
| PATCH | `/employees/{employee_id}/deactivate` | HR, CEO | Soft delete employee |
| PATCH | `/employees/{employee_id}/reactivate` | HR, CEO | Reactivate employee |

**Filter Options:**
```
GET /employees/?department=Engineering
GET /employees/?role=Manager
GET /employees/?status=Active
GET /employees/?search=Jivika
```

**Update Profile:**
```json
{
  "phone": "9876543210",
  "address": "Mumbai, India",
  "blood_group": "O+",
  "skills": ["Python", "FastAPI"],
  "emergency_contact": "9876543211"
}
```

**Access Rules:**
- HR/Executives → view any employee
- Manager → view only their direct reports
- Employee/Intern → view only themselves

---

### 4. Hiring

Multi-step approval workflow: **Manager → HR → CEO**

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/hiring/request` | Manager+ | Create hiring request |
| GET | `/hiring/requests` | Role-based | List requests |
| GET | `/hiring/requests/{id}` | Role-based | Single request |
| PATCH | `/hiring/requests/{id}/hr-action` | HR, CEO | Approve/reject → forwards to CEO |
| PATCH | `/hiring/requests/{id}/ceo-action` | CEO | Final approve/reject |

**Create Request:**
```json
{
  "job_title": "Backend Developer",
  "department": "Engineering",
  "required_skills": ["Python", "FastAPI", "MongoDB"],
  "reason": "New project requirement",
  "number_of_positions": 2
}
```

**Action Request:**
```json
{
  "action": "approve",
  "remarks": "Looks good, forwarding to CEO"
}
```

**Status Flow:**
```
pending_hr → pending_ceo → approved
                        → rejected
```

**Notifications triggered:**
- HR notified when Manager submits request
- CEO notified when HR approves
- Manager notified of final CEO decision

---

### 5. Onboarding

Full employee onboarding lifecycle with time-limited invite links.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/onboarding/invite` | HR, CEO | Generate 24-hour invite for new employee |
| GET | `/onboarding/invites` | HR, CEO | List all invites |
| POST | `/onboarding/setup/{invite_id}` | Public | New employee submits profile |
| GET | `/onboarding/requests` | HR, CEO | List onboarding submissions |
| GET | `/onboarding/requests/{id}` | HR, CEO | Single onboarding request |
| PATCH | `/onboarding/requests/{id}/hr-action` | HR, CEO | Approve/reject/request correction |
| GET | `/onboarding/hierarchy-assignments` | Manager+ | View pending team assignments |
| PATCH | `/onboarding/hierarchy-assignments/{id}/manager-action` | Manager+ | Accept/reject new employee |

**Step 1 — HR creates invite:**
```json
{
  "first_name": "Rahul",
  "last_name": "Sharma",
  "email": "rahul.sharma@diagonal.ai",
  "role": "Employee",
  "department": "Engineering",
  "manager_id": "EMP007",
  "job_title": "Junior Developer"
}
```
Response gives `invite_id` and `temp_password` — share with new employee.

**Step 2 — Employee sets up profile (no login needed):**
```
POST /onboarding/setup/{invite_id}
```
```json
{
  "username": "rahul.sharma",
  "password": "mypassword123",
  "phone": "9876543210",
  "dob": "1998-05-15",
  "address": "Delhi, India",
  "emergency_contact": "9876543211",
  "blood_group": "B+",
  "skills": ["Python", "JavaScript"]
}
```

**Step 3 — HR approves:**
```json
{ "action": "approve", "remarks": "All documents verified" }
```
On approval: employee account is created automatically with a new Employee ID.

**Step 4 — Manager accepts employee into team:**
```json
{ "action": "accept", "remarks": "Welcome to the team" }
```

**Status Flow:**
```
invited → profile_submitted → hr_approved → (manager accepts) → Active
                           → hr_rejected
                           → correction_requested → profile_submitted
```

**Validations:**
- Invite expires after 24 hours
- Invite can only be used once
- Circular hierarchy is prevented on manager assignment

---

### 6. Hierarchy

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/hierarchy/org-tree` | All | Full company org chart |
| GET | `/hierarchy/my-chain` | All | Own upward reporting chain |
| PATCH | `/hierarchy/reassign` | HR, CEO | Reassign employee to different manager |
| GET | `/hierarchy/team/{manager_id}` | HR, Executives | Team of any manager |

**Org Tree** returns a nested JSON tree starting from CEO level down to all employees.

**Reassign Manager:**
```json
{
  "employee_id": "EMP020",
  "manager_id": "EMP010"
}
```

**Validations:**
- Employee cannot be their own manager
- Circular hierarchy is detected and blocked
- Example: if A manages B, B cannot be assigned as A's manager

---

### 7. Resignations

Multi-step workflow: **Employee → Manager → HR**

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/resignations/submit` | Employee, Manager, Intern | Submit resignation |
| GET | `/resignations/` | Role-based | List resignations |
| GET | `/resignations/{id}` | Role-based | Single resignation |
| PATCH | `/resignations/{id}/manager-action` | Manager+ | Approve/reject |
| PATCH | `/resignations/{id}/hr-action` | HR, CEO | Final approve/reject |
| POST | `/resignations/{id}/complete-notice` | HR, CEO | Mark notice period complete |

**Submit Resignation:**
```json
{
  "reason": "Better opportunity abroad",
  "last_working_day_preference": "2024-03-31"
}
```

**Status Flow:**
```
pending_manager → pending_hr → approved → completed
               → rejected      → rejected
```

**On HR Approval:**
- 30-day notice period starts automatically
- Employee status changes to "Notice Period"
- `notice_end_date` is calculated and stored
- Employee receives notification with last working day

**On Notice Completion:**
- Employee `is_active` set to `false`
- Employee status set to "Resigned"
- Employee removed from hierarchy (`manager_id` cleared)

**Notice Period Countdown:**
Every resignation response includes `days_remaining` field showing days left in notice period.

---

### 8. Terminations

Multi-step workflow: **Manager → HR → CEO**

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/terminations/request` | Manager+ | Submit termination request |
| GET | `/terminations/` | Role-based | List terminations |
| GET | `/terminations/{id}` | Role-based | Single termination |
| PATCH | `/terminations/{id}/hr-action` | HR, CEO | Review and forward to CEO |
| PATCH | `/terminations/{id}/ceo-action` | CEO | Final approve/reject |

**Submit Termination Request:**
```json
{
  "employee_id": "EMP019",
  "reason": "Repeated misconduct after multiple warnings",
  "evidence": "HR warning letters dated Jan-Feb 2024"
}
```

**Status Flow:**
```
pending_hr → pending_ceo → approved (employee deactivated immediately)
           → rejected      → rejected
```

**On CEO Approval:**
- Employee `is_active` set to `false` immediately
- Employee status set to "Terminated"
- Employee removed from hierarchy
- Employee receives **CRITICAL priority** notification
- HR receives confirmation notification

**Access Rules:**
- Manager can only terminate their own direct reports
- Duplicate termination requests for same employee are blocked

---

### 9. Notifications

In-app notification system. Every workflow action triggers relevant notifications.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/notifications/` | All | Get own notifications (latest 50) |
| GET | `/notifications/?unread_only=true` | All | Only unread notifications |
| PATCH | `/notifications/{id}/read` | All | Mark one as read |
| PATCH | `/notifications/read-all` | All | Mark all as read |
| DELETE | `/notifications/{id}` | All | Delete a notification |

**Notification Response:**
```json
{
  "unread_count": 3,
  "notifications": [
    {
      "notification_id": "NTF-20240101-ABCDEF",
      "title": "Resignation Request",
      "message": "Shamik Saran has submitted a resignation request.",
      "type": "resignation",
      "priority": "high",
      "is_read": false,
      "created_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

**Priority Levels:**
- `normal` — general updates
- `high` — resignations, termination requests, hiring decisions
- `critical` — termination approved (sent to terminated employee)

---

### 10. Activity Logs

Full audit trail of every action in the system.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/activity/logs` | HR, Executives | View all activity logs |
| GET | `/activity/logs?actor_id=EMP007` | HR, Executives | Filter by user |
| GET | `/activity/logs?action=login` | HR, Executives | Filter by action type |
| GET | `/activity/logs?limit=20` | HR, Executives | Limit results (max 200) |

**Logged Actions include:**
`login`, `logout`, `change_password`, `create_hiring_request`, `hr_approve_hiring`, `ceo_approve_hiring`, `create_invite`, `approve_onboarding`, `reject_onboarding`, `accept_hierarchy_assignment`, `submit_resignation`, `manager_approve_resignation`, `hr_approve_resignation`, `complete_resignation`, `request_termination`, `hr_approve_termination`, `ceo_approve_termination`, `update_profile`, `deactivate_employee`, `reactivate_employee`, `reassign_manager`

---

## Workflow Diagrams

### Hiring Workflow
```
Manager submits request
        |
        v
   [HR Review]
   /          \
Approve      Reject ──→ Manager notified
   |
   v
[CEO Review]
   /       \
Approve   Reject ──→ Manager notified
   |
   v
Status: approved
Manager + HR notified
```

### Onboarding Workflow
```
HR generates invite (24hr expiry)
        |
        v
Employee fills profile via invite link
        |
        v
   [HR Review]
   /     |      \
Approve Reject  Request Correction
   |                    |
   v                    v
Employee account    Employee resubmits
created (new EMP ID)
   |
   v
Manager receives assignment request
   /        \
Accept      Reject ──→ HR notified
   |
   v
Employee added to manager's team
Employee notified
```

### Resignation Workflow
```
Employee submits resignation
        |
        v
[Manager Review]
   /         \
Approve      Reject ──→ Employee notified
   |
   v
[HR Final Review]
   /        \
Approve    Reject ──→ Employee notified
   |
   v
30-day notice period starts
Employee status → "Notice Period"
   |
   v
HR marks notice complete
Employee deactivated
Status → "Resigned"
```

### Termination Workflow
```
Manager submits termination request
        |
        v
   [HR Review]
   /          \
Approve      Reject ──→ Manager notified
   |
   v
[CEO Final Review]
   /          \
Approve      Reject ──→ Manager notified
   |
   v
Employee account IMMEDIATELY deactivated
Status → "Terminated"
CRITICAL alert sent to employee
HR notified
```

---

## MongoDB Collections

| Collection | Purpose |
|---|---|
| `users` | All employee accounts and profiles |
| `hiring_requests` | Hiring workflow documents |
| `invites` | Temporary onboarding invite links |
| `onboarding_requests` | Employee profile submissions |
| `hierarchy_assignments` | Manager-employee assignment requests |
| `resignations` | Resignation workflow documents |
| `terminations` | Termination workflow documents |
| `notifications` | In-app notifications per user |
| `activity_logs` | Full audit trail of all actions |

---

## Error Handling

| HTTP Code | Meaning |
|---|---|
| 400 | Bad request — invalid input or wrong workflow state |
| 401 | Unauthorized — missing, invalid, or expired JWT token |
| 403 | Forbidden — valid token but insufficient role |
| 404 | Not found — resource does not exist |
| 409 | Conflict — duplicate resource (email, active request) |

---

## Testing Guide

### Quick Test Flow

```
1. Open http://127.0.0.1:8000/docs
2. POST /auth/login  →  { "employee_id": "EMP001", "password": "EMP001" }
3. Copy access_token
4. Click Authorize button (top right) → paste token
5. Test any endpoint
```

### End-to-End Workflow Test

```
Step 1  — EMP007 (Manager)  → POST /hiring/request
Step 2  — EMP005 (HR)       → PATCH /hiring/requests/{id}/hr-action   { "action": "approve" }
Step 3  — EMP001 (CEO)      → PATCH /hiring/requests/{id}/ceo-action  { "action": "approve" }

Step 4  — EMP005 (HR)       → POST /onboarding/invite
Step 5  — No login          → POST /onboarding/setup/{invite_id}
Step 6  — EMP005 (HR)       → PATCH /onboarding/requests/{id}/hr-action { "action": "approve" }
Step 7  — EMP007 (Manager)  → PATCH /onboarding/hierarchy-assignments/{id}/manager-action { "action": "accept" }

Step 8  — EMP018 (Employee) → POST /resignations/submit
Step 9  — EMP007 (Manager)  → PATCH /resignations/{id}/manager-action  { "action": "approve" }
Step 10 — EMP005 (HR)       → PATCH /resignations/{id}/hr-action       { "action": "approve" }
Step 11 — EMP005 (HR)       → POST /resignations/{id}/complete-notice

Step 12 — EMP007 (Manager)  → POST /terminations/request
Step 13 — EMP005 (HR)       → PATCH /terminations/{id}/hr-action       { "action": "approve" }
Step 14 — EMP001 (CEO)      → PATCH /terminations/{id}/ceo-action      { "action": "approve" }

Step 15 — Any login         → GET /notifications/
Step 16 — Any login         → GET /hierarchy/org-tree
Step 17 — HR/CEO login      → GET /activity/logs
```

---

## Version

| Version | Description |
|---|---|
| 1.0.0 | FastAPI setup, MongoDB connection |
| 2.0.0 | Authentication, JWT, bcrypt, role-based access |
| 3.0.0 | Full HRMS — Hiring, Onboarding, Hierarchy, Resignation, Termination, Notifications, Activity Logs |
