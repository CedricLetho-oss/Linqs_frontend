// listings.js - COMPLETE REWRITE FOR CONSISTENT BOOKING MODE SUPPORT
class ListingsManager {
    constructor() {
        this.properties = [];
        this.filteredProperties = [];
        this.currentFilters = {};
        this.API_BASE_URL = window.API_BASE_URL || 'https://linqs-backend.onrender.com/api';
        
        // Status configuration
        this.statusConfig = {
            available: { class: 'success', text: 'Available', icon: 'bi-check-circle' },
            occupied: { class: 'warning', text: 'Occupied', icon: 'bi-person-check' },
            maintenance: { class: 'danger', text: 'Maintenance', icon: 'bi-tools' },
            pending: { class: 'warning', text: 'Pending Approval', icon: 'bi-clock' },
            approved: { class: 'success', text: 'Approved', icon: 'bi-check-circle' },
            rejected: { class: 'danger', text: 'Rejected', icon: 'bi-x-circle' }
        };

        // Add NSFAS configuration
        this.rentTypeConfig = {
            fixed: { icon: 'bi-currency-dollar', text: 'Fixed Price', class: 'primary' },
            nsfas: { icon: 'bi-award', text: 'NSFAS Rates', class: 'warning' }
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

    // Get user context with booking mode
    getUserContext() {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const bookingMode = localStorage.getItem('booking_mode') || 'student';
        
        return {
            user,
            role: user.role,
            bookingMode,
            isTenantMode: bookingMode === 'tenant',
            isStudentMode: bookingMode === 'student',
            isActualTenant: user.role === 'tenant',
            isActualStudent: user.role === 'student'
        };
    }

    // Initialize with booking mode sync
    // Initialize with booking mode sync
async init() {
    // Sync booking mode first
    await this.syncBookingMode();
    
    // Then load properties and setup UI
    await this.loadProperties();
    this.setupEventListeners();
    this.applySorting();
    this.renderProperties();
    this.updateResultsCount();
    this.updateAllSectionsForUserType();
    
    // Setup booking mode change listener
    this.setupBookingModeListener();
    
    // Add random sort option to dropdown
    this.addRandomSortOption();
}

// Add random sort option to the sort dropdown
addRandomSortOption() {
    const sortSelect = document.getElementById('sortOptions');
    if (sortSelect && !sortSelect.querySelector('option[value="random"]')) {
        const randomOption = document.createElement('option');
        randomOption.value = 'random';
        randomOption.textContent = 'Random';
        sortSelect.appendChild(randomOption);
    }
}

    // Sync booking mode with backend
    async syncBookingMode() {
        try {
            const context = this.getUserContext();
            
            if (context.user.role === 'student') {
                const token = localStorage.getItem("token");
                const response = await fetch(`${this.API_BASE_URL}/users/booking-mode`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    const backendBookingMode = data.booking_mode || 'student';
                    const currentBookingMode = localStorage.getItem('booking_mode') || 'student';
                    
                    // Sync if there's a mismatch
                    if (backendBookingMode !== currentBookingMode) {
                        console.log(`Syncing booking mode: ${currentBookingMode} -> ${backendBookingMode}`);
                        localStorage.setItem('booking_mode', backendBookingMode);
                        
                        // Update user object
                        const user = JSON.parse(localStorage.getItem("user") || "{}");
                        user.booking_mode = backendBookingMode;
                        localStorage.setItem('user', JSON.stringify(user));
                        return true;
                    }
                }
            }
            return false;
        } catch (error) {
            console.error('Error syncing booking mode:', error);
            return false;
        }
    }

    // Setup booking mode change listener
    setupBookingModeListener() {
        window.addEventListener('bookingModeChanged', (event) => {
            console.log('Booking mode change detected in listings:', event.detail.mode);
            setTimeout(async () => {
                await this.loadProperties();
                this.updateAllSectionsForUserType();
                this.applyFilters();
            }, 100);
        });
    }

    // Update all UI sections based on user type
    updateAllSectionsForUserType() {
        this.updateHeroSection();
        this.updateFilterSection();
        this.updateResultsSection();
    }

    // Update hero section based on user type
    updateHeroSection() {
        const context = this.getUserContext();
        const isTenantMode = context.isTenantMode;
        
        const heroTitle = document.querySelector('.hero-section h1');
        const heroSubtitle = document.querySelector('.hero-section .hero-subtitle');
        const statsCard = document.querySelector('.stats-card h4');
        const statsText = document.querySelector('.stats-card p');
        
        if (isTenantMode) {
            // Tenant version
            if (heroTitle) {
                heroTitle.innerHTML = 'Your Affordable <span class="gradient-text">Space Awaits</span>';
            }
            if (heroSubtitle) {
                heroSubtitle.textContent = 'Browse verified short-term accommodations available during student holidays.';
            }
            if (statsCard) {
                statsCard.textContent = 'Short-term Listings';
            }
            if (statsText) {
                statsText.textContent = 'Verified accommodations for holidays';
            }
            
            // Update page title for tenants
            document.title = 'ResLinQ | Short-term Accommodation - Affordable Holiday Stays in South Africa';
        } else {
            // Student version (default)
            if (heroTitle) {
                heroTitle.innerHTML = 'Your Ideal Student <span class="gradient-text">Space Awaits</span>';
            }
            if (heroSubtitle) {
                heroSubtitle.textContent = 'Browse through accredited and non-accredited student accommodations with verified reviews and ratings.';
            }
            if (statsCard) {
                statsCard.textContent = '50+ Listings';
            }
            if (statsText) {
                statsText.textContent = 'Verified accommodations near your campus';
            }
            
            // Reset page title for students
            document.title = 'ResLinQ | Student Accommodation Listings - Find Your Perfect Student Home';
        }
    }

    // Update filter section based on user type
    updateFilterSection() {
        const context = this.getUserContext();
        const isTenantMode = context.isTenantMode;
        
        // Hide/show accreditation filter
        const accreditationFilter = document.getElementById('filterAccreditation');
        const accreditationLabel = accreditationFilter ? accreditationFilter.previousElementSibling : null;
        
        if (accreditationFilter && accreditationLabel) {
            if (isTenantMode) {
                accreditationFilter.style.display = 'none';
                accreditationLabel.style.display = 'none';
            } else {
                accreditationFilter.style.display = 'block';
                accreditationLabel.style.display = 'block';
            }
        }
        
        // Update price labels
        const priceLabel = document.querySelector('label[for="filterPrice"]');
        const priceInput = document.getElementById('filterPrice');
        if (priceLabel) {
            priceLabel.textContent = isTenantMode ? 'Max Daily Price' : 'Max Monthly Price';
        }
        if (priceInput) {
            priceInput.placeholder = isTenantMode ? 'Max daily budget...' : 'Max monthly budget...';
        }
        
        // Update mobile filters
        const mobileAccFilter = document.getElementById('mobileFilterAccreditation');
        const mobileAccLabel = mobileAccFilter ? mobileAccFilter.previousElementSibling : null;
        const mobilePriceLabel = document.querySelector('label[for="mobileFilterPrice"]');
        const mobilePriceInput = document.getElementById('mobileFilterPrice');
        
        if (mobileAccFilter && mobileAccLabel) {
            if (isTenantMode) {
                mobileAccFilter.style.display = 'none';
                mobileAccLabel.style.display = 'none';
            } else {
                mobileAccFilter.style.display = 'block';
                mobileAccLabel.style.display = 'block';
            }
        }
        if (mobilePriceLabel) {
            mobilePriceLabel.textContent = isTenantMode ? 'Max Daily Price' : 'Max Monthly Price';
        }
        if (mobilePriceInput) {
            mobilePriceInput.placeholder = isTenantMode ? 'Max daily budget...' : 'Max monthly budget...';
        }
    }

    // Update results section
    updateResultsSection() {
        const context = this.getUserContext();
        const isTenantMode = context.isTenantMode;
        
        // Update any results text that might be user-type specific
        const resultsText = document.querySelector('.results-text');
        if (resultsText && isTenantMode) {
            resultsText.textContent = 'Short-term accommodations available during student holidays';
        }
    }

    // Load properties with proper tenant filtering
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
            
            // Apply tenant filtering based on current booking mode
            const context = this.getUserContext();
            if (context.isTenantMode) {
                this.properties = this.filterPropertiesForTenants(this.properties);
            }
            
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

    // Filter properties for tenants
    filterPropertiesForTenants(properties) {
        const currentMonth = new Date().getMonth() + 1;
        const isNovemberToJanuary = currentMonth === 11 || currentMonth === 12 || currentMonth === 1;
        
        console.log('Tenant access check:', {
            currentMonth,
            isNovemberToJanuary,
            totalProperties: properties.length
        });
        
        if (!isNovemberToJanuary) {
            return []; // No properties outside Nov-Jan for tenants
        }

        const filteredProperties = properties.filter(property => {
            const acceptsShortTerm = property.acceptsShortTerm === true;
            const isApproved = this.getAdminStatus(property) === 'approved';
            const isAvailable = this.getPropertyStatus(property) === 'available';
            
            const shouldShow = acceptsShortTerm && isApproved && isAvailable;
            
            if (shouldShow) {
                console.log('Showing property to tenant:', {
                    title: property.title,
                    acceptsShortTerm,
                    isApproved,
                    isAvailable,
                    shortTermPricing: property.shortTermPricing,
                    shortTermPrice: property.shortTermPrice
                });
            }
            
            return shouldShow;
        });
        
        console.log('Final filtered properties for tenant:', filteredProperties.length);
        return filteredProperties;
    }

    // Get property status
    getPropertyStatus(property) {
        if (property.availability) {
            return property.availability;
        }
        if (property.status) {
            return property.status === 'approved' ? 'available' : 'occupied';
        }
        if (property.isAvailable !== undefined) {
            return property.isAvailable ? 'available' : 'occupied';
        }
        return 'available';
    }

    // Get admin approval status
    getAdminStatus(property) {
        if (property.status) {
            return property.status;
        }
        return 'approved';
    }

    // Get price display based on user type
    // Get price display based on user type and NSFAS status
// Get price display based on user type and NSFAS status
getPriceDisplay(property) {
    const context = this.getUserContext();
    const isTenantMode = context.isTenantMode;
    const isNsfasProperty = property.rentType === 'nsfas';
    
    // Handle NSFAS properties - check if in tenant mode first
    if (isNsfasProperty) {
        // In tenant mode, NSFAS properties should show short-term pricing
        if (isTenantMode && property.acceptsShortTerm) {
            if (property.shortTermPricing === 'fixed' && property.shortTermPrice) {
                return {
                    price: `R${property.shortTermPrice}`,
                    label: '/day',
                    dataPrice: property.shortTermPrice
                };
            } else {
                return {
                    price: 'Negotiable',
                    label: '/day',
                    dataPrice: 0
                };
            }
        }
        // In student mode, show NSFAS rates
        return {
            price: 'NSFAS',
            label: 'Rates',
            dataPrice: 0
        };
    }
    
    // Handle tenant short-term pricing for non-NSFAS properties
    if (isTenantMode && property.acceptsShortTerm) {
        if (property.shortTermPricing === 'fixed' && property.shortTermPrice) {
            return {
                price: `R${property.shortTermPrice}`,
                label: '/day',
                dataPrice: property.shortTermPrice
            };
        } else {
            return {
                price: 'Negotiable',
                label: '/day',
                dataPrice: 0
            };
        }
    }
    
    // Default student pricing
    return {
        price: `R${property.price}`,
        label: '/month',
        dataPrice: property.price
    };
}

    getPropertyDescription(property) {
    const context = this.getUserContext();
    const isTenantMode = context.isTenantMode;
    const isNsfasProperty = property.rentType === 'nsfas';
    
    let propertyDescription = property.description;
    
    // NSFAS property description - use actual description, not generic one
    if (isNsfasProperty) {
        // In tenant mode, use short-term description if available
        if (isTenantMode && property.acceptsShortTerm && property.shortTermDescription) {
            propertyDescription = property.shortTermDescription;
        } 
        // Otherwise use the property's actual description
        else if (property.description && property.description.trim() !== '') {
            propertyDescription = property.description;
        } else {
            // Fallback only if no description exists
            propertyDescription = "NSFAS-accredited accommodation. Contact for specific pricing and eligibility requirements.";
        }
    }
    // Tenant short-term description
    else if (isTenantMode && property.acceptsShortTerm && property.shortTermDescription) {
        propertyDescription = property.shortTermDescription;
    } else if (isTenantMode && property.acceptsShortTerm) {
        propertyDescription = property.description || "Short-term accommodation available during student holidays. Perfect for temporary stays.";
    }
    
    return propertyDescription;
}

    // Create property card
    // Create property card with NSFAS support
// Create property card with NSFAS support
createPropertyCard(property) {
    const context = this.getUserContext();
    const isTenantMode = context.isTenantMode;
    
    // Get price display
    const priceDisplay = this.getPriceDisplay(property);
    
    // Get min stay info for tenants
    let minStayInfo = '';
    if (isTenantMode && property.acceptsShortTerm && property.shortTermMinStay > 1) {
        minStayInfo = `min ${property.shortTermMinStay} days`;
    }
    
    // Get property description
    const propertyDescription = this.getPropertyDescription(property);
    
    const accreditation = property.accreditation || 'self';
    const accreditationInfo = this.accreditationConfig[accreditation] || this.accreditationConfig.self;
    
    const genderPreference = property.genderPreference || 'unisex';
    const genderInfo = this.genderConfig[genderPreference] || this.genderConfig.unisex;
    
    // Get status info
    const propertyStatus = this.getPropertyStatus(property);
    const statusInfo = this.statusConfig[propertyStatus] || this.statusConfig.available;
    
    const adminStatus = this.getAdminStatus(property);
    const adminInfo = this.statusConfig[adminStatus] || this.statusConfig.approved;
    
    const mainImage = property.images && property.images.length > 0 
        ? property.images[0] 
        : 'https://via.placeholder.com/400x300/1e3a8a/ffffff?text=Property+Image';
    
    const amenities = property.amenities ? property.amenities.slice(0, 4) : [];
    
    // Handle NSFAS display - ONLY SHOW IN STUDENT MODE
    const isNsfasProperty = property.rentType === 'nsfas';
    const nsfasBadge = (isNsfasProperty && !isTenantMode) ? `
        <div class="nsfas-badge-listing">
            <i class="bi bi-award me-1"></i>NSFAS Rates
        </div>
    ` : '';
    
    // Button logic - updated for tenant mode
    let buttonText, buttonClass, isDisabled, buttonTitle = '';
    
    if (adminStatus !== 'approved') {
        buttonText = 'Not Available';
        buttonClass = 'btn-outline-secondary';
        isDisabled = true;
        buttonTitle = 'Property pending approval';
    } else {
        switch (propertyStatus) {
            case 'available':
                // In tenant mode, all properties show "View Details"
                if (isTenantMode) {
                    buttonText = 'View Details';
                    buttonClass = 'btn-primary';
                    buttonTitle = 'View property details';
                } else {
                    // In student mode, NSFAS properties show "Inquire", others show "View Details"
                    buttonText = isNsfasProperty ? 'Inquire' : 'View Details';
                    buttonClass = isNsfasProperty ? 'btn-nsfas' : 'btn-primary';
                    buttonTitle = isNsfasProperty ? 'Inquire about NSFAS rates' : 'View property details';
                }
                isDisabled = false;
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
         data-price="${priceDisplay.dataPrice}" 
         data-accreditation="${accreditation}"
         data-location="${property.location.city.toLowerCase()}"
         data-status="${propertyStatus}"
         data-admin-status="${adminStatus}"
         data-rent-type="${property.rentType || 'fixed'}">
        <div class="card listing-card h-100 ${propertyStatus !== 'available' ? propertyStatus : ''} ${(isNsfasProperty && !isTenantMode) ? 'nsfas-listing' : ''}">

            <!-- Price Tag -->
            <div class="price-tag">
                <div class="d-flex flex-column align-items-center">
                    <div class="price-main">${priceDisplay.price}<small>${priceDisplay.label}</small></div>
                    ${minStayInfo ? `<div class="price-min-stay">${minStayInfo}</div>` : ''}
                </div>
            </div>
            
            <!-- NSFAS Badge - ONLY SHOWS IN STUDENT MODE -->
            ${nsfasBadge}
            
            <!-- Location Badge -->
            <div class="location-badge" style="top: ${minStayInfo ? '4.2rem' : '3.5rem'};">
                <i class="bi bi-geo-alt me-1"></i>${property.location.city}
            </div>
            
            <!-- Status Badge -->
            <div class="status-badge bg-${statusInfo.class}">
                <i class="bi ${statusInfo.icon} me-1"></i>${statusInfo.text}
            </div>
            
            <!-- Admin Approval Badge (only show if not approved) -->
            ${adminStatus !== 'approved' ? `
                <div class="status-badge bg-${adminInfo.class}" style="top: ${minStayInfo ? '6.7rem' : '6rem'};">
                    <i class="bi ${adminInfo.icon} me-1"></i>${adminInfo.text}
                </div>
            ` : ''}
            
            <!-- Property Image -->
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
                    ${propertyDescription.substring(0, 100)}...
                </p>
                
                <!-- Property Details -->
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
                ${!isTenantMode ? `
                <div class="d-flex gap-2 mb-3">
                    <span class="badge bg-${accreditationInfo.class} accreditation-badge">
                        <i class="bi ${accreditationInfo.icon} me-1"></i>${accreditationInfo.text}
                    </span>
                    <span class="badge bg-${genderInfo.class} accreditation-badge">
                        <i class="bi ${genderInfo.icon} me-1"></i>${genderInfo.text}
                    </span>
                </div>
                ` : ''}
                
                <!-- Amenities -->
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
                    <!-- Button with proper status handling -->
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

    // Apply filters with user type awareness and NSFAS support
applyFilters() {
    const context = this.getUserContext();
    const isTenantMode = context.isTenantMode;
    
    const currentMonth = new Date().getMonth() + 1;
    const isNovemberToJanuary = currentMonth === 11 || currentMonth === 12 || currentMonth === 1;
    
    // For tenants outside Nov-Jan, show empty state
    if (isTenantMode && !isNovemberToJanuary) {
        this.filteredProperties = [];
        this.renderProperties();
        this.updateResultsCount();
        return;
    }

    // Get filter values
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
        // For tenants, add additional safety checks
        if (isTenantMode) {
            const acceptsShortTerm = property.acceptsShortTerm === true;
            const propertyStatus = this.getPropertyStatus(property);
            const adminStatus = this.getAdminStatus(property);
            
            if (!acceptsShortTerm || propertyStatus !== 'available' || adminStatus !== 'approved') {
                return false;
            }
        }

        const accreditation = property.accreditation || 'self';
        const location = property.location.city.toLowerCase();
        const title = property.title.toLowerCase();
        const description = property.description.toLowerCase();
        const propertyStatus = this.getPropertyStatus(property);
        const adminStatus = this.getAdminStatus(property);
        const isNsfasProperty = property.rentType === 'nsfas';

        let visible = true;

        // Accreditation filter - skip for tenants
        if (!isTenantMode && accFilter !== 'all' && accreditation !== accFilter) {
            visible = false;
        }

        // Price filter - handle NSFAS and tenant pricing
        if (priceFilter !== null) {
            let priceToCheck = property.price;
            
            // For NSFAS properties in tenant mode, use short-term pricing
            if (isNsfasProperty && isTenantMode && property.acceptsShortTerm) {
                if (property.shortTermPricing === 'fixed' && property.shortTermPrice) {
                    priceToCheck = property.shortTermPrice;
                } else {
                    // For negotiable properties, show them regardless of price filter
                    priceToCheck = 0;
                }
            } 
            // For non-NSFAS properties in tenant mode
            else if (isTenantMode && property.acceptsShortTerm) {
                if (property.shortTermPricing === 'fixed' && property.shortTermPrice) {
                    priceToCheck = property.shortTermPrice;
                } else {
                    // For negotiable properties, show them regardless of price filter
                    priceToCheck = 0;
                }
            }
            // For NSFAS properties in student mode, ignore price filter
            else if (isNsfasProperty && !isTenantMode) {
                priceToCheck = 0; // NSFAS properties always show in student mode
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

        // Availability filter - only show approved properties
        if (adminStatus !== 'approved') {
            visible = false;
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

    // Apply sorting
    // Apply sorting with NSFAS support
// Apply sorting with randomization and fair rotation
applySorting() {
    const sortValue = document.getElementById('sortOptions').value;
    const context = this.getUserContext();

    switch (sortValue) {
        case 'priceLow':
            this.filteredProperties.sort((a, b) => {
                const statusA = this.getPropertyStatus(a);
                const statusB = this.getPropertyStatus(b);
                
                // Available properties first
                if (statusA === 'available' && statusB !== 'available') return -1;
                if (statusA !== 'available' && statusB === 'available') return 1;
                
                // Handle NSFAS properties
                const isNsfasA = a.rentType === 'nsfas';
                const isNsfasB = b.rentType === 'nsfas';
                
                if (isNsfasA && !isNsfasB) return -1;
                if (!isNsfasA && isNsfasB) return 1;
                
                // For non-NSFAS properties, sort by price
                return a.price - b.price;
            });
            break;
        case 'priceHigh':
            this.filteredProperties.sort((a, b) => {
                const statusA = this.getPropertyStatus(a);
                const statusB = this.getPropertyStatus(b);
                
                if (statusA === 'available' && statusB !== 'available') return -1;
                if (statusA !== 'available' && statusB === 'available') return 1;
                
                // Handle NSFAS properties
                const isNsfasA = a.rentType === 'nsfas';
                const isNsfasB = b.rentType === 'nsfas';
                
                if (isNsfasA && !isNsfasB) return -1;
                if (!isNsfasA && isNsfasB) return 1;
                
                return b.price - a.price;
            });
            break;
        case 'random':
            // True random shuffle
            this.shuffleArray(this.filteredProperties);
            break;
        case 'default':
        default:
            // Smart rotation - ensures each property gets time at the top
            this.applySmartRotation();
            break;
    }
}

// Fisher-Yates shuffle algorithm for true randomization
shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Smart rotation that ensures each property gets a chance to be first
applySmartRotation() {
    // Get or create rotation tracking in localStorage
    let rotationData = JSON.parse(localStorage.getItem('propertyRotationData') || '{}');
    
    // Initialize if needed
    if (!rotationData.lastReset || !rotationData.propertyViews) {
        rotationData = {
            lastReset: new Date().toISOString(),
            propertyViews: {},
            sessionViews: 0
        };
    }
    
    // Check if we should reset (after 24 hours or new session)
    const now = new Date();
    const lastReset = new Date(rotationData.lastReset);
    const hoursSinceReset = (now - lastReset) / (1000 * 60 * 60);
    
    if (hoursSinceReset >= 24 || rotationData.sessionViews >= 50) {
        // Reset rotation data
        rotationData = {
            lastReset: now.toISOString(),
            propertyViews: {},
            sessionViews: 0
        };
    }
    
    // Increment session views
    rotationData.sessionViews = (rotationData.sessionViews || 0) + 1;
    
    // Sort properties with rotation logic
    this.filteredProperties.sort((a, b) => {
        const statusA = this.getPropertyStatus(a);
        const statusB = this.getPropertyStatus(b);
        
        // Available properties first (but with rotation)
        if (statusA === 'available' && statusB !== 'available') return -1;
        if (statusA !== 'available' && statusB === 'available') return 1;
        
        // Get view counts for both properties
        const viewsA = rotationData.propertyViews[a._id] || 0;
        const viewsB = rotationData.propertyViews[b._id] || 0;
        
        // Prioritize properties with fewer views
        if (viewsA !== viewsB) {
            return viewsA - viewsB;
        }
        
        // If same view count, use a combination of rating and random factor
        const ratingA = a.averageRating || 0;
        const ratingB = b.averageRating || 0;
        
        // Small random factor to avoid strict ordering
        const randomFactor = Math.random() * 0.3 - 0.15; // -0.15 to +0.15
        
        return (ratingB - ratingA) + randomFactor;
    });
    
    // Update view counts for the top 6 properties (first page)
    const propertiesToIncrement = this.filteredProperties.slice(0, 6);
    propertiesToIncrement.forEach(property => {
        rotationData.propertyViews[property._id] = (rotationData.propertyViews[property._id] || 0) + 1;
    });
    
    // Save updated rotation data
    localStorage.setItem('propertyRotationData', JSON.stringify(rotationData));
    
    console.log('Rotation data:', {
        sessionViews: rotationData.sessionViews,
        topProperties: propertiesToIncrement.map(p => ({
            id: p._id,
            title: p.title,
            views: rotationData.propertyViews[p._id]
        }))
    });
}

// Add a reset method for testing
resetRotationData() {
    localStorage.removeItem('propertyRotationData');
    console.log('Rotation data reset');
    this.applyFilters(); // Re-apply to refresh
}

    // Render properties
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

    // Get no results HTML with user type awareness
    // Get no results HTML with user type awareness
getNoResultsHTML() {
    const context = this.getUserContext();
    const isTenantMode = context.isTenantMode;
    const currentMonth = new Date().getMonth() + 1;
    const isNovemberToJanuary = currentMonth === 11 || currentMonth === 12 || currentMonth === 1;
    
    // Check if we have NSFAS properties but they're filtered out
    const hasNsfasProperties = this.properties.some(p => p.rentType === 'nsfas');
    const showingNsfasProperties = this.filteredProperties.some(p => p.rentType === 'nsfas');
    
    if (isTenantMode && !isNovemberToJanuary) {
        return `
        <div class="col-12 text-center py-5">
            <i class="bi bi-calendar-x display-1 text-muted"></i>
            <h3 class="text-navy mt-3">Short-term Accommodation Not Available</h3>
            <p class="text-muted">Short-term student accommodation is only available during November to January.</p>
            <p class="text-muted small">This period covers when students are away for holidays. Please check back during these months for available properties.</p>
            <div class="mt-3">
                <small class="text-info">
                    <i class="bi bi-info-circle me-1"></i>
                    Current month: ${new Date().toLocaleString('default', { month: 'long' })} (Month ${currentMonth})
                </small>
            </div>
        </div>`;
    }

    // NSFAS-specific messaging
    if (hasNsfasProperties && !showingNsfasProperties) {
        return `
        <div class="col-12 text-center py-5">
            <i class="bi bi-search display-1 text-muted"></i>
            <h3 class="text-navy mt-3">No matching NSFAS properties found</h3>
            <p class="text-muted">Try adjusting your filters to see NSFAS-accredited accommodations.</p>
            <button class="btn btn-navy" onclick="listingsManager.clearAllFilters()">
                Clear All Filters
            </button>
        </div>`;
    }

    // Check if there are no properties available for tenants during season
    if (isTenantMode && isNovemberToJanuary && this.properties.length === 0) {
        return `
        <div class="col-12 text-center py-5">
            <i class="bi bi-house display-1 text-muted"></i>
            <h3 class="text-navy mt-3">No Short-term Properties Available</h3>
            <p class="text-muted">There are currently no properties available for short-term accommodation.</p>
            <p class="text-muted small">Landlords may not have enabled short-term availability yet. Please check back later.</p>
            <div class="mt-3">
                <small class="text-info">
                    <i class="bi bi-info-circle me-1"></i>
                    Available season: November to January (Current: ${new Date().toLocaleString('default', { month: 'long' })})
                </small>
            </div>
        </div>`;
    }

    // Regular no results message for students/non-tenants
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

    // Utility methods (keep your existing ones)
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
            'cctv': 'camera-video',
            'alarm-system': 'shield-check'
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
            'cctv': 'CCTV',
            'alarm-system': 'Alarm System'
        };
        return amenityMap[amenity] || amenity;
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
        const mobileResultsCount = document.getElementById('mobileResultsCount');
        
        const count = this.filteredProperties.length;
        const resultsText = `${count} listing${count === 1 ? '' : 's'} found`;
        
        if (resultsCount) {
            resultsCount.textContent = resultsText;
        }
        
        if (mobileResultsCount) {
            mobileResultsCount.textContent = resultsText;
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