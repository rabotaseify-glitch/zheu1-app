import { useState, useMemo } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { MONTHS, CONTRACT_STAGES } from '../utils/constants';
import * as XLSX from 'xlsx';
import { MONTHS, CONTRACT_STAGES, ZHEU_LIST } from '../utils/constants';

export default function KaznaOborot({ user, kazna, selZhes, setSelZhes, selYear, selMonth, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    docName: "", object: "", turnover: "", stage: "concluded", note: ""
  });

  const filtered = useMemo(() => {
    return kazna.filter(k =>
      (user?.role === "master" ? k.zhes === user?.zhes : k.zhes === selZhes) &&
      k.year === selYear && k.month === selMonth
    );
  }, [kazna, selZhes, selYear, selMonth, user]);

  const openAdd = () => {
    setEditItem(null);
    setForm({ docName: "", object: "", turnover: "", stage: "concluded", note: "" });
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      docName: item.docName, object: item.object,
      turnover: item.turnover, stage: item.stage, note: item.note || ""
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.docName || !form.object || !form.turnover) {
      alert("Заполните все обязательные поля");
      return;
    }
    const zhes = user?.role === "master" ? user?.zhes : selZhes;
    try {
      if (editItem) {
        await updateDoc(doc(db, "kazna", editItem.id), form);
      } else {
        await addDoc(collection(db, "kazna"), {
          zhes, year: selYear, month: selMonth,
          ...form, turnover: parseFloat(form.turnover),
          createdAt: new Date().toISOString()
        });
      }
      setShowForm(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Ошибка сохранения:", err);
      alert("Ошибка при сохранении");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Удалить запись?")) return;
    try {
      await deleteDoc(doc(db, "kazna", id));
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Ошибка удаления:", err);
      alert("Ошибка при удалении");
    }
  };

  const handleExport = () => {
    if (!filtered.length) { alert("Нет данных"); return; }
    const wb = XLSX.utils.book_new();
    const header = ["№", "Сметная документация", "Объект", "Оборот (руб.)", "Стадия договора", "Примечание"];
    const data = filtered.map((k, i) => [
      i + 1, k.docName, k.object, k.turnover,
      CONTRACT_STAGES.find(s => s.id === k.stage)?.label || k.stage,
      k.note || ""
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{wch:5},{wch:35},{wch:35},{wch:15},{wch:22},{wch:25}];
    ws['!autofilter'] = { ref: `A1:F${data.length + 1}` };
    XLSX.utils.book_append_sheet(wb, ws, "Казна оборот");
    XLSX.writeFile(wb, `Казна_оборот_${selZhes}_${MONTHS[selMonth-1]}_${selYear}.xlsx`);
  };

  const stageStats = useMemo(() => {
    const stats = {};
    CONTRACT_STAGES.forEach(s => stats[s.id] = { count: 0, sum: 0 });
    filtered.forEach(k => {
      if (stats[k.stage]) {
        stats[k.stage].count++;
        stats[k.stage].sum += k.turnover;
      }
    });
    return stats;
  }, [filtered]);

  const totalTurnover = filtered.reduce((s, k) => s + k.turnover, 0);

  return (
    <div className="space-y-5 fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-wrap items-end gap-4">
          {user?.role === "master" ? (
{user?.role === "master" ? (
  <div className="px-4 py-2.5 bg-purple-50 text-purple-800 rounded-lg font-semibold text-sm">
    {user?.zhes}
  </div>
) : (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">ЖЭС</label>
    <select
      value={selZhes}
      onChange={e => setSelZhes(e.target.value)}
      className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-purple-500 outline-none bg-purple-50 text-purple-800">
      {ZHEU_LIST.map(z => <option key={z} value={z}>{z}</option>)}
    </select>
  </div>
)}
) : (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">ЖЭС</label>
    <select 
      value={selZhes} 
      onChange={e => setSelZhes(e.target.value)}
      className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-purple-500 outline-none bg-purple-50 text-purple-800"
    >
      {ZHEU_LIST.map(z => <option key={z} value={z}>{z}</option>)}
    </select>
  </div>
)}
            <label className="block text-sm font-medium text-gray-700 mb-1">Год</label>
            <div className="px-4 py-2.5 bg-gray-50 rounded-lg text-sm font-semibold">{selYear}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Месяц</label>
            <div className="px-4 py-2.5 bg-gray-50 rounded-lg text-sm font-semibold">{MONTHS[selMonth-1]}</div>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={handleExport}
              className="bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V16a2 2 0 01-2 2z"/>
              </svg>
              Excel
            </button>
            <button onClick={openAdd}
              className="bg-purple-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              Добавить запись
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {CONTRACT_STAGES.map(s => (
          <div key={s.id} className={`rounded-xl p-3 border ${s.cls} border-opacity-30`}>
            <div className="text-xs font-semibold opacity-80">{s.label}</div>
            <div className="text-xl font-bold mt-1">{stageStats[s.id].count}</div>
            <div className="text-xs opacity-70">{stageStats[s.id].sum.toFixed(2)} руб.</div>
          </div>
        ))}
        <div className="bg-white rounded-xl p-3 border border-gray-200">
          <div className="text-xs font-semibold text-gray-500">Всего оборот</div>
          <div className="text-xl font-bold mt-1 text-gray-800">{filtered.length}</div>
          <div className="text-xs text-gray-500">{totalTurnover.toFixed(2)} руб.</div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-5 fade-in">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            {editItem ? "Редактировать запись" : "Новая запись казны оборота"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Сметная документация *</label>
              <input type="text" value={form.docName}
                onChange={e => setForm(f => ({ ...f, docName: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Напр.: Смета №123 от 01.01.2026" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Объект *</label>
              <input type="text" value={form.object}
                onChange={e => setForm(f => ({ ...f, object: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Адрес объекта" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Оборот (руб.) *</label>
              <input type="number" step="0.01" min="0" value={form.turnover}
                onChange={e => setForm(f => ({ ...f, turnover: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Стадия договора *</label>
              <select value={form.stage}
                onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                {CONTRACT_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Примечание</label>
              <input type="text" value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Отмена</button>
            <button onClick={handleSave}
              className="bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors">
              {editItem ? "Сохранить" : "Добавить"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">
            Казна оборот <span className="text-purple-600">({filtered.length})</span>
          </h3>
        </div>
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400">Нет записей за выбранный период</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">№</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Сметная документация</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Объект</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-600">Оборот, руб.</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Стадия договора</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Примечание</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-600">⚙</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((k, i) => {
                  const stage = CONTRACT_STAGES.find(s => s.id === k.stage);
                  return (
                    <tr key={k.id} className="border-t border-gray-50 hover:bg-purple-50/30 transition-colors">
                      <td className="px-3 py-2.5 text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2.5 text-gray-800 font-semibold">{k.docName}</td>
                      <td className="px-3 py-2.5 text-gray-700 max-w-xs truncate" title={k.object}>{k.object}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-gray-800">{k.turnover.toFixed(2)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${stage?.cls || ""}`}>
                          {stage?.label || k.stage}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 max-w-xs truncate">{k.note || "—"}</td>
                      <td className="px-3 py-2.5 text-center">
                        <button onClick={() => openEdit(k)} className="text-blue-500 hover:text-blue-700 mr-2" title="Редактировать">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(k.id)} className="text-red-400 hover:text-red-600" title="Удалить">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                  <td colSpan="3" className="px-3 py-3 text-right text-gray-700">ИТОГО:</td>
                  <td className="px-3 py-3 text-right text-purple-800">{totalTurnover.toFixed(2)}</td>
                  <td colSpan="3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}