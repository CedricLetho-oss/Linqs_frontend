// ResLinQ Admin Dashboard Manager - FINAL VERSION
class ResLinQAdminManager {
    constructor() {
        this.token = localStorage.getItem("token");
        this.user = JSON.parse(localStorage.getItem("user") || "{}");
        this.API_BASE_URL ='https://linqs-backend.onrender.com/api';
        this.init();
    }

    async init() {
        console.log('ResLinQ Admin Manager initialized');
        this.checkAdminAccess();
        this.setupEventListeners();
        await this.loadDashboardData();
        this.setupRealTimeUpdates();
    }

    checkAdminAccess() {
        if (this.user.role !== 'admin') {
            alert('Access denied. Admin privileges required.');
            window.location.href = 'index.html';
            return;
        }
    }

    setupEventListeners() {
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('adminSidebar');
        const main = document.getElementById('adminMain');
        
        if (sidebar && main) {
            sidebar.classList.toggle('collapsed');
            main.classList.toggle('expanded');
        }
    }

    async loadDashboardData() {
        try {
            console.log('Loading dashboard data...');
            
            // ONLY THESE 3 ENDPOINTS - NO fetchRecentUsers!
            const [overview, recentActivities, revenue] = await Promise.all([
                this.fetchDashboardOverview(),
                this.fetchRecentActivities(), 
                this.fetchRevenueData()
            ]);

            console.log('Dashboard data loaded:', { overview, recentActivities, revenue });
            
            this.updateStats(overview);
            this.updateRecentUsers(overview); // Get recent users from overview
            this.updateRecentActivities(recentActivities);
            this.updateRevenueChart(revenue);
            this.updateNotifications(overview);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    async fetchDashboardOverview() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/admin/dashboard/overview`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Dashboard overview:', data);
                return data.data || data;
            } else {
                throw new Error(`Dashboard API failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Dashboard overview fetch error:', error);
            throw error;
        }
    }

    async fetchRecentActivities() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/admin/dashboard/activity?limit=5`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Recent activities:', data);
                return data.data?.activity || data.activity || [];
            } else {
                throw new Error(`Activities API failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Activities fetch error:', error);
            throw error;
        }
    }

    async fetchRevenueData() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/admin/dashboard/revenue?period=monthly`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Revenue data:', data);
                return this.formatRevenueData(data.data || data);
            } else {
                throw new Error(`Revenue API failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Revenue fetch error:', error);
            throw error;
        }
    }

    formatRevenueData(revenueData) {
        if (!revenueData.revenue || !Array.isArray(revenueData.revenue)) {
            return { months: [], amounts: [] };
        }

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyRevenue = new Array(12).fill(0);

        revenueData.revenue.forEach(item => {
            const monthIndex = item._id?.month - 1;
            if (monthIndex >= 0 && monthIndex < 12) {
                monthlyRevenue[monthIndex] = item.revenue || 0;
            }
        });

        return { months, amounts: monthlyRevenue };
    }

    updateStats(overview) {
    if (!overview || !overview.overview) {
        console.error('No overview data received');
        return;
    }
    
    const stats = overview.overview;
    const totalUsers = stats.totalUsers || 0;
    const totalProperties = stats.totalProperties || 0;
    const totalBookings = stats.totalBookings || 0;
    const pendingReports = stats.pendingApprovals || 0;

    // Get current month and year for monthly tracking
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11 (October = 9)
    const currentYear = now.getFullYear();
    const currentMonthKey = `${currentYear}-${currentMonth}`;

    // Get monthly stats from localStorage
    const monthlyStats = JSON.parse(localStorage.getItem('monthlyStats') || '{}');
    
    // Check if we need to initialize this month's data
    const isNewMonth = !monthlyStats[currentMonthKey];
    if (isNewMonth) {
        monthlyStats[currentMonthKey] = {
            totalUsers,
            totalProperties, 
            totalBookings,
            timestamp: now.toISOString(),
            initialized: true
        };
        console.log('Initialized monthly stats for:', currentMonthKey, 'with values:', { totalUsers, totalProperties, totalBookings });
    }

    // Get previous month for comparison
    let previousMonthKey, previousMonthStats;
    if (currentMonth === 0) {
        previousMonthKey = `${currentYear-1}-11`; // December previous year
    } else {
        previousMonthKey = `${currentYear}-${currentMonth-1}`; // Previous month
    }
    previousMonthStats = monthlyStats[previousMonthKey];

    // If no previous month data exists, use current month as baseline for first-time setup
    let userIncrease, propertyIncrease, bookingIncrease;
    
    if (!previousMonthStats) {
        console.log('No previous month data found, using current values as baseline');
        userIncrease = 0;
        propertyIncrease = 0;
        bookingIncrease = 0;
        
        // Initialize previous month with current values to avoid showing 0% next time
        monthlyStats[previousMonthKey] = {
            totalUsers,
            totalProperties,
            totalBookings,
            timestamp: now.toISOString(),
            initialized: true
        };
    } else {
        // Calculate percentage changes compared to previous month
        userIncrease = this.calculatePercentageIncrease(totalUsers, previousMonthStats.totalUsers);
        propertyIncrease = this.calculatePercentageIncrease(totalProperties, previousMonthStats.totalProperties);
        bookingIncrease = this.calculatePercentageIncrease(totalBookings, previousMonthStats.totalBookings);
        
        console.log('Monthly comparison - Previous month stats:', {
            users: previousMonthStats.totalUsers,
            properties: previousMonthStats.totalProperties,
            bookings: previousMonthStats.totalBookings
        });
    }

    // Update current month's stats with the highest values we've seen
    if (totalUsers > (monthlyStats[currentMonthKey].totalUsers || 0)) {
        monthlyStats[currentMonthKey].totalUsers = totalUsers;
    }
    if (totalProperties > (monthlyStats[currentMonthKey].totalProperties || 0)) {
        monthlyStats[currentMonthKey].totalProperties = totalProperties;
    }
    if (totalBookings > (monthlyStats[currentMonthKey].totalBookings || 0)) {
        monthlyStats[currentMonthKey].totalBookings = totalBookings;
    }
    monthlyStats[currentMonthKey].timestamp = now.toISOString();
    monthlyStats[currentMonthKey].initialized = true;

    // Clean up old data (keep only last 12 months)
    this.cleanupOldMonthlyData(monthlyStats);

    // Save updated monthly stats
    localStorage.setItem('monthlyStats', JSON.stringify(monthlyStats));

    // Update DOM
    this.setElementText('totalUsers', totalUsers.toLocaleString());
    this.setElementText('totalProperties', totalProperties.toLocaleString());
    this.setElementText('totalBookings', totalBookings.toLocaleString());
    this.setElementText('pendingReports', pendingReports.toLocaleString());

    this.updatePercentageIndicator('totalUsers', userIncrease);
    this.updatePercentageIndicator('totalProperties', propertyIncrease);
    this.updatePercentageIndicator('totalBookings', bookingIncrease);
    this.updateReportsIndicator(pendingReports);

    console.log('Monthly comparison:', {
        currentMonth: currentMonthKey,
        previousMonth: previousMonthKey,
        userIncrease,
        propertyIncrease,
        bookingIncrease,
        currentValues: { totalUsers, totalProperties, totalBookings }
    });

    // Debug: Show all stored monthly data
    console.log('All monthly stats:', monthlyStats);
}

// Add this method to help debug and reset if needed
debugMonthlyStats() {
    const monthlyStats = JSON.parse(localStorage.getItem('monthlyStats') || '{}');
    console.log('Debug - All monthly stats:', monthlyStats);
    
    // Option to reset if something is wrong
    if (confirm('Reset monthly stats? This will clear all historical data.')) {
        localStorage.removeItem('monthlyStats');
        console.log('Monthly stats reset');
        this.loadDashboardData();
    }
}

// You can call this from browser console: adminManager.debugMonthlyStats()

cleanupOldMonthlyData(monthlyStats) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Keep only data from the last 12 months
    Object.keys(monthlyStats).forEach(monthKey => {
        const [year, month] = monthKey.split('-').map(Number);
        const monthsDiff = (currentYear - year) * 12 + (currentMonth - month);
        
        if (monthsDiff > 12) {
            delete monthlyStats[monthKey];
            console.log('Cleaned up old monthly data:', monthKey);
        }
    });
}

calculatePercentageIncrease(current, previous) {
    if (!previous || previous === 0) return 0;
    const increase = ((current - previous) / previous) * 100;
    return Math.round(increase * 100) / 100; // Round to 2 decimal places
}

    updatePercentageIndicator(statId, percentage) {
        const indicator = document.getElementById(statId).closest('.stat-card').querySelector('small');
        if (!indicator) return;

        if (percentage > 0) {
            indicator.innerHTML = `<i class="bi bi-arrow-up"></i> ${Math.abs(percentage)}% increase`;
            indicator.className = 'text-success';
        } else if (percentage < 0) {
            indicator.innerHTML = `<i class="bi bi-arrow-down"></i> ${Math.abs(percentage)}% decrease`;
            indicator.className = 'text-danger';
        } else {
            indicator.innerHTML = `<i class="bi bi-dash"></i> No change`;
            indicator.className = 'text-muted';
        }
    }

    updateReportsIndicator(pendingReports) {
        const indicator = document.querySelector('#pendingReports').closest('.stat-card').querySelector('small');
        if (!indicator) return;

        if (pendingReports > 0) {
            indicator.innerHTML = `<i class="bi bi-arrow-up"></i> ${pendingReports} pending`;
            indicator.className = 'text-danger';
        } else {
            indicator.innerHTML = `<i class="bi bi-check"></i> All clear`;
            indicator.className = 'text-success';
        }
    }

    updateRecentUsers(overview) {
        const tableBody = document.getElementById('recentUsersTable');
        if (!tableBody) return;

        if (!overview?.recentActivity?.users || overview.recentActivity.users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4 text-muted">
                        <i class="bi bi-people fs-1 d-block mb-2"></i>
                        No recent users found
                    </td>
                </tr>
            `;
            return;
        }

        const users = overview.recentActivity.users;
        tableBody.innerHTML = users.map(user => {
            const userId = user._id;
            const firstName = user.firstName || 'Unknown';
            const lastName = user.surname || 'User';
            const email = user.email || 'N/A';
            const role = user.role || 'student';
            const joinDate = user.createdAt;
            
            const displayName = `${firstName} ${lastName}`.trim();
            const formattedDate = joinDate ? new Date(joinDate).toLocaleDateString() : 'N/A';

            return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="bg-primary rounded-circle d-flex align-items-center justify-content-center text-white me-3"
                                 style="width: 40px; height: 40px;">
                                ${this.getUserInitials(firstName, lastName)}
                            </div>
                            <div>
                                <h6 class="mb-0">${displayName}</h6>
                                <small class="text-muted">${email}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="badge ${this.getRoleBadgeClass(role)}">
                            ${role.charAt(0).toUpperCase() + role.slice(1)}
                        </span>
                    </td>
                    <td>
                        <span class="badge bg-success">Active</span>
                    </td>
                    <td>${formattedDate}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="adminManager.viewUser('${userId}')">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-outline-warning" onclick="adminManager.editUser('${userId}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateRecentActivities(activities) {
        const container = document.getElementById('recentActivity');
        if (!container) return;

        if (!activities || activities.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-activity fs-1 d-block mb-2"></i>
                    <p>No recent activities</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.map(activity => `
            <div class="d-flex align-items-start mb-3">
                <div class="bg-${this.getActivityColor(activity.type)} rounded-circle p-2 me-3">
                    <i class="bi ${this.getActivityIcon(activity.type)} text-white"></i>
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-0">${activity.message}</h6>
                    <small class="text-muted">${this.getActivityDetails(activity)}</small>
                    <small class="text-muted d-block">${this.getTimeAgo(activity.timestamp)}</small>
                </div>
            </div>
        `).join('');
    }

    getActivityIcon(type) {
        const icons = {
            'user_registration': 'bi-person-plus',
            'new_booking': 'bi-calendar-check',
            'new_property': 'bi-house'
        };
        return icons[type] || 'bi-activity';
    }

    getActivityColor(type) {
        const colors = {
            'user_registration': 'success',
            'new_booking': 'primary',
            'new_property': 'warning'
        };
        return colors[type] || 'primary';
    }

    getActivityDetails(activity) {
        if (activity.type === 'user_registration' && activity.user) {
            return `${activity.user.firstName} ${activity.user.surname} (${activity.user.role})`;
        } else if (activity.type === 'new_booking' && activity.booking) {
            return `Booking for ${activity.booking.property?.title || 'property'}`;
        } else if (activity.type === 'new_property' && activity.property) {
            return `Listed by ${activity.property.landlord?.firstName || 'landlord'}`;
        }
        return '';
    }

    updateNotifications(overview) {
        if (!overview?.overview) return;
        
        const pendingApprovals = overview.overview.pendingApprovals || 0;
        const totalNotifications = pendingApprovals;

        // Update badge counts
        document.querySelectorAll('.notification-badge').forEach(badge => {
            badge.textContent = totalNotifications > 99 ? '99+' : totalNotifications;
            badge.style.display = totalNotifications > 0 ? 'flex' : 'none';
        });

        // Update dropdown
        const dropdown = document.querySelector('.dropdown-menu');
        if (dropdown) {
            let html = `<h6 class="dropdown-header">Notifications (${totalNotifications})</h6>`;
            
            if (pendingApprovals > 0) {
                html += `
                    <a class="dropdown-item" href="admin-properties.html">
                        <small>${pendingApprovals} properties pending approval</small>
                    </a>
                `;
            }
            
            if (totalNotifications === 0) {
                html += `<a class="dropdown-item" href="#"><small class="text-muted">No notifications</small></a>`;
            }
            
            html += `<div class="dropdown-divider"></div>
                     <a class="dropdown-item text-primary" href="admin-properties.html">View all</a>`;
            
            dropdown.innerHTML = html;
        }
    }

    getTimeAgo(timestamp) {
        if (!timestamp) return 'Recently';
        const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
        
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
        if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;
        return `${Math.floor(diff / 2592000)} months ago`;
    }

    getUserInitials(firstName, lastName) {
        return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'U';
    }

    getRoleBadgeClass(role) {
        const classes = {
            'admin': 'bg-danger',
            'landlord': 'bg-success', 
            'student': 'bg-info'
        };
        return classes[role] || 'bg-secondary';
    }

    updateRevenueChart(revenueData) {
        const container = document.getElementById('revenueChart');
        if (!container) return;

        // Clear container
        container.innerHTML = '';

        if (!revenueData.months?.length || !revenueData.amounts?.length) {
            container.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="bi bi-bar-chart fs-1 d-block mb-2"></i>
                    <p>No revenue data available</p>
                    <small>Revenue data will appear when bookings are completed</small>
                </div>
            `;
            return;
        }

        // Create canvas for Chart.js
        const canvas = document.createElement('canvas');
        container.appendChild(canvas);

        try {
            new Chart(canvas, {
                type: 'line',
                data: {
                    labels: revenueData.months,
                    datasets: [{
                        label: 'Revenue',
                        data: revenueData.amounts,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: 'top' },
                        tooltip: {
                            callbacks: {
                                label: (context) => `Revenue: R${context.parsed.y.toLocaleString()}`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => 'R' + value.toLocaleString()
                            }
                        },
                        x: { grid: { display: false } }
                    }
                }
            });
        } catch (error) {
            console.error('Chart error:', error);
            container.innerHTML = `
                <div class="text-center text-muted">
                    <i class="bi bi-bar-chart fs-1 d-block mb-2"></i>
                    <p>Chart could not be loaded</p>
                </div>
            `;
        }
    }

    setupRealTimeUpdates() {
        setInterval(() => this.loadDashboardData(), 120000);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) this.loadDashboardData();
        });
    }

    viewUser(userId) {
        window.location.href = `admin-users.html?view=${userId}`;
    }

    editUser(userId) {
        window.location.href = `admin-users.html?edit=${userId}`;
    }

    setElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) element.textContent = text;
    }

    showError(message) {
        this.showNotification(message, 'danger');
    }

    showNotification(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-bg-${type} border-0`;
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        const container = document.createElement('div');
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '9999';
        container.appendChild(toast);
        document.body.appendChild(container);

        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        toast.addEventListener('hidden.bs.toast', () => container.remove());
    }
}

// Initialize
let adminManager;
document.addEventListener('DOMContentLoaded', () => {
    adminManager = new ResLinQAdminManager();
    window.adminManager = adminManager;
});