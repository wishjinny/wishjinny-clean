import React, { useEffect, useState } from "react";
import {
  fetchUXSettings,
  updateUXSettings,
  resetUXSettings,
  exportUXCSV,
  exportUXExcel,
  exportUXPDF,
  publishUXSettings,
} from "../utils/api";

const DEFAULT_SETTINGS = {
  theme: {
    mode: "light",
    primaryColor: "#4f46e5",
    secondaryColor: "#1e293b",
    accentColor: "#f59e0b",
    fontFamily: "Inter, sans-serif",
    fontSize: "16px",
    borderRadius: "8px",
    spacing: "16px",
    layout: "standard",
  },
  homepage: {
    heroTitle: "",
    heroSubtitle: "",
    heroButtonText: "",
    heroButtonLink: "",
    showFeaturedProducts: true,
    showCategories: true,
    showBanners: true,
    showRecommendations: true,
    featuredTitle: "Featured Products",
    categoriesTitle: "Shop by Category",
  },
  recommendations: {
    enabled: true,
    strategy: "personalized",
    showRecentlyViewed: true,
    showFrequentlyBoughtTogether: true,
    showTrendingProducts: true,
    maxItems: 8,
  },
  accessibility: {
    highContrast: false,
    reducedMotion: false,
    largerText: false,
    keyboardNavigation: true,
    showFocusIndicators: true,
    screenReaderLabels: true,
  },
  locked: false,
};

