/**
 * FalcoDigi Works CRM - Main Application Logic (Firebase Version)
 */

// ========== VALID USERS ==========
const VALID_USERS = {
    'ayaan_fdw123': '123456',
    'rahil_fdw123': '123456'
};

// ========== DOM ELEMENTS ==========
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const welcomeText = document.getElementById('welcome-text');
const currentDateEl = document.getElementById('current-date');
const navLinks = document.querySelectorAll('.nav-link');
const viewSections = document.querySelectorAll('.view-section');
const addClientForm = document.getElementById('add-client-form');
const saveClientBtn = document.getElementById('save-client-btn');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.querySelector('.sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const clientSearchInput = document.getElementById('client-search');

// Tables
const allClientsTableBody = document.querySelector('#all-clients-table tbody');
const recentClientsTableBody = document.querySelector('#recent-clients-table tbody');

// Loaders
const clientsLoader = document.getElementById('clients-loader');
const overviewLoader = document.getElementById('overview-loader');

// Modal
const notesModal = document.getElementById('notes-modal');
const notesModalBody = document.getElementById('notes-modal-body');
const closeModalBtn = document.getElementById('close-modal-btn');
const notesModalTitle = document.getElementById('notes-modal-title');

// Payment Modal
const paymentModal = document.getElementById('payment-modal');
const closePaymentModalBtn = document.getElementById('close-payment-modal-btn');
const paymentScreenshotInput = document.getElementById('payment-screenshot');
const confirmPaymentBtn = document.getElementById('confirm-payment-btn');

// Screenshot Modal
const screenshotModal = document.getElementById('screenshot-modal');
const closeScreenshotModalBtn = document.getElementById('close-screenshot-modal-btn');
const screenshotViewerImg = document.getElementById('screenshot-viewer-img');

// Confirm Modal
const confirmModal = document.getElementById('confirm-modal');
const confirmModalCancel = document.getElementById('confirm-modal-cancel');
const confirmModalOk = document.getElementById('confirm-modal-ok');

// Metrics
const metricTotal = document.getElementById('metric-total');
const metricPending = document.getElementById('metric-pending');
const metricOngoing = document.getElementById('metric-ongoing');

// State
let confirmCallback = null;
let pendingPaymentClientId = null;
let pendingPaymentType = null;
let currentScreenshotBase64 = null;

// ========== INITIALIZATION ==========
function init() {
    // Check if user is logged in
    const sessionUser = sessionStorage.getItem('fdw_user');
    if (sessionUser) {
        window.firebaseAPI.setCurrentUser(sessionUser);
        showDashboard();
    } else {
        showLogin();
    }

    // Set current date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateEl.textContent = new Date().toLocaleDateString('en-US', options);

    // Setup event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Login
    loginForm.addEventListener('submit', handleLogin);
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);

    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const target = e.currentTarget.getAttribute('data-target');
            if (!target) return;
            
            e.preventDefault();
            
            navLinks.forEach(l => l.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            viewSections.forEach(sec => sec.classList.remove('active'));
            document.getElementById(target).classList.add('active');

            if (window.innerWidth <= 768) {
                sidebar.classList.remove('mobile-open');
                if(sidebarOverlay) sidebarOverlay.classList.remove('active');
            }
        });
    });

    // Mobile Menu
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.add('mobile-open');
            sidebarOverlay.classList.add('active');
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            sidebarOverlay.classList.remove('active');
        });
    }

    // Client Search
    if (clientSearchInput) {
        clientSearchInput.addEventListener('input', (e) => {
            renderClientsTable(e.target.value.trim().toLowerCase());
        });
    }

    // Add Client Form
    addClientForm.addEventListener('submit', handleAddClient);

    // Notes Modal
    closeModalBtn.addEventListener('click', () => {
        notesModal.classList.remove('active');
    });

    notesModal.addEventListener('click', (e) => {
        if (e.target === notesModal) {
            notesModal.classList.remove('active');
        }
    });

    // Payment Modal
    closePaymentModalBtn.addEventListener('click', closePaymentModal);
    paymentModal.addEventListener('click', (e) => {
        if (e.target === paymentModal) closePaymentModal();
    });

    paymentScreenshotInput.addEventListener('change', () => {
        if (paymentScreenshotInput.files && paymentScreenshotInput.files[0]) {
            confirmPaymentBtn.disabled = false;
        } else {
            confirmPaymentBtn.disabled = true;
        }
    });

    confirmPaymentBtn.addEventListener('click', processPaymentScreenshot);

    // Screenshot Modal
    closeScreenshotModalBtn.addEventListener('click', () => {
        screenshotModal.classList.remove('active');
    });

    screenshotModal.addEventListener('click', (e) => {
        if (e.target === screenshotModal) screenshotModal.classList.remove('active');
    });

    // Confirm Modal
    confirmModalCancel.addEventListener('click', () => {
        confirmModal.classList.remove('active');
        confirmCallback = null;
    });

    confirmModalOk.addEventListener('click', () => {
        confirmModal.classList.remove('active');
        if (confirmCallback) {
            confirmCallback();
            confirmCallback = null;
        }
    });
}

// ========== AUTHENTICATION ==========
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        loginError.textContent = 'Please enter username and password.';
        return;
    }

    loginForm.style.pointerEvents = 'none';
    loginError.textContent = 'Signing in...';

    try {
        // Validate against local users
        if (VALID_USERS[username] && VALID_USERS[username] === password) {
            // Success - store session
            sessionStorage.setItem('fdw_user', username);
            sessionStorage.setItem('fdw_user_name', username.split('_')[0]);
            
            loginError.textContent = '';
            loginForm.reset();
            showDashboard();
        } else {
            loginError.textContent = 'Invalid username or password.';
        }
    } catch (error) {
        loginError.textContent = 'Login failed. Please try again.';
        console.error('Login error:', error);
    } finally {
        loginForm.style.pointerEvents = 'auto';
    }
}

async function handleLogout() {
    try {
        await window.firebaseAPI.logout();
        showLogin();
    } catch (error) {
        console.error('Logout error:', error);
        alert('Logout failed. Please try again.');
    }
}

function showLogin() {
    dashboardView.classList.add('hidden');
    loginView.classList.remove('hidden');
}

function showDashboard() {
    loginView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    
    const userName = sessionStorage.getItem('fdw_user_name') || 'User';
    const capitalizedName = userName.charAt(0).toUpperCase() + userName.slice(1);
    welcomeText.textContent = `Welcome, ${capitalizedName}`;
}

// ========== CLIENT OPERATIONS ==========
async function handleAddClient(e) {
    e.preventDefault();
    
    const clientData = {
        name: document.getElementById('client-name').value.trim(),
        phone: document.getElementById('client-phone').value.trim(),
        status: document.getElementById('client-status').value,
        followup: document.getElementById('client-followup').value,
        priority: document.getElementById('client-priority').value,
        notes: document.getElementById('client-notes').value.trim(),
        paymentStatus: '',
        paymentScreenshot: ''
    };

    // Validate
    if (!clientData.name || !clientData.phone || !clientData.status || !clientData.followup) {
        alert('Please fill in all required fields.');
        return;
    }

    saveClientBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveClientBtn.disabled = true;

    try {
        await window.firebaseAPI.addClient(clientData);
        
        // Clear form and show feedback
        addClientForm.reset();
        
        // Navigate to clients view
        document.querySelector('[data-target="clients"]').click();
        
        // Show success message
        showNotification('Client added successfully!', 'success');
    } catch (error) {
        console.error('Error adding client:', error);
        alert('Failed to add client. Please try again.');
        loginError.textContent = 'Error: ' + error.message;
    } finally {
        saveClientBtn.innerHTML = '<i class="fas fa-save"></i> Save Client';
        saveClientBtn.disabled = false;
    }
}

async function updateClientFieldFirebase(id, field, value) {
    try {
        await window.firebaseAPI.updateClient(id, { [field]: value });
        // UI will update automatically via real-time listener
    } catch (error) {
        console.error('Error updating client:', error);
        alert('Failed to update client. Please try again.');
    }
}

async function deleteClientConfirmed(id) {
    try {
        await window.firebaseAPI.deleteClient(id);
        // UI will update automatically via real-time listener
    } catch (error) {
        console.error('Error deleting client:', error);
        alert('Failed to delete client. Please try again.');
    }
}

function showConfirmDialog(message, callback) {
    document.getElementById('confirm-modal-message').textContent = message;
    confirmCallback = callback;
    confirmModal.classList.add('active');
}

// ========== PAYMENT HANDLING ==========
function openPaymentModal(id, type) {
    pendingPaymentClientId = id;
    pendingPaymentType = type;
    paymentScreenshotInput.value = '';
    confirmPaymentBtn.disabled = true;
    document.getElementById('payment-modal-title').textContent = type === 'Paid' ? 'Confirm Payment Done' : 'Confirm Advance Paid';
    paymentModal.classList.add('active');
}

function closePaymentModal() {
    paymentModal.classList.remove('active');
    pendingPaymentClientId = null;
    pendingPaymentType = null;
    currentScreenshotBase64 = null;
}

function processPaymentScreenshot() {
    const file = paymentScreenshotInput.files[0];
    if (!file) return;

    confirmPaymentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    confirmPaymentBtn.disabled = true;

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            // Resize via Canvas
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 600;
            const MAX_HEIGHT = 600;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            const base64String = canvas.toDataURL('image/jpeg', 0.6);
            submitPaymentData(base64String);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

async function submitPaymentData(base64String) {
    try {
        await window.firebaseAPI.updateClient(pendingPaymentClientId, {
            paymentStatus: pendingPaymentType,
            paymentScreenshot: base64String
        });
        
        confirmPaymentBtn.innerHTML = 'Confirm Payment';
        closePaymentModal();
        showNotification('Payment recorded successfully!', 'success');
    } catch (error) {
        console.error('Error saving payment:', error);
        alert('Failed to save payment. Please try again.');
    } finally {
        confirmPaymentBtn.innerHTML = 'Confirm Payment';
        confirmPaymentBtn.disabled = false;
    }
}

function viewScreenshot(base64Data) {
    screenshotViewerImg.src = base64Data;
    screenshotModal.classList.add('active');
}

function deleteClient(id) {
    showConfirmDialog(
        'Are you sure you want to delete this client? This action cannot be undone.',
        () => deleteClientConfirmed(id)
    );
}

// ========== RENDERING ==========
function renderDashboard() {
    renderClientsTable();
    renderOverview();
}

function getFollowupStatusInfo(dateString) {
    if (!dateString) return { class: 'badge-neutral', text: 'No Date' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const followupDate = new Date(dateString);
    followupDate.setHours(0, 0, 0, 0);

    const diffTime = followupDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { class: 'badge-overdue', text: `Overdue` };
    } else if (diffDays === 0) {
        return { class: 'badge-today', text: `Today` };
    } else {
        return { class: 'badge-upcoming', text: `In ${diffDays} days` };
    }
}

function formatDateDisplay(dateString) {
    if(!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function viewNotes(id) {
    const client = window.firebaseAPI.getClientById(id);
    if (client) {
        notesModalTitle.textContent = `Notes: ${client.name}`;
        notesModalBody.textContent = client.notes || 'No notes added for this client.';
        notesModal.classList.add('active');
    }
}

function renderClientsTable(searchQuery = '') {
    const clients = window.firebaseAPI.getClients();
    allClientsTableBody.innerHTML = '';
    
    let filteredClients = clients;
    if (searchQuery) {
        filteredClients = clients.filter(c => 
            c.name.toLowerCase().includes(searchQuery) || 
            c.phone.includes(searchQuery)
        );
    }
    
    if (filteredClients.length === 0) {
        if (searchQuery) {
            allClientsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No clients match your search.</td></tr>';
        } else {
            allClientsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No clients found. Add a client to get started.</td></tr>';
        }
        return;
    }

    filteredClients.forEach(client => {
        const tr = document.createElement('tr');
        
        const fStatus = getFollowupStatusInfo(client.followup);
        
        let paymentBadge = '';
        if (client.paymentStatus === 'Paid') {
            paymentBadge = `<div style="margin-top: 4px; display: flex; align-items: center; gap: 8px;">
                                <span class="badge badge-paid">Payment Done</span>
                                ${client.paymentScreenshot ? `<button class="btn-icon" style="width: 24px; height: 24px; font-size: 0.7rem;" title="View Receipt" onclick="viewScreenshot('${client.paymentScreenshot}')"><i class="fas fa-eye"></i></button>` : ''}
                            </div>`;
        } else if (client.paymentStatus === 'Advance') {
            paymentBadge = `<div style="margin-top: 4px; display: flex; align-items: center; gap: 8px;">
                                <span class="badge badge-advance">Advance Paid</span>
                                ${client.paymentScreenshot ? `<button class="btn-icon" style="width: 24px; height: 24px; font-size: 0.7rem;" title="View Receipt" onclick="viewScreenshot('${client.paymentScreenshot}')"><i class="fas fa-eye"></i></button>` : ''}
                            </div>`;
        }

        tr.innerHTML = `
            <td>
                <div class="client-name">${escapeHtml(client.name)}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">Added by ${escapeHtml(client.createdBy || 'Unknown')}</div>
            </td>
            <td>${escapeHtml(client.phone)}</td>
            <td>
                <span class="badge badge-neutral">${escapeHtml(client.status)}</span>
                ${paymentBadge}
            </td>
            <td>${escapeHtml(client.priority || 'Medium')}</td>
            <td>
                <div style="margin-bottom: 4px;">${formatDateDisplay(client.followup)}</div>
                <span class="badge ${fStatus.class}">${fStatus.text}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" title="View Notes" onclick="viewNotes('${client._id}')">
                        <i class="fas fa-sticky-note"></i>
                    </button>
                    <button class="btn-icon" title="Payment Done" style="color: #1890ff; border-color: #1890ff;" onclick="openPaymentModal('${client._id}', 'Paid')">
                        <i class="fas fa-check-double"></i>
                    </button>
                    <button class="btn-icon" title="Advance Paid" style="color: #eb2f96; border-color: #eb2f96;" onclick="openPaymentModal('${client._id}', 'Advance')">
                        <i class="fas fa-hand-holding-usd"></i>
                    </button>
                    <button class="btn-icon btn-success" title="Follow Up Completed" onclick="updateClientFieldFirebase('${client._id}', 'followup', '')">
                        <i class="fas fa-calendar-check"></i>
                    </button>
                    <button class="btn-icon btn-danger" title="Delete Client" onclick="deleteClient('${client._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        allClientsTableBody.appendChild(tr);
    });
}

function renderOverview() {
    const clients = window.firebaseAPI.getClients();
    
    // Total Clients
    metricTotal.textContent = clients.length;

    // Ongoing Work
    const ongoing = clients.filter(c => c.status === 'Ongoing').length;
    metricOngoing.textContent = ongoing;

    // Pending Follow-ups
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let pendingCount = 0;
    clients.forEach(client => {
        if (client.followup && client.status !== 'Completed' && client.status !== 'Lost') {
            const fDate = new Date(client.followup);
            fDate.setHours(0,0,0,0);
            if (fDate.getTime() <= today.getTime()) {
                pendingCount++;
            }
        }
    });
    metricPending.textContent = pendingCount;

    // Recent Clients Table
    recentClientsTableBody.innerHTML = '';
    const recentClients = clients.slice(0, 5);
    
    if (recentClients.length === 0) {
        recentClientsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">No recent activity</td></tr>';
        return;
    }

    recentClients.forEach(client => {
        const tr = document.createElement('tr');
        const fStatus = getFollowupStatusInfo(client.followup);
        
        tr.innerHTML = `
            <td><span class="client-name">${escapeHtml(client.name)}</span></td>
            <td>${escapeHtml(client.phone)}</td>
            <td><span class="badge badge-neutral">${escapeHtml(client.status)}</span></td>
            <td><span class="badge ${fStatus.class}">${fStatus.text}</span></td>
        `;
        recentClientsTableBody.appendChild(tr);
    });
}

function showNotification(message, type = 'info') {
    // Simple notification (you can enhance this with a toast library if needed)
    console.log(`[${type.toUpperCase()}] ${message}`);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== START APP ==========
// Wait for Firebase to be ready before initializing
let firebaseReady = false;
let initTimer = setInterval(() => {
    if (typeof window.firebaseAPI !== 'undefined') {
        clearInterval(initTimer);
        firebaseReady = true;
        init();
        console.log('✅ App initialized with Firebase');
    }
}, 100);

// Fallback: init after 3 seconds anyway
setTimeout(() => {
    if (!firebaseReady) {
        console.warn('⚠️ Firebase took too long, initializing without it');
        init();
    }
}, 3000);

// Export functions to global scope for inline event handlers
window.deleteClient = deleteClient;
window.updateClientFieldFirebase = updateClientFieldFirebase;
window.openPaymentModal = openPaymentModal;
window.viewScreenshot = viewScreenshot;
window.viewNotes = viewNotes;
