// listings.js - UPDATED FOR CONSISTENT IMAGE SIZING ONLY
class ListingsManager {
    constructor() {
        this.properties = [];
        this.filteredProperties = [];
        this.currentFilters = {};
        this.API_BASE_URL = window.API_BASE_URL || 'https://linqs-backend.onrender.com/api';
        
        // Status configuration - MUST MATCH manage-properties.html exactly
        this.statusConfig = {
            // Availability statuses (landlord-controlled)
            available: { class: 'success', text: 'Available', icon: 'bi-check-circle' },
            occupied: { class: 'warning', text: 'Occupied', icon: 'bi-person-check' },
            maintenance: { class: 'danger', text: 'Maintenance', icon: 'bi-tools' },
            
            // Admin approval statuses
            pending: { class: 'warning', text: 'Pending Approval', icon: 'bi-clock' },
            approved: { class: 'success', text: 'Approved', icon: 'bi-check-circle' },
            rejected: { class: 'danger', text: 'Rejected', icon: 'bi-x-circle' }
        };

        // Gender preference configuration
        this.genderConfig = {
            unisex: { icon: 'bi-people', text: 'Unisex', class: 'info' },
            male: { icon: 'bi-gender-male', text: 'Male Only', class: 'primary' },
            female: { icon: 'bi-gender-female', text: 'Female Only', class: 'danger' }
        };

        // Accreditation configuration
        this.accreditationConfig = {
            accredited: { icon: 'bi-award', text: 'Accredited', class: 'success' },
            self: { icon: 'bi-house', text: 'Self-paying', class: 'info' }
        };
    }

    async init() {
        await this.loadProperties();
        this.setupEventListeners();
        this.applySorting();
        this.renderProperties();
        this.updateResultsCount();
        this.modifyListingsForUserType();
    }

    async loadProperties() {
        try {
            this.showLoadingState(true);
            
            const token = localStorage.getItem("token");
            const response = await fetch(`${this.API_BASE_URL}/properties`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch properties: ${response.status}`);
            }

            const data = await response.json();
            this.properties = data.properties || data || [];
            this.filteredProperties = [...this.properties];
            
            this.applySorting();
            this.renderProperties();
            this.updateResultsCount();
            
        } catch (error) {
            console.error('Error loading properties:', error);
            this.showError('Failed to load properties. Please try again.');
        } finally {
            this.showLoadingState(false);
        }
    }

    // Add this method to ListingsManager class in listings.js
modifyListingsForUserType() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isTenant = user.role === 'tenant';
    
    if (isTenant) {
        // Hide accreditation filter for tenants
        const accreditationFilter = document.getElementById('filterAccreditation');
        const accreditationLabel = accreditationFilter ? accreditationFilter.previousElementSibling : null;
        
        if (accreditationFilter && accreditationLabel) {
            accreditationFilter.style.display = 'none';
            accreditationLabel.style.display = 'none';
        }
        
        // Change price label for tenants
        const priceLabel = document.querySelector('label[for="filterPrice"]');
        if (priceLabel) {
            priceLabel.textContent = 'Max Daily Price';
        }
        
        // Update mobile filters too
        const mobileAccFilter = document.getElementById('mobileFilterAccreditation');
        const mobileAccLabel = mobileAccFilter ? mobileAccFilter.previousElementSibling : null;
        const mobilePriceLabel = document.querySelector('label[for="mobileFilterPrice"]');
        
        if (mobileAccFilter && mobileAccLabel) {
            mobileAccFilter.style.display = 'none';
            mobileAccLabel.style.display = 'none';
        }
        if (mobilePriceLabel) {
            mobilePriceLabel.textContent = 'Max Daily Price';
        }
    }
}

    renderProperties() {
        const container = document.getElementById('listingsContainer');
        
        if (this.filteredProperties.length === 0) {
            container.innerHTML = this.getNoResultsHTML();
            return;
        }

        container.innerHTML = this.filteredProperties.map(property => 
            this.createPropertyCard(property)
        ).join('');
    }

    // UPDATED: Consistent status handling with manage-properties.html
    getPropertyStatus(property) {
        // Priority 1: Use availability field (landlord-controlled - what students see)
        if (property.availability) {
            return property.availability; // available, occupied, maintenance
        }
        // Priority 2: Use status field (admin approval status)
        if (property.status) {
            // Only show approved properties to students, others are effectively unavailable
            return property.status === 'approved' ? 'available' : 'occupied';
        }
        // Priority 3: Fallback to legacy isAvailable field
        if (property.isAvailable !== undefined) {
            return property.isAvailable ? 'available' : 'occupied';
        }
        // Default: treat as available
        return 'available';
    }

    // UPDATED: Get admin approval status (for internal use)
    getAdminStatus(property) {
        if (property.status) {
            return property.status; // pending, approved, rejected
        }
        return 'approved'; // Default to approved if no status field
    }

    createPropertyCard(property) {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isTenant = user.role === 'tenant';
    
    // Determine price display for tenants vs students
    let priceDisplay, priceLabel, dataPrice;
    if (isTenant && property.acceptsShortTerm) {
        if (property.shortTermPricing === 'fixed' && property.shortTermPrice) {
            priceDisplay = `R${property.shortTermPrice}`;
            priceLabel = '/day';
            dataPrice = property.shortTermPrice;
        } else {
            priceDisplay = 'Negotiable';
            priceLabel = '';
            dataPrice = 0; // Set to 0 for negotiable so filtering works
        }
    } else {
        priceDisplay = `R${property.price}`;
        priceLabel = '/month';
        dataPrice = property.price;
    }
    
    const accreditation = property.accreditation || 'self';
    const accreditationInfo = this.accreditationConfig[accreditation] || this.accreditationConfig.self;
    
    const genderPreference = property.genderPreference || 'unisex';
    const genderInfo = this.genderConfig[genderPreference] || this.genderConfig.unisex;
    
    // UPDATED: Use consistent status handling
    const propertyStatus = this.getPropertyStatus(property);
    const statusInfo = this.statusConfig[propertyStatus] || this.statusConfig.available;
    
    const adminStatus = this.getAdminStatus(property);
    const adminInfo = this.statusConfig[adminStatus] || this.statusConfig.approved;
    
    const mainImage = property.images && property.images.length > 0 
        ? property.images[0] 
        : 'https://via.placeholder.com/400x300/1e3a8a/ffffff?text=Property+Image';
    
    const amenities = property.amenities ? property.amenities.slice(0, 4) : [];
    
    // UPDATED: Button logic - only allow viewing for available AND approved properties
    let buttonText, buttonClass, isDisabled, buttonTitle = '';
    
    if (adminStatus !== 'approved') {
        buttonText = 'Not Available';
        buttonClass = 'btn-outline-secondary';
        isDisabled = true;
        buttonTitle = 'Property pending approval';
    } else {
        switch (propertyStatus) {
            case 'available':
                buttonText = 'View Details';
                buttonClass = 'btn-primary';
                isDisabled = false;
                buttonTitle = 'View property details';
                break;
            case 'occupied':
                buttonText = 'View Details';
                buttonClass = 'btn-outline-primary';
                isDisabled = false;
                buttonTitle = 'View property details (Currently occupied)';
                break;
            case 'maintenance':
                buttonText = 'Under Maintenance';
                buttonClass = 'btn-outline-secondary';
                isDisabled = true;
                buttonTitle = 'Property under maintenance';
                break;
            default:
                buttonText = 'View Details';
                buttonClass = 'btn-primary';
                isDisabled = false;
                buttonTitle = 'View property details';
        }
    }
    
    return `
    <div class="col-md-6 col-lg-4 mb-4" 
         data-price="${dataPrice}" 
         data-accreditation="${accreditation}"
         data-location="${property.location.city.toLowerCase()}"
         data-status="${propertyStatus}"
         data-admin-status="${adminStatus}">
    <div class="card listing-card h-100 ${propertyStatus !== 'available' ? propertyStatus : ''}">

        <!-- Updated Price Tag for tenants/students -->
        <div class="price-tag">
            ${priceDisplay}<small>${priceLabel}</small>
        </div>
        
        <!-- Location Badge -->
        <div class="location-badge" style="top: 3.5rem;">
            <i class="bi bi-geo-alt me-1"></i>${property.location.city}
        </div>
        
        <!-- Status Badge -->
        <div class="status-badge bg-${statusInfo.class}">
            <i class="bi ${statusInfo.icon} me-1"></i>${statusInfo.text}
        </div>
        
        <!-- Admin Approval Badge (only show if not approved) -->
        ${adminStatus !== 'approved' ? `
            <div class="status-badge bg-${adminInfo.class}" style="top: 6rem;">
                <i class="bi ${adminInfo.icon} me-1"></i>${adminInfo.text}
            </div>
        ` : ''}
        
        <!-- UPDATED: Property Image with consistent sizing -->
        <img src="${mainImage}" class="card-img-top" alt="${property.title}" 
             style="height: 200px; object-fit: cover; width: 100%; cursor: pointer;"
             onclick="listingsManager.viewPropertyDetails('${property._id}')">
        
        <div class="card-body">
            <!-- Property Title -->
            <h5 class="card-title text-navy mb-2" 
                onclick="listingsManager.viewPropertyDetails('${property._id}')" 
                style="cursor: pointer;">
                ${property.title}
            </h5>
            
            <!-- Property Description -->
            <p class="card-text text-muted small mb-3">
                ${property.description.substring(0, 100)}...
            </p>
            
            <!-- Property Details - KEEPING ORIGINAL STYLE -->
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="text-muted small">
                    <i class="bi bi-door-closed me-1"></i>${property.bedrooms} beds
                </div>
                <div class="text-muted small">
                    <i class="bi bi-droplet me-1"></i>${property.bathrooms} baths
                </div>
                <div class="text-muted small">
                    <i class="bi bi-building me-1"></i>${property.propertyType}
                </div>
            </div>
            
            <!-- Accreditation & Gender Badges - HIDDEN FOR TENANTS -->
            ${!isTenant ? `
            <div class="d-flex gap-2 mb-3">
                <span class="badge bg-${accreditationInfo.class} accreditation-badge">
                    <i class="bi ${accreditationInfo.icon} me-1"></i>${accreditationInfo.text}
                </span>
                <span class="badge bg-${genderInfo.class} accreditation-badge">
                    <i class="bi ${genderInfo.icon} me-1"></i>${genderInfo.text}
                </span>
            </div>
            ` : ''}
            
            <!-- Amenities - KEEPING ORIGINAL STYLE -->
            ${amenities.length > 0 ? `
            <div class="amenities-list mb-3">
                ${amenities.map(amenity => `
                    <li><i class="bi bi-${this.getAmenityIcon(amenity)} me-1"></i>${this.formatAmenity(amenity)}</li>
                `).join('')}
            </div>
            ` : ''}
            
            <!-- Rating -->
            <div class="d-flex justify-content-between align-items-center">
                <div class="rating">
                    ${this.generateStarRating(property.averageRating || 0)}
                    <small class="text-muted ms-1">(${property.reviewCount || 0})</small>
                </div>
                <!-- UPDATED: Button with proper status handling -->
                <button class="btn btn-sm ${buttonClass}" 
                        onclick="listingsManager.viewPropertyDetails('${property._id}')"
                        ${isDisabled ? 'disabled' : ''}
                        title="${buttonTitle}">
                    ${buttonText}
                </button>
            </div>
        </div>
    </div>
</div>`;
}

    viewPropertyDetails(propertyId) {
        window.location.href = `property-details.html?id=${propertyId}`;
    }

    generateStarRating(rating) {
        let stars = '';
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        
        for (let i = 1; i <= 5; i++) {
            if (i <= fullStars) {
                stars += '<i class="bi bi-star-fill text-warning"></i>';
            } else if (i === fullStars + 1 && hasHalfStar) {
                stars += '<i class="bi bi-star-half text-warning"></i>';
            } else {
                stars += '<i class="bi bi-star text-warning"></i>';
            }
        }
        return stars;
    }

    getAmenityIcon(amenity) {
        const icons = {
            'wifi': 'wifi',
            'parking': 'car-front',
            'laundry': 'droplet',
            'furnished': 'house',
            'gym': 'activity',
            'pool': 'water',
            'ac': 'snow',
            'heating': 'thermometer-sun',
            'shuttle': 'bus-front',
            'cctv': 'camera-video'
        };
        return icons[amenity] || 'check';
    }

    formatAmenity(amenity) {
        const amenityMap = {
            'wifi': 'WiFi',
            'parking': 'Parking',
            'laundry': 'Laundry',
            'furnished': 'Furnished',
            'gym': 'Gym',
            'pool': 'Pool',
            'ac': 'A/C',
            'heating': 'Heating',
            'shuttle': 'Shuttle',
            'cctv': 'CCTV'
        };
        return amenityMap[amenity] || amenity;
    }

    applyFilters() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isTenant = user.role === 'tenant';
    
    const accFilter = document.getElementById('filterAccreditation').value;
    const priceFilterRaw = document.getElementById('filterPrice').value;
    const priceFilter = priceFilterRaw === '' ? null : Number(priceFilterRaw);
    const locationFilter = (document.getElementById('filterLocation').value || '').trim().toLowerCase();
    const searchQuery = (document.getElementById('searchBar').value || '').trim().toLowerCase();
    const availabilityFilter = document.getElementById('filterAvailability') ? document.getElementById('filterAvailability').value : 'all';

    this.currentFilters = {
        accreditation: accFilter,
        maxPrice: priceFilter,
        location: locationFilter,
        search: searchQuery,
        availability: availabilityFilter
    };

    this.filteredProperties = this.properties.filter(property => {
        const accreditation = property.accreditation || 'self';
        const location = property.location.city.toLowerCase();
        const title = property.title.toLowerCase();
        const description = property.description.toLowerCase();
        const propertyStatus = this.getPropertyStatus(property);
        const adminStatus = this.getAdminStatus(property);

        let visible = true;

        // Accreditation filter - skip for tenants
        if (!isTenant && accFilter !== 'all' && accreditation !== accFilter) {
            visible = false;
        }

        // Price filter - use appropriate price for tenants vs students
        if (priceFilter !== null) {
            let priceToCheck = property.price;
            if (isTenant && property.acceptsShortTerm) {
                if (property.shortTermPricing === 'fixed' && property.shortTermPrice) {
                    priceToCheck = property.shortTermPrice;
                } else {
                    // For negotiable properties, show them regardless of price filter
                    priceToCheck = 0;
                }
            }
            
            if (priceToCheck > priceFilter) {
                visible = false;
            }
        }

        // Location filter
        if (locationFilter && !location.includes(locationFilter)) {
            visible = false;
        }

        // Search filter
        if (searchQuery && !title.includes(searchQuery) && !description.includes(searchQuery)) {
            visible = false;
        }

        // UPDATED: Availability filter - only show approved properties to students
        if (adminStatus !== 'approved') {
            visible = false; // Hide non-approved properties from students
        } else if (availabilityFilter !== 'all') {
            if (availabilityFilter === 'available' && propertyStatus !== 'available') {
                visible = false;
            } else if (availabilityFilter === 'occupied' && propertyStatus !== 'occupied') {
                visible = false;
            }
        }

        return visible;
    });

    this.applySorting();
    this.renderProperties();
    this.updateResultsCount();
}

    applySorting() {
        const sortValue = document.getElementById('sortOptions').value;

        switch (sortValue) {
            case 'priceLow':
                this.filteredProperties.sort((a, b) => {
                    // First sort by availability (available first), then by price
                    const statusA = this.getPropertyStatus(a);
                    const statusB = this.getPropertyStatus(b);
                    
                    if (statusA === 'available' && statusB !== 'available') return -1;
                    if (statusA !== 'available' && statusB === 'available') return 1;
                    
                    return a.price - b.price;
                });
                break;
            case 'priceHigh':
                this.filteredProperties.sort((a, b) => {
                    // First sort by availability (available first), then by price
                    const statusA = this.getPropertyStatus(a);
                    const statusB = this.getPropertyStatus(b);
                    
                    if (statusA === 'available' && statusB !== 'available') return -1;
                    if (statusA !== 'available' && statusB === 'available') return 1;
                    
                    return b.price - a.price;
                });
                break;
            case 'default':
            default:
                // Sort by availability first (available properties come first), then by rating, then by creation date
                this.filteredProperties.sort((a, b) => {
                    const statusA = this.getPropertyStatus(a);
                    const statusB = this.getPropertyStatus(b);
                    
                    // Available properties first
                    if (statusA === 'available' && statusB !== 'available') return -1;
                    if (statusA !== 'available' && statusB === 'available') return 1;
                    
                    // Then by rating (higher first)
                    const ratingA = a.averageRating || 0;
                    const ratingB = b.averageRating || 0;
                    if (ratingB !== ratingA) return ratingB - ratingA;
                    
                    // Then by review count (more reviews first)
                    const reviewsA = a.reviewCount || 0;
                    const reviewsB = b.reviewCount || 0;
                    return reviewsB - reviewsA;
                });
                break;
        }
    }

    getNoResultsHTML() {
        return `
        <div class="col-12 text-center py-5">
            <i class="bi bi-search display-1 text-muted"></i>
            <h3 class="text-navy mt-3">No properties found</h3>
            <p class="text-muted">Try adjusting your filters or search terms</p>
            <button class="btn btn-navy" onclick="listingsManager.clearAllFilters()">
                Clear All Filters
            </button>
        </div>`;
    }

    showLoadingState(show) {
        const container = document.getElementById('listingsContainer');
        const resultsCount = document.getElementById('resultsCount');
        
        if (show) {
            container.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-navy" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="text-muted mt-2">Loading properties...</p>
            </div>`;
            if (resultsCount) resultsCount.textContent = 'Loading...';
        }
    }

    showError(message) {
        const container = document.getElementById('listingsContainer');
        container.innerHTML = `
        <div class="col-12 text-center py-5">
            <i class="bi bi-exclamation-triangle display-1 text-danger"></i>
            <h3 class="text-navy mt-3">Something went wrong</h3>
            <p class="text-muted">${message}</p>
            <button class="btn btn-navy" onclick="listingsManager.loadProperties()">
                Try Again
            </button>
        </div>`;
    }

    updateResultsCount() {
        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            const count = this.filteredProperties.length;
            resultsCount.textContent = `${count} listing${count === 1 ? '' : 's'} found`;
        }
    }

