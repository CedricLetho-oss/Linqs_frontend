// Admin Payments Manager
class AdminPaymentsManager {
    constructor() {
        this.token = localStorage.getItem("token");
        this.user = JSON.parse(localStorage.getItem("user") || "{}");
        this.currentPage = 1;
        this.currentLimit = 10;
        this.filters = {
            status: 'all',
            provider: 'all',
            planType: 'all',
            startDate: '',
            endDate: '',
            search: ''
        };
        
        this.init();
    }

    init() {
        if (this.user.role !== 'admin') {
            alert('Access denied. Admins only.');
            window.location.href = '../index.html';
            return;
        }

        console.log('Admin Payments Manager initialized');
        this.setupEventListeners();
        this.loadPayments();
        this.loadStats();
    }

    setupEventListeners() {
        // Filter event listeners
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.currentPage = 1;
            this.loadPayments();
        });

        document.getElementById('providerFilter').addEventListener('change', (e) => {
            this.filters.provider = e.target.value;
            this.currentPage = 1;
            this.loadPayments();
        });

        document.getElementById('planTypeFilter').addEventListener('change', (e) => {
            this.filters.planType = e.target.value;
            this.currentPage = 1;
            this.loadPayments();
        });

        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.currentPage = 1;
            this.debounce(() => this.loadPayments(), 500);
        });

        document.getElementById('limitSelect').addEventListener('change', (e) => {
            this.currentLimit = parseInt(e.target.value);
            this.currentPage = 1;
            this.loadPayments();
        });

        document.getElementById('resetFilters').addEventListener('click', () => {
            this.resetFilters();
        });

        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadPayments();
            this.loadStats();
        });

        // Date range picker
        flatpickr("#dateRange", {
            mode: "range",
            dateFormat: "Y-m-d",
            onChange: (selectedDates) => {
                if (selectedDates.length === 2) {
                    this.filters.startDate = selectedDates[0].toISOString().split('T')[0];
                    this.filters.endDate = selectedDates[1].toISOString().split('T')[0];
                    this.currentPage = 1;
                    this.loadPayments();
                }
            }
        });

        // Status update modal
        document.getElementById('statusSelect').addEventListener('change', (e) => {
            const refundFields = document.getElementById('refundFields');
            refundFields.classList.toggle('d-none', e.target.value !== 'refunded');
        });

        document.getElementById('saveStatusBtn').addEventListener('click', () => {
            this.updatePaymentStatus();
        });

        // Stats modal
        document.getElementById('statsModal').addEventListener('show.bs.modal', () => {
            this.loadDetailedStats();
        });
    }

    async loadPayments() {
        this.showLoading(true);
        
        try {
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: this.currentLimit,
                ...this.filters
            });

            const response = await fetch(`/api/admin/payments?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.renderPayments(data.payments);
                this.renderPagination(data.pagination);
                this.updateStats(data.stats);
            } else {
                throw new Error(data.message);
            }

        } catch (error) {
            console.error('Error loading payments:', error);
            this.showError('Failed to load payments');
        } finally {
            this.showLoading(false);
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/admin/payments/stats/overview', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateOverviewStats(data.stats);
                }
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadDetailedStats() {
        try {
            const response = await fetch('/api/admin/payments/stats/overview?period=month', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.renderDetailedStats(data.stats);
                }
            }
        } catch (error) {
            console.error('Error loading detailed stats:', error);
        }
    }

    renderPayments(payments) {
        const tbody = document.getElementById('paymentsTableBody');
        const emptyState = document.getElementById('emptyState');
        
        if (payments.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('d-none');
            return;
        }

        emptyState.classList.add('d-none');
        
        tbody.innerHTML = payments.map(payment => `
            <tr>
                <td>
                    <div class="fw-medium">${payment.paymentIntentId}</div>
                    <small class="text-muted">${this.formatDate(payment.createdAt)}</small>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="user-avatar me-2">
                            ${this.getUserInitials(payment.userId)}
                        </div>
                        <div>
                            <div class="fw-medium">${payment.userId?.firstName} ${payment.userId?.lastName}</div>
                            <small class="text-muted">${payment.userId?.email}</small>
                        </div>
                    </div>
                </td>
                <td class="amount-cell">R ${payment.amount.toLocaleString()}</td>
                <td>
                    <span class="plan-badge">${payment.planType}</span>
                </td>
                <td>
                    <span class="text-capitalize">${payment.provider}</span>
                </td>
                <td>
                    <small class="text-capitalize">${payment.paymentMethod.replace('_', ' ')}</small>
                </td>
                <td>
                    <span class="payment-status status-${payment.status}">
                        ${payment.status}
                    </span>
                </td>
                <td>
                    <small>${this.formatDate(payment.createdAt)}</small>
                </td>
                <td>
                    <div class="dropdown action-dropdown">
                        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" 
                                type="button" data-bs-toggle="dropdown">
                            <i class="bi bi-three-dots"></i>
                        </button>
                        <ul class="dropdown-menu">
                            <li>
                                <a class="dropdown-item" href="#" onclick="adminPayments.viewPaymentDetails('${payment._id}')">
                                    <i class="bi bi-eye me-2"></i>View Details
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item" href="#" onclick="adminPayments.showUpdateStatusModal('${payment._id}')">
                                    <i class="bi bi-pencil me-2"></i>Update Status
                                </a>
                            </li>
                            ${payment.status === 'completed' ? `
                            <li>
                                <a class="dropdown-item text-warning" href="#" onclick="adminPayments.initiateRefund('${payment._id}')">
                                    <i class="bi bi-arrow-counterclockwise me-2"></i>Refund
                                </a>
                            </li>
                            ` : ''}
                        </ul>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderPagination(pagination) {
        const paginationElement = document.getElementById('pagination');
        const paginationInfo = document.getElementById('paginationInfo');
        
        if (!pagination || pagination.total === 0) {
            paginationElement.innerHTML = '';
            paginationInfo.textContent = 'Showing 0 of 0 payments';
            return;
        }

        const { current, pages, total } = pagination;
        const startItem = ((current - 1) * this.currentLimit) + 1;
        const endItem = Math.min(current * this.currentLimit, total);
        
        paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${total} payments`;

        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${current === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="adminPayments.goToPage(${current - 1})">
                    <i class="bi bi-chevron-left"></i>
                </a>
            </li>
        `;

        // Page numbers
        for (let i = 1; i <= pages; i++) {
            if (i === 1 || i === pages || (i >= current - 2 && i <= current + 2)) {
                paginationHTML += `
                    <li class="page-item ${i === current ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="adminPayments.goToPage(${i})">${i}</a>
                    </li>
                `;
            } else if (i === current - 3 || i === current + 3) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        // Next button
        paginationHTML += `
            <li class="page-item ${current === pages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="adminPayments.goToPage(${current + 1})">
                    <i class="bi bi-chevron-right"></i>
                </a>
            </li>
        `;

        paginationElement.innerHTML = paginationHTML;
    }

    updateOverviewStats(stats) {
        document.getElementById('totalRevenue').textContent = `R ${stats.totalRevenue.toLocaleString()}`;
        document.getElementById('totalTransactions').textContent = stats.totalTransactions.toLocaleString();
        document.getElementById('pendingCount').textContent = stats.statusCounts.pending || 0;
        document.getElementById('failedCount').textContent = stats.statusCounts.failed || 0;
    }

    renderDetailedStats(stats) {
        const content = document.getElementById('statsModalContent');
        
        content.innerHTML = `
            <div class="col-md-6 mb-4">
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0">Revenue by Plan Type</h6>
                    </div>
                    <div class="card-body">
                        ${Object.entries(stats.byPlanType).map(([planType, data]) => `
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="text-capitalize">${planType}</span>
                                <div>
                                    <strong>R ${data.revenue.toLocaleString()}</strong>
                                    <small class="text-muted ms-2">(${data.count} payments)</small>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="col-md-6 mb-4">
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0">Payment Status Distribution</h6>
                    </div>
                    <div class="card-body">
                        ${Object.entries(stats.statusCounts).map(([status, count]) => `
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="text-capitalize">${status}</span>
                                <strong>${count}</strong>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0">Recent Payments</h6>
                    </div>
                    <div class="card-body">
                        ${stats.recentPayments.map(payment => `
                            <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                                <div>
                                    <div class="fw-medium">${payment.userId?.firstName} ${payment.userId?.lastName}</div>
                                    <small class="text-muted">${payment.paymentIntentId}</small>
                                </div>
                                <div class="text-end">
                                    <div class="fw-bold text-success">R ${payment.amount.toLocaleString()}</div>
                                    <small class="text-muted">${this.formatDate(payment.createdAt)}</small>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    async viewPaymentDetails(paymentId) {
        try {
            const response = await fetch(`/api/admin/payments/${paymentId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.showPaymentDetails(data.payment);
                }
            }
        } catch (error) {
            console.error('Error loading payment details:', error);
            this.showError('Failed to load payment details');
        }
    }

    showPaymentDetails(payment) {
        const content = document.getElementById('paymentDetailsContent');
        
        content.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Payment Information</h6>
                    <dl class="row">
                        <dt class="col-sm-4">Payment ID:</dt>
                        <dd class="col-sm-8">${payment.paymentIntentId}</dd>
                        
                        <dt class="col-sm-4">Amount:</dt>
                        <dd class="col-sm-8 fw-bold text-success">R ${payment.amount.toLocaleString()}</dd>
                        
                        <dt class="col-sm-4">Status:</dt>
                        <dd class="col-sm-8">
                            <span class="payment-status status-${payment.status}">
                                ${payment.status}
                            </span>
                        </dd>
                        
                        <dt class="col-sm-4">Provider:</dt>
                        <dd class="col-sm-8 text-capitalize">${payment.provider}</dd>
                        
                        <dt class="col-sm-4">Method:</dt>
                        <dd class="col-sm-8 text-capitalize">${payment.paymentMethod.replace('_', ' ')}</dd>
                    </dl>
                </div>
                <div class="col-md-6">
                    <h6>User Information</h6>
                    <dl class="row">
                        <dt class="col-sm-4">Name:</dt>
                        <dd class="col-sm-8">${payment.userId?.firstName} ${payment.userId?.lastName}</dd>
                        
                        <dt class="col-sm-4">Email:</dt>
                        <dd class="col-sm-8">${payment.userId?.email}</dd>
                        
                        <dt class="col-sm-4">Phone:</dt>
                        <dd class="col-sm-8">${payment.userId?.phone || 'N/A'}</dd>
                        
                        <dt class="col-sm-4">Role:</dt>
                        <dd class="col-sm-8 text-capitalize">${payment.userId?.role}</dd>
                    </dl>
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-12">
                    <h6>Additional Details</h6>
                    <dl class="row">
                        <dt class="col-sm-3">Plan Type:</dt>
                        <dd class="col-sm-9">
                            <span class="plan-badge">${payment.planType}</span>
                        </dd>
                        
                        <dt class="col-sm-3">Description:</dt>
                        <dd class="col-sm-9">${payment.description}</dd>
                        
                        <dt class="col-sm-3">Created:</dt>
                        <dd class="col-sm-9">${this.formatDate(payment.createdAt)}</dd>
                        
                        <dt class="col-sm-3">Last Updated:</dt>
                        <dd class="col-sm-9">${this.formatDate(payment.updatedAt)}</dd>
                    </dl>
                </div>
            </div>
            ${payment.refundAmount ? `
            <div class="row mt-3">
                <div class="col-12">
                    <h6 class="text-warning">Refund Information</h6>
                    <dl class="row">
                        <dt class="col-sm-3">Refund Amount:</dt>
                        <dd class="col-sm-9">R ${payment.refundAmount.toLocaleString()}</dd>
                        
                        <dt class="col-sm-3">Refund Reason:</dt>
                        <dd class="col-sm-9">${payment.refundReason || 'N/A'}</dd>
                        
                        <dt class="col-sm-3">Refunded At:</dt>
                        <dd class="col-sm-9">${this.formatDate(payment.refundedAt)}</dd>
                    </dl>
                </div>
            </div>
            ` : ''}
        `;

        new bootstrap.Modal(document.getElementById('paymentDetailsModal')).show();
    }

    showUpdateStatusModal(paymentId) {
        document.getElementById('paymentId').value = paymentId;
        document.getElementById('statusSelect').value = '';
        document.getElementById('refundFields').classList.add('d-none');
        document.getElementById('refundAmount').value = '';
        document.getElementById('refundReason').value = '';
        
        new bootstrap.Modal(document.getElementById('updateStatusModal')).show();
    }

    async updatePaymentStatus() {
        const paymentId = document.getElementById('paymentId').value;
        const status = document.getElementById('statusSelect').value;
        const refundAmount = document.getElementById('refundAmount').value;
        const refundReason = document.getElementById('refundReason').value;

        try {
            const updateData = { status };
            if (status === 'refunded') {
                updateData.refundAmount = parseFloat(refundAmount);
                updateData.refundReason = refundReason;
            }

            const response = await fetch(`/api/admin/payments/${paymentId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.showSuccess('Payment status updated successfully');
                    bootstrap.Modal.getInstance(document.getElementById('updateStatusModal')).hide();
                    this.loadPayments();
                    this.loadStats();
                } else {
                    throw new Error(data.message);
                }
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Error updating payment status:', error);
            this.showError('Failed to update payment status');
        }
    }

    initiateRefund(paymentId) {
        document.getElementById('paymentId').value = paymentId;
        document.getElementById('statusSelect').value = 'refunded';
        document.getElementById('refundFields').classList.remove('d-none');
        
        new bootstrap.Modal(document.getElementById('updateStatusModal')).show();
    }

    goToPage(page) {
        this.currentPage = page;
        this.loadPayments();
    }

    resetFilters() {
        this.filters = {
            status: 'all',
            provider: 'all',
            planType: 'all',
            startDate: '',
            endDate: '',
            search: ''
        };
        
        document.getElementById('statusFilter').value = 'all';
        document.getElementById('providerFilter').value = 'all';
        document.getElementById('planTypeFilter').value = 'all';
        document.getElementById('searchInput').value = '';
        document.getElementById('dateRange').value = '';
        document.getElementById('limitSelect').value = '10';
        
        this.currentPage = 1;
        this.currentLimit = 10;
        this.loadPayments();
    }

    showLoading(show) {
        const loadingState = document.getElementById('loadingState');
        const tableBody = document.getElementById('paymentsTableBody');
        
        if (show) {
            loadingState.classList.remove('d-none');
            tableBody.innerHTML = '';
        } else {
            loadingState.classList.add('d-none');
        }
    }

    showError(message) {
        this.showNotification(message, 'danger');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type) {
        // Remove existing notifications
        const existingAlert = document.querySelector('.payment-alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} payment-alert alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 1060; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    // Utility methods
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-ZA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getUserInitials(user) {
        if (!user) return '??';
        return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || '??';
    }

    debounce(func, wait) {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(func, wait);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.adminPayments = new AdminPaymentsManager();
});