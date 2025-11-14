// ============================================
// rekap-v2.js (FINAL PATCH - FIX DASHBOARD)
// Display Rekap dengan Better Error Handling
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

console.log('✅ rekap-v2.js (FINAL PATCH) loaded successfully!');