// src/admin/AdminLayout.jsx

import { Link, Outlet, useLocation } from "react-router-dom";
import { useAdminData } from "./AdminData";

export default function AdminLayout() {
  const { data } = useAdminData();

  const menuItems = [
    { name: "Dashboard", path: "/admin/dashboard" },
    { name: "Products", path: "/admin/products" },
    { name: "Add Product", path: "/admin/products/new" },
    { name: "About Page", path: "/admin/about" },
    { name: "Contact Page", path: "/admin/contact" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("wishjinny_admin_logged_in");
    window.location.href = "/admin";
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden w-72 flex-col border-r border-slate-200 bg-white p-6 md:flex">
        <div className="mb-8">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-2xl">
            🧞
          </div>

          <h1 className="text-lg font-bold text-slate-900">
            Wish Jinny Admin
          </h1>

          <p className="text-xs text-slate-500">
            Website Control Panel
          </p>
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="mt-6 border-t border-slate-200 pt-5">
          <p className="mb-3 text-xs text-slate-500">
            {data.products.length} products saved
          </p>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-slate-200 bg-white px-6 py-4 md:hidden">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold text-slate-900">
              Wish Jinny Admin
            </h1>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
            >
              Logout
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="p-6 md:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
