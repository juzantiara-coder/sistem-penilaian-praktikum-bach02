/**
 * DATA SEED & INITIAL CONFIGURATION
 * Sistem Penilaian Praktikum Berbasis Google Drive & Web
 * Email Developer / Database Owner: juzantiara@gmail.com
 */

const DEFAULT_CONFIG = {
  courseTitle: "Sistem Penilaian Praktikum",
  courseSubtitle: "Sistem Penilaian Terstruktur, Objektif & Transparan",
  institution: "INSTITUT PERTANIAN STIPER (INSTIPER) YOGYAKARTA",
  academicYear: "2026/2027",
  semester: "Gasal",
  developerEmail: "juzantiara@gmail.com",
  developerPin: "gigikuPutih@354",
  googleAppsScriptUrl: "https://script.google.com/macros/s/AKfycbyaNqIn49GOSGIYPjmU1YVEWke6sknEme90dp-JGJA2Dmkh9SjVRdVUhCODXxigPKo4/exec", // URL Web App Google Apps Script di drive juzantiara@gmail.com
  selectedSignerKoordinatorId: "koor-develob",
  syncAuto: true,
  weights: {
    laporan: 35,       // Rata-rata Laporan: 35%
    video: 10,         // Rata-rata Video: 10%
    performa: 15,      // Performa Praktikan: 15%
    sikap: 10,         // Kemauan & Sikap Belajar: 10%
    responsi: 20,      // Responsi: 20%
    formatLaporan: 5,  // Format Laporan: 5%
    k3Kedisiplinan: 5  // Kedisiplinan & K3: 5%
  },
  // Total default = 100%
  gradeBoundaries: [
    { min: 90, grade: "A", label: "Sangat Baik", color: "emerald" },
    { min: 80, grade: "B", label: "Baik", color: "blue" },
    { min: 70, grade: "C", label: "Cukup Baik", color: "amber" },
    { min: 60, grade: "D", label: "Kurang", color: "orange" },
    { min: 0,  grade: "E", label: "Sangat Kurang", color: "rose" }
  ]
};

// Daftar Acara Praktikum Dinamis
const DEFAULT_ACARA = [
  {
    id: 1,
    code: "ACARA-1",
    nama: "Acara 1: Pengenalan Alat, Bahan & K3 Laboratorium",
    wajibVideo: true,
    deskripsi: "Pemahaman prosedur keselamatan kerja dan kalibrasi alat ukur dasar."
  },
  {
    id: 2,
    code: "ACARA-2",
    nama: "Acara 2: Teknik Pengukuran, Sampling & Analisis Data",
    wajibVideo: false,
    deskripsi: "Metode preparasi sampel dan pengolahan data statistik hasil praktikum."
  },
  {
    id: 3,
    code: "ACARA-3",
    nama: "Acara 3: Uji Karakteristik & Reaktivitas Sampel",
    wajibVideo: true,
    deskripsi: "Pengamatan reaksi, pencatatan fenomena fisik, dan dokumentasi visual."
  },
  {
    id: 4,
    code: "ACARA-4",
    nama: "Acara 4: Sintesis, Purifikasi & Pemodelan Matematis",
    wajibVideo: false,
    deskripsi: "Perhitungan neraca massa/energi dan analisis grafik hasil pengamatan."
  },
  {
    id: 5,
    code: "ACARA-5",
    nama: "Acara 5: Proyek Terpadu & Validasi Metode",
    wajibVideo: true,
    deskripsi: "Penyusunan proyek mini mandiri dan presentasi video hasil investigasi."
  }
];

// Indikator Penilaian Laporan (Cukup Indikator 1 s/d 3 sesuai permintaan)
const INDIKATOR_LAPORAN = [
  { id: "lap_1", nama: "1. Kelengkapan isi laporan", bobot: 35, rubrik: "Seluruh bab, lampiran, dan format wajib ada dan lengkap." },
  { id: "lap_2", nama: "2. Kesesuaian dengan format laporan yang ditentukan", bobot: 35, rubrik: "Mengikuti template resmi, cover, font, margin, dan penomoran." },
  { id: "lap_3", nama: "3. Ketepatan teori dan dasar pustaka", bobot: 30, rubrik: "Kajian pustaka mutakhir, relevan dengan acara, bukan copas." }
];

// Indikator Penilaian Video (Cukup Indikator 1 dan 2 sesuai permintaan)
const INDIKATOR_VIDEO = [
  { id: "vid_1", nama: "1. Kesesuaian isi dengan tujuan praktikum", bobot: 50, rubrik: "Substansi video mencakup seluruh tahapan penting acara." },
  { id: "vid_2", nama: "2. Ketepatan penjelasan prosedur", bobot: 50, rubrik: "Langkah kerja dipaparkan dengan benar sesuai SOP laboratorium." }
];

// Indikator Penilaian Performa Praktikan (Cukup Indikator 1, 7, dan 8 sesuai permintaan)
const INDIKATOR_PERFORMA = [
  { id: "perf_1", nama: "1. Kesiapan alat, bahan, dan perlengkapan", kategori: "Kesiapan", bobot: 33.33 },
  { id: "perf_7", nama: "7. Kerja sama dalam kelompok", kategori: "Sikap Kerja", bobot: 33.33 },
  { id: "perf_8", nama: "8. Tanggung jawab terhadap tugas", kategori: "Sikap Kerja", bobot: 33.34 }
];

// Indikator Penilaian Kemauan dan Sikap Belajar (Cukup Indikator 1 dan 3 sesuai permintaan)
const INDIKATOR_SIKAP = [
  { id: "sik_1", nama: "1. Inisiatif mempelajari materi sebelum praktikum", bobot: 50 },
  { id: "sik_3", nama: "3. Kesungguhan memperbaiki kesalahan", bobot: 50 }
];

// Indikator Penilaian Format Laporan (Cukup Indikator 1, 5, dan 8 sesuai permintaan)
const INDIKATOR_FORMAT = [
  { id: "fmt_1", nama: "1. Struktur laporan sesuai pedoman", bobot: 35 },
  { id: "fmt_5", nama: "5. Penulisan tabel dan gambar", bobot: 35 },
  { id: "fmt_8", nama: "8. Sitasi dan daftar pustaka", bobot: 30 }
];

// Indikator Penilaian Responsi (Cukup Indikator 1 dan 5 sesuai permintaan)
const INDIKATOR_RESPONSI = [
  { id: "resp_1", nama: "1. Penguasaan teori", bobot: 50 },
  { id: "resp_5", nama: "5. Ketepatan menjawab pertanyaan", bobot: 50 }
];

// Indikator Tambahan: Penilaian Kedisiplinan (Cukup Indikator 2 dan 4 sesuai permintaan)
const INDIKATOR_K3 = [
  { id: "k3_2", nama: "2. Ketepatan waktu pengumpulan seluruh tugas", bobot: 50 },
  { id: "k3_4", nama: "4. Kontribusi individu dalam kerja kelompok", bobot: 50 }
];

// Default Akun Koordinator / Dosen Pembimbing (Dospem) Sesuai Gambar User
const DEFAULT_KOORDINATOR = [
  {
    id: "koor-develob",
    username: "develob",
    password: "gigikuPutih@354",
    nama: "Justiar Noer",
    roleJabatan: "Koordinator",
    email: "juzantiara@gmail.com"
  },
  {
    id: "koor-dospem",
    username: "dospem",
    password: "gigikuPutih@354",
    nama: "Rengga Arnalis Renjani, S.T.P., M.Si.",
    roleJabatan: "Dosen Pembimbing",
    email: "juzantiara@gmail.com"
  },
  {
    id: "koor-ismail",
    username: "ismail qori pohan",
    password: "Sarjana teknik@332",
    nama: "Ismail Qori Pohan S.T",
    roleJabatan: "Koordinator",
    email: "juzantiara@gmail.com"
  },
  {
    id: "koor-default-fallback",
    username: "koordinator",
    password: "gigikuPutih@354",
    nama: "Justiar Noer",
    roleJabatan: "Koordinator",
    email: "juzantiara@gmail.com"
  }
];

