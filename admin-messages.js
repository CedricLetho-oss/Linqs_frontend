// Admin Messages Management - UPDATED VERSION
class AdminMessagesManager {
    constructor() {
        this.token = localStorage.getItem("token");
        this.user = JSON.parse(localStorage.getItem("user") || "{}");
        this.API_BASE_URL = 'https://linqs-backend.onrender.com/api';
        this.currentPage = 1;
        this.limit = 20;
        this.filters = {};
        this.selectedMessage = null;
        this.conversations = [];
        this.init();
    }

    async init() {
        console.log('Admin Messages Manager initialized');
        this.checkAdminAccess();
        this.setupEventListeners();
        await this.loadMessageStats();
        await this.loadMessages();
        this.setupRealTimeUpdates();
    }

    checkAdminAccess() {
        if (this.user.role !== 'admin') {
            alert('Access denied. Admin privileges required.');
            window.location.href = 'index.html';
        }
    }

    setupEventListeners() {
        // Search functionality
        let searchTimeout;
        const searchInput = document.getElementById('searchConversations');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.filters.search = e.target.value;
                    this.currentPage = 1;
                    this.loadMessages();
                }, 500);
            });
        }

        // Send message on Enter key
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendReply();
                }
            });
        }

        // Send message button
        const sendBtn = document.getElementById('sendMessageBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendReply();
            });
        }

        // Add event listener for broadcast modal
        const broadcastModal = document.getElementById('broadcastModal');
        if (broadcastModal) {
            broadcastModal.addEventListener('shown.bs.modal', () => {
                this.initializeBroadcastModal();
            });
        }
    }

    async loadMessages() {
        try {
            console.log('Loading messages...');
            const response = await this.fetchMessages();
            
            if (response.success) {
                this.conversations = response.data.messages || response.data || [];
                this.updateMessagesList(this.conversations);
                this.updateNotificationBadges();
            } else {
                throw new Error(response.error || 'Failed to load messages');
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            this.showError('Failed to load messages: ' + error.message);
            this.updateMessagesList([]);
        }
    }

    async fetchMessages() {
        const params = new URLSearchParams({
            page: this.currentPage,
            limit: this.limit,
            ...this.filters
        });

        const response = await fetch(`${this.API_BASE_URL}/admin/messages?${params}`, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    async loadMessageStats() {
        try {
            console.log('Loading message stats...');
            const response = await fetch(`${this.API_BASE_URL}/admin/messages/stats`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateStats(data.data);
                } else {
                    throw new Error(data.error || 'Failed to load stats');
                }
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading message stats:', error);
            // Set default values if stats fail to load
            this.updateStats({
                totalMessages: 0,
                unreadMessages: 0,
                resolvedToday: 0,
                activeChats: 0
            });
        }
    }

    updateStats(stats) {
        const totalEl = document.getElementById('totalMessages');
        const unreadEl = document.getElementById('unreadMessages');
        const resolvedEl = document.getElementById('resolvedTickets');
        const activeEl = document.getElementById('activeChats');

        if (totalEl) totalEl.textContent = stats.totalMessages || 0;
        if (unreadEl) unreadEl.textContent = stats.unreadMessages || 0;
        if (resolvedEl) resolvedEl.textContent = stats.resolvedToday || 0;
        if (activeEl) activeEl.textContent = stats.activeChats || 0;
    }

    updateMessagesList(messages) {
        const conversationsList = document.getElementById('conversationsList');
        if (!conversationsList) return;
        
        if (!messages || messages.length === 0) {
            conversationsList.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                    No messages found
                </div>
            `;
            return;
        }

        conversationsList.innerHTML = messages.map(message => {
            const isUnread = message.status === 'new' || message.status === 'unread';
            const isActive = this.selectedMessage && this.selectedMessage._id === message._id;
            const unreadCount = message.unreadCount || (isUnread ? 1 : 0);
            
            // Get user info
            const userName = message.sender?.firstName && message.sender?.lastName ? 
                `${message.sender.firstName} ${message.sender.lastName}` : 
                message.name || 'Unknown User';
            const userInitial = userName.charAt(0).toUpperCase();
            const subject = message.subject || 'No subject';
            const preview = this.truncateMessage(message.message || 'No message content', 40);
            const time = this.formatTime(message.createdAt || message.timestamp);

            return `
                <div class="conversation-item ${isUnread ? 'unread' : ''} ${isActive ? 'active' : ''}" 
                     onclick="adminMessagesManager.selectMessage('${message._id}')">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="d-flex align-items-center">
                            <div class="rounded-circle me-3 d-flex align-items-center justify-content-center bg-primary text-white" 
                                 style="width: 40px; height: 40px;">
                                ${userInitial}
                            </div>
                            <div>
                                <h6 class="fw-bold mb-0">${userName}</h6>
                                <p class="text-muted mb-0 small">${subject}</p>
                                <small class="text-muted">${preview}</small>
                            </div>
                        </div>
                        <div class="text-end">
                            <small class="text-muted">${time}</small>
                            ${unreadCount > 0 ? `<span class="badge bg-primary ms-1">${unreadCount}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async selectMessage(messageId) {
        try {
            console.log('Selecting message:', messageId);
            const response = await fetch(`${this.API_BASE_URL}/admin/messages/${messageId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.selectedMessage = data.data;
                    this.displayMessage(this.selectedMessage);
                    this.enableMessageInput();
                    
                    // Mark as read if unread
                    if (this.selectedMessage.status === 'new' || this.selectedMessage.status === 'unread') {
                        await this.markAsRead(messageId);
                    }
                } else {
                    throw new Error(data.error || 'Failed to load message');
                }
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error selecting message:', error);
            this.showError('Failed to load message details');
        }
    }

    displayMessage(message) {
        if (!message) return;

        // Update chat header
        const chatHeader = document.getElementById('chatHeader');
        const userName = message.sender?.firstName && message.sender?.lastName ? 
            `${message.sender.firstName} ${message.sender.lastName}` : 
            message.name || 'Unknown User';
        const userEmail = message.sender?.email || message.email || 'No email';
        const userRole = message.sender?.role || 'User';
        const userInitial = userName.charAt(0).toUpperCase();

        chatHeader.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center">
                    <div class="rounded-circle me-3 d-flex align-items-center justify-content-center bg-primary text-white" 
                         style="width: 40px; height: 40px;">
                        ${userInitial}
                    </div>
                    <div>
                        <h6 class="fw-bold mb-0">${userName}</h6>
                        <small class="text-muted">${userEmail} • ${userRole} • ${this.formatTime(message.createdAt)}</small>
                    </div>
                </div>
                <div class="dropdown">
                    <button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                        <i class="bi bi-three-dots"></i>
                    </button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="#" onclick="adminMessagesManager.sendEmailReply('${message._id}')">
                            <i class="bi bi-envelope me-2"></i>Reply via Email
                        </a></li>
                        <li><a class="dropdown-item" href="mailto:${userEmail}?subject=Re: ${encodeURIComponent(message.subject || 'Your Message')}">
                            <i class="bi bi-envelope-open me-2"></i>Open Email Client
                        </a></li>
                        <li><a class="dropdown-item" href="#" onclick="adminMessagesManager.markAsResolved('${message._id}')">
                            <i class="bi bi-check-circle me-2"></i>Mark as Resolved
                        </a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="#" onclick="adminMessagesManager.archiveMessage('${message._id}')">
                            <i class="bi bi-archive me-2"></i>Archive
                        </a></li>
                    </ul>
                </div>
            </div>
        `;

        // Update messages container
        const messagesContainer = document.getElementById('messagesContainer');
        let messagesHTML = '';

        // Original message
        messagesHTML += `
            <div class="message received">
                <div class="message-bubble">
                    <strong>Subject:</strong> ${message.subject || 'No subject'}<br><br>
                    ${message.message || 'No message content'}
                    ${message.propertyId ? `<br><br><small><strong>Related Property:</strong> ${message.propertyId.title || 'Unknown Property'}</small>` : ''}
                </div>
                <div class="message-time">${this.formatTime(message.createdAt)}</div>
            </div>
        `;

        // Admin replies
        if (message.adminReplies && message.adminReplies.length > 0) {
            message.adminReplies.forEach(reply => {
                const isEmailReply = reply.sentViaEmail;
                messagesHTML += `
                    <div class="message sent">
                        <div class="message-bubble">
                            ${reply.message}
                            ${isEmailReply ? `<br><small class="text-info"><i class="bi bi-envelope me-1"></i>Sent via email</small>` : ''}
                        </div>
                        <div class="message-time">
                            ${this.formatTime(reply.createdAt)} 
                            by ${reply.admin?.firstName || 'Admin'}
                        </div>
                    </div>
                `;
            });
        }

        messagesContainer.innerHTML = messagesHTML;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    enableMessageInput() {
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendMessageBtn');
        if (messageInput) messageInput.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
    }

    disableMessageInput() {
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendMessageBtn');
        if (messageInput) messageInput.disabled = true;
        if (sendBtn) sendBtn.disabled = true;
    }

    async sendReply() {
        if (!this.selectedMessage) {
            this.showError('Please select a message first');
            return;
        }

        const messageInput = document.getElementById('messageInput');
        const replyMessage = messageInput?.value.trim();

        if (!replyMessage) {
            this.showError('Please enter a reply message');
            return;
        }

        // Ask user if they want to send via email
        const sendViaEmail = confirm('Send this reply via email to the user? Click OK for email, Cancel for internal reply only.');

        try {
            const response = await fetch(`${this.API_BASE_URL}/admin/messages/${this.selectedMessage._id}/reply`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    message: replyMessage,
                    sendEmail: sendViaEmail,
                    adminId: this.user._id 
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    if (messageInput) messageInput.value = '';
                    this.selectedMessage = data.data;
                    this.displayMessage(this.selectedMessage);
                    this.showSuccess(data.message || 'Reply sent successfully');
                    
                    // Reload messages list to update unread counts
                    await this.loadMessages();
                } else {
                    throw new Error(data.error || 'Failed to send reply');
                }
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error sending reply:', error);
            this.showError('Failed to send reply: ' + error.message);
        }
    }

    async sendEmailReply(messageId) {
        const replyMessage = prompt('Enter your email reply message:');
        if (!replyMessage || !replyMessage.trim()) {
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/admin/messages/${messageId}/send-email-reply`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    message: replyMessage.trim()
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.showSuccess('Email reply sent successfully');
                    this.selectedMessage = data.data;
                    this.displayMessage(this.selectedMessage);
                    await this.loadMessages();
                } else {
                    throw new Error(data.error || 'Failed to send email reply');
                }
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error sending email reply:', error);
            this.showError('Failed to send email reply: ' + error.message);
        }
    }

    async markAsRead(messageId) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/admin/messages/${messageId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'read' })
            });

            if (response.ok) {
                await this.loadMessageStats(); // Refresh stats
            }
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    }

    async markAsResolved(messageId) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/admin/messages/${messageId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'resolved' })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.showSuccess('Message marked as resolved');
                    await this.loadMessages();
                    await this.loadMessageStats();
                } else {
                    throw new Error(data.error || 'Failed to mark as resolved');
                }
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error marking as resolved:', error);
            this.showError('Failed to mark as resolved: ' + error.message);
        }
    }

    async archiveMessage(messageId) {
        if (!confirm('Are you sure you want to archive this message?')) return;

        try {
            const response = await fetch(`${this.API_BASE_URL}/admin/messages/${messageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.showSuccess('Message archived successfully');
                    this.selectedMessage = null;
                    this.clearChatArea();
                    await this.loadMessages();
                    await this.loadMessageStats();
                } else {
                    throw new Error(data.error || 'Failed to archive message');
                }
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error archiving message:', error);
            this.showError('Failed to archive message: ' + error.message);
        }
    }

    clearChatArea() {
        const messagesContainer = document.getElementById('messagesContainer');
        const chatHeader = document.getElementById('chatHeader');
        
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="text-center text-muted py-4">
                    <p>Select a conversation to start messaging</p>
                </div>
            `;
        }
        
        if (chatHeader) {
            chatHeader.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-chat-dots fs-1"></i>
                    <p class="mt-2">Select a message to view conversation</p>
                </div>
            `;
        }
        
        this.disableMessageInput();
    }

    useQuickReply(text) {
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.value = text;
            messageInput.focus();
        }
    }

    newBroadcast() {
        const modal = new bootstrap.Modal(document.getElementById('broadcastModal'));
        modal.show();
    }

    initializeBroadcastModal() {
        // Add subject field to broadcast modal if it doesn't exist
        const modalBody = document.querySelector('#broadcastModal .modal-body');
        if (modalBody && !document.getElementById('broadcastSubject')) {
            const subjectHtml = `
                <div class="mb-3">
                    <label for="broadcastSubject" class="form-label">Subject *</label>
                    <input type="text" class="form-control" id="broadcastSubject" required 
                           placeholder="Enter broadcast subject">
                </div>
            `;
            modalBody.insertAdjacentHTML('afterbegin', subjectHtml);
        }
    }

    async sendBroadcast() {
        const audience = document.getElementById('broadcastAudience')?.value;
        const subject = document.getElementById('broadcastSubject')?.value.trim();
        const message = document.getElementById('broadcastMessage')?.value.trim();

        if (!audience || !message || !subject) {
            this.showError('Please select audience, enter subject and message');
            return;
        }

        if (!confirm(`Are you sure you want to send this broadcast to all ${audience}? This will send emails to all ${audience} users.`)) {
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/admin/messages/broadcast`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    audience: audience,
                    message: message,
                    subject: subject,
                    adminId: this.user._id
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.showSuccess(data.message);
                    const modal = bootstrap.Modal.getInstance(document.getElementById('broadcastModal'));
                    modal.hide();
                    // Clear the form
                    const broadcastSubject = document.getElementById('broadcastSubject');
                    const broadcastMessage = document.getElementById('broadcastMessage');
                    if (broadcastSubject) broadcastSubject.value = '';
                    if (broadcastMessage) broadcastMessage.value = '';
                } else {
                    throw new Error(data.error || 'Failed to send broadcast');
                }
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error sending broadcast:', error);
            this.showError('Failed to send broadcast: ' + error.message);
        }
    }

    updateNotificationBadges() {
        const unreadCount = this.conversations.filter(conv => 
            conv.status === 'new' || conv.status === 'unread'
        ).length;

        // Update badges
        const messagesBadge = document.getElementById('messagesBadge');
        const headerBadge = document.getElementById('headerNotificationBadge');
        if (messagesBadge) messagesBadge.textContent = unreadCount;
        if (headerBadge) headerBadge.textContent = unreadCount;

        // Update notification dropdown
        const notificationList = document.getElementById('notificationList');
        if (notificationList) {
            if (unreadCount > 0) {
                notificationList.innerHTML = `
                    <a class="dropdown-item" href="#" onclick="adminMessagesManager.loadMessages()">
                        <i class="bi bi-chat-dots me-2"></i>${unreadCount} unread message${unreadCount > 1 ? 's' : ''}
                    </a>
                `;
            } else {
                notificationList.innerHTML = `
                    <a class="dropdown-item text-muted" href="#">
                        <i class="bi bi-check-circle me-2"></i>All messages read
                    </a>
                `;
            }
        }
    }

    truncateMessage(message, length = 50) {
        return message.length > length ? message.substring(0, length) + '...' : message;
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
        // Refresh messages every 30 seconds
        setInterval(() => {
            this.loadMessages();
            this.loadMessageStats();
        }, 30000);
    }

    // Notification methods
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'danger');
    }

    showNotification(message, type) {
        // Create toast container if it doesn't exist
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

// Initialize admin messages manager
let adminMessagesManager;

// Load messages on page load
document.addEventListener('DOMContentLoaded', function() {
    adminMessagesManager = new AdminMessagesManager();
    window.adminMessagesManager = adminMessagesManager;
});