// ============================================
// utils.js (SIMPLIFIED & FIXED)
// Helper Functions: Validasi, Formatting, Sanitasi
// ============================================

console.log('Loading utils.js...');

// ============================================
// VALIDATION FUNCTIONS
// ============================================

function sanitizeNumber(value) {
    if (!value) return '';
    return value
        .toString()
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(/-/g, '')
        .replace(/,/g, '');
}

function validateKJP(kjp) {
    kjp = sanitizeNumber(kjp);

    if (!kjp) {
        return { valid: false, error: 'No. KJP wajib diisi' };
    }

    if (!/^\d+$/.test(kjp)) {
        return { valid: false, error: 'No. KJP hanya boleh angka' };
    }

    if (kjp.length < 12 || kjp.length > 18) {
        return { valid: false, error: 'No. KJP harus 12-18 digit' };
    }

    return { valid: true };
}

function validateKTP(ktp) {
    ktp = sanitizeNumber(ktp);

    if (!ktp) {
        return { valid: false, error: 'No. KTP wajib diisi' };
    }

    if (!/^\d+$/.test(ktp)) {
        return { valid: false, error: 'No. KTP hanya boleh angka' };
    }

    if (ktp.length !== 16) {
        return { valid: false, error: 'No. KTP harus 16 digit' };
    }

    return { valid: true };
}

function validateKK(kk) {
    kk = sanitizeNumber(kk);

    if (!kk) {
        return { valid: false, error: 'No. KK wajib diisi' };
    }

    if (!/^\d+$/.test(kk)) {
        return { valid: false, error: 'No. KK hanya boleh angka' };
    }

    if (kk.length !== 16) {
        return { valid: false, error: 'No. KK harus 16 digit' };
    }

    return { valid: true };
}

function validateNomorBerbeda(kjp, ktp, kk) {
    kjp = sanitizeNumber(kjp);
    ktp = sanitizeNumber(ktp);
    kk = sanitizeNumber(kk);

    if (kjp === ktp || kjp === kk || (ktp && kk && ktp === kk)) { // Pastikan ktp/kk tidak null
        return { valid: false, error: 'No. KJP, KTP, dan KK harus berbeda satu sama lain' };
    }

    return { valid: true };
}

function validateNama(nama) {
    if (!nama || nama.trim() === '') {
        return { valid: false, error: 'Nama user wajib diisi' };
    }

    if (nama.length > 100) {
        return { valid: false, error: 'Nama user maksimal 100 karakter' };
    }

    return { valid: true };
}

/**
 * Validasi untuk input type="date" (YYYY-MM-DD)
 * Fungsi validateDate lama tidak diperlukan jika input type="text" diganti
 */
function validateDate(dateStr) {
    if (!dateStr) {
        return { valid: false, error: 'Tanggal wajib diisi' };
    }

    // Cek format YYYY-MM-DD
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) {
        return { valid: false, error: 'Format tanggal tidak valid (gunakan YYYY-MM-DD)' };
    }

    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set ke awal hari

    if (date.toString() === 'Invalid Date') {
        return { valid: false, error: 'Tanggal tidak valid' };
    }

    // Hapus pengecekan masa depan, karena input date sudah ada 'max'
    // if (date > today) {
    //   return { valid: false, error: 'Tanggal tidak boleh masa depan' };
    // }

    return { valid: true, isoDate: dateStr };
}


function validateDateRange(tglOrder, tglAmbil) {
    if (tglAmbil < tglOrder) {
        return { valid: false, error: 'Tanggal ambil harus ≥ tanggal order' };
    }

    return { valid: true };
}

// ============================================
// DATABASE CHECK FUNCTIONS
// ============================================

async function checkNamaExists(namaUser, excludeId = null) {
    try {
        let query = supabase
            .from('data_master')
            .select('id')
            .eq('nama_user', namaUser);

        if (excludeId) {
            query = query.neq('id', excludeId);
        }

        const { data, error } = await query.limit(1);

        if (error) throw error;
        return data && data.length > 0;
    } catch (error) {
        console.error('Error checking nama:', error);
        throw error;
    }
}

async function checkKJPExists(kjp, excludeId = null) {
    try {
        kjp = sanitizeNumber(kjp);

        let query = supabase
            .from('data_master')
            .select('id')
            .eq('no_kjp', kjp);

        if (excludeId) {
            query = query.neq('id', excludeId);
        }

        const { data, error } = await query.limit(1);

        if (error) throw error;
        return data && data.length > 0;
    } catch (error) {
        console.error('Error checking KJP:', error);
        throw error;
    }
}

async function checkKJPExistsByDate(kjp, tglOrder, excludeId = null) {
    try {
        kjp = sanitizeNumber(kjp);

        let query = supabase
            .from('list_harian')
            .select('id')
            .eq('no_kjp', kjp)
            .eq('tgl_order', tglOrder);

        if (excludeId) {
            query = query.neq('id', excludeId);
        }

        const { data, error } = await query.limit(1);

        if (error) throw error;
        return data && data.length > 0;
    } catch (error) {
        console.error('Error checking KJP by date:', error);
        throw error;
    }
}

async function checkKTPExistsByDate(ktp, tglOrder, excludeId = null) {
    try {
        ktp = sanitizeNumber(ktp);

        let query = supabase
            .from('list_harian')
            .select('id')
            .eq('no_ktp', ktp)
            .eq('tgl_order', tglOrder);

        if (excludeId) {
            query = query.neq('id', excludeId);
        }

        const { data, error } = await query.limit(1);

        if (error) throw error;
        return data && data.length > 0;
    } catch (error) {
        console.error('Error checking KTP by date:', error);
        throw error;
    }
}

// ============================================
// FORMATTING FUNCTIONS
// ============================================

function formatNomor(nomor) {
    // ✅ JANGAN sanitize, gunakan langsung dari DB
    if (!nomor) return '';
    const str = nomor.toString().trim();

    // ✅ Hapus spasi yang sudah ada
    const clean = str.replace(/\s+/g, '');

    // ✅ Group setiap 4 digit dari BELAKANG (untuk KJP/KTP yang panjang)
    if (clean.length <= 4) {
        return clean;
    }

    // Buat array dari belakang
    const arr = clean.split('');
    let result = [];
    for (let i = arr.length - 1; i >= 0; i--) {
        result.unshift(arr[i]);
        if ((arr.length - i) % 4 === 0 && i !== 0) {
            result.unshift(' ');
        }
    }

    return result.join('');
}

function formatCurrency(amount) {
    // Cek jika value null/undefined/kosong
    if (amount === null || amount === undefined || amount === '') return 'Rp 0';

    // Pastikan input adalah angka
    const num = parseFloat(amount);
    if (isNaN(num)) return 'Rp 0';

    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0  /* <--- INI KUNCINYA: Paksa 0 angka di belakang koma */
    }).format(num);
}

function formatDateToDisplay(isoDate) {
    if (!isoDate) return '-';

    try {
        const [year, month, day] = isoDate.split('-');
        return `${day}/${month}/${year}`;
    } catch (error) {
        return isoDate;
    }
}

function formatDateLong(isoDate) {
    if (!isoDate) return '-';

    try {
        const date = new Date(isoDate);
        const options = { year: 'numeric', month: 'short', day: '2-digit' };
        return date.toLocaleDateString('id-ID', options);
    } catch (error) {
        return isoDate;
    }
}

function extractParentName(namaUser) {
    if (!namaUser) return '';

    // Ambil semua karakter sebelum tanda kurung pertama
    const match = namaUser.match(/^(.+?)\s*\(/);
    if (match) {
        // Normalisasi: trim, uppercase, hapus spasi ganda
        return match[1].trim().toUpperCase().replace(/\s+/g, ' ');
    }

    // Jika tidak ada kurung, normalisasi juga
    return namaUser.trim().toUpperCase().replace(/\s+/g, ' ');
}


// ============================================
// UI HELPER FUNCTIONS
// ============================================

function showAlert(type, message, duration = 3000) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.setAttribute('role', 'alert');

    const colors = {
        'success': '#28a745',
        'error': '#dc3545',
        'danger': '#dc3545',
        'warning': '#ffc107',
        'info': '#17a2b8',
    };

    alertDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    background-color: ${colors[type] || colors['info']};
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    min-width: 300px;
  `;

    alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close btn-close-white" onclick="this.parentElement.remove()" aria-label="Close"></button>
  `;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, duration);
}

function showLoading(message = 'Loading...') {
    const existingLoading = document.getElementById('loading-overlay');
    if (existingLoading) {
        existingLoading.remove();
    }

    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-overlay';
    loadingDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9998;
  `;

    loadingDiv.innerHTML = `
    <div style="background: white; padding: 30px; border-radius: 10px; text-align: center;">
      <div class="spinner-border" role="status" style="width: 3rem; height: 3rem;">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p style="margin-top: 15px; color: #333;">${message}</p>
    </div>
  `;

    document.body.appendChild(loadingDiv);
    return loadingDiv;
}

function hideLoading() {
    const loadingDiv = document.getElementById('loading-overlay');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

function confirmDialog(message) {
    return new Promise((resolve) => {
        const confirmed = confirm(message);
        resolve(confirmed);
    });
}

/**
 * ============================================
 * PATCH 3: FUNGSI PENERJEMAH ERROR SUPABASE
 * ============================================
 */
function parseSupabaseError(error) {
    if (!error || !error.message) {
        return ERROR_MESSAGES.UNKNOWN_ERROR;
    }

    const msg = error.message;
    const details = error.details || '';

    // 1. Cek Constraint KTP (Error yang Anda alami)
    if (msg.includes('unique_ktp_per_date') || details.includes('unique_ktp_per_date')) {
        return ERROR_MESSAGES.KTP_DUPLICATE_PER_DATE;
    }

    // 2. Cek Constraint KJP
    if (msg.includes('list_harian_kjp_tgl_order_uniq')) {
        return ERROR_MESSAGES.KJP_DUPLICATE_PER_DATE;
    }

    // 3. Cek Duplikasi Data Master
    if (msg.includes('data_master_no_kjp_key')) {
        return ERROR_MESSAGES.KJP_DUPLICATE;
    }
    if (msg.includes('data_master_nama_user_key')) {
        return ERROR_MESSAGES.NAMA_DUPLICATE;
    }

    // 4. Cek Error Umum Postgres (409 Conflict)
    if (msg.includes('duplicate key') || error.code === '23505') {
        return ERROR_MESSAGES.DUPLICATE_ENTRY;
    }

    // 5. Cek Validasi Panjang Karakter
    if (msg.includes('check_kjp_length')) return ERROR_MESSAGES.KJP_FORMAT;
    if (msg.includes('check_ktp_length')) return ERROR_MESSAGES.KTP_FORMAT;
    if (msg.includes('check_kk_length')) return ERROR_MESSAGES.KK_FORMAT;

    // 6. Error Jaringan
    if (msg.includes('network error') || msg.includes('Failed to fetch')) {
        return ERROR_MESSAGES.NETWORK_ERROR;
    }

    // Fallback: Jika error tidak dikenal, tampilkan aslinya (untuk debug)
    return msg;
}

/**
 * TAMBAHAN: Escape string untuk digunakan di dalam atribut JS (e.g. onclick)
 * FIX 4.4
 */
function escapeJs(str) {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * TAMBAHAN: Menambahkan hari ke tanggal ISO (YYYY-MM-DD)
 * FIX 3.7
 */
function addDaysToIsoDate(isoDate, days) {
    try {
        // Pastikan kita bekerja dengan UTC untuk menghindari masalah timezone
        const date = new Date(isoDate + 'T00:00:00Z');
        date.setUTCDate(date.getUTCDate() + days);
        return date.toISOString().split('T')[0];
    } catch (e) {
        console.error('Error adding days to date:', e);
        return isoDate;
    }
}

// ============================================
// END OF FILE
// ============================================

console.log('✅ utils.js (PATCHED) loaded successfully!');