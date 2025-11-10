// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  console.log("Authorization page loaded");
  
  initializeAuthorizationPage();
  checkLoginStatus();
});

function initializeAuthorizationPage() {
  createToastSystem();
  createAllModals();
  setupAllEventListeners();
  addCustomCSS();
}

// Enhanced Toast System
function createToastSystem() {
  if (!document.getElementById('toastContainer')) {
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
  return document.getElementById('toastContainer');
}

function showToast(message, type = 'info', duration = 5000) {
  const toastContainer = createToastSystem();
  
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

// Complete Modal System
function createAllModals() {
  createForgotPasswordModal();
  createSuccessModal('successModal', 'Email Sent!', 'If an account with that email exists, we\'ve sent a password reset link.');
  createLoginSuccessModal();
}

function createForgotPasswordModal() {
  if (!document.getElementById('forgotPasswordModal')) {
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
}

function createSuccessModal(id, title, message) {
  if (!document.getElementById(id)) {
    const modalHTML = `
      <div class="modal fade" id="${id}" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered modal-sm">
          <div class="modal-content text-center" style="border-radius: 15px; border: none; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
            <div class="modal-body p-4">
              <div class="mb-3" style="font-size: 3rem; color: #10b981;">
                <i class="bi bi-check-circle-fill"></i>
              </div>
              <h5 class="mb-2">${title}</h5>
              <p class="text-muted mb-3" style="font-size: 0.9rem;">${message}</p>
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
}

function createLoginSuccessModal() {
  if (!document.getElementById('loginSuccessModal')) {
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
}

// Event Listeners Setup
function setupAllEventListeners() {
  setupLoginHandler();
  setupForgotPasswordHandler();
}

function setupLoginHandler() {
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      console.log("Login form submitted, preventing default behavior");

      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;

      if (!email || !password) {
        showToast("Please enter both email and password.", "warning");
        return;
      }

      const submitBtn = this.querySelector('button[type="submit"]');
      setButtonLoadingState(submitBtn, true);

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

        handleLoginSuccess(response.data);

      } catch (error) {
        console.error("Login error:", error);
        handleLoginError(error);
      } finally {
        setButtonLoadingState(submitBtn, false);
      }
    });
  }
}

function setupForgotPasswordHandler() {
  // Forgot password link
  const forgotPasswordLink = document.getElementById("forgotPassword");
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", function (e) {
      e.preventDefault();
      
      const email = document.getElementById("loginEmail").value.trim();
      const modal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
      
      if (email) {
        document.getElementById('forgotPasswordEmail').value = email;
      }
      
      modal.show();
    });
  }

  // Forgot password form submission
  const forgotPasswordForm = document.getElementById('forgotPasswordForm');
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const userEmail = document.getElementById('forgotPasswordEmail').value.trim();
      
      if (!userEmail) {
        showToast("Please enter your email address.", "warning");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userEmail)) {
        showToast("Please enter a valid email address.", "warning");
        return;
      }

      const submitBtn = this.querySelector('button[type="submit"]');
      setButtonLoadingState(submitBtn, true);

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
        setButtonLoadingState(submitBtn, false);
      }
    });
  }
}

// Success Handlers
function handleLoginSuccess(responseData) {
  // Save token and user info
  if (responseData.token) {
    localStorage.setItem("token", responseData.token);
    console.log("Token saved to localStorage");
  }
  if (responseData.user) {
    localStorage.setItem("user", JSON.stringify(responseData.user));
    localStorage.setItem("username", responseData.user.username || responseData.user.name || responseData.user.email.split('@')[0]);
    console.log("User data saved to localStorage");
  }

  // Show success modal
  const loginSuccessModal = new bootstrap.Modal(document.getElementById('loginSuccessModal'));
  loginSuccessModal.show();

  // Role-based redirect - INCLUDES TENANT
  const role = responseData.user?.role || 'student';
  setTimeout(() => {
    redirectBasedOnRole(role);
  }, 2000);
}

// Error Handlers
function handleLoginError(error) {
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
}

// Utility Functions
function setButtonLoadingState(button, isLoading) {
  const btnText = button.querySelector('.btn-text');
  const spinner = button.querySelector('.loading-spinner, .spinner-border');
  
  if (btnText) btnText.style.display = isLoading ? 'none' : 'inline';
  if (spinner) spinner.style.display = isLoading ? 'inline-block' : 'none';
  button.disabled = isLoading;
}

function redirectBasedOnRole(role) {
  if (role === "landlord") {
    window.location.href = "landlord-dashboard.html";
  } else {
    // Both students and tenants go to index.html
    window.location.href = "index.html";
  }
}

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
        redirectBasedOnRole(role);
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

// Add CSS animations
function addCustomCSS() {
  if (!document.getElementById('authCustomCSS')) {
    const style = document.createElement('style');
    style.id = 'authCustomCSS';
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
  }
}

// Make functions globally available
window.logout = logout;
window.showToast = showToast;