import { Outlet, NavLink, useNavigate } from "react-router-dom";

export default function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("wishjinny_admin_logged_in");
    navigate("/admin");
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white p-5">
        <div className="mb-8">
          <p className="text-lg font-bold text-slate-900">🧞 Wish Jinny</p>
          <p className="text-xs text-slate-500">Super Admin Panel</p>
        </div>

        <nav className="flex flex-1 flex-col gap-2">
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) =>
              `rounded-xl px-4 py-3 text-sm font-semibold ${
                isActive
                  ? "bg-indigo-700 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/admin/products"
            className={({ isActive }) =>
              `rounded-xl px-4 py-3 text-sm font-semibold ${
                isActive
                  ? "bg-indigo-700 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`
            }
          >
            Products
          </NavLink>
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
        >
          Logout
        </button>
      </aside>

      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
