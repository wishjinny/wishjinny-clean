import React, { useEffect, useMemo, useState } from "react";
import {
  fetchReports,
  generateReport,
  exportReportCSV,
  exportReportExcel,
  exportReportPDF,
  scheduleReport,
  deleteReport,
} from "../utils/api";

const PAGE_SIZE = 12;

const REPORT_MODULES = [
  "orders",
  "payments",
  "vendors",
  "customers",
  "complaints",
  "security",
  "performance",
];

const REPORT_TYPES = [
  "daily",
  "weekly",
  "monthly",
  "custom",
];

function ReportsManager() {
  const [reports, setReports] = useState([]);

  const [loadingReports, setLoadingReports] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [filterModule, setFilterModule] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });

  const [sortBy, setSortBy] = useState("newest");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReports, setTotalReports] = useState(0);

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const [generateForm, setGenerateForm] = useState({
    module: "orders",
    type: "daily",
    start: "",
    end: "",
  });

  const [scheduleForm, setScheduleForm] = useState({
    module: "orders",
    frequency: "daily",
    startAt: "",
    email: "",
  });

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      module: filterModule,
      status: filterStatus,
      start: dateRange.start,
      end: dateRange.end,
      sort: sortBy,
    }),
    [
      debouncedSearch,
      filterModule,
      filterStatus,
      dateRange.start,
      dateRange.end,
      sortBy,
    ]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    loadReports();
  }, [
    page,
    filters.search,
    filters.module,
    filters.status,
    filters.start,
    filters.end,
    filters.sort,
  ]);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const getItems = (response) => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.items)) return response.items;
    if (Array.isArray(response?.data)) return response.data;
    return [];
  };

  const getStatusClass = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (
      normalized === "generated" ||
      normalized === "completed" ||
      normalized === "ready" ||
      normalized === "exported"
    ) {
      return "bg-green-100 text-green-700";
    }

    if (
      normalized === "scheduled" ||
      normalized === "processing" ||
      normalized === "pending"
    ) {
      return "bg-yellow-100 text-yellow-800";
    }

    if (
      normalized === "failed" ||
      normalized === "cancelled" ||
      normalized === "error"
    ) {
      return "bg-red-100 text-red-700";
    }

    return "bg-gray-100 text-gray-700";
  };

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  };

  const loadReports = async () => {
    setLoadingReports(true);
    setError("");

    try {
      const response = await fetchReports({
        page,
        pageSize: PAGE_SIZE,
        limit: PAGE_SIZE,
        search: filters.search,
        module: filters.module === "all" ? undefined : filters.module,
        status: filters.status === "all" ? undefined : filters.status,
        start: filters.start || undefined,
        end: filters.end || undefined,
        sort: filters.sort,
      });

      const items = getItems(response);

      const receivedTotalPages = Number(
        response?.totalPages || response?.pagination?.totalPages || 1
      );

      const receivedTotal = Number(
        response?.total ||
          response?.pagination?.total ||
          response?.count ||
          items.length
      );

      setReports(items);
      setTotalPages(Math.max(1, receivedTotalPages));
      setTotalReports(receivedTotal);
    } catch (err) {
      setReports([]);
      setError(
        err?.message || "Could not load reports. Please try again."
      );
    } finally {
      setLoadingReports(false);
    }
  };

  const refreshReports = async () => {
    clearMessages();

    await loadReports();

    setSuccess("Reports refreshed successfully.");
  };

  const openGenerateModal = () => {
    clearMessages();

    setGenerateForm({
      module: filterModule !== "all" ? filterModule : "orders",
      type: "daily",
      start: dateRange.start || "",
      end: dateRange.end || "",
    });

    setShowGenerateModal(true);
  };

  const closeGenerateModal = () => {
    setShowGenerateModal(false);
    setGenerateForm({
      module: "orders",
      type: "daily",
      start: "",
      end: "",
    });
  };

  const handleGenerate = async () => {
    if (!generateForm.module || !generateForm.type) {
      setError("Select a module and report type.");
      return;
    }

    if (
      generateForm.type === "custom" &&
      (!generateForm.start || !generateForm.end)
    ) {
      setError("Custom reports require a start date and end date.");
      return;
    }

    clearMessages();
    setActionLoading("generate");

    try {
      const response = await generateReport({
        module: generateForm.module,
        type: generateForm.type,
        start: generateForm.start || undefined,
        end: generateForm.end || undefined,
      });

      setSuccess(response?.message || "Report generated successfully.");

      closeGenerateModal();
      await loadReports();
    } catch (err) {
      setError(err?.message || "Could not generate report.");
    } finally {
      setActionLoading("");
    }
  };

  const openScheduleModal = () => {
    clearMessages();

    setScheduleForm({
      module: filterModule !== "all" ? filterModule : "orders",
      frequency: "daily",
      startAt: "",
      email: "",
    });

    setShowScheduleModal(true);
  };

  const closeScheduleModal = () => {
    setShowScheduleModal(false);
    setScheduleForm({
      module: "orders",
      frequency: "daily",
      startAt: "",
      email: "",
    });
  };

  const handleSchedule = async () => {
    if (!scheduleForm.module || !scheduleForm.frequency) {
      setError("Select a module and report frequency.");
      return;
    }

    clearMessages();
    setActionLoading("schedule");

    try {
      const response = await scheduleReport({
        module: scheduleForm.module,
        frequency: scheduleForm.frequency,
        startAt: scheduleForm.startAt || undefined,
        email: scheduleForm.email.trim() || undefined,
      });

      setSuccess(response?.message || "Report scheduled successfully.");

      closeScheduleModal();
      await loadReports();
    } catch (err) {
      setError(err?.message || "Could not schedule report.");
    } finally {
      setActionLoading("");
    }
  };

  const downloadExportResponse = (response, fileName) => {
    if (!response) return;

    if (typeof response === "string") {
      window.open(response, "_blank", "noopener,noreferrer");
      return;
    }

    if (response?.url) {
      window.open(response.url, "_blank", "noopener,noreferrer");
      return;
    }

    if (response instanceof Blob) {
      const fileUrl = window.URL.createObjectURL(response);
      const link = document.createElement("a");

      link.href = fileUrl;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(fileUrl);
    }
  };

  const handleExport = async (report, format) => {
    if (!report?.id) return;

    clearMessages();
    setActionLoading(`export-${format}-${report.id}`);

    try {
      const exportFunctions = {
        csv: exportReportCSV,
        excel: exportReportExcel,
        pdf: exportReportPDF,
      };

      const exportFunction = exportFunctions[format];

      if (!exportFunction) {
        throw new Error("Invalid export format.");
      }

      const response = await exportFunction({
        id: report.id,
      });

      downloadExportResponse(
        response,
        `${report.module || "report"}-${report.id}.${format}`
      );

      setSuccess(`Report exported to ${format.toUpperCase()}.`);

      await loadReports();
    } catch (err) {
      setError(
        err?.message ||
          `Could not export report as ${format.toUpperCase()}.`
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleDelete = async (report) => {
    if (!report?.id) return;

    const confirmed = window.confirm(
      `Delete ${report.module || "this"} ${report.type || ""} report?`
    );

    if (!confirmed) return;

    clearMessages();
    setActionLoading(`delete-${report.id}`);

    try {
      const response = await deleteReport({
        id: report.id,
      });

      setSuccess(response?.message || "Report deleted successfully.");

      await loadReports();
    } catch (err) {
      setError(err?.message || "Could not delete report.");
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div className="reports-manager px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">
            Unified Reports & Analytics Manager
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Generate, schedule, export, and manage reports across all platform modules.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openGenerateModal}
            disabled={Boolean(actionLoading)}
            className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Generate Report
          </button>

          <button
            type="button"
            onClick={openScheduleModal}
            disabled={Boolean(actionLoading)}
            className="rounded-md bg-yellow-500 px-4 py-2 text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Schedule Report
          </button>

          <button
            type="button"
            onClick={refreshReports}
            disabled={loadingReports || Boolean(actionLoading)}
            className="rounded-md bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh
          </button>
        </div>
      </div>

      {success && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 font-medium text-green-700">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 font-medium text-red-700">
          {error}
        </div>
      )}

      <section className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-indigo-900">
          Report Filters
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          />

          <select
            value={filterModule}
            onChange={(event) => {
              setFilterModule(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          >
            <option value="all">All Modules</option>
            <option value="orders">Orders</option>
            <option value="payments">Payments</option>
            <option value="vendors">Vendors</option>
            <option value="customers">Customers</option>
            <option value="complaints">Complaints</option>
            <option value="security">Security</option>
            <option value="performance">Performance</option>
          </select>

          <select
            value={filterStatus}
            onChange={(event) => {
              setFilterStatus(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="generated">Generated</option>
            <option value="scheduled">Scheduled</option>
            <option value="processing">Processing</option>
            <option value="exported">Exported</option>
            <option value="failed">Failed</option>
          </select>

          <input
            type="date"
            value={dateRange.start}
            onChange={(event) => {
              setDateRange((current) => ({
                ...current,
                start: event.target.value,
              }));
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          />

          <input
            type="date"
            value={dateRange.end}
            onChange={(event) => {
              setDateRange((current) => ({
                ...current,
                end: event.target.value,
              }));
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          />

          <select
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="module_asc">Module A-Z</option>
            <option value="status_asc">Status A-Z</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setDebouncedSearch("");
              setFilterModule("all");
              setFilterStatus("all");
              setDateRange({ start: "", end: "" });
              setSortBy("newest");
              setPage(1);
            }}
            className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-indigo-900">
              Generated Reports
            </h2>

            <p className="text-sm text-gray-500">
              Total matching reports: {totalReports}
            </p>
          </div>

          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
        </div>

        {loadingReports && reports.length === 0 ? (
          <p className="py-8 text-center text-indigo-700">
            Loading reports...
          </p>
        ) : reports.length === 0 ? (
          <p className="py-8 text-center text-gray-600">
            No reports found.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {reports.map((report) => (
              <article
                key={report.id}
                className="rounded-lg border bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-indigo-900">
                      {report.module || "General"} Report -{" "}
                      {report.type || "Custom"}
                    </h3>

                    <p className="mt-1 text-sm text-gray-600">
                      Creator: {report.creator || "System"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                        report.status
                      )}`}
                    >
                      {report.status || "unknown"}
                    </span>

                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                        report.exportStatus
                      )}`}
                    >
                      Export: {report.exportStatus || "not exported"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Report ID</p>
                    <p className="mt-1 break-all font-mono text-xs text-gray-800">
                      {report.id}
                    </p>
                  </div>

                  <div className="rounded bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Created At</p>
                    <p className="mt-1 text-gray-800">
                      {formatDate(report.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleExport(report, "csv")}
                    disabled={Boolean(actionLoading)}
                    className="rounded-md bg-yellow-500 px-3 py-1.5 text-sm text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === `export-csv-${report.id}`
                      ? "Exporting..."
                      : "Export CSV"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExport(report, "excel")}
                    disabled={Boolean(actionLoading)}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === `export-excel-${report.id}`
                      ? "Exporting..."
                      : "Export Excel"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExport(report, "pdf")}
                    disabled={Boolean(actionLoading)}
                    className="rounded-md bg-purple-600 px-3 py-1.5 text-sm text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === `export-pdf-${report.id}`
                      ? "Exporting..."
                      : "Export PDF"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(report)}
                    disabled={Boolean(actionLoading)}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === `delete-${report.id}`
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              setPage((currentPage) => Math.max(1, currentPage - 1))
            }
            disabled={page <= 1 || loadingReports}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>

          <span className="text-sm text-gray-600">
            Page {page} / {totalPages}
          </span>

          <button
            type="button"
            onClick={() =>
              setPage((currentPage) =>
                Math.min(totalPages, currentPage + 1)
              )
            }
            disabled={page >= totalPages || loadingReports}
            className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </section>

      {showGenerateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Generate New Report
                </h2>

                <p className="text-sm text-gray-500">
                  Create a new module report for the selected period.
                </p>
              </div>

              <button
                type="button"
                onClick={closeGenerateModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Module
                </label>

                <select
                  value={generateForm.module}
                  onChange={(event) =>
                    setGenerateForm((current) => ({
                      ...current,
                      module: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
                >
                  {REPORT_MODULES.map((module) => (
                    <option key={module} value={module}>
                      {module.charAt(0).toUpperCase() + module.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Report Type
                </label>

                <select
                  value={generateForm.type}
                  onChange={(event) =>
                    setGenerateForm((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
                >
                  {REPORT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {generateForm.type === "custom" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Start Date
                    </label>

                    <input
                      type="date"
                      value={generateForm.start}
                      onChange={(event) =>
                        setGenerateForm((current) => ({
                          ...current,
                          start: event.target.value,
                        }))
                      }
                      className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      End Date
                    </label>

                    <input
                      type="date"
                      value={generateForm.end}
                      onChange={(event) =>
                        setGenerateForm((current) => ({
                          ...current,
                          end: event.target.value,
                        }))
                      }
                      className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {generateForm.type !== "custom" && (
                <p className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
                  The backend will calculate the appropriate period for this
                  report type.
                </p>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeGenerateModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={actionLoading === "generate"}
                className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "generate"
                  ? "Generating..."
                  : "Generate Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Schedule Report
                </h2>

                <p className="text-sm text-gray-500">
                  Automatically generate reports at a regular frequency.
                </p>
              </div>

              <button
                type="button"
                onClick={closeScheduleModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Module
                </label>

                <select
                  value={scheduleForm.module}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      module: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
                >
                  {REPORT_MODULES.map((module) => (
                    <option key={module} value={module}>
                      {module.charAt(0).toUpperCase() + module.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Frequency
                </label>

                <select
                  value={scheduleForm.frequency}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      frequency: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Start At (Optional)
                </label>

                <input
                  type="datetime-local"
                  value={scheduleForm.startAt}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      startAt: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Delivery Email (Optional)
                </label>

                <input
                  type="email"
                  value={scheduleForm.email}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="reports@example.com"
                  className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeScheduleModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSchedule}
                disabled={actionLoading === "schedule"}
                className="rounded-md bg-yellow-500 px-4 py-2 text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "schedule"
                  ? "Scheduling..."
                  : "Schedule Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportsManager;