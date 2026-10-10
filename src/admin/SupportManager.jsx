import React, { useEffect, useMemo, useState } from "react";
import {
  fetchTickets,
  fetchTicketDetails,
  assignAgent,
  addAgentReply,
  addInternalNote,
  updateTicketStatus,
  updateTicketPriority,
  updateTicketSLA,
  fetchSupportAnalytics,
  exportTicketsCSV,
  exportTicketsExcel,
  exportTicketsPDF,
  fetchDisputes,
  updateDisputeStatus,
  fetchJiraIntegration,
  toggleJiraIntegration,
  testJiraConnection,
  logAuditEvent,
} from "../utils/api";

const PAGE_SIZE = 10;

function SupportManager() {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [jira, setJira] = useState(null);
  const [disputes, setDisputes] = useState([]);

  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);

  const [showAgentModal, setShowAgentModal] = useState(false);
  const [ticketForAgent, setTicketForAgent] = useState(null);
  const [agentName, setAgentName] = useState("");

  const [showReplyModal, setShowReplyModal] = useState(false);
  const [ticketForReply, setTicketForReply] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [ticketForNote, setTicketForNote] = useState(null);
  const [internalNote, setInternalNote] = useState("");

  const [showSlaModal, setShowSlaModal] = useState(false);
  const [ticketForSla, setTicketForSla] = useState(null);
  const [slaTarget, setSlaTarget] = useState("");

  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeToUpdate, setDisputeToUpdate] = useState(null);
  const [disputeStatus, setDisputeStatus] = useState("under_review");
  const [disputeReason, setDisputeReason] = useState("");

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      status: statusFilter,
      channel: channelFilter,
    }),
    [debouncedSearch, statusFilter, channelFilter]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    loadTickets();
  }, [page, filters.search, filters.status, filters.channel]);

  useEffect(() => {
    loadSummaryData();
  }, []);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const getItems = (response) => {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.items)) {
      return response.items;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    return [];
  };

  const getStatusClass = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (
      normalized === "resolved" ||
      normalized === "closed" ||
      normalized === "success" ||
      normalized === "connected"
    ) {
      return "bg-green-100 text-green-700";
    }

    if (
      normalized === "rejected" ||
      normalized === "failed" ||
      normalized === "disabled" ||
      normalized === "error"
    ) {
      return "bg-red-100 text-red-700";
    }

    if (
      normalized === "open" ||
      normalized === "pending" ||
      normalized === "under_review"
    ) {
      return "bg-yellow-100 text-yellow-800";
    }

    if (normalized === "in_progress") {
      return "bg-blue-100 text-blue-700";
    }

    if (normalized === "urgent") {
      return "bg-red-100 text-red-700";
    }

    if (normalized === "high") {
      return "bg-orange-100 text-orange-700";
    }

    return "bg-gray-100 text-gray-700";
  };

  const writeAuditLog = async (action, resourceType, resourceId, details) => {
    try {
      await logAuditEvent({
        action,
        details: details || "",
        resourceType,
        resourceId: resourceId || "",
      });
    } catch {
      // Main support action should not fail only because audit log fails.
    }
  };

  const loadTickets = async () => {
    setLoadingTickets(true);
    setError("");

    try {
      const response = await fetchTickets({
        page,
        limit: PAGE_SIZE,
        ...filters,
      });

      const items = getItems(response);

      const receivedTotalPages = Number(
        response?.totalPages || response?.pagination?.totalPages || 1
      );

      const receivedTotal = Number(
        response?.total || response?.pagination?.total || items.length
      );

      setTickets(items);
      setTotalPages(Math.max(1, receivedTotalPages));
      setTotalTickets(receivedTotal);
    } catch (err) {
      setTickets([]);
      setError(
        err?.message ||
          "⚠️ Tickets load नहीं हो पाए। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setLoadingTickets(false);
    }
  };

  const loadSummaryData = async () => {
    setLoadingSummary(true);

    const results = await Promise.allSettled([
      fetchSupportAnalytics(),
      fetchJiraIntegration(),
      fetchDisputes(),
    ]);

    const [analyticsResult, jiraResult, disputesResult] = results;

    if (analyticsResult.status === "fulfilled") {
      setAnalytics(analyticsResult.value || null);
    }

    if (jiraResult.status === "fulfilled") {
      setJira(jiraResult.value || null);
    }

    if (disputesResult.status === "fulfilled") {
      setDisputes(getItems(disputesResult.value));
    }

    if (results.some((result) => result.status === "rejected")) {
      setError(
        "⚠️ कुछ support analytics या integration data load नहीं हो पाया।"
      );
    }

    setLoadingSummary(false);
  };

  const refreshSupportData = async () => {
    clearMessages();

    await Promise.all([loadTickets(), loadSummaryData()]);

    setSuccess("✅ Support Manager का data refresh हो गया।");
  };

  const openTicketDetail = async (ticket) => {
    clearMessages();
    setActionLoading(`detail-${ticket.id}`);

    try {
      const response = await fetchTicketDetails({ id: ticket.id });

      setSelectedTicket({
        ...ticket,
        ...(response || {}),
        replies: Array.isArray(response?.replies) ? response.replies : [],
        notes: Array.isArray(response?.notes) ? response.notes : [],
        history: Array.isArray(response?.history) ? response.history : [],
      });
    } catch (err) {
      setSelectedTicket({
        ...ticket,
        replies: [],
        notes: [],
        history: [],
      });

      setError(
        err?.message ||
          "⚠️ Ticket detail load नहीं हो पाया। उपलब्ध जानकारी दिखाई जा रही है।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const closeTicketDetail = () => {
    setSelectedTicket(null);
  };

  const updateSelectedTicket = (ticketId, updates) => {
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket((currentTicket) => ({
        ...currentTicket,
        ...updates,
      }));
    }
  };

  const openAgentModal = (ticket) => {
    clearMessages();
    setTicketForAgent(ticket);
    setAgentName(ticket.agent || "");
    setShowAgentModal(true);
  };

  const closeAgentModal = () => {
    setTicketForAgent(null);
    setAgentName("");
    setShowAgentModal(false);
  };

  const saveAgentAssignment = async () => {
    const agent = agentName.trim();

    if (!ticketForAgent?.id || !agent) {
      setError("⚠️ Agent name जरूरी है।");
      return;
    }

    clearMessages();
    setActionLoading(`agent-${ticketForAgent.id}`);

    try {
      const response = await assignAgent({
        id: ticketForAgent.id,
        agent,
      });

      await writeAuditLog(
        "ASSIGN_TICKET_AGENT",
        "ticket",
        ticketForAgent.id,
        `Assigned agent: ${agent}`
      );

      setSuccess(response?.message || "✅ Agent assign हो गया।");

      updateSelectedTicket(ticketForAgent.id, {
        agent,
      });

      closeAgentModal();
      await loadTickets();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Agent assignment नहीं हो पाई। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const openReplyModal = (ticket) => {
    clearMessages();
    setTicketForReply(ticket);
    setReplyMessage("");
    setShowReplyModal(true);
  };

  const closeReplyModal = () => {
    setTicketForReply(null);
    setReplyMessage("");
    setShowReplyModal(false);
  };

  const saveAgentReply = async () => {
    const message = replyMessage.trim();

    if (!ticketForReply?.id || !message) {
      setError("⚠️ Reply message जरूरी है।");
      return;
    }

    clearMessages();
    setActionLoading(`reply-${ticketForReply.id}`);

    try {
      const response = await addAgentReply({
        id: ticketForReply.id,
        message,
      });

      await writeAuditLog(
        "ADD_TICKET_REPLY",
        "ticket",
        ticketForReply.id,
        `Added agent reply: ${message}`
      );

      setSuccess(response?.message || "✅ Reply send हो गया।");

      closeReplyModal();

      if (selectedTicket?.id === ticketForReply.id) {
        await openTicketDetail(selectedTicket);
      }

      await loadTickets();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Reply send नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const openNoteModal = (ticket) => {
    clearMessages();
    setTicketForNote(ticket);
    setInternalNote("");
    setShowNoteModal(true);
  };

  const closeNoteModal = () => {
    setTicketForNote(null);
    setInternalNote("");
    setShowNoteModal(false);
  };

  const saveInternalNote = async () => {
    const note = internalNote.trim();

    if (!ticketForNote?.id || !note) {
      setError("⚠️ Internal note जरूरी है।");
      return;
    }

    clearMessages();
    setActionLoading(`note-${ticketForNote.id}`);

    try {
      const response = await addInternalNote({
        id: ticketForNote.id,
        note,
      });

      await writeAuditLog(
        "ADD_TICKET_INTERNAL_NOTE",
        "ticket",
        ticketForNote.id,
        `Added internal note: ${note}`
      );

      setSuccess(response?.message || "✅ Internal note add हो गया।");

      closeNoteModal();

      if (selectedTicket?.id === ticketForNote.id) {
        await openTicketDetail(selectedTicket);
      }
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Internal note add नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleStatusChange = async (ticket, status) => {
    clearMessages();
    setActionLoading(`status-${ticket.id}`);

    try {
      const response = await updateTicketStatus({
        id: ticket.id,
        status,
      });

      await writeAuditLog(
        "UPDATE_TICKET_STATUS",
        "ticket",
        ticket.id,
        `Updated ticket status to ${status}`
      );

      setSuccess(response?.message || `✅ Ticket status ${status} हो गया।`);

      updateSelectedTicket(ticket.id, {
        status,
      });

      await Promise.all([loadTickets(), loadSummaryData()]);
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Ticket status update नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handlePriorityChange = async (ticket, priority) => {
    clearMessages();
    setActionLoading(`priority-${ticket.id}`);

    try {
      const response = await updateTicketPriority({
        id: ticket.id,
        priority,
      });

      await writeAuditLog(
        "UPDATE_TICKET_PRIORITY",
        "ticket",
        ticket.id,
        `Updated ticket priority to ${priority}`
      );

      setSuccess(
        response?.message || `✅ Ticket priority ${priority} हो गई।`
      );

      updateSelectedTicket(ticket.id, {
        priority,
      });

      await loadTickets();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Ticket priority update नहीं हो पाई। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const openSlaModal = (ticket) => {
    clearMessages();
    setTicketForSla(ticket);
    setSlaTarget(ticket.slaTarget || "");
    setShowSlaModal(true);
  };

  const closeSlaModal = () => {
    setTicketForSla(null);
    setSlaTarget("");
    setShowSlaModal(false);
  };

  const saveSlaTarget = async () => {
    const sla = slaTarget.trim();

    if (!ticketForSla?.id || !sla) {
      setError("⚠️ SLA target जरूरी है।");
      return;
    }

    clearMessages();
    setActionLoading(`sla-${ticketForSla.id}`);

    try {
      const response = await updateTicketSLA({
        id: ticketForSla.id,
        sla,
      });

      await writeAuditLog(
        "UPDATE_TICKET_SLA",
        "ticket",
        ticketForSla.id,
        `Updated SLA target to ${sla}`
      );

      setSuccess(response?.message || "✅ SLA target update हो गया।");

      updateSelectedTicket(ticketForSla.id, {
        slaTarget: sla,
        slaBreached: false,
      });

      closeSlaModal();
      await loadTickets();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ SLA target update नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const downloadExportResponse = (response, fileName) => {
    if (!response) {
      return;
    }

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
        csv: exportTicketsCSV,
        excel: exportTicketsExcel,
        pdf: exportTicketsPDF,
      };

      const exportFunction = exportFunctions[format];

      if (!exportFunction) {
        throw new Error("Invalid export format.");
      }

      const response = await exportFunction({
        search: debouncedSearch,
        status: statusFilter,
        channel: channelFilter,
      });

      downloadExportResponse(response, `support-tickets.${format}`);

      await writeAuditLog(
        `EXPORT_TICKETS_${format.toUpperCase()}`,
        "support_report",
        "",
        `Exported support tickets in ${format.toUpperCase()} format`
      );

      setSuccess(
        `✅ Support ticket report ${format.toUpperCase()} में export हो गई।`
      );
    } catch (err) {
      setError(
        err?.message ||
          `⚠️ ${format.toUpperCase()} export नहीं हो पाया। कृपया फिर से कोशिश करें।`
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleJiraToggle = async () => {
    clearMessages();
    setActionLoading("jira-toggle");

    try {
      const response = await toggleJiraIntegration();

      await writeAuditLog(
        "TOGGLE_JIRA_INTEGRATION",
        "support_integration",
        "jira",
        "Toggled Jira integration"
      );

      setSuccess(
        response?.message || "✅ Jira integration setting update हो गई।"
      );

      await loadSummaryData();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Jira integration setting update नहीं हो पाई।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleJiraTest = async () => {
    clearMessages();
    setActionLoading("jira-test");

    try {
      const response = await testJiraConnection();

      await writeAuditLog(
        "TEST_JIRA_CONNECTION",
        "support_integration",
        "jira",
        "Tested Jira connection"
      );

      setSuccess(
        response?.message || "✅ Jira connection successful है।"
      );

      await loadSummaryData();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Jira connection test fail हो गया। कृपया configuration जांचें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const openDisputeModal = (dispute) => {
    clearMessages();

    setDisputeToUpdate(dispute);
    setDisputeStatus(dispute.status || "under_review");
    setDisputeReason("");

    setShowDisputeModal(true);
  };

  const closeDisputeModal = () => {
    setDisputeToUpdate(null);
    setDisputeStatus("under_review");
    setDisputeReason("");
    setShowDisputeModal(false);
  };

  const saveDisputeStatus = async () => {
    if (!disputeToUpdate?.id) {
      return;
    }

    clearMessages();
    setActionLoading(`dispute-${disputeToUpdate.id}`);

    try {
      const response = await updateDisputeStatus({
        id: disputeToUpdate.id,
        status: disputeStatus,
        ...(disputeReason.trim()
          ? { reason: disputeReason.trim() }
          : {}),
      });

      await writeAuditLog(
        "UPDATE_DISPUTE_STATUS",
        "dispute",
        disputeToUpdate.id,
        `Updated dispute status to ${disputeStatus}${
          disputeReason.trim() ? `. Reason: ${disputeReason.trim()}` : ""
        }`
      );

      setSuccess(response?.message || "✅ Dispute status update हो गया।");

      closeDisputeModal();
      await loadSummaryData();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Dispute status update नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const MetricCard = ({ label, value, color = "text-indigo-900" }) => (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>
        {value ?? 0}
      </p>
    </div>
  );

  const selectedTicketStatus = String(
    selectedTicket?.status || ""
  ).toLowerCase();

  const canSetInProgress =
    selectedTicketStatus === "open" ||
    selectedTicketStatus === "in_progress";

  const canResolve =
    selectedTicketStatus === "open" ||
    selectedTicketStatus === "in_progress";

  const canClose =
    selectedTicketStatus === "resolved" ||
    selectedTicketStatus === "in_progress";

  return (
    <div className="support-manager px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">
            Customer Support & Ticket Manager 🎫
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Customer tickets, agents, SLA, disputes, analytics और Jira integration manage करें।
          </p>
        </div>

        <button
          type="button"
          onClick={refreshSupportData}
          disabled={
            loadingTickets ||
            loadingSummary ||
            Boolean(actionLoading)
          }
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Refresh Support Data
        </button>
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

      <section className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-indigo-900">
            Support Analytics
          </h2>

          {loadingSummary && (
            <span className="text-sm text-gray-500">
              Loading analytics...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total Tickets" value={analytics?.totalTickets} />
          <MetricCard label="Open Tickets" value={analytics?.openTickets} color="text-yellow-600" />
          <MetricCard label="In Progress" value={analytics?.inProgress} color="text-blue-600" />
          <MetricCard label="Resolved" value={analytics?.resolved} color="text-green-600" />
          <MetricCard label="Closed" value={analytics?.closed} />
          <MetricCard label="Avg Response Time" value={`${analytics?.avgResponseTime ?? 0}h`} />
          <MetricCard label="Avg Resolution Time" value={`${analytics?.avgResolutionTime ?? 0}h`} />
          <MetricCard label="SLA Breaches" value={analytics?.slaBreaches} color="text-red-600" />
        </div>
      </section>

      <section className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-indigo-900">
          Filters & Export
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            type="text"
            placeholder="Search ticket, customer, subject..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
          />

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={channelFilter}
            onChange={(event) => {
              setChannelFilter(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
          >
            <option value="all">All Channels</option>
            <option value="email">Email</option>
            <option value="chat">Chat</option>
            <option value="phone">Phone</option>
            <option value="social">Social</option>
          </select>

          <button
            type="button"
            onClick={() => handleExport("csv")}
            disabled={Boolean(actionLoading)}
            className="rounded-md bg-yellow-500 px-4 py-2 text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading === "export-csv" ? "Exporting..." : "Export CSV"}
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleExport("excel")}
              disabled={Boolean(actionLoading)}
              className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading === "export-excel"
                ? "Exporting..."
                : "Excel"}
            </button>

            <button
              type="button"
              onClick={() => handleExport("pdf")}
              disabled={Boolean(actionLoading)}
              className="flex-1 rounded-md bg-purple-600 px-3 py-2 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading === "export-pdf"
                ? "Exporting..."
                : "PDF"}
            </button>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-indigo-900">
              Ticket List
            </h2>
            <p className="text-sm text-gray-500">
              Total matching tickets: {totalTickets}
            </p>
          </div>

          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
        </div>

        {loadingTickets && tickets.length === 0 ? (
          <p className="py-8 text-center text-indigo-700">
            ✨ Loading tickets...
          </p>
        ) : tickets.length === 0 ? (
          <p className="py-8 text-center text-gray-600">
            No tickets found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-gray-700">
                  <th className="border px-3 py-2">Ticket</th>
                  <th className="border px-3 py-2">Customer</th>
                  <th className="border px-3 py-2">Channel</th>
                  <th className="border px-3 py-2">Agent</th>
                  <th className="border px-3 py-2">Priority</th>
                  <th className="border px-3 py-2">Status</th>
                  <th className="border px-3 py-2">SLA</th>
                  <th className="border px-3 py-2">Updated</th>
                  <th className="border px-3 py-2">Actions</th>
                </tr>
              </thead>

              <tbody>
                {tickets.map((ticket) => {
                  const ticketStatus = String(
                    ticket.status || ""
                  ).toLowerCase();

                  const rowCanResolve =
                    ticketStatus === "open" ||
                    ticketStatus === "in_progress";

                  return (
                    <tr
                      key={ticket.id}
                      className="border-b align-top hover:bg-gray-50"
                    >
                      <td className="border px-3 py-2">
                        <p className="font-medium text-indigo-900">
                          {ticket.subject || "Untitled Ticket"}
                        </p>
                        <p className="font-mono text-xs text-gray-500">
                          #{ticket.id || "—"}
                        </p>
                      </td>

                      <td className="border px-3 py-2">
                        {ticket.customer || "—"}
                      </td>

                      <td className="border px-3 py-2">
                        {ticket.channel || "—"}
                      </td>

                      <td className="border px-3 py-2">
                        {ticket.agent || "Unassigned"}
                      </td>

                      <td className="border px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                            ticket.priority
                          )}`}
                        >
                          {ticket.priority || "medium"}
                        </span>
                      </td>

                      <td className="border px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                            ticket.status
                          )}`}
                        >
                          {ticket.status || "unknown"}
                        </span>
                      </td>

                      <td className="border px-3 py-2">
                        <p
                          className={
                            ticket.slaBreached
                              ? "font-medium text-red-600"
                              : "text-gray-700"
                          }
                        >
                          {ticket.slaTarget || "—"}
                        </p>
                        {ticket.slaBreached && (
                          <p className="text-xs font-medium text-red-600">
                            ⚠️ Breached
                          </p>
                        )}
                      </td>

                      <td className="border px-3 py-2">
                        <p>{ticket.updatedAt || "—"}</p>
                        <p className="text-xs text-gray-500">
                          Created: {ticket.createdAt || "—"}
                        </p>
                      </td>

                      <td className="border px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openTicketDetail(ticket)}
                            disabled={actionLoading === `detail-${ticket.id}`}
                            className="text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionLoading === `detail-${ticket.id}`
                              ? "Loading..."
                              : "View"}
                          </button>

                          <button
                            type="button"
                            onClick={() => openAgentModal(ticket)}
                            disabled={Boolean(actionLoading)}
                            className="text-indigo-600 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Assign
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(ticket, "resolved")
                            }
                            disabled={!rowCanResolve || Boolean(actionLoading)}
                            className="text-green-600 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Resolve
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handlePriorityChange(ticket, "high")
                            }
                            disabled={Boolean(actionLoading)}
                            className="text-yellow-700 hover:text-yellow-900 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            High Priority
                          </button>

                          <button
                            type="button"
                            onClick={() => openSlaModal(ticket)}
                            disabled={Boolean(actionLoading)}
                            className="text-purple-600 hover:text-purple-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Update SLA
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              setPage((currentPage) => Math.max(1, currentPage - 1))
            }
            disabled={page <= 1 || loadingTickets}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← Previous
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
            disabled={page >= totalPages || loadingTickets}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-indigo-900">
                Jira Integration
              </h2>
              <p className="text-sm text-gray-500">
                Connect and test support workflow integration.
              </p>
            </div>

            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                jira?.status || (jira?.enabled ? "connected" : "disabled")
              )}`}
            >
              {jira?.status || (jira?.enabled ? "enabled" : "disabled")}
            </span>
          </div>

          <p className="text-sm text-gray-700">
            Enabled: {jira?.enabled ? "Yes" : "No"}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleJiraToggle}
              disabled={Boolean(actionLoading)}
              className="rounded-md bg-indigo-700 px-3 py-2 text-sm text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading === "jira-toggle"
                ? "Updating..."
                : jira?.enabled
                  ? "Disconnect Jira"
                  : "Connect Jira"}
            </button>

            <button
              type="button"
              onClick={handleJiraTest}
              disabled={Boolean(actionLoading)}
              className="rounded-md bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading === "jira-test"
                ? "Testing..."
                : "Test Connection"}
            </button>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-indigo-900">
                Disputes
              </h2>
              <p className="text-sm text-gray-500">
                Recent disputes: {disputes.length}
              </p>
            </div>
          </div>

          {disputes.length === 0 ? (
            <p className="py-4 text-sm text-gray-600">
              No disputes found.
            </p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {disputes.map((dispute) => (
                <div
                  key={dispute.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium text-indigo-900">
                      {dispute.subject ||
                        dispute.title ||
                        `Dispute #${dispute.id}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {dispute.customer || dispute.createdAt || ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                        dispute.status
                      )}`}
                    >
                      {dispute.status || "open"}
                    </span>

                    <button
                      type="button"
                      onClick={() => openDisputeModal(dispute)}
                      disabled={Boolean(actionLoading)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Update
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {selectedTicket && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Ticket details"
        >
          <button
            type="button"
            aria-label="Close ticket details"
            onClick={closeTicketDetail}
            className="absolute inset-0 cursor-default"
          />

          <div className="relative z-10 h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  {selectedTicket.subject || "Ticket Detail"}
                </h2>
                <p className="text-sm text-gray-500">
                  Ticket ID: {selectedTicket.id || "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeTicketDetail}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openAgentModal(selectedTicket)}
                disabled={Boolean(actionLoading)}
                className="rounded-md bg-indigo-700 px-3 py-2 text-sm text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Assign Agent
              </button>

              <button
                type="button"
                onClick={() => openReplyModal(selectedTicket)}
                disabled={Boolean(actionLoading)}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add Reply
              </button>

              <button
                type="button"
                onClick={() => openNoteModal(selectedTicket)}
                disabled={Boolean(actionLoading)}
                className="rounded-md bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add Note
              </button>

              <button
                type="button"
                onClick={() =>
                  handleStatusChange(selectedTicket, "in_progress")
                }
                disabled={!canSetInProgress || Boolean(actionLoading)}
                className="rounded-md bg-blue-700 px-3 py-2 text-sm text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Mark In Progress
              </button>

              <button
                type="button"
                onClick={() =>
                  handleStatusChange(selectedTicket, "resolved")
                }
                disabled={!canResolve || Boolean(actionLoading)}
                className="rounded-md bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Mark Resolved
              </button>

              <button
                type="button"
                onClick={() =>
                  handleStatusChange(selectedTicket, "closed")
                }
                disabled={!canClose || Boolean(actionLoading)}
                className="rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Close Ticket
              </button>

              <button
                type="button"
                onClick={() =>
                  handlePriorityChange(selectedTicket, "urgent")
                }
                disabled={Boolean(actionLoading)}
                className="rounded-md bg-yellow-500 px-3 py-2 text-sm text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Set Urgent
              </button>

              <button
                type="button"
                onClick={() => openSlaModal(selectedTicket)}
                disabled={Boolean(actionLoading)}
                className="rounded-md bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Update SLA
              </button>
            </div>

            <div className="space-y-4">
              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Ticket Information
                </h3>
                <p className="text-sm"><span className="font-medium">Customer:</span> {selectedTicket.customer || "—"}</p>
                <p className="text-sm"><span className="font-medium">Channel:</span> {selectedTicket.channel || "—"}</p>
                <p className="text-sm"><span className="font-medium">Agent:</span> {selectedTicket.agent || "Unassigned"}</p>
                <p className="text-sm"><span className="font-medium">Priority:</span> {selectedTicket.priority || "medium"}</p>
                <p className="text-sm"><span className="font-medium">Status:</span> {selectedTicket.status || "—"}</p>
                <p className="text-sm"><span className="font-medium">Created:</span> {selectedTicket.createdAt || "—"}</p>
                <p className="text-sm"><span className="font-medium">Updated:</span> {selectedTicket.updatedAt || "—"}</p>
                <p className={selectedTicket.slaBreached ? "font-medium text-red-600 text-sm" : "text-sm"}>
                  <span className="font-medium">SLA Target:</span>{" "}
                  {selectedTicket.slaTarget || "—"}
                  {selectedTicket.slaBreached ? " ⚠️ Breached" : ""}
                </p>
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Replies
                </h3>

                {selectedTicket.replies.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    No replies available.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedTicket.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="rounded border bg-white p-3"
                      >
                        <p className="text-sm">
                          <span className="font-medium">
                            {reply.actor || "Agent"}:
                          </span>{" "}
                          {reply.message || "—"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {reply.createdAt || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Internal Notes
                </h3>

                {selectedTicket.notes.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    No internal notes available.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedTicket.notes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded border bg-white p-3"
                      >
                        <p className="text-sm">
                          <span className="font-medium">
                            {note.actor || "Agent"}:
                          </span>{" "}
                          {note.note || "—"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {note.createdAt || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Ticket History
                </h3>

                {selectedTicket.history.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    No history available.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedTicket.history.map((historyItem) => (
                      <div
                        key={historyItem.id}
                        className="rounded border bg-white p-3 text-sm"
                      >
                        <p className="font-medium">
                          {historyItem.action || "Action"}
                        </p>
                        <p>
                          {historyItem.time || "—"} •{" "}
                          {historyItem.actor || "—"}
                        </p>
                        {historyItem.details && (
                          <p className="mt-1 break-words text-gray-600">
                            {historyItem.details}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {showAgentModal && ticketForAgent && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Assign agent"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Assign Agent
                </h2>
                <p className="text-sm text-gray-500">
                  {ticketForAgent.subject || `Ticket #${ticketForAgent.id}`}
                </p>
              </div>

              <button
                type="button"
                onClick={closeAgentModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <input
              type="text"
              value={agentName}
              onChange={(event) => setAgentName(event.target.value)}
              placeholder="Enter agent name"
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeAgentModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveAgentAssignment}
                disabled={actionLoading === `agent-${ticketForAgent.id}`}
                className="rounded-md bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `agent-${ticketForAgent.id}`
                  ? "Saving..."
                  : "Assign Agent"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReplyModal && ticketForReply && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Add ticket reply"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Add Customer Reply
                </h2>
                <p className="text-sm text-gray-500">
                  {ticketForReply.subject || `Ticket #${ticketForReply.id}`}
                </p>
              </div>

              <button
                type="button"
                onClick={closeReplyModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <textarea
              value={replyMessage}
              onChange={(event) => setReplyMessage(event.target.value)}
              rows={6}
              placeholder="Write your reply..."
              className="w-full rounded-md border p-3 outline-none focus:border-blue-500"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeReplyModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveAgentReply}
                disabled={actionLoading === `reply-${ticketForReply.id}`}
                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `reply-${ticketForReply.id}`
                  ? "Sending..."
                  : "Send Reply"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNoteModal && ticketForNote && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Add internal note"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Add Internal Note
                </h2>
                <p className="text-sm text-gray-500">
                  यह note केवल internal team के लिए है।
                </p>
              </div>

              <button
                type="button"
                onClick={closeNoteModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <textarea
              value={internalNote}
              onChange={(event) => setInternalNote(event.target.value)}
              rows={6}
              placeholder="Write internal note..."
              className="w-full rounded-md border p-3 outline-none focus:border-gray-500"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeNoteModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveInternalNote}
                disabled={actionLoading === `note-${ticketForNote.id}`}
                className="rounded-md bg-gray-700 px-4 py-2 text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `note-${ticketForNote.id}`
                  ? "Saving..."
                  : "Add Note"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSlaModal && ticketForSla && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Update SLA target"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Update SLA Target
                </h2>
                <p className="text-sm text-gray-500">
                  उदाहरण: 4 hours, 24 hours, या 2026-10-01 18:00
                </p>
              </div>

              <button
                type="button"
                onClick={closeSlaModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <input
              type="text"
              value={slaTarget}
              onChange={(event) => setSlaTarget(event.target.value)}
              placeholder="Enter SLA target"
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-purple-500"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeSlaModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveSlaTarget}
                disabled={actionLoading === `sla-${ticketForSla.id}`}
                className="rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `sla-${ticketForSla.id}`
                  ? "Saving..."
                  : "Update SLA"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDisputeModal && disputeToUpdate && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Update dispute status"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Update Dispute
                </h2>
                <p className="text-sm text-gray-500">
                  {disputeToUpdate.subject ||
                    disputeToUpdate.title ||
                    `Dispute #${disputeToUpdate.id}`}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDisputeModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <select
              value={disputeStatus}
              onChange={(event) => setDisputeStatus(event.target.value)}
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
            >
              <option value="open">Open</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>

            <textarea
              value={disputeReason}
              onChange={(event) => setDisputeReason(event.target.value)}
              rows={5}
              placeholder="Reason or resolution notes (optional)"
              className="mt-3 w-full rounded-md border p-3 outline-none focus:border-blue-500"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDisputeModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveDisputeStatus}
                disabled={
                  actionLoading === `dispute-${disputeToUpdate.id}`
                }
                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `dispute-${disputeToUpdate.id}`
                  ? "Saving..."
                  : "Update Dispute"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SupportManager;