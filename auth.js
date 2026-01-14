// ============================================
// auth.js - Handler Login & Logout (MODE LOGIN AKTIF)
// ============================================

console.log('Loading auth.js...');

document.addEventListener('DOMContentLoaded', async function () {
    // 1) pasang handler submit form login
    const form = document.querySelector('#login-screen form');
    if (form) {
        form.addEventListener('submit', handleLogin);
    }

    // 2) cek session Supabase
    await checkSession();
});

async function checkSession() {
    try {
        // Jika supabase client belum siap, tampilkan login saja
        if (!window.supabase || !window.supabase.auth) {
            console.warn('Supabase client belum siap, tampilkan login...');
            showLogin();
            return;
        }

        const { data, error } = await window.supabase.auth.getSession();
        if (error) throw error;

        if (data.session) {
            showApp();
        } else {
            showLogin();
        }
    } catch (err) {
        console.error('checkSession error:', err?.message || err);
        showLogin();
    }
}

// Tampilkan Aplikasi Utama
function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';

    // Jalankan inisialisasi aplikasi (dari app.js) jika belum jalan
    if (typeof initializeApp === 'function') {
        if (!window.appInitialized) {
            initializeApp();
            window.appInitialized = true;
        }
    }
}

// Tampilkan Layar Login
function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-screen').style.display = 'none';
}

// Fungsi Login (Dipanggil saat tombol Login ditekan)
async function handleLogin(event) {
    event.preventDefault(); // Mencegah reload halaman

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btn-login');
    const alertBox = document.getElementById('login-alert');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memuat...';
    alertBox.innerHTML = '';

    try {
        const { error } = await window.supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        // sukses
        showApp();
    } catch (error) {
        console.error('Login error:', error.message);
        alertBox.innerHTML = `
      <div class="alert alert-danger mt-3" role="alert">
        <small>Login Gagal: ${error.message}</small>
      </div>
    `;
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Masuk Aplikasi';
    }
}

// Logout (opsional)
async function handleLogout() {
    await window.supabase.auth.signOut();
    window.appInitialized = false;
    showLogin();
}
