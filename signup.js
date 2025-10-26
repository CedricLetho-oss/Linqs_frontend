// signup.js - UPDATED VERSION with lastName fix
document.getElementById("signupForm").addEventListener("submit", async function(e){
  e.preventDefault();

  const submitBtn = this.querySelector('.btn-auth');
  const btnText = submitBtn.querySelector('.btn-text');
  const spinner = submitBtn.querySelector('.loading-spinner');

  // Show loading state
  btnText.style.display = 'none';
  spinner.style.display = 'block';
  submitBtn.disabled = true;

  try {
    // Collect form values - USE lastName INSTEAD OF surname
    const username = document.getElementById("username").value.trim();
    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("surname").value.trim(); // Changed from surname to lastName
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const role = document.getElementById("roleSelect").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Validation
    if (!username || !firstName || !lastName || !email || !phone || !role || !password || !confirmPassword) {
      alert("Please fill in all required fields!");
      throw new Error("Missing required fields");
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      throw new Error("Passwords don't match");
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      alert(passwordError);
      throw new Error("Invalid password");
    }

    console.log("Attempting to connect to backend...");

    const API_BASE_URL = 'https://linqs-backend.onrender.com/api';
    
    // Test backend connection first
    try {
      const testResponse = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
      console.log("Backend connection test:", testResponse.data);
    } catch (testError) {
      console.warn("Backend health check failed, but continuing...");
    }

    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      username: username,
      firstName: firstName,
      lastName: lastName, // CHANGED: surname -> lastName
      email: email,
      phone: phone,
      role: role,
      password: password,
      ...getAdditionalData(role)
    }, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Signup response status:', response.status);
    console.log('Signup response data:', response.data);

    if (response.status === 201 || response.status === 200) {
      handleSuccessfulSignup(response.data, username, firstName, lastName); // CHANGED: surname -> lastName
    }

  } catch (error) {
    console.error("Full signup error:", error);
    
    let errorMessage = "Signup failed: ";
    
    if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
      errorMessage += "Cannot connect to the server. Please make sure the backend is running on localhost:5000";
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage += "Connection refused. Is the backend server running on port 5000?";
    } else if (error.response) {
      // Server responded with error status
      const contentType = error.response.headers['content-type'];
      if (contentType && contentType.includes('text/html')) {
        errorMessage += "Server returned HTML instead of JSON. Backend might be misconfigured.";
      } else {
        errorMessage += error.response.data?.message || 
                       error.response.data?.error || 
                       `Server error: ${error.response.status}`;
      }
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
    if (submitBtn) submitBtn.disabled = false;
  }
});

function getAdditionalData(role) {
  if (role === 'student') {
    return {
      university: document.getElementById("university")?.value.trim() || '',
      course: document.getElementById("course")?.value.trim() || '',
      faculty: document.getElementById("faculty")?.value.trim() || '',
      courseDuration: document.getElementById("courseDuration")?.value || ''
    };
  } else if (role === 'landlord') {
    return {
      propertyName: document.getElementById("propertyName")?.value.trim() || '',
      propertyAddress: document.getElementById("propertyAddress")?.value.trim() || '',
      roomCount: document.getElementById("roomCount")?.value || ''
    };
  }
  return {};
}

function handleSuccessfulSignup(data, username, firstName, lastName) { // CHANGED: surname -> lastName
  // Save token and user info
  if (data.token) {
    localStorage.setItem("token", data.token);
  }
  if (data.user) {
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("username", data.user.username || username);
    localStorage.setItem("fullName", `${firstName} ${lastName}`); // CHANGED: surname -> lastName
  }

  alert("Signup successful! Redirecting...");

  // Redirect based on role
  setTimeout(() => {
    const userRole = data.user?.role;
    if (userRole === "landlord") {
      window.location.href = "landlord-dashboard.html";
    } else {
      window.location.href = "index.html";
    }
  }, 1000);
}

function validatePassword(password) {
  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one capital letter";
  }
  if (!/\d/.test(password)) {
    return "Password must contain at least one number";
  }
  return null;
}

// Role selection handler (keep your existing DOMContentLoaded code)
document.addEventListener('DOMContentLoaded', function() {
  const roleSelect = document.getElementById('roleSelect');
  const studentFields = document.getElementById('studentFields');
  const landlordFields = document.getElementById('landlordFields');

  if (roleSelect) {
    roleSelect.addEventListener('change', function() {
      const selectedRole = this.value;
      
      // Hide both fields first
      if (studentFields) {
        studentFields.classList.remove('show');
        studentFields.classList.add('d-none');
      }
      if (landlordFields) {
        landlordFields.classList.remove('show');
        landlordFields.classList.add('d-none');
      }
      
      // Show the appropriate fields with animation
      setTimeout(() => {
        if (selectedRole === 'student' && studentFields) {
          studentFields.classList.remove('d-none');
          setTimeout(() => studentFields.classList.add('show'), 10);
        } else if (selectedRole === 'landlord' && landlordFields) {
          landlordFields.classList.remove('d-none');
          setTimeout(() => landlordFields.classList.add('show'), 10);
        }
      }, 10);
    });
  }

  // Real-time password validation
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  
  function validatePasswords() {
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    if (confirmPassword && password !== confirmPassword) {
      confirmPasswordInput.style.borderColor = '#dc2626';
    } else if (confirmPassword) {
      confirmPasswordInput.style.borderColor = '#16a34a';
    } else {
      confirmPasswordInput.style.borderColor = '#e2e8f0';
    }
  }
  
  if (passwordInput && confirmPasswordInput) {
    passwordInput.addEventListener('input', validatePasswords);
    confirmPasswordInput.addEventListener('input', validatePasswords);
  }
});