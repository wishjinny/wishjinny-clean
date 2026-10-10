import React, { useEffect, useMemo, useState } from "react";
import {
  fetchFinancialOverview,
  fetchTransactions,
  fetchTransactionDetails,
  fetchPaymentIntegrations,
  configurePaymentIntegration,
  enablePaymentIntegration,
  disablePaymentIntegration,
  testPaymentIntegration,
  fetchRefunds,
  approveRefund,
  rejectRefund,
  processRefund,
  fetchVendorSettlements,
  processVendorSettlement,
  fetchTaxCompliance,
  updateTaxConfiguration,
  fetchFinancialAnalytics,
  generateFinancialReport,
  exportFinanceCSV,
  exportFinanceExcel,
  exportFinancePDF,
  bulkUpdateFinance,
  logAuditEvent,
} from "../utils/api";

const PAGE_SIZE = 10;

function FinanceManager() {
  const [overview, setOverview] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [taxCompliance, setTaxCompliance] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [selectedSettlement, setSelectedSettlement] = useState(null);

  const [selectedTransactionIds, setSelectedTransactionIds] = useState([]);
  const [selectedSettlementIds, setSelectedSettlementIds] = useState([]);

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

  const [gatewayConfig, setGatewayConfig] = useState(null);
  const [gatewayConfigValue, setGatewayConfigValue] = useState("{}");

  const [editingTax, setEditingTax] = useState(false);
  const [gstRate, setGstRate] = useState("");

  const currency = overview?.currency || "₹";

  const transactionFilters = useMemo(
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
  }, [page, transactionFilters.search, transactionFilters.status]);

  useEffect(() => {
    loadAllSummaryData();
  }, []);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const getApiItems = (response) => {
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

  const formatAmount = (value) => {
    const amount = Number(value);

    if (Number.isNaN(amount)) {
      return `${currency} 0`;
    }

    return `${currency} ${amount.toLocaleString("en-IN")}`;
  };

  const getStatusClass = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (
      normalized === "successful" ||
      normalized === "success" ||
      normalized === "paid" ||
      normalized === "approved" ||
      normalized === "processed" ||
      normalized === "enabled" ||
      normalized === "active"
    ) {
      return "bg-green-100 text-green-700";
    }

    if (
      normalized === "failed" ||
      normalized === "rejected" ||
      normalized === "cancelled" ||
      normalized === "disabled" ||
      normalized === "error"
    ) {
      return "bg-red-100 text-red-700";
    }

    if (
      normalized === "pending" ||
      normalized === "requested" ||
      normalized === "processing"
    ) {
      return "bg-yellow-100 text-yellow-800";
    }

    if (normalized === "refunded") {
      return "bg-purple-100 text-purple-700";
    }

    return "bg-gray-100 text-gray-700";
  };

  const getCurrentFilters = () => ({
    search: debouncedSearch,
    status: statusFilter,
  });

  const loadAllSummaryData = async () => {
    setLoadingSummary(true);
    setError("");

    const results = await Promise.allSettled([
      fetchFinancialOverview(),
      fetchRefunds({ page: 1, limit: PAGE_SIZE }),
      fetchVendorSettlements({ page: 1, limit: PAGE_SIZE }),
      fetchPaymentIntegrations(),
      fetchTaxCompliance(),
      fetchFinancialAnalytics(),
    ]);

    const [
      overviewResult,
      refundsResult,
      settlementsResult,
      gatewaysResult,
      taxResult,
      analyticsResult,
    ] = results;

    if (overviewResult.status === "fulfilled") {
      setOverview(overviewResult.value || null);
    }

    if (refundsResult.status === "fulfilled") {
      setRefunds(getApiItems(refundsResult.value));
    }

    if (settlementsResult.status === "fulfilled") {
      setSettlements(getApiItems(settlementsResult.value));
    }

    if (gatewaysResult.status === "fulfilled") {
      setGateways(getApiItems(gatewaysResult.value));
    }

    if (taxResult.status === "fulfilled") {
      const taxData = taxResult.value || null;
      setTaxCompliance(taxData);

      if (taxData?.gstRate !== undefined && taxData?.gstRate !== null) {
        setGstRate(String(taxData.gstRate));
      }
    }

    if (analyticsResult.status === "fulfilled") {
      setAnalytics(analyticsResult.value || null);
    }

    if (results.some((result) => result.status === "rejected")) {
      setError("⚠️ कुछ financial data load नहीं हो पाया। Refresh करके फिर कोशिश करें।");
    }

    setLoadingSummary(false);
  };

  const loadTransactions = async () => {
    setLoadingTransactions(true);
    setError("");

    try {
      const response = await fetchTransactions({
        page,
        limit: PAGE_SIZE,
        ...transactionFilters,
      });

      const items = getApiItems(response);

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

  const refreshAll = async () => {
    clearMessages();

    await Promise.all([loadTransactions(), loadAllSummaryData()]);

    setSuccess("✅ Finance Manager का data refresh हो गया।");
  };

  const openTransactionDetail = async (transaction) => {
    clearMessages();
    setActionLoading(`transaction-${transaction.id}`);

    try {
      const response = await fetchTransactionDetails({ id: transaction.id });
      setSelectedTransaction(response || transaction);
    } catch (err) {
      setSelectedTransaction(transaction);
      setError(
        err?.message ||
          "⚠️ Transaction detail पूरा load नहीं हो पाया, basic information दिखाई जा रही है।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const closeAllModals = () => {
    setSelectedTransaction(null);
    setSelectedRefund(null);
    setSelectedSettlement(null);
    setGatewayConfig(null);
    setEditingTax(false);
  };

  const writeAuditLog = async (action, resourceType, resourceId) => {
    try {
      await logAuditEvent({
        action,
        resourceType,
        resourceId: resourceId || "",
      });
    } catch {
      // Main financial action succeeds even if audit logging fails.
    }
  };

  const handleRefundAction = async (refund, action) => {
    clearMessages();

    const actionFunctions = {
      approve: approveRefund,
      reject: rejectRefund,
      process: processRefund,
    };

    const actionLabels = {
      approve: "approve",
      reject: "reject",
      process: "process",
    };

    const requestFunction = actionFunctions[action];

    if (!requestFunction) {
      setError("⚠️ Invalid refund action.");
      return;
    }

    setActionLoading(`refund-${action}-${refund.id}`);

    try {
      await requestFunction({ id: refund.id });

      await writeAuditLog(
        `${actionLabels[action].toUpperCase()}_REFUND`,
        "refund",
        refund.id
      );

      setSuccess(`✅ Refund ${actionLabels[action]} हो गया।`);

      await Promise.all([loadAllSummaryData(), loadTransactions()]);
      setSelectedRefund(null);
    } catch (err) {
      setError(
        err?.message ||
          `⚠️ Refund ${actionLabels[action]} नहीं हो पाया। कृपया फिर से कोशिश करें।`
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleProcessSettlement = async (settlement) => {
    clearMessages();
    setActionLoading(`settlement-${settlement.id}`);

    try {
      await processVendorSettlement({ id: settlement.id });

      await writeAuditLog(
        "PROCESS_VENDOR_SETTLEMENT",
        "vendor_settlement",
        settlement.id
      );

      setSuccess("✅ Vendor settlement process हो गया।");

      await loadAllSummaryData();
      setSelectedSettlement(null);
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Vendor settlement process नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleGatewayAction = async (gateway, action) => {
    clearMessages();

    const actionFunctions = {
      enable: enablePaymentIntegration,
      disable: disablePaymentIntegration,
      test: testPaymentIntegration,
    };

    const requestFunction = actionFunctions[action];

    if (!requestFunction) {
      setError("⚠️ Invalid gateway action.");
      return;
    }

    setActionLoading(`gateway-${action}-${gateway.id}`);

    try {
      const response = await requestFunction({ id: gateway.id });

      await writeAuditLog(
        `${action.toUpperCase()}_PAYMENT_INTEGRATION`,
        "payment_integration",
        gateway.id
      );

      setSuccess(
        response?.message ||
          `✅ ${gateway.name || "Payment gateway"} ${action} हो गया।`
      );

      await loadAllSummaryData();
    } catch (err) {
      setError(
        err?.message ||
          `⚠️ Payment gateway ${action} नहीं हो पाया। कृपया फिर से कोशिश करें।`
      );
    } finally {
      setActionLoading("");
    }
  };

  const openGatewayConfig = (gateway) => {
    clearMessages();

    setGatewayConfig(gateway);
    setGatewayConfigValue(
      JSON.stringify(gateway?.config || gateway?.configuration || {}, null, 2)
    );
  };

  const saveGatewayConfig = async () => {
    if (!gatewayConfig?.id) {
      return;
    }

    clearMessages();

    let config;

    try {
      config = JSON.parse(gatewayConfigValue || "{}");
    } catch {
      setError("⚠️ Gateway configuration valid JSON format में लिखें।");
      return;
    }

    setActionLoading(`gateway-config-${gatewayConfig.id}`);

    try {
      const response = await configurePaymentIntegration({
        id: gatewayConfig.id,
        config,
      });

      await writeAuditLog(
        "CONFIGURE_PAYMENT_INTEGRATION",
        "payment_integration",
        gatewayConfig.id
      );

      setSuccess(
        response?.message ||
          "✅ Payment gateway configuration save हो गई।"
      );

      setGatewayConfig(null);
      await loadAllSummaryData();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Payment gateway configuration save नहीं हो पाई।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const saveTaxConfiguration = async () => {
    clearMessages();

    const parsedGstRate = Number(gstRate);

    if (
      Number.isNaN(parsedGstRate) ||
      parsedGstRate < 0 ||
      parsedGstRate > 100
    ) {
      setError("⚠️ GST rate 0 से 100 के बीच डालें।");
      return;
    }

    setActionLoading("tax-config");

    try {
      const response = await updateTaxConfiguration({
        gstRate: parsedGstRate,
      });

      await writeAuditLog(
        "UPDATE_TAX_CONFIGURATION",
        "tax_configuration",
        "gst_rate"
      );

      setSuccess(
        response?.message || "✅ Tax configuration update हो गई।"
      );

      setEditingTax(false);
      await loadAllSummaryData();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Tax configuration update नहीं हो पाई। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleGenerateReport = async (reportType) => {
    clearMessages();
    setActionLoading(`report-${reportType}`);

    try {
      const response = await generateFinancialReport({
        type: reportType,
        filter: getCurrentFilters(),
      });

      await writeAuditLog(
        "GENERATE_FINANCIAL_REPORT",
        "financial_report",
        response?.id || response?.reportId || reportType
      );

      if (typeof response === "string") {
        window.open(response, "_blank", "noopener,noreferrer");
      } else if (response?.url) {
        window.open(response.url, "_blank", "noopener,noreferrer");
      }

      setSuccess(`✅ ${reportType} report generate हो गई।`);
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Financial report generate नहीं हो पाई। कृपया फिर से कोशिश करें।"
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
      const url = window.URL.createObjectURL(response);
      const link = document.createElement("a");

      link.href = url;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    }
  };

  const handleExport = async (format) => {
    clearMessages();
    setActionLoading(`export-${format}`);

    try {
      const exportFunctions = {
        csv: exportFinanceCSV,
        excel: exportFinanceExcel,
        pdf: exportFinancePDF,
      };

      const exportFunction = exportFunctions[format];

      if (!exportFunction) {
        throw new Error("Invalid export format.");
      }

      const response = await exportFunction({
        filter: getCurrentFilters(),
      });

      downloadExportResponse(response, `finance-report.${format}`);

      await writeAuditLog(
        `EXPORT_FINANCE_${format.toUpperCase()}`,
        "financial_report",
        ""
      );

      setSuccess(`✅ Finance report ${format.toUpperCase()} में export हो गई।`);
    } catch (err) {
      setError(
        err?.message ||
          `⚠️ ${format.toUpperCase()} export नहीं हो पाया। कृपया फिर से कोशिश करें।`
      );
    } finally {
      setActionLoading("");
    }
  };

  const toggleTransactionSelection = (transactionId) => {
    setSelectedTransactionIds((currentIds) =>
      currentIds.includes(transactionId)
        ? currentIds.filter((id) => id !== transactionId)
        : [...currentIds, transactionId]
    );
  };

  const toggleSettlementSelection = (settlementId) => {
    setSelectedSettlementIds((currentIds) =>
      currentIds.includes(settlementId)
        ? currentIds.filter((id) => id !== settlementId)
        : [...currentIds, settlementId]
    );
  };

  const toggleAllTransactions = () => {
    const currentPageIds = transactions
      .map((transaction) => transaction.id)
      .filter(Boolean);

    const everySelected =
      currentPageIds.length > 0 &&
      currentPageIds.every((id) => selectedTransactionIds.includes(id));

    setSelectedTransactionIds((currentIds) => {
      if (everySelected) {
        return currentIds.filter((id) => !currentPageIds.includes(id));
      }

      return Array.from(new Set([...currentIds, ...currentPageIds]));
    });
  };

  const toggleAllSettlements = () => {
    const currentSettlementIds = settlements
      .map((settlement) => settlement.id)
      .filter(Boolean);

    const everySelected =
      currentSettlementIds.length > 0 &&
      currentSettlementIds.every((id) =>
        selectedSettlementIds.includes(id)
      );

    setSelectedSettlementIds((currentIds) => {
      if (everySelected) {
        return currentIds.filter((id) => !currentSettlementIds.includes(id));
      }

      return Array.from(new Set([...currentIds, ...currentSettlementIds]));
    });
  };

  const handleBulkUpdate = async () => {
    clearMessages();

    if (selectedTransactionIds.length === 0) {
      setError("⚠️ Bulk update के लिए कम से कम एक transaction select करें।");
      return;
    }

    setActionLoading("bulk-update");

    try {
      const response = await bulkUpdateFinance({
        ids: selectedTransactionIds,
        update: {
          reviewed: true,
          status: "reviewed",
        },
      });

      await writeAuditLog(
        "BULK_UPDATE_FINANCE",
        "transaction",
        selectedTransactionIds.join(",")
      );

      setSuccess(
        response?.message ||
          `✅ ${selectedTransactionIds.length} selected transactions bulk update हो गए।`
      );

      setSelectedTransactionIds([]);
      await loadTransactions();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Bulk update नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleBulkSettlement = async () => {
    clearMessages();

    if (selectedSettlementIds.length === 0) {
      setError("⚠️ Bulk settlement के लिए कम से कम एक settlement select करें।");
      return;
    }

    setActionLoading("bulk-settlement");

    try {
      const selectedSettlementRecords = settlements.filter((settlement) =>
        selectedSettlementIds.includes(settlement.id)
      );

      const results = await Promise.allSettled(
        selectedSettlementRecords.map((settlement) =>
          processVendorSettlement({ id: settlement.id })
        )
      );

      const successfulCount = results.filter(
        (result) => result.status === "fulfilled"
      ).length;

      await writeAuditLog(
        "BULK_PROCESS_VENDOR_SETTLEMENT",
        "vendor_settlement",
        selectedSettlementIds.join(",")
      );

      if (successfulCount === 0) {
        throw new Error("कोई settlement process नहीं हो पाया।");
      }

      setSuccess(
        `✅ ${successfulCount} of ${selectedSettlementIds.length} settlements process हो गए।`
      );

      setSelectedSettlementIds([]);
      await loadAllSummaryData();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Bulk settlement process नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleBulkExport = async () => {
    clearMessages();
    setActionLoading("bulk-export");

    try {
      const response = await exportFinanceExcel({
        filter: {
          ...getCurrentFilters(),
          transactionIds: selectedTransactionIds,
          settlementIds: selectedSettlementIds,
        },
      });

      downloadExportResponse(response, "finance-bulk-export.xlsx");

      await writeAuditLog(
        "BULK_EXPORT_FINANCE",
        "financial_report",
        ""
      );

      setSuccess("✅ Selected finance data Excel में export हो गया।");
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Bulk export नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const MetricCard = ({ label, value, color = "text-indigo-900" }) => (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="text-sm text-gray-600">{label}</h3>
      <p className={`mt-1 text-xl font-bold ${color}`}>
        {value}
      </p>
    </div>
  );

  const isAllTransactionsSelected =
    transactions.length > 0 &&
    transactions.every((transaction) =>
      selectedTransactionIds.includes(transaction.id)
    );

  const isAllSettlementsSelected =
    settlements.length > 0 &&
    settlements.every((settlement) =>
      selectedSettlementIds.includes(settlement.id)
    );

  return (
    <div className="finance-manager px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">
            Super Admin Finance Manager 💰
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Revenue, transactions, refunds, settlements, taxes और payment gateways को manage करें।
          </p>
        </div>

        <button
          type="button"
          onClick={refreshAll}
          disabled={
            loadingTransactions ||
            loadingSummary ||
            Boolean(actionLoading)
          }
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Refresh Finance Data
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
            Financial Overview
          </h2>

          {overview?.period && (
            <span className="text-sm text-gray-500">
              Period: {overview.period}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Revenue"
            value={formatAmount(overview?.totalRevenue)}
          />
          <MetricCard
            label="Net Revenue"
            value={formatAmount(overview?.netRevenue)}
            color="text-green-600"
          />
          <MetricCard
            label="Gross Sales"
            value={formatAmount(overview?.grossSales)}
          />
          <MetricCard
            label="Refunds"
            value={formatAmount(overview?.refunds)}
            color="text-red-600"
          />
          <MetricCard
            label="Pending Payments"
            value={formatAmount(overview?.pendingPayments)}
            color="text-yellow-600"
          />
          <MetricCard
            label="Vendor Payable"
            value={formatAmount(overview?.vendorPayable)}
          />
          <MetricCard
            label="Commission"
            value={formatAmount(overview?.commission)}
          />
          <MetricCard
            label="Profit / Loss"
            value={formatAmount(overview?.profitLoss)}
            color={
              Number(overview?.profitLoss) < 0
                ? "text-red-600"
                : "text-green-600"
            }
          />
        </div>
      </section>

      <section className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-indigo-900">
          Transaction Filters
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            type="text"
            placeholder="Search by transaction, order, customer, vendor..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
          />

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="successful">Successful</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
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
            <table className="min-w-[1200px] w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-gray-700">
                  <th className="border px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isAllTransactionsSelected}
                      onChange={toggleAllTransactions}
                      aria-label="Select all transactions"
                    />
                  </th>
                  <th className="border px-3 py-2">ID</th>
                  <th className="border px-3 py-2">Order</th>
                  <th className="border px-3 py-2">Customer</th>
                  <th className="border px-3 py-2">Vendor</th>
                  <th className="border px-3 py-2">Amount</th>
                  <th className="border px-3 py-2">Method</th>
                  <th className="border px-3 py-2">Type</th>
                  <th className="border px-3 py-2">Status</th>
                  <th className="border px-3 py-2">Date</th>
                  <th className="border px-3 py-2">Action</th>
                </tr>
              </thead>

              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="border px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedTransactionIds.includes(
                          transaction.id
                        )}
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
                    <td className="border px-3 py-2">
                      {transaction.vendor || "—"}
                    </td>
                    <td className="border px-3 py-2">
                      {formatAmount(transaction.amount)}
                    </td>
                    <td className="border px-3 py-2">
                      {transaction.method || "—"}
                    </td>
                    <td className="border px-3 py-2">
                      {transaction.type || "—"}
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
                      {transaction.date || "—"}
                    </td>
                    <td className="border px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openTransactionDetail(transaction)}
                        disabled={
                          actionLoading === `transaction-${transaction.id}`
                        }
                        className="font-medium text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {actionLoading === `transaction-${transaction.id}`
                          ? "Loading..."
                          : "View"}
                      </button>
                    </td>
                  </tr>
                ))}
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

      <section className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-indigo-900">
              Refunds & Returns
            </h2>
            <p className="text-sm text-gray-500">
              Review, approve, reject या process refund requests।
            </p>
          </div>
        </div>

        {refunds.length === 0 ? (
          <p className="py-6 text-center text-gray-600">
            No refunds found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-gray-700">
                  <th className="border px-3 py-2">ID</th>
                  <th className="border px-3 py-2">Order</th>
                  <th className="border px-3 py-2">Customer</th>
                  <th className="border px-3 py-2">Vendor</th>
                  <th className="border px-3 py-2">Amount</th>
                  <th className="border px-3 py-2">Reason</th>
                  <th className="border px-3 py-2">Status</th>
                  <th className="border px-3 py-2">Date</th>
                  <th className="border px-3 py-2">Actions</th>
                </tr>
              </thead>

              <tbody>
                {refunds.map((refund) => {
                  const status = String(refund.status || "").toLowerCase();
                  const canApproveOrReject = status === "requested";
                  const canProcess = status === "approved";

                  return (
                    <tr key={refund.id} className="border-b hover:bg-gray-50">
                      <td className="border px-3 py-2 font-mono text-xs">
                        {refund.id || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        {refund.orderId || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        {refund.customer || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        {refund.vendor || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        {formatAmount(refund.amount)}
                      </td>
                      <td className="border px-3 py-2">
                        {refund.reason || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                            refund.status
                          )}`}
                        >
                          {refund.status || "unknown"}
                        </span>
                      </td>
                      <td className="border px-3 py-2">
                        {refund.date || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedRefund(refund)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRefundAction(refund, "approve")}
                            disabled={
                              !canApproveOrReject ||
                              Boolean(actionLoading)
                            }
                            className="text-green-600 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Approve
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRefundAction(refund, "reject")}
                            disabled={
                              !canApproveOrReject ||
                              Boolean(actionLoading)
                            }
                            className="text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Reject
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRefundAction(refund, "process")}
                            disabled={
                              !canProcess ||
                              Boolean(actionLoading)
                            }
                            className="text-purple-600 hover:text-purple-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Process
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-indigo-900">
              Vendor Settlements
            </h2>
            <p className="text-sm text-gray-500">
              Select settlements for bulk processing, या individual settlement process करें।
            </p>
          </div>
        </div>

        {settlements.length === 0 ? (
          <p className="py-6 text-center text-gray-600">
            No settlements found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-gray-700">
                  <th className="border px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isAllSettlementsSelected}
                      onChange={toggleAllSettlements}
                      aria-label="Select all settlements"
                    />
                  </th>
                  <th className="border px-3 py-2">Vendor</th>
                  <th className="border px-3 py-2">Gross Sales</th>
                  <th className="border px-3 py-2">Commission</th>
                  <th className="border px-3 py-2">Taxes</th>
                  <th className="border px-3 py-2">Refunds</th>
                  <th className="border px-3 py-2">Net Payable</th>
                  <th className="border px-3 py-2">Status</th>
                  <th className="border px-3 py-2">Date</th>
                  <th className="border px-3 py-2">Actions</th>
                </tr>
              </thead>

              <tbody>
                {settlements.map((settlement) => {
                  const canProcess =
                    String(settlement.status || "").toLowerCase() ===
                    "pending";

                  return (
                    <tr
                      key={settlement.id}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="border px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedSettlementIds.includes(
                            settlement.id
                          )}
                          onChange={() =>
                            toggleSettlementSelection(settlement.id)
                          }
                          aria-label={`Select settlement ${settlement.id}`}
                        />
                      </td>
                      <td className="border px-3 py-2">
                        {settlement.vendor || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        {formatAmount(settlement.grossSales)}
                      </td>
                      <td className="border px-3 py-2">
                        {formatAmount(settlement.commission)}
                      </td>
                      <td className="border px-3 py-2">
                        {formatAmount(settlement.taxes)}
                      </td>
                      <td className="border px-3 py-2">
                        {formatAmount(settlement.refundDeductions)}
                      </td>
                      <td className="border px-3 py-2 font-medium">
                        {formatAmount(settlement.netPayable)}
                      </td>
                      <td className="border px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                            settlement.status
                          )}`}
                        >
                          {settlement.status || "unknown"}
                        </span>
                      </td>
                      <td className="border px-3 py-2">
                        {settlement.date || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedSettlement(settlement)
                            }
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleProcessSettlement(settlement)
                            }
                            disabled={!canProcess || Boolean(actionLoading)}
                            className="text-green-600 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {actionLoading === `settlement-${settlement.id}`
                              ? "Processing..."
                              : "Process"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-indigo-900">
          Payment Integrations
        </h2>

        {gateways.length === 0 ? (
          <p className="py-4 text-gray-600">No payment gateways found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[850px] w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-gray-700">
                  <th className="border px-3 py-2">Name</th>
                  <th className="border px-3 py-2">Provider</th>
                  <th className="border px-3 py-2">Status</th>
                  <th className="border px-3 py-2">Mode</th>
                  <th className="border px-3 py-2">Actions</th>
                </tr>
              </thead>

              <tbody>
                {gateways.map((gateway) => {
                  const isEnabled =
                    String(gateway.status || "").toLowerCase() === "enabled";

                  return (
                    <tr key={gateway.id} className="border-b hover:bg-gray-50">
                      <td className="border px-3 py-2">
                        {gateway.name || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        {gateway.provider || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                            gateway.status
                          )}`}
                        >
                          {gateway.status || "unknown"}
                        </span>
                      </td>
                      <td className="border px-3 py-2">
                        {gateway.mode || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleGatewayAction(gateway, "enable")
                            }
                            disabled={isEnabled || Boolean(actionLoading)}
                            className="text-green-600 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Enable
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleGatewayAction(gateway, "disable")
                            }
                            disabled={!isEnabled || Boolean(actionLoading)}
                            className="text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Disable
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleGatewayAction(gateway, "test")
                            }
                            disabled={Boolean(actionLoading)}
                            className="text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Test
                          </button>

                          <button
                            type="button"
                            onClick={() => openGatewayConfig(gateway)}
                            disabled={Boolean(actionLoading)}
                            className="text-purple-600 hover:text-purple-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Configure
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-indigo-900">
              Taxes & Compliance
            </h2>
            <p className="text-sm text-gray-500">
              Tax collection, payable amount और GST configuration।
            </p>
          </div>

          <button
            type="button"
            onClick={() => setEditingTax(true)}
            disabled={!taxCompliance || Boolean(actionLoading)}
            className="rounded-md border px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Update GST Rate
          </button>
        </div>

        {taxCompliance ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              label="GST Rate"
              value={`${taxCompliance.gstRate ?? 0}%`}
            />
            <MetricCard
              label="Tax Collected"
              value={formatAmount(taxCompliance.taxCollected)}
            />
            <MetricCard
              label="Tax Payable"
              value={formatAmount(taxCompliance.taxPayable)}
              color="text-yellow-600"
            />
            <MetricCard
              label="Tax Period"
              value={taxCompliance.period || "—"}
            />
            <MetricCard
              label="Vendor Tax Info"
              value={taxCompliance.vendorTaxInfo || "—"}
            />
            <MetricCard
              label="Compliance Status"
              value={taxCompliance.complianceStatus || "—"}
              color="text-green-600"
            />
          </div>
        ) : (
          <p className="py-4 text-gray-600">
            Tax compliance data उपलब्ध नहीं है।
          </p>
        )}
      </section>

      <section className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-indigo-900">
          Financial Analytics
        </h2>

        {analytics ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <MetricCard
              label="Payment Success Rate"
              value={`${analytics.paymentSuccessRate ?? 0}%`}
              color="text-green-600"
            />
            <MetricCard
              label="Payment Failure Rate"
              value={`${analytics.paymentFailureRate ?? 0}%`}
              color="text-red-600"
            />

            <div className="rounded-lg border bg-gray-50 p-4">
              <p className="font-medium text-indigo-900">Revenue Trend</p>
              <p className="mt-1 break-words text-sm text-gray-600">
                {(analytics.revenue || []).join(", ") || "No data"}
              </p>
            </div>

            <div className="rounded-lg border bg-gray-50 p-4">
              <p className="font-medium text-indigo-900">
                Transaction Trend
              </p>
              <p className="mt-1 break-words text-sm text-gray-600">
                {(analytics.transactions || []).join(", ") || "No data"}
              </p>
            </div>

            <div className="rounded-lg border bg-gray-50 p-4">
              <p className="font-medium text-indigo-900">Refund Trend</p>
              <p className="mt-1 break-words text-sm text-gray-600">
                {(analytics.refunds || []).join(", ") || "No data"}
              </p>
            </div>

            <div className="rounded-lg border bg-gray-50 p-4">
              <p className="font-medium text-indigo-900">Settlement Trend</p>
              <p className="mt-1 break-words text-sm text-gray-600">
                {(analytics.settlements || []).join(", ") || "No data"}
              </p>
            </div>

            <div className="rounded-lg border bg-gray-50 p-4">
              <p className="font-medium text-indigo-900">Tax Data</p>
              <p className="mt-1 break-words text-sm text-gray-600">
                {(analytics.taxData || []).join(", ") || "No data"}
              </p>
            </div>

            <div className="rounded-lg border bg-gray-50 p-4">
              <p className="font-medium text-indigo-900">
                Profit / Loss Trend
              </p>
              <p className="mt-1 break-words text-sm text-gray-600">
                {(analytics.profitLoss || []).join(", ") || "No data"}
              </p>
            </div>
          </div>
        ) : (
          <p className="py-4 text-gray-600">
            Financial analytics data उपलब्ध नहीं है।
          </p>
        )}
      </section>

      <section className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-indigo-900">
          Reports & Export
        </h2>

        <div className="flex flex-wrap gap-2">
          {[
            ["transaction", "Transaction Report", "bg-blue-600 hover:bg-blue-700"],
            ["revenue", "Revenue Report", "bg-green-600 hover:bg-green-700"],
            ["refund", "Refund Report", "bg-purple-600 hover:bg-purple-700"],
            ["settlement", "Settlement Report", "bg-yellow-600 hover:bg-yellow-700"],
            ["tax", "Tax Report", "bg-indigo-600 hover:bg-indigo-700"],
            ["profitloss", "Profit/Loss Report", "bg-red-600 hover:bg-red-700"],
          ].map(([type, label, colorClass]) => (
            <button
              key={type}
              type="button"
              onClick={() => handleGenerateReport(type)}
              disabled={Boolean(actionLoading)}
              className={`rounded-md px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60 ${colorClass}`}
            >
              {actionLoading === `report-${type}` ? "Generating..." : label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleExport("csv")}
            disabled={Boolean(actionLoading)}
            className="rounded-md bg-yellow-500 px-3 py-2 text-sm text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading === "export-csv" ? "Exporting..." : "Export CSV"}
          </button>

          <button
            type="button"
            onClick={() => handleExport("excel")}
            disabled={Boolean(actionLoading)}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading === "export-excel"
              ? "Exporting..."
              : "Export Excel"}
          </button>

          <button
            type="button"
            onClick={() => handleExport("pdf")}
            disabled={Boolean(actionLoading)}
            className="rounded-md bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading === "export-pdf" ? "Exporting..." : "Export PDF"}
          </button>
        </div>
      </section>

      <section className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-indigo-900">
          Bulk Operations
        </h2>

        <p className="mb-3 text-sm text-gray-600">
          Selected transactions: {selectedTransactionIds.length} | Selected settlements:{" "}
          {selectedSettlementIds.length}
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleBulkUpdate}
            disabled={
              selectedTransactionIds.length === 0 || Boolean(actionLoading)
            }
            className="rounded-md bg-yellow-500 px-3 py-2 text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLoading === "bulk-update"
              ? "Updating..."
              : "Bulk Update Transactions"}
          </button>

          <button
            type="button"
            onClick={handleBulkSettlement}
            disabled={
              selectedSettlementIds.length === 0 || Boolean(actionLoading)
            }
            className="rounded-md bg-green-600 px-3 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLoading === "bulk-settlement"
              ? "Processing..."
              : "Bulk Process Settlements"}
          </button>

          <button
            type="button"
            onClick={handleBulkExport}
            disabled={Boolean(actionLoading)}
            className="rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLoading === "bulk-export"
              ? "Exporting..."
              : "Bulk Export Excel"}
          </button>
        </div>
      </section>

      <section className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-indigo-900">
          Audit & Integration
        </h2>
        <p className="text-sm text-gray-600">
          Sensitive financial actions के लिए audit logging enabled है।
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Full audit history देखने के लिए Audit Manager खोलें।
        </p>
      </section>

      {selectedTransaction && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Transaction details"
        >
          <button
            type="button"
            aria-label="Close transaction details"
            onClick={closeAllModals}
            className="absolute inset-0 cursor-default"
          />

          <div className="relative z-10 h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Transaction Detail
                </h2>
                <p className="text-sm text-gray-500">
                  ID: {selectedTransaction.id || "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeAllModals}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 rounded-lg border bg-gray-50 p-4 text-sm">
              <p><span className="font-medium">Order ID:</span> {selectedTransaction.orderId || "—"}</p>
              <p><span className="font-medium">Customer:</span> {selectedTransaction.customer || "—"}</p>
              <p><span className="font-medium">Vendor:</span> {selectedTransaction.vendor || "—"}</p>
              <p><span className="font-medium">Amount:</span> {formatAmount(selectedTransaction.amount)}</p>
              <p><span className="font-medium">Payment Method:</span> {selectedTransaction.method || "—"}</p>
              <p><span className="font-medium">Transaction Type:</span> {selectedTransaction.type || "—"}</p>
              <p><span className="font-medium">Status:</span> {selectedTransaction.status || "—"}</p>
              <p><span className="font-medium">Date:</span> {selectedTransaction.date || "—"}</p>
              <p><span className="font-medium">Description:</span> {selectedTransaction.description || "—"}</p>
            </div>
          </div>
        </div>
      )}

      {selectedRefund && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Refund details"
        >
          <button
            type="button"
            aria-label="Close refund details"
            onClick={closeAllModals}
            className="absolute inset-0 cursor-default"
          />

          <div className="relative z-10 h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Refund Detail
                </h2>
                <p className="text-sm text-gray-500">
                  ID: {selectedRefund.id || "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeAllModals}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 rounded-lg border bg-gray-50 p-4 text-sm">
              <p><span className="font-medium">Order ID:</span> {selectedRefund.orderId || "—"}</p>
              <p><span className="font-medium">Customer:</span> {selectedRefund.customer || "—"}</p>
              <p><span className="font-medium">Vendor:</span> {selectedRefund.vendor || "—"}</p>
              <p><span className="font-medium">Amount:</span> {formatAmount(selectedRefund.amount)}</p>
              <p><span className="font-medium">Reason:</span> {selectedRefund.reason || "—"}</p>
              <p><span className="font-medium">Status:</span> {selectedRefund.status || "—"}</p>
              <p><span className="font-medium">Date:</span> {selectedRefund.date || "—"}</p>
            </div>
          </div>
        </div>
      )}

      {selectedSettlement && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Settlement details"
        >
          <button
            type="button"
            aria-label="Close settlement details"
            onClick={closeAllModals}
            className="absolute inset-0 cursor-default"
          />

          <div className="relative z-10 h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Vendor Settlement Detail
                </h2>
                <p className="text-sm text-gray-500">
                  ID: {selectedSettlement.id || "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeAllModals}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 rounded-lg border bg-gray-50 p-4 text-sm">
              <p><span className="font-medium">Vendor:</span> {selectedSettlement.vendor || "—"}</p>
              <p><span className="font-medium">Gross Sales:</span> {formatAmount(selectedSettlement.grossSales)}</p>
              <p><span className="font-medium">Commission:</span> {formatAmount(selectedSettlement.commission)}</p>
              <p><span className="font-medium">Taxes:</span> {formatAmount(selectedSettlement.taxes)}</p>
              <p><span className="font-medium">Refund Deductions:</span> {formatAmount(selectedSettlement.refundDeductions)}</p>
              <p><span className="font-medium">Net Payable:</span> {formatAmount(selectedSettlement.netPayable)}</p>
              <p><span className="font-medium">Status:</span> {selectedSettlement.status || "—"}</p>
              <p><span className="font-medium">Date:</span> {selectedSettlement.date || "—"}</p>
            </div>
          </div>
        </div>
      )}

      {gatewayConfig && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Configure payment gateway"
        >
          <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Configure {gatewayConfig.name || "Payment Gateway"}
                </h2>
                <p className="text-sm text-gray-500">
                  Configuration valid JSON format में डालें।
                </p>
              </div>

              <button
                type="button"
                onClick={closeAllModals}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <textarea
              value={gatewayConfigValue}
              onChange={(event) => setGatewayConfigValue(event.target.value)}
              rows={12}
              spellCheck="false"
              className="w-full rounded-md border p-3 font-mono text-sm outline-none focus:border-blue-500"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeAllModals}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveGatewayConfig}
                disabled={
                  actionLoading === `gateway-config-${gatewayConfig.id}`
                }
                className="rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `gateway-config-${gatewayConfig.id}`
                  ? "Saving..."
                  : "Save Configuration"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTax && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Update GST rate"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <h2 className="text-xl font-bold text-indigo-900">
              Update GST Rate
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              0 से 100 के बीच GST percentage डालें।
            </p>

            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={gstRate}
              onChange={(event) => setGstRate(event.target.value)}
              className="mt-4 w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              placeholder="Example: 18"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeAllModals}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveTaxConfiguration}
                disabled={actionLoading === "tax-config"}
                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "tax-config" ? "Saving..." : "Update GST"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FinanceManager;