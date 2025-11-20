// ============================================
// app.js (v_FINAL_BERSIH)
// Main Application Logic & Event Handlers
// =PENTING: Ini adalah versi yang sudah di-patch
// ============================================

// Global State
let currentPageDataMaster = 1;
let currentPageListHarian = 1;
let currentPageRekap = 1;
let listHarianSortField = 'tgl_order';
let listHarianSortAsc = false;

// ✅ VARIABEL BARU - Sorting Data Master
let dataMasterSortField = 'nama_user';
let dataMasterSortAsc = true;

let selectedTransaksiIds = [];
let selectedDataMasterIds = [];


// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize aplikasi saat halaman dimuat
 */
async function initializeApp() {
    try {
        console.log('🚀 Initializing Sembako KJP App...');

        // Baris 'user-info' SUDAH DIHAPUS agar tidak error

        // ========================================================
        // Load Dashboard Awal
        // ========================================================
        await loadDashboard();

        // Panggil Running Text Manual (untuk memastikan dia jalan)
        if (typeof updateHeaderRunningText === 'function') {
            updateHeaderRunningText();
        }

        console.log('✅ App initialized successfully!');
    } catch (error) {
        console.error('❌ Error initializing app:', error);
        showAlert('error', 'Gagal menginisialisasi aplikasi');
    }
}

// Event Listener Utama
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
        // 1. Load KPI Statistics
        const stats = await getDashboardStatistics();
        renderDashboardKPI(stats, 'dashboard-kpi');

        document.getElementById('data-master-pagination').innerHTML = '';
        document.getElementById('list-harian-pagination').innerHTML = '';
        document.getElementById('rekap-pagination').innerHTML = '';

        console.log('📊 Loading charts...');

        // 2. Get date range (bulan ini untuk grafik 1 & 3, 30 hari untuk grafik 2)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
        const endOfMonthStr = now.toISOString().split('T')[0];

        // Get 30 hari ke belakang
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 29);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        // 3. Fetch data
        const { data: thisMonthData } = await supabase
            .from(CONSTANTS.TABLES.LIST_HARIAN)
            .select('*')
            .gte('tgl_order', startOfMonthStr)
            .lte('tgl_order', endOfMonthStr);

        const { data: last30DaysData } = await supabase
            .from(CONSTANTS.TABLES.LIST_HARIAN)
            .select('*')
            .gte('tgl_order', thirtyDaysAgoStr)
            .lte('tgl_order', endOfMonthStr)
            .eq('status_order', 'SUKSES'); // ✅ FIX: Ubah dari status_bayar ke status_order

        // 4. Render charts
        renderStatusOrderChart(thisMonthData || []);
        renderTrendOmzetChart(last30DaysData || []);
        renderTopParentChart(thisMonthData || []);

        console.log('✅ Dashboard charts loaded!');

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showAlert('error', `Gagal memuat dashboard: ${error.message}`);
    }
}

// ============================================
// CHART FUNCTIONS - FIXED VERSION (NO DUPLICATES)
// ============================================

/**
 * Grafik 1: Status Order (Donut Chart)
 * Sukses (Hijau), Gagal (Merah), Proses (Kuning)
 */
function renderStatusOrderChart(data) {
    try {
        const sukses = data.filter(d => d.status_order === 'SUKSES').length;
        const gagal = data.filter(d => d.status_order === 'GAGAL').length;
        const proses = data.filter(d => d.status_order === 'PROSES').length;


        const ctx = document.getElementById('statusOrderChart');
        if (!ctx) {
            console.warn('⚠️ Canvas statusOrderChart not found');
            return;
        }

        // ✅ FIX: Proper destroy check
        if (window.statusOrderChart && typeof window.statusOrderChart.destroy === 'function') {
            window.statusOrderChart.destroy();
        }

        window.statusOrderChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [`Sukses (${sukses})`, `Gagal (${gagal})`, `Proses (${proses})`],
                datasets: [{
                    data: [sukses, gagal, proses],
                    backgroundColor: ['#28a745', '#dc3545', '#ffc107'],
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 15, font: { size: 12 } } }
                }
            }
        });

        console.log('✅ Status Order Chart rendered:', { sukses, gagal, proses });

    } catch (error) {
        console.error('❌ Error rendering Status Order Chart:', error);
    }
}

/**
 * Grafik 2: Tren Omzet 30 Hari (Line Chart)
 * Dual axis: Omzet & Jumlah Transaksi
 */
function renderTrendOmzetChart(data) {
    try {
        if (!data || data.length === 0) {
            console.warn('⚠️ No data for trend chart');
            return;
        }

        const trenByDate = {};
        data.forEach(d => {
            const date = d.tgl_order;
            if (!trenByDate[date]) trenByDate[date] = { omzet: 0, transaksi: 0 };
            // ✅ FIX: Gunakan nominal 20000 per transaksi sukses, sesuai KPI
            trenByDate[date].omzet += 20000;
            trenByDate[date].transaksi += 1;
        });
        const sortedDates = Object.keys(trenByDate).sort();
        const labels = sortedDates.map(d => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }));
        const omzetData = sortedDates.map(d => Math.round(trenByDate[d].omzet / 1000));
        const transaksiData = sortedDates.map(d => trenByDate[d].transaksi);

        const ctx = document.getElementById('trendOmzetChart');
        if (!ctx) {
            console.warn('⚠️ Canvas trendOmzetChart not found');
            return;
        }

        // ✅ FIX: Proper destroy check
        if (window.trendOmzetChart && typeof window.trendOmzetChart.destroy === 'function') {
            window.trendOmzetChart.destroy();
        }

        window.trendOmzetChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Omzet (Rp Ribu)',
                        data: omzetData,
                        borderColor: '#0d6efd',
                        backgroundColor: 'rgba(13, 110, 253, 0.05)',
                        tension: 0.3,
                        fill: true,
                        yAxisID: 'y',
                        pointRadius: 3
                    },
                    {
                        label: 'Transaksi',
                        data: transaksiData,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.05)',
                        tension: 0.3,
                        fill: true,
                        yAxisID: 'y1',
                        pointRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    y: { type: 'linear', position: 'left', title: { display: true, text: 'Omzet (Rp)' } },
                    y1: { type: 'linear', position: 'right', title: { display: true, text: 'Transaksi' }, grid: { drawOnChartArea: false } }
                },

                plugins: {
                    legend: { position: 'top', labels: { padding: 15, font: { size: 12 } } },
                    // ================================================================
                    // ✅✅✅ PATCH FIX TOOLTIP (GRAFIK TREN OMZET) ✅✅✅
                    // ================================================================
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';

                                // Logika untuk chart GARIS (Line Chart)
                                if (label.includes('Omzet')) {
                                    // Ambil nilai dari Sumbu Y (misal: 9000) dan kalikan 1000
                                    const rawValue = context.parsed.y * 1000;
                                    // Format menjadi "9.000.000"
                                    const formattedValue = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(rawValue);
                                    return `Omzet: ${formattedValue}`;
                                }
                                if (label === 'Transaksi') {
                                    return `Transaksi: ${context.parsed.y}`;
                                }
                                return label;
                            }
                        }
                    }
                    // ================================================================
                    // ✅✅✅ AKHIR DARI PATCH FIX TOOLTIP ✅✅✅
                    // ================================================================
                }
            }
        });

        console.log('✅ Trend Omzet Chart rendered, dates:', sortedDates.length);

    } catch (error) {
        console.error('❌ Error rendering Trend Omzet Chart:', error);
    }
}

/**
 * Grafik 3: Top 20 Keluarga (Omzet Terbanyak) - FINAL VERSION
 * - Font Lebih Besar
 * - Ada Label Jumlah Transaksi di Atas Batang
 */
function renderTopParentChart(data) {
    try {
        const parentStats = {};
        data.forEach(d => {
            let parent = d.parent_name;
            if (!parent || parent.trim() === '') {
                parent = d.nama_user ? extractParentName(d.nama_user) : 'Tanpa Nama';
            }

            if (!parentStats[parent]) parentStats[parent] = { omzet: 0, count: 0 };

            if (d.status_order === 'SUKSES') {
                parentStats[parent].omzet += 20000;
                parentStats[parent].count += 1;
            }
        });

        // Ambil Top 20
        const topParents = Object.entries(parentStats)
            .map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => b.omzet - a.omzet)
            .slice(0, 20);

        if (topParents.length === 0) {
            console.warn('⚠️ No parent data for chart');
            return;
        }

        // Persiapan Data
        const names = topParents.map(p => {
            const n = p.name;
            // Potong nama sedikit lebih panjang biar jelas (maks 18 karakter)
            return n.length > 18 ? n.substring(0, 18) + '..' : n;
        });
        const omzet = topParents.map(p => p.omzet);
        const count = topParents.map(p => p.count);

        const ctx = document.getElementById('topParentChart');
        if (!ctx) return;

        if (window.topParentChart instanceof Chart) {
            window.topParentChart.destroy();
        }

        const infographicColors = [
            '#FF5733', '#FF8D1A', '#FFC300', '#DAF7A6', '#33FF57',
            '#33FFBD', '#33DBFF', '#3375FF', '#8D33FF', '#C733FF',
            '#FF33A8', '#FF3361', '#F08080', '#CD5C5C', '#FA8072',
            '#E9967A', '#FF4500', '#FF6347', '#FFD700', '#ADFF2F'
        ];

        // PLUGIN KHUSUS: MENAMPILKAN ANGKA DI ATAS BATANG
        const dataLabelPlugin = {
            id: 'dataLabelPlugin',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    if (meta.hidden) return;

                    meta.data.forEach((element, index) => {
                        // Ambil jumlah transaksi dari array 'count'
                        const dataString = count[index] + ' Trx';

                        ctx.save();
                        ctx.font = 'bold 12px Poppins'; // Font Label di atas batang
                        ctx.fillStyle = '#444'; // Warna Teks Abu Gelap
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';

                        const position = element.tooltipPosition();
                        // Gambar teks 5px di atas batang
                        ctx.fillText(dataString, position.x, position.y - 6);
                        ctx.restore();
                    });
                });
            }
        };

        window.topParentChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: names,
                datasets: [
                    {
                        label: 'Omzet',
                        data: omzet,
                        backgroundColor: infographicColors,
                        borderRadius: 6,
                        borderSkipped: false,
                        barPercentage: 0.75,
                        categoryPercentage: 0.85
                    }
                ]
            },
            plugins: [dataLabelPlugin], // <--- Aktifkan Plugin Label
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 25 // Tambah padding atas biar tulisan tidak kepotong
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        titleFont: { family: 'Poppins', size: 14 }, // Tooltip Besar
                        bodyFont: { family: 'Poppins', size: 14 },   // Tooltip Besar
                        padding: 12,
                        callbacks: {
                            label: function (context) {
                                const idx = context.dataIndex;
                                const val = new Intl.NumberFormat('id-ID').format(context.raw);
                                const trx = count[idx];
                                return [`Omzet: Rp ${val}`, `Transaksi: ${trx}`];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f0f0f0',
                            drawBorder: false,
                        },
                        ticks: {
                            font: { family: 'Poppins', size: 12, weight: '500' }, // Font Y Axis DIPERBESAR
                            color: '#555',
                            callback: function (value) {
                                return (value / 1000) + 'k';
                            }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { family: 'Poppins', size: 12, weight: 'bold' }, // Font Nama DIPERBESAR
                            color: '#333',
                            autoSkip: false,
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error('❌ Error rendering Top Parent Chart:', error);
    }
}


/**
 * Load data master ke table
 */
async function loadDataMaster(page = 1) {
    try {
        console.log('📋 Loading data master, page:', page);
        currentPageDataMaster = page;

        const result = await getDataMaster(page, dataMasterSortField, dataMasterSortAsc);

        // ✅ FIX - Pastikan table container VISIBLE sebelum set data
        const tableBody = document.getElementById('data-master-table-body');
        if (tableBody) {
            tableBody.style.display = '';           // Remove display:none
            tableBody.style.visibility = 'visible'; // Ensure visible
            tableBody.style.opacity = '1';          // Ensure not transparent
        }

        if (!result || !result.data || result.data.length === 0) {
            console.warn('⚠️ No data master found for page:', page);
            document.getElementById('data-master-table-body').innerHTML = `
                <tr>
                    <td colspan="9" class="text-center text-muted py-4">
                        <i class="fas fa-inbox"></i> Tidak ada data pelanggan
                    </td>
                </tr>
            `;
            document.getElementById('data-master-pagination').innerHTML = '';
            document.getElementById('list-harian-pagination').innerHTML = '';
            document.getElementById('rekap-pagination').innerHTML = '';
            return;
        }

        console.log('✅ Data master loaded:', result.data.length, 'records');

        let html = '';
        result.data.forEach((item, index) => {
            const rowNum = (page - 1) * CONSTANTS.PAGE_SIZE + index + 1;
            html += `
    <tr>
      <td>
        <input type="checkbox" class="dm-checkbox" value="${item.id}" onchange="updateBulkSelectPanelDataMaster()">
      </td>
      <td>${index + 1}</td>
      <td><strong>${item.nama_user}</strong></td>
      <td>${item.parent_name}</td>
      <td><small>${item.no_kjp}</small></td>
      <td><small>${formatNomor(item.no_ktp)}</small></td>
      <td><small>${formatNomor(item.no_kk)}</small></td>
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

        // =================================================================
        // ✅ PATCH 2: SEMUA BLOK setTimeout() DI SINI DIHAPUS
        // Karena fungsi ini sekarang HANYA dipanggil oleh tab listener
        // saat tab sudah 100% aktif dan terlihat.
        // =================================================================

        document.getElementById('list-harian-pagination').innerHTML = '';
        document.getElementById('rekap-pagination').innerHTML = '';

        renderPagination(result, 'data-master-pagination', loadDataMaster);
        renderDataMasterSortIndicator();
        updateBulkSelectPanelDataMaster();

        console.log('✅ Data master rendered successfully!');

    } catch (error) {
        console.error('❌ Error loading data master:', error);
        document.getElementById('data-master-table-body').innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-danger py-4">
                    <i class="fas fa-exclamation-circle"></i> Error: ${error.message}
                </td>
            </tr>
        `;
        document.getElementById('data-master-pagination').innerHTML = '';
        showAlert('error', 'Gagal memuat data pelanggan: ' + error.message);
    }
}

// ============================================
// ✅ SORTING DATA MASTER - FUNGSI BARU
// ============================================

/**
 * Handler klik header untuk sorting Data Master
 */
function setDataMasterSort(field) {
    if (dataMasterSortField === field) {
        // Toggle arah jika field sama
        dataMasterSortAsc = !dataMasterSortAsc;
    } else {
        // Ganti field, reset ke ascending
        dataMasterSortField = field;
        dataMasterSortAsc = true;
    }
    console.log(`🔄 Sort changed: ${field} ${dataMasterSortAsc ? '↑ ASC' : '↓ DESC'}`);
    // Reload data dengan sort baru
    loadDataMaster(1);
}

/**
 * Render indikator panah sort di header
 */
function renderDataMasterSortIndicator() {
    // Semua field yang bisa disortir
    const sortableFields = ['nama_user', 'parent_name', 'no_kjp', 'no_ktp', 'no_kk', 'tgl_tambah'];

    sortableFields.forEach(field => {
        const el = document.getElementById('sort-' + field);
        if (el) {
            if (dataMasterSortField === field) {
                // Field aktif - tampilkan panah dengan styling BOLD
                el.innerHTML = dataMasterSortAsc ? ' ▲' : ' ▼';
                el.style.color = '#0d6efd'; // Warna biru Bootstrap
                el.style.fontWeight = 'bold';
                el.style.fontSize = '1.1em'; // Perbesar icon
                el.style.marginLeft = '4px';
                el.style.display = 'inline-block'; // Agar bisa menerima styling
                el.classList.add('sort-active'); // Tambah class untuk CSS override
            } else {
                // Field tidak aktif - tampilkan abu-abu samar
                el.innerHTML = ' ↕'; // Icon default (inactive)
                el.style.color = '#d0d0d0'; // Warna abu-abu
                el.style.fontWeight = 'normal';
                el.style.fontSize = '0.9em';
                el.style.marginLeft = '4px';
                el.style.display = 'inline-block';
                el.classList.remove('sort-active');
            }
        }
    });
}


// ============================================
// END - SORTING DATA MASTER
// ============================================

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
            <input type="checkbox" class="dm-checkbox" value="${item.id}" ${isChecked} onchange="updateBulkSelectPanelDataMaster()">
          </td>
          <td>${index + 1}</td>
          <td><strong>${item.nama_user}</strong></td>
          <td>${item.parent_name}</td>
          <td><small>${item.no_kjp}</small></td>
          <td><small>${formatNomor(item.no_ktp)}</small></td>
          <td><small>${formatNomor(item.no_kk)}</small></td>
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

        // =================================================================
        // ✅ PATCH 3: SEMUA BLOK setTimeout() DI SINI JUGA DIHAPUS
        // =================================================================

        document.getElementById('data-master-pagination').innerHTML = '';

        // ✅ Update UI setelah search
        updateBulkSelectPanelDataMaster();
    } catch (error) {
        console.error('Error searching data master:', error);
    }
}


