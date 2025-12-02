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
let selectedTransaksiData = new Map();
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

        // ✅ PATCH: Set dropdown filter ke bulan sekarang
        if (typeof initDashboardFilterUI === 'function') {
            initDashboardFilterUI();
        }

        await loadDashboard();

        // Panggil Running Text Manual (untuk memastikan dia jalan)

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
 * Load dashboard data (KPI & Statistics) - VERSI SERVER SETTING
 * Syarat: Setting API 'max_rows' di Supabase sudah diubah > 1000 (misal 10000)
 */
async function loadDashboard(filterMonth = null, filterYear = null) {
    try {
        // Tampilkan loading indicator di console
        const mode = (filterMonth !== null) ? `Filter: ${filterMonth + 1}/${filterYear}` : 'Current Month';
        console.log(`📊 Loading dashboard data... (${mode})`);

        // Reset container pagination
        ['data-master-pagination', 'list-harian-pagination', 'rekap-pagination'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });

        const now = new Date();

        // Helper formatting YYYY-MM-DD
        const toLocalYMD = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        // 1. LOGIKA PENENTUAN TANGGAL (SMART FILTER)
        let targetMonth, targetYear;
        let startDateStr, endDateStr;

        if (filterMonth !== null && filterYear !== null) {
            // MODE HISTORY: User memilih bulan/tahun spesifik
            targetMonth = filterMonth;
            targetYear = filterYear;

            // Start: Tanggal 1 bulan itu
            startDateStr = toLocalYMD(new Date(targetYear, targetMonth, 1));

            // End: Tanggal TERAKHIR bulan itu (Tanggal 0 bulan depannya)
            endDateStr = toLocalYMD(new Date(targetYear, targetMonth + 1, 0));

        } else {
            // MODE DEFAULT: Bulan berjalan (Current Month)
            targetMonth = now.getMonth();
            targetYear = now.getFullYear();

            // Sinkronkan UI Dropdown jika ada
            const mEl = document.getElementById('dash-filter-month');
            const yEl = document.getElementById('dash-filter-year');
            if (mEl && yEl) {
                mEl.value = targetMonth;
                yEl.value = targetYear;
            }

            // Start: Tanggal 1 bulan ini
            startDateStr = toLocalYMD(new Date(targetYear, targetMonth, 1));
            // End: Hari ini (Real time)
            endDateStr = toLocalYMD(now);
        }

        // Variabel untuk Grafik Tren (Mulai dari tgl 1 s/d tgl akhir)
        const trendStartDateStr = startDateStr;

        console.log(`📅 Query Dashboard: ${startDateStr} s/d ${endDateStr}`);

        // 2. Fetch Data
        const { data: thisMonthData, error: err1 } = await supabase
            .from(CONSTANTS.TABLES.LIST_HARIAN)
            .select('*')
            .gte('tgl_order', startDateStr)
            .lte('tgl_order', endDateStr);
        // Tidak perlu .limit() atau .range() lagi jika max_rows server sudah besar

        if (err1) throw err1;

        // 3. Hitung KPI
        const trxSukses = thisMonthData.filter(t => t.status_order === 'SUKSES');
        const trxProses = thisMonthData.filter(t => t.status_order === 'PROSES');

        // Gabung status gagal/batal/cancel
        const trxGagal = thisMonthData.filter(t =>
            t.status_order === 'GAGAL' ||
            t.status_order === 'BATAL' ||
            t.status_order === 'CANCEL'
        );

        const trxLunas = thisMonthData.filter(t => t.status_bayar === 'LUNAS');
        const trxBelumLunas = thisMonthData.filter(t => t.status_bayar === 'BELUM LUNAS');

        // ✅ PATCH FIX: Logika Pembagi Hari
        let pembagiHarian = 1;

        if (filterMonth !== null && filterYear !== null) {
            // MODE FILTER (MASA LALU): Gunakan total hari dalam bulan itu (misal 30 atau 31)
            // Rumus JS cari tgl terakhir: new Date(thn, bln+1, 0).getDate()
            pembagiHarian = new Date(filterYear, filterMonth + 1, 0).getDate();
        } else {
            // MODE BULAN INI: Gunakan tanggal hari ini yang sedang berjalan
            pembagiHarian = now.getDate();
        }

        // Safety check biar tidak dibagi 0 atau minus
        if (pembagiHarian < 1) pembagiHarian = 1;

        console.log(`➗ Pembagi Rata-rata: ${pembagiHarian} hari`); // Debugging log

        const stats = {
            omzetBulanIni: trxSukses.length * 20000,
            statusOmzet: 'Updated',
            totalTransaksi: thisMonthData.length,
            totalSukses: trxSukses.length,
            totalProses: trxProses.length,
            totalGagal: trxGagal.length,
            pembayaranLunas: trxLunas.length,
            pembayaranBelumLunas: trxBelumLunas.length,
            rataRataHarian: (trxSukses.length * 20000) / pembagiHarian,
            rataRataTransaksiHarian: trxSukses.length / pembagiHarian
        };

        if (typeof renderDashboardKPI === 'function') {
            renderDashboardKPI(stats, 'dashboard-kpi');
        }

        // 4. Load Chart Data
        const { data: last30DaysData, error: err2 } = await supabase
            .from(CONSTANTS.TABLES.LIST_HARIAN)
            .select('*')
            .gte('tgl_order', trendStartDateStr) // ✅ Variable baru (Tgl 1 bulan tersebut)
            .lte('tgl_order', endDateStr)
            .eq('status_order', 'SUKSES');

        if (err2) throw err2;

        renderStatusOrderChart(thisMonthData || []);
        renderTopParentChart(thisMonthData || []);
        renderTrendOmzetChart(last30DaysData || []);

        console.log(`✅ Dashboard Loaded. Total Data: ${thisMonthData.length}`);

    } catch (error) {
        console.error('❌ Error loading dashboard:', error);
        showAlert('error', 'Gagal update dashboard: ' + error.message);
    }
}

// ============================================
// CHART FUNCTIONS - FIXED VERSION (NO DUPLICATES)
// ============================================

/**
 * Render KPI Cards (Omzet, Transaksi, Pembayaran, Rata-rata)
 * Mengembalikan tampilan 4 kartu di atas grafik.
 */
function renderDashboardKPI(stats, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
    <div class="row g-3">
      <div class="col-md-3 col-6">
        <div class="card border-primary h-100 shadow-sm">
          <div class="card-body d-flex flex-column align-items-center justify-content-center text-center p-3">
            <h6 class="card-title text-muted mb-2 text-uppercase fw-bold" style="font-size: 0.75rem;">
               <i class="fas fa-chart-line text-primary me-2"></i> Omzet Bulan Ini
            </h6>
            <h2 class="fw-bold text-dark mb-1">${formatCurrency(stats.omzetBulanIni)}</h2>
            <small class="text-muted fw-bold" style="font-size: 0.8rem;">Status: ${stats.statusOmzet}</small>
          </div>
        </div>
      </div>

      <div class="col-md-3 col-6">
        <div class="card border-warning h-100 shadow-sm">
          <div class="card-body d-flex flex-column align-items-center justify-content-center text-center p-3">
             <h6 class="card-title text-muted mb-2 text-uppercase fw-bold" style="font-size: 0.75rem;">
               <i class="fas fa-receipt text-warning me-2"></i> Transaksi Total
            </h6>
            <h2 class="fw-bold text-dark mb-2">${stats.totalTransaksi}</h2>
            <div>
              <span class="badge bg-success rounded-pill me-1">✓ ${stats.totalSukses}</span>
              <span class="badge bg-warning text-dark rounded-pill me-1">◷ ${stats.totalProses}</span>
              <span class="badge bg-danger rounded-pill">✗ ${stats.totalGagal}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="col-md-3 col-6">
        <div class="card border-success h-100 shadow-sm">
          <div class="card-body d-flex flex-column align-items-center justify-content-center text-center p-3">
            <h6 class="card-title text-muted mb-2 text-uppercase fw-bold" style="font-size: 0.75rem;">
               <i class="fas fa-money-bill-wave text-success me-2"></i> Pembayaran
            </h6>
            <h2 class="fw-bold text-dark mb-1">${stats.pembayaranLunas} LUNAS</h2>
            <small class="text-muted fw-bold" style="font-size: 0.8rem;">${stats.pembayaranBelumLunas} Belum Lunas</small>
          </div>
        </div>
      </div>

      <div class="col-md-3 col-6">
        <div class="card border-info h-100 shadow-sm">
          <div class="card-body d-flex flex-column align-items-center justify-content-center text-center p-3">
            <h6 class="card-title text-muted mb-2 text-uppercase fw-bold" style="font-size: 0.75rem;">
               <i class="fas fa-calendar-check text-info me-2"></i> Rata-rata Harian
            </h6>
            <h2 class="fw-bold text-dark mb-1">${formatCurrency(stats.rataRataHarian)}</h2>
            <small class="text-muted fw-bold" style="font-size: 0.8rem;">${stats.rataRataTransaksiHarian.toFixed(1)} transaksi/hari</small>
          </div>
        </div>
      </div>
    </div>
  `;
}

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
        // 1. HAPUS GRAFIK LAMA DULU (WAJIB)
        if (window.trendOmzetChart instanceof Chart) {
            window.trendOmzetChart.destroy();
        }

        // 2. BARU CEK DATA KOSONG
        if (!data || data.length === 0) {
            console.warn('⚠️ No data for trend chart (Canvas cleared)');
            return; // Stop di sini, canvas sudah bersih
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


// Grafik 3: Top 20 Keluarga Omzet Terbanyak
function renderTopParentChart(data) {
    try {
        // ==========================================
        // ✅ PATCH: HAPUS GRAFIK LAMA DULUAN (WAJIB)
        // ==========================================
        if (window.topParentChart instanceof Chart) {
            window.topParentChart.destroy();
        }

        const parentStats = {};

        data.forEach(d => {
            // PERBAIKAN: Ekstrak parent DULU, baru normalisasi
            let parentRaw = d.parent_name;

            // Jika kolom parent_name kosong, ekstrak dari nama_user
            if (!parentRaw || parentRaw.trim() === '') {
                parentRaw = d.nama_user ? extractParentName(d.nama_user) : 'Tanpa Nama';
            }

            // Normalisasi: UPPERCASE + trim + hapus spasi ganda
            const parentNormalized = parentRaw.trim().toUpperCase().replace(/\s+/g, ' ');

            if (!parentStats[parentNormalized]) {
                parentStats[parentNormalized] = { omzet: 0, count: 0 };
            }

            if (d.status_order === 'SUKSES') {
                parentStats[parentNormalized].omzet += 20000;
                parentStats[parentNormalized].count += 1;
            }
        });

        // Ambil Top 20 dari parentStats (sudah dinormalisasi dari awal)
        const topParents = Object.entries(parentStats)  // ← DIPERBAIKI: pakai parentStats
            .map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => b.omzet - a.omzet)
            .slice(0, 20);


        // ✅ PATCH: BARU CEK DATA KOSONG SETELAH GRAFIK LAMA DIHAPUS
        if (topParents.length === 0) {
            console.warn('⚠️ No parent data for chart (Canvas cleared)');
            return; // Stop di sini, canvas sudah bersih
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

        // (Kode destroy lama di sini sudah dihapus karena dipindah ke atas)

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

        // ✅ FIX: Tambah pagination
        const start = (page - 1) * CONSTANTS.PAGE_SIZE;
        const end = start + CONSTANTS.PAGE_SIZE - 1;

        // Ambil data dengan pagination DAN hitung total
        const { data, error, count } = await supabase
            .from('data_master')
            .select('*', { count: 'exact' })
            .order(dataMasterSortField || 'no_kjp', { ascending: dataMasterSortAsc })
            .range(start, end);

        if (error) {
            console.error('❌ Error loadDataMaster:', error);
            showAlert('error', 'Gagal memuat data pelanggan: ' + error.message);
            return;
        }

        // Pastikan table container VISIBLE
        const tableBody = document.getElementById('data-master-table-body');
        if (tableBody) {
            tableBody.style.display = '';
            tableBody.style.visibility = 'visible';
            tableBody.style.opacity = '1';
        }

        if (!data || data.length === 0) {
            console.warn('⚠️ No data master found for page:', page);
            document.getElementById('data-master-table-body').innerHTML = `
                <tr>
                    <td colspan="9" class="text-center text-muted py-4">
                        <i class="fas fa-inbox"></i> Tidak ada data pelanggan
                    </td>
                </tr>
            `;
            document.getElementById('data-master-pagination').innerHTML = '';
            return;
        }

        console.log(`✅ Data master loaded: ${data.length} records (page ${page}, total: ${count})`);

        let html = '';
        data.forEach((item, index) => {
            const rowNum = start + index + 1;
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

        // ✅ FIX: Render pagination dengan data yang benar
        const result = {
            data: data,
            count: data.length,
            total: count,
            page: page,
            totalPages: Math.ceil(count / CONSTANTS.PAGE_SIZE)
        };

        document.getElementById('list-harian-pagination').innerHTML = '';
        document.getElementById('rekap-pagination').innerHTML = '';

        renderPagination(result, 'data-master-pagination', loadDataMaster);
        renderDataMasterSortIndicator();
        updateBulkSelectPanelDataMaster();

        console.log('✅ Data master rendered successfully!');

    } catch (err) {
        console.error('❌ Error loadDataMaster:', err);
        document.getElementById('data-master-table-body').innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-danger py-4">
                    <i class="fas fa-exclamation-circle"></i> Error: ${err.message}
                </td>
            </tr>
        `;
        document.getElementById('data-master-pagination').innerHTML = '';
        showAlert('error', 'Gagal memuat data pelanggan: ' + err.message);
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
 * Render indikator panah sort di header (PAKAI FONTAWESOME)
 */
function renderDataMasterSortIndicator() {
    const sortableFields = ['nama_user', 'parent_name', 'no_kjp', 'no_ktp', 'no_kk', 'tgl_tambah'];

    sortableFields.forEach(field => {
        const el = document.getElementById('sort-' + field);
        if (el) {
            if (dataMasterSortField === field) {
                // ✅ AKTIF - Icon FontAwesome biru jelas
                const icon = dataMasterSortAsc ? 'fa-caret-up' : 'fa-caret-down';
                el.innerHTML = ` <i class="fas ${icon}" style="color: #007bff; font-size: 18px;"></i>`;
            } else {
                // ✅ TIDAK AKTIF - Icon abu-abu samar
                el.innerHTML = ` <i class="fas fa-caret-down" style="color: #adb5bd; font-size: 14px; opacity: 0.4;"></i>`;
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
        document.getElementById('data-master-pagination').innerHTML = '';

        // ✅ Update UI setelah search
        updateBulkSelectPanelDataMaster();
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

    // Set default dan max tanggal ke hari ini
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
            parent_name: extractParentName(document.getElementById('nama_user').value.trim()),
        };

        // --- VALIDASI INPUT ---
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
 * Simpan bulk transaksi (FIX REFRESH DASHBOARD)
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

        const { data: masters, error: masterError } = await supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .select('id, nama_user, no_kjp, no_ktp, parent_name, no_kk')
            .in('id', selectedDataMasterIds);

        if (masterError) throw masterError;

        // Buat array transaksi
        const transactions = masters.map(master => ({
            id_master: master.id,
            nama_user: master.nama_user,
            no_kjp: master.no_kjp,
            no_ktp: master.no_ktp,
            no_kk: master.no_kk,
            parent_name: master.parent_name || extractParentName(master.nama_user),
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

            // Pindah ke tab list harian
            const listHarianTab = document.getElementById('list-harian-tab');
            if (listHarianTab) {
                new bootstrap.Tab(listHarianTab).show();
            }

            // ✅ FIX: Refresh Data Wajib
            await loadListHarian(1);
            loadRekap(1);
            loadDashboard(); // Update KPI Dashboard
        }

    } catch (error) {
        hideLoading();
        console.error('Error saving bulk transaksi:', error);
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
            // ✅ WAJIB ADA: Ambil value dari dropdown Status Order
            status_order: document.getElementById('filter-status-order')?.value || '',
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

            // ✅ PATCH: Persistent checkbox - cek apakah sudah dipilih sebelumnya
            const isChecked = selectedTransaksiIds.includes(String(item.id)) ? 'checked' : '';

            html += `
        <tr>
          <td>
            <input type="checkbox" class="transaksi-checkbox" value="${item.id}" ${isChecked} onchange="updateBulkSelectPanel()">
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

        // ✅ PATCH: Render indikator panah sorting
        if (typeof renderListHarianSortIndicator === 'function') {
            renderListHarianSortIndicator();
        }

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
            // ✅ PATCH FIX: Definisikan rowNum agar tidak error
            const rowNum = index + 1;


            let statusBayarColor;
            if (item.status_bayar === 'LUNAS') statusBayarColor = 'success';
            else if (item.status_bayar === 'BELUM LUNAS') statusBayarColor = 'danger';
            else statusBayarColor = 'secondary';


            let statusOrderColor;
            if (item.status_order === 'SUKSES') statusOrderColor = 'success';      // ✅ Hijau
            else if (item.status_order === 'PROSES') statusOrderColor = 'warning'; // ✅ Kuning
            else if (item.status_order === 'GAGAL') statusOrderColor = 'danger';   // ✅ Merah
            else statusOrderColor = 'secondary';

            // ✅ PATCH: Persistent checkbox - cek apakah sudah dipilih sebelumnya
            const isChecked = selectedTransaksiIds.includes(String(item.id)) ? 'checked' : '';

            html += `
        <tr>
          <td>
            <input type="checkbox" class="transaksi-checkbox" value="${item.id}" ${isChecked} onchange="updateBulkSelectPanel()">
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
              <i class="fas fa-eye"></i>
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

// ============================================
// ✅ PATCH BARU: FUNGSI SORTING LIST HARIAN
// ============================================
function setListHarianSort(field) {
    if (listHarianSortField === field) {
        listHarianSortAsc = !listHarianSortAsc; // Toggle ASC/DESC
    } else {
        listHarianSortField = field;
        listHarianSortAsc = true; // Reset ke ASC jika ganti kolom
    }
    console.log(`🔄 List Harian Sort: ${field} ${listHarianSortAsc ? '↑' : '↓'}`);
    loadListHarian(1); // Reload data
}

function renderListHarianSortIndicator() {
    const fields = ['nama_user', 'no_kjp', 'tgl_order', 'status_order', 'status_bayar'];

    fields.forEach(field => {
        const el = document.getElementById('sort-lh-' + field);
        if (el) {
            if (listHarianSortField === field) {
                // Kolom aktif: Tampilkan panah biru
                el.innerHTML = listHarianSortAsc ? ' ▲' : ' ▼';
                el.style.color = '#0d6efd';
                el.style.fontWeight = 'bold';
            } else {
                // Kolom non-aktif: Tampilkan panah abu
                el.innerHTML = ' ↕';
                el.style.color = '#d0d0d0';
                el.style.fontWeight = 'normal';
            }
        }
    });
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
    const allVisibleCheckboxes = document.querySelectorAll('.transaksi-checkbox');
    const visibleIds = Array.from(allVisibleCheckboxes).map(cb => cb.value);
    const checkedThisPage = Array.from(checkboxes).map(cb => cb.value);

    selectedTransaksiIds = selectedTransaksiIds.filter(id => !visibleIds.includes(id));
    visibleIds.forEach(id => {
        if (!checkedThisPage.includes(id)) selectedTransaksiData.delete(id);
    });
    selectedTransaksiIds = selectedTransaksiIds.concat(checkedThisPage);

    // SIMPAN data lengkap untuk setiap ID yang dicentang
    checkedThisPage.forEach(id => {
        if (!selectedTransaksiData.has(id)) {
            // Cari data dari currentTransactionList
            const item = currentTransactionList?.find(t => String(t.id) === String(id));
            if (item) {
                selectedTransaksiData.set(id, {
                    id: item.id,
                    // ✅ PATCH FIX: Gunakan field dengan underscore sesuai database
                    namauser: item.nama_user || item.namauser || '',
                    nokjp: item.no_kjp || item.nokjp || '',
                    noktp: item.no_ktp || item.noktp || '',
                    nokk: item.no_kk || item.nokk || ''
                });
            }
        }
    });


    const panel = document.getElementById('bulk-update-panel');
    const countEl = document.getElementById('selected-count');
    const btnExportTxt = document.getElementById('btn-export-txt');

    if (selectedTransaksiIds.length > 0) {
        panel.style.display = 'block';
        countEl.textContent = selectedTransaksiIds.length;
    } else {
        panel.style.display = 'none';
    }
    if (btnExportTxt) btnExportTxt.disabled = selectedTransaksiIds.length === 0;
}


/**
 * Clear select all
 */
function clearSelectAllTransaksi() {
    const selectAll = document.getElementById('select-all-transaksi');
    if (selectAll) selectAll.checked = false;
    document.querySelectorAll('.transaksi-checkbox').forEach(cb => cb.checked = false);
    selectedTransaksiIds = [];
    selectedTransaksiData.clear();
    updateBulkSelectPanel();
}

function exportSelectedToTXT() {
    if (selectedTransaksiData.size === 0) {
        showAlert('warning', 'Pilih minimal satu transaksi untuk di-export');
        return;
    }
    let txtContent = '';
    let count = 0;
    selectedTransaksiData.forEach((data) => {
        const nama = (data.namauser || 'TANPA NAMA').toUpperCase();
        if (count > 0) txtContent += '\n';
        txtContent += `${nama}\nKJP ${data.nokjp || '-'}\nKTP ${data.noktp || '-'}\nKK ${data.nokk || '-'}\n`;
        count++;
    });
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'data_yang_gagal_kemarin.txt';
    a.click();
    showAlert('success', `${count} data berhasil di-export ke TXT`);
}

/**
 * Quick status update (toggle LUNAS <-> BELUM LUNAS)
 */
// [PATCH] Tambah parameter statusOrder
async function quickStatusUpdate(id, currentStatus, statusOrder) {
    try {
        // Cek Logika: Jika Order GAGAL/PROSES, dilarang ubah ke LUNAS
        if (statusOrder !== 'SUKSES') {
            return showAlert('error', '⛔ Gagal: Hanya transaksi SUKSES yang boleh diset LUNAS.');
        }

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
        const tglBayar = document.getElementById('bulk-tgl-bayar').value;
        const metodeBayar = document.getElementById('bulk-metode-bayar').value;

        if (!statusOrder && !statusBayar) {
            return showAlert('warning', 'Pilih minimal satu status (Order atau Bayar) untuk diubah');
        }

        if (selectedTransaksiIds.length === 0) {
            return showAlert('warning', 'Pilih transaksi terlebih dahulu');
        }

        const updateObject = {};

        // PATCH LOGIC
        if (statusOrder) {
            updateObject.status_order = statusOrder;
            // Jika User set Order jadi GAGAL, Paksa Bayar jadi CANCEL
            if (statusOrder === 'GAGAL' || statusOrder === 'CANCEL') {
                updateObject.status_bayar = 'CANCEL';
            }
        }

        // Jika user memaksa pilih status bayar LUNAS lewat dropdown, tapi ordernya GAGAL, kita timpa lagi
        if (statusBayar) {
            // Hanya boleh update bayar sesuai request jika logika di atas tidak memaksa CANCEL
            if (updateObject.status_bayar !== 'CANCEL') {
                updateObject.status_bayar = statusBayar;
            }
        }

        // LOGIC BARU: Update tgl_bayar & metode_bayar berdasarkan status
        if (statusBayar === 'LUNAS') {
            // Jika user pilih LUNAS, update tanggal & metode bayar
            updateObject.tgl_bayar = tglBayar || null;
            updateObject.metode_bayar = metodeBayar || null;
        } else if (statusBayar === 'BELUM LUNAS' || statusBayar === 'CANCEL') {
            // Jika user pilih BELUM LUNAS atau CANCEL, set NULL
            updateObject.tgl_bayar = null;
            updateObject.metode_bayar = null;
        }

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
 * PATCHED: Isi data langsung dari DB, tidak bergantung dropdown
 */
async function editListHarian(id) {
    try {
        showLoading('Memuat data transaksi...');
        const data = await getListHarianById(id);
        await resetFormListHarian();

        // 1. SET DATA UTAMA (ID & Hidden Fields)
        document.getElementById('list-harian-id').value = id;
        document.getElementById('id-master').value = data.id_master;

        // 2. [PATCH] ISI TAMPILAN LANGSUNG DARI DATABASE (Bypass Dropdown Dependency)
        // ✅ CEK DULU apakah element ada sebelum set value (DEFENSIVE)
        const noKjpDisplay = document.getElementById('no-kjp-display');
        const noKtpDisplay = document.getElementById('no-ktp-display');

        if (noKjpDisplay) noKjpDisplay.value = formatNomor(data.no_kjp);
        if (noKtpDisplay) noKtpDisplay.value = formatNomor(data.no_ktp);

        // 3. URUS DROPDOWN (Hanya untuk visual)
        const selectPelanggan = document.getElementById('nama-pelanggan');

        // Cek apakah nama pelanggan ada di dropdown?
        let optionExists = selectPelanggan.querySelector(`option[value="${data.id_master}"]`);

        // Jika TIDAK ada (karena limit 500 atau pagination), kita suntikkan manual
        if (!optionExists) {
            console.log('⚠️ Pelanggan tidak ada di list dropdown, menambahkan manual untuk visual...');
            const newOption = document.createElement('option');
            newOption.value = data.id_master;

            // [PATCH FIX] Lengkapi dataset agar tombol Simpan bisa membaca No KK & Parent
            newOption.dataset.kjp = data.no_kjp;
            newOption.dataset.ktp = data.no_ktp;
            newOption.dataset.nama = data.nama_user;
            newOption.dataset.kk = data.no_kk;           // <--- INI WAJIB ADA
            newOption.dataset.parent = data.parent_name; // <--- INI JUGA WAJIB ADA

            newOption.textContent = `${data.nama_user} (KJP: ${formatNomor(data.no_kjp)})`;
            selectPelanggan.appendChild(newOption);
        }

        // Pilih nama di dropdown
        selectPelanggan.value = data.id_master;

        // 4. ISI FORM LAINNYA (✅ DENGAN CEK DEFENSIVE)
        const tglOrderEl = document.getElementById('tglorder');
        const statusOrderEl = document.getElementById('statusorder');
        const statusBayarEl = document.getElementById('statusbayar');
        const catatanEl = document.getElementById('catatan');
        const formTitle = document.getElementById('formListHarianTitle');

        if (tglOrderEl) tglOrderEl.value = data.tgl_order;
        if (statusOrderEl) statusOrderEl.value = data.status_order;
        if (statusBayarEl) statusBayarEl.value = data.status_bayar;
        if (catatanEl) catatanEl.value = data.catatan || '';
        if (formTitle) formTitle.textContent = 'Edit Transaksi';

        // ✅ PATCH FIX: Isi Tgl Bayar & Metode Bayar
        const tglBayarEl = document.getElementById('tgl_bayar');
        const metodeBayarEl = document.getElementById('metode_bayar');

        if (tglBayarEl) tglBayarEl.value = data.tgl_bayar || '';
        if (metodeBayarEl) metodeBayarEl.value = data.metode_bayar || '';

        // 5. BERSIHKAN DATASET & ATUR UI
        const form = document.getElementById('formListHarian');
        if (form) {
            delete form.dataset.pelangganNama; // Hapus sisa data mode checkbox
        }

        const fieldPilihPelanggan = document.getElementById('field-pilih-pelanggan');
        const fieldInfoPelanggan = document.getElementById('field-info-pelanggan');

        if (fieldPilihPelanggan) fieldPilihPelanggan.style.display = 'block';
        if (fieldInfoPelanggan) fieldInfoPelanggan.style.display = 'none';

        hideLoading();

        // Tampilkan Modal
        const modal = new bootstrap.Modal(document.getElementById('formListHarianModal'));
        modal.show();

    } catch (error) {
        hideLoading();
        console.error('Error editing list harian:', error);
        showAlert('error', 'Gagal memuat transaksi: ' + error.message);
    }
}


/**
 * Handle save list harian (DENGAN VALIDASI & PATCH REFRESH)
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

        // [PATCH AUTO-FIX WITH NOTIFICATION FLAG]
        const inputStatusOrder = document.getElementById('status_order').value;
        let inputStatusBayar = document.getElementById('status_bayar').value;
        let isAutoCorrected = false; // Flag untuk menanda apakah sistem mengubah data

        // Cek Logika: Jika Order GAGAL tapi user pilih LUNAS/BELUM LUNAS
        if ((inputStatusOrder === 'GAGAL' || inputStatusOrder === 'CANCEL') && inputStatusBayar !== 'CANCEL') {
            inputStatusBayar = 'CANCEL'; // Paksa ubah ke CANCEL
            isAutoCorrected = true;      // Tandai bahwa ini diubah otomatis
        }

        // [FIX] Nama properti disesuaikan dengan nama kolom Database (pakai underscore)
        const formData = {
            id_master: document.getElementById('id-master').value,
            tgl_order: tglOrder,
            tgl_ambil: tglAmbil,
            status_order: inputStatusOrder,
            status_bayar: inputStatusBayar, // Gunakan variabel yang sudah di-validasi

            // ✅ PATCH FIX: Ambil ID yang benar (tanpa _edit, karena _edit milik modal Bulk)
            tgl_bayar: document.getElementById('tgl_bayar').value || null,
            metode_bayar: document.getElementById('metode_bayar').value || null,

            catatan: document.getElementById('catatan').value,
            // Data relasi WAJIB NOT NULL
            nama_user: pelangganData.nama,
            no_kjp: sanitizeNumber(pelangganData.kjp),
            no_ktp: sanitizeNumber(pelangganData.ktp),
            no_kk: sanitizeNumber(pelangganData.kk),
            parent_name: pelangganData.parent || extractParentName(pelangganData.nama),
        };


        // --- VALIDASI INPUT ---
        if (!formData.id_master && !form.dataset.pelangganNama) {
            return showAlert('error', 'Pilih pelanggan terlebih dahulu');
        }

        if (form.dataset.pelangganNama && !formData.id_master) {
            console.warn('⚠️ Mode checkbox tapi id_master kosong, mencoba ambil dari form');
            const idMasterField = document.getElementById('id-master');
            if (idMasterField && idMasterField.value) {
                formData.id_master = idMasterField.value;
            } else {
                return showAlert('error', 'Data pelanggan tidak lengkap. Silakan coba lagi.');
            }
        }

        if (!formData.parent_name || !formData.no_kk || !formData.no_ktp) {
            return showAlert('error', 'Data pelanggan tidak lengkap (KTP/KK/Parent kosong).');
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

        // --- UPDATE DASHBOARD SETELAH SIMPAN ---
        if (successData) {
            const modalEl = document.getElementById('formListHarianModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            // [PATCH] Notifikasi Cerdas
            if (isAutoCorrected) {
                // Tampilkan pesan Warning/Info khusus jika ada perubahan otomatis
                showAlert('warning',
                    '✅ Data berhasil disimpan, namun Status Bayar otomatis diubah ke CANCEL.\n' +
                    '⚠️ Info: Hanya order dengan status SUKSES yang boleh diset LUNAS/BELUM LUNAS.'
                );
            } else {
                // Pesan sukses normal
                showAlert('success', id ? 'Data berhasil diperbarui' : 'Data berhasil disimpan');
            }

            // ✅ LOGIKA REFRESH YANG BENAR (SEQUENTIAL)
            try {
                console.log('🔄 Refreshing data sequence...');
                // 1. Load Tabel Harian dulu (Prioritas)
                await loadListHarian(currentPageListHarian);

                // 2. Load Dashboard & Rekap (Tanpa await agar UI responsif)
                loadRekap(1);
                loadDashboard();
            } catch (refreshError) {
                console.error('⚠️ Error refreshing data:', refreshError);
            }
        }

    } catch (error) {
        hideLoading();
        console.error('Error saving list harian:', error);
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
        console.log('📥 Loading rekap dengan detail view...');
        currentPageRekap = page;

        // Clear pagination rekap
        document.getElementById('data-master-pagination').innerHTML = '';
        document.getElementById('list-harian-pagination').innerHTML = '';

        // CEK apakah fungsi sudah tersedia dari rekap.js
        if (typeof window.getAllRekapDetail !== 'function') {
            throw new Error('Fungsi getAllRekapDetail belum dimuat dari rekap.js');
        }

        if (typeof window.renderRekapTable !== 'function') {
            throw new Error('Fungsi renderRekapTable belum dimuat dari rekap.js');
        }

        // Panggil fungsi dari window (sudah di-export dari rekap.js)
        const allData = await window.getAllRekapDetail();

        // Render ke table
        window.renderRekapTable(allData, 'rekap-table-body');

        console.log('✅ Rekap loaded successfully');

    } catch (error) {
        console.error('❌ Error loading rekap:', error);
        showAlert('error', `Gagal memuat rekap: ${error.message}`);
    }
}





/**
 * ✅ FIXED: Render rekap table - EXPANDED DETAIL VIEW (PROFESSIONAL STYLING)
 * PATCH: Tambah normalisasi parent_name untuk grouping
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


    // ============================================================
    // 🟢 PATCH FIX V2: GROUP data dengan NORMALISASI parent_name
    // ============================================================
    const groupedData = {};
    detailData.forEach(item => {
        // EKSTRAK parent dari parent_name atau nama_user
        let parentRaw = item.parent_name;
        if (!parentRaw || parentRaw.trim() === '') {
            parentRaw = item.nama_user ? extractParentName(item.nama_user) : 'Tanpa Nama';
        }

        // NORMALISASI: UPPERCASE + trim + hapus spasi ganda
        const parentKey = parentRaw.trim().toUpperCase().replace(/\s+/g, ' ');

        if (!groupedData[parentKey]) {
            groupedData[parentKey] = [];
        }
        groupedData[parentKey].push(item);
    });
    // ============================================================
    // 🟢 END PATCH V2
    // ============================================================


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


        // Cari di REKAP_DETAIL menggunakan fungsi dari rekap.js
        if (typeof window.searchRekap !== 'function') {
            throw new Error('Fungsi searchRekap belum dimuat dari rekap.js');
        }

        const results = await window.searchRekap(keyword);


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
        window.renderRekapTable(results, 'rekap-table-body');
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
 * Handle import telegram data (FIX REFRESH DASHBOARD)
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

    // Import data
    const result = await importTelegramData(textContent);

    if (result.success) {
        // Close modal
        const modalInstance = bootstrap.Modal.getInstance(
            document.getElementById('importTelegramModal')
        );
        if (modalInstance) {
            modalInstance.hide();
        }

        // Show summary
        if (result.errors && result.errors.length > 0) {
            console.log('📋 Import Errors:', result.errors);
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

        // ✅ FIX: Refresh Data Wajib setelah Import
        await loadListHarian(1);
        loadRekap(1);
        loadDashboard();
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

    // ✅ PENTING: Siapkan HTML info pembayaran (hanya tampil jika LUNAS)
    // ✅ HARUS DIDEKLARASIKAN SEBELUM digunakan di template literal
    let infoPembayaranHTML = '';
    if (item.status_bayar === 'LUNAS') {
        infoPembayaranHTML = `
            <div class="detail-row">
                <div class="detail-label">Tanggal Bayar</div>
                <div class="detail-value">${item.tgl_bayar ? formatDateToDisplay(item.tgl_bayar) : '-'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Metode Bayar</div>
                <div class="detail-value">${item.metode_bayar || '-'}</div>
            </div>
        `;
    }

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
                ${infoPembayaranHTML}
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

// ============================================
// ✅ PATCH BARU: FUNGSI FILTER DASHBOARD
// ============================================

/**
 * Dipanggil saat tombol "Tampilkan Data" diklik
 */
function applyDashboardFilter() {
    const monthEl = document.getElementById('dash-filter-month');
    const yearEl = document.getElementById('dash-filter-year');

    if (!monthEl || !yearEl) return;

    const month = monthEl.value;
    const year = yearEl.value;

    // Load dashboard dengan parameter spesifik
    loadDashboard(parseInt(month), parseInt(year));
}

/**
 * Dipanggil saat tombol "Reset" diklik
 */
function resetDashboardFilter() {
    // Set dropdown kembali ke bulan/tahun sekarang
    const now = new Date();
    const monthEl = document.getElementById('dash-filter-month');
    const yearEl = document.getElementById('dash-filter-year');

    if (monthEl) monthEl.value = now.getMonth();
    if (yearEl) yearEl.value = now.getFullYear();

    // Load tanpa parameter (otomatis current month)
    loadDashboard();
}

/**
 * Helper: Set dropdown dashboard ke bulan saat ini saat pertama buka
 */
function initDashboardFilterUI() {
    const now = new Date();
    const monthEl = document.getElementById('dash-filter-month');
    const yearEl = document.getElementById('dash-filter-year');

    if (monthEl) monthEl.value = now.getMonth();
    if (yearEl) yearEl.value = now.getFullYear();
}
