// ============================================
// rekap-v2.js (FINAL PATCH - FIX DASHBOARD - COLUMN NAMES FIXED)
// Dengan getDashboardStatistics() & renderDashboardKPI() BARU
// Display Rekap dengan Better Error Handling + Dashboard Functions
// ============================================

console.log('Loading rekap-v2.js...');

async function getRekapSummary(page = 1) {
    try {
        console.log(`📥 Fetching rekap summary page ${page}...`);

        const start = (page - 1) * CONSTANTS.PAGE_SIZE;
        const end = start + CONSTANTS.PAGE_SIZE - 1;

        const { data, error, count } = await supabase
            .from(CONSTANTS.VIEWS.REKAP_SUMMARY)
            .select('*', { count: 'exact' })
            .order('total_hutang', { ascending: false })
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
        console.error('❌ Error in getRekapSummary:', error.message);
        showAlert('error', `Gagal memuat rekap: ${error.message}`);
        throw error;
    }
}

async function getRekapDetailByParent(parentName) {
    try {
        console.log(`📋 Fetching rekap detail for: ${parentName}`);

        const { data, error } = await supabase
            .from(CONSTANTS.VIEWS.REKAP_DETAIL)
            .select('*')
            .eq('parent_name', parentName)
            .order('tgl_transaksi', { ascending: true });

        if (error) {
            console.error('❌ Error:', error);
            throw error;
        }

        console.log(`✅ Got ${data?.length || 0} detail records`);
        return data || [];
    } catch (error) {
        console.error('❌ Error in getRekapDetailByParent:', error.message);
        throw error;
    }
}

async function getAllRekapDetail() {
    try {
        console.log('📥 Fetching all rekap detail...');

        const { data, error } = await supabase
            .from(CONSTANTS.VIEWS.REKAP_DETAIL)
            .select('*')
            .order('parent_name', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

// ============================================
// INI ADALAH FUNGSI YANG DIPERBAIKI (KEMBALI KE VERSI ASLI)
// ============================================
async function getRekapStatistics() {
    try {
        console.log('📊 Fetching rekap statistics...');

        // DIKEMBALIKAN: Ambil data dari VIEW, bukan RPC
        const { data, error } = await supabase
            .from(CONSTANTS.VIEWS.REKAP_SUMMARY)
            .select('*')
            .order('total_hutang', { ascending: false }); // Tambah order

        if (error) {
            console.error('❌ Error fetching stats:', error);
            throw error;
        }

        const rekapData = data || [];

        // Hitung manual di JS
        const stats = {
            totalKeluargaBerutang: rekapData.length,
            totalTransaksiBelumLunas: rekapData.reduce((sum, r) => sum + (r.jumlah_transaksi || 0), 0),
            totalHutang: rekapData.reduce((sum, r) => sum + (r.total_hutang || 0), 0),
            keluargaTerberat: rekapData.length > 0 ? rekapData[0] : null,
            rekapPerKeluarga: rekapData,
        };

        console.log(`✅ Statistics:`, stats);
        return stats;
    } catch (error) {
        console.error('❌ Error in getRekapStatistics:', error.message);
        showAlert('error', `Gagal memuat statistik: ${error.message}`);
        throw error;
    }
}

async function searchRekap(keyword) {
    try {
        console.log(`🔍 Searching rekap: ${keyword}`);

        if (!keyword || keyword.trim() === '') {
            return [];
        }

        const { data, error } = await supabase
            .from(CONSTANTS.VIEWS.REKAP_DETAIL) // Search tetap di detail
            .select('*')
            .ilike('parent_name', `%${keyword}%`)
            .limit(100); // Batasi agar tidak terlalu berat

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

function renderRekapTable(rekapData, containerId = 'rekap-table-body') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`⚠️ Container not found: ${containerId}`);
        return;
    }

    // ✅ IMPROVED - Clear dengan lebih hati-hati (hanya clear child nodes)
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }


    if (rekapData.length === 0) {
        container.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">
          <i class="fas fa-inbox"></i> Tidak ada data hutang
        </td>
      </tr>
    `;
        return;
    }

    rekapData.forEach((item, index) => {
        const row = document.createElement('tr');

        // FIX 4.4: Escape nama parent untuk onclick
        const escapedParentName = escapeJs(item.parent_name);

        row.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${item.parent_name || '-'}</strong></td>
      <td class="text-center">${item.jumlah_anak || 1}</td>
      <td class="text-center"><span class="badge bg-warning">${item.jumlah_transaksi || 0}</span></td>
      <td class="text-right"><strong>${formatCurrency(item.total_hutang || 0)}</strong></td>
      <td><small>${item.tgl_transaksi_pertama ? formatDateToDisplay(item.tgl_transaksi_pertama) : '-'}</small></td>
      <td><small>${item.tgl_transaksi_terakhir ? formatDateToDisplay(item.tgl_transaksi_terakhir) : '-'}</small></td>
      <td class="text-center">
        <button class="btn btn-sm btn-info" onclick="showRekapDetailModal('${escapedParentName}')" title="Lihat detail">
          <i class="fas fa-eye"></i>
        </button>
      </td>
    `;
        container.appendChild(row);
    });
}

