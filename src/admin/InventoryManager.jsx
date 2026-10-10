import React, { useEffect, useMemo, useState } from "react";
import {
  fetchInventory,
  updateStock,
  adjustStock,
  createPurchaseOrder,
  fetchWarehouses,
  fetchInventoryAnalytics,
  exportInventoryCSV,
  exportInventoryExcel,
  exportInventoryPDF,
  logAuditEvent,
} from "../utils/api";

const PAGE_SIZE = 12;

function InventoryManager() {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [loadingInventory, setLoadingInventory] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  const [showUpdateStockModal, setShowUpdateStockModal] = useState(false);
  const [showAdjustStockModal, setShowAdjustStockModal] = useState(false);
  const [showPurchaseOrderModal, setShowPurchaseOrderModal] =
    useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);

  const [newStockQuantity, setNewStockQuantity] = useState("");
  const [adjustmentQuantity, setAdjustmentQuantity] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [purchaseOrderQuantity, setPurchaseOrderQuantity] = useState("");

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      warehouse: filterWarehouse,
      category: filterCategory,
    }),
    [debouncedSearch, filterWarehouse, filterCategory]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    loadInventory();
  }, [page, filters.search, filters.warehouse, filters.category]);

  useEffect(() => {
    loadSummaryData();
  }, []);

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

  const getStockStatus = (product) => {
    const available = Number(product?.available || 0);
    const threshold = Number(product?.threshold || 0);

    if (available <= 0) {
      return {
        label: "Out of Stock",
        className: "bg-red-100 text-red-700",
      };
    }

    if (available <= threshold) {
      return {
        label: "Low Stock",
        className: "bg-yellow-100 text-yellow-800",
      };
    }

    return {
      label: "In Stock",
      className: "bg-green-100 text-green-700",
    };
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
      // Do not fail the main action if audit logging fails.
    }
  };

  const loadInventory = async () => {
    setLoadingInventory(true);
    setError("");

    try {
      const response = await fetchInventory({
        page,
        pageSize: PAGE_SIZE,
        limit: PAGE_SIZE,
        search: filters.search,
        warehouse:
          filters.warehouse === "all" ? undefined : filters.warehouse,
        category:
          filters.category === "all" ? undefined : filters.category,
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

      setProducts(items);
      setTotalProducts(receivedTotal);
      setTotalPages(Math.max(1, receivedTotalPages));
    } catch (err) {
      setProducts([]);
      setError(
        err?.message || "Could not load inventory. Please try again."
      );
    } finally {
      setLoadingInventory(false);
    }
  };

  const loadSummaryData = async () => {
    setLoadingSummary(true);

    const results = await Promise.allSettled([
      fetchWarehouses(),
      fetchInventoryAnalytics(),
    ]);

    const [warehouseResult, analyticsResult] = results;

    if (warehouseResult.status === "fulfilled") {
      setWarehouses(getItems(warehouseResult.value));
    }

    if (analyticsResult.status === "fulfilled") {
      setAnalytics(analyticsResult.value || null);
    }

    if (results.some((result) => result.status === "rejected")) {
      setError("Some inventory summary data could not be loaded.");
    }

    setLoadingSummary(false);
  };

  const refreshInventoryData = async () => {
    clearMessages();

    await Promise.all([loadInventory(), loadSummaryData()]);

    setSuccess("Inventory data refreshed successfully.");
  };

  const openUpdateStockModal = (product) => {
    clearMessages();

    setSelectedProduct(product);
    setNewStockQuantity(
      product?.available === undefined || product?.available === null
        ? ""
        : String(product.available)
    );

    setShowUpdateStockModal(true);
  };

  const closeUpdateStockModal = () => {
    setSelectedProduct(null);
    setNewStockQuantity("");
    setShowUpdateStockModal(false);
  };

  const saveUpdatedStock = async () => {
    if (!selectedProduct?.id) return;

    const quantity = Number(newStockQuantity);

    if (!Number.isInteger(quantity) || quantity < 0) {
      setError("Stock quantity must be a whole number greater than or equal to 0.");
      return;
    }

    clearMessages();
    setActionLoading(`update-stock-${selectedProduct.id}`);

    try {
      const response = await updateStock({
        id: selectedProduct.id,
        quantity,
      });

      await writeAuditLog(
        "UPDATE_INVENTORY_STOCK",
        "product",
        selectedProduct.id,
        `Updated stock to ${quantity}`
      );

      setSuccess(response?.message || "Stock updated successfully.");

      closeUpdateStockModal();
      await Promise.all([loadInventory(), loadSummaryData()]);
    } catch (err) {
      setError(err?.message || "Could not update stock.");
    } finally {
      setActionLoading("");
    }
  };

  const openAdjustStockModal = (product) => {
    clearMessages();

    setSelectedProduct(product);
    setAdjustmentQuantity("");
    setAdjustmentReason("");

    setShowAdjustStockModal(true);
  };

  const closeAdjustStockModal = () => {
    setSelectedProduct(null);
    setAdjustmentQuantity("");
    setAdjustmentReason("");
    setShowAdjustStockModal(false);
  };

  const saveStockAdjustment = async () => {
    if (!selectedProduct?.id) return;

    const quantity = Number(adjustmentQuantity);
    const reason = adjustmentReason.trim();

    if (!Number.isInteger(quantity) || quantity === 0) {
      setError(
        "Enter a whole number. Use a positive value to add stock or a negative value to remove stock."
      );
      return;
    }

    if (!reason) {
      setError("An adjustment reason is required.");
      return;
    }

    const currentAvailable = Number(selectedProduct.available || 0);

    if (quantity < 0 && Math.abs(quantity) > currentAvailable) {
      setError("You cannot remove more stock than is currently available.");
      return;
    }

    clearMessages();
    setActionLoading(`adjust-stock-${selectedProduct.id}`);

    try {
      const response = await adjustStock({
        id: selectedProduct.id,
        quantity,
        reason,
      });

      await writeAuditLog(
        "ADJUST_INVENTORY_STOCK",
        "product",
        selectedProduct.id,
        `Stock adjustment: ${quantity}. Reason: ${reason}`
      );

      setSuccess(response?.message || "Stock adjusted successfully.");

      closeAdjustStockModal();
      await Promise.all([loadInventory(), loadSummaryData()]);
    } catch (err) {
      setError(err?.message || "Could not adjust stock.");
    } finally {
      setActionLoading("");
    }
  };

  const openPurchaseOrderModal = (product) => {
    clearMessages();

    setSelectedProduct(product);
    setPurchaseOrderQuantity("");

    setShowPurchaseOrderModal(true);
  };

  const closePurchaseOrderModal = () => {
    setSelectedProduct(null);
    setPurchaseOrderQuantity("");
    setShowPurchaseOrderModal(false);
  };

  const savePurchaseOrder = async () => {
    if (!selectedProduct?.id) return;

    const quantity = Number(purchaseOrderQuantity);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError("Purchase order quantity must be a whole number greater than 0.");
      return;
    }

    clearMessages();
    setActionLoading(`purchase-order-${selectedProduct.id}`);

    try {
      const response = await createPurchaseOrder({
        productId: selectedProduct.id,
        quantity,
      });

      await writeAuditLog(
        "CREATE_PURCHASE_ORDER",
        "product",
        selectedProduct.id,
        `Created purchase order for ${quantity} unit(s)`
      );

      setSuccess(response?.message || "Purchase order created successfully.");

      closePurchaseOrderModal();
      await loadInventory();
    } catch (err) {
      setError(err?.message || "Could not create purchase order.");
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
        csv: exportInventoryCSV,
        excel: exportInventoryExcel,
        pdf: exportInventoryPDF,
      };

      const exportFunction = exportFunctions[format];

      if (!exportFunction) {
        throw new Error("Invalid export format.");
      }

      const response = await exportFunction({
        search: debouncedSearch,
        warehouse:
          filterWarehouse === "all" ? undefined : filterWarehouse,
        category:
          filterCategory === "all" ? undefined : filterCategory,
      });

      downloadExportResponse(response, `inventory-report.${format}`);

      await writeAuditLog(
        `EXPORT_INVENTORY_${format.toUpperCase()}`,
        "inventory_report",
        "",
        `Exported inventory in ${format.toUpperCase()} format`
      );

      setSuccess(`Inventory exported to ${format.toUpperCase()}.`);
    } catch (err) {
      setError(
        err?.message || `Could not export inventory as ${format.toUpperCase()}.`
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

  return (
    <div className="inventory-manager px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">
            Inventory & Stock Manager
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage product stock, warehouses, purchase orders, and low-stock alerts.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshInventoryData}
          disabled={
            loadingInventory ||
            loadingSummary ||
            Boolean(actionLoading)
          }
          className="rounded-md bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Refresh Inventory
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
            Inventory Analytics
          </h2>

          {loadingSummary && (
            <span className="text-sm text-gray-500">
              Loading analytics...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard label="Total Products" value={analytics?.totalProducts} />
          <MetricCard
            label="Total Stock"
            value={analytics?.totalStock}
            color="text-green-600"
          />
          <MetricCard
            label="Reserved Stock"
            value={analytics?.reservedStock}
            color="text-blue-600"
          />
          <MetricCard
            label="Sold Units"
            value={analytics?.soldUnits}
            color="text-purple-600"
          />
          <MetricCard
            label="Low Stock Products"
            value={analytics?.lowStockProducts}
            color="text-red-600"
          />
        </div>
      </section>

      <section className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-indigo-900">
          Filters and Export
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            type="text"
            placeholder="Search product, SKU, vendor..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          />

          <select
            value={filterWarehouse}
            onChange={(event) => {
              setFilterWarehouse(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          >
            <option value="all">All Warehouses</option>

            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
                {warehouse.location ? ` - ${warehouse.location}` : ""}
              </option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={(event) => {
              setFilterCategory(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          >
            <option value="all">All Categories</option>
            <option value="electronics">Electronics</option>
            <option value="fashion">Fashion</option>
            <option value="home">Home</option>
            <option value="beauty">Beauty</option>
            <option value="grocery">Grocery</option>
            <option value="sports">Sports</option>
            <option value="other">Other</option>
          </select>

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
              {actionLoading === "export-excel" ? "Exporting..." : "Excel"}
            </button>

            <button
              type="button"
              onClick={() => handleExport("pdf")}
              disabled={Boolean(actionLoading)}
              className="flex-1 rounded-md bg-purple-600 px-3 py-2 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading === "export-pdf" ? "Exporting..." : "PDF"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-indigo-900">
              Product Inventory
            </h2>
            <p className="text-sm text-gray-500">
              Total matching products: {totalProducts}
            </p>
          </div>

          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
        </div>

        {loadingInventory && products.length === 0 ? (
          <p className="py-8 text-center text-indigo-700">
            Loading inventory...
          </p>
        ) : products.length === 0 ? (
          <p className="py-8 text-center text-gray-600">
            No products found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1150px] w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-gray-700">
                  <th className="border px-3 py-2">Product</th>
                  <th className="border px-3 py-2">Category</th>
                  <th className="border px-3 py-2">Vendor</th>
                  <th className="border px-3 py-2">Warehouse</th>
                  <th className="border px-3 py-2">Available</th>
                  <th className="border px-3 py-2">Reserved</th>
                  <th className="border px-3 py-2">Sold</th>
                  <th className="border px-3 py-2">Threshold</th>
                  <th className="border px-3 py-2">Stock Status</th>
                  <th className="border px-3 py-2">Updated</th>
                  <th className="border px-3 py-2">Actions</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => {
                  const stockStatus = getStockStatus(product);

                  return (
                    <tr
                      key={product.id}
                      className="border-b align-top hover:bg-gray-50"
                    >
                      <td className="border px-3 py-2">
                        <p className="font-medium text-indigo-900">
                          {product.name || "Unnamed Product"}
                        </p>
                        <p className="font-mono text-xs text-gray-500">
                          SKU: {product.sku || "-"}
                        </p>
                      </td>

                      <td className="border px-3 py-2">
                        {product.category || "-"}
                      </td>

                      <td className="border px-3 py-2">
                        {product.vendor || "-"}
                      </td>

                      <td className="border px-3 py-2">
                        {product.warehouse || "-"}
                      </td>

                      <td className="border px-3 py-2 font-semibold">
                        {product.available ?? 0}
                      </td>

                      <td className="border px-3 py-2">
                        {product.reserved ?? 0}
                      </td>

                      <td className="border px-3 py-2">
                        {product.sold ?? 0}
                      </td>

                      <td className="border px-3 py-2">
                        {product.threshold ?? 0}
                      </td>

                      <td className="border px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${stockStatus.className}`}
                        >
                          {stockStatus.label}
                        </span>
                      </td>

                      <td className="border px-3 py-2">
                        {product.lastUpdated || "-"}
                      </td>

                      <td className="border px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openUpdateStockModal(product)}
                            disabled={Boolean(actionLoading)}
                            className="text-indigo-600 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Update Stock
                          </button>

                          <button
                            type="button"
                            onClick={() => openAdjustStockModal(product)}
                            disabled={Boolean(actionLoading)}
                            className="text-yellow-700 hover:text-yellow-900 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Adjust
                          </button>

                          <button
                            type="button"
                            onClick={() => openPurchaseOrderModal(product)}
                            disabled={Boolean(actionLoading)}
                            className="text-green-600 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Create PO
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
            disabled={page <= 1 || loadingInventory}
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
            disabled={page >= totalPages || loadingInventory}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </section>

      {showUpdateStockModal && selectedProduct && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Update Stock
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedProduct.name || "Product"} - SKU:{" "}
                  {selectedProduct.sku || "-"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeUpdateStockModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <p className="mb-3 text-sm text-gray-600">
              This will replace the current available stock quantity.
            </p>

            <input
              type="number"
              min="0"
              step="1"
              value={newStockQuantity}
              onChange={(event) => setNewStockQuantity(event.target.value)}
              placeholder="New available stock quantity"
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeUpdateStockModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveUpdatedStock}
                disabled={
                  actionLoading === `update-stock-${selectedProduct.id}`
                }
                className="rounded-md bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `update-stock-${selectedProduct.id}`
                  ? "Saving..."
                  : "Update Stock"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdjustStockModal && selectedProduct && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Adjust Stock
                </h2>
                <p className="text-sm text-gray-500">
                  Current available stock: {selectedProduct.available ?? 0}
                </p>
              </div>

              <button
                type="button"
                onClick={closeAdjustStockModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <p className="mb-3 text-sm text-gray-600">
              Use a positive number to add stock and a negative number to remove stock.
            </p>

            <input
              type="number"
              step="1"
              value={adjustmentQuantity}
              onChange={(event) => setAdjustmentQuantity(event.target.value)}
              placeholder="Example: 25 or -5"
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-yellow-500"
            />

            <textarea
              value={adjustmentReason}
              onChange={(event) => setAdjustmentReason(event.target.value)}
              rows={4}
              placeholder="Adjustment reason"
              className="mt-3 w-full rounded-md border p-3 outline-none focus:border-yellow-500"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeAdjustStockModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveStockAdjustment}
                disabled={
                  actionLoading === `adjust-stock-${selectedProduct.id}`
                }
                className="rounded-md bg-yellow-500 px-4 py-2 text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `adjust-stock-${selectedProduct.id}`
                  ? "Adjusting..."
                  : "Adjust Stock"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPurchaseOrderModal && selectedProduct && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Create Purchase Order
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedProduct.name || "Product"} - Vendor:{" "}
                  {selectedProduct.vendor || "-"}
                </p>
              </div>

              <button
                type="button"
                onClick={closePurchaseOrderModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <input
              type="number"
              min="1"
              step="1"
              value={purchaseOrderQuantity}
              onChange={(event) =>
                setPurchaseOrderQuantity(event.target.value)
              }
              placeholder="Purchase order quantity"
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-green-500"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closePurchaseOrderModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={savePurchaseOrder}
                disabled={
                  actionLoading === `purchase-order-${selectedProduct.id}`
                }
                className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `purchase-order-${selectedProduct.id}`
                  ? "Creating..."
                  : "Create Purchase Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryManager;