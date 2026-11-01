/**
 * SISTEM INFORMASI PENILAIAN PRAKTIKUM
 * INSTITUT PERTANIAN STIPER (INSTIPER) YOGYAKARTA
 * Pemilik Database Google Drive: juzantiara@gmail.com
 * PIN Koordinator: gigikuPutih@354
 * Font Judul: Times New Roman | Font Lainnya: Poppins
 */

// State Aplikasi Global
const AppState = {
  currentUser: null, // { role: 'developer'|'coass'|'praktikan', data: {} }
  currentLoginRole: 'praktikan', // 'praktikan' | 'coass' | 'koordinator'
  config: null,
  koordinatorList: [], // Akun Koordinator / Dosen Pembimbing (Dospem)
  coassList: [],
  praktikanList: [],
  acaraList: [],
  grades: {
    laporan: {},
    video: {},
    performa: {},
    sikap: {},
    formatLaporan: {},
    responsi: {},
    k3Kedisiplinan: {},
    kehadiran: {},
    konsultasi: {},
    catatanEvaluasi: {}
  },
  globalResponsi: {}, // Nilai responsi mandiri & terpisah (tidak terikat praktikum tertentu)
  // Manajemen Multi-Praktikum & Filter
  praktikumList: [], // Seluruh praktikum yang dibuat / terdaftar
  activePraktikumId: 'prak-default-1', // ID praktikum yang sedang aktif
  filterKelompok: 'all', // 'all' atau 'Kelompok 1', 'Kelompok 2', dst.
  activeTab: 'rekap', // 'rekap' | 'input-nilai' | 'manajemen-coass' | 'manajemen-praktikan' | 'pengaturan' | 'profil-praktikan'
  selectedPraktikanNIM: null,
  selectedAcaraId: 1,
  syncStatus: {
    online: false,
    lastSync: null,
    message: 'Mode Lokal (Penyimpanan Peramban)'
  },
  excelImportPreview: [] // Buffer data impor Excel sebelum konfirmasi
};

// URL / Base64 Sumber Logo Resmi INSTIPER Yogyakarta
const LOGO_INSTIPER_SRC = (typeof LOGO_INSTIPER_BASE64 !== 'undefined' && LOGO_INSTIPER_BASE64) ? LOGO_INSTIPER_BASE64 : 'logo-instiper.png';

/**
 * Helper Normalisasi Data Co.Ass (Tanpa Shift, ID Unik Terjamin)
 */
function normalizeCoAssItem(c, idx = 0) {
  if (!c) return null;
  const safeId = (c.id && String(c.id).trim() !== '' && String(c.id) !== 'undefined')
    ? String(c.id).trim()
    : `coass-${Date.now()}-${Math.floor(Math.random()*10000)}-${idx}`;
  return {
    id: safeId,
    nama: c.nama || c.Nama_CoAss || c.Nama || '',
    email: c.email || c.Email || '',
    kodeLogin: String(c.kodeLogin || c.Kode_Login_Khusus || c.Kode || c.kode || '').trim().toUpperCase(),
    role: c.role || c.Role_Jabatan || 'Co.Ass Penilai',
    kelompokBinaan: Array.isArray(c.kelompokBinaan) ? c.kelompokBinaan : (typeof c.Kelompok_Binaan === 'string' ? c.Kelompok_Binaan.split(',').map(s=>s.trim()).filter(Boolean) : (c.kelompokBinaan ? [c.kelompokBinaan] : ['Kelompok 1-8'])),
    status: c.status || c.Status_Aktif || 'Aktif',
    kontak: c.kontak || c.Kontak || ''
  };
}

/**
 * Memastikan Seluruh Co.Ass Memiliki ID Unik Tanpa Duplikat
 */
function sanitizeCoAssList(list) {
  const seenIds = new Set();
  return (list || []).map((c, idx) => {
    const item = normalizeCoAssItem(c, idx);
    if (!item) return null;
    if (seenIds.has(item.id)) {
      item.id = `coass-${Date.now()}-${Math.floor(Math.random()*10000)}-${idx}`;
    }
    seenIds.add(item.id);
    return item;
  }).filter(Boolean);
}

/**
 * Helper Normalisasi Data Praktikan (Tanpa Shift, Sistem Rolling Co.Ass)
 */
function normalizePraktikanItem(p, idx = 0) {
  if (!p) return null;
  const safeId = (p.id && String(p.id).trim() !== '' && String(p.id) !== 'undefined')
    ? String(p.id).trim()
    : `prak-${Date.now()}-${Math.floor(Math.random()*10000)}-${idx}`;
  return {
    id: safeId,
    nim: String(p.nim || p.NIM || '').trim(),
    nama: String(p.nama || p.Nama_Praktikan || p.Nama || '').trim(),
    kelompok: p.kelompok || p.Kelompok || 'Kelompok 1',
    coassId: p.coassId || p.ID_CoAss_Penilai || '',
    coassNama: p.coassNama || p.Nama_CoAss_Penilai || 'Sistem Bergilir'
  };
}

/**
 * Multi-Praktikum Helper Functions
 */
function getActivePraktikum() {
  if (!AppState.praktikumList || AppState.praktikumList.length === 0) {
    if (typeof DEFAULT_PRAKTIKUM_LIST !== 'undefined' && DEFAULT_PRAKTIKUM_LIST.length > 0) {
      AppState.praktikumList = JSON.parse(JSON.stringify(DEFAULT_PRAKTIKUM_LIST));
    } else {
      AppState.praktikumList = [{
        id: "prak-default-1",
        nama: AppState.config ? AppState.config.courseTitle : "Praktikum Laboratorium Terpadu",
        tahunAkademik: AppState.config ? AppState.config.academicYear : "2026/2027",
        semester: AppState.config ? AppState.config.semester : "Gasal",
        jumlahKelompok: 8,
        deskripsi: "Praktikum terpadu INSTIPER Yogyakarta.",
        acaraList: AppState.acaraList || DEFAULT_ACARA,
        praktikanList: AppState.praktikanList || DEFAULT_PRAKTIKAN,
        grades: AppState.grades || DEFAULT_GRADES
      }];
    }
    AppState.activePraktikumId = AppState.praktikumList[0].id;
  }
  let found = AppState.praktikumList.find(p => p.id === AppState.activePraktikumId);
  if (!found) {
    found = AppState.praktikumList[0];
    AppState.activePraktikumId = found.id;
  }
  return found;
}

/**
 * Mendapatkan Daftar Kelompok Praktikum Terurut (Kelompok 1 s/d minimal 8 atau sesuai jumlah kelompok)
 */
function getKelompokList() {
  const curPrak = getActivePraktikum();
  const maxKel = Math.max((curPrak && curPrak.jumlahKelompok) || 8, 8);
  const kelSet = new Set(Array.from({ length: maxKel }, (_, i) => `Kelompok ${i + 1}`));
  (AppState.praktikanList || []).forEach(p => {
    if (p.kelompok && p.kelompok.trim()) kelSet.add(p.kelompok.trim());
  });
  return Array.from(kelSet).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.replace(/\D/g, '')) || 0;
    return numA - numB;
  });
}

function isKoordinatorOrDeveloper() {
  return Boolean(AppState.currentUser && (AppState.currentUser.role === 'developer' || AppState.currentUser.role === 'koordinator'));
}

function saveCurrentPraktikumState() {
  const cur = getActivePraktikum();
  if (cur) {
    cur.nama = (AppState.config && AppState.config.courseTitle) || cur.nama;
    cur.tahunAkademik = (AppState.config && AppState.config.academicYear) || cur.tahunAkademik;
    cur.semester = (AppState.config && AppState.config.semester) || cur.semester;
    cur.weights = (AppState.config && AppState.config.weights) || cur.weights || DEFAULT_CONFIG.weights;
    cur.evaluationConfig = (AppState.config && AppState.config.evaluationConfig) || cur.evaluationConfig || DEFAULT_EVALUATION_CONFIG;
    cur.acaraList = AppState.acaraList;
    cur.praktikanList = AppState.praktikanList;
    cur.grades = AppState.grades;
  }
}

function switchPraktikum(prakId) {
  saveCurrentPraktikumState();
  const p = AppState.praktikumList.find(item => item.id === prakId);
  if (!p) return;
  AppState.activePraktikumId = prakId;
  AppState.config.courseTitle = p.nama;
  AppState.config.academicYear = p.tahunAkademik || AppState.config.academicYear;
  AppState.config.semester = p.semester || AppState.config.semester;
  AppState.config.weights = p.weights || JSON.parse(JSON.stringify(DEFAULT_CONFIG.weights));
  AppState.config.evaluationConfig = p.evaluationConfig || JSON.parse(JSON.stringify(DEFAULT_EVALUATION_CONFIG));
  AppState.acaraList = p.acaraList || JSON.parse(JSON.stringify(DEFAULT_ACARA));
  AppState.praktikanList = (p.praktikanList || []).map(normalizePraktikanItem);
  AppState.grades = p.grades || { laporan:{}, video:{}, performa:{}, sikap:{}, formatLaporan:{}, responsi:{}, k3Kedisiplinan:{}, kehadiran:{}, konsultasi:{}, catatanEvaluasi:{} };
  if (!AppState.grades.responsi) AppState.grades.responsi = {};
  if (AppState.globalResponsi) {
    Object.keys(AppState.globalResponsi).forEach(nim => {
      AppState.grades.responsi[nim] = AppState.globalResponsi[nim];
    });
  }
  AppState.filterKelompok = 'all';
  if (AppState.praktikanList.length > 0) {
    AppState.selectedPraktikanNIM = AppState.praktikanList[0].nim;
  }
  saveStateToStorage();
  renderApp();
  showToast(`Beralih ke Praktikum: ${p.nama}`, 'success');
}

function setFilterKelompok(kelompok) {
  AppState.filterKelompok = kelompok;
  renderApp();
}

// Inisialisasi Aplikasi Saat Halaman Selesai Dimuat
document.addEventListener('DOMContentLoaded', () => {
  initAppState();
  bindGlobalEvents();
  renderApp();
});

/**
 * 1. INISIALISASI STATE & STORAGE
 */
function initAppState() {
  // Cek apakah ada parameter URL ?apiUrl= atau ?api= untuk auto-connect cloud
  try {
    const params = new URLSearchParams(window.location.search);
    const apiParam = params.get('apiUrl') || params.get('api');
    if (apiParam) {
      const decodedApi = decodeURIComponent(apiParam).trim();
      if (decodedApi.startsWith('http')) {
        DEFAULT_CONFIG.googleAppsScriptUrl = decodedApi;
      }
    }
  } catch (e) {
    console.warn("URL params check error:", e);
  }

  const STORAGE_KEY = 'SIP_PRAKTIKUM_DATA_V2';
  const savedState = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('SIP_PRAKTIKUM_DATA_V1');
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState);
      AppState.config = Object.assign({}, DEFAULT_CONFIG, parsed.config || {});
      // Inisialisasi & sinkronisasi evaluationConfig
      AppState.config.evaluationConfig = Object.assign({}, DEFAULT_EVALUATION_CONFIG, (parsed.config && parsed.config.evaluationConfig) || {});
      if (AppState.config.evaluationConfig.components) {
        AppState.config.evaluationConfig.components = Object.assign({}, DEFAULT_EVALUATION_CONFIG.components, AppState.config.evaluationConfig.components);
      }
      if (AppState.config.evaluationConfig.subIndicators) {
        AppState.config.evaluationConfig.subIndicators = Object.assign({}, DEFAULT_EVALUATION_CONFIG.subIndicators, AppState.config.evaluationConfig.subIndicators);
      }
      if (!AppState.config.googleAppsScriptUrl && DEFAULT_CONFIG.googleAppsScriptUrl) {
        AppState.config.googleAppsScriptUrl = DEFAULT_CONFIG.googleAppsScriptUrl;
      }
      AppState.config.institution = "INSTITUT PERTANIAN STIPER (INSTIPER) YOGYAKARTA";
      
      // Sinkronisasi Akun Koordinator / Dospem
      AppState.koordinatorList = (parsed.koordinatorList && parsed.koordinatorList.length > 0)
        ? parsed.koordinatorList
        : JSON.parse(JSON.stringify(DEFAULT_KOORDINATOR));

      DEFAULT_KOORDINATOR.forEach(dk => {
        if (!AppState.koordinatorList.some(k => k.username.toLowerCase() === dk.username.toLowerCase())) {
          AppState.koordinatorList.push(JSON.parse(JSON.stringify(dk)));
        }
      });

      // Data Co.Ass: JANGAN PERNAH mereset hanya karena jumlah < 4 agar Co.Ass yang dihapus tidak muncul lagi!
      AppState.coassList = sanitizeCoAssList((parsed.coassList && parsed.coassList.length > 0) ? parsed.coassList : DEFAULT_COASS);
      const hasOldDummyCoAss = AppState.coassList.some(c => 
        c.nama.includes('Ahmad Fauzi') || c.nama.includes('Siti Rahmawati') || c.kodeLogin === 'COASS-FAUZI-02'
      );
      if (hasOldDummyCoAss) {
        AppState.coassList = JSON.parse(JSON.stringify(DEFAULT_COASS));
      }

      AppState.praktikanList = (parsed.praktikanList || DEFAULT_PRAKTIKAN).map(normalizePraktikanItem);
      AppState.acaraList = parsed.acaraList || DEFAULT_ACARA;
      AppState.grades = parsed.grades || DEFAULT_GRADES;
      AppState.globalResponsi = parsed.globalResponsi || {};
      if (AppState.grades && AppState.grades.responsi) {
        Object.keys(AppState.grades.responsi).forEach(nim => {
          if (!AppState.globalResponsi[nim]) {
            AppState.globalResponsi[nim] = AppState.grades.responsi[nim];
          }
        });
      }
      if (AppState.globalResponsi && AppState.grades) {
        if (!AppState.grades.responsi) AppState.grades.responsi = {};
        Object.keys(AppState.globalResponsi).forEach(nim => {
          AppState.grades.responsi[nim] = AppState.globalResponsi[nim];
        });
      }
      AppState.praktikumList = (parsed.praktikumList && parsed.praktikumList.length > 0)
        ? parsed.praktikumList
        : (typeof DEFAULT_PRAKTIKUM_LIST !== 'undefined' ? JSON.parse(JSON.stringify(DEFAULT_PRAKTIKUM_LIST)) : []);
      AppState.activePraktikumId = parsed.activePraktikumId || (AppState.praktikumList[0] ? AppState.praktikumList[0].id : 'prak-default-1');
      AppState.filterKelompok = parsed.filterKelompok || 'all';

      // Pastikan bobot aktif sinkron dengan praktikum aktif
      const curP = getActivePraktikum();
      if (curP && curP.weights) {
        AppState.config.weights = curP.weights;
      }
    } catch (e) {
      console.error("Error loading localStorage, resetting to default seeds", e);
      loadSeedData();
    }
  } else {
    loadSeedData();
  }

  // Cek apakah ada sesi login sebelumnya
  const savedSession = sessionStorage.getItem('SIP_PRAKTIKUM_SESSION');
  if (savedSession) {
    try {
      AppState.currentUser = JSON.parse(savedSession);
    } catch (e) {
      AppState.currentUser = null;
    }
  }

  // Tes koneksi Google Apps Script & sinkronisasi otomatis latar belakang
  if (AppState.config && AppState.config.googleAppsScriptUrl) {
    pullFromGoogleSheetsSilent(false);
  }
}

function loadSeedData() {
  AppState.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  AppState.config.evaluationConfig = JSON.parse(JSON.stringify(DEFAULT_EVALUATION_CONFIG));
  AppState.config.institution = "INSTITUT PERTANIAN STIPER (INSTIPER) YOGYAKARTA";
  AppState.koordinatorList = JSON.parse(JSON.stringify(DEFAULT_KOORDINATOR));
  AppState.coassList = sanitizeCoAssList(DEFAULT_COASS);
  AppState.praktikanList = JSON.parse(JSON.stringify(DEFAULT_PRAKTIKAN)).map(normalizePraktikanItem);
  AppState.acaraList = JSON.parse(JSON.stringify(DEFAULT_ACARA));
  AppState.grades = JSON.parse(JSON.stringify(DEFAULT_GRADES));
  AppState.globalResponsi = (AppState.grades && AppState.grades.responsi) ? JSON.parse(JSON.stringify(AppState.grades.responsi)) : {};
  AppState.praktikumList = typeof DEFAULT_PRAKTIKUM_LIST !== 'undefined' 
    ? JSON.parse(JSON.stringify(DEFAULT_PRAKTIKUM_LIST))
    : [{
        id: "prak-default-1",
        nama: "Praktikum Laboratorium Terpadu",
        tahunAkademik: "2026/2027",
        semester: "Gasal",
        jumlahKelompok: 8,
        deskripsi: "Praktikum terpadu INSTIPER Yogyakarta.",
        acaraList: AppState.acaraList,
        praktikanList: AppState.praktikanList,
        weights: AppState.config.weights || DEFAULT_CONFIG.weights,
        grades: AppState.grades
      }];
  AppState.activePraktikumId = AppState.praktikumList[0].id;
  AppState.filterKelompok = 'all';
  saveStateToStorage();
}

let _debouncedCloudSync = null;
function triggerAutoCloudSync() {
  if (!_debouncedCloudSync) {
    _debouncedCloudSync = debounce(() => syncWithGoogleSheets(false), 5000);
  }
  _debouncedCloudSync();
}

function saveStateToStorage() {
  saveCurrentPraktikumState();
  const dataToSave = {
    config: AppState.config,
    koordinatorList: AppState.koordinatorList,
    coassList: AppState.coassList,
    praktikanList: AppState.praktikanList,
    acaraList: AppState.acaraList,
    grades: AppState.grades,
    praktikumList: AppState.praktikumList,
    activePraktikumId: AppState.activePraktikumId,
    filterKelompok: AppState.filterKelompok,
    globalResponsi: AppState.globalResponsi || {}
  };
  localStorage.setItem('SIP_PRAKTIKUM_DATA_V2', JSON.stringify(dataToSave));

  // Auto sync ke Google Drive bila URL tersedia
  if (AppState.config && AppState.config.googleAppsScriptUrl) {
    triggerAutoCloudSync();
  }
}

function resetCoAssToMaster() {
  if (!confirm('Apakah Anda ingin menyinkronkan ulang data Co.Ass dengan Data Master (4 Co.Ass resmi: Justiar, Ismail, Abel, Fathur)?\\n\\nTindakan ini akan memulihkan data Co.Ass agar sama persis di seluruh perangkat.')) return;
  AppState.coassList = JSON.parse(JSON.stringify(DEFAULT_COASS));
  saveStateToStorage();
  renderApp();
  showToast('Data Co.Ass berhasil dipulihkan ke 4 Co.Ass Master!', 'success');
  syncWithGoogleSheets(false);
}

/**
 * 2. AUTENTIKASI MULTI-ROLE
 */
async function loginDeveloper(username, password) {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  let accounts = (AppState.koordinatorList && AppState.koordinatorList.length > 0) 
    ? AppState.koordinatorList 
    : DEFAULT_KOORDINATOR;

  // Cek apakah ada akun yang cocok username dan password
  let matched = accounts.find(k => 
    k.username.toLowerCase() === cleanUser && k.password === cleanPass
  );

  // Jika belum cocok dan Google Drive aktif, coba verifikasi akun terbaru dari cloud real-time!
  if (!matched && AppState.config && AppState.config.googleAppsScriptUrl) {
    try {
      await pullFromGoogleSheetsSilent(false);
      accounts = (AppState.koordinatorList && AppState.koordinatorList.length > 0) 
        ? AppState.koordinatorList 
        : DEFAULT_KOORDINATOR;
      matched = accounts.find(k => 
        k.username.toLowerCase() === cleanUser && k.password === cleanPass
      );
    } catch (e) {
      console.warn("Gagal verifikasi cloud koordinator:", e);
    }
  }

  if (matched) {
    AppState.currentUser = {
      role: 'developer',
      data: {
        id: matched.id,
        username: matched.username,
        nama: matched.nama || 'Koordinator Praktikum',
        roleJabatan: matched.roleJabatan || 'Koordinator / Dospem',
        email: matched.email || AppState.config.developerEmail
      }
    };
    sessionStorage.setItem('SIP_PRAKTIKUM_SESSION', JSON.stringify(AppState.currentUser));
    AppState.activeTab = 'rekap';
    renderApp();
    showToast(`Selamat datang, ${matched.nama}!`, 'success');
    if (AppState.config && AppState.config.googleAppsScriptUrl) {
      pullFromGoogleSheetsSilent(false);
    }
    return true;
  }

  // Fallback PIN master jika username dikosongkan atau sesuai PIN
  if (cleanPass === "gigikuPutih@354" || cleanPass === AppState.config.developerPin ||
      (cleanUser === "koordinator" && cleanPass === "gigikuPutih@354") ||
      (cleanUser === "dospem" && cleanPass === "gigikuPutih@354") ||
      (cleanUser === "develob" && cleanPass === "gigikuPutih@354")) {
    AppState.currentUser = {
      role: 'developer',
      data: {
        nama: cleanUser === "dospem" ? 'Dosen Pembimbing' : 'Justiar Noer',
        roleJabatan: cleanUser === "dospem" ? 'Dosen Pembimbing' : 'Koordinator',
        email: AppState.config.developerEmail
      }
    };
    sessionStorage.setItem('SIP_PRAKTIKUM_SESSION', JSON.stringify(AppState.currentUser));
    AppState.activeTab = 'rekap';
    renderApp();
    showToast('Berhasil login sebagai Koordinator / Dospem!', 'success');
    if (AppState.config && AppState.config.googleAppsScriptUrl) {
      pullFromGoogleSheetsSilent(false);
    }
    return true;
  }

  showToast('Username atau Password Koordinator / Dospem salah.', 'error');
  return false;
}

async function loginCoAss(kodeLogin) {
  const code = (kodeLogin || '').trim().toUpperCase();
  if (!code) {
    showToast('Silakan masukkan Kode Login Co.Ass!', 'warning');
    return false;
  }
  AppState.coassList = sanitizeCoAssList(AppState.coassList || []);

  let coass = AppState.coassList.find(c => c.kodeLogin.toUpperCase() === code);
  
  // Jika belum ditemukan di memori lokal dan ada URL Google Drive, tarik data terbaru dari cloud real-time!
  if (!coass && AppState.config && AppState.config.googleAppsScriptUrl) {
    showToast('Memverifikasi kode Co.Ass ke Google Drive...', 'info');
    try {
      await pullFromGoogleSheetsSilent(false);
      AppState.coassList = sanitizeCoAssList(AppState.coassList || []);
      coass = AppState.coassList.find(c => c.kodeLogin.toUpperCase() === code);
    } catch (e) {
      console.warn("Gagal verifikasi cloud Co.Ass:", e);
    }
  }

  // Fallback ke DEFAULT_COASS jika belum ada di state lokal
  if (!coass && typeof DEFAULT_COASS !== 'undefined') {
    const foundDefault = DEFAULT_COASS.find(c => c.kodeLogin.toUpperCase() === code);
    if (foundDefault) {
      coass = normalizeCoAssItem(foundDefault, AppState.coassList.length);
      AppState.coassList.push(coass);
      saveStateToStorage();
    }
  }

  if (coass) {
    AppState.currentUser = {
      role: 'coass',
      data: coass
    };
    sessionStorage.setItem('SIP_PRAKTIKUM_SESSION', JSON.stringify(AppState.currentUser));
    AppState.activeTab = 'input-nilai';
    if (AppState.praktikanList.length > 0) {
      AppState.selectedPraktikanNIM = AppState.praktikanList[0].nim;
    }
    renderApp();
    showToast(`Selamat datang, Co.Ass ${coass.nama}!`, 'success');
    if (AppState.config && AppState.config.googleAppsScriptUrl) {
      pullFromGoogleSheetsSilent(false);
    }
    return true;
  }
  showToast('Kode Login Co.Ass tidak ditemukan atau belum terdaftar.', 'error');
  return false;
}

async function loginPraktikan(nama, nim) {
  const cleanNim = (nim || '').trim();
  const cleanNama = (nama || '').trim().toLowerCase();

  if (!cleanNim) {
    showToast('Silakan masukkan NIM praktikan!', 'warning');
    return false;
  }

  AppState.praktikanList = (AppState.praktikanList || []).map(normalizePraktikanItem);

  let praktikan = AppState.praktikanList.find(p => 
    p.nim === cleanNim && (cleanNama === '' || p.nama.toLowerCase().includes(cleanNama) || cleanNama.includes(p.nama.toLowerCase()))
  );

  // Jika belum ditemukan di memori lokal dan ada URL Google Drive, tarik data terbaru dari cloud real-time!
  if (!praktikan && AppState.config && AppState.config.googleAppsScriptUrl) {
    showToast('Memverifikasi data praktikan ke Google Drive...', 'info');
    try {
      await pullFromGoogleSheetsSilent(false);
      AppState.praktikanList = (AppState.praktikanList || []).map(normalizePraktikanItem);
      praktikan = AppState.praktikanList.find(p => 
        p.nim === cleanNim && (cleanNama === '' || p.nama.toLowerCase().includes(cleanNama) || cleanNama.includes(p.nama.toLowerCase()))
      );
    } catch (e) {
      console.warn("Gagal verifikasi cloud praktikan:", e);
    }
  }

  // Fallback ke DEFAULT_PRAKTIKAN jika belum ada di state
  if (!praktikan && typeof DEFAULT_PRAKTIKAN !== 'undefined') {
    const foundDefault = DEFAULT_PRAKTIKAN.find(p => 
      p.nim === cleanNim && (cleanNama === '' || p.nama.toLowerCase().includes(cleanNama) || cleanNama.includes(p.nama.toLowerCase()))
    );
    if (foundDefault) {
      praktikan = normalizePraktikanItem(foundDefault, AppState.praktikanList.length);
      AppState.praktikanList.push(praktikan);
      saveStateToStorage();
    }
  }

  if (praktikan) {
    AppState.currentUser = {
      role: 'praktikan',
      data: praktikan
    };
    sessionStorage.setItem('SIP_PRAKTIKUM_SESSION', JSON.stringify(AppState.currentUser));
    AppState.selectedPraktikanNIM = praktikan.nim;
    AppState.activeTab = 'profil-praktikan';
    renderApp();
    showToast(`Selamat datang, ${praktikan.nama}!`, 'success');
    return true;
  }
  showToast('Nama atau NIM praktikan tidak cocok atau belum terdaftar.', 'error');
  return false;
}

/**
 * Toggle visibility password / NIM / Kode
 */
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  if (btn) {
    btn.innerHTML = isPass ? '<i data-lucide="eye-off" class="w-4 h-4 text-slate-700"></i>' : '<i data-lucide="eye" class="w-4 h-4 text-slate-400"></i>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

function logout() {
  AppState.currentUser = null;
  sessionStorage.removeItem('SIP_PRAKTIKUM_SESSION');
  renderApp();
  showToast('Anda telah keluar dari sistem.', 'info');
}

/**
 * 3. LOGIKA MATEMATIS PENILAIAN & PEMBOBOTAN DINAMIS (Fleksibel & Sub-Ceklis)
 */
function calculateLaporanScore(scores, checklist, isAktif = true) {
  if (isAktif === false || !scores) return 0;
  let total = 0;
  let activeWeight = 0;
  INDIKATOR_LAPORAN.forEach(ind => {
    const isChecked = checklist ? (checklist[ind.id] !== false) : true;
    if (isChecked) {
      const val = parseFloat(scores[ind.id]);
      if (!isNaN(val)) {
        total += (val * (ind.bobot / 100));
        activeWeight += ind.bobot;
      }
    }
  });
  if (activeWeight === 0) return 0;
  return parseFloat(((total / activeWeight) * 100).toFixed(2));
}

function calculateVideoScore(scores, isNA, checklist, isAktif = true) {
  if (isAktif === false || isNA || !scores) return { score: 0, isNA: true };
  let total = 0;
  let activeWeight = 0;
  INDIKATOR_VIDEO.forEach(ind => {
    const isChecked = checklist ? (checklist[ind.id] !== false) : true;
    if (isChecked) {
      const val = parseFloat(scores[ind.id]);
      if (!isNaN(val)) {
        total += (val * (ind.bobot / 100));
        activeWeight += ind.bobot;
      }
    }
  });
  if (activeWeight === 0) return { score: 0, isNA: true };
  return { score: parseFloat(((total / activeWeight) * 100).toFixed(2)), isNA: false };
}

function calculatePerformaScore(scores, checklist, isAktif = true) {
  if (isAktif === false || !scores) return 0;
  let total = 0;
  let activeWeight = 0;
  INDIKATOR_PERFORMA.forEach(ind => {
    const isChecked = checklist ? (checklist[ind.id] !== false) : true;
    if (isChecked) {
      const val = parseFloat(scores[ind.id]);
      if (!isNaN(val)) {
        total += (val * (ind.bobot / 100));
        activeWeight += ind.bobot;
      }
    }
  });
  if (activeWeight === 0) return 0;
  return parseFloat(((total / activeWeight) * 100).toFixed(2));
}

function calculateSikapScore(scores, checklist, isAktif = true) {
  if (isAktif === false || !scores) return 0;
  let total = 0;
  let activeWeight = 0;
  INDIKATOR_SIKAP.forEach(ind => {
    const isChecked = checklist ? (checklist[ind.id] !== false) : true;
    if (isChecked) {
      const val = parseFloat(scores[ind.id]);
      if (!isNaN(val)) {
        total += (val * (ind.bobot / 100));
        activeWeight += ind.bobot;
      }
    }
  });
  if (activeWeight === 0) return 0;
  return parseFloat(((total / activeWeight) * 100).toFixed(2));
}

function calculateFormatScore(scores, checklist, isAktif = true) {
  if (isAktif === false || !scores) return 0;
  let total = 0;
  let activeWeight = 0;
  INDIKATOR_FORMAT.forEach(ind => {
    const isChecked = checklist ? (checklist[ind.id] !== false) : true;
    if (isChecked) {
      const val = parseFloat(scores[ind.id]);
      if (!isNaN(val)) {
        total += (val * (ind.bobot / 100));
        activeWeight += ind.bobot;
      }
    }
  });
  if (activeWeight === 0) return 0;
  return parseFloat(((total / activeWeight) * 100).toFixed(2));
}

function calculateResponsiScore(respData, checklist, isAktif = true) {
  if (isAktif === false || !respData) return 0;
  if (typeof respData === 'number') return respData;

  const scores = respData.scores || respData;
  const currentChecklist = checklist || respData.checklist || {};
  let theoryTotal = 0;
  let theoryWeight = 0;
  INDIKATOR_RESPONSI.forEach(ind => {
    const isChecked = currentChecklist[ind.id] !== false;
    if (isChecked) {
      const val = parseFloat(scores[ind.id]);
      if (!isNaN(val)) {
        theoryTotal += (val * (ind.bobot / 100));
        theoryWeight += ind.bobot;
      }
    }
  });
  if (theoryWeight > 0 && theoryWeight !== 100) {
    theoryTotal = (theoryTotal / theoryWeight) * 100;
  }

  const predikatScoreMap = { 'A': 95, 'B': 85, 'C': 75, 'D': 65, 'E': 50 };
  let components = [];
  if (theoryWeight > 0) {
    components.push(theoryTotal);
  }

  if (respData.videoIndividu && respData.videoIndividu.aktif) {
    const vScore = (respData.videoIndividu.skor != null && !isNaN(parseFloat(respData.videoIndividu.skor)))
      ? parseFloat(respData.videoIndividu.skor)
      : (predikatScoreMap[respData.videoIndividu.predikat] || 95);
    components.push(vScore);
  }

  if (respData.videoKelompok && respData.videoKelompok.aktif) {
    const vScore = (respData.videoKelompok.skor != null && !isNaN(parseFloat(respData.videoKelompok.skor)))
      ? parseFloat(respData.videoKelompok.skor)
      : (predikatScoreMap[respData.videoKelompok.predikat] || 95);
    components.push(vScore);
  }

  if (components.length === 0) return 0;
  const avg = components.reduce((a, b) => a + b, 0) / components.length;
  return parseFloat(avg.toFixed(2));
}

function getPredikatResponsi(score) {
  if (score >= 90) return { predikat: 'A', label: 'Sangat Baik', color: 'emerald' };
  if (score >= 80) return { predikat: 'B', label: 'Baik', color: 'blue' };
  if (score >= 70) return { predikat: 'C', label: 'Cukup', color: 'amber' };
  if (score >= 60) return { predikat: 'D', label: 'Kurang', color: 'orange' };
  return { predikat: 'E', label: 'Sangat Kurang', color: 'rose' };
}

function calculateK3Score(scores, checklist, isAktif = true) {
  if (isAktif === false || !scores) return 0;
  let total = 0;
  let activeWeight = 0;
  INDIKATOR_K3.forEach(ind => {
    const isChecked = checklist ? (checklist[ind.id] !== false) : true;
    if (isChecked) {
      const val = parseFloat(scores[ind.id]);
      if (!isNaN(val)) {
        total += (val * (ind.bobot / 100));
        activeWeight += ind.bobot;
      }
    }
  });
  if (activeWeight === 0) return 0;
  return parseFloat(((total / activeWeight) * 100).toFixed(2));
}

function getPraktikanCompleteSummary(nim) {
  const praktikan = AppState.praktikanList.find(p => p.nim === nim);
  if (!praktikan) return null;

  // 1. Rekap Nilai Laporan
  const laporanAcara = {};
  let totalLaporanScore = 0;
  let countLaporanAda = 0;

  AppState.acaraList.forEach(acara => {
    const entry = (AppState.grades.laporan[nim] && AppState.grades.laporan[nim][acara.id]) || null;
    const isAktif = entry ? (entry.aktif !== false) : true;
    const score = (entry && isAktif) ? calculateLaporanScore(entry.scores, entry.checklist, isAktif) : 0;
    laporanAcara[acara.id] = {
      score: score,
      aktif: isAktif,
      catatan: entry ? entry.catatan : '',
      penilai: entry ? entry.penilai : '-',
      tanggal: entry ? entry.tanggal : '-'
    };
    if (entry && isAktif) {
      totalLaporanScore += score;
      countLaporanAda++;
    }
  });

  const avgLaporan = countLaporanAda > 0 ? parseFloat((totalLaporanScore / countLaporanAda).toFixed(2)) : 0;

  // 2. Rekap Nilai Video (Dukungan N/A tanpa menurunkan rata-rata)
  const videoAcara = {};
  let totalVideoScore = 0;
  let countVideoWajib = 0;

  AppState.acaraList.forEach(acara => {
    const entry = (AppState.grades.video[nim] && AppState.grades.video[nim][acara.id]) || null;
    const isAktif = entry ? (entry.aktif !== false) : true;
    const isNA = !isAktif || !acara.wajibVideo || (entry && entry.isNA);
    const scoreRes = entry ? calculateVideoScore(entry.scores, isNA, entry.checklist, isAktif) : { score: 0, isNA: isNA };

    videoAcara[acara.id] = {
      isNA: isNA,
      aktif: isAktif,
      score: isNA ? null : scoreRes.score,
      catatan: entry ? entry.catatan : ''
    };

    if (!isNA && entry && isAktif) {
      totalVideoScore += scoreRes.score;
      countVideoWajib++;
    }
  });

  const isVideoComponentNA = countVideoWajib === 0;
  const avgVideo = countVideoWajib > 0 ? parseFloat((totalVideoScore / countVideoWajib).toFixed(2)) : 0;

  // 3. Komponen Lainnya (Mendukung Ceklis Komponen & Indikator)
  const performaEntry = AppState.grades.performa[nim];
  const isPerfAktif = performaEntry ? (performaEntry.aktif !== false) : true;
  const scorePerforma = (performaEntry && isPerfAktif) ? calculatePerformaScore(performaEntry.scores, performaEntry.checklist, isPerfAktif) : 0;

  const sikapEntry = AppState.grades.sikap[nim];
  const isSikAktif = sikapEntry ? (sikapEntry.aktif !== false) : true;
  const scoreSikap = (sikapEntry && isSikAktif) ? calculateSikapScore(sikapEntry.scores, sikapEntry.checklist, isSikAktif) : 0;

  const formatEntry = AppState.grades.formatLaporan[nim];
  const isFmtAktif = formatEntry ? (formatEntry.aktif !== false) : true;
  const scoreFormat = (formatEntry && isFmtAktif) ? calculateFormatScore(formatEntry.scores, formatEntry.checklist, isFmtAktif) : 0;

  const responsiEntry = AppState.grades.responsi[nim] || (AppState.globalResponsi && AppState.globalResponsi[nim]);
  const isRespAktif = responsiEntry ? (responsiEntry.aktif !== false) : true;
  const scoreResponsi = (responsiEntry && isRespAktif) ? calculateResponsiScore(responsiEntry, responsiEntry ? responsiEntry.checklist : null, isRespAktif) : 0;

  const k3Entry = AppState.grades.k3Kedisiplinan[nim];
  const isK3Aktif = k3Entry ? (k3Entry.aktif !== false) : true;
  const scoreK3 = (k3Entry && isK3Aktif) ? calculateK3Score(k3Entry.scores, k3Entry.checklist, isK3Aktif) : 0;

  // 4. Pembobotan Proporsional Dinamis & Fleksibel (Total Bisa > 100% untuk Apresiasi)
  const evalCfg = (AppState.config && AppState.config.evaluationConfig) || (typeof DEFAULT_EVALUATION_CONFIG !== 'undefined' ? DEFAULT_EVALUATION_CONFIG : null);
  const compCfg = (evalCfg && evalCfg.components) || {};

  const isLaporanGlobalAktif = compCfg.laporan !== false;
  const isVideoGlobalAktif = compCfg.video !== false;
  const isPerfGlobalAktif = compCfg.performa !== false && isPerfAktif;
  const isSikGlobalAktif = compCfg.sikap !== false && isSikAktif;
  const isRespGlobalAktif = compCfg.responsi !== false && isRespAktif;
  const isFmtGlobalAktif = compCfg.formatLaporan !== false && isFmtAktif;
  const isK3GlobalAktif = compCfg.k3Kedisiplinan !== false && isK3Aktif;

  const currentCfgWeights = (AppState.config && AppState.config.weights) || DEFAULT_CONFIG.weights;
  const baseWeights = {
    laporan: (!isLaporanGlobalAktif || countLaporanAda === 0) ? 0 : (currentCfgWeights.laporan ?? 35),
    video: (!isVideoGlobalAktif || isVideoComponentNA) ? 0 : (currentCfgWeights.video ?? 10),
    performa: !isPerfGlobalAktif ? 0 : (currentCfgWeights.performa ?? 15),
    sikap: !isSikGlobalAktif ? 0 : (currentCfgWeights.sikap ?? 10),
    responsi: !isRespGlobalAktif ? 0 : (currentCfgWeights.responsi ?? 20),
    formatLaporan: !isFmtGlobalAktif ? 0 : (currentCfgWeights.formatLaporan ?? 5),
    k3Kedisiplinan: !isK3GlobalAktif ? 0 : (currentCfgWeights.k3Kedisiplinan ?? 5)
  };

  const totalBaseWeight = Object.values(baseWeights).reduce((a, b) => a + b, 0);

  let effectiveWeights;
  if (totalBaseWeight > 100) {
    // Apresiasi nilai Co.Ass: Total bobot lebih dari 100% langsung dihitung sesuai bobot pilihan Co.Ass
    effectiveWeights = Object.assign({}, baseWeights);
  } else {
    // Normalisasi proporsional jika ada komponen N/A atau dinonaktifkan
    const activeSum = totalBaseWeight > 0 ? totalBaseWeight : 100;
    effectiveWeights = {
      laporan: parseFloat(((baseWeights.laporan / activeSum) * 100).toFixed(2)),
      video: (isVideoComponentNA || !isVideoGlobalAktif) ? 0 : parseFloat(((baseWeights.video / activeSum) * 100).toFixed(2)),
      performa: parseFloat(((baseWeights.performa / activeSum) * 100).toFixed(2)),
      sikap: parseFloat(((baseWeights.sikap / activeSum) * 100).toFixed(2)),
      responsi: parseFloat(((baseWeights.responsi / activeSum) * 100).toFixed(2)),
      formatLaporan: parseFloat(((baseWeights.formatLaporan / activeSum) * 100).toFixed(2)),
      k3Kedisiplinan: parseFloat(((baseWeights.k3Kedisiplinan / activeSum) * 100).toFixed(2))
    };
  }

  let nilaiAkhir = (
    (avgLaporan * (effectiveWeights.laporan / 100)) +
    (avgVideo * (effectiveWeights.video / 100)) +
    (scorePerforma * (effectiveWeights.performa / 100)) +
    (scoreSikap * (effectiveWeights.sikap / 100)) +
    (scoreResponsi * (effectiveWeights.responsi / 100)) +
    (scoreFormat * (effectiveWeights.formatLaporan / 100)) +
    (scoreK3 * (effectiveWeights.k3Kedisiplinan / 100))
  );
  // Dibatasi maksimal 100
  nilaiAkhir = Math.min(100, parseFloat(nilaiAkhir.toFixed(2)));

  // Tentukan Grade
  let gradeHuruf = "E";
  let gradeLabel = "Sangat Kurang";
  let gradeColor = "rose";

  for (const b of AppState.config.gradeBoundaries) {
    if (nilaiAkhir >= b.min) {
      gradeHuruf = b.grade;
      gradeLabel = b.label;
      gradeColor = b.color;
      break;
    }
  }

  // 5. Statistik Kehadiran
  const listKehadiran = (AppState.grades.kehadiran[nim]) || [];
  const totalPertemuan = AppState.acaraList.length;
  let hadirCount = 0, izinCount = 0, sakitCount = 0, alpaCount = 0, terlambatCount = 0;

  listKehadiran.forEach(k => {
    if (k.status === 'Hadir' || k.status === true) hadirCount++;
    else if (k.status === 'Izin') izinCount++;
    else if (k.status === 'Sakit') sakitCount++;
    else if (k.status === 'Alpa' || k.status === 'Tanpa Keterangan' || k.status === 'Tidak Hadir' || k.status === false || k.status === 'Absen' || k.status === 'Absen (tdk hadir)') alpaCount++;
    else if (k.status === 'Terlambat') { hadirCount++; terlambatCount++; }
  });

  const persenKehadiran = totalPertemuan > 0 
    ? Math.min(100, Math.round(((hadirCount + izinCount + sakitCount) / totalPertemuan) * 100))
    : 100;

  // 6. Statistik Konsultasi & Revisi
  const listKonsultasi = (AppState.grades.konsultasi[nim]) || [];
  const totalKonsul = listKonsultasi.length;
  const selesaiRevisiCount = listKonsultasi.filter(k => k.statusRevisi === 'Selesai Disetujui').length;
  const persenRevisi = totalKonsul > 0 ? Math.round((selesaiRevisiCount / totalKonsul) * 100) : 100;

  // 7. Catatan Evaluasi
  const catatanEvaluasi = AppState.grades.catatanEvaluasi[nim] || {
    kelebihan: "-",
    kelemahan: "-",
    rekomendasi: "-",
    penilai: "-"
  };

  return {
    nim: praktikan.nim,
    nama: praktikan.nama,
    kelompok: praktikan.kelompok,
    coassNama: praktikan.coassNama || "-",
    coassId: praktikan.coassId,
    laporanAcara,
    avgLaporan,
    videoAcara,
    isVideoComponentNA,
    countVideoWajib,
    avgVideo,
    scorePerforma,
    scoreSikap,
    scoreFormat,
    scoreResponsi,
    scoreK3,
    baseWeights,
    effectiveWeights,
    nilaiAkhir,
    grade: gradeHuruf,
    gradeLabel,
    gradeColor,
    statusLulus: nilaiAkhir >= 60 ? "LULUS" : "TIDAK LULUS",
    hadirCount,
    izinCount,
    sakitCount,
    alpaCount,
    terlambatCount,
    persenKehadiran,
    totalKonsul,
    selesaiRevisiCount,
    persenRevisi,
    catatanEvaluasi
  };
}

/**
 * 4. RENDERING TAMPILAN UTAMA
 */
function isAnyModalOpen() {
  const modalContainer = document.getElementById('modal-container');
  return Boolean(modalContainer && !modalContainer.classList.contains('hidden'));
}

let _lastSyncToastTime = 0;

// Mendeteksi apakah pengguna sedang aktif berinteraksi agar background sync tidak merusak tampilan/fokus/geser tabel
function isUserInteracting() {
  if (isAnyModalOpen()) return true;
  if (!AppState.currentUser) return true;
  if (AppState.activeTab === 'input-nilai') return true;
  if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return true;
  const scrollables = document.querySelectorAll('.overflow-x-auto');
  for (const s of scrollables) {
    if (s.scrollLeft > 0) return true;
  }
  return false;
}

function renderApp() {
  const root = document.getElementById('app-root');
  if (!root) return;

  // Lindungi modal dialog saat sedang dibuka user (misal sedang membuat/mengedit praktikum atau Co.Ass)
  if (isAnyModalOpen()) {
    return;
  }

  // Jika belum login, tampilkan halaman Login sederhana sesuai foto yang dikirimkan user
  if (!AppState.currentUser) {
    root.innerHTML = renderLoginSection();
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  // Jika sudah login, tampilkan Dashboard
  root.innerHTML = `
    ${renderHeader()}
    <div class="flex flex-col lg:flex-row min-h-[90vh] bg-slate-50 text-slate-800">
      ${renderSidebar()}
      <main class="flex-1 p-4 md:p-8 overflow-y-auto">
        ${renderMainContent()}
      </main>
    </div>
    ${renderFooter()}
    ${renderModals()}
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();
  bindDashboardEvents();
}

/**
 * TAMPILAN LOGIN SEDERHANA SESUAI GAMBAR USER
 * Background: Mint Teal (#56b29d), White Card, Logo INSTIPER, Lora Bold Title, Poppins Body
 */
function renderLoginSection() {
  const role = AppState.currentLoginRole || 'praktikan';

  let userLabel = "Nama Lengkap Praktikan";
  let userPlaceholder = "Masukan Nama Lengkap";
  let passLabel = "Nomor Induk Mahasiswa (NIM)";
  let passPlaceholder = "Masukan NIM Praktikan";
  let helpNote = "Login Praktikan: Masukan Nama & NIM Anda sesuai data praktikum.";

  if (role === 'coass') {
    userLabel = "Nama / Email Co.Ass";
    userPlaceholder = "Masukan Nama atau Email Co.Ass";
    passLabel = "Kode Login Khusus Co.Ass";
    passPlaceholder = "Masukan Kode Login (Contoh: COASS-TIARA-01)";
    helpNote = "Login Co.Ass: Gunakan Kode Login Khusus Anda yang diberikan Koordinator.";
  } else if (role === 'koordinator') {
    userLabel = "Username Koordinator / Dospem";
    userPlaceholder = "Masukan Username Anda";
    passLabel = "Password / PIN";
    passPlaceholder = "Masukan Password / PIN Anda";
    helpNote = "Login Koordinator / Dospem: Masukan Username & Password terdaftar Anda.";
  }

  return `
    <div class="min-h-screen w-full flex items-center justify-center p-4 bg-[#56b29d]">
      <div class="bg-white rounded-xl shadow-2xl p-8 sm:p-10 w-full max-w-[440px] text-center border border-slate-100">
        
        <!-- Logo INSTIPER Yogyakarta (Logo Resmi dari Gambar User) -->
        <div class="flex items-center justify-center space-x-3 mb-6">
          <div class="w-14 h-14 shrink-0 flex items-center justify-center">
            <img src="${LOGO_INSTIPER_SRC}" alt="Logo INSTIPER" class="w-full h-full object-contain drop-shadow-sm">
          </div>
          <div class="text-left">
            <div class="text-[9px] font-bold tracking-wider text-slate-700 uppercase leading-none">INSTITUT PERTANIAN STIPER</div>
            <div class="text-2xl font-black tracking-tight text-[#1e7e34] leading-none my-1 font-title">INSTIPER</div>
            <div class="text-[9px] font-bold tracking-widest text-slate-700 uppercase leading-none">YOGYAKARTA</div>
          </div>
        </div>

        <!-- Judul SIGN IN (Font Lora Bold) -->
        <div class="text-left mb-4">
          <h2 class="font-title text-xl font-bold text-slate-900 tracking-wide">SIGN IN</h2>
          <p class="text-xs text-slate-500 mt-0.5">Silahkan Sign In Untuk Mengakses Sistem</p>
        </div>

        <!-- Pilihan Peran Login (Minimalist Tabs) -->
        <div class="flex rounded-lg bg-slate-100 p-1 mb-5 text-xs font-medium">
          <button type="button" onclick="setLoginRole('praktikan')" 
            class="flex-1 py-1.5 rounded-md transition ${role === 'praktikan' ? 'bg-white text-[#56b29d] font-bold shadow-sm' : 'text-slate-500 hover:text-slate-800'}">
            Praktikan
          </button>
          <button type="button" onclick="setLoginRole('coass')" 
            class="flex-1 py-1.5 rounded-md transition ${role === 'coass' ? 'bg-white text-[#56b29d] font-bold shadow-sm' : 'text-slate-500 hover:text-slate-800'}">
            Co.Ass
          </button>
          <button type="button" onclick="setLoginRole('koordinator')" 
            class="flex-1 py-1.5 rounded-md transition ${role === 'koordinator' ? 'bg-white text-[#56b29d] font-bold shadow-sm' : 'text-slate-500 hover:text-slate-800'}">
            Koordinator / Dospem
          </button>
        </div>

        <!-- Form Sign In -->
        <form onsubmit="handleUnifiedLoginSubmit(event)" class="space-y-4 text-left">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">${userLabel}</label>
            <input type="text" id="unified-login-user" required placeholder="${userPlaceholder}"
              class="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#56b29d] focus:border-[#56b29d] text-xs transition">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">${passLabel}</label>
            <div class="relative">
              <input type="password" id="unified-login-pass" required placeholder="${passPlaceholder}"
                class="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#56b29d] focus:border-[#56b29d] text-xs transition font-mono">
              <button type="button" onclick="togglePasswordVisibility('unified-login-pass', this)" 
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 focus:outline-none"
                title="Lihat / Sembunyikan">
                <i data-lucide="eye" class="w-4 h-4"></i>
              </button>
            </div>
          </div>

          <button type="submit" 
            class="w-full bg-[#56b29d] hover:bg-[#469c88] text-white font-bold py-2.5 px-4 rounded-lg text-sm transition shadow-sm mt-2">
            Sign In
          </button>

          <!-- Catatan Bantuan -->
          <div class="pt-2 text-center">
            <p class="text-[11px] text-slate-400 leading-tight">${helpNote}</p>
          </div>
        </form>

        <!-- Status Database Cloud & Tombol Refresh -->
        <div class="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div class="flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full ${AppState.syncStatus.online ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}"></span>
            <span>${AppState.syncStatus.online ? 'Drive Terhubung' : 'Lokal / Siap Sync'}</span>
          </div>
          <div class="flex items-center space-x-2">
            <button type="button" onclick="openModalConnectCloud()" class="hover:text-[#56b29d] text-slate-600 flex items-center space-x-1 transition font-medium" title="Koneksikan Google Drive">
              <i data-lucide="link" class="w-3 h-3 text-[#56b29d]"></i>
              <span>Hubungkan</span>
            </button>
            <button type="button" onclick="pullFromGoogleSheetsSilent(true)" class="hover:text-[#56b29d] text-slate-600 flex items-center space-x-1 transition font-medium" title="Muat ulang data terbaru dari Google Drive">
              <i data-lucide="refresh-cw" class="w-3 h-3 text-[#56b29d]"></i>
              <span>Refresh</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  `;
}

function setLoginRole(role) {
  AppState.currentLoginRole = role;
  renderApp();
}

async function handleUnifiedLoginSubmit(e) {
  e.preventDefault();
  const userInput = document.getElementById('unified-login-user').value.trim();
  const passInput = document.getElementById('unified-login-pass').value.trim();
  const role = AppState.currentLoginRole || 'praktikan';

  if (role === 'praktikan') {
    await loginPraktikan(userInput, passInput);
  } else if (role === 'coass') {
    const code = passInput || userInput;
    await loginCoAss(code);
  } else if (role === 'koordinator') {
    await loginDeveloper(userInput, passInput);
  }
}

/**
 * Komponen: Header Navbar
 */
function renderHeader() {
  const user = AppState.currentUser;
  return `
    <header class="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-40 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        <div class="flex items-center space-x-3">
          <!-- Logo INSTIPER Header -->
          <div class="w-10 h-10 shrink-0 flex items-center justify-center">
            <img src="${LOGO_INSTIPER_SRC}" alt="Logo INSTIPER" class="w-full h-full object-contain drop-shadow-sm">
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <h1 class="font-title text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none">
                INSTIPER YOGYAKARTA
              </h1>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-[#56b29d] font-bold border border-slate-200">
                ${escapeHtml(AppState.config.semester)} ${escapeHtml(AppState.config.academicYear)}
              </span>
            </div>
            <p class="text-xs text-slate-500 font-title mt-0.5">${escapeHtml(AppState.config.courseTitle)}</p>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <!-- Quick Praktikum Switcher for Koordinator & Co.Ass -->
          ${(user && (user.role === 'developer' || user.role === 'coass') && AppState.praktikumList && AppState.praktikumList.length > 1) ? `
            <div class="hidden xl:flex items-center space-x-1.5 text-xs bg-slate-50 border border-slate-200 py-1.5 px-2.5 rounded-lg shadow-sm">
              <i data-lucide="folder-kanban" class="w-3.5 h-3.5 text-[#56b29d]"></i>
              <span class="text-[11px] font-bold text-slate-500 uppercase">Praktikum:</span>
              <select onchange="switchPraktikum(this.value)" class="bg-transparent border-none text-xs font-bold text-slate-800 focus:ring-0 cursor-pointer py-0 pr-6">
                ${AppState.praktikumList.map(p => `
                  <option value="${escapeHtml(p.id)}" ${p.id === AppState.activePraktikumId ? 'selected' : ''}>
                    ${escapeHtml(p.nama)}
                  </option>
                `).join('')}
              </select>
            </div>
          ` : ''}

          <!-- Tombol Cepat Kontrol Evaluasi untuk Koordinator -->
          ${isKoordinatorOrDeveloper() ? `
            <button onclick="openModalAturEvaluasiKoordinator()" class="hidden lg:flex items-center space-x-1.5 text-xs bg-teal-50 hover:bg-teal-100 text-[#2d6055] border border-teal-200 py-1.5 px-3 rounded-lg shadow-xs font-semibold transition" title="Kontrol Penilaian & Sub-Penilaian Aktif oleh Koordinator">
              <i data-lucide="sliders" class="w-3.5 h-3.5 text-[#56b29d]"></i>
              <span>Atur Nilai Aktif</span>
            </button>
          ` : ''}

          <!-- Indikator Google Drive -->
          <div class="hidden md:flex items-center space-x-2 text-xs px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
            <span class="w-2 h-2 rounded-full ${AppState.syncStatus.online ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}"></span>
            <span class="text-slate-600 font-medium">Drive: ${escapeHtml(AppState.config.developerEmail)}</span>
            <span class="text-slate-300">|</span>
            <span class="${AppState.syncStatus.online ? 'text-emerald-600 font-semibold' : 'text-amber-600'}">
              ${AppState.syncStatus.online ? 'Terhubung' : 'Lokal/Siap Sync'}
            </span>
          </div>

          ${user ? `
            <div class="flex items-center space-x-3">
              <div class="text-right hidden sm:block">
                <div class="text-xs font-bold text-slate-800">${escapeHtml(user.data.nama)}</div>
                <div class="text-[11px] text-[#56b29d] font-medium capitalize">
                  ${user.role === 'developer' ? 'Koordinator Praktikum' : user.role === 'coass' ? 'Co.Ass Penilai' : 'Praktikan'}
                </div>
              </div>
              <button onclick="logout()" class="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition" title="Sign Out">
                <i data-lucide="log-out" class="w-5 h-5"></i>
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    </header>
  `;
}

/**
 * Komponen: Sidebar Navigasi
 */
function renderSidebar() {
  const role = AppState.currentUser.role;
  const currentTab = AppState.activeTab;

  const navItems = [
    {
      id: 'rekap',
      label: 'Rekapitulasi Nilai',
      icon: 'table',
      roles: ['developer', 'coass']
    },
    {
      id: 'input-nilai',
      label: 'Penilaian Co.Ass',
      icon: 'check-square',
      roles: ['developer', 'coass']
    },
    {
      id: 'profil-praktikan',
      label: role === 'praktikan' ? 'Kartu Nilai Saya' : 'Detail Nilai Praktikan',
      icon: 'user-check',
      roles: ['developer', 'coass', 'praktikan']
    },
    {
      id: 'manajemen-praktikan',
      label: 'Kelola Praktikan',
      icon: 'users',
      roles: ['developer', 'coass']
    },
    {
      id: 'manajemen-coass',
      label: 'Kelola Co.Ass & Kode',
      icon: 'key',
      roles: ['developer']
    },
    {
      id: 'pengaturan',
      label: 'Pengaturan & Drive',
      icon: 'settings',
      roles: ['developer']
    }
  ];

  const allowedItems = navItems.filter(item => item.roles.includes(role));

  return `
    <aside class="w-full lg:w-64 bg-white border-r border-slate-200 shrink-0">
      <div class="p-4 border-b border-slate-100">
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Peran Saat Ini</div>
        <div class="mt-1 flex items-center justify-between">
          <span class="text-sm font-bold text-slate-900 capitalize">${role === 'developer' ? 'Koordinator / Dospem' : role}</span>
          <span class="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
            ${role === 'developer' ? 'Koordinator / Dospem' : role === 'coass' ? 'Co.Ass Penilai' : 'Mahasiswa'}
          </span>
        </div>
      </div>

      <nav class="p-3 space-y-1">
        ${allowedItems.map(item => `
          <button onclick="switchTab('${item.id}')" 
            class="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${currentTab === item.id ? 'bg-[#56b29d] text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}">
            <i data-lucide="${item.icon}" class="w-4 h-4 ${currentTab === item.id ? 'text-white' : 'text-slate-400'}"></i>
            <span>${item.label}</span>
          </button>
        `).join('')}
      </nav>

      ${role === 'praktikan' ? `
        <!-- Panel Cetak Khusus Praktikan -->
        <div class="p-4 mt-4 mx-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
          <div class="font-semibold text-slate-700 flex items-center justify-between">
            <span>Hasil Nilai Praktikum</span>
            <i data-lucide="award" class="w-4 h-4 text-[#56b29d]"></i>
          </div>
          <p class="text-slate-500 text-[11px] leading-tight">
            Cetak atau simpan Kartu Hasil Praktikum (KHP) resmi Anda.
          </p>
          <button onclick="window.print()" class="w-full bg-[#56b29d] hover:bg-[#469c88] text-white font-medium py-2 px-2.5 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition shadow-sm">
            <i data-lucide="printer" class="w-3.5 h-3.5"></i>
            <span>Cetak / Simpan KHP</span>
          </button>
        </div>
      ` : `
        <!-- Panel Cepat Excel & Sinkronisasi Drive untuk Koordinator & Co.Ass -->
        <div class="p-4 mt-4 mx-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
          <div class="font-semibold text-slate-700 flex items-center justify-between">
            <span>Database & Excel</span>
            <i data-lucide="file-spreadsheet" class="w-4 h-4 text-[#56b29d]"></i>
          </div>
          <p class="text-slate-500 text-[11px] leading-tight">
            Akses data real-time, sinkron cloud, dan unduh rekap (.xlsx).
          </p>
          <button onclick="exportToExcel()" class="w-full bg-[#56b29d] hover:bg-[#469c88] text-white font-medium py-2 px-2.5 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition shadow-sm">
            <i data-lucide="download" class="w-3.5 h-3.5"></i>
            <span>Download Excel (.xlsx)</span>
          </button>
          ${role === 'developer' ? `
            <button onclick="openModalImportExcel()" class="w-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium py-1.5 px-2.5 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition" title="Upload data mahasiswa banyak sekaligus dari file Excel">
              <i data-lucide="upload" class="w-3.5 h-3.5 text-[#56b29d]"></i>
              <span>Import Praktikan Excel</span>
            </button>
          ` : ''}
          <button onclick="syncWithGoogleSheets(true)" class="w-full bg-[#2d6055] hover:bg-[#224b43] text-white font-medium py-1.5 px-2.5 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition shadow-sm" title="Sinkronisasi seluruh data ke Google Drive juzantiara@gmail.com">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-[#8acfc0]"></i>
            <span>Sinkronisasi ke Drive</span>
          </button>
        </div>
      `}
    </aside>
  `;
}

/**
 * Komponen: Router Konten Utama
 */
function renderMainContent() {
  switch (AppState.activeTab) {
    case 'rekap':
      return renderRekapitulasiView();
    case 'input-nilai':
      return renderInputNilaiCoAssView();
    case 'profil-praktikan':
      return renderDetailPraktikanView();
    case 'manajemen-coass':
      return renderManajemenCoAssView();
    case 'manajemen-praktikan':
      return renderManajemenPraktikanView();
    case 'pengaturan':
      return renderPengaturanView();
    default:
      return renderRekapitulasiView();
  }
}

/**
 * Komponen: Footer
 */
function renderFooter() {
  return `
    <footer class="bg-white border-t border-slate-200 py-5 text-center text-xs text-slate-500">
      <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          <span class="font-title font-bold text-slate-800">INSTIPER YOGYAKARTA</span> &bull; Sistem Informasi Penilaian Praktikum
        </div>
        <div class="flex items-center space-x-2">
          <span>Drive: <strong class="text-slate-700">${escapeHtml(AppState.config.developerEmail)}</strong></span>
          <span>&bull;</span>
          <span class="text-[#56b29d] font-mono">v1.2.0</span>
        </div>
      </div>
    </footer>
  `;
}

/**
 * 5. TAMPILAN 1: REKAPITULASI NILAI LENGKAP
 */
function renderRekapitulasiView() {
  const summaries = AppState.praktikanList.map(p => getPraktikanCompleteSummary(p.nim));
  const weights = AppState.config.weights;

  // Daftar Kelompok Dinamis (sesuai jumlah kelompok praktikum, default s/d Kelompok 8)
  const allKelompokList = getKelompokList();

  // Hitung Statistik
  const validScores = summaries.map(s => s.nilaiAkhir);
  const avgClass = validScores.length > 0 ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1) : 0;
  const highest = validScores.length > 0 ? Math.max(...validScores).toFixed(1) : 0;
  const lowest = validScores.length > 0 ? Math.min(...validScores).toFixed(1) : 0;
  const lulusCount = summaries.filter(s => s.statusLulus === 'LULUS').length;

  return `
    <div class="space-y-6">
      <!-- Header Tampilan -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 class="font-title text-2xl font-bold text-slate-900 tracking-tight">Rekapitulasi Nilai Akhir Praktikan</h2>
          <p class="text-xs text-slate-500 mt-1">
            Data penilaian praktikum terstruktur, transparan, dan tersimpan aman di Google Drive.
          </p>
        </div>
        <div class="flex items-center space-x-2">
          <button onclick="openModalImportExcel()" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold py-2 px-3.5 rounded-xl shadow-sm flex items-center space-x-1.5 transition">
            <i data-lucide="upload" class="w-4 h-4 text-[#56b29d]"></i>
            <span>Import Excel</span>
          </button>
          <button onclick="exportToExcel()" class="bg-[#56b29d] hover:bg-[#469c88] text-white text-xs font-semibold py-2 px-4 rounded-xl shadow-sm flex items-center space-x-1.5 transition">
            <i data-lucide="file-spreadsheet" class="w-4 h-4"></i>
            <span>Export Hasil Excel</span>
          </button>
          <button onclick="window.print()" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium py-2 px-3 rounded-xl shadow-sm flex items-center space-x-1.5 transition">
            <i data-lucide="printer" class="w-4 h-4"></i>
            <span>Cetak KHP</span>
          </button>
        </div>
      </div>

      <!-- Stat Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Rata-rata Kelas</div>
          <div class="text-2xl font-bold text-[#56b29d] font-mono mt-1">${avgClass}</div>
          <div class="text-[11px] text-slate-500 mt-0.5">Dari total ${summaries.length} praktikan</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Nilai Tertinggi</div>
          <div class="text-2xl font-bold text-emerald-600 font-mono mt-1">${highest}</div>
          <div class="text-[11px] text-slate-500 mt-0.5">Skala 0 - 100</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Nilai Terendah</div>
          <div class="text-2xl font-bold text-amber-600 font-mono mt-1">${lowest}</div>
          <div class="text-[11px] text-slate-500 mt-0.5">Skala 0 - 100</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tingkat Kelulusan</div>
          <div class="text-2xl font-bold text-slate-900 font-mono mt-1">${Math.round((lulusCount / (summaries.length || 1)) * 100)}%</div>
          <div class="text-[11px] text-slate-500 mt-0.5">${lulusCount} dari ${summaries.length} praktikan lulus</div>
        </div>
      </div>

      <!-- Komposisi Bobot -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="font-title text-sm font-bold text-slate-900">Komposisi Bobot Penilaian Resmi</h3>
          <span class="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono font-bold">Total: 100%</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-xs">
          <div class="p-2 rounded-lg bg-slate-50 border border-slate-200">
            <span class="text-slate-500">Laporan</span>
            <div class="font-bold text-[#56b29d] mt-0.5 font-mono">${weights.laporan}%</div>
          </div>
          <div class="p-2 rounded-lg bg-slate-50 border border-slate-200">
            <span class="text-slate-500">Video</span>
            <div class="font-bold text-[#56b29d] mt-0.5 font-mono">${weights.video}%</div>
          </div>
          <div class="p-2 rounded-lg bg-slate-50 border border-slate-200">
            <span class="text-slate-500">Performa</span>
            <div class="font-bold text-[#56b29d] mt-0.5 font-mono">${weights.performa}%</div>
          </div>
          <div class="p-2 rounded-lg bg-slate-50 border border-slate-200">
            <span class="text-slate-500">Sikap</span>
            <div class="font-bold text-[#56b29d] mt-0.5 font-mono">${weights.sikap}%</div>
          </div>
          <div class="p-2 rounded-lg bg-slate-50 border border-slate-200">
            <span class="text-slate-500">Responsi</span>
            <div class="font-bold text-[#56b29d] mt-0.5 font-mono">${weights.responsi}%</div>
          </div>
          <div class="p-2 rounded-lg bg-slate-50 border border-slate-200">
            <span class="text-slate-500">Format</span>
            <div class="font-bold text-[#56b29d] mt-0.5 font-mono">${weights.formatLaporan}%</div>
          </div>
          <div class="p-2 rounded-lg bg-slate-50 border border-slate-200">
            <span class="text-slate-500">Kedisiplinan</span>
            <div class="font-bold text-[#56b29d] mt-0.5 font-mono">${weights.k3Kedisiplinan}%</div>
          </div>
        </div>
      </div>

      <!-- Tabel Rekapitulasi Lengkap -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 class="font-title text-base font-bold text-slate-900">Daftar Nilai Seluruh Praktikan</h3>
          <div class="flex items-center space-x-2">
            <input type="text" id="rekap-search-input" oninput="filterRekapTable()" placeholder="Cari Nama / NIM..." 
              class="px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-[#56b29d] w-48">
            <select id="rekap-filter-kelompok" onchange="filterRekapTable()" class="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-[#56b29d] focus:outline-none">
              <option value="">Semua Kelompok</option>
              ${allKelompokList.map(k => `
                <option value="${escapeHtml(k)}">${escapeHtml(k)}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-900 text-white font-title font-semibold text-center">
              <tr>
                <th class="p-3 w-10">No</th>
                <th class="p-3 text-left">Nama Praktikan</th>
                <th class="p-3 text-left">NIM</th>
                <th class="p-3 text-left">Kelompok</th>
                <th class="p-3 text-left">Co.Ass Penilai</th>
                <th class="p-3 text-right">Laporan</th>
                <th class="p-3 text-right">Video</th>
                <th class="p-3 text-right">Performa</th>
                <th class="p-3 text-right">Sikap</th>
                <th class="p-3 text-right">Responsi</th>
                <th class="p-3 text-right">Format</th>
                <th class="p-3 text-right">Kedisiplinan</th>
                <th class="p-3 bg-[#3d8373] text-white font-bold">NILAI AKHIR</th>
                <th class="p-3">Grade</th>
                <th class="p-3">Status</th>
                <th class="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody id="rekap-table-body" class="divide-y divide-slate-100">
              ${summaries.map((s, index) => renderRekapTableRow(s, index + 1)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderRekapTableRow(s, no) {
  const gradeBadgeClass = 
    s.grade === 'A' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
    s.grade === 'B' ? 'bg-blue-100 text-blue-800 border-blue-300' :
    s.grade === 'C' ? 'bg-amber-100 text-amber-800 border-amber-300' :
    s.grade === 'D' ? 'bg-orange-100 text-orange-800 border-orange-300' :
    'bg-rose-100 text-rose-800 border-rose-300';

  return `
    <tr class="hover:bg-slate-50 transition" data-nim="${escapeHtml(s.nim)}" data-nama="${escapeHtml(s.nama.toLowerCase())}" data-kelompok="${escapeHtml(s.kelompok)}">
      <td class="p-3 text-center font-mono text-slate-500">${no}</td>
      <td class="p-3 font-semibold text-slate-900">${escapeHtml(s.nama)}</td>
      <td class="p-3 font-mono text-slate-600">${escapeHtml(s.nim)}</td>
      <td class="p-3 text-slate-600">${escapeHtml(s.kelompok)}</td>
      <td class="p-3 text-slate-600 text-[11px]">${escapeHtml(s.coassNama)}</td>
      <td class="p-3 text-right font-mono font-medium">${s.avgLaporan.toFixed(1)}</td>
      <td class="p-3 text-right font-mono font-medium ${s.isVideoComponentNA ? 'text-slate-400 italic' : ''}">
        ${s.isVideoComponentNA ? 'N/A' : s.avgVideo.toFixed(1)}
      </td>
      <td class="p-3 text-right font-mono font-medium">${s.scorePerforma.toFixed(1)}</td>
      <td class="p-3 text-right font-mono font-medium">${s.scoreSikap.toFixed(1)}</td>
      <td class="p-3 text-right font-mono font-medium">${s.scoreResponsi.toFixed(1)}</td>
      <td class="p-3 text-right font-mono font-medium">${s.scoreFormat.toFixed(1)}</td>
      <td class="p-3 text-right font-mono font-medium">${s.scoreK3.toFixed(1)}</td>
      <td class="p-3 text-center font-mono font-bold text-slate-900 bg-emerald-50 text-sm">
        ${s.nilaiAkhir.toFixed(2)}
      </td>
      <td class="p-3 text-center">
        <span class="px-2 py-0.5 rounded-full text-xs font-bold border ${gradeBadgeClass}">
          ${s.grade}
        </span>
      </td>
      <td class="p-3 text-center">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${s.statusLulus === 'LULUS' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}">
          ${s.statusLulus}
        </span>
      </td>
      <td class="p-3 text-center">
        <button onclick="viewPraktikanDetail('${escapeHtml(s.nim)}')" class="px-2.5 py-1 rounded-lg bg-[#56b29d]/10 hover:bg-[#56b29d]/20 text-[#3a8473] font-semibold transition text-xs">
          Detail
        </button>
      </td>
    </tr>
  `;
}

/**
 * 6. TAMPILAN 2: INPUT PENILAIAN CO.ASS (Bisa Diakses & Update Kapanpun 24/7)
 */
function renderInputNilaiCoAssView() {
  const selectedNim = AppState.selectedPraktikanNIM || (AppState.praktikanList[0] ? AppState.praktikanList[0].nim : null);
  const selectedAcaraId = parseInt(AppState.selectedAcaraId) || 1;
  const praktikan = AppState.praktikanList.find(p => p.nim === selectedNim);
  const acara = AppState.acaraList.find(a => a.id === selectedAcaraId) || AppState.acaraList[0];

  if (!praktikan) {
    return `<div class="p-8 text-center text-slate-500">Belum ada praktikan terdaftar di sistem. Silakan tambah praktikan terlebih dahulu.</div>`;
  }

  // Ambil Data Nilai yang Ada
  const lapEntry = (AppState.grades.laporan[selectedNim] && AppState.grades.laporan[selectedNim][acara.id]) || { scores: {}, checklist: {}, aktif: true, catatan: '', tanggal: '' };
  const vidEntry = (AppState.grades.video[selectedNim] && AppState.grades.video[selectedNim][acara.id]) || { isNA: !acara.wajibVideo, checklist: {}, aktif: true, scores: {}, catatan: '' };
  const perfEntry = AppState.grades.performa[selectedNim] || { scores: {}, checklist: {}, aktif: true, catatan: '' };
  const sikEntry = AppState.grades.sikap[selectedNim] || { scores: {}, checklist: {}, aktif: true, catatan: '' };
  const fmtEntry = AppState.grades.formatLaporan[selectedNim] || { scores: {}, checklist: {}, aktif: true, catatan: '' };
  const respEntry = AppState.grades.responsi[selectedNim] || (AppState.globalResponsi && AppState.globalResponsi[selectedNim]) || { 
    scores: {}, 
    checklist: {},
    aktif: true,
    videoIndividu: { aktif: false, predikat: 'A', skor: 95 },
    videoKelompok: { aktif: false, predikat: 'A', skor: 95 },
    catatan: '' 
  };
  const k3Entry = AppState.grades.k3Kedisiplinan[selectedNim] || { scores: {}, checklist: {}, aktif: true, catatan: '' };

  const listKehadiran = AppState.grades.kehadiran[selectedNim] || [];
  const curKehadiran = listKehadiran.find(k => k.acaraId === acara.id) || {
    acaraId: acara.id,
    status: 'Hadir',
    tanggal: new Date().toISOString().split('T')[0],
    keterangan: 'Hadir'
  };
  const curStatus = curKehadiran.status || 'Hadir';

  const currentLapTotal = calculateLaporanScore(lapEntry.scores, lapEntry.checklist, lapEntry.aktif !== false);
  const currentVidTotal = calculateVideoScore(vidEntry.scores, vidEntry.isNA, vidEntry.checklist, vidEntry.aktif !== false);
  const currentPerfTotal = calculatePerformaScore(perfEntry.scores, perfEntry.checklist, perfEntry.aktif !== false);
  const currentSikTotal = calculateSikapScore(sikEntry.scores, sikEntry.checklist, sikEntry.aktif !== false);
  const currentFmtTotal = calculateFormatScore(fmtEntry.scores, fmtEntry.checklist, fmtEntry.aktif !== false);
  const currentRespTotal = calculateResponsiScore(respEntry, respEntry.checklist, respEntry.aktif !== false);
  const currentK3Total = calculateK3Score(k3Entry.scores, k3Entry.checklist, k3Entry.aktif !== false);

  const curSummary = getPraktikanCompleteSummary(selectedNim) || { nilaiAkhir: 0, grade: 'E', gradeLabel: '-', statusLulus: '-' };
  const currentWeights = (AppState.config && AppState.config.weights) || DEFAULT_CONFIG.weights;
  const totalWeights = Math.round((currentWeights.laporan||0) + (currentWeights.video||0) + (currentWeights.performa||0) + (currentWeights.sikap||0) + (currentWeights.formatLaporan||0) + (currentWeights.responsi||0) + (currentWeights.k3Kedisiplinan||0));

  let totalWeightClass = "text-xs px-2.5 py-1 rounded-full font-mono font-bold ";
  let totalWeightText = `Total Bobot: ${totalWeights}%`;
  if (totalWeights === 100) {
    totalWeightClass += "bg-emerald-100 text-emerald-800 border border-emerald-300";
    totalWeightText = `Total Bobot: 100% (Standar)`;
  } else if (totalWeights > 100) {
    const bonus = totalWeights - 100;
    totalWeightClass += "bg-purple-100 text-purple-900 border border-purple-300 shadow-sm animate-pulse";
    totalWeightText = `Total: ${totalWeights}% (+${bonus}% Apresiasi Nilai)`;
  } else {
    totalWeightClass += "bg-amber-100 text-amber-800 border border-amber-300";
    totalWeightText = `Total Bobot: ${totalWeights}%`;
  }

  const lastUpdated = lapEntry.tanggal || new Date().toISOString().split('T')[0];

  return `
    <div class="space-y-6">
      <!-- Toolbar Co.Ass: Update Kapanpun & Sinkronisasi -->
      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">Filter Kelompok</label>
            <select id="select-kelompok-grading" onchange="changeGradingKelompokFilter(this.value)" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:ring-1 focus:ring-[#56b29d]">
              <option value="all">Semua Kelompok</option>
              ${getKelompokList().map(k => `
                <option value="${k}" ${praktikan.kelompok === k ? 'selected' : ''}>${k}</option>
              `).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">Cari Nama / NIM</label>
            <div class="relative">
              <input type="text" id="search-praktikan-coass" placeholder="Ketik nama atau NIM..." oninput="handleSearchPraktikanCoAss(this.value)" class="w-full pl-8 pr-7 py-2 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-[#56b29d]">
              <i data-lucide="search" class="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400"></i>
              <button type="button" onclick="clearSearchPraktikanCoAss()" id="btn-clear-search-coass" class="hidden absolute right-2 top-2 text-slate-400 hover:text-slate-600">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">Pilih Mahasiswa</label>
            <select id="select-praktikan-coass" onchange="changeSelectedPraktikan(this.value)" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:ring-1 focus:ring-[#56b29d]">
              ${AppState.praktikanList.map(p => `
                <option value="${escapeHtml(p.nim)}" ${p.nim === selectedNim ? 'selected' : ''}>
                  ${escapeHtml(p.nim)} - ${escapeHtml(p.nama)} (${escapeHtml(p.kelompok)})
                </option>
              `).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">Pilih Acara Praktikum</label>
            <select id="select-acara-coass" onchange="changeSelectedAcara(this.value)" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:ring-1 focus:ring-[#56b29d]">
              ${AppState.acaraList.map(a => `
                <option value="${a.id}" ${a.id === selectedAcaraId ? 'selected' : ''}>
                  ${escapeHtml(a.nama)} ${a.wajibVideo ? '(Wajib Video)' : '(Tanpa Video)'}
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <div class="flex items-center space-x-2 shrink-0 flex-wrap gap-y-2">
          <button onclick="openModalExcelNilaiKelompok()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition" title="Input nilai praktikan menggunakan file Excel (.xlsx) per kelompok">
            <i data-lucide="file-spreadsheet" class="w-3.5 h-3.5"></i>
            <span>Nilai via Excel</span>
          </button>
          <button onclick="pullFromGoogleSheets()" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold py-2 px-3 rounded-xl text-xs flex items-center space-x-1.5 transition" title="Tarik pembaruan data terbaru dari Google Drive">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-[#56b29d]"></i>
            <span>Refresh Drive</span>
          </button>
          <button onclick="saveCurrentGradingForm('${escapeHtml(selectedNim)}', ${selectedAcaraId})" class="bg-[#56b29d] hover:bg-[#469c88] text-white font-semibold py-2 px-4 rounded-xl shadow-sm transition flex items-center space-x-2 text-xs">
            <i data-lucide="save" class="w-4 h-4"></i>
            <span>Simpan Nilai</span>
          </button>
        </div>
      </div>

      <!-- Header Identitas Praktikan Terpilih (Tanpa Shift) -->
      <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <span class="text-[10px] text-[#8acfc0] font-mono tracking-wider">IDENTITAS PRAKTIKAN</span>
          <h3 class="font-title text-xl font-bold mt-0.5">${escapeHtml(praktikan.nama)}</h3>
          <p class="text-xs text-slate-300 mt-1">
            NIM: <span class="font-mono font-semibold text-white">${escapeHtml(praktikan.nim)}</span> &bull; 
            Kelompok: <span class="font-semibold text-white">${escapeHtml(praktikan.kelompok)}</span> &bull; 
            Praktikum: <span class="text-[#8acfc0] font-semibold">${escapeHtml(getActivePraktikum().nama)}</span>
          </p>
        </div>
        <div class="text-right">
          <label class="block text-[11px] text-slate-400 mb-0.5">Co.Ass Penilai Acara Ini (Bergilir):</label>
          <select id="select-coass-penilai-acara" class="text-xs px-2.5 py-1 rounded bg-slate-800 text-[#8acfc0] font-bold border border-slate-700">
            ${AppState.coassList.map(c => `
              <option value="${escapeHtml(c.nama)}" ${(lapEntry.penilai || praktikan.coassNama || (AppState.currentUser && AppState.currentUser.data && AppState.currentUser.data.nama)) === c.nama ? 'selected' : ''}>
                ${escapeHtml(c.nama)}
              </option>
            `).join('')}
          </select>
          <div class="text-[11px] text-slate-400 mt-1 font-mono">Pembaruan: ${escapeHtml(lastUpdated)}</div>
        </div>
      </div>

      <!-- Tab Sub-Penilaian Co.Ass & Pemisahan Responsi -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 bg-slate-50 p-2 gap-2 text-xs font-medium">
          <!-- Jajaran 1: Penilaian Sesi Acara Praktikum -->
          <div class="flex flex-wrap items-center gap-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1.5 py-1">Sesi Acara:</span>
            <button onclick="switchGradingSubTab('tab-laporan')" id="btn-sub-laporan" class="py-2 px-3 border-b-2 border-[#56b29d] text-[#36786a] bg-white font-bold rounded-lg flex items-center space-x-1.5 transition">
              <i data-lucide="file-text" class="w-3.5 h-3.5"></i>
              <span>1. Laporan (${currentLapTotal})</span>
            </button>
            <button onclick="switchGradingSubTab('tab-video')" id="btn-sub-video" class="py-2 px-3 text-slate-600 hover:text-[#56b29d] rounded-lg flex items-center space-x-1.5 transition">
              <i data-lucide="video" class="w-3.5 h-3.5"></i>
              <span>2. Video (${vidEntry.isNA ? 'N/A' : currentVidTotal.score})</span>
            </button>
            <button onclick="switchGradingSubTab('tab-performa')" id="btn-sub-performa" class="py-2 px-3 text-slate-600 hover:text-[#56b29d] rounded-lg flex items-center space-x-1.5 transition">
              <i data-lucide="activity" class="w-3.5 h-3.5"></i>
              <span>3. Performa (${currentPerfTotal})</span>
            </button>
            <button onclick="switchGradingSubTab('tab-sikap')" id="btn-sub-sikap" class="py-2 px-3 text-slate-600 hover:text-[#56b29d] rounded-lg flex items-center space-x-1.5 transition">
              <i data-lucide="heart" class="w-3.5 h-3.5"></i>
              <span>4. Sikap (${currentSikTotal})</span>
            </button>
            <button onclick="switchGradingSubTab('tab-format')" id="btn-sub-format" class="py-2 px-3 text-slate-600 hover:text-[#56b29d] rounded-lg flex items-center space-x-1.5 transition">
              <i data-lucide="layout" class="w-3.5 h-3.5"></i>
              <span>5. Format (${currentFmtTotal})</span>
            </button>
            <button onclick="switchGradingSubTab('tab-k3')" id="btn-sub-k3" class="py-2 px-3 text-slate-600 hover:text-[#56b29d] rounded-lg flex items-center space-x-1.5 transition">
              <i data-lucide="shield" class="w-3.5 h-3.5"></i>
              <span>6. Kedisiplinan (${currentK3Total})</span>
            </button>
            <button onclick="switchGradingSubTab('tab-kehadiran')" id="btn-sub-kehadiran" class="py-2 px-3 text-slate-600 hover:text-[#56b29d] rounded-lg flex items-center space-x-1.5 transition">
              <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
              <span>7. Kehadiran</span>
            </button>
          </div>

          <!-- Jajaran 2: Penilaian Responsi Terpisah (DIBEDAKAN DARI JAJARAN DI ATAS) -->
          <div class="flex items-center pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-slate-200 md:pl-2.5 shrink-0">
            <button onclick="switchGradingSubTab('tab-responsi')" id="btn-sub-responsi" class="w-full md:w-auto py-2 px-3.5 rounded-xl font-bold flex items-center justify-center space-x-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-sm hover:from-emerald-700 hover:to-teal-800 transition ring-2 ring-emerald-400/50">
              <i data-lucide="sparkles" class="w-4 h-4 text-amber-300"></i>
              <span>★ Penilaian Responsi Terpisah</span>
              <span class="bg-white/20 text-[10px] px-2 py-0.5 rounded-full font-mono ml-1">${currentRespTotal} (${getPredikatResponsi(currentRespTotal).predikat})</span>
            </button>
          </div>
        </div>

        <div class="p-6">
          <!-- SUB-TAB 1: FORM LAPORAN -->
          <div id="subtab-content-tab-laporan" class="space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
              <div>
                <div class="flex items-center space-x-2">
                  <h4 class="font-title text-base font-bold text-slate-900">Penilaian Laporan Substansi (${escapeHtml(acara.nama)})</h4>
                  <label class="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 cursor-pointer">
                    <input type="checkbox" id="check-comp-laporan" ${lapEntry.aktif !== false ? 'checked' : ''} onchange="toggleComponentCheck('laporan', this.checked)" class="rounded text-[#56b29d] focus:ring-[#56b29d]">
                    <span>Aktifkan Komponen Laporan</span>
                  </label>
                </div>
                <p class="text-xs text-slate-500 mt-1">Ceklis sub-indikator yang dinilai pada praktikum ini. Sub-indikator nonaktif dihitung proporsional.</p>
              </div>
              <div class="text-right">
                <span class="text-xs text-slate-500">Total Nilai Laporan:</span>
                <div id="live-laporan-total" class="text-2xl font-bold font-mono text-[#56b29d]">${lapEntry.aktif !== false ? currentLapTotal : 'Nonaktif'}</div>
              </div>
            </div>

            <div id="container-comp-laporan" class="space-y-2.5 ${lapEntry.aktif === false ? 'opacity-40 pointer-events-none' : ''}">
              ${INDIKATOR_LAPORAN.map((ind, idx) => {
                const isChecked = !lapEntry.checklist || lapEntry.checklist[ind.id] !== false;
                return `
                <div class="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isChecked ? '' : 'bg-slate-100/70 opacity-60'}" id="row-lap-${ind.id}">
                  <div class="flex-1">
                    <div class="flex items-center space-x-2">
                      <input type="checkbox" id="check-lap-${ind.id}" ${isChecked ? 'checked' : ''} onchange="toggleIndikatorCheck('laporan', '${ind.id}', this.checked)" class="rounded text-[#56b29d] focus:ring-[#56b29d]">
                      <span class="w-5 h-5 rounded-full bg-[#56b29d]/20 text-[#2d6055] font-bold text-[10px] flex items-center justify-center shrink-0">
                        ${idx + 1}
                      </span>
                      <span class="font-semibold text-slate-800 text-xs">${escapeHtml(ind.nama)}</span>
                      <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-semibold">${ind.bobot}%</span>
                    </div>
                    <p class="text-[11px] text-slate-500 mt-0.5 pl-7">${escapeHtml(ind.rubrik)}</p>
                  </div>
                  <div class="w-28 shrink-0">
                    <input type="number" min="0" max="100" step="1" 
                      id="input-lap-${ind.id}" 
                      ${isChecked ? '' : 'disabled'}
                      value="${lapEntry.scores[ind.id] !== undefined ? lapEntry.scores[ind.id] : 85}"
                      oninput="updateLiveLaporanTotal()"
                      class="w-full text-right font-mono font-bold px-2 py-1.5 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-[#56b29d]">
                  </div>
                </div>
              `;}).join('')}
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Catatan Revisi & Feedback Laporan dari Co.Ass</label>
              <textarea id="catatan-laporan" rows="2" placeholder="Tuliskan catatan substantif laporan, koreksi grafik, analisis data..." 
                class="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-[#56b29d]">${escapeHtml(lapEntry.catatan || '')}</textarea>
            </div>
          </div>

          <!-- SUB-TAB 2: VIDEO -->
          <div id="subtab-content-tab-video" class="space-y-4 hidden">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
              <div>
                <div class="flex items-center space-x-2">
                  <h4 class="font-title text-base font-bold text-slate-900">Penilaian Video Acara (${escapeHtml(acara.nama)})</h4>
                  <label class="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 cursor-pointer">
                    <input type="checkbox" id="check-comp-video" ${vidEntry.aktif !== false ? 'checked' : ''} onchange="toggleComponentCheck('video', this.checked)" class="rounded text-[#56b29d] focus:ring-[#56b29d]">
                    <span>Aktifkan Komponen Video</span>
                  </label>
                </div>
                <p class="text-xs text-slate-500 mt-1">Tandai N/A jika acara tidak mewajibkan video atau uncheck sub-indikator tertentu.</p>
              </div>
              <div class="flex items-center space-x-4">
                <label class="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-100 px-3 py-1 rounded-lg">
                  <input type="checkbox" id="check-video-na" ${vidEntry.isNA ? 'checked' : ''} onchange="toggleVideoNA(this.checked)" class="rounded text-[#56b29d]">
                  <span>Tidak Berlaku (N/A)</span>
                </label>
                <div class="text-right">
                  <span class="text-xs text-slate-500">Skor Video:</span>
                  <div id="live-video-total" class="text-2xl font-bold font-mono text-[#56b29d]">${vidEntry.aktif === false ? 'Nonaktif' : (vidEntry.isNA ? 'N/A' : currentVidTotal.score)}</div>
                </div>
              </div>
            </div>

            <div id="video-indicators-container" class="${(vidEntry.aktif === false || vidEntry.isNA) ? 'opacity-40 pointer-events-none' : ''} space-y-2.5">
              ${INDIKATOR_VIDEO.map((ind, idx) => {
                const isChecked = !vidEntry.checklist || vidEntry.checklist[ind.id] !== false;
                return `
                <div class="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isChecked ? '' : 'bg-slate-100/70 opacity-60'}" id="row-vid-${ind.id}">
                  <div class="flex-1">
                    <div class="flex items-center space-x-2">
                      <input type="checkbox" id="check-vid-${ind.id}" ${isChecked ? 'checked' : ''} onchange="toggleIndikatorCheck('video', '${ind.id}', this.checked)" class="rounded text-[#56b29d] focus:ring-[#56b29d]">
                      <span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                        ${idx + 1}
                      </span>
                      <span class="font-semibold text-slate-800 text-xs">${escapeHtml(ind.nama)}</span>
                      <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-semibold">${ind.bobot}%</span>
                    </div>
                    <p class="text-[11px] text-slate-500 mt-0.5 pl-7">${escapeHtml(ind.rubrik)}</p>
                  </div>
                  <div class="w-28 shrink-0">
                    <input type="number" min="0" max="100" step="1" 
                      id="input-vid-${ind.id}" 
                      ${isChecked ? '' : 'disabled'}
                      value="${vidEntry.scores[ind.id] !== undefined ? vidEntry.scores[ind.id] : 85}"
                      oninput="updateLiveVideoTotal()"
                      class="w-full text-right font-mono font-bold px-2 py-1.5 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-[#56b29d]">
                  </div>
                </div>
              `;}).join('')}
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Catatan Evaluasi Video</label>
              <textarea id="catatan-video" rows="2" placeholder="Kualitas audio, alur penjelasan, ketepatan data..." 
                class="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-[#56b29d]">${escapeHtml(vidEntry.catatan || '')}</textarea>
            </div>
          </div>

          <!-- SUB-TAB 3: PERFORMA (12 INDIKATOR) -->
          <div id="subtab-content-tab-performa" class="space-y-4 hidden">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
              <div>
                <div class="flex items-center space-x-2">
                  <h4 class="font-title text-base font-bold text-slate-900">Penilaian Performa Praktikan di Laboratorium</h4>
                  <label class="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 cursor-pointer">
                    <input type="checkbox" id="check-comp-performa" ${perfEntry.aktif !== false ? 'checked' : ''} onchange="toggleComponentCheck('performa', this.checked)" class="rounded text-[#56b29d] focus:ring-[#56b29d]">
                    <span>Aktifkan Komponen Performa</span>
                  </label>
                </div>
                <p class="text-xs text-slate-500 mt-1">12 Indikator teramati langsung. Centang sub-indikator yang dinilai.</p>
              </div>
              <div class="text-right">
                <span class="text-xs text-slate-500">Rata-rata:</span>
                <div id="live-performa-total" class="text-2xl font-bold font-mono text-[#56b29d]">${perfEntry.aktif !== false ? currentPerfTotal : 'Nonaktif'}</div>
              </div>
            </div>

            <div id="container-comp-performa" class="grid grid-cols-1 md:grid-cols-2 gap-2.5 ${perfEntry.aktif === false ? 'opacity-40 pointer-events-none' : ''}">
              ${INDIKATOR_PERFORMA.map((ind, idx) => {
                const isChecked = !perfEntry.checklist || perfEntry.checklist[ind.id] !== false;
                return `
                <div class="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2 ${isChecked ? '' : 'bg-slate-100/70 opacity-60'}" id="row-perf-${ind.id}">
                  <div class="flex items-start space-x-2 flex-1">
                    <input type="checkbox" id="check-perf-${ind.id}" ${isChecked ? 'checked' : ''} onchange="toggleIndikatorCheck('performa', '${ind.id}', this.checked)" class="rounded text-[#56b29d] focus:ring-[#56b29d] mt-0.5">
                    <span class="text-xs font-bold text-slate-400">${idx + 1}.</span>
                    <div>
                      <div class="text-xs font-medium text-slate-800 leading-tight">${escapeHtml(ind.nama)}</div>
                      <span class="text-[10px] text-[#56b29d] font-semibold">${ind.kategori}</span>
                    </div>
                  </div>
                  <div class="w-20 shrink-0">
                    <input type="number" min="0" max="100" step="1" 
                      id="input-perf-${ind.id}" 
                      ${isChecked ? '' : 'disabled'}
                      value="${perfEntry.scores[ind.id] !== undefined ? perfEntry.scores[ind.id] : 90}"
                      oninput="updateLivePerformaTotal()"
                      class="w-full text-right font-mono font-bold py-1 px-1.5 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-[#56b29d]">
                  </div>
                </div>
              `;}).join('')}
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Catatan Bukti / Observasi Performa</label>
              <textarea id="catatan-performa" rows="2" placeholder="Catatan perilaku praktikum: ketelitian alat, keselamatan K3..." 
                class="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-[#56b29d]">${escapeHtml(perfEntry.catatan || '')}</textarea>
            </div>
          </div>

          <!-- SUB-TAB 4: SIKAP (8 INDIKATOR) -->
          <div id="subtab-content-tab-sikap" class="space-y-4 hidden">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
              <div>
                <div class="flex items-center space-x-2">
                  <h4 class="font-title text-base font-bold text-slate-900">Penilaian Kemauan & Sikap Belajar</h4>
                  <label class="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 cursor-pointer">
                    <input type="checkbox" id="check-comp-sikap" ${sikEntry.aktif !== false ? 'checked' : ''} onchange="toggleComponentCheck('sikap', this.checked)" class="rounded text-[#56b29d] focus:ring-[#56b29d]">
                    <span>Aktifkan Komponen Sikap</span>
                  </label>
                </div>
                <p class="text-xs text-slate-500 mt-1">8 Indikator teramati langsung: kesungguhan revisi dan keaktifan.</p>
              </div>
              <div class="text-right">
                <span class="text-xs text-slate-500">Rata-rata:</span>
                <div id="live-sikap-total" class="text-2xl font-bold font-mono text-[#56b29d]">${sikEntry.aktif !== false ? currentSikTotal : 'Nonaktif'}</div>
              </div>
            </div>

            <div id="container-comp-sikap" class="grid grid-cols-1 md:grid-cols-2 gap-2.5 ${sikEntry.aktif === false ? 'opacity-40 pointer-events-none' : ''}">
              ${INDIKATOR_SIKAP.map((ind, idx) => {
                const isChecked = !sikEntry.checklist || sikEntry.checklist[ind.id] !== false;
                return `
                <div class="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2 ${isChecked ? '' : 'bg-slate-100/70 opacity-60'}" id="row-sik-${ind.id}">
                  <div class="flex items-start space-x-2 flex-1">
                    <input type="checkbox" id="check-sik-${ind.id}" ${isChecked ? 'checked' : ''} onchange="toggleIndikatorCheck('sikap', '${ind.id}', this.checked)" class="rounded text-[#56b29d] focus:ring-[#56b29d] mt-0.5">
                    <span class="text-xs font-bold text-slate-400">${idx + 1}.</span>
                    <div class="text-xs font-medium text-slate-800 leading-tight">${escapeHtml(ind.nama)}</div>
                  </div>
                  <div class="w-20 shrink-0">
                    <input type="number" min="0" max="100" step="1" 
                      id="input-sik-${ind.id}" 
                      ${isChecked ? '' : 'disabled'}
                      value="${sikEntry.scores[ind.id] !== undefined ? sikEntry.scores[ind.id] : 90}"
                      oninput="updateLiveSikapTotal()"
                      class="w-full text-right font-mono font-bold py-1 px-1.5 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-[#56b29d]">
                  </div>
                </div>
              `;}).join('')}
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Catatan Sikap</label>
              <textarea id="catatan-sikap" rows="2" placeholder="Catatan responsivitas bimbingan, revisi, dan etika..." 
                class="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-[#56b29d]">${escapeHtml(sikEntry.catatan || '')}</textarea>
            </div>
          </div>

          <!-- SUB-TAB 5: FORMAT LAPORAN (10 INDIKATOR) -->
          <div id="subtab-content-tab-format" class="space-y-4 hidden">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
              <div>
                <div class="flex items-center space-x-2">
                  <h4 class="font-title text-base font-bold text-slate-900">Penilaian Format Laporan (Teknis)</h4>
                  <label class="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 cursor-pointer">
                    <input type="checkbox" id="check-comp-format" ${fmtEntry.aktif !== false ? 'checked' : ''} onchange="toggleComponentCheck('format', this.checked)" class="rounded text-[#56b29d] focus:ring-[#56b29d]">
                    <span>Aktifkan Komponen Format</span>
                  </label>
                </div>
                <p class="text-xs text-slate-500 mt-1">Evaluasi format, margin, penulisan tabel, rumus, dan kerapian.</p>
              </div>
              <div class="text-right">
                <span class="text-xs text-slate-500">Rata-rata:</span>
                <div id="live-format-total" class="text-2xl font-bold font-mono text-[#56b29d]">${fmtEntry.aktif !== false ? currentFmtTotal : 'Nonaktif'}</div>
              </div>
            </div>

            <div id="container-comp-format" class="grid grid-cols-1 md:grid-cols-2 gap-2.5 ${fmtEntry.aktif === false ? 'opacity-40 pointer-events-none' : ''}">
              ${INDIKATOR_FORMAT.map((ind, idx) => {
                const isChecked = !fmtEntry.checklist || fmtEntry.checklist[ind.id] !== false;
                return `
                <div class="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2 ${isChecked ? '' : 'bg-slate-100/70 opacity-60'}" id="row-fmt-${ind.id}">
                  <div class="flex items-start space-x-2 flex-1">
                    <input type="checkbox" id="check-fmt-${ind.id}" ${isChecked ? 'checked' : ''} onchange="toggleIndikatorCheck('format', '${ind.id}', this.checked)" class="rounded text-[#56b29d] focus:ring-[#56b29d] mt-0.5">
                    <span class="text-xs font-bold text-slate-400">${idx + 1}.</span>
                    <div class="text-xs font-medium text-slate-800 leading-tight">${escapeHtml(ind.nama)}</div>
                  </div>
                  <div class="w-20 shrink-0">
                    <input type="number" min="0" max="100" step="1" 
                      id="input-fmt-${ind.id}" 
                      ${isChecked ? '' : 'disabled'}
                      value="${fmtEntry.scores[ind.id] !== undefined ? fmtEntry.scores[ind.id] : 90}"
                      oninput="updateLiveFormatTotal()"
                      class="w-full text-right font-mono font-bold py-1 px-1.5 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-[#56b29d]">
                  </div>
                </div>
              `;}).join('')}
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Catatan Format</label>
              <textarea id="catatan-format" rows="2" placeholder="Catatan teknis spasi, font, atau penulisan sitasi..." 
                class="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-[#56b29d]">${escapeHtml(fmtEntry.catatan || '')}</textarea>
            </div>
          </div>

          <!-- SUB-TAB 6: RESPONSI (MANDIRI & TERPISAH, PREDIKAT VIDEO INDIVIDU & KELOMPOK) -->
          <div id="subtab-content-tab-responsi" class="space-y-4 hidden">
            <!-- Banner Penilaian Mandiri & Terpisah -->
            <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div class="flex items-center space-x-2.5 text-emerald-900">
                <div class="w-8 h-8 rounded-lg bg-emerald-100 text-[#36786a] flex items-center justify-center shrink-0">
                  <i data-lucide="check-circle" class="w-4 h-4"></i>
                </div>
                <div>
                  <div class="font-bold text-slate-900">Penilaian Responsi Terpisah & Mandiri</div>
                  <div class="text-[11px] text-emerald-800">
                    Responsi hanya diisi <strong>1 kali saja</strong> untuk tiap praktikan (tidak tiap pertemuan praktikum dan tidak terikat acara).
                  </div>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <label class="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white text-emerald-800 border border-emerald-300 cursor-pointer shadow-sm">
                  <input type="checkbox" id="check-comp-responsi" ${respEntry.aktif !== false ? 'checked' : ''} onchange="toggleComponentCheck('responsi', this.checked)" class="rounded text-[#56b29d] focus:ring-[#56b29d]">
                  <span>Aktifkan Responsi</span>
                </label>
                <button type="button" onclick="saveOnlyResponsi('${escapeHtml(selectedNim)}')" class="bg-[#56b29d] hover:bg-[#469c88] text-white font-bold py-2 px-3.5 rounded-lg text-xs shrink-0 flex items-center space-x-1.5 shadow-sm transition">
                  <i data-lucide="save" class="w-3.5 h-3.5"></i>
                  <span>Simpan Responsi Saja</span>
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h4 class="font-title text-base font-bold text-slate-900">Penilaian Responsi Pemahaman Materi</h4>
                <p class="text-xs text-slate-500">Pertanyaan pemahaman materi dan ceklist predikat video responsi.</p>
              </div>
              <div class="text-right flex items-center space-x-2">
                <div>
                  <span class="text-[11px] text-slate-500 block">Skor Responsi:</span>
                  <div id="live-responsi-total" class="text-2xl font-bold font-mono text-[#56b29d]">${respEntry.aktif !== false ? currentRespTotal : 'Nonaktif'}</div>
                </div>
                <div id="live-responsi-predikat-badge" class="px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-300 bg-emerald-100 text-emerald-800 font-mono">
                  ${respEntry.aktif !== false ? getPredikatResponsi(currentRespTotal).predikat : 'Off'}
                </div>
              </div>
            </div>

            <div id="container-comp-responsi" class="${respEntry.aktif === false ? 'opacity-40 pointer-events-none' : ''} space-y-4">
              <!-- BAGIAN A: INDIKATOR TANYA-JAWAB TEORI -->
              <div class="space-y-2">
                <span class="text-xs font-bold text-slate-800 block">A. Indikator Penguasaan Teori & Responsi Lisan</span>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  ${INDIKATOR_RESPONSI.map((ind, idx) => {
                    const isChecked = !respEntry.checklist || respEntry.checklist[ind.id] !== false;
                    return `
                    <div class="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2 ${isChecked ? '' : 'bg-slate-100/70 opacity-60'}" id="row-resp-${ind.id}">
                      <div class="flex items-start space-x-2 flex-1">
                        <input type="checkbox" id="check-resp-${ind.id}" ${isChecked ? 'checked' : ''} onchange="toggleIndikatorCheck('responsi', '${ind.id}', this.checked)" class="rounded text-[#56b29d] focus:ring-[#56b29d] mt-0.5">
                        <span class="text-xs font-bold text-slate-400">${idx + 1}.</span>
                        <div>
                          <div class="text-xs font-medium text-slate-800 leading-tight">${escapeHtml(ind.nama)}</div>
                          <span class="text-[10px] text-slate-400 font-mono">Bobot: ${ind.bobot}%</span>
                        </div>
                      </div>
                      <div class="w-20 shrink-0">
                        <input type="number" min="0" max="100" step="1" 
                          id="input-resp-${ind.id}" 
                          ${isChecked ? '' : 'disabled'}
                          value="${(respEntry.scores && respEntry.scores[ind.id] !== undefined) ? respEntry.scores[ind.id] : 85}"
                          oninput="updateLiveResponsiTotal()"
                          class="w-full text-right font-mono font-bold py-1 px-1.5 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-[#56b29d]">
                      </div>
                    </div>
                  `;}).join('')}
                </div>
              </div>

              <!-- BAGIAN B: PREDIKAT CEKLIST (OPSIONAL) VIDEO INDIVIDU & VIDEO KELOMPOK -->
              <div class="space-y-3 pt-2">
                <span class="text-xs font-bold text-slate-800 block">B. Predikat Penilaian Video Responsi (Ceklist Opsional)</span>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <!-- 1. Video Individu (Responsi) -->
                  <div class="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2.5">
                    <div class="flex items-center justify-between">
                      <label class="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" id="check-resp-vid-ind" 
                          ${(respEntry.videoIndividu && respEntry.videoIndividu.aktif) ? 'checked' : ''} 
                          onchange="toggleRespVideoSection('ind', this.checked)"
                          class="w-4 h-4 rounded text-[#56b29d] focus:ring-[#56b29d]">
                        <span class="text-xs font-bold text-slate-900">Video Individu (Responsi)</span>
                      </label>
                      <span class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Ceklist Opsional</span>
                    </div>
                    <p class="text-[11px] text-slate-500">Centang jika terdapat penilaian video individu pada responsi.</p>

                    <div id="section-resp-vid-ind" class="${(respEntry.videoIndividu && respEntry.videoIndividu.aktif) ? '' : 'hidden'} space-y-2 pt-1 border-t border-slate-100">
                      <div class="flex items-center justify-between">
                        <label class="text-[11px] font-semibold text-slate-700">Pilih Predikat:</label>
                        <span id="label-predikat-ind" class="text-[11px] font-bold text-[#36786a] font-mono">
                          ${(respEntry.videoIndividu && respEntry.videoIndividu.predikat) || 'A'} (${(respEntry.videoIndividu && respEntry.videoIndividu.skor) || 95})
                        </span>
                      </div>
                      <div class="grid grid-cols-5 gap-1.5 text-center">
                        ${['A', 'B', 'C', 'D', 'E'].map(p => {
                          const curPred = (respEntry.videoIndividu && respEntry.videoIndividu.predikat) || 'A';
                          const isSel = curPred === p;
                          return `
                            <button type="button" onclick="selectRespPredikat('ind', '${p}')" 
                              id="btn-pred-ind-${p}" 
                              class="py-1 px-2 rounded-lg border text-xs font-bold transition ${isSel ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}">
                              ${p}
                            </button>
                          `;
                        }).join('')}
                      </div>
                      <input type="hidden" id="val-resp-vid-ind-pred" value="${(respEntry.videoIndividu && respEntry.videoIndividu.predikat) || 'A'}">
                      <div class="flex items-center justify-between pt-1 text-[11px] text-slate-600">
                        <span>Skor Angka Video Individu:</span>
                        <input type="number" min="0" max="100" id="val-resp-vid-ind-skor" 
                          value="${(respEntry.videoIndividu && respEntry.videoIndividu.skor != null) ? respEntry.videoIndividu.skor : 95}" 
                          oninput="updateLiveResponsiTotal()" 
                          class="w-16 py-0.5 px-1.5 text-right font-mono font-bold rounded border border-slate-300 text-xs">
                      </div>
                    </div>
                  </div>

                  <!-- 2. Video Kelompok (Responsi) -->
                  <div class="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2.5">
                    <div class="flex items-center justify-between">
                      <label class="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" id="check-resp-vid-kel" 
                          ${(respEntry.videoKelompok && respEntry.videoKelompok.aktif) ? 'checked' : ''} 
                          onchange="toggleRespVideoSection('kel', this.checked)"
                          class="w-4 h-4 rounded text-[#56b29d] focus:ring-[#56b29d]">
                        <span class="text-xs font-bold text-slate-900">Video Kelompok (Responsi)</span>
                      </label>
                      <span class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Ceklist Opsional</span>
                    </div>
                    <p class="text-[11px] text-slate-500">Centang jika terdapat karya/presentasi video kelompok pada responsi.</p>

                    <div id="section-resp-vid-kel" class="${(respEntry.videoKelompok && respEntry.videoKelompok.aktif) ? '' : 'hidden'} space-y-2 pt-1 border-t border-slate-100">
                      <div class="flex items-center justify-between">
                        <label class="text-[11px] font-semibold text-slate-700">Pilih Predikat:</label>
                        <span id="label-predikat-kel" class="text-[11px] font-bold text-[#36786a] font-mono">
                          ${(respEntry.videoKelompok && respEntry.videoKelompok.predikat) || 'A'} (${(respEntry.videoKelompok && respEntry.videoKelompok.skor) || 95})
                        </span>
                      </div>
                      <div class="grid grid-cols-5 gap-1.5 text-center">
                        ${['A', 'B', 'C', 'D', 'E'].map(p => {
                          const curPred = (respEntry.videoKelompok && respEntry.videoKelompok.predikat) || 'A';
                          const isSel = curPred === p;
                          return `
                            <button type="button" onclick="selectRespPredikat('kel', '${p}')" 
                              id="btn-pred-kel-${p}" 
                              class="py-1 px-2 rounded-lg border text-xs font-bold transition ${isSel ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}">
                              ${p}
                            </button>
                          `;
                        }).join('')}
                      </div>
                      <input type="hidden" id="val-resp-vid-kel-pred" value="${(respEntry.videoKelompok && respEntry.videoKelompok.predikat) || 'A'}">
                      <div class="flex items-center justify-between pt-1 text-[11px] text-slate-600">
                        <span>Skor Angka Video Kelompok:</span>
                        <input type="number" min="0" max="100" id="val-resp-vid-kel-skor" 
                          value="${(respEntry.videoKelompok && respEntry.videoKelompok.skor != null) ? respEntry.videoKelompok.skor : 95}" 
                          oninput="updateLiveResponsiTotal()" 
                          class="w-16 py-0.5 px-1.5 text-right font-mono font-bold rounded border border-slate-300 text-xs">
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- BAGIAN C: CATATAN EVALUASI & TOMBOL SIMPAN -->
              <div class="space-y-3 pt-1">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Catatan Responsi & Rekomendasi</label>
                  <textarea id="catatan-responsi" rows="2" placeholder="Catatan kedalaman konsep materi, daya nalar, dan performa video responsi..." 
                    class="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-[#56b29d]">${escapeHtml(respEntry.catatan || '')}</textarea>
                </div>

                <div class="flex items-center justify-between pt-1">
                  <span class="text-[11px] text-slate-500">Nilai responsi langsung tersimpan untuk praktikan ini di seluruh kegiatan praktikum.</span>
                  <button type="button" onclick="saveOnlyResponsi('${escapeHtml(selectedNim)}')" class="bg-[#56b29d] hover:bg-[#469c88] text-white font-bold py-2 px-4 rounded-xl shadow-sm text-xs transition flex items-center space-x-1.5">
                    <i data-lucide="check" class="w-4 h-4"></i>
                    <span>Simpan Nilai Responsi Praktikan</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- SUB-TAB 7: PENILAIAN KEDISIPLINAN -->
          <div id="subtab-content-tab-k3" class="space-y-4 hidden">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
              <div>
                <div class="flex items-center space-x-2">
                  <h4 class="font-title text-base font-bold text-slate-900">Penilaian Kedisiplinan</h4>
                  <label class="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 cursor-pointer">
                    <input type="checkbox" id="check-comp-k3" ${k3Entry.aktif !== false ? 'checked' : ''} onchange="toggleComponentCheck('k3', this.checked)" class="rounded text-[#56b29d] focus:ring-[#56b29d]">
                    <span>Aktifkan Komponen Kedisiplinan</span>
                  </label>
                </div>
                <p class="text-xs text-slate-500 mt-1">Indikator ketepatan waktu pengumpulan tugas dan kontribusi kerja praktikan.</p>
              </div>
              <div class="text-right">
                <span class="text-xs text-slate-500">Skor Kedisiplinan:</span>
                <div id="live-k3-total" class="text-2xl font-bold font-mono text-[#56b29d]">${k3Entry.aktif !== false ? currentK3Total : 'Nonaktif'}</div>
              </div>
            </div>

            <div id="container-comp-k3" class="grid grid-cols-1 md:grid-cols-2 gap-2.5 ${k3Entry.aktif === false ? 'opacity-40 pointer-events-none' : ''}">
              ${INDIKATOR_K3.map((ind, idx) => {
                const isChecked = !k3Entry.checklist || k3Entry.checklist[ind.id] !== false;
                return `
                <div class="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2 ${isChecked ? '' : 'bg-slate-100/70 opacity-60'}" id="row-k3-${ind.id}">
                  <div class="flex items-start space-x-2 flex-1">
                    <input type="checkbox" id="check-k3-${ind.id}" ${isChecked ? 'checked' : ''} onchange="toggleIndikatorCheck('k3', '${ind.id}', this.checked)" class="rounded text-[#56b29d] focus:ring-[#56b29d] mt-0.5">
                    <span class="text-xs font-bold text-slate-400">${idx + 1}.</span>
                    <div>
                      <div class="text-xs font-medium text-slate-800 leading-tight">${escapeHtml(ind.nama)}</div>
                      <span class="text-[10px] text-slate-400 font-mono">Bobot: ${ind.bobot}%</span>
                    </div>
                  </div>
                  <div class="w-20 shrink-0">
                    <input type="number" min="0" max="100" step="1" 
                      id="input-k3-${ind.id}" 
                      ${isChecked ? '' : 'disabled'}
                      value="${(k3Entry.scores && k3Entry.scores[ind.id] !== undefined) ? k3Entry.scores[ind.id] : 95}"
                      oninput="updateLiveK3Total()"
                      class="w-full text-right font-mono font-bold py-1 px-1.5 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-[#56b29d]">
                  </div>
                </div>
              `;}).join('')}
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Catatan Kedisiplinan</label>
              <textarea id="catatan-k3" rows="2" placeholder="Catatan ketepatan waktu, kontribusi kerja, dan kepatuhan tata tertib..." 
                class="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-[#56b29d]">${escapeHtml(k3Entry.catatan || '')}</textarea>
            </div>
          </div>

          <!-- SUB-TAB 7: KEHADIRAN & KONSULTASI -->
          <div id="subtab-content-tab-kehadiran" class="space-y-5 hidden">
            <!-- Presensi Khusus Acara Terpilih -->
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                <div>
                  <span class="text-[10px] font-bold text-[#36786a] uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded border border-teal-200">Presensi Sesi Acara Ini</span>
                  <h4 class="font-title text-base font-bold text-slate-900 mt-1">${escapeHtml(acara.nama)}</h4>
                  <p class="text-xs text-slate-500">Pilih status kehadiran praktikan untuk acara ini serta sesuaikan tanggal pelaksanaannya.</p>
                </div>
                <div class="text-right">
                  <span class="text-xs text-slate-500">Status Sesi Ini:</span>
                  <div class="font-bold text-sm mt-0.5">
                    <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${
                      curStatus === 'Hadir' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                      curStatus === 'Sakit' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                      curStatus === 'Izin' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      'bg-rose-100 text-rose-800 border border-rose-200'
                    }">${curStatus === 'Absen' ? 'Absen (tdk hadir)' : curStatus}</span>
                  </div>
                </div>
              </div>

              <!-- 4 Pilihan Radio Status Kehadiran -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label class="flex items-center space-x-2.5 p-3 rounded-lg border cursor-pointer transition ${curStatus === 'Hadir' ? 'bg-emerald-50 border-emerald-400 text-emerald-900 ring-2 ring-emerald-400/30 font-bold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}">
                  <input type="radio" name="status-kehadiran-acara" value="Hadir" ${curStatus === 'Hadir' ? 'checked' : ''} class="text-emerald-600 focus:ring-emerald-500">
                  <div class="text-xs">
                    <div class="font-bold">Hadir</div>
                    <div class="text-[10px] text-slate-500">Mengikuti praktikum</div>
                  </div>
                </label>

                <label class="flex items-center space-x-2.5 p-3 rounded-lg border cursor-pointer transition ${curStatus === 'Sakit' ? 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-400/30 font-bold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}">
                  <input type="radio" name="status-kehadiran-acara" value="Sakit" ${curStatus === 'Sakit' ? 'checked' : ''} class="text-blue-600 focus:ring-blue-500">
                  <div class="text-xs">
                    <div class="font-bold">Sakit</div>
                    <div class="text-[10px] text-slate-500">Surat dokter / sakit</div>
                  </div>
                </label>

                <label class="flex items-center space-x-2.5 p-3 rounded-lg border cursor-pointer transition ${curStatus === 'Izin' ? 'bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-400/30 font-bold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}">
                  <input type="radio" name="status-kehadiran-acara" value="Izin" ${curStatus === 'Izin' ? 'checked' : ''} class="text-amber-600 focus:ring-amber-500">
                  <div class="text-xs">
                    <div class="font-bold">Izin</div>
                    <div class="text-[10px] text-slate-500">Izin resmi disetujui</div>
                  </div>
                </label>

                <label class="flex items-center space-x-2.5 p-3 rounded-lg border cursor-pointer transition ${(curStatus === 'Absen' || curStatus === 'Tidak Hadir' || curStatus === 'Alpa') ? 'bg-rose-50 border-rose-400 text-rose-900 ring-2 ring-rose-400/30 font-bold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}">
                  <input type="radio" name="status-kehadiran-acara" value="Absen" ${(curStatus === 'Absen' || curStatus === 'Tidak Hadir' || curStatus === 'Alpa') ? 'checked' : ''} class="text-rose-600 focus:ring-rose-500">
                  <div class="text-xs">
                    <div class="font-bold">Absen</div>
                    <div class="text-[10px] text-slate-500">Absen (tdk hadir)</div>
                  </div>
                </label>
              </div>

              <!-- Tanggal & Catatan Kehadiran Acara Ini -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Tanggal Pelaksanaan Acara</label>
                  <input type="date" id="tgl-hadir-acara" value="${curKehadiran.tanggal || new Date().toISOString().split('T')[0]}" class="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-medium focus:ring-1 focus:ring-[#56b29d]">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Keterangan Presensi (Opsional)</label>
                  <input type="text" id="ket-hadir-acara" value="${escapeHtml(curKehadiran.keterangan || '')}" placeholder="Misal: Surat izin terlampir, dispensasi lomba, dll..." class="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-[#56b29d]">
                </div>
              </div>
            </div>

            <!-- Ringkasan Kehadiran Seluruh Acara -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="font-title text-sm font-bold text-slate-900">Rekapitulasi Kehadiran Praktikan (${escapeHtml(curSummary.nama)})</h4>
                <span class="text-xs font-mono font-bold text-slate-600">Presensi Total: ${curSummary.persenKehadiran}%</span>
              </div>
              <div class="overflow-x-auto rounded-lg border border-slate-200">
                <table class="w-full text-left text-xs">
                  <thead class="bg-slate-900 text-white font-semibold">
                    <tr>
                      <th class="p-2.5 w-10 text-center">No</th>
                      <th class="p-2.5">Acara Praktikum</th>
                      <th class="p-2.5 text-center">Status</th>
                      <th class="p-2.5">Tanggal</th>
                      <th class="p-2.5">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    ${AppState.acaraList.map((ac, idx) => {
                      const kData = listKehadiran.find(k => k.acaraId === ac.id) || { status: 'Hadir', tanggal: '-' };
                      const st = kData.status || 'Hadir';
                      const isSelected = ac.id === acara.id;
                      return `
                        <tr class="${isSelected ? 'bg-teal-50/70 font-semibold' : 'hover:bg-slate-50'} transition">
                          <td class="p-2.5 text-center font-mono text-slate-400">${idx + 1}</td>
                          <td class="p-2.5">
                            <span class="text-slate-900">${escapeHtml(ac.nama)}</span>
                            ${isSelected ? '<span class="ml-1.5 text-[10px] bg-teal-600 text-white px-1.5 py-0.5 rounded font-sans font-normal">Sesi Terpilih</span>' : ''}
                          </td>
                          <td class="p-2.5 text-center">
                            <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              st === 'Hadir' ? 'bg-emerald-100 text-emerald-800' :
                              st === 'Sakit' ? 'bg-blue-100 text-blue-800' :
                              st === 'Izin' ? 'bg-amber-100 text-amber-800' :
                              'bg-rose-100 text-rose-800'
                            }">${st === 'Absen' ? 'Absen (tdk hadir)' : st}</span>
                          </td>
                          <td class="p-2.5 font-mono text-slate-600">${escapeHtml(kData.tanggal || '-')}</td>
                          <td class="p-2.5 text-slate-500">${escapeHtml(kData.keterangan || '-')}</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Konsultasi Laporan -->
            <div class="space-y-3 pt-3 border-t border-slate-200">
              <div class="flex items-center justify-between">
                <h4 class="font-title text-base font-bold text-slate-900">Riwayat Konsultasi & Revisi Laporan</h4>
                <button onclick="openModalTambahKonsultasi('${escapeHtml(selectedNim)}')" class="bg-[#56b29d]/10 hover:bg-[#56b29d]/20 text-[#36786a] font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center space-x-1.5 transition">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                  <span>Tambah Sesi Konsultasi</span>
                </button>
              </div>

              <div class="space-y-2" id="konsultasi-list-container">
                ${renderKonsultasiListHtml(selectedNim)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Widget Bobot Komponen Fleksibel (Berada di Bawah Penilaian Sesuai Permintaan User) -->
      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div class="flex items-center space-x-2.5">
            <div class="w-8 h-8 rounded-lg bg-teal-50 text-[#36786a] flex items-center justify-center shrink-0">
              <i data-lucide="sliders" class="w-4 h-4"></i>
            </div>
            <div>
              <h4 class="font-title text-sm font-bold text-slate-900">Pengaturan Bobot Penilaian Co.Ass (Fleksibel & Bisa > 100%)</h4>
              <p class="text-xs text-slate-500">Ubah persentase bobot langsung di sini. Total bisa lebih dari 100% untuk memberi apresiasi nilai lebih (misal: kemauan/sikap tinggi).</p>
            </div>
          </div>
          <div class="flex items-center space-x-2.5 shrink-0">
            <span id="coass-grading-total-weight-badge" class="${totalWeightClass}">${totalWeightText}</span>
            <button type="button" onclick="resetGradingWeightsToDefault()" class="text-xs text-slate-500 hover:text-slate-700 underline font-medium">Reset Default</button>
          </div>
        </div>

        <!-- 7 Kolom Input Bobot Persentase -->
        <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 text-center text-xs">
          <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <label class="block text-[11px] font-semibold text-slate-600 mb-1">1. Laporan</label>
            <div class="flex items-center justify-center space-x-1">
              <input type="number" min="0" max="100" id="weight-input-laporan" value="${currentWeights.laporan ?? 35}" oninput="handleGradingWeightChange()" class="w-14 text-center py-1 rounded border border-slate-300 font-mono font-bold text-xs">
              <span class="text-slate-400 font-bold">%</span>
            </div>
          </div>
          <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <label class="block text-[11px] font-semibold text-slate-600 mb-1">2. Video</label>
            <div class="flex items-center justify-center space-x-1">
              <input type="number" min="0" max="100" id="weight-input-video" value="${currentWeights.video ?? 10}" oninput="handleGradingWeightChange()" class="w-14 text-center py-1 rounded border border-slate-300 font-mono font-bold text-xs">
              <span class="text-slate-400 font-bold">%</span>
            </div>
          </div>
          <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <label class="block text-[11px] font-semibold text-slate-600 mb-1">3. Performa</label>
            <div class="flex items-center justify-center space-x-1">
              <input type="number" min="0" max="100" id="weight-input-performa" value="${currentWeights.performa ?? 15}" oninput="handleGradingWeightChange()" class="w-14 text-center py-1 rounded border border-slate-300 font-mono font-bold text-xs">
              <span class="text-slate-400 font-bold">%</span>
            </div>
          </div>
          <div class="bg-purple-50/80 p-2.5 rounded-lg border border-purple-200 ring-1 ring-purple-300/60">
            <label class="block text-[11px] font-bold text-purple-900 mb-1">4. Sikap (Apresiasi)</label>
            <div class="flex items-center justify-center space-x-1">
              <input type="number" min="0" max="100" id="weight-input-sikap" value="${currentWeights.sikap ?? 10}" oninput="handleGradingWeightChange()" class="w-14 text-center py-1 rounded border border-purple-300 font-mono font-bold text-purple-900 text-xs bg-white shadow-sm" title="Tingkatkan persentase sikap untuk memberikan apresiasi nilai lebih pada praktikan">
              <span class="text-purple-700 font-bold">%</span>
            </div>
          </div>
          <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <label class="block text-[11px] font-semibold text-slate-600 mb-1">5. Format</label>
            <div class="flex items-center justify-center space-x-1">
              <input type="number" min="0" max="100" id="weight-input-format" value="${currentWeights.formatLaporan ?? 5}" oninput="handleGradingWeightChange()" class="w-14 text-center py-1 rounded border border-slate-300 font-mono font-bold text-xs">
              <span class="text-slate-400 font-bold">%</span>
            </div>
          </div>
          <div class="bg-teal-50/80 p-2.5 rounded-lg border border-teal-200">
            <label class="block text-[11px] font-bold text-teal-800 mb-1">6. Responsi</label>
            <div class="flex items-center justify-center space-x-1">
              <input type="number" min="0" max="100" id="weight-input-responsi" value="${currentWeights.responsi ?? 20}" oninput="handleGradingWeightChange()" class="w-14 text-center py-1 rounded border border-teal-300 font-mono font-bold text-teal-800 text-xs bg-white">
              <span class="text-teal-600 font-bold">%</span>
            </div>
          </div>
          <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <label class="block text-[11px] font-semibold text-slate-600 mb-1">7. Kedisiplinan</label>
            <div class="flex items-center justify-center space-x-1">
              <input type="number" min="0" max="100" id="weight-input-k3" value="${currentWeights.k3Kedisiplinan ?? 5}" oninput="handleGradingWeightChange()" class="w-14 text-center py-1 rounded border border-slate-300 font-mono font-bold text-xs">
              <span class="text-slate-400 font-bold">%</span>
            </div>
          </div>
        </div>

        <!-- Live Score & Grade Akumulasi Praktikan Terpilih + Tombol Simpan -->
        <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div class="flex items-center space-x-3.5">
            <div class="w-11 h-11 rounded-xl bg-[#56b29d] text-white flex items-center justify-center font-bold text-lg shadow-sm" id="live-final-grade-box">
              ${curSummary.grade}
            </div>
            <div>
              <span class="text-[11px] text-slate-500 uppercase font-semibold block">Nilai Akhir Akumulasi Praktikan:</span>
              <div class="text-lg font-extrabold text-slate-900 font-mono leading-none mt-0.5">
                <span id="live-final-score-val">${curSummary.nilaiAkhir.toFixed(2)}</span>
                <span class="text-xs font-normal text-slate-400">/ 100</span>
                <span id="live-final-grade-label" class="ml-2 text-xs font-bold text-emerald-700 font-sans">(${curSummary.gradeLabel})</span>
              </div>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <div class="text-right">
              <span class="text-xs text-slate-600">Status Kelulusan: <strong id="live-final-status-lulus" class="${curSummary.statusLulus === 'LULUS' ? 'text-emerald-700' : 'text-rose-600'}">${curSummary.statusLulus}</strong></span>
              <p class="text-[10px] text-slate-400">Perubahan bobot langsung mengkalkulasi nilai akhir praktikan secara instan.</p>
            </div>
            <button onclick="saveCurrentGradingForm('${escapeHtml(selectedNim)}', ${selectedAcaraId})" class="bg-[#56b29d] hover:bg-[#469c88] text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition flex items-center space-x-2 text-xs">
              <i data-lucide="save" class="w-4 h-4"></i>
              <span>Simpan / Update Nilai</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderKonsultasiListHtml(nim) {
  const list = AppState.grades.konsultasi[nim] || [];
  if (list.length === 0) {
    return `<div class="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">Belum ada riwayat konsultasi yang dicatat untuk praktikan ini.</div>`;
  }
  return list.map(item => `
    <div class="p-3 rounded-lg border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
      <div class="flex-1 space-y-1">
        <div class="flex items-center space-x-2">
          <span class="font-bold text-slate-800">${escapeHtml(item.acara)}</span>
          <span class="text-slate-400">&bull;</span>
          <span class="text-slate-500 font-mono">${escapeHtml(item.tanggal)}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${item.statusRevisi === 'Selesai Disetujui' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
            ${escapeHtml(item.statusRevisi)}
          </span>
        </div>
        <div class="font-medium text-slate-900">${escapeHtml(item.materi)}</div>
        <div class="text-slate-600 bg-white p-2 rounded border border-slate-200 mt-1">
          <strong class="text-slate-700">Catatan Co.Ass:</strong> ${escapeHtml(item.catatanRevisi || '-')}
        </div>
      </div>
      <div class="text-right shrink-0">
        <button onclick="hapusKonsultasi('${escapeHtml(nim)}', '${escapeHtml(item.id)}')" class="text-rose-500 hover:text-rose-700 text-xs font-medium">Hapus</button>
      </div>
    </div>
  `).join('');
}

/**
 * 7. TAMPILAN 3: DETAIL NILAI PRAKTIKAN (KHP RESMI)
 * Khusus Praktikan: Hanya menampilkan nilai mahasiswa yang bersangkutan (terisolasi)
 * Font Output Praktikan: Times New Roman
 */
function renderDetailPraktikanView() {
  const isPraktikanRole = AppState.currentUser && AppState.currentUser.role === 'praktikan';
  const nim = isPraktikanRole ? AppState.currentUser.data.nim : (AppState.selectedPraktikanNIM || (AppState.praktikanList[0] ? AppState.praktikanList[0].nim : ''));
  const s = getPraktikanCompleteSummary(nim);
  if (!s) return `<div class="p-8 text-center text-slate-500 font-output-tnr">Data praktikan tidak ditemukan.</div>`;

  const lapData = (AppState.grades.laporan && AppState.grades.laporan[nim]) || {};
  const vidData = (AppState.grades.video && AppState.grades.video[nim]) || {};
  const perfData = (AppState.grades.performa && AppState.grades.performa[nim]) || { scores: {} };
  const sikData = (AppState.grades.sikap && AppState.grades.sikap[nim]) || { scores: {} };
  const presensiData = (AppState.grades.kehadiran && AppState.grades.kehadiran[nim]) || [];
  const konsulData = (AppState.grades.konsultasi && AppState.grades.konsultasi[nim]) || [];

  // Pilihan Koordinator / Dospem Penandatangan KHP yang fleksibel
  const koorList = (AppState.koordinatorList && AppState.koordinatorList.length > 0)
    ? AppState.koordinatorList
    : DEFAULT_KOORDINATOR;

  let activeSigner = koorList.find(k => k.id === (AppState.config && AppState.config.selectedSignerKoordinatorId));
  if (!activeSigner) {
    activeSigner = koorList[0] || {
      id: "koor-develob",
      nama: "Justiar Noer",
      roleJabatan: "Koordinator",
      email: (AppState.config && AppState.config.developerEmail) || "juzantiara@gmail.com"
    };
  }

  const signerLabel = (activeSigner.roleJabatan && activeSigner.roleJabatan.toLowerCase().includes('dosen'))
    ? 'Dosen Pembimbing Praktikum'
    : 'Koordinator Praktikum';

  const canChangeSigner = AppState.currentUser && (AppState.currentUser.role === 'developer' || AppState.currentUser.role === 'coass');

  return `
    <div class="output-praktikan space-y-6 max-w-4xl mx-auto" id="kartu-hasil-praktikum" style="font-family: 'Times New Roman', Times, serif !important;">
      <!-- Header Dokumen Cetak / KHP -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div class="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
          <div class="flex items-center space-x-4">
            <div class="w-14 h-14 shrink-0 flex items-center justify-center">
              <img src="${LOGO_INSTIPER_SRC}" alt="Logo INSTIPER" class="w-full h-full object-contain drop-shadow-sm">
            </div>
            <div class="w-14 h-14 shrink-0 rounded-xl bg-[#56b29d] text-white flex items-center justify-center font-bold text-2xl shadow-sm">
              ${s.grade}
            </div>
            <div>
              <div class="text-[10px] uppercase tracking-wider text-slate-500 font-bold leading-tight">INSTITUT PERTANIAN STIPER YOGYAKARTA</div>
              <span class="text-[10px] uppercase tracking-wider text-slate-400 font-bold">KARTU HASIL PRAKTIKUM (KHP) RESMI</span>
              <h2 class="text-2xl font-bold text-slate-900">${escapeHtml(s.nama)}</h2>
              <p class="text-xs text-slate-600 mt-0.5">NIM: <strong>${escapeHtml(s.nim)}</strong> &bull; Kelompok: <strong>${escapeHtml(s.kelompok)}</strong> &bull; Praktikum: <strong>${escapeHtml(getActivePraktikum().nama)}</strong></p>
              <p class="text-xs text-slate-500">Co.Ass Penilai / Pembimbing: <strong>${escapeHtml(s.coassNama)}</strong></p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            ${!isPraktikanRole ? `
              <select onchange="changeDetailPraktikanView(this.value)" class="px-3 py-2 rounded-lg border border-slate-300 text-xs no-print">
                ${AppState.praktikanList.map(p => `
                  <option value="${escapeHtml(p.nim)}" ${p.nim === nim ? 'selected' : ''}>${escapeHtml(p.nim)} - ${escapeHtml(p.nama)}</option>
                `).join('')}
              </select>
            ` : ''}
            <button onclick="exportSingleStudentExcel('${escapeHtml(nim)}')" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-3.5 rounded-lg flex items-center space-x-1.5 transition shadow-sm no-print" title="Unduh KHP Pribadi dalam format Excel">
              <i data-lucide="file-spreadsheet" class="w-4 h-4"></i>
              <span>Unduh Excel</span>
            </button>
            <button onclick="window.print()" class="bg-[#56b29d] hover:bg-[#469c88] text-white text-xs font-semibold py-2 px-3.5 rounded-lg flex items-center space-x-1.5 transition shadow-sm">
              <i data-lucide="printer" class="w-4 h-4"></i>
              <span>Cetak KHP</span>
            </button>
          </div>
        </div>

        <!-- 3 Highlight Nilai Utama -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-center">
          <div class="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span class="text-[11px] text-slate-500 font-medium">NILAI AKHIR PRAKTIKUM</span>
            <div class="text-3xl font-extrabold text-slate-900 mt-1">${s.nilaiAkhir.toFixed(2)}</div>
            <span class="text-[10px] text-slate-400">Skala 0 - 100</span>
          </div>
          <div class="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span class="text-[11px] text-slate-500 font-medium">PREDIKAT (GRADE)</span>
            <div class="text-3xl font-extrabold text-[#56b29d] mt-1">${s.grade}</div>
            <span class="text-[11px] text-emerald-700 font-semibold">${s.gradeLabel}</span>
          </div>
          <div class="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span class="text-[11px] text-slate-500 font-medium">STATUS KELULUSAN</span>
            <div class="text-2xl font-bold ${s.statusLulus === 'LULUS' ? 'text-emerald-600' : 'text-rose-600'} mt-1.5">
              ${s.statusLulus}
            </div>
            <span class="text-[10px] text-slate-500">Presensi Praktikum: ${s.persenKehadiran}%</span>
          </div>
        </div>
      </div>

      <!-- Tabel 1: Rekapitulasi Komponen Penilaian -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h3 class="font-bold text-slate-900 text-base border-b border-slate-200 pb-2">I. Rekapitulasi Komposisi Penilaian</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
            <thead class="bg-slate-900 text-white text-center">
              <tr>
                <th class="p-2.5 text-left">Komponen Penilaian</th>
                <th class="p-2.5">Bobot Dasar</th>
                <th class="p-2.5">Bobot Efektif</th>
                <th class="p-2.5 text-right">Nilai Angka</th>
                <th class="p-2.5 text-right">Kontribusi Nilai</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr>
                <td class="p-2.5 font-medium text-slate-800">1. Rata-rata Laporan Praktikum (Acara 1 - ${AppState.acaraList.length})</td>
                <td class="p-2.5 text-center">${s.baseWeights.laporan}%</td>
                <td class="p-2.5 text-center font-bold text-[#56b29d]">${s.effectiveWeights.laporan}%</td>
                <td class="p-2.5 text-right">${s.avgLaporan.toFixed(2)}</td>
                <td class="p-2.5 text-right font-bold text-slate-900">${(s.avgLaporan * s.effectiveWeights.laporan / 100).toFixed(2)}</td>
              </tr>
              <tr>
                <td class="p-2.5 font-medium text-slate-800">2. Rata-rata Video Praktikum ${s.isVideoComponentNA ? '(N/A - Bobot Dialihkan Proporsional)' : ''}</td>
                <td class="p-2.5 text-center">${s.baseWeights.video}%</td>
                <td class="p-2.5 text-center font-bold text-[#56b29d]">${s.effectiveWeights.video}%</td>
                <td class="p-2.5 text-right">${s.isVideoComponentNA ? 'N/A' : s.avgVideo.toFixed(2)}</td>
                <td class="p-2.5 text-right font-bold text-slate-900">${(s.avgVideo * s.effectiveWeights.video / 100).toFixed(2)}</td>
              </tr>
              <tr>
                <td class="p-2.5 font-medium text-slate-800">3. Performa Praktikan di Laboratorium</td>
                <td class="p-2.5 text-center">${s.baseWeights.performa}%</td>
                <td class="p-2.5 text-center font-bold text-[#56b29d]">${s.effectiveWeights.performa}%</td>
                <td class="p-2.5 text-right">${s.scorePerforma.toFixed(2)}</td>
                <td class="p-2.5 text-right font-bold text-slate-900">${(s.scorePerforma * s.effectiveWeights.performa / 100).toFixed(2)}</td>
              </tr>
              <tr>
                <td class="p-2.5 font-medium text-slate-800">4. Kemauan & Sikap Belajar</td>
                <td class="p-2.5 text-center">${s.baseWeights.sikap}%</td>
                <td class="p-2.5 text-center font-bold text-[#56b29d]">${s.effectiveWeights.sikap}%</td>
                <td class="p-2.5 text-right">${s.scoreSikap.toFixed(2)}</td>
                <td class="p-2.5 text-right font-bold text-slate-900">${(s.scoreSikap * s.effectiveWeights.sikap / 100).toFixed(2)}</td>
              </tr>
              <tr>
                <td class="p-2.5 font-medium text-slate-800">5. Responsi Pemahaman Teori & Video (Mandiri)</td>
                <td class="p-2.5 text-center">${s.baseWeights.responsi}%</td>
                <td class="p-2.5 text-center font-bold text-[#56b29d]">${s.effectiveWeights.responsi}%</td>
                <td class="p-2.5 text-right">${s.scoreResponsi.toFixed(2)}</td>
                <td class="p-2.5 text-right font-bold text-slate-900">${(s.scoreResponsi * s.effectiveWeights.responsi / 100).toFixed(2)}</td>
              </tr>
              <tr>
                <td class="p-2.5 font-medium text-slate-800">6. Format Teknis Laporan (Kerapian & Sitasi)</td>
                <td class="p-2.5 text-center">${s.baseWeights.formatLaporan}%</td>
                <td class="p-2.5 text-center font-bold text-[#56b29d]">${s.effectiveWeights.formatLaporan}%</td>
                <td class="p-2.5 text-right">${s.scoreFormat.toFixed(2)}</td>
                <td class="p-2.5 text-right font-bold text-slate-900">${(s.scoreFormat * s.effectiveWeights.formatLaporan / 100).toFixed(2)}</td>
              </tr>
              <tr>
                <td class="p-2.5 font-medium text-slate-800">7. Penilaian Kedisiplinan</td>
                <td class="p-2.5 text-center">${s.baseWeights.k3Kedisiplinan}%</td>
                <td class="p-2.5 text-center font-bold text-[#56b29d]">${s.effectiveWeights.k3Kedisiplinan}%</td>
                <td class="p-2.5 text-right">${s.scoreK3.toFixed(2)}</td>
                <td class="p-2.5 text-right font-bold text-slate-900">${(s.scoreK3 * s.effectiveWeights.k3Kedisiplinan / 100).toFixed(2)}</td>
              </tr>
              <tr class="bg-slate-100 font-bold text-slate-900">
                <td class="p-2.5">TOTAL NILAI AKHIR PRAKTIKUM</td>
                <td class="p-2.5 text-center">100%</td>
                <td class="p-2.5 text-center font-bold text-[#56b29d]">100%</td>
                <td class="p-2.5 text-right">-</td>
                <td class="p-2.5 text-right text-base text-[#2d6055] font-extrabold">${s.nilaiAkhir.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tabel 2: Rincian Nilai Laporan & Video Per Acara -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h3 class="font-bold text-slate-900 text-base border-b border-slate-200 pb-2">II. Rincian Nilai Laporan & Video Setiap Acara</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
            <thead class="bg-slate-900 text-white text-center">
              <tr>
                <th class="p-2.5 text-left">Nama Acara Praktikum</th>
                <th class="p-2.5">Nilai Laporan</th>
                <th class="p-2.5">Nilai Video</th>
                <th class="p-2.5 text-left">Catatan / Evaluasi Co.Ass</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${AppState.acaraList.map(a => {
                const lap = lapData[a.id] || { total: 0, catatan: '-' };
                const vid = vidData[a.id] || { total: 0, isNA: !a.wajibVideo, catatan: '-' };
                return `
                  <tr>
                    <td class="p-2.5 font-medium text-slate-900">
                      ${escapeHtml(a.nama)}
                      ${a.wajibVideo ? '<span class="text-[10px] text-[#36786a] block">(Wajib Video)</span>' : '<span class="text-[10px] text-slate-400 block">(Tanpa Video)</span>'}
                    </td>
                    <td class="p-2.5 text-center font-bold text-slate-800">${lap.total ? lap.total.toFixed(2) : '-'}</td>
                    <td class="p-2.5 text-center font-bold ${vid.isNA ? 'text-slate-400' : 'text-slate-800'}">
                      ${vid.isNA ? 'N/A' : (vid.total ? vid.total.toFixed(2) : '-')}
                    </td>
                    <td class="p-2.5 text-slate-600 text-[11px]">${escapeHtml(lap.catatan || vid.catatan || '-')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tabel 3: Rincian Indikator Performa, Sikap, Responsi & Kedisiplinan -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 class="font-bold text-slate-900 text-base border-b border-slate-200 pb-2">III. Rincian Indikator Performa, Sikap, Responsi & Kedisiplinan</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <!-- Kolom Kiri: Performa Praktikan -->
          <div class="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50/50">
            <span class="font-bold text-slate-800 block text-xs">1. Performa di Laboratorium</span>
            <div class="space-y-1.5">
              ${INDIKATOR_PERFORMA.map(ind => `
                <div class="flex items-center justify-between py-1 border-b border-slate-100">
                  <span class="text-slate-700">${escapeHtml(ind.nama)}</span>
                  <span class="font-bold text-slate-900 ml-2">${perfData.scores && perfData.scores[ind.id] ? perfData.scores[ind.id] : '-'}</span>
                </div>
              `).join('')}
            </div>

            <div class="pt-3 border-t border-slate-200">
              <span class="font-bold text-slate-800 block text-xs mb-1">2. Kemauan & Sikap Belajar</span>
              <div class="space-y-1">
                ${INDIKATOR_SIKAP.map(ind => `
                  <div class="flex items-center justify-between py-1 border-b border-slate-100">
                    <span class="text-slate-700">${escapeHtml(ind.nama)}</span>
                    <span class="font-bold text-slate-900 ml-2">${sikData.scores && sikData.scores[ind.id] ? sikData.scores[ind.id] : '-'}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Kolom Kanan: Kedisiplinan & Responsi -->
          <div class="border border-slate-200 rounded-lg p-3 space-y-3 bg-slate-50/50">
            <div>
              <span class="font-bold text-slate-800 block text-xs mb-1">3. Penilaian Kedisiplinan</span>
              <div class="space-y-1">
                ${INDIKATOR_K3.map(ind => `
                  <div class="flex items-center justify-between py-1 border-b border-slate-100">
                    <span class="text-slate-700">${escapeHtml(ind.nama)}</span>
                    <span class="font-bold text-slate-900 ml-2">${(AppState.grades.k3Kedisiplinan && AppState.grades.k3Kedisiplinan[nim] && AppState.grades.k3Kedisiplinan[nim].scores && AppState.grades.k3Kedisiplinan[nim].scores[ind.id]) ? AppState.grades.k3Kedisiplinan[nim].scores[ind.id] : '-'}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="pt-2 border-t border-slate-200">
              <div class="flex items-center justify-between mb-1">
                <span class="font-bold text-slate-800 text-xs">4. Penilaian Responsi (Mandiri)</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-100 text-emerald-800">
                  ${(AppState.grades.responsi && AppState.grades.responsi[nim] && AppState.grades.responsi[nim].predikatAkhir) ? `Predikat ${AppState.grades.responsi[nim].predikatAkhir}` : `Skor ${s.scoreResponsi.toFixed(1)}`}
                </span>
              </div>
              <div class="space-y-1 text-[11px]">
                <div class="flex items-center justify-between py-1 border-b border-slate-100">
                  <span class="text-slate-700">Video Individu (Responsi)</span>
                  <span class="font-bold ${(AppState.grades.responsi && AppState.grades.responsi[nim] && AppState.grades.responsi[nim].videoIndividu && AppState.grades.responsi[nim].videoIndividu.aktif) ? 'text-emerald-700' : 'text-slate-400'}">
                    ${(AppState.grades.responsi && AppState.grades.responsi[nim] && AppState.grades.responsi[nim].videoIndividu && AppState.grades.responsi[nim].videoIndividu.aktif) ? `Predikat ${AppState.grades.responsi[nim].videoIndividu.predikat} (${AppState.grades.responsi[nim].videoIndividu.skor || 95})` : 'N/A (Tidak Ada)'}
                  </span>
                </div>
                <div class="flex items-center justify-between py-1 border-b border-slate-100">
                  <span class="text-slate-700">Video Kelompok (Responsi)</span>
                  <span class="font-bold ${(AppState.grades.responsi && AppState.grades.responsi[nim] && AppState.grades.responsi[nim].videoKelompok && AppState.grades.responsi[nim].videoKelompok.aktif) ? 'text-emerald-700' : 'text-slate-400'}">
                    ${(AppState.grades.responsi && AppState.grades.responsi[nim] && AppState.grades.responsi[nim].videoKelompok && AppState.grades.responsi[nim].videoKelompok.aktif) ? `Predikat ${AppState.grades.responsi[nim].videoKelompok.predikat} (${AppState.grades.responsi[nim].videoKelompok.skor || 95})` : 'N/A (Tidak Ada)'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabel 4: Kehadiran & Konsultasi Revisi -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h3 class="font-bold text-slate-900 text-base border-b border-slate-200 pb-2">IV. Riwayat Kehadiran & Konsultasi Revisi</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <h4 class="font-bold text-slate-800 mb-2">Riwayat Kehadiran Praktikum</h4>
            ${presensiData.length === 0 ? '<p class="text-slate-400">Belum ada catatan presensi.</p>' : `
              <div class="border border-slate-200 rounded-lg overflow-hidden">
                <table class="w-full text-left">
                  <thead class="bg-slate-100 font-bold">
                    <tr>
                      <th class="p-2">Acara</th>
                      <th class="p-2">Status</th>
                      <th class="p-2">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    ${presensiData.map(k => `
                      <tr>
                        <td class="p-2 font-medium">Acara ${k.acaraId}</td>
                        <td class="p-2">
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${(k.status === 'Hadir' || k.status === true) ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">${escapeHtml(k.status || 'Hadir')}</span>
                        </td>
                        <td class="p-2 text-slate-500 font-mono">${escapeHtml(k.tanggal || '-')}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>

          <div>
            <h4 class="font-bold text-slate-800 mb-2">Riwayat Konsultasi & Revisi Laporan</h4>
            ${konsulData.length === 0 ? '<p class="text-slate-400">Belum ada catatan konsultasi revisi.</p>' : `
              <div class="space-y-2">
                ${konsulData.map(c => `
                  <div class="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] space-y-1">
                    <div class="flex items-center justify-between">
                      <strong class="text-slate-900">${escapeHtml(c.acara)}</strong>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold ${c.statusRevisi === 'Selesai Disetujui' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${escapeHtml(c.statusRevisi)}</span>
                    </div>
                    <div class="text-slate-700">${escapeHtml(c.materi)}</div>
                    <div class="text-slate-500 italic">Revisi: ${escapeHtml(c.catatanRevisi || '-')}</div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      </div>

      <!-- Tanda Tangan Cetak KHP -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:block space-y-4">
        ${canChangeSigner ? `
          <div class="print:hidden p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs" style="font-family: 'Poppins', sans-serif !important;">
            <div class="flex items-center space-x-2">
              <i data-lucide="pen-tool" class="w-4 h-4 text-[#36786a]"></i>
              <span class="font-semibold text-slate-800">Pilih Koordinator / Dospem Penandatangan KHP:</span>
            </div>
            <div class="flex items-center space-x-2">
              <select onchange="changeSelectedKoordinatorSigner(this.value)" class="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#56b29d] focus:outline-none shadow-sm cursor-pointer">
                ${koorList.map(k => `
                  <option value="${escapeHtml(k.id)}" ${k.id === activeSigner.id ? 'selected' : ''}>
                    ${escapeHtml(k.nama)} — ${escapeHtml(k.roleJabatan || 'Koordinator')}
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
        ` : ''}

        <div class="grid grid-cols-3 gap-6 text-center text-xs pt-2">
          <div>
            <p class="text-slate-500">Mahasiswa Praktikan,</p>
            <div class="h-16"></div>
            <p class="font-bold text-slate-900 underline">${escapeHtml(s.nama)}</p>
            <p class="text-slate-400">NIM. ${escapeHtml(s.nim)}</p>
          </div>
          <div>
            <p class="text-slate-500">Co.Ass Penilai,</p>
            <div class="h-16"></div>
            <p class="font-bold text-slate-900 underline">${escapeHtml(s.coassNama)}</p>
            <p class="text-slate-400">Asisten Praktikum</p>
          </div>
          <div>
            <p class="text-slate-500">${escapeHtml(signerLabel)},</p>
            <div class="h-16"></div>
            <p class="font-bold text-slate-900 underline">${escapeHtml(activeSigner.nama)}</p>
            <p class="text-slate-400">${escapeHtml(activeSigner.roleJabatan || 'Koordinator Praktikum')}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function changeDetailPraktikanView(nim) {
  AppState.selectedPraktikanNIM = nim;
  renderApp();
}

/**
 * 8. TAMPILAN 4: KELOLA PRAKTIKUM & DATA PRAKTIKAN
 * Mendukung Multi-Praktikum, Filter Kelompok, Sistem Rolling Co.Ass & Tanpa Shift
 */
function renderManajemenPraktikanView() {
  const curPrak = getActivePraktikum();
  const jmlKelompok = curPrak.jumlahKelompok || 8;
  const filteredPraktikan = AppState.filterKelompok === 'all' 
    ? AppState.praktikanList 
    : AppState.praktikanList.filter(p => p.kelompok === AppState.filterKelompok);

  return `
    <div class="space-y-6">
      <!-- Header & Statistik Multi-Praktikum -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2">
            <h2 class="font-title text-2xl font-bold text-slate-900 tracking-tight">Kelola Praktikum & Mahasiswa</h2>
            <span class="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
              ${escapeHtml(curPrak.nama)}
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-1">
            Pilih praktikum tertentu, buat praktikum baru, atur kelompok, dan kelola data praktikan (Co.Ass dapat mengedit seluruh kelompok).
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button onclick="openModalBuatPraktikum()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-3.5 rounded-lg shadow-sm flex items-center space-x-1.5 transition">
            <i data-lucide="folder-plus" class="w-4 h-4"></i>
            <span>+ Buat Praktikum Baru</span>
          </button>
          <button onclick="downloadExcelTemplate()" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold py-2 px-3 rounded-lg shadow-sm flex items-center space-x-1.5 transition">
            <i data-lucide="file-down" class="w-4 h-4 text-[#56b29d]"></i>
            <span>Format Excel</span>
          </button>
          <button onclick="openModalImportExcel()" class="bg-[#56b29d] hover:bg-[#469c88] text-white text-xs font-semibold py-2 px-3.5 rounded-lg shadow-sm flex items-center space-x-1.5 transition">
            <i data-lucide="upload" class="w-4 h-4"></i>
            <span>Upload File Excel</span>
          </button>
          <button onclick="openModalTambahPraktikan()" class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2 px-3.5 rounded-lg shadow-sm flex items-center space-x-1.5 transition">
            <i data-lucide="user-plus" class="w-4 h-4"></i>
            <span>Tambah Praktikan</span>
          </button>
        </div>
      </div>

      <!-- 3 Kartu Ringkasan Statistik -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div class="w-10 h-10 rounded-lg bg-teal-50 text-[#56b29d] flex items-center justify-center font-bold">
            <i data-lucide="layers" class="w-5 h-5"></i>
          </div>
          <div>
            <div class="text-[11px] font-semibold text-slate-400 uppercase">Total Praktikum</div>
            <div class="text-xl font-bold text-slate-800">${AppState.praktikumList.length} Praktikum Terdaftar</div>
          </div>
        </div>

        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <i data-lucide="users" class="w-5 h-5"></i>
          </div>
          <div>
            <div class="text-[11px] font-semibold text-slate-400 uppercase">Praktikan Praktikum Ini</div>
            <div class="text-xl font-bold text-slate-800">${AppState.praktikanList.length} Mahasiswa</div>
          </div>
        </div>

        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div class="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <i data-lucide="grid" class="w-5 h-5"></i>
          </div>
          <div>
            <div class="text-[11px] font-semibold text-slate-400 uppercase">Kelompok Aktif</div>
            <div class="text-xl font-bold text-slate-800">${jmlKelompok} Kelompok</div>
          </div>
        </div>
      </div>

      <!-- Bilah Filter Praktikum Tertentu & Kelompok -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <!-- Pilih Praktikum Tertentu -->
          <div class="flex items-center space-x-2">
            <span class="text-xs font-bold text-slate-700 whitespace-nowrap">Pilih Praktikum:</span>
            <select onchange="switchPraktikum(this.value)" class="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-slate-50 focus:ring-1 focus:ring-[#56b29d]">
              ${AppState.praktikumList.map(p => `
                <option value="${escapeHtml(p.id)}" ${p.id === AppState.activePraktikumId ? 'selected' : ''}>
                  ${escapeHtml(p.nama)} (${(p.praktikanList || []).length} Mhs)
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Filter Kelompok Tertentu -->
          <div class="flex items-center space-x-2">
            <span class="text-xs font-bold text-slate-700 whitespace-nowrap">Kelompok:</span>
            <select onchange="setFilterKelompok(this.value)" class="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-slate-50 focus:ring-1 focus:ring-[#56b29d]">
              <option value="all" ${AppState.filterKelompok === 'all' ? 'selected' : ''}>
                Semua Kelompok (${AppState.praktikanList.length} Mhs)
              </option>
              ${getKelompokList().map(k => {
                const count = AppState.praktikanList.filter(p => p.kelompok === k).length;
                return `
                  <option value="${k}" ${AppState.filterKelompok === k ? 'selected' : ''}>
                    ${k} (${count} Mhs)
                  </option>
                `;
              }).join('')}
            </select>
          </div>
        </div>

        <div class="flex items-center space-x-2 text-xs text-slate-500">
          <span>Menampilkan <strong>${filteredPraktikan.length}</strong> dari <strong>${AppState.praktikanList.length}</strong> mahasiswa</span>
        </div>
      </div>

      <!-- Tabel Daftar Praktikan (Tanpa Kolom Shift) -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-3 border-b border-slate-200 flex items-center justify-between">
          <span class="font-title font-bold text-slate-800 text-sm">Daftar Praktikan: ${escapeHtml(curPrak.nama)}</span>
          <button onclick="exportToExcel()" class="text-xs text-[#36786a] font-semibold hover:underline flex items-center space-x-1">
            <i data-lucide="download" class="w-3.5 h-3.5"></i>
            <span>Download Rekap Excel</span>
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-900 text-white font-title">
              <tr>
                <th class="p-3 w-10 text-center">No</th>
                <th class="p-3">Nama Praktikan</th>
                <th class="p-3">NIM (Untuk Login)</th>
                <th class="p-3">Kelompok</th>
                <th class="p-3">Co.Ass Penilai (Sistem Bergilir)</th>
                <th class="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${filteredPraktikan.length === 0 ? `
                <tr>
                  <td colspan="6" class="p-6 text-center text-slate-400">
                    Tidak ada praktikan pada pilihan ini. Klik "Tambah Praktikan" atau "Upload File Excel".
                  </td>
                </tr>
              ` : filteredPraktikan.map((p, idx) => `
                <tr class="hover:bg-slate-50 transition">
                  <td class="p-3 text-center text-slate-400 font-mono">${idx + 1}</td>
                  <td class="p-3 font-semibold text-slate-900">${escapeHtml(p.nama)}</td>
                  <td class="p-3 font-mono text-[#36786a] font-bold">${escapeHtml(p.nim)}</td>
                  <td class="p-3">
                    <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                      ${escapeHtml(p.kelompok)}
                    </span>
                  </td>
                  <td class="p-3 text-slate-600">${escapeHtml(p.coassNama || 'Sistem Bergilir')}</td>
                  <td class="p-3 text-center space-x-1">
                    <button onclick="editPraktikan('${escapeHtml(p.id)}')" class="p-1 text-[#36786a] hover:text-[#1b5e20]" title="Edit">
                      <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                    <button onclick="hapusPraktikan('${escapeHtml(p.id)}')" class="p-1 text-rose-500 hover:text-rose-700" title="Hapus">
                      <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

/**
 * 9. TAMPILAN 5: KELOLA CO.ASS & KODE LOGIN KHUSUS (Tanpa Shift)
 */
function renderManajemenCoAssView() {
  return `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="font-title text-2xl font-bold text-slate-900 tracking-tight">Manajemen Co.Ass & Kode Login Khusus</h2>
          <p class="text-xs text-slate-500 mt-1">
            Atur asisten praktikum dan buatkan kode login khusus unik untuk tiap Co.Ass (Sistem Co.Ass Bergilir Tiap Kelompok).
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button onclick="pullFromGoogleSheetsSilent(true)" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-3.5 rounded-xl shadow-sm flex items-center space-x-1.5 transition" title="Tarik pembaruan data Co.Ass langsung dari Google Drive">
            <i data-lucide="cloud-download" class="w-4 h-4"></i>
            <span>Tarik dari Drive</span>
          </button>
          <button onclick="resetCoAssToMaster()" class="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold py-2 px-3.5 rounded-xl shadow-sm flex items-center space-x-1.5 transition" title="Reset ke 4 Co.Ass Master resmi (Justiar, Ismail, Abel, Fathur)">
            <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
            <span>Reset 4 Co.Ass Master</span>
          </button>
          <button onclick="openModalTambahCoAss()" class="bg-[#56b29d] hover:bg-[#469c88] text-white text-xs font-semibold py-2 px-4 rounded-xl shadow-sm flex items-center space-x-2 transition">
            <i data-lucide="user-plus" class="w-4 h-4"></i>
            <span>Tambah Co.Ass Baru</span>
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-900 text-white font-title">
              <tr>
                <th class="p-3 w-10 text-center">No</th>
                <th class="p-3">Nama Co.Ass</th>
                <th class="p-3">Email</th>
                <th class="p-3">Kode Login Khusus</th>
                <th class="p-3">Kelompok Binaan</th>
                <th class="p-3 text-center">Status</th>
                <th class="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${AppState.coassList.map((c, idx) => `
                <tr class="hover:bg-slate-50 transition">
                  <td class="p-3 text-center text-slate-400 font-mono">${idx + 1}</td>
                  <td class="p-3 font-semibold text-slate-900">${escapeHtml(c.nama)}</td>
                  <td class="p-3 text-slate-500">${escapeHtml(c.email || '-')}</td>
                  <td class="p-3">
                    <div class="inline-flex items-center space-x-2 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                      <span class="font-mono font-bold text-[#2d6055] tracking-wider">${escapeHtml(c.kodeLogin)}</span>
                      <button onclick="copyToClipboard('${escapeHtml(c.kodeLogin)}', 'Kode login Co.Ass disalin!')" class="text-slate-400 hover:text-[#56b29d]" title="Salin Kode">
                        <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </td>
                  <td class="p-3 text-slate-600">
                    ${Array.isArray(c.kelompokBinaan) ? c.kelompokBinaan.join(', ') : (c.kelompokBinaan || 'Kelompok 1-8')}
                  </td>
                  <td class="p-3 text-center">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
                      ${escapeHtml(c.status || 'Aktif')}
                    </span>
                  </td>
                  <td class="p-3 text-center space-x-1">
                    <button onclick="editCoAss('${escapeHtml(c.id)}')" class="p-1 text-[#36786a] hover:text-[#1b5e20]" title="Edit">
                      <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                    <button onclick="hapusCoAss('${escapeHtml(c.id)}')" class="p-1 text-rose-500 hover:text-rose-700" title="Hapus">
                      <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

/**
 * 10. TAMPILAN 6: PENGATURAN & DRIVE (PIN KOORDINATOR: gigikuPutih@354)
 */
function renderPengaturanView() {
  const cfg = AppState.config;

  return `
    <div class="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 class="font-title text-2xl font-bold text-slate-900 tracking-tight">Pengaturan Praktikum & Google Drive</h2>
        <p class="text-xs text-slate-500 mt-1">
          Kelola integrasi database Google Drive (${escapeHtml(cfg.developerEmail)}), praktikum aktif & bobot nilai, serta akun login Koordinator / Dospem.
        </p>
      </div>

      <!-- KARTU 1: GOOGLE DRIVE -->
      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-200">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-50 text-[#56b29d] flex items-center justify-center">
              <i data-lucide="cloud" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="font-title font-bold text-slate-900 text-base">Database Google Drive</h3>
              <p class="text-xs text-slate-500">Google Sheets di akun: <strong class="text-slate-700">${escapeHtml(cfg.developerEmail)}</strong></p>
            </div>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-bold ${AppState.syncStatus.online ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
            ${AppState.syncStatus.online ? 'Drive Terhubung' : 'Lokal / Siap Sync'}
          </span>
        </div>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">URL Web App Google Apps Script</label>
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input type="url" id="setting-apps-script-url" value="${escapeHtml(cfg.googleAppsScriptUrl || '')}" 
                placeholder="https://script.google.com/macros/s/AKfycb.../exec" 
                class="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-[#56b29d]">
              <div class="flex items-center gap-2">
                <button onclick="saveDriveSettings()" class="bg-[#56b29d] hover:bg-[#469c88] text-white font-semibold py-2 px-3.5 rounded-lg text-xs transition shrink-0 flex items-center space-x-1 shadow-sm" title="Simpan URL ke browser">
                  <i data-lucide="save" class="w-3.5 h-3.5"></i>
                  <span>Simpan URL</span>
                </button>
                <button onclick="testGoogleDriveConnection()" class="bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2 px-3.5 rounded-lg text-xs transition shrink-0 flex items-center space-x-1 shadow-sm" title="Tes koneksi ke Google Drive">
                  <i data-lucide="plug" class="w-3.5 h-3.5"></i>
                  <span>Tes Koneksi</span>
                </button>
              </div>
            </div>
            <p class="text-[11px] text-slate-500 mt-1">Salin URL Web App yang didapat dari Google Apps Script (Langkah 4), lalu klik Simpan URL atau Tes Koneksi.</p>
          </div>

          <!-- PANDUAN LANGKAH 5 & TOMBOL SINKRONISASI -->
          <div class="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 mt-3 space-y-2.5">
            <div class="flex items-center space-x-2 text-emerald-800 font-semibold text-xs">
              <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-600 shrink-0"></i>
              <span>Langkah 5 (Sinkronisasi Data): Klik tombol di bawah ini untuk mengirim data ke Google Drive:</span>
            </div>
            <div class="flex flex-wrap items-center gap-2 pt-1">
              <button onclick="syncWithGoogleSheets(true)" class="bg-[#56b29d] hover:bg-[#469c88] text-white font-bold py-2.5 px-4 rounded-lg text-xs transition flex items-center space-x-2 shadow-sm ring-2 ring-[#56b29d]/30" title="Kirim seluruh data praktikan, Co.Ass, dan nilai ke Google Drive">
                <i data-lucide="upload-cloud" class="w-4 h-4"></i>
                <span class="tracking-wide uppercase font-bold">Sinkronisasi Sekarang (Kirim ke Drive)</span>
              </button>
              <button onclick="pullFromGoogleSheets()" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold py-2 px-3 rounded-lg text-xs transition flex items-center space-x-1.5 shadow-sm">
                <i data-lucide="download-cloud" class="w-3.5 h-3.5 text-slate-500"></i>
                <span>Tarik Data dari Drive</span>
              </button>
              <button onclick="downloadConfiguredDataSeed()" class="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-3 rounded-lg text-xs transition flex items-center space-x-1.5 shadow-sm" title="Unduh data-seed.js yang sudah terpasang URL Google Drive untuk diupload ke GitHub">
                <i data-lucide="file-code" class="w-3.5 h-3.5"></i>
                <span>Unduh data-seed.js (Untuk GitHub)</span>
              </button>
              <button onclick="copyShareableCloudLink()" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold py-2 px-3 rounded-lg text-xs transition flex items-center space-x-1.5 shadow-sm" title="Salin link yang otomatis menghubungkan Co.Ass & Praktikan ke Google Drive Anda">
                <i data-lucide="share-2" class="w-3.5 h-3.5 text-[#56b29d]"></i>
                <span>Salin Link Web Cloud</span>
              </button>
              <button onclick="openModalConnectCloud()" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold py-2 px-3 rounded-lg text-xs transition flex items-center space-x-1.5 shadow-sm" title="Masukkan URL Apps Script secara langsung di perangkat ini">
                <i data-lucide="link" class="w-3.5 h-3.5 text-[#56b29d]"></i>
                <span>Hubungkan Drive di HP Ini</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- KARTU 2: KELOLA MULTI-PRAKTIKUM & BOBOT KOMPONEN -->
      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-teal-50 text-[#56b29d] flex items-center justify-center">
              <i data-lucide="folder-kanban" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="font-title font-bold text-slate-900 text-base">Kelola Multi-Praktikum & Bobot Komponen Penilaian</h3>
              <p class="text-xs text-slate-500">Buat praktikum baru, tentukan bobot penilaian, acara, penugasan Co.Ass, dan kelompok praktikan.</p>
            </div>
          </div>
          <button onclick="openModalBuatPraktikum()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3.5 rounded-lg text-xs transition flex items-center space-x-1.5 shadow-sm">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            <span>+ Buat Praktikum Baru</span>
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-900 text-white font-title">
              <tr>
                <th class="p-2.5 w-10 text-center">No</th>
                <th class="p-2.5">Nama Praktikum</th>
                <th class="p-2.5">Periode</th>
                <th class="p-2.5">Kelompok</th>
                <th class="p-2.5">Acara</th>
                <th class="p-2.5">Bobot Komponen</th>
                <th class="p-2.5 text-center">Status</th>
                <th class="p-2.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${AppState.praktikumList.map((prak, idx) => {
                const isActive = prak.id === AppState.activePraktikumId;
                const jmlAcara = (prak.acaraList && prak.acaraList.length) || 0;
                const jmlKel = prak.jumlahKelompok || 8;
                const pw = prak.weights || { laporan: 35, video: 10, performa: 15, sikap: 10, responsi: 20, formatLaporan: 5, k3Kedisiplinan: 5 };
                return `
                  <tr class="hover:bg-slate-50 transition ${isActive ? 'bg-emerald-50/40 font-medium' : ''}">
                    <td class="p-2.5 text-center text-slate-400 font-mono">${idx + 1}</td>
                    <td class="p-2.5 font-bold text-slate-900">
                      ${escapeHtml(prak.nama)}
                      ${isActive ? '<span class="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">Praktikum Aktif</span>' : ''}
                    </td>
                    <td class="p-2.5 text-slate-600">${escapeHtml(prak.semester || 'Ganjil')} ${escapeHtml(prak.tahunAkademik || '2026/2027')}</td>
                    <td class="p-2.5 font-mono text-slate-700">${jmlKel} Kelompok</td>
                    <td class="p-2.5 font-mono text-slate-700">${jmlAcara} Acara</td>
                    <td class="p-2.5 text-[11px] text-slate-600">
                      <div class="flex flex-wrap gap-1 max-w-xs">
                        <span class="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-medium">Lap: ${pw.laporan ?? 35}%</span>
                        <span class="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-medium">Vid: ${pw.video ?? 10}%</span>
                        <span class="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-medium">Perf: ${pw.performa ?? 15}%</span>
                        <span class="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-medium">Sik: ${pw.sikap ?? 10}%</span>
                        <span class="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-medium">Resp: ${pw.responsi ?? 20}%</span>
                        <span class="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-medium">Fmt: ${pw.formatLaporan ?? 5}%</span>
                        <span class="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-medium">Disiplin: ${pw.k3Kedisiplinan ?? 5}%</span>
                      </div>
                    </td>
                    <td class="p-2.5 text-center">
                      ${isActive ? `
                        <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-sm inline-block">Sedang Digunakan</span>
                      ` : `
                        <button onclick="switchPraktikum('${escapeHtml(prak.id)}')" class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 transition shadow-sm inline-block">
                          Aktifkan Ini
                        </button>
                      `}
                    </td>
                    <td class="p-2.5 text-center space-x-1 whitespace-nowrap">
                      <button onclick="editPraktikum('${escapeHtml(prak.id)}')" class="p-1 text-[#36786a] hover:text-[#1b5e20]" title="Edit Praktikum & Bobot">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                      </button>
                      ${AppState.praktikumList.length > 1 ? `
                        <button onclick="hapusPraktikum('${escapeHtml(prak.id)}')" class="p-1 text-rose-500 hover:text-rose-700" title="Hapus Praktikum">
                          <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                      ` : ''}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- KARTU 2.5: KONTROL PENILAIAN & SUB-PENILAIAN AKTIF (WEWENANG KOORDINATOR) -->
      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-teal-50 text-[#36786a] flex items-center justify-center shrink-0">
              <i data-lucide="sliders" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="font-title font-bold text-slate-900 text-base">Kontrol Penilaian & Sub-Penilaian Aktif (Wewenang Koordinator)</h3>
              <p class="text-xs text-slate-500">Tentukan komponen penilaian dan sub-indikator aktif. Nilai persentase bobot menjadi acuan standar bagi seluruh Co.Ass.</p>
            </div>
          </div>
          <button onclick="openModalAturEvaluasiKoordinator()" class="bg-[#56b29d] hover:bg-[#469c88] text-white font-semibold py-2 px-3.5 rounded-lg text-xs transition flex items-center space-x-1.5 shadow-sm shrink-0">
            <i data-lucide="settings-2" class="w-4 h-4"></i>
            <span>Atur Komponen & Bobot Acuan</span>
          </button>
        </div>

        <!-- Quick Indicator Badges -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          ${(() => {
            const ev = (AppState.config && AppState.config.evaluationConfig) || DEFAULT_EVALUATION_CONFIG;
            const c = (ev && ev.components) || DEFAULT_EVALUATION_CONFIG.components;
            const w = (AppState.config && AppState.config.weights) || DEFAULT_CONFIG.weights;
            const items = [
              { label: '1. Laporan', active: c.laporan !== false, weight: w.laporan ?? 35 },
              { label: '2. Video', active: c.video !== false, weight: w.video ?? 10 },
              { label: '3. Performa', active: c.performa !== false, weight: w.performa ?? 15 },
              { label: '4. Sikap', active: c.sikap !== false, weight: w.sikap ?? 10 },
              { label: '5. Format', active: c.formatLaporan !== false, weight: w.formatLaporan ?? 5 },
              { label: '6. Responsi', active: c.responsi !== false, weight: w.responsi ?? 20 },
              { label: '7. Kedisiplinan', active: c.k3Kedisiplinan !== false, weight: w.k3Kedisiplinan ?? 5 },
              { label: '8. Kehadiran', active: c.kehadiran !== false, weight: null }
            ];
            return items.map(it => `
              <div class="p-2.5 rounded-lg border ${it.active ? 'bg-slate-50 border-slate-200' : 'bg-rose-50/50 border-rose-200 opacity-60'} flex items-center justify-between">
                <span class="font-medium text-slate-800">${it.label}</span>
                <span class="font-mono font-bold text-[11px] ${it.active ? 'text-emerald-700' : 'text-rose-600'}">
                  ${it.active ? (it.weight != null ? `${it.weight}%` : 'Aktif') : 'Nonaktif'}
                </span>
              </div>
            `).join('');
          })()}
        </div>
      </div>

      <!-- KARTU 3: AKUN LOGIN KOORDINATOR & DOSPEM -->
      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <h3 class="font-title font-bold text-slate-900 text-base">Akun Login Koordinator & Dosen Pembimbing (Dospem)</h3>
            <p class="text-xs text-slate-500">Kelola akun, ubah username & password Anda sendiri agar fleksibel dan aman.</p>
          </div>
          <button onclick="openModalTambahKoordinator()" class="bg-[#56b29d] hover:bg-[#469c88] text-white font-semibold py-1.5 px-3 rounded-lg text-xs transition flex items-center space-x-1.5 shadow-sm">
            <i data-lucide="user-plus" class="w-3.5 h-3.5"></i>
            <span>Tambah Akun</span>
          </button>
        </div>

        <!-- Selector Penandatangan KHP Aktif -->
        <div class="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div class="flex items-center space-x-3">
            <div class="w-9 h-9 rounded-lg bg-emerald-100 text-[#2d6055] flex items-center justify-center shrink-0">
              <i data-lucide="pen-tool" class="w-5 h-5"></i>
            </div>
            <div>
              <p class="font-bold text-slate-800 text-sm">Koordinator / Dospem Penandatangan KHP</p>
              <p class="text-[11px] text-slate-500">Pilih akun yang namanya akan otomatis tercantum pada tanda tangan Kartu Hasil Praktikum (KHP).</p>
            </div>
          </div>
          <div class="flex items-center space-x-2 shrink-0">
            <select onchange="changeSelectedKoordinatorSigner(this.value)" class="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#56b29d] shadow-sm cursor-pointer">
              ${(AppState.koordinatorList || DEFAULT_KOORDINATOR).map(k => `
                <option value="${escapeHtml(k.id)}" ${k.id === (AppState.config && AppState.config.selectedSignerKoordinatorId || 'koor-develob') ? 'selected' : ''}>
                  ${escapeHtml(k.nama)} (${escapeHtml(k.roleJabatan || 'Koordinator')}) ${k.id === (AppState.config && AppState.config.selectedSignerKoordinatorId || 'koor-develob') ? '✓ Terpilih' : ''}
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-900 text-white font-title">
              <tr>
                <th class="p-2.5 w-10 text-center">No</th>
                <th class="p-2.5">Nama / Gelar</th>
                <th class="p-2.5">Username Login</th>
                <th class="p-2.5">Password</th>
                <th class="p-2.5">Role / Jabatan</th>
                <th class="p-2.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${(AppState.koordinatorList || DEFAULT_KOORDINATOR).map((k, idx) => `
                <tr class="hover:bg-slate-50 transition">
                  <td class="p-2.5 text-center text-slate-400 font-mono">${idx + 1}</td>
                  <td class="p-2.5 font-semibold text-slate-900">${escapeHtml(k.nama)}</td>
                  <td class="p-2.5 font-mono text-[#2d6055] font-bold">${escapeHtml(k.username)}</td>
                  <td class="p-2.5 font-mono">
                    <span id="pass-mask-${k.id}" class="text-slate-500 font-mono">••••••••</span>
                    <button type="button" onclick="peekKoordinatorPass('${k.id}', '${escapeHtml(k.password)}')" class="ml-2 text-slate-400 hover:text-slate-600 inline-block align-middle" title="Lihat Password">
                      <i data-lucide="eye" class="w-3.5 h-3.5 inline"></i>
                    </button>
                  </td>
                  <td class="p-2.5">
                    <div class="flex items-center flex-wrap gap-1.5">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${k.roleJabatan === 'Dosen Pembimbing' ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}">
                        ${escapeHtml(k.roleJabatan || 'Koordinator')}
                      </span>
                      ${k.id === (AppState.config && AppState.config.selectedSignerKoordinatorId || 'koor-develob') ? `
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#36786a] text-white flex items-center space-x-1 shadow-xs">
                          <i data-lucide="check" class="w-3 h-3 inline"></i>
                          <span>Penandatangan KHP</span>
                        </span>
                      ` : `
                        <button type="button" onclick="changeSelectedKoordinatorSigner('${escapeHtml(k.id)}')" class="px-2 py-0.5 rounded-full text-[10px] font-medium text-slate-600 hover:text-[#2d6055] hover:bg-emerald-50 border border-dashed border-slate-300 transition" title="Jadikan akun ini penandatangan lembar KHP">
                          Jadikan TTD KHP
                        </button>
                      `}
                    </div>
                  </td>
                  <td class="p-2.5 text-center space-x-1">
                    <button onclick="openModalEditKoordinator('${escapeHtml(k.id)}')" class="p-1 text-[#36786a] hover:text-[#1b5e20]" title="Edit Akun">
                      <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                    ${(AppState.koordinatorList || []).length > 1 ? `
                      <button onclick="hapusKoordinator('${escapeHtml(k.id)}')" class="p-1 text-rose-500 hover:text-rose-700" title="Hapus">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                      </button>
                    ` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

/**
 * 11. ENGINE IMPORT EXCEL & MODAL
 */

// Download Format Template Excel untuk diisi user
function downloadExcelTemplate() {
  if (typeof XLSX === 'undefined') {
    alert('Modul Excel sedang dimuat. Silakan tunggu sesaat.');
    return;
  }

  const sampleData = [
    {
      "NIM": "230101010",
      "Nama Praktikan": "Muhammad Rasyid",
      "Kelompok": "Kelompok 1",
      "CoAss Penilai": "Justiar Noer"
    },
    {
      "NIM": "230101011",
      "Nama Praktikan": "Nadia Putri",
      "Kelompok": "Kelompok 2",
      "CoAss Penilai": "Ismail Qori Pohan S.T"
    },
    {
      "NIM": "230101012",
      "Nama Praktikan": "Oki Setiawan",
      "Kelompok": "Kelompok 3",
      "CoAss Penilai": "Abel Ramadhan"
    }
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // NIM
    { wch: 25 }, // Nama
    { wch: 15 }, // Kelompok
    { wch: 25 }  // CoAss
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Format_Praktikan");
  XLSX.writeFile(wb, "Template_Import_Praktikan_INSTIPER.xlsx");
  showToast("Template Excel berhasil diunduh!", "info");
}

// Buka Modal Upload File Excel
function openModalImportExcel() {
  const modalContainer = document.getElementById('modal-container');
  const modalContent = document.getElementById('modal-content');
  if (!modalContainer || !modalContent) return;

  AppState.excelImportPreview = [];

  modalContent.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h3 class="font-title text-base font-bold text-slate-900">Import Praktikan dari File Excel</h3>
          <p class="text-xs text-slate-500">Unggah file spreadsheet (.xlsx, .xls, atau .csv).</p>
        </div>
        <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>

      <!-- Area Unggah / Drag & Drop -->
      <div class="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-[#56b29d] transition cursor-pointer bg-slate-50"
        onclick="document.getElementById('excel-file-input').click()">
        <input type="file" id="excel-file-input" accept=".xlsx, .xls, .csv" class="hidden" onchange="handleExcelFileSelect(event)">
        <i data-lucide="file-spreadsheet" class="w-10 h-10 text-[#56b29d] mx-auto mb-2"></i>
        <p class="text-xs font-semibold text-slate-800">Klik untuk memilih file Excel (.xlsx / .csv)</p>
        <p class="text-[11px] text-slate-400 mt-0.5">atau drag and drop file ke area ini</p>
      </div>

      <div class="flex items-center justify-between text-xs pt-1">
        <span class="text-slate-500">Belum punya format kolom?</span>
        <button onclick="downloadExcelTemplate()" class="text-[#36786a] font-semibold hover:underline flex items-center space-x-1">
          <i data-lucide="download" class="w-3.5 h-3.5"></i>
          <span>Unduh Template Excel</span>
        </button>
      </div>

      <!-- Container Preview Hasil Pembacaan Excel -->
      <div id="excel-preview-area" class="hidden space-y-3 pt-2">
        <div class="flex items-center justify-between">
          <span id="excel-preview-count" class="text-xs font-bold text-slate-800 font-mono"></span>
          <div class="flex items-center space-x-3 text-xs">
            <label class="flex items-center space-x-1 text-slate-600 cursor-pointer">
              <input type="radio" name="import-mode" value="append" checked class="text-[#56b29d]">
              <span>Tambahkan</span>
            </label>
            <label class="flex items-center space-x-1 text-slate-600 cursor-pointer">
              <input type="radio" name="import-mode" value="replace" class="text-[#56b29d]">
              <span>Timpa Semua</span>
            </label>
          </div>
        </div>

        <div class="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-100 font-semibold sticky top-0 text-slate-700">
              <tr>
                <th class="p-2">NIM</th>
                <th class="p-2">Nama Praktikan</th>
                <th class="p-2">Kelompok</th>
                <th class="p-2">Co.Ass Penilai</th>
              </tr>
            </thead>
            <tbody id="excel-preview-tbody" class="divide-y divide-slate-100">
            </tbody>
          </table>
        </div>
      </div>

      <div class="flex justify-end space-x-2 pt-3 border-t border-slate-100">
        <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-lg border border-slate-300 font-medium text-slate-600 text-xs">Batal</button>
        <button type="button" id="btn-confirm-import" onclick="confirmImportPraktikan()" disabled 
          class="px-5 py-2 rounded-lg bg-[#56b29d] hover:bg-[#469c88] text-white font-semibold text-xs shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          Simpan ke Database
        </button>
      </div>
    </div>
  `;
  modalContainer.classList.remove('hidden');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Proses Pembacaan File Excel
function handleExcelFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (rawRows.length === 0) {
        alert("File Excel kosong atau tidak memiliki data baris!");
        return;
      }

      // Normalisasi nama kolom fleksibel (Tanpa Shift)
      const parsedStudents = [];
      rawRows.forEach((row, idx) => {
        // Cari kolom NIM
        const nimKey = Object.keys(row).find(k => /nim|no_mhs|nomor mahasiswa|npm/i.test(k.trim()));
        // Cari kolom Nama
        const namaKey = Object.keys(row).find(k => /nama|nama praktikan|nama lengkap|mahasiswa/i.test(k.trim()));
        // Cari kolom Kelompok
        const kelKey = Object.keys(row).find(k => /kelompok|group|grup|kel/i.test(k.trim()));
        // Cari kolom CoAss
        const coassKey = Object.keys(row).find(k => /coass|asisten|penilai|pembimbing/i.test(k.trim()));

        const nim = nimKey ? String(row[nimKey]).trim() : "";
        const nama = namaKey ? String(row[namaKey]).trim() : "";

        if (nim && nama) {
          const kelompok = kelKey && row[kelKey] ? String(row[kelKey]).trim() : "Kelompok 1";
          const coassNama = coassKey && row[coassKey] ? String(row[coassKey]).trim() : "Sistem Bergilir";
          const matchedCoass = AppState.coassList.find(c => c.nama.toLowerCase().includes(coassNama.toLowerCase()));

          parsedStudents.push({
            id: "prak-imp-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6) + "-" + idx,
            nim: nim,
            nama: nama,
            kelompok: kelompok,
            coassId: matchedCoass ? matchedCoass.id : "",
            coassNama: matchedCoass ? matchedCoass.nama : (coassNama || "Sistem Bergilir")
          });
        }
      });

      if (parsedStudents.length === 0) {
        alert("Tidak ditemukan baris yang valid dengan kolom NIM dan Nama!");
        return;
      }

      AppState.excelImportPreview = parsedStudents;

      // Tampilkan Preview ke Modal
      const previewArea = document.getElementById('excel-preview-area');
      const previewCount = document.getElementById('excel-preview-count');
      const previewTbody = document.getElementById('excel-preview-tbody');
      const btnConfirm = document.getElementById('btn-confirm-import');

      if (previewArea && previewCount && previewTbody && btnConfirm) {
        previewCount.innerText = `Terdeteksi: ${parsedStudents.length} Mahasiswa`;
        previewTbody.innerHTML = parsedStudents.map(p => `
          <tr class="hover:bg-slate-50 font-mono">
            <td class="p-2 font-bold text-slate-800">${escapeHtml(p.nim)}</td>
            <td class="p-2 font-sans font-medium text-slate-900">${escapeHtml(p.nama)}</td>
            <td class="p-2 text-slate-600">${escapeHtml(p.kelompok)}</td>
            <td class="p-2 font-sans text-slate-600 text-[11px]">${escapeHtml(p.coassNama)}</td>
          </tr>
        `).join('');

        previewArea.classList.remove('hidden');
        btnConfirm.removeAttribute('disabled');
      }

    } catch (err) {
      console.error(err);
      alert("Gagal membaca file Excel: " + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

// Konfirmasi dan Simpan Hasil Impor Excel ke Database
function confirmImportPraktikan() {
  const listToImport = AppState.excelImportPreview;
  if (!listToImport || listToImport.length === 0) return;

  const modeEl = document.querySelector('input[name="import-mode"]:checked');
  const mode = modeEl ? modeEl.value : 'append';

  if (mode === 'replace') {
    if (!confirm(`Apakah Anda yakin ingin MENGGANTI SELURUH DATA praktikan dengan ${listToImport.length} mahasiswa dari file Excel?`)) {
      return;
    }
    AppState.praktikanList = listToImport;
  } else {
    // Mode Tambahkan: jika NIM sudah ada, update; jika belum, tambahkan
    listToImport.forEach(item => {
      const existingIdx = AppState.praktikanList.findIndex(p => p.nim === item.nim);
      if (existingIdx >= 0) {
        AppState.praktikanList[existingIdx] = item;
      } else {
        AppState.praktikanList.push(item);
      }
    });
  }

  saveStateToStorage();
  closeModal();
  renderApp();
  showToast(`Sukses! ${listToImport.length} praktikan berhasil diimpor dari file Excel.`, 'success');
}

/**
 * 12. MODAL & FORM MANAJEMEN CO.ASS / PRAKTIKAN
 */
function renderModals() {
  if (document.getElementById('modal-container')) {
    return '';
  }
  return `
    <div id="modal-container" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
      <div id="modal-content" class="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
      </div>
    </div>
  `;
}

/**
 * 12A. MANAJEMEN AKUN KOORDINATOR / DOSPEM
 */
function openModalTambahKoordinator() {
  const modalContainer = document.getElementById('modal-container');
  const modalContent = document.getElementById('modal-content');
  if (!modalContainer || !modalContent) return;

  modalContent.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <h3 class="font-title text-base font-bold text-slate-900">Tambah Akun Koordinator / Dospem</h3>
        <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>

      <form onsubmit="handleTambahKoordinatorSubmit(event)" class="space-y-3 text-xs">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
          <input type="text" id="modal-koor-nama" required placeholder="Contoh: Dr. Ir. Budi Santoso, M.P." class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Role / Jabatan</label>
          <select id="modal-koor-role" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs">
            <option value="Koordinator">Koordinator Praktikum</option>
            <option value="Dosen Pembimbing">Dosen Pembimbing (Dospem)</option>
          </select>
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Username Login</label>
          <input type="text" id="modal-koor-user" required placeholder="Contoh: dospem2" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Password</label>
          <div class="relative">
            <input type="password" id="modal-koor-pass" required placeholder="Masukan password akun ini" class="w-full pl-3 pr-10 py-2 rounded-lg border border-slate-300 text-xs font-mono">
            <button type="button" onclick="togglePasswordVisibility('modal-koor-pass', this)" class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 p-1">
              <i data-lucide="eye" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <div class="flex justify-end space-x-2 pt-3 border-t border-slate-100">
          <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-lg border border-slate-300 font-medium text-slate-600 text-xs">Batal</button>
          <button type="submit" class="px-5 py-2 rounded-lg bg-[#56b29d] hover:bg-[#469c88] text-white font-semibold text-xs shadow-sm">Simpan Akun</button>
        </div>
      </form>
    </div>
  `;
  modalContainer.classList.remove('hidden');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function handleTambahKoordinatorSubmit(e) {
  e.preventDefault();
  const nama = document.getElementById('modal-koor-nama').value.trim();
  const roleJabatan = document.getElementById('modal-koor-role').value;
  const username = document.getElementById('modal-koor-user').value.trim().toLowerCase();
  const password = document.getElementById('modal-koor-pass').value.trim();

  if (!AppState.koordinatorList) AppState.koordinatorList = JSON.parse(JSON.stringify(DEFAULT_KOORDINATOR));

  if (AppState.koordinatorList.some(k => k.username.toLowerCase() === username)) {
    alert('Username tersebut sudah digunakan! Silakan gunakan username lain.');
    return;
  }

  const newAcc = {
    id: `koor-${Date.now()}`,
    username,
    password,
    nama,
    roleJabatan,
    email: AppState.config.developerEmail
  };

  AppState.koordinatorList.push(newAcc);
  saveStateToStorage();
  syncWithGoogleSheets(false);
  closeModal();
  renderApp();
  showToast(`Akun ${nama} berhasil ditambahkan!`, 'success');
}

function openModalEditKoordinator(id) {
  const k = (AppState.koordinatorList || DEFAULT_KOORDINATOR).find(item => item.id === id);
  if (!k) return;

  const modalContainer = document.getElementById('modal-container');
  const modalContent = document.getElementById('modal-content');
  if (!modalContainer || !modalContent) return;

  modalContent.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <h3 class="font-title text-base font-bold text-slate-900">Ubah Akun Koordinator / Dospem</h3>
        <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>

      <form onsubmit="handleEditKoordinatorSubmit(event, '${escapeHtml(k.id)}')" class="space-y-3 text-xs">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
          <input type="text" id="edit-koor-nama" required value="${escapeHtml(k.nama)}" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Role / Jabatan</label>
          <select id="edit-koor-role" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs">
            <option value="Koordinator" ${k.roleJabatan === 'Koordinator' ? 'selected' : ''}>Koordinator Praktikum</option>
            <option value="Dosen Pembimbing" ${k.roleJabatan === 'Dosen Pembimbing' ? 'selected' : ''}>Dosen Pembimbing (Dospem)</option>
          </select>
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Username Login</label>
          <input type="text" id="edit-koor-user" required value="${escapeHtml(k.username)}" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Password Baru (atau tetap gunakan saat ini)</label>
          <div class="relative">
            <input type="password" id="edit-koor-pass" required value="${escapeHtml(k.password)}" class="w-full pl-3 pr-10 py-2 rounded-lg border border-slate-300 text-xs font-mono">
            <button type="button" onclick="togglePasswordVisibility('edit-koor-pass', this)" class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 p-1">
              <i data-lucide="eye" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <div class="flex justify-end space-x-2 pt-3 border-t border-slate-100">
          <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-lg border border-slate-300 font-medium text-slate-600 text-xs">Batal</button>
          <button type="submit" class="px-5 py-2 rounded-lg bg-[#56b29d] hover:bg-[#469c88] text-white font-semibold text-xs shadow-sm">Simpan Perubahan</button>
        </div>
      </form>
    </div>
  `;
  modalContainer.classList.remove('hidden');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function handleEditKoordinatorSubmit(e, id) {
  e.preventDefault();
  const k = (AppState.koordinatorList || DEFAULT_KOORDINATOR).find(item => item.id === id);
  if (!k) return;

  k.nama = document.getElementById('edit-koor-nama').value.trim();
  k.roleJabatan = document.getElementById('edit-koor-role').value;
  k.username = document.getElementById('edit-koor-user').value.trim().toLowerCase();
  k.password = document.getElementById('edit-koor-pass').value.trim();

  saveStateToStorage();
  syncWithGoogleSheets(false);
  closeModal();
  renderApp();
  showToast(`Akun ${k.nama} berhasil diperbarui!`, 'success');
}

function changeSelectedKoordinatorSigner(id) {
  if (!id) return;
  if (!AppState.config) AppState.config = Object.assign({}, DEFAULT_CONFIG);
  AppState.config.selectedSignerKoordinatorId = id;
  saveStateToStorage();
  syncWithGoogleSheets(false);
  renderApp();
  const koorList = (AppState.koordinatorList && AppState.koordinatorList.length > 0)
    ? AppState.koordinatorList
    : DEFAULT_KOORDINATOR;
  const signer = koorList.find(k => k.id === id);
  if (signer) {
    showToast(`Penandatangan KHP diubah menjadi: ${signer.nama} (${signer.roleJabatan || 'Koordinator'})`, 'success');
  }
}

function hapusKoordinator(id) {
  if ((AppState.koordinatorList || DEFAULT_KOORDINATOR).length <= 1) {
    alert('Minimal harus ada 1 akun Koordinator / Dospem di sistem.');
    return;
  }
  if (!confirm('Apakah Anda yakin ingin menghapus akun ini?')) return;
  AppState.koordinatorList = (AppState.koordinatorList || DEFAULT_KOORDINATOR).filter(k => k.id !== id);
  if (AppState.config && AppState.config.selectedSignerKoordinatorId === id) {
    const remaining = (AppState.koordinatorList || DEFAULT_KOORDINATOR)[0];
    if (remaining) {
      AppState.config.selectedSignerKoordinatorId = remaining.id;
    }
  }
  saveStateToStorage();
  syncWithGoogleSheets(false);
  renderApp();
  showToast('Akun berhasil dihapus.', 'info');
}

function peekKoordinatorPass(id, pass) {
  const el = document.getElementById(`pass-mask-${id}`);
  if (!el) return;
  if (el.innerText === '••••••••') {
    el.innerText = pass;
    el.classList.add('text-[#2d6055]', 'font-bold');
  } else {
    el.innerText = '••••••••';
    el.classList.remove('text-[#2d6055]', 'font-bold');
  }
}

function copyShareableCloudLink() {
  const url = AppState.config && AppState.config.googleAppsScriptUrl;
  if (!url) {
    alert('Masukkan dan tes koneksi URL Google Apps Script Anda terlebih dahulu di menu Pengaturan!');
    return;
  }
  const fullLink = `${window.location.origin}${window.location.pathname}?apiUrl=${encodeURIComponent(url)}`;
  copyToClipboard(fullLink, 'Tautan Cloud berhasil disalin! Silakan kirim tautan ini ke Co.Ass dan praktikan.');
}

function openModalTambahCoAss() {
  const modalContainer = document.getElementById('modal-container');
  const modalContent = document.getElementById('modal-content');
  if (!modalContainer || !modalContent) return;

  const defaultCode = "COASS-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + (AppState.coassList.length + 1);

  modalContent.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <h3 class="font-title text-base font-bold text-slate-900">Tambah Co.Ass Baru</h3>
        <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>

      <form onsubmit="handleTambahCoAssSubmit(event)" class="space-y-3 text-xs">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
          <input type="text" id="modal-coass-nama" required placeholder="Contoh: Justiar Noer" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Email</label>
          <input type="email" id="modal-coass-email" placeholder="juzantiara@gmail.com" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Kode Login Khusus Co.Ass</label>
          <input type="text" id="modal-coass-code" required value="${defaultCode}" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold uppercase text-[#2d6055]">
          <p class="text-[10px] text-slate-400 mt-1">Kode unik ini digunakan asisten untuk login ke sistem.</p>
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Kelompok Binaan</label>
          <input type="text" id="modal-coass-kelompok" value="Kelompok 1-8" placeholder="Kelompok 1-8 (atau kosongkan untuk semua)" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs">
          <p class="text-[10px] text-slate-400 mt-0.5">Sistem menggunakan Co.Ass bergilir, sehingga Co.Ass dapat menilai seluruh kelompok.</p>
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Kontak WhatsApp</label>
          <input type="text" id="modal-coass-kontak" placeholder="0812-xxxx-xxxx" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs">
        </div>

        <div class="flex justify-end space-x-2 pt-3 border-t border-slate-100">
          <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-lg border border-slate-300 font-medium text-slate-600 text-xs">Batal</button>
          <button type="submit" class="px-5 py-2 rounded-lg bg-[#56b29d] hover:bg-[#469c88] text-white font-semibold text-xs shadow-sm">Simpan Co.Ass</button>
        </div>
      </form>
    </div>
  `;
  modalContainer.classList.remove('hidden');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function handleTambahCoAssSubmit(e) {
  e.preventDefault();
  const nama = document.getElementById('modal-coass-nama').value.trim();
  const email = document.getElementById('modal-coass-email').value.trim();
  const code = document.getElementById('modal-coass-code').value.trim().toUpperCase();
  const kelompokStr = document.getElementById('modal-coass-kelompok').value.trim();
  const kelompok = kelompokStr ? kelompokStr.split(',').map(s => s.trim()).filter(Boolean) : ["Kelompok 1-8"];
  const kontak = document.getElementById('modal-coass-kontak').value.trim();

  const newCoAss = {
    id: `coass-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    nama,
    email,
    kodeLogin: code,
    role: "Co.Ass Penilai",
    kelompokBinaan: kelompok.length > 0 ? kelompok : ["Kelompok 1-8"],
    status: "Aktif",
    kontak
  };

  AppState.coassList.push(newCoAss);
  saveStateToStorage();
  closeModal();
  renderApp();
  showToast(`Co.Ass ${nama} berhasil ditambahkan dengan kode: ${code}`, 'success');
  syncWithGoogleSheets(false);
}

function editCoAss(id) {
  let c = AppState.coassList.find(item => String(item.id) === String(id) || item.kodeLogin === id);
  if (!c) {
    showToast('Data Co.Ass tidak ditemukan!', 'error');
    return;
  }

  const modalContainer = document.getElementById('modal-container');
  const modalContent = document.getElementById('modal-content');
  if (!modalContainer || !modalContent) return;

  const kelompokStr = Array.isArray(c.kelompokBinaan) ? c.kelompokBinaan.join(', ') : (c.kelompokBinaan || 'Kelompok 1-8');

  modalContent.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <h3 class="font-title text-base font-bold text-slate-900">Edit Data Co.Ass</h3>
        <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>

      <form onsubmit="handleEditCoAssSubmit(event, '${escapeHtml(c.id)}')" class="space-y-3 text-xs">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
          <input type="text" id="edit-coass-nama" required value="${escapeHtml(c.nama)}" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Email</label>
          <input type="email" id="edit-coass-email" value="${escapeHtml(c.email || '')}" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Kode Login Khusus Co.Ass</label>
          <input type="text" id="edit-coass-code" required value="${escapeHtml(c.kodeLogin)}" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold uppercase text-[#2d6055]">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Kelompok Binaan</label>
          <input type="text" id="edit-coass-kelompok" value="${escapeHtml(kelompokStr)}" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Status</label>
          <select id="edit-coass-status" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium">
            <option value="Aktif" ${c.status === 'Aktif' ? 'selected' : ''}>Aktif</option>
            <option value="Non-Aktif" ${c.status === 'Non-Aktif' ? 'selected' : ''}>Non-Aktif</option>
          </select>
        </div>

        <div class="flex justify-end space-x-2 pt-3 border-t border-slate-100">
          <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-lg border border-slate-300 font-medium text-slate-600 text-xs">Batal</button>
          <button type="submit" class="px-5 py-2 rounded-lg bg-[#56b29d] hover:bg-[#469c88] text-white font-semibold text-xs shadow-sm">Simpan Perubahan</button>
        </div>
      </form>
    </div>
  `;
  modalContainer.classList.remove('hidden');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function handleEditCoAssSubmit(e, id) {
  e.preventDefault();
  let c = AppState.coassList.find(item => String(item.id) === String(id) || item.kodeLogin === id);
  if (!c) {
    showToast('Data Co.Ass tidak ditemukan!', 'error');
    return;
  }

  const oldName = c.nama;
  c.nama = document.getElementById('edit-coass-nama').value.trim();
  c.email = document.getElementById('edit-coass-email').value.trim();
  c.kodeLogin = document.getElementById('edit-coass-code').value.trim().toUpperCase();
  c.kelompokBinaan = document.getElementById('edit-coass-kelompok').value.split(',').map(s => s.trim()).filter(Boolean);
  c.status = document.getElementById('edit-coass-status').value;

  AppState.praktikanList.forEach(p => {
    if (p.coassId === c.id || p.coassNama === oldName) p.coassNama = c.nama;
  });

  saveStateToStorage();
  closeModal();
  renderApp();
  showToast(`Data Co.Ass ${c.nama} berhasil diperbarui!`, 'success');
  syncWithGoogleSheets(false);
}

function hapusCoAss(id) {
  let idx = AppState.coassList.findIndex(c => String(c.id) === String(id) || c.kodeLogin === id);
  if (idx === -1) {
    showToast('Data Co.Ass tidak ditemukan!', 'error');
    return;
  }
  const deletedName = AppState.coassList[idx].nama;
  if (!confirm(`Apakah Anda yakin ingin menghapus Co.Ass "${deletedName}"?`)) return;

  // Hapus HANYA 1 elemen pada index ini
  AppState.coassList.splice(idx, 1);
  saveStateToStorage();
  renderApp();
  showToast(`Data Co.Ass "${deletedName}" berhasil dihapus.`, 'info');
  syncWithGoogleSheets(false);
}

// Modal Tambah Praktikan Manual
function openModalTambahPraktikan() {
  const modalContainer = document.getElementById('modal-container');
  const modalContent = document.getElementById('modal-content');
  if (!modalContainer || !modalContent) return;

  const curPrak = getActivePraktikum();
  const jmlKelompok = curPrak.jumlahKelompok || 8;

  modalContent.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h3 class="font-title text-base font-bold text-slate-900">Tambah Praktikan Baru</h3>
          <p class="text-[11px] text-slate-500">Praktikum: <strong>${escapeHtml(curPrak.nama)}</strong></p>
        </div>
        <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>

      <form onsubmit="handleTambahPraktikanSubmit(event)" class="space-y-3 text-xs">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Nama Mahasiswa / Praktikan</label>
          <input type="text" id="modal-prak-nama" required placeholder="Contoh: Muhammad Farhan" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Nomor Induk Mahasiswa (NIM) - Untuk Login</label>
          <input type="text" id="modal-prak-nim" required placeholder="230101009" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Kelompok Praktikum</label>
          <select id="modal-prak-kelompok" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium">
            ${getKelompokList().map(k => `
              <option value="${k}">${k}</option>
            `).join('')}
          </select>
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Co.Ass Penanggung Jawab / Penilai (Sistem Bergilir)</label>
          <select id="modal-prak-coass" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs">
            <option value="">Semua Co.Ass (Sistem Bergilir Tiap Acara)</option>
            ${AppState.coassList.map(c => `
              <option value="${escapeHtml(c.id)}">${escapeHtml(c.nama)}</option>
            `).join('')}
          </select>
        </div>

        <div class="flex justify-end space-x-2 pt-3 border-t border-slate-100">
          <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-lg border border-slate-300 font-medium text-slate-600 text-xs">Batal</button>
          <button type="submit" class="px-5 py-2 rounded-lg bg-[#56b29d] hover:bg-[#469c88] text-white font-semibold text-xs shadow-sm">Simpan Praktikan</button>
        </div>
      </form>
    </div>
  `;
  modalContainer.classList.remove('hidden');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function handleTambahPraktikanSubmit(e) {
  e.preventDefault();
  const nama = document.getElementById('modal-prak-nama').value.trim();
  const nim = document.getElementById('modal-prak-nim').value.trim();
  const kelompok = document.getElementById('modal-prak-kelompok').value.trim();
  const coassId = document.getElementById('modal-prak-coass').value;
  const coass = AppState.coassList.find(c => c.id === coassId);

  const newPrak = {
    id: `prak-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    nim,
    nama,
    kelompok: kelompok || 'Kelompok 1',
    coassId: coassId || '',
    coassNama: coass ? coass.nama : 'Sistem Bergilir'
  };

  AppState.praktikanList.push(newPrak);
  saveStateToStorage();
  closeModal();
  renderApp();
  showToast(`Praktikan ${nama} (${nim}) berhasil didaftarkan!`, 'success');
  syncWithGoogleSheets(false);
}

function editPraktikan(id) {
  let p = AppState.praktikanList.find(item => String(item.id) === String(id) || item.nim === id);
  if (!p) {
    showToast('Data praktikan tidak ditemukan!', 'error');
    return;
  }

  const modalContainer = document.getElementById('modal-container');
  const modalContent = document.getElementById('modal-content');
  if (!modalContainer || !modalContent) return;

  const curPrak = getActivePraktikum();
  const jmlKelompok = curPrak.jumlahKelompok || 8;

  modalContent.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <h3 class="font-title text-base font-bold text-slate-900">Edit Data Praktikan</h3>
        <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>

      <form onsubmit="handleEditPraktikanSubmit(event, '${escapeHtml(p.id)}')" class="space-y-3 text-xs">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Nama Mahasiswa / Praktikan</label>
          <input type="text" id="edit-prak-nama" required value="${escapeHtml(p.nama)}" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Nomor Induk Mahasiswa (NIM)</label>
          <input type="text" id="edit-prak-nim" required value="${escapeHtml(p.nim)}" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Kelompok</label>
          <select id="edit-prak-kelompok" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium">
            ${getKelompokList().map(k => `
              <option value="${k}" ${p.kelompok === k ? 'selected' : ''}>${k}</option>
            `).join('')}
          </select>
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Co.Ass Penilai / Pembimbing (Sistem Bergilir)</label>
          <select id="edit-prak-coass" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs">
            <option value="">Semua Co.Ass (Sistem Bergilir Tiap Acara)</option>
            ${AppState.coassList.map(c => `
              <option value="${escapeHtml(c.id)}" ${c.id === p.coassId ? 'selected' : ''}>${escapeHtml(c.nama)}</option>
            `).join('')}
          </select>
        </div>

        <div class="flex justify-end space-x-2 pt-3 border-t border-slate-100">
          <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-lg border border-slate-300 font-medium text-slate-600 text-xs">Batal</button>
          <button type="submit" class="px-5 py-2 rounded-lg bg-[#56b29d] hover:bg-[#469c88] text-white font-semibold text-xs shadow-sm">Simpan Perubahan</button>
        </div>
      </form>
    </div>
  `;
  modalContainer.classList.remove('hidden');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function handleEditPraktikanSubmit(e, id) {
  e.preventDefault();
  let p = AppState.praktikanList.find(item => String(item.id) === String(id) || item.nim === id);
  if (!p) return;

  const oldNim = p.nim;
  const newNim = document.getElementById('edit-prak-nim').value.trim();
  const newNama = document.getElementById('edit-prak-nama').value.trim();
  const newKelompok = document.getElementById('edit-prak-kelompok').value.trim();
  const newCoassId = document.getElementById('edit-prak-coass').value;
  const coass = AppState.coassList.find(c => c.id === newCoassId);

  p.nama = newNama;
  p.nim = newNim;
  p.kelompok = newKelompok;
  p.coassId = newCoassId;
  p.coassNama = coass ? coass.nama : 'Sistem Bergilir';

  if (oldNim !== newNim) {
    ['laporan', 'video', 'performa', 'sikap', 'formatLaporan', 'responsi', 'k3Kedisiplinan', 'kehadiran', 'konsultasi', 'catatanEvaluasi'].forEach(k => {
      if (AppState.grades[k] && AppState.grades[k][oldNim]) {
        AppState.grades[k][newNim] = AppState.grades[k][oldNim];
        delete AppState.grades[k][oldNim];
      }
    });
  }

  saveStateToStorage();
  closeModal();
  renderApp();
  showToast(`Data praktikan ${p.nama} (${p.nim}) berhasil diperbarui!`, 'success');
  syncWithGoogleSheets(false);
}

function hapusPraktikan(id) {
  let idx = AppState.praktikanList.findIndex(p => String(p.id) === String(id) || p.nim === id);
  if (idx === -1) {
    showToast('Data praktikan tidak ditemukan!', 'error');
    return;
  }
  const target = AppState.praktikanList[idx];
  if (!confirm(`Hapus praktikan "${target.nama}" (${target.nim})? Seluruh data nilai praktikan ini akan terhapus.`)) return;

  delete AppState.grades.laporan[target.nim];
  delete AppState.grades.video[target.nim];
  delete AppState.grades.performa[target.nim];
  delete AppState.grades.sikap[target.nim];
  delete AppState.grades.formatLaporan[target.nim];
  delete AppState.grades.responsi[target.nim];
  delete AppState.grades.k3Kedisiplinan[target.nim];
  delete AppState.grades.kehadiran[target.nim];
  delete AppState.grades.konsultasi[target.nim];

  // Hapus hanya 1 item menggunakan splice
  AppState.praktikanList.splice(idx, 1);
  saveStateToStorage();
  renderApp();
  showToast(`Praktikan "${target.nama}" berhasil dihapus.`, 'info');
  syncWithGoogleSheets(false);
}

// ==========================================
// 12.1 MODAL & MANAJEMEN MULTI-PRAKTIKUM
// ==========================================

function openModalBuatPraktikum(prakId = null) {
  const modalContainer = document.getElementById('modal-container');
  const modalContent = document.getElementById('modal-content');
  if (!modalContainer || !modalContent) return;

  const isEdit = Boolean(prakId);
  const cur = isEdit ? AppState.praktikumList.find(p => p.id === prakId) : null;

  const initialNama = cur ? cur.nama : '';
  const initialTahun = cur ? (cur.tahunAkademik || AppState.config.academicYear) : (AppState.config.academicYear || '2026/2027');
  const initialSemester = cur ? (cur.semester || AppState.config.semester) : (AppState.config.semester || 'Ganjil');
  const initialKelompok = cur ? (cur.jumlahKelompok || 8) : 8;
  const initialAcara = (cur && cur.acaraList && cur.acaraList.length > 0) ? cur.acaraList : [
    { id: 1, nama: 'Acara 1', wajibVideo: true },
    { id: 2, nama: 'Acara 2', wajibVideo: true },
    { id: 3, nama: 'Acara 3', wajibVideo: false },
    { id: 4, nama: 'Acara 4', wajibVideo: false },
    { id: 5, nama: 'Acara 5', wajibVideo: false }
  ];

  const defaultWeights = {
    laporan: 35,
    video: 10,
    performa: 15,
    sikap: 10,
    responsi: 20,
    formatLaporan: 5,
    k3Kedisiplinan: 5
  };
  const initialWeights = (cur && cur.weights) ? cur.weights : (AppState.config && AppState.config.weights ? AppState.config.weights : defaultWeights);

  modalContent.innerHTML = `
    <div class="space-y-4 max-w-xl mx-auto">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h3 class="font-title text-base font-bold text-slate-900">${isEdit ? 'Edit Praktikum & Bobot Penilaian' : 'Buat Praktikum Baru'}</h3>
          <p class="text-xs text-slate-500">Isi identitas praktikum, bobot nilai, jumlah kelompok, acara praktikum, penugasan Co.Ass, dan data praktikan.</p>
        </div>
        <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>

      <form onsubmit="handleBuatPraktikumSubmit(event, ${isEdit ? `'${escapeHtml(prakId)}'` : 'null'})" class="space-y-4 text-xs">
        <!-- 1. Nama & Periode -->
        <div class="space-y-2">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Nama Praktikum / Mata Kuliah</label>
            <input type="text" id="modal-prak-nama" required value="${escapeHtml(initialNama)}" placeholder="Contoh: Praktikum Silvikultur & Pemuliaan Pohon" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-title font-bold">
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Tahun Akademik</label>
              <input type="text" id="modal-prak-tahun" required value="${escapeHtml(initialTahun)}" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Semester</label>
              <select id="modal-prak-semester" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs">
                <option value="Ganjil" ${initialSemester === 'Ganjil' ? 'selected' : ''}>Ganjil</option>
                <option value="Genap" ${initialSemester === 'Genap' ? 'selected' : ''}>Genap</option>
              </select>
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Jumlah Kelompok</label>
              <input type="number" min="1" max="25" id="modal-prak-kelompok" required value="${initialKelompok}" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-center">
            </div>
          </div>
        </div>

        <!-- 2. Bobot Komponen Penilaian Praktikum Ini -->
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div class="flex items-center justify-between">
            <div>
              <span class="font-semibold text-slate-800">Bobot Komponen Penilaian Praktikum</span>
              <p class="text-[11px] text-slate-500">Tentukan persentase bobot tiap komponen untuk praktikum ini (Total harus 100%)</p>
            </div>
            <span id="modal-prak-total-weight-badge" class="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold">Total: 100%</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-xs pt-1">
            <div>
              <label class="block text-[11px] font-semibold text-slate-600 mb-0.5">Laporan</label>
              <input type="number" min="0" max="100" id="modal-weight-laporan" value="${initialWeights.laporan ?? 35}" oninput="calculateModalTotalWeight()" class="w-full text-center py-1 rounded border border-slate-300 font-mono font-bold">
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-slate-600 mb-0.5">Video</label>
              <input type="number" min="0" max="100" id="modal-weight-video" value="${initialWeights.video ?? 10}" oninput="calculateModalTotalWeight()" class="w-full text-center py-1 rounded border border-slate-300 font-mono font-bold">
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-slate-600 mb-0.5">Performa</label>
              <input type="number" min="0" max="100" id="modal-weight-performa" value="${initialWeights.performa ?? 15}" oninput="calculateModalTotalWeight()" class="w-full text-center py-1 rounded border border-slate-300 font-mono font-bold">
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-slate-600 mb-0.5">Sikap</label>
              <input type="number" min="0" max="100" id="modal-weight-sikap" value="${initialWeights.sikap ?? 10}" oninput="calculateModalTotalWeight()" class="w-full text-center py-1 rounded border border-slate-300 font-mono font-bold">
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-slate-600 mb-0.5">Responsi</label>
              <input type="number" min="0" max="100" id="modal-weight-responsi" value="${initialWeights.responsi ?? 20}" oninput="calculateModalTotalWeight()" class="w-full text-center py-1 rounded border border-slate-300 font-mono font-bold">
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-slate-600 mb-0.5">Format</label>
              <input type="number" min="0" max="100" id="modal-weight-format" value="${initialWeights.formatLaporan ?? 5}" oninput="calculateModalTotalWeight()" class="w-full text-center py-1 rounded border border-slate-300 font-mono font-bold">
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-slate-600 mb-0.5">Kedisiplinan</label>
              <input type="number" min="0" max="100" id="modal-weight-k3" value="${initialWeights.k3Kedisiplinan ?? 5}" oninput="calculateModalTotalWeight()" class="w-full text-center py-1 rounded border border-slate-300 font-mono font-bold">
            </div>
          </div>
        </div>

        <!-- 3. Acara Praktikum -->
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-semibold text-slate-800">Daftar Acara Praktikum</span>
            <button type="button" onclick="tambahBarisAcaraModal()" class="text-xs text-[#36786a] font-bold hover:underline flex items-center space-x-1">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>Tambah Acara</span>
            </button>
          </div>
          <div id="modal-prak-acara-container" class="space-y-2 max-h-36 overflow-y-auto">
            ${initialAcara.map((ac, idx) => `
              <div class="flex items-center space-x-2 bg-white p-2 rounded-lg border border-slate-200" data-acara-row>
                <span class="font-mono text-slate-400 w-5 text-center">${idx + 1}</span>
                <input type="text" name="modal_acara_nama" value="${escapeHtml(ac.nama)}" required placeholder="Nama Acara" class="flex-1 px-2.5 py-1.5 rounded border border-slate-300 text-xs font-medium">
                <label class="flex items-center space-x-1 text-[11px] text-slate-600 cursor-pointer shrink-0">
                  <input type="checkbox" name="modal_acara_video" ${ac.wajibVideo ? 'checked' : ''} class="rounded text-[#56b29d]">
                  <span>Wajib Video</span>
                </label>
                <button type="button" onclick="this.closest('[data-acara-row]').remove()" class="text-rose-500 hover:text-rose-700 p-1" title="Hapus Acara">
                  <i data-lucide="x" class="w-4 h-4"></i>
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 4. Penugasan Co.Ass -->
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <label class="block font-semibold text-slate-800">Co.Ass yang Ditugaskan (Sistem Bergilir Tiap Kelompok)</label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-28 overflow-y-auto">
            ${AppState.coassList.map(c => `
              <label class="flex items-center space-x-2 bg-white p-2 rounded-lg border border-slate-200 text-xs cursor-pointer hover:bg-emerald-50">
                <input type="checkbox" name="modal_prak_coass" value="${escapeHtml(c.id)}" checked class="rounded text-[#56b29d]">
                <span class="font-medium text-slate-800 truncate">${escapeHtml(c.nama)}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <!-- 5. Pengisian Data Praktikan -->
        ${!isEdit ? `
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <label class="block font-semibold text-slate-800">Pengisian Data Praktikan Masing-Masing Kelompok</label>
            <div class="space-y-1.5">
              <label class="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input type="radio" name="modal_prak_student_mode" value="generate" checked onchange="togglePrakStudentMode(this.value)" class="text-[#56b29d]">
                <span>Buat slot praktikan otomatis (2 mahasiswa tiap kelompok)</span>
              </label>
              <label class="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input type="radio" name="modal_prak_student_mode" value="copy" onchange="togglePrakStudentMode(this.value)" class="text-[#56b29d]">
                <span>Salin daftar mahasiswa dari praktikum saat ini (${AppState.praktikanList.length} orang)</span>
              </label>
              <label class="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input type="radio" name="modal_prak_student_mode" value="paste" onchange="togglePrakStudentMode(this.value)" class="text-[#56b29d]">
                <span>Input cepat manual (Copy-Paste NIM, Nama, Kelompok)</span>
              </label>
            </div>

            <div id="modal-prak-paste-area" class="hidden pt-2">
              <label class="block text-[11px] text-slate-500 mb-1">Format satu baris per mahasiswa: <code>NIM, Nama Mahasiswa, Kelompok 1</code></label>
              <textarea id="modal-prak-paste-text" rows="3" placeholder="230101001, Budi Santoso, Kelompok 1&#10;230101002, Siti Rahma, Kelompok 1" class="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-[11px]"></textarea>
            </div>
          </div>
        ` : ''}

        <div class="flex justify-end space-x-2 pt-3 border-t border-slate-100">
          <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-lg border border-slate-300 font-medium text-slate-600 text-xs">Batal</button>
          <button type="submit" class="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm flex items-center space-x-1.5">
            <i data-lucide="check" class="w-4 h-4"></i>
            <span>${isEdit ? 'Simpan Perubahan' : 'Buat & Aktifkan Praktikum'}</span>
          </button>
        </div>
      </form>
    </div>
  `;

  modalContainer.classList.remove('hidden');
  calculateModalTotalWeight();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function calculateModalTotalWeight() {
  const lap = parseFloat(document.getElementById('modal-weight-laporan')?.value) || 0;
  const vid = parseFloat(document.getElementById('modal-weight-video')?.value) || 0;
  const perf = parseFloat(document.getElementById('modal-weight-performa')?.value) || 0;
  const sik = parseFloat(document.getElementById('modal-weight-sikap')?.value) || 0;
  const resp = parseFloat(document.getElementById('modal-weight-responsi')?.value) || 0;
  const fmt = parseFloat(document.getElementById('modal-weight-format')?.value) || 0;
  const k3 = parseFloat(document.getElementById('modal-weight-k3')?.value) || 0;
  const total = Math.round(lap + vid + perf + sik + resp + fmt + k3);
  const badge = document.getElementById('modal-prak-total-weight-badge');
  if (badge) {
    badge.innerText = `Total: ${total}%`;
    if (total === 100) {
      badge.className = 'text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold';
    } else {
      badge.className = 'text-xs px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-mono font-bold animate-pulse';
    }
  }
}

function tambahBarisAcaraModal() {
  const container = document.getElementById('modal-prak-acara-container');
  if (!container) return;
  const count = container.querySelectorAll('[data-acara-row]').length + 1;
  const div = document.createElement('div');
  div.className = 'flex items-center space-x-2 bg-white p-2 rounded-lg border border-slate-200';
  div.setAttribute('data-acara-row', '');
  div.innerHTML = `
    <span class="font-mono text-slate-400 w-5 text-center">${count}</span>
    <input type="text" name="modal_acara_nama" value="Acara ${count}" required placeholder="Nama Acara" class="flex-1 px-2.5 py-1.5 rounded border border-slate-300 text-xs font-medium">
    <label class="flex items-center space-x-1 text-[11px] text-slate-600 cursor-pointer shrink-0">
      <input type="checkbox" name="modal_acara_video" class="rounded text-[#56b29d]">
      <span>Wajib Video</span>
    </label>
    <button type="button" onclick="this.closest('[data-acara-row]').remove()" class="text-rose-500 hover:text-rose-700 p-1" title="Hapus Acara">
      <i data-lucide="x" class="w-4 h-4"></i>
    </button>
  `;
  container.appendChild(div);
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function togglePrakStudentMode(mode) {
  const pasteArea = document.getElementById('modal-prak-paste-area');
  if (pasteArea) {
    if (mode === 'paste') pasteArea.classList.remove('hidden');
    else pasteArea.classList.add('hidden');
  }
}

function handleBuatPraktikumSubmit(e, prakId = null) {
  e.preventDefault();
  const nama = document.getElementById('modal-prak-nama').value.trim();
  const tahun = document.getElementById('modal-prak-tahun').value.trim();
  const semester = document.getElementById('modal-prak-semester').value.trim();
  const jmlKelompok = parseInt(document.getElementById('modal-prak-kelompok').value) || 8;

  // Baca bobot komponen penilaian praktikum
  const wLaporan = parseFloat(document.getElementById('modal-weight-laporan')?.value) || 0;
  const wVideo = parseFloat(document.getElementById('modal-weight-video')?.value) || 0;
  const wPerforma = parseFloat(document.getElementById('modal-weight-performa')?.value) || 0;
  const wSikap = parseFloat(document.getElementById('modal-weight-sikap')?.value) || 0;
  const wResponsi = parseFloat(document.getElementById('modal-weight-responsi')?.value) || 0;
  const wFormat = parseFloat(document.getElementById('modal-weight-format')?.value) || 0;
  const wK3 = parseFloat(document.getElementById('modal-weight-k3')?.value) || 0;

  const weightsObj = {
    laporan: wLaporan,
    video: wVideo,
    performa: wPerforma,
    sikap: wSikap,
    responsi: wResponsi,
    formatLaporan: wFormat,
    k3Kedisiplinan: wK3
  };

  // Baca daftar acara
  const acaraRows = document.querySelectorAll('#modal-prak-acara-container [data-acara-row]');
  const acaraList = [];
  acaraRows.forEach((row, idx) => {
    const namaInput = row.querySelector('input[name="modal_acara_nama"]');
    const videoInput = row.querySelector('input[name="modal_acara_video"]');
    acaraList.push({
      id: idx + 1,
      code: `ACARA-${idx + 1}`,
      nama: namaInput ? namaInput.value.trim() : `Acara ${idx + 1}`,
      wajibVideo: videoInput ? videoInput.checked : false,
      deskripsi: `Materi ${namaInput ? namaInput.value.trim() : 'Praktikum'}`
    });
  });
  if (acaraList.length === 0) {
    acaraList.push({ id: 1, code: 'ACARA-1', nama: 'Acara 1', wajibVideo: true, deskripsi: '' });
  }

  // Baca Co.Ass terpilih
  const coassChecks = document.querySelectorAll('input[name="modal_prak_coass"]:checked');
  const assignedCoassIds = Array.from(coassChecks).map(cb => cb.value);

  if (prakId) {
    const prak = AppState.praktikumList.find(p => p.id === prakId);
    if (prak) {
      prak.nama = nama;
      prak.tahunAkademik = tahun;
      prak.semester = semester;
      prak.jumlahKelompok = jmlKelompok;
      prak.acaraList = acaraList;
      prak.assignedCoassIds = assignedCoassIds;
      prak.weights = weightsObj;

      if (AppState.activePraktikumId === prakId) {
        AppState.config.courseTitle = nama;
        AppState.config.academicYear = tahun;
        AppState.config.semester = semester;
        AppState.config.weights = Object.assign({}, weightsObj);
        AppState.acaraList = acaraList;
      }
      saveStateToStorage();
      closeModal();
      renderApp();
      showToast(`Praktikum "${nama}" & bobot penilaian berhasil diperbarui!`, 'success');
      syncWithGoogleSheets(false);
    }
    return;
  }

  // Buat praktikan baru
  const studentModeEl = document.querySelector('input[name="modal_prak_student_mode"]:checked');
  const studentMode = studentModeEl ? studentModeEl.value : 'generate';

  let newPraktikanList = [];
  if (studentMode === 'copy') {
    newPraktikanList = AppState.praktikanList.map(p => Object.assign({}, p, {
      id: 'prak-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)
    }));
  } else if (studentMode === 'paste') {
    const rawText = (document.getElementById('modal-prak-paste-text') ? document.getElementById('modal-prak-paste-text').value : '').trim();
    if (rawText) {
      const lines = rawText.split('\n');
      lines.forEach((line, idx) => {
        const parts = line.split(/[,;\t]+/).map(s => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const nim = parts[0];
          const studentNama = parts[1];
          const kel = parts[2] || `Kelompok ${(idx % jmlKelompok) + 1}`;
          newPraktikanList.push({
            id: 'prak-' + Date.now() + '-' + idx,
            nim: nim,
            nama: studentNama,
            kelompok: kel.startsWith('Kelompok') ? kel : `Kelompok ${kel}`,
            coassId: '',
            coassNama: 'Sistem Bergilir'
          });
        }
      });
    }
  }

  if (newPraktikanList.length === 0) {
    const baseNim = 230101000;
    let sIdx = 1;
    for (let k = 1; k <= jmlKelompok; k++) {
      for (let m = 1; m <= 2; m++) {
        newPraktikanList.push({
          id: 'prak-' + Date.now() + '-' + sIdx,
          nim: String(baseNim + sIdx),
          nama: `Praktikan ${sIdx} (Kelompok ${k})`,
          kelompok: `Kelompok ${k}`,
          coassId: '',
          coassNama: 'Sistem Bergilir'
        });
        sIdx++;
      }
    }
  }

  const newPrakId = 'prak-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  const newPrakObj = {
    id: newPrakId,
    nama: nama,
    tahunAkademik: tahun,
    semester: semester,
    jumlahKelompok: jmlKelompok,
    acaraList: acaraList,
    assignedCoassIds: assignedCoassIds,
    weights: weightsObj,
    praktikanList: newPraktikanList,
    grades: {
      laporan: {},
      video: {},
      performa: {},
      sikap: {},
      formatLaporan: {},
      responsi: {},
      k3Kedisiplinan: {},
      kehadiran: {},
      konsultasi: {},
      catatanEvaluasi: {}
    }
  };

  saveCurrentPraktikumState();
  AppState.praktikumList.push(newPrakObj);
  switchPraktikum(newPrakId);
  closeModal();
  showToast(`Praktikum "${nama}" berhasil dibuat dan diaktifkan!`, 'success');
  syncWithGoogleSheets(false);
}

function editPraktikum(prakId) {
  openModalBuatPraktikum(prakId);
}

function hapusPraktikum(prakId) {
  if (AppState.praktikumList.length <= 1) {
    alert('Tidak dapat menghapus praktikum karena minimal harus ada 1 praktikum yang terdaftar.');
    return;
  }
  const target = AppState.praktikumList.find(p => p.id === prakId);
  if (!target) return;
  if (!confirm(`Apakah Anda yakin ingin MENGHAPUS Praktikum "${target.nama}"?\n\nSeluruh data praktikan dan nilai di praktikum ini akan terhapus permanen.`)) {
    return;
  }

  const idx = AppState.praktikumList.findIndex(p => p.id === prakId);
  if (idx !== -1) {
    AppState.praktikumList.splice(idx, 1);
    if (AppState.activePraktikumId === prakId) {
      switchPraktikum(AppState.praktikumList[0].id);
    } else {
      saveStateToStorage();
      renderApp();
    }
    showToast(`Praktikum "${target.nama}" berhasil dihapus.`, 'info');
    syncWithGoogleSheets(false);
  }
}

function openModalConnectCloud() {
  const modalContainer = document.getElementById('modal-container');
  const modalContent = document.getElementById('modal-content');
  if (!modalContainer || !modalContent) return;

  const currentUrl = (AppState.config && AppState.config.googleAppsScriptUrl) || '';

  modalContent.innerHTML = `
    <div class="space-y-4 max-w-md mx-auto">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <div class="flex items-center space-x-2.5">
          <div class="w-8 h-8 rounded-lg bg-emerald-50 text-[#56b29d] flex items-center justify-center">
            <i data-lucide="cloud" class="w-4 h-4"></i>
          </div>
          <div>
            <h3 class="font-title text-base font-bold text-slate-900">Hubungkan Google Drive</h3>
            <p class="text-[11px] text-slate-500">Koneksikan perangkat ini ke database Google Sheets</p>
          </div>
        </div>
        <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>

      <form onsubmit="handleConnectCloudSubmit(event)" class="space-y-3 text-xs">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">URL Web App Google Apps Script</label>
          <input type="url" id="modal-cloud-url" required value="${escapeHtml(currentUrl)}" placeholder="https://script.google.com/macros/s/AKfycb.../exec" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono">
          <p class="text-[10px] text-slate-400 mt-1">Salin URL dari Google Apps Script akun juzantiara@gmail.com</p>
        </div>

        <div class="flex justify-end space-x-2 pt-3 border-t border-slate-100">
          <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-lg border border-slate-300 font-medium text-slate-600 text-xs">Batal</button>
          <button type="submit" class="px-5 py-2 rounded-lg bg-[#56b29d] hover:bg-[#469c88] text-white font-semibold text-xs shadow-sm flex items-center space-x-1.5">
            <i data-lucide="plug" class="w-4 h-4"></i>
            <span>Simpan & Sinkronkan</span>
          </button>
        </div>
      </form>
    </div>
  `;

  modalContainer.classList.remove('hidden');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function handleConnectCloudSubmit(e) {
  e.preventDefault();
  const inputUrl = document.getElementById('modal-cloud-url').value.trim();
  if (!inputUrl) return;

  AppState.config.googleAppsScriptUrl = inputUrl;
  saveStateToStorage();
  closeModal();
  showToast('URL Google Drive tersimpan. Mengambil data terbaru...', 'info');
  pullFromGoogleSheetsSilent(true);
}

function downloadConfiguredDataSeed() {
  const currentUrl = AppState.config.googleAppsScriptUrl || '';
  const currentPin = AppState.config.developerPin || 'gigikuPutih@354';
  const currentTitle = AppState.config.courseTitle || 'Praktikum Laboratorium Terpadu';
  const currentInst = AppState.config.institution || 'INSTIPER Yogyakarta';

  const content = `/**
 * DATA DEFAULT & SEED DATABASE
 * File ini otomatis dikonfigurasi dengan URL Google Drive & Data Co.Ass Anda.
 * Upload file ini ke repository GitHub Anda agar semua HP & perangkat otomatis terhubung ke Drive!
 */

const DEFAULT_CONFIG = {
  courseTitle: ${JSON.stringify(currentTitle)},
  institution: ${JSON.stringify(currentInst)},
  academicYear: ${JSON.stringify(AppState.config.academicYear || "2026/2027")},
  semester: ${JSON.stringify(AppState.config.semester || "Ganjil")},
  developerEmail: "juzantiara@gmail.com",
  developerPin: ${JSON.stringify(currentPin)},
  googleAppsScriptUrl: ${JSON.stringify(currentUrl)},
  weights: ${JSON.stringify(AppState.config.weights || DEFAULT_CONFIG.weights, null, 2)}
};

const DEFAULT_KOORDINATOR = ${JSON.stringify(AppState.koordinatorList || DEFAULT_KOORDINATOR, null, 2)};

const DEFAULT_ACARA = ${JSON.stringify(AppState.acaraList || DEFAULT_ACARA, null, 2)};

const DEFAULT_COASS = ${JSON.stringify(AppState.coassList || DEFAULT_COASS, null, 2)};

const DEFAULT_PRAKTIKAN = ${JSON.stringify(AppState.praktikanList || DEFAULT_PRAKTIKAN, null, 2)};

const DEFAULT_PRAKTIKUM_LIST = ${JSON.stringify(AppState.praktikumList || DEFAULT_PRAKTIKUM_LIST, null, 2)};
`;

  const blob = new Blob([content], { type: 'application/javascript;charset=utf-8' });
  const downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = 'data-seed.js';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(downloadLink.href);

  showToast('File data-seed.js berhasil dibuat & diunduh!', 'success');
  alert('BERHASIL MENGUNDUH data-seed.js! 🎉\\n\\nFile data-seed.js yang diunduh sudah berisi URL Google Apps Script dan data Co.Ass Anda.\\n\\nLangkah selanjutnya:\\nCukup upload/timpa file "data-seed.js" ini ke repository GitHub Anda (juzantiara-coder.github.io).\\n\\nSetelah itu, siapa saja (mahasiswa, Co.Ass, HP Android/iPhone) yang membuka web langsung otomatis terhubung ke Google Drive Anda!');
}

// Modal Tambah Konsultasi
function openModalTambahKonsultasi(nim) {
  const modalContainer = document.getElementById('modal-container');
  const modalContent = document.getElementById('modal-content');
  if (!modalContainer || !modalContent) return;

  const todayStr = new Date().toISOString().split('T')[0];

  modalContent.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <h3 class="font-title text-base font-bold text-slate-900">Tambah Sesi Konsultasi & Revisi Laporan</h3>
        <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>

      <form onsubmit="handleTambahKonsultasiSubmit(event, '${escapeHtml(nim)}')" class="space-y-3 text-xs">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Tanggal</label>
            <input type="date" id="modal-konsul-tgl" value="${todayStr}" required class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs">
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Acara Praktikum</label>
            <select id="modal-konsul-acara" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs">
              ${AppState.acaraList.map(a => `<option value="${escapeHtml(a.nama)}">${escapeHtml(a.nama)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Materi / Bab yang Dikonsultasikan</label>
          <input type="text" id="modal-konsul-materi" required placeholder="Contoh: Konsultasi Bab 4 (Pengolahan Data & Grafik)" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Catatan Revisi dari Co.Ass</label>
          <textarea id="modal-konsul-catatan" rows="3" placeholder="Tuliskan catatan perbaikan yang wajib direvisi..." class="w-full p-2.5 rounded-lg border border-slate-300 text-xs"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Status Penyelesaian Revisi</label>
            <select id="modal-konsul-status" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs">
              <option value="Sedang Revisi">Sedang Revisi</option>
              <option value="Selesai Disetujui">Selesai Disetujui</option>
              <option value="Belum Revisi">Belum Revisi</option>
            </select>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Tanggal Ulang (Jika Ada)</label>
            <input type="date" id="modal-konsul-tgl-ulang" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs">
          </div>
        </div>

        <div class="flex justify-end space-x-2 pt-3 border-t border-slate-100">
          <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-lg border border-slate-300 font-medium text-slate-600 text-xs">Batal</button>
          <button type="submit" class="px-5 py-2 rounded-lg bg-[#56b29d] hover:bg-[#469c88] text-white font-semibold text-xs shadow-sm">Simpan Konsultasi</button>
        </div>
      </form>
    </div>
  `;
  modalContainer.classList.remove('hidden');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function handleTambahKonsultasiSubmit(e, nim) {
  e.preventDefault();
  const tgl = document.getElementById('modal-konsul-tgl').value;
  const acara = document.getElementById('modal-konsul-acara').value;
  const materi = document.getElementById('modal-konsul-materi').value.trim();
  const catatan = document.getElementById('modal-konsul-catatan').value.trim();
  const status = document.getElementById('modal-konsul-status').value;
  const tglUlang = document.getElementById('modal-konsul-tgl-ulang').value;

  if (!AppState.grades.konsultasi[nim]) {
    AppState.grades.konsultasi[nim] = [];
  }

  AppState.grades.konsultasi[nim].push({
    id: "kons-" + Date.now(),
    tanggal: tgl,
    acara,
    statusHadir: "Hadir",
    materi,
    catatanRevisi: catatan,
    statusRevisi: status,
    tanggalUlang: tglUlang || null
  });

  saveStateToStorage();
  closeModal();
  renderApp();
  showToast('Catatan konsultasi berhasil disimpan!', 'success');
}

function hapusKonsultasi(nim, id) {
  if (!confirm('Hapus riwayat konsultasi ini?')) return;
  if (AppState.grades.konsultasi[nim]) {
    AppState.grades.konsultasi[nim] = AppState.grades.konsultasi[nim].filter(k => k.id !== id);
    saveStateToStorage();
    renderApp();
    showToast('Riwayat konsultasi dihapus.', 'info');
  }
}

function closeModal() {
  const modalContainer = document.getElementById('modal-container');
  if (modalContainer) modalContainer.classList.add('hidden');
}

function changeGradingKelompokFilter(kelompok) {
  const searchInput = document.getElementById('search-praktikan-coass');
  const query = searchInput ? searchInput.value : '';
  handleSearchPraktikanCoAss(query);
}

function handleSearchPraktikanCoAss(query) {
  const q = (query || '').toLowerCase().trim();
  const selKel = document.getElementById('select-kelompok-grading')?.value || 'all';
  const selPraktikan = document.getElementById('select-praktikan-coass');
  const clearBtn = document.getElementById('btn-clear-search-coass');
  if (clearBtn) {
    if (q) clearBtn.classList.remove('hidden');
    else clearBtn.classList.add('hidden');
  }
  if (!selPraktikan) return;

  let filtered = AppState.praktikanList;
  if (selKel !== 'all') {
    filtered = filtered.filter(p => p.kelompok === selKel);
  }
  if (q) {
    filtered = filtered.filter(p => 
      p.nama.toLowerCase().includes(q) || 
      p.nim.toLowerCase().includes(q) || 
      (p.kelompok && p.kelompok.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    selPraktikan.innerHTML = `<option value="">-- Tidak ada praktikan ditemukan --</option>`;
  } else {
    selPraktikan.innerHTML = filtered.map(p => `
      <option value="${escapeHtml(p.nim)}" ${p.nim === AppState.selectedPraktikanNIM ? 'selected' : ''}>
        ${escapeHtml(p.nim)} - ${escapeHtml(p.nama)} (${escapeHtml(p.kelompok)})
      </option>
    `).join('');
    
    // Jika NIM yang sedang aktif tidak ada dalam daftar yang difilter, pilih mahasiswa pertama
    if (!filtered.some(p => p.nim === AppState.selectedPraktikanNIM)) {
      changeSelectedPraktikan(filtered[0].nim);
    }
  }
}

function clearSearchPraktikanCoAss() {
  const searchInput = document.getElementById('search-praktikan-coass');
  if (searchInput) searchInput.value = '';
  handleSearchPraktikanCoAss('');
}

/**
 * SIMPAN FORM PENILAIAN LENGKAP OLEH CO.ASS (Bisa Diakses Kapanpun)
 */
function saveCurrentGradingForm(nim, acaraId) {
  const penilaiEl = document.getElementById('select-coass-penilai-acara');
  const penilaiNama = penilaiEl ? penilaiEl.value : (AppState.currentUser ? AppState.currentUser.data.nama : "Co.Ass");

  // Update penilai pada data praktikan jika bergilir
  const prakObj = AppState.praktikanList.find(p => p.nim === nim);
  if (prakObj && penilaiNama) {
    prakObj.coassNama = penilaiNama;
  }

  // 1. Simpan Laporan
  if (!AppState.grades.laporan[nim]) AppState.grades.laporan[nim] = {};
  const isLapAktif = document.getElementById('check-comp-laporan') ? document.getElementById('check-comp-laporan').checked : true;
  const lapScores = {};
  const lapChecklist = {};
  INDIKATOR_LAPORAN.forEach(ind => {
    const chk = document.getElementById(`check-lap-${ind.id}`);
    lapChecklist[ind.id] = chk ? chk.checked : true;
    const el = document.getElementById(`input-lap-${ind.id}`);
    lapScores[ind.id] = el ? parseFloat(el.value) || 0 : 0;
  });
  const lapCatatan = document.getElementById('catatan-laporan') ? document.getElementById('catatan-laporan').value : '';

  AppState.grades.laporan[nim][acaraId] = {
    aktif: isLapAktif,
    checklist: lapChecklist,
    scores: lapScores,
    total: calculateLaporanScore(lapScores, lapChecklist, isLapAktif),
    catatan: lapCatatan,
    tanggal: new Date().toISOString().split('T')[0],
    penilai: penilaiNama
  };

  // 2. Simpan Video
  if (!AppState.grades.video[nim]) AppState.grades.video[nim] = {};
  const isVidAktif = document.getElementById('check-comp-video') ? document.getElementById('check-comp-video').checked : true;
  const isVideoNA = document.getElementById('check-video-na') ? document.getElementById('check-video-na').checked : false;
  const vidScores = {};
  const vidChecklist = {};
  if (!isVideoNA && isVidAktif) {
    INDIKATOR_VIDEO.forEach(ind => {
      const chk = document.getElementById(`check-vid-${ind.id}`);
      vidChecklist[ind.id] = chk ? chk.checked : true;
      const el = document.getElementById(`input-vid-${ind.id}`);
      vidScores[ind.id] = el ? parseFloat(el.value) || 0 : 0;
    });
  }
  const vidCatatan = document.getElementById('catatan-video') ? document.getElementById('catatan-video').value : '';

  AppState.grades.video[nim][acaraId] = {
    aktif: isVidAktif,
    isNA: isVideoNA,
    checklist: vidChecklist,
    scores: vidScores,
    total: (isVideoNA || !isVidAktif) ? 0 : calculateVideoScore(vidScores, false, vidChecklist, isVidAktif).score,
    catatan: vidCatatan,
    penilai: penilaiNama
  };

  // 3. Simpan Performa
  const isPerfAktif = document.getElementById('check-comp-performa') ? document.getElementById('check-comp-performa').checked : true;
  const perfScores = {};
  const perfChecklist = {};
  INDIKATOR_PERFORMA.forEach(ind => {
    const chk = document.getElementById(`check-perf-${ind.id}`);
    perfChecklist[ind.id] = chk ? chk.checked : true;
    const el = document.getElementById(`input-perf-${ind.id}`);
    perfScores[ind.id] = el ? parseFloat(el.value) || 0 : 0;
  });
  const perfCatatan = document.getElementById('catatan-performa') ? document.getElementById('catatan-performa').value : '';
  AppState.grades.performa[nim] = {
    aktif: isPerfAktif,
    checklist: perfChecklist,
    scores: perfScores,
    total: calculatePerformaScore(perfScores, perfChecklist, isPerfAktif),
    catatan: perfCatatan
  };

  // 4. Simpan Sikap
  const isSikAktif = document.getElementById('check-comp-sikap') ? document.getElementById('check-comp-sikap').checked : true;
  const sikScores = {};
  const sikChecklist = {};
  INDIKATOR_SIKAP.forEach(ind => {
    const chk = document.getElementById(`check-sik-${ind.id}`);
    sikChecklist[ind.id] = chk ? chk.checked : true;
    const el = document.getElementById(`input-sik-${ind.id}`);
    sikScores[ind.id] = el ? parseFloat(el.value) || 0 : 0;
  });
  const sikCatatan = document.getElementById('catatan-sikap') ? document.getElementById('catatan-sikap').value : '';
  AppState.grades.sikap[nim] = {
    aktif: isSikAktif,
    checklist: sikChecklist,
    scores: sikScores,
    total: calculateSikapScore(sikScores, sikChecklist, isSikAktif),
    catatan: sikCatatan
  };

  // 5. Simpan Format
  const isFmtAktif = document.getElementById('check-comp-format') ? document.getElementById('check-comp-format').checked : true;
  const fmtScores = {};
  const fmtChecklist = {};
  INDIKATOR_FORMAT.forEach(ind => {
    const chk = document.getElementById(`check-fmt-${ind.id}`);
    fmtChecklist[ind.id] = chk ? chk.checked : true;
    const el = document.getElementById(`input-fmt-${ind.id}`);
    fmtScores[ind.id] = el ? parseFloat(el.value) || 0 : 0;
  });
  const fmtCatatan = document.getElementById('catatan-format') ? document.getElementById('catatan-format').value : '';
  AppState.grades.formatLaporan[nim] = {
    aktif: isFmtAktif,
    checklist: fmtChecklist,
    scores: fmtScores,
    total: calculateFormatScore(fmtScores, fmtChecklist, isFmtAktif),
    catatan: fmtCatatan
  };

  // 6. Simpan Responsi (Mandiri & Terpisah, Tersinkron Global)
  const respData = getResponsiFormData();
  AppState.grades.responsi[nim] = respData;
  if (!AppState.globalResponsi) AppState.globalResponsi = {};
  AppState.globalResponsi[nim] = respData;

  // 7. Simpan Penilaian Kedisiplinan
  const isK3Aktif = document.getElementById('check-comp-k3') ? document.getElementById('check-comp-k3').checked : true;
  const k3Scores = {};
  const k3Checklist = {};
  INDIKATOR_K3.forEach(ind => {
    const chk = document.getElementById(`check-k3-${ind.id}`);
    k3Checklist[ind.id] = chk ? chk.checked : true;
    const el = document.getElementById(`input-k3-${ind.id}`);
    k3Scores[ind.id] = el ? parseFloat(el.value) || 0 : 0;
  });
  const k3Catatan = document.getElementById('catatan-k3') ? document.getElementById('catatan-k3').value : '';
  AppState.grades.k3Kedisiplinan[nim] = {
    aktif: isK3Aktif,
    checklist: k3Checklist,
    scores: k3Scores,
    total: calculateK3Score(k3Scores, k3Checklist, isK3Aktif),
    catatan: k3Catatan
  };

  // 8. Simpan Kehadiran Tiap Acara (Ceklist, Pilihan Status & Tanggal)
  if (!AppState.grades.kehadiran[nim]) AppState.grades.kehadiran[nim] = [];
  const selectedStatusEl = document.querySelector('input[name="status-kehadiran-acara"]:checked');
  const selectedStatusVal = selectedStatusEl ? selectedStatusEl.value : 'Hadir';
  const selectedTglVal = document.getElementById('tgl-hadir-acara')?.value || new Date().toISOString().split('T')[0];
  const selectedKetVal = document.getElementById('ket-hadir-acara')?.value || '';

  const existKIdx = AppState.grades.kehadiran[nim].findIndex(k => k.acaraId === acaraId);
  const curKObj = {
    acaraId: acaraId,
    status: selectedStatusVal,
    tanggal: selectedTglVal,
    keterangan: selectedKetVal || selectedStatusVal
  };
  if (existKIdx >= 0) {
    AppState.grades.kehadiran[nim][existKIdx] = curKObj;
  } else {
    AppState.grades.kehadiran[nim].push(curKObj);
  }

  saveCurrentPraktikumState();
  saveStateToStorage();
  renderApp();
  showToast(`Nilai praktikan NIM ${nim} (Acara ${acaraId}) berhasil diperbarui & disimpan!`, 'success');
  triggerAutoCloudSync();
}

// Simpan Pengaturan Drive Google Apps Script
function saveDriveSettings() {
  const urlEl = document.getElementById('setting-apps-script-url');
  if (urlEl) {
    AppState.config.googleAppsScriptUrl = urlEl.value.trim();
  }
  saveStateToStorage();
  renderApp();
  showToast('URL Google Apps Script berhasil disimpan!', 'success');
  if (AppState.config.googleAppsScriptUrl) {
    pullFromGoogleSheetsSilent(false);
  }
}

// Fallback jika saveGeneralSettings dipanggil
function saveGeneralSettings() {
  saveDriveSettings();
}

// ============================================================================
// 12.2 MODAL KONTROL EVALUASI & SUB-PENILAIAN AKTIF (WEWENANG KOORDINATOR)
// ============================================================================

function openModalAturEvaluasiKoordinator() {
  const modalContainer = document.getElementById('modal-container');
  const modalContent = document.getElementById('modal-content');
  if (!modalContainer || !modalContent) return;

  const evalCfg = (AppState.config && AppState.config.evaluationConfig) || DEFAULT_EVALUATION_CONFIG;
  const compCfg = (evalCfg && evalCfg.components) || DEFAULT_EVALUATION_CONFIG.components;
  const subCfg = (evalCfg && evalCfg.subIndicators) || DEFAULT_EVALUATION_CONFIG.subIndicators;
  const weights = (AppState.config && AppState.config.weights) || DEFAULT_CONFIG.weights;

  modalContent.innerHTML = `
    <div class="space-y-5 max-w-2xl mx-auto">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h3 class="font-title text-base font-bold text-slate-900">Kontrol Penilaian & Sub-Penilaian Aktif</h3>
          <p class="text-xs text-slate-500">Wewenang Koordinator: Tentukan komponen & sub-indikator aktif serta persentase bobot acuan standar.</p>
        </div>
        <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <div class="bg-blue-50/80 p-3.5 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
        <div class="font-bold flex items-center space-x-1.5">
          <i data-lucide="info" class="w-4 h-4 text-blue-600"></i>
          <span>Informasi Pengaturan Koordinator:</span>
        </div>
        <p class="text-blue-800">
          • Komponen atau sub-indikator yang dinonaktifkan di sini otomatis dikecualikan dari akumulasi nilai.<br>
          • Persentase bobot acuan ini menjadi template awal bagi Co.Ass. Co.Ass tetap memiliki fleksibilitas mengubah persentase (bisa &gt; 100%) untuk memberi nilai apresiasi.<br>
          • Pengaturan ini bersifat menetap sampai Koordinator mengubahnya kembali.
        </p>
      </div>

      <!-- Komponen 1: Laporan Substansi -->
      <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
          <label class="inline-flex items-center space-x-2 cursor-pointer font-bold text-slate-900 text-xs">
            <input type="checkbox" id="koor-comp-laporan" ${compCfg.laporan !== false ? 'checked' : ''} class="w-4 h-4 rounded text-[#56b29d] focus:ring-[#56b29d]">
            <span>1. Penilaian Laporan Substansi</span>
          </label>
          <div class="flex items-center space-x-1 text-xs">
            <span class="text-slate-500">Bobot Acuan:</span>
            <input type="number" min="0" max="100" id="koor-weight-laporan" value="${weights.laporan ?? 35}" class="w-14 text-center py-1 rounded border border-slate-300 font-mono font-bold text-xs">
            <span class="text-slate-400 font-bold">%</span>
          </div>
        </div>
        <div class="text-xs space-y-2 pl-4">
          <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Sub-Indikator Laporan:</span>
          ${INDIKATOR_LAPORAN.map(ind => `
            <label class="flex items-center space-x-2 text-slate-700 cursor-pointer">
              <input type="checkbox" id="koor-sub-laporan-${ind.id}" ${(!subCfg.laporan || subCfg.laporan[ind.id] !== false) ? 'checked' : ''} class="rounded text-[#56b29d] focus:ring-[#56b29d]">
              <span>${escapeHtml(ind.nama)} (${ind.bobot}%)</span>
            </label>
          `).join('')}
        </div>
      </div>

      <!-- Komponen 2: Video Praktikum -->
      <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
          <label class="inline-flex items-center space-x-2 cursor-pointer font-bold text-slate-900 text-xs">
            <input type="checkbox" id="koor-comp-video" ${compCfg.video !== false ? 'checked' : ''} class="w-4 h-4 rounded text-[#56b29d] focus:ring-[#56b29d]">
            <span>2. Penilaian Video Praktikum</span>
          </label>
          <div class="flex items-center space-x-1 text-xs">
            <span class="text-slate-500">Bobot Acuan:</span>
            <input type="number" min="0" max="100" id="koor-weight-video" value="${weights.video ?? 10}" class="w-14 text-center py-1 rounded border border-slate-300 font-mono font-bold text-xs">
            <span class="text-slate-400 font-bold">%</span>
          </div>
        </div>
        <div class="text-xs space-y-2 pl-4">
          <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Sub-Indikator Video:</span>
          ${INDIKATOR_VIDEO.map(ind => `
            <label class="flex items-center space-x-2 text-slate-700 cursor-pointer">
              <input type="checkbox" id="koor-sub-video-${ind.id}" ${(!subCfg.video || subCfg.video[ind.id] !== false) ? 'checked' : ''} class="rounded text-[#56b29d] focus:ring-[#56b29d]">
              <span>${escapeHtml(ind.nama)} (${ind.bobot}%)</span>
            </label>
          `).join('')}
        </div>
      </div>

      <!-- Komponen 3: Performa Praktikan -->
      <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
          <label class="inline-flex items-center space-x-2 cursor-pointer font-bold text-slate-900 text-xs">
            <input type="checkbox" id="koor-comp-performa" ${compCfg.performa !== false ? 'checked' : ''} class="w-4 h-4 rounded text-[#56b29d] focus:ring-[#56b29d]">
            <span>3. Penilaian Performa Praktikan</span>
          </label>
          <div class="flex items-center space-x-1 text-xs">
            <span class="text-slate-500">Bobot Acuan:</span>
            <input type="number" min="0" max="100" id="koor-weight-performa" value="${weights.performa ?? 15}" class="w-14 text-center py-1 rounded border border-slate-300 font-mono font-bold text-xs">
            <span class="text-slate-400 font-bold">%</span>
          </div>
        </div>
        <div class="text-xs space-y-2 pl-4">
          <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Sub-Indikator Performa:</span>
          ${INDIKATOR_PERFORMA.map(ind => `
            <label class="flex items-center space-x-2 text-slate-700 cursor-pointer">
              <input type="checkbox" id="koor-sub-performa-${ind.id}" ${(!subCfg.performa || subCfg.performa[ind.id] !== false) ? 'checked' : ''} class="rounded text-[#56b29d] focus:ring-[#56b29d]">
              <span>${escapeHtml(ind.nama)} (${ind.bobot}%)</span>
            </label>
          `).join('')}
        </div>
      </div>

      <!-- Komponen 4: Sikap Belajar & Apresiasi -->
      <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
          <label class="inline-flex items-center space-x-2 cursor-pointer font-bold text-slate-900 text-xs">
            <input type="checkbox" id="koor-comp-sikap" ${compCfg.sikap !== false ? 'checked' : ''} class="w-4 h-4 rounded text-[#56b29d] focus:ring-[#56b29d]">
            <span>4. Penilaian Sikap Belajar & Apresiasi</span>
          </label>
          <div class="flex items-center space-x-1 text-xs">
            <span class="text-slate-500">Bobot Acuan:</span>
            <input type="number" min="0" max="100" id="koor-weight-sikap" value="${weights.sikap ?? 10}" class="w-14 text-center py-1 rounded border border-slate-300 font-mono font-bold text-xs">
            <span class="text-slate-400 font-bold">%</span>
          </div>
        </div>
        <div class="text-xs space-y-2 pl-4">
          <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Sub-Indikator Sikap:</span>
          ${INDIKATOR_SIKAP.map(ind => `
            <label class="flex items-center space-x-2 text-slate-700 cursor-pointer">
              <input type="checkbox" id="koor-sub-sikap-${ind.id}" ${(!subCfg.sikap || subCfg.sikap[ind.id] !== false) ? 'checked' : ''} class="rounded text-[#56b29d] focus:ring-[#56b29d]">
              <span>${escapeHtml(ind.nama)} (${ind.bobot}%)</span>
            </label>
          `).join('')}
        </div>
      </div>

      <!-- Komponen 5: Format Laporan -->
      <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
          <label class="inline-flex items-center space-x-2 cursor-pointer font-bold text-slate-900 text-xs">
            <input type="checkbox" id="koor-comp-formatLaporan" ${compCfg.formatLaporan !== false ? 'checked' : ''} class="w-4 h-4 rounded text-[#56b29d] focus:ring-[#56b29d]">
            <span>5. Penilaian Format Laporan</span>
          </label>
          <div class="flex items-center space-x-1 text-xs">
            <span class="text-slate-500">Bobot Acuan:</span>
            <input type="number" min="0" max="100" id="koor-weight-formatLaporan" value="${weights.formatLaporan ?? 5}" class="w-14 text-center py-1 rounded border border-slate-300 font-mono font-bold text-xs">
            <span class="text-slate-400 font-bold">%</span>
          </div>
        </div>
        <div class="text-xs space-y-2 pl-4">
          <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Sub-Indikator Format Laporan:</span>
          ${INDIKATOR_FORMAT.map(ind => `
            <label class="flex items-center space-x-2 text-slate-700 cursor-pointer">
              <input type="checkbox" id="koor-sub-formatLaporan-${ind.id}" ${(!subCfg.formatLaporan || subCfg.formatLaporan[ind.id] !== false) ? 'checked' : ''} class="rounded text-[#56b29d] focus:ring-[#56b29d]">
              <span>${escapeHtml(ind.nama)} (${ind.bobot}%)</span>
            </label>
          `).join('')}
        </div>
      </div>

      <!-- Komponen 6: Responsi Praktikum -->
      <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
          <label class="inline-flex items-center space-x-2 cursor-pointer font-bold text-slate-900 text-xs">
            <input type="checkbox" id="koor-comp-responsi" ${compCfg.responsi !== false ? 'checked' : ''} class="w-4 h-4 rounded text-[#56b29d] focus:ring-[#56b29d]">
            <span>6. Penilaian Responsi Praktikum (Terpisah & Sekali Isi)</span>
          </label>
          <div class="flex items-center space-x-1 text-xs">
            <span class="text-slate-500">Bobot Acuan:</span>
            <input type="number" min="0" max="100" id="koor-weight-responsi" value="${weights.responsi ?? 20}" class="w-14 text-center py-1 rounded border border-slate-300 font-mono font-bold text-xs">
            <span class="text-slate-400 font-bold">%</span>
          </div>
        </div>
        <div class="text-xs space-y-2 pl-4">
          <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Sub-Indikator Responsi:</span>
          ${INDIKATOR_RESPONSI.map(ind => `
            <label class="flex items-center space-x-2 text-slate-700 cursor-pointer">
              <input type="checkbox" id="koor-sub-responsi-${ind.id}" ${(!subCfg.responsi || subCfg.responsi[ind.id] !== false) ? 'checked' : ''} class="rounded text-[#56b29d] focus:ring-[#56b29d]">
              <span>${escapeHtml(ind.nama)} (${ind.bobot}%)</span>
            </label>
          `).join('')}
          <div class="pt-1 flex flex-col sm:flex-row sm:items-center gap-3">
            <label class="flex items-center space-x-2 text-teal-800 font-semibold cursor-pointer">
              <input type="checkbox" id="koor-sub-responsi-videoIndividu" ${(subCfg.responsi && subCfg.responsi.videoIndividu) ? 'checked' : ''} class="rounded text-[#56b29d] focus:ring-[#56b29d]">
              <span>Nilai Video Individu Responsi (Opsional)</span>
            </label>
            <label class="flex items-center space-x-2 text-teal-800 font-semibold cursor-pointer">
              <input type="checkbox" id="koor-sub-responsi-videoKelompok" ${(subCfg.responsi && subCfg.responsi.videoKelompok) ? 'checked' : ''} class="rounded text-[#56b29d] focus:ring-[#56b29d]">
              <span>Nilai Video Kelompok Responsi (Opsional)</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Komponen 7: Kedisiplinan & K3 -->
      <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
          <label class="inline-flex items-center space-x-2 cursor-pointer font-bold text-slate-900 text-xs">
            <input type="checkbox" id="koor-comp-k3Kedisiplinan" ${compCfg.k3Kedisiplinan !== false ? 'checked' : ''} class="w-4 h-4 rounded text-[#56b29d] focus:ring-[#56b29d]">
            <span>7. Penilaian Kedisiplinan & K3</span>
          </label>
          <div class="flex items-center space-x-1 text-xs">
            <span class="text-slate-500">Bobot Acuan:</span>
            <input type="number" min="0" max="100" id="koor-weight-k3Kedisiplinan" value="${weights.k3Kedisiplinan ?? 5}" class="w-14 text-center py-1 rounded border border-slate-300 font-mono font-bold text-xs">
            <span class="text-slate-400 font-bold">%</span>
          </div>
        </div>
        <div class="text-xs space-y-2 pl-4">
          <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Sub-Indikator Kedisiplinan:</span>
          ${INDIKATOR_K3.map(ind => `
            <label class="flex items-center space-x-2 text-slate-700 cursor-pointer">
              <input type="checkbox" id="koor-sub-k3Kedisiplinan-${ind.id}" ${(!subCfg.k3Kedisiplinan || subCfg.k3Kedisiplinan[ind.id] !== false) ? 'checked' : ''} class="rounded text-[#56b29d] focus:ring-[#56b29d]">
              <span>${escapeHtml(ind.nama)} (${ind.bobot}%)</span>
            </label>
          `).join('')}
        </div>
      </div>

      <!-- Komponen 8: Kehadiran -->
      <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <label class="inline-flex items-center space-x-2 cursor-pointer font-bold text-slate-900 text-xs">
          <input type="checkbox" id="koor-comp-kehadiran" ${compCfg.kehadiran !== false ? 'checked' : ''} class="w-4 h-4 rounded text-[#56b29d] focus:ring-[#56b29d]">
          <span>8. Presensi Kehadiran Tiap Acara (Hadir, Sakit, Izin, Absen)</span>
        </label>
        <span class="text-xs font-semibold text-slate-400">Presensi & Syarat Ujian</span>
      </div>

      <!-- Tombol Aksi Simpan -->
      <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
        <button type="button" onclick="closeModal()" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition">Batal</button>
        <button type="button" onclick="saveEvaluasiKoordinatorConfig()" class="bg-[#56b29d] hover:bg-[#469c88] text-white font-bold py-2 px-5 rounded-xl shadow-sm text-xs transition flex items-center space-x-2">
          <i data-lucide="check" class="w-4 h-4"></i>
          <span>Simpan Konfigurasi Koordinator</span>
        </button>
      </div>
    </div>
  `;

  modalContainer.classList.remove('hidden');
  lucide.createIcons();
}

function saveEvaluasiKoordinatorConfig() {
  const newCompCfg = {
    laporan: document.getElementById('koor-comp-laporan')?.checked ?? true,
    video: document.getElementById('koor-comp-video')?.checked ?? true,
    performa: document.getElementById('koor-comp-performa')?.checked ?? true,
    sikap: document.getElementById('koor-comp-sikap')?.checked ?? true,
    formatLaporan: document.getElementById('koor-comp-formatLaporan')?.checked ?? true,
    responsi: document.getElementById('koor-comp-responsi')?.checked ?? true,
    k3Kedisiplinan: document.getElementById('koor-comp-k3Kedisiplinan')?.checked ?? true,
    kehadiran: document.getElementById('koor-comp-kehadiran')?.checked ?? true
  };

  const newSubCfg = {
    laporan: {},
    video: {},
    performa: {},
    sikap: {},
    formatLaporan: {},
    responsi: {},
    k3Kedisiplinan: {}
  };

  INDIKATOR_LAPORAN.forEach(ind => {
    newSubCfg.laporan[ind.id] = document.getElementById(`koor-sub-laporan-${ind.id}`)?.checked ?? true;
  });
  INDIKATOR_VIDEO.forEach(ind => {
    newSubCfg.video[ind.id] = document.getElementById(`koor-sub-video-${ind.id}`)?.checked ?? true;
  });
  INDIKATOR_PERFORMA.forEach(ind => {
    newSubCfg.performa[ind.id] = document.getElementById(`koor-sub-performa-${ind.id}`)?.checked ?? true;
  });
  INDIKATOR_SIKAP.forEach(ind => {
    newSubCfg.sikap[ind.id] = document.getElementById(`koor-sub-sikap-${ind.id}`)?.checked ?? true;
  });
  INDIKATOR_FORMAT.forEach(ind => {
    newSubCfg.formatLaporan[ind.id] = document.getElementById(`koor-sub-formatLaporan-${ind.id}`)?.checked ?? true;
  });
  INDIKATOR_RESPONSI.forEach(ind => {
    newSubCfg.responsi[ind.id] = document.getElementById(`koor-sub-responsi-${ind.id}`)?.checked ?? true;
  });
  newSubCfg.responsi.videoIndividu = document.getElementById('koor-sub-responsi-videoIndividu')?.checked ?? false;
  newSubCfg.responsi.videoKelompok = document.getElementById('koor-sub-responsi-videoKelompok')?.checked ?? false;

  INDIKATOR_K3.forEach(ind => {
    newSubCfg.k3Kedisiplinan[ind.id] = document.getElementById(`koor-sub-k3Kedisiplinan-${ind.id}`)?.checked ?? true;
  });

  const newWeights = {
    laporan: parseFloat(document.getElementById('koor-weight-laporan')?.value) || 0,
    video: parseFloat(document.getElementById('koor-weight-video')?.value) || 0,
    performa: parseFloat(document.getElementById('koor-weight-performa')?.value) || 0,
    sikap: parseFloat(document.getElementById('koor-weight-sikap')?.value) || 0,
    formatLaporan: parseFloat(document.getElementById('koor-weight-formatLaporan')?.value) || 0,
    responsi: parseFloat(document.getElementById('koor-weight-responsi')?.value) || 0,
    k3Kedisiplinan: parseFloat(document.getElementById('koor-weight-k3Kedisiplinan')?.value) || 0
  };

  if (!AppState.config.evaluationConfig) AppState.config.evaluationConfig = {};
  AppState.config.evaluationConfig.components = newCompCfg;
  AppState.config.evaluationConfig.subIndicators = newSubCfg;
  AppState.config.weights = newWeights;

  saveCurrentPraktikumState();
  saveStateToStorage();
  closeModal();
  renderApp();
  showToast('Konfigurasi penilaian aktif & bobot acuan koordinator berhasil disimpan!', 'success');
  triggerAutoCloudSync();
}

// ============================================================================
// 12.3 INPUT NILAI VIA FILE EXCEL TIAP KELOMPOK
// ============================================================================

let _excelParsedBuffer = [];

function openModalExcelNilaiKelompok() {
  const modalContainer = document.getElementById('modal-container');
  const modalContent = document.getElementById('modal-content');
  if (!modalContainer || !modalContent) return;

  _excelParsedBuffer = [];
  const kelompokList = getKelompokList();
  const selGrading = document.getElementById('select-kelompok-grading')?.value;
  const selectedKel = (selGrading && selGrading !== 'all') ? selGrading : (kelompokList[0] || 'Kelompok 1');
  const selectedAcaraId = parseInt(AppState.selectedAcaraId) || 1;

  modalContent.innerHTML = `
    <div class="space-y-5 max-w-2xl mx-auto">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h3 class="font-title text-base font-bold text-slate-900">Input Nilai Menggunakan File Excel (.xlsx)</h3>
          <p class="text-xs text-slate-500">Unduh format template Excel per kelompok & acara, isi nilai, lalu unggah untuk menyimpan sekaligus.</p>
        </div>
        <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <!-- Pemilihan Kelompok & Acara -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Pilih Kelompok Praktikum</label>
          <select id="modal-excel-kelompok" onchange="updateExcelModalStudentCount()" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-[#56b29d]">
            ${kelompokList.map(k => `
              <option value="${escapeHtml(k)}" ${k === selectedKel ? 'selected' : ''}>${escapeHtml(k)}</option>
            `).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Pilih Acara Praktikum</label>
          <select id="modal-excel-acara" onchange="updateExcelModalStudentCount()" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-[#56b29d]">
            ${AppState.acaraList.map(a => `
              <option value="${a.id}" ${a.id === selectedAcaraId ? 'selected' : ''}>${escapeHtml(a.nama)}</option>
            `).join('')}
          </select>
        </div>
        <div class="sm:col-span-2 text-xs text-slate-500 flex items-center justify-between pt-1">
          <span id="modal-excel-mhs-count">Memuat data kelompok...</span>
          <span class="text-emerald-700 font-semibold font-mono text-[11px]">Format: .xlsx (Microsoft Excel)</span>
        </div>
      </div>

      <!-- Langkah 1: Unduh Format Template -->
      <div class="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
        <div class="flex items-center space-x-2 font-bold text-emerald-950 text-xs">
          <span class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">1</span>
          <span>Unduh Template Format Excel Kelompok Terpilih</span>
        </div>
        <p class="text-xs text-emerald-900/80">File template Excel sudah otomatis berisi seluruh nama & NIM mahasiswa kelompok ini beserta nilai yang sudah ada (jika pernah dinilai).</p>
        <button type="button" onclick="handleDownloadTemplateNilaiKelompok()" class="mt-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg text-xs shadow-sm transition flex items-center space-x-2">
          <i data-lucide="download" class="w-4 h-4"></i>
          <span>Unduh Template Excel (.xlsx)</span>
        </button>
      </div>

      <!-- Langkah 2: Unggah File Excel yang Telah Diisi -->
      <div class="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
        <div class="flex items-center space-x-2 font-bold text-slate-900 text-xs">
          <span class="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[11px]">2</span>
          <span>Unggah File Excel yang Sudah Diisi Nilai</span>
        </div>
        <input type="file" id="modal-excel-file-input" accept=".xlsx, .xls, .csv" onchange="handleExcelNilaiFileUpload(event)" class="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-slate-200 rounded-lg p-2 bg-white">
      </div>

      <!-- Preview Data Impor -->
      <div id="modal-excel-preview-container" class="hidden space-y-2">
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold text-slate-800">Pratinjau Nilai Mahasiswa dari Excel:</span>
          <span class="text-slate-500 font-mono text-[11px]" id="modal-excel-preview-stats"></span>
        </div>
        <div class="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-900 text-white font-semibold sticky top-0">
              <tr>
                <th class="p-2">NIM</th>
                <th class="p-2">Nama</th>
                <th class="p-2 text-center">Status</th>
                <th class="p-2 text-right">Laporan</th>
                <th class="p-2 text-right">Video</th>
                <th class="p-2 text-right">Performa</th>
                <th class="p-2 text-right">Sikap</th>
                <th class="p-2 text-right">Responsi</th>
              </tr>
            </thead>
            <tbody id="modal-excel-preview-tbody" class="divide-y divide-slate-100"></tbody>
          </table>
        </div>
      </div>

      <!-- Tombol Aksi Simpan -->
      <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
        <button type="button" onclick="closeModal()" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition">Batal</button>
        <button type="button" id="btn-apply-excel-nilai" onclick="applyImportedExcelNilai()" disabled class="bg-[#56b29d] opacity-50 cursor-not-allowed text-white font-bold py-2 px-5 rounded-xl shadow-sm text-xs transition flex items-center space-x-2">
          <i data-lucide="check" class="w-4 h-4"></i>
          <span>Terapkan & Simpan Nilai ke Sistem</span>
        </button>
      </div>
    </div>
  `;

  modalContainer.classList.remove('hidden');
  lucide.createIcons();
  updateExcelModalStudentCount();
}

function updateExcelModalStudentCount() {
  const kel = document.getElementById('modal-excel-kelompok')?.value || '';
  const count = AppState.praktikanList.filter(p => p.kelompok === kel).length;
  const countEl = document.getElementById('modal-excel-mhs-count');
  if (countEl) {
    countEl.innerHTML = `Terdaftar <strong>${count}</strong> mahasiswa di <strong>${escapeHtml(kel)}</strong>`;
  }
}

function handleDownloadTemplateNilaiKelompok() {
  if (typeof XLSX === 'undefined') {
    alert('Modul Excel (SheetJS) belum selesai dimuat. Silakan tunggu sesaat.');
    return;
  }
  const kel = document.getElementById('modal-excel-kelompok')?.value || 'Kelompok 1';
  const acaraId = parseInt(document.getElementById('modal-excel-acara')?.value) || 1;
  const acara = AppState.acaraList.find(a => a.id === acaraId) || AppState.acaraList[0];

  const students = AppState.praktikanList.filter(p => p.kelompok === kel);
  if (students.length === 0) {
    alert(`Tidak ada mahasiswa yang terdaftar di ${kel}.`);
    return;
  }

  const wb = XLSX.utils.book_new();

  const headers = [
    'No',
    'NIM',
    'Nama Mahasiswa',
    'Kelompok',
    'Status Kehadiran (Hadir/Sakit/Izin/Absen)',
    'Nilai Laporan (0-100)',
    'Catatan Laporan',
    'Nilai Video (0-100/NA)',
    'Catatan Video',
    'Nilai Performa (0-100)',
    'Nilai Sikap (0-100)',
    'Nilai Format (0-100)',
    'Nilai Responsi (0-100)',
    'Nilai Kedisiplinan (0-100)',
    'Catatan Evaluasi / Rekomendasi'
  ];

  const rows = [headers];

  students.forEach((s, idx) => {
    const nim = s.nim;
    const lap = (AppState.grades.laporan[nim] && AppState.grades.laporan[nim][acaraId]) || {};
    const vid = (AppState.grades.video[nim] && AppState.grades.video[nim][acaraId]) || {};
    const perf = AppState.grades.performa[nim] || {};
    const sik = AppState.grades.sikap[nim] || {};
    const fmt = AppState.grades.formatLaporan[nim] || {};
    const resp = AppState.grades.responsi[nim] || (AppState.globalResponsi && AppState.globalResponsi[nim]) || {};
    const k3 = AppState.grades.k3Kedisiplinan[nim] || {};
    const listK = AppState.grades.kehadiran[nim] || [];
    const kData = listK.find(k => k.acaraId === acaraId) || { status: 'Hadir' };
    const catEv = AppState.grades.catatanEvaluasi[nim] || {};

    rows.push([
      idx + 1,
      s.nim,
      s.nama,
      s.kelompok,
      kData.status || 'Hadir',
      lap.total != null ? lap.total : '',
      lap.catatan || '',
      vid.isNA ? 'NA' : (vid.total != null ? vid.total : ''),
      vid.catatan || '',
      perf.total != null ? perf.total : '',
      sik.total != null ? sik.total : '',
      fmt.total != null ? fmt.total : '',
      resp.total != null ? resp.total : '',
      k3.total != null ? k3.total : '',
      catEv.rekomendasi || catEv.kelebihan || ''
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 28 },
    { wch: 14 },
    { wch: 38 },
    { wch: 20 },
    { wch: 28 },
    { wch: 20 },
    { wch: 28 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 22 },
    { wch: 35 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, `Nilai_${kel.replace(/\s+/g,'')}`);
  const cleanKel = kel.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanAcara = (acara.code || `Acara_${acaraId}`).replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `Template_Nilai_${cleanKel}_${cleanAcara}.xlsx`);
  showToast(`Template Excel untuk ${kel} (${acara.nama}) berhasil diunduh!`, 'success');
}

function handleExcelNilaiFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      if (jsonRows.length < 2) {
        alert('File Excel kosong atau tidak memiliki baris data mahasiswa.');
        return;
      }

      const headers = jsonRows[0].map(h => String(h || '').trim().toLowerCase());
      const nimColIdx = headers.findIndex(h => h.includes('nim'));
      const namaColIdx = headers.findIndex(h => h.includes('nama'));
      const hadStatusColIdx = headers.findIndex(h => h.includes('kehadiran') || h.includes('status'));
      const lapColIdx = headers.findIndex(h => h.includes('laporan') && (h.includes('nilai') || h.includes('0-100')));
      const lapCatColIdx = headers.findIndex(h => h.includes('catatan laporan'));
      const vidColIdx = headers.findIndex(h => h.includes('video') && (h.includes('nilai') || h.includes('0-100')));
      const vidCatColIdx = headers.findIndex(h => h.includes('catatan video'));
      const perfColIdx = headers.findIndex(h => h.includes('performa'));
      const sikColIdx = headers.findIndex(h => h.includes('sikap'));
      const fmtColIdx = headers.findIndex(h => h.includes('format'));
      const respColIdx = headers.findIndex(h => h.includes('responsi'));
      const k3ColIdx = headers.findIndex(h => h.includes('kedisiplinan') || h.includes('k3'));
      const catUmumColIdx = headers.findIndex(h => h.includes('evaluasi') || h.includes('rekomendasi') || h.includes('catatan umum'));

      if (nimColIdx === -1) {
        alert('Kolom "NIM" tidak ditemukan di dalam file Excel. Mohon gunakan template yang disediakan.');
        return;
      }

      _excelParsedBuffer = [];
      const tbody = document.getElementById('modal-excel-preview-tbody');
      if (tbody) tbody.innerHTML = '';

      for (let i = 1; i < jsonRows.length; i++) {
        const row = jsonRows[i];
        if (!row || row.length === 0) continue;
        const rawNim = String(row[nimColIdx] || '').trim();
        if (!rawNim) continue;

        const nama = namaColIdx !== -1 ? String(row[namaColIdx] || '').trim() : '';
        const statusHadir = hadStatusColIdx !== -1 ? String(row[hadStatusColIdx] || 'Hadir').trim() : 'Hadir';
        const rawLap = lapColIdx !== -1 ? row[lapColIdx] : '';
        const rawVid = vidColIdx !== -1 ? row[vidColIdx] : '';
        const rawPerf = perfColIdx !== -1 ? row[perfColIdx] : '';
        const rawSik = sikColIdx !== -1 ? row[sikColIdx] : '';
        const rawFmt = fmtColIdx !== -1 ? row[fmtColIdx] : '';
        const rawResp = respColIdx !== -1 ? row[respColIdx] : '';
        const rawK3 = k3ColIdx !== -1 ? row[k3ColIdx] : '';
        const catLap = lapCatColIdx !== -1 ? String(row[lapCatColIdx] || '') : '';
        const catVid = vidCatColIdx !== -1 ? String(row[vidCatColIdx] || '') : '';
        const catUmum = catUmumColIdx !== -1 ? String(row[catUmumColIdx] || '') : '';

        const parseScore = val => {
          if (val == null || val === '') return null;
          const n = parseFloat(val);
          return isNaN(n) ? null : Math.max(0, Math.min(100, n));
        };

        const item = {
          nim: rawNim,
          nama: nama,
          statusHadir: statusHadir,
          nilaiLaporan: parseScore(rawLap),
          catatanLaporan: catLap,
          nilaiVideo: String(rawVid).toUpperCase() === 'NA' ? 'NA' : parseScore(rawVid),
          catatanVideo: catVid,
          nilaiPerforma: parseScore(rawPerf),
          nilaiSikap: parseScore(rawSik),
          nilaiFormat: parseScore(rawFmt),
          nilaiResponsi: parseScore(rawResp),
          nilaiKedisiplinan: parseScore(rawK3),
          catatanUmum: catUmum
        };

        _excelParsedBuffer.push(item);

        if (tbody) {
          const tr = document.createElement('tr');
          tr.className = 'hover:bg-slate-50 border-b border-slate-100';
          tr.innerHTML = `
            <td class="p-2 font-mono font-semibold">${escapeHtml(item.nim)}</td>
            <td class="p-2">${escapeHtml(item.nama || '-')}</td>
            <td class="p-2 text-center">
              <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${
                item.statusHadir === 'Hadir' ? 'bg-emerald-100 text-emerald-800' :
                item.statusHadir === 'Sakit' ? 'bg-blue-100 text-blue-800' :
                item.statusHadir === 'Izin' ? 'bg-amber-100 text-amber-800' :
                'bg-rose-100 text-rose-800'
              }">${escapeHtml(item.statusHadir)}</span>
            </td>
            <td class="p-2 text-right font-mono">${item.nilaiLaporan != null ? item.nilaiLaporan : '-'}</td>
            <td class="p-2 text-right font-mono">${item.nilaiVideo != null ? item.nilaiVideo : '-'}</td>
            <td class="p-2 text-right font-mono">${item.nilaiPerforma != null ? item.nilaiPerforma : '-'}</td>
            <td class="p-2 text-right font-mono">${item.nilaiSikap != null ? item.nilaiSikap : '-'}</td>
            <td class="p-2 text-right font-mono">${item.nilaiResponsi != null ? item.nilaiResponsi : '-'}</td>
          `;
          tbody.appendChild(tr);
        }
      }

      const previewCont = document.getElementById('modal-excel-preview-container');
      if (previewCont) previewCont.classList.remove('hidden');

      const statsEl = document.getElementById('modal-excel-preview-stats');
      if (statsEl) statsEl.textContent = `${_excelParsedBuffer.length} mahasiswa terbaca`;

      const applyBtn = document.getElementById('btn-apply-excel-nilai');
      if (applyBtn && _excelParsedBuffer.length > 0) {
        applyBtn.removeAttribute('disabled');
        applyBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
      showToast(`${_excelParsedBuffer.length} data mahasiswa berhasil dimuat dari file Excel!`, 'info');
    } catch (err) {
      console.error('Error parsing Excel:', err);
      alert('Gagal membaca file Excel. Pastikan format file sesuai.');
    }
  };
  reader.readAsArrayBuffer(file);
}

function applyImportedExcelNilai() {
  if (!_excelParsedBuffer || _excelParsedBuffer.length === 0) {
    alert('Tidak ada data nilai yang siap diterapkan.');
    return;
  }

  const acaraId = parseInt(document.getElementById('modal-excel-acara')?.value) || 1;
  const acara = AppState.acaraList.find(a => a.id === acaraId) || AppState.acaraList[0];
  const penilaiNama = (AppState.currentUser && AppState.currentUser.data && AppState.currentUser.data.nama) || 'Co.Ass';
  let updatedCount = 0;

  _excelParsedBuffer.forEach(item => {
    const nim = item.nim;
    const student = AppState.praktikanList.find(p => p.nim === nim);
    if (!student) return;

    updatedCount++;

    // 1. Laporan
    if (item.nilaiLaporan != null) {
      if (!AppState.grades.laporan[nim]) AppState.grades.laporan[nim] = {};
      const curScores = (AppState.grades.laporan[nim][acaraId] && AppState.grades.laporan[nim][acaraId].scores) || {};
      INDIKATOR_LAPORAN.forEach(ind => {
        curScores[ind.id] = item.nilaiLaporan;
      });
      AppState.grades.laporan[nim][acaraId] = {
        aktif: true,
        checklist: { lap_1: true, lap_2: true, lap_3: true },
        scores: curScores,
        total: item.nilaiLaporan,
        catatan: item.catatanLaporan || (AppState.grades.laporan[nim][acaraId] ? AppState.grades.laporan[nim][acaraId].catatan : ''),
        tanggal: new Date().toISOString().split('T')[0],
        penilai: penilaiNama
      };
    }

    // 2. Video
    if (item.nilaiVideo != null) {
      if (!AppState.grades.video[nim]) AppState.grades.video[nim] = {};
      const isNA = item.nilaiVideo === 'NA' || !acara.wajibVideo;
      const vScore = isNA ? 0 : parseFloat(item.nilaiVideo) || 0;
      const curScores = (AppState.grades.video[nim][acaraId] && AppState.grades.video[nim][acaraId].scores) || {};
      INDIKATOR_VIDEO.forEach(ind => {
        curScores[ind.id] = vScore;
      });
      AppState.grades.video[nim][acaraId] = {
        aktif: true,
        isNA: isNA,
        checklist: { vid_1: true, vid_2: true },
        scores: curScores,
        total: vScore,
        catatan: item.catatanVideo || (AppState.grades.video[nim][acaraId] ? AppState.grades.video[nim][acaraId].catatan : '')
      };
    }

    // 3. Performa
    if (item.nilaiPerforma != null) {
      const curScores = (AppState.grades.performa[nim] && AppState.grades.performa[nim].scores) || {};
      INDIKATOR_PERFORMA.forEach(ind => {
        curScores[ind.id] = item.nilaiPerforma;
      });
      AppState.grades.performa[nim] = {
        aktif: true,
        checklist: { perf_1: true, perf_7: true, perf_8: true },
        scores: curScores,
        total: item.nilaiPerforma,
        catatan: (AppState.grades.performa[nim] ? AppState.grades.performa[nim].catatan : '')
      };
    }

    // 4. Sikap
    if (item.nilaiSikap != null) {
      const curScores = (AppState.grades.sikap[nim] && AppState.grades.sikap[nim].scores) || {};
      INDIKATOR_SIKAP.forEach(ind => {
        curScores[ind.id] = item.nilaiSikap;
      });
      AppState.grades.sikap[nim] = {
        aktif: true,
        checklist: { sik_1: true, sik_3: true },
        scores: curScores,
        total: item.nilaiSikap,
        catatan: (AppState.grades.sikap[nim] ? AppState.grades.sikap[nim].catatan : '')
      };
    }

    // 5. Format Laporan
    if (item.nilaiFormat != null) {
      const curScores = (AppState.grades.formatLaporan[nim] && AppState.grades.formatLaporan[nim].scores) || {};
      INDIKATOR_FORMAT.forEach(ind => {
        curScores[ind.id] = item.nilaiFormat;
      });
      AppState.grades.formatLaporan[nim] = {
        aktif: true,
        checklist: { fmt_1: true, fmt_5: true, fmt_8: true },
        scores: curScores,
        total: item.nilaiFormat,
        catatan: (AppState.grades.formatLaporan[nim] ? AppState.grades.formatLaporan[nim].catatan : '')
      };
    }

    // 6. Responsi
    if (item.nilaiResponsi != null) {
      const curScores = (AppState.grades.responsi[nim] && AppState.grades.responsi[nim].scores) || {};
      INDIKATOR_RESPONSI.forEach(ind => {
        curScores[ind.id] = item.nilaiResponsi;
      });
      const respObj = {
        aktif: true,
        checklist: { resp_1: true, resp_5: true },
        scores: curScores,
        videoIndividu: { aktif: false, predikat: 'A', skor: 95 },
        videoKelompok: { aktif: false, predikat: 'A', skor: 95 },
        total: item.nilaiResponsi,
        catatan: (AppState.grades.responsi[nim] ? AppState.grades.responsi[nim].catatan : '')
      };
      AppState.grades.responsi[nim] = respObj;
      if (!AppState.globalResponsi) AppState.globalResponsi = {};
      AppState.globalResponsi[nim] = respObj;
    }

    // 7. Kedisiplinan
    if (item.nilaiKedisiplinan != null) {
      const curScores = (AppState.grades.k3Kedisiplinan[nim] && AppState.grades.k3Kedisiplinan[nim].scores) || {};
      INDIKATOR_K3.forEach(ind => {
        curScores[ind.id] = item.nilaiKedisiplinan;
      });
      AppState.grades.k3Kedisiplinan[nim] = {
        aktif: true,
        checklist: { k3_2: true, k3_4: true },
        scores: curScores,
        total: item.nilaiKedisiplinan,
        catatan: (AppState.grades.k3Kedisiplinan[nim] ? AppState.grades.k3Kedisiplinan[nim].catatan : '')
      };
    }

    // 8. Kehadiran
    if (!AppState.grades.kehadiran[nim]) AppState.grades.kehadiran[nim] = [];
    const normStatus = (item.statusHadir || 'Hadir').trim();
    const existKIdx = AppState.grades.kehadiran[nim].findIndex(k => k.acaraId === acaraId);
    const kObj = {
      acaraId: acaraId,
      status: normStatus,
      tanggal: new Date().toISOString().split('T')[0],
      keterangan: normStatus
    };
    if (existKIdx >= 0) {
      AppState.grades.kehadiran[nim][existKIdx] = kObj;
    } else {
      AppState.grades.kehadiran[nim].push(kObj);
    }

    // 9. Catatan Evaluasi (jika ada)
    if (item.catatanUmum) {
      if (!AppState.grades.catatanEvaluasi[nim]) {
        AppState.grades.catatanEvaluasi[nim] = { kelebihan: '-', kelemahan: '-', rekomendasi: '-', penilai: penilaiNama };
      }
      AppState.grades.catatanEvaluasi[nim].rekomendasi = item.catatanUmum;
      AppState.grades.catatanEvaluasi[nim].penilai = penilaiNama;
    }
  });

  saveCurrentPraktikumState();
  saveStateToStorage();
  closeModal();
  renderApp();
  showToast(`Nilai ${updatedCount} mahasiswa berhasil diimpor dari file Excel & disimpan!`, 'success');
  triggerAutoCloudSync();
}

/**
 * 13. LIVE SCORE UPDATER & HELPER UI (Fleksibel & Sub-Ceklis)
 */
function toggleIndikatorCheck(comp, id, isChecked) {
  const prefixMap = {
    'laporan': 'lap',
    'video': 'vid',
    'performa': 'perf',
    'sikap': 'sik',
    'format': 'fmt',
    'responsi': 'resp',
    'k3': 'k3'
  };
  const prefix = prefixMap[comp] || comp;
  const inputEl = document.getElementById(`input-${prefix}-${id}`);
  const rowEl = document.getElementById(`row-${prefix}-${id}`);
  if (inputEl) {
    inputEl.disabled = !isChecked;
  }
  if (rowEl) {
    if (isChecked) {
      rowEl.classList.remove('bg-slate-100/70', 'opacity-60');
    } else {
      rowEl.classList.add('bg-slate-100/70', 'opacity-60');
    }
  }

  // Trigger live updates
  if (comp === 'laporan') updateLiveLaporanTotal();
  else if (comp === 'video') updateLiveVideoTotal();
  else if (comp === 'performa') updateLivePerformaTotal();
  else if (comp === 'sikap') updateLiveSikapTotal();
  else if (comp === 'format') updateLiveFormatTotal();
  else if (comp === 'responsi') updateLiveResponsiTotal();
  else if (comp === 'k3') updateLiveK3Total();
}

function toggleComponentCheck(comp, isChecked) {
  const container = document.getElementById(`container-comp-${comp}`);
  if (container) {
    if (isChecked) {
      container.classList.remove('opacity-40', 'pointer-events-none');
    } else {
      container.classList.add('opacity-40', 'pointer-events-none');
    }
  }
  if (comp === 'video') {
    const vidContainer = document.getElementById('video-indicators-container');
    if (vidContainer) {
      if (isChecked) {
        vidContainer.classList.remove('opacity-40', 'pointer-events-none');
      } else {
        vidContainer.classList.add('opacity-40', 'pointer-events-none');
      }
    }
  }

  if (comp === 'laporan') updateLiveLaporanTotal();
  else if (comp === 'video') updateLiveVideoTotal();
  else if (comp === 'performa') updateLivePerformaTotal();
  else if (comp === 'sikap') updateLiveSikapTotal();
  else if (comp === 'format') updateLiveFormatTotal();
  else if (comp === 'responsi') updateLiveResponsiTotal();
  else if (comp === 'k3') updateLiveK3Total();
}

function handleGradingWeightChange() {
  const wLaporan = parseFloat(document.getElementById('weight-input-laporan')?.value) || 0;
  const wVideo = parseFloat(document.getElementById('weight-input-video')?.value) || 0;
  const wPerforma = parseFloat(document.getElementById('weight-input-performa')?.value) || 0;
  const wSikap = parseFloat(document.getElementById('weight-input-sikap')?.value) || 0;
  const wFormat = parseFloat(document.getElementById('weight-input-format')?.value) || 0;
  const wResponsi = parseFloat(document.getElementById('weight-input-responsi')?.value) || 0;
  const wK3 = parseFloat(document.getElementById('weight-input-k3')?.value) || 0;

  if (!AppState.config) AppState.config = {};
  AppState.config.weights = {
    laporan: wLaporan,
    video: wVideo,
    performa: wPerforma,
    sikap: wSikap,
    responsi: wResponsi,
    formatLaporan: wFormat,
    k3Kedisiplinan: wK3
  };

  const activeP = getActivePraktikum();
  if (activeP) {
    if (!activeP.weights) activeP.weights = {};
    activeP.weights = Object.assign({}, AppState.config.weights);
  }

  const total = Math.round(wLaporan + wVideo + wPerforma + wSikap + wFormat + wResponsi + wK3);
  const badge = document.getElementById('coass-grading-total-weight-badge');
  if (badge) {
    if (total === 100) {
      badge.className = "text-xs px-2.5 py-1 rounded-full font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300";
      badge.innerText = `Total Bobot: 100% (Standar)`;
    } else if (total > 100) {
      const bonus = total - 100;
      badge.className = "text-xs px-2.5 py-1 rounded-full font-mono font-bold bg-purple-100 text-purple-900 border border-purple-300 shadow-sm animate-pulse";
      badge.innerText = `Total: ${total}% (+${bonus}% Apresiasi Nilai)`;
    } else {
      badge.className = "text-xs px-2.5 py-1 rounded-full font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300";
      badge.innerText = `Total Bobot: ${total}%`;
    }
  }

  saveCurrentPraktikumState();
  saveStateToStorage();
  updateLiveFinalGradeBadge();
}

function resetGradingWeightsToDefault() {
  const def = DEFAULT_CONFIG.weights;
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };
  setVal('weight-input-laporan', def.laporan);
  setVal('weight-input-video', def.video);
  setVal('weight-input-performa', def.performa);
  setVal('weight-input-sikap', def.sikap);
  setVal('weight-input-format', def.formatLaporan);
  setVal('weight-input-responsi', def.responsi);
  setVal('weight-input-k3', def.k3Kedisiplinan);

  handleGradingWeightChange();
}

function updateLiveFinalGradeBadge() {
  const selectedNim = AppState.selectedPraktikanNIM || (AppState.praktikanList[0] ? AppState.praktikanList[0].nim : null);
  if (!selectedNim) return;

  const summary = getPraktikanCompleteSummary(selectedNim);
  if (!summary) return;

  const box = document.getElementById('live-final-grade-box');
  const scoreVal = document.getElementById('live-final-score-val');
  const gradeLabel = document.getElementById('live-final-grade-label');
  const statusLulus = document.getElementById('live-final-status-lulus');

  if (box) box.innerText = summary.grade;
  if (scoreVal) scoreVal.innerText = summary.nilaiAkhir.toFixed(2);
  if (gradeLabel) gradeLabel.innerText = `(${summary.gradeLabel})`;
  if (statusLulus) {
    statusLulus.innerText = summary.statusLulus;
    statusLulus.className = summary.statusLulus === 'LULUS' ? 'text-emerald-700' : 'text-rose-600';
  }
}

function updateLiveLaporanTotal() {
  const scores = {};
  const checklist = {};
  const isAktif = document.getElementById('check-comp-laporan') ? document.getElementById('check-comp-laporan').checked : true;
  INDIKATOR_LAPORAN.forEach(ind => {
    const chk = document.getElementById(`check-lap-${ind.id}`);
    checklist[ind.id] = chk ? chk.checked : true;
    const el = document.getElementById(`input-lap-${ind.id}`);
    scores[ind.id] = el ? parseFloat(el.value) || 0 : 0;
  });
  const total = calculateLaporanScore(scores, checklist, isAktif);
  const target = document.getElementById('live-laporan-total');
  if (target) target.innerText = isAktif ? total : 'Nonaktif';
  const btnSub = document.getElementById('btn-sub-laporan');
  if (btnSub) btnSub.querySelector('span').innerText = `1. Laporan (${isAktif ? total : 'Off'})`;

  const nim = AppState.selectedPraktikanNIM;
  const acaraId = AppState.selectedAcaraId || 1;
  if (nim && AppState.grades.laporan[nim] && AppState.grades.laporan[nim][acaraId]) {
    AppState.grades.laporan[nim][acaraId].scores = scores;
    AppState.grades.laporan[nim][acaraId].checklist = checklist;
    AppState.grades.laporan[nim][acaraId].aktif = isAktif;
    AppState.grades.laporan[nim][acaraId].total = total;
  }
  updateLiveFinalGradeBadge();
}

function updateLiveVideoTotal() {
  const isAktif = document.getElementById('check-comp-video') ? document.getElementById('check-comp-video').checked : true;
  const isNA = document.getElementById('check-video-na') ? document.getElementById('check-video-na').checked : false;
  if (!isAktif || isNA) {
    const target = document.getElementById('live-video-total');
    if (target) target.innerText = !isAktif ? "Nonaktif" : "N/A";
    const btnSub = document.getElementById('btn-sub-video');
    if (btnSub) btnSub.querySelector('span').innerText = `2. Video (${!isAktif ? 'Off' : 'N/A'})`;
    updateLiveFinalGradeBadge();
    return;
  }
  const scores = {};
  const checklist = {};
  INDIKATOR_VIDEO.forEach(ind => {
    const chk = document.getElementById(`check-vid-${ind.id}`);
    checklist[ind.id] = chk ? chk.checked : true;
    const el = document.getElementById(`input-vid-${ind.id}`);
    scores[ind.id] = el ? parseFloat(el.value) || 0 : 0;
  });
  const res = calculateVideoScore(scores, false, checklist, isAktif);
  const target = document.getElementById('live-video-total');
  if (target) target.innerText = res.score;
  const btnSub = document.getElementById('btn-sub-video');
  if (btnSub) btnSub.querySelector('span').innerText = `2. Video (${res.score})`;

  const nim = AppState.selectedPraktikanNIM;
  const acaraId = AppState.selectedAcaraId || 1;
  if (nim && AppState.grades.video[nim] && AppState.grades.video[nim][acaraId]) {
    AppState.grades.video[nim][acaraId].scores = scores;
    AppState.grades.video[nim][acaraId].checklist = checklist;
    AppState.grades.video[nim][acaraId].aktif = isAktif;
    AppState.grades.video[nim][acaraId].isNA = isNA;
    AppState.grades.video[nim][acaraId].total = res.score;
  }
  updateLiveFinalGradeBadge();
}

function updateLivePerformaTotal() {
  const isAktif = document.getElementById('check-comp-performa') ? document.getElementById('check-comp-performa').checked : true;
  const scores = {};
  const checklist = {};
  INDIKATOR_PERFORMA.forEach(ind => {
    const chk = document.getElementById(`check-perf-${ind.id}`);
    checklist[ind.id] = chk ? chk.checked : true;
    const el = document.getElementById(`input-perf-${ind.id}`);
    scores[ind.id] = el ? parseFloat(el.value) || 0 : 0;
  });
  const total = calculatePerformaScore(scores, checklist, isAktif);
  const target = document.getElementById('live-performa-total');
  if (target) target.innerText = isAktif ? total : 'Nonaktif';
  const btnSub = document.getElementById('btn-sub-performa');
  if (btnSub) btnSub.querySelector('span').innerText = `3. Performa (${isAktif ? total : 'Off'})`;

  const nim = AppState.selectedPraktikanNIM;
  if (nim && AppState.grades.performa[nim]) {
    AppState.grades.performa[nim].scores = scores;
    AppState.grades.performa[nim].checklist = checklist;
    AppState.grades.performa[nim].aktif = isAktif;
    AppState.grades.performa[nim].total = total;
  }
  updateLiveFinalGradeBadge();
}

function updateLiveSikapTotal() {
  const isAktif = document.getElementById('check-comp-sikap') ? document.getElementById('check-comp-sikap').checked : true;
  const scores = {};
  const checklist = {};
  INDIKATOR_SIKAP.forEach(ind => {
    const chk = document.getElementById(`check-sik-${ind.id}`);
    checklist[ind.id] = chk ? chk.checked : true;
    const el = document.getElementById(`input-sik-${ind.id}`);
    scores[ind.id] = el ? parseFloat(el.value) || 0 : 0;
  });
  const total = calculateSikapScore(scores, checklist, isAktif);
  const target = document.getElementById('live-sikap-total');
  if (target) target.innerText = isAktif ? total : 'Nonaktif';
  const btnSub = document.getElementById('btn-sub-sikap');
  if (btnSub) btnSub.querySelector('span').innerText = `4. Sikap (${isAktif ? total : 'Off'})`;

  const nim = AppState.selectedPraktikanNIM;
  if (nim && AppState.grades.sikap[nim]) {
    AppState.grades.sikap[nim].scores = scores;
    AppState.grades.sikap[nim].checklist = checklist;
    AppState.grades.sikap[nim].aktif = isAktif;
    AppState.grades.sikap[nim].total = total;
  }
  updateLiveFinalGradeBadge();
}

function updateLiveFormatTotal() {
  const isAktif = document.getElementById('check-comp-format') ? document.getElementById('check-comp-format').checked : true;
  const scores = {};
  const checklist = {};
  INDIKATOR_FORMAT.forEach(ind => {
    const chk = document.getElementById(`check-fmt-${ind.id}`);
    checklist[ind.id] = chk ? chk.checked : true;
    const el = document.getElementById(`input-fmt-${ind.id}`);
    scores[ind.id] = el ? parseFloat(el.value) || 0 : 0;
  });
  const total = calculateFormatScore(scores, checklist, isAktif);
  const target = document.getElementById('live-format-total');
  if (target) target.innerText = isAktif ? total : 'Nonaktif';
  const btnSub = document.getElementById('btn-sub-format');
  if (btnSub) btnSub.querySelector('span').innerText = `5. Format (${isAktif ? total : 'Off'})`;

  const nim = AppState.selectedPraktikanNIM;
  if (nim && AppState.grades.formatLaporan[nim]) {
    AppState.grades.formatLaporan[nim].scores = scores;
    AppState.grades.formatLaporan[nim].checklist = checklist;
    AppState.grades.formatLaporan[nim].aktif = isAktif;
    AppState.grades.formatLaporan[nim].total = total;
  }
  updateLiveFinalGradeBadge();
}

function getResponsiFormData() {
  const isAktif = document.getElementById('check-comp-responsi') ? document.getElementById('check-comp-responsi').checked : true;
  const respScores = {};
  const checklist = {};
  INDIKATOR_RESPONSI.forEach(ind => {
    const chk = document.getElementById(`check-resp-${ind.id}`);
    checklist[ind.id] = chk ? chk.checked : true;
    const el = document.getElementById(`input-resp-${ind.id}`);
    respScores[ind.id] = el ? parseFloat(el.value) || 0 : 0;
  });

  const checkInd = document.getElementById('check-resp-vid-ind');
  const isIndAktif = checkInd ? checkInd.checked : false;
  const indPredEl = document.getElementById('val-resp-vid-ind-pred');
  const indPred = indPredEl ? indPredEl.value : 'A';
  const indSkorEl = document.getElementById('val-resp-vid-ind-skor');
  const indSkor = indSkorEl ? parseFloat(indSkorEl.value) || 95 : 95;

  const checkKel = document.getElementById('check-resp-vid-kel');
  const isKelAktif = checkKel ? checkKel.checked : false;
  const kelPredEl = document.getElementById('val-resp-vid-kel-pred');
  const kelPred = kelPredEl ? kelPredEl.value : 'A';
  const kelSkorEl = document.getElementById('val-resp-vid-kel-skor');
  const kelSkor = kelSkorEl ? parseFloat(kelSkorEl.value) || 95 : 95;

  const respCatatan = document.getElementById('catatan-responsi') ? document.getElementById('catatan-responsi').value : '';

  const respObj = {
    aktif: isAktif,
    checklist: checklist,
    scores: respScores,
    videoIndividu: {
      aktif: isIndAktif,
      predikat: indPred,
      skor: indSkor
    },
    videoKelompok: {
      aktif: isKelAktif,
      predikat: kelPred,
      skor: kelSkor
    },
    catatan: respCatatan
  };

  const total = calculateResponsiScore(respObj, checklist, isAktif);
  const predInfo = getPredikatResponsi(total);
  respObj.total = total;
  respObj.predikatAkhir = isAktif ? predInfo.predikat : '-';

  return respObj;
}

function toggleRespVideoSection(type, isChecked) {
  const sec = document.getElementById(`section-resp-vid-${type}`);
  if (sec) {
    if (isChecked) {
      sec.classList.remove('hidden');
    } else {
      sec.classList.add('hidden');
    }
  }
  updateLiveResponsiTotal();
}

function selectRespPredikat(type, predikat) {
  const scoreMap = { 'A': 95, 'B': 85, 'C': 75, 'D': 65, 'E': 50 };
  const hiddenInput = document.getElementById(`val-resp-vid-${type}-pred`);
  if (hiddenInput) hiddenInput.value = predikat;

  const scoreInput = document.getElementById(`val-resp-vid-${type}-skor`);
  if (scoreInput) scoreInput.value = scoreMap[predikat] || 95;

  const labelEl = document.getElementById(`label-predikat-${type}`);
  if (labelEl) {
    labelEl.innerText = `${predikat} (${scoreMap[predikat] || 95})`;
  }

  ['A', 'B', 'C', 'D', 'E'].forEach(p => {
    const btn = document.getElementById(`btn-pred-${type}-${p}`);
    if (btn) {
      if (p === predikat) {
        btn.className = 'py-1 px-2 rounded-lg border text-xs font-bold transition bg-emerald-600 text-white border-emerald-600 shadow-sm';
      } else {
        btn.className = 'py-1 px-2 rounded-lg border text-xs font-bold transition bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200';
      }
    }
  });

  updateLiveResponsiTotal();
}

function updateLiveResponsiTotal() {
  const data = getResponsiFormData();
  const target = document.getElementById('live-responsi-total');
  if (target) target.innerText = data.aktif ? data.total : 'Nonaktif';

  const badge = document.getElementById('live-responsi-predikat-badge');
  if (badge) {
    badge.innerText = data.aktif ? data.predikatAkhir : 'Off';
  }

  const btnSub = document.getElementById('btn-sub-responsi');
  if (btnSub) {
    const pill = btnSub.querySelector('.font-mono');
    if (pill) pill.innerText = data.aktif ? `${data.total} (${data.predikatAkhir})` : 'Nonaktif';
  }

  const nim = AppState.selectedPraktikanNIM;
  if (nim) {
    AppState.grades.responsi[nim] = data;
    if (!AppState.globalResponsi) AppState.globalResponsi = {};
    AppState.globalResponsi[nim] = data;
  }
  updateLiveFinalGradeBadge();
}

function saveOnlyResponsi(nim) {
  const targetNim = nim || AppState.selectedPraktikanNIM;
  if (!targetNim) return;

  const respData = getResponsiFormData();
  AppState.grades.responsi[targetNim] = respData;
  if (!AppState.globalResponsi) AppState.globalResponsi = {};
  AppState.globalResponsi[targetNim] = respData;

  saveCurrentPraktikumState();
  saveStateToStorage();
  updateLiveResponsiTotal();
  showToast(`Nilai Responsi NIM ${targetNim} (Skor: ${respData.total}, Predikat: ${respData.predikatAkhir}) berhasil disimpan tersendiri!`, 'success');
  syncWithGoogleSheets(false);
}

function updateLiveK3Total() {
  const isAktif = document.getElementById('check-comp-k3') ? document.getElementById('check-comp-k3').checked : true;
  const scores = {};
  const checklist = {};
  INDIKATOR_K3.forEach(ind => {
    const chk = document.getElementById(`check-k3-${ind.id}`);
    checklist[ind.id] = chk ? chk.checked : true;
    const el = document.getElementById(`input-k3-${ind.id}`);
    scores[ind.id] = el ? parseFloat(el.value) || 0 : 0;
  });
  const total = calculateK3Score(scores, checklist, isAktif);
  const target = document.getElementById('live-k3-total');
  if (target) target.innerText = isAktif ? total : 'Nonaktif';

  const btnSub = document.getElementById('btn-sub-k3');
  if (btnSub) {
    const span = btnSub.querySelector('span');
    if (span) span.innerText = `6. Kedisiplinan (${isAktif ? total : 'Off'})`;
  }

  const nim = AppState.selectedPraktikanNIM;
  if (nim && AppState.grades.k3Kedisiplinan[nim]) {
    AppState.grades.k3Kedisiplinan[nim].scores = scores;
    AppState.grades.k3Kedisiplinan[nim].checklist = checklist;
    AppState.grades.k3Kedisiplinan[nim].aktif = isAktif;
    AppState.grades.k3Kedisiplinan[nim].total = total;
  }
  updateLiveFinalGradeBadge();
}

function toggleVideoNA(isNA) {
  const container = document.getElementById('video-indicators-container');
  const target = document.getElementById('live-video-total');
  if (isNA) {
    if (container) container.classList.add('opacity-40', 'pointer-events-none');
    if (target) target.innerText = 'N/A';
  } else {
    if (container) container.classList.remove('opacity-40', 'pointer-events-none');
    updateLiveVideoTotal();
  }
}

function calculateTotalWeightSettings() {
  const wLaporan = parseFloat(document.getElementById('weight-laporan').value) || 0;
  const wVideo = parseFloat(document.getElementById('weight-video').value) || 0;
  const wPerforma = parseFloat(document.getElementById('weight-performa').value) || 0;
  const wSikap = parseFloat(document.getElementById('weight-sikap').value) || 0;
  const wResponsi = parseFloat(document.getElementById('weight-responsi').value) || 0;
  const wFormat = parseFloat(document.getElementById('weight-format').value) || 0;
  const wK3 = parseFloat(document.getElementById('weight-k3').value) || 0;

  const total = wLaporan + wVideo + wPerforma + wSikap + wResponsi + wFormat + wK3;
  const badge = document.getElementById('setting-total-weight-badge');
  if (badge) {
    badge.innerText = `Total: ${total}%`;
    badge.className = Math.round(total) === 100 
      ? "text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold"
      : "text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-mono font-bold animate-pulse";
  }
}

function switchGradingSubTab(tabId) {
  const subtabs = ['tab-laporan', 'tab-video', 'tab-performa', 'tab-sikap', 'tab-format', 'tab-responsi', 'tab-k3', 'tab-kehadiran'];
  subtabs.forEach(t => {
    const content = document.getElementById(`subtab-content-${t}`);
    const btn = document.getElementById(`btn-sub-${t.replace('tab-', '')}`);
    if (content) content.classList.add('hidden');
    if (btn) {
      btn.classList.remove('border-b-2', 'border-[#56b29d]', 'text-[#36786a]', 'bg-white', 'font-bold');
      btn.classList.add('text-slate-600');
    }
  });

  const activeContent = document.getElementById(`subtab-content-${tabId}`);
  const activeBtn = document.getElementById(`btn-sub-${tabId.replace('tab-', '')}`);
  if (activeContent) activeContent.classList.remove('hidden');
  if (activeBtn) {
    activeBtn.classList.add('border-b-2', 'border-[#56b29d]', 'text-[#36786a]', 'bg-white', 'font-bold');
    activeBtn.classList.remove('text-slate-600');
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function changeSelectedPraktikan(nim) {
  AppState.selectedPraktikanNIM = nim;
  renderApp();
}

function changeSelectedAcara(acaraId) {
  AppState.selectedAcaraId = parseInt(acaraId);
  renderApp();
}

function viewPraktikanDetail(nim) {
  AppState.selectedPraktikanNIM = nim;
  AppState.activeTab = 'profil-praktikan';
  renderApp();
}

function switchTab(tabId) {
  AppState.activeTab = tabId;
  renderApp();
}

function filterRekapTable() {
  const query = (document.getElementById('rekap-search-input')?.value || '').toLowerCase().trim();
  const kelompok = (document.getElementById('rekap-filter-kelompok')?.value || '').trim();
  const rows = document.querySelectorAll('#rekap-table-body tr');

  rows.forEach(row => {
    const nim = row.getAttribute('data-nim') || '';
    const nama = row.getAttribute('data-nama') || '';
    const kel = row.getAttribute('data-kelompok') || '';

    const matchQuery = !query || nim.includes(query) || nama.includes(query);
    const matchKel = !kelompok || kel === kelompok;

    if (matchQuery && matchKel) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

/**
 * 14. EXPORT TO MICROSOFT EXCEL (.XLSX) MULTI-SHEET LENGKAP & KHP PRAKTIKAN
 */
function exportSingleStudentExcel(nim) {
  if (typeof XLSX === 'undefined') {
    alert('Modul Excel (SheetJS) sedang dimuat. Silakan coba sesaat lagi.');
    return;
  }
  const targetNim = nim || (AppState.currentUser && AppState.currentUser.data && AppState.currentUser.data.nim) || AppState.selectedPraktikanNIM;
  const s = getPraktikanCompleteSummary(targetNim);
  if (!s) {
    alert('Data praktikan tidak ditemukan.');
    return;
  }
  const curPrak = getActivePraktikum();
  const wb = XLSX.utils.book_new();

  // Sheet 1: Kartu Hasil Praktikum (KHP) Pribadi Mahasiswa
  const respData = (AppState.grades.responsi && AppState.grades.responsi[targetNim]) || (AppState.globalResponsi && AppState.globalResponsi[targetNim]) || {};
  const khpData = [
    { "KETERANGAN": "INSTITUT PERTANIAN STIPER (INSTIPER) YOGYAKARTA", "DETAIL": "" },
    { "KETERANGAN": "KARTU HASIL PRAKTIKUM (KHP) RESMI", "DETAIL": "" },
    { "KETERANGAN": "----------------------------------------------------", "DETAIL": "----------------------------------------------------" },
    { "KETERANGAN": "Nama Praktikan", "DETAIL": s.nama },
    { "KETERANGAN": "NIM", "DETAIL": s.nim },
    { "KETERANGAN": "Kelompok", "DETAIL": s.kelompok },
    { "KETERANGAN": "Praktikum", "DETAIL": curPrak.nama },
    { "KETERANGAN": "Tahun Akademik / Semester", "DETAIL": `${curPrak.tahunAkademik || '2026/2027'} - ${curPrak.semester || 'Gasal'}` },
    { "KETERANGAN": "Co.Ass Penilai / Pembimbing", "DETAIL": s.coassNama },
    { "KETERANGAN": "----------------------------------------------------", "DETAIL": "----------------------------------------------------" },
    { "KETERANGAN": "I. REKAPITULASI KOMPOSISI PENILAIAN", "DETAIL": "" },
    { "KETERANGAN": `1. Rata-rata Laporan Praktikum (${s.effectiveWeights.laporan}%)`, "DETAIL": s.avgLaporan },
    { "KETERANGAN": `2. Rata-rata Video Praktikum (${s.effectiveWeights.video}%)`, "DETAIL": s.isVideoComponentNA ? "N/A" : s.avgVideo },
    { "KETERANGAN": `3. Performa & Keterampilan Praktikum (${s.effectiveWeights.performa}%)`, "DETAIL": s.scorePerforma },
    { "KETERANGAN": `4. Kemauan & Sikap Belajar (${s.effectiveWeights.sikap}%)`, "DETAIL": s.scoreSikap },
    { "KETERANGAN": `5. Format Laporan Teknis (${s.effectiveWeights.formatLaporan}%)`, "DETAIL": s.scoreFormat },
    { "KETERANGAN": `6. Responsi Pemahaman Materi (${s.effectiveWeights.responsi}%)`, "DETAIL": s.scoreResponsi },
    { "KETERANGAN": `   - Predikat Responsi Akhir`, "DETAIL": respData.predikatAkhir ? `Predikat ${respData.predikatAkhir}` : getPredikatResponsi(s.scoreResponsi).predikat },
    { "KETERANGAN": `   - Video Individu (Responsi)`, "DETAIL": (respData.videoIndividu && respData.videoIndividu.aktif) ? `Predikat ${respData.videoIndividu.predikat} (${respData.videoIndividu.skor || 95})` : 'N/A' },
    { "KETERANGAN": `   - Video Kelompok (Responsi)`, "DETAIL": (respData.videoKelompok && respData.videoKelompok.aktif) ? `Predikat ${respData.videoKelompok.predikat} (${respData.videoKelompok.skor || 95})` : 'N/A' },
    { "KETERANGAN": `7. Penilaian Kedisiplinan (${s.effectiveWeights.k3Kedisiplinan}%)`, "DETAIL": s.scoreK3 },
    { "KETERANGAN": "----------------------------------------------------", "DETAIL": "----------------------------------------------------" },
    { "KETERANGAN": "II. HASIL AKHIR & KELULUSAN", "DETAIL": "" },
    { "KETERANGAN": "NILAI AKHIR PRAKTIKUM (0 - 100)", "DETAIL": s.nilaiAkhir },
    { "KETERANGAN": "PREDIKAT (GRADE)", "DETAIL": s.grade },
    { "KETERANGAN": "KETERANGAN PREDIKAT", "DETAIL": s.gradeLabel },
    { "KETERANGAN": "STATUS KELULUSAN", "DETAIL": s.statusLulus },
    { "KETERANGAN": "PRESENSI KEHADIRAN", "DETAIL": s.persenKehadiran + "%" }
  ];

  const wsKhp = XLSX.utils.json_to_sheet(khpData);
  XLSX.utils.book_append_sheet(wb, wsKhp, "KHP Resmi");

  // Sheet 2: Rincian Acara Praktikan
  const acaraRows = AppState.acaraList.map((ac, idx) => {
    const lapEntry = (AppState.grades.laporan[targetNim] && AppState.grades.laporan[targetNim][ac.id]) || null;
    const lapScore = lapEntry ? calculateLaporanScore(lapEntry.scores) : 0;
    const vidEntry = (AppState.grades.video[targetNim] && AppState.grades.video[targetNim][ac.id]) || null;
    const isNA = !ac.wajibVideo || (vidEntry && vidEntry.isNA);
    const vidScore = vidEntry ? calculateVideoScore(vidEntry.scores, isNA) : { score: 0, isNA };

    return {
      "No": idx + 1,
      "Acara": ac.nama,
      "Nilai Laporan": lapScore,
      "Catatan Laporan": lapEntry ? lapEntry.catatan || "-" : "-",
      "Nilai Video": isNA ? "N/A" : vidScore.score,
      "Catatan Video": vidEntry ? vidEntry.catatan || "-" : "-"
    };
  });
  const wsAcara = XLSX.utils.json_to_sheet(acaraRows);
  XLSX.utils.book_append_sheet(wb, wsAcara, "Rincian Nilai Acara");

  const safeName = s.nama.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `KHP_${s.nim}_${safeName}.xlsx`;
  XLSX.writeFile(wb, filename);
  showToast(`KHP Excel praktikan NIM ${s.nim} berhasil diunduh!`, 'success');
}

function exportToExcel() {
  if (typeof XLSX === 'undefined') {
    alert('Modul Excel (SheetJS) sedang dimuat. Silakan coba sesaat lagi.');
    return;
  }

  // Jika yang login adalah Praktikan, ekspor hanya KHP milik dia sendiri
  if (AppState.currentUser && AppState.currentUser.role === 'praktikan') {
    exportSingleStudentExcel(AppState.currentUser.data.nim);
    return;
  }

  const wb = XLSX.utils.book_new();

  // Sheet 1: Rekapitulasi Nilai Akhir
  const summaries = AppState.praktikanList.map((p, idx) => {
    const s = getPraktikanCompleteSummary(p.nim);
    return {
      "No": idx + 1,
      "NIM": s.nim,
      "Nama Praktikan": s.nama,
      "Kelompok": s.kelompok,
      "Co.Ass Penilai": s.coassNama,
      [`Laporan (${s.effectiveWeights.laporan}%)`]: s.avgLaporan,
      [`Video (${s.effectiveWeights.video}%)`]: s.isVideoComponentNA ? "N/A" : s.avgVideo,
      [`Performa (${s.effectiveWeights.performa}%)`]: s.scorePerforma,
      [`Sikap Belajar (${s.effectiveWeights.sikap}%)`]: s.scoreSikap,
      [`Responsi (${s.effectiveWeights.responsi}%)`]: s.scoreResponsi,
      [`Format Laporan (${s.effectiveWeights.formatLaporan}%)`]: s.scoreFormat,
      [`Penilaian Kedisiplinan (${s.effectiveWeights.k3Kedisiplinan}%)`]: s.scoreK3,
      "NILAI AKHIR": s.nilaiAkhir,
      "GRADE": s.grade,
      "PREDIKAT": s.gradeLabel,
      "STATUS KELULUSAN": s.statusLulus,
      "PRESENSI (%)": s.persenKehadiran + "%"
    };
  });
  const wsRekap = XLSX.utils.json_to_sheet(summaries);
  XLSX.utils.book_append_sheet(wb, wsRekap, "Rekap Nilai Akhir");

  // Sheet 2: Nilai Laporan Per Acara
  const laporanRows = [];
  AppState.praktikanList.forEach((p, idx) => {
    const row = { "No": idx + 1, "NIM": p.nim, "Nama": p.nama, "Kelompok": p.kelompok };
    let sum = 0, count = 0;
    AppState.acaraList.forEach(ac => {
      const entry = (AppState.grades.laporan[p.nim] && AppState.grades.laporan[p.nim][ac.id]) || null;
      const score = entry ? calculateLaporanScore(entry.scores) : 0;
      row[ac.nama] = score;
      if (entry) { sum += score; count++; }
    });
    row["Rata-rata Laporan"] = count > 0 ? parseFloat((sum / count).toFixed(2)) : 0;
    laporanRows.push(row);
  });
  const wsLaporan = XLSX.utils.json_to_sheet(laporanRows);
  XLSX.utils.book_append_sheet(wb, wsLaporan, "Nilai Laporan Per Acara");

  // Sheet 3: Nilai Video Per Acara
  const videoRows = [];
  AppState.praktikanList.forEach((p, idx) => {
    const row = { "No": idx + 1, "NIM": p.nim, "Nama": p.nama, "Kelompok": p.kelompok };
    let sum = 0, count = 0;
    AppState.acaraList.forEach(ac => {
      const entry = (AppState.grades.video[p.nim] && AppState.grades.video[p.nim][ac.id]) || null;
      const isNA = !ac.wajibVideo || (entry && entry.isNA);
      const score = entry ? calculateVideoScore(entry.scores, isNA) : { score: 0, isNA };
      row[ac.nama] = isNA ? "N/A" : score.score;
      if (!isNA && entry) { sum += score.score; count++; }
    });
    row["Rata-rata Video"] = count > 0 ? parseFloat((sum / count).toFixed(2)) : "N/A";
    videoRows.push(row);
  });
  const wsVideo = XLSX.utils.json_to_sheet(videoRows);
  XLSX.utils.book_append_sheet(wb, wsVideo, "Nilai Video Per Acara");

  // Sheet 4: Performa, Sikap & Kedisiplinan
  const detailRows = AppState.praktikanList.map((p, idx) => {
    const s = getPraktikanCompleteSummary(p.nim);
    const respData = (AppState.grades.responsi && AppState.grades.responsi[p.nim]) || (AppState.globalResponsi && AppState.globalResponsi[p.nim]) || {};
    return {
      "No": idx + 1,
      "NIM": p.nim,
      "Nama": p.nama,
      "Performa (Keterampilan)": s.scorePerforma,
      "Sikap Belajar": s.scoreSikap,
      "Format Laporan": s.scoreFormat,
      "Skor Responsi": s.scoreResponsi,
      "Predikat Responsi": respData.predikatAkhir || getPredikatResponsi(s.scoreResponsi).predikat,
      "Video Individu (Responsi)": (respData.videoIndividu && respData.videoIndividu.aktif) ? `Predikat ${respData.videoIndividu.predikat}` : "N/A",
      "Video Kelompok (Responsi)": (respData.videoKelompok && respData.videoKelompok.aktif) ? `Predikat ${respData.videoKelompok.predikat}` : "N/A",
      "Penilaian Kedisiplinan": s.scoreK3
    };
  });
  const wsDetail = XLSX.utils.json_to_sheet(detailRows);
  XLSX.utils.book_append_sheet(wb, wsDetail, "Performa dan Sikap");

  // Simpan File Excel
  const filename = `REKAP_NILAI_PRAKTIKUM_INSTIPER_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, filename);
  showToast('File Excel rekapitulasi nilai berhasil diunduh!', 'success');
}

/**
 * 15. SINKRONISASI GOOGLE DRIVE (GOOGLE APPS SCRIPT)
 */
async function testGoogleDriveConnection() {
  const inputEl = document.getElementById('setting-apps-script-url');
  const url = inputEl?.value.trim() || AppState.config.googleAppsScriptUrl;
  if (!url) {
    alert('Masukkan URL Google Apps Script terlebih dahulu!');
    return;
  }
  showToast('Menguji koneksi ke Google Drive...', 'info');

  try {
    const testUrl = url.includes('?') ? `${url}&action=ping` : `${url}?action=ping`;
    const res = await fetch(testUrl, { method: 'GET', mode: 'cors' });
    const json = await res.json();
    if (json.status === 'success') {
      AppState.config.googleAppsScriptUrl = url;
      AppState.syncStatus.online = true;
      AppState.syncStatus.message = `Terhubung ke Google Drive: juzantiara@gmail.com`;
      saveStateToStorage();
      showToast('Koneksi Google Drive Berhasil Terhubung!', 'success');
      alert('Koneksi Berhasil! Database Google Drive (juzantiara@gmail.com) telah terhubung aktif.\n\nSekarang klik tombol "Sinkronisasi Sekarang (Kirim ke Drive)" untuk mengirim data ke Google Sheets Anda.');
      renderApp();
    } else {
      throw new Error(json.message || 'Respon tidak valid');
    }
  } catch (err) {
    AppState.syncStatus.online = false;
    AppState.syncStatus.message = 'Gagal terhubung ke Google Drive';
    alert('Gagal menghubungkan ke Google Apps Script: ' + err.message + '\n\nCatatan Penting:\n1. Pastikan Anda sudah klik "Terapkan" (Deploy) > "Aplikasi Web" di Apps Script.\n2. Pastikan opsi "Yang memiliki akses" diatur ke "Siapa saja (Anyone)".\n3. Pastikan sudah menjalankan fungsi setupDatabase di editor Apps Script.');
  }
}

async function checkGoogleDriveStatus(url, showNotice) {
  try {
    const testUrl = url.includes('?') ? `${url}&action=ping` : `${url}?action=ping`;
    const res = await fetch(testUrl, { method: 'GET', mode: 'cors' });
    const json = await res.json();
    if (json.status === 'success') {
      AppState.syncStatus.online = true;
      if (showNotice) showToast('Terhubung ke Google Drive: juzantiara@gmail.com', 'success');
    }
  } catch (e) {
    AppState.syncStatus.online = false;
  }
}

async function syncWithGoogleSheets(isManual = false) {
  let url = AppState.config.googleAppsScriptUrl;
  const inputEl = document.getElementById('setting-apps-script-url');
  if (inputEl && inputEl.value.trim()) {
    url = inputEl.value.trim();
    AppState.config.googleAppsScriptUrl = url;
    saveStateToStorage();
  }

  if (!url) {
    if (isManual) {
      alert('URL Web App Google Apps Script belum terisi!\n\nSilakan buka menu "Pengaturan & Drive", tempelkan URL Web App Google Apps Script Anda di kolom yang tersedia, lalu klik "Tes Koneksi" terlebih dahulu.');
    }
    return;
  }

  if (isManual) {
    showToast('Sedang mengirim seluruh data praktikum ke Google Drive...', 'info');
  }

  try {
    const rekapList = AppState.praktikanList.map(p => {
      const s = getPraktikanCompleteSummary(p.nim);
      return {
        nim: s.nim,
        nama: s.nama,
        kelompok: s.kelompok,
        coassNama: s.coassNama,
        avgLaporan: s.avgLaporan,
        avgVideo: s.isVideoComponentNA ? 0 : s.avgVideo,
        scorePerforma: s.scorePerforma,
        scoreSikap: s.scoreSikap,
        scoreResponsi: s.scoreResponsi,
        scoreFormat: s.scoreFormat,
        scoreK3: s.scoreK3,
        nilaiAkhir: s.nilaiAkhir,
        grade: s.grade,
        statusLulus: s.statusLulus,
        persenKehadiran: s.persenKehadiran
      };
    });

    const payload = {
      action: "syncAll",
      data: {
        coass: AppState.coassList,
        praktikan: AppState.praktikanList,
        acara: AppState.acaraList,
        rekap: rekapList,
        grades: AppState.grades,
        praktikumList: AppState.praktikumList,
        globalResponsi: AppState.globalResponsi || {},
        koordinatorList: AppState.koordinatorList || DEFAULT_KOORDINATOR,
        config: {
          courseTitle: (AppState.config && AppState.config.courseTitle) || DEFAULT_CONFIG.courseTitle,
          institution: (AppState.config && AppState.config.institution) || DEFAULT_CONFIG.institution,
          academicYear: (AppState.config && AppState.config.academicYear) || DEFAULT_CONFIG.academicYear,
          semester: (AppState.config && AppState.config.semester) || DEFAULT_CONFIG.semester,
          developerEmail: (AppState.config && AppState.config.developerEmail) || DEFAULT_CONFIG.developerEmail,
          selectedSignerKoordinatorId: (AppState.config && AppState.config.selectedSignerKoordinatorId) || DEFAULT_CONFIG.selectedSignerKoordinatorId,
          weights: (AppState.config && AppState.config.weights) || DEFAULT_CONFIG.weights,
          evaluationConfig: (AppState.config && AppState.config.evaluationConfig) || DEFAULT_EVALUATION_CONFIG
        }
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (json.status === 'success') {
      AppState.syncStatus.online = true;
      AppState.syncStatus.lastSync = new Date().toLocaleTimeString();
      const now = Date.now();
      if (isManual) {
        showToast('Sinkronisasi Berhasil! Seluruh data tersimpan di Google Drive.', 'success');
        _lastSyncToastTime = now;
        alert('BERHASIL! 🎉\n\nSeluruh data praktikum (Co.Ass, praktikan, acara, dan rekapitulasi nilai) telah berhasil dikirim dan tersimpan di Google Drive (juzantiara@gmail.com).\n\nSilakan cek file Google Spreadsheet di Google Drive Anda untuk melihat pembaharuan data.');
        renderApp();
      } else {
        // Background auto-sync: Notifikasi dibatasi maksimal 10 menit sekali agar tidak mengganggu aktivitas pengguna
        if (now - _lastSyncToastTime >= 10 * 60 * 1000) {
          showToast('Sinkronisasi Google Drive aktif (Data berkala aman tersimpan).', 'info');
          _lastSyncToastTime = now;
        }
        // Jangan pernah merefresh layar jika pengguna sedang mengetik, menilai, login, atau menggeser tabel
        if (!isUserInteracting()) {
          renderApp();
        }
      }
    } else {
      throw new Error(json.message || 'Respon server tidak valid');
    }
  } catch (e) {
    console.warn("Sinkronisasi otomatis ke Google Drive:", e);
    if (isManual) {
      alert('Gagal menyinkronkan data ke Google Drive: ' + e.message + '\n\nSilakan periksa apakah deployment Apps Script berstatus "Siapa saja (Anyone)" dan koneksi internet Anda aktif.');
    }
  }
}

async function pullFromGoogleSheets(isManual = true) {
  const url = AppState.config.googleAppsScriptUrl;
  if (!url) {
    if (isManual) alert('Masukkan URL Google Apps Script terlebih dahulu di menu Pengaturan!');
    return;
  }

  if (isManual) showToast('Mengambil data terbaru dari Google Drive...', 'info');

  try {
    const fetchUrl = url.includes('?') ? `${url}&action=getAllData` : `${url}?action=getAllData`;
    const res = await fetch(fetchUrl);
    const json = await res.json();
    if (json.status === 'success' && json.data) {
      if (json.data.coass && json.data.coass.length > 0) {
        AppState.coassList = json.data.coass.map(normalizeCoAssItem);
      }
      if (json.data.praktikan && json.data.praktikan.length > 0) {
        AppState.praktikanList = json.data.praktikan.map(normalizePraktikanItem);
      }
      if (json.data.acara && json.data.acara.length > 0) {
        AppState.acaraList = json.data.acara.map(a => ({
          id: parseInt(a.id || a.ID || 1),
          code: a.code || a.Kode_Acara || `ACARA-${a.id}`,
          nama: a.nama || a.Nama_Acara || `Acara ${a.id}`,
          wajibVideo: (a.wajibVideo === true || a.Wajib_Video === true || String(a.Wajib_Video).toLowerCase() === 'true'),
          deskripsi: a.deskripsi || a.Deskripsi || ''
        }));
      }
      if (json.data.grades && typeof json.data.grades === 'object' && Object.keys(json.data.grades).length > 0) {
        AppState.grades = Object.assign({}, AppState.grades, json.data.grades);
      }
      if (json.data.praktikumList && json.data.praktikumList.length > 0) {
        AppState.praktikumList = json.data.praktikumList;
      }
      if (json.data.globalResponsi) {
        AppState.globalResponsi = Object.assign({}, AppState.globalResponsi || {}, json.data.globalResponsi);
      }
      if (AppState.globalResponsi && AppState.grades) {
        if (!AppState.grades.responsi) AppState.grades.responsi = {};
        Object.keys(AppState.globalResponsi).forEach(nim => {
          AppState.grades.responsi[nim] = AppState.globalResponsi[nim];
        });
      }
      if (json.data.koordinatorList && json.data.koordinatorList.length > 0) {
        AppState.koordinatorList = json.data.koordinatorList;
      }
      if (json.data.config && typeof json.data.config === 'object') {
        if (!AppState.config) AppState.config = Object.assign({}, DEFAULT_CONFIG);
        if (json.data.config.selectedSignerKoordinatorId) {
          AppState.config.selectedSignerKoordinatorId = json.data.config.selectedSignerKoordinatorId;
        }
        if (json.data.config.evaluationConfig) {
          AppState.config.evaluationConfig = json.data.config.evaluationConfig;
        }
        if (json.data.config.weights) {
          AppState.config.weights = json.data.config.weights;
        }
      }

      AppState.syncStatus.online = true;
      AppState.syncStatus.lastSync = new Date().toLocaleTimeString();
      saveStateToStorage();
      if (!isUserInteracting() || isManual) {
        renderApp();
      }
      if (isManual) {
        showToast('Data berhasil diperbarui langsung dari Google Drive!', 'success');
        alert('Data berhasil diperbarui! Seluruh data Co.Ass, praktikan, dan nilai dari Google Drive telah tersinkronkan.');
      }
    }
  } catch (e) {
    if (isManual) alert('Gagal mengambil data dari Google Drive: ' + e.message);
  }
}

async function pullFromGoogleSheetsSilent(showToastNotice = false) {
  const url = AppState.config && AppState.config.googleAppsScriptUrl;
  if (!url) return;

  try {
    const fetchUrl = url.includes('?') ? `${url}&action=getAllData` : `${url}?action=getAllData`;
    const res = await fetch(fetchUrl);
    const json = await res.json();
    if (json.status === 'success' && json.data) {
      if (json.data.coass && json.data.coass.length > 0) {
        AppState.coassList = json.data.coass.map(normalizeCoAssItem);
      }
      if (json.data.praktikan && json.data.praktikan.length > 0) {
        AppState.praktikanList = json.data.praktikan.map(normalizePraktikanItem);
      }
      if (json.data.acara && json.data.acara.length > 0) {
        AppState.acaraList = json.data.acara.map(a => ({
          id: parseInt(a.id || a.ID || 1),
          code: a.code || a.Kode_Acara || `ACARA-${a.id}`,
          nama: a.nama || a.Nama_Acara || `Acara ${a.id}`,
          wajibVideo: (a.wajibVideo === true || a.Wajib_Video === true || String(a.Wajib_Video).toLowerCase() === 'true'),
          deskripsi: a.deskripsi || a.Deskripsi || ''
        }));
      }
      if (json.data.grades && typeof json.data.grades === 'object' && Object.keys(json.data.grades).length > 0) {
        AppState.grades = Object.assign({}, AppState.grades, json.data.grades);
      }
      if (json.data.praktikumList && json.data.praktikumList.length > 0) {
        AppState.praktikumList = json.data.praktikumList;
      }
      if (json.data.globalResponsi) {
        AppState.globalResponsi = Object.assign({}, AppState.globalResponsi || {}, json.data.globalResponsi);
      }
      if (AppState.globalResponsi && AppState.grades) {
        if (!AppState.grades.responsi) AppState.grades.responsi = {};
        Object.keys(AppState.globalResponsi).forEach(nim => {
          AppState.grades.responsi[nim] = AppState.globalResponsi[nim];
        });
      }
      if (json.data.koordinatorList && json.data.koordinatorList.length > 0) {
        AppState.koordinatorList = json.data.koordinatorList;
      }
      if (json.data.config && typeof json.data.config === 'object') {
        if (!AppState.config) AppState.config = Object.assign({}, DEFAULT_CONFIG);
        if (json.data.config.selectedSignerKoordinatorId) {
          AppState.config.selectedSignerKoordinatorId = json.data.config.selectedSignerKoordinatorId;
        }
        if (json.data.config.evaluationConfig) {
          AppState.config.evaluationConfig = json.data.config.evaluationConfig;
        }
        if (json.data.config.weights) {
          AppState.config.weights = json.data.config.weights;
        }
      }
      AppState.syncStatus.online = true;
      AppState.syncStatus.lastSync = new Date().toLocaleTimeString();
      saveStateToStorage();
      if (!isUserInteracting()) {
        renderApp();
      }
      if (showToastNotice) {
        const now = Date.now();
        if (now - _lastSyncToastTime >= 10 * 60 * 1000) {
          showToast('Data Co.Ass & Praktikan berhasil disinkronkan dari Google Drive!', 'success');
          _lastSyncToastTime = now;
        }
      }
    }
  } catch (e) {
    console.warn("Silent cloud fetch error:", e);
    AppState.syncStatus.online = false;
    if (showToastNotice) {
      showToast('Koneksi ke Google Drive gagal. Menggunakan data lokal.', 'error');
    }
  }
}

/**
 * 16. EVENT BINDING & UTILITY
 */
function bindGlobalEvents() {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Sinkronisasi otomatis saat user kembali membuka tab/aplikasi (terutama di HP atau browser lain)
  window.addEventListener('focus', () => {
    if (AppState.config && AppState.config.googleAppsScriptUrl) {
      pullFromGoogleSheetsSilent(false);
    }
  });
}

function bindDashboardEvents() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function copyToClipboard(text, msg) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(msg || 'Berhasil disalin!', 'info');
  });
}

function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-[#56b29d]' : type === 'error' ? 'bg-rose-600' : 'bg-slate-900';

  toast.className = `${bgColor} text-white px-4 py-3 rounded-xl shadow-xl text-xs font-medium flex items-center space-x-2.5 transition transform translate-y-2 pointer-events-auto max-w-sm`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;

  toastContainer.appendChild(toast);
  setTimeout(() => toast.classList.remove('translate-y-2'), 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'transition', 'duration-300');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
