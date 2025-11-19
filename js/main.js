// js/main.js
import { state, resetState } from './state.js';
import * as services from './services.js';
import * as ui from './ui.js';

// --- AWAL TAMBAHAN KODE: IDLE TIMER ---
let idleTimer = null;
// 1 jam = 60 menit * 60 detik * 1000 milidetik
const IDLE_TIMEOUT = 3600000; 

/**
 * Fungsi ini akan dipanggil saat timer 1 jam tercapai.
 */
function performAutoLogout() {
    console.log("Tidak ada aktivitas selama 1 jam. Logout otomatis...");
    stopIdleTimer(); // Hentikan semua listener
    services.logoutUser();
    ui.showToast("Anda telah logout otomatis karena tidak aktif", "info");
}

/**
 * Mengatur ulang timer kembali ke 1 jam.
 */
function resetIdleTimer() {
    if (idleTimer) {
        clearTimeout(idleTimer);
    }
    idleTimer = setTimeout(performAutoLogout, IDLE_TIMEOUT);
}

/**
 * Memulai timer dan memasang listener aktivitas pengguna.
 */
function startIdleTimer() {
    resetIdleTimer(); // Mulai timer
    // Tambahkan listener untuk aktivitas
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    window.addEventListener('click', resetIdleTimer);
    window.addEventListener('touchstart', resetIdleTimer);
    console.log("Idle timer dimulai.");
}

/**
 * Menghentikan timer dan menghapus listener.
 */
function stopIdleTimer() {
    if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
    }
    // Hapus listener agar tidak menumpuk
    window.removeEventListener('mousemove', resetIdleTimer);
    window.removeEventListener('keydown', resetIdleTimer);
    window.removeEventListener('click', resetIdleTimer);
    window.removeEventListener('touchstart', resetIdleTimer);
    console.log("Idle timer dihentikan.");
}

// --- FUNGSI HELPER ---
// GANTI FUNGSI LAMA DENGAN FUNGSI BARU INI
// GANTI FUNGSI LAMA DENGAN FUNGSI BARU INI
function generateKodeINV(namaAlat, merk, tahun, index = 0) {
    
    // --- Bagian 1 & 2: Buat Prefix & Suffix (Sama) ---
    const words = namaAlat.trim().split(/\s+/);
    let prefix = '';
    
    if (words.length === 1) {
        prefix = words[0].substring(0, 3).toUpperCase();
    } else if (words.length === 2) {
        prefix = (words[0].charAt(0) + words[1].charAt(0) + words[0].charAt(1)).toUpperCase();
    } else {
        prefix = words.slice(0, 3).map(word => word.charAt(0)).join('').toUpperCase();
    }
    prefix = prefix.substring(0, 3).padEnd(3, 'X');

    const tahunSuffix = String(tahun).slice(-2);

    // --- Bagian 3: Normalisasi Merk (Sama) ---
    const targetMerk = (merk || 'Tanpa Merk').trim();

    // --- Bagian 4: Cari Nomor Urut (LOGIKA DIUBAH) ---
    
    // 4a. Cek nomor yang sedang dipakai (state.unitAlat)
    const existingNumbers = (state.unitAlat || [])
        .filter(u => {
            if (!u.kodeInv) return false;
            const parts = u.kodeInv.split('-');
            
            if (parts.length !== 3 || parts[0] !== prefix || parts[1] !== tahunSuffix) {
                return false; 
            }
            // Cek merk unit yang ada
            const jenisAlat = (state.allAlat || []).find(a => a.id === u.jenisAlatId);
            const unitMerk = (jenisAlat ? jenisAlat.merk : null) || 'Tanpa Merk';
            
            return unitMerk.trim() === targetMerk;
        })
        .map(u => {
            const parts = u.kodeInv.split('-');
            const num = parseInt(parts[2], 10); 
            return isNaN(num) ? 0 : num;
        });

    // 4b. (BARU) Cek nomor yang sudah diafkir (state.allAfkir)
    const afkirNumbers = (state.allAfkir || [])
        .filter(afkirDoc => {
            // Hanya cek afkir individual yang punya kodeInv
            if (afkirDoc.tipeAfkir !== 'individual' || !afkirDoc.kodeInv) return false;

            const parts = afkirDoc.kodeInv.split('-');
            if (parts.length !== 3 || parts[0] !== prefix || parts[1] !== tahunSuffix) return false;

            // Cek merk di dokumen afkir
            const afkirMerk = (afkirDoc.merk || 'Tanpa Merk').trim();
            return afkirMerk === targetMerk;
        })
        .map(afkirDoc => {
            const parts = afkirDoc.kodeInv.split('-');
            const num = parseInt(parts[2], 10);
            return isNaN(num) ? 0 : num;
        });

    // --- Bagian 5: Gabungkan semua nomor yang pernah dipakai ---
    const usedNumbers = new Set([...existingNumbers, ...afkirNumbers]); // <-- GABUNGKAN KEDUANYA
    
    let nextNumber = 1;
    let resultNumber = 0;
    let found = 0;
    while (found <= index) {
        while (usedNumbers.has(nextNumber)) {
            nextNumber++; // <-- Ini akan melompati 0006 jika ditemukan di daftar afkir
        }
        resultNumber = nextNumber;
        nextNumber++;
        found++;
    }

    // --- Bagian 6: Kembalikan format 3-bagian ---
    return `${prefix}-${tahunSuffix}-${resultNumber.toString().padStart(4, '0')}`;
}
// --- TAMBAHKAN FUNGSI BARU INI ---
async function backupAndClearKegiatan() {
    // Ambil data dari state
    const kegiatanData = (state.allKegiatan || []);
    if (!kegiatanData.length) {
        ui.showToast('Tidak ada data kegiatan untuk di-backup.', 'error');
        return;
    }

    if (!confirm('Perhatian: Seluruh data catatan kegiatan akan di-backup ke file CSV dan dihapus dari sistem. Lanjutkan?')) {
        return;
    }

    // Tentukan header CSV
    const headers = ['NAMA_PENGGUNA', 'NAMA_KEGIATAN', 'TANGGAL', 'NAMA_ALAT', 'MERK', 'KODE_INV', 'JUMLAH', 'TIPE'];
    let csv = headers.join(',') + '\n';
    
    // Uraikan data: satu baris per item yang digunakan
    kegiatanData.forEach(kegiatan => {
        const nama = kegiatan.namaPengguna || '';
        const namaKegiatan = kegiatan.latihan || '';
        const tgl = kegiatan.tanggalKegiatan && kegiatan.tanggalKegiatan.toDate ? kegiatan.tanggalKegiatan.toDate().toLocaleString('id-ID') : (kegiatan.timestamp && kegiatan.timestamp.toDate ? kegiatan.timestamp.toDate().toLocaleString('id-ID') : '');
        
        if (!kegiatan.items || kegiatan.items.length === 0) return;

        kegiatan.items.forEach(item => {
            const row = [
                nama,
                namaKegiatan,
                tgl,
                item.namaAlat || '',
                item.merk || '-', // Ambil merk
                item.kodeInv || '', // Untuk individual
                item.jumlah || (item.isIndividual ? 1 : 0), // Untuk kumulatif
                item.isIndividual ? 'Individual' : 'Kumulatif' //
            ];
            // Proses baris CSV
            csv += row.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',') + '\n';
        });
    });

    // Logika download file (sama seperti afkir)
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_History_Kegiatan_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);

    // Panggil service untuk hapus data
    try {
        await services.clearKegiatanHistory(); // Panggil fungsi baru kita
        ui.showToast('Data kegiatan berhasil di-backup dan dihapus dari sistem.', 'success');
    } catch (error) {
        console.error('Gagal menghapus history kegiatan:', error);
        ui.showToast('Backup berhasil tapi gagal menghapus data dari sistem.', 'error');
    }
}
// Backup/export seluruh history afkir ke CSV dan hapus data
async function backupAndClearAfkir() {
    const afkirData = (state.allAfkir || []);
    if (!afkirData.length) {
        ui.showToast('Tidak ada data afkir untuk di-backup.', 'error');
        return;
    }

    if (!confirm('Perhatian: Seluruh data afkir akan di-backup ke file Excel dan dihapus dari sistem. Lanjutkan?')) {
        return;
    }

    const headers = ['NAMA', 'MERK', 'TAHUN', 'KATEGORI', 'WARNA', 'JUMLAH', 'KETERANGAN', 'KODE_INV', 'TIPE', 'TANGGAL'];
    let csv = headers.join(',') + '\n';
    
    afkirData.forEach(item => {
        const row = [
            item.nama || '',
            item.merk || '',
            item.tahunPembelian || '',
            item.kategori || '',
            item.warna || '',
            item.jumlahDiAfkir || '',
            (item.alasan || '').replace(/\n/g, ' '),
            item.kodeInv || '',
            item.tipeAfkir || 'kumulatif',
            item.afkirTimestamp && item.afkirTimestamp.toDate ? item.afkirTimestamp.toDate().toLocaleString('id-ID') : ''
        ];
        csv += row.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',') + '\n';
    });

    // Download file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_History_Afkir_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();

    // Hapus file dan URL setelah download
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);

    // Hapus data afkir dari Firestore setelah backup
    try {
        await services.clearAfkirHistory();
        ui.showToast('Data afkir berhasil di-backup dan dihapus dari sistem.', 'success');
    } catch (error) {
        console.error('Gagal menghapus history afkir:', error);
        ui.showToast('Backup berhasil tapi gagal menghapus data dari sistem.', 'error');
    }
}

function processRow(items) {
    // Buat string CSV dengan benar, handle nilai yang mengandung koma/quotes
    let row = '';
    items.forEach(item => {
        let value = item !== null ? item.toString() : '';
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            // Escape quotes dan wrap dengan quotes jika ada karakter khusus
            value = '"' + value.replace(/"/g, '""') + '"';
        }
        row += row.length ? ',' + value : value;
    });
    return row + '\n';
}


function exportToXlsx(filename, rows) {
    if (!window.XLSX) {
        ui.showToast('Ekspor XLSX gagal: SheetJS belum dimuat.', 'error');
        return;
    }
    if (!rows || rows.length === 0) {
        ui.showToast('Tidak ada data untuk diekspor.', 'error');
        return;
    }

    // Group by kategori, skip "Tanpa Kategori"
    const groupedByKategori = {};
    rows.forEach(row => {
        const kategori = row.KATEGORI;
        if (!kategori || kategori === 'Tanpa Kategori') return;
        if (!groupedByKategori[kategori]) groupedByKategori[kategori] = [];
        groupedByKategori[kategori].push(row);
    });

    const headers = ['NO', 'KODE_INVENTARIS', 'NAMA_ALAT', 'JUMLAH', 'TOTAL', 
        'MERK', 'WARNA', 'KATEGORI', 'KONDISI', 'KETERANGAN'];

    // Buat workbook dan sheet per kategori
    const wb = XLSX.utils.book_new();
    Object.keys(groupedByKategori).forEach(kategori => {
        const dataKategori = groupedByKategori[kategori];
        
        // Buat array 2D dengan title dan header
        const sheetData = [
            [`ALAT ${kategori.toUpperCase()}`], // Title seperti contoh
            [], // Baris kosong
            headers, // Header
            ...dataKategori.map(row => headers.map(h => row[h] ?? ''))
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        
        // Set column widths untuk kerapian
        ws['!cols'] = [
            { wch: 5 },   // NO
            { wch: 18 },  // KODE_INVENTARIS
            { wch: 25 },  // NAMA_ALAT
            { wch: 8 },   // JUMLAH
            { wch: 8 },   // TOTAL
            { wch: 15 },  // MERK
            { wch: 12 },  // WARNA
            { wch: 15 },  // KATEGORI
            { wch: 12 },  // KONDISI
            { wch: 30 }   // KETERANGAN
        ];
        
        // Merge title cell (A1:J1)
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, kategori);
    });

    // Download file
    XLSX.writeFile(wb, filename);
    ui.showToast('Data berhasil diekspor ke XLSX!', 'success');
}

// --- FUNGSI HELPER EKSPOR INVENTARIS ---
// Tambahkan field KATEGORI di setiap row agar bisa digroup
function getInventarisExportData(category = null) {
    const categories = category ? [category] : ['Metal', 'Non-Metal', 'Perlengkapan', 'Kenang-kenangan'];
    let data = [];
    
    categories.forEach(kategori => {
        // Group semua alat berdasarkan nama saja
        const alatByName = {};
        
        (state.allAlat || [])
            .filter(a => a.kategori === kategori)
            .forEach(alat => {
                const namaKey = alat.nama.trim().toUpperCase();
                if (!alatByName[namaKey]) {
                    alatByName[namaKey] = {
                        nama: namaKey,
                        kategori: kategori,
                        total: 0,
                        units: [],
                        jenis: []
                    };
                }
                if (alat.isIndividual) {
                    const units = (state.unitAlat || [])
                        .filter(u => u.jenisAlatId === alat.id)
                        .map(u => ({
                            kodeInv: u.kodeInv,
                            kondisi: u.kondisi,
                            merk: alat.merk,
                            warna: alat.warna,
                            keterangan: u.keterangan || alat.keterangan
                        }));
                    alatByName[namaKey].units.push(...units);
                    alatByName[namaKey].total += units.length;
                } else {
                    alatByName[namaKey].jenis.push({
                        stok: alat.stok || 0,
                        merk: alat.merk,
                        warna: alat.warna,
                        kondisi: alat.kondisi,
                        keterangan: alat.keterangan
                    });
                    alatByName[namaKey].total += (alat.stok || 0);
                }
            });

        // Penomoran ulang untuk setiap kategori
        let localNo = 1;

        Object.keys(alatByName).sort().forEach(namaAlat => {
            const item = alatByName[namaAlat];
            if (item.total > 0) {
                // Header grup alat dengan nomor urut lokal (seperti contoh)
                data.push({
                    NO: localNo++,
                    KODE_INVENTARIS: '',
                    NAMA_ALAT: item.nama,
                    JUMLAH: '',
                    TOTAL: item.total,
                    MERK: '',
                    WARNA: '',
                    KATEGORI: item.kategori,
                    KONDISI: '',
                    KETERANGAN: ''
                });

                const allUnits = [
                    ...item.units.map(u => ({
                        kodeInv: u.kodeInv,
                        merk: u.merk,
                        warna: u.warna,
                        kondisi: u.kondisi,
                        keterangan: u.keterangan,
                        jumlah: 1,
                        tipe: 'individual'
                    })),
                    ...item.jenis.map(j => ({
                        kodeInv: '-',
                        merk: j.merk,
                        warna: j.warna,
                        kondisi: j.kondisi,
                        keterangan: j.keterangan,
                        jumlah: j.stok,
                        tipe: 'kumulatif'
                    }))
                ];

                allUnits
                    .sort((a, b) => {
                        if (a.kodeInv === '-' && b.kodeInv === '-') {
                            return a.merk.localeCompare(b.merk);
                        }
                        if (a.kodeInv === '-') return 1;
                        if (b.kodeInv === '-') return -1;
                        return a.kodeInv.localeCompare(b.kodeInv);
                    })
                    .forEach(unit => {
                        data.push({
                            NO: '',
                            KODE_INVENTARIS: unit.kodeInv,
                            NAMA_ALAT: '',
                            JUMLAH: unit.tipe === 'individual' ? 1 : unit.jumlah,
                            TOTAL: '',
                            MERK: unit.merk,
                            WARNA: unit.warna,
                            KATEGORI: item.kategori,
                            KONDISI: unit.kondisi,
                            KETERANGAN: unit.keterangan
                        });
                    });
            }
        });

        // Baris kosong antar kategori
        if (categories.length > 1 && kategori !== categories[categories.length - 1]) {
            data.push({
                NO: '', KODE_INVENTARIS: '', NAMA_ALAT: '', JUMLAH: '',
                TOTAL: '', MERK: '', WARNA: '', KATEGORI: '', KONDISI: '', KETERANGAN: ''
            });
        }
    });

    return data;
}

function validateAlatForm(data, isIndividual) {
    if (!data.nama.trim() || !data.merk.trim() || !data.warna.trim() || !data.kondisi.trim()) {
        ui.showToast('Nama, Merk, Warna, dan Kondisi wajib diisi.', 'error');
        return false;
    }
    if (isNaN(data.tahunPembelian) || data.tahunPembelian < 1980 || data.tahunPembelian > new Date().getFullYear() + 1) {
        ui.showToast('Tahun pembelian tidak valid.', 'error');
        return false;
    }
    if (isIndividual) {
        if (isNaN(data.jumlahUnit) || data.jumlahUnit <= 0) { // <-- GUNAKAN data.jumlahUnit
            ui.showToast('Jumlah unit harus lebih dari 0.', 'error');
            return false;
        } else {
            if (isNaN(data.stok) || data.stok < 0) {
                ui.showToast('Jumlah stok tidak boleh negatif.', 'error');
                return false;
            }
        }
    }
    // Tambahan validasi kategori
    const allowedCategories = ["Metal", "Non-Metal", "Perlengkapan", "Kenang-kenangan"];
    if (!allowedCategories.includes(data.kategori)) {
        ui.showToast('Kategori alat wajib dipilih dari daftar yang tersedia.', 'error');
        return false;
    }
    return true;
}

// --- HANDLERS (Logika dari interaksi pengguna) ---

async function handleLogin(e) {
    e.preventDefault();
    e.stopPropagation();
    const form = e.target;
    const errorDiv = document.getElementById('login-error');
    const submitButton = form.querySelector('button[type="submit"]');
    if (errorDiv) errorDiv.textContent = '';
    if (submitButton) ui.setButtonLoading(submitButton, true, 'Memverifikasi...');

    // Ambil dan validasi input
    const email = form.email.value.trim();
    const password = form.password.value;
    let errorMsg = '';
    if (!email) {
        errorMsg = 'Email wajib diisi.';
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
        errorMsg = 'Format email tidak valid.';
    } else if (!password) {
        errorMsg = 'Password wajib diisi.';
    }
    if (errorMsg) {
        if (errorDiv) errorDiv.textContent = errorMsg;
        if (submitButton) ui.setButtonLoading(submitButton, false, 'Masuk');
        return;
    }

    // Pastikan data tidak bocor ke URL
    if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    try {
        await services.loginUser(email, password);
    } catch (error) {
        console.error('[LOGIN ERROR]', error);
        if (errorDiv) {
            switch (error?.code) {
                case 'auth/invalid-email':
                    errorDiv.textContent = 'Format email tidak valid.';
                    break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    errorDiv.textContent = 'Kombinasi email dan password salah.';
                    break;
                case 'auth/network-request-failed':
                    errorDiv.textContent = 'Gagal terhubung, periksa koneksi internet.';
                    break;
                default:
                    errorDiv.textContent = 'Terjadi kesalahan tidak diketahui.';
                    break;
            }
        }
    } finally {
        if (submitButton) ui.setButtonLoading(submitButton, false, 'Masuk');
    }
}

async function handleAlatFormSubmit(e) {
    e.preventDefault();
    if (handleAlatFormSubmit.isSubmitting) return;
    handleAlatFormSubmit.isSubmitting = true;
    const form = e.target;
    const id = form.querySelector('#alat-id').value;
    const submitButton = form.querySelector('button[type="submit"]');
    const isIndividual = form.querySelector('#alat-is-individual').checked;

    const alatData = { 
        nama: form.querySelector('#alat-nama').value, 
        kategori: form.querySelector('#alat-kategori').value, 
        merk: form.querySelector('#alat-merk').value, 
        warna: form.querySelector('#alat-warna').value, 
        keterangan: form.querySelector('#alat-keterangan').value, 
        kondisi: form.querySelector('#alat-kondisi').value,
        tahunPembelian: parseInt(form.querySelector('#alat-tahun').value, 10),
        isIndividual: isIndividual
    };

    if (isIndividual) {
        alatData.stok = 0;
        alatData.jumlahUnit = parseInt(form.querySelector('#alat-jumlah-unit').value, 10);
    } else {
        alatData.stok = parseInt(form.querySelector('#alat-stok').value, 10);
    }

    // --- Tambahan validasi: Cegah duplikasi tipe alat dengan nama/kategori sama ---
    if (!id) { // hanya untuk tambah baru
        const nama = alatData.nama.trim().toLowerCase();
        const kategori = alatData.kategori;
        // Cek apakah sudah ada alat dengan nama & kategori sama tapi tipe berbeda
        const conflict = (state.allAlat || []).find(a =>
            a.nama.trim().toLowerCase() === nama &&
            a.kategori === kategori &&
            a.isIndividual !== isIndividual &&
            // TAMBAHAN LOGIKA:
            // Hanya anggap konflik JIKA:
            // 1. Alat yang ada itu TIPE INDIVIDUAL (pasti konflik)
            // ATAU
            // 2. Alat yang ada itu TIPE KUMULATIF dan STOKNYA MASIH ADA (> 0)
            (a.isIndividual || (!a.isIndividual && (a.stok || 0) > 0))
        );
        if (conflict) {
            ui.showToast(
                isIndividual
                    ? 'Sudah ada alat dengan nama & kategori ini sebagai kumulatif. Tidak bisa menambah versi per unit (Kode INV) sebelum menghapus/mengubah yang lama.'
                    : 'Sudah ada alat dengan nama & kategori ini sebagai per unit (Kode INV). Tidak bisa menambah versi kumulatif.',
                'error'
            );
            handleAlatFormSubmit.isSubmitting = false;
            return;
        }
    }

    if (!validateAlatForm(alatData, isIndividual)) {
        handleAlatFormSubmit.isSubmitting = false;
        return;
    }

    ui.setButtonLoading(submitButton, true);
    try {
        if (id) {
            await services.updateAlat(id, alatData);
            ui.showToast('Alat berhasil diperbarui', 'success');
        } else {
            let unitsToAdd = [];
            if (isIndividual) {
                const jumlahUnit = parseInt(form.querySelector('#alat-jumlah-unit').value, 10);
                for (let i = 0; i < jumlahUnit; i++) {
                    unitsToAdd.push({
                        kodeInv: generateKodeINV(alatData.nama, alatData.merk, alatData.tahunPembelian, i),
                        warna: alatData.warna,
                        kondisi: alatData.kondisi,
                        keterangan: alatData.keterangan
                    });
                }
            }
            await services.addAlat(alatData, unitsToAdd);
            ui.showToast('Alat baru berhasil ditambahkan', 'success');
        }
        form.reset();
        ui.toggleModal('modal-add-alat', false);
    } catch (error) {
        console.error("Gagal menyimpan alat:", error);
        ui.showToast(`Gagal: ${error.message}`, 'error');
    } finally {
        ui.setButtonLoading(submitButton, false);
        handleAlatFormSubmit.isSubmitting = false;
    }
}

async function handlePeminjamanFormSubmit(e) {
    e.preventDefault();
    if (handlePeminjamanFormSubmit.isSubmitting) return;
    handlePeminjamanFormSubmit.isSubmitting = true;
    
    const form = e.target;
    const cartEmpty = !state.peminjamanCart || Object.keys(state.peminjamanCart).length === 0;
    
    // Collect all validation errors
    const errors = [];
    
    // Validate required fields
    const fields = {
        'Nama Peminjam': form.querySelector('#peminjaman-nama')?.value?.trim(),
        'Nomor HP': form.querySelector('#peminjaman-hp')?.value?.trim(),
        'Organisasi': form.querySelector('#peminjaman-organisasi')?.value?.trim(),
        'Jaminan': form.querySelector('#peminjaman-jaminan')?.value?.trim(),
        'Tanggal Kembali': form.querySelector('#peminjaman-tgl-kembali')?.value
    };

    // Check empty fields
    Object.entries(fields).forEach(([fieldName, value]) => {
        if (!value) {
            errors.push(`${fieldName} wajib diisi`);
        }
    });

    // Validate cart
    if (cartEmpty) {
        errors.push('Keranjang peminjaman masih kosong');
    }

    // Show all validation errors at once
    if (errors.length > 0) {
        ui.showToast(errors.join('\n'), 'error');
        return;
    }

    // If validation passes, prepare data
    const peminjamanData = {
        namaPeminjam: fields['Nama Peminjam'],
        noHp: fields['Nomor HP'],
        organisasi: fields['Organisasi'],
        jaminan: fields['Jaminan'],
        tglKembaliRencana: fields['Tanggal Kembali'],
        status: 'Dipinjam',
        timestampKembali: null,
        items: Object.values(state.peminjamanCart).map(item => ({
            alatId: item.data.id,
            namaAlat: item.data.nama,
            merk: item.data.merk,
            warna: item.data.warna,
            tahunPembelian: item.data.tahunPembelian,
            jumlah: item.jumlah,
            unitId: item.data.unitId || null,
            kodeInv: item.data.kodeInv || null
        }))
    };

    // Create transaction ID
    const t = new Date();
    peminjamanData.transactionId = `INV-${t.getFullYear()}${(t.getMonth() + 1).toString().padStart(2, '0')}${t.getDate().toString().padStart(2, '0')}-${t.getHours()}${t.getMinutes()}${t.getSeconds()}`;

    // Submit peminjaman
    const submitButton = form.querySelector('button[type="submit"]');
    ui.setButtonLoading(submitButton, true, 'Merekam...');

    try {
        // Verify current status before proceeding
        const itemsToVerify = Object.values(state.peminjamanCart);
        for (const item of itemsToVerify) {
            if (item.data.unitId) {
                const unitDoc = await services.getUnitDoc(item.data.unitId);
                if (!unitDoc.exists()) {
                    throw new Error(`Unit dengan ID ${item.data.unitId} tidak ditemukan`);
                }
                if (unitDoc.data().status !== 'Tersedia') {
                    throw new Error(`Unit ${unitDoc.data().kodeInv} sedang dipinjam`);
                }
            }
        }
        
        await services.recordPeminjaman(peminjamanData);
        ui.showToast('Peminjaman berhasil direkam', 'success');
        form.reset();
        state.peminjamanCart = {};
        ui.renderCart();
        ui.toggleModal('modal-add-peminjaman', false);
    } catch (error) {
        console.error("Gagal merekam peminjaman:", error);
        ui.showToast('Gagal merekam peminjaman: ' + (error.message || 'Unknown error'), 'error');
        // Refresh both unit and peminjaman data
        services.listenToUnitAlat(snapshot => {
            state.unitAlat = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            ui.renderAlatForPeminjaman(document.getElementById('search-peminjaman-alat')?.value || '');
        });
    } finally {
        ui.setButtonLoading(submitButton, false, 'Rekam');
        handlePeminjamanFormSubmit.isSubmitting = false;
    }
}

async function handleAfkirFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const id = form.querySelector('#afkir-alat-id').value;
    const jumlahToAfkir = parseInt(form.querySelector('#afkir-jumlah').value);
    const alasan = form.querySelector('#afkir-alasan').value;

    if (!alasan.trim()) {
        ui.showToast('Alasan afkir wajib diisi.', 'error');
        return;
    }
    if (isNaN(jumlahToAfkir) || jumlahToAfkir <= 0) {
        ui.showToast('Jumlah afkir tidak valid.', 'error');
        return;
    }

    // --- CEK APAKAH ALAT/UNIT SEDANG DIPINJAM ---
    // Cek apakah ini alat individual (unit) atau kumulatif (jenis)
    // Cek di form, jika ada field unit id gunakan itu
    const unitIdField = form.querySelector('#afkir-unit-id');
    let sedangDipinjam = false;
    if (unitIdField && unitIdField.value) {
        // Individual/unit: cek apakah ada item dengan unitId sama di peminjaman aktif
        const unitId = unitIdField.value;
        sedangDipinjam = (state.allPeminjaman || []).some(p => {
            if (p.status !== 'Dipinjam') return false;
            return (p.items || []).some(item => item.unitId === unitId);
        });
        if (sedangDipinjam) {
            ui.showToast('Unit ini tidak bisa diafkirkan karena sedang dipinjam.', 'error');
            return;
        }
    } else {
        // Kumulatif: cek alatId
        sedangDipinjam = (state.allPeminjaman || []).some(p => {
            if (p.status !== 'Dipinjam') return false;
            return (p.items || []).some(item => item.alatId === id);
        });
        if (sedangDipinjam) {
            ui.showToast('Alat tidak bisa diafkirkan karena sedang dipinjam.', 'error');
            return;
        }
    }

    ui.setButtonLoading(submitButton, true);
    try {
        await services.processAfkir(id, jumlahToAfkir, alasan);
        ui.showToast(`Berhasil meng-afkirkan ${jumlahToAfkir} item.`, 'success');
        ui.toggleModal('modal-afkir-alat', false);
    } catch (error) {
        console.error("Gagal meng-afkirkan alat:", error);
        ui.showToast(`Gagal: ${error.message}`, 'error');
    } finally {
        ui.setButtonLoading(submitButton, false, 'Konfirmasi Afkir');
    }
}

// Fungsi untuk update status ketersediaan alat kumulatif
function updateAlatKumulatifStatus() {
    (state.allAlat || []).forEach(alat => {
        if (!alat.isIndividual) {
            // Cari stok alat ini
            const stok = alat.stok || 0;
            // Cari status sekarang
            const status = stok > 0 ? 'Tersedia' : 'Habis';
            // Jika status berbeda, update di Firestore
            if (alat.status !== status) {
                services.updateAlat(alat.id, { status });
            }
        }
    });
}

// --- SETUP LISTENERS ---

function setupEventListeners() {
    document.body.addEventListener('click', handleClickEvents);
    document.body.addEventListener('submit', handleSubmitEvents);
    document.body.addEventListener('input', handleInputEvents);
    document.body.addEventListener('change', handleChangeEvents);
}

// --- EVENT HANDLERS ---

async function handleClickEvents(e) {
    if (e.target.classList.contains('modal-backdrop')) {
        // Cegah close jika modal form alat atau form peminjaman
        const modalId = e.target.id;
        if (modalId === 'modal-add-alat' || modalId === 'modal-add-peminjaman') {
            // Do nothing, biarkan modal tetap terbuka
            return;
        }
        ui.toggleModal(modalId, false);
        return;
    }
    
    const target = e.target.closest('button');
    if (!target) return;
    
    // Debug: log semua klik tombol
    // Debug logs removed

    const id = target.id;
    
    if (id && id.startsWith('nav-')) {
        ui.switchView(id.replace('nav-', ''));
        return;
    }
    
    switch (id) {
        case 'btn-logout':
            try {
                await services.logoutUser();
                // Reset state after logout
                resetState();
                ui.renderLoginScreen();
            } catch (error) {
                console.error("Logout failed:", error);
                ui.showToast("Gagal keluar dari sistem", "error");
            }
            break;
        case 'btn-show-add-alat-modal': ui.openAddAlatModal(); break;
        case 'btn-show-add-peminjaman-modal': ui.openAddPeminjamanModal(); break;
        case 'btn-export-inventaris':
            if (confirm(`Pilih Opsi Ekspor:\n\n- Tekan "OK" untuk mengunduh SEMUA data inventaris.\n- Tekan "Cancel" untuk mengunduh HANYA kategori "${state.currentAlatCategory}" yang terlihat.`)) {
                const allInventarisData = getInventarisExportData();
                exportToXlsx('Laporan_Inventaris_Lengkap.xlsx', allInventarisData);
            } else {
                const filteredInventarisData = getInventarisExportData(state.currentAlatCategory);
                exportToXlsx(`Laporan_Inventaris_${state.currentAlatCategory}.xlsx`, filteredInventarisData);
            }
            break;
        case 'btn-cancel-add-alat': ui.toggleModal('modal-add-alat', false); break;
        case 'btn-cancel-add-peminjaman': ui.toggleModal('modal-add-peminjaman', false); break;
        case 'btn-close-struk': ui.toggleModal('modal-detail-peminjaman', false); break;
        case 'btn-close-history': ui.toggleModal('modal-history-alat', false); break;
        case 'btn-cancel-afkir': ui.toggleModal('modal-afkir-alat', false); break;
        case 'btn-afkir-alat': ui.openAfkirModal(); break;
        case 'btn-backup-afkir': backupAndClearAfkir(); break;
        case 'btn-backup-kegiatan': backupAndClearKegiatan(); break;
        case 'btn-download-struk': ui.downloadStruk(target.dataset.id); break;
        case 'btn-download-struk': ui.downloadStruk(target.dataset.id); break;
    }

    if (target.classList.contains('accordion-header')) ui.toggleAccordion(target);
    if (target.classList.contains('btn-edit-alat')) ui.openEditAlatModal(target.dataset.id);
    if (target.classList.contains('btn-history-alat')) ui.renderHistoryAlat(target.dataset.id);
    if (target.classList.contains('btn-add-merk')) ui.openAddMerkModal(target.dataset.nama, target.dataset.kategori, target.dataset.isIndividual);
    if (target.classList.contains('btn-kembalikan')) {
        const txId = target.dataset.id;
        if (!txId) {
            ui.showToast('ID transaksi tidak tersedia. Tidak dapat menandai kembali.', 'error');
            return;
        }
        if (confirm('Tandai transaksi ini sebagai "Kembali"?')) {
            services.markAsReturned(txId).then(() => ui.showToast('Transaksi berhasil diperbarui.', 'success')).catch(err => ui.showToast(`Gagal: ${err.message}`, 'error'));
        }
    }
    if (target.classList.contains('btn-detail-peminjaman')) ui.showPeminjamanDetail(target.dataset.id);

    // Kegiatan detail view (admin)
    if (target.classList.contains('btn-view-latihan')) {
        ui.showKegiatanDetail(target.dataset.id);
    }

    // Replace the existing btn-add-to-cart handling with this simpler version
    if (target.classList.contains('btn-add-to-cart')) {
        const alatId = target.dataset.alatId;
        const alat = state.allAlat.find(a => a.id === alatId);
        if (!alat) return;

        // For individual items
        if (alat.isIndividual) {
            const container = document.getElementById('peminjaman-alat-list');
            const select = container?.querySelector(`select.dropdown-inv[data-alat-id="${alatId}"]`);
            const unitId = select?.value;
            
            if (!unitId) return; // Silently fail if no unit selected
            ui.addToCart(alatId, unitId);
        } else {
            // For cumulative items
            ui.addToCart(alatId);
        }
    }
    if (target.classList.contains('btn-remove-from-cart')) ui.removeFromCart(target.dataset.id);

    // Tombol edit history / open history form / cancel history
    if (target.classList.contains('btn-edit-history')) {
        ui.openHistoryForm(target.dataset.unitId, target.dataset.id);
    }
    // Handler tombol afkir unit individu
    if (target.classList.contains('btn-afkir-unit')) {
        const unitId = target.dataset.unitId;
        // Panggil modal afkir khusus unit
        ui.openAfkirUnitModal(unitId);
    }
    if (target.id === 'btn-open-history-form') {
            // Coba ambil unit id dari hidden field
            let currentUnitId = document.getElementById('history-unit-id')?.value || '';
            if (!currentUnitId) {
                // Jika tidak ada, coba ambil unit id dari history list (jika hanya satu unit sedang ditampilkan)
                const historyList = document.getElementById('history-list');
                if (historyList) {
                    // Cari data-unit-id dari tombol edit history jika hanya satu unit
                    const editBtns = historyList.querySelectorAll('.btn-edit-history');
                    if (editBtns.length === 1) {
                        currentUnitId = editBtns[0].dataset.unitId;
                    }
                }
            }
            if (currentUnitId) {
                ui.openHistoryForm(currentUnitId);
            } else {
                ui.showToast('Pilih atau tampilkan unit tertentu untuk menambah riwayat.', 'error');
            }
    }
    if (target.id === 'btn-cancel-history') {
        ui.closeHistoryForm();
    }
}

function handleSubmitEvents(e) {
    e.preventDefault();
    const form = e.target;
    if (!form) return;

    switch (form.id) {
        case 'login-form':
            handleLogin(e);
            break;
        case 'alat-form':
        case 'form-add-alat':
            handleAlatFormSubmit(e);
            break;
        case 'peminjaman-form':
        case 'form-add-peminjaman':
            // Use the local handler instead of dynamic import
            handlePeminjamanFormSubmit(e);
            break;
        case 'afkir-form':
        case 'form-afkir-alat':
            handleAfkirFormSubmit(e);
            break;
        case 'form-history-entry':
            handleHistoryFormSubmit(e);
            break;
        default:
            // unhandled form id
            break;
    }
}

// Tambahkan: handler input (search fields)
function handleInputEvents(e) {
    const target = e.target;
    if (!target) return;
    if (target.id === 'search-alat') {
        ui.renderAlatList(target.value);
    } else if (target.id === 'search-peminjaman-alat') {
        ui.renderAlatForPeminjaman(target.value);
    }
}

// Tambahkan: handler change (tabs select & checkbox toggle)
function handleChangeEvents(e) {
    const target = e.target;
    if (!target) return;

    if (target.id === 'peminjaman-kategori') {
        state.currentAlatCategory = target.value;
        ui.renderAlatForPeminjaman(document.getElementById('search-peminjaman-alat')?.value || '');
    }
    else if (target.id === 'tabs-select') {
        state.currentAlatCategory = target.value;
        ui.renderCategoryTabs();
        ui.renderAlatList();
        ui.renderAlatForPeminjaman('');
    }
    else if (target.id === 'alat-is-individual') {
        const isChecked = target.checked;
        document.getElementById('cumulative-fields')?.classList.toggle('hidden', isChecked);
        document.getElementById('individual-fields')?.classList.toggle('hidden', !isChecked);
    }
}


// Tambahkan: handler untuk submit riwayat unit (tambah / edit)
async function handleHistoryFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const targetId = form.querySelector('#history-unit-id').value; // bisa unitId atau jenisAlatId
    const historyId = form.querySelector('#history-id').value;
    const newKondisi = form.querySelector('#history-new-kondisi').value.trim();
    const note = form.querySelector('#history-note').value.trim();

    if (!targetId || !newKondisi) {
        ui.showToast('Unit / jenis dan kondisi baru wajib diisi.', 'error');
        return;
    }

    ui.setButtonLoading(form.querySelector('button[type="submit"]'), true);
    try {
        // cek apakah targetId ada di unitAlat -> berarti riwayat unit
        const unit = state.unitAlat.find(u => u.id === targetId);
        if (unit) {
            const oldKondisi = unit?.kondisi || '';
            if (historyId) {
                await services.updateUnitHistory(unit.id, historyId, { oldKondisi, newKondisi, note });
                ui.showToast('Riwayat unit berhasil diperbarui.', 'success');
            } else {
                await services.addUnitHistory(unit.id, { oldKondisi, newKondisi, note });
                ui.showToast('Riwayat unit berhasil ditambahkan.', 'success');
            }
        } else {
            // anggap targetId adalah id jenis alat (alat kumulatif)
            const jenis = state.allAlat.find(a => a.id === targetId);
            const oldKondisi = jenis?.kondisi || '';
            if (!jenis) throw new Error('Jenis alat tidak ditemukan untuk riwayat.');
            if (historyId) {
                await services.updateAlatHistory(jenis.id, historyId, { oldKondisi, newKondisi, note });
                ui.showToast('Riwayat jenis alat berhasil diperbarui.', 'success');
            } else {
                await services.addAlatHistory(jenis.id, { oldKondisi, newKondisi, note });
                ui.showToast('Riwayat jenis alat berhasil ditambahkan.', 'success');
            }
        }
        ui.closeHistoryForm();
        ui.refreshHistoryDisplay(); // Refresh tampilan riwayat setelah menyimpan
    } catch (err) {
        console.error('Gagal menyimpan riwayat:', err);
        ui.showToast(`Gagal: ${err.message}`, 'error');
    } finally {
        ui.setButtonLoading(form.querySelector('button[type="submit"]'), false);
    }
}

// --- DATA LISTENERS (REAL-TIME) ---

function startDataListeners() {
    const unsubAlat = services.listenToAlat(snapshot => {
        state.allAlat = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateAlatKumulatifStatus(); // <-- Tambahkan ini
        if (state.user) {
            ui.updateDashboardStats();
            ui.renderCategoryTabs();
            ui.renderAlatList(document.getElementById('search-alat')?.value || '');
            ui.renderAlatForPeminjaman(document.getElementById('search-peminjaman-alat')?.value || '');
        }
    });

    const unsubUnitAlat = services.listenToUnitAlat(snapshot => {
        state.unitAlat = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (state.user) {
            ui.updateDashboardStats();
            ui.renderAlatList(document.getElementById('search-alat')?.value || '');
            ui.renderAlatForPeminjaman(document.getElementById('search-peminjaman-alat')?.value || '');
        }
    });

    const unsubPeminjaman = services.listenToPeminjaman(snapshot => {
        state.allPeminjaman = snapshot.docs.map(doc => {
            const data = doc.data();
            // Defensive: always set id property
            return { id: doc.id, ...data };
        });
        updateAlatKumulatifStatus();
        if (state.user) {
            ui.updateDashboardStats();
            ui.renderPeminjamanList();
        }
    });

    const unsubAfkir = services.listenToAfkir(snapshot => {
        state.allAfkir = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (state.user) {
            ui.updateDashboardStats();
            ui.renderAfkirList();
        }
    });

    // Kegiatan listener (admin view)
    const unsubKegiatan = services.listenToKegiatan(snapshot => {
        state.allKegiatan = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (state.user) {
            ui.updateKegiatanStats();
            ui.renderKegiatanList();
        }
    });

    state.unsubscribeListeners.push(unsubKegiatan);

    state.unsubscribeListeners.push(unsubAlat, unsubUnitAlat, unsubPeminjaman, unsubAfkir);
}

// --- TITIK MASUK APLIKASI ---

function initializeApp() {
    services.listenToAuthChanges(async (user) => {
        if (user) {
            state.user = user;
            const profileDoc = await services.getUserProfile(user.uid);
            state.firestoreUser = profileDoc.exists() ? profileDoc.data() : { username: user.email };

            ui.renderDashboard();
            ui.setupModalInteractivity();
            startDataListeners();
            setupEventListeners();
        } else {
            resetState();
            ui.renderLoginScreen();
            // Pasang event listener submit pada form login
            setTimeout(() => {
                const loginForm = document.getElementById('login-form');
                if (loginForm) {
                    loginForm.addEventListener('submit', handleLogin);
                }
            }, 0);
        }
    });
}

// Jalankan aplikasi
initializeApp();