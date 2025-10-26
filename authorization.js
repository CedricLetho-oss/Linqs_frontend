// authorization.js - USING AXIOS (consistent with signup.js)
const API_BASE_URL = 'https://linqs-backend.onrender.com/api';

// Handle Login
document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  console.log("Login form submitted, preventing default behavior");

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  // Show loading state
  const submitBtn = this.querySelector('button[type="submit"]');
  const btnText = submitBtn.querySelector('.btn-text');
  const spinner = submitBtn.querySelector('.loading-spinner');
  
  if (btnText) btnText.style.display = 'none';
  if (spinner) spinner.style.display = 'block';
  submitBtn.disabled = true;

  try {
    console.log('Attempting login to:', `${API_BASE_URL}/auth/login`);
    console.log('Sending data:', { email, password });
    
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Login response status:', response.status);
    console.log('Login response data:', response.data);

    // Save token and user info
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
      console.log("Token saved to localStorage");
    }
    if (response.data.user) {
      localStorage.setItem("user", JSON.stringify(response.data.user));
      localStorage.setItem("username", response.data.user.username || response.data.user.name || response.data.user.email.split('@')[0]);
      console.log("User data saved to localStorage");
    }

    alert("Login successful! Redirecting...");

    // Role-based redirect - ONLY STUDENT AND LANDLORD
    const role = response.data.user?.role || 'student';
    setTimeout(() => {
      if (role === "landlord") {
        window.location.href = "landlord-dashboard.html";
      } else {
        window.location.href = "index.html"; // Student goes to index.html
      }
    }, 1000);

  } catch (error) {
    console.error("Login error:", error);
    let errorMessage = "Login failed: ";
    
    if (error.response) {
      // Server responded with error status
      errorMessage += error.response.data?.message || 
                     error.response.data?.error || 
                     `Server error: ${error.response.status}`;
    } else if (error.request) {
      errorMessage += "No response received from server. Backend might be down.";
    } else {
      errorMessage += error.message;
    }
    
    alert(errorMessage);
  } finally {
    // Reset button state
    if (btnText) btnText.style.display = 'inline';
    if (spinner) spinner.style.display = 'none';
    submitBtn.disabled = false;
  }
});

// Check login status on page load
document.addEventListener('DOMContentLoaded', function() {
  console.log("Authorization page loaded");
  checkLoginStatus();
});

function checkLoginStatus() {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');
  
  if (token && userData) {
    const user = JSON.parse(userData);
    const username = user.username || user.name || user.email.split('@')[0];
    
    // If user is already logged in and on auth page, redirect
    if (window.location.pathname.includes('authorization.html')) {
      const role = user.role || 'student';
      alert(`Welcome back ${username}! Redirecting...`);
      setTimeout(() => {
        if (role === "landlord") {
          window.location.href = "landlord-dashboard.html";
        } else {
          window.location.href = "index.html";
        }
      }, 2000);
    }
  }
}

// Logout function
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('username');
  window.location.href = 'index.html';
}

// Make functions globally available
window.logout = logout;