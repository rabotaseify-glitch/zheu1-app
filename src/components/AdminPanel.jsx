import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ZHEU_LIST } from '../utils/constants';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({
    username: "", email: "", fullName: "", role: "master", zhes: ""
  });
  const [error, setError] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "users"));
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Ошибка загрузки пользователей:", err);
    }
  };

  const openAdd = () => {
    setEditUser(null);
    setForm({ username: "", email: "", fullName: "", role: "master", zhes: "" });
    setError("");
    setShowForm(true);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({
      username: u.username, email: u.email,
      fullName: u.fullName, role: u.role, zhes: u.zhes || ""
    });
    setError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.username || !form.email || !form.fullName) {
      setError("Заполните все обязательные поля");
      return;
    }
    if (form.role === "master" && !form.zhes) {
      setError("Для роли «Мастер» необходимо выбрать ЖЭС");
      return;
    }
    const exists = users.find(u => u.username === form.username && (!editUser || u.id !== editUser.id));
    if (exists) {
      setError("Пользователь с таким логином уже существует");
      return;
    }
    try {
      if (editUser) {
        await updateDoc(doc(db, "users", editUser.id), {
          ...form, zhes: form.role === "master" ? form.zhes : null
        });
      } else {
        await addDoc(collection(db, "users"), {
          ...form, zhes: form.role === "master" ? form.zhes : null,
          createdAt: new Date().toISOString()
        });
      }
      setShowForm(false);
      loadUsers();
    } catch (err) {
      console.error("Ошибка сохранения:", err);
      alert("Ошибка при сохранении");
    }
  };

  const handleDelete = async (id) => {
    const u = users.find(x => x.id === id);
    if (u?.username === "admin") {
      alert("Нельзя удалить главного администратора");
      return;
    }
    if (!confirm(`Удалить пользователя "${u?.username}"?`)) return;
    try {
      await deleteDoc(doc(db, "users", id));
      loadUsers();
    } catch (err) {
      console.error("Ошибка удаления:", err);
      alert("Ошибка при удалении");
    }
  };

  const roleLabels = {
    admin: { label: "Администратор", cls: "bg-red-100 text-red-800" },
    master: { label: "Мастер", cls: "bg-blue-100 text-blue-800" },
    smetchik: { label: "Сметчик", cls: "bg-purple-100 text-purple-800" },
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
            Управление учётными записями
          </h3>
          <button onClick={openAdd}
            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Создать пользователя
          </button>
        </div>

        {showForm && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-4 fade-in">
            <h4 className="font-semibold text-gray-800 mb-3">
              {editUser ? "Редактировать пользователя" : "Новый пользователь"}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Логин *</label>
                <input type="text" value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ФИО *</label>
                <input type="text" value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Роль *</label>
                <select value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value, zhes: e.target.value === "master" ? f.zhes : "" }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none">
                  <option value="master">Мастер (ЖЭС)</option>
                  <option value="smetchik">Сметчик</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
              {form.role === "master" && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Закреплённый ЖЭС *</label>
                  <select value={form.zhes}
                    onChange={e => setForm(f => ({ ...f, zhes: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none">
                    <option value="">— Выберите —</option>
                    {ZHEU_LIST.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
              )}
            </div>
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Отмена</button>
              <button onClick={handleSave}
                className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors">
                {editUser ? "Сохранить" : "Создать"}
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left font-semibold text-gray-600">Логин</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600">Email</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600">ФИО</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600">Роль</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600">ЖЭС</th>
                <th className="px-3 py-3 text-center font-semibold text-gray-600">⚙</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const role = roleLabels[u.role] || { label: u.role, cls: "bg-gray-100 text-gray-700" };
                return (
                  <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 font-semibold text-gray-800">{u.username}</td>
                    <td className="px-3 py-2.5 text-gray-600">{u.email}</td>
                    <td className="px-3 py-2.5 text-gray-700">{u.fullName}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${role.cls}`}>{role.label}</span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">{u.zhes || "—"}</td>
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={() => openEdit(u)} className="text-blue-500 hover:text-blue-700 mr-2" title="Редактировать">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-600" title="Удалить">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}