/**
 * FalcoDigi Works CRM - Application Logic
 */

// --- Configuration ---
// Valid Users
const USERS = {
    'ayaan_fdw123': '123456',
    'rahil_fdw123': '123456'
};

// API Endpoint (CrudCrud - Free Shared DB for testing)
// Using the endpoint provisioned during planning
const API_URL = 'https://crudcrud.com/api/99c7fcd8ae1e4425a8570cbe6054ec50/clients';

// Google Sheets Web App URL (User will replace this)
const GOOGLE_SHEETS_WEBHOOK = 'https://script.google.com/macros/s/AKfycbyg6CVogAaWTHgQFRaoFwHBKQPeWE46EWsmP4bRFrUd9bdBFB7wNhlLenc-05GDe9GrSA/exec';

// Local cache key
const LOCAL_STORAGE_KEY = 'fdw_clients_cache';

// State
let clientsData = [];
let currentUser = null;

// --- DOM Elements ---
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

// Screenshot Viewer Modal
const screenshotModal = document.getElementById('screenshot-modal');
const closeScreenshotModalBtn = document.getElementById('close-screenshot-modal-btn');
const screenshotViewerImg = document.getElementById('screenshot-viewer-img');

// Confirm Modal
const confirmModal = document.getElementById('confirm-modal');
const confirmModalCancel = document.getElementById('confirm-modal-cancel');
const confirmModalOk = document.getElementById('confirm-modal-ok');
let confirmCallback = null;

let pendingPaymentClientId = null;
let pendingPaymentType = null;
let currentScreenshotBase64 = null;

// Metrics
const metricTotal = document.getElementById('metric-total');
const metricPending = document.getElementById('metric-pending');
const metricOngoing = document.getElementById('metric-ongoing');

// --- Initialization ---
function init() {
    // Check if logged in
    const sessionUser = sessionStorage.getItem('fdw_user');
    if (sessionUser) {
        currentUser = sessionUser;
        showDashboard();
    } else {
        showLogin();
    }

    // Set Date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateEl.textContent = new Date().toLocaleDateString('en-US', options);

    // Event Listeners
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
            if (!target) return; // Allow normal links (like Backup) to work
            
            e.preventDefault();
            
            // Update active link
            navLinks.forEach(l => l.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            // Update view
            viewSections.forEach(sec => sec.classList.remove('active'));
            document.getElementById(target).classList.add('active');

            // Close mobile sidebar if open
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('mobile-open');
                if(sidebarOverlay) sidebarOverlay.classList.remove('active');
            }

            // Refresh data if going to a data view
            if(target === 'clients' || target === 'overview') {
                fetchClients();
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

    // Add Client
    addClientForm.addEventListener('submit', handleAddClient);

    // Modal
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

function showConfirmDialog(message, callback) {
    document.getElementById('confirm-modal-message').textContent = message;
    confirmCallback = callback;
    confirmModal.classList.add('active');
}

// --- Authentication ---
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (USERS[username] && USERS[username] === password) {
        // Success
        sessionStorage.setItem('fdw_user', username);
        currentUser = username;
        loginError.textContent = '';
        loginForm.reset();
        showDashboard();
    } else {
        // Error
        loginError.textContent = 'Invalid username or password.';
    }
}

function handleLogout() {
    sessionStorage.removeItem('fdw_user');
    currentUser = null;
    showLogin();
}

function showLogin() {
    dashboardView.classList.add('hidden');
    loginView.classList.remove('hidden');
}

function showDashboard() {
    loginView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    
    // Format username (e.g. ayaan_fdw123 -> Ayaan)
    const displayName = currentUser.split('_')[0];
    const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    welcomeText.textContent = `Welcome, ${capitalizedName}`;
    
    // Initial data fetch
    fetchClients();
}

// --- API Operations ---
async function fetchClients() {
    showLoaders(true);
    try {
        const response = await fetch(API_URL, { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        clientsData = data.reverse(); // Newest first
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clientsData));
        renderDashboard();
    } catch (error) {
        console.error('API Error fetching clients, falling back to local storage:', error);
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached) {
            clientsData = JSON.parse(cached);
        } else {
            clientsData = [];
        }
        renderDashboard();
    } finally {
        showLoaders(false);
    }
}

async function backupToGoogleSheets(action, clientData) {
    if (GOOGLE_SHEETS_WEBHOOK === 'YOUR_GOOGLE_SHEETS_WEBAPP_URL_HERE') {
        console.warn('Google Sheets Webhook URL not set. Skipping backup.');
        return;
    }
    
    try {
        // Send data to Google Sheets without blocking UI
        fetch(GOOGLE_SHEETS_WEBHOOK, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: action,
                timestamp: new Date().toISOString(),
                client: clientData
            })
        });
    } catch (e) {
        console.error('Failed to backup to Google Sheets', e);
    }
}

async function handleAddClient(e) {
    e.preventDefault();
    
    const clientData = {
        name: document.getElementById('client-name').value.trim(),
        phone: document.getElementById('client-phone').value.trim(),
        status: document.getElementById('client-status').value,
        followup: document.getElementById('client-followup').value,
        priority: document.getElementById('client-priority').value,
        notes: document.getElementById('client-notes').value.trim(),
        createdAt: new Date().toISOString(),
        createdBy: currentUser
    };

    saveClientBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveClientBtn.disabled = true;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(clientData)
        });

        if (!response.ok) throw new Error('Failed to save client');
        
        // Success
        const responseData = await response.json();
        clientsData.unshift(responseData); // Add to local state
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clientsData)); // Update cache
        
        // Backup to Google Sheets
        backupToGoogleSheets('ADD', responseData);

        addClientForm.reset();
        
        // Navigate to clients view automatically
        document.querySelector('[data-target="clients"]').click();
    } catch (error) {
        console.error('API Error saving client, saving locally instead:', error);
        
        // Fallback to local save
        clientData._id = 'local_' + Date.now();
        clientsData.unshift(clientData);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clientsData));
        
        // Backup to Google Sheets
        backupToGoogleSheets('ADD_LOCAL', clientData);
        
        addClientForm.reset();
        document.querySelector('[data-target="clients"]').click();
    } finally {
        saveClientBtn.innerHTML = '<i class="fas fa-save"></i> Save Client';
        saveClientBtn.disabled = false;
    }
}

async function updateClientField(id, field, value) {
    // Find client
    const client = clientsData.find(c => c._id === id);
    if (!client) return;

    // Create a copy without _id for PUT request
    const { _id, ...updateData } = client;
    updateData[field] = value;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) throw new Error('Failed to update client');
        
        // Refresh locally and UI
        client[field] = value;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clientsData));
        backupToGoogleSheets('UPDATE', client);
        renderDashboard();
    } catch (error) {
        console.error('Error updating client, falling back to local save:', error);
        // Fallback local update
        client[field] = value;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clientsData));
        backupToGoogleSheets('UPDATE_LOCAL', client);
        renderDashboard();
    }
}

// Payment Methods
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
            // Resize logic via Canvas to avoid large JSON payloads
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
            
            const base64String = canvas.toDataURL('image/jpeg', 0.6); // Compress
            
            // Send to backend
            submitPaymentData(base64String);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

async function submitPaymentData(base64String) {
    const client = clientsData.find(c => c._id === pendingPaymentClientId);
    if (!client) {
        closePaymentModal();
        return;
    }

    const { _id, ...updateData } = client;
    updateData.paymentStatus = pendingPaymentType;
    updateData.paymentScreenshot = base64String;

    try {
        const response = await fetch(`${API_URL}/${pendingPaymentClientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) throw new Error('Failed to confirm payment');
        
        client.paymentStatus = pendingPaymentType;
        client.paymentScreenshot = base64String;
        renderDashboard();
    } catch (error) {
        console.error('Error saving payment:', error);
        alert('Failed to save payment. Please try again.');
    } finally {
        confirmPaymentBtn.innerHTML = 'Confirm Payment';
        closePaymentModal();
    }
}

function viewScreenshot(base64Data) {
    screenshotViewerImg.src = base64Data;
    screenshotModal.classList.add('active');
}

function deleteClient(id) {
    showConfirmDialog('Are you sure you want to delete this client? This action cannot be undone.', async () => {
        // Optimistic UI update
        const originalData = [...clientsData];
        clientsData = clientsData.filter(c => c._id !== id);
        renderDashboard();

        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete client');
            
            // Sync local storage
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clientsData));
            backupToGoogleSheets('DELETE', { _id: id });
            
            // Refresh from server to ensure sync
            fetchClients();
        } catch (error) {
            console.error('API Error deleting client, removing locally:', error);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clientsData));
            backupToGoogleSheets('DELETE_LOCAL', { _id: id });
        }
    });
}

// --- Rendering & Logic ---
function renderDashboard() {
    renderClientsTable();
    renderOverview();
}

function getFollowupStatusInfo(dateString) {
    if (!dateString) return { class: 'badge-neutral', text: 'No Date' };

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    const followupDate = new Date(dateString);
    followupDate.setHours(0, 0, 0, 0); // Normalize to start of day

    const diffTime = followupDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { class: 'badge-overdue', text: `Overdue` }; // Red
    } else if (diffDays === 0) {
        return { class: 'badge-today', text: `Today` }; // Yellow
    } else {
        return { class: 'badge-upcoming', text: `In ${diffDays} days` }; // Green
    }
}

function formatDateDisplay(dateString) {
    if(!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function viewNotes(id) {
    const client = clientsData.find(c => c._id === id);
    if (client) {
        notesModalTitle.textContent = `Notes: ${client.name}`;
        notesModalBody.textContent = client.notes || 'No notes added for this client.';
        notesModal.classList.add('active');
    }
}

function renderClientsTable(searchQuery = '') {
    allClientsTableBody.innerHTML = '';
    
    let filteredClients = clientsData;
    if (searchQuery) {
        filteredClients = clientsData.filter(c => 
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
                <div class="client-name">${client.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">Added by ${client.createdBy ? client.createdBy.split('_')[0] : 'Unknown'}</div>
            </td>
            <td>${client.phone}</td>
            <td>
                <span class="badge badge-neutral">${client.status}</span>
                ${paymentBadge}
            </td>
            <td>${client.priority || 'Medium'}</td>
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
                    <button class="btn-icon btn-success" title="Follow Up Completed" onclick="updateClientField('${client._id}', 'followup', '')">
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
    // 1. Total Clients
    metricTotal.textContent = clientsData.length;

    // 2. Ongoing Work
    const ongoing = clientsData.filter(c => c.status === 'Ongoing').length;
    metricOngoing.textContent = ongoing;

    // 3. Pending Follow-ups (Overdue + Today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let pendingCount = 0;
    clientsData.forEach(client => {
        if (client.followup && client.status !== 'Completed' && client.status !== 'Lost') {
            const fDate = new Date(client.followup);
            fDate.setHours(0,0,0,0);
            if (fDate.getTime() <= today.getTime()) {
                pendingCount++;
            }
        }
    });
    metricPending.textContent = pendingCount;

    // 4. Recent Clients Table (Top 5)
    recentClientsTableBody.innerHTML = '';
    const recentClients = clientsData.slice(0, 5);
    
    if (recentClients.length === 0) {
        recentClientsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">No recent activity</td></tr>';
        return;
    }

    recentClients.forEach(client => {
        const tr = document.createElement('tr');
        const fStatus = getFollowupStatusInfo(client.followup);
        
        tr.innerHTML = `
            <td><span class="client-name">${client.name}</span></td>
            <td>${client.phone}</td>
            <td><span class="badge badge-neutral">${client.status}</span></td>
            <td><span class="badge ${fStatus.class}">${fStatus.text}</span></td>
        `;
        recentClientsTableBody.appendChild(tr);
    });
}

function showLoaders(show) {
    if (show) {
        clientsLoader.style.display = 'flex';
        overviewLoader.style.display = 'flex';
        allClientsTableBody.style.display = 'none';
        recentClientsTableBody.style.display = 'none';
    } else {
        clientsLoader.style.display = 'none';
        overviewLoader.style.display = 'none';
        allClientsTableBody.style.display = '';
        recentClientsTableBody.style.display = '';
    }
}

// Start app
init();

// Ensure global scope for inline event handlers
window.deleteClient = deleteClient;
window.updateClientField = updateClientField;
window.openPaymentModal = openPaymentModal;
window.viewScreenshot = viewScreenshot;
window.viewNotes = viewNotes;
