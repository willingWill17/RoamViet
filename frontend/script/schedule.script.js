// Schedule Management System
const API_BASE = "http://localhost:3053/api";
let currentSchedules = [];
let editingScheduleId = null;

document.addEventListener("DOMContentLoaded", function () {
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

  initializeSchedulePage();
});

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
    closeBtn.addEventListener("click", closeModal);
  });

  // Form submission
  document
    .getElementById("scheduleForm")
    .addEventListener("submit", handleScheduleSubmit);

  // Modal clicks (close when clicking outside)
  window.addEventListener("click", function (event) {
    const scheduleModal = document.getElementById("scheduleModal");
    const detailModal = document.getElementById("detailModal");
    if (event.target === scheduleModal) {
      closeModal();
    }
    if (event.target === detailModal) {
      closeDetailModal();
    }
  });

  // Date validation
  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");

  startDateInput.addEventListener("change", function () {
    endDateInput.min = this.value;
    if (endDateInput.value && endDateInput.value < this.value) {
      endDateInput.value = this.value;
    }
  });

  endDateInput.addEventListener("change", function () {
    startDateInput.max = this.value;
  });

  // Set minimum date to today
  const today = new Date().toISOString().split("T")[0];
  startDateInput.min = today;
  endDateInput.min = today;
}

async function loadUserSchedules() {
  try {
    const response = await authenticatedFetch(`${API_BASE}/schedules`);

    if (response && response.ok) {
      const result = await response.json();

      if (result.success) {
        currentSchedules = result.data;
        displaySchedules(currentSchedules);
      } else {
        throw new Error(result.message || "Failed to load schedules");
      }
    } else {
      throw new Error("Failed to fetch schedules");
    }
  } catch (error) {
    console.error("Error loading schedules:", error);
    showError("Failed to load your schedules. Please try again.");
    showEmptyState();
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
    <div class="schedule-card" onclick="openScheduleDetail('${schedule.id}')">
      <h3>${escapeHtml(schedule.title)}</h3>
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
  document.getElementById("isPublic").checked = schedule.is_public || false;

  document.getElementById("scheduleModal").style.display = "block";
}

async function openScheduleDetail(scheduleId) {
  try {
    const response = await authenticatedFetch(
      `${API_BASE}/schedules/${scheduleId}`
    );

    if (response && response.ok) {
      const result = await response.json();

      if (result.success) {
        const schedule = result.data;
        displayScheduleDetail(schedule);

        // Setup edit and delete buttons
        document.getElementById("editScheduleBtn").onclick = () => {
          closeDetailModal();
          openEditModal(schedule);
        };

        document.getElementById("deleteScheduleBtn").onclick = () => {
          deleteSchedule(schedule.id, schedule.title);
        };

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

function displayScheduleDetail(schedule) {
  document.getElementById("detailTitle").textContent = schedule.title;

  const detailsContainer = document.getElementById("scheduleDetails");

  detailsContainer.innerHTML = `
    <div class="schedule-detail-content">
      <div class="detail-section">
        <h3>Basic Information</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <label>Title:</label>
            <span>${escapeHtml(schedule.title)}</span>
          </div>
          <div class="detail-item">
            <label>Description:</label>
            <span>${escapeHtml(schedule.description || "No description")}</span>
          </div>
          <div class="detail-item">
            <label>Start Date:</label>
            <span>${formatDate(schedule.start_date)}</span>
          </div>
          <div class="detail-item">
            <label>End Date:</label>
            <span>${formatDate(schedule.end_date)}</span>
          </div>
          <div class="detail-item">
            <label>Duration:</label>
            <span>${schedule.total_days} days</span>
          </div>
          <div class="detail-item">
            <label>Budget:</label>
            <span>${
              schedule.budget
                ? formatCurrency(schedule.budget, schedule.currency)
                : "Not set"
            }</span>
          </div>
          <div class="detail-item">
            <label>Visibility:</label>
            <span>${schedule.is_public ? "Public" : "Private"}</span>
          </div>
          <div class="detail-item">
            <label>Tags:</label>
            <span>${
              (schedule.tags || [])
                .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
                .join("") || "No tags"
            }</span>
          </div>
        </div>
      </div>
      
      <div class="detail-section">
        <h3>Travel Days</h3>
        <div class="days-container">
          ${
            schedule.days && schedule.days.length > 0
              ? schedule.days
                  .map(
                    (day, index) => `
              <div class="day-item">
                <h4>Day ${day.day_number} - ${formatDate(day.date)}</h4>
                ${
                  day.destinations && day.destinations.length > 0
                    ? `<ul class="destinations-list">
                    ${day.destinations
                      .map(
                        (dest) => `
                      <li>
                        <strong>${escapeHtml(dest.name)}</strong>
                        ${
                          dest.description
                            ? `<br><small>${escapeHtml(
                                dest.description
                              )}</small>`
                            : ""
                        }
                        ${
                          dest.estimated_duration
                            ? `<br><small>Duration: ${escapeHtml(
                                dest.estimated_duration
                              )}</small>`
                            : ""
                        }
                      </li>
                    `
                      )
                      .join("")}
                  </ul>`
                    : '<p class="no-destinations">No destinations planned for this day</p>'
                }
                ${
                  day.notes
                    ? `<p class="day-notes"><strong>Notes:</strong> ${escapeHtml(
                        day.notes
                      )}</p>`
                    : ""
                }
                ${
                  day.accommodation
                    ? `<p class="day-accommodation"><strong>Accommodation:</strong> ${escapeHtml(
                        day.accommodation
                      )}</p>`
                    : ""
                }
                ${
                  day.transportation
                    ? `<p class="day-transportation"><strong>Transportation:</strong> ${escapeHtml(
                        day.transportation
                      )}</p>`
                    : ""
                }
              </div>
            `
                  )
                  .join("")
              : '<p class="no-days">No daily plans created yet. Edit this schedule to add destinations and activities.</p>'
          }
        </div>
      </div>
    </div>
  `;
}

async function handleScheduleSubmit(event) {
  event.preventDefault();

  const formData = {
    title: document.getElementById("scheduleTitle").value.trim(),
    description: document.getElementById("scheduleDescription").value.trim(),
    start_date: document.getElementById("startDate").value,
    end_date: document.getElementById("endDate").value,
    budget: parseFloat(document.getElementById("budget").value) || null,
    currency: document.getElementById("currency").value,
    is_public: document.getElementById("isPublic").checked,
    tags: document
      .getElementById("tags")
      .value.split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag),
  };

  try {
    const url = editingScheduleId
      ? `${API_BASE}/schedules/${editingScheduleId}`
      : `${API_BASE}/schedules`;

    const method = editingScheduleId ? "PUT" : "POST";

    const response = await authenticatedFetch(url, {
      method: method,
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
        loadUserSchedules(); // Reload schedules
      } else {
        throw new Error(result.message || "Failed to save schedule");
      }
    } else {
      throw new Error("Failed to save schedule");
    }
  } catch (error) {
    console.error("Error saving schedule:", error);
    showError("Failed to save schedule. Please try again.");
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
  document.getElementById("scheduleForm").reset();
  editingScheduleId = null;
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
