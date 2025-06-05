document.addEventListener("DOMContentLoaded", function () {
  // Check if authentication functions are available
  if (typeof isAuthenticated !== "function") {
    console.error("Authentication functions not loaded. Redirecting to login.");
    window.location.href = "login.html";
    return;
  }

  // Check authentication first
  if (!isAuthenticated()) {
    window.location.href = "login.html";
    return;
  }

  // Display user email in the header (you can modify this as needed)
  const userEmail = localStorage.getItem("userEmail");
  if (userEmail) {
    // You can add a user indicator in the header
    console.log("Logged in as:", userEmail);
  }

  // Array of background images
  const backgrounds = [
    "main_site_image/back1.png",
    "main_site_image/back2.png",
    "main_site_image/back3.png",
    "main_site_image/back4.png",
    "main_site_image/back5.png",
  ];

  const backgroundSlider = document.querySelector(".background-slider");
  let currentBg = 0;

  // Function to change background
  function changeBackground() {
    currentBg = (currentBg + 1) % backgrounds.length;
    backgroundSlider.style.backgroundImage = `url('${backgrounds[currentBg]}')`;
  }

  // Change background every 5 seconds
  setInterval(changeBackground, 5000);

  // Set initial background
  backgroundSlider.style.backgroundImage = `url('${backgrounds[0]}')`;

  // Add click event listeners for the nav links (for demonstration)
  const navLinks = document.querySelectorAll("nav a");
  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      console.log(`Navigating to ${this.getAttribute("href")}`);
      // Navigation happens automatically through the href attribute
    });
  });

  // Add click event for the detail button
  const detailBtn = document.querySelector(".detail-btn");
  if (detailBtn) {
    detailBtn.addEventListener("click", function (e) {
      console.log("Navigating to all_63.html");
      // Navigation happens automatically through the href attribute
    });
  }

  // Notification Panel Logic
  const notificationIconContainer = document.getElementById(
    "notificationIconContainer"
  );
  const notificationPanel = document.getElementById("notification-panel");
  const closeNotificationPanelBtn = document.getElementById(
    "close-notification-panel-btn"
  );
  const notificationList = document.getElementById("notification-list");

  // Sample notifications - replace with actual data fetching later
  const sampleNotifications = [
    { id: 1, message: "You have a new message from UserX.", type: "message" },
    {
      id: 2,
      message: "Event 'Team Meeting' is starting in 15 minutes.",
      type: "event",
    },
    {
      id: 3,
      message: "Your profile was updated successfully.",
      type: "system",
    },
  ];

  function renderNotifications() {
    const notification_url = "http://localhost:8080/api/friend_requests";
    // fet
    notificationList.innerHTML = ""; // Clear existing notifications
    if (sampleNotifications.length === 0) {
      notificationList.innerHTML =
        '<p class="loading-message">No new notifications.</p>';
      return;
    }
    sampleNotifications.forEach((notification) => {
      const notificationItem = document.createElement("div");
      notificationItem.classList.add("friend-request-item"); // Using existing class for item styling
      notificationItem.innerHTML = `
            <div class="request-item-info">
                <p class="request-item-name">${notification.message}</p>
            </div>`; // Removed trailing newline and space from template literal
      notificationList.appendChild(notificationItem);
    });
  }

  if (notificationIconContainer && notificationPanel) {
    notificationIconContainer.addEventListener("click", (event) => {
      event.stopPropagation();
      notificationPanel.classList.toggle("open");
      if (notificationPanel.classList.contains("open")) {
        renderNotifications();
      }
    });
  }

  if (closeNotificationPanelBtn && notificationPanel) {
    closeNotificationPanelBtn.addEventListener("click", () => {
      notificationPanel.classList.remove("open");
    });
  }

  document.addEventListener("click", function (event) {
    if (notificationPanel && notificationPanel.classList.contains("open")) {
      if (
        !notificationPanel.contains(event.target) &&
        !notificationIconContainer.contains(event.target)
      ) {
        notificationPanel.classList.remove("open");
      }
    }
  });
});
