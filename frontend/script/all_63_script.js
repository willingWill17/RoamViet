document.addEventListener("DOMContentLoaded", function () {
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

document.addEventListener("DOMContentLoaded", function () {
  fetch("vietnam.svg")
    .then((response) => response.text())
    .then((svgContent) => {
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

        // setupProvinceData();
        initializeMap();
      }
    })
    .catch((error) => {
      console.error("Error loading SVG map:", error);
    });
});

// In the setupProvinceData function, update to handle both paths and groups:
// function setupProvinceData() {
//   const svgElement = document.querySelector(".map-container svg");
//   if (!svgElement) return;

//   // Find both path and group elements
//   const paths = svgElement.querySelectorAll("path");
//   paths.forEach((path) => {
//     // Add the province class to all paths if not already there
//     if (!path.classList.contains("province")) {
//       path.classList.add("province");
//     }
//     // ##DEBUG
//   });

//   const provinces = svgElement.querySelectorAll(".province");
//   fetch("get_province_names.php")
//     .then((response) => response.json())
//     .then((provinceNames) => {
//       // Assign names and ensure data attributes are set
//       provinces.forEach((province, index) => {
//         const id = province.getAttribute("id") || `province-${index}`;
//         console.log(id);
//         // If no id attribute, set one
//         if (!province.getAttribute("id")) {
//           province.setAttribute("id", id);
//         }

//         if (!province.getAttribute("data-name")) {
//           const name = provinceNames[id] || `Province ${index + 1}`;
//           province.setAttribute("data-name", name);
//         }
//       });
//     })
//     .catch((error) => {
//       console.error("Error fetching province names:", error);
//     });
// }

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
    province.addEventListener("click", function () {
      if (selectedProvince) {
        if (selectedProvince.tagName === "path") {
          selectedProvince.style.fill = "#FFFFFF";
        } else if (selectedProvince.tagName === "g") {
          const childPaths = selectedProvince.querySelectorAll("path");
          childPaths.forEach((path) => {
            path.style.fill = "#FFFFFF";
          });
        }
        selectedProvince.classList.remove("selected");
      }

      selectedProvince = this;
      const provinceId = this.getAttribute("id");
      console.log(provinceId);
      if (this.tagName === "path") {
        // console.log(this.tagName);
        this.style.fill = "#0C7489";
      } else if (this.tagName === "g") {
        const childPaths = this.querySelectorAll("path");
        childPaths.forEach((path) => {
          path.style.fill = "#0C7489";
        });
      }

      this.classList.add("selected");

      // Get province details
      const provinceName = this.getAttribute("id") || "Unknown Province";
      console.log(provinceName);
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
    if (selectedProvince) {
      // Check if it's a path or group element
      if (selectedProvince.tagName === "path") {
        selectedProvince.style.fill = "#FFFFFF";
      } else if (selectedProvince.tagName === "g") {
        // For group elements, reset all child paths
        const childPaths = selectedProvince.querySelectorAll("path");
        childPaths.forEach((path) => {
          path.style.fill = "#FFFFFF";
        });
      }
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
    `;

  // Add click event for read more button
  const readMoreBtn = infoPanel.querySelector(".read-more-btn");
  readMoreBtn.addEventListener("click", function () {
    // Navigate to detailed page about the province
    window.location.href = `detail.html?id=${provinceInfo.id}`;
  });

  // Add the info panel to the map container
  document.querySelector(".map-info-container").appendChild(infoPanel);
}

// Function to get province information from database
function getProvinceInfo(provinceName) {
  const url = `http://localhost:3053/api/get_province?province=${encodeURIComponent(
    provinceName
  )}`;
  console.log(url);
  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      if (typeof data?.data?.attractions === "string") {
        data.data.attractions = JSON.parse(data.data.attractions);
      }
      console.log("Province data:", data.data);
    })
    .catch((error) => {
      console.error("Error fetching province data:", error);
      console.log({
        name: provinceName,
        description: "Thông tin đang được cập nhật.",
        attractions: ["Đang cập nhật"],
      });
    });
}
// Function to setup search functionality
// function setupSearch(provinces, onProvinceFound) {
//     const searchBar = document.querySelector('.search-bar');
//     if (!searchBar) return;

//     searchBar.addEventListener('input', function() {
//         const searchTerm = this.value.toLowerCase().trim();

//         // Reset highlighting if search is empty
//         if (!searchTerm) {
//             provinces.forEach(province => {
//                 if (!province.classList.contains('selected')) {
//                     province.style.fill = '#FFFFFF';
//                 }
//             });
//             return;
//         }

//         // Highlight matching provinces
//         provinces.forEach(province => {
//             const provinceName = province.getAttribute('data-name') || '';

//             if (provinceName.toLowerCase().includes(searchTerm)) {
//                 // Don't change selected province color
//                 if (!province.classList.contains('selected')) {
//                     province.style.fill = '#e0e0e0';
//                 }
//             } else {
//                 // Reset non-matching provinces unless selected
//                 if (!province.classList.contains('selected')) {
//                     province.style.fill = '#FFFFFF';
//                 }
//             }
//         });
//     });

//     // Add search on Enter key
//     searchBar.addEventListener('keypress', function(e) {
//         if (e.key === 'Enter') {
//             const searchTerm = this.value.toLowerCase().trim();
//             if (!searchTerm) return;

//             // Find first matching province
//             for (const province of provinces) {
//                 const provinceName = province.getAttribute('data-name') || '';
//                 if (provinceName.toLowerCase().includes(searchTerm)) {
//                     // Call the callback function with found province
//                     onProvinceFound(province);
//                     break;
//                 }
//             }
//         }
//     });
// }
