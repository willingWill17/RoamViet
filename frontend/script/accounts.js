// Authentication utility functions
const AUTH_API_BASE = "http://localhost:3053/api";

// Save tokens to localStorage
function saveTokens(idToken, refreshToken, email, expiresIn) {
  localStorage.setItem("idToken", idToken);
  localStorage.setItem("refreshToken", refreshToken);
  localStorage.setItem("userEmail", email);

  // Calculate expiration time
  const expirationTime = Date.now() + parseInt(expiresIn) * 1000;
  localStorage.setItem("tokenExpiration", expirationTime.toString());
}

// Clear all authentication data
function clearAuthData() {
  localStorage.removeItem("idToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("tokenExpiration");
}

// Check if user is authenticated
function isAuthenticated() {
  const idToken = localStorage.getItem("idToken");
  const expiration = localStorage.getItem("tokenExpiration");

  if (!idToken || !expiration) {
    return false;
  }

  // Check if token is expired
  if (Date.now() >= parseInt(expiration)) {
    // Try to refresh token
    refreshTokenIfNeeded();
    return false;
  }

  return true;
}

// Refresh token if needed
async function refreshTokenIfNeeded() {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) {
    clearAuthData();
    return false;
  }

  try {
    const response = await fetch(`${AUTH_API_BASE}/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    const result = await response.json();

    if (result.success) {
      saveTokens(
        result.idToken,
        result.refreshToken,
        localStorage.getItem("userEmail"),
        result.expiresIn
      );
      return true;
    } else {
      clearAuthData();
      return false;
    }
  } catch (error) {
    console.error("Error refreshing token:", error);
    clearAuthData();
    return false;
  }
}

// Redirect to login if not authenticated
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

// Logout function
function logout() {
  clearAuthData();
  window.location.href = "login.html";
}

// Handle login form submission
async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch(`${AUTH_API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username: "", password }),
    });

    const result = await response.json();
    console.log(result);

    if (result.success) {
      saveTokens(
        result.idToken,
        result.refreshToken,
        result.email,
        result.expiresIn
      );

      // Redirect after successful login
      window.location.href = "main_site.html";
    } else {
      alert(result.message || "Login failed");
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("Network error. Please try again.");
  }
}

// Handle signup form submission
async function handleSignUp(event) {
  event.preventDefault();

  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (password !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }

  try {
    const response = await fetch(`${AUTH_API_BASE}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
    });

    const result = await response.json();
    console.log(result);

    if (result.success) {
      alert("Account created successfully! Please log in.");
      window.location.href = "login.html";
    } else {
      alert(result.message || "Sign up failed");
    }
  } catch (error) {
    console.error("Signup error:", error);
    alert("Network error. Please try again.");
  }
}

// Make authenticated API requests
async function authenticatedFetch(url, options = {}) {
  const idToken = localStorage.getItem("idToken");

  if (!idToken) {
    window.location.href = "login.html";
    return null;
  }

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // If unauthorized, try to refresh token
    if (response.status === 401) {
      const refreshed = await refreshTokenIfNeeded();
      if (refreshed) {
        // Retry with new token
        const newToken = localStorage.getItem("idToken");
        headers["Authorization"] = `Bearer ${newToken}`;
        return fetch(url, { ...options, headers });
      } else {
        window.location.href = "login.html";
        return null;
      }
    }

    return response;
  } catch (error) {
    console.error("Authenticated fetch error:", error);
    throw error;
  }
}

// Initialize authentication state on page load
document.addEventListener("DOMContentLoaded", function () {
  // Auto-refresh token if needed on page load
  if (localStorage.getItem("idToken")) {
    refreshTokenIfNeeded();
  }
});