    setupEventListeners() {
        // Set up event listeners for filters
        document.getElementById('filterAccreditation').addEventListener('change', () => this.applyFilters());
        document.getElementById('filterPrice').addEventListener('input', () => this.applyFilters());
        document.getElementById('filterLocation').addEventListener('input', () => this.applyFilters());
        document.getElementById('searchBar').addEventListener('input', () => this.applyFilters());
        document.getElementById('sortOptions').addEventListener('change', () => this.applyFilters());
        
        // Availability filter listener
        if (document.getElementById('filterAvailability')) {
            document.getElementById('filterAvailability').addEventListener('change', () => this.applyFilters());
        }
    }

    clearAllFilters() {
        document.getElementById('filterAccreditation').value = 'all';
        document.getElementById('filterPrice').value = '';
        document.getElementById('filterLocation').value = '';
        document.getElementById('searchBar').value = '';
        document.getElementById('sortOptions').value = 'default';
        
        // Reset availability filter
        if (document.getElementById('filterAvailability')) {
            document.getElementById('filterAvailability').value = 'all';
        }
        
        this.applyFilters();
    }
}

// Initialize the listings manager
const listingsManager = new ListingsManager();

// Start when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    listingsManager.init();
});

// Make functions available globally for your HTML onclick
window.clearAllFilters = () => listingsManager.clearAllFilters();
window.applyFilters = () => listingsManager.applyFilters();
window.viewPropertyDetails = (propertyId) => listingsManager.viewPropertyDetails(propertyId);