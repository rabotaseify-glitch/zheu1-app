import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const ADMIN_EMAIL = "admin@zheu1.by"; // главный админ — профиль создастся сам

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const mail = email.trim().toLowerCase();
    try {
      // 1) проверяем пароль в Firebase Authentication
      await signInWithEmailAndPassword(auth, mail, pass);

      // 2) ищем профиль в Firestore по email
      const q = query(collection(db, "users"), where("email", "==", mail));
      const snap = await getDocs(q);

      if (snap.empty) {
        // 2a) если это ГЛАВНЫЙ АДМИН и профиля ещё нет — создаём его автоматически
        if (mail === ADMIN_EMAIL) {
          const ref = await addDoc(collection(db, "users"), {
            email: mail,
            fullName: "Администратор системы",
            role: "admin",
            zhes: null,
            createdAt: new Date().toISOString()
          });
          onLogin({ id: ref.id, email: mail, fullName: "Администратор системы", role: "admin", zhes: null });
          return;
        }
        // 2b) для остальных — просим создать через админку
        setError("Профиль не найден. Войдите как админ и создайте этого пользователя в разделе «Админка» (email должен точно совпадать с email для входа).");
        await auth.signOut();
        return;
      }

      onLogin({ id: snap.docs[0].id, ...snap.docs[0].data() });
    } catch (err) {
      const c = err.code || "";
      if (c.includes("auth/")) setError("Неверный email или пароль");
      else if (c.includes("permission-denied")) setError("Нет доступа к базе — проверьте правила Firestore");
      else setError("Ошибка: " + (err.message || c));
      console.error("LOGIN:", c, err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-900 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">ЖЭУ-1</h1>
          <p className="text-gray-500 mt-1">Отчётность по текущему ремонту</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
            <input type="password" required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              value={pass} onChange={e => setPass(e.target.value)} autoComplete="current-password" />
          </div>
          {error && <p className="text-red-500 text-sm text-center bg-red-50 rounded-lg p-2">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
            {loading ? "Входим..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}