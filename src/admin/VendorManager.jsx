import React, { useEffect, useMemo, useState } from "react";
import {
  fetchVendors,
  fetchVendorDetails,
  approveVendor,
  rejectVendor,
  suspendVendor,
  reactivateVendor,
  deactivateVendor,
  fetchVendorProducts,
  fetchVendorOrders,
  fetchVendorPayments,
  fetchVendorCompliance,
  fetchVendorSupportTickets,
  fetchVendorAnalytics,
  bulkUpdateVendors,
  exportVendorsCSV,
  exportVendorsExcel,
  exportVendorsPDF,
  logAuditEvent,
} from "../utils/api";

const PAGE_SIZE = 10;

function VendorManager() {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const [loadingVendors, setLoadingVendors] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVendors, setTotalVendors] = useState(0);

  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("approved");

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [vendorToReject, setVendorToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

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
    loadVendors();
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
      normalized === "active" ||
      normalized === "verified" ||
      normalized === "success"
    ) {
      return "bg-green-100 text-green-700";
    }

    if (
      normalized === "rejected" ||
      normalized === "suspended" ||
      normalized === "deactivated" ||
      normalized === "failed" ||
      normalized === "error"
    ) {
      return "bg-red-100 text-red-700";
    }

    if (normalized === "pending" || normalized === "processing") {
      return "bg-yellow-100 text-yellow-800";
    }

    return "bg-gray-100 text-gray-700";
  };

  const formatAmount = (value) => {
    const amount = Number(value);

    if (Number.isNaN(amount)) {
      return "₹0";
    }

    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const writeAuditLog = async (action, resourceId, details) => {
    try {
      await logAuditEvent({
        action,
        details: details || "",
        resourceType: "vendor",
        resourceId: resourceId || "",
      });
    } catch {
      // Main vendor action should not fail only because audit logging fails.
    }
  };

  const loadVendors = async () => {
    setLoadingVendors(true);
    setError("");

    try {
      const response = await fetchVendors({
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

      setVendors(items);
      setTotalPages(Math.max(1, receivedTotalPages));
      setTotalVendors(receivedTotal);
    } catch (err) {
      setVendors([]);
      setError(
        err?.message ||
          "⚠️ Vendors load नहीं हो पाए। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setLoadingVendors(false);
    }
  };

  const refreshVendors = async () => {
    clearMessages();
    await loadVendors();
    setSuccess("✅ Vendor data refresh हो गया।");
  };

  const openVendorDetail = async (vendor) => {
    clearMessages();
    setActionLoading(`detail-${vendor.id}`);

    try {
      const [
        detailResult,
        productsResult,
        ordersResult,
        paymentsResult,
        complianceResult,
        ticketsResult,
        analyticsResult,
      ] = await Promise.allSettled([
        fetchVendorDetails({ id: vendor.id }),
        fetchVendorProducts({ id: vendor.id }),
        fetchVendorOrders({ id: vendor.id }),
        fetchVendorPayments({ id: vendor.id }),
        fetchVendorCompliance({ id: vendor.id }),
        fetchVendorSupportTickets({ id: vendor.id }),
        fetchVendorAnalytics({ id: vendor.id }),
      ]);

      const detail =
        detailResult.status === "fulfilled"
          ? detailResult.value
          : vendor;

      const products =
        productsResult.status === "fulfilled"
          ? getItems(productsResult.value)
          : Array.isArray(detail?.products)
            ? detail.products
            : [];

      const orders =
        ordersResult.status === "fulfilled"
          ? getItems(ordersResult.value)
          : Array.isArray(detail?.orders)
            ? detail.orders
            : [];

      const payments =
        paymentsResult.status === "fulfilled"
          ? getItems(paymentsResult.value)
          : Array.isArray(detail?.payments)
            ? detail.payments
            : [];

      const compliance =
        complianceResult.status === "fulfilled"
          ? complianceResult.value || {}
          : detail?.compliance || {};

      const supportTickets =
        ticketsResult.status === "fulfilled"
          ? getItems(ticketsResult.value)
          : Array.isArray(detail?.supportTickets)
            ? detail.supportTickets
            : [];

      const analytics =
        analyticsResult.status === "fulfilled"
          ? analyticsResult.value || {}
          : detail?.analytics || {};

      setSelectedVendor({
        ...vendor,
        ...(detail || {}),
        products,
        orders,
        payments,
        compliance,
        supportTickets,
        analytics,
        contract: detail?.contract || {},
      });

      if (detailResult.status === "rejected") {
        setError(
          "⚠️ पूरी vendor details load नहीं हो पाईं। उपलब्ध जानकारी दिखाई जा रही है।"
        );
      }
    } catch (err) {
      setSelectedVendor({
        ...vendor,
        products: [],
        orders: [],
        payments: [],
        compliance: {},
        supportTickets: [],
        analytics: {},
        contract: {},
      });

      setError(
        err?.message ||
          "⚠️ Vendor details load नहीं हो पाए। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const closeVendorDetail = () => {
    setSelectedVendor(null);
  };

  const handleApprove = async (vendor) => {
    clearMessages();
    setActionLoading(`approve-${vendor.id}`);

    try {
      const response = await approveVendor({ id: vendor.id });

      await writeAuditLog(
        "APPROVE_VENDOR",
        vendor.id,
        `Approved vendor: ${vendor.name || vendor.id}`
      );

      setSuccess(response?.message || "✅ Vendor approve हो गया।");

      await loadVendors();

      if (selectedVendor?.id === vendor.id) {
        setSelectedVendor((currentVendor) => ({
          ...currentVendor,
          status: "approved",
          verified: true,
        }));
      }
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Vendor approve नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const openRejectModal = (vendor) => {
    clearMessages();
    setVendorToReject(vendor);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    setVendorToReject(null);
    setRejectionReason("");
    setShowRejectModal(false);
  };

  const handleReject = async () => {
    if (!vendorToReject?.id) {
      return;
    }

    const reason = rejectionReason.trim();

    if (!reason) {
      setError("⚠️ Vendor reject करने के लिए reason जरूरी है।");
      return;
    }

    clearMessages();
    setActionLoading(`reject-${vendorToReject.id}`);

    try {
      const response = await rejectVendor({
        id: vendorToReject.id,
        reason,
      });

      await writeAuditLog(
        "REJECT_VENDOR",
        vendorToReject.id,
        `Rejected vendor: ${vendorToReject.name || vendorToReject.id}. Reason: ${reason}`
      );

      setSuccess(response?.message || "✅ Vendor reject हो गया।");

      if (selectedVendor?.id === vendorToReject.id) {
        setSelectedVendor((currentVendor) => ({
          ...currentVendor,
          status: "rejected",
        }));
      }

      closeRejectModal();
      await loadVendors();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Vendor reject नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleVendorAction = async (vendor, action) => {
    clearMessages();

    const actionFunctions = {
      suspend: suspendVendor,
      reactivate: reactivateVendor,
      deactivate: deactivateVendor,
    };

    const requestFunction = actionFunctions[action];

    if (!requestFunction) {
      setError("⚠️ Invalid vendor action.");
      return;
    }

    setActionLoading(`${action}-${vendor.id}`);

    try {
      const response = await requestFunction({ id: vendor.id });

      const actionName = action.toUpperCase();

      await writeAuditLog(
        `${actionName}_VENDOR`,
        vendor.id,
        `${actionName} vendor: ${vendor.name || vendor.id}`
      );

      setSuccess(
        response?.message ||
          `✅ Vendor ${
            action === "reactivate" ? "reactivate" : action
          } हो गया।`
      );

      const nextStatus = {
        suspend: "suspended",
        reactivate: "active",
        deactivate: "deactivated",
      }[action];

      if (selectedVendor?.id === vendor.id) {
        setSelectedVendor((currentVendor) => ({
          ...currentVendor,
          status: nextStatus,
        }));
      }

      await loadVendors();
    } catch (err) {
      setError(
        err?.message ||
          `⚠️ Vendor ${
            action === "reactivate" ? "reactivate" : action
          } नहीं हो पाया। कृपया फिर से कोशिश करें।`
      );
    } finally {
      setActionLoading("");
    }
  };

  const toggleVendorSelection = (vendorId) => {
    setSelectedIds((currentIds) =>
      currentIds.includes(vendorId)
        ? currentIds.filter((id) => id !== vendorId)
        : [...currentIds, vendorId]
    );
  };

  const toggleAllVendors = () => {
    const currentPageIds = vendors.map((vendor) => vendor.id).filter(Boolean);

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

  const handleBulkUpdate = async () => {
    clearMessages();

    if (selectedIds.length === 0) {
      setError("⚠️ Bulk update के लिए कम से कम एक vendor select करें।");
      return;
    }

    setActionLoading("bulk-update");

    try {
      const response = await bulkUpdateVendors({
        ids: selectedIds,
        update: {
          status: bulkStatus,
        },
      });

      await writeAuditLog(
        "BULK_UPDATE_VENDORS",
        selectedIds.join(","),
        `Updated vendor status to ${bulkStatus}`
      );

      setSuccess(
        response?.message ||
          `✅ ${selectedIds.length} vendors का status update हो गया।`
      );

      setSelectedIds([]);
      setShowBulkPanel(false);

      await loadVendors();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Bulk vendor update नहीं हो पाया। कृपया फिर से कोशिश करें।"
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
        csv: exportVendorsCSV,
        excel: exportVendorsExcel,
        pdf: exportVendorsPDF,
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

      downloadExportResponse(response, `vendors-report.${format}`);

      await writeAuditLog(
        `EXPORT_VENDORS_${format.toUpperCase()}`,
        "",
        `Exported vendor report in ${format.toUpperCase()} format`
      );

      setSuccess(
        `✅ Vendor report ${format.toUpperCase()} में export हो गई।`
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

  const isAllSelected =
    vendors.length > 0 &&
    vendors.every((vendor) => selectedIds.includes(vendor.id));

  const selectedStatus = String(selectedVendor?.status || "").toLowerCase();

  const canApprove =
    selectedStatus === "pending" || selectedStatus === "rejected";

  const canSuspend =
    selectedStatus === "approved" || selectedStatus === "active";

  const canReactivate =
    selectedStatus === "suspended" || selectedStatus === "deactivated";

  const canDeactivate =
    selectedStatus === "approved" ||
    selectedStatus === "active" ||
    selectedStatus === "suspended";

  return (
    <div className="vendor-manager px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">
            Super Admin Vendor Manager 🏢
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Vendor onboarding, approval, compliance, products, payments और performance manage करें।
          </p>
        </div>

        <button
          type="button"
          onClick={refreshVendors}
          disabled={loadingVendors || Boolean(actionLoading)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Refresh Vendors
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
            placeholder="Search vendor, company, email, phone..."
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
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
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
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md bg-yellow-50 p-3">
            <p className="text-sm font-medium text-yellow-900">
              Selected vendors: {selectedIds.length}
            </p>

            <select
              value={bulkStatus}
              onChange={(event) => setBulkStatus(event.target.value)}
              className="rounded-md border px-3 py-2"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
              <option value="active">Active</option>
              <option value="deactivated">Deactivated</option>
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
              Vendor List
            </h2>
            <p className="text-sm text-gray-500">
              Total matching vendors: {totalVendors}
            </p>
          </div>

          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
        </div>

        {loadingVendors && vendors.length === 0 ? (
          <p className="py-8 text-center text-indigo-700">
            ✨ Loading vendors...
          </p>
        ) : vendors.length === 0 ? (
          <p className="py-8 text-center text-gray-600">
            No vendors found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-gray-700">
                  <th className="border px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleAllVendors}
                      aria-label="Select all vendors"
                    />
                  </th>
                  <th className="border px-3 py-2">Vendor</th>
                  <th className="border px-3 py-2">Company</th>
                  <th className="border px-3 py-2">Email</th>
                  <th className="border px-3 py-2">Phone</th>
                  <th className="border px-3 py-2">Status</th>
                  <th className="border px-3 py-2">Verified</th>
                  <th className="border px-3 py-2">Created</th>
                  <th className="border px-3 py-2">Actions</th>
                </tr>
              </thead>

              <tbody>
                {vendors.map((vendor) => {
                  const vendorStatus = String(
                    vendor.status || ""
                  ).toLowerCase();

                  const rowCanApprove =
                    vendorStatus === "pending" ||
                    vendorStatus === "rejected";

                  const rowCanSuspend =
                    vendorStatus === "approved" ||
                    vendorStatus === "active";

                  const rowCanReactivate =
                    vendorStatus === "suspended" ||
                    vendorStatus === "deactivated";

                  const rowCanDeactivate =
                    vendorStatus === "approved" ||
                    vendorStatus === "active" ||
                    vendorStatus === "suspended";

                  return (
                    <tr key={vendor.id} className="border-b hover:bg-gray-50">
                      <td className="border px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(vendor.id)}
                          onChange={() => toggleVendorSelection(vendor.id)}
                          aria-label={`Select vendor ${vendor.id}`}
                        />
                      </td>
                      <td className="border px-3 py-2 font-medium text-indigo-900">
                        {vendor.name || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        {vendor.company || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        {vendor.email || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        {vendor.phone || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                            vendor.status
                          )}`}
                        >
                          {vendor.status || "unknown"}
                        </span>
                      </td>
                      <td className="border px-3 py-2">
                        {vendor.verified ? (
                          <span className="font-medium text-green-600">Yes</span>
                        ) : (
                          <span className="font-medium text-red-600">No</span>
                        )}
                      </td>
                      <td className="border px-3 py-2">
                        {vendor.createdAt || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openVendorDetail(vendor)}
                            disabled={actionLoading === `detail-${vendor.id}`}
                            className="text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionLoading === `detail-${vendor.id}`
                              ? "Loading..."
                              : "View"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApprove(vendor)}
                            disabled={!rowCanApprove || Boolean(actionLoading)}
                            className="text-green-600 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Approve
                          </button>

                          <button
                            type="button"
                            onClick={() => openRejectModal(vendor)}
                            disabled={!rowCanApprove || Boolean(actionLoading)}
                            className="text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Reject
                          </button>

                          <button
                            type="button"
                            onClick={() => handleVendorAction(vendor, "suspend")}
                            disabled={!rowCanSuspend || Boolean(actionLoading)}
                            className="text-yellow-700 hover:text-yellow-900 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Suspend
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleVendorAction(vendor, "reactivate")
                            }
                            disabled={
                              !rowCanReactivate || Boolean(actionLoading)
                            }
                            className="text-indigo-600 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Reactivate
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleVendorAction(vendor, "deactivate")
                            }
                            disabled={
                              !rowCanDeactivate || Boolean(actionLoading)
                            }
                            className="text-gray-700 hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Deactivate
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
            disabled={page <= 1 || loadingVendors}
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
            disabled={page >= totalPages || loadingVendors}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      </section>

      {selectedVendor && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Vendor details"
        >
          <button
            type="button"
            aria-label="Close vendor details"
            onClick={closeVendorDetail}
            className="absolute inset-0 cursor-default"
          />

          <div className="relative z-10 h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  {selectedVendor.name || "Vendor Detail"}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedVendor.company || "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeVendorDetail}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleApprove(selectedVendor)}
                disabled={!canApprove || Boolean(actionLoading)}
                className="rounded-md bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Approve
              </button>

              <button
                type="button"
                onClick={() => openRejectModal(selectedVendor)}
                disabled={!canApprove || Boolean(actionLoading)}
                className="rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reject
              </button>

              <button
                type="button"
                onClick={() => handleVendorAction(selectedVendor, "suspend")}
                disabled={!canSuspend || Boolean(actionLoading)}
                className="rounded-md bg-yellow-600 px-3 py-2 text-sm text-white hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Suspend
              </button>

              <button
                type="button"
                onClick={() =>
                  handleVendorAction(selectedVendor, "reactivate")
                }
                disabled={!canReactivate || Boolean(actionLoading)}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reactivate
              </button>

              <button
                type="button"
                onClick={() =>
                  handleVendorAction(selectedVendor, "deactivate")
                }
                disabled={!canDeactivate || Boolean(actionLoading)}
                className="rounded-md bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Deactivate
              </button>
            </div>

            <div className="space-y-4">
              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">Profile</h3>
                <p className="text-sm"><span className="font-medium">Email:</span> {selectedVendor.email || "—"}</p>
                <p className="text-sm"><span className="font-medium">Phone:</span> {selectedVendor.phone || "—"}</p>
                <p className="text-sm"><span className="font-medium">Company:</span> {selectedVendor.company || "—"}</p>
                <p className="text-sm"><span className="font-medium">Status:</span> {selectedVendor.status || "—"}</p>
                <p className="text-sm"><span className="font-medium">Verified:</span> {selectedVendor.verified ? "Yes" : "No"}</p>
                <p className="text-sm"><span className="font-medium">Created:</span> {selectedVendor.createdAt || "—"}</p>
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">Products</h3>

                {selectedVendor.products.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    Product data उपलब्ध नहीं है।
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedVendor.products.map((product) => (
                      <div
                        key={product.id}
                        className="rounded border bg-white p-2 text-sm"
                      >
                        <p className="font-medium">
                          {product.name || "Unnamed Product"}
                        </p>
                        <p>SKU: {product.sku || "—"}</p>
                        <p>Stock: {product.stock ?? 0}</p>
                        <p>Price: {formatAmount(product.price)}</p>
                        <p>Compliance: {product.complianceStatus || "—"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">Orders</h3>

                {selectedVendor.orders.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    Order data उपलब्ध नहीं है।
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedVendor.orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border bg-white p-2 text-sm"
                      >
                        <span>#{order.id || "—"}</span>
                        <span>{order.status || "—"}</span>
                        <span>{formatAmount(order.total)}</span>
                        <span className="text-gray-500">
                          {order.createdAt || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Payments & Settlements
                </h3>

                {selectedVendor.payments.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    Payment data उपलब्ध नहीं है।
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedVendor.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border bg-white p-2 text-sm"
                      >
                        <span>{formatAmount(payment.amount)}</span>
                        <span>{payment.status || "—"}</span>
                        <span className="text-gray-500">
                          {payment.date || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Compliance & KYC
                </h3>
                <p className="text-sm"><span className="font-medium">GST:</span> {selectedVendor.compliance?.gst || "—"}</p>
                <p className="text-sm"><span className="font-medium">PAN:</span> {selectedVendor.compliance?.pan || "—"}</p>
                <p className="text-sm"><span className="font-medium">Verified:</span> {selectedVendor.compliance?.verified ? "Yes" : "No"}</p>
                <p className="break-words text-sm"><span className="font-medium">KYC Docs:</span> {(selectedVendor.compliance?.kycDocs || []).join(", ") || "—"}</p>
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Support Tickets
                </h3>

                {selectedVendor.supportTickets.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    Support ticket data उपलब्ध नहीं है।
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedVendor.supportTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="rounded border bg-white p-2 text-sm"
                      >
                        <p className="font-medium">
                          {ticket.subject || "Untitled Ticket"}
                        </p>
                        <p>Status: {ticket.status || "—"}</p>
                        <p className="text-gray-500">
                          {ticket.createdAt || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Performance & KPIs
                </h3>
                <p className="text-sm"><span className="font-medium">Sales Volume:</span> {formatAmount(selectedVendor.analytics?.salesVolume)}</p>
                <p className="text-sm"><span className="font-medium">Return Rate:</span> {selectedVendor.analytics?.returnRate ?? 0}%</p>
                <p className="text-sm"><span className="font-medium">Cancellation Rate:</span> {selectedVendor.analytics?.cancellationRate ?? 0}%</p>
                <p className="text-sm"><span className="font-medium">Rating:</span> {selectedVendor.analytics?.rating ?? 0}</p>
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Contract Information
                </h3>
                <p className="text-sm"><span className="font-medium">Contract ID:</span> {selectedVendor.contract?.id || "—"}</p>
                <p className="text-sm"><span className="font-medium">Start Date:</span> {selectedVendor.contract?.startDate || "—"}</p>
                <p className="text-sm"><span className="font-medium">End Date:</span> {selectedVendor.contract?.endDate || "—"}</p>
                <p className="break-words text-sm"><span className="font-medium">Terms:</span> {selectedVendor.contract?.terms || "—"}</p>
              </section>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && vendorToReject && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Reject vendor"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Reject Vendor
                </h2>
                <p className="text-sm text-gray-500">
                  {vendorToReject.name || vendorToReject.company || "Vendor"} को reject करने का कारण लिखें।
                </p>
              </div>

              <button
                type="button"
                onClick={closeRejectModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <textarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              rows={5}
              placeholder="Rejection reason..."
              className="w-full rounded-md border p-3 outline-none focus:border-red-500"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeRejectModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleReject}
                disabled={actionLoading === `reject-${vendorToReject.id}`}
                className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `reject-${vendorToReject.id}`
                  ? "Rejecting..."
                  : "Reject Vendor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VendorManager;