// ============================================
// rekap-v2.js (FINAL FULL VERSION - FIXED STRUCTURE)
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
// 2. RENDERING FUNCTIONS
// ============================================

function renderRekapTable(rekapData, containerId = 'rekap-table-body') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`⚠️ Container not found: ${containerId}`);
        return;
    }

    // [PATCH FIX] HITUNG GRAND TOTAL
    let grandTotalTrx = 0;
    let grandTotalNominal = 0;
    const groupedByParent = {};

    if (rekapData && rekapData.length > 0) {
        console.log(`📊 Menghitung total dari ${rekapData.length} baris data...`);

        rekapData.forEach(item => {
            // EKSTRAK parent
            let parentRaw = item.parent_name;
            if (!parentRaw || parentRaw.trim() === '') {
                parentRaw = item.nama_user ? extractParentName(item.nama_user) : 'Tanpa Nama';
            }

            // NORMALISASI: UPPERCASE + trim + hapus spasi ganda
            const parentKey = parentRaw.trim().toUpperCase().replace(/\s+/g, ' ');

            // Grouping
            if (!groupedByParent[parentKey]) {
                groupedByParent[parentKey] = {
                    transactions: [],
                    totalHutang: 0,
                    totalTrx: 0
                };
            }

            const nominal = Number(item.nominal);
            const nominalValid = !isNaN(nominal) ? nominal : 20000;

            groupedByParent[parentKey].transactions.push(item);
            groupedByParent[parentKey].totalHutang += nominalValid;
            groupedByParent[parentKey].totalTrx += 1;

            grandTotalTrx += 1;
            grandTotalNominal += nominalValid;
        });
    }

    // Update Elemen HTML Dashboard Summary
    const elTrx = document.getElementById('grand-total-trx');
    const elNominal = document.getElementById('grand-total-nominal');

    if (elTrx) elTrx.textContent = grandTotalTrx + " Transaksi";
    if (elNominal) elNominal.textContent = formatCurrency(grandTotalNominal);

    // Clear container
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
    const sortedParents = Object.keys(groupedByParent).sort();
    let rowIndex = 0;

    sortedParents.forEach(parentKey => {
        const group = groupedByParent[parentKey];
        rowIndex++;

        const escapedParentName = parentKey.replace(/'/g, "\\'").replace(/"/g, '&quot;');

        // Ambil range tanggal
        const tglList = group.transactions.map(t => t.tgl_transaksi).filter(t => t).sort();
        const displayTglPertama = tglList.length > 0 ? formatDateToDisplay(tglList[0]) : '-';
        const displayTglTerakhir = tglList.length > 0 ? formatDateToDisplay(tglList[tglList.length - 1]) : '-';

        const uniqueChildren = [...new Set(group.transactions.map(t => t.nama_user))].length;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${rowIndex}</td>
            <td><strong>${parentKey}</strong></td>
            <td class="text-center">${uniqueChildren}</td>
            <td class="text-center"><span class="badge bg-warning">${group.totalTrx}</span></td>
            <td class="text-right"><strong>${formatCurrency(group.totalHutang)}</strong></td>
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
} // ✅ SEKARANG SUDAH ADA KURUNG KURAWAL PENUTUP

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
// 4. DOWNLOAD FUNCTION
// ============================================

async function downloadRekapTXT() {
    try {
        showLoading('Menyiapkan laporan WA...');
        const detailData = await getAllRekapDetail();

        if (!detailData || detailData.length === 0) {
            hideLoading();
            showAlert('warning', 'Tidak ada data untuk didownload');
            return;
        }

        const groupedData = {};
        detailData.forEach(item => {
            let parentRaw = item.parent_name;
            if (!parentRaw || parentRaw.trim() === '') {
                parentRaw = item.nama_user ? extractParentName(item.nama_user) : 'Tanpa Nama';
            }
            const parentKey = parentRaw.trim().toUpperCase().replace(/\s+/g, ' ');

            if (!groupedData[parentKey]) {
                groupedData[parentKey] = [];
            }
            groupedData[parentKey].push(item);
        });

        const d = new Date();
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const today = `${day}/${month}/${year}`;

        let txtContent = "📊 *LAPORAN HUTANG BELUM LUNAS* 📊\n";
        txtContent += `📅 Tanggal Cetak: ${today}\n\n`;

        const sortedParents = Object.keys(groupedData).sort();
        let grandTotalUang = 0;
        let grandTotalTrx = 0;

        sortedParents.forEach(parent => {
            const items = groupedData[parent];
            let subtotalUang = 0;

            txtContent += `👤 *PELANGGAN: ${parent.toUpperCase()}*\n`;

            items.forEach((item, index) => {
                const tgl = item.tgl_transaksi ? formatDateToDisplay(item.tgl_transaksi) : '-';
                let rawNama = item.nama_user || '-';
                let cleanNama = rawNama;
                const match = rawNama.match(/\(([^)]+)\)/);
                if (match && match[1]) {
                    cleanNama = match[1].trim();
                }

                const nominal = Number(item.nominal);
                const nominalFix = !isNaN(nominal) && nominal !== 0 ? nominal : 20000;
                subtotalUang += nominalFix;

                const nomor = (index + 1).toString() + ".";
                txtContent += `${nomor} ${tgl} - ${cleanNama}\n`;
            });

            const totalRp = formatCurrency(subtotalUang);
            txtContent += `*💰 TOTAL: ${items.length} Trx = ${totalRp}*\n\n`;

            grandTotalUang += subtotalUang;
            grandTotalTrx += items.length;
        });

        txtContent += "----------------------------------\n";
        txtContent += `*🏆 GRAND TOTAL: ${formatCurrency(grandTotalUang)}*\n`;
        txtContent += `*📝 TOTAL TRANSAKSI: ${grandTotalTrx}*\n`;
        txtContent += "----------------------------------\n";

        hideLoading();

        const element = document.createElement('a');
        const file = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
        const filenameDate = `${day}-${month}-${year}`;

        element.href = URL.createObjectURL(file);
        element.download = `Laporan_WA_${filenameDate}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);

        showAlert('success', 'Laporan WA berhasil didownload');

    } catch (error) {
        hideLoading();
        console.error('Error download TXT:', error);
        showAlert('error', 'Gagal download TXT: ' + error.message);
    }
}

// ============================================
// 5. GLOBAL EXPORTS
// ============================================

// Fungsi ini penting agar app.js bisa mengaksesnya
function renderDashboardKPI(stats, containerId) {
    // Fungsi dummy agar tidak error jika dipanggil app.js
    // Logic KPI sebenarnya sudah ada di app.js
    console.log('Rendering KPI from rekap.js (helper)');
}

window.getAllRekapDetail = getAllRekapDetail;
window.renderRekapTable = renderRekapTable;
window.downloadRekapTXT = downloadRekapTXT;
window.searchRekap = searchRekap;
window.getRekapDetailByParent = getRekapDetailByParent;
window.renderDashboardKPI = renderDashboardKPI; // Ekspor helper jika diperlukan

console.log('✅ rekap.js FULL VERSION loaded successfully!');