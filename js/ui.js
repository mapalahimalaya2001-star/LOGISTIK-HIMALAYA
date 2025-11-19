// Modal afkir unit individu
export function openAfkirUnitModal(unitId) {
    // Cari unit di state (unit menyimpan kodeInv & kondisi, tapi sering kali tidak menyimpan merk/tahun)
    const unit = (state.unitAlat || []).find(u => u.id === unitId);
    if (!unit) {
        showToast('Unit tidak ditemukan!', 'error');
        return;
    }

    // Cari jenis alat (parent) untuk mengambil metadata merk / tahun apabila tidak ada di unit
    const jenis = (state.allAlat || []).find(a => a.id === unit.jenisAlatId) || {};

    const merk = jenis.merk || unit.merk || '-';
    const tahun = jenis.tahunPembelian || unit.tahunPembelian || '-';
    const kodeInv = unit.kodeInv || '-';
    const kondisi = unit.kondisi || '-';

    // Buat modal sederhana (bisa dikembangkan sesuai kebutuhan)
    const modalId = 'modal-afkir-unit';
    let modal = document.getElementById(modalId);
    if (modal) modal.remove();
    const html = `
    <div id="${modalId}" class="modal fixed inset-0 z-50 flex items-center justify-center">
        <div class="fixed inset-0 bg-black bg-opacity-50"></div>
        <div class="bg-white rounded-lg shadow-xl w-full max-w-md m-4 p-6 relative z-10">
            <h3 class="text-xl font-bold mb-2">Afkir Unit ${kodeInv}</h3>
            <p class="mb-2 text-gray-700">Merk: ${merk} | Tahun: ${tahun} | Kondisi: ${kondisi}</p>
            <form id="form-afkir-unit" class="space-y-4">
                <input type="hidden" id="afkir-unit-id" value="${unit.id}">
                <div>
                    <label class="text-sm text-gray-700">Alasan Afkir</label>
                    <textarea id="afkir-unit-alasan" class="w-full p-2 border rounded h-20" required></textarea>
                </div>
                <div class="flex justify-end gap-2">
                    <button type="button" id="btn-cancel-afkir-unit" class="px-4 py-2 bg-gray-200 rounded">Batal</button>
                    <button type="submit" class="px-4 py-2 bg-red-600 text-white rounded">Konfirmasi Afkir</button>
                </div>
            </form>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    modal = document.getElementById(modalId);
    // Event batal
    modal.querySelector('#btn-cancel-afkir-unit').onclick = () => modal.remove();
    // Event submit
    modal.querySelector('#form-afkir-unit').onsubmit = async (e) => {
        e.preventDefault();
        const alasan = modal.querySelector('#afkir-unit-alasan').value.trim();
        if (!alasan) {
            showToast('Alasan afkir wajib diisi.', 'error');
            return;
        }
        try {
            showLoading('Mengafkir unit...');
            await services.processAfkirUnit(unit.id, alasan);
            hideLoading();
            showToast('Unit berhasil diafkirkan.', 'success');
            modal.remove();
        } catch (err) {
            console.error('Gagal afkir unit:', err);
            hideLoading();
            showToast('Gagal afkir unit: ' + (err.message || 'Unknown error'), 'error');
        }
    };
}
// Fungsi untuk membuka form tambah/edit riwayat unit
export function openHistoryForm(unitId, historyId = '') {
    const form = document.getElementById('form-history-entry');
    if (!form) return;
    form.classList.remove('hidden');
    form.reset();
    form.querySelector('#history-unit-id').value = unitId || '';
    form.querySelector('#history-id').value = historyId || '';
    // Jika edit, bisa diisi data lama (opsional, tergantung implementasi renderHistoryAlat)
}

// Fungsi untuk menutup form tambah/edit riwayat
export function closeHistoryForm() {
    const form = document.getElementById('form-history-entry');
    if (form) form.classList.add('hidden');
}
// js/ui.js

import * as templates from './templates.js';
import { state } from './state.js';
import * as services from './services.js';

export const appContainer = document.getElementById('app-container');
const toastContainer = document.getElementById('toast-container');
// Safe jsPDF import: avoid error if not loaded
let jsPDF = null;
if (window.jspdf && window.jspdf.jsPDF) {
    jsPDF = window.jspdf.jsPDF;
}

// --- NOTIFIKASI & UTILITAS UI ---
export function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    let bgColor = 'bg-blue-500';
    if (type === 'success') bgColor = 'bg-green-500';
    if (type === 'error') bgColor = 'bg-red-500';
    toast.className = `p-4 rounded-lg shadow-lg text-white mb-2 transition-all duration-300 opacity-0 transform translate-x-10`;
    toast.classList.add(bgColor);
    toast.textContent = message;
    
    toastContainer.prepend(toast);
    
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 10);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Global loading overlay
export function showLoading(message = 'Memproses...') {
    let overlay = document.getElementById('global-loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'global-loading-overlay';
        overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40';
        overlay.innerHTML = `<div class="bg-white p-4 rounded-lg flex items-center gap-3 shadow-lg"><svg class="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg><div class="text-sm text-gray-700">${message}</div></div>`;
        document.body.appendChild(overlay);
    } else {
        overlay.style.display = 'flex';
        overlay.querySelector('div div').textContent = message;
    }
}

export function hideLoading() {
    const overlay = document.getElementById('global-loading-overlay');
    if (overlay) overlay.style.display = 'none';
}

// Floating public link for logged-out users
export function ensurePublicKegiatanLinkVisible(isLoggedIn) {
    let btn = document.getElementById('floating-public-kegiatan');
    if (isLoggedIn) {
        if (btn) btn.remove();
        return;
    }
    if (!btn) {
        btn = document.createElement('a');
        btn.id = 'floating-public-kegiatan';
        btn.href = 'public-kegiatan.html';
        btn.className = 'fixed bottom-6 right-6 z-40 bg-blue-600 text-white px-4 py-2 rounded shadow-lg hover:bg-blue-700';
        btn.textContent = 'Catat Kegiatan';
        document.body.appendChild(btn);
    }
}

export function setButtonLoading(button, isLoading, defaultText = 'Simpan') {
    if (!button) return;
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = `<svg class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Memproses...`;
    } else {
        button.disabled = false;
        button.innerHTML = defaultText;
    }
}

export function toggleModal(modalId, show = true) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (show) modal.classList.replace('hidden', 'flex');
    else modal.classList.replace('flex', 'hidden');
}

export function switchView(viewName) {
    document.querySelectorAll('.page-view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${viewName}`)?.classList.remove('hidden');

    document.querySelectorAll('[id^="nav-"]').forEach(n => {
        n.classList.remove('tab-link-active');
        n.classList.add('text-gray-500');
        if (n.id === `nav-${viewName}`) {
            n.classList.add('tab-link-active');
            n.classList.remove('text-gray-500');
        }
    });
}

export function toggleAccordion(button) {
    if (!button) return;
    const targetSelector = button.dataset.target;
    const body = document.querySelector(targetSelector);
    const icon = button.querySelector('.accordion-icon');
    
    // Close all other accordions first
    const allAccordions = document.querySelectorAll('.accordion-body');
    const allIcons = document.querySelectorAll('.accordion-icon');
    
    allAccordions.forEach(acc => {
        if (acc.id !== targetSelector.substring(1)) {
            acc.classList.add('hidden');
        }
    });
    
    allIcons.forEach(ico => {
        if (ico !== icon) {
            ico.classList.remove('rotate-180');
        }
    });
    
    // Toggle the clicked accordion
    if (body && icon) {
        body.classList.toggle('hidden');
        icon.classList.toggle('rotate-180');
    }
}

// --- RENDER UTAMA ---
export function renderLoginScreen() {
    appContainer.innerHTML = templates.getLoginScreenHTML();
}

export function renderDashboard() {
    appContainer.innerHTML = templates.getDashboardHTML(state.user, state.firestoreUser);
    document.getElementById('view-dashboard').innerHTML = templates.getDashboardViewHTML();
    document.getElementById('view-inventaris').innerHTML = templates.getInventarisViewHTML();
    document.getElementById('view-peminjaman').innerHTML = templates.getPeminjamanViewHTML();
    document.getElementById('view-latihan').innerHTML = templates.getKegiatanViewHTML();
    document.getElementById('view-afkir').innerHTML = templates.getAfkirViewHTML();
    document.getElementById('modal-container').innerHTML = templates.getModalContainerHTML();
}

// --- FUNGSI RENDER PARSIAL (UPDATE UI) ---
export function updateDashboardStats() {
    // --- 1. Statistik Jenis Alat ---
    const totalJenisAlat = (state.allAlat || []).length;
    const jenisKumulatif = state.allAlat.filter(a => !a.isIndividual).length;
    const jenisIndividual = state.allAlat.filter(a => a.isIndividual).length;

    // --- 2. Statistik Jumlah Alat per Kategori ---
    const categories = ['Metal', 'Non-Metal', 'Perlengkapan', 'Kenang-kenangan'];
    const alatPerKategori = {};
    categories.forEach(cat => {
        alatPerKategori[cat] = (state.allAlat || []).filter(a => a.kategori === cat).length;
    });

    // --- 3. Update UI statistik alat ---
    document.getElementById('stat-total-alat').textContent = totalJenisAlat;
    document.getElementById('stat-total-jenis-kumulatif').textContent = `Kumulatif: ${jenisKumulatif}`;
    document.getElementById('stat-total-jenis-individual').textContent = `Individual: ${jenisIndividual}`;

    // --- 4. Update UI jumlah alat per kategori ---
    const kategoriStats = document.getElementById('kategori-stats');
    if (kategoriStats) {
        kategoriStats.innerHTML = categories.map(cat => {
            return `<div class="flex justify-between items-center mb-1">
                <span class="text-sm font-medium">${cat}</span>
                <span class="text-sm text-gray-600">${alatPerKategori[cat]} jenis alat</span>
            </div>`;
        }).join('');
    }

    // --- 5. Statistik Peminjaman & Afkir tetap ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const peminjamanAktif = (state.allPeminjaman || []).filter(p => p.status === 'Dipinjam');
    
    const individualDipinjam = peminjamanAktif.reduce((sum, p) => {
        return sum + p.items.reduce((itemSum, item) => itemSum + (item.jumlah || 1), 0);
    }, 0);
    
    const estKembaliHariIni = peminjamanAktif.filter(p => {
        if (!p.tglKembaliRencana) return false;
        const tglKembali = new Date(p.tglKembaliRencana);
        tglKembali.setHours(0, 0, 0, 0);
        return tglKembali.getTime() === today.getTime();
    }).length;

    document.getElementById('stat-peminjaman-aktif').textContent = peminjamanAktif.length;
    document.getElementById('stat-total-item-dipinjam').textContent = `Total Item: ${individualDipinjam}`;
    document.getElementById('stat-estimasi-kembali').textContent = `Est. Kembali Hari Ini: ${estKembaliHariIni}`;

    // --- Statistik Afkir ---
    const totalAfkir = (state.allAfkir || []).reduce((sum, item) => sum + (item.jumlahDiAfkir || 0), 0);
    const afkirBulanIni = state.allAfkir.filter(item => {
        if (!item.afkirTimestamp) return false;
        const afkirDate = item.afkirTimestamp.toDate();
        return afkirDate.getMonth() === today.getMonth() && 
               afkirDate.getFullYear() === today.getFullYear();
    }).reduce((sum, item) => sum + (item.jumlahDiAfkir || 0), 0);

    document.getElementById('stat-barang-afkir').textContent = totalAfkir;
    document.getElementById('stat-afkir-bulan-ini').textContent = `Bulan Ini: ${afkirBulanIni}`;

    // --- Render Statistik Kategori ---
    if (kategoriStats) {
        const categories = ['Metal', 'Non-Metal', 'Perlengkapan', 'Kenang-kenangan'];
        kategoriStats.innerHTML = categories.map(category => {
            const alatInKategori = state.allAlat.filter(a => a.kategori === category);
            const totalItem = alatInKategori.reduce((sum, alat) => {
                if (alat.isIndividual) {
                    return sum + state.unitAlat.filter(u => u.jenisAlatId === alat.id).length;
                }
                return sum + (alat.stok || 0);
            }, 0);
            // Calculate totalStok for percentage
            const totalStok = state.allAlat.reduce((sum, alat) => {
                if (alat.isIndividual) {
                    return sum + state.unitAlat.filter(u => u.jenisAlatId === alat.id).length;
                }
                return sum + (alat.stok || 0);
            }, 0);
            const percentage = totalStok > 0 ? ((totalItem / totalStok) * 100).toFixed(1) : 0;
            
            return `<div>
                <div class="flex justify-between items-center mb-1">
                    <span class="text-sm font-medium">${category}</span>
                    <span class="text-sm text-gray-600">${totalItem} unit (${percentage}%)</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-600 rounded-full h-2" style="width: ${percentage}%"></div>
                </div>
            </div>`;
        }).join('');
    }

    // --- Render Peminjaman Terkini ---
    const recentPeminjaman = document.getElementById('recent-peminjaman');
    if (recentPeminjaman) {
        const recent = (state.allPeminjaman || [])
            .filter(p => p.status === 'Dipinjam')
            .sort((a, b) => b.timestampPinjam - a.timestampPinjam)
            .slice(0, 5);

        recentPeminjaman.innerHTML = recent.map(p => {
            const tglPinjam = p.timestampPinjam?.toDate().toLocaleDateString('id-ID');
            const totalItems = p.items.reduce((sum, item) => sum + (item.jumlah || 1), 0);
            return `<div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                    <p class="font-medium">${p.namaPeminjam}</p>
                    <p class="text-sm text-gray-500">${tglPinjam} • ${totalItems} item</p>
                </div>
                <span class="text-yellow-600 text-sm font-medium px-2 py-1 bg-yellow-50 rounded-full">Dipinjam</span>
            </div>`;
        }).join('') || '<p class="text-gray-500 text-center">Tidak ada peminjaman aktif</p>';
    }
}

// --- LATIHAN: render & helpers ---
export function updateKegiatanStats() {
    const total = (state.allKegiatan || []).length;
    const el = document.getElementById('stat-total-latihan');
    if (el) el.textContent = total;
}

export function renderKegiatanList() {
    const container = document.getElementById('latihan-list');
    if (!container) return;
    if ((state.allKegiatan || []).length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 py-8">Belum ada catatan latihan.</p>`;
        return;
    }

    container.innerHTML = (state.allKegiatan || []).map(doc => {
        const t = doc.tanggalKegiatan ? (doc.tanggalKegiatan.toDate ? doc.tanggalKegiatan.toDate().toLocaleString('id-ID') : String(doc.tanggalKegiatan)) : (doc.timestamp ? (doc.timestamp.toDate ? doc.timestamp.toDate().toLocaleString('id-ID') : '-') : '-');
        const totalItems = (doc.items || []).length;
        return `<div class="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center"><div><div class="font-semibold">${doc.namaPengguna || '-'} • ${doc.latihan || '-'}</div><div class="text-sm text-gray-500">${t} • ${totalItems} item</div></div><div class="flex gap-2"><button data-id="${doc.id}" class="btn-view-latihan text-sm px-3 py-1 bg-blue-50 text-blue-700 rounded">Detail</button></div></div>`;
    }).join('');
}

export function showKegiatanDetail(latihanId) {
    const latihan = (state.allKegiatan || []).find(l => l.id === latihanId);
    if (!latihan) return;
    const html = templates.getKegiatanDetailModalHTML(latihan);
    // Remove existing modal if any
    const existing = document.getElementById('modal-latihan-detail');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', html);
    const modal = document.getElementById('modal-latihan-detail');
    modal.querySelector('#btn-close-latihan-detail').addEventListener('click', () => modal.remove());
}

export function renderCategoryTabs() {
    const categories = ['Metal', 'Non-Metal', 'Perlengkapan', 'Kenang-kenangan'];
    const tabsDesktop = document.getElementById('tabs-desktop');
    const tabsSelect = document.getElementById('tabs-select');
    if (!tabsDesktop || !tabsSelect) return;

    tabsDesktop.innerHTML = '';
    tabsSelect.innerHTML = '';

    categories.forEach(cat => {
        const button = document.createElement('button');
        button.className = `whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${cat === state.currentAlatCategory ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`;
        button.textContent = cat;
        button.addEventListener('click', () => {
            state.currentAlatCategory = cat;
            renderCategoryTabs();
            renderAlatList();
        });
        tabsDesktop.appendChild(button);

        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        option.selected = cat === state.currentAlatCategory;
        tabsSelect.appendChild(option);
    });
}

export function renderAlatList(searchTerm = '') {
    const container = document.getElementById('alat-list-container');
    const loadingEl = document.getElementById('loading-inventaris');
    if (!container || !loadingEl) return;

    container.innerHTML = '';
    loadingEl.style.display = 'block';
    const lowerSearchTerm = searchTerm.toLowerCase().trim();

    // Helper: deteksi apakah search tampaknya kode INV
    function isKodeInvSearch(term) {
        if (!term) return false;
        const t = term.trim();
        if (t.includes('-')) return true;
        if (/\d/.test(t) && t.length >= 4) return true;
        return false;
    }

    if (isKodeInvSearch(lowerSearchTerm)) {
        // Handle kode INV search
        // Cari semua unit yang cocok dan berada di kategori aktif
        const matchedUnits = (state.unitAlat || []).filter(u => {
            if (!u.kodeInv || !u.jenisAlatId) return false;
            const jenis = (state.allAlat || []).find(a => a.id === u.jenisAlatId);
            return jenis
                && jenis.kategori === state.currentAlatCategory
                && u.kodeInv.toLowerCase().includes(lowerSearchTerm);
        });
        if (matchedUnits.length === 0) {
            loadingEl.style.display = 'none';
            container.innerHTML = `<p class="col-span-full text-center text-gray-500 py-8">Tidak ada alat dengan kode tersebut.</p>`;
            return;
        }
        // Group by jenisAlatId
        const grouped = matchedUnits.reduce((acc, u) => {
            (acc[u.jenisAlatId] = acc[u.jenisAlatId] || []).push(u);
            return acc;
        }, {});
        Object.keys(grouped).forEach(jenisId => {
            const units = grouped[jenisId];
            const jenis = (state.allAlat || []).find(a => a.id === jenisId);
            if (!jenis) return;
            const groupCard = document.createElement('div');
            groupCard.className = 'bg-white p-5 rounded-xl shadow-lg border border-gray-200';
            groupCard.innerHTML = `
                <div class="flex justify-between items-center mb-4">
                    <h4 class="text-xl font-bold text-gray-800">${jenis.nama}</h4>
                    <button class="btn-add-merk text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-200 font-semibold" data-nama="${jenis.nama}" data-kategori="${jenis.kategori}" data-is-individual="true">+ Tambah Merk/Tahun</button>
                </div>
                <div class="merk-accordion-container space-y-2"></div>
                <div class="border-t mt-4 pt-3 flex justify-end items-center text-sm text-gray-500">Tersedia: <span class="font-bold text-lg text-green-600">${units.filter(u => u.status === 'Tersedia').length}</span> / ${units.length}</div>`;
            container.appendChild(groupCard);
            const accordionContainer = groupCard.querySelector('.merk-accordion-container');
            // Group by merk
            const groupedByMerk = units.reduce((acc, unit) => {
                const merk = jenis.merk || 'Tanpa Merk';
                (acc[merk] = acc[merk] || []).push(unit);
                return acc;
            }, {});
            Object.keys(groupedByMerk).forEach(merk => {
                const unitsOfMerk = groupedByMerk[merk];
                const accordionId = `accordion-${jenis.id}-${merk}`;
                let bodyContent = '';
                if (unitsOfMerk.length > 0) {
                    // Urutkan unit berdasarkan kode INV (tahun lalu nomor urut)
                    unitsOfMerk.sort((a, b) => {
                        if (!a.kodeInv || !b.kodeInv) return 0;
                        const partsA = a.kodeInv.split('-');
                        const partsB = b.kodeInv.split('-');
                        if (partsA.length !== 3 || partsB.length !== 3) return 0;
                        
                        // Urutkan berdasarkan tahun (bagian kedua)
                        const tahunA = parseInt(partsA[1], 10);
                        const tahunB = parseInt(partsB[1], 10);
                        if (tahunA !== tahunB) return tahunA - tahunB;
                        
                        // Jika tahun sama, urutkan berdasarkan nomor urut (bagian ketiga)
                        const nomorA = parseInt(partsA[2], 10);
                        const nomorB = parseInt(partsB[2], 10);
                        return nomorA - nomorB;
                    });
                    
                    bodyContent = `<div class="flex justify-end mb-2"><button class="btn-history-alat text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md hover:bg-gray-200" data-id="${jenis.id}">Riwayat</button></div>` +
                        unitsOfMerk.map(unit => {
                            const kondLower = (unit.kondisi || '').toLowerCase();
                            let condColor = 'text-gray-700';
                            if (kondLower.includes('baik')) condColor = 'text-green-600';
                            else if (kondLower.includes('rusak')) condColor = 'text-red-600';
                            else if (kondLower) condColor = 'text-yellow-600';
                            return `<div class="flex justify-between items-center text-sm bg-yellow-50 border-l-4 border-yellow-300">
                                        <p>Kode: <strong class="font-mono">${unit.kodeInv}</strong></p>
                                        <div class="flex items-center gap-3">
                                            <p class="font-semibold ${condColor}">${unit.kondisi || 'N/A'}</p>
                                            <button class="btn-history-alat p-1.5 text-gray-400 hover:text-gray-800 rounded-full hover:bg-gray-100" title="Riwayat Unit" data-id="${unit.id}">Riwayat</button>
                                        </div>
                                    </div>`;
                        }).join('<hr class="my-2">');
                }
                const accordionEl = document.createElement('div');
                accordionEl.className = 'border rounded-lg overflow-hidden';
                accordionEl.innerHTML = `<button class="accordion-header w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 text-left transition" data-target="#${accordionId}"><span class="font-semibold text-gray-700">${merk}</span><svg class="accordion-icon w-5 h-5 text-gray-500 transition-transform transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></button><div id="${accordionId}" class="accordion-body p-4 border-t bg-white space-y-3">${bodyContent}</div>`;
                // Make sure accordion body is hidden by default
                accordionEl.querySelector('.accordion-body')?.classList.add('hidden');
                accordionContainer.appendChild(accordionEl);
            });
        });
        loadingEl.style.display = 'none';
        return;
    }

    const filteredData = (state.allAlat || [])
        .filter(alat => alat.kategori === state.currentAlatCategory)
        .filter(alat => {
            if (!alat.isIndividual) {
                // tampilkan kumulatif hanya jika stok > 0
                return (alat.stok && alat.stok > 0);
            }

            // --- LOGIKA BARU ---
            // 1. Ambil SEMUA unit yang terkait dengan jenis alat ini
            const units = (state.unitAlat || []).filter(u => u.jenisAlatId === alat.id);

            // 2. Jika total unitnya 0, SELALU sembunyikan, tidak peduli apa kata kuncinya.
            if (units.length === 0) {
                return false;
            }
            // --- AKHIR LOGIKA BARU ---

            // Jika ada kata pencarian yang cocok dengan nama atau merk jenis alat,
            // tampilkan (karena kita tahu total unitnya > 0)
            if (lowerSearchTerm && (alat.nama.toLowerCase().includes(lowerSearchTerm) || (alat.merk && alat.merk.toLowerCase().includes(lowerSearchTerm)))) {
                return true;
            }

            // Untuk individual (tanpa search), tampilkan jika ada unit tersedia
            // atau jika pencarian cocok dengan salah satu kodeInv unit
            const hasAvailableUnit = units.some(u => u.status === 'Tersedia');
            const hasMatchingKode = lowerSearchTerm && units.some(u => u.kodeInv && u.kodeInv.toLowerCase().includes(lowerSearchTerm));
            return hasAvailableUnit || hasMatchingKode;
        })
        .filter(alat => {
            if (!lowerSearchTerm) return true;
            if (alat.nama.toLowerCase().includes(lowerSearchTerm)) return true;
            if (alat.merk && alat.merk.toLowerCase().includes(lowerSearchTerm)) return true;
            // juga cek kodeInv unit
            return (state.unitAlat || []).some(u => u.jenisAlatId === alat.id && u.kodeInv && u.kodeInv.toLowerCase().includes(lowerSearchTerm));
        });

    if (filteredData.length === 0) {
        loadingEl.style.display = 'none';
        // Debug: tampilkan informasi lebih detail
        const totalAlat = (state.allAlat || []).length;
        const alatInCategory = (state.allAlat || []).filter(alat => alat.kategori === state.currentAlatCategory).length;
        const alatWithStock = (state.allAlat || []).filter(alat => {
            if (!alat.isIndividual) {
                return (alat.stok && alat.stok > 0);
            }
            const units = (state.unitAlat || []).filter(u => u.jenisAlatId === alat.id);
            return units.some(u => u.status === 'Tersedia');
        }).length;
        
        container.innerHTML = `
            <div class="col-span-full text-center text-gray-500 py-8">
                <p class="text-lg font-semibold mb-2"> Belum ada alat yang didata</p>
                <div class="text-sm text-gray-400 space-y-1">
                    <p>Kategori aktif: <strong>${state.currentAlatCategory}</strong></p>
                    <p>Total alat: ${totalAlat}</p>
                    <p>Alat di kategori ini: ${alatInCategory}</p>
                    <p>Alat tersedia untuk dipinjam: ${alatWithStock}</p>
                </div>
                <p class="text-xs text-gray-400 mt-4">
                    Pastikan ada alat dengan stok > 0 atau unit dengan status "Tersedia"
                </p>
            </div>`;
        return;
    }

    const groupedAlat = filteredData.reduce((acc, alat) => {
        (acc[alat.nama] = acc[alat.nama] || []).push(alat);
        return acc;
    }, {});

    Object.keys(groupedAlat).sort().forEach(namaAlat => {
        const items = groupedAlat[namaAlat];
        const isIndividual = items[0].isIndividual;

        let totalStokDisplay = '';
        if (isIndividual) {
            const units = (state.unitAlat || []).filter(unit => items.some(item => item.id === unit.jenisAlatId));
            const availableCount = units.filter(u => u.status === 'Tersedia').length;
            totalStokDisplay = `Tersedia: <span class="font-bold text-lg text-green-600">${availableCount}</span> / ${units.length}`;
        } else {
            const totalStok = items.reduce((sum, item) => sum + (item.stok || 0), 0);
            totalStokDisplay = `Total Stok: <span class="font-bold text-lg text-gray-900">${totalStok}</span>`;

        }

        const groupCard = document.createElement('div');
        groupCard.className = 'bg-white p-5 rounded-xl shadow-lg border border-gray-200';
        groupCard.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h4 class="text-xl font-bold text-gray-800">${namaAlat}</h4>
                <button class="btn-add-merk text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-200 font-semibold" data-nama="${namaAlat}" data-kategori="${items[0].kategori}" data-is-individual="${isIndividual}">+ Tambah Merk/Tahun</button>
            </div>
            <div class="merk-accordion-container space-y-2"></div>
            <div class="border-t mt-4 pt-3 flex justify-end items-center text-sm text-gray-500">${totalStokDisplay}</div>`;
        
        container.appendChild(groupCard);
        const accordionContainer = groupCard.querySelector('.merk-accordion-container');

        const groupedByMerk = items.reduce((acc, item) => {
            (acc[item.merk] = acc[item.merk] || []).push(item);
            return acc;
        }, {});

        Object.keys(groupedByMerk).sort().forEach(merk => {
            const merkItems = groupedByMerk[merk];
            const accordionId = `accordion-${merkItems[0].id}`;
            const accordionEl = document.createElement('div');
            accordionEl.className = 'border rounded-lg overflow-hidden';

            let bodyContent = '';
            let stokMerkDisplay = '';

            if (isIndividual) {
                const unitsOfMerk = (state.unitAlat || []).filter(unit => merkItems.some(item => item.id === unit.jenisAlatId));
                const availableCount = unitsOfMerk.filter(u => u.status === 'Tersedia').length;
                stokMerkDisplay = `Tersedia: <span class="font-bold text-gray-800">${availableCount}</span> / ${unitsOfMerk.length}`;

                // --- Perubahan: bila search adalah kode INV, tampilkan HANYA unit yang cocok ---
                const matchedUnits = lowerSearchTerm ? unitsOfMerk.filter(u => u.kodeInv && u.kodeInv.toLowerCase().includes(lowerSearchTerm)) : [];
                const unitsToRender = (matchedUnits.length > 0) ? matchedUnits : unitsOfMerk;
                
                // Urutkan unit berdasarkan kode INV (tahun lalu nomor urut)
                unitsToRender.sort((a, b) => {
                    if (!a.kodeInv || !b.kodeInv) return 0;
                    const partsA = a.kodeInv.split('-');
                    const partsB = b.kodeInv.split('-');
                    if (partsA.length !== 3 || partsB.length !== 3) return 0;
                    
                    // Urutkan berdasarkan tahun (bagian kedua)
                    const tahunA = parseInt(partsA[1], 10);
                    const tahunB = parseInt(partsB[1], 10);
                    if (tahunA !== tahunB) return tahunA - tahunB;
                    
                    // Jika tahun sama, urutkan berdasarkan nomor urut (bagian ketiga)
                    const nomorA = parseInt(partsA[2], 10);
                    const nomorB = parseInt(partsB[2], 10);
                    return nomorA - nomorB;
                });

                if (unitsToRender.length > 0) {
                    bodyContent = `<div class="flex justify-end mb-2"><button class="btn-history-alat text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md hover:bg-gray-200" data-id="${merkItems[0].id}">Riwayat</button></div>` +
                        unitsToRender.map(unit => {
                            const kondLower = (unit.kondisi || '').toLowerCase();
                            let condColor = 'text-gray-700';
                            if (kondLower.includes('baik')) condColor = 'text-green-600';
                            else if (kondLower.includes('rusak')) condColor = 'text-red-600';
                            else if (kondLower) condColor = 'text-yellow-600';

                            // Jika ini adalah hasil pencarian kode INV, tandai highlight kecil untuk kode yang cocok
                            const highlight = (lowerSearchTerm && unit.kodeInv && unit.kodeInv.toLowerCase().includes(lowerSearchTerm))
                                ? 'bg-yellow-50 border-l-4 border-yellow-300'
                                : '';

                            const statusBadge = unit.status === 'Dipinjam' ? '<span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full ml-2">Dipinjam</span>' : '';
                            // Tampilkan warna dan tahun dari unit
                            const warnaBadge = `<span class='ml-2 px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs'>Warna: ${unit.warna || '-'}</span>`;
                            return `<div class="flex justify-between items-center text-sm ${highlight}">
                                        <p>Kode: <strong class="font-mono">${unit.kodeInv}</strong>${statusBadge} ${warnaBadge}</p>
                                        <div class="flex items-center gap-3">
                                            <p class="font-semibold ${condColor}">${unit.kondisi || 'N/A'}</p>
                                            <button class="btn-history-alat p-1.5 text-gray-400 hover:text-gray-800 rounded-full hover:bg-gray-100" title="Riwayat Unit" data-id="${unit.id}">Riwayat</button>
                                        </div>
                                    </div>`;
                        }).join('<hr class="my-2">');
                } else {
                    bodyContent = '<p class="text-xs text-center text-gray-400 py-2">Tidak ada unit untuk merk ini.</p>';
                }
            } else {
                // Pertama, hitung total stok untuk header merk
                const totalStokMerk = merkItems.reduce((sum, item) => sum + (item.stok || 0), 0);
                stokMerkDisplay = `Stok: <span class="font-bold text-gray-800">${totalStokMerk}</span>`;

                // Kedua, buat baris untuk SETIAP item, bukan hanya yang pertama
                bodyContent = merkItems.map(item => {
                    const stokColor = (item.stok || 0) > 5 ? 'text-green-600' : ((item.stok || 0) > 0 ? 'text-yellow-600' : 'text-red-600');
                    return `<div class="flex justify-between items-center"><div><p class="font-semibold text-gray-800">Th. ${item.tahunPembelian} <span class='ml-2 px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs'>Warna: ${item.warna || '-'}</span></p><p class="text-xs text-gray-500">Kondisi: ${item.kondisi}</p></div><div class="flex items-center gap-3"><p class="font-bold text-lg ${stokColor}">${item.stok}</p><div class="flex"><button class="btn-edit-alat p-1.5 ml-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-gray-100" title="Edit Alat" data-id="${item.id}"><svg class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button><button class="btn-history-alat p-1.5 ml-2 text-gray-400 hover:text-gray-800 rounded-full hover:bg-gray-100" title="Riwayat Alat" data-id="${item.id}"><svg class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V9H3v10a2 2 0 002 2z"></path></svg></button></div></div></div>`;
                }).join('<hr class="my-2 border-gray-100">'); // Gabungkan setiap baris dengan garis pemisah
            }

            accordionEl.innerHTML = `<button class="accordion-header w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 text-left transition" data-target="#${accordionId}"><span class="font-semibold text-gray-700">${merk}</span><div class="flex items-center gap-4 text-sm text-gray-600"><span>${stokMerkDisplay}</span><svg class="accordion-icon w-5 h-5 text-gray-500 transition-transform transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></div></button><div id="${accordionId}" class="accordion-body hidden p-4 border-t bg-white space-y-3">${bodyContent}</div>`;
            accordionContainer.appendChild(accordionEl);
        });
    });
    loadingEl.style.display = 'none'
}

export function renderPeminjamanList() {
    const peminjamanListEl = document.getElementById('peminjaman-list');
    const loadingEl = document.getElementById('loading-peminjaman');
    if (!peminjamanListEl || !loadingEl) return;
    
    peminjamanListEl.innerHTML = '';
    if ((state.allPeminjaman || []).length === 0) {
        loadingEl.style.display = 'none';
        peminjamanListEl.innerHTML = `<p class="text-center text-gray-500 py-8">Belum ada riwayat peminjaman.</p>`;
        return;
    }
    state.allPeminjaman.forEach(p => {
        const tglPinjam = p.timestampPinjam?.toDate().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) || 'N/A';
        const statusClass = p.status === 'Dipinjam' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
        let itemsHtml = p.items.map(item => {
            // Tampilkan kodeInv bila ada, dan tunjukkan unitId utk individual
            const kodePart = item.kodeInv ? ` [Kode: ${item.kodeInv}]` : '';
            const qty = item.jumlah || 1;
            return `<li>- ${item.namaAlat} (${item.merk || '-'} - Th. ${item.tahunPembelian || '-'})${kodePart} (x${qty})</li>`;
        }).join('');
        const card = `<div class="bg-white p-4 rounded-xl shadow-lg border border-gray-200"><div class="flex justify-between items-start"><div><h4 class="text-lg font-bold">${p.namaPeminjam}</h4><p class="text-sm text-gray-500">ID: ${p.transactionId}</p><p class="text-sm text-gray-500">Tgl Pinjam: ${tglPinjam}</p></div><span class="text-xs font-semibold px-2.5 py-1 rounded-full ${statusClass}">${p.status}</span></div><div class="mt-3 pt-3 border-t"><p class="text-sm font-semibold mb-1">Barang:</p><ul class="list-disc list-inside text-sm text-gray-600">${itemsHtml}</ul></div><div class="mt-4 flex justify-end space-x-2"><button data-id="${p.id}" class="btn-detail-peminjaman text-sm text-gray-600 hover:text-black">Lihat Struk</button>${p.status === 'Dipinjam' ? `<button data-id="${p.id}" class="btn-kembalikan text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700">Tandai Kembali</button>` : ''}</div></div>`;
        peminjamanListEl.innerHTML += card;
    });
    loadingEl.style.display = 'none';
}

export function renderAfkirList() {
    const afkirListEl = document.getElementById('afkir-list');
    const loadingEl = document.getElementById('loading-afkir');
    if (!afkirListEl || !loadingEl) return;

    afkirListEl.innerHTML = '';
    if ((state.allAfkir || []).length === 0) {
        loadingEl.style.display = 'none';
        afkirListEl.innerHTML = `<p class="text-center text-gray-500 py-8">Tidak ada barang yang di-afkir.</p>`;
        return;
    }

    // Tampilkan setiap dokumen afkir; dukung afkir individual maupun kumulatif
    state.allAfkir.forEach(docData => {
        // Tentukan informasi merk / tahun / kodeInv dengan fallback:
        const jenis = docData.jenisAlatId ? (state.allAlat || []).find(a => a.id === docData.jenisAlatId) : null;
        const kodeInv = docData.kodeInv || (docData.unitId ? (state.unitAlat.find(u => u.id === docData.unitId)?.kodeInv) : '-') || '-';
        const merk = docData.merk || jenis?.merk || '-';
        const tahun = docData.tahunPembelian || jenis?.tahunPembelian || '-';
        const nama = docData.nama || (jenis ? jenis.nama : 'Unknown');
        const warna = docData.warna || jenis?.warna || '-';
        const jumlah = docData.jumlahDiAfkir || 0;
        const tgl = docData.afkirTimestamp?.toDate ? docData.afkirTimestamp.toDate().toLocaleString('id-ID') : '-';
        const tipe = docData.tipeAfkir || (docData.unitId ? 'individual' : 'kumulatif');

        const item = `
        <div class="bg-white p-4 rounded-lg shadow-sm border">
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-semibold">${nama} ${kodeInv ? `• <span class="font-mono">${kodeInv}</span>` : ''}</h4>
                    <p class="text-sm text-gray-600">Merk: ${merk} | Tahun: ${tahun} | Warna: ${warna} | Tipe: ${tipe}</p>
                    <p class="text-sm text-gray-800 mt-2"><strong>Alasan:</strong> ${docData.alasan || '-'}</p>
                </div>
                <div class="text-right">
                    <p class="text-lg font-bold text-red-600">-${jumlah}</p>
                    <p class="text-xs text-gray-500 mt-1">${tgl}</p>
                </div>
            </div>
        </div>`;
        afkirListEl.innerHTML += item;
    });

    loadingEl.style.display = 'none';
}

export function renderInventarisViewHTML() {
    return `<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
                <h2 class="text-2xl font-bold">Daftar Alat</h2>
                <p class="text-gray-500 mt-1">Kelola semua peralatan yang tersedia.</p>
            </div>
            <div class="flex items-center gap-2 w-full sm:w-auto">
                <input type="text" id="search-alat" placeholder="Cari alat atau merk..." class="w-full sm:w-64 p-2.5 border rounded-lg">
                <button id="btn-export-inventaris" class="flex-shrink-0 bg-green-600 text-white px-4 py-2.5 rounded-lg shadow-md hover:bg-green-700 transition" title="Ekspor ke Excel">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                </button>
                <button id="btn-show-add-alat-modal" class="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-md hover:bg-blue-700 transition">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                    Tambah
                </button>
            </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="alat-list-container">
            <!-- Daftar alat akan dirender di sini -->
        </div>
        <div id="loading-inventaris" class="col-span-full flex justify-center items-center py-8 hidden">
            <svg class="animate-spin h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>`;
}

export function getPeminjamanViewHTML() {
    return `<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
            <h2 class="text-2xl font-bold">Riwayat Peminjaman</h2>
            <p class="text-gray-500 mt-1">Lacak semua transaksi peminjaman alat.</p>
        </div>
        <button id="btn-show-add-peminjaman-modal" class="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg shadow-md hover:bg-green-700 transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            Catat Peminjaman Baru
        </button>
    </div>
    <div id="peminjaman-list" class="space-y-4"></div>
    <div id="loading-peminjaman" class="text-center py-10 text-gray-500">Memuat data...</div>`;
}

// --- FUNGSI INTERAKSI MODAL ---

function setFormRequiredFields(isIndividual) {
    const stokInput = document.getElementById('alat-stok');
    const jumlahUnitInput = document.getElementById('alat-jumlah-unit');
    if (stokInput && jumlahUnitInput) {
        if (isIndividual) {
            // non-aktifkan stok kumulatif ketika melacak per-unit
            stokInput.required = false;
            stokInput.disabled = true;
            // aktifkan input jumlah unit
            jumlahUnitInput.required = true;
            jumlahUnitInput.disabled = false;
        } else {
            // aktifkan stok kumulatif
            stokInput.required = true;
            stokInput.disabled = false;
            // non-aktifkan input jumlah unit
            jumlahUnitInput.required = false;
            jumlahUnitInput.disabled = true;
        }
    }
}

export function setupModalInteractivity() {
    const isIndividualCheckbox = document.getElementById('alat-is-individual');
    if (isIndividualCheckbox) {
        isIndividualCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            document.getElementById('cumulative-fields').classList.toggle('hidden', isChecked);
            document.getElementById('individual-fields').classList.toggle('hidden', !isChecked);
            setFormRequiredFields(isChecked);
        });
    }
}

export function openAddAlatModal() {
    const form = document.getElementById('form-add-alat');
    document.getElementById('modal-alat-title').textContent = 'Tambah Jenis Alat Baru';
    form.reset();
    form.querySelector('#alat-id').value = '';
    form.querySelector('#alat-nama').readOnly = false;
    form.querySelector('#alat-kategori').disabled = false;
    form.querySelector('#alat-tahun').readOnly = false;
    document.getElementById('cumulative-fields').classList.remove('hidden');
    document.getElementById('individual-fields').classList.add('hidden');
    const checkbox = document.getElementById('alat-is-individual');
    checkbox.checked = false;
    checkbox.disabled = false;
    checkbox.parentElement.classList.remove('opacity-50', 'cursor-not-allowed');
    setFormRequiredFields(false);
    document.getElementById('btn-afkir-alat').classList.add('hidden');
    toggleModal('modal-add-alat', true);
}

export function openEditAlatModal(alatId) {
    const alat = state.allAlat.find(a => a.id === alatId);
    if (!alat) return;
    const form = document.getElementById('form-add-alat');
    document.getElementById('modal-alat-title').textContent = 'Edit Alat';
    form.querySelector('#alat-id').value = alat.id;
    form.querySelector('#alat-nama').value = alat.nama;
    form.querySelector('#alat-kategori').value = alat.kategori;
    form.querySelector('#alat-merk').value = alat.merk || '';
    form.querySelector('#alat-warna').value = alat.warna || '';
    form.querySelector('#alat-tahun').value = alat.tahunPembelian || '';
    form.querySelector('#alat-kondisi').value = alat.kondisi || 'Baik';
    form.querySelector('#alat-keterangan').value = alat.keterangan || '';
    form.querySelector('#alat-nama').readOnly = true;
    form.querySelector('#alat-kategori').disabled = true;
    form.querySelector('#alat-tahun').readOnly = alat.isIndividual;
    const checkbox = document.getElementById('alat-is-individual');
    checkbox.disabled = true;
    checkbox.parentElement.classList.add('opacity-50', 'cursor-not-allowed');

    if (alat.isIndividual) {
        checkbox.checked = true;
        document.getElementById('cumulative-fields').classList.add('hidden');
        document.getElementById('individual-fields').classList.remove('hidden');
        form.querySelector('#alat-jumlah-unit').parentElement.classList.add('hidden');
        setFormRequiredFields(true);
    } else {
        checkbox.checked = false;
        document.getElementById('cumulative-fields').classList.remove('hidden');
        document.getElementById('individual-fields').classList.add('hidden');
        form.querySelector('#alat-stok').value = alat.stok || 0;
        setFormRequiredFields(false);
    }
    
    document.getElementById('btn-afkir-alat').classList.remove('hidden');
    toggleModal('modal-add-alat', true);
}

export function openAddMerkModal(nama, kategori, isIndividualStr) {
    // Open modal to add a new merk/tahun for an existing alat name
    const isIndividual = (isIndividualStr === 'true');
    const form = document.getElementById('form-add-alat');
    if (!form) return;

    // Prepare form for adding new merk/year while keeping the name fixed
    document.getElementById('modal-alat-title').textContent = `Tambah Merk/Tahun Baru untuk ${nama}`;
    form.reset();
    form.querySelector('#alat-id').value = '';
    form.querySelector('#alat-nama').value = nama;
    form.querySelector('#alat-kategori').value = kategori;
    form.querySelector('#alat-nama').readOnly = true;
    form.querySelector('#alat-kategori').disabled = true;
    form.querySelector('#alat-tahun').readOnly = false;

    const checkbox = document.getElementById('alat-is-individual');
    if (checkbox) {
        checkbox.checked = isIndividual;
        checkbox.disabled = true;
        checkbox.parentElement.classList.add('opacity-50', 'cursor-not-allowed');
    }

    const cumulativeFields = document.getElementById('cumulative-fields');
    const individualFields = document.getElementById('individual-fields');
    if (cumulativeFields) cumulativeFields.classList.toggle('hidden', isIndividual);
    if (individualFields) individualFields.classList.toggle('hidden', !isIndividual);

    const jumlahUnitParent = form.querySelector('#alat-jumlah-unit')?.parentElement;
    if (jumlahUnitParent) jumlahUnitParent.classList.remove('hidden');

    setFormRequiredFields(isIndividual);

    const btnAfkir = document.getElementById('btn-afkir-alat');
    if (btnAfkir) btnAfkir.classList.add('hidden');

    toggleModal('modal-add-alat', true);
}

export function openAddPeminjamanModal() {
    // Set initial category to Metal
    state.currentAlatCategory = 'Metal';
    state.peminjamanCart = {};
    
    // Reset form and render the lists
    const form = document.getElementById('form-add-peminjaman');
    if (form) form.reset();
    
    // Update category dropdown
    const categorySelect = document.getElementById('peminjaman-kategori');
    if (categorySelect) categorySelect.value = 'Metal';
    
    renderCart();
    renderAlatForPeminjaman();
    
    // Show modal
    toggleModal('modal-add-peminjaman', true);
}

export function openAfkirModal() {
    const id = document.getElementById('alat-id').value;
    const alat = state.allAlat.find(a => a.id === id);
    if (!alat) {
        showToast("Alat tidak ditemukan!", "error");
        return;
    }
    const afkirForm = document.getElementById('form-afkir-alat');
    afkirForm.reset();
    document.getElementById('afkir-alat-id').value = id;
    document.getElementById('afkir-item-name').textContent = `${alat.nama} (${alat.merk} - Th. ${alat.tahunPembelian})`;
    document.getElementById('afkir-stok-tersedia').textContent = alat.stok;
    document.getElementById('afkir-jumlah').max = alat.stok;
    document.getElementById('afkir-jumlah').value = 1;
    
    toggleModal('modal-afkir-alat', true);
    toggleModal('modal-add-alat', false);
}

export async function showPeminjamanDetail(peminjamanId) {
    const p = state.allPeminjaman.find(p => p.id === peminjamanId);
    if (!p) return;

    document.getElementById('struk-id').textContent = p.transactionId;
    document.getElementById('struk-nama').textContent = p.namaPeminjam;
    document.getElementById('struk-hp').textContent = p.noHp || '-';
    document.getElementById('struk-tgl-pinjam').textContent = p.timestampPinjam.toDate().toLocaleString('id-ID');
    document.getElementById('struk-jaminan').textContent = p.jaminan;
    document.getElementById('struk-status').textContent = p.status;
    const itemsList = document.getElementById('struk-items');

    // Tampilkan kodeInv di baris item bila ada
    itemsList.innerHTML = p.items.map(item => {
        const kodePart = item.kodeInv ? ` <span class="text-xs text-gray-500">[Kode: ${item.kodeInv}]</span>` : '';
        const qty = item.jumlah || 1;
        return `<div class="flex justify-between border-b py-1"><p>${item.namaAlat} (${item.merk} - Th. ${item.tahunPembelian})${kodePart}</p><p>x${qty}</p></div>`;
    }).join('');

    document.getElementById('btn-download-struk').dataset.id = peminjamanId;
    toggleModal('modal-detail-peminjaman', true);
}

export async function downloadStruk(peminjamanId) {
    const p = state.allPeminjaman.find(p => p.id === peminjamanId);
    if (!p) {
        showToast('Data peminjaman tidak ditemukan.', 'error');
        return;
    }

    const docPDF = new jsPDF();
    let yPos = 20;

    docPDF.setFontSize(22).text("Struk Peminjaman Alat", 105, yPos, { align: "center" }); yPos += 10;
    docPDF.setFontSize(12).text(`ID Transaksi: ${p.transactionId}`, 105, yPos, { align: "center" }); yPos += 10;
    docPDF.line(15, yPos, 195, yPos); yPos += 10;
    
    docPDF.setFontSize(12);
    docPDF.text("Nama Peminjam:", 15, yPos).text(p.namaPeminjam, 70, yPos); yPos += 8;
    docPDF.text("Nomor HP:", 15, yPos).text(p.noHp || '-', 70, yPos); yPos += 8;
    docPDF.text("Organisasi:", 15, yPos).text(p.organisasi || '-', 70, yPos); yPos += 8;
    docPDF.text("Tanggal Pinjam:", 15, yPos).text(p.timestampPinjam.toDate().toLocaleString('id-ID'), 70, yPos); yPos += 8;
    docPDF.text("Rencana Kembali:", 15, yPos).text(new Date(p.tglKembaliRencana).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}), 70, yPos); yPos += 8;
    docPDF.text("Jaminan:", 15, yPos).text(p.jaminan, 70, yPos); yPos += 10;
    docPDF.line(15, yPos, 195, yPos); yPos += 10;
    
    docPDF.setFont("helvetica", "bold").text("Barang yang Dipinjam", 15, yPos); yPos += 10;
    docPDF.setFont("helvetica", "normal"); 
    
    p.items.forEach(item => {
        if (yPos > 270) {
            docPDF.addPage();
            yPos = 20;
        }
        const kodePart = item.kodeInv ? ` [Kode: ${item.kodeInv}]` : '';
        const qty = item.jumlah || 1;
        docPDF.text(`- ${item.namaAlat} (${item.merk} - Th. ${item.tahunPembelian})${kodePart} (Jumlah: ${qty})`, 20, yPos);
        yPos += 7;
    }); 
    
    docPDF.line(15, yPos, 195, yPos);
    
    docPDF.save(`struk-${p.transactionId}.pdf`);
}

// --- FUNGSI INTERAKSI KERANJANG (CART) ---
export function addToCart(alatId, selectedUnitsOrUnitId = []) {
    const alat = state.allAlat.find(a => a.id === alatId);
    if (!alat) {
        showToast('Error: Alat tidak ditemukan', 'error');
        return;
    }

    if (alat.isIndividual) {
        let selectedUnits = [];
        if (typeof selectedUnitsOrUnitId === 'string' && selectedUnitsOrUnitId.trim() !== '') {
            const unit = state.unitAlat.find(u => u.id === selectedUnitsOrUnitId && u.status === 'Tersedia');
            if (!unit) {
                showToast('Unit sudah dipinjam atau tidak tersedia', 'error');
                return;
            }
            selectedUnits = [{ id: unit.id, kodeInv: unit.kodeInv }];
        } else if (Array.isArray(selectedUnitsOrUnitId) && selectedUnitsOrUnitId.length > 0) {
            selectedUnits = selectedUnitsOrUnitId.map(uid => {
                const u = state.unitAlat.find(x => x.id === uid && x.status === 'Tersedia');
                return u ? { id: u.id, kodeInv: u.kodeInv } : null;
            }).filter(Boolean);
            if (selectedUnits.length === 0) {
                showToast('Semua unit yang dipilih sudah dipinjam', 'error');
                return;
            }
        }

        if (selectedUnits.length > 0) {
            selectedUnits.forEach(su => {
                state.peminjamanCart[su.id] = {
                    data: {
                        ...alat,
                        id: alat.id,
                        unitId: su.id,
                        kodeInv: su.kodeInv
                    },
                    jumlah: 1,
                    isIndividual: true
                };
            });
            renderCart();
            showToast(`${selectedUnits.length} unit ditambahkan ke keranjang`, 'success');
            return;
        }

        const availableUnits = state.unitAlat.filter(u => 
            u.jenisAlatId === alatId && 
            u.status === 'Tersedia'
        );

        if (availableUnits.length === 0) {
            showToast('Tidak ada unit tersedia untuk dipinjam', 'error');
            return;
        }

        showUnitSelectionModal(alat, availableUnits);
        return;
    }

    // For cumulative items, proceed as normal (keyed by jenis alat id)
    const container = document.getElementById('peminjaman-alat-list');
    const inputEl = container?.querySelector(`input.input-jumlah[data-alat-id="${alatId}"]`);
    
    let quantityToAdd = 1;
    if (inputEl) {
        quantityToAdd = parseInt(inputEl.value, 10);
    }

    if (isNaN(quantityToAdd) || quantityToAdd <= 0) {
        showToast('Jumlah tidak valid.', 'error');
        return;
    }

    if (quantityToAdd > (alat.stok || 0)) {
        showToast('Jumlah melebihi stok yang tersedia.', 'error');
        return;
    }

    // Jika item baru atau sudah ada, set jumlahnya sesuai input
    state.peminjamanCart[alatId] = {
        data: alat,
        jumlah: quantityToAdd,
        isIndividual: false
    };

    renderCart();
    showToast('Berhasil ditambahkan ke keranjang', 'success');
}

function showUnitSelectionModal(alat, availableUnits) {
    const existingModal = document.getElementById('modal-select-units');
    if (existingModal) {
        existingModal.remove(); // Remove existing modal if any
    }

    const modalHTML = `
    <div id="modal-select-units" class="modal fixed inset-0 z-50 flex items-center justify-center">
        <div class="fixed inset-0 bg-black bg-opacity-50"></div>
        <div class="bg-white rounded-lg shadow-xl w-full max-w-md m-4 p-6 relative z-10">
            <h3 class="text-xl font-bold mb-4">Pilih Unit ${alat.nama}</h3>
            <p class="text-sm text-gray-600 mb-4">${alat.merk} - Th. ${alat.tahunPembelian}</p>
            
            <div class="max-h-60 overflow-y-auto border rounded-lg p-4">
                <div class="space-y-2" id="unit-selection-list">
                    ${availableUnits.map(unit => `
                        <label class="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                            <input type="checkbox" value="${unit.id}" class="unit-checkbox h-5 w-5 text-blue-600"
                                   data-kode-inv="${unit.kodeInv}">
                            <span class="text-sm font-medium">${unit.kodeInv}</span>
                        </label>
                    `).join('')}
                </div>
            </div>

            <div class="mt-6 flex justify-end space-x-3">
                <button type="button" class="btn-cancel-select-units px-4 py-2 text-gray-600 hover:text-gray-800">
                    Batal
                </button>
                <button type="button" class="btn-confirm-select-units px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Tambah ke Keranjang
                </button>
            </div>
        </div>
    </div>`;

    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modalContainer = document.getElementById('modal-select-units');

    // Event listeners
    modalContainer.querySelector('.btn-cancel-select-units').addEventListener('click', (e) => {
        e.stopPropagation();
        modalContainer.remove();
    });

    modalContainer.querySelector('.btn-confirm-select-units').addEventListener('click', (e) => {
        e.stopPropagation();
        const selectedUnits = Array.from(modalContainer.querySelectorAll('.unit-checkbox:checked')).map(cb => ({
            id: cb.value,
            kodeInv: cb.dataset.kodeInv
        }));

        if (selectedUnits.length === 0) {
            showToast('Pilih minimal satu unit', 'error');
            return;
        }

        state.peminjamanCart[alat.id] = {
            data: {
                ...alat,
                selectedUnits: selectedUnits
            },
            jumlah: selectedUnits.length,
            isIndividual: true
        };

        renderCart();
        showToast(`${selectedUnits.length} unit ditambahkan ke keranjang`, 'success');
        modalContainer.remove();
    });

    // Prevent clicks within modal content from closing the modal
    modalContainer.querySelector('.bg-white').addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Close on backdrop click
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
            modalContainer.remove();
        }
    });
}

export function renderCart() {
    const cartContainer = document.getElementById('peminjaman-cart');
    const submitBtn = document.getElementById('btn-submit-peminjaman');
    if (!cartContainer) return;

    cartContainer.innerHTML = '';
    const items = state.peminjamanCart;

    if (Object.keys(items).length === 0) {
        cartContainer.innerHTML = '<p class="text-gray-500 text-center">Keranjang masih kosong</p>';
        if (submitBtn) submitBtn.disabled = true;
        return;
    }

    if (submitBtn) submitBtn.disabled = false;

    Object.entries(items).forEach(([id, item]) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'flex justify-between items-start p-2 bg-gray-50 rounded-lg mb-2';

        let unitsInfo = '';
        if (item.isIndividual && item.data.kodeInv) {
            unitsInfo = `
                <div class="text-xs text-gray-600 mt-1">
                    <span class="inline-block bg-gray-100 rounded px-2 py-0.5 mr-1 mb-1">${item.data.kodeInv}</span>
                </div>`;
        }

        itemDiv.innerHTML = `
            <div class="flex-1">
                <p class="font-medium text-sm">${item.data.nama} (${item.data.merk || '-'} - Th. ${item.data.tahunPembelian || '-'})</p>
                <p class="text-xs text-gray-600">Jumlah: ${item.jumlah}</p>
                ${unitsInfo}
            </div>
            <button type="button" class="btn-remove-from-cart ml-2 p-1 text-red-500 hover:text-red-700" data-id="${id}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
            </button>`;

        cartContainer.appendChild(itemDiv);
    });
}

// New: remove from cart (works for both unitId keys and jenisAlatId keys)
export function removeFromCart(alatOrUnitId) {
    if (!alatOrUnitId) return;
    if (state.peminjamanCart[alatOrUnitId]) {
        delete state.peminjamanCart[alatOrUnitId];
        renderCart();
    }
}


export function refreshHistoryDisplay() {
    const historyUnitId = document.getElementById('history-unit-id')?.value;
    if (historyUnitId) {
        renderHistoryAlat(historyUnitId);
    }
}

// Tambahkan: renderHistoryAlat — one-time read fallback & modal open
export async function renderHistoryAlat(id) {
    const historyList = document.getElementById('history-list');
    const historyTitle = document.getElementById('history-title');
    const hiddenUnitInput = document.getElementById('history-unit-id');
    if (!historyList || !historyTitle || !hiddenUnitInput) return;

    historyList.innerHTML = `<p class="text-gray-500">Memuat riwayat...</p>`;
    hiddenUnitInput.value = id || '';

    // Cek apakah id milik unit atau jenis alat
    const unit = (state.unitAlat || []).find(u => u.id === id);
    if (unit) {
        historyTitle.textContent = `Riwayat Unit ${unit.kodeInv || ''}`;
        let historyContent = '';
        try {
            const snap = await services.getUnitHistoryOnce(id);
            if (!snap || snap.empty) {
                historyContent = `<p class="text-gray-500 text-center">Belum ada riwayat.</p>`;
            } else {
                historyContent = snap.docs.map(doc => {
                    const d = doc.data();
                    const t = d.timestamp ? (d.timestamp.toDate ? d.timestamp.toDate().toLocaleString('id-ID') : String(d.timestamp)) : '-';
                    return `<div class="p-3 border rounded mb-2"><div class="flex justify-between"><div><div class="font-semibold">${d.newKondisi || d.kondisi || 'N/A'}</div><div class="text-xs text-gray-500 mt-1">${d.note || ''}</div></div><div class="text-xs text-gray-400">${t}</div></div><div class="mt-2 flex gap-2 justify-end"><button class="btn-edit-history text-xs text-blue-600" data-unit-id="${id}" data-id="${doc.id}">Edit</button></div></div>`;
                }).join('');
            }
        } catch (err) {
            console.error('Gagal memuat riwayat unit:', err);
            historyContent = `<p class="text-red-500">Gagal memuat riwayat.</p>`;
        }
        // Render history and afkir button at bottom left
        historyList.innerHTML = `
            <div>${historyContent}</div>
            <div class="flex items-end" style="height: 3rem;">
                <button class="btn-afkir-unit px-3 py-1 text-xs text-white bg-red-600 rounded shadow hover:bg-red-700" data-unit-id="${id}" style="margin-left:0;">Afkir Unit</button>
            </div>
        `;
    } else {
        const jenis = (state.allAlat || []).find(a => a.id === id);
        historyTitle.textContent = `Riwayat Jenis Alat ${jenis?.nama || ''}`;
        try {
            const snap = await services.getAlatHistoryOnce(id);
            if (!snap || snap.empty) {
                historyList.innerHTML = `<p class="text-gray-500 text-center">Belum ada riwayat.</p>`;
            } else {
                historyList.innerHTML = snap.docs.map(doc => {
                    const d = doc.data();
                    const t = d.timestamp ? (d.timestamp.toDate ? d.timestamp.toDate().toLocaleString('id-ID') : String(d.timestamp)) : '-';
                    return `<div class="p-3 border rounded"><div class="flex justify-between"><div><div class="font-semibold">${d.newKondisi || d.kondisi || 'N/A'}</div><div class="text-xs text-gray-500 mt-1">${d.note || ''}</div></div><div class="text-xs text-gray-400">${t}</div></div><div class="mt-2 text-right"><button class="btn-edit-history text-xs text-blue-600" data-unit-id="${id}" data-id="${doc.id}">Edit</button></div></div>`;
                }).join('');
            }
        } catch (err) {
            console.error('Gagal memuat riwayat jenis alat:', err);
            historyList.innerHTML = `<p class="text-red-500">Gagal memuat riwayat.</p>`;
        }
    }

    toggleModal('modal-history-alat', true);
}

// Tambahkan fungsi yang sempat hilang: renderAlatForPeminjaman
export function renderAlatForPeminjaman(searchTerm = '') {
    const container = document.getElementById('peminjaman-alat-list');
    if (!container) return;

    const lower = (searchTerm || '').toLowerCase().trim();

    // Filter alat sesuai kategori dan ketersediaan
    const availableAlat = (state.allAlat || [])
        .filter(a => ['Metal', 'Non-Metal'].includes(a.kategori))
        .filter(a => a.kategori === state.currentAlatCategory)
        .filter(a => {
            if (a.isIndividual) {
                // Only show individual items with available units
                const availableUnits = (state.unitAlat || []).filter(u => 
                    u.jenisAlatId === a.id && 
                    u.status === 'Tersedia'
                );
                return availableUnits.length > 0;
            }
            // Only show cumulative items with stock > 0 dan status Tersedia
            return (a.stok || 0) > 0 && (a.status !== 'Habis');
        });

    const filtered = lower
        ? availableAlat.filter(a =>
            a.nama.toLowerCase().includes(lower) ||
            (a.merk && a.merk.toLowerCase().includes(lower)) ||
            (state.unitAlat || []).some(u => u.jenisAlatId === a.id && u.kodeInv && u.kodeInv.toLowerCase().includes(lower))
        )
        : availableAlat;

    container.innerHTML = '';
    if (filtered.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 p-4">Alat tidak ditemukan atau tidak tersedia.</p>';
        return;
    }

    // Group by nama alat
    const grouped = filtered.reduce((acc, alat) => {
        (acc[alat.nama] = acc[alat.nama] || []).push(alat);
        return acc;
    }, {});

    Object.entries(grouped).forEach(([namaAlat, items]) => {
        const alatDiv = document.createElement('div');
        alatDiv.className = 'mb-4 p-3 border rounded-lg bg-white';
        alatDiv.innerHTML = `<div class="font-bold text-lg mb-2">${namaAlat}</div>`;

        // Group by merk
        const byMerk = items.reduce((acc, it) => {
            (acc[it.merk || '-'] = acc[it.merk || '-'] || []).push(it);
            return acc;
        }, {});

        Object.entries(byMerk).forEach(([merk, merkItems]) => {
            // Gabungkan semua id jenisAlat dengan merk yang sama (lintas tahun)
            const allJenisIds = merkItems.map(it => it.id);
            const merkDiv = document.createElement('div');
            merkDiv.className = 'mb-2 pl-3';

            // Tampilkan info merk dan tahun-tahun yang tersedia
            const tahunList = merkItems.map(it => it.tahunPembelian).filter((v, i, arr) => arr.indexOf(v) === i).sort();
            let inner = `<div class="flex items-center gap-2 mb-1">
                <span class="font-semibold">${merk}</span>
                <span class="text-xs text-gray-500">Th. ${tahunList.join(', ')}</span>
                <span class="text-xs text-gray-500">${merkItems[0].kategori}</span>
            </div>`;

            if (merkItems[0].isIndividual) {
                // Ambil semua unit dengan jenisAlatId apapun yang memiliki merk sama
                let availableUnits = (state.unitAlat || []).filter(u => allJenisIds.includes(u.jenisAlatId) && u.status === 'Tersedia');
                // Urutkan berdasarkan tahun (bagian kedua kodeInv) lalu nomor urut (bagian ketiga)
                availableUnits = availableUnits.slice().sort((a, b) => {
                    if (!a.kodeInv || !b.kodeInv) return 0;
                    const partsA = a.kodeInv.split('-');
                    const partsB = b.kodeInv.split('-');
                    if (partsA.length !== 3 || partsB.length !== 3) return 0;
                    
                    // Urutkan berdasarkan tahun (bagian kedua)
                    const tahunA = parseInt(partsA[1], 10);
                    const tahunB = parseInt(partsB[1], 10);
                    if (tahunA !== tahunB) return tahunA - tahunB;
                    
                    // Jika tahun sama, urutkan berdasarkan nomor urut (bagian ketiga)
                    const nomorA = parseInt(partsA[2], 10);
                    const nomorB = parseInt(partsB[2], 10);
                    return nomorA - nomorB;
                });
                inner += `<div class="flex items-center gap-2">
                    <select class="dropdown-inv border rounded p-1" data-alat-id="${allJenisIds[0]}">
                        <option value="">Pilih Kode INV</option>
                        ${availableUnits.map(u => `<option value="${u.id}">${u.kodeInv}</option>`).join('')}
                    </select>
                    <button type="button" class="btn-add-to-cart px-2 py-1 bg-green-600 text-white rounded" data-alat-id="${allJenisIds[0]}" data-individual="true">+</button>
                </div>`;
            } else {
                inner += `<div class="flex items-center gap-2">
                    <input type="number" min="1" max="${merkItems[0].stok || 0}" value="1" class="input-jumlah border rounded p-1 w-16" data-alat-id="${merkItems[0].id}">
                    <span class="text-xs text-gray-500">/ ${merkItems[0].stok || 0} tersedia</span>
                    <button type="button" class="btn-add-to-cart px-2 py-1 bg-green-600 text-white rounded" data-alat-id="${merkItems[0].id}" data-individual="false">+</button>
                </div>`;
            }

            merkDiv.innerHTML = inner;
            alatDiv.appendChild(merkDiv);
        });

        container.appendChild(alatDiv);
    });

    // Note: tidak memasang event listener click di sini — main.js menangani klik tombol global (btn-add-to-cart)
}

