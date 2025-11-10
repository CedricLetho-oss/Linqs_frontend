// Admin Users Management Manager - FIXED VERSION
class AdminUsersManager {
    constructor() {
        this.token = localStorage.getItem("token");
        this.user = JSON.parse(localStorage.getItem("user") || "{}");
        this.API_BASE_URL = 'https://linqs-backend.onrender.com/api';
        this.currentPage = 1;
        this.limit = 40;
        this.filters = {};
        this.selectedUsers = new Set();
        this.allUsers = [];
        this.currentEditingUser = null;
        this.init();
    }

    handleTokenExpired() {
        console.log('Token expired, redirecting to login...');
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        alert('Your session has expired. Please log in again.');
        window.location.href = 'admin-login.html';
    }

    async init() {
        console.log('Admin Users Manager initialized');
        this.checkAdminAccess();
        this.setupEventListeners();
        await this.loadUsers();
        this.setupRealTimeUpdates();
    }

    checkAdminAccess() {
        if (this.user.role !== 'admin') {
            alert('Access denied. Admin privileges required.');
            window.location.href = 'index.html';
        }
    }

    setupEventListeners() {
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                document.getElementById('adminSidebar').classList.toggle('collapsed');
                document.getElementById('adminMain').classList.toggle('expanded');
            });
        }

        // Search input with debounce
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.filters.search = e.target.value;
                    this.currentPage = 1;
                    this.loadUsers();
                }, 500);
            });
        }

        // Filter changes
        const roleFilter = document.getElementById('roleFilter');
        if (roleFilter) {
            roleFilter.addEventListener('change', (e) => {
                this.filters.role = e.target.value;
                this.currentPage = 1;
                this.loadUsers();
            });
        }

        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.currentPage = 1;
                this.loadUsers();
            });
        }

        // Select all checkbox
        const selectAll = document.getElementById('selectAll');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                const checkboxes = document.querySelectorAll('.user-checkbox');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                    this.toggleUserSelection(checkbox.value, e.target.checked);
                });
            });
        }

        // Global event delegation for all buttons with data-action
        document.addEventListener('click', (e) => {
            const button = e.target.closest('[data-action]');
            if (!button) return;

            const action = button.getAttribute('data-action');
            const role = button.getAttribute('data-role');
            const status = button.getAttribute('data-status');
            const bulkAction = button.getAttribute('data-bulk-action');
            const userId = button.getAttribute('data-user-id');

            console.log('Button clicked:', { action, role, status, bulkAction, userId });

            switch (action) {
                case 'exportUsers':
                    this.exportUsers();
                    break;
                case 'showAddUserModal':
                    this.showAddUserModal();
                    break;
                case 'filterByRole':
                    this.filterByRole(role);
                    break;
                case 'filterByStatus':
                    this.filterByStatus(status);
                    break;
                case 'applyFilters':
                    this.applyFilters();
                    break;
                case 'previousPage':
                    this.previousPage();
                    break;
                case 'nextPage':
                    this.nextPage();
                    break;
                case 'bulkAction':
                    this.bulkAction(bulkAction);
                    break;
                case 'addUser':
                    this.addUser();
                    break;
                case 'editUser':
                    this.editUser();
                    break;
                case 'viewUser':
                    this.viewUser(userId);
                    break;
                case 'editUserModal':
                    this.editUserModal(userId);
                    break;
                case 'saveUser':
                    this.saveUser();
                    break;
                case 'approveUser':
                    this.approveUser(userId);
                    break;
                case 'suspendUser':
                    this.suspendUser(userId);
                    break;
                case 'activateUser':
                    this.activateUser(userId);
                    break;
                case 'deleteUser':
                    this.deleteUser(userId);
                    break;
                case 'sendVerificationReminder':
                    this.sendVerificationReminder(userId);
                    break;
                case 'goToPage':
                    const page = parseInt(button.getAttribute('data-page'));
                    this.goToPage(page);
                    break;
            }
        });
    }

    async loadUsers() {
        try {
            console.log('Loading users with filters:', this.filters);
            const response = await this.fetchUsers();
            
            if (response.success) {
                this.allUsers = response.data.users || [];
                this.updateUsersTable(response.data);
                this.updatePagination(response.data);
                this.updateUserStats(this.allUsers);
            } else {
                throw new Error(response.error || 'Failed to load users');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Failed to load users: ' + error.message);
            this.showEmptyState();
        }
    }

    async fetchUsers() {
        const params = new URLSearchParams({
            page: this.currentPage,
            limit: this.limit,
            ...this.filters
        });

        let token = localStorage.getItem("token");
        if (token && !token.startsWith('Bearer ')) {
            token = `Bearer ${token}`;
        }

        const response = await fetch(`${this.API_BASE_URL}/admin/users?${params}`, {
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                this.handleTokenExpired();
                throw new Error('Token expired');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    updateUserStats(users) {
        const totalUsers = users.length;
        const landlords = users.filter(u => u.role === 'landlord').length;
        const students = users.filter(u => u.role === 'student').length;
        const tenants = users.filter(u => u.role === 'tenant').length;
        const pending = users.filter(u => u.status === 'pending').length;

        // Safe element updates
        this.safeUpdateElementText('totalUsersCount', totalUsers);
        this.safeUpdateElementText('landlordCount', landlords);
        this.safeUpdateElementText('studentCount', students);
        this.safeUpdateElementText('pendingCount', pending);

        this.updateAnalyticsGrid(totalUsers, landlords, students, tenants, pending);
        this.updateNotificationBadges(pending);
    }

    safeUpdateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    updateAnalyticsGrid(total, landlords, students, tenants, pending) {
        const analyticsGrid = document.querySelector('.analytics-grid');
        if (!analyticsGrid) return;

        analyticsGrid.innerHTML = `
            <div class="analytics-card total">
                <div class="text-primary mb-2">
                    <i class="bi bi-people-fill fs-1"></i>
                </div>
                <h3 class="fw-bold">${total}</h3>
                <p class="text-muted mb-0">Total Users</p>
            </div>
            <div class="analytics-card landlords">
                <div class="text-success mb-2">
                    <i class="bi bi-house-check fs-1"></i>
                </div>
                <h3 class="fw-bold">${landlords}</h3>
                <p class="text-muted mb-0">Landlords</p>
            </div>
            <div class="analytics-card students">
                <div class="text-info mb-2">
                    <i class="bi bi-person-badge fs-1"></i>
                </div>
                <h3 class="fw-bold">${students}</h3>
                <p class="text-muted mb-0">Students</p>
            </div>
            <div class="analytics-card tenants">
                <div class="text-secondary mb-2">
                    <i class="bi bi-briefcase fs-1"></i>
                </div>
                <h3 class="fw-bold">${tenants}</h3>
                <p class="text-muted mb-0">Tenants</p>
            </div>
            <div class="analytics-card pending">
                <div class="text-warning mb-2">
                    <i class="bi bi-clock-history fs-1"></i>
                </div>
                <h3 class="fw-bold">${pending}</h3>
                <p class="text-muted mb-0">Pending Verification</p>
            </div>
        `;
    }

    updateUsersTable(data) {
        const tableBody = document.getElementById('usersTableBody');
        if (!tableBody) return;

        const users = data.users || [];

        if (users.length === 0) {
            this.showEmptyState();
            return;
        }

        tableBody.innerHTML = users.map(user => {
            const firstName = user.firstName || 'Unknown';
            const lastName = user.lastName || 'User';
            const username = user.username || user.email?.split('@')[0] || 'user';
            const email = user.email || 'N/A';
            const phone = user.phone || 'N/A';
            const role = user.role || 'student';
            const status = user.status || 'active';
            const userId = user._id || user.id;
            const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
            const lastActive = user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Never';
            const avatar = user.avatar || 'https://via.placeholder.com/120';

            const userInitials = this.getUserInitials(firstName, lastName);

            return `
                <tr>
                    <td>
                        <input type="checkbox" class="form-check-input user-checkbox" value="${userId}">
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="user-avatar me-3">
                                ${avatar && avatar !== 'https://via.placeholder.com/120' ? 
                                    `<img src="${avatar}" class="rounded-circle" style="width: 50px; height: 50px; object-fit: cover;">` : 
                                    userInitials
                                }
                            </div>
                            <div>
                                <h6 class="mb-0">${firstName} ${lastName}</h6>
                                <small class="text-muted">@${username}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="role-badge role-${role}">
                            ${role.charAt(0).toUpperCase() + role.slice(1)}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge status-${status}">
                            ${status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                    </td>
                    <td>${email}</td>
                    <td>${phone}</td>
                    <td>${joinDate}</td>
                    <td>${lastActive}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary" data-action="viewUser" data-user-id="${userId}">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-warning" data-action="editUserModal" data-user-id="${userId}">
                                <i class="bi bi-pencil"></i>
                            </button>
                            ${this.getStatusActions(user)}
                            <button class="btn btn-sm btn-outline-danger" data-action="deleteUser" data-user-id="${userId}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Add event listeners to checkboxes
        const checkboxes = document.querySelectorAll('.user-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.toggleUserSelection(e.target.value, e.target.checked);
            });
        });

        const total = data.total || users.length;
        const start = (this.currentPage - 1) * this.limit + 1;
        const end = Math.min(this.currentPage * this.limit, total);
        this.safeUpdateElementText('tableInfo', `Showing ${start}-${end} of ${total} users`);
    }

    getStatusActions(user) {
        const status = user.status || 'active';
        const userId = user._id || user.id;
        
        switch (status) {
            case 'pending':
                return `<button class="btn btn-sm btn-outline-success" data-action="approveUser" data-user-id="${userId}">
                            <i class="bi bi-check-circle"></i>
                        </button>`;
            case 'active':
                return `<button class="btn btn-sm btn-outline-warning" data-action="suspendUser" data-user-id="${userId}">
                            <i class="bi bi-slash-circle"></i>
                        </button>`;
            case 'suspended':
                return `<button class="btn btn-sm btn-outline-success" data-action="activateUser" data-user-id="${userId}">
                            <i class="bi bi-check-circle"></i>
                        </button>`;
            default:
                return `<button class="btn btn-sm btn-outline-success" data-action="activateUser" data-user-id="${userId}">
                            <i class="bi bi-check-circle"></i>
                        </button>`;
        }
    }

    showEmptyState() {
        const tableBody = document.getElementById('usersTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-4 text-muted">
                    <i class="bi bi-people fs-1 d-block mb-2"></i>
                    No users found matching your criteria
                </td>
            </tr>
        `;
        
        this.safeUpdateElementText('tableInfo', 'Showing 0-0 of 0 users');
        
        const pagination = document.getElementById('pagination');
        if (pagination) pagination.innerHTML = '';
        
        this.safeUpdateElementText('totalUsersCount', '0');
        this.safeUpdateElementText('landlordCount', '0');
        this.safeUpdateElementText('studentCount', '0');
        this.safeUpdateElementText('pendingCount', '0');
    }

    getUserInitials(firstName, lastName) {
        const first = firstName?.charAt(0) || '';
        const last = lastName?.charAt(0) || '';
        return `${first}${last}`.toUpperCase() || 'U';
    }

    updatePagination(data) {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;

        const totalPages = data.totalPages || 1;
        const total = data.total || 0;

        if (total === 0) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-action="previousPage">
                    <i class="bi bi-chevron-left"></i>
                </a>
            </li>
        `;

        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${this.currentPage === i ? 'active' : ''}">
                    <a class="page-link" href="#" data-action="goToPage" data-page="${i}">${i}</a>
                </li>
            `;
        }

        // Next button
        paginationHTML += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-action="nextPage">
                    <i class="bi bi-chevron-right"></i>
                </a>
            </li>
        `;

        pagination.innerHTML = paginationHTML;
    }

    updateNotificationBadges(pendingCount) {
        const sidebarBadge = document.getElementById('usersNotification');
        if (sidebarBadge) {
            sidebarBadge.textContent = pendingCount > 99 ? '99+' : pendingCount;
            sidebarBadge.style.display = pendingCount > 0 ? 'flex' : 'none';
        }
        
        const headerBadge = document.getElementById('headerNotification');
        if (headerBadge) {
            headerBadge.textContent = pendingCount > 99 ? '99+' : pendingCount;
            headerBadge.style.display = pendingCount > 0 ? 'flex' : 'none';
        }
    }

    // Pagination methods
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadUsers();
        }
    }

    nextPage() {
        this.currentPage++;
        this.loadUsers();
    }

    goToPage(page) {
        this.currentPage = page;
        this.loadUsers();
    }

    // Filter methods
    filterByRole(role) {
        this.filters.role = role;
        this.currentPage = 1;
        this.loadUsers();
        
        const title = document.getElementById('tableTitle');
        if (title) {
            if (role === '') title.textContent = 'All Users';
            else if (role === 'landlord') title.textContent = 'Landlords';
            else if (role === 'student') title.textContent = 'Students';
            else if (role === 'tenant') title.textContent = 'Tenants';
            else title.textContent = `${role.charAt(0).toUpperCase() + role.slice(1)} Users`;
        }
    }

    filterByStatus(status) {
        this.filters.status = status;
        this.currentPage = 1;
        this.loadUsers();
    }

    applyFilters() {
        this.currentPage = 1;
        this.loadUsers();
    }

    // Selection management
    toggleUserSelection(userId, selected) {
        if (selected) {
            this.selectedUsers.add(userId);
        } else {
            this.selectedUsers.delete(userId);
            const selectAll = document.getElementById('selectAll');
            if (selectAll) selectAll.checked = false;
        }
    }

    // Individual user actions
    async approveUser(userId) {
        if (!confirm('Are you sure you want to approve this user?')) return;
        try {
            await this.updateUserStatus(userId, 'active');
            this.showSuccess('User approved successfully! The user can now access their account.');
            await this.loadUsers();
        } catch (error) {
            this.showError('Failed to approve user. Please try again.');
        }
    }

    async suspendUser(userId) {
        if (!confirm('Are you sure you want to suspend this user? They will not be able to access their account.')) return;
        try {
            await this.updateUserStatus(userId, 'suspended');
            this.showSuccess('User suspended successfully! The user has been temporarily deactivated.');
            await this.loadUsers();
        } catch (error) {
            this.showError('Failed to suspend user. Please try again.');
        }
    }

    async activateUser(userId) {
        if (!confirm('Are you sure you want to activate this user?')) return;
        try {
            await this.updateUserStatus(userId, 'active');
            this.showSuccess('User activated successfully! The user can now access their account.');
            await this.loadUsers();
        } catch (error) {
            this.showError('Failed to activate user. Please try again.');
        }
    }

    // Enhanced sendVerificationReminder method in admin-users.js
async sendVerificationReminder(userId) {
    if (!confirm('Send verification reminder email to this user? They will receive instructions on how to complete their account verification.')) return;
    
    try {
        let token = localStorage.getItem("token");
        if (token && !token.startsWith('Bearer ')) {
            token = `Bearer ${token}`;
        }

        this.showInfo('Sending verification reminder...');

        const response = await fetch(`${this.API_BASE_URL}/admin/users/${userId}/send-verification-reminder`, {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                this.showSuccess('Verification reminder sent successfully! The user will receive an email with verification instructions.');
                console.log('Email details:', result.data.email);
            } else {
                throw new Error(result.error || 'Failed to send verification reminder');
            }
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error sending verification reminder:', error);
        this.showError('Failed to send verification reminder: ' + error.message);
    }
}

    // Bulk actions
    async bulkAction(action) {
        if (this.selectedUsers.size === 0) {
            this.showError('Please select at least one user to perform this action.');
            return;
        }

        const confirmMessage = {
            'activate': `Are you sure you want to activate ${this.selectedUsers.size} user(s)?`,
            'suspend': `Are you sure you want to suspend ${this.selectedUsers.size} user(s)?`,
            'delete': `Are you sure you want to delete ${this.selectedUsers.size} user(s)? This action cannot be undone.`
        }[action];

        if (!confirm(confirmMessage)) return;

        try {
            const userIds = Array.from(this.selectedUsers);
            
            switch (action) {
                case 'activate':
                    await this.bulkUpdateStatus(userIds, 'active');
                    this.showSuccess(`Successfully activated ${userIds.length} user(s)!`);
                    break;
                case 'suspend':
                    await this.bulkUpdateStatus(userIds, 'suspended');
                    this.showSuccess(`Successfully suspended ${userIds.length} user(s)!`);
                    break;
                case 'delete':
                    await this.bulkDeleteUsers(userIds);
                    this.showSuccess(`Successfully deleted ${userIds.length} user(s)!`);
                    break;
            }
            
            this.selectedUsers.clear();
            const selectAll = document.getElementById('selectAll');
            if (selectAll) selectAll.checked = false;
            await this.loadUsers();
        } catch (error) {
            this.showError(`Failed to ${action} users. Please try again.`);
        }
    }

    async bulkUpdateStatus(userIds, status) {
        const promises = userIds.map(userId => this.updateUserStatus(userId, status));
        await Promise.all(promises);
    }

    async bulkDeleteUsers(userIds) {
        const promises = userIds.map(userId => this.deleteUserRequest(userId));
        await Promise.all(promises);
    }

    async updateUserStatus(userId, status) {
        let token = localStorage.getItem("token");
        if (token && !token.startsWith('Bearer ')) {
            token = `Bearer ${token}`;
        }

        const response = await fetch(`${this.API_BASE_URL}/admin/users/${userId}/status`, {
            method: 'PATCH',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: status })
        });

        if (!response.ok) {
            throw new Error(`Failed to update user status: ${response.status}`);
        }

        return await response.json();
    }

    async deleteUserRequest(userId) {
        let token = localStorage.getItem("token");
        if (token && !token.startsWith('Bearer ')) {
            token = `Bearer ${token}`;
        }

        const response = await fetch(`${this.API_BASE_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to delete user: ${response.status}`);
        }

        return await response.json();
    }

    // User actions
    async viewUser(userId) {
        try {
            let token = localStorage.getItem("token");
            if (token && !token.startsWith('Bearer ')) {
                token = `Bearer ${token}`;
            }

            const response = await fetch(`${this.API_BASE_URL}/admin/users/${userId}`, {
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.displayUserModal(data.data.user, data.data.statistics);
                } else {
                    throw new Error(data.error || 'Failed to load user details');
                }
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error viewing user:', error);
            // Fallback: try to find user in loaded users
            const user = this.allUsers.find(u => (u._id === userId || u.id === userId));
            if (user) {
                this.displayUserModal(user);
            } else {
                this.showError('Failed to load user details: ' + error.message);
            }
        }
    }

    displayUserModal(user, statistics) {
        const modalContent = document.getElementById('userDetails');
        if (!modalContent) return;
        
        const firstName = user.firstName || 'Unknown';
        const lastName = user.lastName || 'User';
        const username = user.username || user.email?.split('@')[0] || 'user';
        const email = user.email || 'N/A';
        const phone = user.phone || 'N/A';
        const role = user.role || 'student';
        const status = user.status || 'active';
        const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
        const lastActive = user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Never';
        const bio = user.bio || 'No bio provided';
        const isVerified = user.isVerified || false;
        const avatar = user.avatar || 'https://via.placeholder.com/120';
        
        // Additional profile fields
        const university = user.university || 'Not specified';
        const course = user.course || 'Not specified';
        const propertyName = user.propertyName || 'Not specified';
        const occupation = user.occupation || 'Not specified';
        const reasonForStay = user.reasonForStay || 'Not specified';
        
        modalContent.innerHTML = `
            <div class="row">
                <div class="col-md-4 text-center">
                    <div class="user-avatar mx-auto mb-3" style="width: 100px; height: 100px; font-size: 2rem; display: flex; align-items: center; justify-content: center; background: var(--primary); color: white; border-radius: 50%;">
                        ${avatar && avatar !== 'https://via.placeholder.com/120' ? 
                            `<img src="${avatar}" class="rounded-circle" style="width: 100px; height: 100px; object-fit: cover;">` : 
                            this.getUserInitials(firstName, lastName)
                        }
                    </div>
                    <h4>${firstName} ${lastName}</h4>
                    <p class="text-muted">@${username}</p>
                    <div class="mb-3">
                        <span class="role-badge role-${role} me-2">
                            ${role.charAt(0).toUpperCase() + role.slice(1)}
                        </span>
                        <span class="status-badge status-${status}">
                            ${status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                    </div>
                    ${isVerified ? 
                        '<span class="badge bg-success"><i class="bi bi-patch-check me-1"></i>Verified</span>' : 
                        '<span class="badge bg-warning"><i class="bi bi-clock me-1"></i>Not Verified</span>'
                    }
                </div>
                <div class="col-md-8">
                    <h5>Contact Information</h5>
                    <div class="row mb-3">
                        <div class="col-6">
                            <strong>Email:</strong><br>
                            ${email}
                        </div>
                        <div class="col-6">
                            <strong>Phone:</strong><br>
                            ${phone}
                        </div>
                    </div>
                    
                    <h5>Account Information</h5>
                    <div class="row mb-3">
                        <div class="col-6">
                            <strong>Role:</strong><br>
                            ${role.charAt(0).toUpperCase() + role.slice(1)}
                        </div>
                        <div class="col-6">
                            <strong>Status:</strong><br>
                            ${status.charAt(0).toUpperCase() + status.slice(1)}
                        </div>
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-6">
                            <strong>Joined:</strong><br>
                            ${joinDate}
                        </div>
                        <div class="col-6">
                            <strong>Last Active:</strong><br>
                            ${lastActive}
                        </div>
                    </div>
                    
                    ${role === 'student' ? `
                    <h5>Student Information</h5>
                    <div class="row mb-3">
                        <div class="col-6">
                            <strong>University:</strong><br>
                            ${university}
                        </div>
                        <div class="col-6">
                            <strong>Course:</strong><br>
                            ${course}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${role === 'tenant' ? `
                    <h5>Tenant Information</h5>
                    <div class="row mb-3">
                        <div class="col-6">
                            <strong>Occupation:</strong><br>
                            ${occupation}
                        </div>
                        <div class="col-6">
                            <strong>Reason for Stay:</strong><br>
                            ${reasonForStay}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${role === 'landlord' ? `
                    <h5>Landlord Information</h5>
                    <div class="mb-3">
                        <strong>Property Name:</strong><br>
                        ${propertyName}
                    </div>
                    ` : ''}
                    
                    <h5>Bio</h5>
                    <p>${bio}</p>

                    <!-- Verification Reminder Button -->
                    ${!isVerified ? `
                    <div class="mt-4 p-3 bg-light rounded">
                        <h6><i class="bi bi-envelope-exclamation me-2"></i>Verification Reminder</h6>
                        <p class="small text-muted mb-2">This user hasn't verified their account yet. Send them a reminder email about the importance of verification for platform safety.</p>
                        <button class="btn btn-outline-primary btn-sm" data-action="sendVerificationReminder" data-user-id="${user._id || user.id}">
                            <i class="bi bi-send me-1"></i>Send Verification Reminder
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById('userDetailsModal'));
        modal.show();
    }

    // EDIT USER FUNCTIONALITY - FIXED
    async editUserModal(userId) {
        try {
            let token = localStorage.getItem("token");
            if (token && !token.startsWith('Bearer ')) {
                token = `Bearer ${token}`;
            }

            const response = await fetch(`${this.API_BASE_URL}/admin/users/${userId}`, {
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.currentEditingUser = data.data.user;
                    this.showEditUserModal(data.data.user);
                } else {
                    throw new Error(data.error || 'Failed to load user details for editing');
                }
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading user for editing:', error);
            this.showError('Failed to load user details for editing: ' + error.message);
        }
    }

    showEditUserModal(user) {
        // Create or show edit modal
        let editModal = document.getElementById('editUserModal');
        if (!editModal) {
            this.createEditUserModal();
            editModal = document.getElementById('editUserModal');
        }

        // Populate form with user data
        document.getElementById('editFirstName').value = user.firstName || '';
        document.getElementById('editLastName').value = user.lastName || '';
        document.getElementById('editUsername').value = user.username || '';
        document.getElementById('editEmail').value = user.email || '';
        document.getElementById('editPhone').value = user.phone || '';
        document.getElementById('editRole').value = user.role || 'student';
        document.getElementById('editStatus').value = user.status || 'active';
        document.getElementById('editBio').value = user.bio || '';
        document.getElementById('editUniversity').value = user.university || '';
        document.getElementById('editCourse').value = user.course || '';
        document.getElementById('editOccupation').value = user.occupation || '';
        document.getElementById('editReasonForStay').value = user.reasonForStay || '';
        document.getElementById('editPropertyName').value = user.propertyName || '';

        // Show/hide role-specific fields
        this.toggleRoleSpecificFields(user.role);

        const modal = new bootstrap.Modal(editModal);
        modal.show();
    }

    createEditUserModal() {
        const modalHTML = `
            <div class="modal fade" id="editUserModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Edit User</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editUserForm">
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">First Name *</label>
                                        <input type="text" class="form-control" id="editFirstName" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Last Name *</label>
                                        <input type="text" class="form-control" id="editLastName" required>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Username *</label>
                                        <input type="text" class="form-control" id="editUsername" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Email *</label>
                                        <input type="email" class="form-control" id="editEmail" required>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Phone</label>
                                        <input type="tel" class="form-control" id="editPhone">
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Role *</label>
                                        <select class="form-select" id="editRole" required>
                                            <option value="student">Student</option>
                                            <option value="landlord">Landlord</option>
                                            <option value="tenant">Tenant</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Status *</label>
                                        <select class="form-select" id="editStatus" required>
                                            <option value="active">Active</option>
                                            <option value="pending">Pending</option>
                                            <option value="suspended">Suspended</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Bio</label>
                                    <textarea class="form-control" id="editBio" rows="3"></textarea>
                                </div>
                                
                                <!-- Student-specific fields -->
                                <div id="studentFields" style="display: none;">
                                    <h6>Student Information</h6>
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">University</label>
                                            <input type="text" class="form-control" id="editUniversity">
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Course</label>
                                            <input type="text" class="form-control" id="editCourse">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Tenant-specific fields -->
                                <div id="tenantFields" style="display: none;">
                                    <h6>Tenant Information</h6>
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Occupation</label>
                                            <input type="text" class="form-control" id="editOccupation">
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Reason for Stay</label>
                                            <input type="text" class="form-control" id="editReasonForStay">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Landlord-specific fields -->
                                <div id="landlordFields" style="display: none;">
                                    <h6>Landlord Information</h6>
                                    <div class="mb-3">
                                        <label class="form-label">Property Name</label>
                                        <input type="text" class="form-control" id="editPropertyName">
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" data-action="saveUser">
                                <i class="bi bi-check-circle me-2"></i>Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add event listener for role change to show/hide specific fields
        document.getElementById('editRole').addEventListener('change', (e) => {
            this.toggleRoleSpecificFields(e.target.value);
        });
    }

    toggleRoleSpecificFields(role) {
        const studentFields = document.getElementById('studentFields');
        const tenantFields = document.getElementById('tenantFields');
        const landlordFields = document.getElementById('landlordFields');

        // Hide all first
        if (studentFields) studentFields.style.display = 'none';
        if (tenantFields) tenantFields.style.display = 'none';
        if (landlordFields) landlordFields.style.display = 'none';

        // Show relevant fields
        switch (role) {
            case 'student':
                if (studentFields) studentFields.style.display = 'block';
                break;
            case 'tenant':
                if (tenantFields) tenantFields.style.display = 'block';
                break;
            case 'landlord':
                if (landlordFields) landlordFields.style.display = 'block';
                break;
        }
    }

    async saveUser() {
        if (!this.currentEditingUser) {
            this.showError('No user selected for editing.');
            return;
        }

        const userId = this.currentEditingUser._id || this.currentEditingUser.id;
        if (!userId) {
            this.showError('Invalid user ID.');
            return;
        }

        const userData = {
            firstName: document.getElementById('editFirstName').value,
            lastName: document.getElementById('editLastName').value,
            username: document.getElementById('editUsername').value,
            email: document.getElementById('editEmail').value,
            phone: document.getElementById('editPhone').value,
            role: document.getElementById('editRole').value,
            status: document.getElementById('editStatus').value,
            bio: document.getElementById('editBio').value,
            university: document.getElementById('editUniversity').value,
            course: document.getElementById('editCourse').value,
            occupation: document.getElementById('editOccupation').value,
            reasonForStay: document.getElementById('editReasonForStay').value,
            propertyName: document.getElementById('editPropertyName').value
        };

        // Validate required fields
        if (!userData.firstName || !userData.lastName || !userData.username || !userData.email) {
            this.showError('Please fill in all required fields (First Name, Last Name, Username, Email).');
            return;
        }

        try {
            let token = localStorage.getItem("token");
            if (token && !token.startsWith('Bearer ')) {
                token = `Bearer ${token}`;
            }

            // FIXED: Use admin update endpoint instead of regular profile update
            const response = await fetch(`${this.API_BASE_URL}/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                const result = await response.json();
                this.showSuccess('User updated successfully! Changes have been saved.');
                const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
                if (modal) modal.hide();
                await this.loadUsers();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error updating user:', error);
            this.showError('Failed to update user: ' + error.message);
        }
    }

    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone and all associated data will be lost.')) return;

        try {
            await this.deleteUserRequest(userId);
            this.showSuccess('User deleted successfully! The user and their data have been removed from the system.');
            await this.loadUsers();
        } catch (error) {
            this.showError('Failed to delete user. Please try again.');
        }
    }

    // Add user functionality
    showAddUserModal() {
        const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
        modal.show();
    }

    async addUser() {
        const form = document.getElementById('addUserForm');
        if (!form) return;

        const formData = new FormData(form);
        
        const userData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            username: formData.get('username'),
            email: formData.get('email'),
            role: formData.get('role'),
            status: formData.get('status'),
            phone: formData.get('phone') || '',
            password: formData.get('password')
        };

        if (!userData.firstName || !userData.lastName || !userData.username || !userData.email || !userData.password) {
            this.showError('Please fill in all required fields.');
            return;
        }

        if (userData.password.length < 8) {
            this.showError('Password must be at least 8 characters long.');
            return;
        }

        try {
            let token = localStorage.getItem("token");
            if (token && !token.startsWith('Bearer ')) {
                token = `Bearer ${token}`;
            }

            const response = await fetch(`${this.API_BASE_URL}/admin/users`, {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                this.showSuccess('User created successfully! The new user can now log in to the system.');
                const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
                if (modal) modal.hide();
                form.reset();
                await this.loadUsers();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create user');
            }
        } catch (error) {
            this.showError('Failed to create user: ' + error.message);
        }
    }

    // Export functionality
    async exportUsers() {
        try {
            this.showInfo('Preparing user export... This may take a moment.');
            let token = localStorage.getItem("token");
            if (token && !token.startsWith('Bearer ')) {
                token = `Bearer ${token}`;
            }

            const params = new URLSearchParams(this.filters);
            const response = await fetch(`${this.API_BASE_URL}/admin/users/export?${params}`, {
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                this.showSuccess('User export downloaded successfully! Your file is ready.');
            } else {
                this.createFallbackExport();
            }
        } catch (error) {
            this.createFallbackExport();
        }
    }

    createFallbackExport() {
        const headers = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Joined Date', 'Last Active'];
        const csvData = this.allUsers.map(user => [
            `${user.firstName || ''} ${user.lastName || ''}`,
            user.email || '',
            user.phone || '',
            user.role || '',
            user.status || '',
            user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '',
            user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Never'
        ]);

        const csvContent = [headers, ...csvData]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showSuccess('User export generated from current data! Your file is ready.');
    }

    setupRealTimeUpdates() {
        setInterval(() => {
            this.loadUsers();
        }, 120000);

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.loadUsers();
            }
        });
    }

    // Enhanced notification methods with better messages
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'danger');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type) {
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }

        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-bg-${type} border-0`;
        toast.id = toastId;
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
}

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    window.adminUsersManager = new AdminUsersManager();
});