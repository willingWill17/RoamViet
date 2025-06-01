// Global variables
let currentConversation = null;
let currentUser = null;
let conversations = [];
let currentMessages = [];
let messagePollingInterval = null;

// Base API URL - adjust this to match your backend
const API_BASE_URL = "http://localhost:3053/api";

// Simple authentication check
function checkAuth() {
  const token = localStorage.getItem("idToken");
  const expiration = localStorage.getItem("tokenExpiration");

  console.log("🔐 Basic auth check:");
  console.log("🔐 Token exists:", !!token);
  console.log("🔐 Expiration:", expiration);

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

    console.log("🔐 Messaging: Checking authentication...");
    console.log("🔐 Token found:", !!token);
    console.log(
      "🔐 Token preview:",
      token ? token.substring(0, 20) + "..." : "none"
    );

    if (!token) {
      console.log("❌ No authentication token found, redirecting to login");
      window.location.href = "login.html";
      return;
    }

    // Verify token and get user info
    console.log("🔐 Verifying token and getting user info...");
    currentUser = await getCurrentUser();

    if (!currentUser) {
      console.log("❌ Failed to get user info, redirecting to login");
      window.location.href = "login.html";
      return;
    }

    console.log("✅ Authentication successful, user:", currentUser);

    // Load conversations
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

async function getCurrentUser() {
  try {
    const token =
      localStorage.getItem("idToken") || sessionStorage.getItem("idToken");

    console.log("🔐 Making profile request to:", `${API_BASE_URL}/profile`);

    const response = await fetch(`${API_BASE_URL}/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("🔐 Profile response status:", response.status);

    if (response.ok) {
      const data = await response.json();
      console.log("🔐 Profile response data:", data);
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

  if (conversations.length === 0) {
    conversationList.innerHTML = `
            <div class="loading-message">
                <p>Chưa có cuộc trò chuyện nào</p>
                <button class="start-chat-btn" onclick="openNewChatModal()">Bắt đầu trò chuyện</button>
            </div>
        `;
    return;
  }

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
  document.getElementById("conversationUserStatus").textContent =
    otherParticipant.status === "online" ? "Đang hoạt động" : "Không hoạt động";

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

let searchTimeout;
async function searchUsers() {
  const query = document.getElementById("searchUsers").value.trim();

  if (!query || query.length < 1) {
    document.getElementById("usersList").innerHTML =
      '<div class="loading-message">Nhập email hoặc tên để tìm kiếm người dùng...</div>';
    return;
  }

  // Show searching state
  document.getElementById("usersList").innerHTML =
    '<div class="loading-message">🔍 Đang tìm kiếm...</div>';

  // Debounce search
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    try {
      const token =
        localStorage.getItem("idToken") || sessionStorage.getItem("idToken");

      console.log(`🔍 Searching for users with query: "${query}"`);

      const response = await fetch(
        `${API_BASE_URL}/users/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`🔍 Search results:`, data.data);
        renderSearchResults(data.data || []);
      } else {
        throw new Error("Search failed");
      }
    } catch (error) {
      console.error("Error searching users:", error);
      document.getElementById("usersList").innerHTML =
        '<div class="loading-message">❌ Lỗi tìm kiếm. Vui lòng thử lại.</div>';
    }
  }, 500); // Increased debounce time to reduce API calls
}

function renderSearchResults(users) {
  const usersList = document.getElementById("usersList");

  if (users.length === 0) {
    usersList.innerHTML =
      '<div class="loading-message">Không tìm thấy người dùng</div>';
    return;
  }

  usersList.innerHTML = "";

  users.forEach((user) => {
    const userItem = createUserSearchElement(user);
    usersList.appendChild(userItem);
  });
}

function createUserSearchElement(user) {
  const div = document.createElement("div");
  div.className = "user-item";
  div.onclick = () => startChatWithUser(user);

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
              user.name || "Unknown User"
            )}</div>
            <div class="user-email">${escapeHtml(user.email || "")}</div>
        </div>
    `;

  return div;
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
        other_user_id: user.id,
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
  const modal = document.getElementById("newChatModal");
  if (event.target === modal) {
    closeNewChatModal();
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
