// src/vendor/VendorDashboard.jsx
// Wish Jinny - Vendor Dashboard

import { useEffect, useState } from "react";
import {
  fetchVendorDashboardStats,
  fetchVendorOrders,
  fetchVendorProducts,
  exportVendorCSV,
  exportVendorExcel,
  exportVendorPDF,
} from "../utils/api.jsx";

export default function VendorDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    pendingOrders: 0,
  });

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState("");
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const [statsResponse, ordersResponse, productsResponse] =
        await Promise.all([
          fetchVendorDashboardStats(),
          fetchVendorOrders({ page: 1, limit: 5 }),
          fetchVendorProducts({ page: 1, limit: 5 }),
        ]);

      setStats({
        totalRevenue: statsResponse?.totalRevenue || 0,
        totalOrders: statsResponse?.totalOrders || 0,
        totalProducts: statsResponse?.totalProducts || 0,
        pendingOrders: statsResponse?.pendingOrders || 0,
      });

      setOrders(ordersResponse?.items || ordersResponse || []);
      setProducts(productsResponse?.items || productsResponse || []);
    } catch (err) {
      console.error(err);
      setError("Vendor dashboard data load nahi ho paaya.");
      setOrders([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleExport = async (type) => {
    setExporting(type);
    setError("");

    try {
      if (type === "csv") {
        await exportVendorCSV();
      }

      if (type === "excel") {
        await exportVendorExcel();
      }

      if (type === "pdf") {
        await exportVendorPDF();
      }
    } catch (err) {
      console.error(err);
      setError(`${type.toUpperCase()} export nahi ho paaya.`);
    } finally {
      setExporting("");
    }
  };

  const formatPrice = (value) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  };

  return (
    <main className="vendor-dashboard px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-indigo-950">
            Vendor Dashboard
          </h1>

          <p className="mt-1 text-gray-600">
            Apne store, orders aur products ka overview dekhein.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
          className="rounded-md bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <p className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
        </p>
      )}

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
          <p className="mt-2 text-2xl font-bold text-indigo-900">
            {formatPrice(stats.totalRevenue)}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Total Orders</h3>
          <p className="mt-2 text-2xl font-bold text-indigo-900">
            {stats.totalOrders}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Total Products</h3>
          <p className="mt-2 text-2xl font-bold text-indigo-900">
            {stats.totalProducts}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Pending Orders</h3>
          <p className="mt-2 text-2xl font-bold text-indigo-900">
            {stats.pendingOrders}
          </p>
        </div>
      </section>

      <section className="mb-8 overflow-hidden rounded-lg border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-xl font-bold text-indigo-950">Recent Orders</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-5 py-3 font-semibold">Order ID</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Date</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {!loading && orders.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="px-5 py-8 text-center text-gray-500"
                  >
                    No recent orders
                  </td>
                </tr>
              )}

              {orders.map((order) => (
                <tr key={order.id || order._id}>
                  <td className="px-5 py-3 font-medium">
                    #{order.id || order._id}
                  </td>

                  <td className="px-5 py-3">
                    {order.customerName || order.customer?.name || "—"}
                  </td>

                  <td className="px-5 py-3">
                    {formatPrice(order.total || order.amount)}
                  </td>

                  <td className="px-5 py-3 capitalize">
                    {order.status || "pending"}
                  </td>

                  <td className="px-5 py-3">
                    {order.date || order.createdAt || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8 overflow-hidden rounded-lg border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-xl font-bold text-indigo-950">My Products</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-5 py-3 font-semibold">Product</th>
                <th className="px-5 py-3 font-semibold">Price</th>
                <th className="px-5 py-3 font-semibold">Stock</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {!loading && products.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="px-5 py-8 text-center text-gray-500"
                  >
                    No products
                  </td>
                </tr>
              )}

              {products.map((product) => (
                <tr key={product.id || product._id}>
                  <td className="px-5 py-3 font-medium">
                    {product.name || product.title || "Untitled Product"}
                  </td>

                  <td className="px-5 py-3">
                    {formatPrice(product.price)}
                  </td>

                  <td className="px-5 py-3">
                    {product.stock ?? product.quantity ?? 0}
                  </td>

                  <td className="px-5 py-3 capitalize">
                    {product.status || "active"}
                  </td>

                  <td className="px-5 py-3">
                    <button
                      type="button"
                      className="text-indigo-700 hover:text-indigo-900 hover:underline"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => handleExport("csv")}
          disabled={Boolean(exporting)}
          className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exporting === "csv" ? "Exporting..." : "Export CSV"}
        </button>

        <button
          type="button"
          onClick={() => handleExport("excel")}
          disabled={Boolean(exporting)}
          className="rounded-md bg-green-700 px-4 py-2 text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exporting === "excel" ? "Exporting..." : "Export Excel"}
        </button>

        <button
          type="button"
          onClick={() => handleExport("pdf")}
          disabled={Boolean(exporting)}
          className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exporting === "pdf" ? "Exporting..." : "Export PDF"}
        </button>
      </section>
    </main>
  );
}