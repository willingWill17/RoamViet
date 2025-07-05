from fastapi import FastAPI, Query, Request, HTTPException, Depends, Form, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dataclass.user_account import UserAccount
from dataclass.schedule import Schedule
from dataclass.destination import Destination, Province, Memory
from dataclass.message import Message, MessageResponse, ChatRoom
from firebase_auth import create_user, login_user, verify_google_token, verify_token, refresh_token, send_password_reset_email
from firebase_service import FirebaseService
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import os
import shutil
from pathlib import Path
import json

# Define Pydantic model for friend request payload here
class FriendRequestPayload(BaseModel):
    target_user_email: str

class ForgotPasswordPayload(BaseModel):
    email: str

app = FastAPI(title="Tourism Website API")
security = HTTPBearer()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, conversation_id: str):
        await websocket.accept()
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = []
        self.active_connections[conversation_id].append(websocket)

    def disconnect(self, websocket: WebSocket, conversation_id: str):
        if conversation_id in self.active_connections:
            self.active_connections[conversation_id].remove(websocket)
            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str, conversation_id: str):
        if conversation_id in self.active_connections:
            for connection in self.active_connections[conversation_id]:
                await connection.send_text(message)

manager = ConnectionManager()

def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to verify Firebase token"""
    token = credentials.credentials
    result = verify_token(token)
    if not result["success"]:
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    return result["user"]

def get_user_id_from_token(user_data: dict) -> str:
    """Extract user ID from Firebase user data"""
    return user_data.get("localId") or user_data.get("uid")

def save_uploaded_file(file, user_id: str, file_type: str = "memory") -> str:
    """Save uploaded file to local storage and return the file path"""
    try:
        # Validate file type
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
        file_extension = Path(file.filename).suffix.lower() if file.filename else ""
        
        if file_extension not in allowed_extensions:
            print(f"Invalid file extension: {file_extension}")
            return None
        
        # Create uploads directory structure
        upload_dir = Path(f"uploads/{file_type}s")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{user_id}_{timestamp}{file_extension}"
        file_path = upload_dir / filename
        
        # Save the file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Verify file was saved and has content
        if file_path.exists() and file_path.stat().st_size > 0:
            print(f"✅ File saved successfully: {file_path} ({file_path.stat().st_size} bytes)")
            # Return the relative path for storing in database
            return str(file_path).replace("\\", "/")  # Normalize path separators
        else:
            print(f"❌ File save failed or empty file: {file_path}")
            return None
        
    except Exception as e:
        print(f"Error saving file: {e}")
        return None

@app.get("/")
async def root():
    return {"message": "Welcome to Tourism Website API"}

# =============== AUTHENTICATION ENDPOINTS ===============
@app.post("/api/signup")
async def register(user: UserAccount):
    result = create_user(user.email, user.password, user.username)
    
    # If user registration is successful, create user profile in users collection
    if result.get("success") and result.get("localId"):
        user_profile_data = {
            "username": user.username,
            "email": user.email
        }
        
        # Create user profile in Firestore
        profile_created = FirebaseService.create_or_update_user(
            result["localId"], 
            user_profile_data
        )
        
        if profile_created:
            print(f"✅ User profile created for: {user.email}")
        else:
            print(f"⚠️ User registered but profile creation failed for: {user.email}")
    
    return result

@app.post("/api/login")
def login(user: UserAccount):
    result = login_user(user.email, user.password)
    
    # If login is successful, ensure user profile exists in users collection
    if result.get("success") and result.get("localId"):
        # Check if user profile exists, if not create it
        existing_profile = FirebaseService.get_user_by_id(result["localId"])
        
        if not existing_profile:
            user_profile_data = {
                "username": user.username or user.email.split('@')[0],  # Use email prefix if no username
                "email": user.email
            }
            
            # Create user profile in Firestore
            profile_created = FirebaseService.create_or_update_user(
                result["localId"], 
                user_profile_data
            )
            
            if profile_created:
                print(f"✅ User profile created during login for: {user.email}")
            else:
                print(f"⚠️ Failed to create user profile during login for: {user.email}")
    
    return result

@app.post("/api/verify-token")
async def verify_user_token(request: Request):
    """Verify if the provided token is valid"""
    data = await request.json()
    id_token = data.get('idToken')
    if not id_token:
        return {"message": "No ID token provided", "success": False}
    return verify_token(id_token)

@app.post("/api/refresh-token")
async def refresh_user_token(request: Request):
    """Refresh an expired token"""
    data = await request.json()
    refresh_token_value = data.get('refreshToken')
    if not refresh_token_value:
        return {"message": "No refresh token provided", "success": False}
    return refresh_token(refresh_token_value)

@app.post("/api/forgot-password")
async def forgot_password(payload: ForgotPasswordPayload):
    """Send password reset email"""
    result = send_password_reset_email(payload.email)
    return result

@app.get("/api/profile")
def get_profile_info(user=Depends(verify_firebase_token)):
    """Get user profile information"""
    user_id = get_user_id_from_token(user)
    user_profile = FirebaseService.get_user_by_id(user_id)
    
    if not user_profile:
        raise HTTPException(status_code=404, detail="User profile not found")

    return {
        "message": "Profile retrieved successfully",
        "success": True,
        "user": user_profile
    }

@app.post("/api/profile")
def upload_profile_picture(profilePic: UploadFile = File(...),
                          user=Depends(verify_firebase_token)):
    """Upload profile picture"""
    
    print(f"🔍 DEBUG: Received POST request. profilePic: {profilePic}")
    print(f"🔍 DEBUG: profilePic type: {type(profilePic)}")
    if profilePic:
        print(f"🔍 DEBUG: profilePic.filename: {profilePic.filename}")
        print(f"🔍 DEBUG: profilePic.content_type: {profilePic.content_type}")
    
    if not profilePic or profilePic.filename == "":
        print("🔍 DEBUG: No file or empty filename")
        raise HTTPException(status_code=400, detail="No file provided")
    
    print("🔍 DEBUG: File received:", profilePic.filename)
    content = profilePic.file.read()
    print("🔍 DEBUG: File size:", len(content))
    print("🔍 DEBUG: Content type:", profilePic.content_type)
    
    # TODO: Save the file and update user profile
    # For now, just return success
    return {"message": "Upload received", "filename": profilePic.filename, "size": len(content)}


@app.post("/api/google-login")
async def google_login(request: Request):
    data = await request.json()
    id_token = data.get('idToken')
    if not id_token:
        return {"message": "No ID token provided", "success": False}
    return verify_google_token(id_token)

# =============== PROVINCE ENDPOINTS ===============

@app.get("/api/get_province/{province_name}")
def get_province(province_name: str, user=Depends(verify_firebase_token)):
    """Get province by name"""
    try:
        print(f"🔍 Searching for province: {province_name}")
        province = FirebaseService.get_province_by_name(province_name)
        # print('226', province)
        print(type(province))
        if province:
            
            return {
                "success": True,
                "data": province,
                "message": "Province retrieved successfully"
            }
        else:
            print(f"❌ Province not found: {province_name}")
            return {
                "success": False,
                "data": {
                    "name": province_name,
                    "description": "Information is being updated.",
                    "attractions": ["Under development"],
                    "famous_for": []
                },
                "message": "Province not found, showing default data"
            }
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Error retrieving province: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving province: {str(e)}")

@app.get("/api/provinces/{province_id}/with-destinations")
def get_province_with_destinations(province_id: str, user=Depends(verify_firebase_token)):
    """Get province with all its destinations"""
    try:
        province_data = FirebaseService.get_province_with_destinations(province_id)
        if province_data:
            return {
                "success": True,
                "data": province_data,
                "message": "Province with destinations retrieved successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Province not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving province with destinations: {str(e)}")

# =============== DESTINATION ENDPOINTS ===============

@app.post("/api/destinations")
async def create_destination(destination: Destination, user=Depends(verify_firebase_token)):
    """Create a new destination (admin function)"""
    try:
        destination_data = destination.dict()
        destination_id = FirebaseService.create_destination(destination_data)
        
        if destination_id:
            return {
                "success": True,
                "destination_id": destination_id,
                "message": "Destination created successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create destination")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating destination: {str(e)}")

@app.get("/api/destinations")
def get_destinations(
    location_id: Optional[str] = Query(None, description="Filter by province ID"),
    limit: Optional[int] = Query(20, description="Maximum number of results"),
    user=Depends(verify_firebase_token)
):
    """Get destinations with optional filters"""
    try:
        if location_id:
            destinations = FirebaseService.get_destinations_by_province(location_id, limit)
        else:
            destinations = FirebaseService.get_all_destinations(limit)
        
        return {
            "success": True,
            "data": destinations,
            "total": len(destinations),
            "message": "Destinations retrieved successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving destinations: {str(e)}")

@app.get("/api/destinations/search")
def search_destinations(
    q: str = Query(..., description="Search query"),
    location_id: Optional[str] = Query(None, description="Filter by province ID"),
    limit: Optional[int] = Query(20, description="Maximum number of results"),
    user=Depends(verify_firebase_token)
):
    """Search destinations by name"""
    try:
        destinations = FirebaseService.search_destinations(q, location_id, limit)
        
        return {
            "success": True,
            "data": destinations,
            "total": len(destinations),
            "query": q,
            "message": "Search completed successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching destinations: {str(e)}")

@app.get("/api/destinations/{destination_id}")
def get_destination_by_id(destination_id: str, user=Depends(verify_firebase_token)):
    """Get destination details by ID"""
    try:
        destination = FirebaseService.get_destination_by_id(destination_id)
        if destination:
            return {
                "success": True,
                "data": destination,
                "message": "Destination retrieved successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Destination not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving destination: {str(e)}")

@app.put("/api/destinations/{destination_id}")
async def update_destination(destination_id: str, destination: Destination, user=Depends(verify_firebase_token)):
    """Update destination information (admin function)"""
    try:
        update_data = destination.dict(exclude_unset=True)
        success = FirebaseService.update_destination(destination_id, update_data)
        
        if success:
            return {
                "success": True,
                "message": "Destination updated successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Destination not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating destination: {str(e)}")

@app.delete("/api/destinations/{destination_id}")
async def delete_destination(destination_id: str, user=Depends(verify_firebase_token)):
    """Delete destination (admin function)"""
    try:
        success = FirebaseService.delete_destination(destination_id)
        
        if success:
            return {
                "success": True,
                "message": "Destination deleted successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Destination not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting destination: {str(e)}")

# =============== SCHEDULE ENDPOINTS ===============

@app.post("/api/schedules")
async def create_schedule(schedule: Schedule, user=Depends(verify_firebase_token)):
    """Create a new travel schedule"""
    try:
        print(schedule)
        user_id = get_user_id_from_token(user)
        
        # Convert Pydantic model to dictionary and add necessary fields
        schedule_data_dict = schedule.model_dump()
        schedule_data_dict["user_id"] = user_id
        schedule_data_dict["created_at"] = datetime.now()
        schedule_data_dict["updated_at"] = datetime.now()
        
        # Overwrite 'schedule' variable with the new dictionary, as per original pattern
        schedule = schedule_data_dict
        schedule_id = FirebaseService.create_schedule(user_id, schedule)
        
        if schedule_id:
            print(f"✅ Schedule created successfully with ID: {schedule_id}")
            return {
                "success": True,
                "schedule_id": schedule_id,
                "message": "Schedule created successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create schedule")
            
    except Exception as e:
        print(f"407, ❌ Error creating schedule: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating schedule: {str(e)}")

@app.get("/api/get_schedules")
async def get_schedule(user=Depends(verify_firebase_token)):
    """Create a new travel schedule"""
    try:
        
        user_id = get_user_id_from_token(user)
        print(f"🔍 Getting shared schedules for user_id: {user_id}")

        owned_schedules = FirebaseService.get_user_schedules(user_id)
        shared_schedules = FirebaseService.get_schedules_shared_with_userid(user_id)
        
        return {
            "success": True,
            "shared_data": shared_schedules,
            "owned_data": owned_schedules,
            "message": "All shared and public schedules retrieved successfully"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving public schedules: {str(e)}")

@app.get("/api/schedules/{schedule_id}")
async def get_schedule(schedule_id: str):
    """Get a specific schedule by ID"""
    try:
        # user_id = get_user_id_from_token(user)
        schedule = FirebaseService.get_schedule_by_id(schedule_id)
        
        if schedule:
            return {
                "success": True,
                "data": schedule,
                "message": "Schedule retrieved successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Schedule not found or access denied")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving schedule: {str(e)}")

@app.delete("/api/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str, user=Depends(verify_firebase_token)):
    """Delete a user's schedule"""
    try:
        user_id = get_user_id_from_token(user)
        success = FirebaseService.delete_schedule(schedule_id, user_id)
        
        if success:
            return {
                "success": True,
                "message": "Schedule deleted successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Schedule not found or unauthorized")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting schedule: {str(e)}")

