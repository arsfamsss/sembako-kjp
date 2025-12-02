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
        console.log(`🔍 Searching data master (Smart Search): ${keyword}`);

        if (!keyword || keyword.trim() === '') {
            return [];
        }

        // 1. Normalisasi Keyword (Hapus simbol aneh, ganti spasi ganda dengan spasi tunggal)
        const cleanKeyword = keyword.replace(/[()\[\]{},]/g, ' ').trim();

        // 2. Pecah menjadi kata-kata terpisah (Split by space)
        // Contoh: "3173 0145" menjadi ['3173', '0145']
        const words = cleanKeyword.split(/\s+/).filter(w => w.length > 0);

        if (words.length === 0) return [];

        // 3. Build Query Database (OR Logic)
        // Cari baris yang mengandung SALAH SATU kata kunci di kolom manapun
        let query = supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .select('id, nama_user, no_kjp, no_ktp, parent_name, no_kk, tgl_tambah');

        const orConditions = [];
        words.forEach(w => {
            orConditions.push(`nama_user.ilike.%${w}%`);
            orConditions.push(`parent_name.ilike.%${w}%`);
            orConditions.push(`no_kjp.ilike.%${w}%`);
            orConditions.push(`no_ktp.ilike.%${w}%`);
            orConditions.push(`no_kk.ilike.%${w}%`);
        });

        // Gabung kondisi dengan koma (syntax Supabase untuk OR)
        query = query.or(orConditions.join(','));

        // Execute query
        const { data, error } = await query.limit(100); // Limit biar gak berat

        if (error) throw error;

        // 4. Filter Strict di JavaScript (AND Logic)
        // Pastikan hasil yang muncul mengandung SEMUA kata yang diketik user
        const filteredData = (data || []).filter(item => {
            // Gabungkan semua field jadi satu string target pencarian
            const searchTarget = `${item.nama_user} ${item.parent_name || ''} ${item.no_kjp} ${item.no_ktp || ''} ${item.no_kk || ''}`.toLowerCase();

            // Cek apakah setiap kata input ada di dalam target
            return words.every(w => searchTarget.includes(w.toLowerCase()));
        });

        console.log(`✅ Found ${filteredData.length} results (Filtered from ${data?.length || 0})`);
        return filteredData;

    } catch (error) {
        console.error('❌ Error searching data master:', error.message);
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

        // ========== HELPER ==========

        const extractSmartParent = (fullName) => {
            if (!fullName) return '';
            let parent = fullName;
            if (fullName.includes('(')) {
                parent = fullName.split('(')[0];
            }
            return parent.trim().toLowerCase().split(' ').map(word => {
                return word.charAt(0).toUpperCase() + word.slice(1);
            }).join(' ');
        };

        const cleanNumber = (val) => {
            if (!val) return '';
            const str = String(val).trim();
            if (str.endsWith('.0')) return str.slice(0, -2);
            return str.replace(/[^0-9]/g, '');
        };

        const isIdentical = (csvRow, dbRow) => {
            return csvRow.nama_user === dbRow.nama_user &&
                csvRow.no_kjp === dbRow.no_kjp &&
                csvRow.no_ktp === dbRow.no_ktp &&
                csvRow.no_kk === dbRow.no_kk;
        };

        // ========== FASE 1: SIAPKAN DATA DARI CSV ==========

        const validRows = [];
        csvDataBuffer.forEach((row, idx) => {
            const keys = Object.keys(row);
            const keyNama = keys.find(k => k.toLowerCase().includes('nama'));
            const keyKjp = keys.find(k => k.toLowerCase().includes('kjp'));
            const keyKtp = keys.find(k => k.toLowerCase().includes('ktp'));
            const keyKk = keys.find(k => k.toLowerCase().includes('kk'));

            if (!keyNama || !keyKjp) return;

            const kjpClean = cleanNumber(row[keyKjp]);
            const namaClean = row[keyNama] ? row[keyNama].trim() : '';

            if (kjpClean.length >= 5 && namaClean) {
                validRows.push({
                    _rowIndex: idx + 1,
                    no_kjp: kjpClean,
                    nama_user: namaClean,
                    parent_name: extractSmartParent(namaClean),
                    no_ktp: cleanNumber(row[keyKtp]),
                    no_kk: cleanNumber(row[keyKk]),
                    tgl_tambah: new Date().toISOString().split('T')[0]
                });
            }
        });

        if (validRows.length === 0) {
            hideLoading();
            btn.disabled = false;
            btn.innerHTML = originalText;
            return showAlert('error', 'Tidak ada data valid. Pastikan kolom Nama & KJP terisi.');
        }

        // ========== FASE 2: AMBIL DATA EXISTING BERDASARKAN KJP ==========

        const allKjp = validRows.map(r => r.no_kjp);
        const { data: existingData, error: fetchError } = await supabase
            .from('data_master')
            .select('id, no_kjp, nama_user, no_ktp, no_kk')
            .in('no_kjp', allKjp);

        if (fetchError) {
            hideLoading();
            btn.disabled = false;
            btn.innerHTML = originalText;
            return showAlert('error', 'Gagal cek data existing: ' + fetchError.message);
        }

        const existingMap = {};
        (existingData || []).forEach(row => {
            existingMap[row.no_kjp] = row;
        });

        // ========== FASE 3: KATEGORI INSERT / UPDATE / SKIP ==========

        const toInsert = [];
        const toUpdate = [];
        const skipped = []; // simpan info baris yang di-skip

        for (const csvRow of validRows) {
            const existing = existingMap[csvRow.no_kjp];

            if (!existing) {
                // KJP belum ada -> INSERT
                toInsert.push(csvRow);
            } else if (isIdentical(csvRow, existing)) {
                // Data identik -> SKIP
                skipped.push({
                    rowIndex: csvRow._rowIndex,
                    reason: 'Data identik 100% (nama, no_kjp, no_ktp, no_kk)'
                });
            } else {
                // KJP sama, ada field beda -> UPDATE
                toUpdate.push({
                    ...csvRow,
                    id: existing.id
                });
            }
        }

        // ========== FASE 4: EKSEKUSI INSERT ==========

        let insertSuccess = 0;
        let insertError = 0;
        if (toInsert.length > 0) {
            const BATCH = 100;
            for (let i = 0; i < toInsert.length; i += BATCH) {
                const chunk = toInsert.slice(i, i + BATCH);

                // ✅ FIX: Hanya deklarasi sekali, buang _rowIndex
                const cleanChunk = chunk.map(r => {
                    const { _rowIndex, ...rest } = r;
                    return rest;
                });

                const { error } = await supabase
                    .from('data_master')
                    .insert(cleanChunk);

                if (error) {
                    console.error('Insert error:', error);
                    insertError += chunk.length;
                } else {
                    insertSuccess += chunk.length;
                }
            }
        }

        // ========== FASE 5: EKSEKUSI UPDATE ==========

        let updateSuccess = 0;
        let updateError = 0;
        if (toUpdate.length > 0) {
            const BATCH = 100;
            for (let i = 0; i < toUpdate.length; i += BATCH) {
                const chunk = toUpdate.slice(i, i + BATCH);

                // ✅ FIX: Buang _rowIndex sebelum upsert
                const cleanChunk = chunk.map(r => {
                    const { _rowIndex, ...rest } = r;
                    return rest;
                });

                const { error } = await supabase
                    .from('data_master')
                    .upsert(cleanChunk, { onConflict: 'id' });

                if (error) {
                    console.error('Update error:', error);
                    updateError += chunk.length;
                } else {
                    updateSuccess += chunk.length;
                }
            }
        }

        // ========== FASE 6: SELESAI & LAPORAN ==========

        hideLoading();
        btn.disabled = false;
        btn.innerHTML = originalText;

        // optional: tutup modal import
        const modalEl = document.getElementById('importCSVModal');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        let msg = '';
        msg += `Berhasil INSERT: ${insertSuccess}\n`;
        msg += `Berhasil UPDATE: ${updateSuccess}\n`;
        msg += `Skip (identik): ${skipped.length}\n`;

        if (skipped.length > 0) {
            msg += `\nDetail skip:\n`;
            skipped.slice(0, 10).forEach(s =>
                msg += `- Baris ${s.rowIndex}: ${s.reason}\n`
            );
            if (skipped.length > 10) {
                msg += `... dan ${skipped.length - 10} baris lain.\n`;
            }
        }

        const totalError = insertError + updateError;
        if (totalError > 0) {
            msg += `\nGagal proses: ${totalError}`;
            showAlert('warning', msg);
        } else {
            showAlert('success', msg);
        }

        // reload tabel
        if (typeof loadDataMaster === 'function') {
            await loadDataMaster(1);
        }

    } catch (err) {
        console.error('Error import CSV:', err);
        hideLoading();
        const btn = document.getElementById('importCSVButton');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Import Data';
        }
        showAlert('error', 'Gagal import: ' + err.message);
    }
}

// ============================================
// END OF FILE
// ============================================

console.log('✅ data-master.js (FIXED CSV PARSER) loaded successfully!');
