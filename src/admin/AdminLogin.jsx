import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    if (email === "admin@wishjinny.com" && password === "admin123") {
      localStorage.setItem("wishjinny_admin_logged_in", "yes");
      navigate("/admin/dashboard");
    } else {
      setError("Galat email ya password. Dobara koshish karein.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-amber-50 px-5">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-3xl border border-indigo-100 bg-white p-8 shadow-2xl shadow-indigo-100/60"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-700 to-violet-600 text-4xl shadow-lg">
            🧞
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Wish Jinny Admin
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Super Admin Panel me login karein
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <label className="mb-1 block text-sm font-semibold text-slate-700">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
          placeholder="admin@wishjinny.com"
          required
        />

        <label className="mb-1 block text-sm font-semibold text-slate-700">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
          placeholder="admin123"
          required
        />

        <button
          type="submit"
          className="w-full rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-800"
        >
          Login
        </button>
      </form>
    </div>
  );
}
