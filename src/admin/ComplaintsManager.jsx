// src/admin/ComplaintsManager.jsx

import { useEffect, useMemo, useState } from "react";
import {
  exportSupportCSV,
  exportSupportExcel,
  fetchComplaints,
  updateComplaintStatus,
} from "../utils/api";

const PAGE_SIZE = 12;

function ComplaintsManager() {
  const [allComplaints, setAllComplaints] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [showModerationModal, setShowModerationModal] = useState(false);
  const [complaintToModerate, setComplaintToModerate] = useState(null);
  const [moderationAction, setModerationAction] = useState("");
  const [moderationNote, setModerationNote] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  const loadComplaints = async () => {
    setLoadingComplaints(true);
    setError("");

    try {
      const response = await fetchComplaints({
        page: 1,
        status: "all",
      });

      const apiComplaints = response?.items || [];

      const normalizedComplaints = apiComplaints.map((complaint, index) => ({
        id: complaint.id || `CMP-${index + 1}`,
        type: "Complaint",
        issue: complaint.issue || "Customer complaint",
        customer: complaint.customer || "Customer",
        vendor: complaint.vendor || "Not specified",
        product: complaint.product || "Not specified",
        status: complaint.status || "open",
        priority: complaint.priority || "medium",
        createdAt: complaint.createdAt || new Date().toISOString(),
        notes: complaint.notes || [],
      }));

      setAllComplaints(normalizedComplaints);
    } catch (err) {
      console.error(err);
      setError("Complaints load nahi ho paayi.");
      setAllComplaints([]);
    } finally {
      setLoadingComplaints(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  const filteredComplaints = useMemo(() => {
    let items = [...allComplaints];

    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();

      items = items.filter((complaint) =>
        [
          complaint.id,
          complaint.type,
          complaint.issue,
          complaint.customer,
          complaint.vendor,
          complaint.product,
        ].some((value) =>
          String(value || "").toLowerCase().includes(query)
        )
      );
    }

    if (filterStatus !== "all") {
      items = items.filter((complaint) => complaint.status === filterStatus);
    }

    return items;
  }, [allComplaints, debouncedSearch, filterStatus]);

  const totalComplaints = filteredComplaints.length;
  const totalPages = Math.max(1, Math.ceil(totalComplaints / PAGE_SIZE));

  useEffect(() => {
    const safePage = Math.min(page, totalPages);

    if (safePage !== page) {
      setPage(safePage);
      return;
    }

    const start = (safePage - 1) * PAGE_SIZE;
    setComplaints(filteredComplaints.slice(start, start + PAGE_SIZE));
  }, [filteredComplaints, page, totalPages]);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusClass = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (["resolved", "approved", "closed"].includes(normalized)) {
      return "bg-emerald-100 text-emerald-700";
    }

    if (["rejected", "hidden"].includes(normalized)) {
      return "bg-rose-100 text-rose-700";
    }

    if (["open", "pending", "investigating"].includes(normalized)) {
      return "bg-amber-100 text-amber-800";
    }

    return "bg-slate-100 text-slate-700";
  };

  const getPriorityClass = (priority) => {
    const normalized = String(priority || "").toLowerCase();

    if (["high", "urgent"].includes(normalized)) {
      return "bg-rose-100 text-rose-700";
    }

    if (normalized === "medium") {
      return "bg-amber-100 text-amber-800";
    }

    return "bg-emerald-100 text-emerald-700";
  };

  const getModerationLabel = (action) => {
    const labels = {
      investigating: "Start Investigation",
      resolved: "Resolve",
      rejected: "Reject",
    };

    return labels[action] || action;
  };

  const refreshComplaints = async () => {
    clearMessages();
    await loadComplaints();
    setSuccess("Complaints refreshed successfully.");
  };

  const openModerationModal = (complaint, action) => {
    clearMessages();
    setComplaintToModerate(complaint);
    setModerationAction(action);
    setModerationNote("");
    setShowModerationModal(true);
  };

  const closeModerationModal = () => {
    setComplaintToModerate(null);
    setModerationAction("");
    setModerationNote("");
    setShowModerationModal(false);
  };

  const saveModeration = async () => {
    if (!complaintToModerate?.id || !moderationAction) return;

    if (!moderationNote.trim()) {
      setError("Moderation note is required.");
      return;
    }

    clearMessages();
    setActionLoading(`moderate-${complaintToModerate.id}`);

    try {
      await updateComplaintStatus({
        id: complaintToModerate.id,
        status: moderationAction,
      });

      setAllComplaints((currentComplaints) =>
        currentComplaints.map((complaint) =>
          complaint.id === complaintToModerate.id
            ? {
                ...complaint,
                status: moderationAction,
                notes: [
                  ...(complaint.notes || []),
                  {
                    id: `NOTE-${Date.now()}`,
                    text: moderationNote.trim(),
                    action: moderationAction,
                    date: new Date().toISOString(),
                  },
                ],
              }
            : complaint
        )
      );

      setSuccess(
        `Complaint ${getModerationLabel(
          moderationAction
        ).toLowerCase()} successfully.`
      );

      closeModerationModal();
    } catch (err) {
      console.error(err);
      setError("Complaint status update nahi ho paaya.");
    } finally {
      setActionLoading("");
    }
  };

  const handleExport = async (format) => {
    clearMessages();
    setActionLoading(`export-${format}`);

    try {
      if (format === "csv") {
        await exportSupportCSV();
      }

      if (format === "excel") {
        await exportSupportExcel();
      }

      setSuccess(
        `Complaints ${format.toUpperCase()} format mein export ho gayi.`
      );
    } catch (err) {
      console.error(err);
      setError(`${format.toUpperCase()} export nahi ho paaya.`);
    } finally {
      setActionLoading("");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
              Wish Jinny Trust Center
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-950">
              Complaints Manager
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Review customer complaints, start investigations, resolve cases
              and maintain marketplace trust.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={refreshComplaints}
              disabled={loadingComplaints || Boolean(actionLoading)}
              className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingComplaints ? "Refreshing..." : "Refresh"}
            </button>

            <button
              type="button"
              onClick={() => handleExport("csv")}
              disabled={Boolean(actionLoading)}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading === "export-csv" ? "Exporting..." : "Export CSV"}
            </button>

            <button
              type="button"
              onClick={() => handleExport("excel")}
              disabled={Boolean(actionLoading)}
              className="rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading === "export-excel"
                ? "Exporting..."
                : "Export Excel"}
            </button>
          </div>
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

        <section className="mb-7 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              Search & Filters
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Find complaints by customer, product, vendor or complaint text.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              type="search"
              placeholder="Search complaints..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />

            <select
              value={filterStatus}
              onChange={(event) => {
                setFilterStatus(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setDebouncedSearch("");
                setFilterStatus("all");
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Clear Filters
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Customer Complaints
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Total matching complaints: {totalComplaints}
              </p>
            </div>

            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              Page {page} of {totalPages}
            </span>
          </div>

          {loadingComplaints ? (
            <p className="py-10 text-center text-indigo-700">
              Loading complaints...
            </p>
          ) : complaints.length === 0 ? (
            <p className="py-10 text-center text-slate-500">
              No complaints found.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {complaints.map((complaint) => (
                <article
                  key={complaint.id}
                  className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">
                        Complaint ID: {complaint.id}
                      </p>

                      <h3 className="mt-2 text-lg font-bold text-slate-900">
                        {complaint.issue || "Customer complaint"}
                      </h3>
                    </div>

                    <div className="flex gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                          complaint.status
                        )}`}
                      >
                        {complaint.status}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getPriorityClass(
                          complaint.priority
                        )}`}
                      >
                        {complaint.priority}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-500">
                        Customer
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {complaint.customer || "—"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-500">
                        Submitted
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {formatDate(complaint.createdAt)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-500">
                        Vendor
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {complaint.vendor || "Not specified"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-500">
                        Product
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {complaint.product || "Not specified"}
                      </p>
                    </div>
                  </div>

                  {complaint.notes?.length > 0 && (
                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                        Moderation History
                      </p>

                      <div className="mt-2 space-y-2">
                        {complaint.notes.map((note) => (
                          <p
                            key={note.id}
                            className="text-sm leading-6 text-slate-700"
                          >
                            <span className="font-semibold capitalize text-indigo-700">
                              {note.action}:
                            </span>{" "}
                            {note.text}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openModerationModal(complaint, "investigating")
                      }
                      disabled={Boolean(actionLoading)}
                      className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Investigate
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openModerationModal(complaint, "resolved")
                      }
                      disabled={Boolean(actionLoading)}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Resolve
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openModerationModal(complaint, "rejected")
                      }
                      disabled={Boolean(actionLoading)}
                      className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-7 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() =>
                setPage((currentPage) => Math.max(1, currentPage - 1))
              }
              disabled={page <= 1 || loadingComplaints}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>

            <span className="text-sm font-semibold text-slate-500">
              Page {page} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setPage((currentPage) =>
                  Math.min(totalPages, currentPage + 1)
                )
              }
              disabled={page >= totalPages || loadingComplaints}
              className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </section>
      </div>

      {showModerationModal && complaintToModerate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Complaint moderation"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-indigo-600">
                  Complaint Review
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  {getModerationLabel(moderationAction)}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModerationModal}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Complaint
              </p>
              <p className="mt-2 font-semibold text-slate-800">
                {complaintToModerate.issue}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Customer: {complaintToModerate.customer}
              </p>
            </div>

            <label className="mt-5 mb-2 block text-sm font-semibold text-slate-700">
              Moderation Note
            </label>

            <textarea
              value={moderationNote}
              onChange={(event) => setModerationNote(event.target.value)}
              rows={5}
              placeholder="Add a clear note for records and compliance..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModerationModal}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveModeration}
                disabled={
                  actionLoading === `moderate-${complaintToModerate.id}`
                }
                className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `moderate-${complaintToModerate.id}`
                  ? "Saving..."
                  : getModerationLabel(moderationAction)}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default ComplaintsManager;