let global_memories;
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
      initializeMap();
    }
  } catch (error) {
    console.error("Error loading SVG map:", error);
  }
});

async function get_user_memories() {
  const token = localStorage.getItem("idToken");
  const get_memories_url = `http://localhost:3053/api/memories`;
  const response = await fetch(get_memories_url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
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
      const provinceName = province.getAttribute("data-name") || "";

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
        const provinceName = province.getAttribute("data-name") || "";
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
        <h2>${provinceInfo.name}</h2>
        <p>${provinceInfo.description}</p>
        <button class="read-more-btn">Read more</button>
        <button class="add-memory-btn">Add memory</button>
    `;

  // Add click event for read more button
  const readMoreBtn = infoPanel.querySelector(".read-more-btn");
  readMoreBtn.addEventListener("click", function () {
    // Navigate to detailed page about the province
    window.location.href = `detail.html?id=${provinceInfo.id}`;
  });

  const addMemoryBtn = infoPanel.querySelector(".add-memory-btn");
  addMemoryBtn.addEventListener("click", function () {
    // Show memory registration panel instead of navigating
    showMemoryPanel(provinceInfo);
  });

  // Add the info panel to the map container
  document.querySelector(".map-info-container").appendChild(infoPanel);

  // Fetch and display user memories for this province
  fetchProvinceMemories(provinceInfo.name)
    .then((memories) => {
      if (memories && memories.length > 0) {
        displayMemoriesInPanel(memories, infoPanel);
      }
    })
    .catch((error) => {
      console.error("Error loading memories for province:", error);
    });
}

// Function to get province information from database
async function getProvinceInfo(provinceName) {
  // console.log(global_memories, typeof global_memories);
  // const result = [];
  // for (let i = 0; i < global_memories.data.length; i++) {
  // if (global_memories.data[i].province === provinceName) {
  // result.push(global_memories.data[i]);
  // }
  // }
  // console.log(result);
  // return result;
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

  const url = `http://localhost:3053/api/get_province/${encodeURIComponent(
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
    uploadPlaceholder.style.display = "none";
    photoPreview.style.display = "block";
  };
  reader.readAsDataURL(file);
}

// Function to remove uploaded photo
function removePhoto() {
  const photoInput = document.getElementById("memoryPhoto");
  const uploadPlaceholder = document.querySelector(".upload-placeholder");
  const photoPreview = document.querySelector(".photo-preview");

  photoInput.value = "";
  uploadPlaceholder.style.display = "block";
  photoPreview.style.display = "none";
}

// Function to handle memory form submission
function handleMemorySubmission(provinceInfo) {
  const formData = new FormData();
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

  // Prepare data
  const memoryData = {
    name: memoryName,
    description: memoryDescription,
    province: provinceInfo.name,
    province_id: provinceInfo.id,
    created_at: new Date().toISOString(),
  };

  // Add photo if uploaded
  if (memoryPhoto) {
    formData.append("photo", memoryPhoto);
  }
  formData.append("memoryData", JSON.stringify(memoryData));

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
    return;
  }

  // Make API call to save memory
  fetch("http://localhost:3053/api/memories", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })
    .then(async (response) => {
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          alert("Session expired. Please log in again.");
          window.location.href = "login.html";
          return;
        }
        throw new Error(result.detail || "Failed to save memory");
      }

      return result;
    })
    .then((result) => {
      if (result.success) {
        // Success notification
        showNotification("Memory saved successfully!", "success");

        // Reset form and close panel
        closeMemoryPanel();

        // Refresh the province info panel to show the new memory
        const currentInfoPanel = document.querySelector(".province-info-panel");
        if (currentInfoPanel) {
          // Re-fetch and display memories for this province
          fetchProvinceMemories(provinceInfo.name)
            .then((memories) => {
              // Remove existing memories section if any
              const existingMemoriesSection = currentInfoPanel.querySelector(
                ".user-memories-section"
              );
              if (existingMemoriesSection) {
                existingMemoriesSection.remove();
              }

              // Display updated memories
              if (memories && memories.length > 0) {
                displayMemoriesInPanel(memories, currentInfoPanel);
              }
            })
            .catch((error) => {
              console.error("Error refreshing memories:", error);
            });
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

// Function to fetch user memories for a province
function fetchProvinceMemories(provinceName) {
  const token = localStorage.getItem("idToken");
  if (!token) {
    return Promise.resolve([]);
  }

  const url = `http://localhost:3053/api/memories/province/${encodeURIComponent(
    provinceName
  )}`;

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
          // Token expired or invalid, but don't redirect immediately
          console.warn("Authentication failed while fetching memories");
          return { success: false, data: [] };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((result) => {
      if (result.success) {
        return result.data || [];
      }
      return [];
    })
    .catch((error) => {
      console.error("Error fetching province memories:", error);
      return [];
    });
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
            <h4>${memory.name}</h4>
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
