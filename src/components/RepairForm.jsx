import { useState, useEffect, useRef, useMemo } from 'react';
import { WORK_PLACES } from '../utils/constants';

// Компонент автокомплита расценок
function AutocompleteSelect({ rates, value, onChange, onSelect }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setQuery(value || ""); }, [value]);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    if (!query) return rates.slice(0, 60);
    const q = query.toLowerCase().trim();
    return rates.filter(r =>
      r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
    ).slice(0, 60);
  }, [query, rates]);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        placeholder="Введите код или название расценки..."
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); onChange(e.target.value); }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1">
          {filtered.map((r, i) => (
            <div
              key={r.code + i}
              className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-50 last:border-0"
              onClick={() => { setQuery(r.code); setOpen(false); onSelect(r); }}
            >
              <span className="font-mono font-semibold text-blue-700">{r.code}</span>
              <span className="text-gray-500 ml-2">— {r.name}</span>
              <span className="text-gray-400 ml-1 text-xs">({r.unit})</span>
            </div>
          ))}
        </div>
      )}
      {open && query && filtered.length === 0 && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-3 mt-1 text-sm text-gray-500">
          Ничего не найдено
        </div>
      )}
    </div>
  );
}

export default function RepairForm({ rates, zhes, year, month, onSave }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    rateCode: "", rateName: "", rateUnit: "",
    volume: "", address: "", workPlace: "",
    customPlace: "", master: "", executor: "", date: today,
    materials: []
  });
  const [saving, setSaving] = useState(false);

  const handleRateSelect = (rate) => {
    setForm(f => ({ ...f, rateCode: rate.code, rateName: rate.name, rateUnit: rate.unit }));
  };

  const addMaterial = () => {
    setForm(f => ({
      ...f,
      materials: [...f.materials, { id: Date.now(), invNum: "", materialName: "", matReport: "" }]
    }));
  };

  const updateMaterial = (id, field, value) => {
    setForm(f => ({
      ...f,
      materials: f.materials.map(m => m.id === id ? { ...m, [field]: value } : m)
    }));
  };

  const removeMaterial = (id) => {
    setForm(f => ({ ...f, materials: f.materials.filter(m => m.id !== id) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.rateCode || !form.volume || !form.address || !form.master || !form.executor) {
      alert("Заполните все обязательные поля!");
      return;
    }
    setSaving(true);
    try {
      const workPlace = form.workPlace === "Свой вариант" ? form.customPlace : form.workPlace;
      const record = {
        zhes, year, month: parseInt(month),
        rateCode: form.rateCode,
        rateName: form.rateName,
        rateUnit: form.rateUnit,
        volume: parseFloat(form.volume),
        address: form.address,
        workPlace,
        master: form.master,
        executor: form.executor,
        date: form.date,
        materials: form.materials.map(m => ({
          invNum: m.invNum, materialName: m.materialName, matReport: m.matReport
        })),
        createdAt: new Date().toISOString()
      };
      await onSave(record);
      setForm({
        rateCode: "", rateName: "", rateUnit: "",
        volume: "", address: "", workPlace: "",
        customPlace: "", master: "", executor: "", date: today,
        materials: []
      });
    } catch (err) {
      console.error("Ошибка сохранения:", err);
      alert("Ошибка при сохранении");
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 fade-in">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Добавить работу
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Код расценки (шифр) *</label>
          <AutocompleteSelect rates={rates} value={form.rateCode}
            onChange={v => setForm(f => ({ ...f, rateCode: v }))}
            onSelect={handleRateSelect} />
        </div>
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Наименование работы</label>
          <input type="text" readOnly value={form.rateName}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ед. измерения</label>
          <input type="text" readOnly value={form.rateUnit}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Объём работ *</label>
          <input type="number" step="0.01" min="0" value={form.volume}
            onChange={e => setForm(f => ({ ...f, volume: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Адрес объекта *</label>
          <input type="text" value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Место работы</label>
          <select value={form.workPlace}
            onChange={e => setForm(f => ({ ...f, workPlace: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">— Выберите —</option>
            {WORK_PLACES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {form.workPlace === "Свой вариант" && (
            <input type="text" value={form.customPlace}
              onChange={e => setForm(f => ({ ...f, customPlace: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ответственный мастер *</label>
          <input type="text" value={form.master}
            onChange={e => setForm(f => ({ ...f, master: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Исполнитель *</label>
          <input type="text" value={form.executor}
            onChange={e => setForm(f => ({ ...f, executor: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
          <input type="date" value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      <div className="mt-6 border-t border-gray-100 pt-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
            Списание материалов
          </h4>
          <button type="button" onClick={addMaterial}
            className="text-sm bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors font-semibold flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Добавить материал
          </button>
        </div>
        {form.materials.length === 0 ? (
          <div className="text-sm text-gray-400 italic bg-gray-50 rounded-lg p-3 text-center">
            Материалы не добавлены. Нажмите «Добавить материал» для списания.
          </div>
        ) : (
          <div className="space-y-3">
            {form.materials.map((m, idx) => (
              <div key={m.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-orange-50/50 border border-orange-100 rounded-lg p-3">
                <div className="md:col-span-1 text-sm text-gray-500 font-semibold">#{idx+1}</div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Инв. №</label>
                  <input type="text" value={m.invNum}
                    onChange={e => updateMaterial(m.id, "invNum", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none"
                    placeholder="Напр.: М-001" />
                </div>
                <div className="md:col-span-5">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Название материала</label>
                  <input type="text" value={m.materialName}
                    onChange={e => updateMaterial(m.id, "materialName", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none"
                    placeholder="Напр.: Кирпич керамический" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Мат. отчёт (ФИО)</label>
                  <input type="text" value={m.matReport}
                    onChange={e => updateMaterial(m.id, "matReport", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none"
                    placeholder="Фамилия" />
                </div>
                <div className="md:col-span-1 flex items-end">
                  <button type="button" onClick={() => removeMaterial(m.id)}
                    className="text-red-400 hover:text-red-600 p-2 transition-colors" title="Удалить материал">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end">
        <button type="submit" disabled={saving}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2">
          {saving ? "Сохранение..." : (
            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Сохранить работу</>
          )}
        </button>
      </div>
    </form>
  );
}