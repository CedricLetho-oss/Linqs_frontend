// navbar.js - Enhanced with User Dropdown & Dynamic Navigation & Beautiful Logout Modal
document.addEventListener('DOMContentLoaded', function() {
    initializeNavbar();
    createLogoutModal(); // Create the logout modal on page load
});

function initializeNavbar() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    updateNavbarAuthState(token, user);
    setupNavbarEventListeners();
}

function createLogoutModal() {
    // Create the logout modal HTML
    const modalHTML = `
        <div class="modal fade" id="logoutModal" tabindex="-1" aria-labelledby="logoutModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header border-0">
                        <div class="modal-title d-flex align-items-center w-100">
                            <div class="logout-icon-container bg-light rounded-circle p-3 me-3">
                                <i class="bi bi-box-arrow-right text-primary fs-4"></i>
                            </div>
                            <div>
                                <h5 class="mb-0 text-navy" id="logoutModalLabel">Ready to leave?</h5>
                                <small class="text-muted">Confirm your logout</small>
                            </div>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body py-4">
                        <div class="text-center">
                            <i class="bi bi-person-check text-primary fs-1 mb-3 d-block"></i>
                            <p class="mb-3">You're currently logged in as <strong id="logoutUsername"></strong></p>
                            <p class="text-muted mb-0">Are you sure you want to log out? You'll need to sign in again to access your account.</p>
                        </div>
                    </div>
                    <div class="modal-footer border-0 justify-content-center">
                        <button type="button" class="btn btn-outline-secondary px-4" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle me-2"></i>Cancel
                        </button>
                        <button type="button" class="btn btn-primary px-4" id="confirmLogout">
                            <i class="bi bi-box-arrow-right me-2"></i>Yes, Logout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add the modal to the body if it doesn't exist
    if (!document.getElementById('logoutModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add event listener for the confirm logout button
        document.getElementById('confirmLogout').addEventListener('click', performLogout);
    }
}

function updateNavbarAuthState(token, user) {
    const authButtons = document.querySelector('.signup-login-buttons');
    const navbarNav = document.querySelector('#navbarNav .navbar-nav');
    
    if (!authButtons) return;

    if (token && user.username) {
        // User is logged in - show user dropdown
        authButtons.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-outline-light dropdown-toggle d-flex align-items-center" type="button" id="userDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="bi bi-person-circle me-2"></i>
                    ${user.username}
                </button>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                    <li>
                        <div class="dropdown-header text-navy">
                            <strong>${user.firstName || user.username}</strong>
                            <br>
                            <small class="text-muted">${getRoleDisplayName(user.role)}</small>
                        </div>
                    </li>
                    <li><hr class="dropdown-divider"></li>
                    <li>
                        <a class="dropdown-item" href="profile.html">
                            <i class="bi bi-person me-2"></i>My Profile
                        </a>
                    </li>
                    ${user.role === 'student' || user.role === 'tenant' ? `
                    <li>
                        <a class="dropdown-item" href="view-reports.html">
                            <i class="bi bi-flag me-2"></i>My Reports
                        </a>
                    </li>
                    <li>
                        <a class="dropdown-item" href="my-favorites.html">
                            <i class="bi bi-suit-heart me-2"></i>My Favorites
                        </a>
                    </li>
                    ` : ''}
                    <li>
                        <a class="dropdown-item" href="${user.role === 'landlord' ? 'landlord-about-us.html' : 'about-us.html'}">
                            <i class="bi bi-info-circle me-2"></i>About Us
                        </a>
                    </li>
                    <li><hr class="dropdown-divider"></li>
                    <li>
                        <a class="dropdown-item text-danger" href="#" onclick="showLogoutModal('${user.username}')">
                            <i class="bi bi-box-arrow-right me-2"></i>Logout
                        </a>
                    </li>
                </ul>
            </div>
        `;
        
        // Update navigation links for logged-in users
        if (navbarNav) {
            // Clear existing navigation links
            navbarNav.innerHTML = '';
            
            // Role-specific navigation
            if (user.role === 'student' || user.role === 'tenant') {
                // Student/Tenant navbar: Home, Listings, My Bookings, Help
                const studentLinks = [
                    { href: 'home.html', icon: 'bi-house-door-fill', text: 'Home' },
                    { href: 'listings.html', icon: 'bi-building', text: 'Listings' },
                    { href: 'my-bookings.html', icon: 'bi-journals', text: 'My Bookings' },
                    { href: 'help.html', icon: 'bi-question-circle-fill', text: 'Help' }
                ];
                
                studentLinks.forEach(link => {
                    const navItem = document.createElement('li');
                    navItem.className = 'nav-item';
                    navItem.innerHTML = `
                        <a class="nav-link" href="${link.href}">
                            <i class="${link.icon} me-1"></i>${link.text}
                        </a>
                    `;
                    navbarNav.appendChild(navItem);
                });
                
            } else if (user.role === 'landlord') {
                // Landlord navbar: Dashboard, Properties, Bookings, Reports, Analytics, Help
                const landlordLinks = [
                    { href: 'landlord-dashboard.html', icon: 'bi-speedometer2', text: 'Dashboard' },
                    { href: 'manage-properties.html', icon: 'bi-building', text: 'Properties' },
                    { href: 'landlord-booking.html', icon: 'bi-journals', text: 'Bookings' },
                    { href: 'landlord-reports.html', icon: 'bi-flag', text: 'Reports' },
                    { href: 'landlord-analytics.html', icon: 'bi-bar-chart', text: 'Analytics' },
                    { href: 'landlord-help.html', icon: 'bi-question-circle-fill', text: 'Help' }
                ];
                
                landlordLinks.forEach(link => {
                    const navItem = document.createElement('li');
                    navItem.className = 'nav-item';
                    navItem.innerHTML = `
                        <a class="nav-link" href="${link.href}">
                            <i class="${link.icon} me-1"></i>${link.text}
                        </a>
                    `;
                    navbarNav.appendChild(navItem);
                });
            }
        }
        
        // Add mobile-specific dropdown positioning fix
        setupMobileDropdownFix();
        
    } else {
        // User is not logged in - show login/signup buttons and basic navigation
        authButtons.innerHTML = `
            <a href="authorization.html" class="btn btn-outline-light me-2 nav-btn">
                <i class="bi bi-box-arrow-in-right me-1"></i>Login
            </a>
            <a href="signup.html" class="btn btn-primary nav-btn">
                <i class="bi bi-person-plus me-1"></i>Sign Up
            </a>
        `;
        
        // For non-logged in users - basic navigation
        if (navbarNav) {
            navbarNav.innerHTML = `
                <li class="nav-item">
                    <a class="nav-link" href="home.html">
                        <i class="bi bi-house-door-fill"></i> Home
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="listings.html">
                        <i class="bi bi-building"></i> Listings
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="help.html">
                        <i class="bi bi-question-circle-fill"></i> Help
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="about-us.html">
                        <i class="bi bi-info-circle me-1"></i>About Us
                    </a>
                </li>
            `;
        }
    }
}

// NEW FUNCTION: Mobile dropdown positioning fix
// UPDATED FUNCTION: Mobile dropdown positioning fix - More compact
function setupMobileDropdownFix() {
    const userDropdown = document.getElementById('userDropdown');
    if (!userDropdown) return;

    // Add event listener for dropdown show event
    userDropdown.addEventListener('show.bs.dropdown', function() {
        const dropdownMenu = this.nextElementSibling;
        if (dropdownMenu && window.innerWidth < 992) { // Bootstrap's lg breakpoint
            // More compact positioning
            dropdownMenu.style.position = 'fixed';
            dropdownMenu.style.top = '60px'; // Position just below navbar
            dropdownMenu.style.right = '15px';
            dropdownMenu.style.left = 'auto';
            dropdownMenu.style.transform = 'none';
            dropdownMenu.style.width = '250px'; // Reduced width
            dropdownMenu.style.maxHeight = '70vh'; // Limit height
            dropdownMenu.style.overflowY = 'auto'; // Add scroll if needed
            dropdownMenu.style.zIndex = '1060';
            dropdownMenu.style.borderRadius = '10px';
            dropdownMenu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            
            // Make dropdown content more compact
            const dropdownHeader = dropdownMenu.querySelector('.dropdown-header');
            if (dropdownHeader) {
                dropdownHeader.style.padding = '0.5rem 1rem';
            }
            
            const dropdownItems = dropdownMenu.querySelectorAll('.dropdown-item');
            dropdownItems.forEach(item => {
                item.style.padding = '0.5rem 1rem';
                item.style.fontSize = '0.9rem';
            });
            
            const dividers = dropdownMenu.querySelectorAll('.dropdown-divider');
            dividers.forEach(divider => {
                divider.style.margin = '0.3rem 0';
            });
        }
    });

    // Reset styles when dropdown is hidden
    userDropdown.addEventListener('hide.bs.dropdown', function() {
        const dropdownMenu = this.nextElementSibling;
        if (dropdownMenu) {
            dropdownMenu.style.position = '';
            dropdownMenu.style.top = '';
            dropdownMenu.style.right = '';
            dropdownMenu.style.left = '';
            dropdownMenu.style.transform = '';
            dropdownMenu.style.width = '';
            dropdownMenu.style.maxHeight = '';
            dropdownMenu.style.overflowY = '';
            dropdownMenu.style.zIndex = '';
            dropdownMenu.style.borderRadius = '';
            dropdownMenu.style.boxShadow = '';
            
            // Reset content styles
            const dropdownHeader = dropdownMenu.querySelector('.dropdown-header');
            if (dropdownHeader) {
                dropdownHeader.style.padding = '';
            }
            
            const dropdownItems = dropdownMenu.querySelectorAll('.dropdown-item');
            dropdownItems.forEach(item => {
                item.style.padding = '';
                item.style.fontSize = '';
            });
            
            const dividers = dropdownMenu.querySelectorAll('.dropdown-divider');
            dividers.forEach(divider => {
                divider.style.margin = '';
            });
        }
    });
    
    // Close dropdown when clicking outside on mobile
    document.addEventListener('click', function(event) {
        if (window.innerWidth < 992 && userDropdown && !userDropdown.contains(event.target)) {
            const dropdownMenu = userDropdown.nextElementSibling;
            if (dropdownMenu && dropdownMenu.classList.contains('show')) {
                bootstrap.Dropdown.getInstance(userDropdown).hide();
            }
        }
    });
}

function showLogoutModal(username) {
    // Set the username in the modal
    document.getElementById('logoutUsername').textContent = username;
    
    // Show the modal
    const logoutModal = new bootstrap.Modal(document.getElementById('logoutModal'));
    logoutModal.show();
}

function performLogout() {
    // Close the modal first
    const logoutModal = bootstrap.Modal.getInstance(document.getElementById('logoutModal'));
    logoutModal.hide();
    
    // Clear authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Dispatch custom event to update navbar
    window.dispatchEvent(new Event('userAuthChange'));
    
    // Show a brief success message (optional)
    showLogoutSuccess();
    
    // Redirect to home page after a short delay
    setTimeout(() => {
        window.location.href = 'home.html';
    }, 1500);
}

function showLogoutSuccess() {
    // Create a temporary success message
    const successHTML = `
        <div class="position-fixed top-0 start-50 translate-middle-x p-3" style="z-index: 9999;">
            <div class="toast align-items-center text-white bg-success border-0 show" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="bi bi-check-circle-fill me-2"></i>
                        Successfully logged out
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', successHTML);
    
    // Remove the toast after 3 seconds
    setTimeout(() => {
        const toast = document.querySelector('.toast');
        if (toast) {
            toast.remove();
        }
    }, 3000);
}

function getRoleDisplayName(role) {
    const roleNames = {
        'student': 'Student',
        'landlord': 'Landlord',
        'tenant': 'Tenant', // ADDED tenant role display
        'admin': 'Administrator'
    };
    return roleNames[role] || 'User';
}

function setupNavbarEventListeners() {
    // Listen for storage changes to update navbar when login status changes
    window.addEventListener('storage', function(e) {
        if (e.key === 'token' || e.key === 'user') {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            updateNavbarAuthState(token, user);
        }
    });
    
    // Custom event for login/logout (for same-tab updates)
    window.addEventListener('userAuthChange', function() {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        updateNavbarAuthState(token, user);
    });
}

// Function to trigger navbar update from other pages
function updateNavbar() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    updateNavbarAuthState(token, user);
}

// Enhanced authorization check for protected pages
function requireAuth(redirectUrl = 'authorization.html') {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || !user.id) {
        alert('Please log in to access this page.');
        window.location.href = redirectUrl;
        return false;
    }
    
    return true;
}

// Role-based access control - UPDATED to include tenants with students
function requireRole(allowedRoles, redirectUrl = 'home.html') {
    if (!requireAuth()) return false;
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Special handling: if student is allowed, tenant should also be allowed
    const effectiveAllowedRoles = [...allowedRoles];
    if (allowedRoles.includes('student') && !allowedRoles.includes('tenant')) {
        effectiveAllowedRoles.push('tenant');
    }
    if (allowedRoles.includes('tenant') && !allowedRoles.includes('student')) {
        effectiveAllowedRoles.push('student');
    }
    
    if (!effectiveAllowedRoles.includes(user.role)) {
        alert('You do not have permission to access this page.');
        window.location.href = redirectUrl;
        return false;
    }
    
    return true;
}

// Check if user is student or tenant (for student/tenant pages)
function isStudentOrTenant() {
    const user = getCurrentUser();
    return user.role === 'student' || user.role === 'tenant';
}

// Check if user is landlord
function isLandlord() {
    const user = getCurrentUser();
    return user.role === 'landlord';
}

// Get current user info
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('user') || '{}');
}

// Check if user is logged in
function isLoggedIn() {
    return !!localStorage.getItem('token');
}

// Get user role
function getUserRole() {
    const user = getCurrentUser();
    return user.role || 'student';
}

// Student/Tenant specific authorization
function requireStudentOrTenant(redirectUrl = 'home.html') {
    if (!requireAuth()) return false;
    
    const user = getCurrentUser();
    if (user.role !== 'student' && user.role !== 'tenant') {
        alert('This page is for students and tenants only.');
        window.location.href = redirectUrl;
        return false;
    }
    
    return true;
}

// Landlord specific authorization
function requireLandlord(redirectUrl = 'home.html') {
    if (!requireAuth()) return false;
    
    const user = getCurrentUser();
    if (user.role !== 'landlord') {
        alert('This page is for landlords only.');
        window.location.href = redirectUrl;
        return false;
    }
    
    return true;
}