from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.auth_routes        import router as auth_router
from app.routes.dashboard_routes   import router as dashboard_router
from app.routes.employee_routes    import router as employee_router
from app.routes.hiring_routes      import router as hiring_router
from app.routes.onboarding_routes  import router as onboarding_router
from app.routes.resignation_routes import router as resignation_router
from app.routes.termination_routes import router as termination_router
from app.routes.hierarchy_routes   import router as hierarchy_router
from app.routes.notification_routes import router as notification_router
from app.routes.activity_routes    import router as activity_router

app = FastAPI(
    title="Diagonal HRMS API",
    description="""
## Diagonal Employee Record & Hierarchy Management System
    """,
    version="3.0.0",
)

# ── CORS — allow frontend on any port during development ──────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(employee_router)
app.include_router(hiring_router)
app.include_router(onboarding_router)
app.include_router(resignation_router)
app.include_router(termination_router)
app.include_router(hierarchy_router)
app.include_router(notification_router)
app.include_router(activity_router)


@app.get("/", tags=["Health"])
def health():
    return {
        "status": "running",
        "system": "Diagonal HRMS",
        "version": "3.0.0",
        "docs": "/docs",
    }
