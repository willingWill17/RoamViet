async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const response = await fetch("http://localhost:3053/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username: "", password }),
  });

  const result = await response.json();
  console.log(result);

  if (result.success) {
    // Save the Firebase ID token to localStorage
    localStorage.setItem("idToken", result.idToken);

    // Optionally: Save user email or UID
    localStorage.setItem("userEmail", result.email);

    // Redirect after successful login
    window.location.href = "main_site.html";
  } else {
    alert(result.message || "Login failed");
  }
}

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

  const response = await fetch("http://localhost:3053/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password }),
  });

  const result = await response.json();
  console.log(result);

  if (result.success) {
    alert("Account created successfully!");
    window.location.href = "login.html";
  } else {
    alert(result.message || "Sign up failed");
  }
}
