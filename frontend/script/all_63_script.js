let global_memories;
const API_BASE_URL = "http://localhost:3053/api";
let currentUserSelectionFromSuggestion = null; // Holds the user object if selected from suggestions
let emailsToShareList = []; // Holds the list of user objects or email strings to be shared
let shareSearchTimeoutInPanel;
let user_friendList = [];

function escapeHtml(text) {
  if (text === null || typeof text === "undefined") return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

const provinceColors = {
  "An Giang": "#FF6666",
  "Bà Rịa–Vũng Tàu": "#66CC66",
  "Bắc Giang": "#6699FF",
  "Bắc Kạn": "#FFCC66",
  "Bạc Liêu": "#FF6666",
  "Bắc Ninh": "#66CC66",
  "Bến Tre": "#6699FF",
  "Bình Định": "#FFCC66",
  "Bình Dương": "#FF6666",
  "Bình Phước": "#66CC66",
  "Bình Thuận": "#6699FF",
  "Cà Mau": "#FFCC66",
  "Cần Thơ": "#FF6666",
  "Cao Bằng": "#66CC66",
  "Đà Nẵng": "#6699FF",
  "Đắk Lắk": "#FFCC66",
  "Đắk Nông": "#FF6666",
  "Điện Biên": "#66CC66",
  "Đồng Nai": "#6699FF",
  "Đồng Tháp": "#FFCC66",
  "Gia Lai": "#FF6666",
  "Hà Giang": "#66CC66",
  "Hà Nam": "#6699FF",
  "Hà Tĩnh": "#FFCC66",
  "Hải Dương": "#FF6666",
  "Hải Phòng": "#66CC66",
  "Hậu Giang": "#6699FF",
  "Hòa Bình": "#FFCC66",
  "Hưng Yên": "#FF6666",
  "Khánh Hòa": "#66CC66",
  "Kiên Giang": "#6699FF",
  "Kon Tum": "#FFCC66",
  "Lai Châu": "#FF6666",
  "Lâm Đồng": "#66CC66",
  "Lạng Sơn": "#6699FF",
  "Lào Cai": "#FFCC66",
  "Long An": "#FF6666",
  "Nam Định": "#66CC66",
  "Nghệ An": "#6699FF",
  "Ninh Bình": "#FFCC66",
  "Ninh Thuận": "#FF6666",
  "Phú Thọ": "#66CC66",
  "Phú Yên": "#6699FF",
  "Quảng Bình": "#FFCC66",
  "Quảng Nam": "#FF6666",
  "Quảng Ngãi": "#66CC66",
  "Quảng Ninh": "#6699FF",
  "Quảng Trị": "#FFCC66",
  "Sóc Trăng": "#FF6666",
  "Sơn La": "#66CC66",
  "Tây Ninh": "#6699FF",
  "Thái Bình": "#FFCC66",
  "Thái Nguyên": "#FF6666",
  "Thanh Hóa": "#66CC66",
  "Thừa Thiên–Huế": "#6699FF",
  "Tiền Giang": "#FFCC66",
  "Trà Vinh": "#FF6666",
  "Tuyên Quang": "#66CC66",
  "Vĩnh Long": "#6699FF",
  "Vĩnh Phúc": "#FFCC66",
  "Yên Bái": "#FF6666",
  "Hà Nội": "#66CC66",
  "Hồ Chí Minh": "#6699FF",
};

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

  const profileIcon = document.getElementById("profileIcon");
  const scheduleIcon = document.getElementById("scheduleIcon");

  if (profileIcon) {
    profileIcon.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("Navigating to profile.html");
      window.location.href = "profile.html";
    });
  }

  if (scheduleIcon) {
    scheduleIcon.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("Navigating to profile.html");
      window.location.href = "schedule.html";
    });
  }
});

document.addEventListener("DOMContentLoaded", async function () {
  try {
    const response = await fetch("vietnam.svg");
    const svgContent = await response.text();

    const mapContainer = document.querySelector(".map-container");
    mapContainer.innerHTML = svgContent;

    const svgElement = mapContainer.querySelector("svg");
    if (svgElement) {
      svgElement.removeAttribute("width");
      svgElement.removeAttribute("height");
      svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");

      if (!svgElement.getAttribute("viewBox")) {
        const originalWidth = svgElement.width
          ? svgElement.width.baseVal.value
          : 800;
        const originalHeight = svgElement.height
          ? svgElement.height.baseVal.value
          : 600;
        svgElement.setAttribute(
          "viewBox",
          `0 0 ${originalWidth} ${originalHeight}`
        );
      }

      svgElement.style.width = "100%";
      svgElement.style.height = "100%";
      svgElement.style.maxWidth = "90%";
      svgElement.style.maxHeight = "90%";
      svgElement.style.display = "block";
      svgElement.style.margin = "auto";

      global_memories = await get_user_memories();
      user_friendList = await get_user_friendList();
      initializeMap();
    }
  } catch (error) {
    console.error("Error loading SVG map:", error);
  }
});

async function get_user_memories() {
  const token = localStorage.getItem("idToken");
  const get_memories_url = `${API_BASE_URL}/memories`;
  const response = await fetch(get_memories_url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
  console.log(data);
  return data;
}

async function get_user_friendList() {
  const token = localStorage.getItem("idToken");
  const get_friendList_url = `${API_BASE_URL}/get_friends`;
  const response = await fetch(get_friendList_url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
  console.log(data);
  return data;
}

// In the initializeMap function, modify to properly handle group elements:
function initializeMap() {
  const svgElement = document.querySelector(".map-container svg");
  if (!svgElement) return;

  const provinces = svgElement.querySelectorAll(".province");
  if (provinces.length === 0) {
    console.error('No province elements found with class "province"');
    return;
  }

  adjustMapViewport();
  const fullMapViewBox = svgElement.getAttribute("viewBox");
  let selectedProvince = null;

  const resetButton = createResetButton(fullMapViewBox);
  document.querySelector(".map-container").appendChild(resetButton);

  provinces.forEach((province) => {
    const provinceName = province.getAttribute("title");
    const isInMemories = global_memories.data.some(
      (item) => item.province === provinceName
    );

    if (isInMemories) {
      province.style.fill = provinceColors[provinceName];
    }
    province.addEventListener("click", function () {
      if (selectedProvince) {
        const provinceTitle = selectedProvince.getAttribute("title");

        const isInMemories = global_memories.data.some(
          (item) => item.province === provinceTitle
        );

        if (isInMemories) {
          selectedProvince.style.fill = provinceColors[provinceTitle];
        } else {
          selectedProvince.style.fill = "#FFFFFF";
        }

        selectedProvince.classList.remove("selected");
      }
      selectedProvince = this;
      let provinceName = this.getAttribute("title") || "Unknown Province";
      this.style.fill = provinceColors[provinceName];
      this.classList.add("selected");
      // Fetch province data from database
      getProvinceInfo(provinceName)
        .then((provinceInfo) => {
          // Zoom to province
          zoomToProvince(this);

          // Show info panel
          showInfoPanel(provinceInfo);

          // Show reset button
          resetButton.style.display = "block";
        })
        .catch((error) => {
          console.error("Error fetching province info:", error);
        });
    });
  });

  // Set up search functionality
  setupSearch(provinces, (province) => {
    province.dispatchEvent(new Event("click"));
  });
}

// Update the setupSearch function to handle groups correctly:
function setupSearch(provinces, onProvinceFound) {
  console.log(provinces);
  const searchBar = document.querySelector(".search-bar");
  if (!searchBar) return;

  searchBar.addEventListener("input", function () {
    const searchTerm = this.value.toLowerCase().trim();

    // Reset highlighting if search is empty
    if (!searchTerm) {
      provinces.forEach((province) => {
        if (!province.classList.contains("selected")) {
          if (province.tagName === "path") {
            province.style.fill = "#FFFFFF";
          } else if (province.tagName === "g") {
            const childPaths = province.querySelectorAll("path");
            childPaths.forEach((path) => {
              path.style.fill = "#FFFFFF";
            });
          }
        }
      });
      return;
    }

    // Highlight matching provinces
    provinces.forEach((province) => {
      const provinceName = province.getAttribute("title") || "";

      if (provinceName.toLowerCase().includes(searchTerm)) {
        // Don't change selected province color
        if (!province.classList.contains("selected")) {
          if (province.tagName === "path") {
            province.style.fill = "#e0e0e0";
          } else if (province.tagName === "g") {
            const childPaths = province.querySelectorAll("path");
            childPaths.forEach((path) => {
              path.style.fill = "#e0e0e0";
            });
          }
        }
      } else {
        // Reset non-matching provinces unless selected
        if (!province.classList.contains("selected")) {
          if (province.tagName === "path") {
            province.style.fill = "#FFFFFF";
          } else if (province.tagName === "g") {
            const childPaths = province.querySelectorAll("path");
            childPaths.forEach((path) => {
              path.style.fill = "#FFFFFF";
            });
          }
        }
      }
    });
  });

  // Add search on Enter key - same functionality as before
  searchBar.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      const searchTerm = this.value.toLowerCase().trim();
      if (!searchTerm) return;

      // Find first matching province
      for (const province of provinces) {
        const provinceName = province.getAttribute("title") || "";
        if (provinceName.toLowerCase().includes(searchTerm)) {
          // Call the callback function with found province
          onProvinceFound(province);
          break;
        }
      }
    }
  });
}

// Function to adjust the map viewport to ensure all provinces are visible
function adjustMapViewport() {
  const svgElement = document.querySelector(".map-container svg");
  if (!svgElement) return;

  // Get all provinces
  const provinces = svgElement.querySelectorAll(".province");
  if (provinces.length === 0) return;

  // Calculate the bounding box of all provinces
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  provinces.forEach((province) => {
    const bbox = province.getBBox();
    minX = Math.min(minX, bbox.x);
    minY = Math.min(minY, bbox.y);
    maxX = Math.max(maxX, bbox.x + bbox.width);
    maxY = Math.max(maxY, bbox.y + bbox.height);
  });

  // Add padding around the bounding box (5% of dimensions)
  const padding = Math.max((maxX - minX) * 0.05, (maxY - minY) * 0.05);

  // Set the viewBox to encompass all provinces with padding
  const viewBox = `${minX - padding} ${minY - padding} ${
    maxX - minX + padding * 2
  } ${maxY - minY + padding * 2}`;
  svgElement.setAttribute("viewBox", viewBox);

  // Store this as the default viewBox for resetting
  svgElement.dataset.defaultViewBox = viewBox;
}

// Function to create reset button
function createResetButton(defaultViewBox) {
  const resetButton = document.createElement("button");
  resetButton.textContent = "View All Provinces";
  resetButton.className = "reset-map-button";

  // Add click event to reset the map
  resetButton.addEventListener("click", function () {
    const svgElement = document.querySelector(".map-container svg");
    if (!svgElement) return;

    // Reset the viewBox to show full map
    svgElement.setAttribute("viewBox", defaultViewBox);

    // Reset selected province if exists
    const selectedProvince = document.querySelector(".province.selected");
    // console.log(selectedProvince);
    if (selectedProvince) {
      selectedProvince.style.fill = "#FFFFFF";
      selectedProvince.classList.remove("selected");
    }

    // Remove info panel
    const infoPanel = document.querySelector(".province-info-panel");
    if (infoPanel) {
      infoPanel.remove();
    }

    // Hide the reset button
    this.style.display = "none";
  });

  return resetButton;
}

// Function to zoom to a specific province
function zoomToProvince(province) {
  const svgElement = document.querySelector(".map-container svg");
  if (!svgElement) return;

  // Get the bounding box of the province
  const bbox = province.getBBox();

  // Add padding around the province (10% of dimensions)
  const padding = Math.max(bbox.width * 0.1, bbox.height * 0.1);

  // Add extra padding on the right side to shift the province to the left
  const rightPadding = padding * 3; // Increased padding on the right

  // Calculate new viewBox with asymmetric padding (more on the right)
  const viewBox = `${bbox.x - padding} ${bbox.y - padding} ${
    bbox.width + padding + rightPadding
  } ${bbox.height + padding * 2}`;

  // Set the new viewBox with a smooth transition
  svgElement.style.transition = "all 0.5s ease-in-out";
  svgElement.setAttribute("viewBox", viewBox);

  // Remove transition after animation completes
  setTimeout(() => {
    svgElement.style.transition = "";
  }, 500);
}

// Function to show info panel for a province
function showInfoPanel(provinceInfo) {
  // Remove existing info panel if any
  const existingPanel = document.querySelector(".province-info-panel");
  if (existingPanel) {
    existingPanel.remove();
  }

  // Create a new info panel
  const infoPanel = document.createElement("div");
  infoPanel.className = "province-info-panel";

  // Add content to the info panel (without attractions section)
  infoPanel.innerHTML = `
        <h2>${provinceInfo.province_name}</h2>
        <p>${provinceInfo.description}</p>
        <p>${provinceInfo.famous_for}</p>
        <button class="read-more-btn">Read more</button>
        <button class="add-memory-btn">Add memory</button>
    `;

  // Add click event for read more button
  const readMoreBtn = infoPanel.querySelector(".read-more-btn");
  readMoreBtn.addEventListener("click", function () {
    // Navigate to detailed page about the province
    create_province_detail_Panel(provinceInfo);
  });

  const addMemoryBtn = infoPanel.querySelector(".add-memory-btn");
  addMemoryBtn.addEventListener("click", function () {
    // Show memory registration panel instead of navigating
    showMemoryPanel(provinceInfo);
  });

  // Add the info panel to the map container
  document.querySelector(".map-info-container").appendChild(infoPanel);

  // Use global_memories to display memories for this province
  if (
    global_memories &&
    global_memories.data &&
    Array.isArray(global_memories.data)
  ) {
    const provinceSpecificMemories = global_memories.data.filter(
      (memory) => memory.province === provinceInfo.name
    );

    if (provinceSpecificMemories.length > 0) {
      displayMemoriesInPanel(provinceSpecificMemories, infoPanel);
    }
  } else {
    console.warn(
      "global_memories not available, not an object, or has no data array property for displaying memories."
    );
  }
}

