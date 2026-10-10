import React, { useEffect, useMemo, useState } from "react";
import {
  fetchTransactions,
  fetchPaymentGateways,
  toggleGatewayStatus,
  testGatewayConnection,
  processRefund,
  bulkRefund,
  fetchDisputes,
  updateDisputeStatus,
  fetchPaymentAnalytics,
  exportPaymentsCSV,
  exportPaymentsExcel,
  exportPaymentsPDF,
  logAuditEvent,
} from "../utils/api";

const PAGE_SIZE = 10;

function PaymentManager() {
  const [transactions, setTransactions] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [transactionToRefund, setTransactionToRefund] = useState(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const [showBulkRefundModal, setShowBulkRefundModal] = useState(false);
  const [bulkRefundReason, setBulkRefundReason] = useState("");

  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeToUpdate, setDisputeToUpdate] = useState(null);
  const [disputeStatus, setDisputeStatus] = useState("under_review");
  const [disputeReason, setDisputeReason] = useState("");

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      status: statusFilter,
    }),
    [debouncedSearch, statusFilter]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    loadTransactions();
  }, [page, filters.search, filters.status]);

  useEffect(() => {
    loadSummaryData();
  }, []);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const getItems = (response) => {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.items)) {
      return response.items;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    return [];
  };

  const formatAmount = (amount, currency = "₹") => {
    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount)) {
      return `${currency}0`;
    }

    return `${currency}${numericAmount.toLocaleString("en-IN")}`;
  };

  const getStatusClass = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (
      normalized === "paid" ||
      normalized === "success" ||
      normalized === "successful" ||
      normalized === "resolved" ||
      normalized === "enabled" ||
      normalized === "active"
    ) {
      return "bg-green-100 text-green-700";
    }

    if (
      normalized === "failed" ||
      normalized === "refunded" ||
      normalized === "rejected" ||
      normalized === "disabled" ||
      normalized === "error"
    ) {
      return "bg-red-100 text-red-700";
    }

    if (
      normalized === "pending" ||
      normalized === "refundable" ||
      normalized === "open" ||
      normalized === "under_review"
    ) {
      return "bg-yellow-100 text-yellow-800";
    }

    return "bg-gray-100 text-gray-700";
  };

  const writeAuditLog = async (action, resourceType, resourceId, details) => {
    try {
      await logAuditEvent({
        action,
        details: details || "",
        resourceType,
        resourceId: resourceId || "",
      });
    } catch {
      // Main payment action should not fail only because audit logging fails.
    }
  };

  const loadTransactions = async () => {
    setLoadingTransactions(true);
    setError("");

    try {
      const response = await fetchTransactions({
        page,
        limit: PAGE_SIZE,
        ...filters,
      });

      const items = getItems(response);

      const receivedTotalPages = Number(
        response?.totalPages || response?.pagination?.totalPages || 1
      );

      const receivedTotal = Number(
        response?.total || response?.pagination?.total || items.length
      );

      setTransactions(items);
      setTotalPages(Math.max(1, receivedTotalPages));
      setTotalTransactions(receivedTotal);
    } catch (err) {
      setTransactions([]);
      setError(
        err?.message ||
          "⚠️ Transactions load नहीं हो पाए। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setLoadingTransactions(false);
    }
  };

  const loadSummaryData = async () => {
    setLoadingSummary(true);

    const results = await Promise.allSettled([
      fetchPaymentGateways(),
      fetchDisputes(),
      fetchPaymentAnalytics(),
    ]);

    const [gatewaysResult, disputesResult, analyticsResult] = results;

    if (gatewaysResult.status === "fulfilled") {
      setGateways(getItems(gatewaysResult.value));
    }

    if (disputesResult.status === "fulfilled") {
      setDisputes(getItems(disputesResult.value));
    }

    if (analyticsResult.status === "fulfilled") {
      setAnalytics(analyticsResult.value || null);
    }

    if (results.some((result) => result.status === "rejected")) {
      setError("⚠️ कुछ payment summary data load नहीं हो पाया।");
    }

    setLoadingSummary(false);
  };

  const refreshPaymentData = async () => {
    clearMessages();

    await Promise.all([loadTransactions(), loadSummaryData()]);

    setSuccess("✅ Payment Manager का data refresh हो गया।");
  };

  const toggleTransactionSelection = (transactionId) => {
    setSelectedIds((currentIds) =>
      currentIds.includes(transactionId)
        ? currentIds.filter((id) => id !== transactionId)
        : [...currentIds, transactionId]
    );
  };

  const toggleAllTransactions = () => {
    const currentPageIds = transactions
      .map((transaction) => transaction.id)
      .filter(Boolean);

    const allSelected =
      currentPageIds.length > 0 &&
      currentPageIds.every((id) => selectedIds.includes(id));

    setSelectedIds((currentIds) => {
      if (allSelected) {
        return currentIds.filter((id) => !currentPageIds.includes(id));
      }

      return Array.from(new Set([...currentIds, ...currentPageIds]));
    });
  };

  const openRefundModal = (transaction) => {
    clearMessages();

    setTransactionToRefund(transaction);
    setRefundAmount(
      transaction.amount === undefined || transaction.amount === null
        ? ""
        : String(transaction.amount)
    );
    setRefundReason("");

    setShowRefundModal(true);
  };

  const closeRefundModal = () => {
    setTransactionToRefund(null);
    setRefundAmount("");
    setRefundReason("");
    setShowRefundModal(false);
  };

  const saveRefund = async () => {
    if (!transactionToRefund?.id) {
      return;
    }

    const amount = Number(refundAmount);
    const transactionAmount = Number(transactionToRefund.amount);

    if (Number.isNaN(amount) || amount <= 0) {
      setError("⚠️ Refund amount 0 से ज्यादा होना चाहिए।");
      return;
    }

    if (!Number.isNaN(transactionAmount) && amount > transactionAmount) {
      setError("⚠️ Refund amount transaction amount से ज्यादा नहीं हो सकता।");
      return;
    }

    clearMessages();
    setActionLoading(`refund-${transactionToRefund.id}`);

    try {
      const response = await processRefund({
        id: transactionToRefund.id,
        amount,
        reason: refundReason.trim(),
      });

      await writeAuditLog(
        "PROCESS_PAYMENT_REFUND",
        "transaction",
        transactionToRefund.id,
        `Refund amount: ${amount}. Reason: ${refundReason.trim() || "—"}`
      );

      setSuccess(response?.message || "✅ Refund process हो गया।");

      closeRefundModal();
      await Promise.all([loadTransactions(), loadSummaryData()]);
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Refund process नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const openBulkRefundModal = () => {
    clearMessages();

    if (selectedIds.length === 0) {
      setError("⚠️ Bulk refund के लिए कम से कम एक transaction select करें।");
      return;
    }

    setBulkRefundReason("");
    setShowBulkRefundModal(true);
  };

  const closeBulkRefundModal = () => {
    setBulkRefundReason("");
    setShowBulkRefundModal(false);
  };

  const saveBulkRefund = async () => {
    if (selectedIds.length === 0) {
      setError("⚠️ Bulk refund के लिए कोई transaction select नहीं है।");
      return;
    }

    clearMessages();
    setActionLoading("bulk-refund");

    try {
      const response = await bulkRefund({
        ids: selectedIds,
        ...(bulkRefundReason.trim()
          ? { reason: bulkRefundReason.trim() }
          : {}),
      });

      await writeAuditLog(
        "BULK_PAYMENT_REFUND",
        "transaction",
        selectedIds.join(","),
        `Bulk refund for ${selectedIds.length} transaction(s). Reason: ${
          bulkRefundReason.trim() || "—"
        }`
      );

      setSuccess(
        response?.message ||
          `✅ ${selectedIds.length} transactions के लिए bulk refund process हो गया।`
      );

      setSelectedIds([]);
      closeBulkRefundModal();

      await Promise.all([loadTransactions(), loadSummaryData()]);
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Bulk refund process नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleGatewayToggle = async (gateway) => {
    clearMessages();
    setActionLoading(`gateway-toggle-${gateway.id}`);

    try {
      const response = await toggleGatewayStatus({ id: gateway.id });

      await writeAuditLog(
        "TOGGLE_PAYMENT_GATEWAY",
        "payment_gateway",
        gateway.id,
        `Toggled gateway: ${gateway.name || gateway.id}`
      );

      setSuccess(
        response?.message || "✅ Payment gateway status update हो गया।"
      );

      await loadSummaryData();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Payment gateway status update नहीं हो पाया।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleGatewayTest = async (gateway) => {
    clearMessages();
    setActionLoading(`gateway-test-${gateway.id}`);

    try {
      const response = await testGatewayConnection({ id: gateway.id });

      await writeAuditLog(
        "TEST_PAYMENT_GATEWAY",
        "payment_gateway",
        gateway.id,
        `Tested gateway: ${gateway.name || gateway.id}`
      );

      setSuccess(
        response?.message || "✅ Gateway connection successful है।"
      );

      await loadSummaryData();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Gateway connection test fail हो गया। कृपया configuration जांचें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const openDisputeModal = (dispute) => {
    clearMessages();

    setDisputeToUpdate(dispute);
    setDisputeStatus(dispute.status || "under_review");
    setDisputeReason("");

    setShowDisputeModal(true);
  };

  const closeDisputeModal = () => {
    setDisputeToUpdate(null);
    setDisputeStatus("under_review");
    setDisputeReason("");
    setShowDisputeModal(false);
  };

  const saveDisputeStatus = async () => {
    if (!disputeToUpdate?.id) {
      return;
    }

    clearMessages();
    setActionLoading(`dispute-${disputeToUpdate.id}`);

    try {
      const response = await updateDisputeStatus({
        id: disputeToUpdate.id,
        status: disputeStatus,
        ...(disputeReason.trim()
          ? { reason: disputeReason.trim() }
          : {}),
      });

      await writeAuditLog(
        "UPDATE_PAYMENT_DISPUTE",
        "dispute",
        disputeToUpdate.id,
        `Updated dispute status to ${disputeStatus}${
          disputeReason.trim() ? `. Reason: ${disputeReason.trim()}` : ""
        }`
      );

      setSuccess(response?.message || "✅ Dispute status update हो गया।");

      closeDisputeModal();
      await loadSummaryData();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Dispute status update नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const downloadExportResponse = (response, fileName) => {
    if (!response) {
      return;
    }

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
        csv: exportPaymentsCSV,
        excel: exportPaymentsExcel,
        pdf: exportPaymentsPDF,
      };

      const exportFunction = exportFunctions[format];

      if (!exportFunction) {
        throw new Error("Invalid export format.");
      }

      const response = await exportFunction({
        search: debouncedSearch,
        status: statusFilter,
        ids: selectedIds,
      });

      downloadExportResponse(response, `payments-report.${format}`);

      await writeAuditLog(
        `EXPORT_PAYMENTS_${format.toUpperCase()}`,
        "payment_report",
        "",
        `Exported payments in ${format.toUpperCase()} format`
      );

      setSuccess(
        `✅ Payment report ${format.toUpperCase()} में export हो गई।`
      );
    } catch (err) {
      setError(
        err?.message ||
          `⚠️ ${format.toUpperCase()} export नहीं हो पाया। कृपया फिर से कोशिश करें।`
      );
    } finally {
      setActionLoading("");
    }
  };

  const MetricCard = ({ label, value, color = "text-indigo-900" }) => (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>
        {value ?? 0}
      </p>
    </div>
  );

  const isAllSelected =
    transactions.length > 0 &&
    transactions.every((transaction) => selectedIds.includes(transaction.id));

  return (
    <div className="payment-manager px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">
            Payment & Transaction Manager 💳
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Transactions, payment gateways, refunds, disputes और payment analytics manage करें।
          </p>
        </div>

        <button
          type="button"
          onClick={refreshPaymentData}
          disabled={
            loadingTransactions ||
            loadingSummary ||
            Boolean(actionLoading)
          }
          className="rounded-md bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Refresh Payment Data
        </button>
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

      <section className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-indigo-900">
            Payment Analytics
          </h2>

          {loadingSummary && (
            <span className="text-sm text-gray-500">
              Loading summary...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total Transactions" value={analytics?.totalTransactions} />
          <MetricCard label="Total Revenue" value={formatAmount(analytics?.totalRevenue)} color="text-green-600" />
          <MetricCard label="Successful Payments" value={analytics?.successfulPayments} color="text-green-600" />
          <MetricCard label="Failed Payments" value={analytics?.failedPayments} color="text-red-600" />
          <MetricCard label="Pending Payments" value={analytics?.pendingPayments} color="text-yellow-600" />
          <MetricCard label="Total Refunds" value={analytics?.totalRefunds} color="text-purple-600" />
          <MetricCard label="Refund Amount" value={formatAmount(analytics?.refundAmount)} color="text-red-600" />
          <MetricCard label="Open Disputes" value={analytics?.openDisputes} color="text-orange-600" />
          <MetricCard label="Resolved Disputes" value={analytics?.resolvedDisputes} color="text-green-600" />
        </div>
      </section>

      <section className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-indigo-900">
          Filters & Export
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            type="text"
            placeholder="Search transaction, order, customer..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          />

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="refundable">Refundable</option>
            <option value="refunded">Refunded</option>
          </select>

          <button
            type="button"
            onClick={openBulkRefundModal}
            disabled={Boolean(actionLoading)}
            className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Bulk Refund ({selectedIds.length})
          </button>

          <button
            type="button"
            onClick={() => handleExport("csv")}
            disabled={Boolean(actionLoading)}
            className="rounded-md bg-yellow-500 px-4 py-2 text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading === "export-csv" ? "Exporting..." : "Export CSV"}
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleExport("excel")}
              disabled={Boolean(actionLoading)}
              className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading === "export-excel"
                ? "Exporting..."
                : "Excel"}
            </button>

            <button
              type="button"
              onClick={() => handleExport("pdf")}
              disabled={Boolean(actionLoading)}
              className="flex-1 rounded-md bg-purple-600 px-3 py-2 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading === "export-pdf"
                ? "Exporting..."
                : "PDF"}
            </button>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-indigo-900">
              Transactions
            </h2>
            <p className="text-sm text-gray-500">
              Total matching transactions: {totalTransactions}
            </p>
          </div>

          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
        </div>

        {loadingTransactions && transactions.length === 0 ? (
          <p className="py-8 text-center text-indigo-700">
            ✨ Loading transactions...
          </p>
        ) : transactions.length === 0 ? (
          <p className="py-8 text-center text-gray-600">
            No transactions found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-gray-700">
                  <th className="border px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleAllTransactions}
                      aria-label="Select all transactions"
                    />
                  </th>
                  <th className="border px-3 py-2">Transaction</th>
                  <th className="border px-3 py-2">Order</th>
                  <th className="border px-3 py-2">Customer</th>
                  <th className="border px-3 py-2">Amount</th>
                  <th className="border px-3 py-2">Gateway</th>
                  <th className="border px-3 py-2">Status</th>
                  <th className="border px-3 py-2">Date</th>
                  <th className="border px-3 py-2">Actions</th>
                </tr>
              </thead>

              <tbody>
                {transactions.map((transaction) => {
                  const canRefund =
                    String(transaction.status || "").toLowerCase() ===
                    "refundable";

                  return (
                    <tr
                      key={transaction.id}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="border px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(transaction.id)}
                          onChange={() =>
                            toggleTransactionSelection(transaction.id)
                          }
                          aria-label={`Select transaction ${transaction.id}`}
                        />
                      </td>

                      <td className="border px-3 py-2 font-mono text-xs">
                        {transaction.id || "—"}
                      </td>

                      <td className="border px-3 py-2">
                        {transaction.orderId || "—"}
                      </td>

                      <td className="border px-3 py-2">
                        {transaction.customer || "—"}
                      </td>

                      <td className="border px-3 py-2 font-medium">
                        {formatAmount(
                          transaction.amount,
                          transaction.currency || "₹"
                        )}
                      </td>

                      <td className="border px-3 py-2">
                        {transaction.gateway || "—"}
                      </td>

                      <td className="border px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                            transaction.status
                          )}`}
                        >
                          {transaction.status || "unknown"}
                        </span>
                      </td>

                      <td className="border px-3 py-2">
                        {transaction.createdAt || "—"}
                      </td>

                      <td className="border px-3 py-2">
                        <button
                          type="button"
                          onClick={() => openRefundModal(transaction)}
                          disabled={!canRefund || Boolean(actionLoading)}
                          className="font-medium text-pink-600 hover:text-pink-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Process Refund
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              setPage((currentPage) => Math.max(1, currentPage - 1))
            }
            disabled={page <= 1 || loadingTransactions}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← Previous
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
            disabled={page >= totalPages || loadingTransactions}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-indigo-900">
            Payment Gateways
          </h2>

          {gateways.length === 0 ? (
            <p className="py-4 text-sm text-gray-600">
              No payment gateways found.
            </p>
          ) : (
            <div className="space-y-3">
              {gateways.map((gateway) => (
                <div
                  key={gateway.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium text-indigo-900">
                      {gateway.name || "Payment Gateway"}
                    </p>
                    <p className="text-sm text-gray-600">
                      Status: {gateway.status || "—"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                        gateway.enabled ? "enabled" : "disabled"
                      )}`}
                    >
                      {gateway.enabled ? "enabled" : "disabled"}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleGatewayToggle(gateway)}
                      disabled={Boolean(actionLoading)}
                      className="rounded-md bg-indigo-700 px-3 py-1.5 text-sm text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionLoading === `gateway-toggle-${gateway.id}`
                        ? "Updating..."
                        : gateway.enabled
                          ? "Disable"
                          : "Enable"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGatewayTest(gateway)}
                      disabled={Boolean(actionLoading)}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionLoading === `gateway-test-${gateway.id}`
                        ? "Testing..."
                        : "Test"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-indigo-900">
            Customer Disputes
          </h2>

          {disputes.length === 0 ? (
            <p className="py-4 text-sm text-gray-600">
              No disputes found.
            </p>
          ) : (
            <div className="max-h-80 space-y-3 overflow-y-auto">
              {disputes.map((dispute) => (
                <div key={dispute.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-indigo-900">
                        Order: {dispute.orderId || "—"}
                      </p>
                      <p className="text-sm text-gray-600">
                        Customer: {dispute.customer || "—"}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        Reason: {dispute.reason || "—"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                        dispute.status
                      )}`}
                    >
                      {dispute.status || "open"}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    Created: {dispute.createdAt || "—"}
                    {dispute.updatedAt
                      ? ` • Updated: ${dispute.updatedAt}`
                      : ""}
                  </p>

                  <button
                    type="button"
                    onClick={() => openDisputeModal(dispute)}
                    disabled={Boolean(actionLoading)}
                    className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Update Dispute
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {showRefundModal && transactionToRefund && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Process refund"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Process Refund
                </h2>
                <p className="text-sm text-gray-500">
                  Transaction: {transactionToRefund.id || "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeRefundModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <p className="mb-3 text-sm text-gray-600">
              Maximum refundable amount:{" "}
              {formatAmount(
                transactionToRefund.amount,
                transactionToRefund.currency || "₹"
              )}
            </p>

            <input
              type="number"
              min="0.01"
              step="0.01"
              value={refundAmount}
              onChange={(event) => setRefundAmount(event.target.value)}
              placeholder="Refund amount"
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-pink-500"
            />

            <textarea
              value={refundReason}
              onChange={(event) => setRefundReason(event.target.value)}
              rows={4}
              placeholder="Refund reason (optional)"
              className="mt-3 w-full rounded-md border p-3 outline-none focus:border-pink-500"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeRefundModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveRefund}
                disabled={
                  actionLoading === `refund-${transactionToRefund.id}`
                }
                className="rounded-md bg-pink-600 px-4 py-2 text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `refund-${transactionToRefund.id}`
                  ? "Processing..."
                  : "Process Refund"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkRefundModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Bulk refund"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Bulk Refund
                </h2>
                <p className="text-sm text-gray-500">
                  Selected transactions: {selectedIds.length}
                </p>
              </div>

              <button
                type="button"
                onClick={closeBulkRefundModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <textarea
              value={bulkRefundReason}
              onChange={(event) => setBulkRefundReason(event.target.value)}
              rows={5}
              placeholder="Bulk refund reason (optional)"
              className="w-full rounded-md border p-3 outline-none focus:border-red-500"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeBulkRefundModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveBulkRefund}
                disabled={actionLoading === "bulk-refund"}
                className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "bulk-refund"
                  ? "Processing..."
                  : "Process Bulk Refund"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDisputeModal && disputeToUpdate && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Update dispute status"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Update Dispute
                </h2>
                <p className="text-sm text-gray-500">
                  Order: {disputeToUpdate.orderId || "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDisputeModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <select
              value={disputeStatus}
              onChange={(event) => setDisputeStatus(event.target.value)}
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
            >
              <option value="open">Open</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>

            <textarea
              value={disputeReason}
              onChange={(event) => setDisputeReason(event.target.value)}
              rows={5}
              placeholder="Resolution / rejection reason (optional)"
              className="mt-3 w-full rounded-md border p-3 outline-none focus:border-blue-500"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDisputeModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveDisputeStatus}
                disabled={
                  actionLoading === `dispute-${disputeToUpdate.id}`
                }
                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `dispute-${disputeToUpdate.id}`
                  ? "Saving..."
                  : "Update Dispute"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentManager;