// ============================================
// list-harian-v2.js
// CRUD Functions dengan Better Error Handling
// ============================================

console.log('Loading list-harian-v2.js...');

async function getListHarian(page = 1, filters = {}) {
    try {
        console.log(`📥 Fetching list harian page ${page}...`);

        const start = (page - 1) * CONSTANTS.PAGE_SIZE;
        const end = start + CONSTANTS.PAGE_SIZE - 1;

        let query = supabase
            .from(CONSTANTS.TABLES.LIST_HARIAN)
            .select('*', { count: 'exact' });

        // ✅ ADDED - Filter Status Order
        if (filters.status_order) {
            query = query.eq('status_order', filters.status_order);
        }

        // Filter Status
        if (filters.status_bayar) {
            query = query.eq('status_bayar', filters.status_bayar);
        }

        // FIX 3.3: Filter Tanggal
        if (filters.tgl_order) {
            query = query.eq('tgl_order', filters.tgl_order);
        }

        // Apply sorting
        const sortField = filters.sort_field || 'tgl_order';
        const sortAsc = filters.sort_asc !== undefined ? filters.sort_asc : false;

        const { data, error, count } = await query
            .order(sortField, { ascending: sortAsc })
            .order('id', { ascending: false })
            .range(start, end);

        if (error) {
            console.error('❌ Error:', error);
            throw error;
        }

        console.log(`✅ Got ${data?.length || 0} records`);

        return {
            data: data || [],
            count: data ? data.length : 0,
            total: count || 0,
            page: page,
            totalPages: Math.ceil((count || 0) / CONSTANTS.PAGE_SIZE),
        };
    } catch (error) {
        console.error('❌ Error in getListHarian:', error.message);
        showAlert('error', `Gagal memuat transaksi: ${error.message}`);
        throw error;
    }
}

/**
 * TAMBAHAN: Get ALL List Harian (untuk Export)
 * FIX 4.5
 */
async function getAllListHarian(filters = {}) {
    try {
        console.log('📥 Fetching ALL list harian for export...');

        let query = supabase
            .from(CONSTANTS.TABLES.LIST_HARIAN)
            .select('*');

        if (filters.status_bayar) {
            query = query.eq('status_bayar', filters.status_bayar);
        }
        if (filters.tgl_order) {
            query = query.eq('tgl_order', filters.tgl_order);
        }

        // Ambil semua data tanpa limit, order by tanggal
        const { data, error } = await query.order('tgl_order', { ascending: true });

        if (error) throw error;

        console.log(`✅ Fetched ${data?.length || 0} records for export`);
        return data || [];
    } catch (error) {
        console.error('❌ Error in getAllListHarian:', error.message);
        showAlert('error', `Gagal mengambil data export: ${error.message}`);
        throw error;
    }
}


async function searchListHarian(keyword) {
    try {
        console.log(`🔍 Searching list harian: ${keyword}`);

        if (!keyword || keyword.trim() === '') {
            return [];
        }

        // FIX 3.1: Hapus limit
        const { data, error } = await supabase
            .from(CONSTANTS.TABLES.LIST_HARIAN)
            .select('*')
            .ilike('nama_user', `%${keyword}%`)
            .order('tgl_order', { ascending: false });
        // .limit(20); // Dihapus

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

async function getListHarianById(id) {
    try {
        const { data, error } = await supabase
            .from(CONSTANTS.TABLES.LIST_HARIAN)
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

async function addListHarian(formData) {
    try {
        console.log('➕ Adding list harian');

        showLoading('Menyimpan transaksi...');

        const { data, error } = await supabase
            .from(CONSTANTS.TABLES.LIST_HARIAN)
            .insert([formData])
            .select();

        hideLoading();

        if (error) {
            console.error('❌ Error:', error);
            throw error;
        }

        // showAlert('success', 'Transaksi berhasil disimpan'); // Dipindah ke app.js
        return data[0];
    } catch (error) {
        hideLoading();
        console.error('❌ Error in addListHarian:', error.message);
        // showAlert('error', `Gagal: ${error.message}`); // Dipindah ke app.js
        throw error;
    }
}

/**
 * TAMBAHAN: Bulk Add List Harian
 * FIX 3.7
 */
async function bulkAddListHarian(transactions) {
    try {
        console.log(`➕ Bulk adding ${transactions.length} transactions`);

        // Tidak pakai loading, app.js yg handle

        const { data, error } = await supabase
            .from(CONSTANTS.TABLES.LIST_HARIAN)
            .insert(transactions)
            .select();

        if (error) throw error;

        console.log('✅ Bulk add successful');
        return data;
    } catch (error) {
        console.error('❌ Error in bulkAddListHarian:', error.message);
        showAlert('error', `Gagal simpan massal: ${error.message}`);
        throw error;
    }
}


async function updateListHarian(id, formData) {
    try {
        console.log('✏️ Updating list harian:', id);

        showLoading('Menyimpan perubahan...');

        const { data, error } = await supabase
            .from(CONSTANTS.TABLES.LIST_HARIAN)
            .update(formData)
            .eq('id', id)
            .select();

        hideLoading();

        if (error) throw error;

        // showAlert('success', 'Transaksi berhasil diubah'); // Dipindah ke app.js
        return data[0];
    } catch (error) {
        hideLoading();
        console.error('❌ Error in updateListHarian:', error.message);
        // showAlert('error', `Gagal: ${error.message}`); // Dipindah ke app.js
        throw error;
    }
}

async function updateStatusBayar(id, statusBayar) {
    try {
        console.log('🔄 Updating status:', statusBayar);

        const { data, error } = await supabase
            .from(CONSTANTS.TABLES.LIST_HARIAN)
            .update({ status_bayar: statusBayar })
            .eq('id', id)
            .select();

        if (error) throw error;

        showAlert('success', 'Status berhasil diubah');
        return data[0];
    } catch (error) {
        console.error('❌ Error:', error.message);
        showAlert('error', `Gagal: ${error.message}`);
        throw error;
    }
}

/**
 * GANTI: Bulk Update Status (Order & Bayar)
 * FIX 3.6
 */
async function bulkUpdateStatus(ids, updateObject) {
    try {
        console.log(`🔄 Bulk updating ${ids.length} records`);

        showLoading(`Mengubah ${ids.length} transaksi...`);

        const { error } = await supabase
            .from(CONSTANTS.TABLES.LIST_HARIAN)
            .update(updateObject) // Ganti
            .in('id', ids);

        hideLoading();

        if (error) throw error;

        showAlert('success', 'Status berhasil diubah');
        return true;
    } catch (error) {
        hideLoading();
        console.error('❌ Error:', error.message);
        showAlert('error', `Gagal: ${error.message}`);
        return false;
    }
}

async function deleteListHarian(id) {
    try {
        console.log('🗑️ Deleting list harian:', id);

        // Konfirmasi tetap di sini
        const confirmed = await confirmDialog('Apakah Anda yakin ingin menghapus transaksi ini?');
        if (!confirmed) return false;

        showLoading('Menghapus transaksi...');

        const { error } = await supabase
            .from(CONSTANTS.TABLES.LIST_HARIAN)
            .delete()
            .eq('id', id);

        hideLoading();

        if (error) throw error;

        showAlert('success', 'Transaksi berhasil dihapus');
        return true; // Kembalikan true agar app.js bisa reload
    } catch (error) {
        hideLoading();
        console.error('❌ Error:', error.message);
        showAlert('error', `Gagal: ${error.message}`);
        throw error; // Biarkan app.js menangkap error
    }
}

console.log('✅ list-harian-v2.js (PATCHED) loaded successfully!');