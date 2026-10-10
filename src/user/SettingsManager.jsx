// src/admin/SettingManager.jsx
// Wish Jinny - Premium Marketplace Settings Control Center

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchSettings, updateSettings } from "../utils/api";

const defaultSettings = {
  store: {
    name: "Wish Jinny",
    tagline: "Make Your Wish Come True.",
    supportEmail: "support@wishjinny.com",
    supportPhone: "",
    businessAddress: "",
    currency: "INR",
    timezone: "Asia/Kolkata",
    logoUrl: "",
    faviconUrl: "",
  },
  orders: {
    orderPrefix: "WJ",
    autoConfirmOrders: false,
    allowOrderCancellation: true,
    cancellationWindowHours: 24,
    allowReturns: true,
    returnWindowDays: 7,
    allowRefundRequests: true,
    reviewAfterDeliveryDays: 3,
  },
  shipping: {
    flatRate: 50,
    freeShippingThreshold: 999,
    estimatedDeliveryDays: "3-7",
    enableCashOnDelivery: true,
    codMaximumAmount: 5000,
    shippingNotice: "Delivery timelines may vary based on your location.",
  },
  payments: {
    enableUpi: true,
    enableCards: true,
    enableCod: true,
    enableWallets: false,
    taxIncludedInPrice: true,
    taxRate: 0,
  },
  vendors: {
    requireAdminApproval: true,
    requireProductApproval: true,
    allowVendorProductDrafts: true,
    requireVendorDocuments: true,
    allowVendorSelfShipping: false,
    commissionRate: 10,
    lowStockThreshold: 5,
  },
  notifications: {
    orderEmails: true,
    vendorEmails: true,
    customerMarketingEmails: false,
    lowStockAlerts: true,
    refundAlerts: true,
    moderationAlerts: true,
  },
  features: {
    enableWishlist: true,
    enableReviews: true,
    enableCoupons: true,
    enableJinnyAi: true,
    enableVendorRegistration: true,
    enableGuestCheckout: false,
    maintenanceMode: false,
  },
};

