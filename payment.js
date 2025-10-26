// ResLinQ Payment Manager - Updated for Subscription Plans
class ResLinQPaymentManager {
    constructor() {
        this.token = localStorage.getItem("token");
        this.user = JSON.parse(localStorage.getItem("user") || "{}");
        this.selectedProvider = 'payfast';
        this.selectedMethod = '';
        
        // Get selected subscription plan
        this.selectedPlan = JSON.parse(localStorage.getItem('selectedSubscriptionPlan') || '{}');
        
        this.paymentMethods = {
            payfast: [
                { id: 'credit_card', name: 'Credit Card', icon: 'bi-credit-card', description: 'Visa, Mastercard, Amex' },
                { id: 'debit_card', name: 'Debit Card', icon: 'bi-card-text', description: 'Visa Debit, Mastercard Debit' },
                { id: 'instant_eft', name: 'Instant EFT', icon: 'bi-lightning', description: 'Immediate bank transfer' },
                { id: 'eft', name: 'Bank EFT', icon: 'bi-bank', description: '2-3 business days' }
            ],
            ozow: [
                { id: 'bank_transfer', name: 'Bank Transfer', icon: 'bi-arrow-left-right', description: 'Direct bank transfer' },
                { id: 'qr_code', name: 'QR Code', icon: 'bi-qr-code', description: 'Scan with banking app' },
                { id: 'mobicred', name: 'MobiCred', icon: 'bi-phone', description: 'Pay with airtime or MobiCred' },
                { id: 'debit_order', name: 'Debit Order', icon: 'bi-calendar-check', description: 'Recurring payments' }
            ]
        };
        
        this.init();
    }

    init() {
        console.log('ResLinQ Payment Manager initialized');
        this.setupEventListeners();
        this.selectProvider('payfast');
        this.updateSubscriptionDetails(); // NEW: Update UI with subscription details
    }

    // NEW: Update UI with subscription plan details
    updateSubscriptionDetails() {
        if (this.selectedPlan && this.selectedPlan.name) {
            // Update amount display
            const amountElement = document.getElementById('paymentAmount');
            if (amountElement) {
                amountElement.textContent = this.selectedPlan.price.toLocaleString();
            }

            // Update description
            const descriptionElement = document.querySelector('.amount-display .fs-6:last-child');
            if (descriptionElement) {
                descriptionElement.textContent = `${this.selectedPlan.name} Annual Subscription`;
            }

            // Update booking summary
            const propertyNameElement = document.getElementById('propertyName');
            if (propertyNameElement) {
                propertyNameElement.textContent = this.selectedPlan.name;
            }

            const durationElement = document.querySelector('.d-flex.justify-content-between:nth-child(2) .fw-medium');
            if (durationElement) {
                durationElement.textContent = '1 Year';
            }

            const totalElement = document.querySelector('.d-flex.justify-content-between.fw-bold.fs-5 .text-primary');
            if (totalElement) {
                totalElement.textContent = `R ${this.selectedPlan.price.toLocaleString()}`;
            }

            // Update page title and header
            document.querySelector('.payment-header h2').textContent = 'Complete Subscription Payment';
            document.querySelector('.payment-header p').textContent = `Activate your ${this.selectedPlan.name} plan`;

            console.log('Subscription details loaded:', this.selectedPlan);
        } else {
            // No plan selected, redirect back to plans
            this.showError('No subscription plan selected. Redirecting to plans...');
            setTimeout(() => {
                window.location.href = 'subscription-plans.html';
            }, 2000);
        }
    }

    setupEventListeners() {
        // Provider selection
        document.getElementById('payfastOption').addEventListener('click', () => {
            this.selectProvider('payfast');
        });
        
        document.getElementById('ozowOption').addEventListener('click', () => {
            this.selectProvider('ozow');
        });

        // Process payment button
        document.getElementById('processPayment').addEventListener('click', () => {
            this.processPayment();
        });

        // Cancel payment button - UPDATED
        document.getElementById('cancelPayment').addEventListener('click', () => {
            if (confirm('Are you sure you want to cancel this subscription?')) {
                localStorage.removeItem('selectedSubscriptionPlan');
                window.location.href = 'subscription-plans.html';
            }
        });
    }

    selectProvider(provider) {
        this.selectedProvider = provider;
        
        // Update UI for provider selection
        document.querySelectorAll('.provider-option').forEach(option => {
            option.classList.remove('selected');
            option.querySelector('.bi-check-circle-fill').style.display = 'none';
        });
        
        const selectedOption = document.getElementById(provider + 'Option');
        selectedOption.classList.add('selected');
        selectedOption.querySelector('.bi-check-circle-fill').style.display = 'block';
        
        // Render payment methods for selected provider
        this.renderPaymentMethods();
    }

    renderPaymentMethods() {
        const container = document.getElementById('paymentMethodsSection');
        const methods = this.paymentMethods[this.selectedProvider];
        
        let html = `
            <h5 class="fw-bold mb-3 text-navy">Payment Method</h5>
            <div id="methodsContainer">
        `;

        methods.forEach((method, index) => {
            const isSelected = index === 0;
            if (isSelected) this.selectedMethod = method.id;
            
            html += `
                <div class="method-option ${isSelected ? 'selected' : ''}" 
                     data-method="${method.id}">
                    <div class="d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center">
                            <i class="${method.icon} me-3 text-primary fs-5"></i>
                            <div>
                                <div class="fw-medium">${method.name}</div>
                                <small class="text-muted">${method.description}</small>
                            </div>
                        </div>
                        <i class="bi bi-check-circle-fill text-primary" style="display: ${isSelected ? 'block' : 'none'};"></i>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;

        // Add event listeners to method options
        this.setupMethodEventListeners();
        
        // Show method-specific fields if needed
        this.showMethodSpecificFields(this.selectedMethod);
    }

    setupMethodEventListeners() {
        document.querySelectorAll('.method-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const method = option.getAttribute('data-method');
                this.selectPaymentMethod(method);
            });
        });
    }

    selectPaymentMethod(method) {
        this.selectedMethod = method;
        
        // Update UI
        document.querySelectorAll('.method-option').forEach(option => {
            option.classList.remove('selected');
            option.querySelector('.bi-check-circle-fill').style.display = 'none';
        });
        
        const selectedOption = document.querySelector(`[data-method="${method}"]`);
        selectedOption.classList.add('selected');
        selectedOption.querySelector('.bi-check-circle-fill').style.display = 'block';
        
        // Show method-specific fields
        this.showMethodSpecificFields(method);
    }

    showMethodSpecificFields(method) {
        // Remove any existing specific fields
        const existingFields = document.getElementById('methodSpecificFields');
        if (existingFields) {
            existingFields.remove();
        }

        const methodsContainer = document.getElementById('methodsContainer');
        
        if (method.includes('card')) {
            this.renderCardDetails();
        } else if (method === 'qr_code') {
            this.renderQRCode();
        }
        // For other methods like EFT, no additional fields needed
    }

    renderCardDetails() {
        const methodsContainer = document.getElementById('methodsContainer');
        const cardHTML = `
            <div id="methodSpecificFields" class="card-details">
                <h6 class="mb-3">Card Details</h6>
                <div class="row">
                    <div class="col-12 mb-3">
                        <label class="form-label">Card Number</label>
                        <input type="text" class="form-control" placeholder="1234 5678 9012 3456" 
                               maxlength="19" id="cardNumber">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Expiry Date</label>
                        <input type="text" class="form-control" placeholder="MM/YY" id="cardExpiry">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">CVV</label>
                        <input type="text" class="form-control" placeholder="123" maxlength="3" id="cardCVV">
                    </div>
                    <div class="col-12 mb-3">
                        <label class="form-label">Cardholder Name</label>
                        <input type="text" class="form-control" placeholder="John Doe" id="cardholderName">
                    </div>
                </div>
            </div>
        `;
        methodsContainer.insertAdjacentHTML('afterend', cardHTML);
    }

    renderQRCode() {
        const methodsContainer = document.getElementById('methodsContainer');
        const qrHTML = `
            <div id="methodSpecificFields" class="text-center mt-3">
                <div class="p-4 bg-light rounded">
                    <h6>Scan QR Code to Pay</h6>
                    <div class="bg-white p-3 d-inline-block rounded border">
                        <!-- QR Code Placeholder -->
                        <div style="width: 180px; height: 180px; background: #f8f9fa; 
                                   display: flex; align-items: center; justify-content: center;
                                   border: 2px dashed #dee2e6;">
                            <i class="bi bi-qr-code fs-1 text-muted"></i>
                        </div>
                    </div>
                    <p class="mt-2 small text-muted mb-0">
                        Open your banking app and scan the QR code
                    </p>
                </div>
            </div>
        `;
        methodsContainer.insertAdjacentHTML('afterend', qrHTML);
    }

    async processPayment() {
    const amount = this.selectedPlan.price;

    // ADD THIS VALIDATION BLOCK
    console.log('🔍 Required data check:', {
        amount: amount,
        plan: this.selectedPlan,
        user: this.user,
        token: this.token ? 'Present' : 'Missing'
    });

    if (!this.selectedPlan || !this.selectedPlan.price) {
        this.showError('No valid subscription plan selected');
        return;
    }

    if (!this.user || !this.user.id) {
        this.showError('User not logged in');
        return;
    }

    if (!this.token) {
        this.showError('Authentication token missing');
        return;
    }
    
    if (!this.validatePaymentDetails()) {
        return;
    }

    try {
        this.showLoading(true);

        const paymentData = {
            amount: amount,
            provider: this.selectedProvider,
            method: this.selectedMethod,
            description: `ResLinQ ${this.selectedPlan.name} Annual Subscription`,
        };

        // DEBUG: Log the payment data
        console.log('🔍 Payment Data being sent:', paymentData);
        console.log('🔍 User Token:', this.token ? 'Present' : 'Missing');

        // Add card details if applicable
        if (this.selectedMethod.includes('card')) {
            paymentData.cardDetails = {
                number: document.getElementById('cardNumber').value.replace(/\s/g, ''),
                expiry: document.getElementById('cardExpiry').value,
                cvv: document.getElementById('cardCVV').value,
                name: document.getElementById('cardholderName').value
            };
        }

        console.log('Processing subscription payment:', paymentData);

        const response = await this.createPaymentIntent(paymentData);
            
            if (response.success) {
                this.showSuccess('Subscription activated successfully! Redirecting...');
                // Clear the selected plan from storage
                localStorage.removeItem('selectedSubscriptionPlan');
                
                setTimeout(() => {
                    this.redirectToPaymentGateway(response.paymentUrl);
                }, 2000);
            } else {
                this.showError('Payment failed: ' + (response.message || 'Please try again'));
            }

        } catch (error) {
            console.error('Payment processing error:', error);
            this.showError('Payment processing failed. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    validatePaymentDetails() {
        // Basic validation
        if (this.selectedMethod.includes('card')) {
            const cardNumber = document.getElementById('cardNumber').value;
            const cardExpiry = document.getElementById('cardExpiry').value;
            const cardCVV = document.getElementById('cardCVV').value;
            const cardName = document.getElementById('cardholderName').value;

            if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
                this.showError('Please enter a valid card number');
                return false;
            }

            if (!cardExpiry || !cardExpiry.match(/^\d{2}\/\d{2}$/)) {
                this.showError('Please enter a valid expiry date (MM/YY)');
                return false;
            }

            if (!cardCVV || cardCVV.length !== 3) {
                this.showError('Please enter a valid CVV');
                return false;
            }

            if (!cardName) {
                this.showError('Please enter cardholder name');
                return false;
            }
        }

        return true;
    }

    async createPaymentIntent(paymentData) {
    const API_BASE_URL = 'https://linqs-backend.onrender.com/api';
    
    try {
        // ADD DEBUGGING
        console.log('🔍 Sending payment data:', JSON.stringify(paymentData, null, 2));
        console.log('🔍 Token present:', !!this.token);
        
        const response = await fetch(`${API_BASE_URL}/payments/create-intent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify(paymentData)
        });

        console.log('🔍 Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('🔍 Error response:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('🔍 API call failed:', error);
        // Fallback to demo mode
        console.warn('API call failed, using demo mode:', error);
        return this.createDemoPaymentIntent(paymentData);
    }
}

    createDemoPaymentIntent(paymentData) {
        // Demo response - replace with actual payment gateway integration
        const demoPaymentUrls = {
            payfast: 'https://sandbox.payfast.co.za/eng/process',
            ozow: 'https://sandbox.ozow.com/'
        };

        return {
            success: true,
            paymentUrl: demoPaymentUrls[paymentData.provider],
            paymentId: 'demo_' + Date.now(),
            message: 'Demo payment intent created successfully'
        };
    }

    redirectToPaymentGateway(paymentUrl) {
        console.log(`Redirecting to ${this.selectedProvider}...`);
        // In production, this would redirect to the actual payment gateway
        // For demo, we'll show a success message instead
        this.showSuccess(`Redirecting to ${this.selectedProvider.toUpperCase()} secure payment page...`);
        
        // Simulate redirect after 2 seconds
        setTimeout(() => {
            alert(`DEMO: Would redirect to: ${paymentUrl}\n\nIn production, this would go to the actual payment gateway.`);
            // window.location.href = paymentUrl; // Uncomment for real redirect
        }, 2000);
    }

    showLoading(show) {
        const button = document.getElementById('processPayment');
        if (show) {
            button.innerHTML = '<div class="loading-spinner me-2"></div> Processing...';
            button.disabled = true;
        } else {
            button.innerHTML = '<i class="bi bi-lock-fill me-2"></i>Continue to Secure Payment';
            button.disabled = false;
        }
    }

    showError(message) {
        this.showNotification(message, 'danger');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type) {
        // Remove any existing notifications
        const existingAlert = document.querySelector('.payment-alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} payment-alert alert-dismissible fade show`;
        alertDiv.style.marginBottom = '1rem';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.querySelector('.payment-card').prepend(alertDiv);
        
        // Auto-remove success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                alertDiv.remove();
            }, 5000);
        }
    }
}

// Initialize payment manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const paymentManager = new ResLinQPaymentManager();
    
    // Make it globally available for debugging
    window.paymentManager = paymentManager;
});