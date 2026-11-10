import { useState, useMemo, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { ZHEU_LIST, MONTHS } from '../utils/constants';
import * as XLSX from 'xlsx';

export default function ManagerDashboard() {
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [selMonth, setSelMonth] = useState(new Date().getMonth() + 1);
  const [allRepairs, setAllRepairs] = useState([]);
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  useEffect(() => {
    loadAllRepairs();
  }, [selYear, selMonth]);

  const loadAllRepairs = async () => {
    try {
      const q = query(
        collection(db, "repairs"),
        where("year", "==", selYear),
        where("month", "==", selMonth)
      );
      const snapshot = await getDocs(q);
      setAllRepairs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Ошибка загрузки данных:", err);
    }
  };

  const summary = useMemo(() => {
    const map = {};
    allRepairs.forEach(r => {
      if (!map[r.zhes]) map[r.zhes] = {};
      const key = `${(r.rateName || "").trim()}___${(r.rateUnit || "").trim()}`;
      if (!map[r.zhes][key]) {
        map[r.zhes][key] = {
          name: r.rateName,
          unit: r.rateUnit,
          total: 0,
          count: 0,
          addresses: new Set()
        };
      }
      map[r.zhes][key].total += Number(r.volume) || 0;
      map[r.zhes][key].count += 1;
      if (r.address && r.address.trim()) {
        map[r.zhes][key].addresses.add(r.address.trim());
      }
    });
    return map;
  }, [allRepairs]);

  const allKeys = useMemo(() => {
    const keys = new Set();
    allRepairs.forEach(r => {
      keys.add(`${(r.rateName || "").trim()}___${(r.rateUnit || "").trim()}`);
    });
    return [...keys].sort();
  }, [allRepairs]);

  const handleExportSummary = () => {
    if (!allRepairs.length) { alert("Нет данных"); return; }
    const wb = XLSX.utils.book_new();
    const header = [
      "№",
      "Наименование работы",
      "Ед.изм.",
      "Адреса объектов",
      ...ZHEU_LIST.map(z => z.replace("ЖЭС-", "ЖЭС №")),
      "Итого"
    ];
    const rows = allKeys.map((key, idx) => {
      const row = [idx + 1, "", "", "", ...ZHEU_LIST.map(() => ""), 0];
      let total = 0;
      const addrSet = new Set();

      ZHEU_LIST.forEach((z, zi) => {
        const entry = summary[z]?.[key];
        if (entry) {
          row[1] = entry.name;
          row[2] = entry.unit;
          row[4 + zi] = Number(entry.total.toFixed(2));
          total += entry.total;
          entry.addresses.forEach(a => addrSet.add(a));
        }
      });

      row[3] = [...addrSet].join("; ");
      row[row.length - 1] = Number(total.toFixed(2));
      return row;
    });
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 45 },
      { wch: 10 },
      { wch: 40 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 }
    ];
    ws['!autofilter'] = { ref: `A1:${String.fromCharCode(64 + header.length)}${rows.length + 1}` };
    XLSX.utils.book_append_sheet(wb, ws, "Сводная");
    XLSX.writeFile(wb, `Сводная_${MONTHS[selMonth - 1]}_${selYear}.xlsx`);
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          Сводная таблица по ЖЭСам
        </h3>
        <div className="flex flex-wrap items-end gap-4 mb-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Год</label>
            <select value={selYear} onChange={e => setSelYear(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Месяц</label>
            <select value={selMonth} onChange={e => setSelMonth(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <button onClick={handleExportSummary}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V16a2 2 0 01-2 2z"/>
            </svg>
            Экспорт сводной
          </button>
        </div>
        {allRepairs.length === 0 ? (
          <div className="text-center py-10 text-gray-400">Нет данных за выбранный период</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-purple-50">
                  <th className="px-3 py-3 text-left font-semibold text-purple-800 border border-purple-100">№</th>
                  <th className="px-3 py-3 text-left font-semibold text-purple-800 border border-purple-100">Наименование работы</th>
                  <th className="px-3 py-3 text-left font-semibold text-purple-800 border border-purple-100">Ед.</th>
                  <th className="px-3 py-3 text-left font-semibold text-purple-800 border border-purple-100">Адреса объектов</th>
                  {ZHEU_LIST.map(z => (
                    <th key={z} className="px-3 py-3 text-center font-semibold text-purple-800 border border-purple-100">{z}</th>
                  ))}
                  <th className="px-3 py-3 text-center font-bold text-purple-900 border border-purple-100 bg-purple-100">Итого</th>
                </tr>
              </thead>
              <tbody>
                {allKeys.map((key, idx) => {
                  let total = 0;
                  const firstEntry = ZHEU_LIST.map(z => summary[z]?.[key]).find(Boolean);
                  const allAddresses = new Set();
                  ZHEU_LIST.forEach(z => {
                    summary[z]?.[key]?.addresses?.forEach(a => allAddresses.add(a));
                  });
                  const addressesStr = [...allAddresses].join("; ");

                  return (
                    <tr key={key} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-500 border border-gray-100">{idx + 1}</td>
                      <td className="px-3 py-2 text-gray-800 font-medium border border-gray-100 max-w-md">{firstEntry?.name || ""}</td>
                      <td className="px-3 py-2 text-gray-500 border border-gray-100 whitespace-nowrap">{firstEntry?.unit || ""}</td>
                      <td className="px-3 py-2 text-gray-600 border border-gray-100 max-w-xs truncate" title={addressesStr}>
                        {addressesStr || "—"}
                      </td>
                      {ZHEU_LIST.map(z => {
                        const entry = summary[z]?.[key];
                        const val = entry ? Number(entry.total.toFixed(2)) : "";
                        total += entry ? entry.total : 0;
                        return (
                          <td key={z} className={`px-3 py-2 text-center border border-gray-100 font-semibold ${val ? "text-gray-800" : "text-gray-300"}`}>
                            {val || "—"}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center border border-gray-100 font-bold text-purple-800 bg-purple-50">
                        {total ? Number(total.toFixed(2)) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ZHEU_LIST.map(z => {
          const count = allRepairs.filter(r => r.zhes === z).length;
          const totalVol = allRepairs.filter(r => r.zhes === z).reduce((s, r) => s + (Number(r.volume) || 0), 0);
          return (
            <div key={z} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
              <div className="text-sm font-semibold text-gray-500">{z}</div>
              <div className="text-2xl font-bold text-blue-700 mt-1">{count}</div>
              <div className="text-xs text-gray-400">записей</div>
              <div className="text-lg font-semibold text-gray-700 mt-1">{totalVol.toFixed(1)}</div>
              <div className="text-xs text-gray-400">суммарный объём</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
