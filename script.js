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

// Tables
const allClientsTableBody = document.querySelector('#all-clients-table tbody');
const recentClientsTableBody = document.querySelector('#recent-clients-table tbody');

// Loaders
const clientsLoader = document.getElementById('clients-loader');
const overviewLoader = document.getElementById('overview-loader');

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
            e.preventDefault();
            const target = e.currentTarget.getAttribute('data-target');
            
            // Update active link
            navLinks.forEach(l => l.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            // Update view
            viewSections.forEach(sec => sec.classList.remove('active'));
            document.getElementById(target).classList.add('active');

            // Refresh data if going to a data view
            if(target === 'clients' || target === 'overview') {
                fetchClients();
            }
        });
    });

    // Add Client
    addClientForm.addEventListener('submit', handleAddClient);
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
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        clientsData = data.reverse(); // Newest first
        renderDashboard();
    } catch (error) {
        console.error('Error fetching clients:', error);
        // Do not crash, just show empty
        clientsData = [];
        renderDashboard();
    } finally {
        showLoaders(false);
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
        addClientForm.reset();
        
        // Navigate to clients view automatically
        document.querySelector('[data-target="clients"]').click();
    } catch (error) {
        console.error('Error saving client:', error);
        alert('Failed to save client. Please try again.');
    } finally {
        saveClientBtn.innerHTML = '<i class="fas fa-save"></i> Save Client';
        saveClientBtn.disabled = false;
    }
}

async function deleteClient(id) {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete client');
        
        // Refresh
        fetchClients();
    } catch (error) {
        console.error('Error deleting client:', error);
        alert('Failed to delete client.');
    }
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

function renderClientsTable() {
    allClientsTableBody.innerHTML = '';
    
    if (clientsData.length === 0) {
        allClientsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No clients found. Add a client to get started.</td></tr>';
        return;
    }

    clientsData.forEach(client => {
        const tr = document.createElement('tr');
        
        const fStatus = getFollowupStatusInfo(client.followup);
        
        tr.innerHTML = `
            <td>
                <div class="client-name">${client.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">Added by ${client.createdBy ? client.createdBy.split('_')[0] : 'Unknown'}</div>
            </td>
            <td>${client.phone}</td>
            <td><span class="badge badge-neutral">${client.status}</span></td>
            <td>${client.priority || 'Medium'}</td>
            <td>
                <div style="margin-bottom: 4px;">${formatDateDisplay(client.followup)}</div>
                <span class="badge ${fStatus.class}">${fStatus.text}</span>
            </td>
            <td>
                <button class="btn btn-danger" onclick="deleteClient('${client._id}')">
                    <i class="fas fa-trash"></i>
                </button>
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
