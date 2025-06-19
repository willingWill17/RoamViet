import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
from typing import List, Dict, Any, Optional
import json
import os
from dataclass.destination import Memory
# Initialize Firebase Admin SDK
def initialize_firebase():
    """Initialize Firebase Admin SDK with service account credentials"""
    try:
        # Check if Firebase is already initialized
        firebase_admin.get_app()
    except ValueError:
        # Firebase not initialized, so initialize it
        cred_path = "authenticate.json"  # Your service account key file
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            raise FileNotFoundError("Firebase service account key file not found")

# Initialize Firebase when this module is imported
initialize_firebase()

# Get Firestore client
db = firestore.client()

class FirebaseService:
    
    @staticmethod
    def create_province_key(name: str) -> str:
        """Convert province name to Firebase key (lowercase, hyphens)"""
        return name.lower().replace(' ', '-').replace('&', 'and')
    
    @staticmethod
    def create_destination_key(name: str) -> str:
        """Convert destination name to Firebase key"""
        return name.lower().replace(' ', '-').replace('&', 'and')
    
    # =============== PROVINCE MANAGEMENT ===============
    
    @staticmethod
    def create_province(province_data: Dict[str, Any]) -> str:
        """Create a new province"""
        try:
            province_key = FirebaseService.create_province_key(province_data['name'])
            
            # Structure the data properly
            structured_data = {
                'province_id': province_data.get('province_id', 0),
                'name': province_data['name'],
                'description': province_data.get('description', ''),
                'famous_for': province_data.get('famous_for', []),
                'destinations': {},  # Empty destinations object
            }
            
            # Save to Firebase under provinces collection
            db.collection('provinces').document(province_key).set(structured_data)
            return province_key
            
        except Exception as e:
            print(f"Error creating province: {e}")
            return None
    
    @staticmethod
    def get_province_by_name(province_name: str) -> Optional[Dict[str, Any]]:
        """Get province by name"""
        try:

            doc_ref = db.collection('provinces').document(province_name)
            doc = doc_ref.get()
            
            if doc.exists:
                print(f"✅ Document exists in Firebase")
                data = doc.to_dict()
                return data
            else:
                print(f"❌ Document does not exist in Firebase")
                # Let's also try to list all provinces to see what's actually there
                all_provinces = FirebaseService.get_all_provinces()
                print(f"📋 Available provinces in Firebase: {[p.get('name', 'No name') for p in all_provinces]}")
                return None
            
        except Exception as e:
            print(f"Error getting province by name: {e}")
            return None
    
    @staticmethod
    def get_province_by_key(province_key: str) -> Optional[Dict[str, Any]]:
        """Get province by Firebase key"""
        try:
            doc_ref = db.collection('provinces').document(province_key)
            doc = doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                data['id'] = doc.id
                return data
            return None
            
        except Exception as e:
            print(f"Error getting province by key: {e}")
            return None
    
    @staticmethod
    def get_all_provinces() -> List[Dict[str, Any]]:
        """Get all provinces"""
        try:
            provinces_ref = db.collection('provinces')
            docs = provinces_ref.get()
            
            provinces = []
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                provinces.append(data)
            
            return provinces
            
        except Exception as e:
            print(f"Error getting all provinces: {e}")
            return []
    
    @staticmethod
    def update_province(province_key: str, update_data: Dict[str, Any]) -> bool:
        """Update province information"""
        try:
            update_data['updated_at'] = datetime.now()
            db.collection('provinces').document(province_key).update(update_data)
            return True
            
        except Exception as e:
            print(f"Error updating province: {e}")
            return False
    
    # =============== DESTINATION MANAGEMENT ===============
    
    @staticmethod
    def create_destination(destination_data: Dict[str, Any]) -> str:
        """Create a new destination (for backwards compatibility)"""
        try:
            destination_data.update({
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            })
            
            doc_ref = db.collection('destinations').add(destination_data)
            return doc_ref[1].id
        except Exception as e:
            print(f"Error creating destination: {e}")
            return None
    
    @staticmethod
    def get_destination_by_id(destination_id: str) -> Optional[Dict[str, Any]]:
        """Get destination by ID (for backwards compatibility)"""
        try:
            doc_ref = db.collection('destinations').document(destination_id)
            doc = doc_ref.get()
            
            if doc.exists:
                destination_data = doc.to_dict()
                destination_data['id'] = doc.id
                # Convert timestamps to strings for JSON serialization
                if 'created_at' in destination_data and destination_data['created_at']:
                    destination_data['created_at'] = destination_data['created_at'].isoformat()
                if 'updated_at' in destination_data and destination_data['updated_at']:
                    destination_data['updated_at'] = destination_data['updated_at'].isoformat()
                return destination_data
            return None
        except Exception as e:
            print(f"Error getting destination: {e}")
            return None
    
    @staticmethod
    def get_all_destinations(limit: int = 50) -> List[Dict[str, Any]]:
        """Get all destinations (for backwards compatibility)"""
        try:
            destinations_ref = db.collection('destinations').limit(limit)
            docs = destinations_ref.get()
            
            destinations = []
            for doc in docs:
                destination_data = doc.to_dict()
                destination_data['id'] = doc.id
                # Convert timestamps to strings
                if 'created_at' in destination_data and destination_data['created_at']:
                    destination_data['created_at'] = destination_data['created_at'].isoformat()
                if 'updated_at' in destination_data and destination_data['updated_at']:
                    destination_data['updated_at'] = destination_data['updated_at'].isoformat()
                destinations.append(destination_data)
            
            return destinations
        except Exception as e:
            print(f"Error getting all destinations: {e}")
            return []
    
    @staticmethod
    def update_destination(destination_id: str, destination_data: Dict[str, Any]) -> bool:
        """Update destination information (for backwards compatibility)"""
        try:
            destination_data['updated_at'] = datetime.now()
            db.collection('destinations').document(destination_id).update(destination_data)
            return True
        except Exception as e:
            print(f"Error updating destination: {e}")
            return False
    
    @staticmethod
    def delete_destination(destination_id: str) -> bool:
        """Delete destination (for backwards compatibility)"""
        try:
            db.collection('destinations').document(destination_id).delete()
            return True
        except Exception as e:
            print(f"Error deleting destination: {e}")
            return False
    
    @staticmethod
    def get_province_with_destinations(province_id: str) -> Optional[Dict[str, Any]]:
        """Get province with all its destinations (for backwards compatibility)"""
        try:
            # Get province data by key
            province = FirebaseService.get_province_by_key(province_id)
            if not province:
                return None
            
            # Get destinations for this province from nested structure
            destinations = province.get('destinations', {})
            
            # Convert to list format
            destination_list = []
            for dest_key, dest_data in destinations.items():
                dest_item = dict(dest_data)
                dest_item['id'] = dest_key
                destination_list.append(dest_item)
            
            return {
                "province": province,
                "destinations": destination_list,
                "total_destinations": len(destination_list)
            }
        except Exception as e:
            print(f"Error getting province with destinations: {e}")
            return None
    
    @staticmethod
    def add_destination_to_province(province_name: str, destination_name: str) -> bool:
        """Add a destination to a province"""
        try:
            province_key = FirebaseService.create_province_key(province_name)
            destination_key = FirebaseService.create_destination_key(destination_name)
            
            # Create destination data
            destination_data = {
                'location_name': destination_name
            }
            
            # Update the province document to include this destination
            province_ref = db.collection('provinces').document(province_key)
            province_ref.update({
                f'destinations.{destination_key}': destination_data,
                'updated_at': datetime.now()
            })
            
            return True
            
        except Exception as e:
            print(f"Error adding destination to province: {e}")
            return False
    
    @staticmethod
    def get_destinations_by_province(location_identifier: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get all destinations for a province (supports both name and ID)"""
        try:
            # Try to get by name first, then by key
            province_data = FirebaseService.get_province_by_name(location_identifier)
            if not province_data:
                province_data = FirebaseService.get_province_by_key(location_identifier)
            
            if not province_data:
                return []
            
            destinations = province_data.get('destinations', {})
            
            # Convert to list format with keys
            destination_list = []
            for dest_key, dest_data in destinations.items():
                dest_item = dict(dest_data)
                dest_item['id'] = dest_key
                destination_list.append(dest_item)
                
                # Respect limit if provided
                if limit and len(destination_list) >= limit:
                    break
            
            return destination_list
            
        except Exception as e:
            print(f"Error getting destinations by province: {e}")
            return []
    
    @staticmethod
    def search_destinations(query: str, location_id: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        """Search destinations across all provinces"""
        try:
            provinces = FirebaseService.get_all_provinces()
            found_destinations = []
            
            query_lower = query.lower()
            
            for province in provinces:
                # If location_id is specified, filter by province
                if location_id and province.get('id') != location_id:
                    continue
                    
                destinations = province.get('destinations', {})
                for dest_key, dest_data in destinations.items():
                    if query_lower in dest_data.get('location_name', '').lower():
                        dest_item = dict(dest_data)
                        dest_item['id'] = dest_key
                        dest_item['province'] = province['name']
                        found_destinations.append(dest_item)
                        
                        # Respect limit
                        if len(found_destinations) >= limit:
                            break
                            
                if len(found_destinations) >= limit:
                    break
            
            return found_destinations
            
        except Exception as e:
            print(f"Error searching destinations: {e}")
            return []
    
    @staticmethod
    def remove_destination_from_province(province_name: str, destination_name: str) -> bool:
        """Remove a destination from a province"""
        try:
            province_key = FirebaseService.create_province_key(province_name)
            destination_key = FirebaseService.create_destination_key(destination_name)
            
            # Remove the destination from the province document
            province_ref = db.collection('provinces').document(province_key)
            province_ref.update({
                f'destinations.{destination_key}': firestore.DELETE_FIELD,
                'updated_at': datetime.now()
            })
            
            return True
            
        except Exception as e:
            print(f"Error removing destination from province: {e}")
            return False
    
    # =============== SCHEDULE MANAGEMENT (keeping existing) ===============
    
    @staticmethod
    def create_schedule(user_id: str, schedule_data: Dict[str, Any]) -> str:
        """Create a new travel schedule"""
        try:  
            ### DEBUG LATER          
            # Get user IDs for listed emails
            # Ensure to use the correct key from Pydantic model ('shared_with_emails') and handle None safely.
            shared_people_emails = schedule_data.get("shared_emails", [])
            shared_user_ids = []
            if shared_people_emails: # Check if the list exists and is not None
                for person_email in shared_people_emails:
                    if person_email: # Make sure email string is not empty or None
                        # Call a helper to get user by email (will be added next)
                        user_profile = FirebaseService.get_user_by_email(person_email)
                        if user_profile and user_profile.get('id'):
                            shared_user_ids.append(user_profile['id'])
                        else:
                            # Optionally log or handle cases where email doesn't match a user
                            print(f"Warning: User ID not found for email '{person_email}' during schedule creation.")
            
            schedule_data['shared_with_user_ids'] = shared_user_ids # Store the resolved user IDs
            print("383", schedule_data)
            doc_ref = db.collection('schedules').add(schedule_data)
            return doc_ref[1].id
        except Exception as e:
            print(f"Error creating schedule: {e}")
            return None
    
    @staticmethod
    def get_user_schedules(user_id: str) -> List[Dict[str, Any]]:
        """Get all schedules for a specific user"""
        try:
            schedules_ref = db.collection('schedules').where('user_id', '==', user_id)
            docs = schedules_ref.get()
            
            schedules = []
            for doc in docs:
                schedule_data = doc.to_dict()
                schedule_data['id'] = doc.id
                print('401', schedule_data['id'])
                
                if 'start_date' in schedule_data and hasattr(schedule_data['start_date'], 'isoformat'):
                    schedule_data['start_date'] = schedule_data['start_date'].isoformat()
                if 'end_date' in schedule_data and hasattr(schedule_data['end_date'], 'isoformat'):
                    schedule_data['end_date'] = schedule_data['end_date'].isoformat()
                del schedule_data["user_id"], schedule_data["created_at"], schedule_data["updated_at"], schedule_data["shared_with_user_ids"] 
                schedules.append(schedule_data)
            
            return schedules
        except Exception as e:
            print(f"Error getting user schedules: {e}")
            return []
    
    @staticmethod
    def get_schedule_by_id(schedule_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific schedule by ID (with user verification)"""
        try:
            doc_ref = db.collection('schedules').document(schedule_id)
            doc = doc_ref.get()
            
            if doc.exists:
                schedule_data = doc.to_dict()
                # Verify the schedule belongs to the user
                # if schedule_data.get('user_id') == user_id:
                    # schedule_data['id'] = doc.id
                    
                # Convert timestamps to strings
                if 'created_at' in schedule_data:
                    schedule_data['created_at'] = schedule_data['created_at'].isoformat()
                if 'updated_at' in schedule_data:
                    schedule_data['updated_at'] = schedule_data['updated_at'].isoformat()
                if 'start_date' in schedule_data and hasattr(schedule_data['start_date'], 'isoformat'):
                    schedule_data['start_date'] = schedule_data['start_date'].isoformat()
                if 'end_date' in schedule_data and hasattr(schedule_data['end_date'], 'isoformat'):
                    schedule_data['end_date'] = schedule_data['end_date'].isoformat()
                del schedule_data["user_id"], schedule_data["created_at"], schedule_data["updated_at"], schedule_data["shared_with_user_ids"] 
            
            return schedule_data
        except Exception as e:
            print(f"Error getting schedule: {e}")
            return None
    
    @staticmethod
    def update_schedule(schedule_id: str, user_id: str, schedule_data: Dict[str, Any]) -> bool:
        """Update a schedule (with user verification)"""
        try:
            # First verify the schedule belongs to the user
            doc_ref = db.collection('schedules').document(schedule_id)
            doc = doc_ref.get()
            
            if doc.exists and doc.to_dict().get('user_id') == user_id:
                schedule_data['updated_at'] = datetime.now()
                doc_ref.update(schedule_data)
                return True
            return False
        except Exception as e:
            print(f"Error updating schedule: {e}")
            return False
    
    @staticmethod
    def delete_schedule(schedule_id: str, user_id: str) -> bool:
        """Delete a user's schedule"""
        try:
            doc_ref = db.collection('schedules').document(schedule_id)
            schedule = doc_ref.get()
            
            if not schedule.exists:
                return False
            
            schedule_data = schedule.to_dict()
            if schedule_data.get('user_id') != user_id:
                return False  # User can only delete their own schedules
            
            doc_ref.delete()
            return True
        except Exception as e:
            print(f"Error deleting schedule: {e}")
            return False

    @staticmethod
    def get_schedules_shared_with_userid(user_id: str) -> List[Dict[str, Any]]:
        """Get schedules that have been shared with a specific user ID"""
        try:
            print(f"🔍 Searching for schedules shared with user_id: {user_id}")
            # Query schedules where the 'shared_with_user_ids' array contains the user_id
            schedules_ref = db.collection('schedules').where('shared_with_user_ids', 'array_contains', user_id)
            docs = schedules_ref.get()
            
            print(f"📋 Found {len(docs)} documents matching the query for user_id: {user_id}")
            
            schedules = []
            for doc in docs:
                schedule_data = doc.to_dict()
                schedule_data['id'] = doc.id
                print('495',schedule_data['id'])
                print(f"   - Schedule: {schedule_data.get('title', 'No title')}")
                print(f"     Owner: {schedule_data.get('user_id')}, Shared with user IDs: {schedule_data.get('shared_with_user_ids', [])}")
                
                # Convert datetime fields to ISO strings
                if 'start_date' in schedule_data and schedule_data['start_date'] and hasattr(schedule_data['start_date'], 'isoformat'):
                    schedule_data['start_date'] = schedule_data['start_date'].isoformat()
                if 'end_date' in schedule_data and schedule_data['end_date'] and hasattr(schedule_data['end_date'], 'isoformat'):
                    schedule_data['end_date'] = schedule_data['end_date'].isoformat()
                
                del schedule_data["user_id"], schedule_data["created_at"], schedule_data["updated_at"], schedule_data["shared_with_user_ids"] 
                schedules.append(schedule_data)
            
            print(f"✅ Returning {len(schedules)} shared schedules for user_id: {user_id}")
            return schedules
        except Exception as e:
            print(f"❌ Error getting schedules shared with user_id {user_id}: {e}")
            return []

    # =============== MEMORY MANAGEMENT ===============
    
    @staticmethod
    def create_memory(user_id: str, memory_data: Dict[str, Any], photo_url: Optional[str] = None) -> str:
        """Create a new memory for a user"""
        try:
            # Add metadata, aligning with the Memory Pydantic model
            memory_document = {
                'created_by_user_id': user_id,
                'memory_name': memory_data['memory_name'],
                'description': memory_data['description'],
                'province': memory_data['province'],
                'province_id': memory_data.get('province_id'),
                'photo_url': photo_url,
                'created_at': datetime.now(),
            }
            if Memory(**memory_document):
                doc_ref = db.collection('memories').add(memory_document)
                return doc_ref[1].id
        except Exception as e:
            print(f"Error creating memory: {e}")
            return None
    
    @staticmethod
    def create_shared_memory(user_id: str, memory_data: Dict[str, Any], shared_emails: List[str], photo_url: Optional[str] = None) -> str:
        """Create a new memory for a group of user!"""
        try:
            shared_user_ids = []
            for email in shared_emails:
                shared_id = FirebaseService.get_user_by_email(email) 
                shared_user_ids.append(shared_id)
                
            # Add metadata, aligning with the Memory Pydantic model
            memory_document = {
                'created_by_user_id': user_id,
                'memory_name': memory_data['memory_name'],
                'description': memory_data['description'],
                'province': memory_data['province'],
                'shared_users' : shared_user_ids,
                'photo_url': photo_url,
                'created_at': datetime.now(),
            }
            ### DEBUG FOR LATER!
            # if Memory(**memory_document):
            doc_ref = db.collection('shared_memories').add(memory_document)
            return doc_ref[1].id
        except Exception as e:
            print(f"Error creating memory: {e}")
            return None
    
    @staticmethod
    def get_user_memories(user_id: str) -> List[Dict[str, Any]]:
        """Get all memories for a specific user"""
        try:
            # Query using 'created_by_user_id' to align with storage changes
            memories_ref = db.collection('memories').where('created_by_user_id', '==', user_id)
            docs = memories_ref.get()
            
            memories = []
            for doc in docs:
                memory_data = doc.to_dict()
                memory_data['id'] = doc.id
                memory_data.pop("created_by_user_id")
                if 'created_at' in memory_data and memory_data['created_at']:
                    memory_data['created_at'] = memory_data['created_at'].isoformat()
                memories.append(memory_data)
            # print('585', memories)
            return memories
        except Exception as e:
            print(f"Error getting user memories: {e}")
            return []
    
    @staticmethod
    def get_memory_by_id(memory_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific memory by ID (only if it belongs to the user)"""
        try:
            doc_ref = db.collection('memories').document(memory_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                return None
            
            memory_data = doc.to_dict()
            
            # Check if the memory belongs to the requesting user
            if memory_data.get('user_id') != user_id:
                return None  # User can only access their own memories
            
            memory_data['id'] = doc.id
            # Convert timestamps to strings
            if 'created_at' in memory_data and memory_data['created_at']:
                memory_data['created_at'] = memory_data['created_at'].isoformat()
            if 'updated_at' in memory_data and memory_data['updated_at']:
                memory_data['updated_at'] = memory_data['updated_at'].isoformat()
            
            return memory_data
        except Exception as e:
            print(f"Error getting memory: {e}")
            return None
    
    @staticmethod
    def update_memory(memory_id: str, user_id: str, memory_data: Dict[str, Any]) -> bool:
        """Update a user's memory (only if it belongs to them)"""
        try:
            doc_ref = db.collection('memories').document(memory_id)
            memory = doc_ref.get()
            
            if not memory.exists:
                return False
            
            existing_memory = memory.to_dict()
            if existing_memory.get('user_id') != user_id:
                return False  # User can only update their own memories
            
            # Update only provided fields
            update_data = {}
            if 'name' in memory_data and memory_data['name']:
                update_data['name'] = memory_data['name']
            if 'description' in memory_data and memory_data['description']:
                update_data['description'] = memory_data['description']
            if 'photo_url' in memory_data:
                update_data['photo_url'] = memory_data['photo_url']
            
            update_data['updated_at'] = datetime.now()
            
            doc_ref.update(update_data)
            return True
        except Exception as e:
            print(f"Error updating memory: {e}")
            return False
    
    @staticmethod
    def delete_memory(memory_id: str, user_id: str) -> bool:
        """Delete a user's memory (only if it belongs to them)"""
        try:
            doc_ref = db.collection('memories').document(memory_id)
            memory = doc_ref.get()
            
            if not memory.exists:
                return False
            
            memory_data = memory.to_dict()
            if memory_data.get('user_id') != user_id:
                return False  # User can only delete their own memories
            
            doc_ref.delete()
            return True
        except Exception as e:
            print(f"Error deleting memory: {e}")
            return False
    
    @staticmethod
    def get_memories_by_province(user_id: str, province_name: str) -> List[Dict[str, Any]]:
        """Get user's memories for a specific province"""
        try:
            memories_ref = db.collection('memories') \
                .where(filter=firestore.FieldFilter('user_id', '==', user_id)) \
                .where(filter=firestore.FieldFilter('province', '==', province_name))
            
            docs = memories_ref.order_by('created_at', direction=firestore.Query.DESCENDING).get()
            
            memories = []
            for doc in docs:
                memory_data = doc.to_dict()
                memory_data['id'] = doc.id
                # Convert timestamps to strings
                if 'created_at' in memory_data and memory_data['created_at']:
                    memory_data['created_at'] = memory_data['created_at'].isoformat()
                if 'updated_at' in memory_data and memory_data['updated_at']:
                    memory_data['updated_at'] = memory_data['updated_at'].isoformat()
                memories.append(memory_data)
            
            return memories
        except Exception as e:
            print(f"Error getting memories by province: {e}")
            return []

    # =============== MESSAGING MANAGEMENT ===============
    
    @staticmethod
    def create_conversation(created_user_id: str, other_user_id: str) -> str:
        """Create or get existing conversation between two users"""
        try:
            # Check if conversation already exists between these users
            conversations_ref = db.collection('conversations')
            
            # Check both directions - where created_user is current user or other user
            existing_query1 = conversations_ref.where(
                filter=firestore.FieldFilter('created_user', '==', created_user_id)
            ).where(
                filter=firestore.FieldFilter('other_user', '==', other_user_id)
            ).limit(1)
            
            existing_query2 = conversations_ref.where(
                filter=firestore.FieldFilter('created_user', '==', other_user_id)
            ).where(
                filter=firestore.FieldFilter('other_user', '==', created_user_id)
            ).limit(1)
            
            existing_docs1 = existing_query1.get()
            existing_docs2 = existing_query2.get()
            
            # If conversation exists, return its ID
            if len(existing_docs1) > 0:
                return existing_docs1[0].id
            if len(existing_docs2) > 0:
                return existing_docs2[0].id
            
            # Create new conversation
            conversation_data = {
                'created_user': created_user_id,
                'other_user': other_user_id,
                'created_at': datetime.now(),
                'last_message_time': None,
                'last_message': None
            }
            
            doc_ref = db.collection('conversations').add(conversation_data)
            conversation_id = doc_ref[1].id
            
            # Update conversation with its own ID as conversation_id
            db.collection('conversations').document(conversation_id).update({
                'conversation_id': conversation_id
            })
            
            print(f"✅ Created conversation: {conversation_id}")
            return conversation_id
            
        except Exception as e:
            print(f"Error creating conversation: {e}")
            return None
    
    @staticmethod
    def send_message(conversation_id: str, sender_id: str, content: str) -> str:
        """Send a message in a conversation"""
        try:
            # Create message document
            message_data = {
                'sender_id': sender_id,
                'conversation_id': conversation_id,
                'content': content,
                'time_sent': datetime.now()
            }
            
            doc_ref = db.collection('messages').add(message_data)
            message_id = doc_ref[1].id
            
            # Update conversation with last message info
            conversation_ref = db.collection('conversations').document(conversation_id)
            conversation_ref.update({
                'last_message': content,
                'last_message_time': datetime.now()
            })
            
            print(f"✅ Message sent: {message_id}")
            return message_id
            
        except Exception as e:
            print(f"Error sending message: {e}")
            return None
    
    @staticmethod
    def get_conversations(user_id: str) -> List[Dict[str, Any]]:
        """Get all conversations for a user"""
        try:
            conversations_ref = db.collection('conversations')
            
            # Get conversations where user is either creator or other participant
            query1 = conversations_ref.where(
                filter=firestore.FieldFilter('created_user', '==', user_id)
            )
            query2 = conversations_ref.where(
                filter=firestore.FieldFilter('other_user', '==', user_id)
            )
            
            docs1 = query1.get()
            docs2 = query2.get()
            
            conversations = []
            
            # Process conversations where user is creator
            for doc in docs1:
                conversation_data = doc.to_dict()
                conversation_data['id'] = doc.id
                
                # Convert timestamps
                if 'created_at' in conversation_data and conversation_data['created_at']:
                    conversation_data['created_at'] = conversation_data['created_at'].isoformat()
                if 'last_message_time' in conversation_data and conversation_data['last_message_time']:
                    conversation_data['last_message_time'] = conversation_data['last_message_time'].isoformat()
                
                # Get other user info
                other_user_id = conversation_data.get('other_user')
                other_user = FirebaseService.get_user_by_id(other_user_id) if other_user_id else None
                conversation_data['other_user_info'] = other_user
                
                conversations.append(conversation_data)
            
            # Process conversations where user is other participant
            for doc in docs2:
                conversation_data = doc.to_dict()
                conversation_data['id'] = doc.id
                
                # Convert timestamps
                if 'created_at' in conversation_data and conversation_data['created_at']:
                    conversation_data['created_at'] = conversation_data['created_at'].isoformat()
                if 'last_message_time' in conversation_data and conversation_data['last_message_time']:
                    conversation_data['last_message_time'] = conversation_data['last_message_time'].isoformat()
                
                # Get creator user info
                creator_user_id = conversation_data.get('created_user')
                creator_user = FirebaseService.get_user_by_id(creator_user_id) if creator_user_id else None
                conversation_data['other_user_info'] = creator_user
                
                conversations.append(conversation_data)
            
            # Corrected sort key to handle None values for last_message_time
            def get_sort_key(conversation):
                time_val = conversation.get('last_message_time')
                # If time_val is None, return an empty string (sorts as oldest)
                # Otherwise, return the time_val itself (which should be an ISO string)
                return time_val if time_val is not None else ''

            conversations.sort(key=get_sort_key, reverse=True)
            
            return conversations
            
        except Exception as e:
            print(f"Error getting conversations: {e}")
            return []
    
    @staticmethod
    def get_messages(conversation_id: str, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Get messages from a conversation"""
        try:
            messages_ref = db.collection('messages')
            messages_query = messages_ref.where(
                filter=firestore.FieldFilter('conversation_id', '==', conversation_id)
            ).order_by('time_sent', direction=firestore.Query.ASCENDING).limit(limit).offset(offset)
            
            docs = messages_query.get()
            
            messages = []
            for doc in docs:
                message_data = doc.to_dict()
                message_data['id'] = doc.id
                
                # Convert timestamp
                if 'time_sent' in message_data and message_data['time_sent']:
                    message_data['time_sent'] = message_data['time_sent'].isoformat()
                
                # Get sender info
                sender_id = message_data.get('sender_id')
                sender_info = FirebaseService.get_user_by_id(sender_id) if sender_id else None
                message_data['sender_info'] = sender_info
                
                messages.append(message_data)
            
            return messages
            
        except Exception as e:
            print(f"Error getting messages: {e}")
            return []
    
    @staticmethod
    def search_users(query: str, current_user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for users by email or name to start a conversation with"""
        try:
            print(f"🔍 Searching for users with query: '{query}', excluding user: '{current_user_id}'")
            
            # Search in users collection
            users_ref = db.collection('users')
            found_users = []
            
            # First, try to find by exact email match
            email_query = users_ref.where(
                filter=firestore.FieldFilter('email', '==', query.lower())
            ).limit(limit)
            
            email_docs = email_query.get()
            for doc in email_docs:
                user_data = doc.to_dict()
                user_data['id'] = doc.id
                if user_data['id'] != current_user_id:  # Exclude current user
                    found_users.append(user_data)
            
            # If we found users by email, return them
            if found_users:
                print(f"✅ Found {len(found_users)} users by email")
                return found_users[:limit]
            
            # If no exact email match, search by name (partial match)
            all_users_query = users_ref.limit(100)  # Limit to avoid too much data
            all_docs = all_users_query.get()
            
            query_lower = query.lower()
            for doc in all_docs:
                user_data = doc.to_dict()
                user_data['id'] = doc.id
                
                # Skip current user
                if user_data['id'] == current_user_id:
                    continue
                
                # Check if query matches name or email (case-insensitive)
                name = user_data.get('name', '').lower()
                email = user_data.get('email', '').lower()
                # print(limit)
                # print(len(found_users))
                if (query_lower in name or query_lower in email) and len(found_users) < limit:
                    found_users.append(user_data)
            # print(user_data)
            print(f"✅ Found {len(found_users)} users total")
            return found_users[:limit]
            
        except Exception as e:
            print(f"Error searching users: {e}")
            # Fallback to mock data for testing
            mock_users = [
                {
                    'id': 'mock_user_1', 
                    'name': 'Demo User 1', 
                    'email': 'demo1@roamviet.com',
                    'phone': '+84123456789'
                },
                {
                    'id': 'mock_user_2', 
                    'name': 'Demo User 2', 
                    'email': 'demo2@roamviet.com',
                    'phone': '+84987654321'
                },
                {
                    'id': 'mock_user_3', 
                    'name': 'Test User', 
                    'email': 'test@roamviet.com',
                    'phone': '+84555666777'
                },
            ]
            
            # Filter mock users based on query
            filtered_users = [
                user for user in mock_users 
                if user['id'] != current_user_id and 
                (query.lower() in user['name'].lower() or 
                 query.lower() in user['email'].lower())
            ]
            
            print(f"⚠️ Using mock data, found {len(filtered_users)} users")
            return filtered_users[:limit]
    
    @staticmethod
    def create_or_update_user(user_id: str, user_data: Dict[str, Any]) -> bool:
        """Create or update user information in the users collection"""
        try:
            user_document = {
                'username': user_data.get('username', user_data.get('username', '')),
                'email': user_data.get('email', '').lower(),  # Store email in lowercase
                'phone': user_data.get('phone', ''),
                'password': '',  # We don't store actual passwords in Firestore for security
                'profilePic': user_data.get('profilePic', ''),
                'created_at': datetime.now(),
                'updated_at': datetime.now(),
                'is_active': True
            }
            
            # Set the document with the user ID as the document ID
            db.collection('users').document(user_id).set(user_document, merge=True)
            print(f"✅ Created/updated user: {user_id}")
            return True
            
        except Exception as e:
            print(f"Error creating/updating user: {e}")
            return False
    
    @staticmethod
    def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        """Get user information by ID"""
        try:
            doc_ref = db.collection('users').document(user_id)
            doc = doc_ref.get()
            
            if doc.exists:
                user_data = doc.to_dict()
                user_data['id'] = doc.id
                
                # Convert timestamps to strings if they exist
                if 'created_at' in user_data and user_data['created_at']:
                    user_data['created_at'] = user_data['created_at'].isoformat()
                if 'updated_at' in user_data and user_data['updated_at']:
                    user_data['updated_at'] = user_data['updated_at'].isoformat()
                
                return user_data
            return None
            
        except Exception as e:
            print(f"Error getting user by ID: {e}")
            return None

    @staticmethod
    def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
        """Get user information by email"""
        try:
            if not email: # Basic validation for empty email string
                return None
            users_ref = db.collection('users')
            # Emails are generally stored and queried in lowercase for consistency
            query = users_ref.where(filter=firestore.FieldFilter('email', '==', email.lower())).limit(1)
            docs = query.get()
            
            # Ensure docs is not None and contains at least one document
            if docs and len(docs) > 0:
                user_data = docs[0].to_dict()
                user_data['id'] = docs[0].id # Add the document ID to the returned dict
                return user_data
            return None # No user found with that email
        except Exception as e:
            print(f"Error getting user by email '{email}': {e}")
            return None

    @staticmethod
    def all_users(user_id) -> List[Dict[str, Any]]:
        """Get all users from the database"""
        try:
            users_ref = db.collection('users')
            docs = users_ref.get()
            
            users = []
            for doc in docs:
                if doc.id == user_id:
                    continue
                user_data = doc.to_dict()
                users.append({
                                "email": user_data.get("email"),
                                "username": user_data.get("username"),
                                "profilePic": user_data.get("profilePic"),
                            })
            
            print(f"✅ Retrieved {len(users)} users from database")
            return users
        except Exception as e:
            print(f"❌ Error getting all users: {e}")
            return []

    # =============== FRIEND REQUEST MANAGEMENT ===============

    @staticmethod
    def create_friend_request(requester_id: str, recipient_email: str) -> Dict[str, Any]:
        """
        Creates a friend request in Firestore.
        Checks for self-requests and existing pending requests.
        """
        try:
            recipient_id = FirebaseService.get_user_by_email(recipient_email)
            recipient_id = recipient_id["id"]
                      
            if requester_id == recipient_id:
                return {"success": False, "message": "Bạn không thể gửi yêu cầu kết bạn cho chính mình."}
            
            requests_ref = db.collection('friends')

            # Check for existing pending request (requester -> recipient)
            existing_request_query1 = requests_ref \
                .where('user1_id', '==', requester_id) \
                .where('user2_id', '==', recipient_id) \
                .where('status', '==', 'pending') \
                .limit(1)
            
            # Check for existing pending request (recipient -> requester)
            existing_request_query2 = requests_ref \
                .where('user1_id', '==', recipient_id) \
                .where('user2_id', '==', requester_id) \
                .where('status', '==', 'pending') \
                .limit(1)

            # print(existing_request_query1, existing_request_query2)
            if len(existing_request_query1.get()) > 0:
                return {"success": False, "message": "Bạn đã gửi yêu cầu kết bạn tới người này rồi."}
            
            if len(existing_request_query2.get()) > 0:
                return {"success": False, "message": "Người này đã gửi cho bạn một yêu cầu kết bạn đang chờ xử lý."}

            timestamp = datetime.now()
            request_data = {
                'user1_id': requester_id,
                'user2_id': recipient_id,
                'status': 'pending',  # Possible statuses: 'pending', 'accepted', 'declined', 'blocked'
                'created_at': timestamp,
            }

            update_time, doc_ref = requests_ref.add(request_data) # add() returns a tuple (update_time, DocumentReference)
            request_id = doc_ref.id
            
            print(f"✅ Friend request created: {request_id} from {requester_id} to {recipient_id}")
            return {"success": True, "request_id": request_id, "message": "Yêu cầu kết bạn đã được gửi thành công."}

        except Exception as e:
            print(f"❌ Error creating friend request between {requester_id} and {recipient_id}: {e}")
            return {"success": False, "message": f"Đã xảy ra lỗi không mong muốn: {str(e)}"}

    @staticmethod
    def update_friend_status(requester_id: str, recipient_id: str, action: str):
        try: 
            print(action)
            
            # Prevent self-friendship
            if requester_id == recipient_id:
                return {"success": False, "message": "Bạn không thể gửi yêu cầu kết bạn cho chính mình."}
            
            # Get the friend request to update
            requests_ref = db.collection('friends')
            existing_request_query = requests_ref \
                .where(filter=firestore.FieldFilter('user1_id', '==', requester_id)) \
                .where(filter=firestore.FieldFilter('user2_id', '==', recipient_id)) \
                .where(filter=firestore.FieldFilter('status', '==', 'pending')) \
                .limit(1)
            docs = existing_request_query.get()   
            print(len(docs))
            if not docs or len(docs) == 0:
                return {"success": False, "message": "Không tìm thấy yêu cầu kết bạn phù hợp."}
            
            request_doc = docs[0]
            request_id = request_doc.id
            if action == "accepted":  # Make comparison case-insensitive
                # Create a friendship relationship in is_friends collection
                friends_ref = db.collection('friends')
                timestamp = datetime.now()
                # Create friendship document with composite key (sorted IDs for consistency)
                friend_ids = sorted([requester_id, recipient_id])
                friendship_id = f"{friend_ids[0]}_{friend_ids[1]}"
                
                friendship_data = {
                    'user1_id': friend_ids[0],
                    'user2_id': friend_ids[1],
                    'created_at': timestamp,
                    'status': 'friends'
                }
                
                # Create the friendship
                friends_ref.document(friendship_id).set(friendship_data)
                # Delete the original friend request
                requests_ref.document(request_id).delete()
                
                print(f"✅ Friend request accepted: {requester_id} and {recipient_id} are now friends")
                return {"success": True, "message": "Yêu cầu kết bạn đã được chấp nhận."}
                
            else:
                # Remove the friend request from friend_requests db
                requests_ref.document(request_id).delete()
                
                print(f"✅ Friend request declined/removed: {request_id}")
                return {"success": True, "message": "Yêu cầu kết bạn đã được từ chối."}
                
        except Exception as e:
            print(f"❌ Error updating friend status: {e}")
            return {"success": False, "message": f"Đã xảy ra lỗi không mong muốn: {str(e)}"}
    
    @staticmethod
    def get_friends(user_id: str) -> List[Dict[str, Any]]:
        """Fetch all friends for a given user_id."""
        try:
            friend_ids = set()

            is_friends_ref = db.collection('friends')

            # Query for friendships where the user is user1_id
            query1 = is_friends_ref.where(filter=firestore.FieldFilter('user1_id', '==', user_id)).stream()
            for doc in query1:
                data = doc.to_dict()
                if data.get('user2_id'):
                    friend_ids.add((data['user2_id'], data['status']))

            # Query for friendships where the user is user2_id
            query2 = is_friends_ref.where(filter=firestore.FieldFilter('user2_id', '==', user_id)).stream()
            for doc in query2:
                data = doc.to_dict()
                if data.get('user1_id'):
                    friend_ids.add((data['user1_id'], data['status']))
            
            # Fetch details for each unique friend ID
            pending_request, friends = [], []
            for f_id, friend_status in friend_ids:
                if f_id == user_id:  # Skip self
                    continue
                user_info = FirebaseService.get_user_by_id(f_id)
            
                if user_info:
                    print(friend_status)
                    if friend_status == "pending":
                        pending_request.append({
                                        "email" : user_info["email"],
                                        "username" : user_info["username"],
                                        "profilePic" : user_info["profilePic"]
                                        })
                    else:
                        friends.append({
                                        "email" : user_info["email"],
                                        "username" : user_info["username"],
                                        "profilePic" : user_info["profilePic"]
                                        })
            # print(f"✅ Found {len(friends_details)} friends for user {user_id}")
            return friends, pending_request

        except Exception as e:
            print(f"❌ Error getting friends for user {user_id}: {e}")
            return []
