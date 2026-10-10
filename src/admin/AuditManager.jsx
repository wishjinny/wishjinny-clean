// src/admin/AuditManager.jsx

import { useEffect, useMemo, useState } from "react";
import {
  exportAuditLogsCSV,
  exportAuditLogsExcel,
  exportAuditLogsPDF,
  fetchAuditLogs,
} from "../utils/api";

const PAGE_SIZE = 10;

function AuditManager() {
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  const loadAuditLogs = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchAuditLogs({
        page,
        search: debouncedSearch,
      });

      setLogs(response?.items || []);
      setTotalLogs(Number(response?.total) || 0);
    } catch (err) {
      console.error(err);
      setLogs([]);
      setError("Audit logs load nahi ho paaye.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [page, debouncedSearch]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalLogs / PAGE_SIZE));
  }, [totalLogs]);

  const getStatusClass = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (["success", "completed", "active"].includes(normalized)) {
      return "bg-emerald-100 text-emerald-700";
    }

    if (["failed", "error", "rejected"].includes(normalized)) {
      return "bg-rose-100 text-rose-700";
    }

    if (["pending", "processing"].includes(normalized)) {
      return "bg-amber-100 text-amber-800";
    }

    return "bg-slate-100 text-slate-700";
  };

  const handleExport = async (format) => {
    setExporting(format);
    setError("");
    setSuccess("");

    try {
      if (format === "csv") {
        await exportAuditLogsCSV();
      }

      if (format === "excel") {
        await exportAuditLogsExcel();
      }

      if (format === "pdf") {
        await exportAuditLogsPDF();
      }

      setSuccess(`Audit logs ${format.toUpperCase()} format mein export ho gaye.`);
    } catch (err) {
      console.error(err);
      setError(`${format.toUpperCase()} export nahi ho paaya.`);
    } finally {
      setExporting("");
    }
  };

  const handleRefresh = async () => {
    setSuccess("");
    await loadAuditLogs();
    setSuccess("Audit manager data refresh ho gaya.");
  };

  const MetricCard = ({ label, value, color = "text-indigo-950" }) => (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
    </article>
  );

  const successEvents = logs.filter(
    (log) => String(log.status).toLowerCase() === "success"
  ).length;

  const failedEvents = logs.filter(
    (log) => String(log.status).toLowerCase() === "failure"
  ).length;

  const securityEvents = logs.filter((log) => log.securitySensitive).length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
              Wish Jinny Control Center
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-950">
              Audit Manager
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Platform activity, administrator actions aur security-sensitive
              events ka secure record.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || Boolean(exporting)}
            className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh Data"}
          </button>
        </section>

        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        <section className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total Events" value={totalLogs} />
          <MetricCard
            label="Successful Events"
            value={successEvents}
            color="text-emerald-600"
          />
          <MetricCard
            label="Failed Events"
            value={failedEvents}
            color="text-rose-600"
          />
          <MetricCard
            label="Security Events"
            value={securityEvents}
            color="text-violet-700"
          />
        </section>

        <section className="mb-7 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Search Audit Activity
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Search by action, user name or resource type.
              </p>
            </div>

            <div className="w-full sm:max-w-md">
              <input
                type="search"
                placeholder="Search audit logs..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
          </div>
        </section>

        <section className="mb-7 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Audit Logs</h2>
              <p className="text-sm text-slate-500">
                Total matching records: {totalLogs}
              </p>
            </div>

            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              Page {page} of {totalPages}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[950px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold">Event ID</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                  <th className="px-5 py-3 font-semibold">Resource</th>
                  <th className="px-5 py-3 font-semibold">User</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Date & Time</th>
                  <th className="px-5 py-3 font-semibold">View</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-5 py-10 text-center text-indigo-700"
                    >
                      Loading audit logs...
                    </td>
                  </tr>
                )}

                {!loading && logs.length === 0 && (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      No audit logs found.
                    </td>
                  </tr>
                )}

                {!loading &&
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-700">
                        {log.eventId || log.id || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">
                          {log.action || "—"}
                        </p>
                        {log.securitySensitive && (
                          <p className="mt-1 text-xs font-semibold text-rose-600">
                            Security-sensitive event
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        <p>{log.resourceType || "—"}</p>
                        {log.resourceId && (
                          <p className="mt-1 font-mono text-xs text-slate-400">
                            {log.resourceId}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800">
                          {log.userName || "System"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {log.userId || ""}
                        </p>
                      </td>

                      <td className="px-5 py-4 capitalize text-slate-600">
                        {String(log.userRole || "—").replace("_", " ")}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                            log.status
                          )}`}
                        >
                          {log.status || "unknown"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                        <p>{log.date || "—"}</p>
                        <p className="mt-1 text-xs">{log.time || ""}</p>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
            <button
              type="button"
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              disabled={page <= 1 || loading}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>

            <span className="text-sm font-medium text-slate-500">
              Page {page} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setPage((currentPage) => Math.min(totalPages, currentPage + 1))
              }
              disabled={page >= totalPages || loading}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Export Audit Records
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Download audit activity for review and compliance records.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleExport("csv")}
                disabled={Boolean(exporting)}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting === "csv" ? "Exporting..." : "Export CSV"}
              </button>

              <button
                type="button"
                onClick={() => handleExport("excel")}
                disabled={Boolean(exporting)}
                className="rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting === "excel" ? "Exporting..." : "Export Excel"}
              </button>

              <button
                type="button"
                onClick={() => handleExport("pdf")}
                disabled={Boolean(exporting)}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting === "pdf" ? "Exporting..." : "Export PDF"}
              </button>
            </div>
          </div>
        </section>
      </div>

      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/45 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Audit log detail"
        >
          <button
            type="button"
            aria-label="Close audit log detail"
            onClick={() => setSelectedLog(null)}
            className="absolute inset-0 cursor-default"
          />

          <aside className="relative z-10 h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-indigo-600">
                  Audit Event
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Event Detail
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="mb-3 font-bold text-slate-900">
                  Event Information
                </h3>

                <div className="space-y-2 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-800">Event ID:</span>{" "}
                    {selectedLog.eventId || selectedLog.id || "—"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Action:</span>{" "}
                    {selectedLog.action || "—"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Resource:</span>{" "}
                    {selectedLog.resourceType || "—"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">
                      Resource ID:
                    </span>{" "}
                    {selectedLog.resourceId || "—"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Status:</span>{" "}
                    {selectedLog.status || "—"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Date:</span>{" "}
                    {selectedLog.date || "—"} {selectedLog.time || ""}
                  </p>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="mb-3 font-bold text-slate-900">
                  User Information
                </h3>

                <div className="space-y-2 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-800">Name:</span>{" "}
                    {selectedLog.userName || "System"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">User ID:</span>{" "}
                    {selectedLog.userId || "—"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Role:</span>{" "}
                    {selectedLog.userRole || "—"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">
                      Voice Confirmed:
                    </span>{" "}
                    {selectedLog.voiceConfirmed ? "Yes" : "No"}
                  </p>
                </div>
              </section>

              {selectedLog.securitySensitive && (
                <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <h3 className="font-bold text-rose-800">
                    Security-sensitive event
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-rose-700">
                    This action has been marked as security-sensitive and should
                    be retained for compliance review.
                  </p>
                </section>
              )}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

export default AuditManager;