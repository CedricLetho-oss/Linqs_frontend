

class MyBookingsManager {
    constructor() {
        this.bookings = [];
        this.isLoading = false;
        this.rescheduleModal = null;
        this.currentRescheduleBooking = null;
    }

    async init() {
        await this.loadBookings();
        this.setupEventListeners();
        this.initializeRescheduleModal();
    }

    async loadBookings() {
        try {
            this.showLoadingState(true);
            
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            console.log('Fetching bookings from:', `${API_BASE_URL}/bookings/my-bookings`);

            const response = await fetch(`${API_BASE_URL}/bookings/my-bookings`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Bookings data received:', data);
            
            this.bookings = data.bookings || [];
            console.log('Processed bookings:', this.bookings);
            
            this.renderBookings();
            this.updateStats();

        } catch (error) {
            console.error('Error loading bookings:', error);
            this.showError('Failed to load bookings. Please try again later.');
        } finally {
            this.showLoadingState(false);
        }
    }

    renderBookings() {
        // Show empty state if no bookings
        if (this.bookings.length === 0) {
            document.getElementById('emptyState').style.display = 'block';
            this.hideAllContainers();
            return;
        }

        document.getElementById('emptyState').style.display = 'none';
        
        // Render bookings in respective tabs
        const containers = {
            all: this.bookings,
            pending: this.bookings.filter(b => b.status === 'pending'),
            approved: this.bookings.filter(b => b.status === 'confirmed'),
            upcoming: this.bookings.filter(b => 
                b.status === 'confirmed' && new Date(b.checkIn) > new Date()
            ),
            completed: this.bookings.filter(b => 
                b.status === 'completed' || b.status === 'cancelled'
            )
        };

        Object.keys(containers).forEach(tab => {
            const container = document.getElementById(`${tab}BookingsContainer`);
            if (container) {
                container.innerHTML = containers[tab].map(booking => 
                    this.generateBookingCard(booking)
                ).join('');
            }
        });
    }

    hideAllContainers() {
        const containers = ['all', 'pending', 'approved', 'upcoming', 'completed'];
        containers.forEach(tab => {
            const container = document.getElementById(`${tab}BookingsContainer`);
            if (container) container.innerHTML = '';
        });
    }

generateBookingCard(booking) {
    const status = this.getStatusConfig(booking.status);
    const isUpcoming = booking.status === 'confirmed' && new Date(booking.checkIn) > new Date();
    const canReschedule = this.canRescheduleBooking(booking);
    const property = booking.property || {};
    const landlord = booking.landlord || {};
    
    // Get booking type and pricing information
    const bookingType = booking.bookingType || 'student';
    const isTenant = bookingType === 'short-term' || bookingType === 'tenant';
    const typeBadgeClass = isTenant ? 'bg-info' : 'bg-primary';
    const typeText = isTenant ? 'Short-term' : 'Student';
    const typeIcon = isTenant ? 'bi-person' : 'bi-person-check';
    
    // Price display based on booking type
    const priceDisplay = isTenant ? 
        (booking.negotiatedPrice > 0 ? 
            `R${booking.negotiatedPrice} (negotiated)` : 
            'Price to be negotiated') : 
        `R${property.price}/month`;

    const propertyImage = property.images && property.images[0] 
        ? property.images[0] 
        : 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250&q=80';

    return `
    <div class="col-md-6 col-lg-4 mb-4">
        <div class="card booking-card h-100 ${booking.status}">
            <div class="card-header bg-white d-flex justify-content-between align-items-center border-bottom-0">
                <span class="badge bg-${status.class} status-badge">
                    <i class="${status.icon} me-1"></i>${status.text}
                </span>
                <!-- Combined badges container -->
                <div class="d-flex gap-1">
                    ${isUpcoming ? '<span class="badge text-white status-badge" style="background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);"><i class="bi bi-calendar-event me-1"></i>Upcoming</span>' : ''}
                    <span class="badge ${typeBadgeClass} status-badge">
                        <i class="${typeIcon} me-1"></i>${typeText}
                    </span>
                </div>
            </div>
            
            <!-- Property Image -->
            <div class="property-image-container">
                <img src="${propertyImage}" 
                     class="card-img-top property-image" 
                     alt="${property.title}"
                     onerror="this.src='https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250&q=80'">
            </div>
            
            <div class="card-body">
                <h5 class="card-title text-navy">${property.title}</h5>
                <p class="text-muted mb-2">
                    <i class="bi bi-geo-alt me-1"></i>${property.location ? `${property.location.city}, ${property.location.state}` : 'Location not specified'}
                </p>
                <p class="text-muted mb-2">
                    <i class="bi bi-person me-1"></i>${landlord.username || 'Landlord not specified'}
                </p>
                <p class="text-muted mb-3">
                    <i class="bi bi-cash-coin me-1"></i>${priceDisplay}
                </p>
                
                <!-- Show stay duration for tenants -->
                ${isTenant && booking.stayDuration ? `
                    <p class="text-muted mb-2">
                        <i class="bi bi-clock me-1"></i>Requested Stay: ${booking.stayDuration}
                    </p>
                ` : ''}
                
                <!-- Special requests/notes section -->
                ${booking.specialRequests ? `
                    <div class="alert alert-light small mb-3">
                        <strong><i class="bi bi-chat-text me-1"></i>Notes:</strong><br>
                        ${this.extractSpecialRequests(booking.specialRequests)}
                    </div>
                ` : ''}
                
                <div class="booking-timeline mb-3">
                    <div class="timeline-step ${['confirmed', 'completed', 'cancelled'].includes(booking.status) ? 'completed' : 'active'}">
                        <small class="text-muted">Booking Requested</small>
                        <div class="small">${this.formatDate(booking.createdAt)}</div>
                    </div>
                    <div class="timeline-step ${['confirmed', 'completed'].includes(booking.status) ? 'completed' : booking.status === 'pending' ? 'active' : ''}">
                        <small class="text-muted">Scheduled For</small>
                        <div class="small">${this.formatDateTime(booking.checkIn)}</div>
                    </div>
                    <div class="timeline-step ${['completed', 'cancelled'].includes(booking.status) ? 'completed' : ''}">
                        <small class="text-muted">Status</small>
                        <div class="small">${this.getStatusDescription(booking.status)}</div>
                    </div>
                </div>
                
                <!-- Tenant-specific information -->
                ${isTenant ? `
                    <div class="alert alert-info small mb-3">
                        <i class="bi bi-info-circle me-1"></i>
                        <strong>Short-term Stay:</strong> The landlord will contact you to discuss pricing and stay duration.
                    </div>
                ` : ''}
                
                <div class="d-grid gap-2">
                    ${booking.status === 'pending' ? 
                      `<button class="btn btn-outline-warning btn-booking" onclick="myBookingsManager.cancelBooking('${booking._id}')">
                        <i class="bi bi-x-circle me-1"></i>Cancel Request
                      </button>` : ''}
                    
                    ${canReschedule ? 
                      `<button class="btn btn-outline-primary btn-booking" onclick="myBookingsManager.openRescheduleModal('${booking._id}')">
                        <i class="bi bi-calendar-week me-1"></i>Reschedule
                      </button>` : ''}
                      
                    <button class="btn btn-outline-navy btn-booking" onclick="myBookingsManager.viewPropertyDetails('${property._id}')">
                        <i class="bi bi-eye me-1"></i>View Property
                    </button>

                    <!-- Contact landlord button for tenants -->
                    ${isTenant ? 
                      `<button class="btn btn-outline-info btn-booking" onclick="myBookingsManager.contactLandlord('${booking._id}')">
                        <i class="bi bi-envelope me-1"></i>Contact Landlord
                      </button>` : ''}

                    ${booking.status === 'confirmed' && new Date(booking.checkIn) > new Date() ? 
                      `<button class="btn btn-outline-secondary btn-booking" onclick="myBookingsManager.addToCalendar('${booking._id}')">
                        <i class="bi bi-calendar-plus me-1"></i>Add to Calendar
                      </button>` : ''}
                </div>
            </div>
        </div>
    </div>
    `;
}

// Update the getStatusDescription method to be clearer
getStatusDescription(status) {
    const descriptions = {
        pending: 'Awaiting landlord confirmation',
        confirmed: '✅ Viewing confirmed - See you there!',
        cancelled: '❌ Booking cancelled',
        completed: '✅ Viewing completed',
        rescheduled: '🔄 Reschedule requested'
    };
    return descriptions[status] || status;
}

// Update the getStatusConfig to show better icons for confirmed status
getStatusConfig(status) {
    const config = {
        pending: { 
            class: 'warning', 
            text: 'Pending Approval', 
            icon: 'bi-clock'
        },
        confirmed: { 
            class: 'success', 
            text: 'Confirmed', 
            icon: 'bi-check-circle-fill' // Changed to filled icon for confirmed
        },
        cancelled: { 
            class: 'danger', 
            text: 'Cancelled', 
            icon: 'bi-x-circle'
        },
        completed: { 
            class: 'secondary', 
            text: 'Completed', 
            icon: 'bi-check-lg'
        },
        rescheduled: { 
            class: 'info', 
            text: 'Rescheduled', 
            icon: 'bi-calendar-week'
        }
    };
    return config[status] || { class: 'secondary', text: status, icon: 'bi-question-circle' };
}

    // NEW: Extract and format special requests
    extractSpecialRequests(specialRequests) {
        if (!specialRequests) return '';
        
        // Remove booking type prefix if present
        return specialRequests.replace(/Booking Type: .+?(\n|$)/, '')
                             .replace(/Notes: /, '')
                             .trim();
    }

    // NEW: Contact landlord function for tenants
    contactLandlord(bookingId) {
        const booking = this.bookings.find(b => b._id === bookingId);
        if (!booking || !booking.landlord) return;

        const landlord = booking.landlord;
        const subject = `Regarding my booking for ${booking.property.title}`;
        const body = `Hello ${landlord.username},\n\nI would like to discuss my booking for ${booking.property.title}.\n\nBest regards,\n[Your Name]`;
        
        const mailtoLink = `mailto:${landlord.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
    }

    // NEW: Get user role for display customization
    getUserRole() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user.role || 'student';
    }

    // Rest of your existing methods remain the same...
    canRescheduleBooking(booking) {
        if (booking.status !== 'confirmed') return false;
        
        const bookingDate = new Date(booking.checkIn);
        const now = new Date();
        const hoursUntilBooking = (bookingDate - now) / (1000 * 60 * 60);
        
        // Allow rescheduling up to 2 hours before the booking
        return hoursUntilBooking > 2;
    }

    initializeRescheduleModal() {
        // ... keep your existing reschedule modal code
        if (!document.getElementById('rescheduleModal')) {
            const modalHTML = `
            <div class="modal fade" id="rescheduleModal" tabindex="-1" aria-labelledby="rescheduleModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-gradient-primary text-white">
                            <h5 class="modal-title" id="rescheduleModalLabel">
                                <i class="bi bi-calendar-week me-2"></i>Reschedule Viewing
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div id="rescheduleBookingInfo" class="mb-4">
                                <!-- Booking info will be populated here -->
                            </div>
                            
                            <form id="rescheduleForm">
                                <div class="mb-3">
                                    <label for="newDateTime" class="form-label">New Date & Time</label>
                                    <input type="datetime-local" class="form-control" id="newDateTime" required>
                                    <div class="form-text">Please select a new date and time for your viewing</div>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="rescheduleReason" class="form-label">Reason for Rescheduling (Optional)</label>
                                    <textarea class="form-control" id="rescheduleReason" rows="3" placeholder="Let the landlord know why you need to reschedule..."></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="submitRescheduleBtn" onclick="myBookingsManager.submitReschedule()">
                                <i class="bi bi-calendar-check me-1"></i>Request Reschedule
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        this.rescheduleModal = new bootstrap.Modal(document.getElementById('rescheduleModal'));
    }

    // ... rest of your existing methods (openRescheduleModal, submitReschedule, etc.)
    openRescheduleModal(bookingId) {
        const booking = this.bookings.find(b => b._id === bookingId);
        if (!booking) return;

        this.currentRescheduleBooking = booking;

        // Populate booking info
        const bookingInfo = document.getElementById('rescheduleBookingInfo');
        const bookingType = booking.bookingType || 'student';
        const isTenant = bookingType === 'short-term' || bookingType === 'tenant';
        
        bookingInfo.innerHTML = `
            <div class="alert alert-light border">
                <h6 class="mb-2">${booking.property.title}</h6>
                <p class="mb-1 small">
                    <i class="bi bi-calendar me-1"></i>
                    Current: ${this.formatDateTime(booking.checkIn)}
                </p>
                <p class="mb-1 small">
                    <i class="bi bi-person me-1"></i>
                    Landlord: ${booking.landlord.username}
                </p>
                ${isTenant ? `
                <p class="mb-0 small text-info">
                    <i class="bi bi-info-circle me-1"></i>
                    Short-term stay - pricing to be negotiated
                </p>
                ` : ''}
            </div>
        `;

        // Set min date/time for rescheduling (at least 2 hours from now)
        const now = new Date();
        const minDateTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
        const minDateTimeString = minDateTime.toISOString().slice(0, 16);
        
        const dateTimeInput = document.getElementById('newDateTime');
        dateTimeInput.min = minDateTimeString;
        dateTimeInput.value = '';

        // Clear previous form data
        document.getElementById('rescheduleReason').value = '';

        this.rescheduleModal.show();
    }

    async submitReschedule() {
        if (!this.currentRescheduleBooking) return;

        const newDateTime = document.getElementById('newDateTime').value;
        const reason = document.getElementById('rescheduleReason').value;

        if (!newDateTime) {
            alert('Please select a new date and time for your viewing.');
            return;
        }

        const selectedDateTime = new Date(newDateTime);
        const now = new Date();

        if (selectedDateTime <= now) {
            alert('Please select a future date and time for your viewing.');
            return;
        }

        try {
            const submitBtn = document.getElementById('submitRescheduleBtn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Processing...';

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/bookings/${this.currentRescheduleBooking._id}/reschedule`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    newCheckIn: newDateTime,
                    reason: reason || 'No reason provided'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to reschedule booking');
            }

            const result = await response.json();
            
            this.rescheduleModal.hide();
            alert('Reschedule request sent successfully! The landlord will review your request.');
            
            // Reload bookings to reflect changes
            await this.loadBookings();

        } catch (error) {
            console.error('Error rescheduling booking:', error);
            alert(`Failed to reschedule: ${error.message}`);
        } finally {
            const submitBtn = document.getElementById('submitRescheduleBtn');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-calendar-check me-1"></i>Request Reschedule';
        }
    }

    formatDate(dateString) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-ZA', options);
    }

    formatDateTime(dateTimeString) {
        const date = new Date(dateTimeString);
        return date.toLocaleString('en-ZA', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    updateStats() {
        const totalBookings = this.bookings.length;
        const pendingBookings = this.bookings.filter(b => b.status === 'pending').length;
        const approvedBookings = this.bookings.filter(b => b.status === 'confirmed').length;
        const upcomingBookings = this.bookings.filter(b => 
            b.status === 'confirmed' && new Date(b.checkIn) > new Date()
        ).length;

        document.getElementById('totalBookings').textContent = totalBookings;
        document.getElementById('pendingBookings').textContent = pendingBookings;
        document.getElementById('approvedBookings').textContent = approvedBookings;
        document.getElementById('upcomingBookings').textContent = upcomingBookings;
    }

    showLoadingState(show) {
        const containers = ['all', 'pending', 'approved', 'upcoming', 'completed'];
        
        if (show) {
            containers.forEach(tab => {
                const container = document.getElementById(`${tab}BookingsContainer`);
                if (container) {
                    container.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <div class="spinner-border text-navy" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="text-muted mt-2">Loading bookings...</p>
                    </div>`;
                }
            });
            document.getElementById('emptyState').style.display = 'none';
        }
    }

    showError(message) {
        const container = document.getElementById('allBookingsContainer');
        if (container) {
            container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-exclamation-triangle display-1 text-danger"></i>
                <h3 class="text-navy mt-3">Something went wrong</h3>
                <p class="text-muted">${message}</p>
                <button class="btn btn-navy" onclick="myBookingsManager.loadBookings()">
                    Try Again
                </button>
            </div>`;
        }
    }

    setupEventListeners() {
        // Tab change listeners if needed
        const tabEls = document.querySelectorAll('#bookingTabs button[data-bs-toggle="pill"]');
        tabEls.forEach(tab => {
            tab.addEventListener('shown.bs.tab', (event) => {
                // You can add specific tab loading logic here if needed
            });
        });
    }

    async cancelBooking(bookingId) {
        if (!confirm('Are you sure you want to cancel this booking request?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: 'cancelled',
                    cancellationReason: 'Cancelled by student'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to cancel booking');
            }

            alert('Booking request cancelled successfully');
            await this.loadBookings(); // Reload bookings

        } catch (error) {
            console.error('Error cancelling booking:', error);
            alert('Failed to cancel booking. Please try again.');
        }
    }

    async confirmAttendance(bookingId) {
        if (!confirm('Confirm your attendance for this viewing?')) return;

        try {
            // This would be a custom endpoint in your backend
            // For now, we'll just show an alert
            alert('Attendance confirmed! The landlord has been notified.');
            
            // In a real implementation, you would call an API endpoint here
            // await fetch(`${API_BASE_URL}/bookings/${bookingId}/confirm-attendance`, {...});

        } catch (error) {
            console.error('Error confirming attendance:', error);
            alert('Failed to confirm attendance. Please try again.');
        }
    }

    viewPropertyDetails(propertyId) {
        // Navigate to property details page
        window.location.href = `property-details.html?id=${propertyId}`;
    }

    addToCalendar(bookingId) {
        const booking = this.bookings.find(b => b._id === bookingId);
        if (!booking) return;

        // Create calendar event
        const startTime = new Date(booking.checkIn);
        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration
        
        const calendarEvent = {
            title: `Property Viewing - ${booking.property.title}`,
            description: `Viewing appointment for ${booking.property.title} with ${booking.landlord.username}`,
            location: booking.property.location ? `${booking.property.location.address}, ${booking.property.location.city}` : '',
            start: startTime.toISOString().replace(/-|:|\.\d+/g, ''),
            end: endTime.toISOString().replace(/-|:|\.\d+/g, '')
        };

        // Create Google Calendar URL
        const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calendarEvent.title)}&dates=${calendarEvent.start}/${calendarEvent.end}&details=${encodeURIComponent(calendarEvent.description)}&location=${encodeURIComponent(calendarEvent.location)}`;
        
        window.open(googleCalendarUrl, '_blank');
    }
}

// Initialize the bookings manager
const myBookingsManager = new MyBookingsManager();

// Start when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    myBookingsManager.init();
});