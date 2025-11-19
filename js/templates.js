// js/templates.js

export function getLoginScreenHTML() {
    return `<div class="flex items-center justify-center min-h-screen bg-gray-100"><div class="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg login-card"><div class="text-center"><h1 class="text-3xl font-bold text-gray-800">Login Logistik</h1><p class="text-gray-500">Sistem Logistik Mapalast</p></div><div class="text-sm text-center mt-2"><a href="public-kegiatan.html" class="text-blue-600 hover:underline">Anggota? Catat Penggunaan Kegiatan di sini</a></div><form id="login-form" class="space-y-4" novalidate><div><label for="email" class="text-sm font-medium text-gray-700">Email</label><input id="email" name="email" type="email" autocomplete="email" required class="w-full p-3 mt-1 border rounded-lg focus:ring-blue-500 focus:border-blue-500" placeholder="admin@mapala.com"></div><div><label for="password" class="text-sm font-medium text-gray-700">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required class="w-full p-3 mt-1 border rounded-lg focus:ring-blue-500 focus:border-blue-500" placeholder="••••••••"></div><div id="login-error" class="text-red-500 text-sm text-center min-h-[1.25rem]"></div><div><button type="submit" class="w-full px-4 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none">Masuk</button></div></form></div></div>`;
}

export function getDashboardHTML(user, firestoreUser) {
    const displayName = firestoreUser.username || user.email;
    const logoUrl = '';
    return `<header class="bg-white shadow-sm sticky top-0 z-20"><div class="container mx-auto px-4 sm:px-6 lg:px-8"><div class="flex justify-between items-center py-4">
        <div class="flex items-center space-x-3">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo MAPALAST" class="h-10 w-10 object-contain">` : ''}
            <h1 class="text-xl font-bold text-gray-800">MAPALAST</h1>
        </div>
        <div class="flex items-center space-x-4">
            <span class="text-sm font-bold text-gray-700 hidden sm:block">${displayName}</span>
            <button type="button" id="btn-logout" class="text-sm font-medium text-red-600 hover:text-red-800">Logout</button>
        </div>
    </div></div></header><main class="container mx-auto p-4 sm:p-6 lg:p-8"><div class="border-b border-gray-200 mb-6"><nav class="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs"><button type="button" id="nav-dashboard" class="tab-link-active whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm">Dasbor</button><button type="button" id="nav-inventaris" class="tab-link text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm">Inventaris</button><button type="button" id="nav-peminjaman" class="tab-link text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm">Peminjaman</button><button type="button" id="nav-latihan" class="tab-link text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm">Kegiatan</button><button type="button" id="nav-afkir" class="tab-link text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm">Barang Afkir</button></nav></div><div id="view-dashboard" class="page-view"></div><div id="view-inventaris" class="page-view hidden"></div><div id="view-peminjaman" class="page-view hidden"></div><div id="view-latihan" class="page-view hidden"></div><div id="view-afkir" class="page-view hidden"></div></main><div id="modal-container"></div>
     <div id="toast-container" class="fixed top-6 right-6 z-[9999] w-full max-w-xs space-y-3"></div>
`;
   
}

export function getDashboardViewHTML() {
    return `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="stat-card bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div class="flex items-start justify-between">
                <div>
                    <h3 class="text-sm font-medium text-gray-500">Total Jenis Alat</h3>
                    <p id="stat-total-alat" class="mt-2 text-3xl font-bold">0</p>
                </div>
                <div class="text-blue-500 bg-blue-50 rounded-full p-3">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                </div>
            </div>
            <div class="mt-2 flex items-center text-xs text-gray-500">
                <span id="stat-total-jenis-kumulatif" class="mr-2">Kumulatif: 0</span>
                <span id="stat-total-jenis-individual">Individual: 0</span>
            </div>
        </div>

        <div class="stat-card bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div class="flex items-start justify-between">
                <div>
                    <h3 class="text-sm font-medium text-gray-500">Peminjaman Aktif</h3>
                    <p id="stat-peminjaman-aktif" class="mt-2 text-3xl font-bold">0</p>
                </div>
                <div class="text-yellow-500 bg-yellow-50 rounded-full p-3">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
            </div>
            <div class="mt-2 flex items-center text-xs text-gray-500">
                <span id="stat-total-item-dipinjam" class="mr-2">Total Item: 0</span>
                <span id="stat-estimasi-kembali" class="text-blue-600">Est. Kembali Hari Ini: 0</span>
            </div>
        </div>

        <div class="stat-card bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div class="flex items-start justify-between">
                <div>
                    <h3 class="text-sm font-medium text-gray-500">Barang Afkir</h3>
                    <p id="stat-barang-afkir" class="mt-2 text-3xl font-bold">0</p>
                </div>
                <div class="text-red-500 bg-red-50 rounded-full p-3">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </div>
            </div>
            <div class="mt-2 flex items-center text-xs text-gray-500">
                <span id="stat-afkir-bulan-ini" class="text-gray-600">Bulan Ini: 0</span>
            </div>
        </div>
    </div>

    <!-- Grafik & Informasi Tambahan -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <!-- Statistik Kategori -->
        <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <h3 class="text-lg font-semibold mb-4">Jumlah Alat per Kategori</h3>
            <div id="kategori-stats" class="space-y-4">
                <!-- Diisi via JavaScript -->
            </div>
        </div>

        <!-- Peminjaman Terkini -->
        <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <h3 class="text-lg font-semibold mb-4">Peminjaman Terkini</h3>
            <div id="recent-peminjaman" class="space-y-3 max-h-[300px] overflow-y-auto">
                <!-- Diisi via JavaScript -->
            </div>
        </div>
    </div>`;
}

export function getInventarisViewHTML() {
    return `<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
                <h2 class="text-2xl font-bold">Daftar Alat</h2>
                <p class="text-gray-500 mt-1">Kelola semua peralatan yang tersedia.</p>
            </div>
            <div class="flex items-center gap-2 w-full sm:w-auto">
                <input type="text" id="search-alat" placeholder="Cari alat atau merk..." class="w-full sm:w-64 p-2.5 border rounded-lg">
                <button type="button" id="btn-export-inventaris" class="flex-shrink-0 bg-green-600 text-white px-4 py-2.5 rounded-lg shadow-md hover:bg-green-700 transition" title="Ekspor ke Excel">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                </button>
                <button type="button" id="btn-show-add-alat-modal" class="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-md hover:bg-blue-700 transition">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                    Tambah
                </button>
            </div>
        </div>
        <div class="mb-4">
            <div class="sm:hidden"><label for="tabs-select" class="sr-only">Pilih kategori</label><select id="tabs-select" class="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"></select></div>
            <div class="hidden sm:block"><div class="border-b border-gray-200"><nav class="-mb-px flex space-x-8" id="tabs-desktop"></nav></div></div>
        </div>
        <div id="alat-list-container" class="space-y-6"></div>
        <div id="loading-inventaris" class="text-center py-10 text-gray-500">Memuat data...</div>`;
}

export function getPeminjamanViewHTML() {
    return `<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
            <h2 class="text-2xl font-bold">Riwayat Peminjaman</h2>
            <p class="text-gray-500 mt-1">Lacak semua transaksi peminjaman alat.</p>
        </div>
    <button type="button" id="btn-show-add-peminjaman-modal" class="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg shadow-md hover:bg-green-700 transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            Catat Peminjaman Baru
        </button>
    </div>
    <div id="peminjaman-list" class="space-y-4"></div>
    <div id="loading-peminjaman" class="text-center py-10 text-gray-500">Memuat data...</div>`;
}

export function getAfkirViewHTML() {
    return `<div class="flex justify-between items-start mb-6">
        <div>
            <h2 class="text-2xl font-bold">Barang Afkir</h2>
            <p class="text-gray-500 mt-1">Daftar barang yang sudah tidak layak pakai.</p>
        </div>
        <div class="flex space-x-2">
            <button type="button" id="btn-backup-afkir" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Backup & Hapus History
            </button>
        </div>
    </div>
    <div id="afkir-list" class="mt-6 space-y-3"></div>
    <div id="loading-afkir" class="text-center py-10 text-gray-500">Memuat data...</div>`;
}

export function getModalContainerHTML() {
    return `
    <div id="modal-add-alat" class="modal fixed inset-0 z-30 hidden items-center justify-center modal-backdrop">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-lg m-4 p-6 max-h-[90vh] overflow-y-auto">
            <h3 id="modal-alat-title" class="text-2xl font-bold mb-6"></h3>
            <form id="form-add-alat" novalidate>
                <input type="hidden" id="alat-id">
                <input type="hidden" id="alat-mode" value="cumulative">

                <div class="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                    <input type="text" id="alat-nama" placeholder="Nama Alat (e.g., Tenda, Carabiner)" class="sm:col-span-2 w-full p-3 border rounded-lg" required>
                    <select id="alat-kategori" class="w-full p-3 border rounded-lg" required>
                        <option value="">Pilih Kategori...</option>
                        <option value="Metal">Metal</option>
                        <option value="Non-Metal">Non-Metal</option>
                        <option value="Perlengkapan">Perlengkapan</option>
                        <option value="Kenang-kenangan">Kenang-kenangan</option>
                    </select>
                    <input type="text" id="alat-merk" placeholder="Merk" class="w-full p-3 border rounded-lg" required>
                    <input type="number" id="alat-tahun" placeholder="Tahun Pembelian" class="w-full p-3 border rounded-lg" required min="1980" max="2099">
                    <input type="text" id="alat-warna" placeholder="Warna" class="w-full p-3 border rounded-lg" required>
                </div>

                <div class="mt-6 border-t pt-4">
                    <label class="flex items-center space-x-3 cursor-pointer">
                        <input type="checkbox" id="alat-is-individual" class="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                        <span class="text-gray-700">Lacak per unit (dengan Kode INV)?</span>
                    </label>
                    <p class="text-xs text-gray-500 mt-1 ml-8">Untuk alat penting seperti alat metal atau alat yang berjumlah banyak.</p>
                </div>
                
                <div class="mt-4 grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                    <div id="cumulative-fields">
                        <input type="number" id="alat-stok" placeholder="Jumlah Stok" class="w-full p-3 border rounded-lg" min="0">
                    </div>
                    <div id="individual-fields" class="hidden sm:col-span-2">
                        <input type="number" id="alat-jumlah-unit" placeholder="Jumlah Unit yang Ditambahkan" class="w-full p-3 border rounded-lg" min="1">
                        <p class="text-xs text-gray-500 mt-1">Kode INV untuk setiap unit akan dibuat otomatis.</p>
                    </div>

                    <input type="text" id="alat-kondisi" placeholder="Kondisi Awal" class="w-full p-3 border rounded-lg" required>
                    <textarea id="alat-keterangan" placeholder="Keterangan Tambahan" class="sm:col-span-2 w-full p-3 border rounded-lg h-24"></textarea>
                </div>

                <div class="mt-8 flex justify-between items-center">
                    <button type="button" id="btn-afkir-alat" class="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 hidden">Afkirkan Alat</button>
                    <div>
                        <button type="button" id="btn-cancel-add-alat" class="px-5 py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300">Batal</button>
                        <button type="submit" class="ml-3 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Simpan</button>
                    </div>
                </div>
            </form>
        </div>
    </div>
    
    <div id="modal-add-peminjaman" class="modal fixed inset-0 z-30 hidden items-center justify-center modal-backdrop">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl m-4 p-6 max-h-[90vh] overflow-y-auto">
            <h3 class="text-2xl font-bold mb-6">Formulir Peminjaman Alat</h3>
            
            <form id="form-add-peminjaman" class="space-y-4" novalidate>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Form Peminjam -->
                    <div class="space-y-4">
                        <h4 class="font-semibold">Data Peminjam:</h4>
                        <input type="text" id="peminjaman-nama" placeholder="Nama Peminjam" 
                            class="w-full p-3 border rounded-lg" required>
                        <input type="tel" id="peminjaman-hp" placeholder="Nomor HP Peminjam" 
                            class="w-full p-3 border rounded-lg" required>
                        <input type="text" id="peminjaman-organisasi" placeholder="Asal Organisasi" 
                            class="w-full p-3 border rounded-lg" required>
                        <input type="text" id="peminjaman-jaminan" placeholder="Jaminan (KTM/SIM)" 
                            class="w-full p-3 border rounded-lg" required>
                        <div>
                            <label class="text-sm text-gray-600">Rencana Kembali</label>
                            <input type="date" id="peminjaman-tgl-kembali" 
                                class="w-full p-3 border rounded-lg" required>
                        </div>
                        <div class="border rounded-lg p-4">
                            <h4 class="font-semibold mb-3">Keranjang Peminjaman:</h4>
                            <div id="peminjaman-cart" class="space-y-2 max-h-[200px] overflow-y-auto"></div>
                        </div>
                    </div>

                    <!-- Daftar Alat -->
                    <div class="space-y-4">
                        <h4 class="font-semibold">Pilih Alat:</h4>
                        <div class="relative mb-3">
                            <input type="text" id="search-peminjaman-alat" 
                                placeholder="Cari alat..." 
                                class="w-full p-3 pr-10 border rounded-lg">
                            <svg class="absolute right-3 top-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                            </svg>
                        </div>
                        <!-- Kategori Selector moved here -->
                        <div class="mb-3">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Kategori Alat</label>
                            <select id="peminjaman-kategori" class="w-full p-2 border rounded">
                                <option value="Metal">Metal</option>
                                <option value="Non-Metal">Non-Metal</option>
                            </select>
                        </div>
                        <div id="peminjaman-alat-list" 
                            class="border rounded-lg p-4 space-y-2 max-h-[400px] overflow-y-auto">
                            <!-- Alat akan dirender di sini -->
                        </div>
                    </div>
                </div>

                <div class="mt-8 flex justify-end space-x-3">
                    <button type="button" id="btn-cancel-add-peminjaman" 
                        class="px-5 py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300">
                        Batal
                    </button>
                    <button type="submit" id="btn-submit-peminjaman" 
                        class="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Simpan Peminjaman
                    </button>
                </div>
            </form>
        </div>
    </div>
    <div id="modal-detail-peminjaman" class="modal fixed inset-0 z-30 hidden items-center justify-center modal-backdrop"><div id="struk-content" class="bg-white rounded-lg shadow-xl w-full max-w-md m-4 p-8"><div class="text-center mb-6"><h3 class="text-2xl font-bold">Struk Peminjaman</h3><p id="struk-id" class="text-sm text-gray-500"></p></div><div class="space-y-3 border-t border-b py-4"><div class="flex justify-between"><span class="text-gray-600">Nama:</span><strong id="struk-nama"></strong></div><div class="flex justify-between"><span class="text-gray-600">No. HP:</span><strong id="struk-hp"></strong></div><div class="flex justify-between"><span class="text-gray-600">Tgl Pinjam:</span><strong id="struk-tgl-pinjam"></strong></div><div class="flex justify-between"><span class="text-gray-600">Jaminan:</span><strong id="struk-jaminan"></strong></div><div class="flex justify-between"><span class="text-gray-600">Status:</span><strong id="struk-status"></strong></div></div><h4 class="font-semibold mt-6 mb-2">Barang:</h4><div id="struk-items" class="space-y-1 text-sm"></div><div class="mt-8 flex justify-end space-x-3"><button type="button" id="btn-close-struk" class="px-5 py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300">Tutup</button><button type="button" id="btn-download-struk" class="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>Unduh PDF</button></div></div></div>
    <div id="modal-history-alat" class="modal fixed inset-0 z-30 hidden items-center justify-center modal-backdrop">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl m-4 p-6">
            <h3 id="history-title" class="text-2xl font-bold mb-4">Riwayat Kondisi Alat</h3>
            <div class="flex justify-between items-center mb-4">
                <div class="text-sm text-gray-500">Riwayat perubahan kondisi per unit</div>
                <button type="button" id="btn-open-history-form" class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded">+ Tambah Riwayat</button>
            </div>
            <div id="history-list" class="max-h-72 overflow-y-auto space-y-4 custom-scrollbar mb-4"></div>

            <!-- Form tambah / edit riwayat -->
            <form id="form-history-entry" class="space-y-3 hidden" novalidate>
                <input type="hidden" id="history-unit-id">
                <input type="hidden" id="history-id">
                <div>
                    <label class="text-sm text-gray-700">Kondisi Baru</label>
                    <input id="history-new-kondisi" type="text" placeholder="Contoh: Baik, Rusak ringan" class="w-full p-2 border rounded" required>
                </div>
                <div>
                    <label class="text-sm text-gray-700">Catatan</label>
                    <textarea id="history-note" class="w-full p-2 border rounded h-24" placeholder="Catatan tambahan..."></textarea>
                </div>
                <div class="flex justify-end gap-2">
                    <button type="button" id="btn-cancel-history" class="px-4 py-2 bg-gray-200 rounded">Batal</button>
                    <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded">Simpan</button>
                </div>
            </form>

            <div class="mt-4 flex justify-end">
                <button type="button" id="btn-close-history" class="px-5 py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300">Tutup</button>
            </div>
        </div>
    </div>
    <div id="modal-afkir-alat" class="modal fixed inset-0 z-40 hidden items-center justify-center modal-backdrop"><div class="bg-white rounded-lg shadow-xl w-full max-w-md m-4 p-6"><h3 class="text-2xl font-bold mb-2">Formulir Afkir Alat</h3><p class="text-gray-600 mb-6">Anda akan mengafkirkan: <strong id="afkir-item-name"></strong></p><form id="form-afkir-alat" novalidate><input type="hidden" id="afkir-alat-id"><div class="space-y-4"><div><label for="afkir-jumlah" class="text-sm font-medium text-gray-700">Jumlah yang Diafkirkan</label><input type="number" id="afkir-jumlah" class="w-full p-3 mt-1 border rounded-lg" required min="1"><p class="text-xs text-gray-500 mt-1">Stok tersedia: <span id="afkir-stok-tersedia"></span></p></div><div><label for="afkir-alasan" class="text-sm font-medium text-gray-700">Alasan Afkir</label><textarea id="afkir-alasan" placeholder="Contoh: Rusak, hilang, tidak layak pakai" class="w-full p-3 mt-1 border rounded-lg h-24" required></textarea></div></div><div class="mt-8 flex justify-end space-x-3"><button type="button" id="btn-cancel-afkir" class="px-5 py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300">Batal</button><button type="submit" class="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center">Konfirmasi Afkir</button></div></form></div></div>
    `;
}


export function getKegiatanViewHTML() {
    return `
    <div class="flex justify-between items-start mb-4">
        <div>
            <h2 class="text-2xl font-bold">Catatan Kegiatan</h2>
            <p class="text-gray-500">Daftar catatan penggunaan alat untuk latihan.</p>
            
            <div class="text-sm text-gray-600 mt-2">Total Catatan: <span id="stat-total-latihan" class="font-semibold">0</span></div>
        </div>
        
        <div class="flex space-x-2">
            <button type="button" id="btn-backup-kegiatan" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Backup & Hapus History
            </button>
        </div>
    </div>
    <div id="latihan-list" class="space-y-3">
        <p class="text-gray-500">Memuat data latihan...</p>
    </div>`;
}

export function getKegiatanDetailModalHTML(latihan) {
    const itemsHtml = (latihan.items || []).map(it => {
        if (it.isIndividual) return `<li>${it.namaAlat} • ${it.kodeInv || it.unitId || '-'} (unit)</li>`;
        return `<li>${it.namaAlat} • x${it.jumlah || 0}</li>`;
    }).join('');

    return `
    <div id="modal-latihan-detail" class="modal fixed inset-0 z-50 flex items-center justify-center">
        <div class="fixed inset-0 bg-black bg-opacity-50"></div>
        <div class="bg-white rounded-lg shadow-xl w-full max-w-lg m-4 p-6 relative z-10">
            <h3 class="text-xl font-bold mb-2">Detail Catatan Kegiatan</h3>
            <p class="text-sm text-gray-600 mb-4">Nama: ${latihan.namaPengguna || '-' } • Kegiatan: ${latihan.latihan || '-'}</p>
            <div class="text-sm text-gray-700 mb-4">
                <strong>Tanggal:</strong> ${latihan.tanggalKegiatan || latihan.timestamp?.toDate?.().toLocaleString?.('id-ID') || '-'}
            </div>
            <div class="mb-4"><strong>Items:</strong><ul class="list-disc list-inside text-sm text-gray-600">${itemsHtml}</ul></div>
            <div class="flex justify-end"><button id="btn-close-latihan-detail" class="px-4 py-2 bg-gray-200 rounded">Tutup</button></div>
        </div>
    </div>`;
}