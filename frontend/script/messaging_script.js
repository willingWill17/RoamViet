// Global variables
let currentConversation = null;
let currentUser = null;
let conversations = [];
let currentMessages = [];
let websocket = null;
let friend_requests = [];
let user_friendList = [];
let all_users = [];
const API_BASE_URL = "http://localhost:3053/api";

// Simple authentication check
function checkAuth() {
  const token = localStorage.getItem("idToken");
  const expiration = localStorage.getItem("tokenExpiration");

  if (!token) {
    console.log("❌ No token found");
    return false;
  }

  if (expiration && Date.now() >= parseInt(expiration)) {
    console.log("❌ Token expired");
    return false;
  }

  console.log("✅ Basic auth check passed");
  return true;
}

// Initialize messaging system
document.addEventListener("DOMContentLoaded", function () {
  initializeMessaging();
});

async function initializeMessaging() {
  try {
    showLoading(true);

    // Check basic authentication first
    if (!checkAuth()) {
      console.log("❌ Basic auth check failed, redirecting to login");
      window.location.href = "login.html";
      return;
    }

    // Get current user info from localStorage or session - using correct token names
    const token =
      localStorage.getItem("idToken") || sessionStorage.getItem("idToken");

    if (!token) {
      console.log("❌ No authentication token found, redirecting to login");
      window.location.href = "login.html";
      return;
    }

    // Verify token and get user info
    currentUser = await getCurrentUser();

    if (!currentUser) {
      console.log("❌ Failed to get user info, redirecting to login");
      window.location.href = "login.html";
      return;
    }
    // Get user's friends list and requests
    await get_user_friendList_and_requests();
    await get_all_users();
    // Load conversations
    if (friend_requests.length > 0) {
      // console.log(friend_requests);
      await makeFriendRequestBlock();
    }
    await loadConversations();

    // Set up search functionality
    setupSearchFunctionality();

    showLoading(false);
  } catch (error) {
    console.error("Error initializing messaging:", error);
    showLoading(false);
    showError("Không thể tải tin nhắn. Vui lòng thử lại sau.");
  }
}

