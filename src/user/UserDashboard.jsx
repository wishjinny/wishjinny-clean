// src/user/UserDashboard.jsx
// Wish Jinny - Premium Customer Dashboard

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import {
  fetchUserDashboardStats,
  fetchRecentOrders,
  fetchWishlistItems,
  fetchRecommendedProducts,
  exportUserDataJSON,
} from "../utils/api";

function UserDashboard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");

  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    deliveredOrders: 0,
    wishlistItems: 0,
    walletBalance: 0,
    rewardPoints: 0,
    userName: "",
  });

  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
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

  const getListFromResponse = (response, keys = []) => {
    if (Array.isArray(response)) {
      return response;
    }

    for (const key of keys) {
      if (Array.isArray(response?.[key])) {
        return response[key];
      }

      if (Array.isArray(response?.data?.[key])) {
        return response.data[key];
      }
    }

    if (Array.isArray(response?.items)) {
      return response.items;
    }

    if (Array.isArray(response?.data?.items)) {
      return response.data.items;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    return [];
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
    };

    return statusMap[rawStatus] || String(statusValue || "Placed");
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

  const normaliseOrder = (order, index) => {
    const source = order?.order || order?.data?.order || order || {};
    const items = getOrderItems(source);

    const calculatedTotal = items.reduce((total, item) => {
      return total + getItemPrice(item) * getItemQuantity(item);
    }, 0);

    return {
      ...source,
      id: getOrderId(source, index),
      items,
      status: normaliseStatus(
        source?.status || source?.order_status || source?.orderStatus
      ),
      total: toNumber(
        source?.total ??
          source?.grand_total ??
          source?.total_amount ??
          source?.amount ??
          calculatedTotal
      ),
      date:
        source?.date ||
        source?.created_at ||
        source?.createdAt ||
        source?.order_date ||
        "",
    };
  };

  const normaliseStats = (response) => {
    const source =
      response?.stats ||
      response?.dashboard ||
      response?.data?.stats ||
      response?.data?.dashboard ||
      response?.data ||
      response ||
      {};

    return {
      totalOrders: toNumber(
        source?.totalOrders ?? source?.total_orders ?? source?.orders ?? 0
      ),
      activeOrders: toNumber(
        source?.activeOrders ?? source?.active_orders ?? source?.in_progress ?? 0
      ),
      deliveredOrders: toNumber(
        source?.deliveredOrders ??
          source?.delivered_orders ??
          source?.delivered ??
          0
      ),
      wishlistItems: toNumber(
        source?.wishlistItems ??
          source?.wishlist_items ??
          source?.wishlist_count ??
          0
      ),
      walletBalance: toNumber(
        source?.walletBalance ??
          source?.wallet_balance ??
          source?.wallet?.balance ??
          0
      ),
      rewardPoints: toNumber(
        source?.rewardPoints ??
          source?.reward_points ??
          source?.rewards ??
          source?.points ??
          0
      ),
      userName:
        source?.userName ||
        source?.user_name ||
        source?.user?.name ||
        source?.name ||
        "",
    };
  };

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const [statsResult, ordersResult, wishlistResult, recommendationsResult] =
        await Promise.allSettled([
          fetchUserDashboardStats(),
          fetchRecentOrders(),
          fetchWishlistItems(),
          fetchRecommendedProducts(),
        ]);

      const dashboardStats =
        statsResult.status === "fulfilled"
          ? normaliseStats(statsResult.value)
          : null;

      const loadedOrders =
        ordersResult.status === "fulfilled"
          ? getListFromResponse(ordersResult.value, [
              "orders",
              "recentOrders",
              "recent_orders",
              "items",
            ]).map(normaliseOrder)
          : [];

      const loadedWishlist =
        wishlistResult.status === "fulfilled"
          ? getListFromResponse(wishlistResult.value, [
              "wishlist",
              "products",
              "items",
            ])
          : [];

      const loadedRecommendations =
        recommendationsResult.status === "fulfilled"
          ? getListFromResponse(recommendationsResult.value, [
              "recommendations",
              "products",
              "items",
            ])
          : [];

      const activeOrdersFromList = loadedOrders.filter((order) =>
        [
          "Placed",
          "Confirmed",
          "Processing",
          "Packed",
          "Shipped",
          "Out for Delivery",
        ].includes(order.status)
      ).length;

      const deliveredOrdersFromList = loadedOrders.filter(
        (order) => order.status === "Delivered"
      ).length;

      setStats({
        totalOrders:
          dashboardStats?.totalOrders || loadedOrders.length || 0,
        activeOrders:
          dashboardStats?.activeOrders || activeOrdersFromList || 0,
        deliveredOrders:
          dashboardStats?.deliveredOrders || deliveredOrdersFromList || 0,
        wishlistItems:
          dashboardStats?.wishlistItems || loadedWishlist.length || 0,
        walletBalance: dashboardStats?.walletBalance || 0,
        rewardPoints: dashboardStats?.rewardPoints || 0,
        userName: dashboardStats?.userName || "",
      });

      setOrders(loadedOrders);
      setWishlist(loadedWishlist);
      setRecommendations(loadedRecommendations);

      if (
        statsResult.status === "rejected" ||
        ordersResult.status === "rejected" ||
        wishlistResult.status === "rejected" ||
        recommendationsResult.status === "rejected"
      ) {
        setError(
          "Some dashboard information could not be loaded right now. You can still use the available sections."
        );
      }
    } catch {
      setStats({
        totalOrders: 0,
        activeOrders: 0,
        deliveredOrders: 0,
        wishlistItems: 0,
        walletBalance: 0,
        rewardPoints: 0,
        userName: "",
      });
      setOrders([]);
      setWishlist([]);
      setRecommendations([]);
      setError(
        "Your dashboard could not be loaded right now. Please refresh and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        orderStatusFilter === "all" ||
        order.status.toLowerCase() === orderStatusFilter;

      const matchesSearch =
        !query ||
        String(order.id).toLowerCase().includes(query) ||
        order.items.some((item) =>
          getItemName(item).toLowerCase().includes(query)
        );

      return matchesStatus && matchesSearch;
    });
  }, [orders, orderSearch, orderStatusFilter]);

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  const handleExportData = async () => {
    clearMessages();
    setExporting(true);

    try {
      const response = await exportUserDataJSON();

      if (response?.success === false) {
        setError(response?.message || "Your data export could not be prepared.");
        return;
      }

      setNotice(
        response?.message ||
          "Your data export has been prepared successfully."
      );
    } catch {
      setError(
        "Your data export could not be prepared right now. Please try again later."
      );
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (value) => {
    if (!value) {
      return "Recently";
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

  const LampIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      fill="none"
      className="h-7 w-7"
    >
      <path
        d="M16 39c2-7 9-12 17-12s15 5 17 12c-3 5-10 8-17 8s-14-3-17-8Z"
        fill="currentColor"
      />
      <path
        d="M23 29c-1-6 4-12 10-13 6-1 12 3 14 9-4-2-8-2-12 0-4 2-8 3-12 4Z"
        fill="currentColor"
        opacity="0.8"
      />
      <path
        d="M49 36c7 0 10 4 10 7-4 2-8 1-11-2"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M12 43h42"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M28 11c-3-3-1-7 2-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M36 11c3-3 1-7-2-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );

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
      <path d="M3 7v10l9 4 9-4V7M12 11v10" strokeLinejoin="round" />
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

  const HeartIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-6 w-6"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
  );

  const WalletIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-6 w-6"
    >
      <path d="M4 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h13v4" />
      <path d="M16 14h4" strokeLinecap="round" />
    </svg>
  );

  const GiftIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-6 w-6"
    >
      <path d="M4 10h16v11H4zM3 6h18v4H3zM12 6v15" />
      <path d="M12 6H8.5a2.5 2.5 0 1 1 2.5-2.5V6Zm0 0h3.5A2.5 2.5 0 1 0 13 3.5V6Z" />
    </svg>
  );

  const DownloadIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
    >
      <path d="M12 3v12" strokeLinecap="round" />
      <path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 21h14" strokeLinecap="round" />
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

  const ArrowIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      className="h-4 w-4"
    >
      <path d="M5 12h14" strokeLinecap="round" />
      <path d="m13 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const EmptyState = ({
    icon,
    title,
    text,
    actionLabel,
    actionPath,
  }) => (
    <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-700 shadow-sm">
        {icon}
      </div>

      <h3 className="mt-4 text-lg font-black text-indigo-950">{title}</h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {text}
      </p>

      {actionLabel && actionPath && (
        <Link
          to={actionPath}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:shadow-md"
        >
          {actionLabel}
          <ArrowIcon />
        </Link>
      )}
    </div>
  );

  const OrderTable = ({ orderList, compact = false }) => (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full text-left">
          <thead className="bg-indigo-50 text-xs font-black uppercase tracking-[0.1em] text-indigo-700">
            <tr>
              <th className="px-5 py-4">Order</th>
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4">Items</th>
              <th className="px-5 py-4">Total</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {orderList.map((order) => (
              <tr key={order.id} className="transition hover:bg-slate-50">
                <td className="px-5 py-4">
                  <p className="font-black text-indigo-700">#{order.id}</p>
                  <p className="mt-1 max-w-[180px] truncate text-xs text-slate-400">
                    {order.items[0] ? getItemName(order.items[0]) : "Order items"}
                  </p>
                </td>

                <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                  {formatDate(order.date)}
                </td>

                <td className="px-5 py-4 text-sm font-bold text-slate-700">
                  {order.items.reduce(
                    (total, item) => total + getItemQuantity(item),
                    0
                  )}{" "}
                  item{order.items.length === 1 ? "" : "s"}
                </td>

                <td className="px-5 py-4 text-sm font-black text-slate-800">
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

                <td className="px-5 py-4 text-right">
                  <Link
                    to={`/order/${encodeURIComponent(order.id)}`}
                    className="inline-flex rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-50"
                  >
                    {compact ? "Track" : "View details"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const ProductGrid = ({ products, limit = 4 }) => {
    const displayedProducts = products.slice(0, limit);

    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {displayedProducts.map((product, index) => (
          <ProductCard
            key={product?.id || product?._id || `dashboard-product-${index}`}
            product={product?.product || product}
            compact
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-10 w-64 rounded bg-slate-200" />

          <div className="mt-7 h-48 rounded-3xl bg-slate-200" />

          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="h-32 rounded-2xl border border-slate-100 bg-white"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  const greetingName = stats.userName?.trim() || "Wish Maker";

  const dashboardStats = [
    {
      title: "Total Orders",
      value: stats.totalOrders,
      label: "All time",
      icon: <PackageIcon />,
      color: "bg-indigo-100 text-indigo-700",
    },
    {
      title: "Active Orders",
      value: stats.activeOrders,
      label: "In progress",
      icon: <TruckIcon />,
      color: "bg-purple-100 text-purple-700",
    },
    {
      title: "Delivered",
      value: stats.deliveredOrders,
      label: "Completed wishes",
      icon: <PackageIcon />,
      color: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "Wishlist Items",
      value: stats.wishlistItems,
      label: "Saved finds",
      icon: <HeartIcon />,
      color: "bg-rose-100 text-rose-600",
    },
    {
      title: "Wallet Balance",
      value: `₹${formatPrice(stats.walletBalance)}`,
      label: "Available",
      icon: <WalletIcon />,
      color: "bg-amber-100 text-amber-700",
    },
    {
      title: "Reward Points",
      value: stats.rewardPoints,
      label: "Earned points",
      icon: <GiftIcon />,
      color: "bg-pink-100 text-pink-700",
    },
  ];

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              to="/account"
              className="inline-flex text-sm font-black text-indigo-700 transition hover:text-purple-700"
            >
              ← Back to my account
            </Link>

            <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-purple-600">
              Wish Jinny Member Space
            </p>

            <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-indigo-950 sm:text-4xl">
              My Dashboard
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400 text-indigo-950 shadow-sm">
                <LampIcon />
              </span>
            </h1>
          </div>

          <button
            type="button"
            onClick={handleExportData}
            disabled={exporting}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-black text-indigo-700 shadow-sm transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <DownloadIcon />
            {exporting ? "Preparing export..." : "Export my data"}
          </button>
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

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-indigo-800 to-purple-800 p-6 text-white shadow-xl sm:p-8">
          <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-purple-400/20 blur-3xl" />
          <div className="absolute -bottom-12 -right-10 h-48 w-48 rounded-full bg-yellow-300/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-300">
                Welcome back
              </p>

              <h2 className="mt-2 text-3xl font-black sm:text-4xl">
                Hello, {greetingName}! 👋
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100 sm:text-base">
                Track your magical orders, manage your wishlist and discover
                new Wish Jinny favourites curated for you.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/shop"
                  className="rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-black text-indigo-950 transition hover:bg-yellow-300"
                >
                  Explore products
                </Link>

                <Link
                  to="/orders"
                  className="rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/20"
                >
                  Track orders
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <div className="min-w-[76px] text-center">
                <p className="text-xl font-black text-yellow-300">
                  {stats.totalOrders}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-indigo-100">
                  Orders
                </p>
              </div>

              <div className="min-w-[76px] text-center">
                <p className="text-xl font-black text-yellow-300">
                  {stats.wishlistItems}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-indigo-100">
                  Wishlist
                </p>
              </div>

              <div className="min-w-[76px] text-center">
                <p className="text-xl font-black text-yellow-300">
                  ₹{formatPrice(stats.walletBalance)}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-indigo-100">
                  Wallet
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-x-auto">
          <div className="inline-flex min-w-full rounded-2xl border border-indigo-100 bg-white p-1.5 shadow-sm">
            {[
              { id: "overview", label: "Overview", icon: "📊" },
              { id: "orders", label: "Orders", icon: "📦" },
              { id: "wishlist", label: "Wishlist", icon: "💜" },
              { id: "recommendations", label: "For You", icon: "✨" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-w-[130px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition ${
                  activeTab === tab.id
                    ? "bg-indigo-700 text-white shadow-md"
                    : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {activeTab === "overview" && (
          <section className="mt-7 space-y-7">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {dashboardStats.map((stat) => (
                <article
                  key={stat.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                        {stat.title}
                      </p>
                      <p className="mt-2 text-3xl font-black text-slate-900">
                        {stat.value}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        {stat.label}
                      </p>
                    </div>

                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.color}`}
                    >
                      {stat.icon}
                    </span>
                  </div>
                </article>
              ))}
            </div>

            <section className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-purple-600">
                    Keep track of your wishes
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-indigo-950">
                    Recent Orders
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("orders")}
                  className="w-fit text-sm font-black text-indigo-700 transition hover:text-purple-700"
                >
                  View all orders →
                </button>
              </div>

              <div className="mt-5">
                {orders.length > 0 ? (
                  <OrderTable orderList={orders.slice(0, 5)} compact />
                ) : (
                  <EmptyState
                    icon={<PackageIcon />}
                    title="No orders yet"
                    text="Your magical orders will appear here once you find something you love."
                    actionLabel="Start shopping"
                    actionPath="/shop"
                  />
                )}
              </div>
            </section>

            <div className="grid gap-7 xl:grid-cols-2">
              <section className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-600">
                      Your saved finds
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-indigo-950">
                      My Wishlist
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab("wishlist")}
                    className="w-fit text-sm font-black text-indigo-700 transition hover:text-purple-700"
                  >
                    View wishlist →
                  </button>
                </div>

                <div className="mt-5">
                  {wishlist.length > 0 ? (
                    <ProductGrid products={wishlist} limit={2} />
                  ) : (
                    <EmptyState
                      icon={<HeartIcon />}
                      title="Your wishlist is empty"
                      text="Save products you love and return whenever you are ready."
                      actionLabel="Browse products"
                      actionPath="/shop"
                    />
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-600">
                      A little magic for you
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-indigo-950">
                      Recommended For You
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab("recommendations")}
                    className="w-fit text-sm font-black text-indigo-700 transition hover:text-purple-700"
                  >
                    See more →
                  </button>
                </div>

                <div className="mt-5">
                  {recommendations.length > 0 ? (
                    <ProductGrid products={recommendations} limit={2} />
                  ) : (
                    <EmptyState
                      icon={<GiftIcon />}
                      title="Recommendations are on their way"
                      text="Jinny will start suggesting magical finds as you explore the marketplace."
                      actionLabel="Explore the shop"
                      actionPath="/shop"
                    />
                  )}
                </div>
              </section>
            </div>
          </section>
        )}

        {activeTab === "orders" && (
          <section className="mt-7 rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-purple-600">
                  Order history
                </p>
                <h2 className="mt-1 text-2xl font-black text-indigo-950">
                  My Orders
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem] lg:w-[34rem]">
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-indigo-600">
                    <SearchIcon />
                  </span>

                  <input
                    type="search"
                    value={orderSearch}
                    onChange={(event) => setOrderSearch(event.target.value)}
                    placeholder="Search order ID or product..."
                    className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </div>

                <select
                  value={orderStatusFilter}
                  onChange={(event) =>
                    setOrderStatusFilter(event.target.value)
                  }
                  className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="all">All orders</option>
                  <option value="placed">Placed</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="out for delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="returned">Returned</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              {filteredOrders.length > 0 ? (
                <OrderTable orderList={filteredOrders} />
              ) : (
                <EmptyState
                  icon={<PackageIcon />}
                  title={orders.length > 0 ? "No matching orders" : "No orders yet"}
                  text={
                    orders.length > 0
                      ? "Try changing your search or order status filter."
                      : "Start shopping and your Wish Jinny orders will appear here."
                  }
                  actionLabel={orders.length > 0 ? "" : "Explore products"}
                  actionPath={orders.length > 0 ? "" : "/shop"}
                />
              )}
            </div>
          </section>
        )}

        {activeTab === "wishlist" && (
          <section className="mt-7 rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-600">
                  Your saved wishes
                </p>
                <h2 className="mt-1 text-2xl font-black text-indigo-950">
                  My Wishlist
                </h2>
              </div>

              <Link
                to="/wishlist"
                className="w-fit text-sm font-black text-indigo-700 transition hover:text-purple-700"
              >
                Open Wishlist Manager →
              </Link>
            </div>

            <div className="mt-6">
              {wishlist.length > 0 ? (
                <ProductGrid products={wishlist} limit={8} />
              ) : (
                <EmptyState
                  icon={<HeartIcon />}
                  title="Your wishlist is empty"
                  text="Tap the heart on a product to save it for your next magical shopping moment."
                  actionLabel="Discover products"
                  actionPath="/shop"
                />
              )}
            </div>
          </section>
        )}

        {activeTab === "recommendations" && (
          <section className="mt-7 rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-600">
                  Jinny’s magical picks
                </p>
                <h2 className="mt-1 text-2xl font-black text-indigo-950">
                  Recommended For You
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Suggestions become more personal as you browse, save and shop.
                </p>
              </div>

              <Link
                to="/shop"
                className="w-fit text-sm font-black text-indigo-700 transition hover:text-purple-700"
              >
                Browse all products →
              </Link>
            </div>

            <div className="mt-6">
              {recommendations.length > 0 ? (
                <ProductGrid products={recommendations} limit={12} />
              ) : (
                <EmptyState
                  icon={<GiftIcon />}
                  title="Your recommendations are brewing"
                  text="Explore categories, save products and complete orders to help Jinny discover what you may love."
                  actionLabel="Explore categories"
                  actionPath="/categories"
                />
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default UserDashboard;