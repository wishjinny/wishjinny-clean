// src/pages/OrderManager.jsx
// Wish Jinny - Order Manager Page

import React, { useEffect, useState } from "react";
import {
  fetchOrders,
  updateOrderStatus,
  updateTracking,
  processRefund,
  processReturn,
} from "../utilities/api";

function OrderManager() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [page, setPage] = useState(1);

  const loadOrders = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetchOrders({
        page,
        search: searchTerm,
        status: filterStatus,
        payment: filterPayment,
        sort: sortBy,
      });

      setOrders(res?.items || []);
    } catch (err) {
      setError("Orders load nahi ho paaye.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    loadOrders();
  };

  const handleStatusUpdate = async (id, status) => {
    if (!window.confirm(`Change order status to ${status}?`)) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await updateOrderStatus({ id, status });
      setSuccess("Order status updated.");
      await loadOrders();
    } catch (err) {
      setError("Status update failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleTrackingUpdate = async (id) => {
    const tracking = window.prompt("Enter tracking number:");

    if (!tracking?.trim()) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await updateTracking({ id, tracking: tracking.trim() });
      setSuccess("Tracking updated.");
      await loadOrders();
    } catch (err) {
      setError("Tracking update failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (id) => {
    if (!window.confirm("Process refund for this order?")) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await processRefund({ id });
      setSuccess("Refund processed.");
      await loadOrders();
    } catch (err) {
      setError("Refund failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (id) => {
    if (!window.confirm("Process return for this order?")) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await processReturn({ id });
      setSuccess("Return processed.");
      await loadOrders();
    } catch (err) {
      setError("Return failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="order-manager px-6 py-10">
      <h1 className="mb-6 text-3xl font-bold text-indigo-900">
        Order Manager
      </h1>

      <section className="mb-6 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="Search by Order ID, customer name, email, phone..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSearch();
          }}
          className="min-w-[250px] flex-1 rounded-md border px-3 py-2"
        />

        <select
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value)}
          className="rounded-md border px-3 py-2"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="return_requested">Return Requested</option>
          <option value="returned">Returned</option>
          <option value="refund_requested">Refund Requested</option>
          <option value="refunded">Refunded</option>
        </select>

        <select
          value={filterPayment}
          onChange={(event) => setFilterPayment(event.target.value)}
          className="rounded-md border px-3 py-2"
        >
          <option value="all">All Payments</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="failed">Failed</option>
        </select>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="rounded-md border px-3 py-2"
        >
          <option value="date">Date</option>
          <option value="status">Status</option>
          <option value="customer">Customer</option>
        </select>

        <button
          type="button"
          onClick={handleSearch}
          className="rounded-md bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800"
        >
          Search
        </button>
      </section>

      {loading && orders.length === 0 && (
        <p className="text-center text-indigo-700">Loading orders...</p>
      )}

      {!loading && !error && orders.length === 0 && (
        <p className="text-center text-gray-600">No orders found.</p>
      )}

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {orders.map((order) => (
          <div key={order.id} className="rounded-md border p-4 shadow-md">
            <h2 className="font-semibold text-indigo-900">
              Order #{order.id}
            </h2>

            <p className="text-sm text-gray-600">
              Customer: {order.customerName} ({order.customerEmail},{" "}
              {order.customerPhone})
            </p>

            <p className="text-sm text-gray-600">
              Address: {order.shippingAddress}
            </p>

            <p className="text-sm text-gray-600">
              Payment: {order.paymentMethod} ({order.paymentStatus})
            </p>

            <p className="text-sm text-gray-600">Status: {order.status}</p>

            <p className="text-sm text-gray-600">
              Registered: {order.date}
            </p>

            <div className="mt-2">
              <h3 className="font-semibold text-indigo-800">Products</h3>

              {(order.items || []).map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap gap-2 text-sm text-gray-700"
                >
                  <span>{item.name}</span>
                  <span>Qty: {item.quantity}</span>
                  <span>₹{item.price}</span>
                  <span>Vendor: {item.vendor}</span>
                </div>
              ))}
            </div>

            <div className="mt-2 text-sm text-gray-700">
              <p>Subtotal: ₹{order.subtotal}</p>
              <p>Discount: ₹{order.discount}</p>
              <p>Shipping: ₹{order.shippingCharge}</p>
              <p className="font-bold text-indigo-900">
                Total: ₹{order.total}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleStatusUpdate(order.id, "processing")}
                className="rounded-md bg-yellow-500 px-3 py-1 text-indigo-900 hover:bg-yellow-400"
              >
                Mark Processing
              </button>

              <button
                type="button"
                onClick={() => handleStatusUpdate(order.id, "shipped")}
                className="rounded-md bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
              >
                Mark Shipped
              </button>

              <button
                type="button"
                onClick={() => handleStatusUpdate(order.id, "delivered")}
                className="rounded-md bg-green-600 px-3 py-1 text-white hover:bg-green-700"
              >
                Mark Delivered
              </button>

              <button
                type="button"
                onClick={() => handleStatusUpdate(order.id, "cancelled")}
                className="rounded-md bg-red-600 px-3 py-1 text-white hover:bg-red-700"
              >
                Cancel Order
              </button>

              <button
                type="button"
                onClick={() => handleReturn(order.id)}
                className="rounded-md bg-yellow-600 px-3 py-1 text-white hover:bg-yellow-700"
              >
                Process Return
              </button>

              <button
                type="button"
                onClick={() => handleRefund(order.id)}
                className="rounded-md bg-pink-600 px-3 py-1 text-white hover:bg-pink-700"
              >
                Process Refund
              </button>

              <button
                type="button"
                onClick={() => handleTrackingUpdate(order.id)}
                className="rounded-md bg-indigo-700 px-3 py-1 text-white hover:bg-indigo-800"
              >
                Update Tracking
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-6 flex justify-center gap-4">
        <button
          type="button"
          disabled={page === 1 || loading}
          onClick={() => setPage((previousPage) => Math.max(previousPage - 1, 1))}
          className="rounded-md bg-gray-300 px-4 py-2 text-indigo-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => setPage((previousPage) => previousPage + 1)}
          className="rounded-md bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </section>

      {success && (
        <p className="mt-4 font-semibold text-green-700">{success}</p>
      )}

      {error && (
        <p className="mt-4 font-semibold text-red-600">{error}</p>
      )}
    </div>
  );
}

export default OrderManager;