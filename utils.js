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
    if (!amount && amount !== 0) return 'Rp 0';

    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);
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

    const match = namaUser.match(/^(.+?)\s*\(/);
    if (match) {
        return match[1].trim();
    }

    return namaUser;
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