function create_province_detail_Panel(provinceInfo) {
  const existingPanel = document.querySelector(".province-detail-panel");
  if (existingPanel) {
    existingPanel.remove();
  }

  const detailPanel = document.createElement("div");
  detailPanel.className = "province-detail-panel memory-registration-panel";

  const provinceName = provinceInfo.province_name || provinceInfo.name;
  const famousPlaces = provinceInfo.famous_for || [];
  const destinations = provinceInfo.destinations || [];

  const createTagsHTML = (list) => {
    if (!Array.isArray(list) || list.length === 0) return "";
    return list
      .map((item) => `<span class="attraction-tag">${item}</span>`)
      .join("");
  };

  const createDestinationsHTML = (destinations) => {
    if (!Array.isArray(destinations) || destinations.length === 0) return "";

    return destinations
      .map((dest) => {
        const imagesHTML = (dest.location_images || [])
          .map(
            (img) =>
              `<img src="${img}" alt="${dest.location_name}" class="destination-image" />`
          )
          .join("");

        return `
          <div class="destination-card">
            <h5>${dest.location_name}</h5>
            <p><strong>Type:</strong> ${dest.location_type}</p>
            <p><strong>Description:</strong> ${dest.location_description}</p>
            <p><strong>Open Time:</strong> ${dest.location_open_time}</p>
            <p><strong>Address:</strong> ${dest.location_address}</p>
            <div class="destination-images">${imagesHTML}</div>
          </div>
        `;
      })
      .join("");
  };

  const famousPlacesHTML = createTagsHTML(famousPlaces);
  const destinationsHTML = createDestinationsHTML(destinations);

  detailPanel.innerHTML = `
    <div class="memory-panel-header">
      <h3>${provinceName}</h3>
      <button class="close-detail-panel">&times;</button>
    </div>
    <div class="memory-panel-content">
      <div class="detail-section">
        <h4>Description</h4>
        <p>${provinceInfo.description || "No description available."}</p>
      </div>
      ${
        famousPlaces.length > 0
          ? `
        <div class="detail-section">
          <h4>Famous For</h4>
          <div class="tags-container">${famousPlacesHTML}</div>
        </div>`
          : ""
      }
      ${
        destinations.length > 0
          ? `
        <div class="detail-section">
          <h4>Attractions</h4>
          <div class="destinations-container">${destinationsHTML}</div>
        </div>`
          : ""
      }
      <div class="detail-section">
        <h4>Region</h4>
        <p>${provinceInfo.region || "N/A"}</p>
      </div>
    </div>
  `;

  document.querySelector(".map-info-container").appendChild(detailPanel);

  const closeBtn = detailPanel.querySelector(".close-detail-panel");
  closeBtn.addEventListener("click", () => {
    detailPanel.style.animation = "fadeOut 0.3s ease-in-out";
    setTimeout(() => {
      detailPanel.remove();
    }, 300);
  });
}
// Function to get province information from database
async function getProvinceInfo(provinceName) {
  const token = localStorage.getItem("idToken");
  if (!token) {
    console.error("No authentication token found");
    return Promise.resolve({
      name: provinceName,
      description: "Please log in to view province information.",
      attractions: ["Authentication required"],
      region: "Unknown",
    });
  }

  const url = `${API_BASE_URL}/get_province/${encodeURIComponent(
    provinceName
  )}`;
  console.log("Fetching province data from:", url);

  return fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          console.error("Authentication failed, redirecting to login");
          window.location.href = "login.html";
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // console.log(typeof response.json());
      return response.json();
    })
    .then((result) => {
      console.log("API Response:", result);

      if (result.success && result.data) {
        return result.data;
      } else {
        // Return default data if province not found
        return {
          name: provinceName,
          description:
            result.data?.description || "Information is being updated.",
          attractions: result.data?.attractions || ["Under development"],
          region: result.data?.region || "Unknown",
        };
      }
    })
    .catch((error) => {
      console.error("Error fetching province data:", error);
      return {
        name: provinceName,
        description: "Unable to load province information at this time.",
        attractions: ["Please try again later"],
        region: "Unknown",
      };
    });
}

// Function to show memory registration panel
function showMemoryPanel(provinceInfo) {
  // Remove existing memory panel if any
  const existingPanel = document.querySelector(".memory-registration-panel");
  if (existingPanel) {
    existingPanel.remove();
  }

  // Create memory registration panel
  const memoryPanel = document.createElement("div");
  memoryPanel.className = "memory-registration-panel";

  // Reset sharing-related variables when panel opens
  currentUserSelectionFromSuggestion = null;
  emailsToShareList = [];

  memoryPanel.innerHTML = `
    <div class="memory-panel-header">
      <h3>Add Memory for ${provinceInfo.name}</h3>
      <button class="close-memory-panel">&times;</button>
    </div>
    <div class="memory-panel-content">
      <form id="memoryForm" class="memory-form">
        <div class="form-group">
          <label for="memoryName">Memory Name *</label>
          <input type="text" id="memoryName" name="memoryName" required placeholder="Give your memory a name...">
        </div>
        
        <div class="form-group">
          <label for="memoryDescription">Description *</label>
          <textarea id="memoryDescription" name="memoryDescription" required placeholder="Describe your experience..." rows="4"></textarea>
        </div>
      
        <div class="form-group">
          <label for="shareWithUserEmailInput">Share with (optional, type email):</label>
          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="text" id="shareWithUserEmailInput" name="shareWithUserEmailInput" placeholder="Enter user's email to get suggestions..." oninput="searchUsersForSharingInPanel()">
            <button type="button" class="add-share-email-btn" onclick="addEmailToSharedList()">Add</button>
          </div>
          <div class="users-list" id="shareUserSuggestionListInPanel" style="display: none; border: 1px solid #ddd; max-height: 150px; overflow-y: auto; margin-top: 5px; background-color: #f9f9f9;">
          </div>
          <ul id="sharedEmailList" style="margin-top: 10px; padding-left: 20px;"></ul>
        </div>

        <div class="form-group">
          <label for="memoryPhoto">Photo Upload</label>
          <div class="photo-upload-area">
            <input type="file" id="memoryPhoto" name="memoryPhoto" accept="image/*" style="display: none;">
            <div class="upload-placeholder" onclick="document.getElementById('memoryPhoto').click()">
              <div class="upload-icon">📷</div>
              <p>Click to upload a photo</p>
              <span class="upload-hint">JPG, PNG, GIF up to 10MB</span>
            </div>
            <div class="photo-preview" style="display: none;">
              <img id="previewImage" src="" alt="Preview">
              <button type="button" class="remove-photo" onclick="removePhoto()">&times;</button>
            </div>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn-cancel" onclick="closeMemoryPanel()">Cancel</button>
          <button type="submit" class="btn-save">Save Memory</button>
        </div>
      </form>
    </div>
  `;

  // Add the panel to the map container
  document.querySelector(".map-info-container").appendChild(memoryPanel);

  // Set up event listeners for the memory panel
  setupMemoryPanelEventListeners(provinceInfo);
  renderSharedEmailsList(); // Initial render of the (empty) shared emails list
}

// Function to set up event listeners for memory panel
function setupMemoryPanelEventListeners(provinceInfo) {
  // Close button
  const closeBtn = document.querySelector(".close-memory-panel");
  closeBtn.addEventListener("click", closeMemoryPanel);

  // Photo upload functionality
  const photoInput = document.getElementById("memoryPhoto");
  photoInput.addEventListener("change", handlePhotoUpload);

  // Form submission
  const memoryForm = document.getElementById("memoryForm");
  memoryForm.addEventListener("submit", function (e) {
    e.preventDefault();
    handleMemorySubmission(provinceInfo);
  });
}

// Function to handle photo upload
function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    alert("File size must be less than 10MB");
    return;
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    alert("Please select a valid image file");
    return;
  }

  // Read and display the image
  const reader = new FileReader();
  reader.onload = function (e) {
    const uploadPlaceholder = document.querySelector(".upload-placeholder");
    const photoPreview = document.querySelector(".photo-preview");
    const previewImage = document.getElementById("previewImage");

    previewImage.src = e.target.result;
    previewImage.style.maxWidth = "100%";
    previewImage.style.maxHeight = "100%";
    previewImage.style.objectFit = "contain";
    uploadPlaceholder.style.display = "none";
    photoPreview.style.display = "flex";
  };
  reader.readAsDataURL(file);
}

// Function to remove uploaded photo
function removePhoto() {
  const photoInput = document.getElementById("memoryPhoto");
  const uploadPlaceholder = document.querySelector(".upload-placeholder");
  const photoPreview = document.querySelector(".photo-preview");

  photoInput.value = "";
  uploadPlaceholder.style.display = "flex";
  photoPreview.style.display = "none";
}

// Function to handle memory form submission
function handleMemorySubmission(provinceInfo) {
  const memoryName = document.getElementById("memoryName").value.trim();
  const memoryDescription = document
    .getElementById("memoryDescription")
    .value.trim();

  const memoryPhoto = document.getElementById("memoryPhoto").files[0];

  // Validation
  if (!memoryName) {
    alert("Please enter a memory name");
    document.getElementById("memoryName").focus();
    return;
  }

  if (!memoryDescription) {
    alert("Please enter a description");
    document.getElementById("memoryDescription").focus();
    return;
  }

  // Prepare data using FormData
  const formData = new FormData();
  formData.append("memory_name", memoryName);
  formData.append("description", memoryDescription);
  formData.append("province", provinceInfo.name);
  // formData.append("shared_emails", emailsToShareList);
  formData.append("created_at", new Date().toISOString());
  if (memoryPhoto) {
    formData.append("photo", memoryPhoto, memoryPhoto.name);
  }

  // Process the emailsToShareList for submission
  formData.append("shared_emails", emailsToShareList);

  // Show loading state
  const saveBtn = document.querySelector(".btn-save");
  const originalText = saveBtn.textContent;
  saveBtn.textContent = "Saving...";
  saveBtn.disabled = true;

  // Get authentication token
  const token = localStorage.getItem("idToken");
  if (!token) {
    alert("Please log in to save memories");
    window.location.href = "login.html";
    // Restore button state
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
    return;
  }

  // Make API call to save memory
  fetch(`${API_BASE_URL}/memories`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData, // Send FormData object
  })
    .then(async (response) => {
      const result = await response.json();
      if (result.success) {
        // Success notification
        global_memories.data.push(result.data);
        showNotification("Memory saved successfully!", "success");

        // Reset form and close panel
        closeMemoryPanel();

        // Refresh the province info panel to show the new memory
        const currentInfoPanel = document.querySelector(".province-info-panel");
        if (currentInfoPanel) {
          // Remove existing memories section if any
          const existingMemoriesSection = currentInfoPanel.querySelector(
            ".user-memories-section"
          );
          if (existingMemoriesSection) {
            existingMemoriesSection.remove();
          }

          // Use global_memories to display updated memories for this province
          if (
            global_memories &&
            global_memories.data &&
            Array.isArray(global_memories.data)
          ) {
            const provinceSpecificMemories = global_memories.data.filter(
              (memory) => memory.province === provinceInfo.name
            );

            if (provinceSpecificMemories.length > 0) {
              displayMemoriesInPanel(
                provinceSpecificMemories,
                currentInfoPanel
              );
            }
          } else {
            console.warn(
              "global_memories not available for refreshing memories in panel."
            );
          }
        }
      } else {
        throw new Error(result.message || "Failed to save memory");
      }
    })
    .catch((error) => {
      console.error("Error saving memory:", error);
      showNotification(`Error saving memory: ${error.message}`, "error");
    })
    .finally(() => {
      // Reset button state
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    });
}

// Function to close memory panel
function closeMemoryPanel() {
  const memoryPanel = document.querySelector(".memory-registration-panel");
  if (memoryPanel) {
    memoryPanel.style.animation = "fadeOut 0.3s ease-in-out";
    setTimeout(() => {
      memoryPanel.remove();
    }, 300);
  }
}

// Function to show notifications
function showNotification(message, type = "info") {
  // Remove existing notifications
  const existingNotification = document.querySelector(".notification");
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  // Add to page
  document.body.appendChild(notification);

  // Auto remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = "fadeOut 0.3s ease-in-out";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }, 3000);
}

// Function to display memories in the info panel
function displayMemoriesInPanel(memories, infoPanel) {
  if (!memories || memories.length === 0) {
    return; // No memories to display
  }

  // Create memories section
  const memoriesSection = document.createElement("div");
  memoriesSection.className = "user-memories-section";
  memoriesSection.innerHTML = `
    <h3>Your Memories (${memories.length})</h3>
    <div class="memories-list">
      ${memories
        .map(
          (memory) => `
        <div class="memory-item">
          <div class="memory-content">
            <h4>${memory.memory_name}</h4>
            <p>${
              memory.description.length > 100
                ? memory.description.substring(0, 100) + "..."
                : memory.description
            }</p>
            <small>Created: ${new Date(
              memory.created_at
            ).toLocaleDateString()}</small>
          </div>
          ${
            memory.photo_url
              ? `<div class="memory-photo"><img src="http://localhost:3053/${memory.photo_url}" alt="${memory.name}" /></div>`
              : ""
          }
        </div>
      `
        )
        .join("")}
    </div>
  `;

  // Insert before the buttons
  const buttonsContainer = infoPanel.querySelector(".read-more-btn").parentNode;
  buttonsContainer.insertBefore(memoriesSection, buttonsContainer.firstChild);
}

// -------- START: Functions for User Search In Memory Panel --------
async function searchUsersForSharingInPanel() {
  const query = document.getElementById("shareWithUserEmailInput").value.trim();
  const usersListContainer = document.getElementById(
    "shareUserSuggestionListInPanel"
  );

  // Clear previous selection if query changes
  if (
    query !==
    (currentUserSelectionFromSuggestion
      ? currentUserSelectionFromSuggestion.email
      : "")
  ) {
    currentUserSelectionFromSuggestion = null;
  }

  if (!query || query.length < 2) {
    // Start search after 2 characters
    usersListContainer.innerHTML = "";
    usersListContainer.style.display = "none";
    return;
  }

  usersListContainer.innerHTML =
    '<div style="padding: 8px; text-align: center; color: #555;">🔍 Searching...</div>';
  usersListContainer.style.display = "block";

  clearTimeout(shareSearchTimeoutInPanel);
  renderShareUserResultsInPanel(user_friendList.data);
}

function renderShareUserResultsInPanel(users) {
  const usersListContainer = document.getElementById(
    "shareUserSuggestionListInPanel"
  );
  usersListContainer.innerHTML = ""; // Clear previous results or message

  if (users.length === 0) {
    usersListContainer.innerHTML =
      '<div style="padding: 8px; text-align: center; color: #555;">No users found.</div>';
    usersListContainer.style.display = "block"; // Keep it visible to show "No users found"
    return;
  }

  users.forEach((user) => {
    // Prevent adding users to suggestions if they are already in the emailsToShareList by ID
    if (
      !emailsToShareList.some(
        (sharedItem) =>
          typeof sharedItem === "object" && sharedItem.id === user.id
      )
    ) {
      const userItem = createShareUserElementInPanel(user);
      usersListContainer.appendChild(userItem);
    }
  });
  if (usersListContainer.children.length === 0 && users.length > 0) {
    usersListContainer.innerHTML =
      '<div style="padding: 8px; text-align: center; color: #555;">All matching users already added or selected.</div>';
  }
  usersListContainer.style.display =
    usersListContainer.children.length > 0 ? "block" : "none";
}

function createShareUserElementInPanel(user) {
  const div = document.createElement("div");
  // Basic styling for user item, can be enhanced with CSS classes
  div.style.padding = "8px 10px";
  div.style.cursor = "pointer";
  div.style.borderBottom = "1px solid #eee";
  div.onmouseover = () => (div.style.backgroundColor = "#f0f0f0");
  div.onmouseout = () => (div.style.backgroundColor = "#f9f9f9");

  div.onclick = () => selectUserFromSuggestions(user);

  // Using API_BASE_URL for profile picture
  const avatarSrc = user.profilePic
    ? `${API_BASE_URL.replace("/api", "")}${user.profilePic}`
    : null;
  console.log(user.username);
  const avatarHTML = avatarSrc
    ? `<img src="${avatarSrc}" alt="${escapeHtml(
        user.username || "U"
      )}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover; margin-right: 8px; vertical-align: middle;" onerror="this.style.display='none'; this.nextSibling.style.display='inline-block';" />`
    : "";
  const initialHTML = `<span style="display: ${
    avatarSrc ? "none" : "inline-block"
  }; width: 30px; height: 30px; border-radius: 50%; background-color: #ccc; color: white; text-align: center; line-height: 30px; font-weight: bold; margin-right: 8px; vertical-align: middle;">${(
    escapeHtml(user.username) || "U"
  )
    .charAt(0)
    .toUpperCase()}</span>`;

  div.innerHTML = `
    ${avatarHTML}
    ${initialHTML}
    <span style="vertical-align: middle;">
        <strong style="display: block; font-size: 0.9em;">${escapeHtml(
          user.username || "Unknown User"
        )}</strong>
        <small style="color: #777; font-size: 0.8em;">${escapeHtml(
          user.email || ""
        )}</small>
    </span>`;
  return div;
}

