// Admin Users Management Manager
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
        this.init();
    }

    // handleTokenExpired() {
        //console.log('Token expired, redirecting to login...');
       // localStorage.removeItem("token");
        //localStorage.removeItem("user");
        //alert('Your session has expired. Please log in again.');
        //window.location.href = 'admin-login.html';
    //}

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
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            document.getElementById('adminSidebar').classList.toggle('collapsed');
            document.getElementById('adminMain').classList.toggle('expanded');
        });

        // Search input with debounce
        let searchTimeout;
        document.getElementById('searchInput').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filters.search = e.target.value;
                this.currentPage = 1;
                this.loadUsers();
            }, 500);
        });

        // Filter changes
        document.getElementById('roleFilter').addEventListener('change', (e) => {
            this.filters.role = e.target.value;
            this.currentPage = 1;
            this.loadUsers();
        });

        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.currentPage = 1;
            this.loadUsers();
        });

        // Select all checkbox
        document.getElementById('selectAll').addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.user-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
                this.toggleUserSelection(checkbox.value, e.target.checked);
            });
        });

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

        // Get the token and ensure it has Bearer prefix
        let token = localStorage.getItem("token");
        
        // If token doesn't start with "Bearer ", add it
        if (token && !token.startsWith('Bearer ')) {
            token = `Bearer ${token}`;
        }

        const response = await fetch(`${this.API_BASE_URL}/admin/users?${params}`, {
            headers: {
                'Authorization': token, // Use the formatted token
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            // Handle 401 specifically - token might be expired
            if (response.status === 401) {
                console.error('Token expired or invalid');
                // You might want to redirect to login here
                this.handleTokenExpired();
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    updateUserStats(users) {
        const totalUsers = users.length;
        const landlords = users.filter(u => u.role === 'landlord').length;
        const students = users.filter(u => u.role === 'student').length;
        const pending = users.filter(u => u.status === 'pending').length;

        document.getElementById('totalUsersCount').textContent = totalUsers;
        document.getElementById('landlordCount').textContent = landlords;
        document.getElementById('studentCount').textContent = students;
        document.getElementById('pendingCount').textContent = pending;

        this.updateNotificationBadges(pending);
    }

    updateUsersTable(data) {
    const tableBody = document.getElementById('usersTableBody');
    const users = data.users || [];

    if (users.length === 0) {
        this.showEmptyState();
        return;
    }

    tableBody.innerHTML = users.map(user => {
        // Use exact field names from your User model
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
    document.getElementById('tableInfo').textContent = `Showing ${start}-${end} of ${total} users`;
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
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-4 text-muted">
                    <i class="bi bi-people fs-1 d-block mb-2"></i>
                    No users found matching your criteria
                </td>
            </tr>
        `;
        
        document.getElementById('tableInfo').textContent = 'Showing 0-0 of 0 users';
        document.getElementById('pagination').innerHTML = '';
        
        document.getElementById('totalUsersCount').textContent = '0';
        document.getElementById('landlordCount').textContent = '0';
        document.getElementById('studentCount').textContent = '0';
        document.getElementById('pendingCount').textContent = '0';
    }

    getUserInitials(firstName, lastName) {
        const first = firstName?.charAt(0) || '';
        const last = lastName?.charAt(0) || '';
        return `${first}${last}`.toUpperCase() || 'U';
    }

    updatePagination(data) {
        const pagination = document.getElementById('pagination');
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
            document.getElementById('selectAll').checked = false;
        }
    }

    // Individual user actions
    async approveUser(userId) {
        if (!confirm('Are you sure you want to approve this user?')) return;
        try {
            await this.updateUserStatus(userId, 'active');
            this.showSuccess('User approved successfully');
            await this.loadUsers();
        } catch (error) {
            this.showError('Failed to approve user');
        }
    }

    async suspendUser(userId) {
        if (!confirm('Are you sure you want to suspend this user?')) return;
        try {
            await this.updateUserStatus(userId, 'suspended');
            this.showSuccess('User suspended successfully');
            await this.loadUsers();
        } catch (error) {
            this.showError('Failed to suspend user');
        }
    }

    async activateUser(userId) {
        if (!confirm('Are you sure you want to activate this user?')) return;
        try {
            await this.updateUserStatus(userId, 'active');
            this.showSuccess('User activated successfully');
            await this.loadUsers();
        } catch (error) {
            this.showError('Failed to activate user');
        }
    }

    // Bulk actions
    async bulkAction(action) {
        if (this.selectedUsers.size === 0) {
            this.showError('Please select at least one user');
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
                    break;
                case 'suspend':
                    await this.bulkUpdateStatus(userIds, 'suspended');
                    break;
                case 'delete':
                    await this.bulkDeleteUsers(userIds);
                    break;
            }
            
            this.selectedUsers.clear();
            document.getElementById('selectAll').checked = false;
            await this.loadUsers();
        } catch (error) {
            this.showError(`Failed to ${action} users`);
        }
    }

    async bulkUpdateStatus(userIds, status) {
        const promises = userIds.map(userId => this.updateUserStatus(userId, status));
        await Promise.all(promises);
        this.showSuccess(`Successfully ${status === 'active' ? 'activated' : 'suspended'} ${userIds.length} user(s)`);
    }

    async bulkDeleteUsers(userIds) {
        const promises = userIds.map(userId => this.deleteUserRequest(userId));
        await Promise.all(promises);
        this.showSuccess(`Successfully deleted ${userIds.length} user(s)`);
    }

    async updateUserStatus(userId, status) {
        const response = await fetch(`${this.API_BASE_URL}/admin/users/${userId}/status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${this.token}`,
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
        const response = await fetch(`${this.API_BASE_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${this.token}`,
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
        const response = await fetch(`${this.API_BASE_URL}/admin/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                this.displayUserModal(data.data.user, data.data.statistics);
            } else {
                throw new Error(data.message || 'Failed to load user details');
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
    
    // Use exact field names from User model
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
                ${isVerified ? '<span class="badge bg-success"><i class="bi bi-patch-check me-1"></i>Verified</span>' : 
                '<span class="badge bg-warning"><i class="bi bi-clock me-1"></i>Not Verified</span>'}
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
                
                ${role === 'landlord' ? `
                <h5>Landlord Information</h5>
                <div class="mb-3">
                    <strong>Property Name:</strong><br>
                    ${propertyName}
                </div>
                ` : ''}
                
                <h5>Bio</h5>
                <p>${bio}</p>
            </div>
        </div>
    `;

    const modal = new bootstrap.Modal(document.getElementById('userDetailsModal'));
    modal.show();
}

    editUserModal(userId) {
        this.viewUser(userId);
        this.showInfo('Edit functionality will be implemented in the user details page');
    }

    editUser() {
        this.showInfo('Edit user functionality - To be implemented');
    }

    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

        try {
            await this.deleteUserRequest(userId);
            this.showSuccess('User deleted successfully');
            await this.loadUsers();
        } catch (error) {
            this.showError('Failed to delete user');
        }
    }

    // Add user functionality
    showAddUserModal() {
        const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
        modal.show();
    }

    async addUser() {
        const form = document.getElementById('addUserForm');
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
            this.showError('Please fill in all required fields');
            return;
        }

        if (userData.password.length < 8) {
            this.showError('Password must be at least 8 characters long');
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/admin/users`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                this.showSuccess('User created successfully');
                const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
                modal.hide();
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
            this.showInfo('Preparing user export...');
            const params = new URLSearchParams(this.filters);
            const response = await fetch(`${this.API_BASE_URL}/admin/users/export?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
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
                this.showSuccess('User export downloaded successfully');
            } else {
                this.createFallbackExport();
            }
        } catch (error) {
            this.createFallbackExport();
        }
    }

    createFallbackExport() {
        const headers = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Joined Date'];
        const csvData = this.allUsers.map(user => [
            `${user.firstName || ''} ${user.lastName || ''}`,
            user.email || '',
            user.phone || user.phoneNumber || '',
            user.role || '',
            user.status || '',
            user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''
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
        
        this.showSuccess('User export generated from current data');
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

    // Notification methods
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

