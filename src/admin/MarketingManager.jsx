import React, { useEffect, useMemo, useState } from "react";
import {
  fetchCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  activateCampaign,
  pauseCampaign,
  resumeCampaign,
  fetchAudienceGroups,
  fetchCampaignAnalytics,
  exportCampaignCSV,
  exportCampaignExcel,
  exportCampaignPDF,
  scheduleCampaign,
  fetchCampaignHistory,
  logAuditEvent,
} from "../utils/api";

const PAGE_SIZE = 10;

const EMPTY_CAMPAIGN = {
  name: "",
  description: "",
  channel: "email",
  status: "draft",
  audienceIds: [],
  content: {},
  schedule: { type: "immediate" },
  promotions: [],
};

function MarketingManager() {
  const [campaigns, setCampaigns] = useState([]);
  const [audienceGroups, setAudienceGroups] = useState([]);
  const [history, setHistory] = useState([]);

  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [analyticsLoadingId, setAnalyticsLoadingId] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCampaigns, setTotalCampaigns] = useState(0);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("createdAt_desc");

  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [campaignForm, setCampaignForm] = useState(EMPTY_CAMPAIGN);
  const [contentText, setContentText] = useState("{}");
  const [contentError, setContentError] = useState("");

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [campaignToSchedule, setCampaignToSchedule] = useState(null);
  const [scheduleDraft, setScheduleDraft] = useState({
    type: "immediate",
    startAt: "",
    endAt: "",
  });

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyCampaign, setHistoryCampaign] = useState(null);

  const [showExportMenu, setShowExportMenu] = useState(false);

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      channel: filterChannel,
      status: filterStatus,
      start: dateFrom,
      end: dateTo,
      sort: sortBy,
    }),
    [
      debouncedSearch,
      filterChannel,
      filterStatus,
      dateFrom,
      dateTo,
      sortBy,
    ]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    loadCampaigns();
  }, [
    page,
    filters.search,
    filters.channel,
    filters.status,
    filters.start,
    filters.end,
    filters.sort,
  ]);

  useEffect(() => {
    loadAudienceGroups();
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

  const getStatusClass = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (normalized === "active" || normalized === "completed") {
      return "bg-green-100 text-green-700";
    }

    if (normalized === "paused") {
      return "bg-yellow-100 text-yellow-800";
    }

    if (normalized === "scheduled") {
      return "bg-blue-100 text-blue-700";
    }

    if (normalized === "archived") {
      return "bg-gray-200 text-gray-700";
    }

    return "bg-gray-100 text-gray-700";
  };

  const getChannelClass = (channel) => {
    const normalized = String(channel || "").toLowerCase();

    if (normalized === "email") return "bg-blue-100 text-blue-700";
    if (normalized === "sms") return "bg-green-100 text-green-700";
    if (normalized === "push") return "bg-purple-100 text-purple-700";
    if (normalized === "banner") return "bg-orange-100 text-orange-700";
    if (normalized === "social") return "bg-pink-100 text-pink-700";

    return "bg-gray-100 text-gray-700";
  };

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  };

  const formatNumber = (value) => {
    const number = Number(value || 0);
    return number.toLocaleString("en-IN");
  };

  const writeAuditLog = async (action, resourceId, details) => {
    try {
      await logAuditEvent({
        action,
        details: details || "",
        resourceType: "campaign",
        resourceId: resourceId || "",
      });
    } catch {
      // Main action should not fail if audit logging fails.
    }
  };

  const loadCampaigns = async () => {
    setLoadingCampaigns(true);
    setError("");

    try {
      const response = await fetchCampaigns({
        page,
        pageSize: PAGE_SIZE,
        search: filters.search,
        channel:
          filters.channel === "all" ? undefined : filters.channel,
        status: filters.status === "all" ? undefined : filters.status,
        start: filters.start || undefined,
        end: filters.end || undefined,
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

      setCampaigns(items);
      setTotalPages(Math.max(1, receivedTotalPages));
      setTotalCampaigns(receivedTotal);
    } catch (err) {
      setCampaigns([]);
      setError(
        err?.message || "Could not load campaigns. Please try again."
      );
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const loadAudienceGroups = async () => {
    setLoadingSummary(true);

    try {
      const response = await fetchAudienceGroups({ search: "" });
      setAudienceGroups(getItems(response));
    } catch (err) {
      setError(
        err?.message || "Could not load audience groups."
      );
    } finally {
      setLoadingSummary(false);
    }
  };

  const refreshMarketingData = async () => {
    clearMessages();

    await Promise.all([loadCampaigns(), loadAudienceGroups()]);

    setSuccess("Marketing data refreshed successfully.");
  };

  const openNewCampaignModal = () => {
    clearMessages();

    setEditingCampaign(null);
    setCampaignForm({
      ...EMPTY_CAMPAIGN,
      audienceIds: [],
      promotions: [],
      content: {},
      schedule: { type: "immediate" },
    });

    setContentText("{}");
    setContentError("");
    setShowCampaignModal(true);
  };

  const openEditCampaignModal = (campaign) => {
    clearMessages();

    const normalizedCampaign = {
      ...EMPTY_CAMPAIGN,
      ...campaign,
      audienceIds: Array.isArray(campaign?.audienceIds)
        ? campaign.audienceIds
        : [],
      promotions: Array.isArray(campaign?.promotions)
        ? campaign.promotions
        : [],
      content: campaign?.content || {},
      schedule: campaign?.schedule || { type: "immediate" },
    };

    setEditingCampaign(campaign);
    setCampaignForm(normalizedCampaign);

    try {
      setContentText(JSON.stringify(normalizedCampaign.content || {}, null, 2));
    } catch {
      setContentText("{}");
    }

    setContentError("");
    setShowCampaignModal(true);
  };

  const closeCampaignModal = () => {
    setShowCampaignModal(false);
    setEditingCampaign(null);
    setCampaignForm(EMPTY_CAMPAIGN);
    setContentText("{}");
    setContentError("");
  };

  const toggleAudience = (audienceId) => {
    setCampaignForm((currentForm) => {
      const currentIds = Array.isArray(currentForm.audienceIds)
        ? currentForm.audienceIds
        : [];

      const audienceIds = currentIds.includes(audienceId)
        ? currentIds.filter((id) => id !== audienceId)
        : [...currentIds, audienceId];

      return {
        ...currentForm,
        audienceIds,
      };
    });
  };

  const updateCampaignForm = (field, value) => {
    setCampaignForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const addPromotion = () => {
    setCampaignForm((currentForm) => ({
      ...currentForm,
      promotions: [
        ...(currentForm.promotions || []),
        {
          code: "",
          type: "percentage",
          value: 10,
        },
      ],
    }));
  };

  const updatePromotion = (index, field, value) => {
    setCampaignForm((currentForm) => {
      const promotions = [...(currentForm.promotions || [])];

      promotions[index] = {
        ...(promotions[index] || {}),
        [field]: value,
      };

      return {
        ...currentForm,
        promotions,
      };
    });
  };

  const removePromotion = (index) => {
    setCampaignForm((currentForm) => ({
      ...currentForm,
      promotions: (currentForm.promotions || []).filter(
        (_, promotionIndex) => promotionIndex !== index
      ),
    }));
  };

  const handleContentChange = (value) => {
    setContentText(value);

    try {
      const parsedContent = value.trim() ? JSON.parse(value) : {};

      setCampaignForm((currentForm) => ({
        ...currentForm,
        content: parsedContent,
      }));

      setContentError("");
    } catch {
      setContentError("Content must be valid JSON before saving.");
    }
  };

  const saveCampaign = async () => {
    const campaignName = campaignForm.name.trim();

    if (!campaignName) {
      setError("Campaign name is required.");
      return;
    }

    if (!campaignForm.channel) {
      setError("Select a campaign channel.");
      return;
    }

    if (contentError) {
      setError("Fix the content JSON before saving.");
      return;
    }

    clearMessages();
    setActionLoading("save-campaign");

    try {
      const campaignPayload = {
        ...campaignForm,
        name: campaignName,
        description: campaignForm.description?.trim() || "",
        audienceIds: Array.isArray(campaignForm.audienceIds)
          ? campaignForm.audienceIds
          : [],
        promotions: Array.isArray(campaignForm.promotions)
          ? campaignForm.promotions
          : [],
      };

      if (campaignPayload.id) {
        const response = await updateCampaign({
          campaign: campaignPayload,
        });

        await writeAuditLog(
          "CAMPAIGN_UPDATE",
          campaignPayload.id,
          `Updated campaign: ${campaignPayload.name}`
        );

        setSuccess(response?.message || "Campaign updated successfully.");
      } else {
        const response = await createCampaign({
          campaign: campaignPayload,
        });

        const newCampaignId = response?.id || response?.campaign?.id || "";

        await writeAuditLog(
          "CAMPAIGN_CREATE",
          newCampaignId,
          `Created campaign: ${campaignPayload.name}`
        );

        setSuccess(response?.message || "Campaign created successfully.");
      }

      closeCampaignModal();
      await loadCampaigns();
    } catch (err) {
      setError(err?.message || "Could not save campaign.");
    } finally {
      setActionLoading("");
    }
  };

  const handleCampaignAction = async (campaign, action) => {
    if (!campaign?.id) return;

    clearMessages();
    setActionLoading(`${action}-${campaign.id}`);

    try {
      let response;

      if (action === "activate") {
        response = await activateCampaign({ id: campaign.id });
      }

      if (action === "pause") {
        response = await pauseCampaign({ id: campaign.id });
      }

      if (action === "resume") {
        response = await resumeCampaign({ id: campaign.id });
      }

      await writeAuditLog(
        `CAMPAIGN_${action.toUpperCase()}`,
        campaign.id,
        `${action} campaign: ${campaign.name || campaign.id}`
      );

      setSuccess(
        response?.message ||
          `Campaign ${action === "activate" ? "activated" : action === "pause" ? "paused" : "resumed"} successfully.`
      );

      await loadCampaigns();
    } catch (err) {
      setError(
        err?.message ||
          `Could not ${action} this campaign.`
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleDeleteCampaign = async (campaign) => {
    if (!campaign?.id) return;

    const confirmed = window.confirm(
      `Delete campaign "${campaign.name || campaign.id}" permanently?`
    );

    if (!confirmed) return;

    clearMessages();
    setActionLoading(`delete-${campaign.id}`);

    try {
      const response = await deleteCampaign({ id: campaign.id });

      await writeAuditLog(
        "CAMPAIGN_DELETE",
        campaign.id,
        `Deleted campaign: ${campaign.name || campaign.id}`
      );

      setSuccess(response?.message || "Campaign deleted successfully.");

      await loadCampaigns();
    } catch (err) {
      setError(err?.message || "Could not delete campaign.");
    } finally {
      setActionLoading("");
    }
  };

  const loadCampaignAnalytics = async (campaign) => {
    if (!campaign?.id) return;

    clearMessages();
    setAnalyticsLoadingId(campaign.id);

    try {
      const response = await fetchCampaignAnalytics({
        campaignId: campaign.id,
      });

      setCampaigns((currentCampaigns) =>
        currentCampaigns.map((item) =>
          item.id === campaign.id
            ? {
                ...item,
                analytics: response || null,
              }
            : item
        )
      );
    } catch (err) {
      setError(err?.message || "Could not load campaign analytics.");
    } finally {
      setAnalyticsLoadingId("");
    }
  };

  const openScheduleModal = (campaign) => {
    clearMessages();

    setCampaignToSchedule(campaign);
    setScheduleDraft({
      type: campaign?.schedule?.type || "immediate",
      startAt: campaign?.schedule?.startAt || "",
      endAt: campaign?.schedule?.endAt || "",
      cron: campaign?.schedule?.cron || "",
    });

    setShowScheduleModal(true);
  };

  const closeScheduleModal = () => {
    setCampaignToSchedule(null);
    setScheduleDraft({
      type: "immediate",
      startAt: "",
      endAt: "",
      cron: "",
    });

    setShowScheduleModal(false);
  };

  const saveSchedule = async () => {
    if (!campaignToSchedule?.id) return;

    if (
      scheduleDraft.type === "scheduled" &&
      !scheduleDraft.startAt
    ) {
      setError("Select a start date and time for the scheduled campaign.");
      return;
    }

    clearMessages();
    setActionLoading(`schedule-${campaignToSchedule.id}`);

    try {
      const response = await scheduleCampaign({
        id: campaignToSchedule.id,
        schedule: {
          type: scheduleDraft.type,
          startAt: scheduleDraft.startAt || null,
          endAt: scheduleDraft.endAt || null,
          cron: scheduleDraft.cron || null,
        },
      });

      await writeAuditLog(
        "CAMPAIGN_SCHEDULE",
        campaignToSchedule.id,
        `Updated schedule type: ${scheduleDraft.type}`
      );

      setSuccess(response?.message || "Campaign schedule updated.");

      closeScheduleModal();
      await loadCampaigns();
    } catch (err) {
      setError(err?.message || "Could not schedule campaign.");
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

  const handleExport = async (format, campaign) => {
    clearMessages();
    setActionLoading(`export-${format}-${campaign?.id || "all"}`);

    try {
      const exportFunctions = {
        csv: exportCampaignCSV,
        excel: exportCampaignExcel,
        pdf: exportCampaignPDF,
      };

      const exportFunction = exportFunctions[format];

      if (!exportFunction) {
        throw new Error("Invalid export format.");
      }

      const response = await exportFunction({
        ...(campaign?.id ? { campaignId: campaign.id } : {}),
        filters: {
          search: debouncedSearch,
          channel:
            filterChannel === "all" ? undefined : filterChannel,
          status:
            filterStatus === "all" ? undefined : filterStatus,
          start: dateFrom || undefined,
          end: dateTo || undefined,
        },
      });

      downloadExportResponse(
        response,
        campaign?.id
          ? `campaign-${campaign.id}.${format}`
          : `campaigns-report.${format}`
      );

      await writeAuditLog(
        `CAMPAIGN_EXPORT_${format.toUpperCase()}`,
        campaign?.id || "",
        campaign?.id
          ? `Exported campaign: ${campaign.name || campaign.id}`
          : `Exported all campaigns in ${format.toUpperCase()} format`
      );

      setSuccess(
        campaign?.id
          ? `Campaign exported to ${format.toUpperCase()}.`
          : `Campaign report exported to ${format.toUpperCase()}.`
      );
    } catch (err) {
      setError(
        err?.message ||
          `Could not export ${format.toUpperCase()} report.`
      );
    } finally {
      setActionLoading("");
    }
  };

  const openHistoryModal = async (campaign) => {
    if (!campaign?.id) return;

    clearMessages();
    setHistoryCampaign(campaign);
    setShowHistoryModal(true);
    setHistory([]);
    setActionLoading(`history-${campaign.id}`);

    try {
      const response = await fetchCampaignHistory({
        campaignId: campaign.id,
        page: 1,
        pageSize: 50,
      });

      setHistory(getItems(response));
    } catch (err) {
      setError(err?.message || "Could not load campaign history.");
    } finally {
      setActionLoading("");
    }
  };

  const closeHistoryModal = () => {
    setShowHistoryModal(false);
    setHistoryCampaign(null);
    setHistory([]);
  };

  const activeCampaigns = campaigns.filter(
    (campaign) => campaign.status === "active"
  ).length;

  const scheduledCampaigns = campaigns.filter(
    (campaign) => campaign.status === "scheduled"
  ).length;

  return (
    <div className="marketing-manager px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">
            Marketing & Campaign Manager
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Create, schedule, manage, export, and analyze marketing campaigns.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openNewCampaignModal}
            disabled={Boolean(actionLoading)}
            className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            New Campaign
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu((current) => !current)}
              disabled={Boolean(actionLoading)}
              className="rounded-md bg-yellow-500 px-4 py-2 text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Export All
            </button>

            {showExportMenu && (
              <div className="absolute right-0 z-30 mt-2 w-44 rounded-md border bg-white p-2 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    handleExport("csv");
                  }}
                  className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-100"
                >
                  Export CSV
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    handleExport("excel");
                  }}
                  className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-100"
                >
                  Export Excel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    handleExport("pdf");
                  }}
                  className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-100"
                >
                  Export PDF
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={refreshMarketingData}
            disabled={
              loadingCampaigns ||
              loadingSummary ||
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

      <section className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-indigo-900">
          Campaign Filters
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search campaigns..."
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          />

          <select
            value={filterChannel}
            onChange={(event) => {
              setFilterChannel(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          >
            <option value="all">All Channels</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="push">Push</option>
            <option value="banner">Banner</option>
            <option value="social">Social</option>
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
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          />

          <select
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          >
            <option value="createdAt_desc">Newest First</option>
            <option value="createdAt_asc">Oldest First</option>
            <option value="updatedAt_desc">Recently Updated</option>
            <option value="name_asc">Name A-Z</option>
          </select>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Campaigns</p>
          <p className="mt-1 text-2xl font-bold text-indigo-900">
            {totalCampaigns}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Active Campaigns</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {activeCampaigns}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Scheduled Campaigns</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">
            {scheduledCampaigns}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Audience Groups</p>
          <p className="mt-1 text-2xl font-bold text-purple-600">
            {audienceGroups.length}
          </p>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-indigo-900">
              Campaigns
            </h2>
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
          </div>

          {loadingSummary && (
            <span className="text-sm text-gray-500">
              Loading audience groups...
            </span>
          )}
        </div>

        {loadingCampaigns && campaigns.length === 0 ? (
          <p className="py-8 text-center text-indigo-700">
            Loading campaigns...
          </p>
        ) : campaigns.length === 0 ? (
          <p className="py-8 text-center text-gray-600">
            No campaigns found.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {campaigns.map((campaign) => {
              const analytics = campaign.analytics || {};

              return (
                <article
                  key={campaign.id || campaign.name}
                  className="rounded-lg border bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold text-indigo-900">
                        {campaign.name || "Untitled Campaign"}
                      </h3>

                      <p className="mt-1 text-sm text-gray-600">
                        {campaign.description || "No description provided."}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getChannelClass(
                            campaign.channel
                          )}`}
                        >
                          {campaign.channel || "unknown"}
                        </span>

                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                            campaign.status
                          )}`}
                        >
                          {campaign.status || "draft"}
                        </span>
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-500">
                      <p>Created: {formatDate(campaign.createdAt)}</p>
                      <p>Updated: {formatDate(campaign.updatedAt)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded bg-gray-50 p-2">
                      <p className="text-xs text-gray-500">Audience Groups</p>
                      <p className="font-semibold text-indigo-900">
                        {Array.isArray(campaign.audienceIds)
                          ? campaign.audienceIds.length
                          : 0}
                      </p>
                    </div>

                    <div className="rounded bg-gray-50 p-2">
                      <p className="text-xs text-gray-500">Promotions</p>
                      <p className="font-semibold text-indigo-900">
                        {Array.isArray(campaign.promotions)
                          ? campaign.promotions.length
                          : 0}
                      </p>
                    </div>
                  </div>

                  {campaign.schedule?.type &&
                    campaign.schedule.type !== "immediate" && (
                      <div className="mt-3 rounded bg-blue-50 p-2 text-sm text-blue-700">
                        Schedule: {campaign.schedule.type}
                        {campaign.schedule.startAt
                          ? ` • Starts ${formatDate(
                              campaign.schedule.startAt
                            )}`
                          : ""}
                      </div>
                    )}

                  {campaign.analytics && (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded border p-2 text-sm">
                        <p className="text-xs text-gray-500">Sent</p>
                        <p className="font-semibold">
                          {formatNumber(analytics.sent)}
                        </p>
                      </div>

                      <div className="rounded border p-2 text-sm">
                        <p className="text-xs text-gray-500">Delivered</p>
                        <p className="font-semibold">
                          {formatNumber(analytics.delivered)}
                        </p>
                      </div>

                      <div className="rounded border p-2 text-sm">
                        <p className="text-xs text-gray-500">Open Rate</p>
                        <p className="font-semibold">
                          {Number(analytics.openRate || 0).toFixed(2)}%
                        </p>
                      </div>

                      <div className="rounded border p-2 text-sm">
                        <p className="text-xs text-gray-500">Click Rate</p>
                        <p className="font-semibold">
                          {Number(analytics.clickRate || 0).toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditCampaignModal(campaign)}
                      disabled={Boolean(actionLoading)}
                      className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => loadCampaignAnalytics(campaign)}
                      disabled={
                        Boolean(actionLoading) ||
                        analyticsLoadingId === campaign.id
                      }
                      className="rounded-md bg-indigo-700 px-3 py-1.5 text-sm text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {analyticsLoadingId === campaign.id
                        ? "Loading..."
                        : "Analytics"}
                    </button>

                    {campaign.status === "draft" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleCampaignAction(campaign, "activate")
                        }
                        disabled={Boolean(actionLoading)}
                        className="rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Activate
                      </button>
                    )}

                    {campaign.status === "active" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleCampaignAction(campaign, "pause")
                        }
                        disabled={Boolean(actionLoading)}
                        className="rounded-md bg-yellow-500 px-3 py-1.5 text-sm text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Pause
                      </button>
                    )}

                    {campaign.status === "paused" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleCampaignAction(campaign, "resume")
                        }
                        disabled={Boolean(actionLoading)}
                        className="rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Resume
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openScheduleModal(campaign)}
                      disabled={Boolean(actionLoading)}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Schedule
                    </button>

                    <button
                      type="button"
                      onClick={() => openHistoryModal(campaign)}
                      disabled={Boolean(actionLoading)}
                      className="rounded-md bg-gray-200 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      History
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExport("csv", campaign)}
                      disabled={Boolean(actionLoading)}
                      className="rounded-md bg-yellow-500 px-3 py-1.5 text-sm text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      CSV
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExport("excel", campaign)}
                      disabled={Boolean(actionLoading)}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Excel
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExport("pdf", campaign)}
                      disabled={Boolean(actionLoading)}
                      className="rounded-md bg-purple-600 px-3 py-1.5 text-sm text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      PDF
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCampaign(campaign)}
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

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              setPage((currentPage) => Math.max(1, currentPage - 1))
            }
            disabled={page <= 1 || loadingCampaigns}
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
            disabled={page >= totalPages || loadingCampaigns}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </section>

      {showCampaignModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white p-4">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  {editingCampaign?.id ? "Edit Campaign" : "Create Campaign"}
                </h2>
                <p className="text-sm text-gray-500">
                  Configure campaign content, audience, channel, and promotions.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCampaignModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Campaign Name
                </label>
                <input
                  value={campaignForm.name}
                  onChange={(event) =>
                    updateCampaignForm("name", event.target.value)
                  }
                  placeholder="Summer Sale Campaign"
                  className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={campaignForm.description || ""}
                  onChange={(event) =>
                    updateCampaignForm("description", event.target.value)
                  }
                  rows={3}
                  placeholder="Internal description for this campaign"
                  className="w-full rounded-md border p-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Channel
                  </label>
                  <select
                    value={campaignForm.channel}
                    onChange={(event) =>
                      updateCampaignForm("channel", event.target.value)
                    }
                    className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="push">Push Notification</option>
                    <option value="banner">Banner</option>
                    <option value="social">Social</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    value={campaignForm.status || "draft"}
                    onChange={(event) =>
                      updateCampaignForm("status", event.target.value)
                    }
                    className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Audience Groups
                </label>

                <div className="max-h-48 overflow-y-auto rounded-md border p-3">
                  {audienceGroups.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No audience groups available.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {audienceGroups.map((group) => (
                        <label
                          key={group.id}
                          className="flex cursor-pointer items-start gap-2 rounded p-2 hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={campaignForm.audienceIds.includes(
                              group.id
                            )}
                            onChange={() => toggleAudience(group.id)}
                            className="mt-1"
                          />

                          <span>
                            <span className="block text-sm font-medium text-gray-800">
                              {group.name}
                            </span>

                            <span className="block text-xs text-gray-500">
                              {group.description || "No description"}
                              {group.memberCount !== undefined
                                ? ` • ${group.memberCount} members`
                                : ""}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Channel Content JSON
                </label>

                <textarea
                  value={contentText}
                  onChange={(event) =>
                    handleContentChange(event.target.value)
                  }
                  rows={8}
                  placeholder='{"subject":"Sale starts now","body":"Save up to 50%"}'
                  className={`w-full rounded-md border p-3 font-mono text-sm outline-none ${
                    contentError
                      ? "border-red-500 focus:border-red-500"
                      : "focus:border-indigo-500"
                  }`}
                />

                {contentError ? (
                  <p className="mt-1 text-xs text-red-600">
                    {contentError}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    Enter valid JSON for the selected campaign channel.
                  </p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Promotions
                  </label>

                  <button
                    type="button"
                    onClick={addPromotion}
                    className="rounded-md bg-yellow-500 px-3 py-1.5 text-sm text-indigo-950 hover:bg-yellow-400"
                  >
                    Add Promotion
                  </button>
                </div>

                {campaignForm.promotions.length === 0 ? (
                  <p className="rounded-md border border-dashed p-3 text-sm text-gray-500">
                    No promotions added.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {campaignForm.promotions.map((promotion, index) => (
                      <div
                        key={`${promotion.id || "new"}-${index}`}
                        className="grid grid-cols-1 gap-2 rounded-md border p-3 md:grid-cols-5"
                      >
                        <input
                          value={promotion.code || ""}
                          onChange={(event) =>
                            updatePromotion(
                              index,
                              "code",
                              event.target.value
                            )
                          }
                          placeholder="Promo code"
                          className="rounded-md border px-3 py-2"
                        />

                        <select
                          value={promotion.type || "percentage"}
                          onChange={(event) =>
                            updatePromotion(
                              index,
                              "type",
                              event.target.value
                            )
                          }
                          className="rounded-md border px-3 py-2"
                        >
                          <option value="percentage">Percentage</option>
                          <option value="fixed">Fixed Amount</option>
                        </select>

                        <input
                          type="number"
                          min="0"
                          value={promotion.value ?? ""}
                          onChange={(event) =>
                            updatePromotion(
                              index,
                              "value",
                              Number(event.target.value)
                            )
                          }
                          placeholder="Value"
                          className="rounded-md border px-3 py-2"
                        />

                        <input
                          type="number"
                          min="1"
                          value={promotion.usageLimit ?? ""}
                          onChange={(event) =>
                            updatePromotion(
                              index,
                              "usageLimit",
                              event.target.value
                                ? Number(event.target.value)
                                : null
                            )
                          }
                          placeholder="Usage limit"
                          className="rounded-md border px-3 py-2"
                        />

                        <button
                          type="button"
                          onClick={() => removePromotion(index)}
                          className="rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={closeCampaignModal}
                  className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveCampaign}
                  disabled={actionLoading === "save-campaign"}
                  className="rounded-md bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === "save-campaign"
                    ? "Saving..."
                    : editingCampaign?.id
                      ? "Save Changes"
                      : "Create Campaign"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showScheduleModal && campaignToSchedule && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Schedule Campaign
                </h2>
                <p className="text-sm text-gray-500">
                  {campaignToSchedule.name || "Campaign"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeScheduleModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Schedule Type
                </label>

                <select
                  value={scheduleDraft.type}
                  onChange={(event) =>
                    setScheduleDraft((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
                >
                  <option value="immediate">Immediate</option>
                  <option value="scheduled">One Time Scheduled</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {scheduleDraft.type !== "immediate" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Start At
                  </label>

                  <input
                    type="datetime-local"
                    value={scheduleDraft.startAt || ""}
                    onChange={(event) =>
                      setScheduleDraft((current) => ({
                        ...current,
                        startAt: event.target.value,
                      }))
                    }
                    className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {scheduleDraft.type === "scheduled" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    End At (Optional)
                  </label>

                  <input
                    type="datetime-local"
                    value={scheduleDraft.endAt || ""}
                    onChange={(event) =>
                      setScheduleDraft((current) => ({
                        ...current,
                        endAt: event.target.value,
                      }))
                    }
                    className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {["daily", "weekly", "monthly"].includes(
                scheduleDraft.type
              ) && (
                <p className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
                  Recurring schedule rules can be finalized by your backend using
                  the selected type and start date.
                </p>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeScheduleModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveSchedule}
                disabled={
                  actionLoading === `schedule-${campaignToSchedule.id}`
                }
                className="rounded-md bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `schedule-${campaignToSchedule.id}`
                  ? "Saving..."
                  : "Save Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && historyCampaign && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Campaign History
                </h2>
                <p className="text-sm text-gray-500">
                  {historyCampaign.name || historyCampaign.id}
                </p>
              </div>

              <button
                type="button"
                onClick={closeHistoryModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            {actionLoading === `history-${historyCampaign.id}` ? (
              <p className="py-8 text-center text-indigo-700">
                Loading campaign history...
              </p>
            ) : history.length === 0 ? (
              <p className="py-8 text-center text-gray-600">
                No history found for this campaign.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[700px] w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-left text-gray-700">
                      <th className="border px-3 py-2">Time</th>
                      <th className="border px-3 py-2">Action</th>
                      <th className="border px-3 py-2">Actor</th>
                      <th className="border px-3 py-2">Details</th>
                    </tr>
                  </thead>

                  <tbody>
                    {history.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="border px-3 py-2">
                          {formatDate(item.timestamp)}
                        </td>
                        <td className="border px-3 py-2">
                          {item.action || "-"}
                        </td>
                        <td className="border px-3 py-2">
                          {item.actor || "-"}
                        </td>
                        <td className="border px-3 py-2">
                          {item.details || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketingManager;