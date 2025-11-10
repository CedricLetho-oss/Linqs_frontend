// navbar.js - Enhanced with User Dropdown & Dynamic Navigation & Beautiful Logout Modal & Mode Switching
document.addEventListener('DOMContentLoaded', function() {
    initializeNavbar();
    createLogoutModal();
});

// API base URL
const API_BASE_URL = window.API_BASE_URL || 'https://linqs-backend.onrender.com/api';

// Update the initializeNavbar function
async function initializeNavbar() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (token && user.role === 'student') {
        await ensureBookingModeLoaded();
    }
    
    updateNavbarAuthState(token, user);
    setupNavbarEventListeners();
}

async function loadBookingModeFromBackend() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/users/booking-mode`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const bookingMode = data.booking_mode || 'student';
            
            localStorage.setItem('booking_mode', bookingMode);
            
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            user.booking_mode = bookingMode;
            localStorage.setItem('user', JSON.stringify(user));
        }
    } catch (error) {
        console.error('Error loading booking mode:', error);
        const bookingMode = localStorage.getItem('booking_mode') || 'student';
        localStorage.setItem('booking_mode', bookingMode);
    }
}

async function updateBookingModeOnBackend(mode) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/users/booking-mode`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ booking_mode: mode })
        });

        if (response.ok) {
            return true;
        } else {
            const errorData = await response.json();
            console.error('Backend update failed:', errorData);
            return false;
        }
    } catch (error) {
        console.error('Error updating booking mode:', error);
        return false;
    }
}

function createLogoutModal() {
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
    
    if (!document.getElementById('logoutModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.getElementById('confirmLogout').addEventListener('click', performLogout);
    }
}

function updateNavbarAuthState(token, user) {
    const authButtons = document.querySelector('.signup-login-buttons');
    const navbarNav = document.querySelector('#navbarNav .navbar-nav');
    
    if (!authButtons) return;

    if (token && user.username) {
        const currentMode = getCurrentBookingMode();
        const modeDisplay = getModeDisplayName(currentMode);
        const modeBadgeClass = getModeBadgeClass(currentMode);
        
        authButtons.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-outline-light dropdown-toggle d-flex align-items-center" type="button" id="userDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="bi bi-person-circle me-2"></i>
                    ${user.username}
                    ${user.role === 'student' ? `<span class="badge ${modeBadgeClass} ms-2">${modeDisplay}</span>` : ''}
                </button>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                    <li>
                        <div class="dropdown-header text-navy">
                            <strong>${user.firstName || user.username}</strong>
                            <br>
                            <small class="text-muted">${getRoleDisplayName(user.role)}</small>
                            ${user.role === 'student' ? `<br><small class="${getModeTextClass(currentMode)}"><i class="bi bi-clock"></i> ${modeDisplay} Mode</small>` : ''}
                        </div>
                    </li>
                    <li><hr class="dropdown-divider"></li>
                    
                    ${user.role === 'student' ? `
                    <li>
                        <div class="dropdown-item-text px-3 py-2">
                            <small class="text-muted d-block mb-1">Booking Mode:</small>
                            <div class="btn-group w-100" role="group">
                                <button type="button" class="btn btn-sm ${currentMode === 'student' ? 'btn-primary' : 'btn-outline-primary'}" onclick="switchBookingMode('student')">
                                    <i class="bi bi-mortarboard me-1"></i>Student
                                </button>
                                <button type="button" class="btn btn-sm ${currentMode === 'tenant' ? 'btn-warning' : 'btn-outline-warning'}" onclick="switchBookingMode('tenant')">
                                    <i class="bi bi-briefcase me-1"></i>Short-term
                                </button>
                            </div>
                        </div>
                    </li>
                    <li><hr class="dropdown-divider"></li>
                    ` : ''}
                    
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
        
        if (navbarNav) {
            navbarNav.innerHTML = '';
            
            if (user.role === 'student' || user.role === 'tenant') {
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
        
        setupMobileDropdownFix();
        
    } else {
        authButtons.innerHTML = `
            <a href="authorization.html" class="btn btn-outline-light me-2 nav-btn">
                <i class="bi bi-box-arrow-in-right me-1"></i>Login
            </a>
            <a href="signup.html" class="btn btn-primary nav-btn">
                <i class="bi bi-person-plus me-1"></i>Sign Up
            </a>
        `;
        
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

function getCurrentBookingMode() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'student') {
        return 'student';
    }
    return localStorage.getItem('booking_mode') || 'student';
}

function getModeDisplayName(mode) {
    const modeNames = {
        'student': 'Student',
        'tenant': 'Short-term'
    };
    return modeNames[mode] || 'Student';
}

function getModeBadgeClass(mode) {
    const badgeClasses = {
        'student': 'bg-primary',
        'tenant': 'bg-warning text-dark'
    };
    return badgeClasses[mode] || 'bg-primary';
}

function getModeTextClass(mode) {
    const textClasses = {
        'student': 'text-primary',
        'tenant': 'text-warning'
    };
    return textClasses[mode] || 'text-primary';
}

async function switchBookingMode(mode) {
    const currentMode = getCurrentBookingMode();
    
    if (currentMode === mode) {
        return;
    }
    
    const buttons = document.querySelectorAll('.btn-group .btn');
    buttons.forEach(btn => {
        btn.disabled = true;
        if (btn.textContent.toLowerCase().includes(mode)) {
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Switching...';
        }
    });
    
    const success = await updateBookingModeOnBackend(mode);
    
    buttons.forEach(btn => {
        btn.disabled = false;
        if (btn.textContent.includes('Switching')) {
            btn.innerHTML = mode === 'student' ? '<i class="bi bi-mortarboard me-1"></i>Student' : '<i class="bi bi-briefcase me-1"></i>Short-term';
        }
    });
    
    if (success) {
        localStorage.setItem('booking_mode', mode);
        
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        user.booking_mode = mode;
        localStorage.setItem('user', JSON.stringify(user));
        
        const dropdown = bootstrap.Dropdown.getInstance(document.getElementById('userDropdown'));
        if (dropdown) {
            dropdown.hide();
        }
        
        showModeSwitchSuccess(mode);
        
        setTimeout(() => {
            updateNavbar();
        }, 100);
        
        setTimeout(() => {
            if (shouldReloadPageOnModeChange()) {
                window.location.reload();
            }
        }, 500);
    } else {
        showToast('Failed to update booking mode. Please try again.', 'error');
    }
}

function showModeSwitchSuccess(mode) {
    const modeName = getModeDisplayName(mode);
    const toastHTML = `
        <div class="position-fixed top-0 start-50 translate-middle-x p-3" style="z-index: 9999;">
            <div class="toast align-items-center text-white bg-success border-0 show" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="bi bi-check-circle-fill me-2"></i>
                        Switched to <strong>${modeName} Mode</strong>
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', toastHTML);
    
    setTimeout(() => {
        const toast = document.querySelector('.toast');
        if (toast) {
            toast.remove();
        }
    }, 3000);
}

function showToast(message, type = 'info', duration = 5000) {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `custom-toast ${type} toast-show`;
    
    let iconClass, title;
    switch(type) {
        case 'success':
            iconClass = 'bi-check-lg';
            title = 'Success';
            break;
        case 'error':
            iconClass = 'bi-x-circle';
            title = 'Error';
            break;
        case 'warning':
            iconClass = 'bi-exclamation-triangle';
            title = 'Warning';
            break;
        case 'info':
        default:
            iconClass = 'bi-info-circle';
            title = 'Info';
    }

    toast.innerHTML = `
        <div class="toast-header">
            <div class="d-flex align-items-center w-100">
                <div class="toast-icon ${type}">
                    <i class="bi ${iconClass}"></i>
                </div>
                <strong class="toast-title me-auto">${title}</strong>
                <button type="button" class="btn-close" onclick="removeToast('${toastId}')"></button>
            </div>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;

    toastContainer.appendChild(toast);

    if (duration > 0) {
        setTimeout(() => {
            removeToast(toastId);
        }, duration);
    }

    return toastId;
}

function removeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.classList.remove('toast-show');
        toast.classList.add('toast-hide');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
}

function shouldReloadPageOnModeChange() {
    const reloadPages = [
        'home.html',
        'index.html',
        'listings.html',
        'my-bookings.html',
        'bookings.html'
    ];
    
    const currentPage = window.location.pathname.split('/').pop();
    return reloadPages.includes(currentPage);
}

function setupMobileDropdownFix() {
    const userDropdown = document.getElementById('userDropdown');
    if (!userDropdown) return;

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isStudent = user.role === 'student';

    userDropdown.addEventListener('show.bs.dropdown', function() {
        const dropdownMenu = this.nextElementSibling;
        if (dropdownMenu && window.innerWidth < 992) {
            const viewportHeight = window.innerHeight;
            const navbarHeight = 60;
            const availableHeight = viewportHeight - navbarHeight - 10;

            // Apply mobile positioning for ALL users
            dropdownMenu.style.position = 'fixed';
            dropdownMenu.style.top = navbarHeight + 'px';
            dropdownMenu.style.right = '10px';
            dropdownMenu.style.left = 'auto';
            dropdownMenu.style.transform = 'none';
            dropdownMenu.style.width = '280px';
            dropdownMenu.style.maxWidth = 'calc(100vw - 20px)';
            dropdownMenu.style.maxHeight = Math.min(availableHeight, 500) + 'px';
            dropdownMenu.style.overflowY = 'auto';
            dropdownMenu.style.zIndex = '1060';
            dropdownMenu.style.borderRadius = '8px';
            dropdownMenu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            
            // ONLY apply compact styling for STUDENTS
            if (isStudent) {
                const dropdownHeader = dropdownMenu.querySelector('.dropdown-header');
                if (dropdownHeader) {
                    dropdownHeader.style.padding = '0.75rem 1rem';
                }
                
                const dropdownItems = dropdownMenu.querySelectorAll('.dropdown-item');
                dropdownItems.forEach(item => {
                    item.style.padding = '0.6rem 1rem';
                });
                
                const modeSection = dropdownMenu.querySelector('.dropdown-item-text');
                if (modeSection) {
                    modeSection.style.padding = '0.6rem 1rem';
                    
                    const modeLabel = modeSection.querySelector('.text-muted');
                    if (modeLabel) {
                        modeLabel.style.fontSize = '0.8rem';
                        modeLabel.style.marginBottom = '0.3rem';
                    }
                    
                    const modeButtons = modeSection.querySelectorAll('.btn-group .btn');
                    modeButtons.forEach(btn => {
                        btn.style.padding = '0.3rem 0.6rem';
                        btn.style.fontSize = '0.8rem';
                    });
                }
                
                const dividers = dropdownMenu.querySelectorAll('.dropdown-divider');
                dividers.forEach(divider => {
                    divider.style.margin = '0.3rem 0';
                });
            }
        }
    });

    userDropdown.addEventListener('hide.bs.dropdown', function() {
        const dropdownMenu = this.nextElementSibling;
        if (dropdownMenu) {
            // Reset all inline styles for ALL users
            const stylesToReset = [
                'position', 'top', 'right', 'left', 'transform', 'width', 
                'maxWidth', 'maxHeight', 'overflowY', 'zIndex', 'borderRadius', 
                'boxShadow'
            ];
            
            stylesToReset.forEach(style => {
                dropdownMenu.style[style] = '';
            });
            
            // Reset child element styles
            const elementsToReset = [
                '.dropdown-header',
                '.dropdown-item', 
                '.dropdown-item-text',
                '.btn-group .btn',
                '.dropdown-divider',
                '.text-muted'
            ];
            
            elementsToReset.forEach(selector => {
                const elements = dropdownMenu.querySelectorAll(selector);
                elements.forEach(element => {
                    element.style = '';
                });
            });
        }
    });
    
    // Close dropdown when clicking outside on mobile
    document.addEventListener('click', function(event) {
        if (window.innerWidth < 992 && userDropdown && !userDropdown.contains(event.target)) {
            const dropdownMenu = userDropdown.nextElementSibling;
            if (dropdownMenu && dropdownMenu.classList.contains('show')) {
                const bsDropdown = bootstrap.Dropdown.getInstance(userDropdown);
                if (bsDropdown) {
                    bsDropdown.hide();
                }
            }
        }
    });
}

function showLogoutModal(username) {
    document.getElementById('logoutUsername').textContent = username;
    const logoutModal = new bootstrap.Modal(document.getElementById('logoutModal'));
    logoutModal.show();
}

function performLogout() {
    const logoutModal = bootstrap.Modal.getInstance(document.getElementById('logoutModal'));
    logoutModal.hide();
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    window.dispatchEvent(new Event('userAuthChange'));
    
    showLogoutSuccess();
    
    setTimeout(() => {
        window.location.href = 'home.html';
    }, 1500);
}

function showLogoutSuccess() {
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
        'tenant': 'Tenant',
        'admin': 'Administrator'
    };
    return roleNames[role] || 'User';
}

function setupNavbarEventListeners() {
    window.addEventListener('storage', function(e) {
        if (e.key === 'token' || e.key === 'user') {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            updateNavbarAuthState(token, user);
        }
    });
    
    window.addEventListener('userAuthChange', function() {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        updateNavbarAuthState(token, user);
    });
    
    window.addEventListener('bookingModeChanged', function(e) {
        updateNavbar();
    });
}

function updateNavbar() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    updateNavbarAuthState(token, user);
}

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

function requireRole(allowedRoles, redirectUrl = 'home.html') {
    if (!requireAuth()) return false;
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
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

function isStudentOrTenant() {
    const user = getCurrentUser();
    return user.role === 'student' || user.role === 'tenant';
}

function isLandlord() {
    const user = getCurrentUser();
    return user.role === 'landlord';
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem('user') || '{}');
}

function isLoggedIn() {
    return !!localStorage.getItem('token');
}

function getUserRole() {
    const user = getCurrentUser();
    return user.role || 'student';
}

function getCurrentBookingMode() {
    const user = getCurrentUser();
    if (user.role !== 'student') {
        return 'student';
    }
    return localStorage.getItem('booking_mode') || 'student';
}

function isStudentMode() {
    return getCurrentBookingMode() === 'student';
}

function isTenantMode() {
    return getCurrentBookingMode() === 'tenant';
}

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

// Add this function to navbar.js
async function ensureBookingModeLoaded() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (user.role === 'student') {
        // If booking_mode doesn't exist in user object, fetch from backend
        if (!user.booking_mode) {
            await loadBookingModeFromBackend();
        }
        
        // Ensure localStorage booking_mode is in sync
        const currentBookingMode = user.booking_mode || 'student';
        localStorage.setItem('booking_mode', currentBookingMode);
    }
}