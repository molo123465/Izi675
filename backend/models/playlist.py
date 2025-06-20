from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid

class Channel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    url: str
    logo: Optional[str] = None
    category: Optional[str] = "General"
    is_live: bool = True
    group_title: Optional[str] = None
    tvg_id: Optional[str] = None
    tvg_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ChannelCreate(BaseModel):
    name: str
    url: str
    logo: Optional[str] = None
    category: Optional[str] = "General"
    group_title: Optional[str] = None
    tvg_id: Optional[str] = None
    tvg_name: Optional[str] = None

class Playlist(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    url: Optional[str] = None
    file_path: Optional[str] = None
    channel_count: int = 0
    channels: List[Channel] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_updated: datetime = Field(default_factory=datetime.utcnow)

class PlaylistCreate(BaseModel):
    name: str
    url: Optional[str] = None

class PlaylistResponse(BaseModel):
    id: str
    name: str
    url: Optional[str] = None
    channel_count: int
    created_at: datetime
    last_updated: datetime

class ChannelResponse(BaseModel):
    id: str
    name: str
    url: str
    logo: Optional[str] = None
    category: Optional[str] = None
    is_live: bool
    group_title: Optional[str] = None