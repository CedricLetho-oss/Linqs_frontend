// landlord-dashboard.js - UPDATED TO MATCH REPORTS PAGE CALCULATIONS
import API_BASE_URL from './apiConfig.js';

class LandlordDashboard {
    constructor() {
        this.token = localStorage.getItem("token");
        this.user = JSON.parse(localStorage.getItem("user") || "{}");
        this.init();
    }

    async init() {
        if (!this.token) return;

        try {
            await this.loadDashboardData();
            this.setupReportsNotification();
            this.setupAnimations();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    async loadDashboardData() {
        try {
            const [properties, bookings, reports, reviews, performanceData] = await Promise.allSettled([
                this.fetchProperties(),
                this.fetchBookings(),
                this.fetchReports(),
                this.fetchReviews(),
                this.fetchPerformanceData() // Use the same performance data calculation as reports page
            ]);

            const propertiesData = properties.status === 'fulfilled' ? properties.value : [];
            const bookingsData = bookings.status === 'fulfilled' ? bookings.value : [];
            const reportsData = reports.status === 'fulfilled' ? reports.value : [];
            const reviewsData = reviews.status === 'fulfilled' ? reviews.value : [];
            const performanceDataResult = performanceData.status === 'fulfilled' ? performanceData.value : {};

            this.updateStats(propertiesData, bookingsData, reportsData, reviewsData);
            this.updateRecentActivity(bookingsData, reportsData, reviewsData);
            this.updateUpcomingBookings(bookingsData);
            this.updatePerformanceSummary(performanceDataResult); // Use the exact same data as reports page
            this.updateReportsAlert(reportsData);
        } catch (error) {
            console.error('Error in loadDashboardData:', error);
            this.showError('Failed to load some dashboard data');
        }
    }

    // UPDATED: Fetch performance data using EXACT SAME calculations as reports page
    async fetchPerformanceData() {
        try {
            const properties = await this.fetchProperties();
            const reviews = await this.fetchReviews();
            const bookings = await this.fetchBookings();

            // Use EXACT SAME occupancy rate calculation as reports page
            const occupancyRate = await this.calculateOccupancyRate(properties);
            
            // Use EXACT SAME response rate calculation as reports page
            const responseRate = this.calculateResponseRate(bookings);
            
            // Use EXACT SAME satisfaction score calculation as reports page
            const satisfactionScore = this.calculateSatisfactionScore(reviews);

            console.log('Dashboard Performance Data:', {
                occupancyRate,
                responseRate,
                satisfactionScore
            });

            return {
                occupancyRate,
                responseRate,
                satisfactionScore,
                totalProperties: properties.length,
                totalReviews: reviews.length,
                totalBookings: bookings.length
            };
        } catch (error) {
            console.error('Error fetching performance data:', error);
            return {
                occupancyRate: 0,
                responseRate: 0,
                satisfactionScore: 0,
                totalProperties: 0,
                totalReviews: 0,
                totalBookings: 0
            };
        }
    }

    // UPDATED: Use EXACT SAME occupancy rate calculation as reports page
    async calculateOccupancyRate(properties) {
        if (properties.length === 0) return 0;

        let totalOccupancy = 0;
        let propertyCount = 0;

        for (const property of properties) {
            try {
                let propertyOccupancy = 0;
                
                // Use same logic as reports page
                if (property.status === 'occupied' || property.availability === 'occupied') {
                    propertyOccupancy = 100;
                } else {
                    propertyOccupancy = await this.calculateRoomBasedOccupancy(property._id);
                }
                
                totalOccupancy += propertyOccupancy;
                propertyCount++;
                
            } catch (error) {
                console.error(`Error processing property ${property._id}:`, error);
            }
        }

        return propertyCount > 0 ? totalOccupancy / propertyCount : 0;
    }

    // UPDATED: Use EXACT SAME room-based occupancy calculation as reports page
    async calculateRoomBasedOccupancy(propertyId) {
        try {
            const response = await fetch(`${API_BASE_URL}/properties/${propertyId}/rooms`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const rooms = data.rooms || [];
                
                if (rooms.length === 0) {
                    return 0;
                }
                
                const occupiedRooms = rooms.filter(room => !room.isAvailable).length;
                const occupancyRate = (occupiedRooms / rooms.length) * 100;
                return Math.round(occupancyRate);
            } else {
                console.warn(`Failed to fetch rooms for property ${propertyId}`);
                return 0;
            }
        } catch (error) {
            console.error(`Error calculating occupancy for property ${propertyId}:`, error);
            return 0;
        }
    }

    // UPDATED: Use EXACT SAME response rate calculation as reports page
    calculateResponseRate(bookings) {
        if (bookings.length === 0) return 0;
        
        const respondedBookings = bookings.filter(booking => {
            // Use same logic as reports page - consider responded if status changed from pending
            return booking.status !== 'pending' && 
                   booking.updatedAt && 
                   booking.updatedAt !== booking.createdAt;
        }).length;

        return Math.round((respondedBookings / bookings.length) * 100);
    }

    // UPDATED: Use EXACT SAME satisfaction score calculation as reports page
    calculateSatisfactionScore(reviews) {
        if (reviews.length === 0) return 0;
        
        const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
        const averageRating = totalRating / reviews.length;
        
        // Convert to 5-point scale percentage for progress bar - SAME as reports page
        return parseFloat((averageRating / 5 * 100).toFixed(1));
    }

    // UPDATED: Update performance summary with exact same data and formatting
    updatePerformanceSummary(performanceData) {
        const { occupancyRate, responseRate, satisfactionScore } = performanceData;

        console.log('Dashboard Performance Summary:', {
            occupancyRate,
            responseRate,
            satisfactionScore
        });

        // Update the progress bars with real data - SAME as reports page
        this.animateProgressBar('.progress-bar.bg-success', occupancyRate);
        this.animateProgressBar('.progress-bar.bg-primary', responseRate);
        this.animateProgressBar('.progress-bar.bg-warning', satisfactionScore);

        // Update the text labels with real values - SAME as reports page
        this.updatePerformanceLabels(performanceData);
    }

    // UPDATED: Update performance summary labels with exact same formatting as reports page
    updatePerformanceLabels(performanceData) {
        const { occupancyRate, responseRate, satisfactionScore } = performanceData;

        // Find all performance summary spans and update them - SAME as reports page
        const performanceElements = document.querySelectorAll('.recent-activity .d-flex.justify-content-between span:last-child');
        
        if (performanceElements.length >= 3) {
            // Occupancy Rate - SAME format as reports page
            performanceElements[0].textContent = `${Math.round(occupancyRate)}%`;
            
            // Response Rate - SAME format as reports page
            performanceElements[1].textContent = `${responseRate}%`;
            
            // Satisfaction Score - SAME format as reports page (convert back to 5-point scale)
            const satisfactionOutOf5 = (satisfactionScore / 20).toFixed(1);
            performanceElements[2].textContent = `${satisfactionOutOf5}/5`;
        }

        // Also update the progress bar accessibility labels
        const progressBars = document.querySelectorAll('.recent-activity .progress-bar');
        if (progressBars.length >= 3) {
            progressBars[0].setAttribute('aria-valuenow', Math.round(occupancyRate));
            progressBars[0].setAttribute('aria-valuetext', `${Math.round(occupancyRate)}% occupancy rate`);
            
            progressBars[1].setAttribute('aria-valuenow', responseRate);
            progressBars[1].setAttribute('aria-valuetext', `${responseRate}% response rate`);
            
            progressBars[2].setAttribute('aria-valuenow', satisfactionScore);
            progressBars[2].setAttribute('aria-valuetext', `${satisfactionScore}% satisfaction score`);
        }

        // Update KPI section with same data
        this.updateKPISection(performanceData);
    }

    // NEW: Update KPI section with same data as performance summary
    updateKPISection(performanceData) {
        const { occupancyRate, responseRate, satisfactionScore } = performanceData;

        const kpiOccupancyElement = document.getElementById('kpiOccupancyRate');
        if (kpiOccupancyElement) {
            kpiOccupancyElement.textContent = `${Math.round(occupancyRate)}%`;
        }

        // Update other KPI elements if they exist
        const kpiElements = document.querySelectorAll('#performance .report-section .row.text-center h3');
        if (kpiElements.length >= 4) {
            kpiElements[0].textContent = `${Math.round(occupancyRate)}%`;
            // Keep other KPIs as they are or update them similarly
            kpiElements[2].textContent = (satisfactionScore / 20).toFixed(1);
        }
    }

    // Keep all other existing methods the same but ensure they use consistent data
    async fetchProperties() {
        try {
            const response = await fetch(`${API_BASE_URL}/properties/user/my-properties`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.properties || [];
            }
            return [];
        } catch (error) {
            console.warn('Failed to fetch properties:', error);
            return [];
        }
    }

    async fetchBookings() {
        try {
            const response = await fetch(`${API_BASE_URL}/bookings/my-bookings`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.bookings || [];
            }
            return [];
        } catch (error) {
            console.warn('Failed to fetch bookings:', error);
            return [];
        }
    }

    async fetchReports() {
        try {
            const response = await fetch(`${API_BASE_URL}/reports/landlord/my-reports`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.reports || [];
            } else if (response.status === 404) {
                return this.fetchReportsFallback();
            }
            return [];
        } catch (error) {
            console.warn('Failed to fetch reports:', error);
            return this.fetchReportsFallback();
        }
    }

    async fetchReportsFallback() {
        try {
            const response = await fetch(`${API_BASE_URL}/reports/admin/all`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const properties = await this.fetchProperties();
                const propertyIds = properties.map(p => p._id);
                
                return (data.reports || []).filter(report => 
                    propertyIds.includes(report.reportedProperty?._id) ||
                    propertyIds.includes(report.propertyId)
                );
            }
            return [];
        } catch (error) {
            console.error('Fallback reports fetch failed:', error);
            return [];
        }
    }

    async fetchReviews() {
        try {
            const response = await fetch(`${API_BASE_URL}/reviews/my-reviews`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.reviews || [];
            }
            return [];
        } catch (error) {
            console.warn('Failed to fetch reviews:', error);
            return [];
        }
    }

    updateStats(properties, bookings, reports, reviews) {
        this.animateCounter('propertiesCount', properties.length || 0);

        const activeBookings = bookings.filter(booking => 
            booking.status === 'confirmed' || booking.status === 'active'
        ).length;
        this.animateCounter('bookingsCount', activeBookings);

        const pendingRequests = bookings.filter(booking => 
            booking.status === 'pending'
        ).length;
        this.animateCounter('pendingCount', pendingRequests);

        const openReports = reports.filter(report => 
            report.status === 'pending' || report.status === 'under_review'
        ).length;
        this.animateCounter('reportsCount', openReports);
    }

    animateCounter(elementId, targetValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const duration = 1000;
        const step = targetValue / (duration / 16);
        let current = 0;

        const timer = setInterval(() => {
            current += step;
            if (current >= targetValue) {
                current = targetValue;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current);
        }, 16);
    }

    animateProgressBar(selector, targetPercentage) {
        const progressBar = document.querySelector(selector);
        if (!progressBar) return;

        const duration = 1500;
        const startTime = performance.now();
        const startWidth = 0;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentWidth = startWidth + (targetPercentage - startWidth) * easeOut;
            
            progressBar.style.width = `${currentWidth}%`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    updateRecentActivity(bookings, reports, reviews) {
        const activityList = document.getElementById('recentActivityList');
        activityList.innerHTML = '';

        const activities = [];
        
        bookings.slice(0, 2).forEach(booking => {
            activities.push({
                type: 'booking',
                item: booking,
                date: booking.createdAt || new Date(),
                status: booking.status,
                icon: 'bi-calendar-check',
                color: 'primary'
            });
        });

        reports.slice(0, 2).forEach(report => {
            activities.push({
                type: 'report',
                item: report,
                date: report.createdAt || new Date(),
                status: report.status,
                icon: 'bi-flag',
                color: 'warning'
            });
        });

        reviews.slice(0, 1).forEach(review => {
            activities.push({
                type: 'review',
                item: review,
                date: review.createdAt || new Date(),
                status: 'new',
                icon: 'bi-chat-left-text',
                color: 'info'
            });
        });

        activities.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (activities.length === 0) {
            activityList.innerHTML = '<div class="text-center text-muted py-3">No recent activity</div>';
            return;
        }

        activities.forEach((activity, index) => {
            const activityItem = this.createEnhancedActivityItem(activity, index);
            activityList.appendChild(activityItem);
        });
    }

    createEnhancedActivityItem(activity, index) {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.style.animationDelay = `${index * 0.1}s`;
        
        const statusClass = this.getStatusClass(activity.status);
        const activityText = this.getActivityText(activity);
        const timeAgo = this.getTimeAgo(activity.date);

        item.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="activity-icon bg-${activity.color} rounded-circle d-flex align-items-center justify-content-center me-3" 
                     style="width: 40px; height: 40px;">
                    <i class="bi ${activity.icon} text-white"></i>
                </div>
                <div class="flex-grow-1">
                    <div class="fw-medium">${activityText}</div>
                    <small class="text-muted">${timeAgo}</small>
                </div>
                <span class="badge ${statusClass}">${this.formatStatus(activity.status)}</span>
            </div>
        `;

        return item;
    }

    getActivityText(activity) {
        if (activity.type === 'booking') {
            const propertyName = activity.item.property?.title || 'your property';
            const studentName = activity.item.student?.username || 'a student';
            
            switch (activity.item.status) {
                case 'pending':
                    return `New booking request from ${studentName}`;
                case 'confirmed':
                    return `Booking confirmed for ${propertyName}`;
                case 'cancelled':
                    return `Booking cancelled for ${propertyName}`;
                default:
                    return `Booking update for ${propertyName}`;
            }
        } else if (activity.type === 'report') {
            const reportTitle = activity.item.title || 'Maintenance report';
            return `New report: ${reportTitle}`;
        } else if (activity.type === 'review') {
            const studentName = activity.item.student?.username || 'a student';
            return `New review from ${studentName}`;
        }
        return 'New activity';
    }

    updateUpcomingBookings(bookings) {
        const upcomingList = document.getElementById('upcomingBookingsList');
        upcomingList.innerHTML = '';

        const upcomingBookings = bookings.filter(booking => {
            if (booking.status !== 'confirmed') return false;
            const bookingDate = new Date(booking.checkIn);
            const today = new Date();
            return bookingDate >= today;
        })
        .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn))
        .slice(0, 3);

        if (upcomingBookings.length === 0) {
            upcomingList.innerHTML = '<div class="text-center text-muted py-3">No upcoming bookings</div>';
            return;
        }

        upcomingBookings.forEach(booking => {
            const bookingItem = this.createBookingItem(booking);
            upcomingList.appendChild(bookingItem);
        });
    }

    createBookingItem(booking) {
        const item = document.createElement('div');
        item.className = 'activity-item';
        
        const statusClass = this.getStatusClass(booking.status);
        const bookingDate = new Date(booking.checkIn).toLocaleDateString();
        const bookingTime = new Date(booking.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const propertyName = booking.property?.title || 'Property';
        const studentName = booking.student?.username || 'Student';

        item.innerHTML = `
            <div class="d-flex align-items-start">
                <div class="flex-grow-1">
                    <div class="fw-medium">${propertyName}</div>
                    <small class="text-muted">${bookingDate}, ${bookingTime}</small>
                    <div class="mt-1">
                        <span class="badge bg-light text-dark small">
                            <i class="bi bi-person me-1"></i>${studentName}
                        </span>
                    </div>
                </div>
                <span class="badge ${statusClass}">${this.formatStatus(booking.status)}</span>
            </div>
        `;

        return item;
    }

    getStatusClass(status) {
        const statusMap = {
            'pending': 'bg-warning',
            'confirmed': 'bg-success',
            'cancelled': 'bg-danger',
            'completed': 'bg-secondary',
            'under_review': 'bg-info',
            'resolved': 'bg-success',
            'new': 'bg-info'
        };
        return statusMap[status] || 'bg-secondary';
    }

    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours} hours ago`;
        if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`;
        return date.toLocaleDateString();
    }

    formatStatus(status) {
        return status.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    setupAnimations() {
        this.addHoverEffects();
        this.setupScrollAnimations();
    }

    addHoverEffects() {
        const cards = document.querySelectorAll('.stats-card, .action-card, .activity-item');
        cards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-2px)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
            });
        });
    }

    setupScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.stats-card, .action-card, .recent-activity').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'all 0.6s ease-out';
            observer.observe(el);
        });
    }

    updateReportsAlert(reports) {
        const openReports = reports.filter(report => 
            report.status === 'pending' || report.status === 'under_review'
        );

        if (openReports.length > 0) {
            this.showReportsNotification(openReports.length);
        }
    }

    showReportsNotification(count) {
        let alertDiv = document.getElementById('reportsAlert');
        
        if (!alertDiv) {
            alertDiv = document.createElement('div');
            alertDiv.id = 'reportsAlert';
            alertDiv.className = 'alert alert-warning alert-dismissible fade show';
            alertDiv.innerHTML = `
                <i class="bi bi-exclamation-triangle me-2"></i>
                <strong>You have ${count} open report(s) requiring attention</strong>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                <div class="mt-2">
                    <a href="landlord-reports.html" class="btn btn-sm btn-warning">View Reports</a>
                </div>
            `;
            document.querySelector('main').prepend(alertDiv);
        }
    }

    showError(message) {
        console.error(message);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-warning alert-dismissible fade show';
        errorDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.querySelector('main').prepend(errorDiv);
    }

    setupReportsNotification() {
        setInterval(async () => {
            try {
                const reports = await this.fetchReports();
                const openReports = reports.filter(report => 
                    report.status === 'pending' || report.status === 'under_review'
                );
                this.updateReportsAlert(openReports);
            } catch (error) {
                console.warn('Failed to check for new reports:', error);
            }
        }, 300000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LandlordDashboard();
});