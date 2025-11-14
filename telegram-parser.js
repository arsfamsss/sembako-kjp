// telegram-parser.js (ULTIMATE VERSION - FIXED!)
console.log('Loading telegram-parser.js ULTIMATE FIXED...');

/**
 * Sanitize number inline - pastikan hanya angka
 */
function cleanNumber(value) {
    if (!value) return '';
    return value.toString()
        .replace(/\D/g, '')   // Hapus semua yang bukan digit
        .replace(/\s/g, '')   // Hapus spasi (double check)
        .replace(/\./g, '')   // Hapus titik
        .replace(/-/g, '')     // Hapus dash
        .replace(/,/g, '');    // Hapus koma
}

/**
 * Parse data dari format laporan Telegram
 */
function parseTelegramData(textContent) {
    const lines = textContent.split('\n');
    const parsedData = [];
    let currentDate = null;

    for (const line of lines) {
        const dateMatch = line.match(/Hasil Cek KJP (\d{2}\/\d{2}\/\d{2,4})/);
        if (dateMatch) {
            const dateStr = dateMatch[1];
            const parts = dateStr.split('/');
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            let year = parseInt(parts[2]);

            if (year < 100) {
                year += 2000;
            }

            currentDate = new Date(year, month, day);
            continue;
        }

        const dataMatch = line.match(/^(\d+)\s*—\s*(.+?)\s*—\s*([\d\s]+)\s*—\s*([✅❌])\s*(Sukses|Gagal)/);

        if (dataMatch && currentDate) {
            const parentNama = dataMatch[2].trim();
            const noKjpRaw = dataMatch[3].trim();
            const statusText = dataMatch[5];

            let parent = parentNama;
            let nama = "";
            const parentMatch = parentNama.match(/(.+?)\s*\((.+?)\)/);
            if (parentMatch) {
                parent = parentMatch[1].trim();
                nama = parentMatch[2].trim();
            }

            const statusOrder = statusText === "Sukses" ? "SUKSES" : "GAGAL";
            const statusBayar = statusText === "Sukses" ? "BELUM LUNAS" : "CANCEL";

            const tglOrder = formatDateToISO(currentDate);
            const tglAmbil = formatDateToISO(addDays(currentDate, 1));

            // SANITIZE No KJP DI SINI!
            const noKjpClean = cleanNumber(noKjpRaw);

            console.log(`📋 Parsed: No KJP Raw="${noKjpRaw}" → Clean="${noKjpClean}"`);

            parsedData.push({
                parent: parent,
                nama: nama,
                noKjp: noKjpClean,  // ← Sudah clean!
                statusOrder: statusOrder,
                statusBayar: statusBayar,
                tglOrder: tglOrder,
                tglAmbil: tglAmbil
            });
        }
    }

    return parsedData;
}

function formatDateToISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Cari data master - SANITIZE SEBELUM QUERY!
 */
async function findDataMasterByKJP(noKjp) {
    try {
        // DOUBLE SANITIZE - pastikan benar-benar bersih!
        const cleanKjp = cleanNumber(noKjp);

        console.log(`🔍 Searching No KJP: Raw="${noKjp}" → Clean="${cleanKjp}"`);

        // STRATEGY 1: Exact match dengan ilike untuk case insensitive
        // ✅ FIXED: DATAMASTER → DATA_MASTER
        let { data, error } = await supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .select('id, nama_user, no_kjp, no_ktp, no_kk, parent_name')
            .ilike('no_kjp', cleanKjp)
            .maybeSingle();


        if (data && !error) {
            console.log(`✅ Found (Strategy 1): ${data.nama_user} | DB no_kjp="${data.no_kjp}"`);
            return { data, error: null };
        }

        // STRATEGY 2: LIKE search (jaga-jaga kalau database punya spasi)
        // ✅ FIXED: DATAMASTER → DATA_MASTER
        ({ data, error } = await supabase
            .from(CONSTANTS.TABLES.DATA_MASTER)
            .select('id, nama_user, no_kjp, no_ktp, no_kk, parent_name')
            .or(`no_kjp.eq.${cleanKjp},no_kjp.ilike.%${cleanKjp}%`)
            .limit(1)
            .maybeSingle());

        if (data && !error) {
            console.log(`✅ Found (Strategy 2): ${data.nama_user} | DB no_kjp="${data.no_kjp}"`);
            return { data, error: null };
        }

        // STRATEGY 3: Without leading zeros
        const kjpWithoutLeadingZeros = cleanKjp.replace(/^0+/, '');
        if (kjpWithoutLeadingZeros !== cleanKjp && kjpWithoutLeadingZeros.length > 0) {
            // ✅ FIXED: DATAMASTER → DATA_MASTER
            ({ data, error } = await supabase
                .from(CONSTANTS.TABLES.DATA_MASTER)
                .select('id, nama_user, no_kjp, no_ktp, no_kk, parent_name')
                .eq('no_kjp', kjpWithoutLeadingZeros)
                .maybeSingle());

            if (data && !error) {
                console.log(`✅ Found (Strategy 3): ${data.nama_user} | DB no_kjp="${data.no_kjp}"`);
                return { data, error: null };
            }
        }

        console.warn(`❌ Not found: "${cleanKjp}" (length: ${cleanKjp.length})`);
        return { data: null, error: { message: 'No KJP tidak ditemukan di database' } };

    } catch (err) {
        console.error(`❌ Error searching KJP:`, err);
        return { data: null, error: err };
    }
}

/**
 * Import data telegram - SANITIZE SEBELUM INSERT!
 */
async function importTelegramData(textContent) {
    try {
        showLoading('Memproses data telegram...');

        const parsedData = parseTelegramData(textContent);

        if (parsedData.length === 0) {
            hideLoading();
            showAlert('warning', 'Tidak ada data yang dapat diparsing dari file telegram');
            return { success: false, message: 'No data parsed' };
        }

        console.log(`✅ Parsed ${parsedData.length} records from telegram`);

        const transactionsToInsert = [];
        const errors = [];

        showLoading(`Memproses 0/${parsedData.length} data...`);

        for (let i = 0; i < parsedData.length; i++) {
            const item = parsedData[i];

            if (i % 10 === 0) {
                showLoading(`Memproses ${i}/${parsedData.length} data...`);
            }

            try {
                const { data: masterData, error } = await findDataMasterByKJP(item.noKjp);

                if (error || !masterData) {
                    errors.push({
                        row: i + 1,
                        noKjp: item.noKjp,
                        nama: item.nama,
                        parent: item.parent,
                        error: 'No KJP tidak ditemukan di database'
                    });
                    console.warn(`⚠️ Row ${i + 1}: No KJP ${item.noKjp} tidak ditemukan`);
                    continue;
                }

                // SANITIZE SEMUA NOMOR SEBELUM INSERT!
                transactionsToInsert.push({
                    id_master: masterData.id,
                    nama_user: masterData.nama_user,
                    no_kjp: cleanNumber(masterData.no_kjp),
                    no_ktp: cleanNumber(masterData.no_ktp),
                    no_kk: cleanNumber(masterData.no_kk),
                    parent_name: masterData.parent_name,
                    tgl_order: item.tglOrder,
                    tgl_ambil: item.tglAmbil,
                    status_order: item.statusOrder,
                    status_bayar: item.statusBayar,
                    catatan: `Import dari Telegram (${item.tglOrder})`,
                    created_at: new Date().toISOString(),     // ← ADDED
                    updated_at: new Date().toISOString()      // ← ADDED
                    // Note: field 'no' akan di-handle oleh database (auto-increment atau sequence)
                });


            } catch (err) {
                errors.push({
                    row: i + 1,
                    noKjp: item.noKjp,
                    nama: item.nama,
                    parent: item.parent,
                    error: err.message
                });
                console.error(`❌ Row ${i + 1} error:`, err.message);
            }
        }

        console.log(`📊 Ready to insert: ${transactionsToInsert.length} records`);
        console.log(`⚠️ Errors: ${errors.length} records`);

        if (transactionsToInsert.length > 0) {
            showLoading(`Menyimpan ${transactionsToInsert.length} transaksi...`);

            // Log sample data sebelum insert untuk debugging
            console.log('📦 Sample data to insert:', JSON.stringify(transactionsToInsert[0], null, 2));

            // ✅ FIXED: LISTHARIAN → LIST_HARIAN
            const { data, error } = await supabase
                .from(CONSTANTS.TABLES.LIST_HARIAN)
                .insert(transactionsToInsert);

            if (error) {
                hideLoading();
                console.error('❌ Insert error:', error);
                console.error('❌ Error details:', JSON.stringify(error, null, 2));

                // Enhanced error message
                let errorMsg = 'Gagal insert data: ';
                if (error.message.includes('duplicate')) {
                    errorMsg += 'Data duplikat ditemukan. ';
                } else if (error.message.includes('foreign key')) {
                    errorMsg += 'Data master tidak ditemukan. ';
                } else if (error.message.includes('null value')) {
                    errorMsg += 'Ada field required yang kosong. ';
                }
                errorMsg += error.message;

                showAlert('error', errorMsg);
                return { success: false, message: error.message, failedRecords: errors };
            }

            console.log('✅ Bulk insert successful!');
        }


        hideLoading();

        const summary = `
        <div class="alert ${transactionsToInsert.length > 0 ? 'alert-success' : 'alert-warning'}">
            <strong>${transactionsToInsert.length > 0 ? '✅' : '⚠️'} Import Selesai!</strong><br>
            <hr>
            <strong>Berhasil:</strong> ${transactionsToInsert.length} transaksi<br>
            <strong>Gagal:</strong> ${errors.length} transaksi<br>
            <strong>Total:</strong> ${parsedData.length} data
        </div>
        `;

        showAlert(transactionsToInsert.length > 0 ? 'success' : 'warning', summary);

        if (errors.length > 0) {
            console.log('📋 List Error:');
            console.table(errors);
        }

        if (transactionsToInsert.length > 0) {
            await loadListHarian(1);
            await loadRekap(1);
            await loadDashboard();
        }

        return {
            success: true,
            inserted: transactionsToInsert.length,
            errors: errors,
            total: parsedData.length
        };

    } catch (error) {
        hideLoading();
        console.error('❌ Import error:', error);
        showAlert('error', 'Gagal import: ' + error.message);
        return { success: false, message: error.message };
    }
}

console.log('✅ telegram-parser.js ULTIMATE FIXED loaded successfully!');