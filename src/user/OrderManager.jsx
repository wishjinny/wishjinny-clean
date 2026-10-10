// src/admin/OrderManager.jsx
// Wish Jinny - Premium Admin / Vendor Order Management Center

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchOrders, updateOrderStatus } from "../utils/api";

const statusOptions = [
  "Placed",
  "Confirmed",
  "Processing",
  "Packed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
  "Return Requested",
  "Returned",
  "Refund Requested",
  "Refunded",
];

function OrderManager({ mode = "admin" }) {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const toNumber = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  };

  const formatPrice = (price) => {
    return toNumber(price).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    });
  };

  const getOrderId = (order, index) => {
    return (
      order?.id ||
      order?._id ||
      order?.order_id ||
      order?.orderId ||
      `ORD-${index + 1001}`
    );
  };

  const getOrderItems = (order) => {
    const items =
      order?.items ||
      order?.products ||
      order?.order_items ||
      order?.orderItems ||
      [];

    return Array.isArray(items) ? items : [];
  };

  const getItemId = (item, index) => {
    return (
      item?.id ||
      item?._id ||
      item?.order_item_id ||
      item?.product_id ||
      item?.productId ||
      `item-${index}`
    );
  };

  const getItemName = (item) => {
    return (
      item?.name ||
      item?.title ||
      item?.product_name ||
      item?.product?.name ||
      item?.product?.title ||
      "Wish Jinny Product"
    );
  };

  const getItemQuantity = (item) => {
    const quantity = Math.floor(
      toNumber(item?.quantity ?? item?.qty ?? item?.count ?? 1)
    );

    return quantity > 0 ? quantity : 1;
  };

  const getItemPrice = (item) => {
    return toNumber(
      item?.discount_price ??
        item?.sale_price ??
        item?.selling_price ??
        item?.price ??
        item?.product?.discount_price ??
        item?.product?.sale_price ??
        item?.product?.price ??
        0
    );
  };

  const getItemImage = (item) => {
    const images = item?.images || item?.product?.images;

    if (Array.isArray(images) && images.length > 0) {
      const firstImage = images[0];

      if (typeof firstImage === "string") {
        return firstImage;
      }

      return firstImage?.url || firstImage?.image_url || "";
    }

    return (
      item?.image_url ||
      item?.image ||
      item?.thumbnail ||
      item?.product?.image_url ||
      item?.product?.image ||
      item?.product?.thumbnail ||
      ""
    );
  };

  const getVendorName = (item, order) => {
    return (
      item?.vendor?.store_name ||
      item?.vendor?.name ||
      item?.seller?.store_name ||
      item?.seller?.name ||
      item?.vendor_name ||
      item?.seller_name ||
      order?.vendor?.store_name ||
      order?.vendor?.name ||
      order?.vendor_name ||
      "Wish Jinny Seller"
    );
  };

  const normaliseStatus = (statusValue) => {
    const rawStatus = String(statusValue || "Placed")
      .trim()
      .toLowerCase()
      .replace(/[_-]/g, " ");

    const statusMap = {
      pending: "Placed",
      placed: "Placed",
      confirmed: "Confirmed",
      processing: "Processing",
      packed: "Packed",
      shipped: "Shipped",
      dispatched: "Shipped",
      outfordelivery: "Out for Delivery",
      "out for delivery": "Out for Delivery",
      delivered: "Delivered",
      cancelled: "Cancelled",
      canceled: "Cancelled",
      returned: "Returned",
      returnrequested: "Return Requested",
      "return requested": "Return Requested",
      refunded: "Refunded",
      refundrequested: "Refund Requested",
      "refund requested": "Refund Requested",
      failed: "Cancelled",
    };

    return statusMap[rawStatus] || String(statusValue || "Placed");
  };

  const normaliseOrder = (order, index) => {
    const source = order?.order || order?.data?.order || order || {};
    const items = getOrderItems(source);

    const calculatedSubtotal = items.reduce((total, item) => {
      return total + getItemPrice(item) * getItemQuantity(item);
    }, 0);

    const subtotal =
      source?.subtotal !== undefined && source?.subtotal !== null
        ? toNumber(source.subtotal)
        : calculatedSubtotal;

    const discount = Math.min(
      Math.max(
        toNumber(
          source?.discount ??
            source?.discount_amount ??
            source?.coupon_discount ??
            0
        ),
        0
      ),
      subtotal
    );

    const shipping = Math.max(
      toNumber(
        source?.shipping ??
          source?.shippingCharge ??
          source?.shipping_charge ??
          0
      ),
      0
    );

    const total =
      source?.total !== undefined && source?.total !== null
        ? Math.max(toNumber(source.total), 0)
        : source?.grand_total !== undefined && source?.grand_total !== null
        ? Math.max(toNumber(source.grand_total), 0)
        : Math.max(subtotal - discount + shipping, 0);

    const customer =
      source?.customer ||
      source?.user ||
      source?.buyer ||
      {};

    return {
      ...source,
      id: getOrderId(source, index),
      items,
      status: normaliseStatus(
        source?.status || source?.order_status || source?.orderStatus
      ),
      subtotal,
      discount,
      shipping,
      total,
      customerName:
        customer?.name ||
        customer?.full_name ||
        source?.customer_name ||
        source?.buyer_name ||
        "Customer",
      customerEmail:
        customer?.email ||
        source?.customer_email ||
        source?.buyer_email ||
        "",
      customerPhone:
        customer?.phone ||
        customer?.mobile ||
        source?.customer_phone ||
        source?.buyer_phone ||
        "",
      address:
        source?.address ||
        source?.shipping_address ||
        source?.shippingAddress ||
        source?.delivery_address ||
        "Address not available",
      paymentMethod:
        source?.paymentMethod ||
        source?.payment_method ||
        source?.payment?.method ||
        "Not available",
      paymentStatus:
        source?.paymentStatus ||
        source?.payment_status ||
        source?.payment?.status ||
        "Pending",
      date:
        source?.date ||
        source?.created_at ||
        source?.createdAt ||
        source?.order_date ||
        "",
      tracking:
        source?.tracking ||
        source?.tracking_number ||
        source?.trackingNumber ||
        source?.shipment?.tracking_number ||
        "",
      courier:
        source?.shippingInfo ||
        source?.shipping_info ||
        source?.shipment?.carrier ||
        source?.courier ||
        "",
    };
  };

  const getOrdersFromResponse = (response) => {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.items)) {
      return response.items;
    }

    if (Array.isArray(response?.orders)) {
      return response.orders;
    }

    if (Array.isArray(response?.data?.items)) {
      return response.data.items;
    }

    if (Array.isArray(response?.data?.orders)) {
      return response.data.orders;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    return [];
  };

  const loadOrders = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchOrders({
        scope: mode === "vendor" ? "vendor" : "admin",
      });

      const orderList = getOrdersFromResponse(response).map(normaliseOrder);

      setOrders(orderList);
    } catch {
      setOrders([]);
      setError(
        "Orders could not be loaded right now. Please refresh and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [mode]);

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const now = new Date();

    return orders.filter((order) => {
      const matchesSearch =
        !normalizedSearch ||
        String(order.id).toLowerCase().includes(normalizedSearch) ||
        String(order.customerName).toLowerCase().includes(normalizedSearch) ||
        String(order.customerEmail).toLowerCase().includes(normalizedSearch) ||
        order.items.some((item) =>
          getItemName(item).toLowerCase().includes(normalizedSearch)
        );

      const matchesStatus =
        statusFilter === "All" || order.status === statusFilter;

      let matchesDate = true;

      if (dateFilter !== "all" && order.date) {
        const orderDate = new Date(order.date);

        if (!Number.isNaN(orderDate.getTime())) {
          const differenceInDays = Math.floor(
            (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (dateFilter === "today") {
            matchesDate = differenceInDays === 0;
          }

          if (dateFilter === "week") {
            matchesDate = differenceInDays <= 7;
          }

          if (dateFilter === "month") {
            matchesDate = differenceInDays <= 30;
          }
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, searchQuery, statusFilter, dateFilter]);

  const orderStats = useMemo(() => {
    const activeStatuses = [
      "Placed",
      "Confirmed",
      "Processing",
      "Packed",
      "Shipped",
      "Out for Delivery",
    ];

    return {
      total: orders.length,
      active: orders.filter((order) => activeStatuses.includes(order.status))
        .length,
      delivered: orders.filter((order) => order.status === "Delivered").length,
      attention: orders.filter((order) =>
        ["Return Requested", "Refund Requested", "Cancelled"].includes(
          order.status
        )
      ).length,
      revenue: orders
        .filter((order) => !["Cancelled", "Refunded"].includes(order.status))
        .reduce((total, order) => total + order.total, 0),
    };
  }, [orders]);

  const updateLocalOrder = (orderId, updatedOrder) => {
    const normalisedUpdatedOrder = normaliseOrder(updatedOrder);

    setOrders((previousOrders) =>
      previousOrders.map((order) =>
        String(order.id) === String(orderId)
          ? {
              ...order,
              ...normalisedUpdatedOrder,
              id: order.id,
            }
          : order
      )
    );

    setSelectedOrder((previousSelectedOrder) => {
      if (
        previousSelectedOrder &&
        String(previousSelectedOrder.id) === String(orderId)
      ) {
        return {
          ...previousSelectedOrder,
          ...normalisedUpdatedOrder,
          id: previousSelectedOrder.id,
        };
      }

      return previousSelectedOrder;
    });
  };

  const handleStatusUpdate = async (order, nextStatus) => {
    if (!order?.id || actionLoading) {
      return;
    }

    if (nextStatus === order.status) {
      return;
    }

    clearMessages();
    setActionLoading(`status-${order.id}`);

    try {
      const response = await updateOrderStatus({
        orderId: order.id,
        status: nextStatus,
      });

      if (response?.success === false) {
        setError(
          response?.message ||
            "Order status could not be updated. Please try again."
        );
        return;
      }

      const updatedOrder =
        response?.order || response?.data?.order || response?.data;

      if (updatedOrder && typeof updatedOrder === "object") {
        updateLocalOrder(order.id, updatedOrder);
      } else {
        updateLocalOrder(order.id, {
          ...order,
          status: nextStatus,
        });
      }

      setNotice(
        response?.message ||
          `Order #${order.id} has been updated to ${nextStatus}.`
      );
    } catch {
      setError(
        "Order status could not be updated. Please check your connection and try again."
      );
    } finally {
      setActionLoading("");
    }
  };

  const formatDate = (value) => {
    if (!value) {
      return "Not available";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatPaymentMethod = (method) => {
    const methods = {
      cod: "Cash on Delivery",
      upi: "UPI",
      card: "Credit / Debit Card",
      online: "Online Payment",
    };

    return methods[String(method || "").toLowerCase()] || method;
  };

  const getStatusStyles = (status) => {
    const styles = {
      Placed: "border-indigo-200 bg-indigo-50 text-indigo-700",
      Confirmed: "border-indigo-200 bg-indigo-50 text-indigo-700",
      Processing: "border-purple-200 bg-purple-50 text-purple-700",
      Packed: "border-violet-200 bg-violet-50 text-violet-700",
      Shipped: "border-sky-200 bg-sky-50 text-sky-700",
      "Out for Delivery": "border-cyan-200 bg-cyan-50 text-cyan-700",
      Delivered: "border-emerald-200 bg-emerald-50 text-emerald-700",
      Cancelled: "border-rose-200 bg-rose-50 text-rose-700",
      Returned: "border-orange-200 bg-orange-50 text-orange-700",
      "Return Requested": "border-orange-200 bg-orange-50 text-orange-700",
      Refunded: "border-emerald-200 bg-emerald-50 text-emerald-700",
      "Refund Requested": "border-pink-200 bg-pink-50 text-pink-700",
    };

    return styles[status] || "border-slate-200 bg-slate-50 text-slate-700";
  };

  const getNextSuggestedStatus = (status) => {
    const nextStatusMap = {
      Placed: "Confirmed",
      Confirmed: "Processing",
      Processing: "Packed",
      Packed: "Shipped",
      Shipped: "Out for Delivery",
      "Out for Delivery": "Delivered",
    };

    return nextStatusMap[status] || "";
  };

  const PackageIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-6 w-6"
    >
      <path d="m3 7 9-4 9 4-9 4-9-4Z" strokeLinejoin="round" />
      <path d="M3 7v10l9 4 9-4V7" strokeLinejoin="round" />
      <path d="M12 11v10" />
    </svg>
  );

  const RevenueIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-6 w-6"
    >
      <path d="M3 3v18h18" strokeLinecap="round" />
      <path d="m7 15 4-4 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const TruckIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-6 w-6"
    >
      <path d="M3 6h11v10H3z" />
      <path d="M14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );

  const AlertIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-6 w-6"
    >
      <path d="M12 3 2.8 20h18.4L12 3Z" strokeLinejoin="round" />
      <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
    </svg>
  );

  const SearchIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" strokeLinecap="round" />
    </svg>
  );

  const CloseIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="h-5 w-5"
    >
      <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );

  const PlaceholderImage = ({ title }) => {
    const initials = title
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();

    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 via-purple-50 to-yellow-100 text-xs font-black text-indigo-700">
        {initials || "WJ"}
      </div>
    );
  };

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-9 w-64 rounded bg-slate-200" />

          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-32 rounded-2xl border border-slate-100 bg-white"
              />
            ))}
          </div>

          <div className="mt-6 h-96 rounded-2xl border border-slate-100 bg-white" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-600">
              {mode === "vendor" ? "Seller Operations" : "Marketplace Operations"}
            </p>

            <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-indigo-950 sm:text-4xl">
              Order Manager
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400 text-indigo-950 shadow-sm">
                <PackageIcon />
              </span>
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {mode === "vendor"
                ? "Manage orders for your Wish Jinny store and keep customers updated."
                : "Review marketplace orders, track delivery progress and handle exceptions."}
            </p>
          </div>

          <Link
            to={mode === "vendor" ? "/vendor/dashboard" : "/admin/dashboard"}
            className="inline-flex w-fit rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-black text-indigo-700 shadow-sm transition hover:bg-indigo-50"
          >
            ← Back to dashboard
          </Link>
        </div>

        {(error || notice) && (
          <div
            role={error ? "alert" : "status"}
            className={`mb-6 rounded-xl border px-4 py-3 text-sm font-semibold ${
              error
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || notice}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Total orders
                </p>
                <p className="mt-2 text-3xl font-black text-slate-900">
                  {orderStats.total}
                </p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                <PackageIcon />
              </span>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Active orders
                </p>
                <p className="mt-2 text-3xl font-black text-purple-700">
                  {orderStats.active}
                </p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                <TruckIcon />
              </span>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Delivered
                </p>
                <p className="mt-2 text-3xl font-black text-emerald-700">
                  {orderStats.delivered}
                </p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <TruckIcon />
              </span>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Attention needed
                </p>
                <p className="mt-2 text-3xl font-black text-rose-600">
                  {orderStats.attention}
                </p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <AlertIcon />
              </span>
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-950 via-indigo-800 to-purple-800 p-5 text-white shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-yellow-300">
                Wish Jinny Sales Snapshot
              </p>
              <p className="mt-2 text-3xl font-black">
                ₹{formatPrice(orderStats.revenue)}
              </p>
              <p className="mt-1 text-sm text-indigo-100">
                Revenue excluding cancelled and refunded orders.
              </p>
            </div>

            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400 text-indigo-950 shadow-lg">
              <RevenueIcon />
            </span>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_11rem_10rem]">
            <div className="relative">
              <label htmlFor="order-search" className="sr-only">
                Search orders
              </label>

              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-indigo-600">
                <SearchIcon />
              </span>

              <input
                id="order-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search order ID, customer or product..."
                className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="All">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
            </select>
          </div>
        </section>

        {filteredOrders.length === 0 ? (
          <section className="mt-6 rounded-3xl border border-dashed border-indigo-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
              <PackageIcon />
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-900">
              No orders found
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {orders.length === 0
                ? "Orders will appear here as customers place them."
                : "Try changing your search or status filter."}
            </p>
          </section>
        ) : (
          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[1000px] w-full text-left">
                <thead className="bg-indigo-50 text-xs font-black uppercase tracking-[0.1em] text-indigo-700">
                  <tr>
                    <th className="px-5 py-4">Order</th>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Items</th>
                    <th className="px-5 py-4">Total</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => {
                    const suggestedStatus = getNextSuggestedStatus(order.status);
                    const isUpdating =
                      actionLoading === `status-${order.id}`;

                    return (
                      <tr key={order.id} className="transition hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="font-black text-indigo-700 transition hover:text-purple-700"
                          >
                            #{order.id}
                          </button>

                          <p className="mt-1 text-xs text-slate-400">
                            {order.paymentStatus}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-800">
                            {order.customerName}
                          </p>
                          <p className="mt-1 max-w-[160px] truncate text-xs text-slate-500">
                            {order.customerEmail || order.customerPhone || "—"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-slate-700">
                            {order.items.length} item
                            {order.items.length === 1 ? "" : "s"}
                          </p>
                          <p className="mt-1 max-w-[180px] truncate text-xs text-slate-500">
                            {order.items[0]
                              ? getItemName(order.items[0])
                              : "Items unavailable"}
                          </p>
                        </td>

                        <td className="px-5 py-4 font-black text-slate-800">
                          ₹{formatPrice(order.total)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${getStatusStyles(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                          {formatDate(order.date)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {suggestedStatus && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleStatusUpdate(order, suggestedStatus)
                                }
                                disabled={Boolean(actionLoading)}
                                className="rounded-lg bg-indigo-700 px-3 py-2 text-xs font-black text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isUpdating
                                  ? "Updating..."
                                  : `Mark ${suggestedStatus}`}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-50"
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-drawer-title"
        >
          <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-purple-600">
                  Order details
                </p>
                <h2
                  id="order-drawer-title"
                  className="mt-1 text-2xl font-black text-indigo-950"
                >
                  #{selectedOrder.id}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Placed on {formatDate(selectedOrder.date)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close order details"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Customer
                  </p>
                  <p className="mt-2 font-black text-slate-800">
                    {selectedOrder.customerName}
                  </p>
                  <p className="mt-1 break-all text-sm text-slate-600">
                    {selectedOrder.customerEmail || "Email not available"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedOrder.customerPhone || "Phone not available"}
                  </p>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Payment
                  </p>
                  <p className="mt-2 font-black text-slate-800">
                    {formatPaymentMethod(selectedOrder.paymentMethod)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Status: {selectedOrder.paymentStatus}
                  </p>
                </section>
              </div>

              <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-purple-600">
                  Delivery address
                </p>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                  {selectedOrder.address}
                </p>

                {(selectedOrder.tracking || selectedOrder.courier) && (
                  <div className="mt-4 rounded-xl bg-sky-50 p-3 text-sm">
                    {selectedOrder.courier && (
                      <p className="font-black text-sky-800">
                        Courier: {selectedOrder.courier}
                      </p>
                    )}
                    {selectedOrder.tracking && (
                      <p className="mt-1 break-all text-sky-700">
                        Tracking: {selectedOrder.tracking}
                      </p>
                    )}
                  </div>
                )}
              </section>

              <section className="mt-5">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-black text-indigo-950">
                    Ordered items
                  </p>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                    {selectedOrder.items.length} item
                    {selectedOrder.items.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {selectedOrder.items.map((item, index) => {
                    const itemName = getItemName(item);
                    const itemImage = getItemImage(item);
                    const itemQuantity = getItemQuantity(item);
                    const itemPrice = getItemPrice(item);

                    return (
                      <article
                        key={getItemId(item, index)}
                        className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
                      >
                        {itemImage ? (
                          <img
                            src={itemImage}
                            alt={itemName}
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                            className="h-12 w-12 shrink-0 rounded-xl object-cover"
                          />
                        ) : (
                          <PlaceholderImage title={itemName} />
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-black text-slate-800">
                            {itemName}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {getVendorName(item, selectedOrder)}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <span className="text-xs font-bold text-slate-600">
                              Qty {itemQuantity}
                            </span>
                            <span className="text-sm font-black text-indigo-700">
                              ₹{formatPrice(itemPrice * itemQuantity)}
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-indigo-700">
                  Order total
                </p>

                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4 text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-bold text-slate-800">
                      ₹{formatPrice(selectedOrder.subtotal)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 text-slate-600">
                    <span>Discount</span>
                    <span className="font-bold text-emerald-600">
                      -₹{formatPrice(selectedOrder.discount)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 text-slate-600">
                    <span>Shipping</span>
                    <span className="font-bold text-slate-800">
                      {selectedOrder.shipping === 0
                        ? "FREE"
                        : `₹${formatPrice(selectedOrder.shipping)}`}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 border-t border-indigo-100 pt-3 text-base">
                    <span className="font-black text-slate-800">Total</span>
                    <span className="font-black text-indigo-700">
                      ₹{formatPrice(selectedOrder.total)}
                    </span>
                  </div>
                </div>
              </section>
            </div>

            <div className="border-t border-slate-100 bg-white p-5 sm:p-6">
              <label
                htmlFor="drawer-order-status"
                className="mb-2 block text-sm font-black text-slate-800"
              >
                Update order status
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  id="drawer-order-status"
                  value={selectedOrder.status}
                  onChange={(event) =>
                    handleStatusUpdate(selectedOrder, event.target.value)
                  }
                  disabled={Boolean(actionLoading)}
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

                <Link
                  to={`/order/${encodeURIComponent(selectedOrder.id)}`}
                  className="inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-black text-indigo-700 transition hover:bg-indigo-100"
                >
                  Customer view
                </Link>
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Production note: the backend must verify the logged-in user’s
                role, ownership and valid status transition before saving this
                change.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default OrderManager;