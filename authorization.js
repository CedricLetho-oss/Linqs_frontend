// authorization.js - ENHANCED WITH BEAUTIFUL TOASTS AND MODALS
const API_BASE_URL = 'https://linqs-backend.onrender.com/api';

// Create Toast System
function createToastSystem() {
  const toastContainer = document.createElement('div');
  toastContainer.id = 'toastContainer';
  toastContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    max-width: 400px;
  `;
  document.body.appendChild(toastContainer);
}

// Show Toast Function
function showToast(message, type = 'info', duration = 5000) {
  const toastContainer = document.getElementById('toastContainer') || createToastSystem();
  
  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;
  toast.style.cssText = `
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
    color: white;
    padding: 1rem 1.5rem;
    margin-bottom: 0.5rem;
    border-radius: 10px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    animation: slideInRight 0.3s ease, fadeOut 0.3s ease ${duration}ms forwards;
    cursor: pointer;
    border-left: 4px solid ${type === 'success' ? '#059669' : type === 'error' ? '#dc2626' : type === 'warning' ? '#d97706' : '#2563eb'};
  `;

  const icons = {
    success: 'bi-check-circle-fill',
    error: 'bi-exclamation-triangle-fill',
    warning: 'bi-exclamation-circle-fill',
    info: 'bi-info-circle-fill'
  };

  toast.innerHTML = `
    <i class="bi ${icons[type]}" style="font-size: 1.25rem;"></i>
    <div style="flex: 1;">
      <div style="font-weight: 600; margin-bottom: 0.25rem;">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
      <div style="font-size: 0.9rem; opacity: 0.9;">${message}</div>
    </div>
    <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; padding: 0.25rem;">
      <i class="bi bi-x" style="font-size: 1.1rem;"></i>
    </button>
  `;

  toastContainer.appendChild(toast);

  // Auto remove after duration
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);

  // Click to dismiss
  toast.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
      toast.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }
  });
}

// Create Forgot Password Modal
function createForgotPasswordModal() {
  const modalHTML = `
    <div class="modal fade" id="forgotPasswordModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content" style="border-radius: 15px; border: none; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
          <div class="modal-header border-0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px 15px 0 0; color: white;">
            <h5 class="modal-title">
              <i class="bi bi-key-fill me-2"></i>
              Reset Your Password
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            <p class="text-muted mb-3">Enter your email address and we'll send you a link to reset your password.</p>
            <form id="forgotPasswordForm">
              <div class="mb-3">
                <label for="forgotPasswordEmail" class="form-label">Email Address</label>
                <input type="email" class="form-control" id="forgotPasswordEmail" placeholder="Enter your email" required>
              </div>
              <div class="d-grid gap-2">
                <button type="submit" class="btn btn-primary py-2">
                  <span class="btn-text">Send Reset Link</span>
                  <div class="spinner-border spinner-border-sm" style="display: none;"></div>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Create Success Modal
function createSuccessModal() {
  const modalHTML = `
    <div class="modal fade" id="successModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content text-center" style="border-radius: 15px; border: none; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
          <div class="modal-body p-4">
            <div class="mb-3" style="font-size: 3rem; color: #10b981;">
              <i class="bi bi-check-circle-fill"></i>
            </div>
            <h5 class="mb-2">Email Sent!</h5>
            <p class="text-muted mb-3" style="font-size: 0.9rem;">
              If an account with that email exists, we've sent a password reset link.
            </p>
            <button type="button" class="btn btn-primary w-100" data-bs-dismiss="modal">
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Create Login Success Modal
function createLoginSuccessModal() {
  const modalHTML = `
    <div class="modal fade" id="loginSuccessModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content text-center" style="border-radius: 15px; border: none; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
          <div class="modal-body p-4">
            <div class="mb-3" style="font-size: 3rem; color: #10b981;">
              <i class="bi bi-check-circle-fill"></i>
            </div>
            <h5 class="mb-2">Welcome Back!</h5>
            <p class="text-muted mb-3" style="font-size: 0.9rem;">
              Login successful! Redirecting you now...
            </p>
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Enhanced Login Handler
document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  console.log("Login form submitted, preventing default behavior");

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    showToast("Please enter both email and password.", "warning");
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

    // Show success modal instead of alert
    const loginSuccessModal = new bootstrap.Modal(document.getElementById('loginSuccessModal'));
    loginSuccessModal.show();

    // Role-based redirect - ONLY STUDENT AND LANDLORD
    const role = response.data.user?.role || 'student';
    setTimeout(() => {
      if (role === "landlord") {
        window.location.href = "landlord-dashboard.html";
      } else {
        window.location.href = "index.html"; // Student goes to index.html
      }
    }, 2000);

  } catch (error) {
    console.error("Login error:", error);
    let errorMessage = "Login failed: ";
    
    if (error.response) {
      // Server responded with error status
      errorMessage = error.response.data?.message || 
                    error.response.data?.error || 
                    "Invalid email or password";
    } else if (error.request) {
      errorMessage = "No response received from server. Please check your connection.";
    } else {
      errorMessage = error.message;
    }
    
    showToast(errorMessage, "error");
  } finally {
    // Reset button state
    if (btnText) btnText.style.display = 'inline';
    if (spinner) spinner.style.display = 'none';
    submitBtn.disabled = false;
  }
});

// Enhanced Forgot Password Handler
function initForgotPasswordHandler() {
  document.getElementById("forgotPassword").addEventListener("click", function (e) {
    e.preventDefault();
    
    const email = document.getElementById("loginEmail").value.trim();
    const forgotPasswordModal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
    
    // Pre-fill email if available
    if (email) {
      document.getElementById('forgotPasswordEmail').value = email;
    }
    
    forgotPasswordModal.show();
  });

  // Handle forgot password form submission
  document.getElementById('forgotPasswordForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const userEmail = document.getElementById('forgotPasswordEmail').value.trim();
    
    if (!userEmail) {
      showToast("Please enter your email address.", "warning");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      showToast("Please enter a valid email address.", "warning");
      return;
    }

    // Show loading state
    const submitBtn = this.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const spinner = submitBtn.querySelector('.spinner-border');
    
    btnText.style.display = 'none';
    spinner.style.display = 'inline-block';
    submitBtn.disabled = true;

    try {
      console.log('Sending password reset request for:', userEmail);
      
      const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
        email: userEmail
      }, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Password reset response:', response.data);
      
      // Close the forgot password modal
      const forgotPasswordModal = bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal'));
      forgotPasswordModal.hide();
      
      // Show success modal
      const successModal = new bootstrap.Modal(document.getElementById('successModal'));
      successModal.show();
      
      // Reset form
      this.reset();

    } catch (error) {
      console.error("Forgot password error:", error);
      
      // For security, still show success message but log the error
      showToast("If an account with that email exists, we've sent a password reset link. Please check your email.", "info");
      
      // Close modal on error too
      const forgotPasswordModal = bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal'));
      forgotPasswordModal.hide();
      
      // Log actual error for debugging
      if (error.response) {
        console.error('Server error:', error.response.data);
      } else if (error.request) {
        console.error('No response received');
      } else {
        console.error('Error:', error.message);
      }
    } finally {
      // Reset button state
      btnText.style.display = 'inline';
      spinner.style.display = 'none';
      submitBtn.disabled = false;
    }
  });
}

// Check login status on page load
document.addEventListener('DOMContentLoaded', function() {
  console.log("Authorization page loaded");
  
  // Initialize toast system and modals
  createToastSystem();
  createForgotPasswordModal();
  createSuccessModal();
  createLoginSuccessModal();
  
  // Initialize forgot password handler
  initForgotPasswordHandler();
  
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
      showToast(`Welcome back ${username}! Redirecting...`, "info");
      
      const role = user.role || 'student';
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
  showToast("You have been logged out successfully.", "info");
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1000);
}

// Make functions globally available
window.logout = logout;
window.showToast = showToast;

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes fadeOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  .toast-message {
    transition: all 0.3s ease;
  }
  
  .modal-backdrop {
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(5px);
  }
`;
document.head.appendChild(style);