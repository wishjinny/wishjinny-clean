// src/admin/AnalyticsManager.jsx
// Wish Jinny - Premium Marketplace Analytics & Reports Manager

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchAnalytics,
  exportReportsCSV,
  exportReportsExcel,
} from "../utils/api";

const DEFAULT_ANALYTICS = {
  sales: {
    daily: 0,
    weekly: 0,
    monthly: 0,
    yearly: 0,
  },
  customers: {
    active: 0,
    repeat: 0,
    new: 0,
  },
  products: {
    top: [],
  },
  vendors: {
    top: [],
  },
  coupons: {
    usage: 0,
  },
  banners: {
    clicks: 0,
  },
  revenue: {
    gross: 0,
    refunds: 0,
    net: 0,
    orders: 0,
    aov: 0,
  },
};

function AnalyticsManager() {
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });

  const [filterCategory, setFilterCategory] = useState("all");
  const [filterVendor, setFilterVendor] = useState("all");
  const [filterProduct, setFilterProduct] = useState("all");

  const [customCategory, setCustomCategory] = useState("");
  const [customVendor, setCustomVendor] = useState("");
  const [customProduct, setCustomProduct] = useState("");

  const filters = useMemo(() => {
    return {
      start: dateRange.start || undefined,
      end: dateRange.end || undefined,
      category:
        filterCategory === "custom"
          ? customCategory.trim() || undefined
          : filterCategory === "all"
          ? undefined
          : filterCategory,
      vendor:
        filterVendor === "custom"
          ? customVendor.trim() || undefined
          : filterVendor === "all"
          ? undefined
          : filterVendor,
      product:
        filterProduct === "custom"
          ? customProduct.trim() || undefined
          : filterProduct === "all"
          ? undefined
          : filterProduct,
    };
  }, [
    dateRange.start,
    dateRange.end,
    filterCategory,
    filterVendor,
    filterProduct,
    customCategory,
    customVendor,
    customProduct,
  ]);

  const getNumber = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  };

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  const normalizeAnalytics = (response) => {
    const source =
      response?.analytics ||
      response?.data?.analytics ||
      response?.data ||
      response ||
      {};

    return {
      ...DEFAULT_ANALYTICS,
      ...source,
      sales: {
        ...DEFAULT_ANALYTICS.sales,
        ...(source?.sales || {}),
      },
      customers: {
        ...DEFAULT_ANALYTICS.customers,
        ...(source?.customers || {}),
      },
      products: {
        ...DEFAULT_ANALYTICS.products,
        ...(source?.products || {}),
        top: Array.isArray(source?.products?.top)
          ? source.products.top
          : Array.isArray(source?.topProducts)
          ? source.topProducts
          : [],
      },
      vendors: {
        ...DEFAULT_ANALYTICS.vendors,
        ...(source?.vendors || {}),
        top: Array.isArray(source?.vendors?.top)
          ? source.vendors.top
          : Array.isArray(source?.topVendors)
          ? source.topVendors
          : [],
      },
      coupons: {
        ...DEFAULT_ANALYTICS.coupons,
        ...(source?.coupons || {}),
      },
      banners: {
        ...DEFAULT_ANALYTICS.banners,
        ...(source?.banners || {}),
      },
      revenue: {
        ...DEFAULT_ANALYTICS.revenue,
        ...(source?.revenue || {}),
      },
    };
  };

  const validateDates = () => {
    if (dateRange.start && dateRange.end && dateRange.start > dateRange.end) {
      setError("Start date cannot be later than end date.");
      return false;
    }

    return true;
  };

  const loadAnalytics = async ({ showLoader = true } = {}) => {
    if (!validateDates()) {
      return false;
    }

    if (showLoader) {
      setLoadingAnalytics(true);
    }

    setError("");

    try {
      const response = await fetchAnalytics(filters);
      setAnalytics(normalizeAnalytics(response));
      return true;
    } catch (requestError) {
      setAnalytics(null);
      setError(
        requestError?.message ||
          "Analytics could not be loaded. Please try again."
      );
      return false;
    } finally {
      if (showLoader) {
        setLoadingAnalytics(false);
      }
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAnalytics();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [
    filters.start,
    filters.end,
    filters.category,
    filters.vendor,
    filters.product,
  ]);

  const refreshAnalytics = async () => {
    clearMessages();
    setActionLoading("refresh");

    const wasLoaded = await loadAnalytics({ showLoader: true });

    if (wasLoaded) {
      setNotice("Analytics refreshed successfully.");
    }

    setActionLoading("");
  };

  const getExportFileName = (format) => {
    const start = filters.start || "all-time";
    const end = filters.end || "current";
    return `wish-jinny-analytics-${start}-to-${end}.${format}`;
  };

  const downloadExportResponse = async (response, fileName) => {
    if (!response) {
      return;
    }

    const url =
      typeof response === "string"
        ? response
        : response?.url ||
          response?.downloadUrl ||
          response?.download_url ||
          response?.data?.url ||
          response?.data?.downloadUrl ||
          response?.data?.download_url ||
          "";

    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
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
      return;
    }

    if (response?.blob instanceof Blob) {
      const fileUrl = window.URL.createObjectURL(response.blob);
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

    if (!validateDates()) {
      return;
    }

    const exportFunction =
      format === "csv" ? exportReportsCSV : exportReportsExcel;

    setActionLoading(`export-${format}`);

    try {
      const response = await exportFunction({
        filter: {
          ...filters,
          reportType: "analytics",
        },
      });

      if (response?.success === false) {
        throw new Error(
          response?.message ||
            `Could not export analytics as ${format.toUpperCase()}.`
        );
      }

      await downloadExportResponse(response, getExportFileName(format));

      setNotice(
        response?.message ||
          `Analytics export (${format.toUpperCase()}) has been prepared successfully.`
      );
    } catch (exportError) {
      setError(
        exportError?.message ||
          `Could not export analytics as ${format.toUpperCase()}.`
      );
    } finally {
      setActionLoading("");
    }
  };

  const clearFilters = () => {
    setDateRange({
      start: "",
      end: "",
    });
    setFilterCategory("all");
    setFilterVendor("all");
    setFilterProduct("all");
    setCustomCategory("");
    setCustomVendor("");
    setCustomProduct("");
    clearMessages();
  };

  const formatCurrency = (amount, currency = "INR") => {
    const numericAmount = getNumber(amount);

    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(numericAmount);
    } catch {
      return `₹${numericAmount.toLocaleString("en-IN")}`;
    }
  };

  const formatNumber = (value) => {
    return getNumber(value).toLocaleString("en-IN");
  };

  const getItemName = (item, index) => {
    if (typeof item === "string") {
      return item;
    }

    if (typeof item === "number") {
      return String(item);
    }

    return (
      item?.name ||
      item?.title ||
      item?.productName ||
      item?.product_name ||
      item?.vendorName ||
      item?.vendor_name ||
      item?.label ||
      item?.id ||
      `Item ${index + 1}`
    );
  };

  const getItemMetric = (item) => {
    if (!item || typeof item !== "object") {
      return "";
    }

    const revenue =
      item?.revenue ??
      item?.sales ??
      item?.amount ??
      item?.totalRevenue ??
      item?.total_revenue;

    const count =
      item?.orders ??
      item?.orderCount ??
      item?.order_count ??
      item?.sold ??
      item?.quantity;

    if (revenue !== undefined && revenue !== null) {
      return formatCurrency(revenue);
    }

    if (count !== undefined && count !== null) {
      return `${formatNumber(count)} orders`;
    }

    return "";
  };

  const activeFiltersCount = [
    filters.start,
    filters.end,
    filters.category,
    filters.vendor,
    filters.product,
  ].filter(Boolean).length;

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
      <path
        d="m7 15 4-4 3 3 6-7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const CartIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-6 w-6"
    >
      <path d="M3 3h2l2.4 12.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L21 7H6" />
      <circle cx="10" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  );

  const RefundIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-6 w-6"
    >
      <path d="M3 12a9 9 0 0 1 15.2-6.5L21 8" strokeLinecap="round" />
      <path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12a9 9 0 0 1-15.2 6.5L3 16" strokeLinecap="round" />
      <path d="M3 21v-5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const UsersIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-6 w-6"
    >
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 20h5a4 4 0 0 0-3-3.8" strokeLinecap="round" />
    </svg>
  );

  const RefreshIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
    >
      <path
        d="M20 11a8 8 0 0 0-14.8-4.2L3 9m1-5v5h5M4 13a8 8 0 0 0 14.8 4.2L21 15m-1 5v-5h-5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

  const FilterIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
    </svg>
  );

  const inputClassName =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

  const MetricCard = ({ title, value, description, icon, accent }) => (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {description}
          </p>
        </div>

        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}
        >
          {icon}
        </span>
      </div>
    </article>
  );

  const RankedList = ({ title, description, items, kind }) => (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.12em] text-purple-600">
          Performance ranking
        </p>
        <h2 className="mt-1 text-xl font-black text-indigo-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div className="mt-5 space-y-3">
        {Array.isArray(items) && items.length > 0 ? (
          items.slice(0, 5).map((item, index) => (
            <div
              key={
                item?.id ||
                item?._id ||
                `${kind}-${getItemName(item, index)}-${index}`
              }
              className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                  index === 0
                    ? "bg-yellow-400 text-indigo-950"
                    : "bg-indigo-100 text-indigo-700"
                }`}
              >
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-800">
                  {getItemName(item, index)}
                </p>
                {item?.category && (
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {item.category}
                  </p>
                )}
              </div>

              <span className="text-right text-xs font-black text-indigo-700">
                {getItemMetric(item) || "—"}
              </span>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
            <p className="text-sm font-bold text-slate-600">
              No ranking data available for the selected filters.
            </p>
          </div>
        )}
      </div>
    </article>
  );

  if (loadingAnalytics && !analytics) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-10 w-80 rounded bg-slate-200" />
          <div className="mt-7 h-40 rounded-3xl bg-slate-200" />
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-32 rounded-2xl border border-slate-100 bg-white"
              />
            ))}
          </div>
          <div className="mt-7 grid gap-6 lg:grid-cols-2">
            <div className="h-64 rounded-2xl bg-white" />
            <div className="h-64 rounded-2xl bg-white" />
          </div>
        </div>
      </main>
    );
  }

  if (!analytics) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-indigo-200 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
            <RevenueIcon />
          </div>

          <h1 className="mt-5 text-2xl font-black text-slate-900">
            Analytics are not available
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error ||
              "Marketplace reporting data could not be loaded right now."}
          </p>

          <button
            type="button"
            onClick={() => loadAnalytics()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:shadow-xl"
          >
            <RefreshIcon />
            Try again
          </button>
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
              Marketplace Intelligence
            </p>

            <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-indigo-950 sm:text-4xl">
              Analytics & Reports
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400 text-indigo-950 shadow-sm">
                <LampIcon />
              </span>
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Track sales, revenue, customer activity, product performance,
              vendor performance and promotional impact across Wish Jinny.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-black text-indigo-700 shadow-sm transition hover:bg-indigo-50"
            >
              Back to dashboard
            </Link>

            <button
              type="button"
              onClick={refreshAnalytics}
              disabled={loadingAnalytics || Boolean(actionLoading)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshIcon />
              {actionLoading === "refresh" || loadingAnalytics
                ? "Refreshing..."
                : "Refresh"}
            </button>

            <button
              type="button"
              onClick={() => handleExport("csv")}
              disabled={Boolean(actionLoading)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <DownloadIcon />
              {actionLoading === "export-csv" ? "Exporting..." : "CSV"}
            </button>

            <button
              type="button"
              onClick={() => handleExport("excel")}
              disabled={Boolean(actionLoading)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <DownloadIcon />
              {actionLoading === "export-excel" ? "Exporting..." : "Excel"}
            </button>
          </div>
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

        <section className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                <FilterIcon />
              </span>

              <div>
                <h2 className="font-black text-indigo-950">Analytics filters</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Refine the marketplace performance view.
                </p>
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <span className="w-fit rounded-full bg-purple-100 px-3 py-1.5 text-xs font-black text-purple-700">
                {activeFiltersCount} active filter
                {activeFiltersCount === 1 ? "" : "s"}
              </span>
            )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <label
                htmlFor="analytics-start-date"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Start date
              </label>
              <input
                id="analytics-start-date"
                type="date"
                value={dateRange.start}
                onChange={(event) =>
                  setDateRange((current) => ({
                    ...current,
                    start: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </div>

            <div>
              <label
                htmlFor="analytics-end-date"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                End date
              </label>
              <input
                id="analytics-end-date"
                type="date"
                min={dateRange.start || undefined}
                value={dateRange.end}
                onChange={(event) =>
                  setDateRange((current) => ({
                    ...current,
                    end: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </div>

            <div>
              <label
                htmlFor="analytics-category"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Category
              </label>
              <select
                id="analytics-category"
                value={filterCategory}
                onChange={(event) => setFilterCategory(event.target.value)}
                className={inputClassName}
              >
                <option value="all">All categories</option>
                <option value="beauty-skincare">Beauty & Skincare</option>
                <option value="fashion">Fashion</option>
                <option value="jewellery">Jewellery</option>
                <option value="toys-kids">Toys & Kids</option>
                <option value="home-living">Home & Living</option>
                <option value="gifting">Gifting</option>
                <option value="custom">Custom category</option>
              </select>

              {filterCategory === "custom" && (
                <input
                  type="text"
                  value={customCategory}
                  onChange={(event) => setCustomCategory(event.target.value)}
                  placeholder="Category ID or name"
                  className={`${inputClassName} mt-2`}
                />
              )}
            </div>

            <div>
              <label
                htmlFor="analytics-vendor"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Vendor
              </label>
              <select
                id="analytics-vendor"
                value={filterVendor}
                onChange={(event) => setFilterVendor(event.target.value)}
                className={inputClassName}
              >
                <option value="all">All vendors</option>
                <option value="custom">Specific vendor</option>
              </select>

              {filterVendor === "custom" && (
                <input
                  type="text"
                  value={customVendor}
                  onChange={(event) => setCustomVendor(event.target.value)}
                  placeholder="Vendor ID or store name"
                  className={`${inputClassName} mt-2`}
                />
              )}
            </div>

            <div>
              <label
                htmlFor="analytics-product"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Product
              </label>
              <select
                id="analytics-product"
                value={filterProduct}
                onChange={(event) => setFilterProduct(event.target.value)}
                className={inputClassName}
              >
                <option value="all">All products</option>
                <option value="custom">Specific product</option>
              </select>

              {filterProduct === "custom" && (
                <input
                  type="text"
                  value={customProduct}
                  onChange={(event) => setCustomProduct(event.target.value)}
                  placeholder="Product ID or name"
                  className={`${inputClassName} mt-2`}
                />
              )}
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
              >
                Clear all filters
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Gross Revenue"
            value={formatCurrency(analytics.revenue.gross)}
            description="Before refunds and adjustments"
            icon={<RevenueIcon />}
            accent="bg-emerald-100 text-emerald-700"
          />

          <MetricCard
            title="Net Revenue"
            value={formatCurrency(analytics.revenue.net)}
            description="After refunds and adjustments"
            icon={<RevenueIcon />}
            accent="bg-indigo-100 text-indigo-700"
          />

          <MetricCard
            title="Orders"
            value={formatNumber(analytics.revenue.orders)}
            description="Completed and active orders"
            icon={<CartIcon />}
            accent="bg-purple-100 text-purple-700"
          />

          <MetricCard
            title="Average Order Value"
            value={formatCurrency(analytics.revenue.aov)}
            description="Average value per order"
            icon={<CartIcon />}
            accent="bg-yellow-100 text-amber-700"
          />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-purple-600">
                Sales rhythm
              </p>
              <h2 className="mt-1 text-xl font-black text-indigo-950">
                Sales Performance
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Compare marketplace sales across common reporting periods.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                { label: "Daily sales", value: analytics.sales.daily },
                { label: "Weekly sales", value: analytics.sales.weekly },
                { label: "Monthly sales", value: analytics.sales.monthly },
                { label: "Yearly sales", value: analytics.sales.yearly },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-xl bg-slate-50 p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-xl font-black text-slate-800">
                    {formatCurrency(metric.value)}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-purple-600">
                Customer intelligence
              </p>
              <h2 className="mt-1 text-xl font-black text-indigo-950">
                Customer Analytics
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Track customer acquisition, activity and repeat shopping.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: "Active",
                  value: analytics.customers.active,
                  color: "bg-indigo-50 text-indigo-700",
                },
                {
                  label: "Repeat buyers",
                  value: analytics.customers.repeat,
                  color: "bg-emerald-50 text-emerald-700",
                },
                {
                  label: "New customers",
                  value: analytics.customers.new,
                  color: "bg-purple-50 text-purple-700",
                },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className={`rounded-xl p-4 ${metric.color}`}
                >
                  <p className="text-xs font-bold uppercase tracking-wide opacity-80">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-2xl font-black">
                    {formatNumber(metric.value)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-sm">
                <UsersIcon />
              </span>
              <p className="text-sm leading-6 text-indigo-900">
                A healthy repeat-buyer rate indicates that product quality,
                fulfillment and support are building customer trust.
              </p>
            </div>
          </article>

          <RankedList
            title="Top Products"
            description="Best-performing products under the selected filters."
            items={analytics.products.top}
            kind="product"
          />

          <RankedList
            title="Top Vendors"
            description="Best-performing sellers under the selected filters."
            items={analytics.vendors.top}
            kind="vendor"
          />

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-purple-600">
                Promotional impact
              </p>
              <h2 className="mt-1 text-xl font-black text-indigo-950">
                Coupons & Banners
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Review engagement generated by marketplace promotions.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-yellow-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                  Coupon usage
                </p>
                <p className="mt-2 text-2xl font-black text-amber-800">
                  {formatNumber(analytics.coupons.usage)}
                </p>
              </div>

              <div className="rounded-xl bg-pink-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-pink-700">
                  Banner clicks
                </p>
                <p className="mt-2 text-2xl font-black text-pink-800">
                  {formatNumber(analytics.banners.clicks)}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-purple-600">
                Financial quality
              </p>
              <h2 className="mt-1 text-xl font-black text-indigo-950">
                Revenue & Refunds
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Monitor gross sales, refunds and net marketplace value.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <span className="text-sm font-semibold text-slate-600">
                  Gross revenue
                </span>
                <span className="font-black text-emerald-700">
                  {formatCurrency(analytics.revenue.gross)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-rose-50 p-4">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-rose-700">
                  <RefundIcon />
                  Refunds
                </span>
                <span className="font-black text-rose-700">
                  -{formatCurrency(analytics.revenue.refunds)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-indigo-950 p-4">
                <span className="text-sm font-black text-indigo-100">
                  Net revenue
                </span>
                <span className="text-xl font-black text-yellow-300">
                  {formatCurrency(analytics.revenue.net)}
                </span>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-yellow-200 bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-indigo-950 shadow-sm">
              <LampIcon />
            </span>

            <div>
              <h2 className="font-black text-amber-950">
                Jinny analytics principle
              </h2>
              <p className="mt-1 text-sm leading-6 text-amber-900">
                Use analytics for business decisions, not as the financial
                source of truth. Final settlement, tax, payment, refund and
                payout values must be calculated and verified by secure backend
                services.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default AnalyticsManager;