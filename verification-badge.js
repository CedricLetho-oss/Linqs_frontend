// verification-badge.js - Display verification status to landlords
class VerificationBadge {
    static displayBadge(booking, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const isVerified = booking.safetyFlags?.isVerified || 
                          booking.studentVerificationStatus === 'verified';
        const verificationType = booking.verificationLevel || 
                               booking.safetyFlags?.verificationType || 'none';

        if (isVerified) {
            const badgeText = this.getVerificationText(verificationType);
            container.innerHTML = `
                <div class="alert alert-success">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-patch-check-fill me-2 fs-5"></i>
                        <div>
                            <strong class="d-block">${badgeText}</strong>
                            <small class="text-muted">
                                <i class="bi bi-shield-check me-1"></i>
                                Identity verified - Safe to proceed
                            </small>
                        </div>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="alert alert-warning">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-exclamation-triangle me-2 fs-5"></i>
                        <div>
                            <strong class="d-block">Unverified User</strong>
                            <small class="text-muted">
                                <i class="bi bi-shield-exclamation me-1"></i>
                                Exercise caution - User not identity verified
                            </small>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    static getVerificationText(type) {
        switch(type) {
            case 'student': return 'Verified Student';
            case 'tenant': return 'Verified Tenant'; 
            case 'landlord': return 'Verified Landlord';
            default: return 'Verified User';
        }
    }

    static displayCompactBadge(booking, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const isVerified = booking.safetyFlags?.isVerified || 
                          booking.studentVerificationStatus === 'verified';
        const verificationType = booking.verificationLevel || 'none';

        if (isVerified) {
            const badgeText = this.getVerificationText(verificationType);
            container.innerHTML = `
                <span class="badge bg-success">
                    <i class="bi bi-patch-check-fill me-1"></i>
                    ${badgeText}
                </span>
            `;
        } else {
            container.innerHTML = `
                <span class="badge bg-warning text-dark">
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    Unverified
                </span>
            `;
        }
    }
}