function renderRekapKPI(stats, containerId = 'rekap-kpi') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
    <div class="row g-3">
      <div class="col-md-3 col-6">
        <div class="card border-primary">
          <div class="card-body">
            <h6 class="card-subtitle mb-2 text-muted">Keluarga Berutang</h6>
            <h2 class="card-title mb-0" style="color: #007bff;"><strong>${stats.totalKeluargaBerutang}</strong></h2>
          </div>
        </div>
      </div>
      
      <div class="col-md-3 col-6">
        <div class="card border-warning">
          <div class="card-body">
            <h6 class="card-subtitle mb-2 text-muted">Total Transaksi</h6>
            <h2 class="card-title mb-0" style="color: #ffc107;"><strong>${stats.totalTransaksiBelumLunas}</strong></h2>
          </div>
        </div>
      </div>
      
      <div class="col-md-3 col-6">
        <div class="card border-danger">
          <div class="card-body">
            <h6 class="card-subtitle mb-2 text-muted">Total Hutang</h6>
            <h2 class="card-title mb-0" style="color: #dc3545;"><strong>${formatCurrency(stats.totalHutang)}</strong></h2>
          </div>
        </div>
      </div>
      
      <div class="col-md-3 col-6">
        <div class="card border-success">
          <div class="card-body">
            <h6 class="card-subtitle mb-2 text-muted">Hutang Terbesar</h6>
            <h5 class="card-title mb-0" style="color: #28a745;"><strong>${stats.keluargaTerberat ? stats.keluargaTerberat.parent_name : '-'}</strong></h5>
            <small class="text-muted">${stats.keluargaTerberat ? formatCurrency(stats.keluargaTerberat.total_hutang) : '-'}</small>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function showRekapDetailModal(parentName) {
    // Hapus modal lama jika ada
    const oldModal = document.getElementById('rekapDetailModal');
    if (oldModal) {
        oldModal.remove();
    }

    try {
        showLoading(`Memuat detail ${parentName}...`);

        const rekapDetail = await getRekapDetailByParent(parentName);

        hideLoading();

        if (rekapDetail.length === 0) {
            showAlert('warning', 'Tidak ada data detail');
            return;
        }

        // Hitung total
        const totalDetail = rekapDetail.reduce((sum, item) => sum + (item.nominal || 0), 0);

        let html = `
      <div class="modal fade" id="rekapDetailModal" tabindex="-1">
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Detail: <strong>${parentName}</strong></h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="table-responsive">
                <table class="table table-sm table-hover">
                  <thead class="table-light">
                    <tr>
                      <th>No</th>
                      <th>Nama</th>
                      <th>No. KJP</th>
                      <th>Tanggal</th>
                      <th>Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
    `;

        rekapDetail.forEach((item, index) => {
            html += `
        <tr>
          <td>${index + 1}</td>
          <td>${item.nama_user || '-'}</td>
          <td><small>${formatNomor(item.no_kjp || '')}</small></td>
          <td>${item.tgl_transaksi ? formatDateToDisplay(item.tgl_transaksi) : '-'}</td>
          <td><strong>${formatCurrency(item.nominal || 0)}</strong></td>
        </tr>
      `;
        });

        html += `
                  </tbody>
                  <tfoot>
                    <tr class="table-light">
                      <td colspan="4" class="text-end"><strong>Total Hutang:</strong></td>
                      <td><strong>${formatCurrency(totalDetail)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
            </div>
          </div>
        </div>
      </div>
    `;

        // Buat elemen baru dan tambahkan ke body
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = html;
        const modalElement = modalDiv.firstElementChild;
        document.body.appendChild(modalElement);

        // Hapus elemen dari DOM setelah modal ditutup
        modalElement.addEventListener('hidden.bs.modal', () => {
            modalElement.remove();
        });

        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    } catch (error) {
        hideLoading();
        console.error('❌ Error:', error.message);
        showAlert('error', `Gagal memuat: ${error.message}`);
    }
}

