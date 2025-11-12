// ============================================
// app.js (FIXED & REFACTORED)
// Main Application Logic & Event Handlers
// ============================================

// Global State
let currentPageDataMaster = 1;
let currentPageListHarian = 1;
let currentPageRekap = 1;
let selectedTransaksiIds = [];
let selectedDataMasterIds = []; // Untuk bulk delete/add

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize aplikasi saat halaman dimuat
 */
async function initializeApp() {
  try {
    console.log('🚀 Initializing Sembako KJP App...');
    
    // Set user info
    document.getElementById('user-info').textContent = 'Admin User';
    
    // Load initial data
    await loadDataMaster();
    await loadListHarian();
    await loadRekap();
    await loadDashboard();
    
    console.log('✅ App initialized successfully!');
  } catch (error) {
    console.error('❌ Error initializing app:', error);
    showAlert('error', 'Gagal menginisialisasi aplikasi');
  }
}

/**
 * Event listener untuk tab changes
 */
document.addEventListener('DOMContentLoaded', function () {
  initializeApp();
  
  // Tab change listeners
  const dashboardTab = document.getElementById('dashboard-tab');
  const dataMasterTab = document.getElementById('data-master-tab');
  const listHarianTab = document.getElementById('list-harian-tab');
  const rekapTab = document.getElementById('rekap-tab');
  
  if (dashboardTab) dashboardTab.addEventListener('shown.bs.tab', loadDashboard);
  if (dataMasterTab) dataMasterTab.addEventListener('shown.bs.tab', () => loadDataMaster(currentPageDataMaster));
  if (listHarianTab) listHarianTab.addEventListener('shown.bs.tab', () => loadListHarian(currentPageListHarian));
  if (rekapTab) rekapTab.addEventListener('shown.bs.tab', () => loadRekap(currentPageRekap));
});

// ============================================
// DASHBOARD FUNCTIONS
// ============================================

/**
 * Load dashboard data (KPI & Statistics)
 */
async function loadDashboard() {
  try {
    const stats = await getRekapStatistics();
    renderRekapKPI(stats);
    console.log('📊 Dashboard loaded:', stats);
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

// ============================================
// DATA MASTER FUNCTIONS
// ============================================

/**
 * Load data master ke table
 */
async function loadDataMaster(page = 1) {
  try {
    currentPageDataMaster = page;
    const result = await getDataMaster(page);
    
    // Render table
    let html = '';
    result.data.forEach((item, index) => {
      const rowNum = (page - 1) * CONSTANTS.PAGE_SIZE + index + 1;
      html += `
        <tr>
          <td>
            <input type="checkbox" class="dm-checkbox" value="${item.id}" onchange="updateBulkSelectPanelDataMaster()">
          </td>
          <td>${rowNum}</td>
          <td><strong>${item.nama_user}</strong></td>
          <td>${item.parent_name}</td>
          <td><small>${formatNomor(item.no_kjp)}</small></td>
          <td><small>${formatNomor(item.no_ktp)}</small></td>
          <td><small>${formatDateToDisplay(item.tgl_tambah)}</small></td>
          <td class="text-center">
            <button class="btn btn-sm btn-warning" onclick="editDataMaster('${item.id}')" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="handleDeleteDataMaster('${item.id}')" title="Hapus">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });
    
    document.getElementById('data-master-table-body').innerHTML = html;
    
    // Render pagination
    renderPagination(result, 'data-master-pagination', loadDataMaster);
    
    // Clear bulk selection
    clearSelectAllDataMaster();
  } catch (error) {
    console.error('Error loading data master:', error);
  }
}

/**
 * Handle search data master
 */
async function handleSearchDataMaster(keyword) {
  try {
    if (!keyword || keyword.trim() === '') {
      await loadDataMaster(1);
      return;
    }
    
    const results = await searchDataMaster(keyword);
    
    let html = '';
    results.forEach((item, index) => {
      html += `
        <tr>
          <td>
            <input type="checkbox" class="dm-checkbox" value="${item.id}" onchange="updateBulkSelectPanelDataMaster()">
          </td>
          <td>${index + 1}</td>
          <td><strong>${item.nama_user}</strong></td>
          <td>${item.parent_name}</td>
          <td><small>${formatNomor(item.no_kjp)}</small></td>
          <td><small>${formatNomor(item.no_ktp)}</small></td>
          <td><small>${formatDateToDisplay(item.tgl_tambah)}</small></td>
          <td class="text-center">
            <button class="btn btn-sm btn-warning" onclick="editDataMaster('${item.id}')" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="handleDeleteDataMaster('${item.id}')" title="Hapus">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });
    
    document.getElementById('data-master-table-body').innerHTML = html;
    document.getElementById('data-master-pagination').innerHTML = ''; // Hapus pagination saat search
  } catch (error) {
    console.error('Error searching data master:', error);
  }
}

/**
 * Reset form data master (untuk add)
 */
function resetFormDataMaster() {
  document.getElementById('data-master-id').value = '';
  document.getElementById('formDataMaster').reset();
  document.getElementById('formDataMasterTitle').textContent = 'Tambah Pelanggan Baru';
  document.getElementById('parent_name').value = '';
  
  // Auto-update parent name
  const namaUserEl = document.getElementById('nama_user');
  namaUserEl.removeEventListener('blur', updateParentName); // Hapus listener lama
  namaUserEl.addEventListener('blur', updateParentName); // Tambah listener baru

  // Set default dan max tanggal ke hari ini (FIX 5.1)
  const today = new Date().toISOString().split('T')[0];
  const tglTambahEl = document.getElementById('tgl_tambah');
  tglTambahEl.setAttribute('max', today);
  tglTambahEl.value = today;
}

function updateParentName() {
  document.getElementById('parent_name').value = extractParentName(this.value);
}

/**
 * Edit data master (load data ke form)
 */
async function editDataMaster(id) {
  try {
    const data = await getDataMasterById(id);
    
    document.getElementById('data-master-id').value = data.id;
    document.getElementById('nama_user').value = data.nama_user;
    document.getElementById('parent_name').value = data.parent_name;
    document.getElementById('no_kjp').value = data.no_kjp;
    document.getElementById('no_ktp').value = data.no_ktp;
    document.getElementById('no_kk').value = data.no_kk;
    
    // FIX: input type="date" harus pakai format YYYY-MM-DD
    document.getElementById('tgl_tambah').value = data.tgl_tambah; 
    
    document.getElementById('formDataMasterTitle').textContent = 'Edit Pelanggan';
    
    const modal = new bootstrap.Modal(document.getElementById('formDataMasterModal'));
    modal.show();
  } catch (error) {
    console.error('Error editing data master:', error);
    showAlert('error', 'Gagal memuat data pelanggan');
  }
}

/**
 * Handle save (add/update) data master (DENGAN VALIDASI)
 */
async function handleSaveDataMaster() {
  try {
    const id = document.getElementById('data-master-id').value;
    const formData = {
      nama_user: document.getElementById('nama_user').value.trim(),
      no_kjp: document.getElementById('no_kjp').value,
      no_ktp: document.getElementById('no_ktp').value,
      no_kk: document.getElementById('no_kk').value,
      tgl_tambah: document.getElementById('tgl_tambah').value,
      parent_name: document.getElementById('parent_name').value.trim() || extractParentName(document.getElementById('nama_user').value.trim()),
    };

    // --- VALIDASI INPUT (FIX 2.4, 5.1) ---
    let validation = validateNama(formData.nama_user);
    if (!validation.valid) return showAlert('error', validation.error);
    
    validation = validateKJP(formData.no_kjp);
    if (!validation.valid) return showAlert('error', validation.error);
    
    validation = validateKTP(formData.no_ktp);
    if (!validation.valid) return showAlert('error', validation.error);
    
    validation = validateKK(formData.no_kk);
    if (!validation.valid) return showAlert('error', validation.error);
    
    validation = validateNomorBerbeda(formData.no_kjp, formData.no_ktp, formData.no_kk);
    if (!validation.valid) return showAlert('error', validation.error);
    
    if (!formData.tgl_tambah) {
      return showAlert('error', 'Tanggal tambah wajib diisi');
    }
    
    // --- Cek Duplikasi (Database) ---
    showLoading('Memeriksa data...');
    const excludeId = id ? id : null;
    
    if (await checkNamaExists(formData.nama_user, excludeId)) {
      hideLoading();
      return showAlert('error', 'Nama user ini sudah terdaftar');
    }
    
    if (await checkKJPExists(formData.no_kjp, excludeId)) {
      hideLoading();
      return showAlert('error', 'No. KJP ini sudah terdaftar');
    }
    
    hideLoading();
    
    // --- Simpan Data ---
    let success = false;
    if (id) {
      success = await updateDataMaster(id, formData);
    } else {
      success = await addDataMaster(formData);
    }
    
    if (success) {
      bootstrap.Modal.getInstance(document.getElementById('formDataMasterModal')).hide();
      await loadDataMaster(1); // Muat ulang dari halaman 1
      showAlert('success', id ? 'Data berhasil diubah' : 'Data berhasil disimpan');
    }
    // Jika 'success' false, fungsi di data-master.js sudah menampilkan alert error
    
  } catch (error) {
    hideLoading();
    console.error('Error saving data master:', error);
    showAlert('error', `Gagal menyimpan: ${error.message}`);
  }
}

/**
 * Handle delete data master (FIX 2.6 - reload table)
 */
async function handleDeleteDataMaster(id) {
  try {
    const success = await deleteDataMaster(id); // Fungsi ini sudah ada confirm()
    if (success) {
      await loadDataMaster(currentPageDataMaster); // Reload tabel di halaman saat ini
    }
  } catch (error) {
    console.error('Error handling delete data master:', error);
  }
}

/**
 * Toggle select all checkbox
 */
function toggleSelectAllDataMaster() {
  const checkboxes = document.querySelectorAll('.dm-checkbox');
  const selectAll = document.getElementById('select-all-dm');
  
  checkboxes.forEach(checkbox => {
    checkbox.checked = selectAll.checked;
  });
  
  updateBulkSelectPanelDataMaster();
}

/**
 * Update bulk select panel visibility (Data Master)
 */
function updateBulkSelectPanelDataMaster() {
  const checkboxes = document.querySelectorAll('.dm-checkbox:checked');
  selectedDataMasterIds = Array.from(checkboxes).map(cb => cb.value);
  
  const panel = document.getElementById('data-master-bulk-panel');
  const countEl = document.getElementById('dm-selected-count');
  
  if (selectedDataMasterIds.length > 0) {
    panel.style.display = 'block';
    countEl.textContent = selectedDataMasterIds.length;
  } else {
    panel.style.display = 'none';
    selectedDataMasterIds = [];
  }
}

/**
 * Clear select all (Data Master)
 */
function clearSelectAllDataMaster() {
  const selectAll = document.getElementById('select-all-dm');
  if (selectAll) selectAll.checked = false;
  document.querySelectorAll('.dm-checkbox').forEach(cb => cb.checked = false);
  updateBulkSelectPanelDataMaster();
}

/**
 * Handle bulk delete data master (FIX 2.6)
 */
async function handleBulkDeleteDataMaster() {
  try {
    if (selectedDataMasterIds.length === 0) {
      return showAlert('warning', 'Pilih pelanggan yang ingin dihapus');
    }
    
    const confirmed = await confirmDialog(`Apakah Anda yakin ingin menghapus ${selectedDataMasterIds.length} pelanggan terpilih?`);
    if (!confirmed) return;
    
    const success = await bulkDeleteDataMaster(selectedDataMasterIds);
    if (success) {
      showAlert('success', `${selectedDataMasterIds.length} pelanggan berhasil dihapus`);
      await loadDataMaster(currentPageDataMaster);
    }
  } catch (error) {
    console.error('Error bulk delete data master:', error);
  }
}

/**
 * Buka modal untuk bulk add transaksi (FIX 3.7)
 */
function openBulkAddTransaksiModal() {
  if (selectedDataMasterIds.length === 0) {
    return showAlert('warning', 'Pilih pelanggan terlebih dahulu');
  }
  
  // Reset form
  document.getElementById('formBulkAddTransaksi').reset();
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('bulk-tgl-order').value = today;
  document.getElementById('bulk-status-order').value = 'SUKSES';
  document.getElementById('bulk-status-bayar').value = 'BELUM LUNAS';
  
  // Tampilkan modal
  const modal = new bootstrap.Modal(document.getElementById('bulkAddTransaksiModal'));
  modal.show();
}

/**
 * Simpan bulk transaksi (FIX 3.7)
 */
async function handleSaveBulkTransaksi() {
  try {
    const tglOrder = document.getElementById('bulk-tgl-order').value;
    const statusOrder = document.getElementById('bulk-status-order').value;
    const statusBayar = document.getElementById('bulk-status-bayar').value;
    const catatan = document.getElementById('bulk-catatan').value;
    
    if (!tglOrder) {
      return showAlert('error', 'Tanggal order wajib diisi');
    }
    
    // Hitung tgl_ambil (H+1 dari tgl_order)
    const tglAmbil = addDaysToIsoDate(tglOrder, 1);
    
    showLoading(`Membuat ${selectedDataMasterIds.length} transaksi...`);
    
    // Ambil data master (KJP, KTP, Nama) dari ID yang dipilih
    const { data: masters, error: masterError } = await supabase
      .from(CONSTANTS.TABLES.DATA_MASTER)
      .select('id, nama_user, no_kjp, no_ktp')
      .in('id', selectedDataMasterIds);

    if (masterError) throw masterError;

    // Buat array transaksi
    const transactions = masters.map(master => ({
      id_master: master.id,
      nama_user: master.nama_user, // Simpan data relasi
      no_kjp: master.no_kjp,     // Simpan data relasi
      no_ktp: master.no_ktp,     // Simpan data relasi
      tgl_order: tglOrder,
      tgl_ambil: tglAmbil,
      status_order: statusOrder,
      status_bayar: statusBayar,
      catatan: catatan,
      nominal: CONSTANTS.NOMINAL_TRANSAKSI, // Ambil dari config
    }));
    
    // Simpan ke DB
    const success = await bulkAddListHarian(transactions);
    
    hideLoading();
    
    if (success) {
      bootstrap.Modal.getInstance(document.getElementById('bulkAddTransaksiModal')).hide();
      showAlert('success', `${transactions.length} transaksi baru berhasil dibuat`);
      clearSelectAllDataMaster();
      // Pindah ke tab list harian untuk melihat hasilnya
      const listHarianTab = document.getElementById('list-harian-tab');
      if (listHarianTab) {
        bootstrap.Tab.getInstance(listHarianTab).show();
      }
      await loadListHarian(1); // Reload list harian
      await loadRekap(1); // Reload rekap
    }
    // error alert sudah dihandle oleh bulkAddListHarian
    
  } catch (error) {
    hideLoading();
    console.error('Error saving bulk transaksi:', error);
    showAlert('error', `Gagal: ${error.message}`);
  }
}


// ============================================
// LIST HARIAN FUNCTIONS
// ============================================

/**
 * Load list harian ke table
 */
async function loadListHarian(page = 1) {
  try {
    currentPageListHarian = page;
    
    const filters = {
      status_bayar: document.getElementById('filter-status-bayar')?.value || '',
      tgl_order: document.getElementById('filter-tgl-order')?.value || '',
    };
    
    const result = await getListHarian(page, filters);
    
    // Render table
    let html = '';
    result.data.forEach((item, index) => {
      const rowNum = (page - 1) * CONSTANTS.PAGE_SIZE + index + 1;
      
      let statusBayarColor;
      if (item.status_bayar === 'LUNAS') statusBayarColor = 'success';
      else if (item.status_bayar === 'BELUM LUNAS') statusBayarColor = 'danger';
      else statusBayarColor = 'secondary';
      
      let statusOrderColor;
      if (item.status_order === 'SUKSES') statusOrderColor = 'info';
      else if (item.status_order === 'PENDING') statusOrderColor = 'warning';
      else statusOrderColor = 'secondary';

      html += `
        <tr>
          <td>
            <input type="checkbox" class="transaksi-checkbox" value="${item.id}" onchange="updateBulkSelectPanel()">
          </td>
          <td>${item.nama_user || '(Nama tidak ditemukan)'}</td>
          <td><small>${formatNomor(item.no_kjp)}</small></td>
          <td>${formatDateToDisplay(item.tgl_order)}</td>
          <td>
            <span class="badge bg-${statusOrderColor}">${item.status_order}</span>
          </td>
          <td>
            <span class="badge bg-${statusBayarColor}">${item.status_bayar}</span>
          </td>
          <td class="text-center">
            <button class="btn btn-sm btn-primary" onclick="quickStatusUpdate('${item.id}', '${item.status_bayar}')" title="Quick Status Update">
              <i class="fas fa-exchange-alt"></i>
            </button>
            <button class="btn btn-sm btn-warning" onclick="editListHarian('${item.id}')" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="handleDeleteListHarian('${item.id}')" title="Hapus">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });
    
    document.getElementById('list-harian-table-body').innerHTML = html;
    
    // Render pagination
    renderPagination(result, 'list-harian-pagination', loadListHarian);
    
    // Clear bulk selection
    clearSelectAllTransaksi();
  } catch (error) {
    console.error('Error loading list harian:', error);
  }
}

/**
 * Handle search list harian
 */
async function handleSearchListHarian(keyword) {
  try {
    if (!keyword || keyword.trim() === '') {
      await loadListHarian(1);
      return;
    }
    
    const results = await searchListHarian(keyword);
    
    let html = '';
    results.forEach((item, index) => {
      let statusBayarColor;
      if (item.status_bayar === 'LUNAS') statusBayarColor = 'success';
      else if (item.status_bayar === 'BELUM LUNAS') statusBayarColor = 'danger';
      else statusBayarColor = 'secondary';
      
      let statusOrderColor;
      if (item.status_order === 'SUKSES') statusOrderColor = 'info';
      else if (item.status_order === 'PENDING') statusOrderColor = 'warning';
      else statusOrderColor = 'secondary';
      
      html += `
        <tr>
          <td>
            <input type="checkbox" class="transaksi-checkbox" value="${item.id}" onchange="updateBulkSelectPanel()">
          </td>
          <td>${item.nama_user || '(Nama tidak ditemukan)'}</td>
          <td><small>${formatNomor(item.no_kjp)}</small></td>
          <td>${formatDateToDisplay(item.tgl_order)}</td>
          <td>
            <span class="badge bg-${statusOrderColor}">${item.status_order}</span>
          </td>
          <td>
            <span class="badge bg-${statusBayarColor}">${item.status_bayar}</span>
          </td>
          <td class="text-center">
            <button class="btn btn-sm btn-primary" onclick="quickStatusUpdate('${item.id}', '${item.status_bayar}')" title="Quick Status Update">
              <i class="fas fa-exchange-alt"></i>
            </button>
            <button class="btn btn-sm btn-warning" onclick="editListHarian('${item.id}')" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="handleDeleteListHarian('${item.id}')" title="Hapus">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });
    
    document.getElementById('list-harian-table-body').innerHTML = html;
    document.getElementById('list-harian-pagination').innerHTML = ''; // Hapus pagination saat search
  } catch (error) {
    console.error('Error searching list harian:', error);
  }
}

/**
 * Handle filter list harian (date & status)
 */
function handleFilterListHarian() {
  loadListHarian(1); // Selalu kembali ke halaman 1 saat filter
}

/**
 * Toggle select all checkbox
 */
function toggleSelectAllTransaksi() {
  const checkboxes = document.querySelectorAll('.transaksi-checkbox');
  const selectAll = document.getElementById('select-all-transaksi');
  
  checkboxes.forEach(checkbox => {
    checkbox.checked = selectAll.checked;
  });
  
  updateBulkSelectPanel();
}

/**
 * Update bulk select panel visibility
 */
function updateBulkSelectPanel() {
  const checkboxes = document.querySelectorAll('.transaksi-checkbox:checked');
  selectedTransaksiIds = Array.from(checkboxes).map(cb => cb.value);
  
  const panel = document.getElementById('bulk-update-panel');
  const countEl = document.getElementById('selected-count');
  
  if (selectedTransaksiIds.length > 0) {
    panel.style.display = 'block';
    countEl.textContent = selectedTransaksiIds.length;
  } else {
    panel.style.display = 'none';
    selectedTransaksiIds = [];
  }
}

/**
 * Clear select all
 */
function clearSelectAllTransaksi() {
  const selectAll = document.getElementById('select-all-transaksi');
  if (selectAll) selectAll.checked = false;
  document.querySelectorAll('.transaksi-checkbox').forEach(cb => cb.checked = false);
  updateBulkSelectPanel();
}

/**
 * Quick status update (toggle LUNAS <-> BELUM LUNAS)
 */
async function quickStatusUpdate(id, currentStatus) {
  try {
    const newStatus = currentStatus === 'LUNAS' ? 'BELUM LUNAS' : 'LUNAS';
    const success = await updateStatusBayar(id, newStatus);
    if (success) {
      await loadListHarian(currentPageListHarian);
      await loadRekap(1); // Refresh rekap
      await loadDashboard(); // Refresh KPI
    }
  } catch (error) {
    console.error('Error quick status update:', error);
  }
}

/**
 * Handle bulk status update (FIX 3.6 - bisa update order & bayar)
 */
async function handleBulkStatusUpdate() {
  try {
    const statusOrder = document.getElementById('bulk-status-order-select').value;
    const statusBayar = document.getElementById('bulk-status-bayar-select').value;
    
    if (!statusOrder && !statusBayar) {
      return showAlert('warning', 'Pilih minimal satu status (Order atau Bayar) untuk diubah');
    }
    
    if (selectedTransaksiIds.length === 0) {
      return showAlert('warning', 'Pilih transaksi terlebih dahulu');
    }
    
    const updateObject = {};
    if (statusOrder) updateObject.status_order = statusOrder;
    if (statusBayar) updateObject.status_bayar = statusBayar;
    
    const success = await bulkUpdateStatus(selectedTransaksiIds, updateObject);
    
    if (success) {
      await loadListHarian(currentPageListHarian);
      await loadRekap(1); // Refresh rekap
      await loadDashboard(); // Refresh KPI
      clearSelectAllTransaksi();
    }
  } catch (error) {
    console.error('Error bulk status update:', error);
  }
}

/**
 * Reset form list harian (untuk add)
 */
async function resetFormListHarian() {
  document.getElementById('list-harian-id').value = '';
  document.getElementById('formListHarian').reset();
  document.getElementById('formListHarianTitle').textContent = 'Tambah Transaksi Baru';
  
  // FIX 5.2: Set tanggal default & dynamic min
  const today = new Date().toISOString().split('T')[0];
  const tglOrderEl = document.getElementById('tgl_order');
  const tglAmbilEl = document.getElementById('tgl_ambil');
  
  tglOrderEl.value = today;
  tglAmbilEl.value = today;
  tglAmbilEl.min = today;
  
  tglOrderEl.removeEventListener('change', updateTglAmbilMin); // Hapus listener lama
  tglOrderEl.addEventListener('change', updateTglAmbilMin); // Tambah listener baru
  
  // Load pelanggan untuk dropdown
  try {
    const dataMasterList = await getDataMasterForDropdown();
    const select = document.getElementById('nama-pelanggan');
    select.innerHTML = '<option value="">-- Pilih Pelanggan --</option>';
    
    dataMasterList.forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      // Sertakan data KJP dan KTP di option untuk autofill
      option.dataset.kjp = item.no_kjp;
      option.dataset.ktp = item.no_ktp;
      option.dataset.nama = item.nama_user;
      option.textContent = `${item.nama_user} (KJP: ${formatNomor(item.no_kjp)})`;
      select.appendChild(option);
    });
  } catch (error) {
    showAlert('error', 'Gagal memuat daftar pelanggan');
  }
}

