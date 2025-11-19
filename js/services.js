
// js/services.js
//js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, serverTimestamp, query, orderBy, writeBatch, getDoc, runTransaction, increment, getDocs, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { firebaseConfig } from '../firebase-config.js';

// --- INITIALIZATION ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- COLLECTION REFERENCES ---
const getCollectionPath = (name) => `/artifacts/${firebaseConfig.appId}/public/data/${name}`;
const alatCollection = collection(db, getCollectionPath('alat')); // Ini sekarang "Jenis Alat"
const unitAlatCollection = collection(db, getCollectionPath('unitAlat')); // KOLEKSI BARU untuk item individual
const peminjamanCollection = collection(db, getCollectionPath('peminjaman'));
const afkirCollection = collection(db, getCollectionPath('afkir'));
const latihanCollection = collection(db, getCollectionPath('latihan'));

// --- AUTHENTICATION ---
export const listenToAuthChanges = (callback) => onAuthStateChanged(auth, callback);
export const loginUser = (email, password) => {
    // Mengatur agar login hanya bertahan selama tab ini terbuka
    return setPersistence(auth, browserSessionPersistence)
        .then(() => {
            // Setelah persistensi diatur, lanjutkan login
            return signInWithEmailAndPassword(auth, email, password);
        });
};
export const logoutUser = () => signOut(auth);

// --- FIRESTORE READS ---
export const getUserProfile = (uid) => getDoc(doc(db, "users", uid));
export const getPeminjamanDoc = (id) => getDoc(doc(peminjamanCollection, id));
export const getUnitDoc = (unitId) => getDoc(doc(unitAlatCollection, unitId));

const listenToCollection = (coll, orderByField, direction = "desc", callback) => {
    const q = query(coll, orderBy(orderByField, direction));
    return onSnapshot(q, callback, (error) => console.error(`Error listening to ${coll.path}:`, error));
};
// Proses afkir unit individu
export async function processAfkirUnit(unitId, alasan) {
    const unitRef = doc(unitAlatCollection, unitId);
    return runTransaction(db, async (transaction) => {
        // 1. Get unit data
        const unitDoc = await transaction.get(unitRef);
        if (!unitDoc.exists()) throw new Error("Unit tidak ditemukan!");

        const unitData = unitDoc.data();
        if (unitData.status === 'DiAfkir') throw new Error("Unit ini sudah diafkir sebelumnya.");
        if (unitData.status === 'Dipinjam') throw new Error("Unit sedang dipinjam, tidak bisa diafkir. Harap kembalikan terlebih dahulu.");

        // 2. Get parent (jenis alat) data
        const jenisAlatRef = doc(alatCollection, unitData.jenisAlatId);
        const jenisAlatDoc = await transaction.get(jenisAlatRef);
        if (!jenisAlatDoc.exists()) throw new Error("Data jenis alat tidak ditemukan!");

        const jenisAlatData = jenisAlatDoc.data();

        // 3. Create afkir document
        const afkirData = {
            // Data dari jenis alat (parent)
            nama: jenisAlatData.nama,
            merk: jenisAlatData.merk || '-',
            warna: jenisAlatData.warna,
            tahunPembelian: jenisAlatData.tahunPembelian || 0,
            kategori: jenisAlatData.kategori,
            // Data dari unit
            kodeInv: unitData.kodeInv,
            kondisi: unitData.kondisi,
            // Data afkir
            jumlahDiAfkir: 1,
            alasan: alasan,
            afkirTimestamp: serverTimestamp(),
            // Reference IDs
            jenisAlatId: unitData.jenisAlatId,
            unitId: unitId,
            tipeAfkir: 'individual'
        };

        // Buat dokumen afkir baru
        const afkirRef = doc(afkirCollection);
        transaction.set(afkirRef, afkirData);

        // Update status unit menjadi DiAfkir
        transaction.update(unitRef, {
            status: 'DiAfkir',
            alasanAfkir: alasan,
            afkirTimestamp: serverTimestamp()
        });

        return true;
    });
}
export const listenToAlat = (callback) => listenToCollection(alatCollection, "nama", "asc", callback);
export const listenToUnitAlat = (callback) => {
    const q = query(unitAlatCollection, where("status", "!=", "DiAfkir"));
    return onSnapshot(q, callback);
};
export const listenToPeminjaman = (callback) => listenToCollection(peminjamanCollection, "timestampPinjam", "desc", callback);
export const listenToAfkir = (callback) => listenToCollection(afkirCollection, "afkirTimestamp", "desc", callback);

export const listenToAlatHistory = (alatId, callback) => {
    // Buat referensi dokumen jenis alat lalu ambil subcollection "history" dari dokumen itu
    const docRef = doc(alatCollection, alatId);
    const historyRef = collection(docRef, "history");
    const q = query(historyRef, orderBy("timestamp", "desc"));
    return onSnapshot(q, callback, (error) => console.error(`Error listening to history for ${alatId}:`, error));
};

// Listener untuk history per unit individual
export const listenToUnitHistory = (unitId, callback) => {
    const unitDocRef = doc(unitAlatCollection, unitId);
    const historyRef = collection(unitDocRef, 'history');
    const q = query(historyRef, orderBy('timestamp', 'desc'));
    return onSnapshot(q, callback, (error) => console.error(`Error listening to unit history for ${unitId}:`, error));
};

// --- NEW: one-time read untuk history jenis alat (fallback / debug) ---
export const getAlatHistoryOnce = async (alatId) => {
    const alatDocRef = doc(db, getCollectionPath('alat'), alatId);
    const historyRef = collection(alatDocRef, 'history');
    const q = query(historyRef, orderBy('timestamp', 'desc'));
    return getDocs(q);
};

// Fungsi untuk mengambil satu dokumen riwayat unit (one-time)
export const getUnitHistoryDoc = async (unitId, historyId) => {
	const unitDocRef = doc(unitAlatCollection, unitId);
	const historyDocRef = doc(collection(unitDocRef, 'history'), historyId);
	return getDoc(historyDocRef);
};

// --- FIRESTORE WRITES ---

// Direvisi total untuk menangani sistem hibrida
export const addAlat = (alatData, unitsToAdd = []) => {
    const batch = writeBatch(db);
    const jenisAlatRef = doc(alatCollection);
    
    // 1. Buat dokumen "Jenis Alat" (template)
    batch.set(jenisAlatRef, { ...alatData, createdAt: serverTimestamp() });

    // 2. Jika individual, buat dokumen untuk setiap "Unit Alat"
    if (alatData.isIndividual && unitsToAdd.length > 0) {
        for (const unit of unitsToAdd) {
            const unitRef = doc(unitAlatCollection);
            batch.set(unitRef, {
                jenisAlatId: jenisAlatRef.id, // Link ke template
                kodeInv: unit.kodeInv,
                status: 'Tersedia', // Status awal
                warna: unit.warna || alatData.warna || '-',
                kondisi: unit.kondisi || alatData.kondisi || '-',
                keterangan: unit.keterangan || alatData.keterangan || '',
            });
        }
    }
    
    return batch.commit();
};

// Fungsi ini sekarang hanya untuk mengedit metadata dari "Jenis Alat"
// Perbaikan: buat dalam transaksi dan catat riwayat jika kondisi berubah
export const updateAlat = (id, data) => {
    const alatRef = doc(alatCollection, id);
    return runTransaction(db, async (transaction) => {
        const alatDoc = await transaction.get(alatRef);
        if (!alatDoc.exists()) throw new Error('Jenis alat tidak ditemukan');
        const prev = alatDoc.data();

        // Update dokumen jenis alat dengan data baru
        transaction.update(alatRef, data);

        // Jika ada perubahan kondisi, catat riwayat di subcollection 'history'
        if (data.kondisi !== undefined && data.kondisi !== prev.kondisi) {
            const historyCol = collection(alatRef, 'history');
            const historyDocRef = doc(historyCol);
            transaction.set(historyDocRef, {
                oldKondisi: prev.kondisi || null,
                newKondisi: data.kondisi,
                note: data.keterangan || '',
                timestamp: serverTimestamp()
            });
        }
    });
};

// Direvisi untuk menangani peminjaman kumulatif dan individual
export const recordPeminjaman = (peminjamanData) => {
    return runTransaction(db, async (transaction) => {
        // Verifikasi ketersediaan stok/unit untuk setiap item
        for (const item of peminjamanData.items) {
            if (item.unitId) {
                // Verifikasi unit individual
                const unitRef = doc(unitAlatCollection, item.unitId);
                const unitDoc = await transaction.get(unitRef);
                
                if (!unitDoc.exists()) {
                    throw new Error(`Unit dengan ID ${item.unitId} tidak ditemukan`);
                }
                if (unitDoc.data().status !== 'Tersedia') {
                    throw new Error(`Unit ${unitDoc.data().kodeInv} sedang dipinjam`);
                }
            } else {
                // Verifikasi stok kumulatif
                const alatRef = doc(alatCollection, item.alatId);
                const alatDoc = await transaction.get(alatRef);
                
                if (!alatDoc.exists()) {
                    throw new Error(`Alat dengan ID ${item.alatId} tidak ditemukan`);
                }
                const currentStok = alatDoc.data().stok || 0;
                if (currentStok < item.jumlah) {
                    throw new Error(`Stok ${alatDoc.data().nama} tidak mencukupi (tersedia: ${currentStok})`);
                }
            }
        }

        // Buat dokumen peminjaman
        const peminjamanRef = doc(peminjamanCollection);
        transaction.set(peminjamanRef, {
            ...peminjamanData,
            id: peminjamanRef.id,
            timestampPinjam: serverTimestamp()
        });

        // Update status dan stok alat
        for (const item of peminjamanData.items) {
            if (item.unitId) {
                // Update status unit individual
                const unitRef = doc(unitAlatCollection, item.unitId);
                transaction.update(unitRef, {
                    status: 'Dipinjam',
                    lastPeminjamanId: peminjamanRef.id
                });
            } else {
                // Update stok alat kumulatif
                const alatRef = doc(alatCollection, item.alatId);
                transaction.update(alatRef, {
                    stok: increment(-item.jumlah)
                });
            }
        }

        return peminjamanRef.id;
    });
};

// Direvisi untuk menangani pengembalian kumulatif dan individual
export const markAsReturned = async (peminjamanId) => {
    const peminjamanDoc = await getPeminjamanDoc(peminjamanId);
    if (!peminjamanDoc.exists()) throw new Error("Dokumen peminjaman tidak ditemukan!");

    const peminjamanData = peminjamanDoc.data();
    const batch = writeBatch(db);
    
    // 1. Update status dokumen peminjaman
    batch.update(peminjamanDoc.ref, { status: 'Kembali', timestampKembali: serverTimestamp() });

    // 2. Kembalikan stok / ubah status unit
    for (const item of peminjamanData.items) {
        if (item.unitId) { // Item individual
            const unitRef = doc(unitAlatCollection, item.unitId);
            batch.update(unitRef, { status: 'Tersedia' });
        } else { // Item kumulatif
            const alatRef = doc(alatCollection, item.alatId);
            batch.update(alatRef, { stok: increment(item.jumlah) });
        }
    }
    return batch.commit();
};

// Direvisi: Saat ini hanya menangani afkir untuk barang kumulatif
// (Logika afkir barang individual perlu alur UI yang berbeda)
export const processAfkir = (id, jumlah, alasan) => {
    const alatRef = doc(alatCollection, id);
    return runTransaction(db, async (transaction) => {
        const alatDoc = await transaction.get(alatRef);
        if (!alatDoc.exists()) throw new Error("Dokumen jenis alat tidak ditemukan!");

        const alatData = alatDoc.data();
        if (alatData.isIndividual) {
            throw new Error("Afkir untuk item individual harus dilakukan per unit.");
        }
        if (jumlah > alatData.stok) throw new Error("Jumlah afkir melebihi stok yang tersedia.");

        transaction.update(alatRef, { stok: alatData.stok - jumlah });

        const { stok, ...restOfAlatData } = alatData;
        const afkirData = {
            ...restOfAlatData,
            originalAlatId: id,
            jumlahDiAfkir: jumlah,
            alasan,
            afkirTimestamp: serverTimestamp(),
            tipeAfkir: 'kumulatif'
        };
        transaction.set(doc(afkirCollection), afkirData);
    });
};

// Menghapus seluruh history afkir setelah backup
export const clearAfkirHistory = async () => {
    const batch = writeBatch(db);
    const snapshot = await getDocs(afkirCollection);
    
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    return true;
};
// Menghapus seluruh history kegiatan (latihan)
export const clearKegiatanHistory = async () => {
    const batch = writeBatch(db);
    // Gunakan referensi koleksi latihan
    const snapshot = await getDocs(latihanCollection); 
    
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    return true;
};

// Tambah riwayat untuk unit individual + update kondisi unit
export const addUnitHistory = (unitId, entry) => {
    const unitRef = doc(unitAlatCollection, unitId);
    const historyCol = collection(unitRef, 'history');
    return runTransaction(db, async (transaction) => {
        const unitDoc = await transaction.get(unitRef);
        if (!unitDoc.exists()) throw new Error('Unit tidak ditemukan');
        const historyDocRef = doc(historyCol);
        transaction.set(historyDocRef, { 
            ...entry,
            timestamp: serverTimestamp()
        });
        // Update kondisi unit ke kondisi baru
        if (entry.newKondisi) {
            transaction.update(unitRef, { kondisi: entry.newKondisi });
        }
    });
};

export const updateUnitHistory = (unitId, historyId, data) => {
    const unitRef = doc(unitAlatCollection, unitId);
    const historyDocRef = doc(collection(unitRef, 'history'), historyId);
    return runTransaction(db, async (transaction) => {
        const histDoc = await transaction.get(historyDocRef);
        if (!histDoc.exists()) throw new Error('Riwayat tidak ditemukan');
        transaction.update(historyDocRef, { ...data });
        if (data.newKondisi) {
            transaction.update(unitRef, { kondisi: data.newKondisi });
        }
    });
};

// Tambah riwayat untuk jenis alat (alat kumulatif)
export const addAlatHistory = (alatId, entry) => {
    const alatRef = doc(alatCollection, alatId);
    const historyCol = collection(alatRef, 'history');
    return runTransaction(db, async (transaction) => {
        const alatDoc = await transaction.get(alatRef);
        if (!alatDoc.exists()) throw new Error('Jenis alat tidak ditemukan');
        const historyDocRef = doc(historyCol);
        transaction.set(historyDocRef, {
            ...entry,
            timestamp: serverTimestamp()
        });
        // Update kondisi jenis alat jika ada newKondisi
        if (entry.newKondisi) {
            transaction.update(alatRef, { kondisi: entry.newKondisi });
        }
    });
};

// Update riwayat jenis alat dan (opsional) update kondisi jenis alat
export const updateAlatHistory = (alatId, historyId, data) => {
    const alatRef = doc(alatCollection, alatId);
    const historyDocRef = doc(collection(alatRef, 'history'), historyId);
    return runTransaction(db, async (transaction) => {
        const histDoc = await transaction.get(historyDocRef);
        if (!histDoc.exists()) throw new Error('Riwayat tidak ditemukan');
        transaction.update(historyDocRef, { ...data });
        if (data.newKondisi) {
            transaction.update(alatRef, { kondisi: data.newKondisi });
        }
    });
};

// Fungsi untuk mengatur ulang kode INV (perbaikan grouping & batching)
export const reorderAllKodeINV = async () => {
    // Ambil semua unit beserta data jenis alatnya
    const unitSnap = await getDocs(unitAlatCollection);
    const allUnits = [];
    unitSnap.forEach(d => allUnits.push({ id: d.id, ...d.data() }));

    // Ambil semua jenis alat untuk mapping merk dan nama
    const alatSnap = await getDocs(alatCollection);
    const alatMap = {};
    alatSnap.forEach(d => alatMap[d.id] = d.data());

    // Grouping: per jenisAlatId, merk, tahun
    const grouped = {};
    allUnits.forEach(unit => {
        const jenis = alatMap[unit.jenisAlatId] || {};
        const merk = jenis.merk || 'TanpaMerk';
        const tahun = (unit.kodeInv && unit.kodeInv.split('-')[1]) || (jenis.tahunPembelian ? String(jenis.tahunPembelian).slice(-2) : '00');
        const key = `${unit.jenisAlatId}::${merk}::${tahun}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(unit);
    });

    // Penomoran ulang per grup
    const MAX_BATCH = 400;
    let batch = writeBatch(db);
    let opsInBatch = 0;

    const commitBatch = async () => {
        if (opsInBatch === 0) return;
        await batch.commit();
        batch = writeBatch(db);
        opsInBatch = 0;
    };

    for (const key of Object.keys(grouped)) {
        const units = grouped[key];
        // Urutkan berdasarkan kodeInv lama (jika ada), lalu beri nomor baru
        units.sort((a, b) => {
            const na = parseInt((a.kodeInv || '').split('-')[2] || '0', 10) || 0;
            const nb = parseInt((b.kodeInv || '').split('-')[2] || '0', 10) || 0;
            return na - nb;
        });

        // Ambil prefix dari nama alat menggunakan sistem yang sama dengan generateKodeINV
        const jenis = alatMap[units[0].jenisAlatId] || {};
        const namaAlat = jenis.nama || 'UNK';
        const words = namaAlat.trim().split(/\s+/);
        let namaPrefix = '';
        
        if (words.length === 1) {
            namaPrefix = words[0].substring(0, 3).toUpperCase();
        } else if (words.length === 2) {
            namaPrefix = (words[0].charAt(0) + words[1].charAt(0) + words[0].charAt(1)).toUpperCase();
        } else {
            namaPrefix = words.slice(0, 3).map(word => word.charAt(0)).join('').toUpperCase();
        }
        
        namaPrefix = namaPrefix.substring(0, 3).padEnd(3, 'X');
        const merk = jenis.merk || 'TanpaMerk';
        const tahun = key.split('::')[2];

        for (let i = 0; i < units.length; i++) {
            const newNumber = String(i + 1).padStart(4, '0');
            const newKode = `${namaPrefix}-${tahun}-${newNumber}`;
            if (units[i].kodeInv !== newKode) {
                batch.update(doc(unitAlatCollection, units[i].id), { kodeInv: newKode });
                opsInBatch++;
            }
            if (opsInBatch >= MAX_BATCH) await commitBatch();
        }
    }
    await commitBatch();
    return true;
};

// Fungsi untuk menambahkan user admin ke koleksi /users/{uid}
export const addAdminUser = async (uid, username, email) => {
    // Pastikan hanya admin yang boleh memanggil ini (validasi di rules)
    const userDocRef = doc(db, "users", uid);
    await updateDoc(userDocRef, {
        username: username,
        email: email,
        role: "admin"
    });
    return true;
};

// Tambahan: fungsi one-time read untuk history unit (debugging / fallback)
export const getUnitHistoryOnce = async (unitId) => {
    const unitDocRef = doc(unitAlatCollection, unitId);
    const historyRef = collection(unitDocRef, 'history');
    const q = query(historyRef, orderBy('timestamp', 'desc'));
    return getDocs(q);
};

// --- TRAINING FUNCTIONS ---
export const listenToKegiatan = (callback) => listenToCollection(latihanCollection, "tanggalKegiatan", "desc", callback);

// Client-side transactional fallback for recording latihan + applying stock/status changes.
// This allows the web app to work without deploying Cloud Functions. It will create the
// latihan document and, inside a transaction, verify & update unit/alat documents and
// append simple history entries. NOTE: for production you may prefer server-side
// processing (Cloud Functions) for stronger security.
export const recordKegiatan = async (latihanData) => {
    // Kegiatan usage does NOT affect alat stock or unit status.
    // Only record the latihan event and append history if needed.
    return runTransaction(db, async (transaction) => {
        const latihanRef = doc(latihanCollection);
        const items = latihanData.items || [];

        // 1) Read all referenced docs first (for validation and history)
        const readEntries = [];
        for (const item of items) {
            if (item.isIndividual) {
                if (!item.unitId) throw new Error('Missing unitId for individual item');
                const unitRef = doc(unitAlatCollection, item.unitId);
                const unitSnap = await transaction.get(unitRef);
                readEntries.push({ type: 'unit', item, ref: unitRef, snap: unitSnap });
            } else {
                if (!item.jenisAlatId) throw new Error('Missing jenisAlatId for cumulative item');
                const alatRef = doc(alatCollection, item.jenisAlatId);
                const alatSnap = await transaction.get(alatRef);
                readEntries.push({ type: 'alat', item, ref: alatRef, snap: alatSnap });
            }
        }

        // 2) Validate reads
        for (const r of readEntries) {
            if (!r.snap.exists()) {
                if (r.type === 'unit') throw new Error(`Unit ${r.item.unitId} not found`);
                else throw new Error(`Jenis alat ${r.item.jenisAlatId} not found`);
            }
            // For latihan, do NOT check status/stok, just ensure existence
        }

        // 3) Writes: create latihan doc, and write histories (optional)
        const latihanPayload = { ...latihanData, id: latihanRef.id, timestamp: serverTimestamp() };
        transaction.set(latihanRef, latihanPayload);

        for (const r of readEntries) {
            if (r.type === 'unit') {
                // Optionally append history entry for latihan usage
                const historyRef = doc(collection(r.ref, 'history'));
                transaction.set(historyRef, { note: 'Digunakan untuk latihan', timestamp: serverTimestamp(), jenis: 'latihan', latihanId: latihanRef.id });
            } else {
                // Optionally append history entry for cumulative alat
                const jumlah = Math.max(0, parseInt(r.item.jumlah || 0, 10));
                const historyRef = doc(collection(r.ref, 'history'));
                transaction.set(historyRef, { note: `Dipakai untuk latihan (${jumlah})`, jumlah: jumlah, timestamp: serverTimestamp(), jenis: 'latihan', latihanId: latihanRef.id });
            }
        }

        return latihanRef.id;
    });
};

export const getKegiatanDoc = (id) => getDoc(doc(latihanCollection, id));
