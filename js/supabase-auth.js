// ===========================================
// SUPABASE AUTH FOR ADMIN PANEL
// ===========================================
// Handles: Login, Logout, Password Reset via Supabase Auth
// This file should be loaded BEFORE admin.js

// Supabase Config
const SUPABASE_AUTH_URL = 'https://rihgzpvuhopywaevscmk.supabase.co';
const SUPABASE_AUTH_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpaGd6cHZ1aG9weXdhZXZzY21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MjcxODEsImV4cCI6MjA3NDQwMzE4MX0.7_mpVwbmvl21EQ6fFQPcwwPzU4Hkp68gFy-Ns7-qXiE';

// Initialize Supabase Client for Auth
let supabaseAuthClient = null;

function initSupabaseAuth() {
    if (supabaseAuthClient) return true; // Already initialized

    if (typeof supabase !== 'undefined' && supabase.createClient) {
        supabaseAuthClient = supabase.createClient(SUPABASE_AUTH_URL, SUPABASE_AUTH_KEY);
        // Make client globally accessible for realtime to reuse
        window.supabaseAuthClient = supabaseAuthClient;
        console.log('✅ Supabase Auth initialized');
        return true;
    }
    console.error('❌ Supabase JS not loaded');
    return false;
}

// ===========================================
// LOGIN WITH SUPABASE AUTH
// ===========================================
async function supabaseLogin(email, password) {
    if (!initSupabaseAuth()) {
        throw new Error('Supabase Auth not available');
    }

    console.log('🔐 Attempting Supabase login for:', email);

    const { data, error } = await supabaseAuthClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        console.error('❌ Supabase Login Error:', error.message);
        throw new Error(error.message || 'Invalid login credentials');
    }

    console.log('✅ Supabase Login successful!');
    console.log('   User ID:', data.user?.id);
    console.log('   Email:', data.user?.email);

    return data;
}

// ===========================================
// LOGOUT WITH SUPABASE AUTH
// ===========================================
async function supabaseLogout() {
    if (!initSupabaseAuth()) {
        console.warn('Supabase Auth not available for logout');
        return true;
    }

    const { error } = await supabaseAuthClient.auth.signOut();

    if (error) {
        console.error('❌ Supabase Logout Error:', error.message);
        throw error;
    }

    console.log('✅ Supabase Logout successful');
    return true;
}

// ===========================================
// GET CURRENT SESSION
// ===========================================
async function getSupabaseSession() {
    if (!initSupabaseAuth()) {
        return null;
    }

    try {
        const { data: { session }, error } = await supabaseAuthClient.auth.getSession();

        if (error) {
            console.error('Session Error:', error.message);
            return null;
        }

        return session;
    } catch (e) {
        console.error('Session check failed:', e);
        return null;
    }
}

// ===========================================
// GET CURRENT USER
// ===========================================
async function getSupabaseUser() {
    if (!initSupabaseAuth()) {
        return null;
    }

    try {
        const { data: { user }, error } = await supabaseAuthClient.auth.getUser();

        if (error) {
            console.error('User Error:', error.message);
            return null;
        }

        return user;
    } catch (e) {
        console.error('User fetch failed:', e);
        return null;
    }
}

// ===========================================
// PASSWORD RESET - Send Email
// ===========================================
async function supabaseResetPasswordEmail(email) {
    if (!initSupabaseAuth()) {
        throw new Error('Supabase Auth not available');
    }

    // PRODUCTION: Use your actual deployed frontend URL
    // For local testing, it will use localhost
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    let redirectTo;
    if (isLocalhost) {
        // For local development
        redirectTo = 'http://localhost:5500/admin.html#type=recovery';
    } else {
        // For production - UPDATE THIS WITH YOUR ACTUAL FRONTEND URL
        redirectTo = 'https://your-frontend-domain.com/admin.html#type=recovery';
        // OR use dynamic: window.location.origin + '/admin.html#type=recovery'
    }

    console.log('📧 Sending password reset email to:', email);
    console.log('   Redirect URL:', redirectTo);

    const { data, error } = await supabaseAuthClient.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo
    });

    if (error) {
        console.error('❌ Password Reset Email Error:', error.message);
        throw new Error(error.message || 'Failed to send reset email');
    }

    console.log('✅ Password reset email sent');
    return data;
}

// ===========================================
// UPDATE PASSWORD (After reset link clicked)
// ===========================================
async function supabaseUpdatePassword(newPassword) {
    if (!initSupabaseAuth()) {
        throw new Error('Supabase Auth not available');
    }

    console.log('🔐 Updating password...');

    const { data, error } = await supabaseAuthClient.auth.updateUser({
        password: newPassword
    });

    if (error) {
        console.error('❌ Password Update Error:', error.message);
        throw new Error(error.message || 'Failed to update password');
    }

    console.log('✅ Password updated successfully');
    return data;
}

// ===========================================
// AUTH STATE CHANGE LISTENER
// ===========================================
function onSupabaseAuthStateChange(callback) {
    if (!initSupabaseAuth()) {
        return null;
    }

    return supabaseAuthClient.auth.onAuthStateChange((event, session) => {
        console.log('🔄 Auth State Changed:', event);
        if (callback) callback(event, session);
    });
}

// ===========================================
// CHECK IF PASSWORD RESET CALLBACK
// ===========================================
function isPasswordResetCallback() {
    const hash = window.location.hash;
    const search = window.location.search;

    console.log('🔍 Checking for password reset callback...');
    console.log('   Hash:', hash);

    // Check for error in URL (means callback failed)
    if (search.includes('error=') || hash.includes('error=')) {
        console.log('⚠️ Password reset callback has error');
        return false; // Let error handler deal with it
    }

    // Check for access_token in hash (main indicator from Supabase)
    if (hash.includes('access_token=')) {
        console.log('🔑 Access token found in URL - password reset callback');
        return true;
    }

    // Check for recovery type in hash (successful callback)
    if (hash.includes('type=recovery') && hash.includes('access_token')) {
        console.log('🔑 Valid password reset callback detected');
        return true;
    }

    // Check query params too (some Supabase configs use query)
    if (search.includes('type=recovery') || search.includes('access_token=')) {
        console.log('🔑 Password reset callback in query params');
        return true;
    }

    console.log('   No password reset callback detected');
    return false;
}

// ===========================================
// HANDLE PASSWORD RESET CALLBACK - Extract session from URL
// ===========================================
async function handlePasswordResetCallback() {
    if (!initSupabaseAuth()) {
        throw new Error('Supabase Auth not available');
    }

    console.log('🔐 Handling password reset callback...');
    console.log('   Full URL:', window.location.href);
    console.log('   Hash:', window.location.hash);

    // Get the full hash and handle double hash format (#type=recovery#access_token=...)
    let hash = window.location.hash.substring(1); // Remove first #

    // Replace any extra # with & for proper parsing
    hash = hash.replace(/#/g, '&');

    const params = new URLSearchParams(hash);

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');

    console.log('   Type:', type);
    console.log('   Access Token:', accessToken ? `Found (${accessToken.substring(0, 20)}...)` : 'Not found');
    console.log('   Refresh Token:', refreshToken ? 'Found' : 'Not found');

    if (!accessToken) {
        throw new Error('No access token found in URL');
    }

    if (type !== 'recovery') {
        console.log('   Type is:', type, '- may still work for password reset');
    }

    // Set the session using the tokens from the URL
    try {
        const { data, error } = await supabaseAuthClient.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
        });

        if (error) {
            console.error('❌ Session setup error:', error.message);
            throw error;
        }

        console.log('✅ Recovery session established');
        return data;
    } catch (e) {
        console.error('❌ Failed to set session:', e);
        throw new Error('Invalid or expired reset link. Please request a new one.');
    }
}

// ===========================================
// GET ACCESS TOKEN FOR API CALLS
// ===========================================
async function getSupabaseAccessToken() {
    const session = await getSupabaseSession();
    if (session && session.access_token) {
        return session.access_token;
    }
    return null;
}

// ===========================================
// VERIFY SUPABASE SESSION IS VALID
// ===========================================
async function verifySupabaseSession() {
    try {
        const session = await getSupabaseSession();
        if (!session) return false;

        const user = await getSupabaseUser();
        if (!user) return false;

        console.log('✅ Valid Supabase session for:', user.email);
        return true;
    } catch (e) {
        console.error('Session verification failed:', e);
        return false;
    }
}

// Export functions globally
window.initSupabaseAuth = initSupabaseAuth;
window.supabaseLogin = supabaseLogin;
window.supabaseLogout = supabaseLogout;
window.getSupabaseSession = getSupabaseSession;
window.getSupabaseUser = getSupabaseUser;
window.supabaseResetPasswordEmail = supabaseResetPasswordEmail;
window.supabaseUpdatePassword = supabaseUpdatePassword;
window.onSupabaseAuthStateChange = onSupabaseAuthStateChange;
window.isPasswordResetCallback = isPasswordResetCallback;
window.handlePasswordResetCallback = handlePasswordResetCallback;
window.getSupabaseAccessToken = getSupabaseAccessToken;
window.verifySupabaseSession = verifySupabaseSession;

// Auto-initialize on load
if (typeof supabase !== 'undefined') {
    initSupabaseAuth();
}

console.log('🔐 Supabase Auth module loaded');
