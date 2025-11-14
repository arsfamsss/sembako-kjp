// ============================================
// data-master-FIXED-V2.js (FINAL PATCH)
// CRUD Functions dengan Better Error Handling
// ============================================

console.log('Loading data-master-FIXED-V2.js...');

// ============================================
// READ FUNCTIONS
// ============================================

async function getDataMaster(page = 1) {
    try {
        console.log(`📥 Fetching data master page ${page}...`);

        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }

        const start = (page - 1) * CONSTANTS.PAGE_SIZE;
        const end = start + CONSTANTS.PAGE_SIZE - 1;

        console.log(`Query range: ${start} to ${end}`);

        const { data, error, count } = await supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .select('*', { count: 'exact' })
            .order('nama_user', { ascending: true })
            .range(start, end);

        if (error) {
            console.error('❌ Supabase error:', error);
            throw error;
        }

        console.log(`✅ Got ${data?.length || 0} records, total: ${count}`);

        return {
            data: data || [],
            count: data ? data.length : 0,
            total: count || 0,
            page: page,
            totalPages: Math.ceil((count || 0) / CONSTANTS.PAGE_SIZE),
        };
    } catch (error) {
        console.error('❌ Error in getDataMaster:', error.message);
        showAlert('error', `Gagal memuat data: ${error.message}`);
        throw error;
    }
}

async function searchDataMaster(keyword) {
    try {
        console.log(`🔍 Searching data master with keyword: ${keyword}`);

        if (!keyword || keyword.trim() === '') {
            return [];
        }

        // ✅ Normalisasi dan bersihkan keyword
        const normalizedKeyword = keyword
            .replace(/[()[\]{}]/g, '')
            .trim()
            .toLowerCase();

        console.log(`🔍 Normalized keyword: ${normalizedKeyword}`);

        // ✅ LOGIKA BARU: Cek apakah keyword adalah nomor atau nama
        const isNumericKeyword = /^\d+(\s+\d+)*$/.test(normalizedKeyword);
        const cleanNumeric = normalizedKeyword.replace(/\s+/g, '');

        console.log(`🔍 Is numeric: ${isNumericKeyword}`);

        let query = supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .select('id, nama_user, no_kjp, no_ktp, parent_name, no_kk');

        if (isNumericKeyword) {
            // ✅ UNTUK NOMOR: Cari sebagai string utuh (jangan split)
            console.log(`🔍 Search mode: NUMERIC (exact match)`);
            query = query.or(
                `no_kjp.ilike.%${cleanNumeric}%,` +
                `no_ktp.ilike.%${cleanNumeric}%,` +
                `no_kk.ilike.%${cleanNumeric}%`
            );
        } else {
            // ✅ UNTUK NAMA: Split dan cari yang mengandung SEMUA kata
            console.log(`🔍 Search mode: TEXT (split words)`);
            const keywords = normalizedKeyword.split(/\s+/).filter(k => k.length > 0);
            keywords.forEach(k => {
                query = query.or(`nama_user.ilike.%${k}%`);
            });
        }

        const { data: allResults, error } = await query;

        if (error) throw error;

        // ✅ Filter client-side
        let filtered = allResults || [];

        if (!isNumericKeyword) {
            // Untuk nama: filter yang mengandung SEMUA kata
            const keywords = normalizedKeyword.split(/\s+/).filter(k => k.length > 0);
            filtered = filtered.filter(item => {
                const fullName = `${item.nama_user} ${item.parent_name || ''}`.toLowerCase();
                return keywords.every(k => fullName.includes(k));
            });
        } else {
            // Untuk nomor: filter yang cocok
            filtered = filtered.filter(item => {
                const kjpClean = (item.no_kjp || '').replace(/\s+/g, '').toLowerCase();
                const ktpClean = (item.no_ktp || '').replace(/\s+/g, '').toLowerCase();
                const kkClean = (item.no_kk || '').replace(/\s+/g, '').toLowerCase();
                return kjpClean.includes(cleanNumeric) || ktpClean.includes(cleanNumeric) || kkClean.includes(cleanNumeric);
            });
        }

        console.log(`✅ Found ${filtered.length} results (dari ${allResults?.length || 0} total)`);
        return filtered;
    } catch (error) {
        console.error('❌ Error searching:', error.message);
        throw error;
    }
}



/**
 * Get single data master by ID (untuk pre-fill form transaksi)
 */
async function getDataMasterById(id) {
    try {
        console.log(`📝 Fetching data master by ID: ${id}`);

        const { data, error } = await supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .select('id, nama_user, no_kjp, no_ktp, no_kk, parent_name')
            .eq('id', id)
            .single();

        if (error) {
            console.error('❌ Error:', error);
            throw error;
        }

        console.log('✅ Got data master:', data);
        return data;
    } catch (error) {
        console.error('❌ Error in getDataMasterById:', error.message);
        throw error;
    }
}


async function getDataMasterForDropdown() {
    try {
        console.log('📝 Fetching data master for dropdown...');

        // Pastikan semua kolom not-null untuk list_harian diambil
        const { data, error } = await supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .select('id, nama_user, no_kjp, no_ktp, parent_name, no_kk') // MEMASTIKAN no_kk diambil
            .order('nama_user', { ascending: true })
            .limit(500);

        if (error) {
            console.error('❌ Error:', error);
            throw error;
        }

        console.log(`✅ Got ${data?.length || 0} items for dropdown`);
        return data || [];
    } catch (error) {
        console.error('❌ Error in getDataMasterForDropdown:', error.message);
        throw error;
    }
}

// ============================================
// CREATE FUNCTION
// ============================================

async function addDataMaster(formData) {
    try {
        console.log('➕ Adding new data master:', formData.nama_user);

        showLoading('Menyimpan data pelanggan...');

        const { data, error } = await supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .insert([
                {
                    nama_user: formData.nama_user.trim(),
                    parent_name: formData.parent_name.trim() || extractParentName(formData.nama_user),
                    no_kjp: sanitizeNumber(formData.no_kjp),
                    no_ktp: sanitizeNumber(formData.no_ktp),
                    no_kk: sanitizeNumber(formData.no_kk),
                    tgl_tambah: formData.tgl_tambah,
                },
            ])
            .select();

        hideLoading();

        if (error) {
            console.error('❌ Insert error:', error);
            if (error.message.includes('check_kjp_length')) {
                throw new Error(ERROR_MESSAGES.KJP_FORMAT);
            }
            if (error.message.includes('check_ktp_length')) {
                throw new Error(ERROR_MESSAGES.KTP_FORMAT);
            }
            if (error.message.includes('check_kk_length')) {
                throw new Error(ERROR_MESSAGES.KK_FORMAT);
            }
            if (error.message.includes('data_master_no_kjp_key')) {
                throw new Error(ERROR_MESSAGES.KJP_DUPLICATE);
            }
            if (error.message.includes('data_master_nama_user_key')) {
                throw new Error(ERROR_MESSAGES.NAMA_DUPLICATE);
            }
            throw error;
        }

        console.log('✅ Data added successfully');
        return data[0];
    } catch (error) {
        hideLoading();
        console.error('❌ Error in addDataMaster:', error.message);
        throw error;
    }
}

// ============================================
// UPDATE FUNCTION
// ============================================

async function updateDataMaster(id, formData) {
    try {
        console.log('✏️ Updating data master:', id);

        showLoading('Menyimpan perubahan...');

        const { data, error } = await supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .update({
                nama_user: formData.nama_user.trim(),
                parent_name: formData.parent_name.trim() || extractParentName(formData.nama_user),
                no_kjp: sanitizeNumber(formData.no_kjp),
                no_ktp: sanitizeNumber(formData.no_ktp),
                no_kk: sanitizeNumber(formData.no_kk),
                tgl_tambah: formData.tgl_tambah,
            })
            .eq('id', id)
            .select();

        hideLoading();

        if (error) {
            console.error('❌ Update error:', error);
            if (error.message.includes('check_kjp_length')) {
                throw new Error(ERROR_MESSAGES.KJP_FORMAT);
            }
            if (error.message.includes('check_ktp_length')) {
                throw new Error(ERROR_MESSAGES.KTP_FORMAT);
            }
            if (error.message.includes('check_kk_length')) {
                throw new Error(ERROR_MESSAGES.KK_FORMAT);
            }
            if (error.message.includes('data_master_no_kjp_key')) {
                throw new Error(ERROR_MESSAGES.KJP_DUPLICATE);
            }
            if (error.message.includes('data_master_nama_user_key')) {
                throw new Error(ERROR_MESSAGES.NAMA_DUPLICATE);
            }
            throw error;
        }

        console.log('✅ Data updated successfully');
        return data[0];
    } catch (error) {
        hideLoading();
        console.error('❌ Error in updateDataMaster:', error.message);
        throw error;
    }
}

// ============================================
// DELETE FUNCTION
// ============================================

async function deleteDataMaster(id) {
    try {
        console.log('🗑️ Deleting data master:', id);

        const confirmed = await confirmDialog('Apakah Anda yakin ingin menghapus data pelanggan ini? Data transaksi terkait akan terpengaruh.');
        if (!confirmed) return false;

        showLoading('Menghapus data...');

        const { error } = await supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .delete()
            .eq('id', id);

        hideLoading();

        if (error) {
            console.error('❌ Delete error:', error);
            throw error;
        }

        console.log('✅ Data deleted successfully');
        showAlert('success', 'Data berhasil dihapus');
        return true;
    } catch (error) {
        hideLoading();
        console.error('❌ Error in deleteDataMaster:', error.message);
        showAlert('error', `Gagal: ${error.message}`);
        throw error;
    }
}

/**
 * TAMBAHAN: Bulk Delete Data Master
 */
async function bulkDeleteDataMaster(ids) {
    try {
        console.log(`🗑️ Bulk deleting ${ids.length} data master...`);

        showLoading(`Menghapus ${ids.length} data...`);

        const { error } = await supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .delete()
            .in('id', ids);

        hideLoading();

        if (error) throw error;

        console.log('✅ Bulk delete successful');
        return true;
    } catch (error) {
        hideLoading();
        console.error('❌ Error in bulkDeleteDataMaster:', error.message);
        showAlert('error', `Gagal hapus massal: ${error.message}`);
        return false;
    }
}

// ============================================================
// ✅ ADDED - IMPORT CSV DATA MASTER FUNCTIONS
// ============================================================

let csvDataBuffer = []; // Buffer untuk simpan CSV data

/**
 * Handle CSV File Upload & Parse
 */
function handleCSVFileUpload(fileInput) {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const csv = e.target.result;
            const rows = csv.split('\n').filter(row => row.trim());

            // ✅ Parse CSV
            const parsedData = [];

            rows.forEach((row, index) => {
                // Skip header jika ada
                if (index === 0 && (row.includes('Nama') || row.includes('KJP'))) return;

                const cols = row.split(',').map(val => val.trim());
                const [nama, no_kjp, no_ktp, no_kk] = cols;

                // Validasi minimal
                if (!nama || !no_kjp) {
                    console.warn(`⚠️ Row ${index}: Nama atau NO KJP kosong, skip`);
                    return;
                }

                parsedData.push({
                    nama_user: nama,
                    no_kjp: no_kjp,
                    no_ktp: no_ktp || '',
                    no_kk: no_kk || '',
                    parent_name: 'Import CSV',
                    tgl_tambah: new Date().toISOString().split('T')
                });
            });

            // Store untuk digunakan saat submit
            csvDataBuffer = parsedData;

            // ✅ Show Preview
            showCSVPreview(parsedData);

            // ✅ Enable Import Button
            document.getElementById('importCSVButton').disabled = false;

            console.log(`✅ CSV parsed: ${parsedData.length} data`);

        } catch (error) {
            console.error('❌ Error parsing CSV:', error);
            showAlert('error', 'Error parsing CSV: ' + error.message);
        }
    };

    reader.readAsText(file);
}

/**
 * Show CSV Preview Table
 */
function showCSVPreview(data) {
    const previewDiv = document.getElementById('csvPreview');
    const table = document.getElementById('csvPreviewTable');

    let html = '<table class="table table-sm table-bordered"><thead>';
    html += '<tr><th>No</th><th>Nama</th><th>NO KJP</th><th>NO KTP</th><th>NO KK</th></tr>';
    html += '</thead><tbody>';

    data.slice(0, 10).forEach((item, idx) => {
        html += `<tr>
            <td>${idx + 1}</td>
            <td>${item.nama_user}</td>
            <td>${item.no_kjp}</td>
            <td>${item.no_ktp}</td>
            <td>${item.no_kk}</td>
        </tr>`;
    });

    if (data.length > 10) {
        html += `<tr><td colspan="5" class="text-center text-muted">... ${data.length - 10} data lainnya</td></tr>`;
    }

    html += '</tbody></table>';

    table.innerHTML = html;
    previewDiv.style.display = 'block';
}

/**
 * Submit CSV Import
 */
async function submitCSVImport() {
    if (csvDataBuffer.length === 0) {
        showAlert('warning', 'Tidak ada data untuk diimport');
        return;
    }

    try {
        showLoading(`Memproses ${csvDataBuffer.length} data...`);

        // ✅ Validasi NO KJP tidak duplicate
        const errors = [];
        const successData = [];

        for (let i = 0; i < csvDataBuffer.length; i++) {
            const item = csvDataBuffer[i];

            // Cek apakah NO KJP sudah ada di database
            const { data: existing, error } = await supabase
                .from(CONSTANTS.TABLES.DATA_MASTER)
                .select('id')
                .eq('no_kjp', item.no_kjp)
                .maybeSingle();

            if (existing) {
                errors.push({
                    row: i + 1,
                    nama: item.nama_user,
                    no_kjp: item.no_kjp,
                    error: 'NO KJP sudah terdaftar'
                });
                console.warn(`⚠️ Row ${i + 1}: NO KJP ${item.no_kjp} sudah ada`);
            } else {
                successData.push(item);
            }
        }

        // ✅ Insert yang success
        if (successData.length > 0) {
            showLoading(`Menyimpan ${successData.length} data...`);

            const { data, error } = await supabase
                .from(CONSTANTS.TABLES.DATA_MASTER)
                .insert(successData);

            if (error) {
                hideLoading();
                console.error('❌ Insert error:', error);
                showAlert('error', 'Gagal insert data: ' + error.message);
                return;
            }
        }

        hideLoading();

        // ✅ Show Summary
        const summary = `
            <div>
                <strong>✅ Import CSV Selesai!</strong>
                <hr>
                <strong>Berhasil:</strong> ${successData.length} data<br>
                <strong>Gagal:</strong> ${errors.length} data<br>
                <strong>Total:</strong> ${csvDataBuffer.length} data
            </div>
        `;

        showAlert(successData.length > 0 ? 'success' : 'warning', summary);

        if (errors.length > 0) {
            console.log('📋 Detail Errors:');
            console.table(errors);
        }

        // ✅ Tutup modal & refresh table
        const modalElement = document.getElementById('importCSVModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();

        if (successData.length > 0) {
            await loadDataMaster(1);
        }

        // Reset buffer
        csvDataBuffer = [];

    } catch (error) {
        hideLoading();
        console.error('❌ Error:', error);
        showAlert('error', 'Error: ' + error.message);
    }
}

// ============================================================
// END OF IMPORT CSV DATA MASTER FUNCTIONS
// ============================================================


// ============================================
// EXPORT
// ============================================

console.log('✅ data-master.js (FINAL PATCH) loaded successfully!');