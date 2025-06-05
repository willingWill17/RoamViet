document.addEventListener("DOMContentLoaded", async function () {
  // Check authentication
  if (!isAuthenticated()) {
    window.location.href = "login.html";
    return;
  }

  // --- Start: Added for robust error handling ---
  const profilePicture = document.getElementById("profilePicture");
  let originalProfilePicSrc = profilePicture.src; // Save the initial src
  // --- End: Added for robust error handling ---

  // Load user profile data
  try {
    const response = await authenticatedFetch(
      "http://localhost:3053/api/profile"
    );
    if (response && response.ok) {
      const result = await response.json();
      if (result.success) {
        const user = result.user;
        document.getElementById("userEmail").textContent = user.email || "N/A";
        document.getElementById("userId").textContent = user.localId || "N/A";
        document.getElementById("createdAt").textContent = user.createdAt
          ? new Date(user.createdAt).toLocaleDateString()
          : "N/A";

        // --- IMPROVEMENT: Load profile picture from the same API call ---
        if (user.profilePic) {
          originalProfilePicSrc = `http://localhost:3053${user.profilePic}`; // Update original src
          profilePicture.src = originalProfilePicSrc;
          profilePicture.style.objectFit = "cover";
        }
      }
    }
  } catch (error) {
    console.error("Error loading profile:", error);
    document.getElementById("userEmail").textContent =
      localStorage.getItem("userEmail") || "Error loading";
    document.getElementById("userId").textContent = "Error loading";
    document.getElementById("createdAt").textContent = "Error loading";
  }

  // Set up profile picture upload handler
  setupProfilePictureUpload(originalProfilePicSrc);
});

// --- REFACTORED: This function is no longer needed ---
// async function loadUserProfilePicture(userId) { ... }

function setupProfilePictureUpload(originalSrc) {
  const input = document.getElementById("profilePictureInput");
  const profilePicture = document.getElementById("profilePicture");
  const uploadBtn = document.querySelector(".upload-btn");

  input.addEventListener("change", async function (event) {
    const file = event.target.files[0];
    if (!file) return;

    // File validation
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB.");
      return;
    }

    const originalBtnText = uploadBtn.textContent;
    let newImageURL = null;

    try {
      // Show loading state and preview
      uploadBtn.textContent = "Uploading...";
      uploadBtn.disabled = true;

      const reader = new FileReader();
      reader.onload = (e) => {
        profilePicture.src = e.target.result;
        profilePicture.style.objectFit = "cover";
      };
      reader.readAsDataURL(file);

      // Upload the file
      const formData = new FormData();
      formData.append("profile_picture", file);

      const response = await authenticatedFetch(
        // Assuming authenticatedFetch handles tokens
        "http://localhost:3053/api/profile/picture",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        // Handle server-side errors
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      const result = await response.json();
      newImageURL = result.profile_picture_url;
      alert("Profile picture updated successfully!");
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      alert("Failed to upload profile picture. Please try again.");

      // --- FIX: Restore the actual original image on failure ---
      profilePicture.src = originalSrc;
    } finally {
      // --- IMPROVEMENT: Use finally to always restore the button ---
      uploadBtn.textContent = originalBtnText;
      uploadBtn.disabled = false;
      if (newImageURL) {
        // Update the original source if upload was successful
        originalSrc = `http://localhost:3053${newImageURL}`;
      }
    }
  });
}