async function get_all_users() {
  const token =
    localStorage.getItem("idToken") || sessionStorage.getItem("idToken");
  const response = await fetch(`${API_BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (data.success) {
    all_users = data.data;
  } else {
    console.log("❌ Failed to get all users");
  }
}

async function get_user_friendList_and_requests() {
  const token =
    localStorage.getItem("idToken") || sessionStorage.getItem("idToken");
  const response = await fetch(`${API_BASE_URL}/friend_requests`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (data.success) {
    user_friendList = data.friends;
    friend_requests = data.pending;
    console.log(user_friendList);
    console.log(friend_requests);
  } else {
    console.log("❌ Failed to get user friend list");
    return [];
  }
}

async function makeFriendRequestBlock() {
  // display the friend requests in the sidebar block
  const friendRequestBlock = document.getElementById("friendRequestBlock");
  const friendRequestList = document.getElementById("friendRequestList");

  // Clear previous content
  friendRequestList.innerHTML = "";

  // Add each friend request to the list
  friend_requests.forEach((request) => {
    console.log("Processing friend request:", request);
    const requestElement = createFriendRequestElement(request);
    friendRequestList.appendChild(requestElement);
  });

  // Show the friend request block
  friendRequestBlock.style.display = "block";
}

async function getCurrentUser() {
  try {
    const token =
      localStorage.getItem("idToken") || sessionStorage.getItem("idToken");

    const response = await fetch(`${API_BASE_URL}/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.user;
    } else {
      const errorData = await response.text();
      console.error("🔐 Profile request failed:", response.status, errorData);
      throw new Error(`Failed to get user info: ${response.status}`);
    }
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

async function loadConversations() {
  try {
    const token =
      localStorage.getItem("idToken") || sessionStorage.getItem("idToken");
    const response = await fetch(`${API_BASE_URL}/conversations`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      conversations = data.data || [];
      renderConversations();
    } else {
      throw new Error("Failed to load conversations");
    }
  } catch (error) {
    console.error("Error loading conversations:", error);
    document.getElementById("conversationList").innerHTML =
      '<div class="loading-message">Không thể tải cuộc trò chuyện</div>';
  }
}

function renderConversations() {
  const conversationList = document.getElementById("conversationList");

  conversationList.innerHTML = "";

  conversations.forEach((conversation) => {
    const conversationItem = createConversationElement(conversation);
    conversationList.appendChild(conversationItem);
  });
}

function createConversationElement(conversation) {
  console.log(conversation);
  const div = document.createElement("div");
  div.className = "conversation-item";
  div.onclick = () => selectConversation(conversation);

  // Get other participant info (for now using mock data)
  const otherParticipant = getOtherParticipant(conversation);
  const unreadCount =
    conversation.unread_count?.[currentUser?.localId || currentUser?.uid] || 0;
  console.log(otherParticipant);
  const avatarSrc = otherParticipant.profilePic
    ? `${API_BASE_URL.replace("/api", "")}${otherParticipant.profilePic}`
    : "logo/profile-icon-white.png";

  div.innerHTML = `
        <div class="user-avatar">
            <img src="${avatarSrc}" alt="${
    conversation.other_user_info.profilePic
  }" onerror="this.src='logo/profile-icon-white.png'" />
        </div>
        <div class="conversation-item-info">
            <div class="conversation-item-name">${
              conversation.other_user_info.username
            }</div>
            <div class="conversation-item-message">
                ${conversation.last_message || "Chưa có tin nhắn"}
            </div>
        </div>
        <div class="conversation-item-meta">
            <div class="conversation-item-time">
                ${
                  conversation.last_message_time
                    ? formatTime(conversation.last_message_time)
                    : ""
                }
            </div>
            ${
              unreadCount > 0
                ? `<div class="unread-badge">${unreadCount}</div>`
                : ""
            }
        </div>
    `;

  return div;
}

function getOtherParticipant(conversation) {
  const currentUserId = currentUser?.localId || currentUser?.uid;

  // Primary logic: Find the other user in the 'participants' array.
  if (conversation.participants && Array.isArray(conversation.participants)) {
    const other = conversation.participants.find((p) => {
      // Try both id field (from Firebase) and localId/uid fields (from authentication)
      return (
        p &&
        p.id !== currentUserId &&
        p.localId !== currentUserId &&
        p.uid !== currentUserId
      );
    });

    if (other) {
      return {
        id: other.id || other.localId || other.uid,
        name: other.username || other.name || "Unknown User",
        profilePic: other.profilePic,
      };
    }
  }

  // Fallback for safety, this should not be hit if the backend is correct.
  console.warn(
    "Could not find the other participant in conversation:",
    conversation.id
  );
  return {
    id: "unknown",
    name: "Unknown User",
    profilePic: null,
  };
}

// =================================================================================
// MESSAGE HANDLING
// =================================================================================

async function selectConversation(conversation) {
  if (currentConversation?.id === conversation.id && websocket) {
    return; // Avoid reloading the same conversation if websocket is connected
  }

  currentConversation = conversation;
  showConversationInterface();
  updateConversationSelection();

  // Close previous WebSocket connection if it exists
  if (websocket) {
    websocket.onclose = null; // Prevent onclose handler from running on manual close
    websocket.close();
  }

  // Load message history first
  await loadMessages(conversation.id);

  // Establish a new WebSocket connection
  const token =
    localStorage.getItem("idToken") || sessionStorage.getItem("idToken");
  if (!token) {
    showError("Authentication token not found.");
    return;
  }

  const wsBaseUrl = API_BASE_URL.replace(/^http/, "ws").replace("/api", "");
  const wsUrl = `${wsBaseUrl}/ws/conversations/${conversation.id}?token=${token}`;

  console.log(`Connecting to WebSocket: ${wsUrl}`);
  websocket = new WebSocket(wsUrl);

  websocket.onopen = () => {
    console.log("✅ WebSocket connection established for:", conversation.id);
  };

  websocket.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === "status") {
      console.log("Status update:", message.message);
      appendStatusMessage(message.message);
    } else if (message.type === "error") {
      console.error("WebSocket error from server:", message.message);
      showError(message.message);
    } else {
      currentMessages.push(message);
      appendMessage(message);
    }
  };

  websocket.onerror = (error) => {
    console.error("WebSocket error:", error);
    showError("Kết nối tin nhắn bị gián đoạn. Vui lòng tải lại trang.");
  };

  websocket.onclose = (event) => {
    console.log("WebSocket connection closed:", event.reason, event.code);
    websocket = null;
    if (!event.wasClean) {
      showError("Mất kết nối tin nhắn. Đang cố gắng kết nối lại...");
      // Optional: Implement reconnection logic here
    }
  };
}

function updateConversationSelection() {
  const conversationItems = document.querySelectorAll(".conversation-item");
  conversationItems.forEach((item) => {
    item.classList.remove("selected");
  });

  const selectedItem = Array.from(conversationItems).find((item) => {
    const nameElement = item.querySelector(".conversation-item-name");
    if (nameElement) {
      const otherParticipant = getOtherParticipant(currentConversation);
      return nameElement.textContent === otherParticipant.username;
    }
    return false;
  });

  if (selectedItem) {
    selectedItem.classList.add("selected");
  }
}

function showConversationInterface() {
  // Hide welcome screen
  document.getElementById("welcomeScreen").style.display = "none";

  // Show conversation interface
  document.getElementById("conversationHeader").style.display = "flex";
  document.getElementById("messagesContainer").style.display = "block";
  document.getElementById("messageInputContainer").style.display = "block";

  // Update conversation header
  const otherParticipant = getOtherParticipant(currentConversation);
  document.getElementById("conversationUserName").textContent =
    otherParticipant.name;

  // Update header avatar
  const headerAvatar = document.getElementById("conversationUserAvatar");
  headerAvatar.src = otherParticipant.profilePic
    ? `${API_BASE_URL.replace("/api", "")}${otherParticipant.profilePic}`
    : "logo/profile-icon-white.png";
  headerAvatar.onerror = () =>
    (headerAvatar.src = "logo/profile-icon-white.png");
}

async function loadMessages(conversationId) {
  try {
    showLoading(true);
    const token =
      localStorage.getItem("idToken") || sessionStorage.getItem("idToken");
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}/messages`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (response.ok) {
      const data = await response.json();
      currentMessages = data.data || [];
      renderMessages();
    } else {
      throw new Error(`Failed to load messages: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error loading messages for ${conversationId}:`, error);
    document.getElementById("messagesList").innerHTML =
      '<div class="error-message">Không thể tải tin nhắn.</div>';
  } finally {
    showLoading(false);
  }
}

function renderMessages() {
  const messageList = document.getElementById("messagesList");
  messageList.innerHTML = "";
  currentMessages.forEach((message) => {
    const messageElement = createMessageElement(message);
    messageList.appendChild(messageElement);
  });
  scrollToBottom();
}

function appendMessage(message) {
  // Prevent duplicates if a message arrives on WS that was also added optimistically
  if (document.getElementById(`msg-${message.id}`)) {
    return;
  }
  const messageList = document.getElementById("messagesList");
  const messageElement = createMessageElement(message);
  messageList.appendChild(messageElement);
  scrollToBottom();
}

function appendStatusMessage(statusText) {
  const messageList = document.getElementById("messagesList");
  const statusElement = document.createElement("div");
  statusElement.className = "status-message";
  statusElement.textContent = statusText;
  messageList.appendChild(statusElement);
  scrollToBottom();
}

function createMessageElement(message) {
  const isCurrentUser =
    message.sender_id === (currentUser?.localId || currentUser?.uid);
  const messageWrapper = document.createElement("div");
  messageWrapper.className = `message-wrapper ${
    isCurrentUser ? "sent" : "received"
  }`;
  messageWrapper.id = `msg-${message.id}`;

  const messageBubble = document.createElement("div");
  messageBubble.className = "message-bubble";

  // Get sender's profile picture
  let senderProfilePic = null;
  let senderName = "";

  if (isCurrentUser) {
    senderProfilePic = currentUser?.profilePic || null;
    senderName = currentUser?.username || currentUser?.name || "You";
  } else {
    const otherParticipant = getOtherParticipant(currentConversation);
    senderProfilePic = otherParticipant?.profilePic || null;
    senderName =
      otherParticipant?.name || message.sender_name || "Unknown User";
  }

  const avatarContent = createAvatarContent(
    senderProfilePic,
    senderName?.charAt(0) || "U",
    isCurrentUser
  );

  // Handle different timestamp field names from different sources
  const messageTime =
    message.timestamp || message.time_sent || new Date().toISOString();

  messageBubble.innerHTML = `
        <div class="message-sender">${escapeHtml(senderName)}</div>
        <div class="message-content">
            <p class="message-text">${escapeHtml(message.content || "")}</p>
        </div>
        <div class="message-meta">
            <span class="timestamp">${formatTime(messageTime)}</span>
        </div>
    `;

  if (isCurrentUser) {
    messageWrapper.appendChild(messageBubble);
    messageWrapper.appendChild(avatarContent);
  } else {
    messageWrapper.appendChild(avatarContent);
    messageWrapper.appendChild(messageBubble);
  }

  return messageWrapper;
}

const createAvatarContent = (profilePic, initial, isCurrentUser = false) => {
  const avatar = document.createElement("div");
  avatar.className = `user-avatar message-avatar ${
    isCurrentUser ? "avatar-sent" : "avatar-received"
  }`;

  if (profilePic) {
    const img = document.createElement("img");
    img.src = `${API_BASE_URL.replace("/api", "")}${profilePic}`;
    img.alt = initial;
    img.onerror = () => {
      // Fallback to initial if image fails
      const initialSpan = document.createElement("span");
      initialSpan.textContent = initial;
      avatar.innerHTML = "";
      avatar.appendChild(initialSpan);
    };
    avatar.appendChild(img);
  } else {
    const initialSpan = document.createElement("span");
    initialSpan.textContent = initial;
    avatar.appendChild(initialSpan);
  }

  return avatar;
};

async function sendMessage() {
  const messageInput = document.getElementById("messageInput");
  const content = messageInput.value.trim();

  if (!content || !currentConversation) {
    return;
  }

  if (websocket && websocket.readyState === WebSocket.OPEN) {
    // Optimistically create a message object to display immediately
    const optimisticMessage = {
      id: `temp-${Date.now()}`, // Temporary ID
      sender_id: currentUser?.localId || currentUser?.uid,
      sender_name: currentUser?.username || "Me",
      content: content,
      timestamp: new Date().toISOString(),
    };
    // appendMessage(optimisticMessage);

    // Send the message via WebSocket
    websocket.send(content);

    // Clear the input
    messageInput.value = "";
  } else {
    showError("Không có kết nối tin nhắn. Vui lòng thử lại.");
    console.error("WebSocket is not connected or in a ready state.");
    // You might want to try re-establishing the connection here
  }
}

function handleMessageKeyPress(event) {
  if (event.key === "Enter") {
    sendMessage();
  }
}

// Modal functions
function openNewChatModal() {
  document.getElementById("newChatModal").style.display = "block";
  document.getElementById("searchUsers").focus();
}

function closeNewChatModal() {
  document.getElementById("newChatModal").style.display = "none";
  document.getElementById("searchUsers").value = "";
  document.getElementById("usersList").innerHTML =
    '<div class="loading-message">Nhập tên để tìm kiếm người dùng...</div>';
}

// Functions for Share Memory Modal
let selectedUserForSharing = null;

function openShareMemoryModal() {
  document.getElementById("shareMemoryModal").style.display = "block";
  document.getElementById("shareWithUserEmail").focus();
  selectedUserForSharing = null; // Reset selected user
  document.getElementById("memoryFile").value = null; // Reset file input
}

function closeShareMemoryModal() {
  document.getElementById("shareMemoryModal").style.display = "none";
  document.getElementById("shareWithUserEmail").value = "";
  document.getElementById("shareUserSuggestionList").innerHTML =
    '<div class="loading-message">Enter an email to find users.</div>';
  document.getElementById("memoryFile").value = null;
  selectedUserForSharing = null;
}

function renderShareUserResults(users) {
  const usersList = document.getElementById("shareUserSuggestionList");
  usersList.innerHTML = ""; // Clear previous results or message

  if (users.length === 0) {
    usersList.innerHTML = '<div class="loading-message">No users found.</div>';
    return;
  }

  users.forEach((user) => {
    const userItem = createShareUserElement(user);
    usersList.appendChild(userItem);
  });
}

function createShareUserElement(user) {
  const div = document.createElement("div");
  div.className = "user-item"; // Reuse existing class for styling
  div.onclick = () => selectUserForSharing(user, div);

  const avatarContent = user.profilePic
    ? `<img src="${API_BASE_URL.replace("/api", "")}${user.profilePic}" alt="${
        user.name
      }" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.innerHTML='${
        user.name?.charAt(0).toUpperCase() || "U"
      }';" />`
    : user.name?.charAt(0).toUpperCase() || "U";

  div.innerHTML = `
        <div class="user-avatar">${avatarContent}</div>
        <div class="user-info">
            <div class="user-name">${escapeHtml(
              user.username || "Unknown User"
            )}</div>
            <div class="user-email">${escapeHtml(user.email || "")}</div>
        </div>
    `;
  return div;
}

