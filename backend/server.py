from fastapi import FastAPI, APIRouter
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path

# Import routes
from routes.playlist import router as playlist_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'iptv_db')]

# Create the main app without a prefix
app = FastAPI(title="IPTV Player API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Basic health check
@api_router.get("/")
async def root():
    return {"message": "IPTV Player API is running", "status": "ok"}

@api_router.get("/health")
async def health_check():
    try:
        # Test database connection
        await db.command("ping")
        return {
            "status": "healthy",
            "database": "connected",
            "message": "IPTV Player API is working correctly"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }

# Include playlist routes
api_router.include_router(playlist_router)

# Include the router in the main app
app.include_router(api_router)

# Create uploads directory if it doesn't exist
os.makedirs("/app/uploads", exist_ok=True)

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory="/app/uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db_client():
    logger.info("Starting IPTV Player API")
    logger.info("Connected to MongoDB")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("Disconnected from MongoDB")