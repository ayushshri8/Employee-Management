from pymongo import MongoClient
from app.config.settings import MONGO_URI, DATABASE_NAME

client = MongoClient(
    MONGO_URI,
    tls=True,
    tlsAllowInvalidCertificates=True,
    serverSelectionTimeoutMS=1200000,
    connectTimeoutMS=1200000,
    socketTimeoutMS=1200000,
)

db = client[DATABASE_NAME]