function selectUserForSharing(user, element) {
  selectedUserForSharing = user;
  // Highlight selected user
  const allUserItems = document.querySelectorAll(
    "#shareUserSuggestionList .user-item"
  );
  allUserItems.forEach((item) => item.classList.remove("selected"));
  element.classList.add("selected");
  console.log("User selected for sharing:", selectedUserForSharing);
  // Optionally, update the input field or display selection more prominently
  document.getElementById("shareWithUserEmail").value = user.email;
  // Hide the list after selection
  // document.getElementById("shareUserSuggestionList").style.display = 'none';
}

async function handleShareMemory() {
  const memoryFile = document.getElementById("memoryFile").files[0];

  if (!memoryFile) {
    alert("Please select a memory (file) to share.");
    return;
  }

  if (!selectedUserForSharing) {
    alert(
      "Please select a user to share with by typing their email and clicking on the suggestion."
    );
    return;
  }

  console.log(
    `Sharing memory: ${memoryFile.name} with user: ${selectedUserForSharing.name} (${selectedUserForSharing.email})`
  );
  alert(
    `Sharing '${memoryFile.name}' with ${selectedUserForSharing.name} (${selectedUserForSharing.email}).\n(Actual sharing functionality needs backend implementation.)`
  );

  closeShareMemoryModal();
}

