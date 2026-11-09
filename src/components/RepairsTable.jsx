import { useState, useMemo, Fragment } from 'react';

export default function RepairsTable({ repairs, onDelete, onExport }) {
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [expandedId, setExpandedId] = useState(null);

  const sorted = useMemo(() => {
    return [...repairs].sort((a, b) => {
      const va = a[sortField] || "";
      const vb = b[sortField] || "";
      if (sortDir === "asc") return va > vb ? 1 : -1;
      return va < vb ? 1 : -1;
    });
  }, [repairs, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }) => (
    <span className="ml-1 text-xs">{sortField === field ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}</span>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 fade-in">
      <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-gray-800">
          Записи за период <span className="text-blue-600">({repairs.length})</span>
        </h3>
        <button onClick={onExport}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V16a2 2 0 01-2 2z"/>
          </svg>
          Скачать в Excel
        </button>
      </div>
      {sorted.length === 0 ? (
        <div className="p-10 text-center text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          Нет записей. Добавьте первую работу.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-blue-600" onClick={() => toggleSort("date")}>Дата<SortIcon field="date"/></th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-blue-600" onClick={() => toggleSort("rateCode")}>Шифр<SortIcon field="rateCode"/></th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600">Наименование</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600">Ед.</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-600 cursor-pointer hover:text-blue-600" onClick={() => toggleSort("volume")}>Объём<SortIcon field="volume"/></th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600">Адрес</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600">Место</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600">Мастер</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600">Исполнитель</th>
                <th className="px-3 py-3 text-center font-semibold text-gray-600">Мат.</th>
                <th className="px-3 py-3 text-center font-semibold text-gray-600">⚙</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <Fragment key={r.id || i}>
                  <tr className="border-t border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{r.date}</td>
                    <td className="px-3 py-2.5 font-mono text-blue-700 font-semibold whitespace-nowrap">{r.rateCode}</td>
                    <td className="px-3 py-2.5 text-gray-700 max-w-xs truncate" title={r.rateName}>{r.rateName}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{r.rateUnit}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-800">{r.volume}</td>
                    <td className="px-3 py-2.5 text-gray-700 max-w-[150px] truncate" title={r.address}>{r.address}</td>
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{r.workPlace}</td>
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{r.master}</td>
                    <td className="px-3 py-2.5 text-gray-600 max-w-[120px] truncate" title={r.executor}>{r.executor}</td>
                    <td className="px-3 py-2.5 text-center">
                      {r.materials && r.materials.length > 0 ? (
                        <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                          className="text-orange-600 hover:text-orange-700 font-semibold text-xs bg-orange-50 px-2 py-1 rounded">
                          {r.materials.length} шт.
                        </button>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={() => onDelete(r.id)} className="text-red-400 hover:text-red-600 transition-colors" title="Удалить">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                  {expandedId === r.id && r.materials && r.materials.length > 0 && (
                    <tr>
                      <td colSpan="11" className="bg-orange-50/50 px-6 py-3">
                        <div className="text-xs font-semibold text-orange-700 mb-2">Списанные материалы:</div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-gray-600">
                              <th className="py-1 px-2">Инв. №</th>
                              <th className="py-1 px-2">Название материала</th>
                              <th className="py-1 px-2">Мат. отчёт (ФИО)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.materials.map((m, mi) => (
                              <tr key={mi} className="border-t border-orange-100">
                                <td className="py-1 px-2 font-mono text-gray-700">{m.invNum || "—"}</td>
                                <td className="py-1 px-2 text-gray-700">{m.materialName || "—"}</td>
                                <td className="py-1 px-2 text-gray-700">{m.matReport || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}