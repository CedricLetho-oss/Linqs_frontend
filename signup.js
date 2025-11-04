// signup.js - UPDATED with Short-term Tenant role
document.addEventListener('DOMContentLoaded', function() {
  initializeRoleSelection();
  initializePasswordValidation();
  initializePasswordToggles();
  initializeFormPersistence();
});

// Initialize role selection and field toggling
function initializeRoleSelection() {
  const roleSelect = document.getElementById('roleSelect');
  const studentFields = document.getElementById('studentFields');
  const landlordFields = document.getElementById('landlordFields');
  const tenantFields = document.getElementById('tenantFields');

  if (roleSelect) {
    roleSelect.addEventListener('change', function() {
      const selectedRole = this.value;
      toggleRoleFields(selectedRole);
    });
  }
}

// Toggle visibility of role-specific fields
function toggleRoleFields(selectedRole) {
  const studentFields = document.getElementById('studentFields');
  const landlordFields = document.getElementById('landlordFields');
  const tenantFields = document.getElementById('tenantFields');

  // Hide all fields first
  [studentFields, landlordFields, tenantFields].forEach(fields => {
    if (fields) {
      fields.classList.remove('show');
      fields.classList.add('d-none');
    }
  });

  // Show the appropriate fields with animation
  setTimeout(() => {
    let targetFields = null;
    
    switch (selectedRole) {
      case 'student':
        targetFields = studentFields;
        break;
      case 'landlord':
        targetFields = landlordFields;
        break;
      case 'tenant':
        targetFields = tenantFields;
        break;
    }

    if (targetFields) {
      targetFields.classList.remove('d-none');
      setTimeout(() => targetFields.classList.add('show'), 10);
    }
  }, 10);
}

// Initialize real-time password validation
function initializePasswordValidation() {
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
}

// Password visibility toggle functionality
function initializePasswordToggles() {
  document.addEventListener('click', function(e) {
    if (e.target.closest('.toggle-password')) {
      const button = e.target.closest('.toggle-password');
      const targetId = button.getAttribute('data-target');
      const passwordInput = document.getElementById(targetId);
      const icon = button.querySelector('i');
      
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.className = 'bi bi-eye-slash text-muted';
        button.setAttribute('aria-label', 'Hide password');
      } else {
        passwordInput.type = 'password';
        icon.className = 'bi bi-eye text-muted';
        button.setAttribute('aria-label', 'Show password');
      }
      
      // Trigger input event to update validation colors
      passwordInput.dispatchEvent(new Event('input'));
    }
  });
}

// Form data persistence
function initializeFormPersistence() {
  const formInputs = document.querySelectorAll('#signupForm input, #signupForm select');
  
  // Save form data whenever it changes
  formInputs.forEach(input => {
    input.addEventListener('input', saveFormData);
    input.addEventListener('change', saveFormData);
  });
  
  // Load saved data when page loads
  loadFormData();
}

// Save form data to localStorage
function saveFormData() {
  const formData = {
    username: document.getElementById('username').value,
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('surname').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    role: document.getElementById('roleSelect').value,
    password: document.getElementById('password').value,
    confirmPassword: document.getElementById('confirmPassword').value,
    // Student fields
    university: document.getElementById('university')?.value || '',
    course: document.getElementById('course')?.value || '',
    faculty: document.getElementById('faculty')?.value || '',
    courseDuration: document.getElementById('courseDuration')?.value || '',
    // Landlord fields
    propertyName: document.getElementById('propertyName')?.value || '',
    propertyAddress: document.getElementById('propertyAddress')?.value || '',
    roomCount: document.getElementById('roomCount')?.value || '',
    // Tenant fields
    occupation: document.getElementById('occupation')?.value || '',
    reasonForStay: document.getElementById('reasonForStay')?.value || ''
  };
  
  localStorage.setItem('signupFormData', JSON.stringify(formData));
}

// Load form data from localStorage
function loadFormData() {
  const savedData = localStorage.getItem('signupFormData');
  if (savedData) {
    const formData = JSON.parse(savedData);
    
    // Populate all basic form fields
    document.getElementById('username').value = formData.username || '';
    document.getElementById('firstName').value = formData.firstName || '';
    document.getElementById('surname').value = formData.lastName || '';
    document.getElementById('email').value = formData.email || '';
    document.getElementById('phone').value = formData.phone || '';
    document.getElementById('password').value = formData.password || '';
    document.getElementById('confirmPassword').value = formData.confirmPassword || '';
    
    // Set role and show appropriate fields
    if (formData.role) {
      document.getElementById('roleSelect').value = formData.role;
      toggleRoleFields(formData.role);
      
      // Populate role-specific fields after a short delay
      setTimeout(() => {
        switch (formData.role) {
          case 'student':
            document.getElementById('university').value = formData.university || '';
            document.getElementById('course').value = formData.course || '';
            document.getElementById('faculty').value = formData.faculty || '';
            document.getElementById('courseDuration').value = formData.courseDuration || '';
            break;
          case 'landlord':
            document.getElementById('propertyName').value = formData.propertyName || '';
            document.getElementById('propertyAddress').value = formData.propertyAddress || '';
            document.getElementById('roomCount').value = formData.roomCount || '';
            break;
          case 'tenant':
            document.getElementById('occupation').value = formData.occupation || '';
            document.getElementById('reasonForStay').value = formData.reasonForStay || '';
            break;
        }
      }, 100);
    }
  }
}

// Main form submission handler
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
    // Collect form values
    const formData = collectFormData();
    
    // Validate form
    const validationError = validateForm(formData);
    if (validationError) {
      alert(validationError);
      throw new Error(validationError);
    }

    // Send to backend
    await submitFormToBackend(formData);

  } catch (error) {
    console.error("Signup error:", error);
    handleSignupError(error);
  } finally {
    // Reset button state
    if (btnText) btnText.style.display = 'inline';
    if (spinner) spinner.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;
  }
});

// Collect all form data
function collectFormData() {
  const username = document.getElementById("username").value.trim();
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("surname").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const role = document.getElementById("roleSelect").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  const additionalData = getAdditionalData(role);

  return {
    username,
    firstName,
    lastName,
    email,
    phone,
    role,
    password,
    confirmPassword,
    ...additionalData
  };
}

// Get role-specific additional data
function getAdditionalData(role) {
  switch (role) {
    case 'student':
      return {
        university: document.getElementById("university")?.value.trim() || '',
        course: document.getElementById("course")?.value.trim() || '',
        faculty: document.getElementById("faculty")?.value.trim() || '',
        courseDuration: document.getElementById("courseDuration")?.value || ''
      };
    case 'landlord':
      return {
        propertyName: document.getElementById("propertyName")?.value.trim() || '',
        propertyAddress: document.getElementById("propertyAddress")?.value.trim() || '',
        roomCount: document.getElementById("roomCount")?.value || ''
      };
    case 'tenant':
      return {
        occupation: document.getElementById("occupation")?.value.trim() || '',
        reasonForStay: document.getElementById("reasonForStay")?.value || ''
      };
    default:
      return {};
  }
}

// Validate form data
function validateForm(formData) {
  // Check required fields
  const requiredFields = ['username', 'firstName', 'lastName', 'email', 'phone', 'role', 'password'];
  for (const field of requiredFields) {
    if (!formData[field]) {
      return `Please fill in all required fields!`;
    }
  }

  // Check passwords match
  if (formData.password !== formData.confirmPassword) {
    return "Passwords do not match!";
  }

  // Validate password strength
  const passwordError = validatePassword(formData.password);
  if (passwordError) {
    return passwordError;
  }

  // Check terms agreement
  const termsCheck = document.getElementById('termsCheck');
  if (!termsCheck.checked) {
    return "Please accept the Terms & Conditions to continue.";
  }

  return null;
}

// Validate password strength
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

// Submit form data to backend
async function submitFormToBackend(formData) {
  const API_BASE_URL = 'https://linqs-backend.onrender.com/api';
  
  console.log("Attempting to connect to backend...");

  // Test backend connection first
  try {
    const testResponse = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
    console.log("Backend connection test:", testResponse.data);
  } catch (testError) {
    console.warn("Backend health check failed, but continuing...");
  }

  const response = await axios.post(`${API_BASE_URL}/auth/register`, {
    username: formData.username,
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    phone: formData.phone,
    role: formData.role,
    password: formData.password,
    ...formData
  }, {
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  console.log('Signup response status:', response.status);
  console.log('Signup response data:', response.data);

  if (response.status === 201 || response.status === 200) {
    handleSuccessfulSignup(response.data, formData);
  }
}

// Handle successful signup
function handleSuccessfulSignup(responseData, formData) {
  // Save token and user info
  if (responseData.token) {
    localStorage.setItem("token", responseData.token);
  }
  if (responseData.user) {
    localStorage.setItem("user", JSON.stringify(responseData.user));
    localStorage.setItem("username", responseData.user.username || formData.username);
    localStorage.setItem("fullName", `${formData.firstName} ${formData.lastName}`);
  }

  // Clear saved form data
  localStorage.removeItem('signupFormData');

  alert("Signup successful! Redirecting...");

  // Redirect based on role
  setTimeout(() => {
    const userRole = responseData.user?.role || formData.role;
    redirectBasedOnRole(userRole);
  }, 1000);
}

// Redirect user based on their role
function redirectBasedOnRole(role) {
  switch (role) {
    case "landlord":
      window.location.href = "landlord-dashboard.html";
      break;
    case "tenant":
      window.location.href = "tenant-dashboard.html"; // You'll create this
      break;
    default:
      window.location.href = "index.html";
  }
}

// Handle signup errors
function handleSignupError(error) {
  let errorMessage = "Signup failed: ";
  
  if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
    errorMessage += "Cannot connect to the server. Please check your internet connection.";
  } else if (error.code === 'ECONNREFUSED') {
    errorMessage += "Connection refused. Please try again later.";
  } else if (error.response) {
    errorMessage += error.response.data?.message || 
                   error.response.data?.error || 
                   `Server error: ${error.response.status}`;
  } else if (error.request) {
    errorMessage += "No response received from server. Please try again.";
  } else {
    errorMessage += error.message;
  }
  
  alert(errorMessage);
}