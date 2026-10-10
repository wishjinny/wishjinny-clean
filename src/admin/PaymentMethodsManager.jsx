cat > src/admin/PaymentMethodsManager.jsx <<'EOF'
import React, { useEffect, useMemo, useState } from "react";
import {
  fetchPaymentMethods,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  togglePaymentMethodStatus,
  fetchTransactions,
  processRefund,
} from "../utils/api";

const PAGE_SIZE = 12;

function PaymentMethodsManager() {
  const [methods, setMethods] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [loadingMethods, setLoadingMethods] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [filterMethod, setFilterMethod] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);

  const [showMethodModal, setShowMethodModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [methodForm, setMethodForm] = useState({
    name: "",
    description: "",
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState(null);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [methodToToggle, setMethodToToggle] = useState(null);
  const [nextMethodStatus, setNextMethodStatus] = useState("");

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [transactionToRefund, setTransactionToRefund] = useState(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      method: filterMethod,
      status: filterStatus,
      sort: sortBy,
    }),
    [debouncedSearch, filterMethod, filterStatus, sortBy]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    loadTransactions();
  }, [page, filters.search, filters.method, filters.status, filters.sort]);

  useEffect(() => {
    loadMethods();
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

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
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

    if (
      normalized === "active" ||
      normalized === "enabled" ||
      normalized === "successful" ||
      normalized === "paid" ||
      normalized === "completed"
    ) {
      return "bg-green-100 text-green-700";
    }

    if (
      normalized === "inactive" ||
      normalized === "disabled" ||
      normalized === "failed" ||
      normalized === "cancelled" ||
      normalized === "refunded"
    ) {
      return "bg-red-100 text-red-700";
    }

    if (
      normalized === "pending" ||
      normalized === "processing" ||
      normalized === "refundable"
    ) {
      return "bg-yellow-100 text-yellow-800";
    }

    return "bg-gray-100 text-gray-700";
  };

  const loadMethods = async () => {
    setLoadingMethods(true);
    setError("");

    try {
      const response = await fetchPaymentMethods();
      setMethods(getItems(response));
    } catch (err) {
      setMethods([]);
      setError(
        err?.message || "Could not load payment methods. Please try again."
      );
    } finally {
      setLoadingMethods(false);
    }
  };

  const loadTransactions = async () => {
    setLoadingTransactions(true);
    setError("");

    try {
      const response = await fetchTransactions({
        page,
        pageSize: PAGE_SIZE,
        limit: PAGE_SIZE,
        search: filters.search,
        method: filters.method === "all" ? undefined : filters.method,
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

      setTransactions(items);
      setTotalPages(Math.max(1, receivedTotalPages));
      setTotalTransactions(receivedTotal);
    } catch (err) {
      setTransactions([]);
      setError(
        err?.message || "Could not load transactions. Please try again."
      );
    } finally {
      setLoadingTransactions(false);
    }
  };

  const refreshPaymentData = async () => {
    clearMessages();
    await Promise.all([loadMethods(), loadTransactions()]);
    setSuccess("Payment methods and transactions refreshed successfully.");
  };

  const openAddMethodModal = () => {
    clearMessages();
    setEditingMethod(null);
    setMethodForm({ name: "", description: "" });
    setShowMethodModal(true);
  };

  const openEditMethodModal = (method) => {
    clearMessages();
    setEditingMethod(method);
    setMethodForm({
      name: method?.name || "",
      description: method?.description || "",
    });
    setShowMethodModal(true);
  };

  const closeMethodModal = () => {
    setEditingMethod(null);
    setMethodForm({ name: "", description: "" });
    setShowMethodModal(false);
  };

  const savePaymentMethod = async () => {
    const name = methodForm.name.trim();
    const description = methodForm.description.trim();

    if (!name) {
      setError("Payment method name is required.");
      return;
    }

    clearMessages();
    setActionLoading(editingMethod?.id ? `update-${editingMethod.id}` : "add");

    try {
      if (editingMethod?.id) {
        const response = await updatePaymentMethod({
          id: editingMethod.id,
          data: { name, description },
        });
        setSuccess(response?.message || "Payment method updated successfully.");
      } else {
        const response = await addPaymentMethod({ name, description });
        setSuccess(response?.message || "Payment method added successfully.");
      }

      closeMethodModal();
      await Promise.all([loadMethods(), loadTransactions()]);
    } catch (err) {
      setError(
        err?.message ||
          `Could not ${editingMethod?.id ? "update" : "add"} payment method.`
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
      const response = await deletePaymentMethod({ id: methodToDelete.id });
      setSuccess(response?.message || "Payment method deleted successfully.");

      closeDeleteModal();
      await Promise.all([loadMethods(), loadTransactions()]);
    } catch (err) {
      setError(err?.message || "Could not delete payment method.");
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
      const response = await togglePaymentMethodStatus({
        id: methodToToggle.id,
        status: nextMethodStatus,
      });

      setSuccess(
        response?.message || "Payment method status updated successfully."
      );

      closeStatusModal();
      await Promise.all([loadMethods(), loadTransactions()]);
    } catch (err) {
      setError(
        err?.message || "Could not update payment method status."
      );
    } finally {
      setActionLoading("");
    }
  };

  const openRefundModal = (transaction) => {
    clearMessages();

    setTransactionToRefund(transaction);
    setRefundAmount(
      transaction?.amount === undefined || transaction?.amount === null
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

  const processTransactionRefund = async () => {
    if (!transactionToRefund?.id) return;

    const amount = Number(refundAmount);
    const transactionAmount = Number(transactionToRefund.amount || 0);

    if (Number.isNaN(amount) || amount <= 0) {
      setError("Refund amount must be greater than 0.");
      return;
    }

    if (transactionAmount > 0 && amount > transactionAmount) {
      setError("Refund amount cannot be higher than transaction amount.");
      return;
    }

    clearMessages();
    setActionLoading(`refund-${transactionToRefund.id}`);

    try {
      const response = await processRefund({
        id: transactionToRefund.id,
        amount,
        ...(refundReason.trim() ? { reason: refundReason.trim() } : {}),
      });

      setSuccess(response?.message || "Refund processed successfully.");

      closeRefundModal();
      await loadTransactions();
    } catch (err) {
      setError(err?.message || "Could not process refund.");
    } finally {
      setActionLoading("");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setFilterMethod("all");
    setFilterStatus("all");
    setSortBy("date");
    setPage(1);
  };

  return (
    <div className="payment-methods-manager px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">
            Payment Methods & Transactions
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage payment methods, review transactions, and process refunds.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openAddMethodModal}
            disabled={Boolean(actionLoading)}
            className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add Payment Method
          </button>

          <button
            type="button"
            onClick={refreshPaymentData}
            disabled={
              loadingMethods ||
              loadingTransactions ||
              Boolean(actionLoading)
            }
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

      <section className="mb-8 rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-indigo-900">
              Payment Methods
            </h2>
            <p className="text-sm text-gray-500">
              Configure available payment options for customers.
            </p>
          </div>

          {loadingMethods && (
            <span className="text-sm text-gray-500">
              Loading payment methods...
            </span>
          )}
        </div>

        {methods.length === 0 ? (
          <p className="py-6 text-center text-gray-600">
            No payment methods found.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {methods.map((method) => {
              const isActive =
                String(method.status || "").toLowerCase() === "active" ||
                String(method.status || "").toLowerCase() === "enabled";

              return (
                <article
                  key={method.id}
                  className="rounded-lg border bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-indigo-900">
                        {method.name || "Unnamed Payment Method"}
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
      </section>

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-indigo-900">
            Transactions
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Search payment history and process refundable transactions.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            type="text"
            placeholder="Search transaction, order, customer..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          />

          <select
            value={filterMethod}
            onChange={(event) => {
              setFilterMethod(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          >
            <option value="all">All Methods</option>
            {methods.map((method) => (
              <option key={method.id} value={method.id || method.name}>
                {method.name}
              </option>
            ))}
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
            <option value="pending">Pending</option>
            <option value="successful">Successful</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refundable">Refundable</option>
            <option value="refunded">Refunded</option>
          </select>

          <select
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          >
            <option value="date">Newest Date</option>
            <option value="amount">Amount</option>
            <option value="status">Status</option>
            <option value="method">Payment Method</option>
          </select>

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            Total matching transactions: {totalTransactions}
          </p>

          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
        </div>

        {loadingTransactions && transactions.length === 0 ? (
          <p className="py-8 text-center text-indigo-700">
            Loading transactions...
          </p>
        ) : transactions.length === 0 ? (
          <p className="py-8 text-center text-gray-600">
            No transactions found.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {transactions.map((transaction) => {
              const transactionStatus = String(
                transaction.status || ""
              ).toLowerCase();

              const canRefund =
                transactionStatus !== "refunded" &&
                transactionStatus !== "failed" &&
                transactionStatus !== "cancelled";

              return (
                <article
                  key={transaction.id}
                  className="rounded-lg border bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-indigo-900">
                        Transaction #{transaction.id || "-"}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Order: {transaction.orderId || "-"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                        transaction.status
                      )}`}
                    >
                      {transaction.status || "unknown"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Customer</p>
                      <p className="mt-1 font-medium text-gray-800">
                        {transaction.customer ||
                          transaction.customerName ||
                          "-"}
                      </p>
                    </div>

                    <div className="rounded bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Amount</p>
                      <p className="mt-1 font-semibold text-gray-800">
                        {formatAmount(
                          transaction.amount,
                          transaction.currency || "INR"
                        )}
                      </p>
                    </div>

                    <div className="rounded bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Method</p>
                      <p className="mt-1 font-medium text-gray-800">
                        {transaction.method ||
                          transaction.gateway ||
                          "Unknown"}
                      </p>
                    </div>

                    <div className="rounded bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="mt-1 font-medium text-gray-800">
                        {formatDate(
                          transaction.date ||
                            transaction.createdAt ||
                            transaction.paidAt
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => openRefundModal(transaction)}
                      disabled={!canRefund || Boolean(actionLoading)}
                      className="rounded-md bg-pink-600 px-3 py-1.5 text-sm text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Process Refund
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
            disabled={page <= 1 || loadingTransactions}
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
            disabled={page >= totalPages || loadingTransactions}
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
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  {editingMethod?.id
                    ? "Edit Payment Method"
                    : "Add Payment Method"}
                </h2>
                <p className="text-sm text-gray-500">
                  Configure a payment option available to customers.
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

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Payment Method Name
                </label>

                <input
                  type="text"
                  value={methodForm.name}
                  onChange={(event) =>
                    setMethodForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Example: Cash on Delivery"
                  className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description
                </label>

                <textarea
                  value={methodForm.description}
                  onChange={(event) =>
                    setMethodForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Internal or customer-facing description..."
                  className="w-full rounded-md border p-3 outline-none focus:border-indigo-500"
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
                onClick={savePaymentMethod}
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
                    : "Add Payment Method"}
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
              Delete Payment Method
            </h2>

            <p className="mt-3 text-sm text-gray-700">
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {methodToDelete.name || "this payment method"}
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
                ? "Enable Payment Method"
                : "Disable Payment Method"}
            </h2>

            <p className="mt-3 text-sm text-gray-700">
              {nextMethodStatus === "active"
                ? `Enable ${methodToToggle.name || "this payment method"} for customer checkout?`
                : `Disable ${methodToToggle.name || "this payment method"}? Customers may no longer be able to use it during checkout.`}
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

      {showRefundModal && transactionToRefund && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Process Refund
                </h2>
                <p className="text-sm text-gray-500">
                  Transaction: {transactionToRefund.id || "-"}
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

            <p className="mb-4 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
              Maximum refundable amount:{" "}
              <span className="font-semibold">
                {formatAmount(
                  transactionToRefund.amount,
                  transactionToRefund.currency || "INR"
                )}
              </span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Refund Amount
                </label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={refundAmount}
                  onChange={(event) => setRefundAmount(event.target.value)}
                  className="w-full rounded-md border px-3 py-2 outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Refund Reason (Optional)
                </label>

                <textarea
                  value={refundReason}
                  onChange={(event) => setRefundReason(event.target.value)}
                  rows={4}
                  placeholder="Explain why this refund is being issued..."
                  className="w-full rounded-md border p-3 outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeRefundModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={processTransactionRefund}
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
    </div>
  );
}

export default PaymentMethodsManager;
EOF