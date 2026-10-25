# 🎓 Sistem Informasi Penilaian Praktikum (Web Dashboard & Google Drive)

> **Web Dashboard Penilaian Praktikum Terstruktur, Objektif, Transparan, dan Terukur untuk Co.Ass, Praktikan, dan Developer/Koordinator dengan Database Google Drive (`juzantiara@gmail.com`).**

---

## 📌 Fitur Unggulan Sistem

1. **Nama & Identitas Praktikum Dinamis**:
   - Judul praktikum, subjudul, nama fakultas/institusi, semester, tahun ajaran, dan jumlah acara (Acara 1 hingga Acara N) dapat diatur secara fleksibel oleh Developer/Koordinator.
2. **Multi-Role Authentication**:
   - **Developer / Koordinator (`juzantiara@gmail.com`)**: Mengatur jumlah Co.Ass, membuatkan kode login khusus unik untuk tiap Co.Ass, menentukan daftar praktikan (Nama dan NIM), mengatur bobot penilaian, mengaudit seluruh input nilai, dan mengontrol sinkronisasi ke Google Drive.
   - **Co.Ass (Course Assistant)**: Login menggunakan **Kode Login Khusus** (tanpa password rumit), menilai praktikan bimbingannya berdasarkan 15 indikator rubrik objektif, mengisi checklist live, mencatat kehadiran, dan mencatat riwayat konsultasi serta revisi laporan.
   - **Praktikan (Mahasiswa)**: Login transparan hanya dengan **Nama dan NIM**, melihat rincian nilai laporan, video, performa, sikap, responsi, format, K3, riwayat revisi, formula perhitungan nilai akhir, serta mencetak **Kartu Hasil Praktikum (KHP)**.
3. **Database Google Drive (`juzantiara@gmail.com`)**:
   - Terhubung langsung dengan Google Spreadsheet di Google Drive milik email Anda menggunakan Google Apps Script Backend (`Code.gs`).
   - 100% Online, gratis 24/7, tanpa biaya hosting database.
   - Dilengkapi fallback penyimpanan lokal (*Local Storage*) dan fitur ekspor multi-sheet ke Microsoft Excel (`.xlsx`).
4. **Implementasi Lengkap 15 Butir Penilaian Resmi**:
   - Identitas praktikan lengkap (No, Nama, NIM, Kelompok, Shift, Co.Ass).
   - 10 Indikator Penilaian Laporan Per Acara (bobot total 100%).
   - 8 Indikator Penilaian Video Per Acara (mendukung penandaan *Tidak Berlaku / N/A* tanpa menurunkan rata-rata).
   - 12 Indikator Checklist Performa Praktikum teramati langsung.
   - 8 Indikator Sikap dan Kemauan Belajar berbasis bukti nyata.
   - 10 Checklist Penilaian Format Laporan (terpisah dari substansi).
   - Log Kehadiran Praktikum (Hadir, Izin, Sakit, Alpa, Terlambat).
   - Riwayat Konsultasi Laporan (Tanggal, materi, catatan revisi, status penyelesaian).
   - 8 Indikator Penilaian Responsi Teori dan Praktik.
   - 7 Indikator Keselamatan Kerja (K3) dan Kedisiplinan.
   - Skala Rubrik 0–100 (A, B, C, D, E) dengan deskripsi kriteria jelas.
   - Rekapitulasi nilai komprehensif seluruh komponen.
   - Pembobotan proporsional dinamis (total efektif selalu tepat 100%).
   - Checklist live interaktif untuk Co.Ass saat praktikum berlangsung.
   - Format output A–M, ekspor Excel, dan layout cetak resmi siap tanda tangan.

---

## 🔑 Akun & Kredensial Uji Coba Cepat (Demo Mode)

Aplikasi telah dilengkapi dengan data awal (*seed data*) sehingga dapat langsung diuji coba:

### 1. Developer / Koordinator (Akses Penuh)
- **Email Database**: `juzantiara@gmail.com`
- **PIN Koordinator**: `gigikuPutih@354`
- *Kemampuan*: Mengatur Co.Ass, import/export data praktikan dari/ke file Excel (.xlsx), mengubah bobot penilaian, mengubah nama praktikum, dan mengelola Google Drive.

### 2. Co.Ass (Course Assistant) - Sistem Bergilir Seluruh Kelompok (Tanpa Shift)
Gunakan salah satu **Kode Login Khusus** berikut:
| No | Nama Co.Ass | Kode Login Khusus | Penugasan Kelompok |
|---|---|---|---|
| 1 | **Justiar Noer** | `COASS-TIARA-01` | Kelompok 1 - 8 (Sistem Bergilir) |
| 2 | **Ismail Qori Pohan S.T** | `COASS-7WRV-2` | Kelompok 1 - 8 (Sistem Bergilir) |
| 3 | **Abel Ramadhan** | `COASS-281U-3` | Kelompok 1 - 8 (Sistem Bergilir) |
| 4 | **M. Fathur Rohman** | `COASS-GLX2-4` | Kelompok 1 - 8 (Sistem Bergilir) |

*Catatan: Seluruh Co.Ass dapat menilai dan mengedit praktikan di seluruh kelompok secara fleksibel pada setiap acara.*

### 3. Praktikan (Mahasiswa)
Login menggunakan kombinasi Nama dan NIM berikut:
| Nama Praktikan | NIM | Kelompok | Co.Ass Pembimbing |
|---|---|---|---|
| `Aditya Pratama` | `230101001` | Kelompok 1 | Tiara Juzan, S.Si. |
| `Bella Safitri` | `230101002` | Kelompok 1 | Tiara Juzan, S.Si. |
| `Cahyo Nugroho` | `230101003` | Kelompok 2 | Tiara Juzan, S.Si. |
| `Dina Kartika` | `230101004` | Kelompok 2 | Tiara Juzan, S.Si. |
| `Eko Prasetyo` | `230101005` | Kelompok 3 | Ahmad Fauzi, S.T. |
| `Farida Hidayah` | `230101006` | Kelompok 3 | Ahmad Fauzi, S.T. |
| `Gilang Ramadhan` | `230101007` | Kelompok 4 | Siti Rahmawati, S.Si. |
| `Hesti Wulandari` | `230101008` | Kelompok 4 | Siti Rahmawati, S.Si. |

---

## 📐 Formula & Mekanisme Pembobotan Proporsional

### 1. Bobot Dasar Resmi
- Rata-rata Laporan Seluruh Acara: **35%**
- Rata-rata Video Acara yang Mewajibkan: **10%**
- Performa Praktikan: **15%**
- Kemauan & Sikap Belajar: **10%**
- Responsi: **20%**
- Format Laporan (Teknis): **5%**
- Kedisiplinan & Keselamatan Kerja (K3): **5%**
- **Total Bobot Dasar: 100%**

$$\text{Nilai Akhir} = (0.35 \times \text{Lap}) + (0.10 \times \text{Vid}) + (0.15 \times \text{Perf}) + (0.10 \times \text{Sik}) + (0.20 \times \text{Resp}) + (0.05 \times \text{Fmt}) + (0.05 \times \text{K3})$$

### 2. Mekanisme Penyesuaian Bobot Proporsional (Jika Video N/A)
Jika praktikum atau seluruh acara tidak mewajibkan video (komponen video = $0\%$), sistem tidak menganggap nilainya 0 yang merugikan praktikan, melainkan menghitung bobot efektif baru:

$$W_i^* = \frac{W_i}{\sum_{\text{komponen aktif}} W} \times 100\%$$

*Contoh Reditribusi jika Video N/A (Total bobot aktif = 90%):*
- Laporan: $\frac{35}{90} \times 100\% = 38.89\%$
- Performa: $\frac{15}{90} \times 100\% = 16.67\%$
- Sikap: $\frac{10}{90} \times 100\% = 11.11\%$
- Responsi: $\frac{20}{90} \times 100\% = 22.22\%$
- Format: $\frac{5}{90} \times 100\% = 5.56\%$
- K3: $\frac{5}{90} \times 100\% = 5.56\%$
- **Total Bobot Efektif Tetap Tepat 100.0%**.

---

## 🗂️ Struktur File Proyek

```text
sistem-penilaian-praktikum/
│
├── index.html                   # Halaman web dashboard utama (Tailwind CSS, SheetJS, Lucide)
├── app.js                       # Logika bisnis, autentikasi multi-role, rumus bobot, integrasi cloud
├── data-seed.js                 # Data awal konfigurasi, indikator rubrik, co.ass, dan praktikan
├── logo-base64.js               # Data Base64 logo resmi INSTIPER Yogyakarta (Fallback aman)
├── logo-instiper.png            # File logo resmi INSTIPER Yogyakarta (Transparan, tajam & rapi)
├── serve.ps1                    # Skrip lokal server PowerShell untuk pengujian di komputer lokal
├── README.md                    # Dokumentasi lengkap sistem
│
└── google-apps-script/
    ├── Code.gs                  # Kode backend Apps Script untuk Google Sheets di Drive juzantiara@gmail.com
    └── PANDUAN_SETUP_GOOGLE_DRIVE.md # Panduan langkah demi langkah koneksi Google Drive
```

---

## 🚀 Cara Menjalankan Secara Lokal

1. **Cara Paling Praktis**:
   - Cukup buka file `index.html` dengan melakukan klik ganda (*double click*) di File Explorer untuk langsung membukanya di browser Google Chrome, Edge, atau Firefox.
2. **Atau Menggunakan PowerShell Local Server**:
   - Buka PowerShell di folder proyek ini, lalu jalankan:
     ```powershell
     .\serve.ps1
     ```
   - Server lokal akan aktif pada `http://localhost:8080/index.html`.

---

## 🌐 Cara Publish Web Agar Dapat Diakses Siapa Saja Secara Publik

Aplikasi ini dibuat murni menggunakan arsitektur web modern statis berbasis *Single Page Application* yang tidak memerlukan server backend khusus (karena database ditangani langsung oleh Google Drive Anda):

1. **Opsi 1: GitHub Pages (Gratis & Populer)**
   - Buat repositori baru di GitHub.
   - Unggah file `index.html`, `app.js`, dan `data-seed.js`.
   - Buka menu **Settings** > **Pages** > pilih branch **main** > klik **Save**.
   - Website langsung dapat diakses publik oleh seluruh Co.Ass dan praktikan dari seluruh dunia!

2. **Opsi 2: Vercel / Netlify (Instan 10 Detik)**
   - Buka [Netlify Drop](https://app.netlify.com/drop).
   - Tarik (*drag & drop*) folder `sistem-penilaian-praktikum`.
   - Website langsung online dengan tautan publik gratis.

---

## ☁️ Menghubungkan ke Google Drive (`juzantiara@gmail.com`)

Ikuti panduan lengkap pada [PANDUAN_SETUP_GOOGLE_DRIVE.md](file:///C:/Users/FSOS/.gemini/antigravity/scratch/sistem-penilaian-praktikum/google-apps-script/PANDUAN_SETUP_GOOGLE_DRIVE.md).
Secara garis besar:
1. Buat spreadsheet baru di Google Drive `juzantiara@gmail.com`.
2. Buka menu **Ekstensi** > **Apps Script**, lalu salin seluruh isi [Code.gs](file:///C:/Users/FSOS/.gemini/antigravity/scratch/sistem-penilaian-praktikum/google-apps-script/Code.gs).
3. Jalankan fungsi `setupDatabase()` satu kali untuk membuat 15 lembar kerja database secara otomatis.
4. Klik **Deploy** > **Penerapan Baru** > jenis **Aplikasi Web** (Akses: Siapa saja).
5. Salin tautan Web App URL dan tempelkan ke menu **Pengaturan & Drive** pada Dashboard Web.
6. Seluruh Co.Ass dan Praktikan yang mengakses web akan otomatis tersinkronisasi langsung dengan spreadsheet Google Drive Anda!