function UXManager() {
  const [settings, setSettings] = useState(null);

  const [loadingSettings, setLoadingSettings] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const normalizeSettings = (response) => {
    const receivedSettings = response?.settings || response || {};

    return {
      ...DEFAULT_SETTINGS,
      ...receivedSettings,
      theme: {
        ...DEFAULT_SETTINGS.theme,
        ...(receivedSettings?.theme || {}),
      },
      homepage: {
        ...DEFAULT_SETTINGS.homepage,
        ...(receivedSettings?.homepage || {}),
      },
      recommendations: {
        ...DEFAULT_SETTINGS.recommendations,
        ...(receivedSettings?.recommendations || {}),
      },
      accessibility: {
        ...DEFAULT_SETTINGS.accessibility,
        ...(receivedSettings?.accessibility || {}),
      },
    };
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoadingSettings(true);
    setError("");

    try {
      const response = await fetchUXSettings();

      setSettings(normalizeSettings(response));
      setIsDirty(false);
    } catch (err) {
      setSettings(null);
      setError(
        err?.message ||
          "Could not load UX settings. Please try again."
      );
    } finally {
      setLoadingSettings(false);
    }
  };

  const updateTheme = (field, value) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      theme: {
        ...currentSettings.theme,
        [field]: value,
      },
    }));

    setIsDirty(true);
  };

  const updateHomepage = (field, value) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      homepage: {
        ...currentSettings.homepage,
        [field]: value,
      },
    }));

    setIsDirty(true);
  };

  const updateRecommendations = (field, value) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      recommendations: {
        ...currentSettings.recommendations,
        [field]: value,
      },
    }));

    setIsDirty(true);
  };

  const updateAccessibility = (field, value) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      accessibility: {
        ...currentSettings.accessibility,
        [field]: value,
      },
    }));

    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!settings) return;

    clearMessages();
    setActionLoading("save");

    try {
      const response = await updateUXSettings(settings);

      setSettings(normalizeSettings(response || settings));
      setSuccess(response?.message || "UX settings saved successfully.");
      setIsDirty(false);
    } catch (err) {
      setError(err?.message || "Could not save UX settings.");
    } finally {
      setActionLoading("");
    }
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      "Reset all UX settings to the default configuration?"
    );

    if (!confirmed) return;

    clearMessages();
    setActionLoading("reset");

    try {
      const response = await resetUXSettings();

      setSettings(normalizeSettings(response || DEFAULT_SETTINGS));
      setSuccess(response?.message || "UX settings reset successfully.");
      setIsDirty(false);
    } catch (err) {
      setError(err?.message || "Could not reset UX settings.");
    } finally {
      setActionLoading("");
    }
  };

  const handlePublish = async () => {
    if (!settings) return;

    const confirmed = window.confirm(
      "Publish the current UX settings to production?"
    );

    if (!confirmed) return;

    clearMessages();
    setActionLoading("publish");

    try {
      const response = await publishUXSettings(settings);

      setSettings(normalizeSettings(response || settings));
      setSuccess(
        response?.message || "UX settings published successfully."
      );
      setIsDirty(false);
    } catch (err) {
      setError(err?.message || "Could not publish UX settings.");
    } finally {
      setActionLoading("");
    }
  };

  const downloadExportResponse = (response, fileName) => {
    if (!response) return;

    if (typeof response === "string") {
      window.open(response, "_blank", "noopener,noreferrer");
      return;
    }

    if (response?.url) {
      window.open(response.url, "_blank", "noopener,noreferrer");
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
    }
  };

  const handleExport = async (format) => {
    clearMessages();
    setActionLoading(`export-${format}`);

    try {
      const exportFunctions = {
        csv: exportUXCSV,
        excel: exportUXExcel,
        pdf: exportUXPDF,
      };

      const exportFunction = exportFunctions[format];

      if (!exportFunction) {
        throw new Error("Invalid export format.");
      }

      const response = await exportFunction();

      downloadExportResponse(response, `ux-settings.${format}`);

      setSuccess(`UX settings exported to ${format.toUpperCase()}.`);
    } catch (err) {
      setError(
        err?.message ||
          `Could not export UX settings as ${format.toUpperCase()}.`
      );
    } finally {
      setActionLoading("");
    }
  };

  const applyPreviewTheme = () => {
    if (!settings?.theme) return;

    document.documentElement.style.setProperty(
      "--ux-primary-color",
      settings.theme.primaryColor || DEFAULT_SETTINGS.theme.primaryColor
    );

    document.documentElement.style.setProperty(
      "--ux-secondary-color",
      settings.theme.secondaryColor || DEFAULT_SETTINGS.theme.secondaryColor
    );

    document.documentElement.style.setProperty(
      "--ux-accent-color",
      settings.theme.accentColor || DEFAULT_SETTINGS.theme.accentColor
    );

    document.documentElement.style.setProperty(
      "--ux-font-family",
      settings.theme.fontFamily || DEFAULT_SETTINGS.theme.fontFamily
    );

    document.documentElement.style.setProperty(
      "--ux-font-size",
      settings.theme.fontSize || DEFAULT_SETTINGS.theme.fontSize
    );

    setSuccess("Theme preview applied to this browser session.");
  };

  if (loadingSettings && !settings) {
    return (
      <div className="px-6 py-10 text-center text-indigo-700">
        Loading UX settings...
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
          No UX settings found.
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

  const isLocked = Boolean(settings.locked);
  const isDisabled = isLocked || Boolean(actionLoading);

  return (
    <div className="ux-manager px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">
            User Experience & Personalization Manager
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Manage themes, homepage content, recommendations, accessibility, and UX publishing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDirty && (
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
              Unsaved Changes
            </span>
          )}

          {isLocked && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
              Settings Locked
            </span>
          )}

          <button
            type="button"
            onClick={loadSettings}
            disabled={loadingSettings || Boolean(actionLoading)}
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

      {isLocked && (
        <div className="mb-6 rounded-md border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
          These UX settings are locked. Editing and publishing controls are disabled.
        </div>
      )}

      <section className="mb-6 rounded-lg border bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-indigo-900">
              Theme Management
            </h2>
            <p className="text-sm text-gray-600">
              Configure the visual style used across the customer experience.
            </p>
          </div>

          <button
            type="button"
            onClick={applyPreviewTheme}
            disabled={isDisabled}
            className="rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Preview Theme
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Theme Mode
            </label>

            <select
              value={settings.theme.mode}
              onChange={(event) => updateTheme("mode", event.target.value)}
              disabled={isDisabled}
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">System Auto</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Layout
            </label>

            <select
              value={settings.theme.layout}
              onChange={(event) => updateTheme("layout", event.target.value)}
              disabled={isDisabled}
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="standard">Standard</option>
              <option value="compact">Compact</option>
              <option value="wide">Wide</option>
              <option value="minimal">Minimal</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Font Family
            </label>

            <input
              type="text"
              value={settings.theme.fontFamily}
              onChange={(event) =>
                updateTheme("fontFamily", event.target.value)
              }
              disabled={isDisabled}
              placeholder="Inter, sans-serif"
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Font Size
            </label>

            <select
              value={settings.theme.fontSize}
              onChange={(event) => updateTheme("fontSize", event.target.value)}
              disabled={isDisabled}
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="14px">Small - 14px</option>
              <option value="16px">Medium - 16px</option>
              <option value="18px">Large - 18px</option>
              <option value="20px">Extra Large - 20px</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Primary Color
            </label>

            <div className="flex gap-2">
              <input
                type="color"
                value={settings.theme.primaryColor}
                onChange={(event) =>
                  updateTheme("primaryColor", event.target.value)
                }
                disabled={isDisabled}
                className="h-10 w-12 rounded border p-1 disabled:cursor-not-allowed"
              />

              <input
                type="text"
                value={settings.theme.primaryColor}
                onChange={(event) =>
                  updateTheme("primaryColor", event.target.value)
                }
                disabled={isDisabled}
                className="min-w-0 flex-1 rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Secondary Color
            </label>

            <div className="flex gap-2">
              <input
                type="color"
                value={settings.theme.secondaryColor}
                onChange={(event) =>
                  updateTheme("secondaryColor", event.target.value)
                }
                disabled={isDisabled}
                className="h-10 w-12 rounded border p-1 disabled:cursor-not-allowed"
              />

              <input
                type="text"
                value={settings.theme.secondaryColor}
                onChange={(event) =>
                  updateTheme("secondaryColor", event.target.value)
                }
                disabled={isDisabled}
                className="min-w-0 flex-1 rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Accent Color
            </label>

            <div className="flex gap-2">
              <input
                type="color"
                value={settings.theme.accentColor}
                onChange={(event) =>
                  updateTheme("accentColor", event.target.value)
                }
                disabled={isDisabled}
                className="h-10 w-12 rounded border p-1 disabled:cursor-not-allowed"
              />

              <input
                type="text"
                value={settings.theme.accentColor}
                onChange={(event) =>
                  updateTheme("accentColor", event.target.value)
                }
                disabled={isDisabled}
                className="min-w-0 flex-1 rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Border Radius
            </label>

            <select
              value={settings.theme.borderRadius}
              onChange={(event) =>
                updateTheme("borderRadius", event.target.value)
              }
              disabled={isDisabled}
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="0px">None</option>
              <option value="4px">Small</option>
              <option value="8px">Medium</option>
              <option value="12px">Large</option>
              <option value="16px">Extra Large</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Default Spacing
            </label>

            <select
              value={settings.theme.spacing}
              onChange={(event) => updateTheme("spacing", event.target.value)}
              disabled={isDisabled}
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="8px">Compact - 8px</option>
              <option value="12px">Small - 12px</option>
              <option value="16px">Medium - 16px</option>
              <option value="24px">Large - 24px</option>
              <option value="32px">Extra Large - 32px</option>
            </select>
          </div>
        </div>

        <div className="mt-5 rounded-lg border p-4">
          <p className="mb-3 text-sm font-medium text-gray-700">
            Theme Preview
          </p>

          <div
            className="rounded-lg p-4 text-white"
            style={{
              backgroundColor:
                settings.theme.primaryColor ||
                DEFAULT_SETTINGS.theme.primaryColor,
              borderRadius:
                settings.theme.borderRadius ||
                DEFAULT_SETTINGS.theme.borderRadius,
              fontFamily:
                settings.theme.fontFamily ||
                DEFAULT_SETTINGS.theme.fontFamily,
            }}
          >
            <p className="text-lg font-bold">Your Store Preview</p>
            <p className="mt-1 text-sm opacity-90">
              Preview of the primary color, typography, and border radius.
            </p>

            <button
              type="button"
              className="mt-3 px-3 py-2 text-sm font-medium"
              style={{
                backgroundColor:
                  settings.theme.accentColor ||
                  DEFAULT_SETTINGS.theme.accentColor,
                color:
                  settings.theme.secondaryColor ||
                  DEFAULT_SETTINGS.theme.secondaryColor,
                borderRadius:
                  settings.theme.borderRadius ||
                  DEFAULT_SETTINGS.theme.borderRadius,
              }}
            >
              Example Button
            </button>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-lg border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-indigo-900">
            Homepage Personalization
          </h2>

          <p className="text-sm text-gray-600">
            Configure the key homepage content and visibility of storefront sections.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Hero Title
            </label>

            <input
              type="text"
              value={settings.homepage.heroTitle || ""}
              onChange={(event) =>
                updateHomepage("heroTitle", event.target.value)
              }
              disabled={isDisabled}
              placeholder="Welcome to our store"
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Hero Button Text
            </label>

            <input
              type="text"
              value={settings.homepage.heroButtonText || ""}
              onChange={(event) =>
                updateHomepage("heroButtonText", event.target.value)
              }
              disabled={isDisabled}
              placeholder="Shop Now"
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Hero Subtitle
            </label>

            <input
              type="text"
              value={settings.homepage.heroSubtitle || ""}
              onChange={(event) =>
                updateHomepage("heroSubtitle", event.target.value)
              }
              disabled={isDisabled}
              placeholder="Discover products you will love"
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Hero Button Link
            </label>

            <input
              type="text"
              value={settings.homepage.heroButtonLink || ""}
              onChange={(event) =>
                updateHomepage("heroButtonLink", event.target.value)
              }
              disabled={isDisabled}
              placeholder="/products"
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Featured Products Title
            </label>

            <input
              type="text"
              value={settings.homepage.featuredTitle || ""}
              onChange={(event) =>
                updateHomepage("featuredTitle", event.target.value)
              }
              disabled={isDisabled}
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Categories Title
            </label>

            <input
              type="text"
              value={settings.homepage.categoriesTitle || ""}
              onChange={(event) =>
                updateHomepage("categoriesTitle", event.target.value)
              }
              disabled={isDisabled}
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex items-center gap-3 rounded-md border p-3">
            <input
              type="checkbox"
              checked={Boolean(settings.homepage.showFeaturedProducts)}
              onChange={(event) =>
                updateHomepage(
                  "showFeaturedProducts",
                  event.target.checked
                )
              }
              disabled={isDisabled}
            />
            <span className="text-sm text-gray-700">
              Show Featured Products
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-md border p-3">
            <input
              type="checkbox"
              checked={Boolean(settings.homepage.showCategories)}
              onChange={(event) =>
                updateHomepage("showCategories", event.target.checked)
              }
              disabled={isDisabled}
            />
            <span className="text-sm text-gray-700">
              Show Categories
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-md border p-3">
            <input
              type="checkbox"
              checked={Boolean(settings.homepage.showBanners)}
              onChange={(event) =>
                updateHomepage("showBanners", event.target.checked)
              }
              disabled={isDisabled}
            />
            <span className="text-sm text-gray-700">
              Show Banners
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-md border p-3">
            <input
              type="checkbox"
              checked={Boolean(settings.homepage.showRecommendations)}
              onChange={(event) =>
                updateHomepage(
                  "showRecommendations",
                  event.target.checked
                )
              }
              disabled={isDisabled}
            />
            <span className="text-sm text-gray-700">
              Show Recommendations
            </span>
          </label>
        </div>
      </section>

      <section className="mb-6 rounded-lg border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-indigo-900">
            Recommendation Engine
          </h2>

          <p className="text-sm text-gray-600">
            Control personalized product recommendations across the storefront.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Recommendation Strategy
            </label>

            <select
              value={settings.recommendations.strategy || "personalized"}
              onChange={(event) =>
                updateRecommendations("strategy", event.target.value)
              }
              disabled={isDisabled}
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="personalized">Personalized</option>
              <option value="trending">Trending Products</option>
              <option value="popular">Popular Products</option>
              <option value="recent">Recently Added</option>
              <option value="manual">Manual Merchandising</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Maximum Items
            </label>

            <input
              type="number"
              min="1"
              max="50"
              value={settings.recommendations.maxItems ?? 8}
              onChange={(event) =>
                updateRecommendations(
                  "maxItems",
                  Math.max(1, Number(event.target.value || 1))
                )
              }
              disabled={isDisabled}
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>

          <label className="flex items-center gap-3 rounded-md border p-3 md:mt-6">
            <input
              type="checkbox"
              checked={Boolean(settings.recommendations.enabled)}
              onChange={(event) =>
                updateRecommendations("enabled", event.target.checked)
              }
              disabled={isDisabled}
            />
            <span className="text-sm text-gray-700">
              Enable Recommendations
            </span>
          </label>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex items-center gap-3 rounded-md border p-3">
            <input
              type="checkbox"
              checked={Boolean(
                settings.recommendations.showRecentlyViewed
              )}
              onChange={(event) =>
                updateRecommendations(
                  "showRecentlyViewed",
                  event.target.checked
                )
              }
              disabled={isDisabled}
            />
            <span className="text-sm text-gray-700">
              Show Recently Viewed
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-md border p-3">
            <input
              type="checkbox"
              checked={Boolean(
                settings.recommendations.showFrequentlyBoughtTogether
              )}
              onChange={(event) =>
                updateRecommendations(
                  "showFrequentlyBoughtTogether",
                  event.target.checked
                )
              }
              disabled={isDisabled}
            />
            <span className="text-sm text-gray-700">
              Show Frequently Bought Together
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-md border p-3">
            <input
              type="checkbox"
              checked={Boolean(
                settings.recommendations.showTrendingProducts
              )}
              onChange={(event) =>
                updateRecommendations(
                  "showTrendingProducts",
                  event.target.checked
                )
              }
              disabled={isDisabled}
            />
            <span className="text-sm text-gray-700">
              Show Trending Products
            </span>
          </label>
        </div>
      </section>

      <section className="mb-6 rounded-lg border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-indigo-900">
            Accessibility Settings
          </h2>

          <p className="text-sm text-gray-600">
            Improve usability for visitors with different accessibility needs.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex items-center gap-3 rounded-md border p-3">
            <input
              type="checkbox"
              checked={Boolean(settings.accessibility.highContrast)}
              onChange={(event) =>
                updateAccessibility("highContrast", event.target.checked)
              }
              disabled={isDisabled}
            />
            <span className="text-sm text-gray-700">
              High Contrast Mode
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-md border p-3">
            <input
              type="checkbox"
              checked={Boolean(settings.accessibility.reducedMotion)}
              onChange={(event) =>
                updateAccessibility("reducedMotion", event.target.checked)
              }
              disabled={isDisabled}
            />
            <span className="text-sm text-gray-700">
              Reduced Motion
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-md border p-3">
            <input
              type="checkbox"
              checked={Boolean(settings.accessibility.largerText)}
              onChange={(event) =>
                updateAccessibility("largerText", event.target.checked)
              }
              disabled={isDisabled}
            />
            <span className="text-sm text-gray-700">
              Larger Text
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-md border p-3">
            <input
              type="checkbox"
              checked={Boolean(
                settings.accessibility.keyboardNavigation
              )}
              onChange={(event) =>
                updateAccessibility(
                  "keyboardNavigation",
                  event.target.checked
                )
              }
              disabled={isDisabled}
            />
            <span className="text-sm text-gray-700">
              Keyboard Navigation
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-md border p-3">
            <input
              type="checkbox"
              checked={Boolean(
                settings.accessibility.showFocusIndicators
              )}
              onChange={(event) =>
                updateAccessibility(
                  "showFocusIndicators",
                  event.target.checked
                )
              }
              disabled={isDisabled}
            />
            <span className="text-sm text-gray-700">
              Show Focus Indicators
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-md border p-3">
            <input
              type="checkbox"
              checked={Boolean(
                settings.accessibility.screenReaderLabels
              )}
              onChange={(event) =>
                updateAccessibility(
                  "screenReaderLabels",
                  event.target.checked
                )
              }
              disabled={isDisabled}
            />
            <span className="text-sm text-gray-700">
              Screen Reader Labels
            </span>
          </label>
        </div>
      </section>

      <section className="flex flex-wrap gap-3 border-t pt-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={isDisabled || !isDirty}
          className="rounded-md bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLoading === "save" ? "Saving..." : "Save Settings"}
        </button>

        <button
          type="button"
          onClick={handlePublish}
          disabled={isDisabled}
          className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLoading === "publish" ? "Publishing..." : "Publish Settings"}
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={isDisabled}
          className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLoading === "reset" ? "Resetting..." : "Reset Settings"}
        </button>

        <button
          type="button"
          onClick={() => handleExport("csv")}
          disabled={Boolean(actionLoading)}
          className="rounded-md bg-yellow-500 px-4 py-2 text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLoading === "export-csv" ? "Exporting..." : "Export CSV"}
        </button>

        <button
          type="button"
          onClick={() => handleExport("excel")}
          disabled={Boolean(actionLoading)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLoading === "export-excel"
            ? "Exporting..."
            : "Export Excel"}
        </button>

        <button
          type="button"
          onClick={() => handleExport("pdf")}
          disabled={Boolean(actionLoading)}
          className="rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLoading === "export-pdf" ? "Exporting..." : "Export PDF"}
        </button>
      </section>
    </div>
  );
}

export default UXManager;