// ===========================================
// SUPABASE REALTIME CONFIGURATION
// ===========================================
// This file handles real-time updates across the portfolio
// Admin changes -> Main page updates instantly
// Main page contact form -> Admin sees new messages instantly

// ===========================================
// ⚠️ IMPORTANT: UPDATE THESE WITH YOUR SUPABASE CREDENTIALS
// ===========================================
// Get these from: Supabase Dashboard → Settings → API
// Use the 'anon' public key (NOT service_role key!)

// Your Supabase Project URL (MUST MATCH YOUR BACKEND .env)
// Check if already defined by supabase-auth.js (avoid duplicate const error)
const SUPABASE_REALTIME_URL = window.SUPABASE_URL || 'https://rihgzpvuhopywaevscmk.supabase.co';

// Your Supabase Anon Key (Public - safe to use in frontend)
// Get this from: Supabase Dashboard → Settings → API → anon public
const SUPABASE_REALTIME_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpaGd6cHZ1aG9weXdhZXZzY21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MjcxODEsImV4cCI6MjA3NDQwMzE4MX0.7_mpVwbmvl21EQ6fFQPcwwPzU4Hkp68gFy-Ns7-qXiE';

// Initialize Supabase Client
let supabaseClient = null;
let mainPageChannel = null;    // Channel for main page updates
let adminPageChannel = null;   // Channel for admin page updates (separate!)


// Initialize Supabase when the script loads
// Reuses auth client if already exists to avoid "Multiple GoTrueClient" warning
function initSupabase() {
    // If already initialized, return
    if (supabaseClient) return true;

    // Try to reuse the auth client if it exists (avoids duplicate client warning)
    if (typeof supabaseAuthClient !== 'undefined' && supabaseAuthClient) {
        supabaseClient = supabaseAuthClient;
        console.log('✅ Supabase Realtime initialized (sharing auth client)');
        return true;
    }

    // Otherwise create new client
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        supabaseClient = supabase.createClient(SUPABASE_REALTIME_URL, SUPABASE_REALTIME_KEY);
        console.log('✅ Supabase Realtime initialized');
        return true;
    } else {
        console.error('❌ Supabase JS not loaded');
        return false;
    }
}

// ===========================================
// REALTIME SUBSCRIPTIONS FOR MAIN PAGE
// ===========================================

function subscribeToMainPageUpdates(callbacks = {}) {
    if (!supabaseClient) {
        if (!initSupabase()) return;
    }

    // Unsubscribe from existing main page channel if any
    if (mainPageChannel) {
        supabaseClient.removeChannel(mainPageChannel);
    }

    // Create a new channel for all portfolio updates (main page only)
    mainPageChannel = supabaseClient.channel('portfolio-updates')
        // Profile changes
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'profiles' },
            (payload) => {
                console.log('📡 Profile updated in real-time');
                if (callbacks.onProfileUpdate) callbacks.onProfileUpdate(payload);
            }
        )
        // Skills changes
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'skills' },
            (payload) => {
                console.log('📡 Skills updated in real-time');
                if (callbacks.onSkillsUpdate) callbacks.onSkillsUpdate(payload);
            }
        )
        // Projects changes
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'projects' },
            (payload) => {
                console.log('📡 Projects updated in real-time');
                if (callbacks.onProjectsUpdate) callbacks.onProjectsUpdate(payload);
            }
        )
        // Education changes
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'education' },
            (payload) => {
                console.log('📡 Education updated in real-time');
                if (callbacks.onEducationUpdate) callbacks.onEducationUpdate(payload);
            }
        )
        // Services changes
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'services' },
            (payload) => {
                console.log('📡 Services updated in real-time');
                if (callbacks.onServicesUpdate) callbacks.onServicesUpdate(payload);
            }
        )
        // Certificates changes
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'certificates' },
            (payload) => {
                console.log('📡 Certificates updated in real-time');
                if (callbacks.onCertificatesUpdate) callbacks.onCertificatesUpdate(payload);
            }
        )
        .subscribe((status) => {
            console.log(`📡 Main Page Realtime Status: ${status}`);
        });

    return mainPageChannel;
}

// ===========================================
// REALTIME SUBSCRIPTIONS FOR ADMIN PAGE
// ===========================================

function subscribeToAdminUpdates(callbacks = {}) {
    if (!supabaseClient) {
        if (!initSupabase()) return;
    }

    // Unsubscribe from existing admin channel if any
    if (adminPageChannel) {
        supabaseClient.removeChannel(adminPageChannel);
    }

    // Create a new channel for admin updates (mainly contacts/messages)
    adminPageChannel = supabaseClient.channel('admin-updates')
        // New contact messages
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'contacts' },
            (payload) => {
                console.log('📡 New message received in real-time!');
                if (callbacks.onNewMessage) callbacks.onNewMessage(payload);
            }
        )
        // Message updates (read status)
        .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'contacts' },
            (payload) => {
                console.log('📡 Message updated in real-time');
                if (callbacks.onMessageUpdate) callbacks.onMessageUpdate(payload);
            }
        )
        // Message deleted
        .on('postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'contacts' },
            (payload) => {
                console.log('📡 Message deleted in real-time');
                if (callbacks.onMessageDelete) callbacks.onMessageDelete(payload);
            }
        )
        // Session changes (login/logout from any device)
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'admin_sessions' },
            (payload) => {
                console.log('📡 Session changed in real-time:', payload.eventType);
                if (callbacks.onSessionChange) callbacks.onSessionChange(payload);
            }
        )
        // Profile changes (for media section sync)
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'profiles' },
            (payload) => {
                console.log('📡 Profile updated in real-time');
                if (callbacks.onProfileUpdate) callbacks.onProfileUpdate(payload);
            }
        )
        // Skills changes
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'skills' },
            (payload) => {
                console.log('📡 Skills updated in real-time');
                if (callbacks.onSkillsUpdate) callbacks.onSkillsUpdate(payload);
            }
        )
        // Projects changes
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'projects' },
            (payload) => {
                console.log('📡 Projects updated in real-time');
                if (callbacks.onProjectsUpdate) callbacks.onProjectsUpdate(payload);
            }
        )
        // Education changes
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'education' },
            (payload) => {
                console.log('📡 Education updated in real-time');
                if (callbacks.onEducationUpdate) callbacks.onEducationUpdate(payload);
            }
        )
        // Services changes
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'services' },
            (payload) => {
                console.log('📡 Services updated in real-time');
                if (callbacks.onServicesUpdate) callbacks.onServicesUpdate(payload);
            }
        )
        // Certificates changes
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'certificates' },
            (payload) => {
                console.log('📡 Certificates updated in real-time');
                if (callbacks.onCertificatesUpdate) callbacks.onCertificatesUpdate(payload);
            }
        )
        .subscribe((status, err) => {
            console.log(`📡 Admin Realtime Status: ${status}`);
            if (status === 'SUBSCRIBED') {
                console.log('✅ Admin channel is now live - will receive new messages instantly!');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Admin channel error:', err);
            } else if (status === 'TIMED_OUT') {
                console.error('❌ Admin channel timed out');
            } else if (status === 'CLOSED') {
                console.warn('⚠️ Admin channel closed');
            }
        });

    return adminPageChannel;
}

// ===========================================
// UNSUBSCRIBE / CLEANUP
// ===========================================

function unsubscribeFromUpdates() {
    if (mainPageChannel && supabaseClient) {
        supabaseClient.removeChannel(mainPageChannel);
        mainPageChannel = null;
        console.log('📡 Unsubscribed from main page updates');
    }
    if (adminPageChannel && supabaseClient) {
        supabaseClient.removeChannel(adminPageChannel);
        adminPageChannel = null;
        console.log('📡 Unsubscribed from admin updates');
    }
}

// ===========================================
// SHOW REALTIME NOTIFICATION
// ===========================================

function showRealtimeToast(message, type = 'info') {
    // Create toast element if showToast function exists
    if (typeof showToast === 'function') {
        showToast(message);
    } else {
        // Fallback - create custom toast
        const toast = document.getElementById('toast');
        const toastMsg = document.getElementById('toastMsg');
        if (toast && toastMsg) {
            toastMsg.textContent = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 4000);
        }
    }
}

// Export functions globally
window.initSupabase = initSupabase;
window.subscribeToMainPageUpdates = subscribeToMainPageUpdates;
window.subscribeToAdminUpdates = subscribeToAdminUpdates;
window.unsubscribeFromUpdates = unsubscribeFromUpdates;
window.showRealtimeToast = showRealtimeToast;

console.log('🔌 Supabase Realtime module loaded');
