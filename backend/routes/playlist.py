from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from models.playlist import Playlist, PlaylistCreate, PlaylistResponse, Channel, ChannelResponse
from services.m3u_parser import M3UParser
from typing import List, Optional
import os
import uuid
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/playlists", tags=["playlists"])

# Get database from server.py
from server import db

# Initialize M3U parser
m3u_parser = M3UParser()

# Ensure upload directory exists
UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=PlaylistResponse)
async def upload_playlist_file(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None)
):
    """Upload and parse M3U/M3U8 file"""
    try:
        # Validate file type
        if not file.filename.endswith(('.m3u', '.m3u8')):
            raise HTTPException(
                status_code=400,
                detail="Solo se permiten archivos .m3u y .m3u8"
            )
        
        # Read file content
        content = await file.read()
        file_content = content.decode('utf-8')
        
        # Parse M3U content
        channels = m3u_parser.parse_from_file(file_content)
        
        # Create playlist name
        playlist_name = name or file.filename
        
        # Save file
        filename = f"{uuid.uuid4()}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(file_content)
        
        # Create playlist object
        playlist = Playlist(
            name=playlist_name,
            file_path=file_path,
            channel_count=len(channels),
            channels=channels
        )
        
        # Save to database
        playlist_dict = playlist.dict()
        result = await db.playlists.insert_one(playlist_dict)
        
        logger.info(f"Uploaded playlist {playlist_name} with {len(channels)} channels")
        
        return PlaylistResponse(
            id=playlist.id,
            name=playlist.name,
            url=playlist.url,
            channel_count=playlist.channel_count,
            created_at=playlist.created_at,
            last_updated=playlist.last_updated
        )
        
    except Exception as e:
        logger.error(f"Error uploading playlist: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/url", response_model=PlaylistResponse)