function selectUserFromSuggestions(user) {
  currentUserSelectionFromSuggestion = user;
  document.getElementById("shareWithUserEmailInput").value = user.email; // Update input with selected user's email
  document.getElementById("shareUserSuggestionListInPanel").innerHTML = ""; // Clear suggestions
  document.getElementById("shareUserSuggestionListInPanel").style.display =
    "none"; // Hide suggestions list
  console.log(
    "User selected from suggestions:",
    currentUserSelectionFromSuggestion
  );
}

// -------- START: New/Modified Functions for managing shared emails list --------

function addEmailToSharedList() {
  const emailInput = document.getElementById("shareWithUserEmailInput");
  const emailValue = emailInput.value.trim();
  const suggestionListContainer = document.getElementById(
    "shareUserSuggestionListInPanel"
  );

  if (!emailValue) return; // Do nothing if input is empty

  let alreadyExists = false;

  if (
    currentUserSelectionFromSuggestion &&
    currentUserSelectionFromSuggestion.email === emailValue
  ) {
    // User was selected from suggestions, and input matches that selection
    if (
      !emailsToShareList.some(
        (item) =>
          typeof item === "object" &&
          item.id === currentUserSelectionFromSuggestion.id
      )
    ) {
      emailsToShareList.push(currentUserSelectionFromSuggestion.email);
    } else {
      alreadyExists = true;
    }
  } else {
    // Manual email input or input changed after suggestion was selected
    // Basic email validation (can be improved)
    if (!emailValue.includes("@") || !emailValue.includes(".")) {
      alert("Please enter a valid email address.");
      return;
    }
    if (
      !emailsToShareList.some(
        (item) =>
          typeof item === "string" &&
          item.toLowerCase() === emailValue.toLowerCase()
      )
    ) {
      emailsToShareList.push(emailValue);
    } else {
      alreadyExists = true;
    }
  }

  if (alreadyExists) {
    console.log("This user/email is already in the share list:", emailValue);
    // Optionally, notify the user with an alert or a message.
    // alert("This user/email is already added to the share list.");
  }

  renderSharedEmailsList();
  emailInput.value = ""; // Clear the input field
  currentUserSelectionFromSuggestion = null; // Reset current selection
  suggestionListContainer.innerHTML = ""; // Clear suggestions
  suggestionListContainer.style.display = "none"; // Hide suggestions
  emailInput.focus(); // Set focus back to the input field
}

function renderSharedEmailsList() {
  const listElement = document.getElementById("sharedEmailList");
  if (!listElement) return;
  listElement.innerHTML = ""; // Clear current list

  if (emailsToShareList.length === 0) {
    listElement.style.display = "none";
    return;
  }
  listElement.style.display = "block"; // Or "list-item" or other appropriate display type

  emailsToShareList.forEach((item, index) => {
    const listItem = document.createElement("li");
    listItem.style.display = "flex";
    listItem.style.justifyContent = "space-between";
    listItem.style.alignItems = "center";
    listItem.style.padding = "5px 0";
    listItem.style.borderBottom = "1px solid #eee";

    const textSpan = document.createElement("span");
    if (typeof item === "object" && item.email) {
      // User object
      textSpan.textContent = `${escapeHtml(item.name)} (${escapeHtml(
        item.email
      )})`;
    } else {
      // Email string
      textSpan.textContent = escapeHtml(item);
    }

    const removeButton = document.createElement("button");
    removeButton.innerHTML = "&times;"; // Multiplication sign for 'x'
    removeButton.style.marginLeft = "10px";
    removeButton.style.cursor = "pointer";
    removeButton.style.border = "none";
    removeButton.style.background = "transparent";
    removeButton.style.color = "red";
    removeButton.style.fontSize = "1.2em";
    removeButton.onclick = () => removeEmailFromSharedList(index);

    listItem.appendChild(textSpan);
    listItem.appendChild(removeButton);
    listElement.appendChild(listItem);
  });
}

function removeEmailFromSharedList(index) {
  if (index >= 0 && index < emailsToShareList.length) {
    emailsToShareList.splice(index, 1);
    renderSharedEmailsList();
  }
}
// -------- END: New/Modified Functions for managing shared emails list --------
