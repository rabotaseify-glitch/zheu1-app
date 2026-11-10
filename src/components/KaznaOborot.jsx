import { useState, useMemo } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CONTRACT_STAGES } from '../utils/constants';
import * as XLSX from 'xlsx';

export default function KaznaOborot({ kazna, selYear, setSelYear, years = [], onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    docName: "", object: "", plan: "", turnover: "", stage: "concluded", note: ""
  });

  const yearList = years.length
    ? years
    : Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  // Отбираем все договоры за выбранный год по всему ЖЭУ-1
  const filtered = useMemo(() => {
    return (kazna || []).filter(k => Number(k.year) === Number(selYear));
  }, [kazna, selYear]);

  const openAdd = () => {
    setEditItem(null);
    setForm({ docName: "", object: "", plan: "", turnover: "", stage: "concluded", note: "" });
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      docName: item.docName || "",
      object: item.object || "",
      plan: item.plan ?? "",
      turnover: item.turnover ?? "",
      stage: item.stage || "concluded",
      note: item.note || ""
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    const cleanPlan = String(form.plan).replace(",", ".").trim();
    const cleanTurnover = String(form.turnover).replace(",", ".").trim();

    if (!form.docName.trim() || !form.object.trim() || cleanPlan === "" || cleanTurnover === "") {
      alert("Заполните все обязательные поля (Смета, Объект, План по договору и Оборот)");
      return;
    }

    const numPlan = parseFloat(cleanPlan) || 0;
    const numTurnover = parseFloat(cleanTurnover) || 0;

    const payload = {
      zhes: "ЖЭУ-1",
      year: Number(selYear),
      docName: form.docName.trim(),
      object: form.object.trim(),
      plan: numPlan,
      turnover: numTurnover,
      stage: form.stage,
      note: form.note.trim(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (editItem) {
        await updateDoc(doc(db, "kazna", editItem.id), payload);
      } else {
        await addDoc(collection(db, "kazna"), {
          ...payload,
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
    const header = [
      "№",
      "Сметная документация",
      "Объект (адрес)",
      "План по договору (руб.)",
      "Оборот / Забрано (руб.)",
      "Остаток по договору (руб.)",
      "Стадия договора",
      "Примечание"
    ];
    const data = filtered.map((k, i) => {
      const planVal = Number(k.plan) || 0;
      const turnVal = Number(k.turnover) || 0;
      const diffVal = Number((planVal - turnVal).toFixed(2));
      return [
        i + 1,
        k.docName || "",
        k.object || "",
        planVal,
        turnVal,
        diffVal,
        CONTRACT_STAGES.find(s => s.id === k.stage)?.label || k.stage,
        k.note || ""
      ];
    });
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 25 }];
    ws['!autofilter'] = { ref: `A1:H${data.length + 1}` };
    XLSX.utils.book_append_sheet(wb, ws, "Казна оборот ЖЭУ-1");
    XLSX.writeFile(wb, `Казна_оборот_ЖЭУ-1_${selYear}.xlsx`);
  };

  const stageStats = useMemo(() => {
    const stats = {};
    CONTRACT_STAGES.forEach(s => stats[s.id] = { count: 0, plan: 0, sum: 0 });
    filtered.forEach(k => {
      const turnVal = Number(k.turnover) || 0;
      const planVal = Number(k.plan) || 0;
      if (stats[k.stage]) {
        stats[k.stage].count++;
        stats[k.stage].plan += planVal;
        stats[k.stage].sum += turnVal;
      }
    });
    return stats;
  }, [filtered]);

  const totalPlan = filtered.reduce((s, k) => s + (Number(k.plan) || 0), 0);
  const totalTurnover = filtered.reduce((s, k) => s + (Number(k.turnover) || 0), 0);
  const totalRemain = totalPlan - totalTurnover;

  return (
    <div className="space-y-5 fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Предприятие</label>
            <div className="px-4 py-2.5 bg-purple-50 text-purple-800 rounded-lg font-bold text-sm border border-purple-100">
              ЖЭУ-1 (Все ЖЭСы)
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Год</label>
            {setSelYear ? (
              <select
                value={selYear}
                onChange={e => setSelYear(parseInt(e.target.value))}
                className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
              >
                {yearList.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            ) : (
              <div className="px-4 py-2.5 bg-gray-50 rounded-lg text-sm font-semibold">{selYear}</div>
            )}
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
              Добавить договор
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {CONTRACT_STAGES.map(s => (
          <div key={s.id} className={`rounded-xl p-3 border ${s.cls} border-opacity-30`}>
            <div className="text-xs font-semibold opacity-80">{s.label}</div>
            <div className="text-xl font-bold mt-1">{stageStats[s.id]?.count || 0} дог.</div>
            <div className="text-xs opacity-80 mt-0.5">План: {(stageStats[s.id]?.plan || 0).toFixed(2)} р.</div>
            <div className="text-xs font-semibold opacity-90">Забрано: {(stageStats[s.id]?.sum || 0).toFixed(2)} р.</div>
          </div>
        ))}
        <div className="bg-white rounded-xl p-3 border border-purple-200 shadow-sm">
          <div className="text-xs font-semibold text-purple-700">Итого за {selYear} г.</div>
          <div className="text-xl font-bold mt-1 text-gray-800">{filtered.length} дог.</div>
          <div className="text-xs text-gray-600 mt-0.5">План: <span className="font-semibold">{totalPlan.toFixed(2)}</span> р.</div>
          <div className="text-xs text-emerald-700 font-semibold">Оборот: {totalTurnover.toFixed(2)} р.</div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-purple-200 p-5 fade-in">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            {editItem ? "Редактировать договор" : "Новый договор (Казна оборот — ЖЭУ-1)"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Сметная документация / № Договора *</label>
              <input type="text" value={form.docName}
                onChange={e => setForm(f => ({ ...f, docName: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Напр.: Договор №123 от 15.02.2026" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Объект (Адрес) *</label>
              <input type="text" value={form.object}
                onChange={e => setForm(f => ({ ...f, object: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Напр.: ул. Слободская, 15 (ЖЭС-127)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">План по договору (руб.) *</label>
              <input type="number" step="0.01" min="0" value={form.plan}
                onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Оборот — забрано денег (руб.) *</label>
              <input type="number" step="0.01" min="0" value={form.turnover}
                onChange={e => setForm(f => ({ ...f, turnover: e.target.value }))}
                placeholder="0.00"
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
            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Примечание</label>
              <input type="text" value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Дополнительная информация..." />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Отмена</button>
            <button onClick={handleSave}
              className="bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors">
              {editItem ? "Сохранить изменения" : "Добавить договор"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">
            Договоры ЖЭУ-1 за {selYear} год <span className="text-purple-600">({filtered.length})</span>
          </h3>
        </div>
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400">Нет договоров за {selYear} год</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">№</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Сметная документация</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Объект</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-600">План по дог., руб.</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-600">Оборот (забрано), руб.</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-600">Остаток, руб.</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Стадия договора</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Примечание</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-600">⚙</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((k, i) => {
                  const stage = CONTRACT_STAGES.find(s => s.id === k.stage);
                  const planVal = Number(k.plan) || 0;
                  const turnVal = Number(k.turnover) || 0;
                  const remainVal = planVal - turnVal;
                  return (
                    <tr key={k.id || i} className="border-t border-gray-50 hover:bg-purple-50/30 transition-colors">
                      <td className="px-3 py-2.5 text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2.5 text-gray-800 font-semibold">{k.docName}</td>
                      <td className="px-3 py-2.5 text-gray-700 max-w-xs truncate" title={k.object}>{k.object}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-gray-700">{planVal.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-700">{turnVal.toFixed(2)}</td>
                      <td className={`px-3 py-2.5 text-right font-semibold ${remainVal < 0 ? "text-red-600" : "text-gray-600"}`}>
                        {remainVal.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${stage?.cls || ""}`}>
                          {stage?.label || k.stage}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 max-w-xs truncate" title={k.note}>{k.note || "—"}</td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <button onClick={() => openEdit(k)} className="text-blue-500 hover:text-blue-700 mr-2" title="Редактировать">
                          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(k.id)} className="text-red-400 hover:text-red-600" title="Удалить">
                          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <td colSpan="3" className="px-3 py-3 text-right text-gray-700">ИТОГО ПО ЖЭУ-1:</td>
                  <td className="px-3 py-3 text-right text-gray-800">{totalPlan.toFixed(2)}</td>
                  <td className="px-3 py-3 text-right text-emerald-700">{totalTurnover.toFixed(2)}</td>
                  <td className="px-3 py-3 text-right text-purple-800">{totalRemain.toFixed(2)}</td>
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