async def add_playlist_from_url(playlist_data: PlaylistCreate):
    """Add playlist from URL"""
    try:
        if not playlist_data.url:
            raise HTTPException(status_code=400, detail="URL es requerida")
        
        # Parse M3U from URL
        channels = m3u_parser.parse_from_url(playlist_data.url)
        
        # Create playlist object
        playlist = Playlist(
            name=playlist_data.name,
            url=playlist_data.url,
            channel_count=len(channels),
            channels=channels
        )
        
        # Save to database
        playlist_dict = playlist.dict()
        result = await db.playlists.insert_one(playlist_dict)
        
        logger.info(f"Added playlist {playlist_data.name} from URL with {len(channels)} channels")
        
        return PlaylistResponse(
            id=playlist.id,
            name=playlist.name,
            url=playlist.url,
            channel_count=playlist.channel_count,
            created_at=playlist.created_at,
            last_updated=playlist.last_updated
        )
        
    except Exception as e:
        logger.error(f"Error adding playlist from URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[PlaylistResponse])
async def get_playlists():
    """Get all playlists"""
    try:
        playlists = await db.playlists.find({}, {
            "channels": 0  # Exclude channels from list view
        }).to_list(1000)
        
        return [
            PlaylistResponse(
                id=p["id"],
                name=p["name"],
                url=p.get("url"),
                channel_count=p["channel_count"],
                created_at=p["created_at"],
                last_updated=p["last_updated"]
            )
            for p in playlists
        ]
        
    except Exception as e:
        logger.error(f"Error getting playlists: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{playlist_id}/channels", response_model=List[ChannelResponse])
async def get_playlist_channels(
    playlist_id: str,
    category: Optional[str] = None,
    search: Optional[str] = None
):
    """Get channels from a playlist with optional filtering"""
    try:
        playlist = await db.playlists.find_one({"id": playlist_id})
        
        if not playlist:
            raise HTTPException(status_code=404, detail="Playlist no encontrada")
        
        channels = [Channel(**ch) for ch in playlist["channels"]]
        
        # Apply filters
        if category and category != "Todos":
            channels = m3u_parser.filter_channels_by_category(channels, category)
        
        if search:
            channels = m3u_parser.search_channels(channels, search)
        
        return [
            ChannelResponse(
                id=ch.id,
                name=ch.name,
                url=ch.url,
                logo=ch.logo,
                category=ch.category,
                is_live=ch.is_live,
                group_title=ch.group_title
            )
            for ch in channels
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting playlist channels: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/channels", response_model=List[ChannelResponse])
async def get_all_channels(
    category: Optional[str] = None,
    search: Optional[str] = None
):
    """Get all channels from all playlists with optional filtering"""
    try:
        all_channels = []
        
        # Get all playlists
        playlists = await db.playlists.find({}).to_list(1000)
        
        # Collect all channels
        for playlist in playlists:
            channels = [Channel(**ch) for ch in playlist.get("channels", [])]
            all_channels.extend(channels)
        
        # Apply filters
        if category and category != "Todos":
            all_channels = m3u_parser.filter_channels_by_category(all_channels, category)
        
        if search:
            all_channels = m3u_parser.search_channels(all_channels, search)
        
        return [
            ChannelResponse(
                id=ch.id,
                name=ch.name,
                url=ch.url,
                logo=ch.logo,
                category=ch.category,
                is_live=ch.is_live,
                group_title=ch.group_title
            )
            for ch in all_channels
        ]
        
    except Exception as e:
        logger.error(f"Error getting all channels: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories")
async def get_categories():
    """Get all unique categories from all channels"""
    try:
        all_channels = []
        
        # Get all playlists
        playlists = await db.playlists.find({}).to_list(1000)
        
        # Collect all channels
        for playlist in playlists:
            channels = [Channel(**ch) for ch in playlist.get("channels", [])]
            all_channels.extend(channels)
        
        categories = m3u_parser.get_categories(all_channels)
        categories.insert(0, "Todos")  # Add "All" option at the beginning
        
        return categories
        
    except Exception as e:
        logger.error(f"Error getting categories: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{playlist_id}")
async def delete_playlist(playlist_id: str):
    """Delete a playlist"""
    try:
        # Find playlist
        playlist = await db.playlists.find_one({"id": playlist_id})
        
        if not playlist:
            raise HTTPException(status_code=404, detail="Playlist no encontrada")
        
        # Delete file if exists
        if playlist.get("file_path") and os.path.exists(playlist["file_path"]):
            os.remove(playlist["file_path"])
        
        # Delete from database
        result = await db.playlists.delete_one({"id": playlist_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Playlist no encontrada")
        
        return {"message": "Playlist eliminada exitosamente"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting playlist: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{playlist_id}/refresh", response_model=PlaylistResponse)
async def refresh_playlist(playlist_id: str):
    """Refresh playlist from URL (only for URL-based playlists)"""
    try:
        # Find playlist
        playlist = await db.playlists.find_one({"id": playlist_id})
        
        if not playlist:
            raise HTTPException(status_code=404, detail="Playlist no encontrada")
        
        if not playlist.get("url"):
            raise HTTPException(
                status_code=400, 
                detail="Solo se pueden actualizar playlists basadas en URL"
            )
        
        # Parse updated content
        channels = m3u_parser.parse_from_url(playlist["url"])
        
        # Update playlist
        update_data = {
            "channels": [ch.dict() for ch in channels],
            "channel_count": len(channels),
            "last_updated": datetime.utcnow()
        }
        
        await db.playlists.update_one(
            {"id": playlist_id},
            {"$set": update_data}
        )
        
        logger.info(f"Refreshed playlist {playlist['name']} with {len(channels)} channels")
        
        return PlaylistResponse(
            id=playlist["id"],
            name=playlist["name"],
            url=playlist["url"],
            channel_count=len(channels),
            created_at=playlist["created_at"],
            last_updated=update_data["last_updated"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing playlist: {e}")
        raise HTTPException(status_code=500, detail=str(e))