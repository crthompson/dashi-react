import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("DASHI_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dashi.db")
STATIC_DIR = os.getenv("STATIC_DIR", "../frontend/dist")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
