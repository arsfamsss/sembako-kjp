// ============================================
// config.js (FIXED VERSION)
// Konfigurasi Supabase & Constants
// ============================================
// SUPABASE CONFIG - ISI DENGAN CREDENTIALS ANDA
const SUPABASE_CONFIG = {
  URL: 'https://feyxietgprtkpmvzgtjy.supabase.co',      // Ganti dengan URL Anda
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZleXhpZXRncHJ0a3BtdnpndGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTg5MTUsImV4cCI6MjA3ODM3NDkxNX0.ahnwoSSy7yj31NAvQoEhk8koZfUBskVtAkmfiTFw7Og',  // Ganti dengan key Anda
};

// Initialize Supabase Client (PERBAIKAN)
let supabase;

document.addEventListener('DOMContentLoaded', function() {
  try {
    const { createClient } = window.supabase;
    supabase = createClient(
      SUPABASE_CONFIG.URL,
      SUPABASE_CONFIG.ANON_KEY
    );
    console.log('✅ Supabase initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Supabase:', error);
    console.error('Make sure Supabase JS library is loaded from CDN');
  }
});

// ============================================
// CONSTANTS
// ============================================

const CONSTANTS = {
  // Tabel
  TABLES: {
    DATA_MASTER: 'data_master',
    LIST_HARIAN: 'list_harian',
    REKAP_BELUM_LUNAS: 'rekap_belum_lunas',
  },

  // Views
  VIEWS: {
    REKAP_SUMMARY: 'v_rekap_summary',
    REKAP_DETAIL: 'v_rekap_detail',
  },

  // Nilai Fix
  NOMINAL_TRANSAKSI: 20000,  // Rp 20,000 per transaksi
  
  // Status Order
  STATUS_ORDER: {
    SUKSES: 'SUKSES',
    PENDING: 'PENDING',
    CANCEL: 'CANCEL',
  },

  // Status Bayar
  STATUS_BAYAR: {
    LUNAS: 'LUNAS',
    BELUM_LUNAS: 'BELUM LUNAS',
    CANCEL: 'CANCEL',
  },

  // Validasi
  VALIDATION: {
    KJP_MIN: 12,
    KJP_MAX: 18,
    KTP_LENGTH: 16,
    KK_LENGTH: 16,
    NAMA_MAX: 100,
  },

  // Pagination
  PAGE_SIZE: 10,

  // Date Format
  DATE_FORMAT: 'YYYY-MM-DD',
  DISPLAY_DATE_FORMAT: 'DD/MM/YYYY',
};

// ============================================
// ERROR MESSAGES
// ============================================

const ERROR_MESSAGES = {
  // Data Master
  NAMA_REQUIRED: 'Nama user wajib diisi',
  NAMA_DUPLICATE: 'Nama user sudah terdaftar',
  NAMA_MAX_LENGTH: `Nama user maksimal ${CONSTANTS.VALIDATION.NAMA_MAX} karakter`,
  
  KJP_REQUIRED: 'No. KJP wajib diisi',
  KJP_FORMAT: 'No. KJP harus 12-18 digit',
  KJP_DUPLICATE: 'No. KJP sudah terdaftar',
  
  KTP_REQUIRED: 'No. KTP wajib diisi',
  KTP_FORMAT: 'No. KTP harus 16 digit',
  KTP_DUPLICATE: 'No. KTP sudah terdaftar',
  
  KK_REQUIRED: 'No. KK wajib diisi',
  KK_FORMAT: 'No. KK harus 16 digit',
  
  NOMOR_SAMA: 'No. KJP, KTP, dan KK harus berbeda satu sama lain',
  
  TGL_REQUIRED: 'Tanggal wajib diisi',
  TGL_INVALID: 'Format tanggal tidak valid (gunakan DD/MM/YYYY)',
  TGL_FUTURE: 'Tanggal tidak boleh masa depan',
  
  // List Harian
  NAMA_MASTER_REQUIRED: 'Pilih nama pelanggan',
  TGL_AMBIL_ERROR: 'Tanggal ambil harus ≥ tanggal order',
  KJP_DUPLICATE_PER_DATE: 'No. KJP sudah ada di tanggal ini',
  KTP_DUPLICATE_PER_DATE: 'No. KTP sudah ada di tanggal ini',
  
  // Generic
  NETWORK_ERROR: 'Gagal menghubungi server',
  UNKNOWN_ERROR: 'Terjadi kesalahan yang tidak diketahui',
};

// ============================================
// SUCCESS MESSAGES
// ============================================

const SUCCESS_MESSAGES = {
  DATA_CREATED: 'Data berhasil disimpan',
  DATA_UPDATED: 'Data berhasil diubah',
  DATA_DELETED: 'Data berhasil dihapus',
  STATUS_UPDATED: 'Status berhasil diubah',
  BULK_UPDATE: 'Data berhasil diubah secara massal',
};

// ============================================
// COLORS & STYLING
// ============================================

const COLORS = {
  SUCCESS: '#28a745',
  ERROR: '#dc3545',
  WARNING: '#ffc107',
  INFO: '#17a2b8',
  PRIMARY: '#007bff',
  SECONDARY: '#6c757d',
};

const STATUS_COLORS = {
  LUNAS: '#28a745',           // Green
  'BELUM LUNAS': '#dc3545',   // Red
  SUKSES: '#17a2b8',          // Blue
  PENDING: '#ffc107',         // Yellow
  CANCEL: '#6c757d',          // Gray
};

// ============================================
// END OF FILE
// ============================================

console.log('✅ config.js loaded successfully!');
