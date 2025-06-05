// Global variables
let currentConversation = null;
let currentUser = null;
let conversations = [];
let currentMessages = [];
let messagePollingInterval = null;
let friend_requests = [];
let user_friendList = [];

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

async function get_friend_requests() {
  const token =
    localStorage.getItem("idToken") || sessionStorage.getItem("idToken");
  const response = await fetch(`${API_BASE_URL}/friend_requests`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  friend_requests = await response.json();
  return friend_requests;
}

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

    await get_friend_requests();
    user_friendList = await get_user_friendList();
    // Load conversations
    if (friend_requests.data.length > 0) {
      console.log(friend_requests.data);
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

async function get_user_friendList() {
  const token =
    localStorage.getItem("idToken") || sessionStorage.getItem("idToken");
  const response = await fetch(`${API_BASE_URL}/get_friends`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  user_friendList = await response.json();
  if (user_friendList.success) {
    return user_friendList.data;
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
  friend_requests.data.forEach((request) => {
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
  const div = document.createElement("div");
  div.className = "conversation-item";
  div.onclick = () => selectConversation(conversation);

  // Get other participant info (for now using mock data)
  const otherParticipant = getOtherParticipant(conversation);
  const unreadCount =
    conversation.unread_count?.[currentUser?.localId || currentUser?.uid] || 0;

  const avatarSrc = otherParticipant.profilePic
    ? `${API_BASE_URL.replace("/api", "")}${otherParticipant.profilePic}`
    : "logo/profile-icon-white.png";

  div.innerHTML = `
        <div class="user-avatar">
            <img src="${avatarSrc}" alt="${
    otherParticipant.name
  }" onerror="this.src='logo/profile-icon-white.png'" />
        </div>
        <div class="conversation-item-info">
            <div class="conversation-item-name">${otherParticipant.name}</div>
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

  // Use the other_user_info if available from the backend
  if (conversation.other_user_info) {
    return {
      id: conversation.other_user_info.id,
      name:
        conversation.other_user_info.name ||
        conversation.other_user_info.username ||
        "Unknown User",
      status: "online", // We can implement real status later
    };
  }

  // Fallback to determining other participant manually
  let otherParticipantId;
  if (conversation.created_user === currentUserId) {
    otherParticipantId = conversation.other_user;
  } else {
    otherParticipantId = conversation.created_user;
  }

  // Create a more realistic display name
  const displayName = otherParticipantId
    ? `User (${otherParticipantId.substring(0, 8)}...)`
    : "Unknown User";

  return {
    id: otherParticipantId,
    name: displayName,
    status: "online", // We can implement real status later
  };
}

async function selectConversation(conversation) {
  try {
    currentConversation = conversation;

    // Update UI
    updateConversationSelection();
    showConversationInterface();

    // Load messages
    await loadMessages(conversation.id);

    // Start polling for new messages
    startMessagePolling();
  } catch (error) {
    console.error("Error selecting conversation:", error);
    showError("Không thể tải cuộc trò chuyện");
  }
}

function updateConversationSelection() {
  // Remove active class from all conversation items
  document.querySelectorAll(".conversation-item").forEach((item) => {
    item.classList.remove("active");
  });

  // Add active class to current selection
  const conversationItems = document.querySelectorAll(".conversation-item");
  const currentConversationIndex = conversations.findIndex(
    (conversation) => conversation.id === currentConversation.id
  );
  if (
    currentConversationIndex >= 0 &&
    conversationItems[currentConversationIndex]
  ) {
    conversationItems[currentConversationIndex].classList.add("active");
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
  if (headerAvatar && otherParticipant.profilePic) {
    headerAvatar.src = `${API_BASE_URL.replace("/api", "")}${
      otherParticipant.profilePic
    }`;
    headerAvatar.onerror = function () {
      this.src = "logo/profile-icon-white.png";
    };
  }
}

async function loadMessages(conversationId) {
  try {
    const token =
      localStorage.getItem("idToken") || sessionStorage.getItem("idToken");
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}/messages`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      currentMessages = data.data || [];
      renderMessages();
    } else {
      throw new Error("Failed to load messages");
    }
  } catch (error) {
    console.error("Error loading messages:", error);
    document.getElementById("messagesList").innerHTML =
      '<div class="loading-message">Không thể tải tin nhắn</div>';
  }
}

function renderMessages() {
  const messagesList = document.getElementById("messagesList");
  messagesList.innerHTML = "";

  if (currentMessages.length === 0) {
    messagesList.innerHTML =
      '<div class="loading-message">Chưa có tin nhắn nào</div>';
    return;
  }

  currentMessages.forEach((message) => {
    const messageElement = createMessageElement(message);
    messagesList.appendChild(messageElement);
  });

  // Scroll to bottom
  scrollToBottom();
}

function createMessageElement(message) {
  const div = document.createElement("div");
  const currentUserId = currentUser?.localId || currentUser?.uid;
  const isSent = message.sender_id === currentUserId;

  // Debug logging
  console.log("🔍 Message Classification Debug:");
  console.log("Current User ID:", currentUserId);
  console.log("Message Sender ID:", message.sender_id);
  console.log("Is Sent?", isSent);
  console.log("Message Content:", message.content);
  console.log("---");

  div.className = `message ${isSent ? "sent" : "received"}`;

  // Add inline styles as fallback to ensure positioning works
  if (isSent) {
    div.style.display = "flex";
    div.style.justifyContent = "flex-end";
    div.style.width = "fit-content";
    div.style.maxWidth = "85%";
    div.style.marginBottom = "15px";
    div.style.marginLeft = "auto";
    div.style.paddingRight = "10px";
  } else {
    div.style.display = "flex";
    div.style.justifyContent = "flex-start";
    div.style.width = "fit-content";
    div.style.maxWidth = "85%";
    div.style.marginBottom = "15px";
    div.style.marginRight = "auto";
    div.style.paddingLeft = "10px";
  }

  // Get sender info for display
  let senderName = "You";
  let senderInitial = "Y";
  let senderProfilePic = null;

  if (!isSent) {
    if (currentConversation && currentConversation.other_user_info) {
      senderName = currentConversation.other_user_info.name || "Other";
      senderInitial = senderName.charAt(0).toUpperCase();
      senderProfilePic = currentConversation.other_user_info.profilePic;
    } else {
      senderName = "Other";
      senderInitial = "O";
    }
  } else {
    if (currentUser && currentUser.displayName) {
      senderName = currentUser.displayName;
      senderInitial = senderName.charAt(0).toUpperCase();
    } else {
      senderInitial = "Y";
    }
    // For sent messages, we could load the current user's profile picture
    // For now, we'll use the initial approach
  }

  const messageContentStyle = isSent
    ? `background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 18px; padding: 12px 16px; max-width: 70%; margin-left: auto; word-wrap: break-word; box-shadow: 0 2px 8px rgba(0,0,0,0.1);`
    : `background: white; color: #333; border: 1px solid #e0e0e0; border-radius: 18px; padding: 12px 16px; max-width: 70%; margin-right: auto; word-wrap: break-word; box-shadow: 0 2px 8px rgba(0,0,0,0.1);`;

  const avatarStyle = isSent
    ? `width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; margin: 0 8px; flex-shrink: 0; overflow: hidden;`
    : `width: 32px; height: 32px; border-radius: 50%; background: #e0e0e0; color: #666; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; margin: 0 8px; flex-shrink: 0; overflow: hidden;`;

  // Create avatar content - either image or initial
  const createAvatarContent = (profilePic, initial, isCurrentUser = false) => {
    if (profilePic) {
      const picSrc = `${API_BASE_URL.replace("/api", "")}${profilePic}`;
      return `<img src="${picSrc}" alt="${initial}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.parentElement.innerHTML='${initial}';" />`;
    }
    return initial;
  };

  div.innerHTML = `
        ${
          !isSent
            ? `<div class="message-avatar" style="${avatarStyle}">${createAvatarContent(
                senderProfilePic,
                senderInitial
              )}</div>`
            : ""
        }
        <div class="message-content" style="${messageContentStyle}">
            <div class="message-text" style="font-size: 15px; line-height: 1.4; margin-bottom: 4px;">${escapeHtml(
              message.content
            )}</div>
            <div class="message-time" style="font-size: 11px; opacity: 0.7; margin-top: 5px; text-align: ${
              isSent ? "right" : "left"
            }; color: ${
    isSent ? "rgba(255,255,255,0.8)" : "#999"
  };">${formatTime(message.time_sent)}</div>
        </div>
        ${
          isSent
            ? `<div class="message-avatar sent-avatar" style="${avatarStyle}">${createAvatarContent(
                null,
                senderInitial,
                true
              )}</div>`
            : ""
        }
    `;

  return div;
}

async function sendMessage() {
  const messageInput = document.getElementById("messageInput");
  const content = messageInput.value.trim();

  if (!content || !currentConversation) return;

  try {
    const token =
      localStorage.getItem("idToken") || sessionStorage.getItem("idToken");

    const response = await fetch(
      `${API_BASE_URL}/conversations/${currentConversation.id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content,
        }),
      }
    );

    if (response.ok) {
      messageInput.value = "";
      // Reload messages to get the new message
      await loadMessages(currentConversation.id);
      // Reload conversations to update last message
      await loadConversations();
    } else {
      throw new Error("Failed to send message");
    }
  } catch (error) {
    console.error("Error sending message:", error);
    showError("Không thể gửi tin nhắn");
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
  renderSearchResults(user_friendList, query);
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
  try {
    showLoading(true);

    const token =
      localStorage.getItem("idToken") || sessionStorage.getItem("idToken");
    const response = await fetch(`${API_BASE_URL}/conversations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        other_user_email: user.email,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      closeNewChatModal();

      // Reload conversations and select the new/existing one
      await loadConversations();
      const conversation = conversations.find(
        (conversation) => conversation.id === data.conversation_id
      );
      if (conversation) {
        await selectConversation(conversation);
      }
    } else {
      throw new Error("Failed to create conversation");
    }
  } catch (error) {
    console.error("Error starting conversation:", error);
    showError("Không thể bắt đầu cuộc trò chuyện");
  } finally {
    showLoading(false);
  }
}

// Message polling for real-time updates
function startMessagePolling() {
  // Clear existing polling
  if (messagePollingInterval) {
    clearInterval(messagePollingInterval);
  }

  // Poll for new messages every 3 seconds
  messagePollingInterval = setInterval(async () => {
    if (currentConversation) {
      await loadMessages(currentConversation.id);
    }
  }, 3000);
}

function stopMessagePolling() {
  if (messagePollingInterval) {
    clearInterval(messagePollingInterval);
    messagePollingInterval = null;
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

  const date = new Date(dateString);
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
  stopMessagePolling();
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
