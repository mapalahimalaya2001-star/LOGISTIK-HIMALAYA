// js/state.js

export const state = {
    user: null,
    firestoreUser: { username: 'Guest' },
    allAlat: [],
    unitAlat: [],
    allPeminjaman: [],
    allAfkir: [],
    currentAlatCategory: 'Metal',
    peminjamanState: {
        selectedItems: {},  // {alatId: {quantity: number, units: string[]}}
        peminjam: {
            nama: '',
            noHp: '',
            organisasi: '',
            jaminan: '',
            tglKembaliRencana: null
        }
    },
    unsubscribeListeners: [],
    peminjamanCart: {},  // {alatId: {data: AlatData, jumlah: number}}
    // Kegiatan (public/member) cart & list
    latihanCart: {}, // { jenisAlatId: { data: AlatData, jumlah: number, units: [{unitId,kodeInv}]} }
    allKegiatan: [], // latest recorded latihan documents (optional)
};

export function resetState() {
    state.user = null;
    state.firestoreUser = { username: 'Guest' };
    state.allAlat = [];
    state.unitAlat = []; // DITAMBAHKAN: Reset array unitAlat saat logout
    state.allPeminjaman = [];
    state.allAfkir = [];
    state.peminjamanCart = {};
    state.latihanCart = {};
    state.allKegiatan = [];
    state.unsubscribeListeners.forEach(unsub => unsub());
    state.unsubscribeListeners = [];
}