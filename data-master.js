// ============================================
// data-master.js (FULL VERSION - FIXED CSV PARSER)
// ============================================

console.log('Loading data-master.js...');

// ============================================
// 1. CRUD FUNCTIONS (STANDARD)
// ============================================

async function getDataMaster(page = 1, sortField = 'nama_user', sortAsc = true) {
    try {
        console.log(`📥 Fetching data master page ${page}...`);

        const start = (page - 1) * CONSTANTS.PAGE_SIZE;
        const end = start + CONSTANTS.PAGE_SIZE - 1;

        const { data, error, count } = await supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .select('*', { count: 'exact' })
            .order(sortField, { ascending: sortAsc })
            .range(start, end);

        if (error) throw error;

        return {
            data: data || [],
            count: data ? data.length : 0,
            total: count || 0,
            page: page,
            totalPages: Math.ceil((count || 0) / CONSTANTS.PAGE_SIZE),
        };
    } catch (error) {
        console.error('❌ Error in getDataMaster:', error.message);
        throw error;
    }
}

async function getAllDataMaster() {
    try {
        const { data, error } = await supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .select('*')
            .order('nama_user', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('❌ Error in getAllDataMaster:', error.message);
        return [];
    }
}

async function searchDataMaster(keyword) {
    try {
        console.log(`🔍 Searching data master: ${keyword}`);

        if (!keyword || keyword.trim() === '') {
            return [];
        }

        const { data, error } = await supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .select('*')
            .or(`nama_user.ilike.%${keyword}%,no_kjp.ilike.%${keyword}%,no_ktp.ilike.%${keyword}%,no_kk.ilike.%${keyword}%`)
            .limit(50);

        if (error) throw error;
        return data || [];

    } catch (error) {
        console.error('❌ Error searchDataMaster:', error.message);
        throw error;
    }
}

async function getDataMasterById(id) {
    try {
        const { data, error } = await supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('❌ Error getDataMasterById:', error.message);
        throw error;
    }
}

async function addDataMaster(formData) {
    try {
        showLoading('Menyimpan data pelanggan...');
        const { data, error } = await supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .insert([formData])
            .select();
        hideLoading();
        if (error) throw error;
        return data[0];
    } catch (error) {
        hideLoading();
        console.error('❌ Error addDataMaster:', error.message);
        throw error;
    }
}

async function updateDataMaster(id, formData) {
    try {
        showLoading('Mengupdate data pelanggan...');
        const { data, error } = await supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .update(formData)
            .eq('id', id)
            .select();
        hideLoading();
        if (error) throw error;
        return data[0];
    } catch (error) {
        hideLoading();
        console.error('❌ Error updateDataMaster:', error.message);
        throw error;
    }
}

async function deleteDataMaster(id) {
    try {
        const confirmed = await confirmDialog('Apakah Anda yakin ingin menghapus pelanggan ini?');
        if (!confirmed) return false;
        showLoading('Menghapus data...');
        const { error } = await supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .delete()
            .eq('id', id);
        hideLoading();
        if (error) throw error;
        showAlert('success', 'Data pelanggan berhasil dihapus');
        return true;
    } catch (error) {
        hideLoading();
        console.error('❌ Error deleteDataMaster:', error.message);
        showAlert('error', `Gagal hapus: ${error.message}`);
        return false;
    }
}

async function bulkDeleteDataMaster(ids) {
    try {
        showLoading(`Menghapus ${ids.length} pelanggan...`);
        const { error } = await supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .delete()
            .in('id', ids);
        hideLoading();
        if (error) throw error;
        return true;
    } catch (error) {
        hideLoading();
        console.error('❌ Error bulkDeleteDataMaster:', error.message);
        showAlert('error', `Gagal hapus massal: ${error.message}`);
        return false;
    }
}

async function getDataMasterForDropdown() {
    try {
        const { data, error } = await supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .select('id, nama_user, no_kjp, no_ktp, parent_name, no_kk')
            .order('nama_user', { ascending: true })
            .limit(1000);
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('❌ Error getDataMasterForDropdown:', error.message);
        return [];
    }
}

// ============================================
// 2. CSV IMPORT FUNCTIONS (FIXED PARSER & LOGIC)
// ============================================

let csvDataBuffer = [];

function handleCSVFileUpload(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {
        const text = e.target.result;
        const rows = text.split('\n');

        // --- [FIXED] --- 
        // Header: Split by comma saja (aman dari spasi)
        const headers = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));

        csvDataBuffer = [];

        const previewLimit = 10;
        let previewHtml = '<table class="table table-sm table-bordered"><thead><tr>';

        headers.forEach(h => previewHtml += `<th>${h}</th>`);
        previewHtml += '</tr></thead><tbody>';

        for (let i = 1; i < rows.length; i++) {
            if (!rows[i].trim()) continue;

            // --- [FIXED] PARSER CSV YANG LEBIH AMAN ---
            // Regex ini memisahkan berdasarkan koma, TAPI mengabaikan koma di dalam tanda kutip.
            // Dan yang paling penting: TIDAK MEMECAH SPASI.
            // "Adnan ( Bu Tini)" akan dianggap 1 kolom utuh.
            const cols = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));

            if (cols.length < headers.length) continue; // Skip baris rusak

            const rowData = {};

            headers.forEach((h, index) => {
                rowData[h] = cols[index] || '';
            });

            csvDataBuffer.push(rowData);

            if (i <= previewLimit) {
                previewHtml += '<tr>';
                cols.forEach(c => previewHtml += `<td>${c}</td>`);
                previewHtml += '</tr>';
            }
        }

        previewHtml += '</tbody></table>';

        if (csvDataBuffer.length > previewLimit) {
            previewHtml += `<p class="text-muted mt-2">... dan ${csvDataBuffer.length - previewLimit} baris lainnya.</p>`;
        }

        const previewDiv = document.getElementById('csvPreview');
        const previewTable = document.getElementById('csvPreviewTable');
        const btn = document.getElementById('importCSVButton');

        if (previewDiv) previewDiv.style.display = 'block';
        if (previewTable) previewTable.innerHTML = previewHtml;
        if (btn) btn.disabled = false;

        showAlert('info', `File CSV dimuat: ${csvDataBuffer.length} baris data ditemukan.`);
    };

    reader.readAsText(file);
}

/**
 * Handle submit CSV Import (UPSERT + SMART PARENT)
 */
async function submitCSVImport() {
    if (!csvDataBuffer || csvDataBuffer.length === 0) {
        return showAlert('warning', 'Tidak ada data untuk diimport');
    }

    try {
        const btn = document.getElementById('importCSVButton');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

        showLoading(`Memproses ${csvDataBuffer.length} data...`);

        // --- HELPER FUNCTIONS ---
        const extractSmartParent = (fullName) => {
            if (!fullName) return '';
            let parent = fullName;
            if (fullName.includes('(')) {
                parent = fullName.split('(')[0]; // Ambil sebelum kurung
            }
            // Title Case
            return parent.trim().toLowerCase().split(/\s+/).map(word => {
                return word.charAt(0).toUpperCase() + word.slice(1);
            }).join(' ');
        };

        const cleanNumber = (val) => {
            if (!val) return '';
            const str = String(val).trim();
            if (str.endsWith('.0')) return str.slice(0, -2);
            return str.replace(/[^0-9]/g, '');
        };

        // --- PREPARE DATA ---
        const validRows = [];

        for (let row of csvDataBuffer) {
            // Flexible Key Search (Case Insensitive)
            const keys = Object.keys(row);
            const keyNama = keys.find(k => k.toLowerCase().includes('nama'));
            const keyKjp = keys.find(k => k.toLowerCase().includes('kjp'));
            const keyKtp = keys.find(k => k.toLowerCase().includes('ktp'));
            const keyKk = keys.find(k => k.toLowerCase().includes('kk'));

            if (keyNama && keyKjp) {
                const kjpClean = cleanNumber(row[keyKjp]);
                const namaClean = row[keyNama] ? row[keyNama].trim() : '';

                // Validasi Data
                if (kjpClean.length >= 5 && namaClean) {
                    const smartParent = extractSmartParent(namaClean);

                    validRows.push({
                        no_kjp: kjpClean,           // Key
                        nama_user: namaClean,       // Update Nama (Full)
                        parent_name: smartParent,   // Update Parent (Clean)
                        no_ktp: cleanNumber(row[keyKtp] || ''),
                        no_kk: cleanNumber(row[keyKk] || ''),
                        tgl_tambah: new Date().toISOString().split('T')[0]
                    });
                }
            }
        }

        if (validRows.length === 0) {
            hideLoading();
            btn.disabled = false;
            btn.innerHTML = originalText;
            return showAlert('error', 'Tidak ada data valid. Cek kolom Nama & KJP.');
        }

        console.log(`🚀 Melakukan UPSERT untuk ${validRows.length} data...`);

        // --- BATCH UPSERT ---
        const BATCH_SIZE = 100;
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
            const chunk = validRows.slice(i, i + BATCH_SIZE);

            // Upsert Logic: Jika KJP sama, UPDATE. Jika beda, INSERT.
            const { error } = await supabase
                .from(CONSTANTS.TABLES.DATA_MASTER)
                .upsert(chunk, { onConflict: 'no_kjp' });

            if (error) {
                console.error('Batch Error:', error);
                errorCount += chunk.length;
            } else {
                successCount += chunk.length;
            }
        }

        hideLoading();
        btn.disabled = false;
        btn.innerHTML = originalText;

        const modalEl = document.getElementById('importCSVModal');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        await loadDataMaster(1);

        if (errorCount > 0) {
            showAlert('warning', `Selesai. Berhasil: ${successCount}, Gagal: ${errorCount}`);
        } else {
            showAlert('success', `Sukses! ${successCount} data berhasil diperbarui.`);
        }

    } catch (error) {
        hideLoading();
        console.error('Error import CSV:', error);
        showAlert('error', 'Gagal import: ' + error.message);

        const btn = document.getElementById('importCSVButton');
        if (btn) btn.disabled = false;
    }
}

// ============================================
// END OF FILE
// ============================================

console.log('✅ data-master.js (FIXED CSV PARSER) loaded successfully!');