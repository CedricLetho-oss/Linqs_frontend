class ReportForm {
    constructor() {
        this.token = localStorage.getItem("token");
        this.user = JSON.parse(localStorage.getItem("user") || "{}");
        this.currentStep = 1;
        this.formData = {
            reportedUserId: null,
            reportedPropertyId: null
        };
        this.selectedFiles = []; // Track selected files
        
        console.log('ReportForm initialized', { 
            user: this.user, 
            token: !!this.token,
            urlParams: window.location.search 
        });
        this.init();
    }

    init() {
        console.log('Initializing report form...');
        this.initializeForm();
        this.setupEventListeners();
        this.handleURLParameters();
        this.prefillUserData();
    }

    initializeForm() {
        console.log('Setting up form steps...');
        this.updateProgress();
        this.setupComplaintCards();
        this.setupFilePreview();
        this.setupDateRestrictions(); // Add date restrictions
        
        // Debug: Log current state
        console.log('Form initialized:', {
            currentStep: this.currentStep,
            autoFillVisible: document.getElementById('autoFillSection').style.display,
            manualEntryVisible: document.getElementById('manualEntrySection').style.display
        });
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Next step buttons
        document.querySelectorAll('.next-step').forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('Next step clicked from:', e.target);
                this.nextStep();
            });
        });

        // Previous step buttons
        document.querySelectorAll('.prev-step').forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('Previous step clicked from:', e.target);
                this.prevStep();
            });
        });

        // Form submission
        document.getElementById('reportForm').addEventListener('submit', (e) => {
            console.log('Form submission started');
            this.handleFormSubmission(e);
        });
        
        // Anonymous checkbox handler
        document.getElementById('anonymous').addEventListener('change', (e) => {
            console.log('Anonymous checkbox changed:', e.target.checked);
            this.toggleAnonymousFields(e.target.checked);
        });

        // Manual entry toggle
        const manualToggle = document.querySelector('.manual-toggle');
        if (manualToggle) {
            manualToggle.addEventListener('click', () => {
                console.log('Manual entry toggle clicked');
                this.toggleManualEntry();
            });
        }

        console.log('Event listeners setup complete');
    }

    // Add date restrictions to prevent future dates
    setupDateRestrictions() {
        const issueDateInput = document.getElementById('issueDate');
        if (issueDateInput) {
            // Set max date to today
            const today = new Date().toISOString().split('T')[0];
            issueDateInput.setAttribute('max', today);
            
            // Add visual feedback for disabled dates
            issueDateInput.addEventListener('focus', () => {
                this.showDateRestrictionMessage();
            });
        }
    }

    showDateRestrictionMessage() {
        // You can add a tooltip or message here
        console.log('Date picker opened - future dates are disabled');
    }

    // Add this method to update the ID field label based on user type
    updateIdFieldLabel() {
        const idLabel = document.getElementById('idLabel');
        const idHelpText = document.getElementById('idHelpText');
        
        if (this.user.role === 'student') {
            idLabel.textContent = 'Student Number';
            idHelpText.textContent = 'Your university student number (optional)';
            document.getElementById('studentNumber').placeholder = 'e.g., 12345678';
        } else if (this.user.role === 'tenant') {
            idLabel.textContent = 'ID Number';
            idHelpText.textContent = 'Your ID number for verification (optional)';
            document.getElementById('studentNumber').placeholder = 'e.g., 8501015000089';
        }
    }

    // Call this in prefillUserData method
    prefillUserData() {
        console.log('Prefilling user data...');
        
        // Update ID field label first
        this.updateIdFieldLabel();
        
        // Prefill user data from localStorage
        if (this.user) {
            const fullName = `${this.user.firstName || ''} ${this.user.surname || ''}`.trim();
            document.getElementById('fullName').value = fullName;
            document.getElementById('email').value = this.user.email || '';
            document.getElementById('phone').value = this.user.phone || '';
            
            if (this.user.role === 'student') {
                document.getElementById('studentNumber').value = this.user.studentNumber || '';
            } else if (this.user.role === 'tenant') {
                document.getElementById('studentNumber').value = this.user.idNumber || '';
            }
            
            console.log('User data prefilled:', { 
                fullName, 
                email: this.user.email,
                role: this.user.role 
            });
        }
    }

    toggleAnonymousFields(isAnonymous) {
        console.log('Toggling anonymous fields:', isAnonymous);
        const fields = ['fullName', 'email', 'phone', 'studentNumber'];
        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                element.disabled = isAnonymous;
                if (isAnonymous) {
                    element.value = '';
                } else {
                    // Restore values if available
                    this.prefillUserData();
                }
            }
        });
    }

    handleURLParameters() {
        console.log('Handling URL parameters...');
        const urlParams = new URLSearchParams(window.location.search);
        const property = urlParams.get("property");
        const landlord = urlParams.get("landlord");
        const landlordId = urlParams.get("landlordId");
        const propertyId = urlParams.get("propertyId");

        console.log('URL parameters:', { property, landlord, landlordId, propertyId });

        if (property && landlord) {
            console.log('Showing auto-fill section');
            document.getElementById('autoFillSection').style.display = 'block';
            document.getElementById('manualEntrySection').style.display = 'none';
            
            document.getElementById('propertyField').value = decodeURIComponent(property);
            document.getElementById('landlordField').value = decodeURIComponent(landlord);
            
            // Store IDs for backend - ONLY if they exist and are valid
            this.formData.reportedUserId = landlordId && landlordId !== 'null' && landlordId !== 'undefined' ? landlordId : null;
            this.formData.reportedPropertyId = propertyId && propertyId !== 'null' && propertyId !== 'undefined' ? propertyId : null;
            
            console.log('Auto-filled data:', {
                property: decodeURIComponent(property),
                landlord: decodeURIComponent(landlord),
                reportedUserId: this.formData.reportedUserId,
                reportedPropertyId: this.formData.reportedPropertyId
            });
        } else {
            console.log('Showing manual entry section (no URL params)');
            document.getElementById('autoFillSection').style.display = 'none';
            document.getElementById('manualEntrySection').style.display = 'block';
            
            // Reset IDs for manual entry
            this.formData.reportedUserId = null;
            this.formData.reportedPropertyId = null;
        }
    }

    // Enhanced file validation
    validateFile(file) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = [
            'image/jpeg', 
            'image/jpg', 
            'image/png', 
            'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (file.size > maxSize) {
            return { valid: false, error: `File ${file.name} is too large. Maximum size is 5MB.` };
        }
        
        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: `File ${file.name} is not a supported type. Please upload images or documents.` };
        }
        
        return { valid: true };
    }

    setupComplaintCards() {
        console.log('Setting up complaint cards...');
        const complaintCards = document.querySelectorAll('.complaint-card');
        complaintCards.forEach(card => {
            card.addEventListener('click', () => {
                console.log('Complaint card clicked:', card.getAttribute('data-category'));
                complaintCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                
                const category = card.getAttribute('data-category');
                const description = card.getAttribute('data-description');
                
                document.getElementById('category').value = category;
                if (description) {
                    document.getElementById('description').value = description;
                }
                
                console.log('Card data applied:', { category, description });
            });
        });
    }

    // ENHANCED: File preview with delete functionality
    setupFilePreview() {
        console.log('Setting up enhanced file preview...');
        const fileInput = document.getElementById('evidenceFiles');
        const previewContainer = document.getElementById('filePreview');
        
        if (!fileInput) {
            console.error('File input not found!');
            return;
        }
        
        // Add multiple file attribute
        fileInput.setAttribute('multiple', 'true');
        
        fileInput.addEventListener('change', (e) => {
            console.log('File input changed');
            const files = Array.from(e.target.files);
            
            // Check total files (existing + new)
            const totalFiles = this.selectedFiles.length + files.length;
            if (totalFiles > 5) {
                alert(`Maximum 5 files allowed. You already have ${this.selectedFiles.length} files selected.`);
                e.target.value = '';
                return;
            }
            
            // Validate and add new files
            files.forEach(file => {
                const validation = this.validateFile(file);
                if (!validation.valid) {
                    alert(validation.error);
                    return;
                }
                
                // Add to selected files
                this.selectedFiles.push(file);
            });
            
            // Update preview
            this.updateFilePreview();
            
            // Update file input to reflect current selection
            this.updateFileInput();
        });
    }

    // Update file preview with delete buttons
    updateFilePreview() {
        const previewContainer = document.getElementById('filePreview');
        previewContainer.innerHTML = '';
        
        if (this.selectedFiles.length === 0) {
            previewContainer.innerHTML = `
                <div class="text-muted text-center py-3">
                    <i class="bi bi-cloud-upload fs-1 d-block mb-2"></i>
                    <small>No files selected. Maximum 5 files allowed.</small>
                </div>
            `;
            return;
        }
        
        // Create preview for each file
        this.selectedFiles.forEach((file, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'file-preview-item position-relative';
            previewItem.style.cssText = `
                display: inline-block;
                margin: 5px;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 8px;
                background: white;
                max-width: 120px;
            `;
            
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewItem.innerHTML = `
                        <img src="${e.target.result}" class="evidence-preview" 
                             style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px;" 
                             alt="Evidence preview">
                        <button type="button" class="btn btn-danger btn-sm position-absolute top-0 end-0 m-1" 
                                onclick="window.reportFormInstance.removeFile(${index})"
                                style="width: 20px; height: 20px; padding: 0; border-radius: 50%; font-size: 10px;">
                            ×
                        </button>
                        <div class="file-name text-center mt-1" style="font-size: 11px; word-break: break-all;">
                            ${file.name}
                        </div>
                    `;
                };
                reader.readAsDataURL(file);
            } else {
                const fileExtension = file.name.split('.').pop().toLowerCase();
                const iconClass = fileExtension === 'pdf' ? 'bi-file-earmark-pdf text-danger' : 'bi-file-earmark-text text-primary';
                
                previewItem.innerHTML = `
                    <div class="text-center">
                        <i class="bi ${iconClass} fs-1"></i>
                        <button type="button" class="btn btn-danger btn-sm position-absolute top-0 end-0 m-1" 
                                onclick="window.reportFormInstance.removeFile(${index})"
                                style="width: 20px; height: 20px; padding: 0; border-radius: 50%; font-size: 10px;">
                            ×
                        </button>
                    </div>
                    <div class="file-name text-center mt-1" style="font-size: 11px; word-break: break-all;">
                        ${file.name}
                    </div>
                `;
            }
            
            previewContainer.appendChild(previewItem);
        });
        
        // Show file count
        const fileCount = document.createElement('div');
        fileCount.className = 'text-muted small mt-2';
        fileCount.textContent = `${this.selectedFiles.length} of 5 files selected`;
        previewContainer.appendChild(fileCount);
    }

    // Remove file from selection
    removeFile(index) {
        if (index >= 0 && index < this.selectedFiles.length) {
            this.selectedFiles.splice(index, 1);
            this.updateFilePreview();
            this.updateFileInput();
        }
    }

    // Update the actual file input with selected files
    updateFileInput() {
        const fileInput = document.getElementById('evidenceFiles');
        const dt = new DataTransfer();
        
        this.selectedFiles.forEach(file => {
            dt.items.add(file);
        });
        
        fileInput.files = dt.files;
    }

    nextStep() {
        console.log('Moving to next step from:', this.currentStep);
        if (!this.validateCurrentStep()) {
            console.log('Validation failed for step:', this.currentStep);
            return;
        }
        
        if (this.currentStep < 4) {
            if (this.currentStep === 3) {
                this.updateSummary();
            }
            
            // Hide current step
            const currentStepElement = document.querySelector(`.form-step[data-step="${this.currentStep}"]`);
            const currentStepIndicator = document.querySelector(`.step[data-step="${this.currentStep}"]`);
            
            if (currentStepElement) currentStepElement.classList.remove('active');
            if (currentStepIndicator) currentStepIndicator.classList.remove('active');
            
            this.currentStep++;
            console.log('New current step:', this.currentStep);
            
            // Show next step
            const nextStepElement = document.querySelector(`.form-step[data-step="${this.currentStep}"]`);
            const nextStepIndicator = document.querySelector(`.step[data-step="${this.currentStep}"]`);
            
            if (nextStepElement) nextStepElement.classList.add('active');
            if (nextStepIndicator) nextStepIndicator.classList.add('active');
            
            this.updateProgress();
        }
    }

    prevStep() {
        console.log('Moving to previous step from:', this.currentStep);
        if (this.currentStep > 1) {
            // Hide current step
            const currentStepElement = document.querySelector(`.form-step[data-step="${this.currentStep}"]`);
            const currentStepIndicator = document.querySelector(`.step[data-step="${this.currentStep}"]`);
            
            if (currentStepElement) currentStepElement.classList.remove('active');
            if (currentStepIndicator) currentStepIndicator.classList.remove('active');
            
            this.currentStep--;
            console.log('New current step:', this.currentStep);
            
            // Show previous step
            const prevStepElement = document.querySelector(`.form-step[data-step="${this.currentStep}"]`);
            const prevStepIndicator = document.querySelector(`.step[data-step="${this.currentStep}"]`);
            
            if (prevStepElement) prevStepElement.classList.add('active');
            if (prevStepIndicator) prevStepIndicator.classList.add('active');
            
            this.updateProgress();
        }
    }

    validateCurrentStep() {
        let isValid = true;
        let errorMessage = '';

        console.log('Validating step:', this.currentStep);

        switch(this.currentStep) {
            case 1:
                const property = document.getElementById('autoFillSection').style.display !== 'none' 
                    ? document.getElementById('propertyField').value 
                    : document.getElementById('manualProperty').value;
                const landlord = document.getElementById('autoFillSection').style.display !== 'none'
                    ? document.getElementById('landlordField').value
                    : document.getElementById('manualLandlord').value;
                const category = document.getElementById('category').value;
                
                console.log('Step 1 validation data:', { property, landlord, category });
                
                if (!property || !landlord || !category) {
                    errorMessage = 'Please fill in all required fields in Step 1.';
                    isValid = false;
                }
                break;
                
            case 2:
                const description = document.getElementById('description').value;
                const issueDate = document.getElementById('issueDate').value;
                
                console.log('Step 2 validation data:', { 
                    descriptionLength: description?.length, 
                    issueDate 
                });
                
                if (!description) {
                    errorMessage = 'Please provide a description of the issue.';
                    isValid = false;
                } else if (description.length < 10) {
                    errorMessage = 'Description must be at least 10 characters long.';
                    isValid = false;
                } else if (!issueDate) {
                    errorMessage = 'Please provide the date the issue occurred.';
                    isValid = false;
                } else {
                    // Validate that date is not in the future
                    const selectedDate = new Date(issueDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    if (selectedDate > today) {
                        errorMessage = 'Issue date cannot be in the future. Please select a past or today\'s date.';
                        isValid = false;
                    }
                }
                break;
                
            case 3:
                const isAnonymous = document.getElementById('anonymous').checked;
                
                console.log('Step 3 validation data:', { isAnonymous });
                
                if (!isAnonymous) {
                    const fullName = document.getElementById('fullName').value;
                    const email = document.getElementById('email').value;
                    
                    if (!fullName) {
                        errorMessage = 'Please provide your full name.';
                        isValid = false;
                    } else if (!email) {
                        errorMessage = 'Please provide your email address.';
                        isValid = false;
                    } else if (!this.isValidEmail(email)) {
                        errorMessage = 'Please provide a valid email address.';
                        isValid = false;
                    }
                }
                break;
        }
        
        if (!isValid) {
            console.log('Validation failed:', errorMessage);
            alert(errorMessage);
        } else {
            console.log('Validation passed for step:', this.currentStep);
        }
        
        return isValid;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    updateSummary() {
        console.log('Updating summary...');
        const property = document.getElementById('autoFillSection').style.display !== 'none' 
            ? document.getElementById('propertyField').value 
            : document.getElementById('manualProperty').value;
        const landlord = document.getElementById('autoFillSection').style.display !== 'none'
            ? document.getElementById('landlordField').value
            : document.getElementById('manualLandlord').value;
        
        document.getElementById('summaryProperty').textContent = property || 'Not provided';
        document.getElementById('summaryLandlord').textContent = landlord || 'Not provided';
        document.getElementById('summaryCategory').textContent = document.getElementById('category').value || 'Not provided';
        document.getElementById('summaryDescription').textContent = document.getElementById('description').value || 'Not provided';
        document.getElementById('summaryDate').textContent = this.formatDate(document.getElementById('issueDate').value) || 'Not provided';
        document.getElementById('summaryFrequency').textContent = document.getElementById('issueFrequency').options[document.getElementById('issueFrequency').selectedIndex].text;
        
        // Show file count in summary
        document.getElementById('summaryEvidence').textContent = this.selectedFiles.length > 0 
            ? `${this.selectedFiles.length} file(s) attached` 
            : 'No files attached';
        
        const isAnonymous = document.getElementById('anonymous').checked;
        if (isAnonymous) {
            document.getElementById('summaryName').textContent = 'Anonymous Submission';
            document.getElementById('summaryEmail').textContent = 'Hidden for privacy';
            document.getElementById('summaryPhone').textContent = 'Hidden for privacy';
            
            // Update ID field label in summary based on user type
            const idLabel = this.user.role === 'student' ? 'Student Number' : 'ID Number';
            document.getElementById('summaryStudentNumber').textContent = 'Hidden for privacy';
            // Update the label text if you have a separate element for it
            const idLabelElement = document.querySelector('[for="summaryStudentNumber"]');
            if (idLabelElement) {
                idLabelElement.textContent = idLabel + ':';
            }
        } else {
            document.getElementById('summaryName').textContent = document.getElementById('fullName').value || 'Not provided';
            document.getElementById('summaryEmail').textContent = document.getElementById('email').value || 'Not provided';
            document.getElementById('summaryPhone').textContent = document.getElementById('phone').value || 'Not provided';
            
            // Show appropriate ID based on user type
            const idValue = document.getElementById('studentNumber').value || 'Not provided';
            const idLabel = this.user.role === 'student' ? 'Student Number' : 'ID Number';
            document.getElementById('summaryStudentNumber').textContent = idValue;
            
            // Update the label text
            const idLabelElement = document.querySelector('[for="summaryStudentNumber"]');
            if (idLabelElement) {
                idLabelElement.textContent = idLabel + ':';
            }
        }
        
        console.log('Summary updated with data:', {
            property,
            landlord,
            isAnonymous,
            userType: this.user.role,
            fileCount: this.selectedFiles.length
        });
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-ZA', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    updateProgress() {
        const percent = (this.currentStep / 4) * 100;
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = percent + '%';
        }
        
        document.querySelectorAll('.step').forEach((step, index) => {
            const stepNumber = parseInt(step.getAttribute('data-step'));
            if (stepNumber < this.currentStep) {
                step.classList.add('completed');
                step.classList.remove('active');
            } else if (stepNumber === this.currentStep) {
                step.classList.add('active');
                step.classList.remove('completed');
            } else {
                step.classList.remove('active', 'completed');
            }
        });
        
        console.log('Progress updated:', { percent, currentStep: this.currentStep });
    }

    // In handleFormSubmission method, update the form data preparation:
    async handleFormSubmission(e) {
        e.preventDefault();
        console.log('Handling form submission...');
        
        try {
            const isAnonymous = document.getElementById('anonymous').checked;
            
            // Upload evidence files first
            let evidenceUrls = [];
            
            if (this.selectedFiles.length > 0) {
                console.log('Uploading evidence files:', this.selectedFiles.length);
                evidenceUrls = await this.uploadEvidenceFiles(this.selectedFiles);
                console.log('Evidence URLs:', evidenceUrls);
            }

            // Prepare form data for submission
            const formData = {
                reportType: this.mapCategoryToReportType(document.getElementById('category').value),
                title: `Complaint: ${document.getElementById('category').value}`,
                description: document.getElementById('description').value,
                evidence: evidenceUrls, // Add uploaded evidence URLs
                isAnonymous: isAnonymous,
                issueDate: document.getElementById('issueDate').value,
                issueFrequency: document.getElementById('issueFrequency').value
            };

            // Only add IDs if they are valid strings
            if (this.formData.reportedUserId && this.formData.reportedUserId !== 'null' && this.formData.reportedUserId !== 'undefined') {
                formData.reportedUserId = this.formData.reportedUserId;
            }
            
            if (this.formData.reportedPropertyId && this.formData.reportedPropertyId !== 'null' && this.formData.reportedPropertyId !== 'undefined') {
                formData.reportedPropertyId = this.formData.reportedPropertyId;
            }

            // Add user type information
            formData.reporterType = this.user.role;
            
            // For anonymous submissions, don't include personal info
            if (!isAnonymous) {
                formData.fullName = document.getElementById('fullName').value;
                formData.email = document.getElementById('email').value;
                formData.phone = document.getElementById('phone').value;
                
                if (this.user.role === 'student') {
                    formData.studentNumber = document.getElementById('studentNumber').value;
                } else if (this.user.role === 'tenant') {
                    formData.idNumber = document.getElementById('studentNumber').value;
                }
            }

            console.log('Submitting form data:', formData);

            // Validate final form data
            if (!formData.reportedUserId && !formData.reportedPropertyId) {
                alert('Please provide either a landlord or property to report. Use the manual entry fields if needed.');
                return;
            }

            // Submit to backend
            const response = await fetch(`${API_BASE_URL}/reports`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Report submitted successfully:', result);
                this.showSuccessScreen(result.report._id);
            } else {
                const error = await response.json();
                console.error('Server error:', error);
                alert('Error submitting report: ' + error.error);
            }
        } catch (error) {
            console.error('Error submitting report:', error);
            alert('Failed to submit report. Please try again.');
        }
    }

    // Add this new method to upload evidence files
    async uploadEvidenceFiles(files) {
        const urls = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            try {
                const formData = new FormData();
                formData.append('image', file);
                
                const response = await fetch(`${API_BASE_URL}/upload`, {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.url || result.secure_url) {
                        urls.push(result.url || result.secure_url);
                        console.log(`Successfully uploaded: ${file.name}`);
                    } else {
                        console.error('No URL returned for file:', file.name);
                    }
                } else {
                    console.error('Upload failed for file:', file.name);
                }
            } catch (error) {
                console.error('Error uploading file:', file.name, error);
            }
        }
        
        return urls;
    }

    mapCategoryToReportType(category) {
        const categoryMap = {
            'Landlord Issues': 'inappropriate_behavior',
            'Accommodation Facilities': 'safety_concerns',
            'Security Concerns': 'safety_concerns',
            'Payment/Contracts': 'fraud',
            'Maintenance': 'other',
            'Noise/Disturbance': 'harassment',
            'Other': 'other'
        };
        return categoryMap[category] || 'other';
    }

    showSuccessScreen(reportId) {
        console.log('Showing success screen with report ID:', reportId);
        const successHTML = `
            <div class="text-center py-5">
                <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>
                <h3 class="text-success mt-3">Complaint Submitted Successfully!</h3>
                <p class="lead">Your complaint has been received and will be reviewed by our team.</p>
                <div class="alert alert-info mx-auto" style="max-width: 400px;">
                    <strong>Reference Number:</strong> ${reportId}
                </div>
                <p class="text-muted">Keep this reference number for tracking your complaint.</p>
                <div class="mt-4">
                    <a href="index.html" class="btn btn-navy me-2">Return Home</a>
                    <a href="view-reports.html" class="btn btn-outline-primary me-2">Track My Reports</a>
                    <button class="btn btn-outline-secondary" onclick="location.reload()">Submit Another Complaint</button>
                </div>
            </div>
        `;
        
        document.querySelector('.container .row .col-lg-8').innerHTML = successHTML;
    }

    toggleManualEntry() {
        console.log('Toggling to manual entry');
        document.getElementById('autoFillSection').style.display = 'none';
        document.getElementById('manualEntrySection').style.display = 'block';
        
        // Clear the stored IDs since we're using manual entry
        this.formData.reportedUserId = null;
        this.formData.reportedPropertyId = null;
    }
}

// Global function for manual entry toggle
function toggleManualEntry() {
    if (window.reportFormInstance) {
        window.reportFormInstance.toggleManualEntry();
    }
}

// Initialize form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing ReportForm...');
    window.reportFormInstance = new ReportForm();
});

// Add debug helper to check if script is loaded
console.log('my-reports.js loaded successfully');