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
  googleAppsScriptUrl: "", // URL Web App Google Apps Script di drive juzantiara@gmail.com
  syncAuto: false,
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

// Default Akun Koordinator / Dosen Pembimbing (Dospem)
const DEFAULT_KOORDINATOR = [
  {
    id: "koor-1",
    username: "koordinator",
    password: "gigikuPutih@354",
    nama: "Koordinator Praktikum",
    roleJabatan: "Koordinator",
    email: "juzantiara@gmail.com"
  },
  {
    id: "koor-2",
    username: "dospem",
    password: "gigikuPutih@354",
    nama: "Dosen Pembimbing Praktikum",
    roleJabatan: "Dosen Pembimbing",
    email: "juzantiara@gmail.com"
  }
];

// Default Data Co.Ass (dengan Kode Login Khusus tiap Co.Ass - Sistem Bergilir Seluruh Kelompok)
const DEFAULT_COASS = [
  {
    id: "coass-tiara-1",
    nama: "Justiar Noer",
    email: "juzantiara@gmail.com",
    kodeLogin: "COASS-TIARA-01",
    role: "Co.Ass Koordinator",
    kelompokBinaan: ["Kelompok 1-8"],
    status: "Aktif",
    kontak: "0812-3456-7890"
  },
  {
    id: "coass-ismail-2",
    nama: "Ismail Qori Pohan S.T",
    email: "juzantiara@gmail.com",
    kodeLogin: "COASS-7WRV-2",
    role: "Co.Ass Penilai",
    kelompokBinaan: ["Kelompok 1-8"],
    status: "Aktif",
    kontak: "0813-9876-5432"
  },
  {
    id: "coass-abel-3",
    nama: "Abel Ramadhan",
    email: "juzantiara@gmail.com",
    kodeLogin: "COASS-281U-3",
    role: "Co.Ass Penilai",
    kelompokBinaan: ["Kelompok 1-8"],
    status: "Aktif",
    kontak: "0815-5555-4321"
  },
  {
    id: "coass-fathur-4",
    nama: "M. Fathur Rohman",
    email: "juzantiara@gmail.com",
    kodeLogin: "COASS-GLX2-4",
    role: "Co.Ass Penilai",
    kelompokBinaan: ["Kelompok 1-8"],
    status: "Aktif",
    kontak: "0819-1122-3344"
  }
];

// Default Data Praktikan (NIM & Nama untuk Login - Tanpa Shift, Sistem Bergilir)
const DEFAULT_PRAKTIKAN = [
  {
    id: "prak-1",
    nim: "230101001",
    nama: "Aditya Pratama",
    kelompok: "Kelompok 1",
    coassId: "coass-tiara-1",
    coassNama: "Justiar Noer"
  },
  {
    id: "prak-2",
    nim: "230101002",
    nama: "Bella Safitri",
    kelompok: "Kelompok 1",
    coassId: "coass-tiara-1",
    coassNama: "Justiar Noer"
  },
  {
    id: "prak-3",
    nim: "230101003",
    nama: "Cahyo Nugroho",
    kelompok: "Kelompok 2",
    coassId: "coass-ismail-2",
    coassNama: "Ismail Qori Pohan S.T"
  },
  {
    id: "prak-4",
    nim: "230101004",
    nama: "Dina Kartika",
    kelompok: "Kelompok 2",
    coassId: "coass-ismail-2",
    coassNama: "Ismail Qori Pohan S.T"
  },
  {
    id: "prak-5",
    nim: "230101005",
    nama: "Eko Prasetyo",
    kelompok: "Kelompok 3",
    coassId: "coass-abel-3",
    coassNama: "Abel Ramadhan"
  },
  {
    id: "prak-6",
    nim: "230101006",
    nama: "Farida Hidayah",
    kelompok: "Kelompok 3",
    coassId: "coass-abel-3",
    coassNama: "Abel Ramadhan"
  },
  {
    id: "prak-7",
    nim: "230101007",
    nama: "Gilang Ramadhan",
    kelompok: "Kelompok 4",
    coassId: "coass-fathur-4",
    coassNama: "M. Fathur Rohman"
  },
  {
    id: "prak-8",
    nim: "230101008",
    nama: "Hesti Wulandari",
    kelompok: "Kelompok 4",
    coassId: "coass-fathur-4",
    coassNama: "M. Fathur Rohman"
  }
];

// Daftar Multi-Praktikum (Dapat Dibuat & Ditambah Lebih Dari Satu)
const DEFAULT_PRAKTIKUM_LIST = [
  {
    id: "prak-default-1",
    nama: "Praktikum Laboratorium Terpadu",
    tahunAkademik: "2026/2027",
    semester: "Gasal",
    jumlahKelompok: 8,
    deskripsi: "Praktikum dasar sains dan teknologi laboratorium terpadu INSTIPER Yogyakarta.",
    acaraList: DEFAULT_ACARA,
    praktikanList: DEFAULT_PRAKTIKAN,
    coassList: DEFAULT_COASS,
    weights: {
      laporan: 35,
      video: 10,
      performa: 15,
      sikap: 10,
      responsi: 20,
      formatLaporan: 5,
      k3Kedisiplinan: 5
    }
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
