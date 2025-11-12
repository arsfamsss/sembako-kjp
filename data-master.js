// ============================================
// data-master-FIXED-V2.js
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
    
    keyword = keyword.trim();
    
    // FIX 2.3: Search by name, kjp, ktp, kk
    // FIX 2.1: Hapus limit
    const { data, error } = await supabase
      .from(CONSTANTS.TABLES.DATA_MASTER)
      .select('*')
      .or(`nama_user.ilike.%${keyword}%,no_kjp.ilike.%${keyword}%,no_ktp.ilike.%${keyword}%,no_kk.ilike.%${keyword}%`)
      .order('nama_user', { ascending: true });
      // .limit(20); // Dihapus
    
    if (error) {
      console.error('❌ Search error:', error);
      throw error;
    }
    
    console.log(`✅ Found ${data?.length || 0} results`);
    return data || [];
  } catch (error) {
    console.error('❌ Error in searchDataMaster:', error.message);
    throw error;
  }
}

async function getDataMasterById(id) {
  try {
    console.log(`📋 Fetching data master ID: ${id}`);
    
    const { data, error } = await supabase
      .from(CONSTANTS.TABLES.DATA_MASTER)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('❌ Error:', error);
      throw error;
    }
    
    console.log('✅ Got data:', data?.id);
    return data;
  } catch (error) {
    console.error('❌ Error in getDataMasterById:', error.message);
    throw error;
  }
}

async function getDataMasterForDropdown() {
  try {
    console.log('📝 Fetching data master for dropdown...');
    
    const { data, error } = await supabase
      .from(CONSTANTS.TABLES.DATA_MASTER)
      .select('id, nama_user, no_kjp, no_ktp') // Ambil KTP juga
      .order('nama_user', { ascending: true })
      .limit(500); // Batas 500 untuk dropdown agar tidak lemot
    
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
      // FIX 2.4: Beri pesan error yang lebih baik
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
    // showAlert('success', 'Data berhasil disimpan'); // Dipindah ke app.js
    return data[0];
  } catch (error) {
    hideLoading();
    console.error('❌ Error in addDataMaster:', error.message);
    // showAlert('error', `Gagal: ${error.message}`); // Dipindah ke app.js
    throw error; // Biarkan app.js menangkap error
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
       // FIX 2.4: Beri pesan error yang lebih baik
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
    // showAlert('success', 'Data berhasil diubah'); // Dipindah ke app.js
    return data[0];
  } catch (error) {
    hideLoading();
    console.error('❌ Error in updateDataMaster:', error.message);
    // showAlert('error', `Gagal: ${error.message}`); // Dipindah ke app.js
    throw error; // Biarkan app.js menangkap error
  }
}

// ============================================
// DELETE FUNCTION
// ============================================

async function deleteDataMaster(id) {
  try {
    console.log('🗑️ Deleting data master:', id);
    
    // FIX 2.6: Konfirmasi dipindah ke app.js, tapi kita double confirm di sini
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
    return true; // Kembalikan true agar app.js bisa reload
  } catch (error) {
    hideLoading();
    console.error('❌ Error in deleteDataMaster:', error.message);
    showAlert('error', `Gagal: ${error.message}`);
    throw error; // Biarkan app.js menangkap error
  }
}

/**
 * TAMBAHAN: Bulk Delete Data Master
 * FIX 2.6
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


// ============================================
// EXPORT
// ============================================

console.log('✅ data-master-FIXED-V2.js (PATCHED) loaded successfully!');