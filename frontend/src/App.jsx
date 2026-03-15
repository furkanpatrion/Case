import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import Swal from 'sweetalert2';
import SensorDetailPage from './SensorDetailPage';
import './SensorDetailPage.css';


const socket = io(); // Automatically uses current domain/port and proxies via Vite or Nginx

// Form Components (Uncontrolled to prevent App re-renders)
const SensorForm = ({ user, companies, sensors, onSubmit, theme }) => {
  const extIdRef = useRef();
  const nameRef = useRef();
  const typeRef = useRef();
  const groupSelectRef = useRef();
  const groupManualRef = useRef();
  const companyIdRef = useRef();
  const [groupMode, setGroupMode] = useState('select'); // 'select' or 'manual'

  const existingGroups = [...new Set(sensors.filter(s => s.group).map(s => s.group))].filter(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const group = groupMode === 'select' ? groupSelectRef.current.value : groupManualRef.current.value;

    if (groupMode === 'manual' && existingGroups.includes(group)) {
      const result = await Swal.fire({
        title: 'Grup Zaten Mevcut',
        text: `"${group}" grubu zaten mevcut. Bu sensörü bu gruba eklemek istiyor musunuz?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Evet, gruba ekle',
        cancelButtonText: 'Hayır, ismi değiştir',
        background: theme === 'dark' ? '#0f172a' : '#fff',
        color: theme === 'dark' ? '#f8fafc' : '#0f172a',
        confirmButtonColor: '#2563eb'
      });
      if (!result.isConfirmed) return;
    }

    onSubmit({
      sensorExternalId: extIdRef.current.value,
      name: nameRef.current.value,
      type: typeRef.current.value,
      group: group,
      companyId: companyIdRef?.current?.value || user?.companyId
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sensör Kimliği</label>
          <input ref={extIdRef} placeholder="örn. SN-5001" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 font-mono text-slate-900 dark:text-white" required />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Görüntülenen Ad</label>
          <input ref={nameRef} placeholder="örn. Ana Yatak Odası" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 text-slate-900 dark:text-white" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sensör Tipi</label>
          <input ref={typeRef} placeholder="örn. CO2 Seviyesi" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 text-slate-900 dark:text-white" />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Grup Ataması</label>
            <button type="button" onClick={() => setGroupMode(groupMode === 'select' ? 'manual' : 'select')} className="text-[10px] text-blue-600 dark:text-blue-400 hover:opacity-80 font-bold uppercase underline transition-opacity">
              {groupMode === 'select' ? 'Manuel Gir' : 'Mevcut Seç'}
            </button>
          </div>
          {groupMode === 'select' ? (
            <select ref={groupSelectRef} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none text-slate-900 dark:text-white">
              <option value="">Grup Yok</option>
              {existingGroups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          ) : (
            <input ref={groupManualRef} placeholder="Yeni grup adını yazın..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 text-slate-900 dark:text-white" />
          )}
        </div>
      </div>

      {user?.role === 'SYSTEM_ADMIN' && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Şirket Bağlantısı</label>
          <select ref={companyIdRef} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none text-slate-900 dark:text-white">
            <option value="">Varsayılan Şirket</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black text-white transition-all shadow-xl shadow-blue-500/20 mt-4 text-lg active:scale-95">
        Sensör Düğümünü Etkinleştir
      </button>
    </form>

  );
};

const CompanyForm = ({ onSubmit }) => {
  const nameRef = useRef();
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit({ name: nameRef.current.value });
    }} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase">Şirket Adı</label>
        <input ref={nameRef} placeholder="Yasal şirket adı" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white" required />
      </div>
      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold transition-all mt-4">Kuruluş Oluştur</button>
    </form>
  );
};

const UserForm = ({ user, companies, onSubmit }) => {
  const emailRef = useRef();
  const passwordRef = useRef();
  const roleRef = useRef();
  const companyIdRef = useRef();

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit({
        email: emailRef.current.value,
        password: passwordRef.current.value,
        role: roleRef?.current?.value || 'USER',
        companyId: companyIdRef?.current?.value || user?.companyId
      });
    }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase">E-posta Adresi</label>
          <input ref={emailRef} placeholder="kullanici@alanadi.com" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Şifre</label>
          <input ref={passwordRef} type="password" placeholder="••••••••" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white" required />
        </div>
      </div>
      {user?.role === 'SYSTEM_ADMIN' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Rol</label>
            <select ref={roleRef} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl outline-none text-slate-900 dark:text-white transition-all focus:ring-2 focus:ring-blue-500">
              <option value="USER">KULLANICI</option>
              <option value="COMPANY_ADMIN">ŞİRKET YÖNETİCİSİ</option>
              <option value="SYSTEM_ADMIN">SİSTEM YÖNETİCİSİ</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Şirket</label>
            <select ref={companyIdRef} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl outline-none text-slate-900 dark:text-white transition-all focus:ring-2 focus:ring-blue-500">
              <option value="">Şirket Seçin</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      )}
      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black text-white transition-all shadow-xl shadow-blue-500/20 md:mt-4 text-[11px] uppercase tracking-[0.2em] active:scale-95">
        Erişim Kimliğini Aktif Et
      </button>
    </form>
  );
};

const EditUserForm = ({ user, editingUser, onSubmit, onCancel }) => {
  const emailRef = useRef();
  const roleRef = useRef();

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit({
        email: emailRef.current.value,
        role: roleRef.current.value
      });
    }} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase">E-posta Adresi</label>
        <input ref={emailRef} defaultValue={editingUser?.email} placeholder="E-posta" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white" required />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase">Rol</label>
        <select ref={roleRef} defaultValue={editingUser?.role || 'USER'} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl outline-none text-slate-900 dark:text-white">
          <option value="USER">KULLANICI</option>
          <option value="COMPANY_ADMIN">ŞİRKET YÖNETİCİSİ</option>
          {user?.role === 'SYSTEM_ADMIN' && <option value="SYSTEM_ADMIN">SİSTEM YÖNETİCİSİ</option>}
        </select>
      </div>
      <div className="flex gap-3 mt-6">
        <button type="button" onClick={onCancel} className="flex-1 bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-bold transition-all">İptal</button>
        <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20">Ayarları Güncelle</button>
      </div>
    </form>
  );
};

// Modal Component
const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    'sm': 'max-w-md',
    'md': 'max-w-lg',
    'lg': 'max-w-2xl',
    'xl': 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full ${sizeClasses[size]} rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200`}>
        <div className="flex justify-between items-center p-8 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900/50">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h3>
          <button onClick={onClose} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [view, setView] = useState('login'); // 'login', 'dashboard', 'admin', 'logs', 'sensor-detail'
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [isInitializing, setIsInitializing] = useState(!!localStorage.getItem('token'));
  const [sensors, setSensors] = useState([]);
  const [logs, setLogs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pagination states
  const [companyMeta, setCompanyMeta] = useState({ totalPages: 1, page: 1 });
  const [userMeta, setUserMeta] = useState({ totalPages: 1, page: 1 });
  const [logsMeta, setLogsMeta] = useState({ totalPages: 1, page: 1 });

  // --- Pub/Sub: Gerçek Zamanlı Sensör Verisi ---
  // { [externalId]: { payload, timestamp } }
  const [liveReadings, setLiveReadings] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);
  const [totalSignals, setTotalSignals] = useState(0);
  // Flash animasyonu için hangi sensörün az önce güncellediğini tutar
  const [flashingNode, setFlashingNode] = useState(null);

  // Refs for Login form
  const loginEmailRef = useRef();
  const loginPasswordRef = useRef();

  // Modal Visibility States
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showSensorModal, setShowSensorModal] = useState(false);
  const [activityStats, setActivityStats] = useState([]);
  const [behaviorAnalytics, setBehaviorAnalytics] = useState(null); // Yeni analitik state'i
  const [editingUser, setEditingUser] = useState(null);

  const [activeGroupFilter, setActiveGroupFilter] = useState('All');
  const [openDropdown, setOpenDropdown] = useState(null); // Track which dropdown is open
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [collapsedGroups, setCollapsedGroups] = useState([]);
  const [logSearch, setLogSearch] = useState('');
  const [logAction, setLogAction] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = () => setOpenDropdown(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // --- Socket.IO: Pub/Sub Canlı Veri Akışı ---
  useEffect(() => {
    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));

    socket.on('sensor_data', (data) => {
      // data = { nodeId, externalId, timestamp, payload }
      const externalId = data.externalId;
      setLiveReadings(prev => ({
        ...prev,
        [externalId]: {
          payload: data.payload,
          timestamp: data.timestamp
        }
      }));
      setTotalSignals(prev => prev + 1);
      // Flash efekti
      setFlashingNode(externalId);
      setTimeout(() => setFlashingNode(null), 600);
    });

    // Başlangıç bağlantı durumu
    setSocketConnected(socket.connected);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('sensor_data');
    };
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const toggleGroup = (group) => {
    setCollapsedGroups(prev =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };



  // Axios set token
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setIsInitializing(false);
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const res = await axios.get('/api/auth/profile');
      setUser(res.data);
      setView('dashboard');
      fetchDashboardData();
    } catch (err) {
      handleLogout();
    } finally {
      setIsInitializing(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const res = await axios.get('/api/sensors');
      setSensors(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminData = async (companyPage = 1, userPage = 1) => {
    try {
      const requests = [axios.get(`/api/admin/users?page=${userPage}&limit=10`)];

      // Only System Admin can fetch companies list
      if (user?.role === 'SYSTEM_ADMIN') {
        requests.push(axios.get(`/api/admin/companies?page=${companyPage}&limit=10`));
      }

      const results = await Promise.all(requests);

      setUsersList(results[0].data.data);
      setUserMeta(results[0].data.pagination);

      if (user?.role === 'SYSTEM_ADMIN' && results[1]) {
        setCompanies(results[1].data.data);
        setCompanyMeta(results[1].data.pagination);
      }
    } catch (err) {
      console.error('Fetch Admin Data Error:', err);
    }
  };

  const fetchLogs = async (page = 1) => {
    try {
      const res = await axios.get(`/api/admin/logs?page=${page}&limit=10&search=${logSearch}&action=${logAction}`);
      setLogs(res.data.data);
      setLogsMeta(res.data.pagination);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActivityStats = async () => {
    try {
      const res = await axios.get('/api/admin/stats/activity');
      setActivityStats(res.data);
    } catch (err) {
      console.error('Error fetching activity stats:', err);
    }
  };

  const fetchBehaviorAnalytics = async () => {
    try {
      const res = await axios.get('/api/admin/stats/behavior-analytics');
      if (res.data.success) {
        setBehaviorAnalytics(res.data.analytics);
      }
    } catch (err) {
      console.error('Error fetching behavior analytics:', err);
    }
  };

  const handleSendCommand = async (sensorId, sensorExternalId) => {
    const isDark = theme === 'dark';
    const bg = isDark ? '#0f172a' : '#fff';
    const color = isDark ? '#fff' : '#0f172a';

    const { value: commandAction } = await Swal.fire({
      title: 'Komut Gönder',
      html: `
        <div style="text-align:left; font-family:monospace; font-size:11px; color:${isDark ? '#94a3b8' : '#64748b'}; line-height:1.6; margin-bottom:12px">
          <b style="color:${isDark ? '#fff' : '#0f172a'}">Hedef Düğüm:</b> ${sensorExternalId}<br/>
          <div style="margin-top:8px; opacity:0.8">
            • <span style="color:#4ade80">{}</span> tümünü temizle<br/>
            • <span style="color:#60a5fa">{"key": "val"}</span> tüm yükü kilitle<br/>
            • <span style="color:#f97316">alan:değer</span> tek alanı kilitle<br/>
            • <span style="color:#60a2fa">{"faker": "true"}</span> tüm yükü rastgele oluştur<br/>
          </div>
        </div>
        <div style="position:relative">
          <textarea id="swal-input-json" class="swal2-textarea" 
            style="width:100%; height:160px; margin:0; font-family:monospace; font-size:12px; background:${isDark ? '#020617' : '#f8fafc'}; color:${isDark ? '#22d3ee' : '#0369a1'}; border-radius:12px; border:1px solid ${isDark ? '#1e293b' : '#e2e8f0'}; padding:12px; outline:none"
            placeholder='örn. {"temperature": 25.5, "status": "online"}'></textarea>
          <button id="swal-btn-format" type="button" 
            style="position:absolute; bottom:12px; right:12px; background:#3b82f6; color:#fff; border:none; padding:4px 10px; border-radius:6px; font-size:10px; font-weight:800; cursor:pointer; text-transform:uppercase; z-index:10">
            JSON Düzenle ✨
          </button>
        </div>
      `,
      didOpen: () => {
        const textarea = document.getElementById('swal-input-json');
        const formatBtn = document.getElementById('swal-btn-format');
        formatBtn.addEventListener('click', () => {
          try {
            const current = textarea.value.trim();
            if (current.startsWith('{')) {
              const obj = JSON.parse(current);
              textarea.value = JSON.stringify(obj, null, 2);
            }
          } catch (e) {
            Swal.showValidationMessage('Geçersiz JSON formatı');
            setTimeout(() => Swal.resetValidationMessage(), 2000);
          }
        });
      },
      preConfirm: () => {
        return document.getElementById('swal-input-json').value;
      },
      showCancelButton: true,
      background: bg,
      color,
      confirmButtonText: 'Yayınla',
      confirmButtonColor: '#2563eb'
    });

    if (commandAction !== undefined && commandAction !== null) {
      const action = commandAction.trim();
      try {
        await axios.post(`/api/sensors/${sensorId}/command`, { action, payload: {} });

        let msg;
        if (action === '{}' || action === '') {
          msg = 'Tüm overrides temizlendi — faker geri yüklendi';
        } else if (action.startsWith('{')) {
          msg = 'Tam yük kilitlendi — manuel kontrol aktif';
        } else if (action.includes(':')) {
          const [k, v] = action.split(':');
          msg = `"${k.trim()}" alanı "${v.trim()}" olarak kilitlendi`;
        } else {
          msg = `"${action}" alanının kilidi açıldı`;
        }

        Swal.fire({
          icon: 'success', title: 'İşlem Gönderildi',
          text: msg, background: bg, color,
          toast: true, position: 'top-end', timer: 3000, showConfirmButton: false
        });
      } catch (err) {
        Swal.fire({
          icon: 'error', title: 'Hata',
          text: err.response?.data?.message || 'Komut gönderilemedi',
          background: bg, color
        });
      }
    }
  };

  // Röle / Switch sensörlerine relay_state alanını key:value syntaxıyla kilitle
  const handleRelayToggle = async (sensorId, sensorExternalId, currentState) => {
    const newState = currentState === 'ON' ? 'OFF' : 'ON';
    const bg = theme === 'dark' ? '#0f172a' : '#fff';
    const color = theme === 'dark' ? '#fff' : '#0f172a';
    try {
      // key:value formatı: relay_state alanını kilitle, faker diğerlerine dokunamaz
      await axios.post(`/api/sensors/${sensorId}/command`, {
        action: `relay_state:${newState}`,
        payload: {}
      });
      Swal.fire({
        icon: 'success',
        title: `Röle → ${newState}`,
        text: `${sensorExternalId} üzerinde relay_state "${newState}" olarak kilitlendi`,
        toast: true, position: 'top-end', timer: 2000, showConfirmButton: false,
        background: bg, color,
      });
    } catch (err) {
      Swal.fire({
        icon: 'error', title: 'Komut Başarısız',
        text: err.response?.data?.message || 'Röle komutu gönderilemedi.',
        background: bg, color,
      });
    }
  };

  // Sensör tipinin relay/switch olup olmadığını kontrol eder
  const isRelayType = (type) => {
    if (!type) return false;
    const t = type.toLowerCase();
    return t.includes('relay') || t.includes('röle') || t.includes('switch') || t.includes('actuator');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const email = loginEmailRef.current.value;
      const password = loginPasswordRef.current.value;
      const res = await axios.post('/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      setView('dashboard');
      Swal.fire({
        icon: 'success',
        title: 'Tekrar Hoş Geldiniz',
        text: 'Sistem erişimi onaylandı.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        background: theme === 'dark' ? '#0f172a' : '#fff',
        color: theme === 'dark' ? '#fff' : '#0f172a'
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Kimlik Doğrulama Başarısız',
        text: 'Lütfen bilgilerinizi kontrol edin.',
        background: theme === 'dark' ? '#0f172a' : '#fff',
        color: theme === 'dark' ? '#fff' : '#0f172a'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setView('login');
  };

  // Form Handlers
  const onCreateCompany = async (data) => {
    try {
      await axios.post('/api/admin/companies', data);
      setShowCompanyForm(false);
      fetchAdminData();
      Swal.fire({ icon: 'success', title: 'Şirket Eklendi', background: theme === 'dark' ? '#0f172a' : '#fff', color: theme === 'dark' ? '#fff' : '#0f172a' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'İşlem Başarısız', text: 'Şirket eklenirken hata oluştu', background: theme === 'dark' ? '#0f172a' : '#fff', color: theme === 'dark' ? '#fff' : '#0f172a' });
    }
  };

  const onCreateUser = async (data) => {
    try {
      await axios.post('/api/admin/users', data);
      setShowUserForm(false);
      fetchAdminData();
      Swal.fire({ icon: 'success', title: 'Kullanıcı Oluşturuldu', background: theme === 'dark' ? '#0f172a' : '#fff', color: theme === 'dark' ? '#fff' : '#0f172a' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'İşlem Başarısız', text: 'Kullanıcı eklenirken hata oluştu', background: theme === 'dark' ? '#0f172a' : '#fff', color: theme === 'dark' ? '#fff' : '#0f172a' });
    }
  };

  const onCreateSensor = async (data) => {
    try {
      await axios.post('/api/admin/sensors', data);
      setShowSensorModal(false);
      fetchDashboardData();
      Swal.fire({ icon: 'success', title: 'Sensör Etkinleştirildi', background: theme === 'dark' ? '#0f172a' : '#fff', color: theme === 'dark' ? '#fff' : '#0f172a' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'İşlem Başarısız', text: 'Sensör eklenirken hata oluştu', background: theme === 'dark' ? '#0f172a' : '#fff', color: theme === 'dark' ? '#fff' : '#0f172a' });
    }
  };

  const onUpdateUser = async (data) => {
    try {
      await axios.patch(`/api/admin/users/${editingUser.id}`, data);
      setEditingUser(null);
      fetchAdminData();
      Swal.fire({ icon: 'success', title: 'Erişim Güncellendi', background: theme === 'dark' ? '#0f172a' : '#fff', color: theme === 'dark' ? '#fff' : '#0f172a' });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'İşlem Başarısız',
        text: err.response?.data?.message || 'Kullanıcı güncellenirken hata oluştu',
        background: theme === 'dark' ? '#0f172a' : '#fff',
        color: theme === 'dark' ? '#fff' : '#0f172a'
      });
    }
  };

  const onRenameGroup = async (oldName, newName) => {
    if (!newName || oldName === newName) return;
    try {
      await axios.patch('/api/admin/sensors/groups', { oldName, newName });
      fetchDashboardData();
      Swal.fire({ icon: 'success', title: 'Grup Yeniden Adlandırıldı', background: theme === 'dark' ? '#0f172a' : '#fff', color: theme === 'dark' ? '#fff' : '#0f172a' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Adlandırma Başarısız', text: 'Grup sensörleri güncellenirken hata oluştu', background: theme === 'dark' ? '#0f172a' : '#fff', color: theme === 'dark' ? '#fff' : '#0f172a' });
    }
  };


  const onDeleteUser = async (id) => {
    const result = await Swal.fire({
      title: 'Erişimi Kaldır?',
      text: "Bu kullanıcı tüm sistem izinlerini kaybedecektir.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#334155',
      confirmButtonText: 'Evet, Sil',
      background: theme === 'dark' ? '#0f172a' : '#fff',
      color: theme === 'dark' ? '#fff' : '#0f172a'
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`/api/admin/users/${id}`);
      fetchAdminData();
      Swal.fire({ icon: 'success', title: 'Erişim Kaldırıldı', background: theme === 'dark' ? '#0f172a' : '#fff', color: theme === 'dark' ? '#fff' : '#0f172a' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'İşlem Başarısız', text: 'Kullanıcı silinirken hata oluştu', background: theme === 'dark' ? '#0f172a' : '#fff', color: theme === 'dark' ? '#fff' : '#0f172a' });
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center transition-colors duration-500">
        <div className="w-16 h-16 border-4 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <div className="text-slate-600 dark:text-slate-400 font-black uppercase tracking-[0.3em] text-xs">Kimlik Senkronize Ediliyor...</div>
      </div>
    );
  }

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-500">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-400"></div>
          <h1 className="text-3xl font-black text-center mb-8 bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
            Patrion IoT
          </h1>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Hesap Kimliği</label>
              <input type="email" ref={loginEmailRef}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all font-medium" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Şifre</label>
              <input type="password" ref={loginPasswordRef}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all font-medium" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50">
              {loading ? 'Başlatılıyor...' : 'Giriş yap'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex transition-colors duration-500 relative">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl z-50 transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent tracking-tighter">Patrion IoT</h2>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-bold uppercase tracking-[0.2em]">{user?.role}</div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => { setView('dashboard'); setSelectedSensor(null); fetchDashboardData(); setSidebarOpen(false); }}
            className={`w-full text-left px-5 py-3.5 rounded-2xl font-bold transition-all flex items-center gap-3 ${(view === 'dashboard' || view === 'sensor-detail') ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
            <span className="text-lg">📊</span> Sensörler & Veri
          </button>
          {(user?.role === 'SYSTEM_ADMIN' || user?.role === 'COMPANY_ADMIN') && (
            <button onClick={() => {
              const seqUrl = window.location.hostname === 'fuira.shop'
                ? 'https://seq.fuira.shop'
                : `${window.location.protocol}//${window.location.hostname}:8081`;
              window.open(seqUrl, '_blank');
              setSidebarOpen(false);
            }}
              className="w-full text-left px-5 py-3.5 rounded-2xl font-bold transition-all flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
              <span className="text-lg">📈</span> Seq Verisi
            </button>
          )}

          {(user?.role === 'SYSTEM_ADMIN' || user?.role === 'COMPANY_ADMIN') && (
            <button onClick={() => { setView('admin'); fetchAdminData(); fetchActivityStats(); fetchBehaviorAnalytics(); setSidebarOpen(false); }}
              className={`w-full text-left px-5 py-3.5 rounded-2xl font-bold transition-all flex items-center gap-3 ${view === 'admin' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
              <span className="text-lg">🏢</span> Yönetim
            </button>
          )}

          {(user?.role === 'SYSTEM_ADMIN' || user?.role === 'COMPANY_ADMIN') && (
            <button onClick={() => { setView('logs'); fetchLogs(); setSidebarOpen(false); }}
              className={`w-full text-left px-5 py-3.5 rounded-2xl font-bold transition-all flex items-center gap-3 ${view === 'logs' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
              <span className="text-lg">📜</span> Aktivite Günlükleri
            </button>
          )}
        </nav>
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
          {/* MQTT / WebSocket Durum Göstergesi */}
          <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${socketConnected
            ? 'bg-green-500/5 border-green-500/20'
            : 'bg-red-500/5 border-red-500/20'
            } transition-all`}>
            <span className="relative flex h-2 w-2 flex-shrink-0">
              {socketConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </span>
            <div className="flex-1 min-w-0">
              <div className={`text-[11px] font-black uppercase tracking-widest ${socketConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                {socketConnected ? 'MQTT Akışı Aktif' : 'Bağlantı Kesildi'}
              </div>
              {socketConnected && (
                <div className="text-[11px] text-slate-400 font-bold tabular-nums">
                  {totalSignals.toLocaleString()} sinyal alındı
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between px-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Arayüz Teması</div>
            <button onClick={toggleTheme} className="w-10 h-6 bg-slate-200 dark:bg-slate-800 rounded-full relative transition-all border border-slate-300 dark:border-slate-700">
              <div className={`absolute top-1 w-4 h-4 rounded-full transition-all flex items-center justify-center text-[8px] ${theme === 'dark' ? 'left-5 bg-blue-600' : 'left-1 bg-white'}`}>
                {theme === 'dark' ? '🌙' : '☀️'}
              </div>
            </button>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate mb-1">{user?.email}</div>
            <button onClick={handleLogout} className="text-[10px] font-black uppercase text-red-500 hover:text-red-400 transition-colors flex items-center gap-1">
              <span>Oturumu Kapat</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile Top Header */}
        <header className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center transition-colors duration-500 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <h2 className="text-lg font-black bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent tracking-tighter">Patrion IoT</h2>
          <div className="w-10"></div> {/* Spacer for symmetry */}
        </header>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          {view === 'dashboard' && (
            <div>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
                <div>
                  <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent italic tracking-tight uppercase">IoT Sensör Izleme Alanı</h1>
                  <p className="text-slate-500 text-[10px] md:text-xs mt-1 font-bold uppercase tracking-widest opacity-80">Etkinleştirilmiş düğümlerden gerçek zamanlı telemetri akışı</p>
                </div>

                <div className="relative w-full lg:w-auto" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'filter' ? null : 'filter')}
                    className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-5 py-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold text-slate-700 dark:text-slate-200 w-full lg:min-w-[220px] justify-between shadow-lg dark:shadow-none"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-blue-500">📂</span>
                      <span className="text-xs uppercase tracking-wider">{activeGroupFilter === 'All' ? 'Tüm Grupları Göster' : activeGroupFilter}</span>
                    </div>
                    <svg className={`w-4 h-4 transition-transform duration-300 ${openDropdown === 'filter' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {openDropdown === 'filter' && (
                    <div className="absolute right-0 mt-3 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden py-2 animate-in slide-in-from-top-2 duration-300">
                      {['All', ...new Set(sensors.filter(s => s.group).map(s => s.group))].map(group => (
                        <button
                          key={group}
                          onClick={() => { setActiveGroupFilter(group); setOpenDropdown(null); }}
                          className={`w-full text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-between hover:bg-blue-600/5 transition-colors ${activeGroupFilter === group ? 'text-blue-600 bg-blue-600/5' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                          <span>{group === 'All' ? 'Tüm Aktif Gruplar' : group}</span>
                          {activeGroupFilter === group && <span className="text-blue-600">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>


              <div className="space-y-12">
                {['All', ...new Set(sensors.filter(s => s.group).map(s => s.group))]
                  .filter(group => activeGroupFilter === 'All' || group === activeGroupFilter)
                  .map(group => {
                    const filteredSensors = sensors.filter(s => (group === 'All' ? !s.group : s.group === group));
                    if (filteredSensors.length === 0) return null;

                    return (
                      <div key={group} className="space-y-6">
                        <div className="flex items-center gap-4">
                          <div
                            className="flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-all select-none shadow-sm dark:shadow-none"
                            onClick={() => toggleGroup(group)}
                          >
                            <svg className={`w-4 h-4 text-blue-500 transition-transform duration-300 ${collapsedGroups.includes(group) ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                            <h2 className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-[0.2em]">
                              {group === 'All' ? 'Genel Düğümler' : group}
                            </h2>
                          </div>
                          <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-slate-800 to-transparent"></div>
                          <div className="flex items-center gap-6">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest whitespace-nowrap">{filteredSensors.length} Nodes</span>

                            {group !== 'All' && (
                              <div className="relative" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => setOpenDropdown(openDropdown === `group-${group}` ? null : `group-${group}`)}
                                  className="text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-full transition-colors"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                                </button>
                                {openDropdown === `group-${group}` && (
                                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-200">
                                    <button onClick={async () => {
                                      setOpenDropdown(null);
                                      const { value: newName } = await Swal.fire({
                                        title: 'Grubu Yeniden Adlandır',
                                        input: 'text',
                                        inputValue: group,
                                        showCancelButton: true,
                                        background: theme === 'dark' ? '#0f172a' : '#fff',
                                        color: theme === 'dark' ? '#fff' : '#0f172a',
                                        confirmButtonColor: '#2563eb'
                                      });
                                      if (newName) onRenameGroup(group, newName);
                                    }} className="w-full text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-3">
                                      <span>✏️</span> Grubu Yeniden Adlandır
                                    </button>
                                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
                                    <button onClick={() => {
                                      setOpenDropdown(null);
                                      setActiveGroupFilter(group);
                                    }} className="w-full text-left px-5 py-3 text-xs font-black uppercase tracking-widest text-blue-600 hover:bg-blue-600/5 transition-colors flex items-center gap-3">
                                      <span>🔍</span> Gruba Odaklan
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {!collapsedGroups.includes(group) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-top-2 duration-500">
                            {filteredSensors.map(s => {
                              // Canlı veri varsa onu kullan, yoksa DB'deki son okumaya dön
                              const liveData = liveReadings[s.sensorExternalId];
                              const displayPayload = liveData?.payload ?? s.readings?.[0]?.data;
                              const displayTimestamp = liveData?.timestamp ?? s.readings?.[0]?.timestamp;
                              const isFlashing = flashingNode === s.sensorExternalId;
                              const isLive = !!liveData;

                              return (
                                <div
                                  key={s.id}
                                  onClick={() => { setSelectedSensor(s); setView('sensor-detail'); }}
                                  className={`group bg-white dark:bg-slate-900 border p-8 rounded-[2.5rem] transition-all hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/5 relative overflow-hidden cursor-pointer ${isFlashing
                                    ? 'border-green-500/60 shadow-lg shadow-green-500/20'
                                    : 'border-slate-200 dark:border-slate-800 hover:border-blue-500/50'
                                    }`}
                                >
                                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-transparent rounded-bl-full pointer-events-none transition-opacity opacity-50 group-hover:opacity-100"></div>
                                  <div className="flex justify-between mb-6">
                                    <div className="flex flex-col">
                                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black tracking-widest uppercase">NODE ID: {s.sensorExternalId}</span>
                                      <div className="flex items-center gap-2 mt-2.5">
                                        <span className={`w-2 h-2 rounded-full shadow-[0_0_12px_rgba(34,197,94,0.6)] ${isLive ? 'bg-green-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-600'
                                          }`}></span>
                                        <span className="text-[10px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-[0.2em]">{s.type || 'Standart'} Sistemler</span>
                                      </div>
                                    </div>
                                  </div>
                                  <h3 className="font-black text-2xl text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-6 tracking-tight leading-none">{s.name}</h3>

                                  {/* ── RELAY TİPİ: Özel ON/OFF Toggle UI ── */}
                                  {isRelayType(s.type) ? (() => {
                                    const relayState = displayPayload?.relay_state ?? null;
                                    const isOn = relayState === 'ON';
                                    const isPending = !relayState;

                                    return (
                                      <div className={`p-6 rounded-3xl border transition-all ${isFlashing ? 'bg-green-500/5 border-green-500/20' : 'bg-slate-50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-800/50'}`}>
                                        {/* Timestamp */}
                                        <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800/50 mb-6">
                                          <span className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em]">
                                            {isLive ? '⚡ Canlı Kontrol' : 'Röle Kontrolü'}
                                          </span>
                                          <span className="text-[10px] text-blue-600 dark:text-blue-500 font-mono font-black italic">
                                            {displayTimestamp ? new Date(displayTimestamp).toLocaleTimeString() : '--:--:--'}
                                          </span>
                                        </div>

                                        {/* Büyük Relay Durumu Göstergesi */}
                                        <div className="flex flex-col items-center gap-4">
                                          {/* Durum lambası */}
                                          <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-2xl transition-all duration-500 ${isPending
                                            ? 'bg-slate-200 dark:bg-slate-800 opacity-40'
                                            : isOn
                                              ? 'bg-green-500 shadow-green-500/40'
                                              : 'bg-slate-700 dark:bg-slate-800 shadow-none'
                                            }`}>
                                            {isPending ? '?' : isOn ? '💡' : '🔌'}
                                          </div>

                                          {/* Durum yazısı */}
                                          <div className={`text-2xl font-black tracking-widest uppercase ${isPending ? 'text-slate-400' :
                                            isOn ? 'text-green-500' : 'text-slate-500 dark:text-slate-400'
                                            }`}>
                                            {isPending ? 'BİLİNMİYOR' : relayState}
                                          </div>

                                          {/* ON / OFF Butonları */}
                                          <div className="flex gap-3 w-full mt-2">
                                            <button
                                              onClick={() => handleRelayToggle(s.id, s.sensorExternalId, relayState)}
                                              disabled={isPending}
                                              className={`flex-1 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${!isPending && isOn
                                                ? 'bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/30'
                                                : 'bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-500/30'
                                                }`}
                                            >
                                              {isPending ? 'Bekleniyor...' : isOn ? '⬛ KAPAT' : '▶ AÇ'}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })() : (
                                    /* ── NORMAL SENSÖR: Temp/Hum/Bat + JSON ── */
                                    <div className={`p-6 rounded-3xl border transition-all ${isFlashing ? 'bg-green-500/5 border-green-500/20' : 'bg-slate-50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-800/50'}`}>
                                      {displayPayload ? (
                                        <div className="space-y-4">
                                          <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800/50">
                                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em]">
                                              {isLive ? '⚡ Canlı Veri Akışı' : 'Son Okuma'}
                                            </span>
                                            <span className="text-[10px] text-blue-600 dark:text-blue-500 font-mono font-black italic">
                                              {displayTimestamp ? new Date(displayTimestamp).toLocaleTimeString() : '--:--:--'}
                                            </span>
                                          </div>
                                          <pre className="text-blue-700 dark:text-cyan-400 text-xs font-mono font-bold leading-relaxed overflow-x-auto max-h-32 custom-scrollbar">
                                            {JSON.stringify(displayPayload, null, 2)}
                                          </pre>
                                        </div>
                                      ) : (
                                        <div className="flex flex-col items-center justify-center py-10 opacity-40">
                                          <div className="w-12 h-12 rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-blue-500 animate-spin mb-4"></div>
                                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Düğüm Senkronize Ediliyor...</span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  <div className="mt-6 pt-6 flex justify-between items-center text-[10px] font-black tracking-widest text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/50">
                                    <div className="flex items-center gap-2">
                                    </div>
                                    <div className="flex gap-4" onClick={e => e.stopPropagation()}>
                                      {/* Relay tipi için alt komut butonu gösterme — kontrol zaten yukarıda */}
                                      {!isRelayType(s.type) && (
                                        <button
                                          onClick={() => handleSendCommand(s.id, s.sensorExternalId)}
                                          className="text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 transition-colors uppercase flex items-center gap-1 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 shadow-sm"
                                        >
                                          <span>⚡</span> Komut Gönder
                                        </button>
                                      )}
                                      <button
                                        onClick={() => { setSelectedSensor(s); setView('sensor-detail'); }}
                                        className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors uppercase flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                                      >
                                        <span>📊</span> Detaylar
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>


              {sensors.filter(s => activeGroupFilter === 'All' || s.group === activeGroupFilter).length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                  <div className="text-5xl mb-4 opacity-20">📡</div>
                  <p className="text-lg font-medium mb-2">Bu grupta sensör bulunamadı</p>
                  <p className="text-sm">Farklı bir grup seçmeyi deneyin veya yeni bir sensör ekleyin</p>
                </div>
              )}
            </div>
          )}

          {view === 'sensor-detail' && selectedSensor && (
            <SensorDetailPage
              sensor={selectedSensor}
              socket={socket}
              theme={theme}
              onBack={() => { setView('dashboard'); setSelectedSensor(null); }}
            />
          )}

          {view === 'admin' && (
            <div className="space-y-12 animate-in fade-in duration-500">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
                <div>
                  <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent italic tracking-tight uppercase">Sistem Yönetimi</h1>
                  <p className="text-slate-500 text-[10px] md:text-xs mt-1 font-bold uppercase tracking-widest opacity-80">Kurumsal kontrol ve yetkilendirme portalı</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                  {user?.role === 'SYSTEM_ADMIN' && (
                    <button onClick={() => setShowCompanyForm(true)} className="flex-1 lg:flex-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-blue-500 transition-all shadow-md dark:shadow-none">
                      + Yeni Kuruluş
                    </button>
                  )}
                  <button onClick={() => setShowUserForm(true)} className="flex-1 lg:flex-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-blue-500 transition-all shadow-md dark:shadow-none">
                    + Yeni Kimlik
                  </button>
                  <button onClick={() => setShowSensorModal(true)} className="w-full lg:w-auto bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20">
                    + Düğümü Kaydet
                  </button>
                </div>
              </div>

              {/* Traffic Density Schematic */}
              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-xl overflow-hidden relative">
                <div className="hidden lg:block absolute top-0 right-0 p-8 opacity-5 font-black text-6xl tracking-tighter uppercase pointer-events-none">TRAFİK_ŞEMASI</div>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-10">
                  <div>
                    <h2 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tight">Aktivite Yoğunluğu</h2>
                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1">24 Saatlik gerçek zamanlı trafik dağılımı</p>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase">Canlı Metrikler</span>
                  </div>
                </div>

                <div className="h-64 flex items-end gap-1.5 md:gap-3 px-4">
                  {activityStats.length > 0 ? activityStats.map((stat, idx) => {
                    const maxCount = Math.max(...activityStats.map(s => s.count)) || 1;
                    const height = (stat.count / maxCount) * 100;
                    return (
                      <div key={idx} className="flex-1 flex flex-col group items-center">
                        <div className="w-full relative">
                          {stat.count > 0 && (
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                              {stat.count}
                            </div>
                          )}
                          <div
                            style={{ height: `${Math.max(height, 5)}%` }}
                            className={`w-full rounded-t-lg transition-all duration-700 ease-out border-b-2 border-blue-500 ${stat.count > 0 ? 'bg-gradient-to-t from-blue-600/20 to-blue-600 opacity-100 group-hover:from-blue-600/40' : 'bg-slate-100 dark:bg-slate-800 opacity-30 group-hover:opacity-50'}`}
                          ></div>
                        </div>
                        <span className={`text-[8px] font-black mt-3 transition-colors ${idx % 4 === 0 ? 'text-slate-900 dark:text-slate-400' : 'text-slate-300 dark:text-slate-700'}`}>
                          {stat.label}
                        </span>
                      </div>
                    );
                  }) : (
                    <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl opacity-40">
                      <span className="text-[10px] font-black uppercase tracking-widest">Günlüklerin Toplanması Bekleniyor...</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Behavioral Analytics & Prediction Section */}
              {behaviorAnalytics && behaviorAnalytics.summary && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Predictive Summary Card */}
                  <div className="lg:col-span-1 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full pointer-events-none"></div>
                    <div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 mb-2">Öngörücü Analiz (Next 24h)</h3>
                      <div className="text-5xl font-black italic tracking-tighter mb-4">
                        ~{behaviorAnalytics.summary.forecastedNext24h}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${behaviorAnalytics.summary.trend === 'INCREASING' ? 'bg-green-400/20 text-green-300' : 'bg-slate-400/20 text-slate-200'}`}>
                          {behaviorAnalytics.summary.trend === 'INCREASING' ? '▲ YÜKSELEN TREND' : '▬ STABİL TREND'}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] font-bold opacity-60 mt-8 leading-relaxed">
                      Son 7 günlük kullanıcı davranışı ve etkileşim hızı temel alınarak yapay zeka destekli aktivite tahmini.
                    </p>
                  </div>

                  {/* Heatmap & Top Actions */}
                  <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl flex flex-col md:flex-row gap-10">
                    <div className="flex-1">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span> Davranış Heatmap (24S)
                      </h3>
                      <div className="grid grid-cols-6 md:grid-cols-12 gap-2 h-24">
                        {behaviorAnalytics.heatmap.map((val, idx) => {
                          const maxVal = Math.max(...behaviorAnalytics.heatmap) || 1;
                          const opacity = 0.1 + (val / maxVal) * 0.9;
                          return (
                            <div key={idx} className="group relative">
                              <div
                                style={{ opacity }}
                                className="w-full h-full rounded-md bg-orange-500 transition-all hover:scale-110"
                              ></div>
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                                Saat {idx}: {val} İşlem
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-3 text-[9px] font-black text-slate-400 px-1 opacity-60">
                        <span>00:00</span>
                        <span>12:00</span>
                        <span>23:00</span>
                      </div>
                    </div>

                    <div className="w-full md:w-48 flex flex-col">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-6 flex items-center gap-2">
                        Popüler Aksiyonlar
                      </h3>
                      <div className="space-y-4">
                        {behaviorAnalytics.topActions.map((action, idx) => (
                          <div key={idx} className="flex flex-col gap-1">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-slate-700 dark:text-slate-300">
                              <span>{action.action}</span>
                              <span className="text-blue-500">{action.count}</span>
                            </div>
                            <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${(action.count / behaviorAnalytics.topActions[0].count) * 100}%` }}
                                className="h-full bg-blue-600 rounded-full"
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* Modals */}
              <Modal isOpen={showSensorModal} onClose={() => setShowSensorModal(false)} title="Yeni Sensör Düğümü Kaydet" size="lg">
                <SensorForm user={user} companies={companies} sensors={sensors} onSubmit={onCreateSensor} theme={theme} />
              </Modal>



              <Modal isOpen={showCompanyForm} onClose={() => setShowCompanyForm(false)} title="Şirket Ekle">
                <CompanyForm onSubmit={onCreateCompany} />
              </Modal>

              <Modal isOpen={showUserForm} onClose={() => setShowUserForm(false)} title="Yeni Erişim Oluştur">
                <UserForm user={user} companies={companies} onSubmit={onCreateUser} />
              </Modal>

              <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title={`Erişimi Düzenle: ${editingUser?.email}`}>
                <EditUserForm user={user} editingUser={editingUser} onSubmit={onUpdateUser} onCancel={() => setEditingUser(null)} />
              </Modal>


              {user?.role === 'SYSTEM_ADMIN' && (
                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl mb-12">
                  <div className="p-8 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center">
                    <h2 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tight">Aktif Kuruluşlar</h2>
                    <span className="text-[10px] font-black bg-blue-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">{companies.length} Kuruluş</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 text-[10px] uppercase font-black tracking-widest leading-none">
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                          <th className="p-6">Şirket İsmi</th>
                          <th className="p-6">Kullanıcı Sayısı</th>
                          <th className="p-6">Node Sayısı</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 px-2">
                        {companies.map(c => (
                          <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                            <td className="p-6 text-slate-950 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-bold">{c.name}</td>
                            <td className="p-6 text-slate-500 dark:text-slate-400 font-medium">{c._count?.users} Hesap</td>
                            <td className="p-6 text-slate-500 dark:text-slate-400 font-medium">{c._count?.sensors} Aktif Node</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination meta={companyMeta} onPageChange={(p) => fetchAdminData(p, userMeta.page)} />
                </section>
              )}

              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-8 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center">
                  <h2 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tight">Hesaplar</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 text-[10px] uppercase font-black tracking-widest leading-none">
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="p-6">Kullanıcı</th>
                        <th className="p-6">Yetki</th>
                        <th className="p-6">Şirket</th>
                        <th className="p-6 text-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {usersList.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-6 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500 dark:text-slate-400">
                              {u.email[0].toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-900 dark:text-slate-200">{u.email}</span>
                          </td>
                          <td className="p-6">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${u.role === 'SYSTEM_ADMIN' ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>{u.role}</span>
                          </td>
                          <td className="p-6 text-slate-500 dark:text-slate-400 font-medium">{u.company?.name || 'Patrion HQ'}</td>
                          <td className="p-6 text-right space-x-4">
                            <button onClick={() => setEditingUser(u)} className="text-blue-600 dark:text-blue-400 hover:underline text-[10px] font-black uppercase tracking-widest">Güncelle</button>
                            <button onClick={() => onDeleteUser(u.id)} className="text-red-500 hover:underline text-[10px] font-black uppercase tracking-widest">Kaldır</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination meta={userMeta} onPageChange={(p) => fetchAdminData(companyMeta.page, p)} />
              </section>
            </div>
          )}

          {view === 'logs' && (
            <div className="animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h1 className="text-3xl font-black bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent italic tracking-tight uppercase">Davranış Uyumluluğu</h1>
                  <p className="text-slate-500 text-xs mt-1 font-bold uppercase tracking-widest opacity-80">Sistem genelindeki tüm işlem ve hareketlerin izleme günlüğü</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <input
                      type="text"
                      placeholder="E-posta veya aksiyon ara..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchLogs(1)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    <button onClick={() => fetchLogs(1)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {logs.length > 0 ? logs.map(log => (
                  <div key={log.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 md:p-6 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between hover:border-blue-500 transition-all shadow-sm dark:shadow-none group gap-6">
                    <div className="flex items-center gap-5 md:gap-6">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black shadow-inner border border-slate-100 dark:border-slate-800">
                        {log.user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white mb-0.5">{log.user.email}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-500 font-black uppercase tracking-widest leading-none flex items-center gap-2">
                          <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></span>
                          {log.user.company?.name || 'PATRION SYSTEMS'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-6 md:gap-12">
                      <div className="bg-blue-600/5 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-600/10 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        {log.action}
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <div className="text-[10px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-tighter whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-600 tabular-nums">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem]">
                    <div className="text-5xl mb-4 opacity-20">📜</div>
                    <p className="text-lg font-medium mb-2">Henüz aktivite kaydı bulunmuyor</p>
                    <p className="text-sm">Sistem üzerindeki işlemler burada listelenecektir</p>
                  </div>
                )}
              </div>
              <Pagination meta={logsMeta} onPageChange={(p) => fetchLogs(p)} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const Pagination = ({ meta, onPageChange }) => {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mt-6 py-4 border-t border-slate-100 dark:border-slate-800/50">
      <button
        disabled={meta.page <= 1}
        onClick={() => onPageChange(meta.page - 1)}
        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-bold text-xs uppercase letter-spacing-widest"
      >
        Önceki
      </button>
      <div className="text-xs font-black text-slate-400">
        SAYFA {meta.page} / {meta.totalPages}
      </div>
      <button
        disabled={meta.page >= meta.totalPages}
        onClick={() => onPageChange(meta.page + 1)}
        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-bold text-xs uppercase letter-spacing-widest"
      >
        Sonraki
      </button>
    </div>
  );
};

export default App;
