import React, { useEffect, useMemo, useState } from "react";
import {
  fetchShippingMethods,
  addShippingMethod,
  updateShippingMethod,
  deleteShippingMethod,
  toggleShippingStatus,
} from "../utils/api";

const PAGE_SIZE = 12;

const EMPTY_SHIPPING_METHOD = {
  name: "",
  charge: "",
  zone: "",
  courier: "",
  estimatedDelivery: "",
};

function ShippingManager() {
  const [methods, setMethods] = useState([]);

  const [loadingMethods, setLoadingMethods] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMethods, setTotalMethods] = useState(0);

  const [showMethodModal, setShowMethodModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [methodForm, setMethodForm] = useState(
    EMPTY_SHIPPING_METHOD
  );

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState(null);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [methodToToggle, setMethodToToggle] = useState(null);
  const [nextMethodStatus, setNextMethodStatus] = useState("");

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      status: filterStatus,
      sort: sortBy,
    }),
    [debouncedSearch, filterStatus, sortBy]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    loadMethods();
  }, [page, filters.search, filters.status, filters.sort]);

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

  const formatAmount = (amount, currency = "INR") => {
    const numericAmount = Number(amount || 0);

    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(numericAmount);
    } catch {
      return `₹${numericAmount.toLocaleString("en-IN")}`;
    }
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

  const loadMethods = async () => {
    setLoadingMethods(true);
    setError("");

    try {
      const response = await fetchShippingMethods({
        page,
        pageSize: PAGE_SIZE,
        limit: PAGE_SIZE,
        search: filters.search,
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

      setMethods(items);
      setTotalPages(Math.max(1, receivedTotalPages));
      setTotalMethods(receivedTotal);
    } catch (err) {
      setMethods([]);
      setError(
        err?.message ||
          "Could not load shipping methods. Please try again."
      );
    } finally {
      setLoadingMethods(false);
    }
  };

  const refreshMethods = async () => {
    clearMessages();

    await loadMethods();

    setSuccess("Shipping methods refreshed successfully.");
  };

  const openAddMethodModal = () => {
    clearMessages();

    setEditingMethod(null);
    setMethodForm(EMPTY_SHIPPING_METHOD);
    setShowMethodModal(true);
  };

  const openEditMethodModal = (method) => {
    clearMessages();

    setEditingMethod(method);

    setMethodForm({
      name: method?.name || "",
      charge:
        method?.charge === undefined || method?.charge === null
          ? ""
          : String(method.charge),
      zone: method?.zone || "",
      courier: method?.courier || "",
      estimatedDelivery:
        method?.estimatedDelivery ||
        method?.deliveryTime ||
        "",
    });

    setShowMethodModal(true);
  };

  const closeMethodModal = () => {
    setEditingMethod(null);
    setMethodForm(EMPTY_SHIPPING_METHOD);
    setShowMethodModal(false);
  };

  const updateMethodForm = (field, value) => {
    setMethodForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const validateMethod = () => {
    const name = methodForm.name.trim();
    const charge = Number(methodForm.charge);

    if (!name) {
      return "Shipping method name is required.";
    }

    if (Number.isNaN(charge) || charge < 0) {
      return "Shipping charge must be 0 or greater.";
    }

    return "";
  };

  const saveShippingMethod = async () => {
    const validationError = validateMethod();

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      name: methodForm.name.trim(),
      charge: Number(methodForm.charge),
      zone: methodForm.zone.trim(),
      courier: methodForm.courier.trim(),
      estimatedDelivery: methodForm.estimatedDelivery.trim(),
    };

    clearMessages();
    setActionLoading(
      editingMethod?.id ? `update-${editingMethod.id}` : "add"
    );

    try {
      if (editingMethod?.id) {
        const response = await updateShippingMethod({
          id: editingMethod.id,
          data: payload,
        });

        setSuccess(
          response?.message || "Shipping method updated successfully."
        );
      } else {
        const response = await addShippingMethod(payload);

        setSuccess(
          response?.message || "Shipping method added successfully."
        );
      }

      closeMethodModal();
      await loadMethods();
    } catch (err) {
      setError(
        err?.message ||
          `Could not ${
            editingMethod?.id ? "update" : "add"
          } shipping method.`
      );
    } finally {
      setActionLoading("");
    }
  };

  const openDeleteModal = (method) => {
    clearMessages();

    setMethodToDelete(method);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setMethodToDelete(null);
    setShowDeleteModal(false);
  };

  const confirmDeleteMethod = async () => {
    if (!methodToDelete?.id) return;

    clearMessages();
    setActionLoading(`delete-${methodToDelete.id}`);

    try {
      const response = await deleteShippingMethod({
        id: methodToDelete.id,
      });

      setSuccess(
        response?.message || "Shipping method deleted successfully."
      );

      closeDeleteModal();
      await loadMethods();
    } catch (err) {
      setError(err?.message || "Could not delete shipping method.");
    } finally {
      setActionLoading("");
    }
  };

  const openStatusModal = (method) => {
    clearMessages();

    const currentStatus = String(method?.status || "").toLowerCase();

    setMethodToToggle(method);
    setNextMethodStatus(
      currentStatus === "active" || currentStatus === "enabled"
        ? "inactive"
        : "active"
    );

    setShowStatusModal(true);
  };

  const closeStatusModal = () => {
    setMethodToToggle(null);
    setNextMethodStatus("");
    setShowStatusModal(false);
  };

  const confirmToggleMethod = async () => {
    if (!methodToToggle?.id || !nextMethodStatus) return;

    clearMessages();
    setActionLoading(`status-${methodToToggle.id}`);

    try {
      const response = await toggleShippingStatus({
        id: methodToToggle.id,
        status: nextMethodStatus,
      });

      setSuccess(
        response?.message || "Shipping method status updated successfully."
      );

      closeStatusModal();
      await loadMethods();
    } catch (err) {
      setError(
        err?.message || "Could not update shipping method status."
      );
    } finally {
      setActionLoading("");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setFilterStatus("all");
    setSortBy("name");
    setPage(1);
  };

  return (
    <div className="shipping-manager px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">
            Shipping & Logistics Manager
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Create and manage shipping methods, delivery zones, couriers, and charges.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openAddMethodModal}
            disabled={Boolean(actionLoading)}
            className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add Shipping Method
          </button>

          <button
            type="button"
            onClick={refreshMethods}
            disabled={loadingMethods || Boolean(actionLoading)}
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
          Search & Filters
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            type="text"
            placeholder="Search shipping methods, zones, couriers..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          />

          <select
            value={filterStatus}
            onChange={(event) => {
              setFilterStatus(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="disabled">Disabled</option>
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
            <option value="charge">Shipping Charge</option>
            <option value="status">Status</option>
            <option value="courier">Courier</option>
          </select>

          <button
            type="button"
            onClick={clearFilters}
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
              Shipping Methods
            </h2>

            <p className="text-sm text-gray-500">
              Total matching methods: {totalMethods}
            </p>
          </div>

          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
        </div>

        {loadingMethods && methods.length === 0 ? (
          <p className="py-8 text-center text-indigo-700">
            Loading shipping methods...
          </p>
        ) : methods.length === 0 ? (
          <p className="py-8 text-center text-gray-600">
            No shipping methods found.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {methods.map((method) => {
              const isActive =
                String(method.status || "").toLowerCase() === "active" ||
                String(method.status || "").toLowerCase() === "enabled";

              return (
                <article
                  key={method.id}
                  className="rounded-lg border bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-indigo-900">
                        {method.name || "Unnamed Shipping Method"}
                      </h3>

                      <p className="mt-1 text-sm text-gray-600">
                        {method.description || "No description provided."}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                        method.status
                      )}`}
                    >
                      {method.status || "inactive"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Shipping Charge</p>
                      <p className="mt-1 font-semibold text-gray-800">
                        {formatAmount(method.charge)}
                      </p>
                    </div>

                    <div className="rounded bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Delivery Zone</p>
                      <p className="mt-1 font-medium text-gray-800">
                        {method.zone || "All Zones"}
                      </p>
                    </div>

                    <div className="rounded bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Courier</p>
                      <p className="mt-1 font-medium text-gray-800">
                        {method.courier || "Not Assigned"}
                      </p>
                    </div>

                    <div className="rounded bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">
                        Estimated Delivery
                      </p>
                      <p className="mt-1 font-medium text-gray-800">
                        {method.estimatedDelivery ||
                          method.deliveryTime ||
                          "Not Set"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditMethodModal(method)}
                      disabled={Boolean(actionLoading)}
                      className="rounded-md bg-yellow-500 px-3 py-1.5 text-sm text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => openStatusModal(method)}
                      disabled={Boolean(actionLoading)}
                      className="rounded-md bg-indigo-700 px-3 py-1.5 text-sm text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isActive ? "Disable" : "Enable"}
                    </button>

                    <button
                      type="button"
                      onClick={() => openDeleteModal(method)}
                      disabled={Boolean(actionLoading)}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Delete
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
            disabled={page <= 1 || loadingMethods}
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
            disabled={page >= totalPages || loadingMethods}
            className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </section>

      {showMethodModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  {editingMethod?.id
                    ? "Edit Shipping Method"
                    : "Add Shipping Method"}
                </h2>

                <p className="text-sm text-gray-500">
                  Configure charges, delivery zones, couriers, and estimated delivery time.
                </p>
              </div>

              <button
                type="button"
                onClick={closeMethodModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Shipping Method Name
                </label>

                <input
                  type="text"
                  value={methodForm.name}
                  onChange={(event) =>
                    updateMethodForm("name", event.target.value)
                  }
                  placeholder="Standard Delivery"
                  className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Shipping Charge
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={methodForm.charge}
                  onChange={(event) =>
                    updateMethodForm("charge", event.target.value)
                  }
                  placeholder="99"
                  className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Delivery Zone
                </label>

                <input
                  type="text"
                  value={methodForm.zone}
                  onChange={(event) =>
                    updateMethodForm("zone", event.target.value)
                  }
                  placeholder="India, Delhi NCR, Zone A"
                  className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Courier
                </label>

                <input
                  type="text"
                  value={methodForm.courier}
                  onChange={(event) =>
                    updateMethodForm("courier", event.target.value)
                  }
                  placeholder="Delhivery, Blue Dart, DHL"
                  className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Estimated Delivery
                </label>

                <input
                  type="text"
                  value={methodForm.estimatedDelivery}
                  onChange={(event) =>
                    updateMethodForm(
                      "estimatedDelivery",
                      event.target.value
                    )
                  }
                  placeholder="3-5 business days"
                  className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeMethodModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveShippingMethod}
                disabled={
                  actionLoading === "add" ||
                  actionLoading === `update-${editingMethod?.id}`
                }
                className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "add" ||
                actionLoading === `update-${editingMethod?.id}`
                  ? "Saving..."
                  : editingMethod?.id
                    ? "Save Changes"
                    : "Add Shipping Method"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && methodToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <h2 className="text-xl font-bold text-red-700">
              Delete Shipping Method
            </h2>

            <p className="mt-3 text-sm text-gray-700">
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {methodToDelete.name || "this shipping method"}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteMethod}
                disabled={actionLoading === `delete-${methodToDelete.id}`}
                className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `delete-${methodToDelete.id}`
                  ? "Deleting..."
                  : "Delete Method"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showStatusModal && methodToToggle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <h2 className="text-xl font-bold text-indigo-900">
              {nextMethodStatus === "active"
                ? "Enable Shipping Method"
                : "Disable Shipping Method"}
            </h2>

            <p className="mt-3 text-sm text-gray-700">
              {nextMethodStatus === "active"
                ? `Enable ${methodToToggle.name || "this shipping method"} for checkout?`
                : `Disable ${methodToToggle.name || "this shipping method"}? Customers will not be able to select it during checkout.`}
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeStatusModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmToggleMethod}
                disabled={actionLoading === `status-${methodToToggle.id}`}
                className={`rounded-md px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                  nextMethodStatus === "active"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-indigo-700 hover:bg-indigo-800"
                }`}
              >
                {actionLoading === `status-${methodToToggle.id}`
                  ? "Updating..."
                  : nextMethodStatus === "active"
                    ? "Enable Method"
                    : "Disable Method"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShippingManager;