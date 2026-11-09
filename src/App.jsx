import { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from './firebase';
import LoginScreen from './components/Login';
import RepairForm from './components/RepairForm';
import RepairsTable from './components/RepairsTable';
import KaznaOborot from './components/KaznaOborot';
import ManagerDashboard from './components/ManagerDashboard';
import AdminPanel from './components/AdminPanel';
import { exportToExcel } from './utils/exportExcel';
import { ZHEU_LIST, MONTHS } from './utils/constants';
import { RATES_DB } from './data/rates';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("data");
  const rates = RATES_DB;
  const [repairs, setRepairs] = useState([]);
  const [kazna, setKazna] = useState([]);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selZhes, setSelZhes] = useState(ZHEU_LIST[0]);
  const [selYear, setSelYear] = useState(currentYear);
  const [selMonth, setSelMonth] = useState(currentMonth);
  const years = Array.from({length: 5}, (_, i) => currentYear - 2 + i);

  // Загрузка расценок из JSON
  useEffect(() => {
  fetch('/rates_db.json')
    .then(r => r.json())
    .then(data => setRates(data))
    .catch(err => console.error('Ошибка загрузки расценок:', err));
}, []);

  // Загрузка данных при изменении фильтров
  useEffect(() => {
    if (user) loadData();
  }, [user, selZhes, selYear, selMonth]);

  const loadData = async () => {
    const effectiveZhes = user?.role === "master" ? user?.zhes : selZhes;
    
    try {
      // Загрузка работ
      const repairsQuery = query(
        collection(db, "repairs"),
        where("zhes", "==", effectiveZhes),
        where("year", "==", selYear),
        where("month", "==", selMonth)
      );
      const repairsSnap = await getDocs(repairsQuery);
      setRepairs(repairsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Загрузка казны оборота
      const kaznaQuery = query(
        collection(db, "kazna"),
        where("zhes", "==", effectiveZhes),
        where("year", "==", selYear),
        where("month", "==", selMonth)
      );
      const kaznaSnap = await getDocs(kaznaQuery);
      setKazna(kaznaSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Ошибка загрузки данных:", err);
    }
  };

  const handleSaveRepair = async (record) => {
    await addDoc(collection(db, "repairs"), record);
    loadData();
  };

  const handleDeleteRepair = async (id) => {
    if (!confirm("Удалить эту запись?")) return;
    await deleteDoc(doc(db, "repairs", id));
    loadData();
  };

  const handleExport = () => {
    exportToExcel(repairs, `${selZhes}_${MONTHS[selMonth-1]}_${selYear}`);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setActiveTab("data");
  };

  if (!user) return <LoginScreen onLogin={setUser} />;

  const tabs = [
    { id: "data", label: "📋 Внесение данных", roles: ["admin", "master"] },
    { id: "kazna", label: "💰 Казна оборот", roles: ["admin", "smetchik", "master"] },
    { id: "manager", label: "📊 Сводная", roles: ["admin"] },
    { id: "admin", label: "⚙ Админка", roles: ["admin"] },
  ];
  const availableTabs = tabs.filter(t => t.roles.includes(user.role));

  const effectiveZhes = user?.role === "master" ? user?.zhes : selZhes;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-100 no-print">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">ЖЭУ-1</h1>
              <p className="text-xs text-gray-500">Текущий ремонт — отчётность</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 flex items-center gap-2">
              <span className="font-semibold">{user.fullName || user.email}</span>
              {user.zhes && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-semibold">{user.zhes}</span>}
            </span>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-500 transition-colors">Выйти</button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex gap-6 overflow-x-auto">
          {availableTabs.map(t => (
            <button key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`py-3 text-sm transition-colors whitespace-nowrap ${activeTab === t.id ? "tab-active" : "text-gray-500 hover:text-gray-700"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "data" && user.role !== "smetchik" && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 fade-in">
              <div className="flex flex-wrap items-end gap-4">
                {user.role !== "master" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ЖЭС</label>
                    <select value={selZhes} onChange={e => setSelZhes(e.target.value)}
                      className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50 text-blue-800">
                      {ZHEU_LIST.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </div>
                )}
                {user.role === "master" && (
                  <div className="px-4 py-2.5 bg-blue-50 text-blue-800 rounded-lg font-semibold text-sm">
                    {user.zhes}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Год</label>
                  <select value={selYear} onChange={e => setSelYear(parseInt(e.target.value))}
                    className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Месяц</label>
                  <select value={selMonth} onChange={e => setSelMonth(parseInt(e.target.value))}
                    className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div className="ml-auto text-sm text-gray-500">
                  Записей: <span className="font-bold text-gray-800">{repairs.length}</span>
                </div>
              </div>
            </div>
            <RepairForm rates={rates} zhes={effectiveZhes} year={selYear} month={selMonth} onSave={handleSaveRepair} />
            <RepairsTable repairs={repairs} onDelete={handleDeleteRepair} onExport={handleExport} />
          </div>
        )}

        {activeTab === "kazna" && (
          <KaznaOborot user={user} kazna={kazna} selZhes={selZhes} selYear={selYear} selMonth={selMonth} onRefresh={loadData} />
        )}

        {activeTab === "manager" && user.role === "admin" && (
          <ManagerDashboard />
        )}

        {activeTab === "admin" && user.role === "admin" && (
          <AdminPanel />
        )}
      </main>

      <footer className="text-center py-4 text-xs text-gray-400 no-print">
        ЖЭУ-1 • Система учёта текущего ремонта • {currentYear}
      </footer>
    </div>
  );
}