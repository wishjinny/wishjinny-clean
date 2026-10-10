import React, { useEffect, useMemo, useState } from "react";
import {
  fetchDeliveries,
  fetchDeliveryDetails,
  approveDeliveryPartner,
  verifyDeliveryPartner,
  addRider,
  updateRider,
  removeRider,
  assignOrderDelivery,
  dispatchOrder,
  trackDelivery,
  fetchDeliveryAnalytics,
  bulkUpdateDeliveries,
  exportDeliveriesCSV,
  exportDeliveriesExcel,
  exportDeliveriesPDF,
  logAuditEvent,
} from "../utils/api";

const PAGE_SIZE = 10;

function DeliveryManager() {
  const [deliveries, setDeliveries] = useState([]);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDeliveries, setTotalDeliveries] = useState(0);

  const [bulkStatus, setBulkStatus] = useState("approved");
  const [showBulkPanel, setShowBulkPanel] = useState(false);

  const [showRiderForm, setShowRiderForm] = useState(false);
  const [editingRider, setEditingRider] = useState(null);

  const [riderForm, setRiderForm] = useState({
    name: "",
    phone: "",
    zone: "",
    accessLevel: "standard",
  });

  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignForm, setAssignForm] = useState({
    orderId: "",
    riderId: "",
  });

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
    loadDeliveries();
  }, [page, filters.search, filters.status]);

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

  const getStatusClass = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (
      normalized === "approved" ||
      normalized === "verified" ||
      normalized === "assigned" ||
      normalized === "dispatched" ||
      normalized === "delivered" ||
      normalized === "success" ||
      normalized === "active"
    ) {
      return "bg-green-100 text-green-700";
    }

    if (
      normalized === "failed" ||
      normalized === "returned" ||
      normalized === "rejected" ||
      normalized === "cancelled" ||
      normalized === "error"
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

  const writeAuditLog = async (action, resourceType, resourceId, details) => {
    try {
      await logAuditEvent({
        action,
        resourceType,
        resourceId: resourceId || "",
        details: details || "",
      });
    } catch {
      // Main action should not fail only because audit logging fails.
    }
  };

  const loadDeliveries = async () => {
    setLoadingDeliveries(true);
    setError("");

    try {
      const response = await fetchDeliveries({
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

      setDeliveries(items);
      setTotalPages(Math.max(1, receivedTotalPages));
      setTotalDeliveries(receivedTotal);
    } catch (err) {
      setDeliveries([]);
      setError(
        err?.message ||
          "⚠️ Deliveries load नहीं हो पाए। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setLoadingDeliveries(false);
    }
  };

  const refreshDeliveries = async () => {
    clearMessages();
    await loadDeliveries();
    setSuccess("✅ Delivery data refresh हो गया।");
  };

  const openDeliveryDetail = async (delivery) => {
    clearMessages();
    setActionLoading(`detail-${delivery.id}`);

    try {
      const [detailResult, trackingResult, analyticsResult] =
        await Promise.allSettled([
          fetchDeliveryDetails({ id: delivery.id }),
          trackDelivery({ id: delivery.id }),
          fetchDeliveryAnalytics({ id: delivery.id }),
        ]);

      const detail =
        detailResult.status === "fulfilled"
          ? detailResult.value
          : delivery;

      const tracking =
        trackingResult.status === "fulfilled"
          ? trackingResult.value
          : detail?.tracking || {};

      const analytics =
        analyticsResult.status === "fulfilled"
          ? analyticsResult.value
          : detail?.analytics || {};

      setSelectedDelivery({
        ...delivery,
        ...(detail || {}),
        tracking,
        analytics,
      });

      if (detailResult.status === "rejected") {
        setError(
          "⚠️ पूरी delivery details load नहीं हो पाईं। उपलब्ध जानकारी दिखाई जा रही है।"
        );
      }
    } catch (err) {
      setSelectedDelivery(delivery);
      setError(
        err?.message ||
          "⚠️ Delivery detail load नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const closeDeliveryDetail = () => {
    setSelectedDelivery(null);
  };

  const handleApprovePartner = async (delivery) => {
    clearMessages();
    setActionLoading(`approve-${delivery.id}`);

    try {
      const response = await approveDeliveryPartner({ id: delivery.id });

      await writeAuditLog(
        "APPROVE_DELIVERY_PARTNER",
        "delivery",
        delivery.id,
        `Approved delivery partner: ${delivery.partnerName || delivery.id}`
      );

      setSuccess(
        response?.message || "✅ Delivery partner approved हो गया।"
      );

      await loadDeliveries();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Delivery partner approve नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleVerifyPartner = async (delivery) => {
    clearMessages();
    setActionLoading(`verify-${delivery.id}`);

    try {
      const response = await verifyDeliveryPartner({ id: delivery.id });

      await writeAuditLog(
        "VERIFY_DELIVERY_PARTNER",
        "delivery",
        delivery.id,
        `Verified delivery partner: ${delivery.partnerName || delivery.id}`
      );

      setSuccess(
        response?.message || "✅ Delivery partner verify हो गया।"
      );

      await loadDeliveries();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Delivery partner verify नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleDispatchOrder = async (delivery) => {
    clearMessages();
    setActionLoading(`dispatch-${delivery.id}`);

    try {
      const response = await dispatchOrder({ id: delivery.id });

      await writeAuditLog(
        "DISPATCH_DELIVERY_ORDER",
        "delivery",
        delivery.id,
        `Dispatched delivery: ${delivery.trackingNumber || delivery.id}`
      );

      setSuccess(
        response?.message || "✅ Order dispatch हो गया।"
      );

      await loadDeliveries();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Order dispatch नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const toggleDeliverySelection = (deliveryId) => {
    setSelectedIds((currentIds) =>
      currentIds.includes(deliveryId)
        ? currentIds.filter((id) => id !== deliveryId)
        : [...currentIds, deliveryId]
    );
  };

  const toggleAllDeliveries = () => {
    const pageIds = deliveries.map((delivery) => delivery.id).filter(Boolean);

    const allSelected =
      pageIds.length > 0 &&
      pageIds.every((id) => selectedIds.includes(id));

    setSelectedIds((currentIds) => {
      if (allSelected) {
        return currentIds.filter((id) => !pageIds.includes(id));
      }

      return Array.from(new Set([...currentIds, ...pageIds]));
    });
  };

  const handleBulkUpdate = async () => {
    clearMessages();

    if (selectedIds.length === 0) {
      setError("⚠️ Bulk update के लिए कम से कम एक delivery select करें।");
      return;
    }

    setActionLoading("bulk-update");

    try {
      const response = await bulkUpdateDeliveries({
        ids: selectedIds,
        update: {
          status: bulkStatus,
        },
      });

      await writeAuditLog(
        "BULK_UPDATE_DELIVERIES",
        "delivery",
        selectedIds.join(","),
        `Updated delivery status to ${bulkStatus}`
      );

      setSuccess(
        response?.message ||
          `✅ ${selectedIds.length} deliveries का status update हो गया।`
      );

      setSelectedIds([]);
      setShowBulkPanel(false);

      await loadDeliveries();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Bulk delivery update नहीं हो पाया। कृपया फिर से कोशिश करें।"
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
        csv: exportDeliveriesCSV,
        excel: exportDeliveriesExcel,
        pdf: exportDeliveriesPDF,
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

      downloadExportResponse(response, `deliveries-report.${format}`);

      await writeAuditLog(
        `EXPORT_DELIVERIES_${format.toUpperCase()}`,
        "delivery_report",
        "",
        `Exported deliveries in ${format.toUpperCase()} format`
      );

      setSuccess(
        `✅ Delivery report ${format.toUpperCase()} में export हो गई।`
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

  const openAddRiderForm = () => {
    clearMessages();

    setEditingRider(null);
    setRiderForm({
      name: "",
      phone: "",
      zone: "",
      accessLevel: "standard",
    });

    setShowRiderForm(true);
  };

  const openEditRiderForm = () => {
    if (!selectedDelivery?.rider?.id) {
      setError("⚠️ इस delivery के लिए rider information उपलब्ध नहीं है।");
      return;
    }

    clearMessages();

    setEditingRider(selectedDelivery.rider);

    setRiderForm({
      name: selectedDelivery.rider.name || "",
      phone: selectedDelivery.rider.phone || "",
      zone: selectedDelivery.rider.zone || "",
      accessLevel: selectedDelivery.rider.accessLevel || "standard",
    });

    setShowRiderForm(true);
  };

  const saveRider = async () => {
    clearMessages();

    if (!riderForm.name.trim() || !riderForm.phone.trim()) {
      setError("⚠️ Rider name और phone जरूरी हैं।");
      return;
    }

    const partnerId =
      selectedDelivery?.id ||
      selectedDelivery?.partnerId ||
      "";

    if (!editingRider && !partnerId) {
      setError("⚠️ Rider add करने के लिए पहले किसी delivery का detail खोलें।");
      return;
    }

    setActionLoading("save-rider");

    try {
      let response;

      if (editingRider?.id) {
        response = await updateRider({
          id: editingRider.id,
          rider: riderForm,
        });

        await writeAuditLog(
          "UPDATE_DELIVERY_RIDER",
          "rider",
          editingRider.id,
          `Updated rider: ${riderForm.name}`
        );
      } else {
        response = await addRider({
          partnerId,
          rider: riderForm,
        });

        await writeAuditLog(
          "ADD_DELIVERY_RIDER",
          "delivery_partner",
          partnerId,
          `Added rider: ${riderForm.name}`
        );
      }

      setSuccess(
        response?.message ||
          `✅ Rider ${editingRider ? "update" : "add"} हो गया।`
      );

      setShowRiderForm(false);

      if (selectedDelivery?.id) {
        await openDeliveryDetail(selectedDelivery);
      }

      await loadDeliveries();
    } catch (err) {
      setError(
        err?.message ||
          `⚠️ Rider ${editingRider ? "update" : "add"} नहीं हो पाया।`
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleRemoveRider = async () => {
    if (!selectedDelivery?.rider?.id) {
      setError("⚠️ Remove करने के लिए rider information उपलब्ध नहीं है।");
      return;
    }

    clearMessages();
    setActionLoading("remove-rider");

    try {
      const response = await removeRider({
        id: selectedDelivery.rider.id,
      });

      await writeAuditLog(
        "REMOVE_DELIVERY_RIDER",
        "rider",
        selectedDelivery.rider.id,
        `Removed rider: ${selectedDelivery.rider.name || selectedDelivery.rider.id}`
      );

      setSuccess(response?.message || "✅ Rider remove हो गया।");

      await openDeliveryDetail(selectedDelivery);
      await loadDeliveries();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Rider remove नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const openAssignOrderForm = () => {
    clearMessages();

    setAssignForm({
      orderId: selectedDelivery?.order?.id || "",
      riderId: selectedDelivery?.rider?.id || "",
    });

    setShowAssignForm(true);
  };

  const handleAssignOrder = async () => {
    clearMessages();

    if (!assignForm.orderId.trim() || !assignForm.riderId.trim()) {
      setError("⚠️ Order ID और Rider ID दोनों जरूरी हैं।");
      return;
    }

    setActionLoading("assign-order");

    try {
      const response = await assignOrderDelivery({
        orderId: assignForm.orderId.trim(),
        riderId: assignForm.riderId.trim(),
      });

      await writeAuditLog(
        "ASSIGN_ORDER_DELIVERY",
        "order",
        assignForm.orderId.trim(),
        `Assigned order to rider: ${assignForm.riderId.trim()}`
      );

      setSuccess(response?.message || "✅ Order rider को assign हो गया।");

      setShowAssignForm(false);

      if (selectedDelivery?.id) {
        await openDeliveryDetail(selectedDelivery);
      }

      await loadDeliveries();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Order assign नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const isAllSelected =
    deliveries.length > 0 &&
    deliveries.every((delivery) => selectedIds.includes(delivery.id));

  const currentStatus = String(selectedDelivery?.status || "").toLowerCase();

  const canApprove =
    currentStatus === "pending" || currentStatus === "requested";

  const canVerify =
    currentStatus === "approved" || currentStatus === "pending";

  const canDispatch =
    currentStatus === "assigned" || currentStatus === "verified";

  return (
    <div className="delivery-manager px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">
            Super Admin Delivery Manager 🚚
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Delivery partners, riders, assignments, dispatch और tracking manage करें।
          </p>
        </div>

        <button
          type="button"
          onClick={refreshDeliveries}
          disabled={loadingDeliveries || Boolean(actionLoading)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Refresh Deliveries
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

      <section className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-indigo-900">
          Filters & Export
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            type="text"
            placeholder="Search partner, rider, tracking..."
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
            <option value="approved">Approved</option>
            <option value="verified">Verified</option>
            <option value="assigned">Assigned</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="returned">Returned</option>
          </select>

          <button
            type="button"
            onClick={() => setShowBulkPanel((visible) => !visible)}
            disabled={Boolean(actionLoading)}
            className="rounded-md bg-yellow-500 px-4 py-2 text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Bulk Update ({selectedIds.length})
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
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading === "export-excel"
                ? "Exporting..."
                : "Excel"}
            </button>

            <button
              type="button"
              onClick={() => handleExport("pdf")}
              disabled={Boolean(actionLoading)}
              className="flex-1 rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading === "export-pdf"
                ? "Exporting..."
                : "PDF"}
            </button>
          </div>
        </div>

        {showBulkPanel && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md bg-yellow-50 p-3">
            <p className="text-sm font-medium text-yellow-900">
              Selected deliveries: {selectedIds.length}
            </p>

            <select
              value={bulkStatus}
              onChange={(event) => setBulkStatus(event.target.value)}
              className="rounded-md border px-3 py-2"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="verified">Verified</option>
              <option value="assigned">Assigned</option>
              <option value="dispatched">Dispatched</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
              <option value="returned">Returned</option>
            </select>

            <button
              type="button"
              onClick={handleBulkUpdate}
              disabled={selectedIds.length === 0 || Boolean(actionLoading)}
              className="rounded-md bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading === "bulk-update"
                ? "Updating..."
                : "Apply Status Update"}
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedIds([]);
                setShowBulkPanel(false);
              }}
              className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Clear Selection
            </button>
          </div>
        )}
      </section>

      <section className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-indigo-900">
              Delivery List
            </h2>
            <p className="text-sm text-gray-500">
              Total matching deliveries: {totalDeliveries}
            </p>
          </div>

          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
        </div>

        {loadingDeliveries && deliveries.length === 0 ? (
          <p className="py-8 text-center text-indigo-700">
            ✨ Loading deliveries...
          </p>
        ) : deliveries.length === 0 ? (
          <p className="py-8 text-center text-gray-600">
            No deliveries found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1150px] w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-gray-700">
                  <th className="border px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleAllDeliveries}
                      aria-label="Select all deliveries"
                    />
                  </th>
                  <th className="border px-3 py-2">Partner</th>
                  <th className="border px-3 py-2">Rider</th>
                  <th className="border px-3 py-2">Contact</th>
                  <th className="border px-3 py-2">Status</th>
                  <th className="border px-3 py-2">Tracking Number</th>
                  <th className="border px-3 py-2">Created</th>
                  <th className="border px-3 py-2">Actions</th>
                </tr>
              </thead>

              <tbody>
                {deliveries.map((delivery) => {
                  const status = String(delivery.status || "").toLowerCase();

                  const rowCanApprove =
                    status === "pending" || status === "requested";

                  const rowCanVerify =
                    status === "approved" || status === "pending";

                  return (
                    <tr
                      key={delivery.id}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="border px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(delivery.id)}
                          onChange={() => toggleDeliverySelection(delivery.id)}
                          aria-label={`Select delivery ${delivery.id}`}
                        />
                      </td>
                      <td className="border px-3 py-2">
                        {delivery.partnerName || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        {delivery.riderName || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        {delivery.contact || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                            delivery.status
                          )}`}
                        >
                          {delivery.status || "unknown"}
                        </span>
                      </td>
                      <td className="border px-3 py-2 font-mono text-xs">
                        {delivery.trackingNumber || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        {delivery.createdAt || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openDeliveryDetail(delivery)}
                            disabled={
                              actionLoading === `detail-${delivery.id}`
                            }
                            className="text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionLoading === `detail-${delivery.id}`
                              ? "Loading..."
                              : "View"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApprovePartner(delivery)}
                            disabled={!rowCanApprove || Boolean(actionLoading)}
                            className="text-green-600 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Approve
                          </button>

                          <button
                            type="button"
                            onClick={() => handleVerifyPartner(delivery)}
                            disabled={!rowCanVerify || Boolean(actionLoading)}
                            className="text-indigo-600 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Verify
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
            disabled={page <= 1 || loadingDeliveries}
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
            disabled={page >= totalPages || loadingDeliveries}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      </section>

      {selectedDelivery && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Delivery details"
        >
          <button
            type="button"
            aria-label="Close delivery details"
            onClick={closeDeliveryDetail}
            className="absolute inset-0 cursor-default"
          />

          <div className="relative z-10 h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  {selectedDelivery.partnerName || "Delivery Detail"}
                </h2>
                <p className="text-sm text-gray-500">
                  Tracking #: {selectedDelivery.trackingNumber || "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDeliveryDetail}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleApprovePartner(selectedDelivery)}
                disabled={!canApprove || Boolean(actionLoading)}
                className="rounded-md bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Approve Partner
              </button>

              <button
                type="button"
                onClick={() => handleVerifyPartner(selectedDelivery)}
                disabled={!canVerify || Boolean(actionLoading)}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Verify Partner
              </button>

              <button
                type="button"
                onClick={() => handleDispatchOrder(selectedDelivery)}
                disabled={!canDispatch || Boolean(actionLoading)}
                className="rounded-md bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {actionLoading === `dispatch-${selectedDelivery.id}`
                  ? "Dispatching..."
                  : "Dispatch Order"}
              </button>

              <button
                type="button"
                onClick={openAssignOrderForm}
                disabled={Boolean(actionLoading)}
                className="rounded-md border px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Assign Rider
              </button>
            </div>

            <div className="space-y-4">
              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Delivery Profile
                </h3>
                <p className="text-sm"><span className="font-medium">Partner:</span> {selectedDelivery.partnerName || "—"}</p>
                <p className="text-sm"><span className="font-medium">Rider:</span> {selectedDelivery.riderName || "—"}</p>
                <p className="text-sm"><span className="font-medium">Contact:</span> {selectedDelivery.contact || "—"}</p>
                <p className="text-sm"><span className="font-medium">Status:</span> {selectedDelivery.status || "—"}</p>
                <p className="text-sm"><span className="font-medium">Created:</span> {selectedDelivery.createdAt || "—"}</p>
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-indigo-900">
                    Rider Information
                  </h3>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={openAddRiderForm}
                      disabled={Boolean(actionLoading)}
                      className="text-sm font-medium text-green-600 hover:text-green-800 disabled:opacity-40"
                    >
                      Add Rider
                    </button>

                    {selectedDelivery.rider?.id && (
                      <>
                        <button
                          type="button"
                          onClick={openEditRiderForm}
                          disabled={Boolean(actionLoading)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-40"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={handleRemoveRider}
                          disabled={Boolean(actionLoading)}
                          className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-40"
                        >
                          {actionLoading === "remove-rider"
                            ? "Removing..."
                            : "Remove"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <p className="text-sm"><span className="font-medium">Name:</span> {selectedDelivery.rider?.name || selectedDelivery.riderName || "—"}</p>
                <p className="text-sm"><span className="font-medium">Phone:</span> {selectedDelivery.rider?.phone || "—"}</p>
                <p className="text-sm"><span className="font-medium">Zone:</span> {selectedDelivery.rider?.zone || "—"}</p>
                <p className="text-sm"><span className="font-medium">Access Level:</span> {selectedDelivery.rider?.accessLevel || "—"}</p>
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Courier Integration
                </h3>
                <p className="text-sm"><span className="font-medium">Courier:</span> {selectedDelivery.courier?.name || "—"}</p>
                <p className="text-sm"><span className="font-medium">Service Area:</span> {selectedDelivery.courier?.serviceArea || "—"}</p>
                <p className="text-sm"><span className="font-medium">Charges:</span> ₹{selectedDelivery.courier?.charges ?? 0}</p>
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Tracking & Live Status
                </h3>
                <p className="text-sm"><span className="font-medium">Status:</span> {selectedDelivery.tracking?.status || selectedDelivery.status || "—"}</p>
                <p className="text-sm"><span className="font-medium">Last Update:</span> {selectedDelivery.tracking?.lastUpdate || "—"}</p>
                <p className="text-sm"><span className="font-medium">Location:</span> {selectedDelivery.tracking?.location || "—"}</p>
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Order Information
                </h3>
                <p className="text-sm"><span className="font-medium">Order ID:</span> {selectedDelivery.order?.id || "—"}</p>
                <p className="text-sm"><span className="font-medium">Customer:</span> {selectedDelivery.order?.customerName || "—"}</p>
                <p className="text-sm"><span className="font-medium">Address:</span> {selectedDelivery.order?.address || "—"}</p>
                <p className="text-sm"><span className="font-medium">Total:</span> ₹{selectedDelivery.order?.total ?? 0}</p>
                <p className="text-sm"><span className="font-medium">Estimated Delivery:</span> {selectedDelivery.order?.estimatedDelivery || "—"}</p>
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Performance & Analytics
                </h3>
                <p className="text-sm"><span className="font-medium">On-Time Rate:</span> {selectedDelivery.analytics?.onTimeRate ?? 0}%</p>
                <p className="text-sm"><span className="font-medium">Failed Deliveries:</span> {selectedDelivery.analytics?.failedDeliveries ?? 0}</p>
                <p className="break-words text-sm"><span className="font-medium">Customer Feedback:</span> {(selectedDelivery.analytics?.customerFeedback || []).join(", ") || "—"}</p>
              </section>
            </div>
          </div>
        </div>
      )}

      {showRiderForm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Rider form"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  {editingRider ? "Update Rider" : "Add Rider"}
                </h2>
                <p className="text-sm text-gray-500">
                  Rider details भरें।
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowRiderForm(false)}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Rider name"
                value={riderForm.name}
                onChange={(event) =>
                  setRiderForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              />

              <input
                type="text"
                placeholder="Phone number"
                value={riderForm.phone}
                onChange={(event) =>
                  setRiderForm((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              />

              <input
                type="text"
                placeholder="Zone"
                value={riderForm.zone}
                onChange={(event) =>
                  setRiderForm((current) => ({
                    ...current,
                    zone: event.target.value,
                  }))
                }
                className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              />

              <select
                value={riderForm.accessLevel}
                onChange={(event) =>
                  setRiderForm((current) => ({
                    ...current,
                    accessLevel: event.target.value,
                  }))
                }
                className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              >
                <option value="standard">Standard</option>
                <option value="senior">Senior</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRiderForm(false)}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveRider}
                disabled={actionLoading === "save-rider"}
                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "save-rider"
                  ? "Saving..."
                  : editingRider
                    ? "Update Rider"
                    : "Add Rider"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAssignForm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Assign delivery rider"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Assign Order to Rider
                </h2>
                <p className="text-sm text-gray-500">
                  Order ID और rider ID डालें।
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAssignForm(false)}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Order ID"
                value={assignForm.orderId}
                onChange={(event) =>
                  setAssignForm((current) => ({
                    ...current,
                    orderId: event.target.value,
                  }))
                }
                className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              />

              <input
                type="text"
                placeholder="Rider ID"
                value={assignForm.riderId}
                onChange={(event) =>
                  setAssignForm((current) => ({
                    ...current,
                    riderId: event.target.value,
                  }))
                }
                className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAssignForm(false)}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleAssignOrder}
                disabled={actionLoading === "assign-order"}
                className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "assign-order"
                  ? "Assigning..."
                  : "Assign Delivery"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeliveryManager;