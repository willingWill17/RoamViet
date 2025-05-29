function togglePassword() {
    const passwordInput = document.getElementById("password");
    const toggle = document.querySelector(".toggle-password");
    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      toggle.textContent = "🙈";
    } else {
      passwordInput.type = "password";
      toggle.textContent = "👁️";
    }
  }

  function changeAvatar(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        document.getElementById("avatarPreview").src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  document.getElementById("password").addEventListener("input", function () {
    const val = this.value;
    const strengthBar = document.getElementById("strengthBar");
    if (val.length === 0) {
      strengthBar.className = "strength-bar";
    } else if (val.length < 6 || !/\d/.test(val)) {
      strengthBar.className = "strength-bar strength-weak";
    } else if (val.length < 10 || !/[!@#$%^&*]/.test(val)) {
      strengthBar.className = "strength-bar strength-medium";
    } else {
      strengthBar.className = "strength-bar strength-strong";
    }
  });

  document.querySelector(".edit-button").addEventListener("click", function () {
    // Có thể thêm xử lý lưu dữ liệu ở đây nếu cần
    window.location.href = "main_site.html"; // Điều hướng về main_site.html
  });
  