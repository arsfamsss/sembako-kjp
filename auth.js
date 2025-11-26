// ============================================
// auth.js - Handler Login & Logout
// ============================================

console.log('Loading auth.js...');

// Cek status login saat aplikasi dibuka
document.addEventListener('DOMContentLoaded', function() {
    // Beri jeda sedikit agar Supabase terinisialisasi di config.js
    setTimeout(checkSession, 500);
});

async function checkSession() {
    if (!supabase) return;

    // Cek apakah ada user yang sedang login
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        showApp(); // Jika ada sesi, buka aplikasi
    } else {
        showLogin(); // Jika tidak, tampilkan login
    }
}

// Tampilkan Aplikasi Utama
function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
    
    // Jalankan inisialisasi aplikasi (dari app.js) jika belum jalan
    if (typeof initializeApp === 'function') {
        // Cek agar tidak double init
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

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btn-login');
    const alertBox = document.getElementById('login-alert');

    // Ubah tombol jadi loading
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memuat...';
    alertBox.innerHTML = '';

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        // Jika sukses
        showApp();

    } catch (error) {
        console.error('Login error:', error.message);
        alertBox.innerHTML = `
            <div class="alert alert-danger mt-3" role="alert">
                <small>Login Gagal: Email atau Password salah.</small>
            </div>
        `;
    } finally {
        // Kembalikan tombol seperti semula
        btn.disabled = false;
        btn.innerHTML = 'Masuk Aplikasi';
    }
}

// Fungsi Logout
async function handleLogout() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        await supabase.auth.signOut();
        location.reload(); // Refresh halaman untuk kembali ke login
    }
}