import React, { useEffect, useState } from "react";
import {
  fetchSecuritySettings,
  updateSecuritySettings,
  resetSecuritySettings,
  toggleLockdownMode,
} from "../utils/api";

const DEFAULT_SECURITY_SETTINGS = {
  twoFactorEnabled: false,
  passwordMinLength: 8,
  passwordComplexity: true,
  passwordExpiryDays: 90,
  failedAttemptsLimit: 5,
  sessionTimeoutMinutes: 30,
  roleAccess: {},
  allowedIPs: [],
  alertUnusualLogin: true,
  alertFailedLogins: true,
  lockdownMode: false,
};

function SecurityManager() {
  const [settings, setSettings] = useState(null);

  const [loadingSettings, setLoadingSettings] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
  const [showLockdownModal, setShowLockdownModal] = useState(false);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const normalizeSettings = (response) => {
    const receivedSettings = response?.settings || response || {};

    return {
      ...DEFAULT_SECURITY_SETTINGS,
      ...receivedSettings,
      allowedIPs: Array.isArray(receivedSettings?.allowedIPs)
        ? receivedSettings.allowedIPs
        : [],
      roleAccess:
        receivedSettings?.roleAccess &&
        typeof receivedSettings.roleAccess === "object"
          ? receivedSettings.roleAccess
          : {},
    };
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoadingSettings(true);
    setError("");

    try {
      const response = await fetchSecuritySettings();

      setSettings(normalizeSettings(response));
      setIsDirty(false);
    } catch (err) {
      setSettings(null);
      setError(
        err?.message ||
          "Could not load security settings. Please try again."
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
    const passwordMinLength = Number(settings.passwordMinLength);
    const passwordExpiryDays = Number(settings.passwordExpiryDays);
    const failedAttemptsLimit = Number(settings.failedAttemptsLimit);
    const sessionTimeoutMinutes = Number(settings.sessionTimeoutMinutes);

    if (
      !Number.isInteger(passwordMinLength) ||
      passwordMinLength < 6 ||
      passwordMinLength > 128
    ) {
      return "Password minimum length must be between 6 and 128.";
    }

    if (
      !Number.isInteger(passwordExpiryDays) ||
      passwordExpiryDays < 0 ||
      passwordExpiryDays > 3650
    ) {
      return "Password expiry days must be between 0 and 3650.";
    }

    if (
      !Number.isInteger(failedAttemptsLimit) ||
      failedAttemptsLimit < 1 ||
      failedAttemptsLimit > 100
    ) {
      return "Failed login attempt limit must be between 1 and 100.";
    }

    if (
      !Number.isInteger(sessionTimeoutMinutes) ||
      sessionTimeoutMinutes < 1 ||
      sessionTimeoutMinutes > 43200
    ) {
      return "Session timeout must be between 1 and 43200 minutes.";
    }

    const invalidIpEntry = (settings.allowedIPs || []).find((ip) => {
      const cleanedIp = String(ip || "").trim();

      if (!cleanedIp) return false;

      return cleanedIp.length > 255;
    });

    if (invalidIpEntry) {
      return "One or more allowed IP entries are invalid.";
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
        passwordMinLength: Number(settings.passwordMinLength),
        passwordExpiryDays: Number(settings.passwordExpiryDays),
        failedAttemptsLimit: Number(settings.failedAttemptsLimit),
        sessionTimeoutMinutes: Number(settings.sessionTimeoutMinutes),
        allowedIPs: (settings.allowedIPs || [])
          .map((ip) => String(ip || "").trim())
          .filter(Boolean),
      };

      const response = await updateSecuritySettings(payload);

      setSettings(normalizeSettings(response || payload));
      setSuccess(response?.message || "Security settings saved successfully.");
      setIsDirty(false);
    } catch (err) {
      setError(err?.message || "Could not save security settings.");
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
      const response = await resetSecuritySettings();

      setSettings(
        normalizeSettings(response || DEFAULT_SECURITY_SETTINGS)
      );

      setSuccess(
        response?.message || "Security settings reset successfully."
      );

      setIsDirty(false);
      closeResetModal();
    } catch (err) {
      setError(err?.message || "Could not reset security settings.");
    } finally {
      setActionLoading("");
    }
  };

  const openLockdownModal = () => {
    clearMessages();
    setShowLockdownModal(true);
  };

  const closeLockdownModal = () => {
    setShowLockdownModal(false);
  };

  const handleLockdown = async () => {
    if (!settings) return;

    const nextValue = !settings.lockdownMode;

    clearMessages();
    setActionLoading("lockdown");

    try {
      const response = await toggleLockdownMode({
        enabled: nextValue,
      });

      setSettings((currentSettings) => ({
        ...currentSettings,
        lockdownMode: nextValue,
      }));

      setSuccess(
        response?.message ||
          `Lockdown mode ${nextValue ? "enabled" : "disabled"} successfully.`
      );

      setIsDirty(false);
      closeLockdownModal();

      await loadSettings();
    } catch (err) {
      setError(
        err?.message ||
          "Could not update lockdown mode. Please try again."
      );
    } finally {
      setActionLoading("");
    }
  };

  if (loadingSettings && !settings) {
    return (
      <div className="px-6 py-10 text-center text-indigo-700">
        Loading security settings...
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
          No security settings found.
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
    <div className="security-manager px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">
            Security & Access Control Manager
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Manage login security, password policies, sessions, IP access, alerts, and emergency lockdown.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDirty && (
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
              Unsaved Changes
            </span>
          )}

          {settings.lockdownMode && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
              Lockdown Active
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

      {settings.lockdownMode && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-semibold">Emergency Lockdown Mode is active.</p>
          <p className="mt-1 text-sm">
            Customer-facing access may be restricted until lockdown mode is disabled.
          </p>
        </div>
      )}

      <section className="mb-6 rounded-lg border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-indigo-900">
            Login Security
          </h2>

          <p className="text-sm text-gray-600">
            Configure strong authentication requirements for administrators and users.
          </p>
        </div>

        <label className="flex items-center gap-3 rounded-md border p-4">
          <input
            type="checkbox"
            checked={Boolean(settings.twoFactorEnabled)}
            onChange={(event) =>
              updateSetting("twoFactorEnabled", event.target.checked)
            }
            disabled={isBusy}
          />

          <span>
            <span className="block font-medium text-gray-800">
              Require Two-Factor Authentication
            </span>

            <span className="block text-sm text-gray-500">
              Require users to verify sign-in using a second authentication factor.
            </span>
          </span>
        </label>
      </section>

      <section className="mb-6 rounded-lg border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-indigo-900">
            Password Policy
          </h2>

          <p className="text-sm text-gray-600">
            Control password strength, expiry, and failed login rules.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Minimum Password Length
            </label>

            <input
              type="number"
              min="6"
              max="128"
              value={settings.passwordMinLength ?? ""}
              onChange={(event) =>
                updateSetting("passwordMinLength", event.target.value)
              }
              disabled={isBusy}
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />

            <p className="mt-1 text-xs text-gray-500">
              Allowed range: 6 to 128 characters.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Password Expiry Days
            </label>

            <input
              type="number"
              min="0"
              max="3650"
              value={settings.passwordExpiryDays ?? ""}
              onChange={(event) =>
                updateSetting("passwordExpiryDays", event.target.value)
              }
              disabled={isBusy}
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />

            <p className="mt-1 text-xs text-gray-500">
              Enter 0 if passwords should not expire.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Failed Attempts Limit
            </label>

            <input
              type="number"
              min="1"
              max="100"
              value={settings.failedAttemptsLimit ?? ""}
              onChange={(event) =>
                updateSetting("failedAttemptsLimit", event.target.value)
              }
              disabled={isBusy}
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />

            <p className="mt-1 text-xs text-gray-500">
              Account lock threshold after failed sign-in attempts.
            </p>
          </div>
        </div>

        <label className="mt-5 flex items-center gap-3 rounded-md border p-4">
          <input
            type="checkbox"
            checked={Boolean(settings.passwordComplexity)}
            onChange={(event) =>
              updateSetting("passwordComplexity", event.target.checked)
            }
            disabled={isBusy}
          />

          <span>
            <span className="block font-medium text-gray-800">
              Require Password Complexity
            </span>

            <span className="block text-sm text-gray-500">
              Require uppercase letters, lowercase letters, numbers, and symbols.
            </span>
          </span>
        </label>
      </section>

      <section className="mb-6 rounded-lg border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-indigo-900">
            Session Management
          </h2>

          <p className="text-sm text-gray-600">
            Configure automatic session expiry for inactive users.
          </p>
        </div>

        <div className="max-w-md">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Session Timeout in Minutes
          </label>

          <input
            type="number"
            min="1"
            max="43200"
            value={settings.sessionTimeoutMinutes ?? ""}
            onChange={(event) =>
              updateSetting("sessionTimeoutMinutes", event.target.value)
            }
            disabled={isBusy}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          />

          <p className="mt-1 text-xs text-gray-500">
            Valid range: 1 minute to 43200 minutes (30 days).
          </p>
        </div>
      </section>

      <section className="mb-6 rounded-lg border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-indigo-900">
            Role-Based Access Control
          </h2>

          <p className="text-sm text-gray-600">
            Role permissions are controlled by backend authorization policies.
          </p>
        </div>

        <div className="overflow-x-auto rounded-md border bg-gray-50 p-4">
          <pre className="whitespace-pre-wrap break-words text-xs text-gray-700">
            {JSON.stringify(settings.roleAccess || {}, null, 2)}
          </pre>
        </div>
      </section>

      <section className="mb-6 rounded-lg border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-indigo-900">
            IP Allowlisting
          </h2>

          <p className="text-sm text-gray-600">
            Restrict administrative access to trusted IP addresses or CIDR ranges.
          </p>
        </div>

        <textarea
          value={(settings.allowedIPs || []).join("\n")}
          onChange={(event) =>
            updateSetting(
              "allowedIPs",
              event.target.value
                .split("\n")
                .map((ip) => ip.trim())
                .filter(Boolean)
            )
          }
          disabled={isBusy}
          rows={7}
          placeholder={"203.0.113.10\n198.51.100.0/24"}
          className="w-full rounded-md border p-3 font-mono text-sm outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
        />

        <p className="mt-2 text-xs text-gray-500">
          Add one IPv4, IPv6, or CIDR range per line. Leave empty to allow access from all IP addresses.
        </p>
      </section>

      <section className="mb-6 rounded-lg border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-indigo-900">
            Suspicious Activity Detection
          </h2>

          <p className="text-sm text-gray-600">
            Configure alerts for potentially risky sign-in activity.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-md border p-4">
            <input
              type="checkbox"
              checked={Boolean(settings.alertUnusualLogin)}
              onChange={(event) =>
                updateSetting("alertUnusualLogin", event.target.checked)
              }
              disabled={isBusy}
            />

            <span>
              <span className="block font-medium text-gray-800">
                Alert on Unusual Login Attempts
              </span>

              <span className="block text-sm text-gray-500">
                Notify administrators about sign-ins from unusual locations or devices.
              </span>
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-md border p-4">
            <input
              type="checkbox"
              checked={Boolean(settings.alertFailedLogins)}
              onChange={(event) =>
                updateSetting("alertFailedLogins", event.target.checked)
              }
              disabled={isBusy}
            />

            <span>
              <span className="block font-medium text-gray-800">
                Alert on Repeated Failed Logins
              </span>

              <span className="block text-sm text-gray-500">
                Notify administrators when failed sign-ins exceed the threshold.
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className="mb-6 rounded-lg border bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-indigo-900">
          Encryption Settings
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          Data at rest and in transit should be encrypted by your infrastructure and backend services. Encryption keys and secret values are intentionally not exposed in this admin interface.
        </p>
      </section>

      <section className="mb-6 rounded-lg border border-red-200 bg-red-50 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-red-700">
            Maintenance / Lockdown Mode
          </h2>

          <p className="text-sm text-red-600">
            Use only for an emergency. Lockdown can restrict customer-facing access.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-medium text-red-800">
              Current status:{" "}
              {settings.lockdownMode ? "Enabled" : "Disabled"}
            </p>

            <p className="mt-1 text-sm text-red-600">
              {settings.lockdownMode
                ? "Customer-facing access may currently be restricted."
                : "Customer-facing access is currently normal."}
            </p>
          </div>

          <button
            type="button"
            onClick={openLockdownModal}
            disabled={isBusy}
            className={`rounded-md px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60 ${
              settings.lockdownMode
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {settings.lockdownMode
              ? "Disable Lockdown"
              : "Enable Lockdown"}
          </button>
        </div>
      </section>

      <section className="flex flex-wrap gap-3 border-t pt-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={isBusy || !isDirty}
          className="rounded-md bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLoading === "save"
            ? "Saving..."
            : "Save Security Settings"}
        </button>

        <button
          type="button"
          onClick={openResetModal}
          disabled={isBusy}
          className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLoading === "reset"
            ? "Resetting..."
            : "Reset Security Settings"}
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
              Reset Security Settings
            </h2>

            <p className="mt-3 text-sm text-gray-700">
              This will reset all security settings to backend defaults. This action may change login, password, session, and IP access rules.
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

      {showLockdownModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <h2 className="text-xl font-bold text-red-700">
              {settings.lockdownMode
                ? "Disable Lockdown Mode"
                : "Enable Lockdown Mode"}
            </h2>

            <p className="mt-3 text-sm text-gray-700">
              {settings.lockdownMode
                ? "This will restore normal customer-facing access, according to your backend configuration."
                : "This is an emergency action. It can restrict customer-facing access and interrupt normal operations."}
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeLockdownModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleLockdown}
                disabled={actionLoading === "lockdown"}
                className={`rounded-md px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                  settings.lockdownMode
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {actionLoading === "lockdown"
                  ? "Updating..."
                  : settings.lockdownMode
                    ? "Disable Lockdown"
                    : "Enable Lockdown"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecurityManager;