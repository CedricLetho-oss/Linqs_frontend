// booking.js - FIXED with proper URL parameter handling
const API_BASE_URL = 'https://linqs-backend.onrender.com/api';

// Booking Management
let bookingSteps = [];
let steps = [];
let progressBar = null;
let currentStep = 1;
let selectedAccommodation = null;
let selectedBookingType = null;
let selectedProperty = null;

// Store form data as user progresses
let formData = {
    bookingDateTime: null,
    bookingNotes: null,
    studentName: null,
    studentEmail: null,
    studentPhone: null,
    studentNumber: null
};

// Safe element access utility functions
function getElementValue(id) {
    const element = document.getElementById(id);
    return element ? element.value : null;
}

function getElement(id) {
    return document.getElementById(id);
}

// Store form data when moving between steps
function storeFormData() {
    formData.bookingDateTime = getElementValue('bookingDateTime');
    formData.bookingNotes = getElementValue('bookingNotes');
    formData.studentName = getElementValue('studentName');
    formData.studentEmail = getElementValue('studentEmail');
    formData.studentPhone = getElementValue('studentPhone');
    formData.studentNumber = getElementValue('studentNumber');
}

// Initialize booking form
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing booking form...');
    
    // Cache DOM nodes safely
    bookingSteps = document.querySelectorAll(".booking-step");
    steps = document.querySelectorAll(".step");
    progressBar = document.getElementById("progressBar");

    console.log('Elements found:', {
        bookingSteps: bookingSteps.length,
        steps: steps.length, 
        progressBar: !!progressBar
    });

    initializeBookingForm();
    setupEventListeners();
    handleURLParameters();
    loadUserInfo();
    
    console.log('Booking form initialized successfully');
});

function initializeBookingForm() {
    updateProgress();
    setupAccommodationCards();
    setupBookingTypeCards();
    setDefaultDateTime();
}

function attachFormListener(form) {
    // Remove existing listener to avoid duplicates
    form.removeEventListener('submit', handleBookingSubmission);
    form.addEventListener('submit', handleBookingSubmission);
    console.log('✅ Form submit listener attached successfully');
}

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Next step buttons
    document.querySelectorAll('.next-step').forEach(btn => {
        btn.addEventListener('click', function() {
            storeFormData(); // Store data before moving to next step
            nextStep();
        });
    });

    // Previous step buttons
    document.querySelectorAll('.prev-step').forEach(btn => {
        btn.addEventListener('click', function() {
            storeFormData(); // Store data before moving back
            prevStep();
        });
    });

    // Form submission (safe binding with retry)
    let bookingForm = document.getElementById('bookingForm');
    
    if (!bookingForm) {
        console.warn('Booking form not found initially, retrying in 100ms...');
        // Retry after a short delay in case DOM isn't fully ready
        setTimeout(() => {
            bookingForm = document.getElementById('bookingForm');
            if (bookingForm) {
                attachFormListener(bookingForm);
            } else {
                console.error('❌ Booking form not found after retry!');
            }
        }, 100);
    } else {
        attachFormListener(bookingForm);
    }
}

// FIXED: Proper user info fetching like reports page
async function loadUserInfo() {
    try {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        console.log('Loading user info...', { token: !!token, userData: !!userData });
        
        if (token && userData) {
            const user = JSON.parse(userData);
            
            // Use the same approach as reports page - combine firstName and surname
            const fullName = `${user.firstName || ''} ${user.surname || ''}`.trim();
            
            // Auto-fill user information (safe access)
            const nameField = document.getElementById('studentName');
            const emailField = document.getElementById('studentEmail');
            const phoneField = document.getElementById('studentPhone');
            const studentNumberField = document.getElementById('studentNumber');

            console.log('User data found:', { 
                fullName, 
                email: user.email, 
                phone: user.phone,
                studentNumber: user.studentNumber 
            });

            if (nameField) {
                nameField.value = fullName || user.username || '';
                formData.studentName = fullName || user.username || '';
            }
            if (emailField) {
                emailField.value = user.email || '';
                formData.studentEmail = user.email || '';
            }
            if (phoneField) {
                phoneField.value = user.phone || '';
                formData.studentPhone = user.phone || '';
            }
            if (studentNumberField && user.role === 'student') {
                studentNumberField.value = user.studentNumber || '';
                formData.studentNumber = user.studentNumber || '';
            }
            
            console.log('User info prefilled successfully');
        } else {
            console.warn('No user token or data found in localStorage');
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

// FIXED: Enhanced URL parameter handling to properly fetch property details
async function handleURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const property = urlParams.get("property");
    const landlord = urlParams.get("landlord");
    const propertyId = urlParams.get("propertyId");
    const landlordId = urlParams.get("landlordId");

    console.log('URL parameters:', { property, landlord, propertyId, landlordId });

    const autoFillSection = document.getElementById('autoFillSection');
    const manualSelectionSection = document.getElementById('manualSelectionSection');
    const propertyField = document.getElementById('propertyField');
    const landlordField = document.getElementById('landlordField');

    // FIXED: Check if propertyId exists first, then load property details
    if (propertyId) {
        console.log('Loading property details for ID:', propertyId);
        await loadPropertyDetails(propertyId);
    } else if (property && landlord) {
        console.log('Showing auto-fill section from URL params');
        if (autoFillSection) autoFillSection.style.display = 'block';
        if (manualSelectionSection) manualSelectionSection.style.display = 'none';

        if (propertyField) propertyField.value = decodeURIComponent(property);
        if (landlordField) landlordField.value = decodeURIComponent(landlord);

        // Store IDs for backend - ONLY if they exist and are valid (like reports page)
        selectedAccommodation = {
            property: decodeURIComponent(property),
            landlord: decodeURIComponent(landlord),
            propertyId: propertyId && propertyId !== 'null' && propertyId !== 'undefined' ? propertyId : null,
            landlordId: landlordId && landlordId !== 'null' && landlordId !== 'undefined' ? landlordId : null
        };
        
        console.log('Auto-filled accommodation:', selectedAccommodation);
    } else {
        console.log('Showing manual selection section (no URL params)');
        if (autoFillSection) autoFillSection.style.display = 'none';
        if (manualSelectionSection) manualSelectionSection.style.display = 'block';
        await loadAvailableProperties();
    }
}

// FIXED: Enhanced property details loading to properly update the UI
async function loadPropertyDetails(propertyId) {
    try {
        console.log('Loading property details for ID:', propertyId);
        const response = await fetch(`${API_BASE_URL}/properties/${propertyId}`);
        if (!response.ok) throw new Error('Failed to fetch property details');
        
        const data = await response.json();
        selectedProperty = data.property || data;

        console.log('Property details loaded:', selectedProperty);

        const autoFillSection = document.getElementById('autoFillSection');
        const manualSelectionSection = document.getElementById('manualSelectionSection');
        if (autoFillSection) autoFillSection.style.display = 'block';
        if (manualSelectionSection) manualSelectionSection.style.display = 'none';

        const propertyField = document.getElementById('propertyField');
        const landlordField = document.getElementById('landlordField');
        
        if (propertyField) propertyField.value = selectedProperty.title || 'Unknown Property';
        
        // FIXED: Better landlord name handling
        let landlordName = 'Unknown Landlord';
        if (selectedProperty.landlord) {
            if (typeof selectedProperty.landlord === 'object') {
                landlordName = `${selectedProperty.landlord.firstName || ''} ${selectedProperty.landlord.surname || ''}`.trim() || 
                              selectedProperty.landlord.username || 
                              'Unknown Landlord';
            } else {
                landlordName = selectedProperty.landlord;
            }
        }
        
        if (landlordField) landlordField.value = landlordName;

        selectedAccommodation = {
            property: selectedProperty.title || 'Unknown Property',
            landlord: landlordName,
            propertyId: selectedProperty._id,
            landlordId: selectedProperty.landlord?._id || selectedProperty.landlord
        };
        
        console.log('Final accommodation data:', selectedAccommodation);
    } catch (error) {
        console.error('Error loading property details:', error);
        alert('Failed to load property details. Please try again.');
        
        // Fallback to manual selection if property details fail to load
        const autoFillSection = document.getElementById('autoFillSection');
        const manualSelectionSection = document.getElementById('manualSelectionSection');
        if (autoFillSection) autoFillSection.style.display = 'none';
        if (manualSelectionSection) manualSelectionSection.style.display = 'block';
    }
}

async function loadAvailableProperties() {
    try {
        const response = await fetch(`${API_BASE_URL}/properties?limit=10`);
        if (!response.ok) throw new Error('Failed to fetch properties');
        
        const data = await response.json();
        populatePropertyCards(data.properties);
    } catch (error) {
        console.error('Error loading properties:', error);
    }
}

function populatePropertyCards(properties) {
    const container = document.querySelector('#manualSelectionSection .row');
    if (!container || !properties || properties.length === 0) return;

    container.innerHTML = properties.map(property => `
        <div class="col-md-6">
            <div class="accommodation-card" 
                 data-property="${property.title}" 
                 data-landlord="${property.landlord?.username || 'Unknown'}"
                 data-property-id="${property._id}"
                 data-landlord-id="${property.landlord?._id}">
                <div class="d-flex justify-content-between align-items-start">
                    <h6 class="mb-1">${property.title}</h6>
                    <span class="badge ${property.isAvailable ? 'bg-success' : 'bg-danger'}">
                        ${property.isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                </div>
                <p class="text-muted small mb-2">${property.description}</p>
                <div class="d-flex justify-content-between text-sm">
                    <span><i class="bi bi-geo-alt"></i> ${property.location?.city || 'Unknown'}</span>
                    <span><i class="bi bi-currency-dollar"></i> R${property.price}/month</span>
                </div>
                <div class="mt-2">
                    ${(property.amenities || []).slice(0, 3).map(amenity => 
                        `<span class="badge bg-light text-dark me-1">${amenity}</span>`
                    ).join('')}
                </div>
            </div>
        </div>
    `).join('');

    setupAccommodationCards();
}

function toggleManualSelection() {
    const autoFillSection = document.getElementById('autoFillSection');
    const manualSelectionSection = document.getElementById('manualSelectionSection');
    if (autoFillSection) autoFillSection.style.display = 'none';
    if (manualSelectionSection) manualSelectionSection.style.display = 'block';

    selectedAccommodation = null;
    selectedProperty = null;
}

function setupAccommodationCards() {
    const accommodationCards = document.querySelectorAll('.accommodation-card');
    accommodationCards.forEach(card => {
        card.addEventListener('click', function() {
            if (this.querySelector('.bi-plus-circle')) return;
            accommodationCards.forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            
            selectedAccommodation = {
                property: this.getAttribute('data-property'),
                landlord: this.getAttribute('data-landlord'),
                propertyId: this.getAttribute('data-property-id'),
                landlordId: this.getAttribute('data-landlord-id')
            };

            const customForm = document.getElementById('customAccommodationForm');
            if (customForm) customForm.style.display = 'none';
            
            console.log('Accommodation selected:', selectedAccommodation);
        });
    });
}

function selectCustomAccommodation() {
    const customForm = document.getElementById('customAccommodationForm');
    if (customForm) customForm.style.display = 'block';
    document.querySelectorAll('.accommodation-card').forEach(card => card.classList.remove('selected'));
}

function setupBookingTypeCards() {
    const bookingTypeCards = document.querySelectorAll('.booking-type-card');
    bookingTypeCards.forEach(card => {
        card.addEventListener('click', function() {
            bookingTypeCards.forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            selectedBookingType = this.getAttribute('data-type');
        });
    });
}

function setDefaultDateTime() {
    const dateInput = document.getElementById('bookingDateTime');
    if (!dateInput) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    dateInput.value = tomorrow.toISOString().slice(0, 16);
    formData.bookingDateTime = dateInput.value;
}

function nextStep() {
    if (!validateCurrentStep()) return;
    
    if (currentStep < 4) {
        // Update summary before moving to step 4
        if (currentStep === 3) {
            updateSummary();
        }
        
        // Hide current step
        document.querySelector(`.booking-step[data-step="${currentStep}"]`).classList.remove('active');
        document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');
        
        currentStep++;
        
        // Show next step
        document.querySelector(`.booking-step[data-step="${currentStep}"]`).classList.add('active');
        document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');
        
        updateProgress();
    }
}

function prevStep() {
    if (currentStep > 1) {
        // Hide current step
        document.querySelector(`.booking-step[data-step="${currentStep}"]`).classList.remove('active');
        document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');
        
        currentStep--;
        
        // Show previous step
        document.querySelector(`.booking-step[data-step="${currentStep}"]`).classList.add('active');
        document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');
        
        updateProgress();
    }
}

function validateCurrentStep() {
    switch(currentStep) {
        case 1:
            if (!selectedAccommodation) {
                // Check if custom accommodation is filled
                const customProperty = getElementValue('customProperty');
                const customLandlord = getElementValue('customLandlord');
                
                if (customProperty && customLandlord) {
                    selectedAccommodation = {
                        property: customProperty,
                        landlord: customLandlord
                    };
                } else if (!selectedAccommodation) {
                    alert('Please select an accommodation or enter custom accommodation details.');
                    return false;
                }
            }
            break;
            
        case 2:
            if (!selectedBookingType) {
                alert('Please select a booking type.');
                return false;
            }
            
            const bookingDateTime = formData.bookingDateTime || getElementValue('bookingDateTime');
            if (!bookingDateTime) {
                alert('Please select your preferred date and time.');
                return false;
            }
            
            // Check if selected date is in the future
            const selectedDate = new Date(bookingDateTime);
            const now = new Date();
            if (selectedDate <= now) {
                alert('Please select a future date and time for your booking.');
                return false;
            }
            break;
            
        case 3:
            const fullName = formData.studentName || getElementValue('studentName');
            const email = formData.studentEmail || getElementValue('studentEmail');
            const phone = formData.studentPhone || getElementValue('studentPhone');
            
            if (!fullName || !email || !phone) {
                alert('Please provide your name, email, and phone number.');
                return false;
            }
            
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('Please enter a valid email address.');
                return false;
            }
            break;
    }
    
    return true;
}

function updateSummary() {
    // Update accommodation details
    if (selectedAccommodation) {
        document.getElementById('summaryProperty').textContent = selectedAccommodation.property;
        document.getElementById('summaryLandlord').textContent = selectedAccommodation.landlord;
    }
    
    // Update booking details
    const bookingTypeText = getBookingTypeText(selectedBookingType);
    document.getElementById('summaryBookingType').textContent = bookingTypeText;
    
    const dateTime = formData.bookingDateTime;
    document.getElementById('summaryDateTime').textContent = formatDateTime(dateTime);
    
    const notes = formData.bookingNotes;
    document.getElementById('summaryNotes').textContent = notes || 'None';
    
    // Update personal information
    document.getElementById('summaryName').textContent = formData.studentName || 'Not provided';
    document.getElementById('summaryEmail').textContent = formData.studentEmail || 'Not provided';
    document.getElementById('summaryPhone').textContent = formData.studentPhone || 'Not provided';
    document.getElementById('summaryStudentNumber').textContent = formData.studentNumber || 'Not provided';
}

function getBookingTypeText(type) {
    switch(type) {
        case 'viewing': return 'Viewing Only';
        case 'viewing-contract': return 'Viewing + Contract Finalization';
        case 'contract': return 'Contract Finalization Only';
        default: return 'Not specified';
    }
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString) return 'Not specified';
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-ZA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function updateProgress() {
    if (!progressBar) return;
    
    const percent = (currentStep / 4) * 100;
    progressBar.style.width = percent + '%';
    
    // Mark previous steps as completed
    steps.forEach((step, index) => {
        const stepNumber = parseInt(step.getAttribute('data-step'));
        if (stepNumber < currentStep) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (stepNumber === currentStep) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });
}

// Handle form submission
async function handleBookingSubmission(e) {
    e.preventDefault();
    
    console.log('=== DEBUG: Starting form submission ===');
    console.log('Current form data:', formData);
    console.log('Selected accommodation:', selectedAccommodation);
    console.log('Selected booking type:', selectedBookingType);
    
    // SAFELY Get submit button - use multiple selectors and null checks
    let submitBtn = null;
    let originalText = 'Submit Booking';
    
    // Try multiple ways to find the submit button
    submitBtn = document.querySelector('#bookingForm button[type="submit"]');
    if (!submitBtn) {
        submitBtn = document.querySelector('button[type="submit"]');
    }
    if (!submitBtn) {
        submitBtn = e.target.querySelector('button[type="submit"]');
    }
    
    if (submitBtn) {
        originalText = submitBtn.innerHTML;
    } else {
        console.warn('Submit button not found, continuing without button state management');
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to make a booking.');
            window.location.href = 'authorization.html';
            return;
        }

        // Validate that we have all required data
        if (!selectedAccommodation || !selectedAccommodation.propertyId) {
            alert('Please select a valid accommodation.');
            return;
        }
        
        if (!selectedBookingType) {
            alert('Please select a booking type.');
            return;
        }

        // Show loading state - safely
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="bi bi-arrow-repeat spinner"></i> Processing...';
            submitBtn.disabled = true;
        }

        // Use stored form data instead of trying to access hidden elements
        const bookingDateTime = formData.bookingDateTime;
        const bookingNotes = formData.bookingNotes;
        const bookingType = getBookingTypeText(selectedBookingType);
        const propertyName = selectedAccommodation ? selectedAccommodation.property : 'Unknown Property';

        console.log('🔍 Using form data:', {
            bookingDateTime,
            bookingNotes, 
            bookingType,
            propertyName,
            selectedAccommodation
        });

        if (!bookingDateTime) {
            throw new Error('Please select a date and time for your booking.');
        }

        // Prepare booking data - FIXED to match backend expectations
        const bookingData = {
            propertyId: selectedAccommodation.propertyId,
            checkIn: bookingDateTime,
            checkOut: new Date(new Date(bookingDateTime).getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
            numberOfGuests: 1,
            specialRequests: `Booking Type: ${bookingType}${bookingNotes ? `\nNotes: ${bookingNotes}` : ''}`
        };

        console.log('📤 Sending booking data to backend:', bookingData);

        // Send booking to backend
        const response = await fetch(`${API_BASE_URL}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(bookingData)
        });

        console.log('📥 Backend response status:', response.status);

        const result = await response.json();
        console.log('📥 Backend response data:', result);

        if (!response.ok) {
            throw new Error(result.error || 'Failed to create booking');
        }

        console.log('✅ Booking created successfully:', result);

        // Show success message - handle both possible response formats
        const booking = result.booking || result;
        showBookingSuccess(booking, {
            propertyName: propertyName,
            bookingType: bookingType,
            dateTime: bookingDateTime,
            bookingNotes: bookingNotes
        });

    } catch (error) {
        console.error('❌ Booking submission error:', error);
        alert(`Booking failed: ${error.message}`);
        
        // Reset button safely
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

function showBookingSuccess(booking, formData) {
    const container = document.querySelector('.container .row .col-lg-10');
    if (!container) {
        console.error('❌ Success container not found!');
        alert('Booking created successfully, but could not show confirmation page.');
        return;
    }

    // Safe property access with fallbacks
    const bookingId = booking._id || 'N/A';
    const bookingStatus = booking.status || 'pending';
    const propertyName = formData.propertyName || (booking.property && booking.property.title) || 'Unknown Property';

    const successHTML = `
        <div class="text-center py-5">
            <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>
            <h3 class="text-success mt-3">Booking Confirmed!</h3>
            <p class="lead">Your booking has been submitted successfully.</p>
            
            <div class="card mx-auto mt-4" style="max-width: 500px;">
                <div class="card-body">
                    <h5 class="card-title">Booking Details</h5>
                    <div class="text-start">
                        <p><strong>Reference:</strong> ${bookingId}</p>
                        <p><strong>Property:</strong> ${propertyName}</p>
                        <p><strong>Booking Type:</strong> ${formData.bookingType || 'N/A'}</p>
                        <p><strong>Date & Time:</strong> ${formatDateTime(formData.dateTime) || 'N/A'}</p>
                        <p><strong>Status:</strong> <span class="badge bg-warning">${bookingStatus}</span></p>
                    </div>
                </div>
            </div>
            
            <div class="alert alert-info mt-4 mx-auto" style="max-width: 500px;">
                <i class="bi bi-envelope me-2"></i>
                <strong>Next Steps:</strong> The landlord will review your booking and confirm the appointment.
            </div>
            
            <div class="mt-4">
                <a href="my-bookings.html" class="btn btn-navy me-2">View My Bookings</a>
                <a href="listings.html" class="btn btn-outline-secondary">Browse More Properties</a>
            </div>
        </div>
    `;
    
    container.innerHTML = successHTML;
}