# =============== MEMORY ENDPOINTS ===============


@app.get("/api/memories")
async def get_user_memories(user=Depends(verify_firebase_token)):
    """Get all memories for the authenticated user"""
    try:
        user_id = get_user_id_from_token(user)
        print(user_id)
        memories = FirebaseService.get_user_memories(user_id)
        
        return {
            "success": True,
            "data": memories,
            "message": "Memories retrieved successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving memories: {str(e)}")

@app.post("/api/memories")
async def create_memory(
    memory_name: str = Form(...),
    description: str = Form(...),
    province: str = Form(...),
    created_at: str = Form(...), 
    shared_emails: List[str] = Form(...),
    photo: Optional[UploadFile] = File(None),
    user=Depends(verify_firebase_token)
    ):
    """Create a new memory for the authenticated user"""
    try:
        
        user_id = get_user_id_from_token(user)

        # Construct memory_data from Form fields
        memory_data = {
            "memory_name": memory_name,
            "description": description,
            "province": province,
            "shared_emails": shared_emails,
            "created_at": created_at, 
            # photo_url will be added after successful save
        }

        # Validate required fields (already handled by Form(...) but good for clarity)
        if not memory_data['memory_name'] or not memory_data['description']:
            raise HTTPException(status_code=400, detail="Memory name and description are required")
        
        # Handle photo upload if present
        saved_photo_path = None 
        if photo and photo.filename:
            # Save the file to local storage
            saved_photo_path = save_uploaded_file(photo, user_id, "memory")
            if saved_photo_path:
                print(f"✅ File saved successfully: {saved_photo_path}")
            else:
                print("❌ Failed to save uploaded file")

        # Create the memory
        if shared_emails:
            memory_id = FirebaseService.create_shared_memory(user_id, memory_data, shared_emails,saved_photo_path)
        else:
            memory_id = FirebaseService.create_memory(user_id, memory_data, saved_photo_path)
        
        if memory_id:  
            data = {
                "memory_name": memory_name,
                "description": description,
                "province": province,
                "created_at": created_at, 
                "photo_url" : saved_photo_path
            }

            return {
                "success": True,
                "data" : data,
            } 
        else:
            raise HTTPException(status_code=500, detail="Failed to create memory")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating memory: {str(e)}") 
        raise HTTPException(status_code=500, detail=f"Error creating memory: {str(e)}")

@app.get("/api/memories/{memory_id}")
async def delete_memory(memory_id: str, user=Depends(verify_firebase_token)):
    """Delete a specific memory by ID (only if it belongs to the user)"""
    try:
        user_id = get_user_id_from_token(user)
        memory = FirebaseService.delete_memory(memory_id, user_id)
        return {
            "success": True,
            "data": memory,
            "message": "Memory retrieved successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving memory: {str(e)}")

@app.get("/api/memories/province/{province_name}")
async def get_memories_by_province(province_name: str, user=Depends(verify_firebase_token)):
    """Get user's memories for a specific province"""
    try:
        user_id = get_user_id_from_token(user)
        memories = FirebaseService.get_memories_by_province(user_id, province_name)
        
        return {
            "success": True,
            "data": memories,
            "total": len(memories),
            "province": province_name,
            "message": "Province memories retrieved successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving province memories: {str(e)}")

# =============== FILE SERVING ENDPOINTS ===============

@app.get("/uploads/{file_type}/{filename}")
async def serve_uploaded_file(file_type: str, filename: str):
    """Serve uploaded files (photos, etc.)"""
    try:
        file_path = Path(f"uploads/{file_type}") / filename
        
        # Security check: ensure the file exists and is within the uploads directory
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Resolve the path to prevent directory traversal attacks
        resolved_path = file_path.resolve()
        uploads_path = Path("uploads").resolve()
        
        if not str(resolved_path).startswith(str(uploads_path)):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Determine MIME type based on file extension
        file_extension = file_path.suffix.lower()
        mime_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        }
        media_type = mime_types.get(file_extension, 'image/jpeg')
        
        return FileResponse(
            path=str(resolved_path),
            media_type=media_type,
            filename=filename
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving file: {str(e)}")

# =============== MESSAGING ENDPOINTS ===============

@app.websocket("/ws/conversations/{conversation_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    conversation_id: str, 
    token: str = Query(...)
):
    """Handle WebSocket connections for real-time messaging"""
    user_id = None # Initialize user_id to ensure it's available in finally block
    try:
        # 1. Authenticate user
        result = verify_token(token)
        if not result.get("success"):
            await websocket.close(code=4001) # Custom code for auth failure
            return

        user_data = result["user"]
        user_id = get_user_id_from_token(user_data)
        
        # 2. Authorize user for the conversation
        conversations = FirebaseService.get_conversations(user_id)
        conversation_ids = [conv['id'] for conv in conversations if 'id' in conv]
        
        if conversation_id not in conversation_ids:
            await websocket.close(code=4003) # Custom code for forbidden access
            return
            
        # 3. Connect user to the conversation
        await manager.connect(websocket, conversation_id)
        
        # Announce user has joined
        user_info = FirebaseService.get_user_by_id(user_id)
        if user_info:
            join_message = {
                "type": "status",
                "message": f"User {user_info.get('username', 'Anonymous')} has joined the chat."
            }
            await manager.broadcast(json.dumps(join_message), conversation_id)

        # 4. Listen for incoming messages
        while True:
            content = await websocket.receive_text()
            
            message_id = FirebaseService.send_message(conversation_id, user_id, content)
            
            if message_id:
                response_message = {
                    "id": message_id,
                    "sender_id": user_id,
                    "conversation_id": conversation_id,
                    "sender_name": user_info.get("username", "Unknown"),
                    "content": content,
                    "timestamp": datetime.now().isoformat()
                }
                await manager.broadcast(json.dumps(response_message), conversation_id)
            else:
                error_message = {"type": "error", "message": "Failed to send message."}
                await websocket.send_text(json.dumps(error_message))

    except WebSocketDisconnect:
        # This block is entered when the client disconnects gracefully.
        pass
    except Exception as e:
        # Log unexpected errors
        print(f"💥 WebSocket Error: {e}")
    finally:
        # 5. Handle disconnection
        manager.disconnect(websocket, conversation_id)
        
        # Announce user has left
        if user_id:
            user_info = FirebaseService.get_user_by_id(user_id)
            if user_info:
                leave_message = {
                    "type": "status",
                    "message": f"User {user_info.get('username', 'Anonymous')} has left the chat."
                }
                await manager.broadcast(json.dumps(leave_message), conversation_id)

@app.get("/api/conversations")
async def get_conversations(user=Depends(verify_firebase_token)):
    """Get all conversations for the current user"""
    try:
        user_id = get_user_id_from_token(user)
        conversations_from_db = FirebaseService.get_conversations(user_id)
        
        # Transform the data to match the new frontend expectations
        transformed_conversations = []
        for conv in conversations_from_db:
            # Get current user's full profile to be a participant
            current_user_profile = FirebaseService.get_user_by_id(user_id)
            
            # The other participant is already fetched as 'other_user_info'
            other_user_profile = conv.get('other_user_info')
            
            # Create the participants list
            participants = []
            if current_user_profile:
                participants.append(current_user_profile)
            if other_user_profile:
                participants.append(other_user_profile)
                
            conv['participants'] = participants
            transformed_conversations.append(conv)
            
        return {
            "success": True,
            "data": transformed_conversations,
            "message": "Conversations retrieved successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving conversations: {str(e)}")

@app.post("/api/conversations")
async def create_conversation(request: Request, user=Depends(verify_firebase_token)):
    """Create a new conversation or get existing one"""
    try:
        data = await request.json()
        other_user_id = data.get('other_user_id')
        
        if not other_user_id:
            raise HTTPException(status_code=400, detail="other_user_id is required")
        
        user_id = get_user_id_from_token(user)
        
        conversation_id = FirebaseService.create_conversation(user_id, other_user_id)
        
        if conversation_id:
            return {
                "success": True,
                "conversation_id": conversation_id,
                "message": "Conversation created successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create conversation")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating conversation: {str(e)}")

@app.get("/api/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user=Depends(verify_firebase_token)
):
    """Get messages from a conversation"""
    try:
        user_id = get_user_id_from_token(user)
        
        # Verify user is part of this conversation
        conversations = FirebaseService.get_conversations(user_id)
        conversation_ids = [conv['id'] for conv in conversations]
        
        if conversation_id not in conversation_ids:
            raise HTTPException(status_code=403, detail="Access denied to this conversation")
        
        messages = FirebaseService.get_messages(conversation_id, limit, offset)
        
        return {
            "success": True,
            "data": messages,
            "message": "Messages retrieved successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving messages: {str(e)}")

# =============== FRIEND REQUEST ENDPOINTS ===============

@app.post("/api/friends/request", summary="Send a friend request")
async def send_friend_request_endpoint(
    payload: FriendRequestPayload, 
    user_data=Depends(verify_firebase_token)
):
    """Sends a friend request from the authenticated user to the target_user_id."""
    requester_id = get_user_id_from_token(user_data)
    print(payload.target_user_email) 
    if not payload.target_user_email:
        raise HTTPException(status_code=400, detail="target_user_id is required.")

    # Call the service function
    result = FirebaseService.create_friend_request(
        requester_id=requester_id,
        recipient_email=payload.target_user_email
    )

    if result.get("success"):
        return {
            "success": True, 
            "message": result.get("message", "Friend request sent successfully."), 
            "request_id": result.get("request_id")
        }
    else:
        error_message = result.get("message", "An error occurred while sending the friend request.")
        status_code = 500 # Default to server error
        
        # More specific error codes based on messages from the service layer
        if "Bạn không thể gửi yêu cầu kết bạn cho chính mình" in error_message or \
           "Bạn đã gửi yêu cầu kết bạn tới người này rồi" in error_message or \
           "Người này đã gửi cho bạn một yêu cầu kết bạn đang chờ xử lý" in error_message or \
           "Bạn đã là bạn bè với người này" in error_message: # Assuming this check might be added later
            status_code = 409 # Conflict
        elif "User not found" in error_message: # If service layer adds target user validation
            status_code = 404 # Not Found
            
        raise HTTPException(status_code=status_code, detail=error_message)

@app.get("/api/friend_requests")
async def get_friend_request(user=Depends(verify_firebase_token)):
    ###SEND BACK FRIEND REQUEST!
    try: 
        user_id = get_user_id_from_token(user)    
        friends, pending = FirebaseService.get_friends(user_id)    

        return {
            "success" : True,
            "friends" : friends,
            "pending" : pending,
            "message" : "Get friends status succesfully!"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching users: {str(e)}")

@app.post("/api/friend_requests")
async def update_friend_status(
    request_email: str = Form(...),
    action: str = Form(...),
    user=Depends(verify_firebase_token)
):
    recipient_id = get_user_id_from_token(user)
    requester_id = FirebaseService.get_user_by_email(request_email)
    res = FirebaseService.update_friend_status(requester_id["id"], recipient_id, action)
    return {
        "success": True,
        "data": res
    }

@app.get("/api/users")
async def users(
    user=Depends(verify_firebase_token)
    ):
    try:
        user_id = get_user_id_from_token(user)
        users = FirebaseService.all_users(user_id)
        return {
                "success" : True,
                "data" : users,
                "message" : "All users for searching"
                }
    except:
        return {
                "success" : False,
                "message" : "Bloddy hell!!!"
                }
        
if __name__ == "__main__":
    import uvicorn
    uvicorn.run('main:app', host='127.0.0.1', port=3053)