async function exportRekapDetail(parentName = null) {
    try {
        showLoading('Mempersiapkan export...');

        let rekapData = parentName
            ? await getRekapDetailByParent(parentName)
            : await getAllRekapDetail();

        hideLoading();

        if (rekapData.length === 0) {
            showAlert('warning', 'Tidak ada data untuk diexport');
            return;
        }

        let csv = 'No,Parent Name,Nama User,No. KJP,Tanggal Transaksi,Nominal\n';

        rekapData.forEach((item, index) => {
            csv += `${index + 1},"${item.parent_name || ''}","${item.nama_user || ''}","${item.no_kjp || ''}","${item.tgl_transaksi || ''}","${item.nominal || 0}"\n`;
        });

        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
        element.setAttribute('download', `rekap_belum_lunas_${new Date().toISOString().split('T')[0]}.csv`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);

        showAlert('success', 'Data berhasil diexport');
    } catch (error) {
        hideLoading();
        console.error('❌ Error:', error.message);
        showAlert('error', `Gagal: ${error.message}`);
    }
}


// ============================================
// ✅ FUNGSI BARU - DASHBOARD STATISTICS
// DENGAN KOLOM NAMES YANG BENAR (tgl_order, status_order, status_bayar)
// ============================================

async function getDashboardStatistics() {
    try {
        console.log('📊 Fetching dashboard statistics (NEW - COLUMN NAMES FIXED)...');

        // Dapatkan tanggal awal bulan dan tanggal hari ini
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // Format ke YYYY-MM-DD
        const startDate = firstDayOfMonth.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        console.log(`📅 Date range: ${startDate} to ${endDate}`);

        // ✅ FIXED: Menggunakan nama kolom yang BENAR dari list-harian
        const { data: allTransaksi, error } = await supabase
            .from(CONSTANTS.TABLES.LIST_HARIAN)
            .select('*')
            .gte('tgl_order', startDate)
            .lte('tgl_order', endDate)
            .order('tgl_order', { ascending: true });

        if (error) {
            console.error('❌ Error fetching transaksi:', error);
            throw error;
        }

        console.log(`✅ Got ${allTransaksi?.length || 0} transaksi`);

        // Pisahkan berdasarkan status_order (BENAR)
        const transaksiSukses = allTransaksi.filter(t => t.status_order === 'SUKSES');
        const transaksiProses = allTransaksi.filter(t => t.status_order === 'PROSES');
        const transaksiGagal = allTransaksi.filter(t => t.status_order === 'GAGAL' || t.status_order === 'BATAL');

        // Hitung omzet bulan ini (dari transaksi SUKSES = 20000 per transaksi)
        const omzetBulanIni = transaksiSukses.length * 20000;

        // Hitung pembayaran (dari SEMUA transaksi, menggunakan status_bayar yang BENAR)
        const pembayaranLunas = allTransaksi.filter(t => t.status_bayar === 'LUNAS').length;
        const pembayaranBelumLunas = allTransaksi.filter(t => t.status_bayar === 'BELUM LUNAS').length;

        // Hitung rata-rata harian
        const daysPassed = Math.floor((today - firstDayOfMonth) / (1000 * 60 * 60 * 24)) + 1;
        const rataRataHarian = daysPassed > 0 ? omzetBulanIni / daysPassed : 0;
        const rataRataTransaksiHarian = daysPassed > 0 ? transaksiSukses.length / daysPassed : 0;

        const stats = {
            omzetBulanIni: omzetBulanIni,
            bulanLalu: 0,
            persenOmzet: 0,
            statusOmzet: 'success',
            totalTransaksi: allTransaksi.length,
            totalSukses: transaksiSukses.length,
            totalProses: transaksiProses.length,
            totalGagal: transaksiGagal.length,
            pembayaranLunas: pembayaranLunas,
            pembayaranBelumLunas: pembayaranBelumLunas,
            rataRataHarian: rataRataHarian,
            rataRataTransaksiHarian: rataRataTransaksiHarian,
            daysPassed: daysPassed,
            startDate: startDate,
            endDate: endDate,
        };

        console.log('✅ Dashboard Statistics:', stats);
        return stats;

    } catch (error) {
        console.error('❌ Error in getDashboardStatistics:', error.message);
        showAlert('error', `Gagal memuat statistik dashboard: ${error.message}`);
        throw error;
    }
}

function renderDashboardKPI(stats, containerId = 'dashboard-kpi') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn('⚠️ Container dashboard-kpi not found');
        return;
    }

    container.innerHTML = `
    <div class="row g-3">
      <div class="col-md-3 col-6">
        <div class="card border-primary h-100">
          <div class="card-body">
            <div class="d-flex align-items-center mb-2">
              <i class="fas fa-chart-line me-2" style="color: #007bff; font-size: 1.5rem;"></i>
              <h6 class="card-subtitle mb-0 text-muted">OMZET BULAN INI</h6>
            </div>
            <h2 class="card-title mb-1" style="color: #007bff;">
              <strong>${formatCurrency(stats.omzetBulanIni)}</strong>
            </h2>
            <small class="text-muted">Status: ${stats.statusOmzet}</small>
          </div>
        </div>
      </div>

      <div class="col-md-3 col-6">
        <div class="card border-warning h-100">
          <div class="card-body">
            <div class="d-flex align-items-center mb-2">
              <i class="fas fa-receipt me-2" style="color: #ffc107; font-size: 1.5rem;"></i>
              <h6 class="card-subtitle mb-0 text-muted">TRANSAKSI TOTAL</h6>
            </div>
            <h2 class="card-title mb-1" style="color: #ffc107;">
              <strong>${stats.totalTransaksi}</strong>
            </h2>
            <div class="mt-2">
              <span class="badge bg-success me-1">✓ ${stats.totalSukses}</span>
              <span class="badge bg-warning me-1">◷ ${stats.totalProses}</span>
              <span class="badge bg-danger">✗ ${stats.totalGagal}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="col-md-3 col-6">
        <div class="card border-success h-100">
          <div class="card-body">
            <div class="d-flex align-items-center mb-2">
              <i class="fas fa-money-bill-wave me-2" style="color: #28a745; font-size: 1.5rem;"></i>
              <h6 class="card-subtitle mb-0 text-muted">PEMBAYARAN</h6>
            </div>
            <h3 class="card-title mb-1" style="color: #28a745;">
              <strong>${stats.pembayaranLunas}</strong> Lunas
            </h3>
            <h5 class="text-muted mb-0">
              ${stats.pembayaranBelumLunas} Belum Lunas
            </h5>
          </div>
        </div>
      </div>

      <div class="col-md-3 col-6">
        <div class="card border-info h-100">
          <div class="card-body">
            <div class="d-flex align-items-center mb-2">
              <i class="fas fa-calendar-check me-2" style="color: #17a2b8; font-size: 1.5rem;"></i>
              <h6 class="card-subtitle mb-0 text-muted">RATA-RATA HARIAN</h6>
            </div>
            <h3 class="card-title mb-1" style="color: #17a2b8;">
              <strong>${formatCurrency(stats.rataRataHarian)}</strong>
            </h3>
            <small class="text-muted">
              ${stats.rataRataTransaksiHarian.toFixed(1)} transaksi/hari
            </small>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// ✅ FUNGSI BARU - DASHBOARD STATISTICS
// ============================================

async function getDashboardStatistics() {
    try {
        console.log('📊 Fetching dashboard statistics (NEW)...');
        
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startDate = firstDayOfMonth.toISOString().split('T');
        const endDate = today.toISOString().split('T');
        
        console.log(`📅 Date range: ${startDate} to ${endDate}`);
        
        const { data: allTransaksi, error } = await supabase
            .from(CONSTANTS.TABLES.LIST_HARIAN)
            .select('*')
            .gte('tgl_order', startDate)
            .lte('tgl_order', endDate)
            .order('tgl_order', { ascending: true });
        
        if (error) {
            console.error('❌ Error fetching transaksi:', error);
            throw error;
        }
        
        console.log(`✅ Got ${allTransaksi?.length || 0} transaksi`);
        
        const transaksiSukses = allTransaksi.filter(t => t.status_order === 'SUKSES');
        const transaksiProses = allTransaksi.filter(t => t.status_order === 'PROSES');
        const transaksiGagal = allTransaksi.filter(t => t.status_order === 'GAGAL' || t.status_order === 'BATAL');
        
        const omzetBulanIni = transaksiSukses.length * 20000;
        const pembayaranLunas = allTransaksi.filter(t => t.status_bayar === 'LUNAS').length;
        const pembayaranBelumLunas = allTransaksi.filter(t => t.status_bayar === 'BELUM LUNAS').length;
        
        const daysPassed = Math.floor((today - firstDayOfMonth) / (1000 * 60 * 60 * 24)) + 1;
        const rataRataHarian = daysPassed > 0 ? omzetBulanIni / daysPassed : 0;
        const rataRataTransaksiHarian = daysPassed > 0 ? transaksiSukses.length / daysPassed : 0;
        
        const stats = {
            omzetBulanIni: omzetBulanIni,
            bulanLalu: 0,
            persenOmzet: 0,
            statusOmzet: 'success',
            totalTransaksi: allTransaksi.length,
            totalSukses: transaksiSukses.length,
            totalProses: transaksiProses.length,
            totalGagal: transaksiGagal.length,
            pembayaranLunas: pembayaranLunas,
            pembayaranBelumLunas: pembayaranBelumLunas,
            rataRataHarian: rataRataHarian,
            rataRataTransaksiHarian: rataRataTransaksiHarian,
            daysPassed: daysPassed,
            startDate: startDate,
            endDate: endDate,
        };
        
        console.log('✅ Dashboard Statistics:', stats);
        return stats;
        
    } catch (error) {
        console.error('❌ Error in getDashboardStatistics:', error.message);
        showAlert('error', `Gagal memuat statistik dashboard: ${error.message}`);
        throw error;
    }
}

function renderDashboardKPI(stats, containerId = 'dashboard-kpi') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn('⚠️ Container dashboard-kpi not found');
        return;
    }

    container.innerHTML = `
    <div class="row g-3">
      <div class="col-md-3 col-6">
        <div class="card border-primary h-100">
          <div class="card-body">
            <div class="d-flex align-items-center mb-2">
              <i class="fas fa-chart-line me-2" style="color: #007bff; font-size: 1.5rem;"></i>
              <h6 class="card-subtitle mb-0 text-muted">OMZET BULAN INI</h6>
            </div>
            <h2 class="card-title mb-1" style="color: #007bff;">
              <strong>${formatCurrency(stats.omzetBulanIni)}</strong>
            </h2>
            <small class="text-muted">Status: ${stats.statusOmzet}</small>
          </div>
        </div>
      </div>
      
      <div class="col-md-3 col-6">
        <div class="card border-warning h-100">
          <div class="card-body">
            <div class="d-flex align-items-center mb-2">
              <i class="fas fa-receipt me-2" style="color: #ffc107; font-size: 1.5rem;"></i>
              <h6 class="card-subtitle mb-0 text-muted">TRANSAKSI TOTAL</h6>
            </div>
            <h2 class="card-title mb-1" style="color: #ffc107;">
              <strong>${stats.totalTransaksi}</strong>
            </h2>
            <div class="mt-2">
              <span class="badge bg-success me-1">✓ ${stats.totalSukses}</span>
              <span class="badge bg-warning me-1">◷ ${stats.totalProses}</span>
              <span class="badge bg-danger">✗ ${stats.totalGagal}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-3 col-6">
        <div class="card border-success h-100">
          <div class="card-body">
            <div class="d-flex align-items-center mb-2">
              <i class="fas fa-money-bill-wave me-2" style="color: #28a745; font-size: 1.5rem;"></i>
              <h6 class="card-subtitle mb-0 text-muted">PEMBAYARAN</h6>
            </div>
            <h3 class="card-title mb-1" style="color: #28a745;">
              <strong>${stats.pembayaranLunas}</strong> Lunas
            </h3>
            <h5 class="text-muted mb-0">
              ${stats.pembayaranBelumLunas} Belum Lunas
            </h5>
          </div>
        </div>
      </div>
      
      <div class="col-md-3 col-6">
        <div class="card border-info h-100">
          <div class="card-body">
            <div class="d-flex align-items-center mb-2">
              <i class="fas fa-calendar-check me-2" style="color: #17a2b8; font-size: 1.5rem;"></i>
              <h6 class="card-subtitle mb-0 text-muted">RATA-RATA HARIAN</h6>
            </div>
            <h3 class="card-title mb-1" style="color: #17a2b8;">
              <strong>${formatCurrency(stats.rataRataHarian)}</strong>
            </h3>
            <small class="text-muted">
              ${stats.rataRataTransaksiHarian.toFixed(1)} transaksi/hari
            </small>
          </div>
        </div>
      </div>
    </div>
  `;
}


console.log('✅ rekap-v2.js (FINAL PATCH - WITH DASHBOARD FUNCTIONS) loaded successfully!');