// src/admin/CustomerManager.jsx

import { useEffect, useMemo, useState } from "react";
import { fetchUsers } from "../utils/api";

const PAGE_SIZE = 10;

const INITIAL_CUSTOMERS = [
  {
    id: "USR-1001",
    name: "Aarav Sharma",
    email: "aarav@example.com",
    phone: "9876543210",
    role: "customer",
    status: "active",
    createdAt: "2026-09-18",
    addresses: {
      billing: "Bandra West, Mumbai, Maharashtra",
      shipping: "Bandra West, Mumbai, Maharashtra",
    },
    orders: [
      {
        id: "WJ-1001",
        total: 2249,
        status: "processing",
        createdAt: "2026-10-03",
      },
    ],
    supportTickets: [],
    rewards: {
      points: 245,
      tier: "Silver",
      coupons: ["WISH10"],
    },
    analytics: {
      lifetimeValue: 2249,
      churnRate: 8,
      engagementScore: 82,
    },
  },
  {
    id: "USR-1002",
    name: "Meera Kapoor",
    email: "meera@example.com",
    phone: "9988776655",
    role: "customer",
    status: "active",
    createdAt: "2026-09-22",
    addresses: {
      billing: "Indiranagar, Bengaluru, Karnataka",
      shipping: "Indiranagar, Bengaluru, Karnataka",
    },
    orders: [
      {
        id: "WJ-1002",
        total: 1848,
        status: "shipped",
        createdAt: "2026-10-02",
      },
    ],
    supportTickets: [
      {
        id: "TKT-1001",
        subject: "Delivery tracking request",
        status: "open",
        createdAt: "2026-10-03",
      },
    ],
    rewards: {
      points: 430,
      tier: "Gold",
      coupons: ["FREEDELIVERY", "FASHION250"],
    },
    analytics: {
      lifetimeValue: 6280,
      churnRate: 4,
      engagementScore: 91,
    },
  },
  {
    id: "USR-1003",
    name: "Kabir Singh",
    email: "kabir@example.com",
    phone: "9123456789",
    role: "customer",
    status: "suspended",
    createdAt: "2026-09-25",
    addresses: {
      billing: "Sector 62, Noida, Uttar Pradesh",
      shipping: "Sector 62, Noida, Uttar Pradesh",
    },
    orders: [],
    supportTickets: [],
    rewards: {
      points: 90,
      tier: "Bronze",
      coupons: [],
    },
    analytics: {
      lifetimeValue: 1398,
      churnRate: 38,
      engagementScore: 42,
    },
  },
];

