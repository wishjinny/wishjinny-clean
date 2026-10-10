import React, { useEffect, useMemo, useState } from "react";
import {
  fetchWarehouses,
  fetchWarehouseDetails,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  activateWarehouse,
  deactivateWarehouse,
  fetchWarehouseInventory,
  fetchWarehouseOrders,
  fetchWarehouseAnalytics,
  bulkUpdateWarehouses,
  exportWarehousesCSV,
  exportWarehousesExcel,
  exportWarehousesPDF,
  logAuditEvent,
} from "../utils/api";

const PAGE_SIZE = 10;

const emptyWarehouseForm = {
  name: "",
  location: "",
  capacity: "",
  contact: "",
  status: "active",
};

function WarehouseManager() {
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalWarehouses, setTotalWarehouses] = useState(0);

  const [showWarehouseForm, setShowWarehouseForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [warehouseForm, setWarehouseForm] = useState(emptyWarehouseForm);

  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("active");

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
    loadWarehouses();
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

    if (normalized === "active" || normalized === "enabled") {
      return "bg-green-100 text-green-700";
    }

    if (normalized === "inactive" || normalized === "disabled") {
      return "bg-red-100 text-red-700";
    }

    return "bg-gray-100 text-gray-700";
  };

  const formatNumber = (value) => {
    const parsedValue = Number(value);

    if (Number.isNaN(parsedValue)) {
      return "0";
    }

    return parsedValue.toLocaleString("en-IN");
  };

  const writeAuditLog = async (action, resourceId, details) => {
    try {
      await logAuditEvent({
        action,
        resourceType: "warehouse",
        resourceId: resourceId || "",
        details: details || "",
      });
    } catch {
      // Main warehouse action should not fail only because audit log fails.
    }
  };

  const loadWarehouses = async () => {
    setLoadingWarehouses(true);
    setError("");

    try {
      const response = await fetchWarehouses({
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

      setWarehouses(items);
      setTotalPages(Math.max(1, receivedTotalPages));
      setTotalWarehouses(receivedTotal);
    } catch (err) {
      setWarehouses([]);
      setError(
        err?.message ||
          "⚠️ Warehouses load नहीं हो पाए। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const refreshWarehouses = async () => {
    clearMessages();
    await loadWarehouses();
    setSuccess("✅ Warehouse data refresh हो गया।");
  };

  const openWarehouseDetail = async (warehouse) => {
    clearMessages();
    setActionLoading(`detail-${warehouse.id}`);

    try {
      const [detailResult, inventoryResult, ordersResult, analyticsResult] =
        await Promise.allSettled([
          fetchWarehouseDetails({ id: warehouse.id }),
          fetchWarehouseInventory({ id: warehouse.id }),
          fetchWarehouseOrders({ id: warehouse.id }),
          fetchWarehouseAnalytics({ id: warehouse.id }),
        ]);

      const detail =
        detailResult.status === "fulfilled"
          ? detailResult.value
          : warehouse;

      const inventory =
        inventoryResult.status === "fulfilled"
          ? getItems(inventoryResult.value)
          : Array.isArray(detail?.inventory)
            ? detail.inventory
            : [];

      const orders =
        ordersResult.status === "fulfilled"
          ? getItems(ordersResult.value)
          : Array.isArray(detail?.orders)
            ? detail.orders
            : [];

      const analytics =
        analyticsResult.status === "fulfilled"
          ? analyticsResult.value
          : detail?.analytics || {};

      setSelectedWarehouse({
        ...warehouse,
        ...(detail || {}),
        inventory,
        orders,
        analytics,
        staff: Array.isArray(detail?.staff) ? detail.staff : [],
      });

      if (detailResult.status === "rejected") {
        setError(
          "⚠️ पूरी warehouse details load नहीं हो पाईं। उपलब्ध जानकारी दिखाई जा रही है।"
        );
      }
    } catch (err) {
      setSelectedWarehouse({
        ...warehouse,
        inventory: [],
        orders: [],
        analytics: {},
        staff: [],
      });

      setError(
        err?.message ||
          "⚠️ Warehouse detail load नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const closeWarehouseDetail = () => {
    setSelectedWarehouse(null);
  };

  const openCreateForm = () => {
    clearMessages();
    setEditingWarehouse(null);
    setWarehouseForm(emptyWarehouseForm);
    setShowWarehouseForm(true);
  };

  const openEditForm = (warehouse) => {
    clearMessages();

    setEditingWarehouse(warehouse);
    setWarehouseForm({
      name: warehouse.name || "",
      location: warehouse.location || "",
      capacity:
        warehouse.capacity === undefined || warehouse.capacity === null
          ? ""
          : String(warehouse.capacity),
      contact: warehouse.contact || "",
      status: warehouse.status || "active",
    });

    setShowWarehouseForm(true);
  };

  const closeWarehouseForm = () => {
    setShowWarehouseForm(false);
    setEditingWarehouse(null);
    setWarehouseForm(emptyWarehouseForm);
  };

  const handleWarehouseFormChange = (field, value) => {
    setWarehouseForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const saveWarehouse = async () => {
    clearMessages();

    if (!warehouseForm.name.trim()) {
      setError("⚠️ Warehouse name जरूरी है।");
      return;
    }

    if (!warehouseForm.location.trim()) {
      setError("⚠️ Warehouse location जरूरी है।");
      return;
    }

    const capacity = Number(warehouseForm.capacity);

    if (Number.isNaN(capacity) || capacity < 0) {
      setError("⚠️ Warehouse capacity 0 या उससे ज्यादा होनी चाहिए।");
      return;
    }

    const payload = {
      name: warehouseForm.name.trim(),
      location: warehouseForm.location.trim(),
      capacity,
      contact: warehouseForm.contact.trim(),
      status: warehouseForm.status,
    };

    setActionLoading(editingWarehouse ? "update-warehouse" : "create-warehouse");

    try {
      let response;

      if (editingWarehouse?.id) {
        response = await updateWarehouse({
          id: editingWarehouse.id,
          ...payload,
        });

        await writeAuditLog(
          "UPDATE_WAREHOUSE",
          editingWarehouse.id,
          `Updated warehouse: ${payload.name}`
        );

        setSuccess(
          response?.message || "✅ Warehouse successfully update हो गया।"
        );
      } else {
        response = await createWarehouse(payload);

        await writeAuditLog(
          "CREATE_WAREHOUSE",
          response?.id || response?.warehouseId || payload.name,
          `Created warehouse: ${payload.name}`
        );

        setSuccess(
          response?.message || "✅ Warehouse successfully create हो गया।"
        );
      }

      closeWarehouseForm();
      await loadWarehouses();
    } catch (err) {
      setError(
        err?.message ||
          `⚠️ Warehouse ${
            editingWarehouse ? "update" : "create"
          } नहीं हो पाया। कृपया फिर से कोशिश करें।`
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleDeleteWarehouse = async (warehouse) => {
    clearMessages();
    setActionLoading(`delete-${warehouse.id}`);

    try {
      const response = await deleteWarehouse({ id: warehouse.id });

      await writeAuditLog(
        "DELETE_WAREHOUSE",
        warehouse.id,
        `Deleted warehouse: ${warehouse.name || warehouse.id}`
      );

      setSuccess(
        response?.message || "✅ Warehouse successfully delete हो गया।"
      );

      setSelectedIds((currentIds) =>
        currentIds.filter((id) => id !== warehouse.id)
      );

      if (selectedWarehouse?.id === warehouse.id) {
        closeWarehouseDetail();
      }

      await loadWarehouses();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Warehouse delete नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleWarehouseStatus = async (warehouse, action) => {
    clearMessages();

    const requestFunction =
      action === "activate" ? activateWarehouse : deactivateWarehouse;

    setActionLoading(`${action}-${warehouse.id}`);

    try {
      const response = await requestFunction({ id: warehouse.id });

      await writeAuditLog(
        action === "activate" ? "ACTIVATE_WAREHOUSE" : "DEACTIVATE_WAREHOUSE",
        warehouse.id,
        `${action}d warehouse: ${warehouse.name || warehouse.id}`
      );

      setSuccess(
        response?.message ||
          `✅ Warehouse ${action === "activate" ? "activate" : "deactivate"} हो गया।`
      );

      await loadWarehouses();

      if (selectedWarehouse?.id === warehouse.id) {
        setSelectedWarehouse((currentWarehouse) => ({
          ...currentWarehouse,
          status: action === "activate" ? "active" : "inactive",
        }));
      }
    } catch (err) {
      setError(
        err?.message ||
          `⚠️ Warehouse ${
            action === "activate" ? "activate" : "deactivate"
          } नहीं हो पाया। कृपया फिर से कोशिश करें।`
      );
    } finally {
      setActionLoading("");
    }
  };

  const toggleWarehouseSelection = (warehouseId) => {
    setSelectedIds((currentIds) =>
      currentIds.includes(warehouseId)
        ? currentIds.filter((id) => id !== warehouseId)
        : [...currentIds, warehouseId]
    );
  };

  const toggleAllWarehouses = () => {
    const currentPageIds = warehouses
      .map((warehouse) => warehouse.id)
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

  const handleBulkUpdate = async () => {
    clearMessages();

    if (selectedIds.length === 0) {
      setError("⚠️ Bulk update के लिए कम से कम एक warehouse select करें।");
      return;
    }

    setActionLoading("bulk-update");

    try {
      const response = await bulkUpdateWarehouses({
        ids: selectedIds,
        update: {
          status: bulkStatus,
        },
      });

      await writeAuditLog(
        "BULK_UPDATE_WAREHOUSES",
        selectedIds.join(","),
        `Updated warehouse status to ${bulkStatus}`
      );

      setSuccess(
        response?.message ||
          `✅ ${selectedIds.length} warehouses का status update हो गया।`
      );

      setSelectedIds([]);
      setShowBulkPanel(false);

      await loadWarehouses();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Bulk warehouse update नहीं हो पाया। कृपया फिर से कोशिश करें।"
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
        csv: exportWarehousesCSV,
        excel: exportWarehousesExcel,
        pdf: exportWarehousesPDF,
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

      downloadExportResponse(response, `warehouses-report.${format}`);

      await writeAuditLog(
        `EXPORT_WAREHOUSES_${format.toUpperCase()}`,
        "",
        `Exported warehouses in ${format.toUpperCase()} format`
      );

      setSuccess(
        `✅ Warehouse report ${format.toUpperCase()} में export हो गई।`
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
    warehouses.length > 0 &&
    warehouses.every((warehouse) => selectedIds.includes(warehouse.id));

  const isSelectedWarehouseActive =
    String(selectedWarehouse?.status || "").toLowerCase() === "active";

  return (
    <div className="warehouse-manager px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">
            Super Admin Warehouse Manager 🏭
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Warehouses, capacity, inventory, orders और warehouse performance manage करें।
          </p>
        </div>

        <button
          type="button"
          onClick={refreshWarehouses}
          disabled={loadingWarehouses || Boolean(actionLoading)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Refresh Warehouses
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
          Filters & Actions
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            type="text"
            placeholder="Search warehouse, location, contact..."
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
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button
            type="button"
            onClick={openCreateForm}
            disabled={Boolean(actionLoading)}
            className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Create Warehouse
          </button>

          <button
            type="button"
            onClick={() => setShowBulkPanel((visible) => !visible)}
            disabled={Boolean(actionLoading)}
            className="rounded-md bg-yellow-500 px-4 py-2 text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Bulk Update ({selectedIds.length})
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleExport("csv")}
              disabled={Boolean(actionLoading)}
              className="flex-1 rounded-md bg-yellow-500 px-3 py-2 text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              CSV
            </button>

            <button
              type="button"
              onClick={() => handleExport("excel")}
              disabled={Boolean(actionLoading)}
              className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Excel
            </button>

            <button
              type="button"
              onClick={() => handleExport("pdf")}
              disabled={Boolean(actionLoading)}
              className="flex-1 rounded-md bg-purple-600 px-3 py-2 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              PDF
            </button>
          </div>
        </div>

        {showBulkPanel && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md bg-yellow-50 p-3">
            <p className="text-sm font-medium text-yellow-900">
              Selected warehouses: {selectedIds.length}
            </p>

            <select
              value={bulkStatus}
              onChange={(event) => setBulkStatus(event.target.value)}
              className="rounded-md border px-3 py-2"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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
              Warehouse List
            </h2>
            <p className="text-sm text-gray-500">
              Total matching warehouses: {totalWarehouses}
            </p>
          </div>

          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
        </div>

        {loadingWarehouses && warehouses.length === 0 ? (
          <p className="py-8 text-center text-indigo-700">
            ✨ Loading warehouses...
          </p>
        ) : warehouses.length === 0 ? (
          <p className="py-8 text-center text-gray-600">
            No warehouses found.
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
                      onChange={toggleAllWarehouses}
                      aria-label="Select all warehouses"
                    />
                  </th>
                  <th className="border px-3 py-2">Warehouse</th>
                  <th className="border px-3 py-2">Location</th>
                  <th className="border px-3 py-2">Capacity</th>
                  <th className="border px-3 py-2">Contact</th>
                  <th className="border px-3 py-2">Status</th>
                  <th className="border px-3 py-2">Created</th>
                  <th className="border px-3 py-2">Actions</th>
                </tr>
              </thead>

              <tbody>
                {warehouses.map((warehouse) => {
                  const isActive =
                    String(warehouse.status || "").toLowerCase() === "active";

                  return (
                    <tr
                      key={warehouse.id}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="border px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(warehouse.id)}
                          onChange={() =>
                            toggleWarehouseSelection(warehouse.id)
                          }
                          aria-label={`Select warehouse ${warehouse.id}`}
                        />
                      </td>
                      <td className="border px-3 py-2 font-medium text-indigo-900">
                        {warehouse.name || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        {warehouse.location || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        {formatNumber(warehouse.capacity)}
                      </td>
                      <td className="border px-3 py-2">
                        {warehouse.contact || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                            warehouse.status
                          )}`}
                        >
                          {warehouse.status || "unknown"}
                        </span>
                      </td>
                      <td className="border px-3 py-2">
                        {warehouse.createdAt || "—"}
                      </td>
                      <td className="border px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openWarehouseDetail(warehouse)}
                            disabled={
                              actionLoading === `detail-${warehouse.id}`
                            }
                            className="text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionLoading === `detail-${warehouse.id}`
                              ? "Loading..."
                              : "View"}
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditForm(warehouse)}
                            disabled={Boolean(actionLoading)}
                            className="text-indigo-600 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleWarehouseStatus(warehouse, "activate")
                            }
                            disabled={isActive || Boolean(actionLoading)}
                            className="text-green-600 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Activate
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleWarehouseStatus(warehouse, "deactivate")
                            }
                            disabled={!isActive || Boolean(actionLoading)}
                            className="text-yellow-700 hover:text-yellow-900 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Deactivate
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteWarehouse(warehouse)}
                            disabled={Boolean(actionLoading)}
                            className="text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {actionLoading === `delete-${warehouse.id}`
                              ? "Deleting..."
                              : "Delete"}
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
            disabled={page <= 1 || loadingWarehouses}
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
            disabled={page >= totalPages || loadingWarehouses}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      </section>

      {selectedWarehouse && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Warehouse details"
        >
          <button
            type="button"
            aria-label="Close warehouse details"
            onClick={closeWarehouseDetail}
            className="absolute inset-0 cursor-default"
          />

          <div className="relative z-10 h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  {selectedWarehouse.name || "Warehouse Detail"}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedWarehouse.location || "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeWarehouseDetail}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openEditForm(selectedWarehouse)}
                disabled={Boolean(actionLoading)}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Edit Warehouse
              </button>

              <button
                type="button"
                onClick={() =>
                  handleWarehouseStatus(
                    selectedWarehouse,
                    isSelectedWarehouseActive ? "deactivate" : "activate"
                  )
                }
                disabled={Boolean(actionLoading)}
                className="rounded-md bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSelectedWarehouseActive
                  ? "Deactivate Warehouse"
                  : "Activate Warehouse"}
              </button>

              <button
                type="button"
                onClick={() => handleDeleteWarehouse(selectedWarehouse)}
                disabled={Boolean(actionLoading)}
                className="rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Delete Warehouse
              </button>
            </div>

            <div className="space-y-4">
              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Profile & Details
                </h3>
                <p className="text-sm"><span className="font-medium">Location:</span> {selectedWarehouse.location || "—"}</p>
                <p className="text-sm"><span className="font-medium">Capacity:</span> {formatNumber(selectedWarehouse.capacity)}</p>
                <p className="text-sm"><span className="font-medium">Contact:</span> {selectedWarehouse.contact || "—"}</p>
                <p className="text-sm"><span className="font-medium">Status:</span> {selectedWarehouse.status || "—"}</p>
                <p className="text-sm"><span className="font-medium">Created:</span> {selectedWarehouse.createdAt || "—"}</p>
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Inventory
                </h3>

                {selectedWarehouse.inventory.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    Inventory data उपलब्ध नहीं है।
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedWarehouse.inventory.map((item) => (
                      <div
                        key={item.productId || item.id || item.productName}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border bg-white p-2 text-sm"
                      >
                        <span>{item.productName || "Unnamed Product"}</span>
                        <span>
                          Stock: {formatNumber(item.stock)}
                          {item.lowStockAlert && (
                            <span className="ml-2 font-medium text-red-600">
                              Low Stock
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Orders
                </h3>

                {selectedWarehouse.orders.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    Order data उपलब्ध नहीं है।
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedWarehouse.orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border bg-white p-2 text-sm"
                      >
                        <span>#{order.id || "—"}</span>
                        <span>{order.status || "—"}</span>
                        <span>₹{formatNumber(order.total)}</span>
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
                  Performance & Analytics
                </h3>
                <p className="text-sm"><span className="font-medium">Utilization Rate:</span> {selectedWarehouse.analytics?.utilizationRate ?? 0}%</p>
                <p className="text-sm"><span className="font-medium">Throughput:</span> {selectedWarehouse.analytics?.throughput ?? 0}</p>
                <p className="text-sm"><span className="font-medium">Delay Rate:</span> {selectedWarehouse.analytics?.delayRate ?? 0}%</p>
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Staff & Access
                </h3>

                {selectedWarehouse.staff.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    Staff data उपलब्ध नहीं है।
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedWarehouse.staff.map((staffMember) => (
                      <div
                        key={staffMember.id}
                        className="rounded border bg-white p-2 text-sm"
                      >
                        <p className="font-medium">
                          {staffMember.name || "—"}
                        </p>
                        <p className="text-gray-600">
                          Role: {staffMember.role || "—"}
                        </p>
                        <p className="text-gray-600">
                          Access: {staffMember.accessLevel || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {showWarehouseForm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={editingWarehouse ? "Edit warehouse" : "Create warehouse"}
        >
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  {editingWarehouse ? "Edit Warehouse" : "Create Warehouse"}
                </h2>
                <p className="text-sm text-gray-500">
                  Warehouse की जरूरी जानकारी भरें।
                </p>
              </div>

              <button
                type="button"
                onClick={closeWarehouseForm}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Warehouse name"
                value={warehouseForm.name}
                onChange={(event) =>
                  handleWarehouseFormChange("name", event.target.value)
                }
                className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              />

              <input
                type="text"
                placeholder="Location"
                value={warehouseForm.location}
                onChange={(event) =>
                  handleWarehouseFormChange("location", event.target.value)
                }
                className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              />

              <input
                type="number"
                min="0"
                placeholder="Capacity"
                value={warehouseForm.capacity}
                onChange={(event) =>
                  handleWarehouseFormChange("capacity", event.target.value)
                }
                className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              />

              <input
                type="text"
                placeholder="Contact number or email"
                value={warehouseForm.contact}
                onChange={(event) =>
                  handleWarehouseFormChange("contact", event.target.value)
                }
                className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              />

              <select
                value={warehouseForm.status}
                onChange={(event) =>
                  handleWarehouseFormChange("status", event.target.value)
                }
                className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeWarehouseForm}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveWarehouse}
                disabled={
                  actionLoading === "create-warehouse" ||
                  actionLoading === "update-warehouse"
                }
                className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "create-warehouse" ||
                actionLoading === "update-warehouse"
                  ? "Saving..."
                  : editingWarehouse
                    ? "Update Warehouse"
                    : "Create Warehouse"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WarehouseManager;