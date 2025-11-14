// ============================================
// app.js (FINAL PATCH - FIX ALL)
// Main Application Logic & Event Handlers
// ============================================

// Global State
let currentPageDataMaster = 1;
let currentPageListHarian = 1;
let currentPageRekap = 1;
let listHarianSortField = 'tgl_order';  // Default sort by date
let listHarianSortAsc = false;          // Default descending (newest first)
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
          <td><small>${item.no_kjp}</small></td>
          <td><small>${formatNomor(item.no_ktp)}</small></td>
          <td><small>${formatNomor(item.no_kk)}</small></td>    <!-- ✅ ADDED - Kolom No. KK -->
          <td><small>${formatDateToDisplay(item.tgl_tambah)}</small></td>
          <td class="text-center">
            <button class="btn btn-sm btn-warning" onclick="editDataMaster('${item.id}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="handleDeleteDataMaster('${item.id}')">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
        });


        document.getElementById('data-master-table-body').innerHTML = html;

        // ✅ ADDED - Clear ALL pagination containers sebelum render
        document.getElementById('list-harian-pagination').innerHTML = '';
        document.getElementById('rekap-pagination').innerHTML = '';

        renderPagination(result, 'data-master-pagination', loadDataMaster);


        // ✅ Update UI panel (preserve global selection)
        updateBulkSelectPanelDataMaster();
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
            // ✅ CEK apakah item ini sudah dipilih sebelumnya
            const isChecked = selectedDataMasterIds.includes(item.id) ? 'checked' : '';

            html += `
        <tr>
          <td>
            <input type="checkbox" class="dm-checkbox" value="${item.id}" onchange="updateBulkSelectPanelDataMaster()" ${isChecked}>
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
    const namaUserEl = document.getElementById('nama_user');
    if (namaUserEl) {
        document.getElementById('parent_name').value = extractParentName(namaUserEl.value);
    }
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

        validation = validateDate(formData.tgl_tambah);
        if (!validation.valid) return showAlert('error', validation.error);

        // --- Cek Duplikasi (Database) ---
        showLoading('Memeriksa data...');
        const excludeId = id ? id : null;

        if (await checkNamaExists(formData.nama_user, excludeId)) {
            hideLoading();
            return showAlert('error', ERROR_MESSAGES.NAMA_DUPLICATE);
        }

        if (await checkKJPExists(formData.no_kjp, excludeId)) {
            hideLoading();
            return showAlert('error', ERROR_MESSAGES.KJP_DUPLICATE);
        }

        hideLoading();

        // --- Simpan Data ---
        let successData;
        if (id) {
            successData = await updateDataMaster(id, formData);
        } else {
            successData = await addDataMaster(formData);
        }

        if (successData) {
            bootstrap.Modal.getInstance(document.getElementById('formDataMasterModal')).hide();
            await loadDataMaster(1); // Muat ulang dari halaman 1
            showAlert('success', id ? SUCCESS_MESSAGES.DATA_UPDATED : SUCCESS_MESSAGES.DATA_CREATED);
        }

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
 * PATCHED: Sesuai dengan struktur toolbar baru (enable/disable buttons, bukan show/hide panel)
 */
function updateBulkSelectPanelDataMaster() {
    const checkedBoxes = document.querySelectorAll('.dm-checkbox:checked');

    // Get UI elements (toolbar version)
    const infoEl = document.getElementById('dm-selection-info');
    const countEl = document.getElementById('dm-selected-count');
    const btnBuatTransaksi = document.getElementById('btn-buat-transaksi');
    const btnHapusMassal = document.getElementById('btn-hapus-massal');
    const btnBatal = document.getElementById('btn-batal-selection');
    const btnText = document.getElementById('btn-transaksi-text');

    // ✅ AMBIL SEMUA ID yang tampil di halaman saat ini (baik checked maupun unchecked)
    const currentRenderedIds = Array.from(document.querySelectorAll('.dm-checkbox')).map(cb => cb.value);

    // ✅ AMBIL ID yang dicentang di halaman saat ini
    const checkedThisPage = Array.from(checkedBoxes).map(cb => cb.value);

    // ✅ HAPUS ID yang ada di halaman ini dari global array (untuk update state)
    selectedDataMasterIds = selectedDataMasterIds.filter(id => !currentRenderedIds.includes(id));

    // ✅ TAMBAHKAN kembali ID yang dicentang di halaman ini
    selectedDataMasterIds = selectedDataMasterIds.concat(checkedThisPage);

    // Update UI berdasarkan total selection (termasuk dari halaman/search lain)
    if (selectedDataMasterIds.length > 0) {
        // ✅ ADA YANG DIPILIH (dari halaman manapun)

        // Show selection info
        if (infoEl) {
            infoEl.style.display = 'block';
        }

        // Update count dengan TOTAL selection
        if (countEl) {
            countEl.textContent = selectedDataMasterIds.length;
        }

        // Enable buttons
        if (btnBuatTransaksi) btnBuatTransaksi.disabled = false;
        if (btnHapusMassal) btnHapusMassal.disabled = false;
        if (btnBatal) {
            btnBatal.disabled = false;
            btnBatal.style.display = 'inline-block';
        }

        // Update button text
        if (btnText) {
            if (selectedDataMasterIds.length === 1) {
                btnText.textContent = 'Buat Transaksi';
            } else {
                btnText.textContent = `Buat ${selectedDataMasterIds.length} Transaksi`;
            }
        }
    } else {
        // ❌ TIDAK ADA YANG DIPILIH SAMA SEKALI

        // Hide selection info
        if (infoEl) {
            infoEl.style.display = 'none';
        }

        // Disable buttons
        if (btnBuatTransaksi) btnBuatTransaksi.disabled = true;
        if (btnHapusMassal) btnHapusMassal.disabled = true;
        if (btnBatal) {
            btnBatal.disabled = true;
            btnBatal.style.display = 'none';
        }

        // Reset button text
        if (btnText) btnText.textContent = 'Buat Transaksi';
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
async function openBulkAddTransaksiModal() {
    if (selectedDataMasterIds.length === 0) {
        return showAlert('warning', 'Pilih pelanggan terlebih dahulu');
    }

    // Reset form
    document.getElementById('formBulkAddTransaksi').reset();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('bulk-tgl-order').value = today;
    document.getElementById('bulk-status-order').value = 'SUKSES';
    document.getElementById('bulk-status-bayar').value = 'BELUM LUNAS';

    // UPDATE: Perbarui counter modal dengan jumlah pelanggan terpilih
    document.getElementById('dm-selected-count-modal').textContent = selectedDataMasterIds.length;

    // ✅ TAMBAHAN BARU: Fetch data pelanggan dan tampilkan daftar
    try {
        showLoading('Memuat data pelanggan...');

        const { data: masters, error } = await supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .select('id, nama_user, no_kjp, parent_name')
            .in('id', selectedDataMasterIds);

        if (error) throw error;

        // Buat HTML list pelanggan
        let pelangganListHtml = '<div class="alert alert-info"><strong>Pelanggan Terpilih:</strong><ul class="mb-0 mt-2">';
        masters.forEach(master => {
            pelangganListHtml += `<li><strong>${master.nama_user}</strong> (${master.parent_name || '-'}) - KJP: ${formatNomor(master.no_kjp)}</li>`;
        });
        pelangganListHtml += '</ul></div>';

        // Tampilkan di modal (GANTI atau TAMBAHKAN element baru)
        // Karena tidak ada element khusus, kita insert setelah <p>
        const modalBody = document.querySelector('#bulkAddTransaksiModal .modal-body');
        const existingList = modalBody.querySelector('.pelanggan-list-container');

        if (existingList) {
            existingList.innerHTML = pelangganListHtml;
        } else {
            const container = document.createElement('div');
            container.className = 'pelanggan-list-container mb-3';
            container.innerHTML = pelangganListHtml;
            // Insert setelah <p> pertama
            const firstP = modalBody.querySelector('p');
            firstP.after(container);
        }

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Error loading pelanggan list:', error);
    }

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

        // ✅ DEBUG: Log selectedDataMasterIds sebelum query
        console.log('🔍 DEBUG - selectedDataMasterIds:', selectedDataMasterIds);
        console.log('🔍 DEBUG - selectedDataMasterIds.length:', selectedDataMasterIds.length);

        const { data: masters, error: masterError } = await supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .select('id, nama_user, no_kjp, no_ktp, parent_name, no_kk') // Ambil no_kk
            .in('id', selectedDataMasterIds);

        // ✅ DEBUG: Log hasil query dari database
        console.log('🔍 DEBUG - masters dari DB:', masters);
        console.log('🔍 DEBUG - masters.length:', masters ? masters.length : 0);

        if (masterError) throw masterError;



        // Buat array transaksi
        const transactions = masters.map(master => ({
            id_master: master.id,
            nama_user: master.nama_user,
            no_kjp: master.no_kjp,
            no_ktp: master.no_ktp,
            no_kk: master.no_kk, // TAMBAHKAN no_kk
            parent_name: master.parent_name || extractParentName(master.nama_user), // Fallback
            tgl_order: tglOrder,
            tgl_ambil: tglAmbil,
            status_order: statusOrder,
            status_bayar: statusBayar,
            catatan: catatan,
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
                new bootstrap.Tab(listHarianTab).show();
            }
        }


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
            sort_field: listHarianSortField,
            sort_asc: listHarianSortAsc
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
            if (item.status_order === 'SUKSES') statusOrderColor = 'success';      // ✅ Hijau
            else if (item.status_order === 'PROSES') statusOrderColor = 'warning'; // ✅ Kuning
            else if (item.status_order === 'GAGAL') statusOrderColor = 'danger';   // ✅ Merah
            else statusOrderColor = 'secondary';


            html += `
        <tr>
          <td>
            <input type="checkbox" class="transaksi-checkbox" value="${item.id}" onchange="updateBulkSelectPanel()">
          </td>
          <td><strong>${rowNum}</strong></td>
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
            <button class="btn btn-sm btn-info" onclick="viewDetailTransaction('${item.id}')" title="Lihat Detail">
              <i class="fas fa-eye"></i> Detail
            </button>
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

        // STORE data untuk modal (PATCH 13)
        currentTransactionList = result.data;

        document.getElementById('list-harian-table-body').innerHTML = html;

        // ✅ ADDED - Clear ALL pagination containers sebelum render
        document.getElementById('data-master-pagination').innerHTML = '';
        document.getElementById('rekap-pagination').innerHTML = '';

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
            if (item.status_order === 'SUKSES') statusOrderColor = 'success';      // ✅ Hijau
            else if (item.status_order === 'PROSES') statusOrderColor = 'warning'; // ✅ Kuning
            else if (item.status_order === 'GAGAL') statusOrderColor = 'danger';   // ✅ Merah
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
            <button class="btn btn-sm btn-info" onclick="viewDetailTransaction('${item.id}')" title="Lihat Detail">
              <i class="fas fa-eye"></i> Detail
            </button>
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

        // STORE data untuk modal (PATCH 13)
        currentTransactionList = result.data;

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

async function resetFormListHarian() {
    document.getElementById('list-harian-id').value = '';
    document.getElementById('formListHarian').reset();
    document.getElementById('formListHarianTitle').textContent = 'Tambah Transaksi Baru';

    const today = new Date().toISOString().split('T')[0];
    const tglOrderEl = document.getElementById('tgl_order');  // ✅ DIPERBAIKI (Line 712)

    tglOrderEl.value = today;

    // Load pelanggan untuk dropdown
    try {
        const dataMasterList = await getDataMasterForDropdown();
        const select = document.getElementById('nama-pelanggan');
        select.innerHTML = '<option value="">-- Pilih Pelanggan --</option>';

        dataMasterList.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.dataset.kjp = item.no_kjp;
            option.dataset.ktp = item.no_ktp;
            option.dataset.nama = item.nama_user;
            option.dataset.parent = item.parent_name;
            option.dataset.kk = item.no_kk;
            option.textContent = `${item.nama_user} (KJP: ${formatNomor(item.no_kjp)})`;
            select.appendChild(option);
        });
    } catch (error) {
        showAlert('error', 'Gagal memuat daftar pelanggan');
    }
}

/**
 * FUNGSI BARU: Open form transaksi dari pelanggan yang dipilih via checkbox
 * Otomatis deteksi single atau multi selection
 */
async function openAddTransaksiFromSelection() {
    try {
        // ✅ DEBUG: Log selectedDataMasterIds (BUKAN checkedBoxes!)
        console.log('🔍 DEBUG - openAddTransaksiFromSelection called');
        console.log('🔍 DEBUG - selectedDataMasterIds:', selectedDataMasterIds);
        console.log('🔍 DEBUG - selectedDataMasterIds.length:', selectedDataMasterIds.length);

        // Gunakan selectedDataMasterIds (global state) bukan checkedBoxes di halaman saat ini!
        if (selectedDataMasterIds.length === 0) {
            return showAlert('warning', 'Silakan pilih minimal 1 pelanggan terlebih dahulu dengan mencentang checkbox');
        }

        // ✅ PENTING: Jika hanya 1 pelanggan dipilih -> buka form single transaksi
        if (selectedDataMasterIds.length === 1) {
            console.log('🔍 DEBUG - Opening single transaksi mode');
            await openSingleTransaksiFromCheckbox(selectedDataMasterIds[0]);
        }
        // ✅ Jika lebih dari 1 -> buka form bulk transaksi
        else {
            console.log('🔍 DEBUG - Opening bulk transaksi mode');
            openBulkAddTransaksiModal();
        }

    } catch (error) {
        console.error('Error opening transaksi from selection:', error);
        showAlert('error', 'Gagal membuka form transaksi');
    }
}

/**
 * ========================================
 * FUNGSI BARU: Open form single transaksi
 * ========================================
 * Membuka modal form transaksi untuk 1 pelanggan dengan data pre-filled
 * Data pelanggan diambil dari database dan disimpan di form.dataset
 * 
 * @param {string} masterId - ID pelanggan dari data_master
 */
async function openSingleTransaksiFromCheckbox(masterId) {
    try {
        console.log('🔵 Opening single transaksi for masterId:', masterId);
        showLoading('Memuat data pelanggan...');

        // ========================================
        // STEP 1: Ambil data pelanggan dari database
        // ========================================
        const pelanggan = await getDataMasterById(masterId);

        if (!pelanggan) {
            hideLoading();
            console.error('❌ Data pelanggan tidak ditemukan untuk ID:', masterId);
            return showAlert('error', 'Data pelanggan tidak ditemukan');
        }

        console.log('✅ Data pelanggan ditemukan:', pelanggan);

        // ========================================
        // STEP 2: Reset form
        // ========================================
        const listHarianId = document.getElementById('list-harian-id');
        const form = document.getElementById('formListHarian');
        const formTitle = document.getElementById('formListHarianTitle');

        if (listHarianId) listHarianId.value = '';
        if (form) form.reset();
        if (formTitle) formTitle.textContent = 'Tambah Transaksi Baru';

        // ========================================
        // STEP 3: Set tanggal hari ini
        // ========================================
        const today = new Date().toISOString().split('T')[0];
        const tglOrderField = document.getElementById('tgl_order');
        if (tglOrderField) {
            tglOrderField.value = today;
            console.log('✅ Set tgl_order:', today);
        } else {
            console.warn('⚠️ Field tgl_order tidak ditemukan');
        }

        // ========================================
        // STEP 4: Set default status
        // ========================================
        const statusOrderField = document.getElementById('status_order');
        const statusBayarField = document.getElementById('status_bayar');

        if (statusOrderField) {
            statusOrderField.value = 'SUKSES';
            console.log('✅ Set status_order: SUKSES');
        } else {
            console.warn('⚠️ Field status_order tidak ditemukan');
        }

        if (statusBayarField) {
            statusBayarField.value = 'BELUM LUNAS';
            console.log('✅ Set status_bayar: BELUM LUNAS');
        } else {
            console.warn('⚠️ Field status_bayar tidak ditemukan');
        }

        // ========================================
        // STEP 5: Fill data pelanggan (hidden field)
        // ========================================
        const idMasterField = document.getElementById('id-master');
        if (idMasterField) {
            idMasterField.value = pelanggan.id;
            console.log('✅ Set id-master:', pelanggan.id);
        } else {
            console.warn('⚠️ Field id-master tidak ditemukan');
        }

        // ========================================
        // STEP 6: Simpan data pelanggan di form.dataset
        // Dataset ini akan digunakan oleh handleSaveListHarian()
        // ========================================
        if (form) {
            form.dataset.pelangganNama = pelanggan.nama_user || '';
            form.dataset.pelangganKjp = pelanggan.no_kjp || '';
            form.dataset.pelangganKtp = pelanggan.no_ktp || '';
            form.dataset.pelangganKk = pelanggan.no_kk || '';
            form.dataset.pelangganParent = pelanggan.parent_name || '';
            console.log('✅ Data pelanggan disimpan di form.dataset');
        }

        // ========================================
        // STEP 7: Tampilkan info pelanggan
        // ========================================
        const infoPelangganText = document.getElementById('info-pelanggan-text');
        if (infoPelangganText) {
            infoPelangganText.innerHTML = `
                <strong>${pelanggan.nama_user || '-'}</strong><br>
                <small>No. KJP: ${formatNomor(pelanggan.no_kjp || '')}</small><br>
                <small>No. KTP: ${formatNomor(pelanggan.no_ktp || '')}</small>
            `;
            console.log('✅ Info pelanggan ditampilkan');
        } else {
            console.warn('⚠️ Field info-pelanggan-text tidak ditemukan');
        }

        // ========================================
        // STEP 8: Show/Hide field yang sesuai
        // field-pilih-pelanggan = untuk mode edit (dropdown)
        // field-info-pelanggan = untuk mode add dari checkbox (display only)
        // ========================================
        const fieldPilihPelanggan = document.getElementById('field-pilih-pelanggan');
        const fieldInfoPelanggan = document.getElementById('field-info-pelanggan');

        if (fieldPilihPelanggan) {
            fieldPilihPelanggan.style.display = 'none';
            console.log('✅ field-pilih-pelanggan hidden');
        } else {
            console.warn('⚠️ Field field-pilih-pelanggan tidak ditemukan');
        }

        if (fieldInfoPelanggan) {
            fieldInfoPelanggan.style.display = 'block';
            console.log('✅ field-info-pelanggan shown');
        } else {
            console.warn('⚠️ Field field-info-pelanggan tidak ditemukan');
        }

        hideLoading();

        // ========================================
        // STEP 9: Buka modal
        // ========================================
        const modalElement = document.getElementById('formListHarianModal');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
            console.log('✅ Modal dibuka');
        } else {
            throw new Error('Modal formListHarianModal tidak ditemukan');
        }

    } catch (error) {
        hideLoading();
        console.error('❌ Error opening single transaksi:', error);
        console.error('Stack trace:', error.stack);
        showAlert('error', `Gagal membuka form transaksi: ${error.message}`);
    }
}


async function getDataMasterById(id) {
    try {
        console.log(`📝 Fetching data master by ID: ${id}`);
        console.log('ID type:', typeof id, 'ID value:', id);

        const { data, error } = await supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .select('id, nama_user, no_kjp, no_ktp, no_kk, parent_name')
            .eq('id', id)
            .single();

        if (error) {
            console.error('❌ Supabase Error:', error);
            throw error;
        }

        if (!data) {
            console.error('❌ No data returned from Supabase');
            throw new Error('Data pelanggan tidak ditemukan');
        }

        console.log('✅ Got data master:', data);
        return data;
    } catch (error) {
        console.error('❌ Error in getDataMasterById:', error.message);
        throw error;
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
        await resetFormListHarian();


        document.getElementById('list-harian-id').value = id;
        document.getElementById('id-master').value = data.id_master;
        document.getElementById('nama-pelanggan').value = data.id_master;


        document.getElementById('tgl_order').value = data.tgl_order;           // ✅ DIPERBAIKI
        document.getElementById('status_order').value = data.status_order;     // ✅ DIPERBAIKI
        document.getElementById('status_bayar').value = data.status_bayar;     // ✅ DIPERBAIKI
        document.getElementById('catatan').value = data.catatan || '';
        document.getElementById('formListHarianTitle').textContent = 'Edit Transaksi';

        // ========================================
        // TAMBAHAN BARU: Clear dataset pelanggan
        // ========================================
        // Karena mode edit pakai dropdown, bukan checkbox
        // Maka dataset harus dibersihkan agar tidak konflik
        const form = document.getElementById('formListHarian');
        if (form) {
            delete form.dataset.pelangganNama;
            delete form.dataset.pelangganKjp;
            delete form.dataset.pelangganKtp;
            delete form.dataset.pelangganKk;
            delete form.dataset.pelangganParent;
            console.log('✅ Dataset cleared for edit mode');
        }

        // ========================================
        // TAMBAHAN BARU: Show/Hide field yang sesuai
        // ========================================
        // Mode edit menggunakan dropdown pelanggan, bukan info display
        const fieldPilihPelanggan = document.getElementById('field-pilih-pelanggan');
        const fieldInfoPelanggan = document.getElementById('field-info-pelanggan');

        if (fieldPilihPelanggan) {
            fieldPilihPelanggan.style.display = 'block';  // Show dropdown
            console.log('✅ Dropdown pelanggan shown for edit mode');
        }

        if (fieldInfoPelanggan) {
            fieldInfoPelanggan.style.display = 'none';   // Hide info
            console.log('✅ Info pelanggan hidden for edit mode');
        }

        // Trigger handleSelectPelanggan untuk populate info (jika ada)
        const selectPelanggan = document.getElementById('nama-pelanggan');
        if (selectPelanggan && typeof handleSelectPelanggan === 'function') {
            handleSelectPelanggan();
        }

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
        const form = document.getElementById('formListHarian');

        const tglOrder = document.getElementById('tgl_order').value;
        const tglAmbil = addDaysToIsoDate(tglOrder, 1);

        // Cek apakah data pelanggan berasal dari checkbox (dataset) atau dropdown
        let pelangganData;

        if (form.dataset.pelangganNama) {
            // Data dari checkbox (mode add dari selection)
            pelangganData = {
                nama: form.dataset.pelangganNama,
                kjp: form.dataset.pelangganKjp,
                ktp: form.dataset.pelangganKtp,
                kk: form.dataset.pelangganKk,
                parent: form.dataset.pelangganParent,
            };
        } else {
            // Data dari dropdown (mode edit atau legacy)
            const select = document.getElementById('nama-pelanggan');
            const selectedOption = select.options[select.selectedIndex];

            pelangganData = {
                nama: selectedOption.dataset.nama,
                kjp: selectedOption.dataset.kjp,
                ktp: selectedOption.dataset.ktp,
                kk: selectedOption.dataset.kk,
                parent: selectedOption.dataset.parent,
            };
        }

        const formData = {
            id_master: document.getElementById('id-master').value,
            tgl_order: tglOrder,
            tgl_ambil: tglAmbil,
            status_order: document.getElementById('status_order').value,
            status_bayar: document.getElementById('status_bayar').value,
            catatan: document.getElementById('catatan').value,
            // Data relasi (WAJIB NOT NULL)
            nama_user: pelangganData.nama,
            no_kjp: sanitizeNumber(pelangganData.kjp),
            no_ktp: sanitizeNumber(pelangganData.ktp),
            no_kk: sanitizeNumber(pelangganData.kk),
            parent_name: pelangganData.parent || extractParentName(pelangganData.nama),
        };


        // --- VALIDASI INPUT ---
        // Validasi id_master - tapi hanya jika tidak ada dataset pelanggan
        if (!formData.id_master && !form.dataset.pelangganNama) {
            return showAlert('error', 'Pilih pelanggan terlebih dahulu');
        }

        // Jika menggunakan checkbox mode, pastikan ada id_master dari field hidden
        if (form.dataset.pelangganNama && !formData.id_master) {
            console.warn('⚠️ Mode checkbox tapi id_master kosong, mencoba ambil dari form');
            // Coba ambil dari field hidden (seharusnya sudah diisi oleh openSingleTransaksiFromCheckbox)
            const idMasterField = document.getElementById('id-master');
            if (idMasterField && idMasterField.value) {
                formData.id_master = idMasterField.value;
                console.log('✅ id_master diambil dari hidden field:', formData.id_master);
            } else {
                return showAlert('error', 'Data pelanggan tidak lengkap. Silakan coba lagi.');
            }
        }


        // Validasi Not-Null (Fallback dijamin oleh extractParentName jika null)
        if (!formData.parent_name) {
            return showAlert('error', 'Gagal mendapatkan data parent_name. Pastikan data pelanggan di Data Master sudah lengkap.');
        }
        if (!formData.no_kk) {
            return showAlert('error', 'Gagal mendapatkan data no_kk. Pastikan data pelanggan di Data Master sudah lengkap.');
        }
        if (!formData.no_ktp) {
            return showAlert('error', 'Gagal mendapatkan data no_ktp. Pastikan data pelanggan di Data Master sudah lengkap.');
        }

        if (!formData.tgl_order) return showAlert('error', 'Tanggal order wajib diisi');

        // --- Cek Duplikasi per Tanggal ---
        showLoading('Memeriksa data...');
        const excludeId = id ? id : null;

        if (await checkKJPExistsByDate(formData.no_kjp, formData.tgl_order, excludeId)) {
            hideLoading();
            return showAlert('error', ERROR_MESSAGES.KJP_DUPLICATE_PER_DATE);
        }
        hideLoading();

        // --- Simpan Data ---
        let successData;
        if (id) {
            successData = await updateListHarian(id, formData);
        } else {
            successData = await addListHarian(formData);
        }

        if (successData) {
            bootstrap.Modal.getInstance(document.getElementById('formListHarianModal')).hide();
            await loadListHarian(1); // Muat ulang dari halaman 1
            await loadRekap(1); // Muat ulang rekap
            await loadDashboard(); // Muat ulang KPI
            showAlert('success', id ? SUCCESS_MESSAGES.DATA_UPDATED : SUCCESS_MESSAGES.DATA_CREATED);
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

        let csv = 'No,Nama,Parent Name,No. KJP,Tgl Order,Tgl Ambil,Status Order,Status Bayar,Catatan\n';

        data.forEach((item, index) => {
            // Tambah parent_name ke CSV
            csv += `${index + 1},"${item.nama_user || ''}","${item.parent_name || ''}","${item.no_kjp || ''}","${item.tgl_order || ''}","${item.tgl_ambil || ''}","${item.status_order || ''}","${item.status_bayar || ''}","${item.catatan || ''}"\n`;
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

        // ✅ IMPROVED - Scroll table container ke atas (lebih akurat)
        const tableResponsive = document.querySelector('#rekap .table-responsive');
        if (tableResponsive) {
            tableResponsive.scrollTop = 0;  // Scroll container table
        }

        // Juga scroll tab untuk backup
        const rekapTab = document.getElementById('rekap');
        if (rekapTab) {
            rekapTab.scrollTop = 0;
        }


        renderRekapTable(result.data, 'rekap-table-body');

        // ✅ ADDED - Focus ke tbody untuk force render
        const tbody = document.getElementById('rekap-table-body');
        if (tbody && tbody.firstChild) {
            tbody.firstChild.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

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
                    jumlah_anak: 0, // Inisialisasi
                    tgl_transaksi_pertama: item.tgl_transaksi,
                    tgl_transaksi_terakhir: item.tgl_transaksi,
                    anak: new Set(), // Untuk menghitung anak unik
                };
            }
            grouped[key].jumlah_transaksi++;
            grouped[key].total_hutang += (item.nominal || 0);
            grouped[key].anak.add(item.nama_user); // Tambah nama anak

            if (item.tgl_transaksi < grouped[key].tgl_transaksi_pertama) {
                grouped[key].tgl_transaksi_pertama = item.tgl_transaksi;
            }
            if (item.tgl_transaksi > grouped[key].tgl_transaksi_terakhir) {
                grouped[key].tgl_transaksi_terakhir = item.tgl_transaksi;
            }
        });

        // Ubah Set jadi size
        Object.values(grouped).forEach(group => {
            group.jumlah_anak = group.anak.size;
            delete group.anak; // Hapus Set
        });

        const data = Object.values(grouped).sort((a, b) => b.total_hutang - a.total_hutang);
        renderRekapTable(data, 'rekap-table-body');
        document.getElementById('rekap-pagination').innerHTML = ''; // Hapus pagination
    } catch (error) {
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
    if (!container) {
        console.warn(`⚠️ Container not found: ${containerId}`);
        return;
    }

    // ✅ ADDED - More aggressive clear (remove ALL child elements)
    container.innerHTML = '';
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    // ✅ ADDED - Hitung range data yang ditampilkan
    const itemsPerPage = result.count || CONSTANTS.PAGE_SIZE;
    const startItem = (result.page - 1) * itemsPerPage + 1;
    const endItem = Math.min(result.page * itemsPerPage, result.total);

    // ✅ ADDED - Tentukan label (transaksi vs data)
    let itemLabel = 'data'; // Default
    if (containerId === 'list-harian-pagination') {
        itemLabel = 'transaksi';
    } else if (containerId === 'data-master-pagination') {
        itemLabel = 'data';
    }

    // ✅ ADDED - Tampilkan info jika hanya 1 halaman
    if (result.totalPages <= 1) {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'text-center text-muted small mt-3';
        infoDiv.innerHTML = `<p>Menampilkan ${endItem} ${itemLabel}</p>`;
        container.appendChild(infoDiv);
        return;
    }

    // ✅ ADDED - Container untuk keterangan (nanti ditambah di bawah)
    const infoDiv = document.createElement('div');
    infoDiv.className = 'text-center text-muted small mt-2';
    infoDiv.innerHTML = `<p>Menampilkan ${startItem}-${endItem} dari ${result.total} ${itemLabel}</p>`;

    const nav = document.createElement('nav');
    const ul = document.createElement('ul');
    ul.className = 'pagination justify-content-center';

    const page = result.page;
    const totalPages = result.totalPages;

    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${page === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" onclick="event.preventDefault(); ${callbackFunction.name}(${page - 1})">Previous</a>`;
    ul.appendChild(prevLi);

    // Page numbers
    const maxPagesToShow = 5;
    let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    if (startPage > 1) {
        const firstLi = document.createElement('li');
        firstLi.className = 'page-item';
        firstLi.innerHTML = `<a class="page-link" href="#" onclick="event.preventDefault(); ${callbackFunction.name}(1)">1</a>`;
        ul.appendChild(firstLi);
        if (startPage > 2) {
            const dotsLi = document.createElement('li');
            dotsLi.className = 'page-item disabled';
            dotsLi.innerHTML = `<span class="page-link">...</span>`;
            ul.appendChild(dotsLi);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${page === i ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" onclick="event.preventDefault(); ${callbackFunction.name}(${i})">${i}</a>`;
        ul.appendChild(li);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const dotsLi = document.createElement('li');
            dotsLi.className = 'page-item disabled';
            dotsLi.innerHTML = `<span class="page-link">...</span>`;
            ul.appendChild(dotsLi);
        }
        const lastLi = document.createElement('li');
        lastLi.className = 'page-item';
        lastLi.innerHTML = `<a class="page-link" href="#" onclick="event.preventDefault(); ${callbackFunction.name}(${totalPages})">${totalPages}</a>`;
        ul.appendChild(lastLi);
    }

    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${page === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" onclick="event.preventDefault(); ${callbackFunction.name}(${page + 1})">Next</a>`;
    ul.appendChild(nextLi);

    nav.appendChild(ul);
    container.appendChild(nav);

    // ✅ ADDED - Tambah info di bawah pagination
    container.appendChild(infoDiv);
}


// ============================================
// END OF FILE
// ============================================


// ============================================
// TELEGRAM IMPORT FUNCTIONS (PATCH BARU)
// ============================================

// === TELEGRAM IMPORT FUNCTIONS ===

/**
 * Open modal untuk import data telegram
 */
function openImportTelegramModal() {
    // Reset form
    document.getElementById('telegram-text').value = '';
    document.getElementById('telegram-file').value = '';

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('importTelegramModal'));
    modal.show();
}

/**
 * Handle file upload telegram (.txt file)
 * @param {Event} event - File input change event
 */
function handleTelegramFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.txt')) {
        showAlert('error', 'File harus berformat .txt');
        return;
    }

    // Baca file sebagai text dengan encoding UTF-8
    const reader = new FileReader();

    reader.onload = function (e) {
        const content = e.target.result;
        document.getElementById('telegram-text').value = content;
        showAlert('success', `File "${file.name}" berhasil dibaca (${content.length} karakter)`);
    };

    reader.onerror = function (e) {
        showAlert('error', 'Gagal membaca file: ' + e.message);
    };

    reader.readAsText(file, 'UTF-8');
}

/**
 * Handle import telegram data
 * Main function yang dipanggil saat user klik button "Import Data"
 */
async function handleImportTelegram() {
    const textContent = document.getElementById('telegram-text').value.trim();

    // Validasi input
    if (!textContent) {
        showAlert('warning', 'Silakan paste text atau upload file telegram terlebih dahulu');
        return;
    }

    // Konfirmasi sebelum import
    const confirmed = await confirmDialog(
        'Anda yakin ingin import data dari telegram?\n\n' +
        'Data akan ditambahkan ke database berdasarkan No KJP yang ada di Data Master.\n\n' +
        'Proses ini tidak bisa di-undo.'
    );

    if (!confirmed) return;

    // Import data (function dari telegram-parser.js)
    const result = await importTelegramData(textContent);

    if (result.success) {
        // Close modal
        const modalInstance = bootstrap.Modal.getInstance(
            document.getElementById('importTelegramModal')
        );
        if (modalInstance) {
            modalInstance.hide();
        }

        // Show summary dengan detail
        if (result.errors && result.errors.length > 0) {
            console.log('📋 Import Errors:', result.errors);

            // Show notification dengan detail error
            const errorSummary = `
                <strong>Import selesai dengan beberapa error:</strong><br>
                <hr>
                Berhasil: ${result.inserted} transaksi<br>
                Gagal: ${result.errors.length} transaksi<br>
                <hr>
                <small>Lihat console browser (F12) untuk detail error</small>
            `;

            showAlert('warning', errorSummary);
        } else {
            showAlert('success',
                `✅ Import berhasil!\n${result.inserted} transaksi telah ditambahkan ke database.`
            );
        }
    }
}

console.log('✅ Telegram import functions loaded!');



// ============================================
// OPEN IMPORT CSV MODAL (WITH RESET)
// ============================================
function openImportCSVModal() {
    // Reset CSV buffer
    if (typeof csvDataBuffer !== 'undefined') {
        csvDataBuffer = [];
    }

    // Reset file input
    const fileInput = document.getElementById('csvFileInput');
    if (fileInput) {
        fileInput.value = '';
    }

    // Reset & DISABLE tombol Import
    const importBtn = document.getElementById('importCSVButton');
    if (importBtn) {
        importBtn.disabled = true;
    }

    // Clear preview table & hide preview div
    const previewDiv = document.getElementById('csvPreview');
    const previewTable = document.getElementById('csvPreviewTable');
    if (previewDiv) {
        previewDiv.style.display = 'none';
    }
    if (previewTable) {
        previewTable.innerHTML = '';
    }

    // Tampilkan modal
    const modal = new bootstrap.Modal(document.getElementById('importCSVModal'));
    modal.show();
}


console.log('✅ app.js (FINAL PATCH KK) loaded successfully!');
/**
 * View detail transaksi dalam modal (PATCH 13)
 */
function viewDetailTransaction(itemId) {
    // Find item dari stored list
    const item = currentTransactionList.find(x => x.id === itemId);
    if (!item) {
        console.error('Item tidak ditemukan:', itemId);
        return;
    }

    // Set modal title
    document.getElementById('detailTransactionModal-title').textContent =
        'Detail Transaksi - ' + (item.nama_user || 'Unknown');

    // Set modal body content
    document.getElementById('detailTransactionModal-body').innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <div class="detail-row">
                    <div class="detail-label">No KTP</div>
                    <div class="detail-value">${formatNomor(item.no_ktp) || '-'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">No KK</div>
                    <div class="detail-value">${formatNomor(item.no_kk) || '-'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Tgl Ambil</div>
                    <div class="detail-value">${formatDateToDisplay(item.tgl_ambil) || '-'}</div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="detail-row">
                    <div class="detail-label">No KJP</div>
                    <div class="detail-value">${formatNomor(item.no_kjp)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Tgl Order</div>
                    <div class="detail-value">${formatDateToDisplay(item.tgl_order)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Status Order</div>
                    <div class="detail-value"><span class="badge bg-info">${item.status_order}</span></div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Status Bayar</div>
                    <div class="detail-value"><span class="badge bg-danger">${item.status_bayar}</span></div>
                </div>
            </div>
        </div>
    `;

    // Show modal using Bootstrap
    const detailModal = new bootstrap.Modal(document.getElementById('detailTransactionModal'));
    detailModal.show();

}

// ============================================================
// ✅ ADDED - IMPORT CSV DATA MASTER FUNCTIONS
// ============================================================

/**
 * Open modal for CSV import
 */
function openImportCSVModal() {
    const modal = new bootstrap.Modal(document.getElementById('importCSVModal'));

    // Reset form
    document.getElementById('csvFileInput').value = '';
    document.getElementById('csvPreview').style.display = 'none';
    document.getElementById('importCSVButton').disabled = true;

    modal.show();
}

// ============================================================
// END OF IMPORT CSV FUNCTIONS - Details di data-master.js
// ============================================================
