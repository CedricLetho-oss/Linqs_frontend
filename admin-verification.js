// Admin Verification Management - FIXED FILTERS AND EXPORT
class AdminVerificationManager {
    constructor() {
        this.token = localStorage.getItem("token");
        this.user = JSON.parse(localStorage.getItem("user") || "{}");
        this.API_BASE_URL = 'https://linqs-backend.onrender.com/api';
        this.currentPage = 1;
        this.limit = 10;
        this.filters = {
            status: 'all',
            type: 'all',
            search: ''
        };
        this.sort = 'newest';
        this.verifications = [];
        this.selectedVerification = null;
        this.hasMore = true;
        this.init();
    }

    async init() {
        console.log('Admin Verification Manager initialized');
        console.log('User role:', this.user.role);
        console.log('Token exists:', !!this.token);
        
        this.checkAdminAccess();
        this.setupEventListeners();
        await this.loadVerificationStats();
        await this.loadVerifications();
        this.setupRealTimeUpdates();
    }

    checkAdminAccess() {
        if (this.user.role !== 'admin') {
            alert('Access denied. Admin privileges required.');
            window.location.href = 'index.html';
        }
    }

    setupEventListeners() {
        // Event listeners are set up in the HTML inline handlers
    }

    async loadVerificationStats() {
        try {
            console.log('Loading verification stats from:', `${this.API_BASE_URL}/admin/verification/stats`);
            
            const response = await fetch(`${this.API_BASE_URL}/admin/verification/stats`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Stats response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Stats API response:', data);
                
                if (data.success) {
                    this.updateStats(data.data);
                } else {
                    throw new Error(data.error || 'Failed to load stats');
                }
            } else {
                console.error('Stats API failed with status:', response.status);
                throw new Error(`API returned ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading verification stats:', error);
            this.updateStats({
                total: 0,
                pending: 0,
                approved: 0,
                rejected: 0
            });
        }
    }

    updateStats(stats) {
        document.getElementById('totalVerifications').textContent = stats.total || 0;
        document.getElementById('pendingVerifications').textContent = stats.pending || 0;
        document.getElementById('approvedVerifications').textContent = stats.approved || 0;
        document.getElementById('rejectedVerifications').textContent = stats.rejected || 0;

        // Update notification badge
        const badge = document.getElementById('verificationBadge');
        if (badge) {
            badge.textContent = stats.pending || 0;
        }
    }

    async loadVerifications() {
        try {
            console.log('Loading verification requests...');
            const response = await this.fetchVerifications();
            
            console.log('Verifications API response:', response);
            
            if (response.success && response.data) {
                this.verifications = response.data.verifications || [];
                this.hasMore = response.data.hasMore || false;
                console.log('Loaded verifications:', this.verifications.length);
                this.updateVerificationList();
                this.updateNotificationBadges();
            } else {
                throw new Error(response.error || 'Failed to load verifications');
            }
        } catch (error) {
            console.error('Error loading verifications:', error);
            this.showError('Failed to load verification requests: ' + error.message);
            this.verifications = [];
            this.updateVerificationList();
        }
    }

    async fetchVerifications() {
        const params = new URLSearchParams({
            page: this.currentPage,
            limit: this.limit,
            status: this.filters.status,
            type: this.filters.type,
            search: this.filters.search,
            sort: this.sort
        });

        console.log('Fetching verifications with filters:', this.filters);
        console.log('API URL:', `${this.API_BASE_URL}/admin/verification?${params}`);

        const response = await fetch(`${this.API_BASE_URL}/admin/verification?${params}`, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Verifications fetch response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('API error:', errorData);
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        return await response.json();
    }

    updateVerificationList() {
    const verificationList = document.getElementById('verificationList');
    
    console.log('Updating verification list with:', this.verifications.length, 'items');
    console.log('Current filters:', this.filters);
    
    if (!this.verifications || this.verifications.length === 0) {
        verificationList.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-search display-1 text-muted mb-3"></i>
                <h5 class="text-muted">No verification requests found</h5>
                <p class="text-muted">No verification requests match your current filters.</p>
                <button class="btn btn-primary mt-3" onclick="adminVerificationManager.resetFilters()">
                    <i class="bi bi-arrow-clockwise me-2"></i>Reset Filters
                </button>
            </div>
        `;
        document.getElementById('loadMoreContainer').style.display = 'none';
        return;
    }

    verificationList.innerHTML = this.verifications.map(verification => {
        // ENHANCED: Better null user handling
        const user = verification.userId || {};
        const statusClass = `status-${verification.status}`;
        const itemClass = `verification-item ${verification.status}`;
        
        // ENHANCED: Check if user is deleted
        const isUserDeleted = !user.email || user.email === 'deleted@user.com' || user.firstName === '[Deleted User]';
        const userAvatar = user.avatar || 'https://via.placeholder.com/60?text=User';
        const userName = isUserDeleted 
            ? '[Deleted User]' 
            : (user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : 'Unknown User');
        const userRole = user.role || 'unknown';
        
        // ENHANCED: Disable actions for deleted users
        const isActionDisabled = isUserDeleted || verification.status !== 'pending';
        
        return `
            <div class="${itemClass}">
                <div class="row align-items-center">
                    <div class="col-md-2">
                        <div class="d-flex align-items-center">
                            <img src="${userAvatar}" alt="${userName}" class="user-avatar me-3" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                            <div>
                                <h6 class="fw-bold mb-0 ${isUserDeleted ? 'text-muted' : ''}">${userName}</h6>
                                <small class="text-muted">${userRole} ${isUserDeleted ? '(Deleted)' : ''}</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <span class="status-badge ${statusClass}">
                            ${this.getStatusText(verification.status)}
                        </span>
                    </div>
                    <div class="col-md-2">
                        <small class="text-muted">Submitted</small>
                        <div class="fw-semibold">${this.formatTime(verification.submittedAt)}</div>
                    </div>
                    <div class="col-md-3">
                        <small class="text-muted">Type</small>
                        <div class="fw-semibold">${verification.type === 'landlord' ? 'Landlord' : 'Student'}</div>
                    </div>
                    <div class="col-md-3">
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-outline-primary" onclick="adminVerificationManager.viewDetails('${verification._id}')">
                                <i class="bi bi-eye me-1"></i>View
                            </button>
                            ${verification.status === 'pending' ? `
                                <button class="btn btn-sm btn-success" 
                                    onclick="adminVerificationManager.approveVerification('${verification._id}')"
                                    ${isUserDeleted ? 'disabled title="Cannot approve - user deleted"' : ''}>
                                    <i class="bi bi-check-lg me-1"></i>Approve
                                </button>
                                <button class="btn btn-sm btn-danger" 
                                    onclick="adminVerificationManager.rejectVerification('${verification._id}')"
                                    ${isUserDeleted ? 'disabled title="Cannot reject - user deleted"' : ''}>
                                    <i class="bi bi-x-lg me-1"></i>Reject
                                </button>
                            ` : ''}
                            ${isUserDeleted ? `
                                <button class="btn btn-sm btn-outline-secondary" onclick="adminVerificationManager.deleteVerificationRecord('${verification._id}')">
                                    <i class="bi bi-trash me-1"></i>Delete Record
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('loadMoreContainer').style.display = this.hasMore ? 'block' : 'none';
}

// Add this method to AdminVerificationManager class
async deleteVerificationRecord(verificationId) {
    if (!confirm('Are you sure you want to delete this verification record? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${this.API_BASE_URL}/admin/verification/${verificationId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            this.showSuccess('Verification record deleted successfully!');
            await this.loadVerificationStats();
            await this.loadVerifications();
        } else {
            const data = await response.json();
            throw new Error(data.error || 'Failed to delete verification record');
        }
    } catch (error) {
        console.error('Error deleting verification record:', error);
        this.showError('Failed to delete verification record: ' + error.message);
    }
}

    // FIXED: Proper filter handling for all filter types
    setFilter(filter) {
        // Remove active class from all filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to clicked button
        event.target.classList.add('active');

        // Reset all filters first
        this.filters = {
            status: 'all',
            type: 'all',
            search: this.filters.search // Keep current search
        };

        // Apply the specific filter
        switch(filter) {
            case 'pending':
                this.filters.status = 'pending';
                break;
            case 'students':
                this.filters.type = 'student';
                break;
            case 'landlords':
                this.filters.type = 'landlord';
                break;
            case 'all':
            default:
                // Already set to 'all'
                break;
        }

        console.log('Applied filter:', filter, 'New filters:', this.filters);
        
        this.currentPage = 1;
        this.loadVerifications();
    }

    // NEW: Reset filters to show all
    resetFilters() {
        this.filters = {
            status: 'all',
            type: 'all',
            search: ''
        };
        
        // Reset UI
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Activate "All Requests" button
        const allRequestsBtn = document.querySelector('.filter-btn[onclick*="setFilter(\'all\')"]');
        if (allRequestsBtn) {
            allRequestsBtn.classList.add('active');
        }
        
        // Clear search
        document.getElementById('searchVerifications').value = '';
        
        this.currentPage = 1;
        this.loadVerifications();
    }

    // NEW: Export functionality
    async exportVerifications() {
        try {
            this.showSuccess('Preparing export...');
            
            const response = await fetch(`${this.API_BASE_URL}/admin/verification/export`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                
                // Create filename with timestamp
                const timestamp = new Date().toISOString().split('T')[0];
                a.download = `verifications-export-${timestamp}.csv`;
                
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showSuccess('Export downloaded successfully!');
            } else {
                // If CSV export fails, try JSON export as fallback
                await this.exportAsJSON();
            }
        } catch (error) {
            console.error('Export error:', error);
            // Fallback to JSON export
            await this.exportAsJSON();
        }
    }

    // NEW: Fallback JSON export
    async exportAsJSON() {
        try {
            // Get all verifications for export
            const params = new URLSearchParams({
                page: 1,
                limit: 1000, // Get all records
                status: 'all',
                type: 'all'
            });

            const response = await fetch(`${this.API_BASE_URL}/admin/verification?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const verifications = data.data?.verifications || [];
                
                // Convert to CSV format manually
                const csvData = this.convertToCSV(verifications);
                const blob = new Blob([csvData], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                
                const timestamp = new Date().toISOString().split('T')[0];
                a.download = `verifications-export-${timestamp}.csv`;
                
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showSuccess('Export downloaded successfully!');
            } else {
                throw new Error('Failed to fetch data for export');
            }
        } catch (error) {
            console.error('JSON export error:', error);
            this.showError('Failed to export verifications: ' + error.message);
        }
    }

    // NEW: Convert verification data to CSV
    convertToCSV(verifications) {
        const headers = [
            'User Name',
            'Email', 
            'User Role',
            'Verification Type',
            'Status',
            'Submitted Date',
            'Reviewed Date',
            'Reviewed By',
            'Rejection Reason'
        ];

        const rows = verifications.map(verification => {
            const user = verification.userId;
            return [
                `"${user.firstName} ${user.lastName}"`,
                `"${user.email}"`,
                `"${user.role}"`,
                `"${verification.type}"`,
                `"${verification.status}"`,
                `"${new Date(verification.submittedAt).toLocaleDateString()}"`,
                `"${verification.reviewedAt ? new Date(verification.reviewedAt).toLocaleDateString() : ''}"`,
                `"${verification.reviewedBy ? `${verification.reviewedBy.firstName} ${verification.reviewedBy.lastName}` : ''}"`,
                `"${verification.rejectionReason || ''}"`
            ];
        });

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    getStatusText(status) {
        const statusMap = {
            'pending': 'Pending Review',
            'approved': 'Approved',
            'rejected': 'Rejected'
        };
        return statusMap[status] || status;
    }

    async viewDetails(verificationId) {
        try {
            const verification = this.verifications.find(v => v._id === verificationId);
            if (!verification) {
                this.showError('Verification request not found');
                return;
            }

            this.selectedVerification = verification;
            this.showVerificationDetails(verification);
        } catch (error) {
            console.error('Error viewing details:', error);
            this.showError('Failed to load verification details');
        }
    }

    showVerificationDetails(verification) {
    // ENHANCED: Handle deleted users properly
    const user = verification.userId || {};
    const modalContent = document.getElementById('verificationDetailContent');
    
    // ENHANCED: Check if user is deleted
    const isUserDeleted = !user.email || user.email === 'deleted@user.com' || user.firstName === '[Deleted User]';
    const userAvatar = user.avatar || 'https://via.placeholder.com/100?text=User';
    const userName = isUserDeleted 
        ? '[Deleted User]' 
        : (user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : 'Unknown User');
    const userRole = user.role || 'unknown';
    const userEmail = isUserDeleted ? 'User account has been deleted' : (user.email || 'No email provided');
    const userPhone = isUserDeleted ? 'Not available' : (user.phone || 'Not provided');
    
    modalContent.innerHTML = `
        <div class="row">
            <div class="col-md-4">
                <div class="text-center mb-4">
                    <img src="${userAvatar}" alt="${userName}" class="user-avatar mb-3" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;">
                    <h5 class="fw-bold ${isUserDeleted ? 'text-muted' : ''}">${userName}</h5>
                    <p class="text-muted">${userRole} ${isUserDeleted ? '(Deleted)' : ''}</p>
                    <div class="status-badge status-${verification.status} mb-3">
                        ${this.getStatusText(verification.status)}
                    </div>
                </div>
                
                <div class="verification-details">
                    <h6 class="fw-bold mb-3">User Information</h6>
                    <div class="detail-row">
                        <span class="detail-label">Email:</span>
                        <span class="detail-value ${isUserDeleted ? 'text-muted' : ''}">${userEmail}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Phone:</span>
                        <span class="detail-value ${isUserDeleted ? 'text-muted' : ''}">${userPhone}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Submitted:</span>
                        <span class="detail-value">${this.formatTime(verification.submittedAt)}</span>
                    </div>
                    ${verification.reviewedAt ? `
                        <div class="detail-row">
                            <span class="detail-label">Reviewed:</span>
                            <span class="detail-value">${this.formatTime(verification.reviewedAt)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Reviewed By:</span>
                            <span class="detail-value">${verification.reviewedBy?.firstName || 'Admin'} ${verification.reviewedBy?.lastName || ''}</span>
                        </div>
                    ` : ''}
                    ${verification.rejectionReason ? `
                        <div class="detail-row">
                            <span class="detail-label">Rejection Reason:</span>
                            <span class="detail-value text-danger">${verification.rejectionReason}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="col-md-8">
                <h6 class="fw-bold mb-3">Verification Documents</h6>
                <div class="document-preview">
                    ${this.renderDocuments(verification.documents, verification.type)}
                </div>
                
                ${verification.status === 'pending' && !isUserDeleted ? `
                    <div class="action-buttons mt-4">
                        <button class="btn btn-success" onclick="adminVerificationManager.approveVerification('${verification._id}')">
                            <i class="bi bi-check-lg me-2"></i>Approve Verification
                        </button>
                        <button class="btn btn-danger" onclick="adminVerificationManager.rejectVerification('${verification._id}')">
                            <i class="bi bi-x-lg me-2"></i>Reject Verification
                        </button>
                    </div>
                ` : ''}
                
                ${isUserDeleted ? `
                    <div class="alert alert-warning mt-4">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        This user account has been deleted. You can only view or delete this verification record.
                    </div>
                    <div class="action-buttons mt-3">
                        <button class="btn btn-outline-danger" onclick="adminVerificationManager.deleteVerificationRecord('${verification._id}')">
                            <i class="bi bi-trash me-2"></i>Delete Verification Record
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    const modal = new bootstrap.Modal(document.getElementById('verificationDetailModal'));
    modal.show();
}

    renderDocuments(documents, type) {
    if (!documents || Object.keys(documents).length === 0) {
        return '<p class="text-muted">No documents submitted.</p>';
    }

    let html = '<div class="row">';
    
    // Iterate through all document types
    Object.entries(documents).forEach(([docType, docArray]) => {
        if (!docArray || !Array.isArray(docArray) || docArray.length === 0) return;
        
        const docName = this.getDocumentName(docType, type);
        
        docArray.forEach((doc, index) => {
            if (!doc || !doc.url) return;
            
            const fileExtension = doc.filename ? doc.filename.split('.').pop().toLowerCase() : 'file';
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileExtension);
            const isPDF = fileExtension === 'pdf';
            const isWord = ['doc', 'docx'].includes(fileExtension);
            
            // Ensure URL is properly formatted
           // In renderDocuments() - FIX FOR CLOUDINARY
            let documentUrl = doc.url;
            // Remove the localhost conversion - Cloudinary URLs should work as-is
            if (documentUrl && !documentUrl.startsWith('http') && !documentUrl.startsWith('//')) {
                // If it's a relative path, prepend your backend URL
                documentUrl = `https://linqs-backend.onrender.com${documentUrl}`;
            }
            
            html += `
                <div class="col-md-6 mb-3">
                    <div class="card document-card">
                        <div class="card-body">
                            <h6 class="card-title fw-semibold">
                                ${docName} ${docArray.length > 1 ? `#${index + 1}` : ''}
                            </h6>
                            
                            ${isImage ? `
                                <img src="${documentUrl}" alt="${docName}" 
                                     class="document-image w-100 mb-2" 
                                     onclick="adminVerificationManager.openDocument('${doc.url}')" 
                                     style="cursor: pointer; max-height: 200px; object-fit: cover; border: 1px solid #dee2e6; border-radius: 0.375rem;"
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                                <div class="document-placeholder bg-light text-center py-4 mb-2 rounded" 
                                     onclick="adminVerificationManager.openDocument('${doc.url}')"
                                     style="cursor: pointer; border: 1px solid #dee2e6; display: none;">
                                    <i class="bi bi-file-earmark-image display-4 text-muted"></i>
                                    <p class="mt-2 mb-0 text-muted">Image not loading</p>
                                    <small class="text-muted">Click to view/download</small>
                                </div>
                            ` : `
                                <div class="document-placeholder bg-light text-center py-4 mb-2 rounded" 
                                     onclick="adminVerificationManager.openDocument('${doc.url}')"
                                     style="cursor: pointer; border: 1px solid #dee2e6;">
                                    <i class="bi ${isPDF ? 'bi-file-earmark-pdf' : isWord ? 'bi-file-earmark-word' : 'bi-file-earmark'} display-4 text-muted"></i>
                                    <p class="mt-2 mb-0 text-muted">${doc.originalName || doc.filename || 'Document'}</p>
                                    <small class="text-muted">${fileExtension.toUpperCase()} File</small>
                                </div>
                            `}
                            
                            <div class="document-info small text-muted mb-2">
                                <div><strong>File:</strong> ${doc.originalName || doc.filename || 'Unknown'}</div>
                                <div><strong>Size:</strong> ${this.formatFileSize(doc.size)}</div>
                                <div><strong>Type:</strong> ${doc.mimetype || 'Unknown'}</div>
                                <div><strong>Uploaded:</strong> ${new Date(doc.uploadedAt).toLocaleDateString()}</div>
                            </div>
                            
                            <div class="mt-2">
                                <button class="btn btn-sm btn-outline-primary" onclick="adminVerificationManager.openDocument('${doc.url}')">
                                    <i class="bi bi-zoom-in me-1"></i>View Full Size
                                </button>
                                <button class="btn btn-sm btn-outline-secondary" onclick="adminVerificationManager.downloadDocument('${doc.url}', '${doc.originalName || doc.filename}')">
                                    <i class="bi bi-download me-1"></i>Download
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    });
    
    html += '</div>';
    
    if (html === '<div class="row"></div>') {
        return '<p class="text-muted">No valid documents found.</p>';
    }
    
    return html;
}

// Add this helper method for file size formatting
formatFileSize(bytes) {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}

// Add this method for document downloading
downloadDocument(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'document';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

    getDocumentName(docType, userType) {
    const documentNames = {
        'idCard': userType === 'student' ? 'Student ID Card' : 'ID Card',
        'proofOfEnrollment': 'Proof of Enrollment',
        'proofOfOwnership': 'Proof of Ownership',
        'businessLicense': 'Business License',
        'propertyContracts': 'Property Contracts',
        'utilityBills': 'Utility Bills',
        'academicRecords': 'Academic Records'
    };
    
    return documentNames[docType] || docType.split(/(?=[A-Z])/).join(' ');
}

    openDocument(url) {
    console.log('Opening document:', url);
    
    // Check if it's a relative URL and prepend the base URL
    let fullUrl = url;
    if (url.startsWith('/uploads/')) {
        fullUrl = `http://localhost:5000${url}`;
    } else if (!url.startsWith('http')) {
        // If it's just a filename, construct the full URL
        fullUrl = `http://localhost:5000/uploads/verifications/${url}`;
    }
    
    const extension = fullUrl.split('.').pop().toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension);
    
    if (isImage) {
        // For images, open in a modal for better viewing
        this.showImageModal(fullUrl);
    } else {
        // For other files, open in new tab (or download)
        window.open(fullUrl, '_blank');
    }
}

// Enhanced download method
downloadDocument(url, filename) {
    console.log('Downloading document:', url, filename);
    
    let fullUrl = url;
    if (url.startsWith('/uploads/')) {
        fullUrl = `http://localhost:5000${url}`;
    } else if (!url.startsWith('http')) {
        fullUrl = `http://localhost:5000/uploads/verifications/${url}`;
    }
    
    const a = document.createElement('a');
    a.href = fullUrl;
    a.download = filename || 'document';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Enhanced image modal with better error handling
showImageModal(imageUrl) {
    let fullUrl = imageUrl;
    if (imageUrl.startsWith('/uploads/')) {
        fullUrl = `http://localhost:5000${imageUrl}`;
    } else if (!imageUrl.startsWith('http')) {
        fullUrl = `http://localhost:5000/uploads/verifications/${imageUrl}`;
    }
    
    const modalHtml = `
        <div class="modal fade" id="imageModal" tabindex="-1">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Document Preview</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        <img src="${fullUrl}" alt="Document" class="img-fluid" style="max-height: 70vh;" 
                             onerror="this.onerror=null; this.src='https://via.placeholder.com/500x300?text=Image+Not+Found';">
                        <div class="mt-2">
                            <small class="text-muted">If image doesn't load, try downloading the file.</small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="adminVerificationManager.downloadDocument('${imageUrl}', 'document')">
                            <i class="bi bi-download me-1"></i>Download
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('imageModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add new modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('imageModal'));
    modal.show();
    
    // Clean up on hide
    modal._element.addEventListener('hidden.bs.modal', () => {
        document.getElementById('imageModal').remove();
    });
}

    async approveVerification(verificationId) {
        if (!confirm('Are you sure you want to approve this verification request?')) {
            return;
        }

        try {
            console.log('Approving verification:', verificationId);
            
            const response = await fetch(`${this.API_BASE_URL}/admin/verification/${verificationId}/approve`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (response.ok && data.success) {
                this.showSuccess('Verification approved successfully!');
                await this.loadVerificationStats();
                await this.loadVerifications();
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('verificationDetailModal'));
                if (modal) modal.hide();
            } else {
                throw new Error(data.error || 'Failed to approve verification');
            }
        } catch (error) {
            console.error('Error approving verification:', error);
            this.showError('Failed to approve verification: ' + error.message);
        }
    }

    async rejectVerification(verificationId) {
        this.selectedVerification = this.verifications.find(v => v._id === verificationId);
        if (!this.selectedVerification) {
            this.showError('Verification request not found');
            return;
        }

        const modal = new bootstrap.Modal(document.getElementById('rejectReasonModal'));
        modal.show();
    }

    async confirmReject() {
        const reason = document.getElementById('rejectReason').value.trim();
        if (!reason) {
            this.showError('Please provide a reason for rejection');
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/admin/verification/${this.selectedVerification._id}/reject`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });

            const data = await response.json();
            
            if (response.ok && data.success) {
                this.showSuccess('Verification rejected successfully!');
                document.getElementById('rejectReason').value = '';
                
                await this.loadVerificationStats();
                await this.loadVerifications();
                
                const rejectModal = bootstrap.Modal.getInstance(document.getElementById('rejectReasonModal'));
                if (rejectModal) rejectModal.hide();
                
                const detailModal = bootstrap.Modal.getInstance(document.getElementById('verificationDetailModal'));
                if (detailModal) detailModal.hide();
            } else {
                throw new Error(data.error || 'Failed to reject verification');
            }
        } catch (error) {
            console.error('Error rejecting verification:', error);
            this.showError('Failed to reject verification: ' + error.message);
        }
    }

    setSort(sortValue) {
        this.sort = sortValue;
        this.currentPage = 1;
        this.loadVerifications();
    }

    setSearch(searchTerm) {
        this.filters.search = searchTerm;
        this.currentPage = 1;
        this.loadVerifications();
    }

    async loadMore() {
        this.currentPage++;
        await this.loadVerifications();
    }

    updateNotificationBadges() {
        const pendingCount = this.verifications.filter(v => v.status === 'pending').length;
        
        const verificationBadge = document.getElementById('verificationBadge');
        if (verificationBadge) {
            verificationBadge.textContent = pendingCount;
        }
    }

    formatTime(dateString) {
        if (!dateString) return 'Unknown time';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';

        const now = new Date();
        const diffInMs = now - date;
        const diffInHours = diffInMs / (1000 * 60 * 60);
        const diffInDays = diffInHours / 24;

        if (diffInHours < 1) {
            const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
            return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)}h ago`;
        } else if (diffInDays < 7) {
            return `${Math.floor(diffInDays)}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    setupRealTimeUpdates() {
        setInterval(() => {
            this.loadVerificationStats();
            this.loadVerifications();
        }, 30000);
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'danger');
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

let adminVerificationManager;

document.addEventListener('DOMContentLoaded', function() {
    adminVerificationManager = new AdminVerificationManager();
    window.adminVerificationManager = adminVerificationManager;
});