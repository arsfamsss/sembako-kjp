// ============================================
// rekap-v2.js (FINAL FULL VERSION - FIXED)
// Termasuk: Dashboard Stats, Rekap Table (Grand Total), & Download TXT Rapi
// ============================================

console.log('Loading rekap.js (FULL)...');

// ============================================
// 1. DATA FETCHING FUNCTIONS
// ============================================

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

        if (error) throw error;

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

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('❌ Error in getRekapDetailByParent:', error.message);
        throw error;
    }
}

// [CRITICAL FUNCTION] Ini yang tadi error "not defined"
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
        console.error('❌ Error in getAllRekapDetail:', error.message);
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
            .from(CONSTANTS.VIEWS.REKAP_DETAIL)
            .select('*')
            .ilike('parent_name', `%${keyword}%`)
            .limit(100);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('❌ Error searchRekap:', error.message);
        throw error;
    }
}

// ============================================
// 2. RENDERING FUNCTIONS (WITH PATCH)
// ============================================

function renderRekapTable(rekapData, containerId = 'rekap-table-body') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`⚠️ Container not found: ${containerId}`);
        return;
    }

    // [PATCH FIX V2] HITUNG GRAND TOTAL (DENGAN LOGGING)
    let grandTotalTrx = 0;
    let grandTotalNominal = 0;

    if (rekapData && rekapData.length > 0) {
        console.log(`📊 Menghitung total dari ${rekapData.length} baris data...`);
        rekapData.forEach(item => {
            // Paksa konversi angka agar tidak error
            const nominal = Number(item.nominal);
            const nominalValid = !isNaN(nominal) ? nominal : 20000; // Default 20rb jika null/error

            grandTotalTrx += 1; // Asumsi mode detail = 1 baris 1 transaksi
            grandTotalNominal += nominalValid;
        });
    } else {
        console.log('⚠️ Data rekap kosong atau belum dimuat');
    }

    // Update Elemen HTML Dashboard Summary
    const elTrx = document.getElementById('grand-total-trx');
    const elNominal = document.getElementById('grand-total-nominal');

    if (elTrx) {
        elTrx.textContent = grandTotalTrx + " Transaksi";
    } else {
        console.warn('❌ Element ID "grand-total-trx" tidak ditemukan di HTML. Pastikan patch index.html sudah diterapkan.');
    }

    if (elNominal) {
        elNominal.textContent = formatCurrency(grandTotalNominal);
    }

    // Clear container (Hapus isi tabel lama)
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    if (!rekapData || rekapData.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="fas fa-inbox"></i> Tidak ada data hutang
                </td>
            </tr>
        `;
        return;
    }

    // Render Rows
    rekapData.forEach((item, index) => {
        const row = document.createElement('tr');
        const escapedParentName = item.parent_name ? item.parent_name.replace(/'/g, "\\'").replace(/"/g, '&quot;') : '';

        const displayName = item.parent_name || item.nama_user || '-';
        const displayJmlAnak = item.jumlah_anak || 1;
        const displayJmlTrx = item.jumlah_transaksi !== undefined ? item.jumlah_transaksi : 1;
        const displayHutang = item.total_hutang !== undefined ? item.total_hutang : (item.nominal || 20000);

        const displayTglPertama = item.tgl_transaksi_pertama ? formatDateToDisplay(item.tgl_transaksi_pertama) : (item.tgl_transaksi ? formatDateToDisplay(item.tgl_transaksi) : '-');
        const displayTglTerakhir = item.tgl_transaksi_terakhir ? formatDateToDisplay(item.tgl_transaksi_terakhir) : '-';

        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${displayName}</strong></td>
            <td class="text-center">${displayJmlAnak}</td>
            <td class="text-center"><span class="badge bg-warning">${displayJmlTrx}</span></td>
            <td class="text-right"><strong>${formatCurrency(displayHutang)}</strong></td>
            <td><small>${displayTglPertama}</small></td>
            <td><small>${displayTglTerakhir}</small></td>
            <td class="text-center">
                <button class="btn btn-sm btn-info" onclick="showRekapDetailModal('${escapedParentName}')" title="Lihat detail">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        container.appendChild(row);
    });
}

// ============================================
// 3. UI HELPER FUNCTIONS
// ============================================

async function showRekapDetailModal(parentName) {
    const oldModal = document.getElementById('rekapDetailModal');
    if (oldModal) oldModal.remove();

    try {
        showLoading(`Memuat detail ${parentName}...`);
        const rekapDetail = await getRekapDetailByParent(parentName);
        hideLoading();

        if (rekapDetail.length === 0) {
            showAlert('warning', 'Tidak ada data detail');
            return;
        }

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

        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = html;
        const modalElement = modalDiv.firstElementChild;
        document.body.appendChild(modalElement);

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

// ============================================
// 4. DASHBOARD STATISTICS FUNCTIONS
// ============================================

// [CRITICAL FUNCTION] Ini yang tadi error "not defined"
async function getDashboardStatistics() {
    try {
        console.log('📊 Fetching dashboard statistics...');

        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startDate = firstDayOfMonth.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        const { data: allTransaksi, error } = await supabase
            .from(CONSTANTS.TABLES.LIST_HARIAN)
            .select('*')
            .gte('tgl_order', startDate)
            .lte('tgl_order', endDate)
            .order('tgl_order', { ascending: true });

        if (error) throw error;

        const transaksiSukses = allTransaksi.filter(t => t.status_order === 'SUKSES');
        const transaksiProses = allTransaksi.filter(t => t.status_order === 'PROSES');
        const transaksiGagal = allTransaksi.filter(t => t.status_order === 'GAGAL' || t.status_order === 'BATAL');

        const omzetBulanIni = transaksiSukses.length * 20000;
        const pembayaranLunas = allTransaksi.filter(t => t.status_bayar === 'LUNAS').length;
        const pembayaranBelumLunas = allTransaksi.filter(t => t.status_bayar === 'BELUM LUNAS').length;

        const daysPassed = Math.floor((today - firstDayOfMonth) / (1000 * 60 * 60 * 24)) + 1;
        const rataRataHarian = daysPassed > 0 ? omzetBulanIni / daysPassed : 0;
        const rataRataTransaksiHarian = daysPassed > 0 ? transaksiSukses.length / daysPassed : 0;

        return {
            omzetBulanIni,
            statusOmzet: 'success',
            totalTransaksi: allTransaksi.length,
            totalSukses: transaksiSukses.length,
            totalProses: transaksiProses.length,
            totalGagal: transaksiGagal.length,
            pembayaranLunas,
            pembayaranBelumLunas,
            rataRataHarian,
            rataRataTransaksiHarian
        };

    } catch (error) {
        console.error('❌ Error in getDashboardStatistics:', error.message);
        throw error;
    }
}

function renderDashboardKPI(stats, containerId = 'dashboard-kpi') {
    const container = document.getElementById(containerId);
    if (!container) return;

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
// 5. EXPORT & DOWNLOAD FUNCTIONS (WITH PATCH)
// ============================================

async function downloadRekapTXT() {
    try {
        showLoading('Menyiapkan file TXT...');

        const detailData = await getAllRekapDetail();

        if (!detailData || detailData.length === 0) {
            hideLoading();
            showAlert('warning', 'Tidak ada data untuk didownload');
            return;
        }

        const groupedData = {};
        detailData.forEach(item => {
            const parentName = item.parent_name || item.nama_user || 'Tanpa Nama';

            if (!groupedData[parentName]) {
                groupedData[parentName] = { count: 0, total: 0 };
            }
            groupedData[parentName].count += 1;

            const nilai = Number(item.nominal);
            const nominalFix = !isNaN(nilai) && nilai !== 0 ? nilai : 20000;
            groupedData[parentName].total += nominalFix;
        });

        const sortedParents = Object.keys(groupedData).sort();
        let txtContent = "";

        sortedParents.forEach(parent => {
            const data = groupedData[parent];
            const formattedRupiah = formatCurrency(data.total);

            txtContent += `Total Trx ${parent} = ${data.count} Transaksi\n`;
            txtContent += `Total Hutang ${parent} = ${formattedRupiah}\n\n`;
        });

        hideLoading();

        const element = document.createElement('a');
        const file = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });

        // UBAH FORMAT TANGGAL JADI DD-MM-YYYY
        const d = new Date();
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const today = `${day}-${month}-${year}`;

        element.href = URL.createObjectURL(file);
        element.download = `Rekap_Hutang_${today}.txt`; // Hasil: Rekap_Hutang_22-11-2025.txt
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);

        showAlert('success', 'File TXT berhasil didownload');
    } catch (error) {
        hideLoading();
        console.error('Error download TXT:', error);
        showAlert('error', 'Gagal download TXT: ' + error.message);
    }
}

console.log('✅ rekap.js (FULL VERSION) loaded successfully!');