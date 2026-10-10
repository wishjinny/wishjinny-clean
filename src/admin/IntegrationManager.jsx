import React, { useEffect, useMemo, useState } from "react";
import {
  fetchIntegrations,
  connectIntegration,
  disconnectIntegration,
  enableIntegration,
  disableIntegration,
  testIntegration,
  exportIntegrationsCSV,
  exportIntegrationsExcel,
} from "../utils/api";

const PAGE_SIZE = 12;

function IntegrationManager() {
  const [integrations, setIntegrations] = useState([]);

  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalIntegrations, setTotalIntegrations] = useState(0);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [integrationToUpdate, setIntegrationToUpdate] = useState(null);
  const [pendingAction, setPendingAction] = useState("");

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      category: filterCategory,
      status: filterStatus,
      sort: sortBy,
    }),
    [debouncedSearch, filterCategory, filterStatus, sortBy]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    loadIntegrations();
  }, [
    page,
    filters.search,
    filters.category,
    filters.status,
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

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  };

  const getStatusClass = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (
      normalized === "enabled" ||
      normalized === "connected" ||
      normalized === "active" ||
      normalized === "healthy" ||
      normalized === "success"
    ) {
      return "bg-green-100 text-green-700";
    }

    if (
      normalized === "disabled" ||
      normalized === "disconnected" ||
      normalized === "failed" ||
      normalized === "error"
    ) {
      return "bg-red-100 text-red-700";
    }

    if (
      normalized === "pending" ||
      normalized === "connecting" ||
      normalized === "warning"
    ) {
      return "bg-yellow-100 text-yellow-800";
    }

    return "bg-gray-100 text-gray-700";
  };

  const loadIntegrations = async () => {
    setLoadingIntegrations(true);
    setError("");

    try {
      const response = await fetchIntegrations({
        page,
        pageSize: PAGE_SIZE,
        limit: PAGE_SIZE,
        search: filters.search,
        category:
          filters.category === "all" ? undefined : filters.category,
        status: filters.status === "all" ? undefined : filters.status,
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

      setIntegrations(items);
      setTotalPages(Math.max(1, receivedTotalPages));
      setTotalIntegrations(receivedTotal);
    } catch (err) {
      setIntegrations([]);
      setError(
        err?.message || "Could not load integrations. Please try again."
      );
    } finally {
      setLoadingIntegrations(false);
    }
  };

  const refreshIntegrations = async () => {
    clearMessages();

    await loadIntegrations();

    setSuccess("Integrations refreshed successfully.");
  };

  const openConfirmModal = (integration, action) => {
    clearMessages();

    setIntegrationToUpdate(integration);
    setPendingAction(action);
    setShowConfirmModal(true);
  };

  const closeConfirmModal = () => {
    setIntegrationToUpdate(null);
    setPendingAction("");
    setShowConfirmModal(false);
  };

  const getActionLabel = (action) => {
    const labels = {
      connect: "Connect",
      disconnect: "Disconnect",
      enable: "Enable",
      disable: "Disable",
      test: "Test Connection",
    };

    return labels[action] || action;
  };

  const runIntegrationAction = async () => {
    if (!integrationToUpdate?.id || !pendingAction) return;

    clearMessages();

    const actionKey = `${pendingAction}-${integrationToUpdate.id}`;
    setActionLoading(actionKey);

    try {
      let response;

      if (pendingAction === "connect") {
        response = await connectIntegration({
          id: integrationToUpdate.id,
        });
      }

      if (pendingAction === "disconnect") {
        response = await disconnectIntegration({
          id: integrationToUpdate.id,
        });
      }

      if (pendingAction === "enable") {
        response = await enableIntegration({
          id: integrationToUpdate.id,
        });
      }

      if (pendingAction === "disable") {
        response = await disableIntegration({
          id: integrationToUpdate.id,
        });
      }

      if (pendingAction === "test") {
        response = await testIntegration({
          id: integrationToUpdate.id,
        });
      }

      setSuccess(
        response?.message ||
          `${integrationToUpdate.name || "Integration"} ${getActionLabel(
            pendingAction
          ).toLowerCase()} completed successfully.`
      );

      closeConfirmModal();
      await loadIntegrations();
    } catch (err) {
      setError(
        err?.message ||
          `Could not ${getActionLabel(
            pendingAction
          ).toLowerCase()} this integration.`
      );
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

  const handleExport = async (format) => {
    clearMessages();
    setActionLoading(`export-${format}`);

    try {
      const exportFunctions = {
        csv: exportIntegrationsCSV,
        excel: exportIntegrationsExcel,
      };

      const exportFunction = exportFunctions[format];

      if (!exportFunction) {
        throw new Error("Invalid export format.");
      }

      const response = await exportFunction({
        search: debouncedSearch,
        category:
          filterCategory === "all" ? undefined : filterCategory,
        status: filterStatus === "all" ? undefined : filterStatus,
        sort: sortBy,
      });

      downloadExportResponse(response, `integrations-report.${format}`);

      setSuccess(
        `Integrations exported to ${format.toUpperCase()} successfully.`
      );
    } catch (err) {
      setError(
        err?.message ||
          `Could not export integrations as ${format.toUpperCase()}.`
      );
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div className="integration-manager px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">
            Integration Manager
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Connect, enable, test, and manage third-party platform integrations.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshIntegrations}
            disabled={loadingIntegrations || Boolean(actionLoading)}
            className="rounded-md bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh
          </button>

          <button
            type="button"
            onClick={() => handleExport("csv")}
            disabled={Boolean(actionLoading)}
            className="rounded-md bg-yellow-500 px-4 py-2 text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading === "export-csv" ? "Exporting..." : "Export CSV"}
          </button>

          <button
            type="button"
            onClick={() => handleExport("excel")}
            disabled={Boolean(actionLoading)}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading === "export-excel"
              ? "Exporting..."
              : "Export Excel"}
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
          Integration Filters
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            type="text"
            placeholder="Search integrations..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          />

          <select
            value={filterCategory}
            onChange={(event) => {
              setFilterCategory(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          >
            <option value="all">All Categories</option>
            <option value="payment">Payment</option>
            <option value="shipping">Shipping</option>
            <option value="analytics">Analytics</option>
            <option value="notification">Notification</option>
            <option value="storage">Storage</option>
            <option value="crm">CRM</option>
            <option value="marketing">Marketing</option>
            <option value="other">Other</option>
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
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
            <option value="connected">Connected</option>
            <option value="disconnected">Disconnected</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          >
            <option value="name">Name A-Z</option>
            <option value="provider">Provider A-Z</option>
            <option value="status">Status</option>
            <option value="lastSync">Last Sync</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setDebouncedSearch("");
              setFilterCategory("all");
              setFilterStatus("all");
              setSortBy("name");
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
              Available Integrations
            </h2>

            <p className="text-sm text-gray-500">
              Total matching integrations: {totalIntegrations}
            </p>
          </div>

          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
        </div>

        {loadingIntegrations && integrations.length === 0 ? (
          <p className="py-8 text-center text-indigo-700">
            Loading integrations...
          </p>
        ) : integrations.length === 0 ? (
          <p className="py-8 text-center text-gray-600">
            No integrations found.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {integrations.map((integration) => {
              const isConnected =
                String(integration.connectionStatus || "").toLowerCase() ===
                "connected";

              const isEnabled =
                String(integration.status || "").toLowerCase() === "enabled";

              return (
                <article
                  key={integration.id}
                  className="rounded-lg border bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-indigo-900">
                        {integration.name || "Unnamed Integration"}
                      </h3>

                      <p className="mt-1 text-sm text-gray-600">
                        Provider: {integration.provider || "-"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                          integration.status
                        )}`}
                      >
                        {integration.status || "unknown"}
                      </span>

                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                          integration.connectionStatus
                        )}`}
                      >
                        {integration.connectionStatus || "disconnected"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Category</p>
                      <p className="mt-1 font-medium capitalize text-gray-800">
                        {integration.category || "Other"}
                      </p>
                    </div>

                    <div className="rounded bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Last Sync</p>
                      <p className="mt-1 font-medium text-gray-800">
                        {formatDate(integration.lastSync)}
                      </p>
                    </div>
                  </div>

                  {integration.description && (
                    <div className="mt-3 rounded-md border bg-gray-50 p-3">
                      <p className="text-sm text-gray-700">
                        {integration.description}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {isConnected ? (
                      <button
                        type="button"
                        onClick={() =>
                          openConfirmModal(integration, "disconnect")
                        }
                        disabled={Boolean(actionLoading)}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          openConfirmModal(integration, "connect")
                        }
                        disabled={Boolean(actionLoading)}
                        className="rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Connect
                      </button>
                    )}

                    {isEnabled ? (
                      <button
                        type="button"
                        onClick={() =>
                          openConfirmModal(integration, "disable")
                        }
                        disabled={Boolean(actionLoading)}
                        className="rounded-md bg-indigo-700 px-3 py-1.5 text-sm text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Disable
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          openConfirmModal(integration, "enable")
                        }
                        disabled={Boolean(actionLoading)}
                        className="rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Enable
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        openConfirmModal(integration, "test")
                      }
                      disabled={Boolean(actionLoading)}
                      className="rounded-md bg-yellow-500 px-3 py-1.5 text-sm text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Test Connection
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              setPage((currentPage) => Math.max(1, currentPage - 1))
            }
            disabled={page <= 1 || loadingIntegrations}
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
            disabled={page >= totalPages || loadingIntegrations}
            className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </section>

      {showConfirmModal && integrationToUpdate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  {getActionLabel(pendingAction)}
                </h2>

                <p className="text-sm text-gray-500">
                  {integrationToUpdate.name || "Integration"} -{" "}
                  {integrationToUpdate.provider || "Provider"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeConfirmModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
              {pendingAction === "connect" &&
                "This will start the connection process for this integration."}

              {pendingAction === "disconnect" &&
                "This will disconnect the current integration. Any active sync may stop."}

              {pendingAction === "enable" &&
                "This will enable the integration for use in your platform."}

              {pendingAction === "disable" &&
                "This will disable the integration. Related workflows may stop."}

              {pendingAction === "test" &&
                "This will test the current connection and configuration."}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeConfirmModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={runIntegrationAction}
                disabled={
                  actionLoading ===
                  `${pendingAction}-${integrationToUpdate.id}`
                }
                className="rounded-md bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ===
                `${pendingAction}-${integrationToUpdate.id}`
                  ? "Processing..."
                  : getActionLabel(pendingAction)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IntegrationManager;