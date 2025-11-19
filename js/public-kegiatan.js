import { state } from './state.js';
import * as services from './services.js';
import * as ui from './ui.js';

const $ = (s) => document.querySelector(s);

// DOM refs
const alatListEl = $('#alat-list');
const cartEl = $('#latihan-cart');
const form = $('#latihan-form');
const searchInput = $('#search-alat');
const filterKategori = $('#filter-kategori');
const msgEl = document.getElementById('message');

// Event Delegation
// Note: Click handling moved to alatListEl level

// --- Utilities ---
function showMessage(text, type = 'info') {
  if (!msgEl) return;
  msgEl.textContent = text;
  msgEl.className = type === 'error' ? 'text-red-600' : 'text-green-600';
  setTimeout(() => { msgEl.textContent = ''; msgEl.className = ''; }, 4000);
}

// --- Renderers ---
function renderAlatList() {
  const q = (searchInput?.value || '').toLowerCase();
  const kategoriFilter = filterKategori?.value || 'all';

  const items = (state.allAlat || []).filter(a => {
    if (kategoriFilter !== 'all' && a.kategori !== kategoriFilter) return false;
    if (!['Metal','Non-Metal'].includes(a.kategori)) return false;
    // Only show alat with available stock/units
    if (a.isIndividual) {
      const available = (state.unitAlat || []).filter(u => u.jenisAlatId === a.id && u.status === 'Tersedia').length;
      if (available <= 0) return false;
    } else {
      if (!a.stok || a.stok <= 0) return false;
    }
    if (!q) return true;
    return (a.nama || '').toLowerCase().includes(q) || (a.merk||'').toLowerCase().includes(q);
  });

  // Group alat by nama
  alatListEl.innerHTML = '';
  const grouped = {};
  items.forEach(a => {
    if (!grouped[a.nama]) grouped[a.nama] = [];
    grouped[a.nama].push(a);
  });

  Object.keys(grouped).sort().forEach((nama, idx) => {
    const group = grouped[nama];
    const groupCard = document.createElement('div');
    groupCard.className = 'mb-2 border rounded-lg bg-white overflow-hidden';
    
    // Level 1: Nama Alat header (accordion trigger)
    const namaHeader = document.createElement('div');
    namaHeader.className = 'flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 select-none';
    namaHeader.innerHTML = `
      <div class="font-bold">${nama}</div>
      <svg class="w-5 h-5 transform transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    `;
    
    // Level 2 & 3: Container for merk & unit lists
    const contentDiv = document.createElement('div');
    contentDiv.className = 'hidden';
    
    // Group items by merk first
    const byMerk = {};
    group.forEach(a => {
      const merkKey = a.merk || '-';
      if (!byMerk[merkKey]) byMerk[merkKey] = [];
      byMerk[merkKey].push(a);
    });

    // Sort merks alphabetically and render each group
    Object.keys(byMerk).sort().forEach(merk => {
      const merkItems = byMerk[merk];
      
      // Level 2: Merk container
      const merkDiv = document.createElement('div');
      merkDiv.className = 'border-t';
      
      // Check if this merk group contains individual items
      const firstItem = merkItems[0];
      const isIndividual = !!firstItem.isIndividual;
      
      // Merk header with expand arrow for individual items
      const merkHeader = document.createElement('div');
      merkHeader.className = `flex items-center justify-between p-2 ${isIndividual ? 'hover:bg-gray-50 cursor-pointer' : ''}`;

      if (isIndividual) {
        // Collect all available units for this merk
        const allUnits = merkItems.reduce((acc, item) => {
          const units = (state.unitAlat || [])
            .filter(u => u.jenisAlatId === item.id && u.status === 'Tersedia');
          return [...acc, ...units];
        }, []);

        merkHeader.innerHTML = `
          <div class="flex items-center justify-between w-full">
            <div>
              <span class="font-semibold">${merk}</span>
              <span class="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Individual</span>
            </div>
            <div class="flex items-center">
              <span class="text-sm text-gray-600 mr-3">Stok: ${allUnits.length}</span>
              <svg class="w-4 h-4 transform transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>
        `;
        
        // Level 3: Unit list container
        const unitList = document.createElement('div');
        unitList.className = 'hidden pl-6 pr-2 py-1 bg-gray-50';
        
        merkItems.forEach(item => {
          const units = (state.unitAlat || [])
            .filter(u => u.jenisAlatId === item.id && u.status === 'Tersedia')
            .sort((a, b) => (a.kodeInv || '').localeCompare(b.kodeInv || ''));
            
            
          units.forEach(unit => {
            const unitRow = document.createElement('div');
            unitRow.className = 'flex justify-between items-center py-1';
            unitRow.innerHTML = `
              <span class="text-sm font-mono">${unit.kodeInv}</span>
              <button data-unit-id="${unit.id}" data-alat-id="${item.id}" class="btn-add-latihan px-2 py-1 bg-green-600 text-white rounded text-sm">Tambah</button>
            `;
            unitList.appendChild(unitRow);
          });
        });
        
        // Toggle unit list visibility
        merkHeader.addEventListener('click', () => {
          merkHeader.querySelector('svg').classList.toggle('rotate-180');
          unitList.classList.toggle('hidden');
        });
        
        merkDiv.appendChild(merkHeader);
        merkDiv.appendChild(unitList);
      } else {
            // --- AWAL PERUBAHAN ---
            // For cumulative items, list each variation (tahun/warna)
            
            // Level 2: Merk header (non-clickable)
            merkHeader.innerHTML = `
              <div class="flex items-center justify-between w-full p-2">
                <div>
                  <span class="font-semibold">${merk}</span>
                  <span class="ml-2 text-xs bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded">Kumulatif</span>
                </div>
              </div>
            `;
            // Remove clickable/hover effects
            merkHeader.classList.remove('hover:bg-gray-50', 'cursor-pointer'); 
            
            // Level 3: List of each item variation
            const itemList = document.createElement('div');
            // Use same padding as individual unit list, but no 'hidden' class
            itemList.className = 'pl-6 pr-2 py-1 bg-gray-50'; 
            
            merkItems
              .filter(item => item.stok && item.stok > 0) // Only show items with stock
              .sort((a,b) => (a.tahunPembelian || 0) - (b.tahunPembelian || 0)) // Sort by year
              .forEach(item => {

                const itemRow = document.createElement('div');
                itemRow.className = 'flex justify-between items-center py-1.5 border-t border-gray-200 first:border-t-0';
                itemRow.innerHTML = `
                  <div class="text-sm">
                    <span>Th. ${item.tahunPembelian || '-'}</span>
                    <span class="ml-2 text-xs bg-white border px-1.5 py-0.5 rounded">Warna: ${item.warna || '-'}</span>
                    <span class="ml-2 text-sm text-gray-600 font-medium">(Stok: ${item.stok})</span>
                  </div>
                  <button data-alat-id="${item.id}" class="btn-add-latihan px-2 py-1 bg-green-600 text-white rounded text-sm flex-shrink-0">Tambah</button>
                `;
                itemList.appendChild(itemRow);
            });
            
            merkDiv.appendChild(merkHeader);
            
            // Only append itemList if it actually has items
            if (itemList.hasChildNodes()) {
                merkDiv.appendChild(itemList);
            } else {
                 // Optional: add a note if all variations are out of stock
                 const totalStok = merkItems.reduce((sum, item) => sum + (item.stok || 0), 0);
                 if (totalStok <= 0) {
                    merkHeader.querySelector('div div').insertAdjacentHTML('beforeend', '<span class="ml-2 text-sm text-red-500">(Stok habis)</span>');
                 }
            }
            // --- AKHIR PERUBAHAN ---
      }
      
      contentDiv.appendChild(merkDiv);
    });
    
    // Toggle nama accordion
    namaHeader.addEventListener('click', () => {
      namaHeader.querySelector('svg').classList.toggle('rotate-180');
      contentDiv.classList.toggle('hidden');
    });
    
    groupCard.appendChild(namaHeader);
    groupCard.appendChild(contentDiv);
    alatListEl.appendChild(groupCard);
  });
}

function renderCart() {
  cartEl.innerHTML = '';
  const keys = Object.keys(state.latihanCart || {});
  if (keys.length === 0) {
    cartEl.innerHTML = '<div class="text-sm text-gray-500">Keranjang kosong</div>';
    return;
  }

  keys.forEach(k => {
    const entry = state.latihanCart[k];
    const div = document.createElement('div');
    div.className = 'p-2 border rounded flex items-center justify-between';
    const left = document.createElement('div');
    left.innerHTML = `<div class="font-semibold">${entry.data.nama} <span class="text-sm text-gray-500">${entry.data.merk||''}</span></div>`;

    const right = document.createElement('div');
    if (entry.data.isIndividual) {
      const unitDetails = (entry.units || []).map(u => u.kodeInv).join(', ');
      right.innerHTML = `
        <div>
          <div class="text-sm text-gray-600">Unit dipilih: ${(entry.units || []).length}</div>
          <div class="text-xs text-gray-500">Kode: ${unitDetails}</div>
          <div class="mt-2 flex gap-2">
            <button data-id="${k}" class="btn-remove-latihan px-2 py-1 bg-red-600 text-white rounded">Hapus</button>
          </div>
        </div>`;
    } else {
      right.innerHTML = `<div class="text-sm text-gray-600">Jumlah: ${entry.jumlah}</div><div class="mt-2 flex gap-2"><button data-id="${k}" class="btn-remove-latihan px-2 py-1 bg-red-600 text-white rounded">Hapus</button></div>`;
    }

    div.appendChild(left);
    div.appendChild(right);
    cartEl.appendChild(div);
  });
}

// --- Handlers ---
function openUnitSelectionModal(alat) {
  const id = alat.id;
  const availableUnits = (state.unitAlat || []).filter(u => u.jenisAlatId === id && u.status === 'Tersedia');
  if (!availableUnits.length) return showMessage('Tidak ada unit tersedia untuk alat ini', 'error');

  const modalId = 'modal-unit-select';
  document.getElementById(modalId)?.remove();

  const unitList = availableUnits.map(u => `
    <label class="flex items-center gap-2 mb-2"><input type="checkbox" value="${u.id}" data-kode="${u.kodeInv}" class="unit-checkbox"> ${u.kodeInv || u.id}</label>`).join('');

  const html = `
    <div id="${modalId}" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="fixed inset-0 bg-black bg-opacity-50"></div>
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md m-4 p-6 relative z-10">
        <h3 class="text-lg font-bold mb-2">Pilih Unit untuk ${alat.nama}</h3>
        <form id="form-unit-select">
          <div class="mb-4">${unitList}</div>
          <div class="flex justify-end gap-2">
            <button type="button" id="btn-cancel-unit-select" class="px-4 py-2 bg-gray-200 rounded">Batal</button>
            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded">Simpan</button>
          </div>
        </form>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
  const modal = document.getElementById(modalId);
  modal.querySelector('#btn-cancel-unit-select').onclick = () => modal.remove();
  modal.querySelector('#form-unit-select').onsubmit = (e) => {
    e.preventDefault();
    const checked = Array.from(modal.querySelectorAll('.unit-checkbox:checked'));
    if (!checked.length) {
      showMessage('Pilih minimal satu unit', 'error');
      return;
    }
    const selected = checked.map(cb => ({ unitId: cb.value, kodeInv: cb.dataset.kode }));
    state.latihanCart[id] = { data: alat, units: selected };
    renderCart();
    modal.remove();
  };
}

function openJumlahModal(alat) {
  const id = alat.id;
  const max = alat.stok || 0;
  if (max <= 0) return showMessage('Stok tidak tersedia', 'error');

  const modalId = 'modal-jumlah-select';
  document.getElementById(modalId)?.remove();

  const html = `
    <div id="${modalId}" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="fixed inset-0 bg-black bg-opacity-50"></div>
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md m-4 p-6 relative z-10">
        <h3 class="text-lg font-bold mb-2">Jumlah untuk ${alat.nama}</h3>
        <p class="text-sm text-gray-600 mb-2">Merk: ${alat.merk || '-'} | Th: ${alat.tahunPembelian || '-'} | Warna: ${alat.warna || '-'}</p>
        <form id="form-jumlah-select">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Masukkan jumlah (maks ${max}):</label>
            <input type="number" min="1" max="${max}" id="jumlah-input" class="w-full border p-2 rounded" required value="1">
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" id="btn-cancel-jumlah-select" class="px-4 py-2 bg-gray-200 rounded">Batal</button>
            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded">Simpan</button>
          </div>
        </form>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
  const modal = document.getElementById(modalId);
  modal.querySelector('#btn-cancel-jumlah-select').onclick = () => modal.remove();
  modal.querySelector('#form-jumlah-select').onsubmit = (e) => {
    e.preventDefault();
    const n = parseInt(modal.querySelector('#jumlah-input').value, 10);
    if (isNaN(n) || n <= 0 || n > max) {
      showMessage('Jumlah tidak valid', 'error');
      return;
    }
    // Create unique cart entry key (menggunakan alat.id karena ini untuk item kumulatif spesifik)
    const cartKey = alat.id; // Gunakan ID alat sebagai kunci
    
    // Cek jika sudah ada di keranjang
    if (state.latihanCart[cartKey]) {
        // Jika sudah ada, tanyakan apakah mau diganti
        if (!confirm('Item ini sudah ada di keranjang. Ganti jumlah?')) {
            modal.remove();
            return;
        }
    }

    state.latihanCart[cartKey] = { data: alat, jumlah: n };
    renderCart();
    modal.remove();
  };
}

function handleAdd(button) {
  const alatId = button.dataset.alatId;
  if (!alatId) return;
  
  const alat = (state.allAlat || []).find(a => a.id === alatId);
  if (!alat) return;

  if (alat.isIndividual) {
    const unitId = button.dataset.unitId;
    if (!unitId) return;
    
    const unit = (state.unitAlat || []).find(u => u.id === unitId);
    if (!unit) return;
    
    // Check if this unit is already in cart
    const isUnitInCart = Object.values(state.latihanCart || {}).some(item => {
      if (!item.data.isIndividual) return false;
      return item.units.some(u => u.unitId === unitId);
    });
    
    if (isUnitInCart) {
      showMessage('Unit ini sudah ada di keranjang', 'error');
      return;
    }
    
    // Buat kunci keranjang unik berdasarkan ID unit
    const cartKey = unit.id; 
    
    state.latihanCart[cartKey] = { 
      data: alat, 
      units: [{ unitId: unit.id, kodeInv: unit.kodeInv }] 
    };
    renderCart();
  } else {
    // For cumulative items, show quantity modal with current cart key
    openJumlahModal(alat);
  }
}

function handleRemove(event) {
  const id = event.target.dataset.id;
  if (!id) return;
  delete state.latihanCart[id];
  renderCart();
}

async function handleSubmit(e) {
  e.preventDefault();
  const nama = $('#latihan-nama').value.trim();
  const latihan = $('#latihan-latihan').value.trim();
  if (!nama || !latihan) return showMessage('Nama dan latihan harus diisi', 'error');

  const items = [];
  Object.values(state.latihanCart || {}).forEach(entry => {
    const d = entry.data;
    if (d.isIndividual) {
      (entry.units || []).forEach(u => items.push({ 
        jenisAlatId: d.id, 
        namaAlat: d.nama,
        merk: d.merk || '-',
        unitId: u.unitId, 
        kodeInv: u.kodeInv, 
        isIndividual: true 
      }));
    } else {
      items.push({ 
        jenisAlatId: d.id, 
        namaAlat: d.nama,
        merk: d.merk || '-',
        jumlah: entry.jumlah || 0, 
        isIndividual: false 
      });
    }
  });

  if (!items.length) return showMessage('Keranjang kosong', 'error');

  const payload = {
    namaPengguna: nama,
    latihan: latihan,
    tanggalKegiatan: new Date().toISOString(),
    status: 'Kegiatan',
    items
  };

  try {
  ui.showLoading('Menyimpan catatan latihan...');
  await services.recordKegiatan(payload);
  ui.hideLoading();
  showMessage('Catatan latihan berhasil disimpan', 'success');
  state.latihanCart = {};
  renderCart();
  form.reset();
  // Redirect to login page after save
  setTimeout(() => { window.location.href = 'index.html'; }, 1200);
  } catch (err) {
    console.error(err);
    ui.hideLoading();
    showMessage('Gagal menyimpan catatan latihan: ' + (err.message || ''), 'error');
  }
}

// Wire events
alatListEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-add-latihan');
  if (!btn) return;
  e.preventDefault();
  handleAdd(btn);
});

cartEl.addEventListener('click', (e) => { if (e.target.classList.contains('btn-remove-latihan')) handleRemove(e); });
form?.addEventListener('submit', handleSubmit);
const backBtn = $('#btn-back-login');
if (backBtn) backBtn.addEventListener('click', () => window.location.href = 'index.html');
searchInput?.addEventListener('input', renderAlatList);
filterKategori?.addEventListener('change', renderAlatList);

// Listeners
services.listenToAlat((snap) => {
  const arr = [];
  snap.docs.forEach(d => arr.push({ id: d.id, ...d.data() }));
  state.allAlat = arr;
  renderAlatList();
});

services.listenToUnitAlat((snap) => {
  const arr = [];
  snap.docs.forEach(d => arr.push({ id: d.id, ...d.data() }));
  state.unitAlat = arr;
  renderAlatList();
});

// Initial render
renderAlatList();
renderCart();

// floating public link: hide it on the dedicated public-kegiatan page
ui.ensurePublicKegiatanLinkVisible(true);

export default {};