// ============================================
// ✅ PATCH 4: FUNGSI DUPLIKAT DIHAPUS
// ============================================

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
            // --- BARIS INI DIPERBAIKI ---
            parent_name: extractParentName(document.getElementById('nama_user').value.trim()),
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

        // ======================================================
        // AFTER (PATCHED)
        // ======================================================
        // --- Simpan Data ---
        let successData;
        if (id) {
            // 1. Update data master (induk)
            successData = await updateDataMaster(id, formData);

            // 2. PATCH: Cascade update to list_harian (anak)
            if (successData) {
                console.log(`🔄 Mensinkronkan transaksi lama untuk id_master: ${id}`);
                showLoading('Mensinkronkan data transaksi...');

                // Ambil KJP/KTP/KK yang sudah bersih dari utils.js
                const cleanKjp = sanitizeNumber(formData.no_kjp);
                const cleanKtp = sanitizeNumber(formData.no_ktp);
                const cleanKk = sanitizeNumber(formData.no_kk);

                const { error: cascadeError } = await supabase
                    .from(CONSTANTS.TABLES.LIST_HARIAN)
                    .update({
                        nama_user: formData.nama_user,
                        parent_name: formData.parent_name,
                        no_kjp: cleanKjp,
                        no_ktp: cleanKtp,
                        no_kk: cleanKk
                    })
                    .eq('id_master', id); // <-- Kunci utamanya: update semua yg id_master-nya sama

                hideLoading();

                if (cascadeError) {
                    // Jangan hentikan proses, tapi beri peringatan
                    console.error('❌ Error cascading update to list_harian:', cascadeError.message);
                    showAlert('warning', 'Data pelanggan disimpan, tapi gagal sinkronisasi transaksi lama.');
                }
            }
        } else {
            successData = await addDataMaster(formData);
        }

        // ======================================================
        // AFTER (PATCHED)
        // ======================================================
        if (successData) {
            bootstrap.Modal.getInstance(document.getElementById('formDataMasterModal')).hide();
            await loadDataMaster(1); // Muat ulang dari halaman 1

            // PATCH: Wajib reload rekap dan dashboard
            await loadRekap(1);
            await loadDashboard();

            showAlert('success', id ? SUCCESS_MESSAGES.DATA_UPDATED : SUCCESS_MESSAGES.DATA_CREATED);
        }


    } catch (error) {
        hideLoading();
        console.error('Error saving data master:', error);
        // ✅ GANTI BARIS INI
        showAlert('error', parseSupabaseError(error));
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
 * Ini adalah fungsi Hapus Massal yang BENAR, dipanggil oleh tombol.
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
        // ✅ GANTI BARIS INI
        showAlert('error', parseSupabaseError(error));
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

        // ╔═══════════════════════════════════════════════════════╗
        // ║  ➕ TAMBAHKAN: Baca filter dropdown                  ║
        // ╚═══════════════════════════════════════════════════════╝
        const filters = {
            status_order: document.getElementById('filter-status-order')?.value || '',
            status_bayar: document.getElementById('filter-status-bayar')?.value || '',
            tgl_order: document.getElementById('filter-tgl-order')?.value || ''
        };

        // ╔═══════════════════════════════════════════════════════╗
        // ║  ✅ UBAH: Kirim keyword + filters                    ║
        // ╚═══════════════════════════════════════════════════════╝
        const results = await searchListHarian(keyword, filters);


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
        currentTransactionList = results;

        document.getElementById('list-harian-table-body').innerHTML = html;
        document.getElementById('list-harian-pagination').innerHTML = ''; // Hapus pagination saat search
    } catch (error) {
        console.error('Error searching list harian:', error);
    }
}

/**
 * Handle filter list harian (date & status)
 * ✅ FIXED: Sinkronkan dengan search box
 */
function handleFilterListHarian() {
    // ✅ CEK: Apakah ada keyword di search box?
    const keyword = document.getElementById('search-list-harian')?.value || '';

    if (keyword.trim() !== '') {
        // Ada keyword → jalankan search dengan filter
        handleSearchListHarian(keyword);
    } else {
        // Tidak ada keyword → load biasa dengan filter
        loadListHarian(1);
    }
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
 * ➕ TAMBAHAN BARU: Handle bulk delete transaksi harian
 * Dipanggil saat user klik tombol "Hapus Massal"
 */
async function handleBulkDeleteListHarian() {
    try {
        if (!selectedTransaksiIds || selectedTransaksiIds.length === 0) {
            return showAlert('warning', 'Pilih transaksi yang ingin dihapus');
        }

        // Konfirmasi sebelum hapus
        const confirmed = await confirmDialog(
            `Apakah Anda yakin ingin menghapus ${selectedTransaksiIds.length} transaksi terpilih?\n\nProses ini tidak bisa di-undo.`
        );
        if (!confirmed) return;

        // Panggil fungsi bulk delete dari list-harian.js
        const success = await bulkDeleteListHarian(selectedTransaksiIds);

        if (success) {
            showAlert('success', `${selectedTransaksiIds.length} transaksi berhasil dihapus`);

            // Refresh semua data
            await loadListHarian(currentPageListHarian);
            await loadRekap(1);
            await loadDashboard();

            // Clear selection
            clearSelectAllTransaksi();
        }
    } catch (error) {
        console.error('Error bulk delete list harian:', error);
        showAlert('error', `Gagal hapus massal: ${error.message}`);
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
 * * @param {string} masterId - ID pelanggan dari data_master
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
        // ✅ GANTI BARIS INI
        showAlert('error', parseSupabaseError(error));
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

// File: app.js

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

        // PATCH: Header diubah sesuai permintaan
        let csv = 'No,Nama,No. KJP,No. KTP,No. KK,Status Order\n';

        data.forEach((item, index) => {
            // PATCH: Kolom data disesuaikan dengan header baru
            // (no_ktp dan no_kk sudah tersedia dari getAllListHarian)
            csv += `${index + 1},"${item.nama_user || ''}","${item.no_kjp || ''}","${item.no_ktp || ''}","${item.no_kk || ''}","${item.status_order || ''}"\n`;
        });

        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
        // Nama file tetap sama
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
// REKAP FUNCTIONS (PATCHED - EXPANDED DETAIL VIEW)
// ============================================

/**
 * 🔄 Load rekap belum lunas - DETAIL VIEW (PATCHED)
 * Mengambil semua detail transaksi per keluarga (bukan summary)
 */
async function loadRekap(page = 1) {
    try {
        currentPageRekap = page;

        // ✅ PERUBAHAN: Ambil ALL DETAIL (bukan getRekapSummary)
        console.log('📥 Loading rekap dengan detail view...');
        const detailResult = await getAllRekapDetail();

        // ✅ RENDER dengan detail data
        renderRekapTable(detailResult, 'rekap-table-body');

        // ⚠️ NOTA: Detail view tidak perlu pagination (semua data ditampilkan)
        document.getElementById('rekap-pagination').innerHTML = '';

        // 🔧 FIX BARU: POSISIKAN HEADER KE ATAS
        setTimeout(() => {
            // Cari header row di tab rekap
            const rekapTab = document.getElementById('rekap');
            const headerRow = rekapTab?.querySelector('.row:first-child');

            if (headerRow) {
                // Scroll ke header dengan smooth
                headerRow.scrollIntoView({ block: 'start', behavior: 'auto' });

                // Force scroll ke top absolute untuk guarantee
                window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            }
        }, 50);

    } catch (error) {
        console.error('Error loading rekap:', error);
        showAlert('error', 'Gagal memuat rekap: ' + error.message);
    }
}



/**
 * ✅ FIXED: Render rekap table - EXPANDED DETAIL VIEW (PROFESSIONAL STYLING)
 */
function renderRekapTable(detailData, containerId = 'rekap-table-body') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`⚠️ Container not found: ${containerId}`);
        return;
    }

    // ============================================================
    // 🟢 PATCH FIX: HITUNG GRAND TOTAL SUMMARY (HEADER)
    // ============================================================
    let grandTotalTrx = 0;
    let grandTotalNominal = 0;

    if (detailData && detailData.length > 0) {
        detailData.forEach(item => {
            // Pastikan nominal berupa angka valid (default 20000 jika null)
            const nominal = Number(item.nominal);
            const nominalValid = !isNaN(nominal) ? nominal : 20000;

            grandTotalTrx += 1;
            grandTotalNominal += nominalValid;
        });
    }

    // Update Element HTML (Box Biru di atas Tabel)
    const elTrx = document.getElementById('grand-total-trx');
    const elNominal = document.getElementById('grand-total-nominal');

    if (elTrx) {
        elTrx.textContent = grandTotalTrx + " Transaksi"; // Update teks jumlah transaksi
    }
    if (elNominal) {
        elNominal.textContent = formatCurrency(grandTotalNominal); // Update teks total uang
    }
    // ============================================================
    // 🟢 END PATCH
    // ============================================================

    // Clear container
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    // 🔴 Jika tidak ada data
    if (!detailData || detailData.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.className = 'rekap-empty';
        emptyRow.innerHTML = `
            <td colspan="5">
                <i class="fas fa-inbox"></i> Tidak ada data hutang
            </td>
        `;
        container.appendChild(emptyRow);
        return;
    }

    // 🟢 GROUP data by parent_name
    const groupedData = {};
    detailData.forEach(item => {
        if (!groupedData[item.parent_name]) {
            groupedData[item.parent_name] = [];
        }
        groupedData[item.parent_name].push(item);
    });

    // 🟢 Sort nama keluarga alphabetically
    const sortedParents = Object.keys(groupedData).sort();
    let globalNo = 1;

    console.log(`📊 Rendering ${sortedParents.length} keluarga dengan professional styling`);

    // 🟢 RENDER per keluarga dengan subtotal
    sortedParents.forEach(parentName => {
        const transactions = groupedData[parentName];
        let subtotal = 0;

        // 🟢 Render semua transaksi per anak
        transactions.forEach((item) => {
            const row = document.createElement('tr');
            const nominal = item.nominal || 20000;
            subtotal += nominal;

            row.innerHTML = `
                <td>${globalNo}</td>
                <td>${item.nama_user || '-'}</td>
                <td>${item.no_kjp || '-'}</td>
                <td>${item.tgl_transaksi ? formatDateToDisplay(item.tgl_transaksi) : '-'}</td>
                <td>${formatCurrency(nominal)}</td>
            `;
            container.appendChild(row);
            globalNo++;
        });

        // 🟢 Row TOTAL TRANSAKSI per keluarga (BARU)
        const trxCountRow = document.createElement('tr');
        trxCountRow.className = 'rekap-subtotal-row rekap-trx-count-row'; // Tambah class baru
        trxCountRow.innerHTML = `
            <td colspan="4" class="rekap-subtotal-label rekap-trx-label">
                Total Trx ${parentName}
            </td>
            <td class="rekap-subtotal-value rekap-trx-value">
                ${transactions.length} Transaksi
            </td>
        `;
        container.appendChild(trxCountRow);

        // 🟢 Row TOTAL HUTANG per keluarga - PROFESSIONAL STYLE
        const subtotalRow = document.createElement('tr');
        subtotalRow.className = 'rekap-subtotal-row';
        subtotalRow.innerHTML = `
            <td colspan="4" class="rekap-subtotal-label">
                Total Hutang ${parentName}
            </td>
            <td class="rekap-subtotal-value">
                ${formatCurrency(subtotal)}
            </td>
        `;
        container.appendChild(subtotalRow);

        // 🟢 Spacing row antar keluarga
        const spacerRow = document.createElement('tr');
        spacerRow.className = 'rekap-spacer';
        spacerRow.innerHTML = '<td colspan="5"></td>';
        container.appendChild(spacerRow);
    });

    console.log(`✅ Render selesai. Total row: ${globalNo - 1}`);
}


/**
 * View rekap detail per keluarga - MASIH VALID
 * ⚠️ TIDAK DIPAKAI untuk expanded view
 */
async function viewRekapDetail(parentName) {
    try {
        console.log('📋 Opening rekap detail for:', parentName);

        // Ambil data detail dari VIEW
        const details = await getRekapDetailByParent(parentName);

        // ✅ FIX: Hitung total dari VIEW (bukan hardcode)
        const totalHutang = details.reduce((sum, item) => sum + (item.nominal || 20000), 0);

        // Update modal title
        document.getElementById('rekap-detail-title').textContent = `Detail: ${parentName}`;

        // Render table body
        let html = '';
        details.forEach((item, index) => {
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.nama_user}</td>
                    <td>${item.no_kjp || '-'}</td>
                    <td>${formatDateToDisplay(item.tgl_transaksi)}</td>
                    <td class="text-right">${formatCurrency(item.nominal || 20000)}</td>
                </tr>
            `;
        });

        document.getElementById('rekap-detail-table-body').innerHTML = html;

        // ✅ FIX: Update total hutang di modal
        document.getElementById('total-hutang-modal').textContent = formatCurrency(totalHutang);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('rekapDetailModal'));
        modal.show();

    } catch (error) {
        console.error('Error viewing rekap detail:', error);
        showAlert('error', 'Gagal memuat detail rekap');
    }
}


/**
 * Handle search rekap - UPDATED untuk detail view
 */
async function handleSearchRekap(keyword) {
    try {
        // Jika search kosong, load semua
        if (!keyword || keyword.trim() === '') {
            await loadRekap(1);
            return;
        }

        console.log('🔍 Searching rekap untuk:', keyword);

        // Cari di REKAP_DETAIL
        const results = await searchRekap(keyword);

        if (!results || results.length === 0) {
            document.getElementById('rekap-table-body').innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="fas fa-search"></i> Tidak ada hasil untuk "${keyword}"
                    </td>
                </tr>
            `;
            document.getElementById('rekap-pagination').innerHTML = '';
            return;
        }

        // 🟢 RENDER hasil search dengan expanded view
        renderRekapTable(results, 'rekap-table-body');
        document.getElementById('rekap-pagination').innerHTML = ''; // Tidak perlu pagination

        console.log(`✅ Found ${results.length} transaksi`);

    } catch (error) {
        console.error('Error searching rekap:', error);
        showAlert('error', 'Gagal mencari rekap');
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


console.log('✅ app.js (v_FINAL_BERSIH) loaded successfully!');
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

// ============================================================
// ✅✅✅ PATCH FIX EXPORT (JSON & XLSX/CSV) ✅✅✅
// ============================================================

/**
 * Helper function untuk trigger download file di browser
 */
function downloadFile(filename, content, mimeType) {
    const a = document.createElement('a');
    const blob = new Blob([content], { type: mimeType });
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/**
 * Export Data Master ke format JSON
 * (Sesuai title di index.html, hanya No KJP, KTP, KK)
 */
async function exportDataMasterJSON() {
    try {
        showLoading('Exporting JSON...');
        // 1. Ambil SEMUA data master dari Supabase
        const { data, error } = await supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .select('no_kjp, no_ktp, no_kk') // Sesuai title di index.html
            .order('nama_user', { ascending: true });

        if (error) throw error;

        // 2. Konversi ke JSON string
        const jsonContent = JSON.stringify(data, null, 2);

        // 3. Trigger download
        downloadFile('data_master_kjp_ktp_kk.json', jsonContent, 'application/json');
        hideLoading();
        showAlert('success', `${data.length} data diekspor ke JSON.`);

    } catch (error) {
        hideLoading();
        console.error('Error exporting JSON:', error);
        showAlert('error', `Gagal export JSON: ${error.message}`);
    }
}

/**
 * Export Data Master ke format XLSX (sebagai CSV)
 * File .csv ini dapat dibuka dengan sempurna oleh Excel.
 */
async function exportDataMasterXLSX() {
    try {
        showLoading('Exporting XLSX/CSV...');
        // 1. Ambil SEMUA data master
        const { data, error } = await supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .select('*') // Ambil semua kolom untuk export lengkap
            .order('nama_user', { ascending: true });

        if (error) throw error;

        // 2. Buat header CSV
        let csvContent = 'Nama User,Parent Name,No. KJP,No. KTP,No. KK,Tgl Tambah\n';

        // 3. Tambahkan baris data
        data.forEach(item => {
            // Pastikan data bersih (tanpa koma yang merusak CSV)
            const nama = `"${(item.nama_user || '').replace(/"/g, '""')}"`;
            const parent = `"${(item.parent_name || '').replace(/"/g, '""')}"`;
            const kjp = item.no_kjp || '';
            const ktp = item.no_ktp || '';
            const kk = item.no_kk || '';
            const tgl = item.tgl_tambah || '';

            csvContent += `${nama},${parent},${kjp},${ktp},${kk},${tgl}\n`;
        });

        // 4. Trigger download
        // Kita gunakan ekstensi .csv agar Excel langsung mengenalinya
        downloadFile('data_master_lengkap.csv', csvContent, 'text/csv;charset=utf-8;');
        hideLoading();
        showAlert('success', `${data.length} data diekspor. File akan disimpan sebagai .csv`);

    } catch (error) {
        hideLoading();
        console.error('Error exporting XLSX/CSV:', error);
        showAlert('error', `Gagal export XLSX: ${error.message}`);
    }
}

// ============================================
// HEADER RUNNING TEXT UPDATE
// ============================================

// app.js

function updateHeaderRunningText() {
    const element = document.getElementById('header-running-text');
    if (!element) return;

    // --- PUISI PANJANG (41 QUOTES DIRAPATKAN) ---
    // Gunakan simbol | ❤ | sebagai pemisah antar quote
    const myText =
        "Ada 26 huruf dalam huruf alfabet, tapi aku hanya tertarik pada U." +
        " | ❤ | " + "Aku pernah menolak yang datang, hanya untuk mempertahankan dia yang ingin pergi." +
        " | ❤ | " + "Dingin tak selalu tentang suhu, bisa juga tentang sikapmu kepadaku." +
        " | ❤ | " + "Lelaki yang mencintai banyak wanita berarti dia memahami wanita, tapi lelaki yang mencintai satu wanita berarti dia memahami cinta." +
        " | ❤ | " + "Tidak ada yang namanya mantan terindah karena yang terindah tidak akan meninggalkan cerita, tapi selalu membuat cerita." +
        " | ❤ | " + "Selamat pagi buat kamu yang selalu kunanti, yang tak pernah kumiliki, dan semuanya hanya imajinasi. Ambillah cangkulmu dan mari bercocok tanam bersamaku." +
        " | ❤ | " + "Sholatlah walau terpaksa, berhijablah walau terpaksa karena lebih baik dipaksa masuk surga, daripada sukarela masuk neraka." +
        " | ❤ | " + "Jatuh cintalah kepada mereka yang pernah patah hati karena mereka lebih tahu caranya menghargai." +
        " | ❤ | " + "Ingat ya, ada beras yang harus dijadikan nasi. Ada ukhty yang harus dijadikan istri." +
        " | ❤ | " + "Indahnya pelangi akan kalah dengan sinar matahari, karena yang datang sesaat akan kalah dengan yang tiap hari menemani." +
        " | ❤ | " + "Harapanku sederhana, semoga kelak kita dapat menyaksikan matahari terbit dari jendela yang sama." +
        " | ❤ | " + "Hilangku tak dicari, hadirku tak dinanti, pergiku tak ditahan, kembaliku tak diharapkan. Memang mencintai sendirian itu menyakitkan." +
        " | ❤ | " + "Kamu bagiku adalah candu, namun aku bagimu sebatas canda." +
        " | ❤ | " + "Hanya karena nyaman, aku lupa bahwa kita hanya sebatas teman." +
        " | ❤ | " + "Maafkan aku yang sering mengganggu waktumu hanya karena urusan rindu." +
        " | ❤ | " + "Aku bersedia menjadi hujan di tengah kemaraumu. Namun, setelah aku jatuh, kau memilih berteduh." +
        " | ❤ | " + "Faktanya, kita tak benar-benar ingin melupakan. Hanya menjaga jarak agar tak saling merindukan." +
        " | ❤ | " + "Di langit yang kau tatap, ada rindu yang kutitip." +
        " | ❤ | " + "Dulu, kita pernah tertawa lepas, sebelum akhirnya saling melepas." +
        " | ❤ | " + "Titip salam buat orang tuamu, dari aku yang siap melanjutkan kasih sayang mereka kepadamu." +
        " | ❤ | " + "Siapa yang mencintai terlalu dalam, dialah yang terbuang." +
        " | ❤ | " + "Aku terlalu mencintai manusia hingga Tuhan cemburu dan memberi luka." +
        " | ❤ | " + "Aku adalah seorang yang dipaksa maju oleh cinta, dan dipukul mundur oleh harta." +
        " | ❤ | " + "Darimana datangnya kecewa? Dari dia yang kau anggap istimewa." +
        " | ❤ | " + "Dia hanya bercanda. Harusnya kamu tertawa, bukan malah jatuh cinta." +
        " | ❤ | " + "Aku tak berhenti mencintaimu, aku hanya berhenti menunjukkannya." +
        " | ❤ | " + "Jangankan pacaran, minta hotspot sama teman saja sering diputusin." +
        " | ❤ | " + "Patah sebelum parah, adalah cara Tuhan menyelamatkan kita dari orang yang salah." +
        " | ❤ | " + "Aku pernah menjadi orang paling cemas sebelum menjadi orang yang paling ikhlas." +
        " | ❤ | " + "Jangan cari yang sempurna. Karena ini dunia, bukan surga." +
        " | ❤ | " + "Semesta memaksaku untuk melepaskannya, padahal aku saja belum pernah menggenggamnya." +
        " | ❤ | " + "Aku seringkali keliru menafsirkan rindu, kadang menjadi rasa ingin bertemu, tak jarang juga menjadi cemburu yang membuat gelisah tak menentu. Maafkan segala kurangku." +
        " | ❤ | " + "Jika mendekatimu adalah kesalahan, maka ijinkan aku berjuang untuk mencintaimu dengan sisa hal yang kau benarkan." +
        " | ❤ | " + "Aku mencintaimu dari jauh, dari jarak-jaraj yang berusaha membuat kita rapuh, dan doa-doa yang inigin kita tetap utuh." +
        " | ❤ | " + "Akulah laki-laki yang selalu berusaha membuatmu lupa bahawa kamu pernah terluka." +
        " | ❤ | " + "Pada akhirnya, janji-janji tertulis akan kalah dengan bukti-bukti tertulus." +
        " | ❤ | " + "Baru di senyumin udah berharap bisa milikin." +
        " | ❤ | " + "Apakah aku harus memeluk senja, biar kamu tahu kamu itu berharga?" +
        " | ❤ | " + "Sejak kau pergi, entah mengapa luka ini tumbuh subur dalam hati. Padahal kau tak benar-benar ku miliki." +
        " | ❤ | " + "Kau tak perlu peduli, luka dan sepi sudah ku anggap teman sendiri." +
        " | ❤ | " + "Kamu gak ada kabar, aku berpikir kamu memang sibuk atau aku yang gak penting.";

    // Gabungkan teks 2x agar animasinya tidak ada jeda kosong
    element.textContent = `${myText}   | ❤ |   ${myText}`;
}

// Panggil fungsi saat inisialisasi & update setiap menit
document.addEventListener('DOMContentLoaded', () => {
    updateHeaderRunningText();
    setInterval(updateHeaderRunningText, 60000); // Update jam setiap 60 detik
});