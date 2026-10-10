// src/admin/AdminDashboard.jsx

import { useEffect, useState } from "react";
import {
  fetchAlerts,
  fetchAuditLogs,
  fetchInventoryOverview,
  fetchOrders,
  fetchPayments,
  fetchReports,
  fetchSystemNotifications,
  fetchUsers,
  fetchVendors,
} from "../utils/api";

function AdminDashboard() {
  const [dashboard, setDashboard] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalCustomers: 0,
    totalVendors: 0,
    pendingVendorApprovals: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    activeReports: 0,
  });

  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);

  const getStatusClass = (status) => {
    const value = String(status || "").toLowerCase();

    if (
      ["completed", "success", "paid", "delivered", "active", "read"].includes(
        value
      )
    ) {
      return "bg-emerald-100 text-emerald-700";
    }

    if (
      [
        "pending",
        "processing",
        "in_progress",
        "scheduled",
        "unread",
        "investigating",
      ].includes(value)
    ) {
      return "bg-amber-100 text-amber-800";
    }

    if (
      ["failed", "cancelled", "rejected", "error", "out_of_stock"].includes(
        value
      )
    ) {
      return "bg-rose-100 text-rose-700";
    }

    return "bg-slate-100 text-slate-700";
  };

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled([
        fetchOrders({ page: 1, limit: 5, sort: "date" }),
        fetchSystemNotifications({ page: 1 }),
        fetchAuditLogs({ page: 1 }),
        fetchAlerts(),
        fetchInventoryOverview(),
        fetchVendors(),
        fetchUsers(),
        fetchPayments(),
        fetchReports(),
      ]);

      const [
        ordersResult,
        notificationsResult,
        auditLogsResult,
        alertsResult,
        inventoryResult,
        vendorsResult,
        usersResult,
        paymentsResult,
        reportsResult,
      ] = results;

      const orderItems =
        ordersResult.status === "fulfilled" ? ordersResult.value.items || [] : [];

      const paymentItems =
        paymentsResult.status === "fulfilled"
          ? paymentsResult.value.items || []
          : [];

      const vendorItems =
        vendorsResult.status === "fulfilled"
          ? vendorsResult.value.items || []
          : [];

      const userItems =
        usersResult.status === "fulfilled" ? usersResult.value.items || [] : [];

      const inventory =
        inventoryResult.status === "fulfilled"
          ? inventoryResult.value
          : {
              totalProducts: 0,
              lowStock: 0,
              outOfStock: 0,
            };

      const reportItems =
        reportsResult.status === "fulfilled"
          ? reportsResult.value.items || []
          : [];

      const totalRevenue = paymentItems
        .filter((payment) => payment.status === "completed")
        .reduce((total, payment) => total + (Number(payment.amount) || 0), 0);

      setDashboard({
        totalRevenue,
        totalOrders: orderItems.length,
        pendingOrders: orderItems.filter((order) =>
          ["pending", "processing"].includes(order.status)
        ).length,
        completedOrders: orderItems.filter(
          (order) => order.status === "delivered"
        ).length,
        totalCustomers: userItems.filter((user) => user.role === "customer")
          .length,
        totalVendors: vendorItems.length,
        pendingVendorApprovals: vendorItems.filter(
          (vendor) => vendor.status === "pending"
        ).length,
        totalProducts: inventory.totalProducts || 0,
        lowStockProducts: inventory.lowStock || 0,
        outOfStockProducts: inventory.outOfStock || 0,
        activeReports: reportItems.filter(
          (report) => report.status === "completed"
        ).length,
      });

      setOrders(orderItems);

      setNotifications(
        notificationsResult.status === "fulfilled"
          ? notificationsResult.value.items || []
          : []
      );

      setAuditLogs(
        auditLogsResult.status === "fulfilled"
          ? auditLogsResult.value.items || []
          : []
      );

      setAlerts(
        alertsResult.status === "fulfilled"
          ? alertsResult.value.items || []
          : []
      );

      if (results.some((result) => result.status === "rejected")) {
        setError(
          "Kuch dashboard data load nahi ho paaya. Refresh karke dobara try karein."
        );
      }

      setLastUpdated(new Date().toLocaleString("en-IN"));
    } catch (err) {
      console.error(err);
      setError("Dashboard data load nahi ho paaya.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const MetricCard = ({ label, value, color = "text-indigo-950" }) => (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value ?? 0}</p>
    </article>
  );

  return (
    <main className="admin-dashboard min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <section className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Wish Jinny Control Center
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-950 md:text-4xl">
            Super Admin Dashboard
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Revenue, orders, vendors, customers, inventory, platform activity
            aur operational alerts ka complete overview.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh Dashboard"}
          </button>

          {lastUpdated && (
            <p className="text-xs text-slate-500">
              Last updated: {lastUpdated}
            </p>
          )}
        </div>
      </section>

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm font-medium text-indigo-700">
          Dashboard data load ho raha hai...
        </div>
      )}

      <section className="mb-7">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">
            Business Overview
          </h2>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            Live summary
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total Revenue"
            value={formatCurrency(dashboard.totalRevenue)}
          />
          <MetricCard
            label="Total Orders"
            value={dashboard.totalOrders}
            color="text-blue-700"
          />
          <MetricCard
            label="Pending Orders"
            value={dashboard.pendingOrders}
            color="text-amber-600"
          />
          <MetricCard
            label="Delivered Orders"
            value={dashboard.completedOrders}
            color="text-emerald-600"
          />
          <MetricCard
            label="Customers"
            value={dashboard.totalCustomers}
            color="text-violet-700"
          />
          <MetricCard
            label="Vendors"
            value={dashboard.totalVendors}
            color="text-cyan-700"
          />
          <MetricCard
            label="Total Products"
            value={dashboard.totalProducts}
            color="text-indigo-700"
          />
          <MetricCard
            label="Low / Out of Stock"
            value={`${dashboard.lowStockProducts} / ${dashboard.outOfStockProducts}`}
            color="text-rose-600"
          />
        </div>
      </section>

      <section className="mb-7 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Vendor approvals pending
          </p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {dashboard.pendingVendorApprovals}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            New vendor applications requiring review.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Completed reports
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">
            {dashboard.activeReports}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Reports currently ready to review or export.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Inventory attention required
          </p>
          <p className="mt-2 text-3xl font-bold text-rose-600">
            {dashboard.lowStockProducts + dashboard.outOfStockProducts}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Low-stock and out-of-stock products combined.
          </p>
        </article>
      </section>

      <section className="mb-7 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent Orders</h2>
            <p className="text-sm text-slate-500">
              Latest {orders.length} order records
            </p>
          </div>

          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            Order manager
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-5 py-3 font-semibold">Order ID</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Payment</th>
                <th className="px-5 py-3 font-semibold">Order Status</th>
                <th className="px-5 py-3 font-semibold">Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {!loading && orders.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    No recent orders found.
                  </td>
                </tr>
              )}

              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-700">
                    {order.id}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-800">
                      {order.customerName || "—"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {order.customerEmail || ""}
                    </p>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-800">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                        order.paymentStatus
                      )}`}
                    >
                      {order.paymentStatus || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                        order.status
                      )}`}
                    >
                      {order.status || "—"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                    {order.date || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-7 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Notifications
              </h2>
              <p className="text-sm text-slate-500">
                Recent system updates
              </p>
            </div>
            <span className="text-sm font-semibold text-indigo-700">
              {notifications.length}
            </span>
          </div>

          <div className="space-y-3">
            {!loading && notifications.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                No recent notifications found.
              </p>
            )}

            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-100 p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">
                    {notification.title || "Notification"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {notification.message || "—"}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {notification.createdAt || notification.date || ""}
                  </p>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                    notification.status
                  )}`}
                >
                  {notification.status || "—"}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Audit & Security
              </h2>
              <p className="text-sm text-slate-500">
                Recent administrative activity
              </p>
            </div>
            <span className="text-sm font-semibold text-indigo-700">
              {auditLogs.length}
            </span>
          </div>

          <div className="space-y-3">
            {!loading && auditLogs.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                No recent audit activity found.
              </p>
            )}

            {auditLogs.map((audit) => (
              <div
                key={audit.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-100 p-4"
              >
                <div>
                  <p className="font-semibold text-slate-800">
                    {audit.action || audit.eventId || "Audit event"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {audit.userName || "System"} · {audit.userRole || "admin"}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {audit.date || ""} {audit.time || ""}
                  </p>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                    audit.status
                  )}`}
                >
                  {audit.status || "—"}
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>

      {alerts.length > 0 && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <h2 className="text-lg font-bold text-rose-800">
              Alerts & Action Required
            </h2>
          </div>

          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <div
                key={alert.id || `${alert.message}-${index}`}
                className="rounded-xl border border-rose-100 bg-white p-3 text-sm text-slate-700"
              >
                <span className="font-semibold text-rose-700">
                  {alert.severity ? `${alert.severity.toUpperCase()}: ` : ""}
                </span>
                {alert.message || String(alert)}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export default AdminDashboard;