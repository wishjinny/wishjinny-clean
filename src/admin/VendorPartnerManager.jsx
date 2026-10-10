import React, { useEffect, useMemo, useState } from "react";
import {
  fetchVendors,
  fetchVendorDetails,
  approveVendor,
  rejectVendor,
  suspendVendor,
  reactivateVendor,
  updateVendorProfile,
  updateVendorCompliance,
  updateVendorContract,
  fetchVendorPerformance,
  fetchVendorSettlements,
  processVendorSettlement,
  fetchVendorOrders,
  exportVendorsCSV,
  exportVendorsExcel,
  exportVendorsPDF,
  logAuditEvent,
} from "../utils/api";

const PAGE_SIZE = 10;

const emptyProfileForm = {
  name: "",
  businessName: "",
  contactEmail: "",
  contactPhone: "",
  address: "",
};

function VendorPartnerManager() {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const [loadingVendors, setLoadingVendors] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [complianceFilter, setComplianceFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVendors, setTotalVendors] = useState(0);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [vendorToReject, setVendorToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileVendor, setProfileVendor] = useState(null);
  const [profileForm, setProfileForm] = useState(emptyProfileForm);

  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [complianceVendor, setComplianceVendor] = useState(null);
  const [complianceValue, setComplianceValue] = useState("pending");
  const [complianceNotes, setComplianceNotes] = useState("");

  const [showContractModal, setShowContractModal] = useState(false);
  const [contractVendor, setContractVendor] = useState(null);
  const [contractStart, setContractStart] = useState("");
  const [contractEnd, setContractEnd] = useState("");

  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementVendor, setSettlementVendor] = useState(null);
  const [settlementAmount, setSettlementAmount] = useState("");

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      status: statusFilter,
      verification: verificationFilter,
      compliance: complianceFilter,
    }),
    [
      debouncedSearch,
      statusFilter,
      verificationFilter,
      complianceFilter,
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
    loadVendors();
  }, [
    page,
    filters.search,
    filters.status,
    filters.verification,
    filters.compliance,
  ]);

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

  const formatAmount = (value) => {
    const amount = Number(value);

    if (Number.isNaN(amount)) {
      return "₹0";
    }

    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const getStatusClass = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (
      normalized === "approved" ||
      normalized === "active" ||
      normalized === "verified" ||
      normalized === "compliant" ||
      normalized === "paid"
    ) {
      return "bg-green-100 text-green-700";
    }

    if (
      normalized === "rejected" ||
      normalized === "suspended" ||
      normalized === "non_compliant" ||
      normalized === "failed" ||
      normalized === "inactive"
    ) {
      return "bg-red-100 text-red-700";
    }

    if (
      normalized === "pending" ||
      normalized === "kyc_pending" ||
      normalized === "unverified"
    ) {
      return "bg-yellow-100 text-yellow-800";
    }

    return "bg-gray-100 text-gray-700";
  };

  const writeAuditLog = async (action, resourceId, details) => {
    try {
      await logAuditEvent({
        action,
        details: details || "",
        resourceType: "vendor",
        resourceId: resourceId || "",
      });
    } catch {
      // Main action should not fail only because audit logging fails.
    }
  };

  const loadVendors = async () => {
    setLoadingVendors(true);
    setError("");

    try {
      const response = await fetchVendors({
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

      setVendors(items);
      setTotalPages(Math.max(1, receivedTotalPages));
      setTotalVendors(receivedTotal);
    } catch (err) {
      setVendors([]);
      setError(
        err?.message ||
          "⚠️ Vendors load नहीं हो पाए। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setLoadingVendors(false);
    }
  };

  const refreshVendors = async () => {
    clearMessages();
    await loadVendors();
    setSuccess("✅ Vendor data refresh हो गया।");
  };

  const openVendorDetail = async (vendor) => {
    clearMessages();
    setActionLoading(`detail-${vendor.id}`);

    try {
      const [
        detailResult,
        performanceResult,
        settlementsResult,
        ordersResult,
      ] = await Promise.allSettled([
        fetchVendorDetails({ id: vendor.id }),
        fetchVendorPerformance({ id: vendor.id }),
        fetchVendorSettlements({ id: vendor.id }),
        fetchVendorOrders({ id: vendor.id }),
      ]);

      const detail =
        detailResult.status === "fulfilled"
          ? detailResult.value
          : vendor;

      const performance =
        performanceResult.status === "fulfilled"
          ? performanceResult.value || {}
          : detail?.performance || {};

      const settlements =
        settlementsResult.status === "fulfilled"
          ? settlementsResult.value || {}
          : detail?.settlements || {};

      const orders =
        ordersResult.status === "fulfilled"
          ? getItems(ordersResult.value)
          : Array.isArray(detail?.orders)
            ? detail.orders
            : [];

      setSelectedVendor({
        ...vendor,
        ...(detail || {}),
        documents: Array.isArray(detail?.documents) ? detail.documents : [],
        performance,
        settlements: {
          ...settlements,
          history: Array.isArray(settlements?.history)
            ? settlements.history
            : [],
        },
        orders,
      });

      if (detailResult.status === "rejected") {
        setError(
          "⚠️ पूरी vendor details load नहीं हो पाईं। उपलब्ध जानकारी दिखाई जा रही है।"
        );
      }
    } catch (err) {
      setSelectedVendor({
        ...vendor,
        documents: [],
        performance: {},
        settlements: {
          pending: 0,
          paid: 0,
          history: [],
        },
        orders: [],
      });

      setError(
        err?.message ||
          "⚠️ Vendor details load नहीं हो पाए। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const closeVendorDetail = () => {
    setSelectedVendor(null);
  };

  const updateSelectedVendor = (vendorId, updates) => {
    if (selectedVendor?.id === vendorId) {
      setSelectedVendor((currentVendor) => ({
        ...currentVendor,
        ...updates,
      }));
    }
  };

  const handleApprove = async (vendor) => {
    clearMessages();
    setActionLoading(`approve-${vendor.id}`);

    try {
      const response = await approveVendor({ id: vendor.id });

      await writeAuditLog(
        "APPROVE_VENDOR",
        vendor.id,
        `Approved vendor: ${vendor.name || vendor.id}`
      );

      setSuccess(response?.message || "✅ Vendor approve हो गया।");

      updateSelectedVendor(vendor.id, {
        status: "approved",
        verification: "verified",
      });

      await loadVendors();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Vendor approve नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const openRejectModal = (vendor) => {
    clearMessages();
    setVendorToReject(vendor);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    setVendorToReject(null);
    setRejectionReason("");
    setShowRejectModal(false);
  };

  const handleReject = async () => {
    if (!vendorToReject?.id) {
      return;
    }

    const reason = rejectionReason.trim();

    if (!reason) {
      setError("⚠️ Vendor reject करने के लिए reason जरूरी है।");
      return;
    }

    clearMessages();
    setActionLoading(`reject-${vendorToReject.id}`);

    try {
      const response = await rejectVendor({
        id: vendorToReject.id,
        reason,
      });

      await writeAuditLog(
        "REJECT_VENDOR",
        vendorToReject.id,
        `Rejected vendor: ${
          vendorToReject.name || vendorToReject.id
        }. Reason: ${reason}`
      );

      setSuccess(response?.message || "✅ Vendor reject हो गया।");

      updateSelectedVendor(vendorToReject.id, {
        status: "rejected",
      });

      closeRejectModal();
      await loadVendors();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Vendor reject नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleVendorAction = async (vendor, action) => {
    clearMessages();

    const actionFunctions = {
      suspend: suspendVendor,
      reactivate: reactivateVendor,
    };

    const nextStatus = {
      suspend: "suspended",
      reactivate: "active",
    };

    const requestFunction = actionFunctions[action];

    if (!requestFunction) {
      setError("⚠️ Invalid vendor action.");
      return;
    }

    setActionLoading(`${action}-${vendor.id}`);

    try {
      const response = await requestFunction({ id: vendor.id });

      await writeAuditLog(
        `${action.toUpperCase()}_VENDOR`,
        vendor.id,
        `${action.toUpperCase()} vendor: ${vendor.name || vendor.id}`
      );

      setSuccess(
        response?.message ||
          `✅ Vendor ${
            action === "reactivate" ? "reactivate" : action
          } हो गया।`
      );

      updateSelectedVendor(vendor.id, {
        status: nextStatus[action],
      });

      await loadVendors();
    } catch (err) {
      setError(
        err?.message ||
          `⚠️ Vendor ${
            action === "reactivate" ? "reactivate" : action
          } नहीं हो पाया।`
      );
    } finally {
      setActionLoading("");
    }
  };

  const openProfileModal = (vendor) => {
    clearMessages();

    setProfileVendor(vendor);
    setProfileForm({
      name: vendor.name || "",
      businessName: vendor.businessName || "",
      contactEmail: vendor.contactEmail || "",
      contactPhone: vendor.contactPhone || "",
      address: vendor.address || "",
    });

    setShowProfileModal(true);
  };

  const closeProfileModal = () => {
    setProfileVendor(null);
    setProfileForm(emptyProfileForm);
    setShowProfileModal(false);
  };

  const saveVendorProfile = async () => {
    if (!profileVendor?.id) {
      return;
    }

    if (!profileForm.name.trim()) {
      setError("⚠️ Vendor name जरूरी है।");
      return;
    }

    if (!profileForm.businessName.trim()) {
      setError("⚠️ Business name जरूरी है।");
      return;
    }

    if (!profileForm.contactEmail.trim()) {
      setError("⚠️ Contact email जरूरी है।");
      return;
    }

    clearMessages();
    setActionLoading(`profile-${profileVendor.id}`);

    const data = {
      name: profileForm.name.trim(),
      businessName: profileForm.businessName.trim(),
      contactEmail: profileForm.contactEmail.trim(),
      contactPhone: profileForm.contactPhone.trim(),
      address: profileForm.address.trim(),
    };

    try {
      const response = await updateVendorProfile({
        id: profileVendor.id,
        data,
      });

      await writeAuditLog(
        "UPDATE_VENDOR_PROFILE",
        profileVendor.id,
        `Updated vendor profile: ${data.name}`
      );

      setSuccess(response?.message || "✅ Vendor profile update हो गई।");

      updateSelectedVendor(profileVendor.id, data);

      closeProfileModal();
      await loadVendors();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Vendor profile update नहीं हो पाई। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const openComplianceModal = (vendor) => {
    clearMessages();

    setComplianceVendor(vendor);
    setComplianceValue(vendor.compliance || "pending");
    setComplianceNotes("");

    setShowComplianceModal(true);
  };

  const closeComplianceModal = () => {
    setComplianceVendor(null);
    setComplianceValue("pending");
    setComplianceNotes("");
    setShowComplianceModal(false);
  };

  const saveCompliance = async () => {
    if (!complianceVendor?.id) {
      return;
    }

    clearMessages();
    setActionLoading(`compliance-${complianceVendor.id}`);

    try {
      const response = await updateVendorCompliance({
        id: complianceVendor.id,
        compliance: complianceValue,
        notes: complianceNotes.trim(),
      });

      await writeAuditLog(
        "UPDATE_VENDOR_COMPLIANCE",
        complianceVendor.id,
        `Updated compliance to ${complianceValue}${
          complianceNotes.trim() ? `. Notes: ${complianceNotes.trim()}` : ""
        }`
      );

      setSuccess(response?.message || "✅ Vendor compliance update हो गई।");

      updateSelectedVendor(complianceVendor.id, {
        compliance: complianceValue,
      });

      closeComplianceModal();
      await loadVendors();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Vendor compliance update नहीं हो पाई। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const openContractModal = (vendor) => {
    clearMessages();

    setContractVendor(vendor);
    setContractStart(vendor.contractStart || "");
    setContractEnd(vendor.contractEnd || "");

    setShowContractModal(true);
  };

  const closeContractModal = () => {
    setContractVendor(null);
    setContractStart("");
    setContractEnd("");
    setShowContractModal(false);
  };

  const saveContract = async () => {
    if (!contractVendor?.id) {
      return;
    }

    if (contractStart && contractEnd && contractEnd < contractStart) {
      setError("⚠️ Contract end date, start date से पहले नहीं हो सकती।");
      return;
    }

    clearMessages();
    setActionLoading(`contract-${contractVendor.id}`);

    try {
      const response = await updateVendorContract({
        id: contractVendor.id,
        ...(contractStart ? { start: contractStart } : {}),
        ...(contractEnd ? { end: contractEnd } : {}),
      });

      await writeAuditLog(
        "UPDATE_VENDOR_CONTRACT",
        contractVendor.id,
        `Updated contract dates. Start: ${
          contractStart || "—"
        }, End: ${contractEnd || "—"}`
      );

      setSuccess(response?.message || "✅ Vendor contract update हो गया।");

      updateSelectedVendor(contractVendor.id, {
        contractStart,
        contractEnd,
      });

      closeContractModal();
      await loadVendors();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Vendor contract update नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const openSettlementModal = (vendor) => {
    clearMessages();
    setSettlementVendor(vendor);
    setSettlementAmount("");
    setShowSettlementModal(true);
  };

  const closeSettlementModal = () => {
    setSettlementVendor(null);
    setSettlementAmount("");
    setShowSettlementModal(false);
  };

  const handleProcessSettlement = async () => {
    if (!settlementVendor?.id) {
      return;
    }

    const amount = Number(settlementAmount);

    if (Number.isNaN(amount) || amount <= 0) {
      setError("⚠️ Settlement amount 0 से ज्यादा होना चाहिए।");
      return;
    }

    setActionLoading(`settlement-${settlementVendor.id}`);

    try {
      const response = await processVendorSettlement({
        id: settlementVendor.id,
        amount,
      });

      await writeAuditLog(
        "PROCESS_VENDOR_SETTLEMENT",
        settlementVendor.id,
        `Processed settlement amount: ${amount}`
      );

      setSuccess(
        response?.message || "✅ Vendor settlement process हो गया।"
      );

      closeSettlementModal();

      if (selectedVendor?.id === settlementVendor.id) {
        await openVendorDetail(selectedVendor);
      }
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Vendor settlement process नहीं हो पाया। कृपया फिर से कोशिश करें।"
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
        csv: exportVendorsCSV,
        excel: exportVendorsExcel,
        pdf: exportVendorsPDF,
      };

      const exportFunction = exportFunctions[format];

      if (!exportFunction) {
        throw new Error("Invalid export format.");
      }

      const response = await exportFunction({
        search: debouncedSearch,
        status: statusFilter,
        verification: verificationFilter,
        compliance: complianceFilter,
      });

      downloadExportResponse(response, `vendors-report.${format}`);

      await writeAuditLog(
        `EXPORT_VENDORS_${format.toUpperCase()}`,
        "",
        `Exported vendor report in ${format.toUpperCase()} format`
      );

      setSuccess(
        `✅ Vendor report ${format.toUpperCase()} में export हो गई।`
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

  const selectedVendorStatus = String(
    selectedVendor?.status || ""
  ).toLowerCase();

  const canApprove =
    selectedVendorStatus === "pending" ||
    selectedVendorStatus === "rejected";

  const canSuspend =
    selectedVendorStatus === "approved" ||
    selectedVendorStatus === "active";

  const canReactivate = selectedVendorStatus === "suspended";

  return (
    <div className="vendor-manager px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">
            Vendor & Partner Manager 🏢
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Vendor onboarding, KYC, compliance, contracts, settlements और performance manage करें।
          </p>
        </div>

        <button
          type="button"
          onClick={refreshVendors}
          disabled={loadingVendors || Boolean(actionLoading)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Refresh Vendors
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

      <section className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-indigo-900">
          Filters & Export
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            type="text"
            placeholder="Search vendor, business, email..."
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
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
            <option value="active">Active</option>
          </select>

          <select
            value={verificationFilter}
            onChange={(event) => {
              setVerificationFilter(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
          >
            <option value="all">All Verification</option>
            <option value="unverified">Unverified</option>
            <option value="verified">Verified</option>
            <option value="kyc_pending">KYC Pending</option>
          </select>

          <select
            value={complianceFilter}
            onChange={(event) => {
              setComplianceFilter(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
          >
            <option value="all">All Compliance</option>
            <option value="compliant">Compliant</option>
            <option value="non_compliant">Non-Compliant</option>
            <option value="pending">Pending</option>
          </select>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleExport("csv")}
              disabled={Boolean(actionLoading)}
              className="flex-1 rounded-md bg-yellow-500 px-3 py-2 text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              CSV
            </button>

            <button
              type="button"
              onClick={() => handleExport("excel")}
              disabled={Boolean(actionLoading)}
              className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Excel
            </button>

            <button
              type="button"
              onClick={() => handleExport("pdf")}
              disabled={Boolean(actionLoading)}
              className="flex-1 rounded-md bg-purple-600 px-3 py-2 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              PDF
            </button>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-indigo-900">
              Vendor List
            </h2>
            <p className="text-sm text-gray-500">
              Total matching vendors: {totalVendors}
            </p>
          </div>

          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
        </div>

        {loadingVendors && vendors.length === 0 ? (
          <p className="py-8 text-center text-indigo-700">
            ✨ Loading vendors...
          </p>
        ) : vendors.length === 0 ? (
          <p className="py-8 text-center text-gray-600">
            No vendors found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1250px] w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-gray-700">
                  <th className="border px-3 py-2">Vendor</th>
                  <th className="border px-3 py-2">Business</th>
                  <th className="border px-3 py-2">Contact</th>
                  <th className="border px-3 py-2">Status</th>
                  <th className="border px-3 py-2">Verification</th>
                  <th className="border px-3 py-2">Compliance</th>
                  <th className="border px-3 py-2">Contract</th>
                  <th className="border px-3 py-2">Actions</th>
                </tr>
              </thead>

              <tbody>
                {vendors.map((vendor) => {
                  const vendorStatus = String(
                    vendor.status || ""
                  ).toLowerCase();

                  const rowCanApprove =
                    vendorStatus === "pending" ||
                    vendorStatus === "rejected";

                  const rowCanSuspend =
                    vendorStatus === "approved" ||
                    vendorStatus === "active";

                  const rowCanReactivate =
                    vendorStatus === "suspended";

                  return (
                    <tr
                      key={vendor.id}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="border px-3 py-2">
                        <p className="font-medium text-indigo-900">
                          {vendor.name || "—"}
                        </p>
                        <p className="text-xs text-gray-500">
                          ID: {vendor.id || "—"}
                        </p>
                      </td>

                      <td className="border px-3 py-2">
                        {vendor.businessName || "—"}
                      </td>

                      <td className="border px-3 py-2">
                        <p>{vendor.contactEmail || "—"}</p>
                        <p className="text-xs text-gray-500">
                          {vendor.contactPhone || ""}
                        </p>
                      </td>

                      <td className="border px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                            vendor.status
                          )}`}
                        >
                          {vendor.status || "unknown"}
                        </span>
                      </td>

                      <td className="border px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                            vendor.verification
                          )}`}
                        >
                          {vendor.verification || "unknown"}
                        </span>
                      </td>

                      <td className="border px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                            vendor.compliance
                          )}`}
                        >
                          {vendor.compliance || "unknown"}
                        </span>
                      </td>

                      <td className="border px-3 py-2">
                        <p>{vendor.contractStart || "—"}</p>
                        <p className="text-xs text-gray-500">
                          to {vendor.contractEnd || "—"}
                        </p>
                      </td>

                      <td className="border px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openVendorDetail(vendor)}
                            disabled={actionLoading === `detail-${vendor.id}`}
                            className="text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionLoading === `detail-${vendor.id}`
                              ? "Loading..."
                              : "View"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApprove(vendor)}
                            disabled={!rowCanApprove || Boolean(actionLoading)}
                            className="text-green-600 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Approve
                          </button>

                          <button
                            type="button"
                            onClick={() => openRejectModal(vendor)}
                            disabled={!rowCanApprove || Boolean(actionLoading)}
                            className="text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Reject
                          </button>

                          <button
                            type="button"
                            onClick={() => handleVendorAction(vendor, "suspend")}
                            disabled={!rowCanSuspend || Boolean(actionLoading)}
                            className="text-yellow-700 hover:text-yellow-900 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Suspend
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleVendorAction(vendor, "reactivate")
                            }
                            disabled={
                              !rowCanReactivate || Boolean(actionLoading)
                            }
                            className="text-indigo-600 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Reactivate
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
            disabled={page <= 1 || loadingVendors}
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
            disabled={page >= totalPages || loadingVendors}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      </section>

      {selectedVendor && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Vendor details"
        >
          <button
            type="button"
            aria-label="Close vendor details"
            onClick={closeVendorDetail}
            className="absolute inset-0 cursor-default"
          />

          <div className="relative z-10 h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  {selectedVendor.name || "Vendor Detail"}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedVendor.businessName || "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeVendorDetail}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openProfileModal(selectedVendor)}
                disabled={Boolean(actionLoading)}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Edit Profile
              </button>

              <button
                type="button"
                onClick={() => openComplianceModal(selectedVendor)}
                disabled={Boolean(actionLoading)}
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Compliance
              </button>

              <button
                type="button"
                onClick={() => openContractModal(selectedVendor)}
                disabled={Boolean(actionLoading)}
                className="rounded-md bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Contract
              </button>

              <button
                type="button"
                onClick={() => handleApprove(selectedVendor)}
                disabled={!canApprove || Boolean(actionLoading)}
                className="rounded-md bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Approve
              </button>

              <button
                type="button"
                onClick={() => openRejectModal(selectedVendor)}
                disabled={!canApprove || Boolean(actionLoading)}
                className="rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reject
              </button>

              <button
                type="button"
                onClick={() => handleVendorAction(selectedVendor, "suspend")}
                disabled={!canSuspend || Boolean(actionLoading)}
                className="rounded-md bg-yellow-500 px-3 py-2 text-sm text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Suspend
              </button>

              <button
                type="button"
                onClick={() =>
                  handleVendorAction(selectedVendor, "reactivate")
                }
                disabled={!canReactivate || Boolean(actionLoading)}
                className="rounded-md bg-blue-700 px-3 py-2 text-sm text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reactivate
              </button>
            </div>

            <div className="space-y-4">
              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Profile
                </h3>
                <p className="text-sm"><span className="font-medium">Business:</span> {selectedVendor.businessName || "—"}</p>
                <p className="text-sm"><span className="font-medium">Email:</span> {selectedVendor.contactEmail || "—"}</p>
                <p className="text-sm"><span className="font-medium">Phone:</span> {selectedVendor.contactPhone || "—"}</p>
                <p className="break-words text-sm"><span className="font-medium">Address:</span> {selectedVendor.address || "—"}</p>
                <p className="text-sm"><span className="font-medium">Status:</span> {selectedVendor.status || "—"}</p>
                <p className="text-sm"><span className="font-medium">Verification:</span> {selectedVendor.verification || "—"}</p>
                <p className="text-sm"><span className="font-medium">Compliance:</span> {selectedVendor.compliance || "—"}</p>
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Documents
                </h3>

                {selectedVendor.documents.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    No documents available.
                  </p>
                ) : (
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {selectedVendor.documents.map((document, index) => (
                      <li key={`${document}-${index}`} className="break-words">
                        {document}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Performance & KPIs
                </h3>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <p><span className="font-medium">Total Orders:</span> {selectedVendor.performance?.totalOrders ?? 0}</p>
                  <p><span className="font-medium">Revenue:</span> {formatAmount(selectedVendor.performance?.revenue)}</p>
                  <p><span className="font-medium">Cancellation Rate:</span> {selectedVendor.performance?.cancellationRate ?? 0}%</p>
                  <p><span className="font-medium">Return Rate:</span> {selectedVendor.performance?.returnRate ?? 0}%</p>
                  <p><span className="font-medium">Rating:</span> {selectedVendor.performance?.rating ?? 0}</p>
                  <p><span className="font-medium">Response Time:</span> {selectedVendor.performance?.responseTime ?? 0}h</p>
                </div>
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-indigo-900">
                    Payments & Settlements
                  </h3>

                  <button
                    type="button"
                    onClick={() => openSettlementModal(selectedVendor)}
                    disabled={Boolean(actionLoading)}
                    className="rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Process Settlement
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <p><span className="font-medium">Pending:</span> {formatAmount(selectedVendor.settlements?.pending)}</p>
                  <p><span className="font-medium">Paid:</span> {formatAmount(selectedVendor.settlements?.paid)}</p>
                </div>

                <h4 className="mt-3 font-medium text-indigo-900">
                  Settlement History
                </h4>

                {selectedVendor.settlements?.history?.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-600">
                    No settlement history available.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {selectedVendor.settlements.history.map((settlement) => (
                      <div
                        key={settlement.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border bg-white p-2 text-sm"
                      >
                        <span>{settlement.date || "—"}</span>
                        <span>{formatAmount(settlement.amount)}</span>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                            settlement.status
                          )}`}
                        >
                          {settlement.status || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Orders
                </h3>

                {selectedVendor.orders.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    No orders available.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedVendor.orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border bg-white p-2 text-sm"
                      >
                        <span>#{order.id || "—"}</span>
                        <span>{formatAmount(order.amount)}</span>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                            order.status
                          )}`}
                        >
                          {order.status || "—"}
                        </span>
                        <span className="text-gray-500">
                          {order.date || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Contract Information
                </h3>
                <p className="text-sm"><span className="font-medium">Start Date:</span> {selectedVendor.contractStart || "—"}</p>
                <p className="text-sm"><span className="font-medium">End Date:</span> {selectedVendor.contractEnd || "—"}</p>
              </section>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && vendorToReject && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Reject vendor"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Reject Vendor
                </h2>
                <p className="text-sm text-gray-500">
                  {vendorToReject.name || "Vendor"} को reject करने का कारण लिखें।
                </p>
              </div>

              <button
                type="button"
                onClick={closeRejectModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <textarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              rows={5}
              placeholder="Rejection reason..."
              className="w-full rounded-md border p-3 outline-none focus:border-red-500"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeRejectModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleReject}
                disabled={actionLoading === `reject-${vendorToReject.id}`}
                className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `reject-${vendorToReject.id}`
                  ? "Rejecting..."
                  : "Reject Vendor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && profileVendor && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Edit vendor profile"
        >
          <div className="my-8 w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Edit Vendor Profile
                </h2>
                <p className="text-sm text-gray-500">
                  {profileVendor.name || "Vendor"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeProfileModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Vendor name"
                value={profileForm.name}
                onChange={(event) =>
                  setProfileForm((currentForm) => ({
                    ...currentForm,
                    name: event.target.value,
                  }))
                }
                className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              />

              <input
                type="text"
                placeholder="Business name"
                value={profileForm.businessName}
                onChange={(event) =>
                  setProfileForm((currentForm) => ({
                    ...currentForm,
                    businessName: event.target.value,
                  }))
                }
                className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              />

              <input
                type="email"
                placeholder="Contact email"
                value={profileForm.contactEmail}
                onChange={(event) =>
                  setProfileForm((currentForm) => ({
                    ...currentForm,
                    contactEmail: event.target.value,
                  }))
                }
                className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              />

              <input
                type="text"
                placeholder="Contact phone"
                value={profileForm.contactPhone}
                onChange={(event) =>
                  setProfileForm((currentForm) => ({
                    ...currentForm,
                    contactPhone: event.target.value,
                  }))
                }
                className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              />

              <textarea
                rows={4}
                placeholder="Address"
                value={profileForm.address}
                onChange={(event) =>
                  setProfileForm((currentForm) => ({
                    ...currentForm,
                    address: event.target.value,
                  }))
                }
                className="w-full rounded-md border p-3 outline-none focus:border-blue-500"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeProfileModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveVendorProfile}
                disabled={actionLoading === `profile-${profileVendor.id}`}
                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `profile-${profileVendor.id}`
                  ? "Saving..."
                  : "Save Profile"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showComplianceModal && complianceVendor && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Update vendor compliance"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Update Compliance
                </h2>
                <p className="text-sm text-gray-500">
                  {complianceVendor.name || "Vendor"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeComplianceModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <select
              value={complianceValue}
              onChange={(event) => setComplianceValue(event.target.value)}
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
            >
              <option value="compliant">Compliant</option>
              <option value="non_compliant">Non-Compliant</option>
              <option value="pending">Pending</option>
            </select>

            <textarea
              rows={4}
              value={complianceNotes}
              onChange={(event) => setComplianceNotes(event.target.value)}
              placeholder="Compliance notes (optional)"
              className="mt-3 w-full rounded-md border p-3 outline-none focus:border-blue-500"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeComplianceModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveCompliance}
                disabled={
                  actionLoading === `compliance-${complianceVendor.id}`
                }
                className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `compliance-${complianceVendor.id}`
                  ? "Saving..."
                  : "Update Compliance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showContractModal && contractVendor && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Update vendor contract"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Update Contract
                </h2>
                <p className="text-sm text-gray-500">
                  {contractVendor.name || "Vendor"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeContractModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <label className="block text-sm font-medium text-gray-700">
              Contract Start Date
            </label>
            <input
              type="date"
              value={contractStart}
              onChange={(event) => setContractStart(event.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
            />

            <label className="mt-4 block text-sm font-medium text-gray-700">
              Contract End Date
            </label>
            <input
              type="date"
              value={contractEnd}
              onChange={(event) => setContractEnd(event.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeContractModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveContract}
                disabled={actionLoading === `contract-${contractVendor.id}`}
                className="rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `contract-${contractVendor.id}`
                  ? "Saving..."
                  : "Save Contract"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettlementModal && settlementVendor && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Process vendor settlement"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Process Settlement
                </h2>
                <p className="text-sm text-gray-500">
                  {settlementVendor.name || "Vendor"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeSettlementModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <input
              type="number"
              min="0.01"
              step="0.01"
              value={settlementAmount}
              onChange={(event) => setSettlementAmount(event.target.value)}
              placeholder="Settlement amount"
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-green-500"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeSettlementModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleProcessSettlement}
                disabled={
                  actionLoading === `settlement-${settlementVendor.id}`
                }
                className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `settlement-${settlementVendor.id}`
                  ? "Processing..."
                  : "Process Settlement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VendorPartnerManager;