function SettingManager() {
  const [settings, setSettings] = useState(defaultSettings);
  const [activeTab, setActiveTab] = useState("store");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const tabs = [
    {
      id: "store",
      label: "Store",
      description: "Brand, support and local settings",
      icon: "store",
    },
    {
      id: "orders",
      label: "Orders",
      description: "Cancellation, returns and review policy",
      icon: "package",
    },
    {
      id: "shipping",
      label: "Shipping",
      description: "Delivery pricing and COD controls",
      icon: "truck",
    },
    {
      id: "payments",
      label: "Payments",
      description: "Customer-visible payment methods",
      icon: "card",
    },
    {
      id: "vendors",
      label: "Vendors",
      description: "Seller approval and marketplace rules",
      icon: "users",
    },
    {
      id: "notifications",
      label: "Notifications",
      description: "Operational alerts and communication",
      icon: "bell",
    },
    {
      id: "features",
      label: "Features",
      description: "Marketplace experience controls",
      icon: "sparkle",
    },
  ];

  const mergeSettings = (base, incoming) => {
    const merged = { ...base };

    Object.keys(base).forEach((sectionKey) => {
      merged[sectionKey] = {
        ...base[sectionKey],
        ...(incoming?.[sectionKey] || {}),
      };
    });

    return merged;
  };

  const getSettingsFromResponse = (response) => {
    return (
      response?.settings ||
      response?.data?.settings ||
      response?.data ||
      response ||
      {}
    );
  };

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  const loadSettings = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchSettings();
      const returnedSettings = getSettingsFromResponse(response);

      if (returnedSettings && typeof returnedSettings === "object") {
        setSettings(mergeSettings(defaultSettings, returnedSettings));
      } else {
        setSettings(defaultSettings);
      }
    } catch {
      setSettings(defaultSettings);
      setError(
        "Live marketplace settings could not be loaded. You are viewing safe default settings."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateField = (section, field, value) => {
    setSettings((previousSettings) => ({
      ...previousSettings,
      [section]: {
        ...previousSettings[section],
        [field]: value,
      },
    }));
  };

  const handleTextChange = (section, field, event) => {
    updateField(section, field, event.target.value);
  };

  const handleNumberChange = (section, field, event) => {
    const numericValue = Number(event.target.value);

    updateField(
      section,
      field,
      Number.isFinite(numericValue) ? Math.max(numericValue, 0) : 0
    );
  };

  const handleToggle = (section, field) => {
    updateField(section, field, !settings?.[section]?.[field]);
  };

  const isDirty = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(defaultSettings);
  }, [settings]);

  const handleSaveSettings = async () => {
    clearMessages();
    setSaving(true);

    try {
      const response = await updateSettings(settings);

      if (response?.success === false) {
        setError(
          response?.message ||
            "Marketplace settings could not be saved. Please try again."
        );
        return;
      }

      const returnedSettings = getSettingsFromResponse(response);

      if (
        returnedSettings &&
        typeof returnedSettings === "object" &&
        !Array.isArray(returnedSettings)
      ) {
        setSettings(mergeSettings(settings, returnedSettings));
      }

      setNotice(
        response?.message ||
          "Marketplace settings have been saved successfully."
      );
    } catch {
      setError(
        "Marketplace settings could not be saved. Please check your connection and try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleResetCurrentSection = () => {
    clearMessages();

    setSettings((previousSettings) => ({
      ...previousSettings,
      [activeTab]: {
        ...defaultSettings[activeTab],
      },
    }));

    setNotice(
      `${tabs.find((tab) => tab.id === activeTab)?.label || "Selected"} settings have been restored to the recommended defaults.`
    );
  };

  const Toggle = ({ section, field, title, description, disabled = false }) => {
    const isEnabled = Boolean(settings?.[section]?.[field]);

    return (
      <button
        type="button"
        onClick={() => handleToggle(section, field)}
        disabled={disabled}
        className={`flex w-full items-start justify-between gap-4 rounded-xl border p-4 text-left transition ${
          isEnabled
            ? "border-indigo-200 bg-indigo-50"
            : "border-slate-200 bg-white hover:border-indigo-200"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <span>
          <span className="block text-sm font-black text-slate-800">
            {title}
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {description}
          </span>
        </span>

        <span
          className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition ${
            isEnabled ? "bg-indigo-700" : "bg-slate-300"
          }`}
          aria-hidden="true"
        >
          <span
            className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
              isEnabled ? "left-6" : "left-1"
            }`}
          />
        </span>
      </button>
    );
  };

  const Field = ({
    label,
    description,
    children,
    className = "",
  }) => (
    <div className={className}>
      <label className="mb-2 block text-sm font-black text-slate-700">
        {label}
      </label>
      {children}
      {description && (
        <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
      )}
    </div>
  );

  const inputClassName =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

  const StoreIcon = ({ type = "store", className = "h-5 w-5" }) => {
    const iconProps = {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      className,
      "aria-hidden": true,
    };

    if (type === "package") {
      return (
        <svg {...iconProps}>
          <path d="m3 7 9-4 9 4-9 4-9-4Z" strokeLinejoin="round" />
          <path d="M3 7v10l9 4 9-4V7M12 11v10" strokeLinejoin="round" />
        </svg>
      );
    }

    if (type === "truck") {
      return (
        <svg {...iconProps}>
          <path d="M3 6h11v10H3z" />
          <path d="M14 10h4l3 3v3h-7z" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
      );
    }

    if (type === "card") {
      return (
        <svg {...iconProps}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18M7 15h3" strokeLinecap="round" />
        </svg>
      );
    }

    if (type === "users") {
      return (
        <svg {...iconProps}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 20a5.5 5.5 0 0 1 11 0" strokeLinecap="round" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M16 20h5a4 4 0 0 0-3-3.8" strokeLinecap="round" />
        </svg>
      );
    }

    if (type === "bell") {
      return (
        <svg {...iconProps}>
          <path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
          <path d="M10 22h4" strokeLinecap="round" />
        </svg>
      );
    }

    if (type === "sparkle") {
      return (
        <svg {...iconProps}>
          <path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" />
          <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />
        </svg>
      );
    }

    return (
      <svg {...iconProps}>
        <path d="M3 10h18v11H3z" />
        <path d="m4 10 1.5-6h13L20 10M8 21v-6h8v6" />
      </svg>
    );
  };

  const LampIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      fill="none"
      className="h-6 w-6"
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

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-9 w-64 rounded bg-slate-200" />

          <div className="mt-7 grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <div className="h-96 rounded-2xl bg-white" />
            <div className="h-[32rem] rounded-2xl bg-white" />
          </div>
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
              Marketplace Administration
            </p>

            <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-indigo-950 sm:text-4xl">
              Settings Manager
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400 text-indigo-950 shadow-sm">
                <LampIcon />
              </span>
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Configure Wish Jinny’s public storefront, marketplace policies
              and operational controls from one secure workspace.
            </p>
          </div>

          <Link
            to="/admin/dashboard"
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-black text-indigo-700 shadow-sm transition hover:bg-indigo-50"
          >
            Back to dashboard
            <ArrowIcon />
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

        <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-24">
            <p className="px-3 pb-2 pt-1 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Settings groups
            </p>

            <nav className="space-y-1" aria-label="Marketplace settings">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                      isActive
                        ? "bg-indigo-700 text-white shadow-md"
                        : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        isActive
                          ? "bg-white/15 text-yellow-300"
                          : "bg-slate-100 text-indigo-700"
                      }`}
                    >
                      <StoreIcon type={tab.icon} />
                    </span>

                    <span className="min-w-0">
                      <span className="block text-sm font-black">
                        {tab.label}
                      </span>
                      <span
                        className={`mt-0.5 block truncate text-[11px] ${
                          isActive ? "text-indigo-100" : "text-slate-400"
                        }`}
                      >
                        {tab.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-purple-50 px-5 py-5 sm:px-7">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-purple-600">
                {tabs.find((tab) => tab.id === activeTab)?.description}
              </p>

              <h2 className="mt-1 text-2xl font-black text-indigo-950">
                {tabs.find((tab) => tab.id === activeTab)?.label} Settings
              </h2>
            </div>

            <div className="p-5 sm:p-7">
              {activeTab === "store" && (
                <div className="space-y-7">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Store identity
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      These details appear across customer-facing Wish Jinny
                      experiences.
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Marketplace name">
                      <input
                        value={settings.store.name}
                        onChange={(event) =>
                          handleTextChange("store", "name", event)
                        }
                        placeholder="Wish Jinny"
                        className={inputClassName}
                      />
                    </Field>

                    <Field label="Tagline">
                      <input
                        value={settings.store.tagline}
                        onChange={(event) =>
                          handleTextChange("store", "tagline", event)
                        }
                        placeholder="Make Your Wish Come True."
                        className={inputClassName}
                      />
                    </Field>

                    <Field label="Support email">
                      <input
                        type="email"
                        value={settings.store.supportEmail}
                        onChange={(event) =>
                          handleTextChange("store", "supportEmail", event)
                        }
                        placeholder="support@example.com"
                        className={inputClassName}
                      />
                    </Field>

                    <Field label="Support phone">
                      <input
                        type="tel"
                        value={settings.store.supportPhone}
                        onChange={(event) =>
                          handleTextChange("store", "supportPhone", event)
                        }
                        placeholder="+91 98765 43210"
                        className={inputClassName}
                      />
                    </Field>

                    <Field label="Currency">
                      <select
                        value={settings.store.currency}
                        onChange={(event) =>
                          handleTextChange("store", "currency", event)
                        }
                        className={inputClassName}
                      >
                        <option value="INR">INR — Indian Rupee</option>
                        <option value="USD">USD — US Dollar</option>
                        <option value="AED">AED — UAE Dirham</option>
                      </select>
                    </Field>

                    <Field label="Timezone">
                      <select
                        value={settings.store.timezone}
                        onChange={(event) =>
                          handleTextChange("store", "timezone", event)
                        }
                        className={inputClassName}
                      >
                        <option value="Asia/Kolkata">India Standard Time</option>
                        <option value="Asia/Dubai">Gulf Standard Time</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </Field>

                    <Field
                      label="Logo image URL"
                      description="Use a public image URL. File uploads should be handled through your secure media backend."
                    >
                      <input
                        type="url"
                        value={settings.store.logoUrl}
                        onChange={(event) =>
                          handleTextChange("store", "logoUrl", event)
                        }
                        placeholder="https://example.com/logo.png"
                        className={inputClassName}
                      />
                    </Field>

                    <Field
                      label="Favicon URL"
                      description="Use a small square PNG, SVG or ICO asset URL."
                    >
                      <input
                        type="url"
                        value={settings.store.faviconUrl}
                        onChange={(event) =>
                          handleTextChange("store", "faviconUrl", event)
                        }
                        placeholder="https://example.com/favicon.ico"
                        className={inputClassName}
                      />
                    </Field>

                    <Field className="sm:col-span-2" label="Business address">
                      <textarea
                        value={settings.store.businessAddress}
                        onChange={(event) =>
                          handleTextChange("store", "businessAddress", event)
                        }
                        placeholder="Registered marketplace business address"
                        rows={4}
                        className={`${inputClassName} resize-y`}
                      />
                    </Field>
                  </div>
                </div>
              )}

              {activeTab === "orders" && (
                <div className="space-y-7">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Order experience and policies
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Define customer-facing rules. Final eligibility must still
                      be verified by the backend for each order.
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      label="Order ID prefix"
                      description="Example: WJ-1001"
                    >
                      <input
                        value={settings.orders.orderPrefix}
                        onChange={(event) =>
                          handleTextChange("orders", "orderPrefix", event)
                        }
                        maxLength={8}
                        className={inputClassName}
                      />
                    </Field>

                    <Field
                      label="Review availability after delivery"
                      description="Number of days after delivery when review prompts become available."
                    >
                      <input
                        type="number"
                        min="0"
                        value={settings.orders.reviewAfterDeliveryDays}
                        onChange={(event) =>
                          handleNumberChange(
                            "orders",
                            "reviewAfterDeliveryDays",
                            event
                          )
                        }
                        className={inputClassName}
                      />
                    </Field>

                    <Field
                      label="Cancellation window"
                      description="Hours after order placement when self-service cancellation is normally allowed."
                    >
                      <input
                        type="number"
                        min="0"
                        value={settings.orders.cancellationWindowHours}
                        onChange={(event) =>
                          handleNumberChange(
                            "orders",
                            "cancellationWindowHours",
                            event
                          )
                        }
                        className={inputClassName}
                      />
                    </Field>

                    <Field
                      label="Return window"
                      description="Days after delivery when a return can normally be requested."
                    >
                      <input
                        type="number"
                        min="0"
                        value={settings.orders.returnWindowDays}
                        onChange={(event) =>
                          handleNumberChange(
                            "orders",
                            "returnWindowDays",
                            event
                          )
                        }
                        className={inputClassName}
                      />
                    </Field>
                  </div>

                  <div className="grid gap-3">
                    <Toggle
                      section="orders"
                      field="autoConfirmOrders"
                      title="Auto-confirm successful orders"
                      description="Automatically confirm orders after the backend confirms payment or COD eligibility."
                    />
                    <Toggle
                      section="orders"
                      field="allowOrderCancellation"
                      title="Allow customer cancellation requests"
                      description="Show cancellation request controls within the approved order window."
                    />
                    <Toggle
                      section="orders"
                      field="allowReturns"
                      title="Allow return requests"
                      description="Enable the customer return request workflow for eligible delivered orders."
                    />
                    <Toggle
                      section="orders"
                      field="allowRefundRequests"
                      title="Allow refund requests"
                      description="Enable customer refund support for eligible orders and payment states."
                    />
                  </div>
                </div>
              )}

              {activeTab === "shipping" && (
                <div className="space-y-7">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Delivery and COD controls
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Configure customer-visible shipping defaults. Delivery
                      serviceability and final fees must be calculated by the
                      server at checkout.
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Flat shipping fee (₹)">
                      <input
                        type="number"
                        min="0"
                        value={settings.shipping.flatRate}
                        onChange={(event) =>
                          handleNumberChange("shipping", "flatRate", event)
                        }
                        className={inputClassName}
                      />
                    </Field>

                    <Field label="Free shipping threshold (₹)">
                      <input
                        type="number"
                        min="0"
                        value={settings.shipping.freeShippingThreshold}
                        onChange={(event) =>
                          handleNumberChange(
                            "shipping",
                            "freeShippingThreshold",
                            event
                          )
                        }
                        className={inputClassName}
                      />
                    </Field>

                    <Field label="Estimated delivery time">
                      <input
                        value={settings.shipping.estimatedDeliveryDays}
                        onChange={(event) =>
                          handleTextChange(
                            "shipping",
                            "estimatedDeliveryDays",
                            event
                          )
                        }
                        placeholder="3-7"
                        className={inputClassName}
                      />
                    </Field>

                    <Field label="COD maximum order amount (₹)">
                      <input
                        type="number"
                        min="0"
                        value={settings.shipping.codMaximumAmount}
                        onChange={(event) =>
                          handleNumberChange(
                            "shipping",
                            "codMaximumAmount",
                            event
                          )
                        }
                        className={inputClassName}
                      />
                    </Field>

                    <Field className="sm:col-span-2" label="Shipping notice">
                      <textarea
                        value={settings.shipping.shippingNotice}
                        onChange={(event) =>
                          handleTextChange(
                            "shipping",
                            "shippingNotice",
                            event
                          )
                        }
                        rows={3}
                        className={`${inputClassName} resize-y`}
                      />
                    </Field>
                  </div>

                  <Toggle
                    section="shipping"
                    field="enableCashOnDelivery"
                    title="Enable Cash on Delivery"
                    description="Offer COD only after server-side address, order-value and risk checks."
                  />
                </div>
              )}

              {activeTab === "payments" && (
                <div className="space-y-7">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Payment methods
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Enable customer-facing payment choices. Configure payment
                      gateway credentials only on the secure backend—not here.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    <Toggle
                      section="payments"
                      field="enableUpi"
                      title="UPI payments"
                      description="Let customers continue through a trusted UPI payment provider."
                    />
                    <Toggle
                      section="payments"
                      field="enableCards"
                      title="Credit and debit cards"
                      description="Show card payment through your PCI-compliant payment provider."
                    />
                    <Toggle
                      section="payments"
                      field="enableCod"
                      title="Cash on Delivery"
                      description="Show COD only for eligible serviceable orders."
                    />
                    <Toggle
                      section="payments"
                      field="enableWallets"
                      title="Wallet payments"
                      description="Enable supported wallet options through your payment service."
                    />
                    <Toggle
                      section="payments"
                      field="taxIncludedInPrice"
                      title="Tax included in product prices"
                      description="Show tax-inclusive pricing across customer pages."
                    />
                  </div>

                  <Field
                    label="Default tax rate (%)"
                    description="Use this as a display/default value only. Product tax classification and invoice tax must be computed server-side."
                  >
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={settings.payments.taxRate}
                      onChange={(event) =>
                        handleNumberChange("payments", "taxRate", event)
                      }
                      className={`${inputClassName} max-w-xs`}
                    />
                  </Field>

                  <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                    <p className="text-sm font-black text-amber-900">
                      Payment security rule
                    </p>
                    <p className="mt-2 text-xs leading-5 text-amber-800">
                      Do not add payment gateway secret keys, private tokens,
                      card details or webhook secrets to frontend settings.
                      Store and use those only through secured backend services.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "vendors" && (
                <div className="space-y-7">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Seller marketplace rules
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Set the default onboarding and catalog moderation
                      workflow for Wish Jinny vendors.
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      label="Marketplace commission (%)"
                      description="The default commission. Actual payout calculations must happen on the backend."
                    >
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={settings.vendors.commissionRate}
                        onChange={(event) =>
                          handleNumberChange(
                            "vendors",
                            "commissionRate",
                            event
                          )
                        }
                        className={inputClassName}
                      />
                    </Field>

                    <Field
                      label="Low stock threshold"
                      description="Show a seller alert when product stock reaches this count."
                    >
                      <input
                        type="number"
                        min="0"
                        value={settings.vendors.lowStockThreshold}
                        onChange={(event) =>
                          handleNumberChange(
                            "vendors",
                            "lowStockThreshold",
                            event
                          )
                        }
                        className={inputClassName}
                      />
                    </Field>
                  </div>

                  <div className="grid gap-3">
                    <Toggle
                      section="vendors"
                      field="requireAdminApproval"
                      title="Require seller approval"
                      description="New vendor applications remain pending until an authorized admin approves them."
                    />
                    <Toggle
                      section="vendors"
                      field="requireProductApproval"
                      title="Require product approval"
                      description="New and resubmitted product listings require moderation before publishing."
                    />
                    <Toggle
                      section="vendors"
                      field="allowVendorProductDrafts"
                      title="Allow seller product drafts"
                      description="Let vendors save incomplete listings and submit them later."
                    />
                    <Toggle
                      section="vendors"
                      field="requireVendorDocuments"
                      title="Require seller verification documents"
                      description="Require relevant business and identity documents during seller onboarding."
                    />
                    <Toggle
                      section="vendors"
                      field="allowVendorSelfShipping"
                      title="Allow vendor self-shipping"
                      description="Allow approved vendors to manage eligible shipment fulfillment themselves."
                    />
                  </div>
                </div>
              )}

              {activeTab === "notifications" && (
                <div className="space-y-7">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Notifications and operational alerts
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Control customer, vendor and internal communication
                      preferences.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    <Toggle
                      section="notifications"
                      field="orderEmails"
                      title="Customer order emails"
                      description="Send order confirmations, delivery updates and relevant service messages."
                    />
                    <Toggle
                      section="notifications"
                      field="vendorEmails"
                      title="Vendor operational emails"
                      description="Notify sellers about approval decisions, new orders and listing updates."
                    />
                    <Toggle
                      section="notifications"
                      field="customerMarketingEmails"
                      title="Customer marketing emails"
                      description="Send promotional offers only to customers who have opted in."
                    />
                    <Toggle
                      section="notifications"
                      field="lowStockAlerts"
                      title="Low stock alerts"
                      description="Notify vendors or administrators when listings approach low inventory."
                    />
                    <Toggle
                      section="notifications"
                      field="refundAlerts"
                      title="Refund and return alerts"
                      description="Notify the operations team when customers request returns or refunds."
                    />
                    <Toggle
                      section="notifications"
                      field="moderationAlerts"
                      title="Moderation queue alerts"
                      description="Notify administrators of new vendor applications and pending product approvals."
                    />
                  </div>
                </div>
              )}

              {activeTab === "features" && (
                <div className="space-y-7">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Marketplace feature controls
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Enable or temporarily disable customer-facing features
                      without changing component code.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    <Toggle
                      section="features"
                      field="enableWishlist"
                      title="Wishlist"
                      description="Let customers save products for a later magical shopping moment."
                    />
                    <Toggle
                      section="features"
                      field="enableReviews"
                      title="Product reviews"
                      description="Enable verified review workflows for delivered product purchases."
                    />
                    <Toggle
                      section="features"
                      field="enableCoupons"
                      title="Coupons and offers"
                      description="Enable coupon code fields and promotional pricing workflows."
                    />
                    <Toggle
                      section="features"
                      field="enableJinnyAi"
                      title="Jinny AI assistant"
                      description="Show the Hindi/English Wish Jinny guidance assistant across the storefront."
                    />
                    <Toggle
                      section="features"
                      field="enableVendorRegistration"
                      title="Vendor registration"
                      description="Allow prospective sellers to submit new applications."
                    />
                    <Toggle
                      section="features"
                      field="enableGuestCheckout"
                      title="Guest checkout"
                      description="Allow customers to begin checkout without signing in, subject to backend policy."
                    />
                    <Toggle
                      section="features"
                      field="maintenanceMode"
                      title="Maintenance mode"
                      description="Use only for scheduled downtime. The backend should enforce maintenance access rules."
                    />
                  </div>

                  {settings.features.maintenanceMode && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                      <p className="text-sm font-black text-rose-800">
                        Maintenance mode is enabled
                      </p>
                      <p className="mt-2 text-xs leading-5 text-rose-700">
                        Confirm that the backend provides an administrator
                        bypass and an informative maintenance page before
                        activating this in production.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <button
                type="button"
                onClick={handleResetCurrentSection}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset this section
              </button>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                {isDirty && (
                  <span className="text-center text-xs font-bold text-amber-700 sm:text-left">
                    Unsaved changes
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving settings..." : "Save settings"}
                  <ArrowIcon />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default SettingManager;