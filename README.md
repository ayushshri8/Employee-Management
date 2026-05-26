# Diagonal HRMS

A full-stack Human Resource Management System built with **FastAPI** (Python) and **React** (Vite). It covers the complete employee lifecycle — from hiring and onboarding to resignations and terminations — with role-based access control, MFA support, and real-time notifications.

---

## Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | React 19, Bootstrap 5, Bootstrap Icons |
| Backend   | FastAPI 0.111, Python, Uvicorn          |
| Database  | MongoDB (via PyMongo)                   |
| Auth      | JWT (python-jose), bcrypt, TOTP (pyotp) |

---

## Features

### Authentication & Security
- JWT-based login with role-aware token payload
- bcrypt password hashing — default password = Employee ID
- TOTP-based Two-Factor Authentication (MFA) with QR code setup
- Admin MFA reset and password reset (HR / CEO only)

### Role-Based Access Control
| Role     | Access Level |
|----------|-------------|
| CEO      | Full access — all modules, approvals, create employees |
| HR       | Full access — all modules, create employees |
| CFO / CIO / CTO | Executive dashboards, read-only employee directory |
| Manager  | Team management, hiring requests, resignation approvals |
| Employee | Own profile, submit resignation |
| Intern   | Own profile only |

### Modules
- **Dashboard** — Role-specific KPIs and stats (Executive / HR / Employee views)
- **Employees** — Directory with search & filters, profile viewer, activate/deactivate, create employee (HR/CEO)
- **Hiring** — Hiring requests with HR and CEO approval workflow
- **Onboarding** — Invite-based onboarding with profile setup and manager assignment
- **Hierarchy** — Org tree visualisation and manager reassignment
- **Resignations** — Employee resignation submission with manager → HR approval chain
- **Terminations** — Termination requests with HR and CEO approval
- **Notifications** — In-app notifications with unread badge and mark-all-read
- **Activity Logs** — Full audit trail of all system actions (HR/CEO only)

---

## Project Structure

```
PROJECT - 2/
├── Backend/
│   ├── app/
│   │   ├── auth/           # JWT, bcrypt, OAuth2 dependencies
│   │   ├── config/         # Environment settings
│   │   ├── database/       # MongoDB connection
│   │   ├── models/         # User document builder
│   │   ├── routes/         # All API route handlers
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   ├── services/       # Activity logging, notifications, hierarchy
│   │   ├── utils/          # ID generators, date utils, seed script
│   │   └── main.py         # FastAPI app entry point
│   ├── .env
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── Components/     # Sidebar, Topbar, Footer, MfaModal
    │   ├── context/        # AuthContext (global auth state)
    │   ├── pages/          # One file per module/page
    │   ├── api.js          # Centralised API call functions
    │   └── App.jsx         # Routing and layout
    ├── .env
    └── package.json
```

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- A MongoDB Atlas cluster (or local MongoDB)

---

### Backend Setup

```bash
cd "PROJECT - 2/Backend"

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in the `Backend/` folder:

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

Start the server:

```bash
uvicorn app.main:app --reload
```

API runs at `http://127.0.0.1:8000`
Interactive docs at `http://127.0.0.1:8000/docs`

---

### Frontend Setup

```bash
cd "PROJECT - 2/frontend"

npm install
```

Create a `.env` file in the `frontend/` folder:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Start the dev server:

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## Default Credentials

| Employee ID | Password  | Role     |
|-------------|-----------|----------|
| EMP001      | EMP001    | CEO      |
| EMP002      | EMP002    | HR       |
| EMP003      | EMP003    | Manager  |

> Default password for every employee is their **Employee ID**. Users should change it after first login.

---

## API Overview

| Prefix          | Description                        |
|-----------------|------------------------------------|
| `/auth`         | Login, MFA setup/verify, password  |
| `/employees`    | Employee CRUD, profile, activate   |
| `/dashboard`    | Role-specific dashboard stats      |
| `/hiring`       | Hiring requests and approvals      |
| `/onboarding`   | Invites, profile setup, assignments|
| `/resignations` | Submit and approve resignations    |
| `/terminations` | Request and approve terminations   |
| `/hierarchy`    | Org tree and manager reassignment  |
| `/notifications`| In-app notifications               |
| `/activity`     | Audit logs                         |

Full interactive API documentation is available at `/docs` (Swagger UI) when the backend is running.

---

## Environment Variables Reference

### Backend (`Backend/.env`)

| Variable                   | Description                          | Default   |
|----------------------------|--------------------------------------|-----------|
| `MONGO_URI`                | MongoDB connection string            | —         |
| `DATABASE_NAME`            | MongoDB database name                | —         |
| `SECRET_KEY`               | JWT signing secret                   | —         |
| `ALGORITHM`                | JWT algorithm                        | `HS256`   |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry in minutes           | `60`      |
| `MFA_ISSUER`               | Issuer name shown in authenticator   | `DiagonalHRMS` |
| `INVITE_EXPIRE_HOURS`      | Onboarding invite link expiry        | `24`      |
| `NOTICE_PERIOD_DAYS`       | Default resignation notice period    | `30`      |

### Frontend (`frontend/.env`)

| Variable        | Description              | Default                    |
|-----------------|--------------------------|----------------------------|
| `VITE_API_URL`  | Backend API base URL     | `http://127.0.0.1:8000`    |

---

## Build for Production

**Backend** — deploy with any ASGI host (e.g. Railway, Render, EC2):
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
npm run build
# Output in frontend/dist/ — serve with Nginx, Vercel, or any static host
```
