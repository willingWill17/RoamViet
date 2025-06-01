# RoamViet Messaging System

## Overview

The RoamViet messaging system allows users to connect and communicate with other travelers, sharing experiences and planning trips together.

## Features

### 🗨️ Real-time Messaging

- Send and receive messages in real-time
- Automatic message polling every 3 seconds
- Message read status tracking
- Unread message notifications

### 👥 User Search & Chat Creation

- Search for other users by username
- Start new conversations with any user
- Automatic chat room creation or retrieval

### 📱 Modern UI/UX

- Beautiful, responsive design
- Mobile-friendly interface
- Smooth animations and transitions
- Vietnamese language support

### 🔒 Security

- JWT token-based authentication
- User access control (only view your own chats)
- Secure API endpoints

## How to Use

### 1. Accessing Messages

- Click on "Tin nhắn" in the main navigation
- Or go directly to `/messaging.html`

### 2. Starting a New Conversation

1. Click "Cuộc trò chuyện mới" button
2. Search for users by typing their username
3. Click on a user to start chatting
4. If a chat already exists, it will open the existing conversation

### 3. Sending Messages

1. Select a chat room from the sidebar
2. Type your message in the input field
3. Press Enter or click "Gửi" to send

### 4. Managing Conversations

- Click on any chat in the sidebar to view messages
- Unread messages are marked with a blue badge
- Messages are automatically marked as read when viewed
- Use the search bar to filter conversations

## Technical Implementation

### Backend Endpoints

```
GET /api/chat-rooms - Get all chat rooms for user
POST /api/chat-rooms - Create new chat room
GET /api/chat-rooms/{id}/messages - Get messages from chat room
POST /api/chat-rooms/{id}/messages - Send message to chat room
PUT /api/chat-rooms/{id}/read - Mark messages as read
GET /api/users/search - Search for users
```

### Frontend Structure

```
messaging.html - Main messaging interface
css/messaging_style.css - Styling for messaging components
script/messaging_script.js - JavaScript functionality
```

### Database Collections

- `chat_rooms` - Stores chat room information and participants
- `messages` - Stores individual messages
- Participants and metadata are managed through Firebase Firestore

## Configuration

### API Base URL

Update the `API_BASE_URL` in `messaging_script.js` to match your backend:

```javascript
const API_BASE_URL = "http://localhost:3053/api";
```

### Authentication

The system uses JWT tokens stored in localStorage/sessionStorage:

- `authToken` - Main authentication token
- Automatic redirect to login if not authenticated

## Message Format

```javascript
{
  id: "message_id",
  content: "Message text",
  sender_id: "user_id",
  receiver_id: "user_id",
  message_type: "text",
  created_at: "2023-12-01T10:00:00Z",
  is_read: false
}
```

## Chat Room Format

```javascript
{
  id: "room_id",
  participant_ids: ["user1", "user2"],
  last_message: "Last message text",
  last_message_time: "2023-12-01T10:00:00Z",
  unread_count: {
    "user1": 0,
    "user2": 3
  }
}
```

## Styling Features

### Responsive Design

- Desktop: Side-by-side layout
- Mobile: Stacked layout with proper touch targets
- Adaptive message bubbles

### Color Scheme

- Primary gradient: `#667eea` to `#764ba2`
- Sent messages: Gradient background
- Received messages: White background with border
- Unread badges: Blue (#667eea)

### Animations

- Message slide-in effects
- Hover transitions
- Modal animations
- Loading spinners

## Future Enhancements

### Planned Features

1. **File Attachments** - Support for images and documents
2. **Message Reactions** - Like/react to messages
3. **Group Chats** - Multi-user conversations
4. **Message Search** - Search within conversation history
5. **Push Notifications** - Real-time notifications
6. **Message Encryption** - End-to-end encryption
7. **Voice Messages** - Audio message support
8. **Video Calls** - WebRTC integration
9. **Message Status** - Delivered/read indicators
10. **Chat Archiving** - Archive old conversations

### Technical Improvements

- WebSocket integration for real-time updates
- Message caching for offline support
- Performance optimization for large chat histories
- Better error handling and retry mechanisms

## Troubleshooting

### Common Issues

1. **Messages not loading**

   - Check authentication token
   - Verify backend API is running
   - Check browser console for errors

2. **Search not working**

   - Ensure minimum 2 characters entered
   - Check user database has sample users
   - Verify search API endpoint

3. **Real-time updates not working**
   - Check message polling interval
   - Verify WebSocket connection (if implemented)
   - Clear browser cache

### Debug Mode

Enable debug logging by adding to browser console:

```javascript
localStorage.setItem("debug", "true");
```

## Contributing

1. Follow existing code style and patterns
2. Test on both desktop and mobile
3. Ensure Vietnamese language support
4. Add appropriate error handling
5. Update documentation for new features

## License

Part of the RoamViet travel platform project.
