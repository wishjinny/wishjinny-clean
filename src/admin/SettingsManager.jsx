import React, { useEffect, useState } from "react";
import {
  fetchSettings,
  updateSettings,
  resetSettings,
} from "../utils/api";

const DEFAULT_SETTINGS = {
  siteName: "",
  url: "",
  contactEmail: "",
  contactPhone: "",

  currency: "INR",
  taxRate: 0,

  vendorApprovalRequired: false,
  productApprovalRequired: false,

  emailNotifications: true,
  smsNotifications: false,

  seoTitle: "",
  seoDescription: "",
  socialLinks: "",

  maintenanceMode: false,
  siteActive: true,
};

function SettingsManager() {
  const [settings, setSettings] = useState(null);

  const [loadingSettings, setLoadingSettings] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [pendingMaintenanceMode, setPendingMaintenanceMode] = useState(false);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const normalizeSettings = (response) => {
    const receivedSettings = response?.settings || response || {};

    return {
      ...DEFAULT_SETTINGS,
      ...receivedSettings,
    };
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoadingSettings(true);
    setError("");

    try {
      const response = await fetchSettings();

      setSettings(normalizeSettings(response));
      setIsDirty(false);
    } catch (err) {
      setSettings(null);
      setError(
        err?.message ||
          "Could not load global settings. Please try again."
      );
    } finally {
      setLoadingSettings(false);
    }
  };

  const updateSetting = (field, value) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [field]: value,
    }));

    setIsDirty(true);
  };

  const validateSettings = () => {
    const siteName = String(settings.siteName || "").trim();
    const currency = String(settings.currency || "").trim();
    const taxRate = Number(settings.taxRate);

    if (!siteName) {
      return "Website name is required.";
    }

    if (!currency) {
      return "Currency code is required.";
    }

    if (currency.length < 3 || currency.length > 10) {
      return "Currency should be a valid code such as INR, USD, or EUR.";
    }

    if (Number.isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      return "Tax rate must be between 0 and 100.";
    }

    const contactEmail = String(settings.contactEmail || "").trim();

    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return "Enter a valid contact email address.";
    }

    const url = String(settings.url || "").trim();

    if (url && !/^https?:\/\/.+/i.test(url)) {
      return "Website URL must start with http:// or https://.";
    }

    return "";
  };

  const handleSave = async () => {
    if (!settings) return;

    const validationError = validateSettings();

    if (validationError) {
      setError(validationError);
      return;
    }

    clearMessages();
    setActionLoading("save");

    try {
      const payload = {
        ...settings,
        siteName: String(settings.siteName || "").trim(),
        url: String(settings.url || "").trim(),
        contactEmail: String(settings.contactEmail || "").trim(),
        contactPhone: String(settings.contactPhone || "").trim(),
        currency: String(settings.currency || "").trim().toUpperCase(),
        taxRate: Number(settings.taxRate || 0),
        seoTitle: String(settings.seoTitle || "").trim(),
        seoDescription: String(settings.seoDescription || "").trim(),
        socialLinks: String(settings.socialLinks || "").trim(),
      };

      const response = await updateSettings(payload);

      setSettings(normalizeSettings(response || payload));
      setSuccess(response?.message || "Global settings saved successfully.");
      setIsDirty(false);
    } catch (err) {
      setError(err?.message || "Could not save global settings.");
    } finally {
      setActionLoading("");
    }
  };

  const openResetModal = () => {
    clearMessages();
    setShowResetModal(true);
  };

  const closeResetModal = () => {
    setShowResetModal(false);
  };

  const handleReset = async () => {
    clearMessages();
    setActionLoading("reset");

    try {
      const response = await resetSettings();

      setSettings(normalizeSettings(response || DEFAULT_SETTINGS));
      setSuccess(
        response?.message || "Global settings reset successfully."
      );

      setIsDirty(false);
      closeResetModal();
    } catch (err) {
      setError(err?.message || "Could not reset global settings.");
    } finally {
      setActionLoading("");
    }
  };

  const requestMaintenanceChange = (enabled) => {
    clearMessages();

    setPendingMaintenanceMode(enabled);
    setShowMaintenanceModal(true);
  };

  const closeMaintenanceModal = () => {
    setShowMaintenanceModal(false);
  };

  const confirmMaintenanceChange = () => {
    updateSetting("maintenanceMode", pendingMaintenanceMode);
    closeMaintenanceModal();

    setSuccess(
      pendingMaintenanceMode
        ? "Maintenance mode change is ready. Save settings to apply it."
        : "Maintenance mode will be disabled when you save settings."
    );
  };

  if (loadingSettings && !settings) {
    return (
      <div className="px-6 py-10 text-center text-indigo-700">
        Loading global settings...
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="px-6 py-10">
        {error && (
          <p className="mb-4 text-center font-semibold text-red-600">
            {error}
          </p>
        )}

        <p className="mb-4 text-center text-gray-600">
          No global settings found.
        </p>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadSettings}
            className="rounded-md bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const isBusy = Boolean(actionLoading);

  return (
    <div className="settings-manager px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">
            Global Settings & Configuration
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Configure website details, tax, vendor approvals, notifications, SEO, and maintenance mode.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDirty && (
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
              Unsaved Changes
            </span>
          )}

          {settings.maintenanceMode && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
              Maintenance Mode Active
            </span>
          )}

          <button
            type="button"
            onClick={loadSettings}
            disabled={loadingSettings || isBusy}
            className="rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingSettings ? "Refreshing..." : "Refresh"}
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

      {settings.maintenanceMode && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-semibold">Maintenance Mode is active.</p>
          <p className="mt-1 text-sm">
            Customer-facing pages may be unavailable while maintenance mode is enabled.
          </p>
        </div>
      )}

      {!settings.siteActive && (
        <div className="mb-6 rounded-md border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
          <p className="font-semibold">Website is marked inactive.</p>
          <p className="mt-1 text-sm">
            Customers may not be able to access the storefront until website activity is restored.
          </p>
        </div>
      )}

      <section className="mb-6 rounded-lg border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-indigo-900">
            Website Settings
          </h2>

          <p className="text-sm text-gray-600">
            Configure your website identity and public contact information.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Website Name
            </label>

            <input
              type="text"
              value={settings.siteName || ""}
              onChange={(event) =>
                updateSetting("siteName", event.target.value)
              }
              disabled={isBusy}
              placeholder="My Store"
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Website URL
            </label>

            <input
              type="url"
              value={settings.url || ""}
              onChange={(event) =>
                updateSetting("url", event.target.value)
              }
              disabled={isBusy}
              placeholder="https://example.com"
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Contact Email
            </label>

            <input
              type="email"
              value={settings.contactEmail || ""}
              onChange={(event) =>
                updateSetting("contactEmail", event.target.value)
              }
              disabled={isBusy}
              placeholder="support@example.com"
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Contact Phone
            </label>

            <input
              type="tel"
              value={settings.contactPhone || ""}
              onChange={(event) =>
                updateSetting("contactPhone", event.target.value)
              }
              disabled={isBusy}
              placeholder="+91 98765 43210"
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-lg border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-indigo-900">
            Currency & Tax
          </h2>

          <p className="text-sm text-gray-600">
            Configure the default currency and standard tax rate.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Currency Code
            </label>

            <select
              value={settings.currency || "INR"}
              onChange={(event) =>
                updateSetting("currency", event.target.value)
              }
              disabled={isBusy}
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="INR">INR - Indian Rupee</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="AED">AED - UAE Dirham</option>
              <option value="AUD">AUD - Australian Dollar</option>
              <option value="CAD">CAD - Canadian Dollar</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tax Rate (%)
            </label>

            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={settings.taxRate ?? ""}
              onChange={(event) =>
                updateSetting("taxRate", event.target.value)
              }
              disabled={isBusy}
              placeholder="18"
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />

            <p className="mt-1 text-xs text-gray-500">
              Enter a percentage from 0 to 100.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-lg border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-indigo-900">
            Vendor & Product Settings
          </h2>

          <p className="text-sm text-gray-600">
            Control approval workflow requirements for vendor and product onboarding.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-md border p-4">
            <input
              type="checkbox"
              checked={Boolean(settings.vendorApprovalRequired)}
              onChange={(event) =>
                updateSetting(
                  "vendorApprovalRequired",
                  event.target.checked
                )
              }
              disabled={isBusy}
            />

            <span>
              <span className="block font-medium text-gray-800">
                Vendor Approval Required
              </span>

              <span className="block text-sm text-gray-500">
                New vendor accounts need administrator approval before activation.
              </span>
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-md border p-4">
            <input
              type="checkbox"
              checked={Boolean(settings.productApprovalRequired)}
              onChange={(event) =>
                updateSetting(
                  "productApprovalRequired",
                  event.target.checked
                )
              }
              disabled={isBusy}
            />

            <span>
              <span className="block font-medium text-gray-800">
                Product Approval Required
              </span>

              <span className="block text-sm text-gray-500">
                New or edited products require administrator review before publishing.
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className="mb-6 rounded-lg border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-indigo-900">
            Notifications
          </h2>

          <p className="text-sm text-gray-600">
            Enable system communication channels for important platform events.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-md border p-4">
            <input
              type="checkbox"
              checked={Boolean(settings.emailNotifications)}
              onChange={(event) =>
                updateSetting(
                  "emailNotifications",
                  event.target.checked
                )
              }
              disabled={isBusy}
            />

            <span>
              <span className="block font-medium text-gray-800">
                Email Notifications
              </span>

              <span className="block text-sm text-gray-500">
                Send account, order, security, and operational notifications through email.
              </span>
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-md border p-4">
            <input
              type="checkbox"
              checked={Boolean(settings.smsNotifications)}
              onChange={(event) =>
                updateSetting("smsNotifications", event.target.checked)
              }
              disabled={isBusy}
            />

            <span>
              <span className="block font-medium text-gray-800">
                SMS Notifications
              </span>

              <span className="block text-sm text-gray-500">
                Send important updates through SMS when your SMS provider is configured.
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className="mb-6 rounded-lg border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-indigo-900">
            SEO & Social
          </h2>

          <p className="text-sm text-gray-600">
            Set default metadata and social media references for your storefront.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Default SEO Title
            </label>

            <input
              type="text"
              value={settings.seoTitle || ""}
              onChange={(event) =>
                updateSetting("seoTitle", event.target.value)
              }
              disabled={isBusy}
              placeholder="My Store | Shop Online"
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Default SEO Description
            </label>

            <textarea
              value={settings.seoDescription || ""}
              onChange={(event) =>
                updateSetting("seoDescription", event.target.value)
              }
              disabled={isBusy}
              rows={4}
              placeholder="Describe your store for search engines..."
              className="w-full rounded-md border p-3 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Social Media Links
            </label>

            <textarea
              value={settings.socialLinks || ""}
              onChange={(event) =>
                updateSetting("socialLinks", event.target.value)
              }
              disabled={isBusy}
              rows={4}
              placeholder={"https://instagram.com/yourstore\nhttps://facebook.com/yourstore"}
              className="w-full rounded-md border p-3 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />

            <p className="mt-1 text-xs text-gray-500">
              Add one social profile URL per line.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-lg border border-red-200 bg-red-50 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-red-700">
            Maintenance & Website Status
          </h2>

          <p className="text-sm text-red-600">
            These settings directly affect customer access to the website.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-md border border-red-200 bg-white p-4">
            <p className="font-medium text-gray-800">
              Maintenance Mode
            </p>

            <p className="mt-1 text-sm text-gray-600">
              {settings.maintenanceMode
                ? "Currently enabled. Customer-facing pages may be unavailable."
                : "Currently disabled. The site is operating normally."}
            </p>

            <button
              type="button"
              onClick={() =>
                requestMaintenanceChange(!settings.maintenanceMode)
              }
              disabled={isBusy}
              className={`mt-3 rounded-md px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                settings.maintenanceMode
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {settings.maintenanceMode
                ? "Disable Maintenance"
                : "Enable Maintenance"}
            </button>
          </div>

          <label className="flex items-center gap-3 rounded-md border border-red-200 bg-white p-4">
            <input
              type="checkbox"
              checked={Boolean(settings.siteActive)}
              onChange={(event) =>
                updateSetting("siteActive", event.target.checked)
              }
              disabled={isBusy}
            />

            <span>
              <span className="block font-medium text-gray-800">
                Website Active
              </span>

              <span className="block text-sm text-gray-600">
                Disable this setting to mark the site inactive. Save settings to apply this change.
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className="flex flex-wrap gap-3 border-t pt-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={isBusy || !isDirty}
          className="rounded-md bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLoading === "save" ? "Saving..." : "Save Settings"}
        </button>

        <button
          type="button"
          onClick={openResetModal}
          disabled={isBusy}
          className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLoading === "reset"
            ? "Resetting..."
            : "Reset Settings"}
        </button>
      </section>

      {showResetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <h2 className="text-xl font-bold text-red-700">
              Reset Global Settings
            </h2>

            <p className="mt-3 text-sm text-gray-700">
              This will restore all global settings to backend defaults, including website configuration, tax, notifications, SEO, and approval workflow settings.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeResetModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={actionLoading === "reset"}
                className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "reset"
                  ? "Resetting..."
                  : "Reset Settings"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMaintenanceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <h2 className="text-xl font-bold text-red-700">
              {pendingMaintenanceMode
                ? "Enable Maintenance Mode"
                : "Disable Maintenance Mode"}
            </h2>

            <p className="mt-3 text-sm text-gray-700">
              {pendingMaintenanceMode
                ? "Enabling maintenance mode can make customer-facing pages unavailable. You will still need to click Save Settings to apply the change."
                : "Disabling maintenance mode will restore normal storefront access after you click Save Settings."}
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeMaintenanceModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmMaintenanceChange}
                className={`rounded-md px-4 py-2 text-white ${
                  pendingMaintenanceMode
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {pendingMaintenanceMode
                  ? "Confirm Maintenance Mode"
                  : "Confirm Disable Maintenance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsManager;