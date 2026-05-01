/**
 * FalcoDigi Works CRM - Firebase Integration
 * This handles all cloud sync, authentication, and real-time updates
 */

// ========== FIREBASE CONFIGURATION ==========
// This will be initialized after firebase-config.js loads

let clientsData = [];
let currentUser = null;
let db = null;
let auth = null;
let unsubscribeClients = null;

// ========== INITIALIZE FIREBASE AFTER CONFIG LOADS ==========
function initializeFirebase() {
    // Check if firebase is loaded
    if (typeof firebase === 'undefined') {
        console.error('Firebase not loaded. Make sure firebase-config.js is included.');
        return;
    }
    
    db = firebase.firestore();
    auth = firebase.auth();
    
    console.log('✅ Firebase initialized successfully');
    
    // Start listening to real-time updates
    setupRealtimeListeners();
}

// Wait for Firebase to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFirebase);
} else {
    initializeFirebase();
}

// ========== REAL-TIME LISTENERS ==========
function setupRealtimeListeners() {
    if (!db) {
        console.warn('Database not initialized');
        return;
    }
    
    // Unsubscribe from previous listener if exists
    if (unsubscribeClients) {
        unsubscribeClients();
    }
    
    // Real-time listener for clients collection
    unsubscribeClients = db.collection('clients')
        .orderBy('createdAt', 'desc')
        .onSnapshot(
            (snapshot) => {
                clientsData = [];
                snapshot.forEach(doc => {
                    clientsData.push({
                        ...doc.data(),
                        _id: doc.id  // Store Firebase document ID
                    });
                });
                
                // Update UI if dashboard is visible
                const dashboardView = document.getElementById('dashboard-view');
                if (!dashboardView.classList.contains('hidden')) {
                    renderDashboard();
                }
                
                console.log(`📡 Real-time sync: ${clientsData.length} clients loaded`);
            },
            (error) => {
                console.error('❌ Error listening to clients:', error);
                // Fallback to static load
                fetchClientsStatic();
            }
        );
}

// Fallback: fetch clients without real-time
async function fetchClientsStatic() {
    if (!db) return;
    
    try {
        const snapshot = await db.collection('clients')
            .orderBy('createdAt', 'desc')
            .get();
        
        clientsData = [];
        snapshot.forEach(doc => {
            clientsData.push({
                ...doc.data(),
                _id: doc.id
            });
        });
        
        renderDashboard();
        console.log('✅ Static fetch: Clients loaded');
    } catch (error) {
        console.error('❌ Error fetching clients:', error);
    }
}

// ========== AUTHENTICATION ==========
async function handleFirebaseLogin(email, password) {
    if (!auth) {
        console.error('Auth not initialized');
        return false;
    }
    
    try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        currentUser = result.user.uid;
        sessionStorage.setItem('fdw_user', result.user.uid);
        sessionStorage.setItem('fdw_user_name', email.split('@')[0]);
        
        console.log('✅ Firebase login successful:', email);
        return true;
    } catch (error) {
        console.error('❌ Firebase login error:', error.message);
        return false;
    }
}

async function handleFirebaseLogout() {
    if (!auth) return;
    
    try {
        await auth.signOut();
        currentUser = null;
        sessionStorage.removeItem('fdw_user');
        sessionStorage.removeItem('fdw_user_name');
        
        // Unsubscribe from real-time listeners
        if (unsubscribeClients) {
            unsubscribeClients();
        }
        
        console.log('✅ Firebase logout successful');
    } catch (error) {
        console.error('❌ Firebase logout error:', error);
    }
}

// ========== CRUD OPERATIONS ==========

// CREATE: Add new client
async function addClientToFirebase(clientData) {
    if (!db) {
        console.error('Database not initialized');
        throw new Error('Database not initialized');
    }
    
    try {
        const docRef = await db.collection('clients').add({
            ...clientData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: sessionStorage.getItem('fdw_user_name') || 'Unknown'
        });
        
        console.log('✅ Client added to Firebase:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('❌ Error adding client:', error);
        throw error;
    }
}

// UPDATE: Update client field
async function updateClientInFirebase(clientId, fieldUpdates) {
    if (!db) throw new Error('Database not initialized');
    
    try {
        await db.collection('clients').doc(clientId).update({
            ...fieldUpdates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Client updated:', clientId);
    } catch (error) {
        console.error('❌ Error updating client:', error);
        throw error;
    }
}

// DELETE: Delete client
async function deleteClientFromFirebase(clientId) {
    if (!db) throw new Error('Database not initialized');
    
    try {
        await db.collection('clients').doc(clientId).delete();
        console.log('✅ Client deleted:', clientId);
    } catch (error) {
        console.error('❌ Error deleting client:', error);
        throw error;
    }
}

// ========== HELPER: Get client by ID ==========
function getClientById(id) {
    return clientsData.find(c => c._id === id);
}

// ========== EXPORT FOR USE IN MAIN SCRIPT ==========
window.firebaseAPI = {
    login: handleFirebaseLogin,
    logout: handleFirebaseLogout,
    addClient: addClientToFirebase,
    updateClient: updateClientInFirebase,
    deleteClient: deleteClientFromFirebase,
    getClientById: getClientById,
    getClients: () => clientsData,
    getCurrentUser: () => currentUser,
    setCurrentUser: (user) => { currentUser = user; },
    getDb: () => db,
    getAuth: () => auth
};

console.log('📦 Firebase Integration Module Loaded');