// Helper untuk update min tgl ambil
function updateTglAmbilMin() {
  const tglOrder = document.getElementById('tgl_order').value;
  const tglAmbilEl = document.getElementById('tgl_ambil');
  if (tglOrder) {
    tglAmbilEl.min = tglOrder;
    // Jika tgl ambil < tgl order, samakan
    if (tglAmbilEl.value < tglOrder) {
      tglAmbilEl.value = tglOrder;
    }
  }
}


/**
 * Handle select pelanggan di form
 */
async function handleSelectPelanggan() {
  const select = document.getElementById('nama-pelanggan');
  const selectedOption = select.options[select.selectedIndex];
  
  if (!selectedOption.value) {
    document.getElementById('id-master').value = '';
    document.getElementById('no-kjp-display').value = '';
    document.getElementById('no-ktp-display').value = '';
    return;
  }
  
  // Ambil data dari dataset
  document.getElementById('id-master').value = selectedOption.value;
  document.getElementById('no-kjp-display').value = formatNomor(selectedOption.dataset.kjp);
  document.getElementById('no-ktp-display').value = formatNomor(selectedOption.dataset.ktp);
}

/**
 * Edit list harian (load data ke form)
 */
async function editListHarian(id) {
  try {
    const data = await getListHarianById(id);
    await resetFormListHarian(); // Reset & load dropdown dulu
    
    // Fill form
    document.getElementById('list-harian-id').value = id;
    document.getElementById('id-master').value = data.id_master;
    document.getElementById('nama-pelanggan').value = data.id_master; // Pilih di dropdown
    
    document.getElementById('no-kjp-display').value = formatNomor(data.no_kjp);
    document.getElementById('no-ktp-display').value = formatNomor(data.no_ktp);
    
    // FIX 5.2: Set date format YYYY-MM-DD
    document.getElementById('tgl_order').value = data.tgl_order;
    document.getElementById('tgl_ambil').value = data.tgl_ambil;
    document.getElementById('tgl_ambil').min = data.tgl_order; // Set min
    
    document.getElementById('status_order').value = data.status_order;
    document.getElementById('status_bayar').value = data.status_bayar;
    document.getElementById('catatan').value = data.catatan || '';
    document.getElementById('formListHarianTitle').textContent = 'Edit Transaksi';
    
    const modal = new bootstrap.Modal(document.getElementById('formListHarianModal'));
    modal.show();
  } catch (error) {
    console.error('Error editing list harian:', error);
    showAlert('error', 'Gagal memuat transaksi');
  }
}

/**
 * Handle save list harian (DENGAN VALIDASI)
 */
async function handleSaveListHarian() {
  try {
    const id = document.getElementById('list-harian-id').value;
    const select = document.getElementById('nama-pelanggan');
    const selectedOption = select.options[select.selectedIndex];
    
    const formData = {
      id_master: document.getElementById('id-master').value,
      tgl_order: document.getElementById('tgl_order').value,
      tgl_ambil: document.getElementById('tgl_ambil').value,
      status_order: document.getElementById('status_order').value,
      status_bayar: document.getElementById('status_bayar').value,
      catatan: document.getElementById('catatan').value,
      nominal: CONSTANTS.NOMINAL_TRANSAKSI,
      // Data relasi untuk mempermudah pencarian/tampilan
      nama_user: selectedOption.dataset.nama,
      no_kjp: sanitizeNumber(selectedOption.dataset.kjp),
      no_ktp: sanitizeNumber(selectedOption.dataset.ktp),
    };

    // --- VALIDASI INPUT (FIX 5.2) ---
    if (!formData.id_master) {
      return showAlert('error', 'Pelanggan wajib dipilih');
    }
    
    let validation = validateDate(formData.tgl_order); // utils.js memvalidasi format DD/MM/YYYY
    // Karena kita pakai type="date", validasinya ganti
    if (!formData.tgl_order) return showAlert('error', 'Tanggal order wajib diisi');
    if (!formData.tgl_ambil) return showAlert('error', 'Tanggal ambil wajib diisi');

    validation = validateDateRange(formData.tgl_order, formData.tgl_ambil);
    if (!validation.valid) return showAlert('error', validation.error);
    
    // --- Cek Duplikasi per Tanggal (Opsional tapi bagus) ---
    showLoading('Memeriksa data...');
    const excludeId = id ? id : null;
    
    if (await checkKJPExistsByDate(formData.no_kjp, formData.tgl_order, excludeId)) {
      hideLoading();
      return showAlert('error', 'Pelanggan ini sudah ada transaksi di tanggal order yang sama');
    }
    hideLoading();

    // --- Simpan Data ---
    let success = false;
    if (id) {
      success = await updateListHarian(id, formData);
    } else {
      success = await addListHarian(formData);
    }
    
    if (success) {
      bootstrap.Modal.getInstance(document.getElementById('formListHarianModal')).hide();
      await loadListHarian(1); // Muat ulang dari halaman 1
      await loadRekap(1); // Muat ulang rekap
      await loadDashboard(); // Muat ulang KPI
      showAlert('success', id ? 'Transaksi berhasil diubah' : 'Transaksi berhasil disimpan');
    }
    
  } catch (error) {
    hideLoading();
    console.error('Error saving list harian:', error);
    showAlert('error', `Gagal menyimpan: ${error.message}`);
  }
}

/**
 * Handle delete list harian (FIX - reload table)
 */
async function handleDeleteListHarian(id) {
  try {
    const success = await deleteListHarian(id); // Fungsi ini sudah ada confirm()
    if (success) {
      await loadListHarian(currentPageListHarian); // Reload tabel
      await loadRekap(1); // Muat ulang rekap
      await loadDashboard(); // Muat ulang KPI
    }
  } catch (error) {
    console.error('Error handling delete list harian:', error);
  }
}

/**
 * Export List Harian ke CSV (FIX 4.5)
 */
async function exportListHarian() {
  try {
    showLoading('Mempersiapkan export...');
    
    // Ambil filter saat ini
    const filters = {
      status_bayar: document.getElementById('filter-status-bayar')?.value || '',
      tgl_order: document.getElementById('filter-tgl-order')?.value || '',
    };
    
    // Ambil SEMUA data (tidak dipaginasi) sesuai filter
    const data = await getAllListHarian(filters);
    
    hideLoading();
    
    if (data.length === 0) {
      return showAlert('warning', 'Tidak ada data untuk diexport');
    }
    
    let csv = 'No,Nama,No. KJP,Tgl Order,Tgl Ambil,Status Order,Status Bayar,Nominal,Catatan\n';
    
    data.forEach((item, index) => {
      csv += `${index + 1},"${item.nama_user || ''}","${item.no_kjp || ''}","${item.tgl_order || ''}","${item.tgl_ambil || ''}","${item.status_order || ''}","${item.status_bayar || ''}","${item.nominal || 0}","${item.catatan || ''}"\n`;
    });
    
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `transaksi_harian_${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    showAlert('success', 'Data berhasil diexport');
  } catch (error) {
    hideLoading();
    console.error('❌ Error export:', error.message);
    showAlert('error', `Gagal export: ${error.message}`);
  }
}

// ============================================
// REKAP FUNCTIONS
// ============================================

/**
 * Load rekap belum lunas
 */
async function loadRekap(page = 1) {
  try {
    currentPageRekap = page;
    const result = await getRekapSummary(page);
    
    renderRekapTable(result.data, 'rekap-table-body');
    renderPagination(result, 'rekap-pagination', loadRekap);
  } catch (error) {
    console.error('Error loading rekap:', error);
  }
}

/**
 * Handle search rekap
 */
async function handleSearchRekap(keyword) {
  try {
    if (!keyword || keyword.trim() === '') {
      await loadRekap(1);
      return;
    }
    
    // Fungsi searchRekap (rekap.js) mencari di REKAP_DETAIL
    // Kita perlu group by manual
    const results = await searchRekap(keyword);
    
    const grouped = {};
    results.forEach(item => {
      const key = item.parent_name || 'Lain-lain';
      if (!grouped[key]) {
        grouped[key] = {
          parent_name: key,
          jumlah_transaksi: 0,
          total_hutang: 0,
          tgl_transaksi_pertama: item.tgl_transaksi,
          tgl_transaksi_terakhir: item.tgl_transaksi,
        };
      }
      grouped[key].jumlah_transaksi++;
      grouped[key].total_hutang += (item.nominal || 0);
      if (item.tgl_transaksi < grouped[key].tgl_transaksi_pertama) {
        grouped[key].tgl_transaksi_pertama = item.tgl_transaksi;
      }
      if (item.tgl_transaksi > grouped[key].tgl_transaksi_terakhir) {
        grouped[key].tgl_transaksi_terakhir = item.tgl_transaksi;
      }
    });
    
    const data = Object.values(grouped).sort((a, b) => b.total_hutang - a.total_hutang);
    renderRekapTable(data, 'rekap-table-body');
    document.getElementById('rekap-pagination').innerHTML = ''; // Hapus pagination
  } catch (error)
 {
    console.error('Error searching rekap:', error);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Render pagination controls
 */
function renderPagination(result, containerId, callbackFunction) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  
  if (result.totalPages <= 1) return;
  
  const nav = document.createElement('nav');
  const ul = document.createElement('ul');
  ul.className = 'pagination justify-content-center';
  
  // Previous button
  const prevLi = document.createElement('li');
  prevLi.className = `page-item ${result.page === 1 ? 'disabled' : ''}`;
  prevLi.innerHTML = `<a class="page-link" href="#" onclick="event.preventDefault(); ${callbackFunction.name}(${result.page - 1})">Previous</a>`;
  ul.appendChild(prevLi);
  
  // Page numbers (Simple version, bisa di-improve)
  for (let i = 1; i <= result.totalPages; i++) {
    // Logika untuk menampilkan '...' jika halaman terlalu banyak
    if (result.totalPages > 7 && (i > 3 && i < result.totalPages - 2)) {
      if (i === 4) {
        const li = document.createElement('li');
        li.className = 'page-item disabled';
        li.innerHTML = `<span class="page-link">...</span>`;
        ul.appendChild(li);
      }
      continue;
    }

    const li = document.createElement('li');
    li.className = `page-item ${result.page === i ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#" onclick="event.preventDefault(); ${callbackFunction.name}(${i})">${i}</a>`;
    ul.appendChild(li);
  }
  
  // Next button
  const nextLi = document.createElement('li');
  nextLi.className = `page-item ${result.page === result.totalPages ? 'disabled' : ''}`;
  nextLi.innerHTML = `<a class="page-link" href="#" onclick="event.preventDefault(); ${callbackFunction.name}(${result.page + 1})">Next</a>`;
  ul.appendChild(nextLi);
  
  nav.appendChild(ul);
  container.appendChild(nav);
}

// ============================================
// END OF FILE
// ============================================

console.log('✅ app.js (FIXED) loaded successfully!');