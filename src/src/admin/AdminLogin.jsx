// src/admin/AdminLogin.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminData } from "./AdminData";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { adminPassword } = useAdminData();

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (event) => {
    event.preventDefault();

    if (password === adminPassword) {
      localStorage.setItem("wishjinny_admin_logged_in", "yes");
      navigate("/admin/dashboard");
    } else {
      setError("Galat password. Dobara try karein.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-5 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-3xl shadow-lg">
            🧞
          </div>

          <h1 className="text-2xl font-bold text-white">
            Wish Jinny Admin
          </h1>

          <p className="mt-2 text-sm text-slate-300">
            Apne website dashboard mein login karein.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Admin Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter admin password"
              className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
              required
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-indigo-500 hover:to-violet-500"
          >
            Login to Dashboard
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Wish Jinny Admin Panel
        </p>
      </div>
    </div>
  );
}
