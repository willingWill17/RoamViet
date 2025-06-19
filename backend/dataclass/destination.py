from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

class Destination(BaseModel):
    """Simple destination model - just the name"""
    location_name: str
    location_description: str
    location_type: str
    location_open_time: str
    location_address: str
    location_images: List[str]
    # created_at: datetime = Field(default_factory=datetime.now)

class Province(BaseModel):
    """Province with nested destinations"""
    province_id: int
    province_name: str
    description: Optional[str] = None
    famous_for: Optional[List[str]] = Field(default_factory=list)
    destinations: Optional[Dict[str, Destination]] = Field(default_factory=dict)

class Memory(BaseModel):
    created_by_user_id: str = Field(..., description="ID of the user who created this memory")
    memory_name: str = Field(..., description="Name of the memory")
    description: str = Field(..., description="Description of the memory/experience")
    province: str = Field(..., description="Province name where the memory was created")
    # province_id: Optional[str] = Field(None, description="ID of the province, if available") # Optional: Consider if you need this based on FirebaseService
    photo_url: Optional[str] = Field(None, description="URL of the uploaded photo")
    shared_email: Optional[List[str]] = Field(default_factory=list, description="List of user IDs this memory is shared with")
    created_at: datetime = Field(default_factory=datetime.now, description="Creation timestamp")
    