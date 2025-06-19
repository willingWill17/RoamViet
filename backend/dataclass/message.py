from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Message(BaseModel):
    content: str
    sender_id: str
    receiver_id: str
    message_type: Optional[str] = "text"  # text, image, location
    attachment_url: Optional[str] = None
    is_read: Optional[bool] = False

class MessageResponse(BaseModel):
    id: str
    content: str
    sender_id: str
    receiver_id: str
    message_type: str
    attachment_url: Optional[str] = None
    is_read: bool
    created_at: str
    sender_name: Optional[str] = None

class ChatRoom(BaseModel):
    participant_ids: list[str]
    last_message: Optional[str] = None
    last_message_time: Optional[str] = None
    unread_count: Optional[dict] = {} 