// Default Data Co.Ass (dengan Kode Login Khusus tiap Co.Ass - Sistem Bergilir Seluruh Kelompok)
const DEFAULT_COASS = [
  {
    id: "coass-tiara-1",
    nama: "Justiar Noer",
    email: "juzantiara@gmail.com",
    kodeLogin: "COMETOALLAH",
    role: "Co.Ass Koordinator",
    kelompokBinaan: ["Kelompok 1-8"],
    status: "Aktif",
    kontak: "0812-3456-7890"
  },
  {
    id: "coass-1792987454299-0zk9vy0",
    nama: "Fathur Rohman",
    email: "juzantiara@gmail.com",
    kodeLogin: "COASS-FU7E-6",
    role: "Co.Ass Penilai",
    kelompokBinaan: ["Kelompok 1-8"],
    status: "Aktif",
    kontak: ""
  },
  {
    id: "coass-1792988612595-vqt0sjv",
    nama: "Abel Ramadhan",
    email: "juzantiara@gmail.com",
    kodeLogin: "ABEL RAMADHAN@335",
    role: "Co.Ass Penilai",
    kelompokBinaan: ["Kelompok 1-8"],
    status: "Aktif",
    kontak: ""
  },
  {
    id: "coass-1792989037862-m3n48dp",
    nama: "Ismail Qori Pohan S.T",
    email: "juzantiara@gmail.com",
    kodeLogin: "COASS-4ORH-4",
    role: "Co.Ass Penilai",
    kelompokBinaan: ["Kelompok 1-8"],
    status: "Aktif",
    kontak: ""
  }
];

// Default Data Praktikan (NIM & Nama untuk Login - Tanpa Shift, Sistem Bergilir)
const DEFAULT_PRAKTIKAN = [
    {
        "id":  "prak-1792977715167-0",
        "nim":  "25241001",
        "nama":  "Gracia Livia Arnata Purba",
        "kelompok":  "Kelompok 1",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-1",
        "nim":  "25242036",
        "nama":  "Jessica Lucyana Tampubolon",
        "kelompok":  "Kelompok 1",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-2",
        "nim":  "25245005",
        "nama":  "Maria Yora Siregar",
        "kelompok":  "Kelompok 1",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-3",
        "nim":  "25241003",
        "nama":  "Ediyanto Petrus",
        "kelompok":  "Kelompok 1",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-4",
        "nim":  "25241015",
        "nama":  "Tiar Megan Firdaus",
        "kelompok":  "Kelompok 1",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-5",
        "nim":  "25242006",
        "nama":  "M.Farhan Adi Putra",
        "kelompok":  "Kelompok 1",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-6",
        "nim":  "25242016",
        "nama":  "Yuga Raditya",
        "kelompok":  "Kelompok 1",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-7",
        "nim":  "25242024",
        "nama":  "Nafis Alfarel Fatullah Putra",
        "kelompok":  "Kelompok 1",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-8",
        "nim":  "25242034",
        "nama":  "Carlos Sirait",
        "kelompok":  "Kelompok 1",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-9",
        "nim":  "25244001",
        "nama":  "Abdurrahman Nur Rizqi",
        "kelompok":  "Kelompok 1",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-12",
        "nim":  "25241012",
        "nama":  "Tiara Rahayu",
        "kelompok":  "Kelompok 2",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-13",
        "nim":  "25243001",
        "nama":  "Stefani Diva",
        "kelompok":  "Kelompok 2",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-14",
        "nim":  "25241004",
        "nama":  "Yogi Pratama",
        "kelompok":  "Kelompok 2",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-15",
        "nim":  "25241017",
        "nama":  "Virendra Aftino Nugroho",
        "kelompok":  "Kelompok 2",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-16",
        "nim":  "25242008",
        "nama":  "Aldo Vebrano",
        "kelompok":  "Kelompok 2",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-17",
        "nim":  "25242017",
        "nama":  "Imam Rahmadi",
        "kelompok":  "Kelompok 2",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-18",
        "nim":  "25242025",
        "nama":  "Fredy Wibowo",
        "kelompok":  "Kelompok 2",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-19",
        "nim":  "25242035",
        "nama":  "Germanto Roman Muid",
        "kelompok":  "Kelompok 2",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-20",
        "nim":  "25244003",
        "nama":  "M. Nazlyn Ahalama Iqbal",
        "kelompok":  "Kelompok 2",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-21",
        "nim":  "25245002",
        "nama":  "Joenata Fahqri Satria",
        "kelompok":  "Kelompok 2",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-22",
        "nim":  "24242006",
        "nama":  "Erik Aldi Levi Pratama",
        "kelompok":  "Kelompok 3",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-23",
        "nim":  "25241016",
        "nama":  "Ayu Wandayani",
        "kelompok":  "Kelompok 3",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-24",
        "nim":  "25243004",
        "nama":  "Nickyta Fa\u0027inaya Br.Damanik",
        "kelompok":  "Kelompok 3",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-25",
        "nim":  "25241005",
        "nama":  "Harun Jihadi Hanifah Nasution",
        "kelompok":  "Kelompok 3",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-26",
        "nim":  "25241018",
        "nama":  "Wilman Riswanto Panjaitan",
        "kelompok":  "Kelompok 3",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-27",
        "nim":  "25242009",
        "nama":  "Muhammad Fahmi Asyauqi",
        "kelompok":  "Kelompok 3",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-28",
        "nim":  "25242018",
        "nama":  "Febrian Alkhadafi",
        "kelompok":  "Kelompok 3",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-29",
        "nim":  "25242027",
        "nama":  "Maxy Auto Marend",
        "kelompok":  "Kelompok 3",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-30",
        "nim":  "25242037",
        "nama":  "Dio Erlangga",
        "kelompok":  "Kelompok 3",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-31",
        "nim":  "25244004",
        "nama":  "Dimas Muhammad Rizky Windarto",
        "kelompok":  "Kelompok 3",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-32",
        "nim":  "25241019",
        "nama":  "Naila Muthia Herliza",
        "kelompok":  "Kelompok 4",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-33",
        "nim":  "25243006",
        "nama":  "Vanesya Dwigita Slavina",
        "kelompok":  "Kelompok 4",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-34",
        "nim":  "25241009",
        "nama":  "M. Rizki Puja Rafiqih",
        "kelompok":  "Kelompok 4",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-35",
        "nim":  "25242001",
        "nama":  "Muhammad Bagas Siagian",
        "kelompok":  "Kelompok 4",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-36",
        "nim":  "25242011",
        "nama":  "Wildi Butar Butar",
        "kelompok":  "Kelompok 4",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-37",
        "nim":  "25242019",
        "nama":  "Muhammad Bima Dwiyansyah",
        "kelompok":  "Kelompok 4",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-38",
        "nim":  "25242028",
        "nama":  "Dovan Nofrial",
        "kelompok":  "Kelompok 4",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-39",
        "nim":  "25243002",
        "nama":  "Leo Bagas Nauli Situmeang",
        "kelompok":  "Kelompok 4",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-40",
        "nim":  "25244005",
        "nama":  "Ray Ananda",
        "kelompok":  "Kelompok 4",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-41",
        "nim":  "24242006",
        "nama":  "Erik Aldi Levi Pratama",
        "kelompok":  "Kelompok 5",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-42",
        "nim":  "24241016",
        "nama":  "Borgo Marulian Nasution",
        "kelompok":  "Kelompok 5",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-43",
        "nim":  "25241020",
        "nama":  "Zefanya Ersa Adisti",
        "kelompok":  "Kelompok 5",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-44",
        "nim":  "25243007",
        "nama":  "Wila Anggria Prastia",
        "kelompok":  "Kelompok 5",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-45",
        "nim":  "25241010",
        "nama":  "Yoel Adriano Gultom",
        "kelompok":  "Kelompok 5",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-46",
        "nim":  "25242002",
        "nama":  "Syahrul Mudoffar",
        "kelompok":  "Kelompok 5",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-47",
        "nim":  "25242012",
        "nama":  "Wahyu Wicaksono",
        "kelompok":  "Kelompok 5",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-48",
        "nim":  "25242020",
        "nama":  "M. Bintang Ramadhan",
        "kelompok":  "Kelompok 5",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-49",
        "nim":  "25242029",
        "nama":  "Rianda Josua",
        "kelompok":  "Kelompok 5",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-50",
        "nim":  "25243003",
        "nama":  "Muhammad Farel Ramadhan",
        "kelompok":  "Kelompok 5",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-51",
        "nim":  "25244006",
        "nama":  "Gaudensius Jovando Purnama",
        "kelompok":  "Kelompok 5",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-52",
        "nim":  "25242007",
        "nama":  "Fajar Istari",
        "kelompok":  "Kelompok 6",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-53",
        "nim":  "25244008",
        "nama":  "Fazla Maylaf Fazria",
        "kelompok":  "Kelompok 6",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-54",
        "nim":  "25241011",
        "nama":  "Rully Cahya Saputra",
        "kelompok":  "Kelompok 6",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-55",
        "nim":  "25242003",
        "nama":  "Muhammad Fahlevi Gusrianda",
        "kelompok":  "Kelompok 6",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-56",
        "nim":  "25242013",
        "nama":  "Dika Pratama",
        "kelompok":  "Kelompok 6",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-57",
        "nim":  "25242021",
        "nama":  "Wibi Hanif Maulana",
        "kelompok":  "Kelompok 6",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-58",
        "nim":  "25242030",
        "nama":  "Ilham Santoso",
        "kelompok":  "Kelompok 6",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-59",
        "nim":  "25243005",
        "nama":  "Muhammad Alfen",
        "kelompok":  "Kelompok 6",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-60",
        "nim":  "25244007",
        "nama":  "Eka Tora Syahdani",
        "kelompok":  "Kelompok 6",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-61",
        "nim":  "22222222 Debi Humairoh",
        "nama":  "Kelompok 6",
        "kelompok":  "Kelompok 6",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-62",
        "nim":  "24242006",
        "nama":  "Erik Aldi Levi Pratama",
        "kelompok":  "Kelompok 7",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-63",
        "nim":  "25242026",
        "nama":  "Maria Evta Tabita Siregar",
        "kelompok":  "Kelompok 7",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-64",
        "nim":  "25244010",
        "nama":  "Echa Susilawati",
        "kelompok":  "Kelompok 7",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-65",
        "nim":  "25241013",
        "nama":  "Azril Padila Ramadhan",
        "kelompok":  "Kelompok 7",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-66",
        "nim":  "25242004",
        "nama":  "Ikhsan Kurniawan",
        "kelompok":  "Kelompok 7",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-67",
        "nim":  "25242014",
        "nama":  "Dio Slavian Tarigan",
        "kelompok":  "Kelompok 7",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-68",
        "nim":  "25242022",
        "nama":  "Maulani Nur Irfansyah",
        "kelompok":  "Kelompok 7",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-70",
        "nim":  "25243008",
        "nama":  "Afwan Mahyudikha",
        "kelompok":  "Kelompok 7",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-71",
        "nim":  "25244009",
        "nama":  "Marantius Algo",
        "kelompok":  "Kelompok 7",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-72",
        "nim":  "24242006",
        "nama":  "Erik Aldi Levi Pratama",
        "kelompok":  "Kelompok 8",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-73",
        "nim":  "25242033",
        "nama":  "Aulia Zalsabila",
        "kelompok":  "Kelompok 8",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-74",
        "nim":  "25245003",
        "nama":  "Falisa Ariyanti",
        "kelompok":  "Kelompok 8",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-75",
        "nim":  "25241014",
        "nama":  "Nafis Amrullah Serap",
        "kelompok":  "Kelompok 8",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-76",
        "nim":  "25242005",
        "nama":  "Fauzi Ananda",
        "kelompok":  "Kelompok 8",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-77",
        "nim":  "25242015",
        "nama":  "Naka Lelu Runtu Nuwu",
        "kelompok":  "Kelompok 8",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-78",
        "nim":  "25242023",
        "nama":  "Muhammad Afif Aliansyah Herman",
        "kelompok":  "Kelompok 8",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-79",
        "nim":  "25242032",
        "nama":  "Clementius Tri Satrio Raget",
        "kelompok":  "Kelompok 8",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-80",
        "nim":  "25243009",
        "nama":  "Fatir Al-siddiqi",
        "kelompok":  "Kelompok 8",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792977715167-81",
        "nim":  "25245001",
        "nama":  "Jhon Daniel Sidabutar",
        "kelompok":  "Kelompok 8",
        "coassId":  "",
        "coassNama":  ""
    },
    {
        "id":  "prak-1792983971321-jrij9k",
        "nim":  "24242029",
        "nama":  "Justin",
        "kelompok":  "Kelompok 1",
        "coassId":  "",
        "coassNama":  ""
    }
];

// Sample Initial Grades & Evaluations (untuk Aditya Pratama - prak-1)
const DEFAULT_GRADES = {
  // Laporan per acara: { [nim]: { [acaraId]: { scores: {}, total: 0, catatan: "", tanggal: "" } } }
  laporan: {
    "230101001": {
      1: {
        scores: { lap_1: 95, lap_2: 90, lap_3: 88 },
        total: 91.15,
        catatan: "Format rapi, pengolahan data sangat baik, rujukan jurnal diperbanyak.",
        tanggal: "2026-10-15",
        penilai: "Tiara Juzan, S.Si."
      },
      2: {
        scores: { lap_1: 90, lap_2: 88, lap_3: 85 },
        total: 87.8,
        catatan: "Grafik diberi nomor dan satuan yang konsisten.",
        tanggal: "2026-10-18",
        penilai: "Tiara Juzan, S.Si."
      },
      3: {
        scores: { lap_1: 92, lap_2: 92, lap_3: 90 },
        total: 91.4,
        catatan: "Pembahasan mendalam dan komprehensif.",
        tanggal: "2026-10-21",
        penilai: "Tiara Juzan, S.Si."
      }
    },
    "230101002": {
      1: {
        scores: { lap_1: 85, lap_2: 85, lap_3: 80 },
        total: 83.5,
        catatan: "Cukup baik, tingkatkan analisis data pada bab 4.",
        tanggal: "2026-10-15",
        penilai: "Tiara Juzan, S.Si."
      }
    }
  },

  // Video per acara: { [nim]: { [acaraId]: { isNA: boolean, scores: {}, total: 0, catatan: "" } } }
  video: {
    "230101001": {
      1: {
        isNA: false,
        scores: { vid_1: 90, vid_2: 92 },
        total: 91.0,
        catatan: "Visual jernih, prosedur disampaikan runtut.",
        penilai: "Tiara Juzan, S.Si."
      },
      2: {
        isNA: true, // Acara 2 tidak wajib video
        scores: {},
        total: 0,
        catatan: "Tidak Berlaku (N/A) untuk Acara 2",
        penilai: "Tiara Juzan, S.Si."
      },
      3: {
        isNA: false,
        scores: { vid_1: 92, vid_2: 95 },
        total: 93.5,
        catatan: "Kreativitas presentasi sangat memuaskan.",
        penilai: "Tiara Juzan, S.Si."
      }
    }
  },

  // Performa Praktikan: { [nim]: { scores: {}, checklist: {}, total: 0, catatan: "" } }
  performa: {
    "230101001": {
      checklist: {
        perf_1: true, perf_7: true, perf_8: true
      },
      scores: {
        perf_1: 92, perf_7: 95, perf_8: 92
      },
      total: 93.0,
      catatan: "Sangat terampil menggunakan alat dan menjaga kebersihan meja kerja laboratorium."
    }
  },

  // Sikap Belajar: { [nim]: { scores: {}, total: 0, catatan: "" } }
  sikap: {
    "230101001": {
      scores: {
        sik_1: 90, sik_3: 92
      },
      total: 91.0,
      catatan: "Reseptif terhadap kritik revisi dan selalu memperbaiki laporan dengan cepat."
    }
  },

  // Format Laporan: { [nim]: { scores: {}, total: 0, catatan: "" } }
  formatLaporan: {
    "230101001": {
      scores: {
        fmt_1: 95, fmt_5: 92, fmt_8: 90
      },
      total: 92.45,
      catatan: "Tata letak konsisten, spasi dan margin sesuai pedoman teknis."
    }
  },

  // Responsi (Terpisah, Sekali Isi, Predikat Video Individu & Kelompok):
  responsi: {
    "230101001": {
      scores: {
        resp_1: 88, resp_5: 85
      },
      videoIndividu: {
        aktif: true,
        predikat: "A",
        skor: 92
      },
      videoKelompok: {
        aktif: true,
        predikat: "B",
        skor: 86
      },
      predikatAkhir: "A",
      total: 87.75,
      catatan: "Mampu menjelaskan konsep reaksi dan kaitan teori dengan hasil pengamatan serta video presentasi responsi memuaskan."
    }
  },

  // Penilaian Kedisiplinan: { [nim]: { scores: {}, total: 0, catatan: "" } }
  k3Kedisiplinan: {
    "230101001": {
      scores: {
        k3_2: 100, k3_4: 95
      },
      total: 97.5,
      catatan: "Selalu mematuhi tata tertib laboratorium dan tepat waktu mengumpulkan tugas."
    }
  },

  // Kehadiran Praktikum: { [nim]: [ { acaraId: 1, status: "Hadir", tanggal: "2026-10-10", keterangan: "" } ] }
  kehadiran: {
    "230101001": [
      { acaraId: 1, status: "Hadir", tanggal: "2026-10-10", keterangan: "Tepat waktu" },
      { acaraId: 2, status: "Hadir", tanggal: "2026-10-14", keterangan: "Tepat waktu" },
      { acaraId: 3, status: "Hadir", tanggal: "2026-10-18", keterangan: "Tepat waktu" },
      { acaraId: 4, status: "Hadir", tanggal: "2026-10-22", keterangan: "Tepat waktu" },
      { acaraId: 5, status: "Hadir", tanggal: "2026-10-26", keterangan: "Tepat waktu" }
    ]
  },

  // Konsultasi & Revisi: { [nim]: [ { id, tanggal, acara, statusHadir, materi, catatanRevisi, statusRevisi, tanggalUlang } ] }
  konsultasi: {
    "230101001": [
      {
        id: "kons-1",
        tanggal: "2026-10-16",
        acara: "Acara 1",
        statusHadir: "Hadir",
        materi: "Konsultasi Bab 4 (Analisis Data Perhitungan)",
        catatanRevisi: "Perbaiki satuan deviasi standar dan cantumkan grafik kalibrasi.",
        statusRevisi: "Selesai Disetujui",
        tanggalUlang: "2026-10-17"
      },
      {
        id: "kons-2",
        tanggal: "2026-10-20",
        acara: "Acara 2",
        statusHadir: "Hadir",
        materi: "Konsultasi Pembahasan & Daftar Pustaka",
        catatanRevisi: "Perbarui referensi menggunakan rujukan artikel jurnal 5 tahun terakhir.",
        statusRevisi: "Selesai Disetujui",
        tanggalUlang: "2026-10-21"
      }
    ]
  },

  // Catatan Evaluasi & Rekomendasi Perbaikan
  catatanEvaluasi: {
    "230101001": {
      kelebihan: "Kesiapan materi sangat baik, pemahaman K3 tinggi, dan selalu aktif dalam kelompok.",
      kelemahan: "Perlu lebih teliti dalam penulisan sitasi gaya APA.",
      rekomendasi: "Pertahankan performa dan tingkatkan kedalaman analisis di proyek akhir.",
      tanggalUpdate: "2026-10-22",
      penilai: "Tiara Juzan, S.Si."
    }
  }
};
