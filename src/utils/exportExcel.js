import * as XLSX from 'xlsx';

export function exportToExcel(repairs, title) {
  if (!repairs.length) { 
    alert("Нет данных для экспорта"); 
    return; 
  }
  
  const wb = XLSX.utils.book_new();
  
  // Лист 1 — Работы
  const header = ["№", "Дата", "Шифр", "Наименование работы", "Ед.изм.", "Объём", "Адрес", "Место работы", "Мастер", "Исполнитель"];
  const data = repairs.map((r, i) => [
    i + 1, r.date || "", r.rateCode || "", r.rateName || "", r.rateUnit || "",
    r.volume || "", r.address || "", r.workPlace || "", r.master || "", r.executor || ""
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
  ws['!cols'] = [{wch:5},{wch:12},{wch:14},{wch:45},{wch:10},{wch:10},{wch:30},{wch:16},{wch:25},{wch:25}];
  ws['!autofilter'] = { ref: `A1:J${data.length + 1}` };
  XLSX.utils.book_append_sheet(wb, ws, "Работы");

  // Лист 2 — Материалы
  const matHeader = ["№ работы", "Шифр", "Адрес", "Инв. №", "Название материала", "Мат. отчёт (ФИО)"];
  const matData = [];
  repairs.forEach((r, i) => {
    if (r.materials && r.materials.length > 0) {
      r.materials.forEach(m => {
        matData.push([i + 1, r.rateCode, r.address, m.invNum, m.materialName, m.matReport]);
      });
    }
  });
  if (matData.length > 0) {
    const ws2 = XLSX.utils.aoa_to_sheet([matHeader, ...matData]);
    ws2['!cols'] = [{wch:10},{wch:14},{wch:30},{wch:14},{wch:40},{wch:25}];
    ws2['!autofilter'] = { ref: `A1:F${matData.length + 1}` };
    XLSX.utils.book_append_sheet(wb, ws2, "Материалы");
  }

  XLSX.writeFile(wb, `${title || "Отчёт_ЖЭУ-1"}.xlsx`);
}