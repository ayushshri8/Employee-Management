from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
MFA_ISSUER = os.getenv("MFA_ISSUER", "DiagonalHRMS")
INVITE_EXPIRE_HOURS = int(os.getenv("INVITE_EXPIRE_HOURS", 24))
NOTICE_PERIOD_DAYS = int(os.getenv("NOTICE_PERIOD_DAYS", 30))
