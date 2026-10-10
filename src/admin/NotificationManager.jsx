import React, { useEffect, useMemo, useState } from "react";
import {
  fetchNotifications,
  sendNotification,
  updateNotificationTemplate,
  deleteNotification,
  exportNotificationsCSV,
  exportNotificationsExcel,
} from "../utils/api";

const PAGE_SIZE = 12;

function NotificationManager() {
  const [notifications, setNotifications] = useState([]);

  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalNotifications, setTotalNotifications] = useState(0);

  const [showSendModal, setShowSendModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [notificationToEdit, setNotificationToEdit] = useState(null);
  const [notificationToDelete, setNotificationToDelete] = useState(null);

  const [sendForm, setSendForm] = useState({
    type: "system",
    recipient: "",
    subject: "",
    message: "",
  });

  const [templateContent, setTemplateContent] = useState("");

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      type: filterType,
      status: filterStatus,
    }),
    [debouncedSearch, filterType, filterStatus]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    loadNotifications();
  }, [page, filters.search, filters.type, filters.status]);

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

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  };

  const getStatusClass = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (
      normalized === "sent" ||
      normalized === "delivered" ||
      normalized === "success"
    ) {
      return "bg-green-100 text-green-700";
    }

    if (
      normalized === "failed" ||
      normalized === "rejected" ||
      normalized === "error"
    ) {
      return "bg-red-100 text-red-700";
    }

    if (
      normalized === "pending" ||
      normalized === "queued" ||
      normalized === "processing"
    ) {
      return "bg-yellow-100 text-yellow-800";
    }

    return "bg-gray-100 text-gray-700";
  };

  const getTypeClass = (type) => {
    const normalized = String(type || "").toLowerCase();

    if (normalized === "email") {
      return "bg-blue-100 text-blue-700";
    }

    if (normalized === "sms") {
      return "bg-green-100 text-green-700";
    }

    if (normalized === "push") {
      return "bg-purple-100 text-purple-700";
    }

    if (normalized === "system") {
      return "bg-orange-100 text-orange-700";
    }

    return "bg-gray-100 text-gray-700";
  };

  const loadNotifications = async () => {
    setLoadingNotifications(true);
    setError("");

    try {
      const response = await fetchNotifications({
        page,
        pageSize: PAGE_SIZE,
        limit: PAGE_SIZE,
        search: filters.search,
        type: filters.type === "all" ? undefined : filters.type,
        status: filters.status === "all" ? undefined : filters.status,
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

      setNotifications(items);
      setTotalPages(Math.max(1, receivedTotalPages));
      setTotalNotifications(receivedTotal);
    } catch (err) {
      setNotifications([]);
      setError(
        err?.message || "Could not load notifications. Please try again."
      );
    } finally {
      setLoadingNotifications(false);
    }
  };

  const refreshNotifications = async () => {
    clearMessages();

    await loadNotifications();

    setSuccess("Notifications refreshed successfully.");
  };

  const openSendModal = () => {
    clearMessages();

    setSendForm({
      type: "system",
      recipient: "",
      subject: "",
      message: "",
    });

    setShowSendModal(true);
  };

  const closeSendModal = () => {
    setShowSendModal(false);
    setSendForm({
      type: "system",
      recipient: "",
      subject: "",
      message: "",
    });
  };

  const handleSend = async () => {
    const message = sendForm.message.trim();
    const recipient = sendForm.recipient.trim();
    const subject = sendForm.subject.trim();

    if (!message) {
      setError("Notification message is required.");
      return;
    }

    if (sendForm.type !== "system" && !recipient) {
      setError("Recipient is required for email, SMS, or push notifications.");
      return;
    }

    clearMessages();
    setActionLoading("send");

    try {
      const response = await sendNotification({
        type: sendForm.type,
        message,
        ...(recipient ? { recipient } : {}),
        ...(subject ? { subject } : {}),
      });

      setSuccess(response?.message || "Notification sent successfully.");

      closeSendModal();
      await loadNotifications();
    } catch (err) {
      setError(err?.message || "Could not send notification.");
    } finally {
      setActionLoading("");
    }
  };

  const openTemplateModal = (notification) => {
    clearMessages();

    setNotificationToEdit(notification);
    setTemplateContent(
      notification?.templateContent ||
        notification?.content ||
        notification?.message ||
        ""
    );

    setShowTemplateModal(true);
  };

  const closeTemplateModal = () => {
    setNotificationToEdit(null);
    setTemplateContent("");
    setShowTemplateModal(false);
  };

  const saveTemplate = async () => {
    if (!notificationToEdit?.id) return;

    const content = templateContent.trim();

    if (!content) {
      setError("Template content is required.");
      return;
    }

    clearMessages();
    setActionLoading(`template-${notificationToEdit.id}`);

    try {
      const response = await updateNotificationTemplate({
        id: notificationToEdit.id,
        content,
      });

      setSuccess(response?.message || "Notification template updated.");

      closeTemplateModal();
      await loadNotifications();
    } catch (err) {
      setError(
        err?.message || "Could not update notification template."
      );
    } finally {
      setActionLoading("");
    }
  };

  const openDeleteModal = (notification) => {
    clearMessages();

    setNotificationToDelete(notification);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setNotificationToDelete(null);
    setShowDeleteModal(false);
  };

  const confirmDelete = async () => {
    if (!notificationToDelete?.id) return;

    clearMessages();
    setActionLoading(`delete-${notificationToDelete.id}`);

    try {
      const response = await deleteNotification({
        id: notificationToDelete.id,
      });

      setSuccess(response?.message || "Notification deleted successfully.");

      closeDeleteModal();
      await loadNotifications();
    } catch (err) {
      setError(err?.message || "Could not delete notification.");
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
        csv: exportNotificationsCSV,
        excel: exportNotificationsExcel,
      };

      const exportFunction = exportFunctions[format];

      if (!exportFunction) {
        throw new Error("Invalid export format.");
      }

      const response = await exportFunction({
        search: debouncedSearch,
        type: filterType === "all" ? undefined : filterType,
        status: filterStatus === "all" ? undefined : filterStatus,
      });

      downloadExportResponse(response, `notifications-report.${format}`);

      setSuccess(
        `Notifications exported to ${format.toUpperCase()} successfully.`
      );
    } catch (err) {
      setError(
        err?.message ||
          `Could not export notifications as ${format.toUpperCase()}.`
      );
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div className="notification-manager px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">
            Notification & Communication Manager
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Send and manage system, email, SMS, and push communications.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openSendModal}
            disabled={Boolean(actionLoading)}
            className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send Notification
          </button>

          <button
            type="button"
            onClick={refreshNotifications}
            disabled={loadingNotifications || Boolean(actionLoading)}
            className="rounded-md bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh
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
          Notification Filters
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          />

          <select
            value={filterType}
            onChange={(event) => {
              setFilterType(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="system">System</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="push">Push</option>
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
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
            <option value="queued">Queued</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setDebouncedSearch("");
              setFilterType("all");
              setFilterStatus("all");
              setPage(1);
            }}
            className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-indigo-900">
              Notification History
            </h2>

            <p className="text-sm text-gray-500">
              Total matching notifications: {totalNotifications}
            </p>
          </div>

          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
        </div>

        {loadingNotifications && notifications.length === 0 ? (
          <p className="py-8 text-center text-indigo-700">
            Loading notifications...
          </p>
        ) : notifications.length === 0 ? (
          <p className="py-8 text-center text-gray-600">
            No notifications found.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className="rounded-lg border bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-indigo-900">
                      {String(notification.type || "system")
                        .charAt(0)
                        .toUpperCase() +
                        String(notification.type || "system").slice(1)}{" "}
                      Notification
                    </h3>

                    {notification.subject && (
                      <p className="mt-1 text-sm font-medium text-gray-700">
                        {notification.subject}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getTypeClass(
                        notification.type
                      )}`}
                    >
                      {notification.type || "system"}
                    </span>

                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                        notification.status
                      )}`}
                    >
                      {notification.status || "pending"}
                    </span>
                  </div>
                </div>

                <div className="mt-3 rounded-md bg-gray-50 p-3">
                  <p className="whitespace-pre-wrap break-words text-sm text-gray-700">
                    {notification.message ||
                      notification.content ||
                      "No message content available."}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Recipient</p>
                    <p className="mt-1 break-all font-medium text-gray-800">
                      {notification.recipient ||
                        notification.recipientEmail ||
                        notification.user ||
                        "System Broadcast"}
                    </p>
                  </div>

                  <div className="rounded bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="mt-1 font-medium text-gray-800">
                      {formatDate(
                        notification.date ||
                          notification.createdAt ||
                          notification.sentAt
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openTemplateModal(notification)}
                    disabled={Boolean(actionLoading)}
                    className="rounded-md bg-yellow-500 px-3 py-1.5 text-sm text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Edit Template
                  </button>

                  <button
                    type="button"
                    onClick={() => openDeleteModal(notification)}
                    disabled={Boolean(actionLoading)}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              setPage((currentPage) => Math.max(1, currentPage - 1))
            }
            disabled={page <= 1 || loadingNotifications}
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
            disabled={page >= totalPages || loadingNotifications}
            className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </section>

      {showSendModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Send Notification
                </h2>

                <p className="text-sm text-gray-500">
                  Send a system, email, SMS, or push notification.
                </p>
              </div>

              <button
                type="button"
                onClick={closeSendModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Notification Type
                </label>

                <select
                  value={sendForm.type}
                  onChange={(event) =>
                    setSendForm((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
                >
                  <option value="system">System</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="push">Push</option>
                </select>
              </div>

              {sendForm.type !== "system" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Recipient
                  </label>

                  <input
                    type="text"
                    value={sendForm.recipient}
                    onChange={(event) =>
                      setSendForm((current) => ({
                        ...current,
                        recipient: event.target.value,
                      }))
                    }
                    placeholder={
                      sendForm.type === "email"
                        ? "customer@example.com"
                        : sendForm.type === "sms"
                          ? "+1234567890"
                          : "User ID or device token"
                    }
                    className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Subject (Optional)
                </label>

                <input
                  type="text"
                  value={sendForm.subject}
                  onChange={(event) =>
                    setSendForm((current) => ({
                      ...current,
                      subject: event.target.value,
                    }))
                  }
                  placeholder="Important update"
                  className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Message
                </label>

                <textarea
                  value={sendForm.message}
                  onChange={(event) =>
                    setSendForm((current) => ({
                      ...current,
                      message: event.target.value,
                    }))
                  }
                  rows={6}
                  placeholder="Write your notification message..."
                  className="w-full rounded-md border p-3 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeSendModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSend}
                disabled={actionLoading === "send"}
                className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "send"
                  ? "Sending..."
                  : "Send Notification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTemplateModal && notificationToEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Edit Notification Template
                </h2>

                <p className="text-sm text-gray-500">
                  {notificationToEdit.type || "System"} notification template
                </p>
              </div>

              <button
                type="button"
                onClick={closeTemplateModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <textarea
              value={templateContent}
              onChange={(event) => setTemplateContent(event.target.value)}
              rows={10}
              placeholder="Enter notification template content..."
              className="w-full rounded-md border p-3 outline-none focus:border-indigo-500"
            />

            <p className="mt-2 text-xs text-gray-500">
              Your backend can support placeholders such as {"{{name}}"}, {"{{orderNumber}}"}, and {"{{link}}"}.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeTemplateModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveTemplate}
                disabled={
                  actionLoading === `template-${notificationToEdit.id}`
                }
                className="rounded-md bg-yellow-500 px-4 py-2 text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `template-${notificationToEdit.id}`
                  ? "Saving..."
                  : "Save Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && notificationToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <h2 className="text-xl font-bold text-red-700">
              Delete Notification
            </h2>

            <p className="mt-3 text-sm text-gray-700">
              Are you sure you want to delete this notification? This action cannot be undone.
            </p>

            <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
              {notificationToDelete.message ||
                notificationToDelete.content ||
                notificationToDelete.id}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={
                  actionLoading === `delete-${notificationToDelete.id}`
                }
                className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `delete-${notificationToDelete.id}`
                  ? "Deleting..."
                  : "Delete Notification"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationManager;