<div align="center">
  
# =============================================
# 🔴 SISTEM LOGISTIK MAPALAST 🔴
# =============================================
  
### APLIKASI WEB INVENTARIS HIBRIDA (UNIT & STOK)
  
</div>

Aplikasi ini adalah sistem manajemen aset yang dirancang untuk melacak peralatan organisasi MAPALAST secara *real-time* menggunakan Firebase.

<br>

<div align="center">

| 💾 TEKNOLOGI INTI 💾 | Detail |
| :--- | :--- |
| **Frontend** | JavaScript (ES Modules) + HTML5 |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) |
| **Backend** | Firebase Firestore & Auth |
| **Tools** | jsPDF & SheetJS (XLSX Export) |
</div>

---

## ✨ FITUR UTAMA APLIKASI

### 1. ADMIN DASHBOARD (`/index.html`)

* **Inventaris Hibrida:** Melacak **Individual** (Kode INV) dan **Kumulatif** (stok).
* **Transaksi Aman:** Menggunakan Firebase Transactions untuk peminjaman dan afkir.
* **Riwayat Kondisi:** Mencatat riwayat perubahan kondisi pada unit/alat.
* **Keamanan Sesi:** Dilengkapi *idle timer* yang akan melakukan *logout* otomatis setelah 1 jam.

### 2. PUBLIC LOGGING (`/public-kegiatan.html`)

* **Catatan Kegiatan:** Halaman yang dapat diakses oleh anggota atau publik untuk mencatat penggunaan alat untuk latihan.

---
## 💻 STRUKTUR ARSITEKTUR

<div align="center">

| File/Folder | Peran | Deskripsi |
| :--- | :--- | :--- |
| `js/services.js` | **Data Layer** | Komunikasi Real-time (CRUD/Transaksi) dengan Firebase. |
| `js/main.js` | **Controller** | Logika aplikasi inti, inisialisasi *listeners*, dan *event handling*. |
| `js/ui.js` | **UI/Renderer** | Mengelola tampilan, modal, notifikasi, dan rendering daftar. |
| `firebase-config.js` | **Config** | Detail kredensial Firebase Project. |

</div>

---

## ⚙️ PANDUAN SETUP & AKSES

<div align="center">

### === DIBUTUHKAN UNTUK MENJALANKAN ===

</div>

1.  **Kloning Repositori:**
    ```bash
    git clone [https://github.com/Sticcboi/LOGISTIK-MAPALAST]
    ```

2.  **Konfigurasi Database:**
    Pastikan Anda telah mengisi kredensial Firebase di `firebase-config.js` dan **Security Rules** Firestore sudah di-*deploy*.

3.  **Akses Antarmuka:**
    Buka proyek menggunakan server lokal (disarankan) atau langsung buka file HTML:
    
<div align="center">

| Antarmuka | File | Akses |
| :--- | :--- | :--- |
| **Admin Dashboard** | `/index.html` | Membutuhkan Login Admin |
| **Catat Kegiatan** | `/public-kegiatan.html` | Publik (Tidak Perlu Login) |

</div>

---

## 📞 KONTAK / CONTACT PERSON

Jika Anda menemukan kendala, *bug*, atau memiliki pertanyaan terkait aplikasi ini, **silakan hubungi**:

<div align="center">

## MP

</div>

<div align="center">

# =============================================

</div>