async function searchUsers() {
  const query = document.getElementById("searchFriendInput").value.trim();
  console.log(query);
  if (!query || query.length < 1) {
    document.getElementById("friendSearchResultsContainer").innerHTML =
      '<div class="loading-message">Nhập email hoặc tên để tìm kiếm người dùng...</div>';
    return;
  }

  // Show searching state
  document.getElementById("friendSearchResultsContainer").innerHTML =
    '<div class="loading-message">🔍 Đang tìm kiếm...</div>';

  // Debounce search
  renderSearchResults(all_users, query);
}

function renderSearchResults(users, query) {
  const usersList = document.getElementById("friendSearchResultsContainer");

  if (users.length === 0) {
    usersList.innerHTML =
      '<div class="loading-message">Không tìm thấy người dùng</div>';
    return;
  }
  usersList.innerHTML = "";

  users.forEach((user) => {
    if (user.email.toLowerCase().includes(query.toLowerCase())) {
      const userItem = createUserProfileElement(user);
      usersList.appendChild(userItem);
    }
  });
}

function createUserProfileElement(user) {
  const div = document.createElement("div");
  // Use a more specific class if needed, or rely on user-item and .friend-search-results-container for context
  div.className = "friend-search-result-item user-item"; // Match class from previous versions for styling
  div.onclick = () => openFriendDetailModal(user);

  const defaultAvatar = "logo/profile-icon-white.png"; // Ensure this path is correct
  // Construct profilePic URL relative to API_BASE_URL if it's a partial path
  const avatarUrl = user.profilePic
    ? user.profilePic.startsWith("http")
      ? user.profilePic
      : `${API_BASE_URL.replace("/api", "")}${user.profilePic}`
    : defaultAvatar;

  let avatarHTML;
  if (user.profilePic) {
    avatarHTML = `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(
      user.name || user.email
    )}" class="user-avatar-img" onerror="this.onerror=null; this.style.display='none'; const initial = (this.alt.charAt(0) || '?').toUpperCase(); const parent = this.parentElement; parent.innerHTML = \`<div class='user-avatar-initial'>\${initial}</div>\`;">`;
  } else {
    const initial = (user.name || user.email)?.charAt(0).toUpperCase() || "?";
    avatarHTML = `<div class="user-avatar-initial">${escapeHtml(
      initial
    )}</div>`;
  }

  div.innerHTML = `
    <div class="user-avatar-container">
      ${avatarHTML}
    </div>
    <div class="user-info">
      <div class="user-name">${escapeHtml(user.username || "N/A")}</div>
      <div class="user-email">${escapeHtml(user.email || "N/A")}</div>
    </div>
  `; // Removed " мужчины" placeholder
  return div;
}

// Function to open friend detail modal
function openFriendDetailModal(user) {
  if (!user) return;

  const modal = document.getElementById("friendDetailModal");
  const avatarImg = document.getElementById("friendDetailAvatar");
  const avatarInitialDiv = document.getElementById("friendDetailAvatarInitial"); // Div for initials
  const usernameEl = document.getElementById("friendDetailUsername");
  const emailEl = document.getElementById("friendDetailEmail");
  const addBtn = document.getElementById("friendDetailAddBtn");
  const statusMsg = document.getElementById("friendDetailStatusMsg");

  // Populate avatar
  const defaultAvatarPath = "logo/profile-icon-white.png";
  avatarInitialDiv.innerHTML = ""; // Clear previous initials
  avatarInitialDiv.style.display = "none";
  avatarImg.style.display = "none";

  if (user.profilePic) {
    const picSrc = user.profilePic.startsWith("http")
      ? user.profilePic
      : `${API_BASE_URL.replace("/api", "")}${user.profilePic}`;
    avatarImg.src = picSrc;
    avatarImg.alt = user.name || user.email;
    avatarImg.style.display = "block";
    avatarImg.onerror = () => {
      avatarImg.style.display = "none";
      const initial = (user.name || user.email)?.charAt(0).toUpperCase() || "?";
      avatarInitialDiv.textContent = initial;
      avatarInitialDiv.style.display = "flex";
    };
  } else {
    const initial = (user.name || user.email)?.charAt(0).toUpperCase() || "?";
    avatarInitialDiv.textContent = initial;
    avatarInitialDiv.style.display = "flex";
  }

  usernameEl.textContent = escapeHtml(user.username || "N/A");
  emailEl.textContent = escapeHtml(user.email || "N/A");

  // Reset button state and status message
  addBtn.textContent = "Thêm bạn bè";
  addBtn.disabled = false;
  // Pass true for isFromModal to handle UI updates in the modal
  addBtn.onclick = () => sendFriendRequest(user.email, true);
  statusMsg.textContent = "";
  statusMsg.style.display = "none";
  statusMsg.className = "friend-detail-status"; // Reset classes

  modal.style.display = "block";
}

// Function to close friend detail modal
function closeFriendDetailModal() {
  const modal = document.getElementById("friendDetailModal");
  if (modal) {
    modal.style.display = "none";
  }
}

async function startChatWithUser(user) {
  closeNewChatModal();
  closeFriendDetailModal();
  showLoading(true);

  try {
    const token =
      localStorage.getItem("idToken") || sessionStorage.getItem("idToken");

    // Check if a conversation already exists
    const existingConversation = conversations.find((conv) =>
      conv.participants?.some((p) => p.id === user.id)
    );

    if (existingConversation) {
      selectConversation(existingConversation);
      return;
    }

    // If not, create a new one
    const response = await fetch(`${API_BASE_URL}/conversations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ other_user_id: user.id }),
    });

    if (response.ok) {
      const newConversationData = await response.json();

      // The backend should return the full new conversation object
      // For now, we'll manually create it or reload all conversations
      await loadConversations();
      const newConversation = conversations.find(
        (c) => c.id === newConversationData.conversation_id
      );

      if (newConversation) {
        selectConversation(newConversation);
      }
    } else {
      const error = await response.json();
      throw new Error(
        `Failed to create conversation: ${error.detail || response.statusText}`
      );
    }
  } catch (error) {
    console.error("Error starting chat:", error);
    showError("Không thể bắt đầu cuộc trò chuyện. Vui lòng thử lại.");
  } finally {
    showLoading(false);
  }
}

// Search functionality
function setupSearchFunctionality() {
  const searchInput = document.getElementById("searchConversations");
  searchInput.addEventListener("input", function () {
    const query = this.value.toLowerCase().trim();
    filterConversations(query);
  });
}

function filterConversations(query) {
  const conversationItems = document.querySelectorAll(".conversation-item");

  conversationItems.forEach((item, index) => {
    const conversation = conversations[index];
    if (!conversation) return;

    const otherParticipant = getOtherParticipant(conversation);
    const matchesName = otherParticipant.name.toLowerCase().includes(query);
    const matchesMessage = (conversation.last_message || "")
      .toLowerCase()
      .includes(query);

    if (matchesName || matchesMessage || !query) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

// Utility functions
function formatTime(dateString) {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }

    const now = new Date();
    const diff = now - date;

    // Less than 1 minute
    if (diff < 60000) {
      return "Vừa xong";
    }

    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} phút trước`;
    }

    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} giờ trước`;
    }

    // More than 24 hours
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch (error) {
    console.error("Error formatting time:", error, "Input:", dateString);
    return "Unknown time";
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function scrollToBottom() {
  const messagesContainer = document.getElementById("messagesContainer");
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showLoading(show) {
  const loadingOverlay = document.getElementById("loadingOverlay");
  loadingOverlay.style.display = show ? "flex" : "none";
}

function showError(message) {
  alert(message); // Replace with a better notification system
}

function handleAttachment() {
  // Placeholder for file attachment functionality
  alert("Tính năng đính kèm file sẽ được cập nhật trong phiên bản tiếp theo!");
}

function clearConversation() {
  if (confirm("Bạn có chắc chắn muốn xóa cuộc trò chuyện này?")) {
    // Placeholder for clearing conversation functionality
    alert(
      "Tính năng xóa cuộc trò chuyện sẽ được cập nhật trong phiên bản tiếp theo!"
    );
  }
}

// Clean up when leaving the page
window.addEventListener("beforeunload", function () {
  if (websocket) {
    websocket.onclose = null;
    websocket.close();
  }
});

// Close modal when clicking outside
window.addEventListener("click", function (event) {
  const newChatModal = document.getElementById("newChatModal");
  const shareMemoryModal = document.getElementById("shareMemoryModal");
  const friendDetailModal = document.getElementById("friendDetailModal");

  if (event.target === newChatModal) {
    closeNewChatModal();
  }
  if (event.target === shareMemoryModal) {
    closeShareMemoryModal();
  }
  if (friendDetailModal && event.target === friendDetailModal) {
    closeFriendDetailModal();
  }
});

// Test function to verify message positioning
function testMessagePositioning() {
  if (!currentConversation) {
    console.log("❌ No conversation selected for testing");
    return;
  }

  const testMessages = [
    {
      id: "test1",
      sender_id: currentUser?.localId || currentUser?.uid, // Your message
      content: "This should appear on the RIGHT side (sent by you)",
      time_sent: new Date().toISOString(),
    },
    {
      id: "test2",
      sender_id: "other_user_test", // Other user's message
      content: "This should appear on the LEFT side (sent by other user)",
      time_sent: new Date().toISOString(),
    },
    {
      id: "test3",
      sender_id: currentUser?.localId || currentUser?.uid, // Your message
      content: "Another message from YOU - should be on the RIGHT",
      time_sent: new Date().toISOString(),
    },
  ];

  // Temporarily replace messages for testing
  const originalMessages = currentMessages;
  currentMessages = testMessages;

  console.log("🧪 Testing message positioning with sample messages...");
  renderMessages();

  // Restore original messages after 10 seconds
  setTimeout(() => {
    currentMessages = originalMessages;
    renderMessages();
    console.log("✅ Restored original messages");
  }, 10000);
}

// Make it available globally for testing
window.testMessagePositioning = testMessagePositioning;

async function sendFriendRequest(targetUserId, isFromModal = false) {
  console.log(
    `Attempting to send friend request to user ID: ${targetUserId}, fromModal: ${isFromModal}`
  );

  let buttonToUpdate;
  let statusMessageElement;

  if (isFromModal) {
    buttonToUpdate = document.getElementById("friendDetailAddBtn");
    statusMessageElement = document.getElementById("friendDetailStatusMsg");
  } else {
    // Fallback for non-modal scenarios (e.g., if a button was directly in search results)
    // This part might need adjustment if you don't have add friend buttons outside modals.
    // For now, focusing on the modal case.
    console.warn(
      "sendFriendRequest called without modal context and no fallback UI logic implemented for button updates."
    );
  }

  if (buttonToUpdate) {
    buttonToUpdate.textContent = "Đang gửi...";
    buttonToUpdate.disabled = true;
  }
  if (statusMessageElement) {
    statusMessageElement.textContent = "Đang gửi yêu cầu...";
    statusMessageElement.className =
      "friend-detail-status friend-detail-status-processing";
    statusMessageElement.style.display = "block";
  }

  try {
    const token =
      localStorage.getItem("idToken") || sessionStorage.getItem("idToken");
    if (!token) {
      const errorMsg = "Lỗi xác thực. Vui lòng đăng nhập lại.";
      showError(errorMsg);
      if (buttonToUpdate) {
        buttonToUpdate.textContent = "Thêm bạn";
        buttonToUpdate.disabled = false;
      }
      if (statusMessageElement) {
        statusMessageElement.textContent = errorMsg;
        statusMessageElement.className =
          "friend-detail-status friend-detail-status-error";
      }
      return;
    }

    const response = await fetch(`${API_BASE_URL}/friends/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ target_user_email: targetUserId }),
    });

    const responseData = await response.json();

    if (response.ok && responseData.success) {
      const successMsg =
        responseData.message || "Yêu cầu kết bạn đã được gửi thành công!";
      // For modal, update status message. For general, alert.
      if (statusMessageElement) {
        statusMessageElement.textContent = successMsg;
        statusMessageElement.className =
          "friend-detail-status friend-detail-status-success";
      } else {
        alert(successMsg);
      }
      if (buttonToUpdate) {
        buttonToUpdate.textContent = "Đã gửi YC";
        // buttonToUpdate.disabled = true; // Keep disabled
      }
      // Optionally close modal on success after a delay
      // if (isFromModal) setTimeout(closeFriendDetailModal, 2000);
    } else {
      const errorMessage =
        responseData.detail ||
        responseData.message ||
        "Không thể gửi yêu cầu kết bạn.";

      if (statusMessageElement) {
        statusMessageElement.textContent = errorMessage;
        statusMessageElement.className =
          "friend-detail-status friend-detail-status-error";
      } else {
        showError(errorMessage); // Use main alert for errors if no modal status element
      }
      console.error(
        `Failed to send friend request (HTTP ${response.status}):`,
        responseData
      );
      if (buttonToUpdate) {
        if (response.status === 409) {
          // Conflict
          buttonToUpdate.textContent =
            responseData.message || "Yêu cầu đã tồn tại";
        } else {
          buttonToUpdate.textContent = "Thêm bạn";
          buttonToUpdate.disabled = false; // Re-enable for other errors
        }
      }
    }
  } catch (error) {
    const networkErrorMsg =
      "Lỗi mạng hoặc lỗi khác khi gửi yêu cầu kết bạn. Vui lòng thử lại.";
    console.error("Network or other error sending friend request:", error);
    if (statusMessageElement) {
      statusMessageElement.textContent = networkErrorMsg;
      statusMessageElement.className =
        "friend-detail-status friend-detail-status-error";
    } else {
      showError(networkErrorMsg);
    }
    if (buttonToUpdate) {
      buttonToUpdate.textContent = "Thêm bạn";
      buttonToUpdate.disabled = false;
    }
  }
}

function renderFriendRequests(requests) {
  const listContainer = document.getElementById("friendRequestListContainer");
  listContainer.innerHTML = ""; // Clear loading message or previous content

  if (requests.length === 0) {
    listContainer.innerHTML =
      '<div class="no-requests-message">No pending friend requests.</div>';
    return;
  }

  requests.forEach((request) => {
    const requestElement = createFriendRequestElement(request);
    listContainer.appendChild(requestElement);
  });
}

function createFriendRequestElement(request) {
  const item = document.createElement("div");
  item.className = "friend-request-item";
  // Handle both the expected structure and the actual structure from backend
  let requester;
  if (request.requester_info) {
    // Expected structure with nested requester_info
    requester = request.requester_info;
  } else {
    // Actual structure from backend - user info is directly in the request
    requester = {
      username: request.username || "Unknown User",
      email: request.email || "No email",
      profilePic: request.profilePic || null,
    };
  }

  const defaultAvatar = "logo/profile-icon-white.png";
  let avatarHTML;

  if (requester.profilePic) {
    const avatarUrl = requester.profilePic.startsWith("http")
      ? requester.profilePic
      : `${API_BASE_URL.replace("/api", "")}${requester.profilePic}`;
    avatarHTML = `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(
      requester.username || "User"
    )}" onerror="this.onerror=null; this.src='${defaultAvatar}';">`;
  } else {
    const initial = (requester.name || "U").charAt(0).toUpperCase();
    avatarHTML = `<div class="initials">${escapeHtml(initial)}</div>`;
  }

  item.innerHTML = `
    <div class="request-item-avatar">
      ${avatarHTML}
    </div>
    <div class="request-item-info">
      <div class="request-item-name">${escapeHtml(
        requester.username || "Unknown User"
      )}</div>
      <div class="request-item-email">${escapeHtml(
        requester.email || "No email"
      )}</div>
    </div>
    <div class="request-item-actions">
      <button class="btn-accept">Accept</button>
      <button class="btn-decline">Decline</button>
    </div>
  `;

  const acceptButton = item.querySelector(".btn-accept");
  const declineButton = item.querySelector(".btn-decline");

  const requestEmail = request.email || `temp-${Date.now()}`;
  acceptButton.addEventListener("click", () =>
    handleFriendRequestAction(requestEmail, "accepted", item)
  );
  declineButton.addEventListener("click", () =>
    handleFriendRequestAction(requestEmail, "declined", item)
  );

  return item;
}

async function handleFriendRequestAction(
  requestEmail,
  action,
  listItemElement
) {
  // Visually disable buttons immediately
  const buttons = listItemElement.querySelectorAll("button");
  buttons.forEach((btn) => (btn.disabled = true));
  listItemElement.style.opacity = 0.7;

  try {
    const token =
      localStorage.getItem("idToken") || sessionStorage.getItem("idToken");
    if (!token) {
      alert("Authentication error. Please log in again.");
      buttons.forEach((btn) => (btn.disabled = false)); // Re-enable
      listItemElement.style.opacity = 1;
      return;
    }
    const formData = new FormData();
    formData.append("request_email", requestEmail);
    formData.append("action", action);

    const response = await fetch(`${API_BASE_URL}/friend_requests`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`, // DO NOT manually set Content-Type
      },
      body: formData,
    });

    const responseData = await response.json();
    console.log(responseData);
    if (response.ok && responseData.success) {
      alert(responseData.message || `Request ${action} successfully.`);
      // Remove item from UI
      listItemElement.remove();

      // Check if friend request list is now empty
      const friendRequestList = document.getElementById("friendRequestList");
      const friendRequestBlock = document.getElementById("friendRequestBlock");

      if (friendRequestList && friendRequestList.children.length === 0) {
        // Hide the entire friend request block when no requests remain
        if (friendRequestBlock) {
          friendRequestBlock.style.display = "none";
        }
      }

      // Update the friend_requests data to reflect the change
      if (friend_requests.data) {
        friend_requests.data = friend_requests.data.filter(
          (req) => req.email !== requestEmail
        );
      }
    } else {
      alert(
        responseData.message || "Failed to process request. Please try again."
      );
      buttons.forEach((btn) => (btn.disabled = false)); // Re-enable on error
      listItemElement.style.opacity = 1;
    }
  } catch (error) {
    console.error(`Error ${action} friend request:`, error);
    alert("An error occurred. Please try again.");
    buttons.forEach((btn) => (btn.disabled = false)); // Re-enable on error
    listItemElement.style.opacity = 1;
  }
}

// ---- End Friend Request Panel Logic ----
