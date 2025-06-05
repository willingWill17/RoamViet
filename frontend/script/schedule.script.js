// Schedule Management System
const API_BASE = "http://127.0.0.1:3053/api";
let currentSchedules = [];
let editingScheduleId = null;
let searchTimeout = null; // For debounced search
let currentSearchResults = []; // Store current search results
let dailyPlans = {}; // Store daily plans with custom time phases by date
let user_friendList = [];
let sharedEmails = [];

document.addEventListener("DOMContentLoaded", async function () {
  // Check authentication first
  if (typeof isAuthenticated !== "function") {
    console.error("Authentication functions not loaded. Redirecting to login.");
    window.location.href = "login.html";
    return;
  }

  if (!isAuthenticated()) {
    window.location.href = "login.html";
    return;
  }
  user_friendList = await get_user_friendList();
  initializeSchedulePage();
});

async function get_user_friendList() {
  const token = localStorage.getItem("idToken");
  const get_friendList_url = `${API_BASE}/get_friends`;
  const response = await fetch(get_friendList_url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return response.json();
}

let scheduleSearchDebounceTimeout;

async function searchUsersForSharingInPanel() {
  const emailInput = document.getElementById("emailInput");
  const query = emailInput.value.trim().toLowerCase();

  // The results container is userSearchResults, not shareUserSuggestionListInPanel for schedule.html
  const resultsContainer = document.getElementById("userSearchResults");
  if (!resultsContainer) {
    console.error(
      "Search results container 'userSearchResults' not found in searchUsersForSharingInPanel."
    );
    return;
  }

  clearTimeout(scheduleSearchDebounceTimeout);

  if (query.length < 1) {
    // Minimum characters to start search
    hideSearchResults(); // This function should target 'userSearchResults'
    return;
  }

  scheduleSearchDebounceTimeout = setTimeout(() => {
    // Ensure user_friendList and user_friendList.data are available
    if (
      typeof user_friendList === "undefined" ||
      typeof user_friendList.data === "undefined" ||
      !Array.isArray(user_friendList.data)
    ) {
      console.warn(
        "[Schedule Script] user_friendList.data not populated yet or not an array."
      );
      showNoResults(
        "Friend list is loading or unavailable. Try again shortly."
      );
      return;
    }

    if (user_friendList.data.length === 0) {
      console.log("[Schedule Script] user_friendList.data is empty."); // Corrected from previous user_friendList is empty
      showNoResults(
        "You currently have no friends to share with. Add friends in the messaging section."
      );
      return;
    }

    // Iterate through the user_friendList.data and find the user with the email that matches the query
    const filteredFriends = user_friendList.data.filter((friend) => {
      // Ensure friend.email exists and is a string before calling toLowerCase() and includes()
      return (
        friend.email &&
        typeof friend.email === "string" &&
        friend.email.toLowerCase().includes(query) // query is already toLowerCase()
      );
    });
    console.log(filteredFriends, filteredFriends.length); // Your existing log

    if (filteredFriends.length > 0) {
      displaySearchResults(filteredFriends);
    } else {
      showNoResults("No matching friends found for your search."); // Restored handling for no results
    }
  }, 300); // 300ms debounce time
}

function initializeSchedulePage() {
  setupEventListeners();
  loadUserSchedules();
}

function setupEventListeners() {
  // Create schedule button
  document
    .getElementById("createScheduleBtn")
    .addEventListener("click", openCreateModal);

  // Modal close buttons
  document.querySelectorAll(".close").forEach((closeBtn) => {
    closeBtn.addEventListener("click", (e) => {
      if (e.target.closest("#scheduleModal")) {
        closeModal();
      } else if (e.target.closest("#detailModal")) {
        closeDetailModal();
      } else if (e.target.closest("#dayPlanModal")) {
        closeDayPlanModal();
      }
    });
  });
  // console.log("92");
  // Form submission
  document
    .getElementById("scheduleForm")
    .addEventListener("submit", handleScheduleSubmit);

  // Modal backdrop click
  const scheduleModal = document.getElementById("scheduleModal");
  scheduleModal.addEventListener("click", (event) => {
    if (event.target === scheduleModal) {
      closeModal();
    }
  });

  const detailModal = document.getElementById("detailModal");
  detailModal.addEventListener("click", (event) => {
    if (event.target === detailModal) {
      closeDetailModal();
    }
  });

  const dayPlanModal = document.getElementById("dayPlanModal");
  dayPlanModal.addEventListener("click", (event) => {
    if (event.target === dayPlanModal) {
      closeDayPlanModal();
    }
  });

  // Visibility options event listeners
  document.querySelectorAll('input[name="visibility"]').forEach((radio) => {
    radio.addEventListener("change", handleVisibilityChange);
  });

  // Email sharing event listeners
  document.getElementById("addEmailBtn").addEventListener("click", addEmail);

  const emailInput = document.getElementById("emailInput");
  emailInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addEmail();
    }
  });

  // User search functionality
  emailInput.addEventListener("input", handleEmailSearch);
  emailInput.addEventListener("blur", function (e) {
    // Delay hiding results to allow clicking on them
    setTimeout(() => {
      hideSearchResults();
    }, 200);
  });

  // Date validation
  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");

  startDateInput.addEventListener("change", function () {
    endDateInput.min = this.value;
    if (endDateInput.value && endDateInput.value < this.value) {
      endDateInput.value = this.value;
    }
    generateDailyPlansInterface();
  });

  endDateInput.addEventListener("change", function () {
    startDateInput.max = this.value;
    generateDailyPlansInterface();
  });

  // Set minimum date to today
  const today = new Date().toISOString().split("T")[0];
  startDateInput.min = today;
  endDateInput.min = today;

  // Close search results when clicking outside
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".email-search-wrapper")) {
      hideSearchResults();
    }
  });
}

async function loadUserSchedules() {
  if (currentSchedules.length > 0) {
    displaySchedules(currentSchedules);
  } else {
    try {
      // Load both user's own schedules and shared schedules in parallel
      const ownSchedulesResponse = await authenticatedFetch(
        `${API_BASE}/get_schedules`
      );

      let allSchedules = [];

      // Process user's own schedules
      if (ownSchedulesResponse && ownSchedulesResponse.ok) {
        const ownResult = await ownSchedulesResponse.json();
        if (ownResult.success) {
          const ownSchedules = ownResult.owned_data.map((schedule) => ({
            ...schedule,
            isOwner: true,
            shareType: "owned",
          }));
          const sharedSchedules = ownResult.shared_data.map((schedule) => ({
            ...schedule,
            isOwner: false,
            shareType: "shared",
          }));
          allSchedules = [...allSchedules, ...ownSchedules, ...sharedSchedules];
          console.log(ownSchedules);
          console.log(sharedSchedules);
        }
      }

      // Sort schedules by creation date (newest first)
      allSchedules.sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
      currentSchedules = allSchedules;
      console.log(currentSchedules);
      displaySchedules(currentSchedules);
    } catch (error) {
      console.error("Error loading schedules:", error);
      showError("Failed to load your schedules. Please try again.");
      showEmptyState();
    }
  }
}

function displaySchedules(schedules) {
  const grid = document.getElementById("schedulesGrid");
  const emptyState = document.getElementById("emptyState");

  if (schedules.length === 0) {
    showEmptyState();
    return;
  }

  emptyState.style.display = "none";

  grid.innerHTML = schedules
    .map(
      (schedule) => `
    <div class="schedule-card ${
      schedule.shareType === "shared" ? "shared-schedule" : ""
    }" onclick="openScheduleDetail('${schedule.id}')">
      <div class="schedule-header">
        <h3>${escapeHtml(schedule.title)}</h3>
        ${
          schedule.shareType === "shared"
            ? '<span class="shared-badge">📤 Shared with you</span>'
            : '<span class="private-badge">🔒 Private</span>'
        }
      </div>
      <div class="description">${escapeHtml(
        schedule.description || "No description"
      )}</div>
      <div class="dates">
        <span>📅 ${formatDate(schedule.start_date)}</span>
        <span>📅 ${formatDate(schedule.end_date)}</span>
      </div>
      <div class="budget">
        ${
          schedule.budget
            ? formatCurrency(schedule.budget, schedule.currency)
            : "No budget set"
        }
      </div>
      <div class="tags">
        ${(schedule.tags || [])
          .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
          .join("")}
      </div>
    </div>
  `
    )
    .join("");
}

function showEmptyState() {
  document.getElementById("schedulesGrid").innerHTML = "";
  document.getElementById("emptyState").style.display = "block";
}

function openCreateModal() {
  editingScheduleId = null;
  document.getElementById("modalTitle").textContent = "Create New Schedule";
  document.getElementById("saveScheduleBtn").textContent = "Create Schedule";
  clearForm();
  document.getElementById("scheduleModal").style.display = "block";
}

function openEditModal(schedule) {
  console.log(
    "🔍 Opening edit modal with schedule data:",
    JSON.parse(JSON.stringify(schedule))
  );
  console.log(
    "📧 Emails in schedule object for edit modal:",
    schedule.shared_with_emails
  );

  editingScheduleId = schedule.id;
  document.getElementById("modalTitle").textContent = "Edit Schedule";
  document.getElementById("saveScheduleBtn").textContent = "Update Schedule";

  // Fill form with schedule data
  document.getElementById("scheduleTitle").value = schedule.title;
  document.getElementById("scheduleDescription").value =
    schedule.description || "";
  document.getElementById("startDate").value =
    schedule.start_date.split("T")[0];
  document.getElementById("endDate").value = schedule.end_date.split("T")[0];
  document.getElementById("budget").value = schedule.budget || "";
  document.getElementById("currency").value = schedule.currency || "VND";
  document.getElementById("tags").value = (schedule.tags || []).join(", ");

  // Set up visibility options
  sharedEmails = schedule.shared_with_emails || [];
  updateEmailList();

  if (sharedEmails.length > 0) {
    document.getElementById("visibilityShared").checked = true;
  } else {
    document.getElementById("visibilityPrivate").checked = true;
  }

  // Populate daily plans from existing schedule data
  dailyPlans = {};
  if (schedule.days && schedule.days.length > 0) {
    schedule.days.forEach((day) => {
      const dateKey = day.date.split("T")[0]; // Ensure date format
      dailyPlans[dateKey] = {
        timePhases: [],
      };

      if (day.destinations && day.destinations.length > 0) {
        // Group activities by time_phase
        const phaseGroups = {};
        day.destinations.forEach((dest) => {
          const phaseName = dest.time_phase || "Activities";
          if (!phaseGroups[phaseName]) {
            phaseGroups[phaseName] = {
              name: phaseName,
              timeRange: dest.time_range || "",
              activities: [],
            };
          }
          phaseGroups[phaseName].activities.push({
            name: dest.name || "",
            notes: dest.description || "",
          });
        });

        // Convert grouped phases to time phases array
        Object.values(phaseGroups).forEach((phase) => {
          dailyPlans[dateKey].timePhases.push(phase);
        });
      }
    });
  }

  // Trigger visibility change to show/hide email section
  handleVisibilityChange();

  document.getElementById("scheduleModal").style.display = "block";

  // Generate daily plans interface after modal is shown
  setTimeout(() => {
    generateDailyPlansInterface();
  }, 100);
}

async function openScheduleDetail(scheduleId) {
  try {
    const response = await fetch(`${API_BASE}/schedules/${scheduleId}`);

    if (response && response.ok) {
      const result = await response.json();
      // console.log("🔍 Open schedule detail result:", result);
      if (result.success) {
        const schedule = result.data;

        // Find the schedule in currentSchedules to get ownership info
        const scheduleWithMeta = currentSchedules.find(
          (s) => s.id === scheduleId
        );
        const isOwner = scheduleWithMeta ? scheduleWithMeta.isOwner : true; // Default to true for backward compatibility

        displayScheduleDetail(schedule, isOwner);

        // Setup edit and delete buttons only for owned schedules
        const editBtn = document.getElementById("editScheduleBtn");
        const deleteBtn = document.getElementById("deleteScheduleBtn");

        if (isOwner) {
          editBtn.style.display = "inline-block";
          deleteBtn.style.display = "inline-block";

          editBtn.onclick = () => {
            closeDetailModal();
            openEditModal(schedule);
          };

          deleteBtn.onclick = () => {
            deleteSchedule(schedule.id, schedule.title);
          };
        } else {
          editBtn.style.display = "none";
          deleteBtn.style.display = "none";
        }

        document.getElementById("detailModal").style.display = "block";
      } else {
        throw new Error(result.message || "Failed to load schedule details");
      }
    } else {
      throw new Error("Failed to fetch schedule details");
    }
  } catch (error) {
    console.error("Error loading schedule details:", error);
    showError("Failed to load schedule details. Please try again.");
  }
}

function displayScheduleDetail(schedule, isOwner = true) {
  document.getElementById("detailTitle").textContent = schedule.title;

  const detailsContainer = document.getElementById("scheduleDetails");

  // Calculate total_days if not present (it seems to be in the provided log for schedule.days which is good)
  let totalDaysText = "N/A";
  if (schedule.start_date && schedule.end_date) {
    const start = new Date(schedule.start_date);
    const end = new Date(schedule.end_date);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end day
    totalDaysText = `${diffDays} day${diffDays > 1 ? "s" : ""}`;
  }

  detailsContainer.innerHTML = `
    <div class="schedule-detail-content-enhanced">
      ${
        !isOwner
          ? `
        <div class="shared-schedule-notice">
          <span class="shared-icon">📤</span>
          <span>This schedule has been shared with you by ${escapeHtml(
            schedule.owner_email || "the owner"
          )}.</span>
        </div>
      `
          : ""
      }
      
      <div class="detail-header-section">
        <h2>${escapeHtml(schedule.title)}</h2>
        ${
          schedule.description
            ? `<p class="schedule-description-detail">${escapeHtml(
                schedule.description
              )}</p>`
            : ""
        }
      </div>

      <div class="detail-section detail-main-info">
        <h3>Key Information</h3>
        <div class="detail-grid-enhanced">
          <div class="detail-item-enhanced">
            <label>Start Date:</label>
            <span>${formatDate(schedule.start_date)}</span>
          </div>
          <div class="detail-item-enhanced">
            <label>End Date:</label>
            <span>${formatDate(schedule.end_date)}</span>
          </div>
          <div class="detail-item-enhanced">
            <label>Duration:</label>
            <span>${totalDaysText}</span>
          </div>
          <div class="detail-item-enhanced">
            <label>Budget:</label>
            <span>${
              schedule.budget && schedule.budget > 0
                ? formatCurrency(schedule.budget, schedule.currency)
                : "Not set"
            }</span>
          </div>
          <div class="detail-item-enhanced">
            <label>Visibility:</label>
            <span>${
              sharedEmails.length > 0
                ? '<span class="visibility-badge shared">Shared</span>'
                : '<span class="visibility-badge private">Private</span>'
            }</span>
          </div>
          ${
            schedule.shared_emails && schedule.shared_emails.length > 0
              ? `<div class="detail-item-enhanced full-width">
                  <label>Shared with:</label>
                  <span class="shared-emails-list">${schedule.shared_emails
                    .map(
                      (email) =>
                        `<span class="email-badge">${escapeHtml(email)}</span>`
                    )
                    .join(" ")}</span>
                </div>`
              : ""
          }
          ${
            schedule.tags && schedule.tags.length > 0
              ? `<div class="detail-item-enhanced full-width">
                <label>Tags:</label>
                <span class="tags-list">${(schedule.tags || [])
                  .map(
                    (tag) => `<span class="tag-badge">${escapeHtml(tag)}</span>`
                  )
                  .join(" ")}</span>
              </div>`
              : ""
          }
        </div>
      </div>
      
      <div class="detail-section detail-days-container-enhanced">
        <h3>Daily Itinerary</h3>
        ${
          schedule.days && schedule.days.length > 0
            ? schedule.days
                .sort((a, b) => a.day_number - b.day_number) // Ensure days are sorted
                .map(
                  (day, index) => `
            <div class="detail-day-card">
              <div class="day-card-header">
                <h4>Day ${day.day_number}</h4>
                <span class="day-card-date">${formatDate(day.date)}</span>
              </div>
              <div class="day-card-body">
                ${
                  day.notes
                    ? `<div class="day-card-meta notes"><label>Notes:</label> <p>${escapeHtml(
                        day.notes
                      )}</p></div>`
                    : ""
                }
                ${
                  day.accommodation
                    ? `<div class="day-card-meta accommodation"><label>Accommodation:</label> <p>${escapeHtml(
                        day.accommodation
                      )}</p></div>`
                    : ""
                }
                ${
                  day.transportation
                    ? `<div class="day-card-meta transportation"><label>Transportation:</label> <p>${escapeHtml(
                        day.transportation
                      )}</p></div>`
                    : ""
                }
                ${
                  day.destinations && day.destinations.length > 0
                    ? `<div class="day-activities-detailed">
                        ${generateDayPlanDetailedHTML(day.destinations)}
                      </div>`
                    : '<div class="day-card-meta no-activities-day"><p>No specific activities planned for this day.</p></div>'
                }
              </div>
            </div>
          `
                )
                .join("")
            : '<p class="no-days-detail">No daily plans created yet. Edit this schedule to add details.</p>'
        }
      </div>
    </div>
  `;
}

async function handleScheduleSubmit(event) {
  event.preventDefault();

  // Convert dailyPlans object to API format
  const formattedDays = [];
  const scheduleStartDateValue = document.getElementById("startDate").value;

  if (!scheduleStartDateValue) {
    showError("Start date is missing. Please select a start date.");
    console.error("Start date is missing in handleScheduleSubmit");
    return; // Prevent submission if start date is not set
  }

  // Ensure dates are sorted for correct day_number assignment
  const sortedDates = Object.keys(dailyPlans).sort(
    (a, b) => new Date(a) - new Date(b)
  );
  console.log("Processing dates for daily plans:", sortedDates);

  sortedDates.forEach((date, index) => {
    const dayPlan = dailyPlans[date];
    const activities = [];
    console.log(`Processing date: ${date}, Index: ${index}`);

    // Process all time phases and their activities
    if (dayPlan.timePhases && dayPlan.timePhases.length > 0) {
      dayPlan.timePhases.forEach((phase) => {
        if (phase.activities && phase.activities.length > 0) {
          phase.activities.forEach((activity) => {
            if (activity.name && activity.name.trim()) {
              activities.push({
                name: activity.name.trim(),
                description: activity.notes || "",
                time_phase: phase.name || "Unnamed Phase",
                time_range: phase.timeRange || "",
                estimated_duration: null, // Remains null as per original frontend logic
              });
            }
          });
        }
      });
    }

    // Include day even if no activities but phases exist, or if activities are present
    if (
      activities.length > 0 ||
      (dayPlan.timePhases && dayPlan.timePhases.length > 0)
    ) {
      const scheduleStartDate = new Date(scheduleStartDateValue);
      const currentDate = new Date(date);

      const utcScheduleStartDate = Date.UTC(
        scheduleStartDate.getFullYear(),
        scheduleStartDate.getMonth(),
        scheduleStartDate.getDate()
      );
      const utcCurrentDate = Date.UTC(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate()
      );

      const diffDays = Math.floor(
        (utcCurrentDate - utcScheduleStartDate) / (1000 * 60 * 60 * 24)
      );
      const day_number = diffDays + 1;

      console.log(
        `  For date ${date}: Calculated day_number = ${day_number} (UTC diff: ${diffDays})`
      );

      const dayObjectToPush = {
        day_number: day_number,
        date: date,
        destinations: activities,
        notes: "",
        accommodation: "",
        transportation: "",
      };

      console.log(
        "  Pushing to formattedDays:",
        JSON.parse(JSON.stringify(dayObjectToPush))
      );
      formattedDays.push(dayObjectToPush);
    } else {
      console.log(`  Skipping date ${date}: No activities and no time phases.`);
    }
  });

  const formData = {
    title: document.getElementById("scheduleTitle").value.trim(),
    description: document.getElementById("scheduleDescription").value.trim(),
    start_date: scheduleStartDateValue,
    end_date: document.getElementById("endDate").value,
    budget: parseFloat(document.getElementById("budget").value) || null,
    currency: document.getElementById("currency").value,
    old_schedule_id: editingScheduleId,
    tags: document
      .getElementById("tags")
      .value.split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag),
    shared_emails: sharedEmails,
    days: formattedDays,
  };

  console.log(formData);

  try {
    const url = `${API_BASE}/schedules`;
    const response = await authenticatedFetch(url, {
      method: "POST",
      body: JSON.stringify(formData),
    });

    if (response && response.ok) {
      const result = await response.json();
      if (result.success) {
        showSuccess(
          editingScheduleId
            ? "Schedule updated successfully!"
            : "Schedule created successfully!"
        );
        closeModal();
        loadUserSchedules();
      } else {
        console.error("API error result:", result);
        throw new Error(
          result.message || "Failed to save schedule due to API error"
        );
      }
    } else {
      const errorBody = response
        ? await response.text()
        : "Unknown error from server";
      console.error(
        "Fetch error. Status:",
        response ? response.status : "N/A",
        "Response Body:",
        errorBody
      );
      throw new Error(
        `Failed to save schedule. Server responded with ${
          response ? response.status : "N/A"
        }. Check console for details.`
      );
    }
  } catch (error) {
    console.error("Error saving schedule (catch block):", error);
    showError(`Failed to save schedule. ${error.message}`);
  }
}

async function deleteSchedule(scheduleId, title) {
  if (
    !confirm(
      `Are you sure you want to delete "${title}"? This action cannot be undone.`
    )
  ) {
    return;
  }

  try {
    const response = await authenticatedFetch(
      `${API_BASE}/schedules/${scheduleId}`,
      {
        method: "DELETE",
      }
    );

    if (response && response.ok) {
      const result = await response.json();

      if (result.success) {
        showSuccess("Schedule deleted successfully!");
        closeDetailModal();
        loadUserSchedules(); // Reload schedules
      } else {
        throw new Error(result.message || "Failed to delete schedule");
      }
    } else {
      throw new Error("Failed to delete schedule");
    }
  } catch (error) {
    console.error("Error deleting schedule:", error);
    showError("Failed to delete schedule. Please try again.");
  }
}

function closeModal() {
  document.getElementById("scheduleModal").style.display = "none";
  clearForm();
}

function closeDetailModal() {
  document.getElementById("detailModal").style.display = "none";
}

function clearForm() {
  console.log("🧹 Clearing form - sharedEmails before:", sharedEmails);
  document.getElementById("scheduleForm").reset();
  editingScheduleId = null;
  sharedEmails = [];
  dailyPlans = {}; // Clear custom time phases
  updateEmailList();

  // Reset daily plans interface
  const container = document.getElementById("dailyPlansContainer");
  container.innerHTML = `
    <div class="daily-plans-placeholder-redesigned">
      <div class="placeholder-content">
        <div class="placeholder-icon">🗓️</div>
        <h3>Ready to Plan Your Days?</h3>
        <p>Select your start and end dates above to begin creating your detailed daily itinerary with custom time phases and activities.</p>
      </div>
    </div>
  `;

  console.log("🧹 Form cleared - sharedEmails after:", sharedEmails);
}

// Utility functions
function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    return dateString;
  }
}

function formatCurrency(amount, currency) {
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    return `${amount} ${currency}`;
  }
}

function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showSuccess(message) {
  // Simple success notification
  const notification = document.createElement("div");
  notification.className = "notification success";
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function showError(message) {
  // Simple error notification
  const notification = document.createElement("div");
  notification.className = "notification error";
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #f44336;
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Add CSS animations
const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  .schedule-detail-content {
    line-height: 1.6;
  }
  
  .detail-section {
    margin-bottom: 30px;
  }
  
  .detail-section h3 {
    color: #333;
    border-bottom: 2px solid #eee;
    padding-bottom: 10px;
    margin-bottom: 20px;
  }
  
  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }
  
  .detail-item {
    display: flex;
    flex-direction: column;
  }
  
  .detail-item label {
    font-weight: 600;
    color: #555;
    margin-bottom: 5px;
  }
  
  .detail-item span {
    color: #333;
  }
  
  .days-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  
  .day-item {
    border: 1px solid #eee;
    border-radius: 8px;
    padding: 15px;
    background: #f9f9f9;
  }
  
  .day-item h4 {
    margin: 0 0 10px 0;
    color: #333;
  }
  
  .destinations-list {
    margin: 10px 0;
    padding-left: 20px;
  }
  
  .destinations-list li {
    margin-bottom: 10px;
  }
  
  .no-destinations, .no-days {
    color: #666;
    font-style: italic;
  }
  
  .day-notes, .day-accommodation, .day-transportation {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #ddd;
    font-size: 14px;
  }
  
  @media (max-width: 768px) {
    .detail-grid {
      grid-template-columns: 1fr;
    }
    
    .form-row {
      grid-template-columns: 1fr !important;
    }
  }
`;
document.head.appendChild(style);

function handleVisibilityChange() {
  const selectedVisibility = document.querySelector(
    'input[name="visibility"]:checked'
  ).value;
  const emailSharingSection = document.getElementById("emailSharingSection");

  if (selectedVisibility === "shared") {
    emailSharingSection.style.display = "block";
  } else {
    emailSharingSection.style.display = "none";
  }
}

function addEmail() {
  const emailInput = document.getElementById("emailInput");
  const email = emailInput.value.trim();

  if (!email) return;

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showError("Please enter a valid email address");
    return;
  }

  // Check if email already exists
  if (sharedEmails.includes(email)) {
    showError("This email is already added");
    return;
  }

  // Add email to list
  sharedEmails.push(email);
  emailInput.value = "";
  console.log("✅ Email added! Current sharedEmails:", sharedEmails);
  updateEmailList();
}

function removeEmail(email) {
  sharedEmails = sharedEmails.filter((e) => e !== email);
  updateEmailList();
}

function updateEmailList() {
  const emailList = document.getElementById("emailList");
  emailList.innerHTML = "";

  sharedEmails.forEach((email) => {
    const emailTag = document.createElement("div");
    emailTag.className = "email-tag";
    emailTag.innerHTML = `
      ${escapeHtml(email)}
      <button type="button" class="remove-email" onclick="removeEmail(\'${escapeHtml(
        email
      )}\')" title="Remove email">
        ×
      </button>
    `;
    emailList.appendChild(emailTag);
  });
}

function handleEmailSearch() {
  const emailInput = document.getElementById("emailInput");
  const query = emailInput.value.trim().toLowerCase();

  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  if (query.length < 1) {
    hideSearchResults();
    return;
  }

  searchTimeout = setTimeout(() => {
    if (
      typeof user_friendList === "undefined" ||
      typeof user_friendList.data === "undefined" ||
      !Array.isArray(user_friendList.data)
    ) {
      console.warn(
        "[Schedule Script] user_friendList.data not populated yet or not an array."
      );
      showNoResults(
        "Friend list is loading or unavailable. Try again shortly."
      );
      return;
    }

    if (user_friendList.data.length === 0) {
      console.log("[Schedule Script] user_friendList.data is empty.");
      showNoResults("You currently have no friends to share with.");
      return;
    }

    // Iterate through user_friendList.data to get friends' emails/usernames!
    const filteredFriends = user_friendList.data.filter((friend) => {
      const nameMatch =
        friend.username && friend.username.toLowerCase().includes(query);
      const emailMatch =
        friend.email && friend.email.toLowerCase().includes(query);
      return nameMatch || emailMatch;
    });

    if (filteredFriends.length > 0) {
      displaySearchResults(filteredFriends);
    } else {
      showNoResults("No matching friends found for your search.");
    }
  }, 300); // 300ms debounce time
}

function displaySearchResults(users) {
  const searchResultsContainer = document.getElementById("userSearchResults");
  searchResultsContainer.innerHTML = "";

  if (!users || users.length === 0) {
    showNoResults("No matching friends found.");
    return;
  }

  users.forEach((user) => {
    const userItem = document.createElement("div");
    userItem.className = "user-search-item";

    const avatar = document.createElement("div");
    avatar.className = "user-avatar";

    if (user.profilePic) {
      const img = document.createElement("img");
      let picUrl = user.profilePic;

      if (!picUrl.startsWith("http") && typeof API_BASE !== "undefined") {
        const base = API_BASE.endsWith("/api")
          ? API_BASE.substring(0, API_BASE.length - 4)
          : API_BASE;
        picUrl = base + (picUrl.startsWith("/") ? picUrl : "/" + picUrl);
      } else if (!picUrl.startsWith("http")) {
        picUrl = "logo/logo-black.png";
      }

      img.src = picUrl;
      img.alt = user.username ? user.username.charAt(0).toUpperCase() : "U";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.onerror = () => {
        avatar.textContent = user.username
          ? user.username.charAt(0).toUpperCase()
          : user.email
          ? user.email.charAt(0).toUpperCase()
          : "U";
        img.remove();
      };
      avatar.innerHTML = "";
      avatar.appendChild(img);
    } else {
      avatar.textContent = user.username
        ? user.username.charAt(0).toUpperCase()
        : user.email
        ? user.email.charAt(0).toUpperCase()
        : "U";
    }

    const userInfo = document.createElement("div");
    userInfo.className = "user-info";

    const userNameDisplay = document.createElement("div");
    userNameDisplay.className = "user-name";
    userNameDisplay.textContent = user.username || "Unknown User";

    const userEmailDisplay = document.createElement("div");
    userEmailDisplay.className = "user-email";
    userEmailDisplay.textContent = user.email;

    userInfo.appendChild(userNameDisplay);
    userInfo.appendChild(userEmailDisplay);

    userItem.appendChild(avatar);
    userItem.appendChild(userInfo);

    userItem.addEventListener("click", () => {
      selectUser(user);
    });

    searchResultsContainer.appendChild(userItem);
  });

  // Explicitly set display to block to ensure visibility
  searchResultsContainer.style.display = "block";
  searchResultsContainer.classList.add("show"); // Keep class for other potential styling
}

function showNoResults(message) {
  const searchResultsContainer = document.getElementById("userSearchResults");
  searchResultsContainer.innerHTML = `<div class="no-users-found">${message}</div>`;
  searchResultsContainer.classList.add("show");
}

function selectUser(user) {
  console.log("[Schedule Script] selectUser called with:", user); // Log when selectUser is called
  const emailInput = document.getElementById("emailInput");
  emailInput.value = user.email;
  hideSearchResults();

  // Optionally auto-add the selected user
  addEmail();
}

function hideSearchResults() {
  const resultsContainer = document.getElementById("userSearchResults");
  if (resultsContainer) {
    resultsContainer.style.display = "none";
  }
}

// Daily Planning Functions
function generateDailyPlansInterface() {
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const container = document.getElementById("dailyPlansContainer");

  if (!startDate || !endDate) {
    container.innerHTML = `
      <div class="daily-plans-placeholder-redesigned">
        <div class="placeholder-content">
          <div class="placeholder-icon">🗓️</div>
          <h3>Ready to Plan Your Days?</h3>
          <p>Select your start and end dates above to begin creating your detailed daily itinerary with custom time phases and activities.</p>
        </div>
      </div>
    `;
    return;
  }

  const days = getDaysBetweenDates(startDate, endDate);

  if (days.length > 30) {
    container.innerHTML = `
      <div class="daily-plans-placeholder-redesigned">
        <div class="placeholder-content">
          <div class="placeholder-icon">⚠️</div>
          <h3>Schedule Too Long</h3>
          <p>Your schedule is ${days.length} days long. Please select a shorter duration (max 30 days) for detailed daily planning to maintain optimal performance.</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = days
    .map((date, index) => createDayPlanCardRedesigned(date, index + 1))
    .join("");

  // Add event listeners for day toggles and activity buttons
  // addDailyPlanEventListeners();
}

function getDaysBetweenDates(startDate, endDate) {
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (
    let date = new Date(start);
    date <= end;
    date.setDate(date.getDate() + 1)
  ) {
    dates.push(new Date(date).toISOString().split("T")[0]);
  }

  return dates;
}

function createDayPlanCardRedesigned(date, dayNumber) {
  const dateObj = new Date(date);
  const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const dayPlan = dailyPlans[date] || {
    timePhases: [],
  };

  // Calculate statistics
  const totalPhases = dayPlan.timePhases.length;
  const totalActivities = dayPlan.timePhases.reduce(
    (sum, phase) => sum + phase.activities.length,
    0
  );

  return `
    <div class="day-plan-card-redesigned" data-date="${date}">
      <div class="day-plan-header-redesigned">
        <div class="day-info">
          <span class="day-number-badge">Day ${dayNumber}</span>
          <span>${dayName}, ${formattedDate}</span>
        </div>
        <div class="day-plan-header-actions">
          ${
            totalPhases > 0
              ? `<button type="button" class="btn-view-day-plan" onclick="openDayPlanModal(\'${date}\', ${dayNumber}, \'${dayName}, ${formattedDate}\')">📋 View Plan</button>`
              : ""
          }
          <button type="button" class="day-plan-toggle" onclick="toggleDayPlanRedesigned(\'${date}\')">▼</button>
        </div>
      </div>
      <div class="day-plan-content-redesigned" id="day-content-${date}">
        <div class="day-controls-redesigned">
          <button type="button" class="btn-add-time-phase-redesigned" onclick="addTimePhaseRedesigned(\'${date}\')">
            <span>+</span> Add Time Phase
          </button>
          ${
            totalPhases > 0
              ? `
            <div style="margin-top: 12px; text-align: center; color: #6c757d; font-size: 14px;">
              ${totalPhases} phase${
                  totalPhases !== 1 ? "s" : ""
                } • ${totalActivities} activit${
                  totalActivities !== 1 ? "ies" : "y"
                }
            </div>
          `
              : ""
          }
        </div>
        <div class="time-phases-redesigned" id="time-phases-${date}">
          ${dayPlan.timePhases
            .map((phase, index) =>
              createCustomTimePhaseRedesigned(date, phase, index)
            )
            .join("")}
          ${
            dayPlan.timePhases.length === 0
              ? '<p class="no-phases-redesigned">No time phases created yet. Click "Add Time Phase" to start planning your day!</p>'
              : ""
          }
        </div>
      </div>
    </div>
  `;
}

function createCustomTimePhaseRedesigned(date, phase, index) {
  return `
    <div class="time-phase-redesigned" data-date="${date}" data-phase-index="${index}">
      <div class="time-phase-header-redesigned">
        <div class="phase-inputs-row">
          <input type="text" class="phase-name-input-redesigned" value="${escapeHtml(
            phase.name || ""
          )}" 
                 placeholder="e.g., Morning Exploration, Lunch Break, Evening Tour" 
                 onchange="updatePhaseNameRedesigned(\'${date}\', ${index}, this.value)">
          <input type="text" class="phase-time-input-redesigned" value="${escapeHtml(
            phase.timeRange || ""
          )}" 
                 placeholder="e.g., 9:00-12:00" 
                 onchange="updatePhaseTimeRedesigned(\'${date}\', ${index}, this.value)">
        </div>
        <div class="phase-actions-redesigned">
          <button type="button" class="btn-add-activity-redesigned" onclick="addActivityRedesigned(\'${date}\', ${index})">+ Add Activity</button>
          <button type="button" class="btn-remove-phase-redesigned" onclick="removeTimePhaseRedesigned(\'${date}\', ${index})">Remove Phase</button>
        </div>
      </div>
      <div class="time-phase-content-redesigned" id="phase-${date}-${index}">
        ${phase.activities
          .map((activity, actIndex) =>
            createActivityItemRedesigned(date, index, activity, actIndex)
          )
          .join("")}
        ${
          phase.activities.length === 0
            ? '<p class="no-activities-redesigned">No activities planned for this time phase yet. Click "Add Activity" to start!</p>'
            : ""
        }
      </div>
    </div>
  `;
}

function createActivityItemRedesigned(
  date,
  phaseIndex,
  activity,
  activityIndex
) {
  return `
    <div class="activity-item-redesigned" data-date="${date}" data-phase-index="${phaseIndex}" data-activity-index="${activityIndex}">
      <button type="button" class="remove-activity-btn-redesigned" onclick="removeActivityRedesigned(\'${date}\', ${phaseIndex}, ${activityIndex})">×</button>
      <input type="text" class="activity-input-redesigned" placeholder="Activity name" 
             value="${escapeHtml(activity.name || "")}" 
             onchange="updateActivityRedesigned(\'${date}\', ${phaseIndex}, ${activityIndex}, \'name\', this.value)">
      <textarea class="activity-notes-redesigned" placeholder="Notes, location, costs, etc..." 
                onchange="updateActivityRedesigned(\'${date}\', ${phaseIndex}, ${activityIndex}, \'notes\', this.value)">${escapeHtml(
    activity.notes || ""
  )}</textarea>
    </div>
  `;
}

function addTimePhaseRedesigned(date) {
  if (!dailyPlans[date]) {
    dailyPlans[date] = { timePhases: [] };
  }

  dailyPlans[date].timePhases.push({
    name: "",
    timeRange: "",
    activities: [],
  });

  refreshDayPlanRedesigned(date);
}

function removeTimePhaseRedesigned(date, phaseIndex) {
  if (dailyPlans[date] && dailyPlans[date].timePhases) {
    dailyPlans[date].timePhases.splice(phaseIndex, 1);
    refreshDayPlanRedesigned(date);
  }
}

function updatePhaseTimeRedesigned(date, phaseIndex, value) {
  if (!dailyPlans[date]) {
    dailyPlans[date] = { timePhases: [] };
  }

  if (!dailyPlans[date].timePhases[phaseIndex]) {
    dailyPlans[date].timePhases[phaseIndex] = {
      name: "",
      timeRange: "",
      activities: [],
    };
  }

  dailyPlans[date].timePhases[phaseIndex].timeRange = value;
}

function addActivityRedesigned(date, phaseIndex) {
  if (!dailyPlans[date]) {
    dailyPlans[date] = { timePhases: [] };
  }

  if (!dailyPlans[date].timePhases[phaseIndex]) {
    dailyPlans[date].timePhases[phaseIndex] = {
      name: "",
      timeRange: "",
      activities: [],
    };
  }

  dailyPlans[date].timePhases[phaseIndex].activities.push({
    name: "",
    notes: "",
  });

  refreshTimePhaseRedesigned(date, phaseIndex);
}

function removeActivityRedesigned(date, phaseIndex, activityIndex) {
  if (
    dailyPlans[date] &&
    dailyPlans[date].timePhases[phaseIndex] &&
    dailyPlans[date].timePhases[phaseIndex].activities
  ) {
    dailyPlans[date].timePhases[phaseIndex].activities.splice(activityIndex, 1);
    refreshTimePhaseRedesigned(date, phaseIndex);
  }
}

function updateActivityRedesigned(
  date,
  phaseIndex,
  activityIndex,
  field,
  value
) {
  if (!dailyPlans[date]) {
    dailyPlans[date] = { timePhases: [] };
  }

  if (!dailyPlans[date].timePhases[phaseIndex]) {
    dailyPlans[date].timePhases[phaseIndex] = {
      name: "",
      timeRange: "",
      activities: [],
    };
  }

  if (!dailyPlans[date].timePhases[phaseIndex].activities[activityIndex]) {
    dailyPlans[date].timePhases[phaseIndex].activities[activityIndex] = {
      name: "",
      notes: "",
    };
  }

  dailyPlans[date].timePhases[phaseIndex].activities[activityIndex][field] =
    value;
}

function refreshDayPlanRedesigned(date) {
  // Calculate the day number for this date
  const startDate = document.getElementById("startDate").value;

  if (!startDate) {
    console.warn("Start date not found, cannot refresh day plan");
    return;
  }

  // Calculate day number by finding the difference in days
  const startDateObj = new Date(startDate);
  const currentDateObj = new Date(date);
  const dayNumber =
    Math.floor((currentDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;

  // Find the day card and replace it entirely
  const dayCard = document.querySelector(`[data-date="${date}"]`);
  if (dayCard) {
    // Store the current expanded state
    const content = dayCard.querySelector(".day-plan-content-redesigned");
    const wasExpanded = content && content.classList.contains("expanded");

    // Replace the card
    dayCard.outerHTML = createDayPlanCardRedesigned(date, dayNumber);

    // Restore expanded state if it was expanded
    if (wasExpanded) {
      const newContent = document.getElementById(`day-content-${date}`);
      const newButton =
        newContent.previousElementSibling.querySelector(".day-plan-toggle");
      if (newContent && newButton) {
        newContent.classList.add("expanded");
        newButton.textContent = "▲";
      }
    }
  }
}

function refreshTimePhaseRedesigned(date, phaseIndex) {
  const container = document.getElementById(`phase-${date}-${phaseIndex}`);
  const activities = dailyPlans[date]
    ? dailyPlans[date].timePhases[phaseIndex]?.activities || []
    : [];

  container.innerHTML = activities
    .map((activity, actIndex) =>
      createActivityItemRedesigned(date, phaseIndex, activity, actIndex)
    )
    .join("");

  if (activities.length === 0) {
    container.innerHTML =
      '<p class="no-activities-redesigned">No activities planned for this time phase</p>';
  }
}

function generateDayPlanDetailedHTML(activities) {
  // Group activities by time phase from the 'activities' (formerly destinations) array
  const phaseGroups = {};
  if (!activities || activities.length === 0) {
    return '<p class="no-activities-for-day">No activities listed for this day.</p>';
  }

  activities.forEach((activity) => {
    // Use a combined key of phase name and time range to group accurately
    const phaseKey = `${activity.time_phase || "General Activities"}_${
      activity.time_range || "N/A"
    }`;
    if (!phaseGroups[phaseKey]) {
      phaseGroups[phaseKey] = {
        name: activity.time_phase || "General Activities", // Fallback phase name
        timeRange: activity.time_range || "", // Keep time_range separate for display
        activities: [],
      };
    }
    phaseGroups[phaseKey].activities.push(activity);
  });

  let html = "";

  if (Object.keys(phaseGroups).length === 0) {
    return '<p class="no-phases-for-day">No time phases with activities found for this day.</p>';
  }

  // Display each custom time phase
  Object.values(phaseGroups).forEach((phase) => {
    html += `
      <div class="time-phase-block">
        <div class="phase-block-header">
          <h5>${escapeHtml(phase.name)}</h5>
          ${
            phase.timeRange
              ? `<span class="phase-block-time">${escapeHtml(
                  phase.timeRange
                )}</span>`
              : ""
          }
        </div>
        <ul class="activity-list-detailed">
          ${phase.activities
            .map(
              (activity) => `
            <li class="activity-item-detailed">
              <div class="activity-name-detailed">${escapeHtml(
                activity.name
              )}</div>
              ${
                activity.description
                  ? `<div class="activity-notes-detailed"><small>${escapeHtml(
                      activity.description
                    )}</small></div>`
                  : ""
              }
              ${
                activity.estimated_duration
                  ? `<div class="activity-duration-detailed"><small>Duration: ${escapeHtml(
                      activity.estimated_duration
                    )}</small></div>`
                  : ""
              }
            </li>
          `
            )
            .join("")}
        </ul>
      </div>
    `;
  });
  return (
    html ||
    '<p class="no-activities-in-phases">No activities found in any time phases for this day.</p>'
  );
}

function toggleDayPlanRedesigned(date) {
  const content = document.getElementById(`day-content-${date}`);
  const button =
    content.previousElementSibling.querySelector(".day-plan-toggle");

  if (content.classList.contains("expanded")) {
    content.classList.remove("expanded");
    button.textContent = "▼";
  } else {
    content.classList.add("expanded");
    button.textContent = "▲";
  }
}

// Day Plan Modal Functions
function openDayPlanModal(date, dayNumber, formattedDate) {
  const dayPlan = dailyPlans[date] || { timePhases: [] };

  // Update modal title
  document.getElementById(
    "dayPlanTitle"
  ).textContent = `Day ${dayNumber} - ${formattedDate}`;

  // Populate modal content
  const modalContent = document.getElementById("dayPlanDetails");
  modalContent.innerHTML = generateDayPlanPreview(
    date,
    dayNumber,
    formattedDate,
    dayPlan
  );

  // Setup edit button
  const editBtn = document.getElementById("editDayPlanBtn");
  editBtn.onclick = () => {
    closeDayPlanModal();
    // Expand the day in the main form
    const content = document.getElementById(`day-content-${date}`);
    const button =
      content.previousElementSibling.querySelector(".day-plan-toggle");
    if (!content.classList.contains("expanded")) {
      content.classList.add("expanded");
      button.textContent = "▲";
    }
    // Scroll to the day
    document
      .querySelector(`[data-date="${date}"]`)
      .scrollIntoView({ behavior: "smooth" });
  };

  // Show modal
  document.getElementById("dayPlanModal").style.display = "block";
}

function closeDayPlanModal() {
  document.getElementById("dayPlanModal").style.display = "none";
}

function generateDayPlanPreview(date, dayNumber, formattedDate, dayPlan) {
  const totalPhases = dayPlan.timePhases.length;
  const totalActivities = dayPlan.timePhases.reduce(
    (sum, phase) => sum + phase.activities.length,
    0
  );
  const phasesWithActivities = dayPlan.timePhases.filter(
    (phase) => phase.activities.length > 0
  ).length;

  if (totalPhases === 0) {
    return `
      <div class="preview-empty-day">
        <h4>No Plans Yet</h4>
        <p>This day doesn't have any time phases or activities planned yet.</p>
        <p>Click "Edit Day" to start planning!</p>
      </div>
    `;
  }

  let html = `
    <div class="day-plan-summary">
      <h3>Day ${dayNumber} Overview</h3>
      <p>${formattedDate}</p>
    </div>

    <div class="day-plan-stats">
      <div class="stat-item">
        <div class="stat-number">${totalPhases}</div>
        <div class="stat-label">Time Phases</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">${totalActivities}</div>
        <div class="stat-label">Activities</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">${phasesWithActivities}</div>
        <div class="stat-label">Active Phases</div>
      </div>
    </div>

    <div class="preview-time-phases">
  `;

  dayPlan.timePhases.forEach((phase, index) => {
    html += `
      <div class="preview-time-phase">
        <div class="preview-phase-header">
          <div class="preview-phase-title">
            <span class="preview-phase-name">${escapeHtml(
              phase.name || `Phase ${index + 1}`
            )}</span>
            ${
              phase.timeRange
                ? `<span class="preview-phase-time">${escapeHtml(
                    phase.timeRange
                  )}</span>`
                : ""
            }
          </div>
        </div>
        <div class="preview-phase-activities">
    `;

    if (phase.activities.length === 0) {
      html += `<div class="preview-no-activities">No activities planned for this phase</div>`;
    } else {
      phase.activities.forEach((activity) => {
        html += `
          <div class="preview-activity">
            <div class="preview-activity-name">${escapeHtml(
              activity.name || "Unnamed Activity"
            )}</div>
            ${
              activity.notes
                ? `<div class="preview-activity-notes">${escapeHtml(
                    activity.notes
                  )}</div>`
                : ""
            }
          </div>
        `;
      });
    }

    html += `
        </div>
      </div>
    `;
  });

  html += `</div>`;
  return html;
}
