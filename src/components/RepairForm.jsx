import { useState, useEffect } from 'react';
import { WORK_PLACES } from '../utils/constants';

const UNIT_SUGGESTIONS = ["м2", "м3", "м.п.", "шт.", "компл.", "т", "кг", "ч/ч", "100 м2", "10 шт."];

const getSavedList = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

const saveToHistory = (key, val) => {
  if (!val || !val.trim()) return;
  const clean = val.trim();
  const list = getSavedList(key);
  const updated = [clean, ...list.filter(x => x.toLowerCase() !== clean.toLowerCase())].slice(0, 40);
  localStorage.setItem(key, JSON.stringify(updated));
};

export default function RepairForm({ zhes, year, month, user, editingRepair, onCancelEdit, onSave }) {
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    rateName: "",
    rateUnit: "",
    volume: "",
    address: "",
    workPlace: "",
    customPlace: "",
    master: user?.role === "master" ? (user?.fullName || "") : "",
    executor: "",
    date: today,
    materials: []
  });
  const [saving, setSaving] = useState(false);

  const [workHistory, setWorkHistory] = useState(() => getSavedList("zheu1_works_history"));
  const [addressHistory, setAddressHistory] = useState(() => getSavedList("zheu1_addr_history"));
  const [masterHistory, setMasterHistory] = useState(() => getSavedList("zheu1_master_history"));
  const [execHistory, setExecHistory] = useState(() => getSavedList("zheu1_exec_history"));

  useEffect(() => {
    if (editingRepair) {
      const isStandardPlace = WORK_PLACES.includes(editingRepair.workPlace);
      setForm({
        rateName: editingRepair.rateName || "",
        rateUnit: editingRepair.rateUnit || "",
        volume: editingRepair.volume ?? "",
        address: editingRepair.address || "",
        workPlace: isStandardPlace ? editingRepair.workPlace : (editingRepair.workPlace ? "Свой вариант" : ""),
        customPlace: isStandardPlace ? "" : (editingRepair.workPlace || ""),
        master: editingRepair.master || "",
        executor: editingRepair.executor || "",
        date: editingRepair.date || today,
        materials: (editingRepair.materials || []).map((m, idx) => ({
          id: Date.now() + idx,
          invNum: m.invNum || "",
          materialName: m.materialName || "",
          matReport: m.matReport || ""
        }))
      });
    }
  }, [editingRepair, today]);

  const addMaterial = () => {
    setForm(f => ({
      ...f,
      materials: [...f.materials, { id: Date.now(), invNum: "", materialName: "", matReport: f.master || "" }]
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
    const cleanVol = String(form.volume).replace(",", ".");
    if (!form.rateName.trim() || !form.rateUnit.trim() || !cleanVol || !form.address.trim() || !form.master.trim() || !form.executor.trim()) {
      alert("Заполните все обязательные поля!");
      return;
    }
    setSaving(true);
    try {
      const workPlace = form.workPlace === "Свой вариант" ? form.customPlace.trim() : form.workPlace;
      const record = {
        zhes,
        year,
        month: parseInt(month),
        rateCode: "", // Шифр убран по требованию, оставлено пустое поле для совместимости со старыми записями
        rateName: form.rateName.trim(),
        rateUnit: form.rateUnit.trim(),
        volume: parseFloat(cleanVol),
        address: form.address.trim(),
        workPlace,
        master: form.master.trim(),
        executor: form.executor.trim(),
        date: form.date,
        materials: form.materials.map(m => ({
          invNum: m.invNum.trim(),
          materialName: m.materialName.trim(),
          matReport: m.matReport.trim()
        })),
        updatedAt: new Date().toISOString()
      };

      if (!editingRepair?.id) {
        record.createdAt = new Date().toISOString();
      }

      // Сохраняем в быстрые подсказки браузера
      saveToHistory("zheu1_works_history", form.rateName);
      saveToHistory("zheu1_addr_history", form.address);
      saveToHistory("zheu1_master_history", form.master);
      saveToHistory("zheu1_exec_history", form.executor);
      setWorkHistory(getSavedList("zheu1_works_history"));
      setAddressHistory(getSavedList("zheu1_addr_history"));
      setMasterHistory(getSavedList("zheu1_master_history"));
      setExecHistory(getSavedList("zheu1_exec_history"));

      await onSave(record, editingRepair?.id || null);

      setForm({
        rateName: "",
        rateUnit: "",
        volume: "",
        address: "",
        workPlace: "",
        customPlace: "",
        master: user?.role === "master" ? (user?.fullName || form.master) : form.master,
        executor: "",
        date: today,
        materials: []
      });
    } catch (err) {
      console.error("Ошибка сохранения:", err);
      alert("Ошибка при сохранении");
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className={`bg-white rounded-xl shadow-sm border p-5 fade-in ${editingRepair?.id ? "border-amber-400 ring-2 ring-amber-100" : "border-gray-100"}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={editingRepair?.id ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" : "M12 4v16m8-8H4"} />
          </svg>
          {editingRepair?.id ? "Редактирование работы" : editingRepair?.isDuplicate ? "Дублирование работы (проверьте данные)" : "Добавить работу"}
        </h3>
        {editingRepair && (
          <button type="button" onClick={onCancelEdit} className="text-sm text-gray-500 hover:text-gray-800 font-medium">
            ✕ Отменить
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Наименование работы *</label>
          <input
            type="text"
            required
            list="workNameSuggestions"
            placeholder="Введите наименование выполненной работы..."
            value={form.rateName}
            onChange={e => setForm(f => ({ ...f, rateName: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <datalist id="workNameSuggestions">
            {workHistory.map((w, i) => <option key={i} value={w} />)}
          </datalist>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ед. измерения *</label>
          <input
            type="text"
            required
            list="unitSuggestions"
            placeholder="м2, м.п., шт..."
            value={form.rateUnit}
            onChange={e => setForm(f => ({ ...f, rateUnit: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <datalist id="unitSuggestions">
            {UNIT_SUGGESTIONS.map(u => <option key={u} value={u} />)}
          </datalist>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Объём работ *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="0.00"
            value={form.volume}
            onChange={e => setForm(f => ({ ...f, volume: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Адрес объекта *</label>
          <input
            type="text"
            required
            list="addressSuggestions"
            placeholder="Напр.: ул. Слободская, 15"
            value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <datalist id="addressSuggestions">
            {addressHistory.map((a, i) => <option key={i} value={a} />)}
          </datalist>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Место работы</label>
          <select
            value={form.workPlace}
            onChange={e => setForm(f => ({ ...f, workPlace: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">— Выберите —</option>
            {WORK_PLACES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {form.workPlace === "Свой вариант" && (
            <input
              type="text"
              placeholder="Укажите место работы..."
              value={form.customPlace}
              onChange={e => setForm(f => ({ ...f, customPlace: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ответственный мастер *</label>
          <input
            type="text"
            required
            list="masterSuggestions"
            placeholder="ФИО мастера"
            value={form.master}
            onChange={e => setForm(f => ({ ...f, master: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <datalist id="masterSuggestions">
            {masterHistory.map((m, i) => <option key={i} value={m} />)}
          </datalist>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Исполнитель *</label>
          <input
            type="text"
            required
            list="execSuggestions"
            placeholder="ФИО рабочего / бригада"
            value={form.executor}
            onChange={e => setForm(f => ({ ...f, executor: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <datalist id="execSuggestions">
            {execHistory.map((ex, i) => <option key={i} value={ex} />)}
          </datalist>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
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
          <button
            type="button"
            onClick={addMaterial}
            className="text-sm bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors font-semibold flex items-center gap-1"
          >
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
                <div className="md:col-span-1 text-sm text-gray-500 font-semibold flex items-center">#{idx + 1}</div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Инв. №</label>
                  <input
                    type="text"
                    value={m.invNum}
                    onChange={e => updateMaterial(m.id, "invNum", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none"
                    placeholder="Напр.: М-001"
                  />
                </div>
                <div className="md:col-span-5">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Название материала</label>
                  <input
                    type="text"
                    value={m.materialName}
                    onChange={e => updateMaterial(m.id, "materialName", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none"
                    placeholder="Напр.: Краска акриловая, 5 кг"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Мат. отчёт (ФИО)</label>
                  <input
                    type="text"
                    value={m.matReport}
                    onChange={e => updateMaterial(m.id, "matReport", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none"
                    placeholder="Фамилия"
                  />
                </div>
                <div className="md:col-span-1 flex items-end">
                  <button
                    type="button"
                    onClick={() => removeMaterial(m.id)}
                    className="text-red-400 hover:text-red-600 p-2 transition-colors"
                    title="Удалить материал"
                  >
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

      <div className="mt-5 flex justify-end gap-2">
        {editingRepair && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Отмена
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? "Сохранение..." : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
              {editingRepair?.id ? "Сохранить изменения" : "Сохранить работу"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}