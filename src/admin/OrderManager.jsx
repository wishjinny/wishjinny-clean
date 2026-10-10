import React, { useEffect, useMemo, useState } from "react";
import {
  fetchOrders,
  fetchOrderDetails,
  updateOrderStatus,
  assignOrderVendor,
  assignOrderWarehouse,
  generateShippingLabel,
  updateTracking,
  fetchShipmentTracking,
  approveReturn,
  rejectReturn,
  processRefund,
  bulkUpdateOrders,
  bulkAssignOrders,
  fetchOrderAnalytics,
  exportOrdersCSV,
  exportOrdersExcel,
  exportOrdersPDF,
  logAuditEvent,
} from "../utils/api";

const PAGE_SIZE = 10;

function OrderManager() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("processing");
  const [bulkVendor, setBulkVendor] = useState("");
  const [bulkWarehouse, setBulkWarehouse] = useState("");

  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentType, setAssignmentType] = useState("");
  const [assignmentOrder, setAssignmentOrder] = useState(null);
  const [assignmentValue, setAssignmentValue] = useState("");

  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState("");

  const [showReturnRejectModal, setShowReturnRejectModal] = useState(false);
  const [returnOrder, setReturnOrder] = useState(null);
  const [returnRejectReason, setReturnRejectReason] = useState("");

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
    loadOrders();
  }, [page, filters.search, filters.status]);

  useEffect(() => {
    loadAnalytics();
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

  const formatAmount = (value) => {
    const amount = Number(value);

    if (Number.isNaN(amount)) {
      return "₹0";
    }

    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const getStatusClass = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (
      normalized === "delivered" ||
      normalized === "shipped" ||
      normalized === "paid" ||
      normalized === "successful"
    ) {
      return "bg-green-100 text-green-700";
    }

    if (
      normalized === "cancelled" ||
      normalized === "returned" ||
      normalized === "refunded" ||
      normalized === "failed" ||
      normalized === "rejected"
    ) {
      return "bg-red-100 text-red-700";
    }

    if (
      normalized === "pending" ||
      normalized === "processing" ||
      normalized === "requested"
    ) {
      return "bg-yellow-100 text-yellow-800";
    }

    return "bg-gray-100 text-gray-700";
  };

  const writeAuditLog = async (action, resourceId, details) => {
    try {
      await logAuditEvent({
        action,
        details: details || "",
        resourceType: "order",
        resourceId: resourceId || "",
      });
    } catch {
      // Main action should not fail only because audit logging fails.
    }
  };

  const loadOrders = async () => {
    setLoadingOrders(true);
    setError("");

    try {
      const response = await fetchOrders({
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

      setOrders(items);
      setTotalPages(Math.max(1, receivedTotalPages));
      setTotalOrders(receivedTotal);
    } catch (err) {
      setOrders([]);
      setError(
        err?.message ||
          "⚠️ Orders load नहीं हो पाए। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadAnalytics = async () => {
    setLoadingAnalytics(true);

    try {
      const response = await fetchOrderAnalytics();
      setAnalytics(response || null);
    } catch {
      setAnalytics(null);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const refreshOrders = async () => {
    clearMessages();

    await Promise.all([loadOrders(), loadAnalytics()]);

    setSuccess("✅ Order Manager का data refresh हो गया।");
  };

  const openOrderDetail = async (order) => {
    clearMessages();
    setActionLoading(`detail-${order.id}`);

    try {
      const [detailResult, trackingResult] = await Promise.allSettled([
        fetchOrderDetails({ id: order.id }),
        fetchShipmentTracking({ id: order.id }),
      ]);

      const detail =
        detailResult.status === "fulfilled"
          ? detailResult.value
          : order;

      const tracking =
        trackingResult.status === "fulfilled"
          ? trackingResult.value
          : detail?.tracking || null;

      setSelectedOrder({
        ...order,
        ...(detail || {}),
        address: detail?.address || {},
        items: Array.isArray(detail?.items) ? detail.items : [],
        payment: detail?.payment || {},
        tracking,
        history: Array.isArray(detail?.history) ? detail.history : [],
      });

      if (detailResult.status === "rejected") {
        setError(
          "⚠️ पूरी order details load नहीं हो पाईं। उपलब्ध जानकारी दिखाई जा रही है।"
        );
      }
    } catch (err) {
      setSelectedOrder({
        ...order,
        address: {},
        items: [],
        payment: {},
        tracking: null,
        history: [],
      });

      setError(
        err?.message ||
          "⚠️ Order details load नहीं हो पाए। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const closeOrderDetail = () => {
    setSelectedOrder(null);
  };

  const handleStatusChange = async (order, status) => {
    clearMessages();
    setActionLoading(`status-${order.id}`);

    try {
      const response = await updateOrderStatus({
        id: order.id,
        status,
      });

      await writeAuditLog(
        "UPDATE_ORDER_STATUS",
        order.id,
        `Changed order status to ${status}`
      );

      setSuccess(
        response?.message || `✅ Order status ${status} हो गया।`
      );

      if (selectedOrder?.id === order.id) {
        setSelectedOrder((currentOrder) => ({
          ...currentOrder,
          status,
        }));
      }

      await Promise.all([loadOrders(), loadAnalytics()]);
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Order status update नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const openAssignmentModal = (order, type) => {
    clearMessages();

    setAssignmentOrder(order);
    setAssignmentType(type);
    setAssignmentValue(
      type === "vendor" ? order.vendor || "" : order.warehouse || ""
    );

    setShowAssignmentModal(true);
  };

  const closeAssignmentModal = () => {
    setShowAssignmentModal(false);
    setAssignmentOrder(null);
    setAssignmentType("");
    setAssignmentValue("");
  };

  const saveAssignment = async () => {
    const value = assignmentValue.trim();

    if (!assignmentOrder?.id || !value) {
      setError(
        `⚠️ ${
          assignmentType === "vendor" ? "Vendor name" : "Warehouse name"
        } जरूरी है।`
      );
      return;
    }

    clearMessages();
    setActionLoading(`assign-${assignmentType}-${assignmentOrder.id}`);

    try {
      let response;

      if (assignmentType === "vendor") {
        response = await assignOrderVendor({
          id: assignmentOrder.id,
          vendor: value,
        });
      } else {
        response = await assignOrderWarehouse({
          id: assignmentOrder.id,
          warehouse: value,
        });
      }

      await writeAuditLog(
        assignmentType === "vendor"
          ? "ASSIGN_ORDER_VENDOR"
          : "ASSIGN_ORDER_WAREHOUSE",
        assignmentOrder.id,
        `Assigned ${assignmentType}: ${value}`
      );

      setSuccess(
        response?.message ||
          `✅ ${
            assignmentType === "vendor" ? "Vendor" : "Warehouse"
          } assign हो गया।`
      );

      if (selectedOrder?.id === assignmentOrder.id) {
        setSelectedOrder((currentOrder) => ({
          ...currentOrder,
          [assignmentType]: value,
        }));
      }

      closeAssignmentModal();
      await loadOrders();
    } catch (err) {
      setError(
        err?.message ||
          `⚠️ ${
            assignmentType === "vendor" ? "Vendor" : "Warehouse"
          } assignment नहीं हो पाई।`
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleShippingLabel = async (order) => {
    clearMessages();
    setActionLoading(`label-${order.id}`);

    try {
      const response = await generateShippingLabel({ id: order.id });

      await writeAuditLog(
        "GENERATE_SHIPPING_LABEL",
        order.id,
        "Generated shipping label"
      );

      if (typeof response === "string") {
        window.open(response, "_blank", "noopener,noreferrer");
      } else if (response?.url) {
        window.open(response.url, "_blank", "noopener,noreferrer");
      }

      setSuccess(
        response?.message || "✅ Shipping label generate हो गया।"
      );
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Shipping label generate नहीं हो पाया।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const openTrackingModal = (order) => {
    clearMessages();

    setTrackingOrder(order);
    setTrackingNumber(order?.tracking?.trackingNumber || "");

    setShowTrackingModal(true);
  };

  const closeTrackingModal = () => {
    setShowTrackingModal(false);
    setTrackingOrder(null);
    setTrackingNumber("");
  };

  const saveTracking = async () => {
    const trackingValue = trackingNumber.trim();

    if (!trackingOrder?.id || !trackingValue) {
      setError("⚠️ Tracking number जरूरी है।");
      return;
    }

    clearMessages();
    setActionLoading(`tracking-${trackingOrder.id}`);

    try {
      const response = await updateTracking({
        id: trackingOrder.id,
        trackingNumber: trackingValue,
      });

      await writeAuditLog(
        "UPDATE_ORDER_TRACKING",
        trackingOrder.id,
        `Updated tracking number: ${trackingValue}`
      );

      setSuccess(
        response?.message || "✅ Tracking number update हो गया।"
      );

      if (selectedOrder?.id === trackingOrder.id) {
        setSelectedOrder((currentOrder) => ({
          ...currentOrder,
          tracking: {
            ...(currentOrder.tracking || {}),
            trackingNumber: trackingValue,
          },
        }));
      }

      closeTrackingModal();
      await loadOrders();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Tracking number update नहीं हो पाया।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleReturnApprove = async (order) => {
    clearMessages();
    setActionLoading(`approve-return-${order.id}`);

    try {
      const response = await approveReturn({ id: order.id });

      await writeAuditLog(
        "APPROVE_ORDER_RETURN",
        order.id,
        "Approved return request"
      );

      setSuccess(response?.message || "✅ Return approve हो गया।");

      if (selectedOrder?.id === order.id) {
        setSelectedOrder((currentOrder) => ({
          ...currentOrder,
          status: "returned",
        }));
      }

      await Promise.all([loadOrders(), loadAnalytics()]);
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Return approve नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const openReturnRejectModal = (order) => {
    clearMessages();

    setReturnOrder(order);
    setReturnRejectReason("");
    setShowReturnRejectModal(true);
  };

  const closeReturnRejectModal = () => {
    setReturnOrder(null);
    setReturnRejectReason("");
    setShowReturnRejectModal(false);
  };

  const handleReturnReject = async () => {
    const reason = returnRejectReason.trim();

    if (!returnOrder?.id || !reason) {
      setError("⚠️ Return reject करने के लिए reason जरूरी है।");
      return;
    }

    clearMessages();
    setActionLoading(`reject-return-${returnOrder.id}`);

    try {
      const response = await rejectReturn({
        id: returnOrder.id,
        reason,
      });

      await writeAuditLog(
        "REJECT_ORDER_RETURN",
        returnOrder.id,
        `Rejected return. Reason: ${reason}`
      );

      setSuccess(response?.message || "✅ Return reject हो गया।");

      closeReturnRejectModal();
      await Promise.all([loadOrders(), loadAnalytics()]);
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Return reject नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleRefund = async (order) => {
    clearMessages();
    setActionLoading(`refund-${order.id}`);

    try {
      const response = await processRefund({ id: order.id });

      await writeAuditLog(
        "PROCESS_ORDER_REFUND",
        order.id,
        "Processed order refund"
      );

      setSuccess(response?.message || "✅ Refund process हो गया।");

      if (selectedOrder?.id === order.id) {
        setSelectedOrder((currentOrder) => ({
          ...currentOrder,
          status: "refunded",
          paymentStatus: "refunded",
          payment: {
            ...(currentOrder.payment || {}),
            status: "refunded",
          },
        }));
      }

      await Promise.all([loadOrders(), loadAnalytics()]);
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Refund process नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedIds((currentIds) =>
      currentIds.includes(orderId)
        ? currentIds.filter((id) => id !== orderId)
        : [...currentIds, orderId]
    );
  };

  const toggleAllOrders = () => {
    const currentPageIds = orders.map((order) => order.id).filter(Boolean);

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

  const handleBulkStatusUpdate = async () => {
    clearMessages();

    if (selectedIds.length === 0) {
      setError("⚠️ Bulk update के लिए कम से कम एक order select करें।");
      return;
    }

    setActionLoading("bulk-status");

    try {
      const response = await bulkUpdateOrders({
        ids: selectedIds,
        update: {
          status: bulkStatus,
        },
      });

      await writeAuditLog(
        "BULK_UPDATE_ORDERS",
        selectedIds.join(","),
        `Updated order status to ${bulkStatus}`
      );

      setSuccess(
        response?.message ||
          `✅ ${selectedIds.length} orders का status update हो गया।`
      );

      setSelectedIds([]);
      await Promise.all([loadOrders(), loadAnalytics()]);
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Bulk order update नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleBulkAssign = async () => {
    clearMessages();

    if (selectedIds.length === 0) {
      setError("⚠️ Bulk assignment के लिए कम से कम एक order select करें।");
      return;
    }

    const vendor = bulkVendor.trim();
    const warehouse = bulkWarehouse.trim();

    if (!vendor && !warehouse) {
      setError("⚠️ Vendor या warehouse में से कम से कम एक value डालें।");
      return;
    }

    setActionLoading("bulk-assign");

    try {
      const response = await bulkAssignOrders({
        ids: selectedIds,
        ...(vendor ? { vendor } : {}),
        ...(warehouse ? { warehouse } : {}),
      });

      await writeAuditLog(
        "BULK_ASSIGN_ORDERS",
        selectedIds.join(","),
        `Bulk assignment. Vendor: ${vendor || "—"}, Warehouse: ${warehouse || "—"}`
      );

      setSuccess(
        response?.message ||
          `✅ ${selectedIds.length} orders assign हो गए।`
      );

      setBulkVendor("");
      setBulkWarehouse("");
      setSelectedIds([]);

      await loadOrders();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Bulk order assignment नहीं हो पाई। कृपया फिर से कोशिश करें।"
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
        csv: exportOrdersCSV,
        excel: exportOrdersExcel,
        pdf: exportOrdersPDF,
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

      downloadExportResponse(response, `orders-report.${format}`);

      await writeAuditLog(
        `EXPORT_ORDERS_${format.toUpperCase()}`,
        "",
        `Exported order report in ${format.toUpperCase()} format`
      );

      setSuccess(
        `✅ Order report ${format.toUpperCase()} में export हो गई।`
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
    orders.length > 0 &&
    orders.every((order) => selectedIds.includes(order.id));

  const selectedOrderStatus = String(selectedOrder?.status || "").toLowerCase();

  const canSetProcessing =
    selectedOrderStatus === "pending" ||
    selectedOrderStatus === "processing";

  const canShip =
    selectedOrderStatus === "pending" ||
    selectedOrderStatus === "processing";

  const canDeliver = selectedOrderStatus === "shipped";

  const canHandleReturn =
    selectedOrderStatus === "delivered" ||
    selectedOrderStatus === "returned";

  const canRefund =
    selectedOrderStatus === "returned" ||
    selectedOrderStatus === "delivered" ||
    selectedOrderStatus === "cancelled";

  return (
    <div className="order-manager px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">
            Super Admin Order Manager 📦
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Orders, fulfillment, vendors, warehouses, tracking, returns और refunds manage करें।
          </p>
        </div>

        <button
          type="button"
          onClick={refreshOrders}
          disabled={
            loadingOrders ||
            loadingAnalytics ||
            Boolean(actionLoading)
          }
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Refresh Orders
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
            Order Analytics
          </h2>

          {loadingAnalytics && (
            <span className="text-sm text-gray-500">
              Loading analytics...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total Orders" value={analytics?.totalOrders} />
          <MetricCard label="Pending" value={analytics?.pending} color="text-yellow-600" />
          <MetricCard label="Processing" value={analytics?.processing} color="text-blue-600" />
          <MetricCard label="Shipped" value={analytics?.shipped} color="text-indigo-600" />
          <MetricCard label="Delivered" value={analytics?.delivered} color="text-green-600" />
          <MetricCard label="Cancelled" value={analytics?.cancelled} color="text-red-600" />
          <MetricCard label="Returned" value={analytics?.returned} color="text-orange-600" />
          <MetricCard label="Refunded" value={analytics?.refunded} color="text-purple-600" />
          <MetricCard label="Total Value" value={formatAmount(analytics?.totalValue)} />
          <MetricCard label="Refund Value" value={formatAmount(analytics?.refundValue)} color="text-red-600" />
        </div>
      </section>

      <section className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-indigo-900">
          Filters & Export
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            type="text"
            placeholder="Search order, customer, email, vendor..."
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
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="returned">Returned</option>
            <option value="refunded">Refunded</option>
          </select>

          <button
            type="button"
            onClick={() => setShowBulkPanel((visible) => !visible)}
            disabled={Boolean(actionLoading)}
            className="rounded-md bg-yellow-500 px-4 py-2 text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Bulk Actions ({selectedIds.length})
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

        {showBulkPanel && (
          <div className="mt-4 rounded-md bg-yellow-50 p-4">
            <p className="mb-3 text-sm font-medium text-yellow-900">
              Selected orders: {selectedIds.length}
            </p>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <select
                value={bulkStatus}
                onChange={(event) => setBulkStatus(event.target.value)}
                className="rounded-md border px-3 py-2"
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="returned">Returned</option>
                <option value="refunded">Refunded</option>
              </select>

              <input
                type="text"
                placeholder="Vendor name for bulk assignment"
                value={bulkVendor}
                onChange={(event) => setBulkVendor(event.target.value)}
                className="rounded-md border px-3 py-2"
              />

              <input
                type="text"
                placeholder="Warehouse name for bulk assignment"
                value={bulkWarehouse}
                onChange={(event) => setBulkWarehouse(event.target.value)}
                className="rounded-md border px-3 py-2"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleBulkStatusUpdate}
                disabled={selectedIds.length === 0 || Boolean(actionLoading)}
                className="rounded-md bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "bulk-status"
                  ? "Updating..."
                  : "Update Status"}
              </button>

              <button
                type="button"
                onClick={handleBulkAssign}
                disabled={selectedIds.length === 0 || Boolean(actionLoading)}
                className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "bulk-assign"
                  ? "Assigning..."
                  : "Assign Vendor / Warehouse"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedIds([]);
                  setBulkVendor("");
                  setBulkWarehouse("");
                  setShowBulkPanel(false);
                }}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-indigo-900">
              Order List
            </h2>
            <p className="text-sm text-gray-500">
              Total matching orders: {totalOrders}
            </p>
          </div>

          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
        </div>

        {loadingOrders && orders.length === 0 ? (
          <p className="py-8 text-center text-indigo-700">
            ✨ Loading orders...
          </p>
        ) : orders.length === 0 ? (
          <p className="py-8 text-center text-gray-600">
            No orders found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1450px] w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-gray-700">
                  <th className="border px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleAllOrders}
                      aria-label="Select all orders"
                    />
                  </th>
                  <th className="border px-3 py-2">Order</th>
                  <th className="border px-3 py-2">Customer</th>
                  <th className="border px-3 py-2">Vendor</th>
                  <th className="border px-3 py-2">Warehouse</th>
                  <th className="border px-3 py-2">Order Status</th>
                  <th className="border px-3 py-2">Payment</th>
                  <th className="border px-3 py-2">Total</th>
                  <th className="border px-3 py-2">Created</th>
                  <th className="border px-3 py-2">Actions</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => {
                  const orderStatus = String(order.status || "").toLowerCase();

                  const rowCanSetProcessing =
                    orderStatus === "pending" ||
                    orderStatus === "processing";

                  const rowCanShip =
                    orderStatus === "pending" ||
                    orderStatus === "processing";

                  const rowCanDeliver = orderStatus === "shipped";

                  const rowCanReturn =
                    orderStatus === "delivered" ||
                    orderStatus === "returned";

                  const rowCanRefund =
                    orderStatus === "returned" ||
                    orderStatus === "delivered" ||
                    orderStatus === "cancelled";

                  return (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="border px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                          aria-label={`Select order ${order.id}`}
                        />
                      </td>

                      <td className="border px-3 py-2">
                        <p className="font-mono text-xs">#{order.id || "—"}</p>
                        <p className="text-xs text-gray-500">
                          {order.createdAt || "—"}
                        </p>
                      </td>

                      <td className="border px-3 py-2">
                        <p>{order.customer || "—"}</p>
                        <p className="text-xs text-gray-500">
                          {order.email || ""}
                        </p>
                      </td>

                      <td className="border px-3 py-2">
                        {order.vendor || "—"}
                      </td>

                      <td className="border px-3 py-2">
                        {order.warehouse || "—"}
                      </td>

                      <td className="border px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                            order.status
                          )}`}
                        >
                          {order.status || "unknown"}
                        </span>
                      </td>

                      <td className="border px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                            order.paymentStatus
                          )}`}
                        >
                          {order.paymentStatus || "—"}
                        </span>
                      </td>

                      <td className="border px-3 py-2 font-medium">
                        {formatAmount(order.total)}
                      </td>

                      <td className="border px-3 py-2">
                        {order.createdAt || "—"}
                      </td>

                      <td className="border px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openOrderDetail(order)}
                            disabled={actionLoading === `detail-${order.id}`}
                            className="text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionLoading === `detail-${order.id}`
                              ? "Loading..."
                              : "View"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(order, "processing")
                            }
                            disabled={
                              !rowCanSetProcessing || Boolean(actionLoading)
                            }
                            className="text-indigo-600 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Processing
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(order, "shipped")}
                            disabled={!rowCanShip || Boolean(actionLoading)}
                            className="text-green-600 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Ship
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(order, "delivered")
                            }
                            disabled={!rowCanDeliver || Boolean(actionLoading)}
                            className="text-blue-800 hover:text-blue-950 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Deliver
                          </button>

                          <button
                            type="button"
                            onClick={() => openAssignmentModal(order, "vendor")}
                            disabled={Boolean(actionLoading)}
                            className="text-purple-600 hover:text-purple-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Vendor
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openAssignmentModal(order, "warehouse")
                            }
                            disabled={Boolean(actionLoading)}
                            className="text-pink-600 hover:text-pink-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Warehouse
                          </button>

                          <button
                            type="button"
                            onClick={() => handleShippingLabel(order)}
                            disabled={Boolean(actionLoading)}
                            className="text-yellow-700 hover:text-yellow-900 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Label
                          </button>

                          <button
                            type="button"
                            onClick={() => openTrackingModal(order)}
                            disabled={Boolean(actionLoading)}
                            className="text-gray-700 hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Tracking
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReturnApprove(order)}
                            disabled={!rowCanReturn || Boolean(actionLoading)}
                            className="text-green-700 hover:text-green-900 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Approve Return
                          </button>

                          <button
                            type="button"
                            onClick={() => openReturnRejectModal(order)}
                            disabled={!rowCanReturn || Boolean(actionLoading)}
                            className="text-red-700 hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Reject Return
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRefund(order)}
                            disabled={!rowCanRefund || Boolean(actionLoading)}
                            className="text-blue-900 hover:text-blue-950 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Refund
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

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              setPage((currentPage) => Math.max(1, currentPage - 1))
            }
            disabled={page <= 1 || loadingOrders}
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
            disabled={page >= totalPages || loadingOrders}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      </section>

      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Order details"
        >
          <button
            type="button"
            aria-label="Close order details"
            onClick={closeOrderDetail}
            className="absolute inset-0 cursor-default"
          />

          <div className="relative z-10 h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Order #{selectedOrder.id || "—"}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedOrder.createdAt || "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeOrderDetail}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange(selectedOrder, "processing")}
                disabled={!canSetProcessing || Boolean(actionLoading)}
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Set Processing
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange(selectedOrder, "shipped")}
                disabled={!canShip || Boolean(actionLoading)}
                className="rounded-md bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Ship Order
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange(selectedOrder, "delivered")}
                disabled={!canDeliver || Boolean(actionLoading)}
                className="rounded-md bg-blue-800 px-3 py-2 text-sm text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Mark Delivered
              </button>

              <button
                type="button"
                onClick={() => openAssignmentModal(selectedOrder, "vendor")}
                disabled={Boolean(actionLoading)}
                className="rounded-md bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Assign Vendor
              </button>

              <button
                type="button"
                onClick={() =>
                  openAssignmentModal(selectedOrder, "warehouse")
                }
                disabled={Boolean(actionLoading)}
                className="rounded-md bg-pink-600 px-3 py-2 text-sm text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Assign Warehouse
              </button>

              <button
                type="button"
                onClick={() => handleShippingLabel(selectedOrder)}
                disabled={Boolean(actionLoading)}
                className="rounded-md bg-yellow-500 px-3 py-2 text-sm text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Shipping Label
              </button>

              <button
                type="button"
                onClick={() => openTrackingModal(selectedOrder)}
                disabled={Boolean(actionLoading)}
                className="rounded-md bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Update Tracking
              </button>

              <button
                type="button"
                onClick={() => handleReturnApprove(selectedOrder)}
                disabled={!canHandleReturn || Boolean(actionLoading)}
                className="rounded-md bg-green-700 px-3 py-2 text-sm text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Approve Return
              </button>

              <button
                type="button"
                onClick={() => openReturnRejectModal(selectedOrder)}
                disabled={!canHandleReturn || Boolean(actionLoading)}
                className="rounded-md bg-red-700 px-3 py-2 text-sm text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reject Return
              </button>

              <button
                type="button"
                onClick={() => handleRefund(selectedOrder)}
                disabled={!canRefund || Boolean(actionLoading)}
                className="rounded-md bg-blue-950 px-3 py-2 text-sm text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Process Refund
              </button>
            </div>

            <div className="space-y-4">
              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Customer & Address
                </h3>
                <p className="text-sm"><span className="font-medium">Name:</span> {selectedOrder.customer || "—"}</p>
                <p className="text-sm"><span className="font-medium">Email:</span> {selectedOrder.email || "—"}</p>
                <p className="text-sm"><span className="font-medium">Phone:</span> {selectedOrder.phone || "—"}</p>
                <p className="break-words text-sm"><span className="font-medium">Billing Address:</span> {selectedOrder.address?.billing || "—"}</p>
                <p className="break-words text-sm"><span className="font-medium">Shipping Address:</span> {selectedOrder.address?.shipping || "—"}</p>
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Fulfillment
                </h3>
                <p className="text-sm"><span className="font-medium">Vendor:</span> {selectedOrder.vendor || "—"}</p>
                <p className="text-sm"><span className="font-medium">Warehouse:</span> {selectedOrder.warehouse || "—"}</p>
                <p className="text-sm"><span className="font-medium">Order Status:</span> {selectedOrder.status || "—"}</p>
                <p className="text-sm"><span className="font-medium">Total:</span> {formatAmount(selectedOrder.total)}</p>
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Items
                </h3>

                {selectedOrder.items.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    Item data उपलब्ध नहीं है।
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded border bg-white p-2 text-sm"
                      >
                        <p className="font-medium">
                          {item.name || "Unnamed Product"}
                        </p>
                        <p>SKU: {item.sku || "—"}</p>
                        {item.variant && <p>Variant: {item.variant}</p>}
                        <p>Quantity: {item.quantity ?? 0}</p>
                        <p>Price: {formatAmount(item.price)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Payment
                </h3>
                <p className="text-sm"><span className="font-medium">Method:</span> {selectedOrder.payment?.method || "—"}</p>
                <p className="text-sm"><span className="font-medium">Transaction ID:</span> {selectedOrder.payment?.transactionId || "—"}</p>
                <p className="text-sm"><span className="font-medium">Status:</span> {selectedOrder.payment?.status || selectedOrder.paymentStatus || "—"}</p>
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Tracking
                </h3>

                {selectedOrder.tracking ? (
                  <>
                    <p className="text-sm"><span className="font-medium">Courier:</span> {selectedOrder.tracking.courier || "—"}</p>
                    <p className="text-sm"><span className="font-medium">Tracking Number:</span> {selectedOrder.tracking.trackingNumber || "—"}</p>
                    <p className="text-sm"><span className="font-medium">Status:</span> {selectedOrder.tracking.status || "—"}</p>
                    <p className="text-sm"><span className="font-medium">Last Update:</span> {selectedOrder.tracking.lastUpdate || "—"}</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-600">
                    Tracking information उपलब्ध नहीं है।
                  </p>
                )}
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Order History
                </h3>

                {selectedOrder.history.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    Order history उपलब्ध नहीं है।
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedOrder.history.map((historyItem) => (
                      <div
                        key={historyItem.id}
                        className="rounded border bg-white p-2 text-sm"
                      >
                        <p className="font-medium">
                          {historyItem.action || "Action"}
                        </p>
                        <p>Actor: {historyItem.actor || "—"}</p>
                        <p>Time: {historyItem.time || "—"}</p>
                        {historyItem.details && (
                          <p className="break-words">
                            Details: {historyItem.details}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {showAssignmentModal && assignmentOrder && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Assign order"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Assign {assignmentType === "vendor" ? "Vendor" : "Warehouse"}
                </h2>
                <p className="text-sm text-gray-500">
                  Order #{assignmentOrder.id || "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeAssignmentModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <input
              type="text"
              value={assignmentValue}
              onChange={(event) => setAssignmentValue(event.target.value)}
              placeholder={
                assignmentType === "vendor"
                  ? "Enter vendor name"
                  : "Enter warehouse name"
              }
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeAssignmentModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveAssignment}
                disabled={
                  actionLoading ===
                  `assign-${assignmentType}-${assignmentOrder.id}`
                }
                className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ===
                `assign-${assignmentType}-${assignmentOrder.id}`
                  ? "Saving..."
                  : "Save Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTrackingModal && trackingOrder && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Update tracking"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Update Tracking
                </h2>
                <p className="text-sm text-gray-500">
                  Order #{trackingOrder.id || "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeTrackingModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <input
              type="text"
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              placeholder="Enter tracking number"
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeTrackingModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveTracking}
                disabled={actionLoading === `tracking-${trackingOrder.id}`}
                className="rounded-md bg-gray-700 px-4 py-2 text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `tracking-${trackingOrder.id}`
                  ? "Saving..."
                  : "Update Tracking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReturnRejectModal && returnOrder && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Reject return"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Reject Return
                </h2>
                <p className="text-sm text-gray-500">
                  Order #{returnOrder.id || "—"} के लिए rejection reason लिखें।
                </p>
              </div>

              <button
                type="button"
                onClick={closeReturnRejectModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <textarea
              value={returnRejectReason}
              onChange={(event) =>
                setReturnRejectReason(event.target.value)
              }
              rows={5}
              placeholder="Enter return rejection reason..."
              className="w-full rounded-md border p-3 outline-none focus:border-red-500"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeReturnRejectModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleReturnReject}
                disabled={
                  actionLoading === `reject-return-${returnOrder.id}`
                }
                className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `reject-return-${returnOrder.id}`
                  ? "Rejecting..."
                  : "Reject Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderManager;