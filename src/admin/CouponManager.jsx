import { useEffect, useMemo, useState } from "react";
import {
  fetchCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
} from "../utils/api";

const PAGE_SIZE = 12;

const EMPTY_COUPON = {
  code: "",
  type: "percentage",
  discount: "",
  minOrder: "",
  maxDiscount: "",
  usageLimit: "",
  perUserLimit: "",
  startDate: "",
  expiryDate: "",
  restrictedCategories: "",
  restrictedProducts: "",
  restrictedVendors: "",
  status: "active",
};

const getItems = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.coupons)) return response.coupons;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  return [];
};

const toList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const listToText = (value) =>
  Array.isArray(value) ? value.join(", ") : String(value || "");

const toDateTimeLocal = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000
  );

  return localDate.toISOString().slice(0, 16);
};

const normalizeCoupon = (coupon, index = 0) => ({
  ...coupon,
  id: coupon?.id ?? coupon?._id ?? `coupon-${index}`,
  code: String(coupon?.code || ""),
  type: coupon?.type || "percentage",
  discount: Number(coupon?.discount) || 0,
  minOrder: Number(coupon?.minOrder ?? coupon?.minimumOrder) || 0,
  maxDiscount:
    coupon?.maxDiscount === "" || coupon?.maxDiscount == null
      ? null
      : Number(coupon.maxDiscount),
  usageLimit:
    coupon?.usageLimit === "" || coupon?.usageLimit == null
      ? null
      : Number(coupon.usageLimit),
  totalUsed: Number(coupon?.totalUsed ?? coupon?.usage) || 0,
  perUserLimit:
    coupon?.perUserLimit === "" || coupon?.perUserLimit == null
      ? null
      : Number(coupon.perUserLimit),
  startDate: coupon?.startDate || "",
  expiryDate: coupon?.expiryDate || "",
  restrictedCategories: toList(coupon?.restrictedCategories),
  restrictedProducts: toList(coupon?.restrictedProducts),
  restrictedVendors: toList(coupon?.restrictedVendors),
  status: coupon?.status || "active",
});

function CouponManager() {
  const [allCoupons, setAllCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [page, setPage] = useState(1);

  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [couponForm, setCouponForm] = useState({ ...EMPTY_COUPON });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState(null);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [couponToToggle, setCouponToToggle] = useState(null);
  const [nextCouponStatus, setNextCouponStatus] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    let cancelled = false;

    const loadInitialCoupons = async () => {
      setLoadingCoupons(true);
      setError("");

      try {
        const response = await fetchCoupons({
          page: 1,
          pageSize: 1000,
          limit: 1000,
        });
        const items = getItems(response).map(normalizeCoupon);

        if (!cancelled) {
          setAllCoupons(items);
        }
      } catch (err) {
        if (!cancelled) {
          setAllCoupons([]);
          setError(err?.message || "Could not load coupons. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoadingCoupons(false);
        }
      }
    };

    loadInitialCoupons();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCoupons = useMemo(() => {
    let items = [...allCoupons];

    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();

      items = items.filter((coupon) =>
        [
          coupon.code,
          coupon.type,
          coupon.status,
          ...coupon.restrictedCategories,
          ...coupon.restrictedProducts,
          ...coupon.restrictedVendors,
        ].some((value) => String(value || "").toLowerCase().includes(query))
      );
    }

    if (filterType !== "all") {
      items = items.filter((coupon) => coupon.type === filterType);
    }

    if (filterStatus !== "all") {
      items = items.filter((coupon) => coupon.status === filterStatus);
    }

    items.sort((first, second) => {
      if (sortBy === "code") {
        return first.code.localeCompare(second.code);
      }

      if (sortBy === "type") {
        return first.type.localeCompare(second.type);
      }

      if (sortBy === "usage") {
        return second.totalUsed - first.totalUsed;
      }

      return (
        new Date(second.startDate || 0).getTime() -
        new Date(first.startDate || 0).getTime()
      );
    });

    return items;
  }, [allCoupons, debouncedSearch, filterType, filterStatus, sortBy]);

  const totalCoupons = filteredCoupons.length;
  const totalPages = Math.max(1, Math.ceil(totalCoupons / PAGE_SIZE));
  const visibleCoupons = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredCoupons.slice(start, start + PAGE_SIZE);
  }, [filteredCoupons, page, totalPages]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const formatDate = (value) => {
    if (!value) return "Not set";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatAmount = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);

  const getStatusClass = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (normalized === "active" || normalized === "enabled") {
      return "bg-emerald-100 text-emerald-700";
    }

    if (normalized === "scheduled") {
      return "bg-blue-100 text-blue-700";
    }

    if (["inactive", "disabled", "expired"].includes(normalized)) {
      return "bg-rose-100 text-rose-700";
    }

    return "bg-slate-100 text-slate-700";
  };

  const getTypeClass = (type) => {
    if (type === "percentage") return "bg-indigo-100 text-indigo-700";
    if (type === "fixed") return "bg-emerald-100 text-emerald-700";
    if (type === "free_shipping") return "bg-violet-100 text-violet-700";
    return "bg-slate-100 text-slate-700";
  };

  const getCouponTypeLabel = (type) => {
    const labels = {
      percentage: "Percentage",
      fixed: "Fixed Amount",
      free_shipping: "Free Shipping",
    };

    return labels[type] || "Coupon";
  };

  const refreshCoupons = async () => {
    clearMessages();
    setLoadingCoupons(true);

    try {
      const response = await fetchCoupons({
        page: 1,
        pageSize: 1000,
        limit: 1000,
      });
      setAllCoupons(getItems(response).map(normalizeCoupon));
      setSuccess("Coupons refreshed successfully.");
    } catch (err) {
      setError(err?.message || "Could not refresh coupons.");
    } finally {
      setLoadingCoupons(false);
    }
  };

  const openCreateCouponModal = () => {
    clearMessages();
    setEditingCoupon(null);
    setCouponForm({ ...EMPTY_COUPON });
    setShowCouponModal(true);
  };

  const openEditCouponModal = (coupon) => {
    clearMessages();
    setEditingCoupon(coupon);

    setCouponForm({
      code: coupon.code || "",
      type: coupon.type || "percentage",
      discount: coupon.discount == null ? "" : String(coupon.discount),
      minOrder: coupon.minOrder == null ? "" : String(coupon.minOrder),
      maxDiscount: coupon.maxDiscount == null ? "" : String(coupon.maxDiscount),
      usageLimit: coupon.usageLimit == null ? "" : String(coupon.usageLimit),
      perUserLimit:
        coupon.perUserLimit == null ? "" : String(coupon.perUserLimit),
      startDate: toDateTimeLocal(coupon.startDate),
      expiryDate: toDateTimeLocal(coupon.expiryDate),
      restrictedCategories: listToText(coupon.restrictedCategories),
      restrictedProducts: listToText(coupon.restrictedProducts),
      restrictedVendors: listToText(coupon.restrictedVendors),
      status: coupon.status || "active",
    });

    setShowCouponModal(true);
  };

  const closeCouponModal = () => {
    setEditingCoupon(null);
    setCouponForm({ ...EMPTY_COUPON });
    setShowCouponModal(false);
  };

  const updateCouponForm = (field, value) => {
    setCouponForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const validateCoupon = () => {
    const code = couponForm.code.trim().toUpperCase();
    const discount = Number(couponForm.discount);
    const minOrder = couponForm.minOrder === "" ? 0 : Number(couponForm.minOrder);
    const maxDiscount =
      couponForm.maxDiscount === "" ? null : Number(couponForm.maxDiscount);
    const usageLimit =
      couponForm.usageLimit === "" ? null : Number(couponForm.usageLimit);
    const perUserLimit =
      couponForm.perUserLimit === "" ? null : Number(couponForm.perUserLimit);

    if (!code) return "Coupon code is required.";

    if (!/^[A-Z0-9_-]{3,50}$/.test(code)) {
      return "Coupon code में 3 से 50 अक्षर, अंक, hyphen या underscore ही हो सकते हैं।";
    }

    if (
      couponForm.type !== "percentage" &&
      couponForm.type !== "fixed" &&
      couponForm.type !== "free_shipping"
    ) {
      return "Coupon type सही नहीं है।";
    }

    if (couponForm.type !== "free_shipping") {
      if (!Number.isFinite(discount) || discount <= 0) {
        return "Discount शून्य से अधिक होना चाहिए।";
      }

      if (couponForm.type === "percentage" && discount > 100) {
        return "Percentage discount 100 से अधिक नहीं हो सकता।";
      }
    }

    if (!Number.isFinite(minOrder) || minOrder < 0) {
      return "Minimum order राशि शून्य या उससे अधिक होनी चाहिए।";
    }

    if (
      maxDiscount !== null &&
      (!Number.isFinite(maxDiscount) || maxDiscount < 0)
    ) {
      return "Maximum discount शून्य या उससे अधिक होना चाहिए।";
    }

    if (
      usageLimit !== null &&
      (!Number.isInteger(usageLimit) || usageLimit < 1)
    ) {
      return "Usage limit 1 या उससे अधिक पूर्णांक होना चाहिए।";
    }

    if (
      perUserLimit !== null &&
      (!Number.isInteger(perUserLimit) || perUserLimit < 1)
    ) {
      return "Per-user limit 1 या उससे अधिक पूर्णांक होना चाहिए।";
    }

    if (couponForm.startDate && Number.isNaN(new Date(couponForm.startDate).getTime())) {
      return "Start date सही नहीं है।";
    }

    if (couponForm.expiryDate && Number.isNaN(new Date(couponForm.expiryDate).getTime())) {
      return "Expiry date सही नहीं है।";
    }

    if (
      couponForm.startDate &&
      couponForm.expiryDate &&
      new Date(couponForm.expiryDate) < new Date(couponForm.startDate)
    ) {
      return "Expiry date, start date के बाद होनी चाहिए।";
    }

    return "";
  };

  const saveCoupon = async () => {
    const validationError = validateCoupon();

    if (validationError) {
      setError(validationError);
      return;
    }

    clearMessages();

    const loadingKey = editingCoupon?.id
      ? `update-${editingCoupon.id}`
      : "create";

    setActionLoading(loadingKey);

    const payload = {
      code: couponForm.code.trim().toUpperCase(),
      type: couponForm.type,
      discount:
        couponForm.type === "free_shipping" ? 0 : Number(couponForm.discount),
      minOrder: couponForm.minOrder === "" ? 0 : Number(couponForm.minOrder),
      maxDiscount:
        couponForm.maxDiscount === "" ? null : Number(couponForm.maxDiscount),
      usageLimit:
        couponForm.usageLimit === "" ? null : Number(couponForm.usageLimit),
      perUserLimit:
        couponForm.perUserLimit === "" ? null : Number(couponForm.perUserLimit),
      startDate: couponForm.startDate || null,
      expiryDate: couponForm.expiryDate || null,
      restrictedCategories: toList(couponForm.restrictedCategories),
      restrictedProducts: toList(couponForm.restrictedProducts),
      restrictedVendors: toList(couponForm.restrictedVendors),
      status: couponForm.status || "active",
    };

    try {
      if (editingCoupon?.id) {
        await updateCoupon({ id: editingCoupon.id, data: payload });
        setSuccess("Coupon updated successfully.");
      } else {
        await createCoupon(payload);
        setSuccess("Coupon created successfully.");
      }

      closeCouponModal();
      await refreshCoupons();
    } catch (err) {
      setError(
        err?.message ||
          `Could not ${editingCoupon?.id ? "update" : "create"} coupon.`
      );
    } finally {
      setActionLoading("");
    }
  };

  const openDeleteModal = (coupon) => {
    clearMessages();
    setCouponToDelete(coupon);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setCouponToDelete(null);
    setShowDeleteModal(false);
  };

  const confirmDeleteCoupon = async () => {
    if (!couponToDelete?.id) return;

    clearMessages();
    setActionLoading(`delete-${couponToDelete.id}`);

    try {
      await deleteCoupon({ id: couponToDelete.id });
      closeDeleteModal();
      await refreshCoupons();
      setSuccess("Coupon deleted successfully.");
    } catch (err) {
      setError(err?.message || "Could not delete coupon.");
    } finally {
      setActionLoading("");
    }
  };

  const openStatusModal = (coupon) => {
    clearMessages();
    setCouponToToggle(coupon);

    const currentStatus = String(coupon.status || "").toLowerCase();
    setNextCouponStatus(
      currentStatus === "active" || currentStatus === "enabled"
        ? "inactive"
        : "active"
    );

    setShowStatusModal(true);
  };

  const closeStatusModal = () => {
    setCouponToToggle(null);
    setNextCouponStatus("");
    setShowStatusModal(false);
  };

  const confirmToggleCoupon = async () => {
    if (!couponToToggle?.id || !nextCouponStatus) return;

    clearMessages();
    setActionLoading(`status-${couponToToggle.id}`);

    try {
      await toggleCouponStatus({
        id: couponToToggle.id,
        status: nextCouponStatus,
      });
      closeStatusModal();
      await refreshCoupons();
      setSuccess(
        `Coupon ${nextCouponStatus === "active" ? "enabled" : "disabled"} successfully.`
      );
    } catch (err) {
      setError(err?.message || "Could not update coupon status.");
    } finally {
      setActionLoading("");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setFilterType("all");
    setFilterStatus("all");
    setSortBy("date");
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
              Wish Jinny Growth Center
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-950">
              Coupon & Promotion Manager
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Create premium offers, manage coupon eligibility and grow
              conversions across your multi-vendor marketplace.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openCreateCouponModal}
              disabled={Boolean(actionLoading)}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Create Coupon
            </button>

            <button
              type="button"
              onClick={refreshCoupons}
              disabled={loadingCoupons || Boolean(actionLoading)}
              className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingCoupons ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        <section className="mb-7 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              Search & Filters
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Filter promotional offers by code, type, status and usage.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input
              type="search"
              placeholder="Search coupon code..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm uppercase outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />

            <select
              value={filterType}
              onChange={(event) => {
                setFilterType(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="all">All Types</option>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
              <option value="free_shipping">Free Shipping</option>
            </select>

            <select
              value={filterStatus}
              onChange={(event) => {
                setFilterStatus(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="scheduled">Scheduled</option>
              <option value="expired">Expired</option>
            </select>

            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="date">Newest Date</option>
              <option value="code">Coupon Code</option>
              <option value="type">Coupon Type</option>
              <option value="usage">Most Used</option>
            </select>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Clear Filters
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Coupons</h2>
              <p className="mt-1 text-sm text-slate-500">
                Total matching coupons: {totalCoupons}
              </p>
            </div>

            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              Page {page} of {totalPages}
            </span>
          </div>

          {loadingCoupons ? (
            <p className="py-10 text-center text-indigo-700">
              Loading coupons...
            </p>
          ) : visibleCoupons.length === 0 ? (
            <p className="py-10 text-center text-slate-500">
              No coupons found.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {visibleCoupons.map((coupon) => {
                const isActive =
                  coupon.status === "active" || coupon.status === "enabled";

                return (
                  <article
                    key={coupon.id}
                    className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                          Coupon Code
                        </p>
                        <h3 className="mt-1 font-mono text-2xl font-bold text-indigo-900">
                          {coupon.code || "NO-CODE"}
                        </h3>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getTypeClass(
                            coupon.type
                          )}`}
                        >
                          {getCouponTypeLabel(coupon.type)}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                            coupon.status
                          )}`}
                        >
                          {coupon.status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-500">
                          Discount
                        </p>
                        <p className="mt-1 text-lg font-bold text-slate-800">
                          {coupon.type === "percentage"
                            ? `${coupon.discount}%`
                            : coupon.type === "free_shipping"
                              ? "Free Shipping"
                              : formatAmount(coupon.discount)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-500">
                          Minimum Order
                        </p>
                        <p className="mt-1 text-lg font-bold text-slate-800">
                          {formatAmount(coupon.minOrder)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-500">
                          Total Usage
                        </p>
                        <p className="mt-1 text-lg font-bold text-slate-800">
                          {coupon.totalUsed}
                          {coupon.usageLimit
                            ? ` / ${coupon.usageLimit}`
                            : " / ∞"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-500">
                          Per User
                        </p>
                        <p className="mt-1 text-lg font-bold text-slate-800">
                          {coupon.perUserLimit || "Unlimited"}
                        </p>
                      </div>
                    </div>

                    {coupon.maxDiscount != null && (
                      <p className="mt-3 text-sm text-slate-600">
                        Maximum discount: {formatAmount(coupon.maxDiscount)}
                      </p>
                    )}

                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
                      <p className="text-slate-600">
                        <span className="font-semibold text-slate-800">
                          Start:
                        </span>{" "}
                        {formatDate(coupon.startDate)}
                      </p>
                      <p className="mt-1 text-slate-600">
                        <span className="font-semibold text-slate-800">
                          Expiry:
                        </span>{" "}
                        {formatDate(coupon.expiryDate)}
                      </p>
                    </div>

                    {(coupon.restrictedCategories.length > 0 ||
                      coupon.restrictedProducts.length > 0 ||
                      coupon.restrictedVendors.length > 0) && (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                        <p className="font-semibold text-amber-800">
                          Restrictions
                        </p>

                        {coupon.restrictedCategories.length > 0 && (
                          <p className="mt-1 text-amber-700">
                            Categories:{" "}
                            {coupon.restrictedCategories.join(", ")}
                          </p>
                        )}

                        {coupon.restrictedProducts.length > 0 && (
                          <p className="mt-1 text-amber-700">
                            Products: {coupon.restrictedProducts.join(", ")}
                          </p>
                        )}

                        {coupon.restrictedVendors.length > 0 && (
                          <p className="mt-1 text-amber-700">
                            Vendors: {coupon.restrictedVendors.join(", ")}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditCouponModal(coupon)}
                        disabled={Boolean(actionLoading)}
                        className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => openStatusModal(coupon)}
                        disabled={Boolean(actionLoading)}
                        className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isActive ? "Disable" : "Enable"}
                      </button>

                      <button
                        type="button"
                        onClick={() => openDeleteModal(coupon)}
                        disabled={Boolean(actionLoading)}
                        className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="mt-7 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              disabled={page <= 1 || loadingCoupons}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>

            <span className="text-sm font-semibold text-slate-500">
              Page {page} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setPage((currentPage) => Math.min(totalPages, currentPage + 1))
              }
              disabled={page >= totalPages || loadingCoupons}
              className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </section>
      </div>

      {showCouponModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Coupon form"
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-indigo-600">
                  Promotion Setup
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  {editingCoupon ? "Edit Coupon" : "Create Coupon"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeCouponModal}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Coupon Code
                  </label>
                  <input
                    type="text"
                    value={couponForm.code}
                    onChange={(event) =>
                      updateCouponForm("code", event.target.value.toUpperCase())
                    }
                    placeholder="SAVE10"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 uppercase outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Coupon Type
                  </label>
                  <select
                    value={couponForm.type}
                    onChange={(event) =>
                      updateCouponForm("type", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                    <option value="free_shipping">Free Shipping</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Status
                  </label>
                  <select
                    value={couponForm.status}
                    onChange={(event) =>
                      updateCouponForm("status", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={couponForm.discount}
                    onChange={(event) =>
                      updateCouponForm("discount", event.target.value)
                    }
                    disabled={couponForm.type === "free_shipping"}
                    placeholder="10"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Minimum Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={couponForm.minOrder}
                    onChange={(event) =>
                      updateCouponForm("minOrder", event.target.value)
                    }
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Maximum Discount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={couponForm.maxDiscount}
                    onChange={(event) =>
                      updateCouponForm("maxDiscount", event.target.value)
                    }
                    disabled={couponForm.type !== "percentage"}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Total Usage Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={couponForm.usageLimit}
                    onChange={(event) =>
                      updateCouponForm("usageLimit", event.target.value)
                    }
                    placeholder="Unlimited"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Per User Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={couponForm.perUserLimit}
                    onChange={(event) =>
                      updateCouponForm("perUserLimit", event.target.value)
                    }
                    placeholder="Unlimited"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    value={couponForm.startDate}
                    onChange={(event) =>
                      updateCouponForm("startDate", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Expiry Date
                  </label>
                  <input
                    type="datetime-local"
                    value={couponForm.expiryDate}
                    onChange={(event) =>
                      updateCouponForm("expiryDate", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-lg font-bold text-slate-900">
                  Restrictions
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Use comma-separated category, product or vendor names.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <label className="block text-sm font-semibold text-slate-700">
                    Restricted Categories
                    <textarea
                      value={couponForm.restrictedCategories}
                      onChange={(event) =>
                        updateCouponForm(
                          "restrictedCategories",
                          event.target.value
                        )
                      }
                      rows={4}
                      placeholder="electronics, fashion"
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-700">
                    Restricted Products
                    <textarea
                      value={couponForm.restrictedProducts}
                      onChange={(event) =>
                        updateCouponForm(
                          "restrictedProducts",
                          event.target.value
                        )
                      }
                      rows={4}
                      placeholder="product-id-1, product-id-2"
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-700">
                    Restricted Vendors
                    <textarea
                      value={couponForm.restrictedVendors}
                      onChange={(event) =>
                        updateCouponForm(
                          "restrictedVendors",
                          event.target.value
                        )
                      }
                      rows={4}
                      placeholder="vendor-id-1, vendor-id-2"
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={closeCouponModal}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveCoupon}
                disabled={Boolean(actionLoading)}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? "Saving..." : "Save Coupon"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && couponToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Delete coupon confirmation"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-rose-600">
              Permanent Action
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              Delete Coupon?
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Delete coupon <strong>{couponToDelete.code}</strong>? This action
              cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteCoupon}
                disabled={Boolean(actionLoading)}
                className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? "Deleting..." : "Delete Coupon"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showStatusModal && couponToToggle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Coupon status confirmation"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-indigo-600">
              Coupon Status
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              {nextCouponStatus === "active"
                ? "Enable Coupon?"
                : "Disable Coupon?"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {nextCouponStatus === "active"
                ? `Enable ${couponToToggle.code} for customers?`
                : `Disable ${couponToToggle.code}? Customers will no longer be able to use it.`}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeStatusModal}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmToggleCoupon}
                disabled={Boolean(actionLoading)}
                className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading
                  ? "Updating..."
                  : nextCouponStatus === "active"
                    ? "Enable Coupon"
                    : "Disable Coupon"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default CouponManager;