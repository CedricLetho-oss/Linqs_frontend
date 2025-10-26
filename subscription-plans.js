// ResLinQ Subscription Plans Manager
class SubscriptionPlansManager {
    constructor() {
        this.token = localStorage.getItem("token");
        this.user = JSON.parse(localStorage.getItem("user") || "{}");
        this.init();
    }

    init() {
        console.log('Subscription Plans Manager initialized');
        this.setupEventListeners();
        this.checkUserRole();
    }

    checkUserRole() {
        if (this.user.role !== 'landlord') {
            alert('This page is for landlords only. Redirecting to homepage...');
            window.location.href = 'index.html';
            return;
        }
    }

    setupEventListeners() {
        // Plan selection buttons
        document.querySelectorAll('.btn-choose-plan').forEach(button => {
            button.addEventListener('click', (e) => {
                this.selectPlan(e.target);
            });
        });

        // Add click effects to plan cards
        document.querySelectorAll('.plan-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-choose-plan')) {
                    const button = card.querySelector('.btn-choose-plan');
                    if (button) {
                        this.selectPlan(button);
                    }
                }
            });
        });
    }

    selectPlan(button) {
        const plan = button.getAttribute('data-plan');
        const price = button.getAttribute('data-price');
        
        // Get plan details from the card
        const planCard = button.closest('.plan-card');
        const planName = planCard.querySelector('h3').textContent;
        const planDescription = planCard.querySelector('.price-period').textContent;
        
        // Get features
        const features = [];
        const featureItems = planCard.querySelectorAll('.feature-item span');
        featureItems.forEach(item => {
            features.push(item.textContent.trim());
        });

        const planDetails = {
            id: plan,
            name: planName,
            price: parseInt(price),
            description: planDescription,
            features: features,
            duration: 'year',
            type: 'subscription'
        };

        console.log('Selected plan:', planDetails);

        // Store plan details in localStorage for payment page
        localStorage.setItem('selectedSubscriptionPlan', JSON.stringify(planDetails));

        // Show confirmation modal
        this.showConfirmationModal(planDetails);
    }

    showConfirmationModal(planDetails) {
        // Create modal HTML
        const modalHTML = `
            <div class="modal fade" id="planConfirmationModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-0 shadow-lg">
                        <div class="modal-header border-0">
                            <h5 class="modal-title fw-bold text-primary">
                                <i class="bi bi-check-circle-fill me-2"></i>
                                Confirm Your Plan Selection
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="text-center mb-4">
                                <div class="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                                     style="width: 80px; height: 80px;">
                                    <i class="bi bi-building text-primary fs-2"></i>
                                </div>
                                <h4 class="fw-bold">${planDetails.name}</h4>
                                <div class="fs-3 fw-bold text-primary">R ${planDetails.price.toLocaleString()}</div>
                                <p class="text-muted">${planDetails.description}</p>
                            </div>
                            
                            <div class="bg-light rounded p-3 mb-3">
                                <h6 class="fw-bold mb-2">Plan Includes:</h6>
                                <div class="row">
                                    ${planDetails.features.slice(0, 4).map(feature => `
                                        <div class="col-6">
                                            <div class="d-flex align-items-center mb-1">
                                                <i class="bi bi-check text-success me-2"></i>
                                                <small>${feature}</small>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                                ${planDetails.features.length > 4 ? `
                                    <div class="text-center mt-2">
                                        <small class="text-muted">+ ${planDetails.features.length - 4} more features</small>
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div class="alert alert-info">
                                <small>
                                    <i class="bi bi-info-circle me-1"></i>
                                    This is an annual subscription. You'll be redirected to our secure payment page.
                                </small>
                            </div>
                        </div>
                        <div class="modal-footer border-0">
                            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                                Cancel
                            </button>
                            <button type="button" class="btn btn-primary" id="confirmPlanSelection">
                                <i class="bi bi-arrow-right me-2"></i>
                                Continue to Payment
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('planConfirmationModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('planConfirmationModal'));
        modal.show();

        // Add event listener to confirmation button
        document.getElementById('confirmPlanSelection').addEventListener('click', () => {
            this.proceedToPayment(planDetails);
        });

        // Clean up modal when hidden
        document.getElementById('planConfirmationModal').addEventListener('hidden.bs.modal', () => {
            document.getElementById('planConfirmationModal').remove();
        });
    }

    proceedToPayment(planDetails) {
        console.log('Proceeding to payment for plan:', planDetails);
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('planConfirmationModal'));
        modal.hide();

        // Redirect to payment page
        window.location.href = 'payment.html';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const plansManager = new SubscriptionPlansManager();
    window.plansManager = plansManager;
});