function CustomerManager() {
  const [allCustomers, setAllCustomers] = useState(INITIAL_CUSTOMERS);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("active");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    const loadApiCustomers = async () => {
      try {
        const response = await fetchUsers();
        const apiUsers = response?.items || [];

        const apiCustomers = apiUsers
          .filter((user) => user.role === "customer")
          .map((user, index) => ({
            id: user.id || `USR-API-${index + 1}`,
            name: user.name || "Customer",
            email: user.email || "",
            phone: user.phone || "Not available",
            role: "customer",
            status: user.status || "active",
            createdAt: user.createdAt || "2026-10-01",
            addresses: {
              billing: "Not available",
              shipping: "Not available",
            },
            orders: [],
            supportTickets: [],
            rewards: {
              points: 0,
              tier: "Bronze",
              coupons: [],
            },
            analytics: {
              lifetimeValue: 0,
              churnRate: 0,
              engagementScore: 50,
            },
          }));

        if (apiCustomers.length > 0) {
          setAllCustomers((currentCustomers) => {
            const currentIds = new Set(
              currentCustomers.map((customer) => customer.id)
            );

            return [
              ...currentCustomers,
              ...apiCustomers.filter(
                (customer) => !currentIds.has(customer.id)
              ),
            ];
          });
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadApiCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    let items = [...allCustomers];

    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();

      items = items.filter((customer) =>
        [
          customer.id,
          customer.name,
          customer.email,
          customer.phone,
        ].some((value) =>
          String(value || "").toLowerCase().includes(query)
        )
      );
    }

    if (statusFilter !== "all") {
      items = items.filter((customer) => customer.status === statusFilter);
    }

    return items.sort((first, second) => {
      return (
        new Date(second.createdAt || 0).getTime() -
        new Date(first.createdAt || 0).getTime()
      );
    });
  }, [allCustomers, debouncedSearch, statusFilter]);

  const totalCustomers = filteredCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalCustomers / PAGE_SIZE));

  useEffect(() => {
    const safePage = Math.min(page, totalPages);

    if (safePage !== page) {
      setPage(safePage);
      return;
    }

    setLoadingCustomers(true);

    const timer = window.setTimeout(() => {
      const start = (safePage - 1) * PAGE_SIZE;
      setCustomers(filteredCustomers.slice(start, start + PAGE_SIZE));
      setLoadingCustomers(false);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [filteredCustomers, page, totalPages]);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const formatAmount = (value) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  };

  const getStatusClass = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (["active", "verified"].includes(normalized)) {
      return "bg-emerald-100 text-emerald-700";
    }

    if (["suspended", "deactivated", "blocked"].includes(normalized)) {
      return "bg-rose-100 text-rose-700";
    }

    if (normalized === "pending") {
      return "bg-amber-100 text-amber-800";
    }

    return "bg-slate-100 text-slate-700";
  };

  const refreshCustomers = () => {
    clearMessages();
    setLoadingCustomers(true);

    window.setTimeout(() => {
      setLoadingCustomers(false);
      setSuccess("Customer data refreshed successfully.");
    }, 400);
  };

  const openCustomerDetail = (customer) => {
    clearMessages();
    setActionLoading(`detail-${customer.id}`);

    window.setTimeout(() => {
      setSelectedCustomer(customer);
      setActionLoading("");
    }, 250);
  };

  const closeCustomerDetail = () => {
    setSelectedCustomer(null);
  };

  const updateCustomerStatus = (customer, status) => {
    if (!customer?.id) return;

    clearMessages();
    setActionLoading(`status-${customer.id}`);

    window.setTimeout(() => {
      setAllCustomers((currentCustomers) =>
        currentCustomers.map((item) =>
          item.id === customer.id
            ? {
                ...item,
                status,
              }
            : item
        )
      );

      setSelectedCustomer((currentCustomer) =>
        currentCustomer?.id === customer.id
          ? {
              ...currentCustomer,
              status,
            }
          : currentCustomer
      );

      setSuccess(
        `${customer.name || "Customer"} status updated to ${status}.`
      );
      setActionLoading("");
    }, 350);
  };

  const toggleCustomerSelection = (customerId) => {
    setSelectedIds((currentIds) =>
      currentIds.includes(customerId)
        ? currentIds.filter((id) => id !== customerId)
        : [...currentIds, customerId]
    );
  };

  const toggleAllCustomers = () => {
    const currentPageIds = customers.map((customer) => customer.id);
    const allSelected =
      currentPageIds.length > 0 &&
      currentPageIds.every((id) => selectedIds.includes(id));

    setSelectedIds((currentIds) => {
      if (allSelected) {
        return currentIds.filter((id) => !currentPageIds.includes(id));
      }

      return Array.from(new Set([...currentIds, ...currentPageIds]));
    });
  };

  const handleBulkUpdate = () => {
    if (selectedIds.length === 0) {
      setError("Select at least one customer for bulk update.");
      return;
    }

    clearMessages();
    setActionLoading("bulk-update");

    window.setTimeout(() => {
      setAllCustomers((currentCustomers) =>
        currentCustomers.map((customer) =>
          selectedIds.includes(customer.id)
            ? {
                ...customer,
                status: bulkStatus,
              }
            : customer
        )
      );

      setSelectedCustomer((currentCustomer) =>
        currentCustomer && selectedIds.includes(currentCustomer.id)
          ? {
              ...currentCustomer,
              status: bulkStatus,
            }
          : currentCustomer
      );

      setSuccess(`${selectedIds.length} customer accounts updated successfully.`);
      setSelectedIds([]);
      setShowBulkPanel(false);
      setActionLoading("");
    }, 450);
  };

  const downloadCustomerReport = (format) => {
    const reportRows = filteredCustomers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      status: customer.status,
      createdAt: customer.createdAt,
      lifetimeValue: customer.analytics?.lifetimeValue || 0,
    }));

    const headers = Object.keys(reportRows[0] || {
      id: "",
      name: "",
      email: "",
      phone: "",
      status: "",
      createdAt: "",
      lifetimeValue: "",
    });

    const csv = [
      headers.join(","),
      ...reportRows.map((row) =>
        headers
          .map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const mimeType =
      format === "excel"
        ? "application/vnd.ms-excel"
        : "text/csv;charset=utf-8";

    const extension = format === "excel" ? "xls" : "csv";
    const blob = new Blob([csv], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `wish-jinny-customers.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleExport = (format) => {
    clearMessages();
    setActionLoading(`export-${format}`);

    window.setTimeout(() => {
      if (format === "pdf") {
        const printableContent = filteredCustomers
          .map(
            (customer) =>
              `${customer.id} | ${customer.name} | ${customer.email} | ${customer.status}`
          )
          .join("\n");

        const blob = new Blob(
          [`Wish Jinny Customer Report\n\n${printableContent}`],
          { type: "text/plain;charset=utf-8" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "wish-jinny-customer-report.txt";
        document.body.appendChild(link);
        link.click();
        link.remove();

        window.setTimeout(() => URL.revokeObjectURL(url), 0);
      } else {
        downloadCustomerReport(format);
      }

      setSuccess(
        `Customer report ${format.toUpperCase()} format mein export ho gayi.`
      );
      setActionLoading("");
    }, 350);
  };

  const isAllSelected =
    customers.length > 0 &&
    customers.every((customer) => selectedIds.includes(customer.id));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
              Wish Jinny Customer Hub
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-950">
              Customer Manager
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Customer profiles, loyalty, account access, orders and marketplace
              engagement management.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshCustomers}
            disabled={loadingCustomers || Boolean(actionLoading)}
            className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingCustomers ? "Refreshing..." : "Refresh Customers"}
          </button>
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
              Filters & Export
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Search customer accounts and export selected marketplace records.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input
              type="search"
              placeholder="Search customer, email, phone..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="deactivated">Deactivated</option>
            </select>

            <button
              type="button"
              onClick={() => setShowBulkPanel((visible) => !visible)}
              disabled={Boolean(actionLoading)}
              className="rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Bulk Update ({selectedIds.length})
            </button>

            <button
              type="button"
              onClick={() => handleExport("csv")}
              disabled={Boolean(actionLoading)}
              className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading === "export-csv" ? "Exporting..." : "Export CSV"}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleExport("excel")}
                disabled={Boolean(actionLoading)}
                className="flex-1 rounded-xl bg-green-700 px-3 py-3 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "export-excel" ? "..." : "Excel"}
              </button>

              <button
                type="button"
                onClick={() => handleExport("pdf")}
                disabled={Boolean(actionLoading)}
                className="flex-1 rounded-xl bg-rose-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "export-pdf" ? "..." : "PDF"}
              </button>
            </div>
          </div>

          {showBulkPanel && (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                Selected customers: {selectedIds.length}
              </p>

              <select
                value={bulkStatus}
                onChange={(event) => setBulkStatus(event.target.value)}
                className="rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm outline-none"
              >
                <option value="active">Set Active</option>
                <option value="suspended">Set Suspended</option>
                <option value="deactivated">Set Deactivated</option>
              </select>

              <button
                type="button"
                onClick={handleBulkUpdate}
                disabled={selectedIds.length === 0 || Boolean(actionLoading)}
                className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "bulk-update"
                  ? "Updating..."
                  : "Apply Update"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedIds([]);
                  setShowBulkPanel(false);
                }}
                className="rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-amber-100"
              >
                Clear Selection
              </button>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Customer List
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Total matching customers: {totalCustomers}
              </p>
            </div>

            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              Page {page} of {totalPages}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleAllCustomers}
                      aria-label="Select all customers"
                    />
                  </th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Phone</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Created</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loadingCustomers && (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-5 py-10 text-center text-indigo-700"
                    >
                      Loading customers...
                    </td>
                  </tr>
                )}

                {!loadingCustomers && customers.length === 0 && (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      No customers found.
                    </td>
                  </tr>
                )}

                {!loadingCustomers &&
                  customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(customer.id)}
                          onChange={() => toggleCustomerSelection(customer.id)}
                          aria-label={`Select ${customer.name}`}
                        />
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">
                          {customer.name}
                        </p>
                        <p className="mt-1 font-mono text-xs text-slate-400">
                          {customer.id}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {customer.email || "—"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {customer.phone || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                            customer.status
                          )}`}
                        >
                          {customer.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {customer.createdAt || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openCustomerDetail(customer)}
                            disabled={Boolean(actionLoading)}
                            className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionLoading === `detail-${customer.id}`
                              ? "Loading..."
                              : "View"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              updateCustomerStatus(
                                customer,
                                customer.status === "active"
                                  ? "suspended"
                                  : "active"
                              )
                            }
                            disabled={Boolean(actionLoading)}
                            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {customer.status === "active" ? "Suspend" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
            <button
              type="button"
              onClick={() =>
                setPage((currentPage) => Math.max(1, currentPage - 1))
              }
              disabled={page <= 1 || loadingCustomers}
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
                setPage((currentPage) =>
                  Math.min(totalPages, currentPage + 1)
                )
              }
              disabled={page >= totalPages || loadingCustomers}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </section>
      </div>

      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/45 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Customer detail"
        >
          <button
            type="button"
            aria-label="Close customer details"
            onClick={closeCustomerDetail}
            className="absolute inset-0 cursor-default"
          />

          <aside className="relative z-10 h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-indigo-600">
                  Customer Profile
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  {selectedCustomer.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  ID: {selectedCustomer.id}
                </p>
              </div>

              <button
                type="button"
                onClick={closeCustomerDetail}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  updateCustomerStatus(
                    selectedCustomer,
                    selectedCustomer.status === "active"
                      ? "suspended"
                      : "active"
                  )
                }
                disabled={Boolean(actionLoading)}
                className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {selectedCustomer.status === "active"
                  ? "Suspend Account"
                  : "Activate Account"}
              </button>

              <button
                type="button"
                onClick={() =>
                  updateCustomerStatus(selectedCustomer, "deactivated")
                }
                disabled={Boolean(actionLoading)}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Deactivate
              </button>
            </div>

            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="mb-3 font-bold text-slate-900">
                  Profile Details
                </h3>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-800">Email:</span>{" "}
                    {selectedCustomer.email || "—"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Phone:</span>{" "}
                    {selectedCustomer.phone || "—"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Status:</span>{" "}
                    {selectedCustomer.status}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">
                      Created:
                    </span>{" "}
                    {selectedCustomer.createdAt}
                  </p>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="mb-3 font-bold text-slate-900">Addresses</h3>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-800">
                      Billing:
                    </span>{" "}
                    {selectedCustomer.addresses?.billing || "—"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">
                      Shipping:
                    </span>{" "}
                    {selectedCustomer.addresses?.shipping || "—"}
                  </p>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="mb-3 font-bold text-slate-900">
                  Order History
                </h3>

                {selectedCustomer.orders?.length ? (
                  <div className="space-y-2">
                    {selectedCustomer.orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white p-3 text-sm"
                      >
                        <span className="font-semibold text-indigo-700">
                          #{order.id}
                        </span>
                        <span className="capitalize text-slate-600">
                          {order.status}
                        </span>
                        <span className="font-bold text-slate-800">
                          {formatAmount(order.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No orders available.</p>
                )}
              </section>

              <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="mb-3 font-bold text-slate-900">
                  Loyalty & Rewards
                </h3>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-800">Points:</span>{" "}
                    {selectedCustomer.rewards?.points || 0}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Tier:</span>{" "}
                    {selectedCustomer.rewards?.tier || "—"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">
                      Coupons:
                    </span>{" "}
                    {selectedCustomer.rewards?.coupons?.join(", ") || "—"}
                  </p>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="mb-3 font-bold text-slate-900">Analytics</h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs text-slate-500">Lifetime Value</p>
                    <p className="mt-1 font-bold text-indigo-700">
                      {formatAmount(
                        selectedCustomer.analytics?.lifetimeValue
                      )}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs text-slate-500">Churn Risk</p>
                    <p className="mt-1 font-bold text-rose-600">
                      {selectedCustomer.analytics?.churnRate || 0}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs text-slate-500">Engagement</p>
                    <p className="mt-1 font-bold text-emerald-600">
                      {selectedCustomer.analytics?.engagementScore || 0}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

export default CustomerManager;