import React, { useEffect, useMemo, useState } from "react";
import {
  fetchRoles,
  createRole,
  updateRole,
  deleteRole,
  toggleRoleStatus,
  assignPermissions,
} from "../utils/api";

const PAGE_SIZE = 12;

const AVAILABLE_PERMISSIONS = [
  "cms",
  "products",
  "orders",
  "customers",
  "categories",
  "coupons",
  "banners",
  "shipping",
  "payments",
  "inventory",
  "vendors",
  "marketing",
  "reports",
  "support",
  "security",
  "settings",
  "analytics",
];

const PROTECTED_ROLE_NAMES = [
  "super admin",
  "superadmin",
  "super_admin",
];

function RolesManager() {
  const [roles, setRoles] = useState([]);

  const [loadingRoles, setLoadingRoles] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPermission, setFilterPermission] = useState("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRoles, setTotalRoles] = useState(0);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
  });

  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [roleForPermissions, setRoleForPermissions] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [roleToToggle, setRoleToToggle] = useState(null);
  const [nextRoleStatus, setNextRoleStatus] = useState("");

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      status: filterStatus,
      permission: filterPermission,
    }),
    [debouncedSearch, filterStatus, filterPermission]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    loadRoles();
  }, [page, filters.search, filters.status, filters.permission]);

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

  const isProtectedRole = (role) => {
    const roleName = String(role?.name || "")
      .trim()
      .toLowerCase();

    return PROTECTED_ROLE_NAMES.includes(roleName);
  };

  const getStatusClass = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (
      normalized === "active" ||
      normalized === "enabled" ||
      normalized === "active_role"
    ) {
      return "bg-green-100 text-green-700";
    }

    if (
      normalized === "inactive" ||
      normalized === "disabled" ||
      normalized === "archived"
    ) {
      return "bg-red-100 text-red-700";
    }

    return "bg-gray-100 text-gray-700";
  };

  const normalizePermissions = (permissions) => {
    if (Array.isArray(permissions)) {
      return permissions.filter(Boolean);
    }

    if (typeof permissions === "string") {
      return permissions
        .split(",")
        .map((permission) => permission.trim())
        .filter(Boolean);
    }

    return [];
  };

  const loadRoles = async () => {
    setLoadingRoles(true);
    setError("");

    try {
      const response = await fetchRoles({
        page,
        pageSize: PAGE_SIZE,
        limit: PAGE_SIZE,
        search: filters.search,
        status: filters.status === "all" ? undefined : filters.status,
        permission:
          filters.permission === "all"
            ? undefined
            : filters.permission,
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

      setRoles(items);
      setTotalPages(Math.max(1, receivedTotalPages));
      setTotalRoles(receivedTotal);
    } catch (err) {
      setRoles([]);
      setError(
        err?.message || "Could not load roles. Please try again."
      );
    } finally {
      setLoadingRoles(false);
    }
  };

  const refreshRoles = async () => {
    clearMessages();

    await loadRoles();

    setSuccess("Roles refreshed successfully.");
  };

  const openCreateRoleModal = () => {
    clearMessages();

    setEditingRole(null);
    setRoleForm({
      name: "",
      description: "",
    });

    setShowRoleModal(true);
  };

  const openEditRoleModal = (role) => {
    clearMessages();

    setEditingRole(role);

    setRoleForm({
      name: role?.name || "",
      description: role?.description || "",
    });

    setShowRoleModal(true);
  };

  const closeRoleModal = () => {
    setShowRoleModal(false);
    setEditingRole(null);
    setRoleForm({
      name: "",
      description: "",
    });
  };

  const saveRole = async () => {
    const name = roleForm.name.trim();
    const description = roleForm.description.trim();

    if (!name) {
      setError("Role name is required.");
      return;
    }

    if (name.length < 2) {
      setError("Role name must contain at least 2 characters.");
      return;
    }

    clearMessages();
    setActionLoading(editingRole?.id ? `update-${editingRole.id}` : "create");

    try {
      if (editingRole?.id) {
        const response = await updateRole({
          id: editingRole.id,
          data: {
            name,
            description,
          },
        });

        setSuccess(response?.message || "Role updated successfully.");
      } else {
        const response = await createRole({
          name,
          description,
        });

        setSuccess(response?.message || "Role created successfully.");
      }

      closeRoleModal();
      await loadRoles();
    } catch (err) {
      setError(
        err?.message ||
          `Could not ${editingRole?.id ? "update" : "create"} role.`
      );
    } finally {
      setActionLoading("");
    }
  };

  const openPermissionsModal = (role) => {
    clearMessages();

    setRoleForPermissions(role);
    setSelectedPermissions(normalizePermissions(role?.permissions));

    setShowPermissionsModal(true);
  };

  const closePermissionsModal = () => {
    setRoleForPermissions(null);
    setSelectedPermissions([]);
    setShowPermissionsModal(false);
  };

  const togglePermission = (permission) => {
    setSelectedPermissions((currentPermissions) =>
      currentPermissions.includes(permission)
        ? currentPermissions.filter(
            (currentPermission) => currentPermission !== permission
          )
        : [...currentPermissions, permission]
    );
  };

  const savePermissions = async () => {
    if (!roleForPermissions?.id) return;

    clearMessages();
    setActionLoading(`permissions-${roleForPermissions.id}`);

    try {
      const response = await assignPermissions({
        id: roleForPermissions.id,
        permissions: selectedPermissions,
      });

      setSuccess(
        response?.message || "Role permissions updated successfully."
      );

      closePermissionsModal();
      await loadRoles();
    } catch (err) {
      setError(err?.message || "Could not update role permissions.");
    } finally {
      setActionLoading("");
    }
  };

  const openDeleteModal = (role) => {
    clearMessages();

    if (isProtectedRole(role)) {
      setError("The Super Admin role cannot be deleted.");
      return;
    }

    setRoleToDelete(role);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setRoleToDelete(null);
    setShowDeleteModal(false);
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete?.id) return;

    clearMessages();
    setActionLoading(`delete-${roleToDelete.id}`);

    try {
      const response = await deleteRole({
        id: roleToDelete.id,
      });

      setSuccess(response?.message || "Role deleted successfully.");

      closeDeleteModal();
      await loadRoles();
    } catch (err) {
      setError(err?.message || "Could not delete role.");
    } finally {
      setActionLoading("");
    }
  };

  const openStatusModal = (role) => {
    clearMessages();

    if (isProtectedRole(role)) {
      setError("The Super Admin role cannot be disabled.");
      return;
    }

    const currentStatus = String(role?.status || "").toLowerCase();

    setRoleToToggle(role);
    setNextRoleStatus(
      currentStatus === "active" || currentStatus === "enabled"
        ? "inactive"
        : "active"
    );

    setShowStatusModal(true);
  };

  const closeStatusModal = () => {
    setRoleToToggle(null);
    setNextRoleStatus("");
    setShowStatusModal(false);
  };

  const confirmToggleRole = async () => {
    if (!roleToToggle?.id || !nextRoleStatus) return;

    clearMessages();
    setActionLoading(`status-${roleToToggle.id}`);

    try {
      const response = await toggleRoleStatus({
        id: roleToToggle.id,
        status: nextRoleStatus,
      });

      setSuccess(response?.message || "Role status updated successfully.");

      closeStatusModal();
      await loadRoles();
    } catch (err) {
      setError(err?.message || "Could not update role status.");
    } finally {
      setActionLoading("");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setFilterStatus("all");
    setFilterPermission("all");
    setPage(1);
  };

  return (
    <div className="roles-manager px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">
            Roles & Permissions Manager
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Create roles, manage access permissions, and control role activation status.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openCreateRoleModal}
            disabled={Boolean(actionLoading)}
            className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Create Role
          </button>

          <button
            type="button"
            onClick={refreshRoles}
            disabled={loadingRoles || Boolean(actionLoading)}
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
          Search & Filters
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            type="text"
            placeholder="Search role name or description..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          />

          <select
            value={filterStatus}
            onChange={(event) => {
              setFilterStatus(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="disabled">Disabled</option>
          </select>

          <select
            value={filterPermission}
            onChange={(event) => {
              setFilterPermission(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
          >
            <option value="all">All Permissions</option>

            {AVAILABLE_PERMISSIONS.map((permission) => (
              <option key={permission} value={permission}>
                {permission.charAt(0).toUpperCase() + permission.slice(1)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={clearFilters}
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
              Available Roles
            </h2>

            <p className="text-sm text-gray-500">
              Total matching roles: {totalRoles}
            </p>
          </div>

          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
        </div>

        {loadingRoles && roles.length === 0 ? (
          <p className="py-8 text-center text-indigo-700">
            Loading roles...
          </p>
        ) : roles.length === 0 ? (
          <p className="py-8 text-center text-gray-600">
            No roles found.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {roles.map((role) => {
              const permissions = normalizePermissions(role.permissions);
              const isProtected = isProtectedRole(role);

              const isActive =
                String(role.status || "").toLowerCase() === "active" ||
                String(role.status || "").toLowerCase() === "enabled";

              return (
                <article
                  key={role.id}
                  className="rounded-lg border bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-indigo-900">
                        {role.name || "Unnamed Role"}
                      </h3>

                      <p className="mt-1 text-sm text-gray-600">
                        {role.description || "No description provided."}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {isProtected && (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                          Protected
                        </span>
                      )}

                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                          role.status
                        )}`}
                      >
                        {role.status || "active"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-md bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">
                      Permissions ({permissions.length})
                    </p>

                    {permissions.length === 0 ? (
                      <p className="mt-2 text-sm text-gray-600">
                        No permissions assigned.
                      </p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {permissions.map((permission) => (
                          <span
                            key={permission}
                            className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700"
                          >
                            {permission}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditRoleModal(role)}
                      disabled={Boolean(actionLoading)}
                      className="rounded-md bg-yellow-500 px-3 py-1.5 text-sm text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Edit Role
                    </button>

                    <button
                      type="button"
                      onClick={() => openPermissionsModal(role)}
                      disabled={Boolean(actionLoading)}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Permissions
                    </button>

                    <button
                      type="button"
                      onClick={() => openStatusModal(role)}
                      disabled={Boolean(actionLoading) || isProtected}
                      className="rounded-md bg-indigo-700 px-3 py-1.5 text-sm text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isActive ? "Disable" : "Enable"}
                    </button>

                    <button
                      type="button"
                      onClick={() => openDeleteModal(role)}
                      disabled={Boolean(actionLoading) || isProtected}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
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
            disabled={page <= 1 || loadingRoles}
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
            disabled={page >= totalPages || loadingRoles}
            className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </section>

      {showRoleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  {editingRole?.id ? "Edit Role" : "Create Role"}
                </h2>

                <p className="text-sm text-gray-500">
                  Define the name and internal description for this role.
                </p>
              </div>

              <button
                type="button"
                onClick={closeRoleModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Role Name
                </label>

                <input
                  type="text"
                  value={roleForm.name}
                  onChange={(event) =>
                    setRoleForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Example: Content Moderator"
                  className="w-full rounded-md border px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description
                </label>

                <textarea
                  value={roleForm.description}
                  onChange={(event) =>
                    setRoleForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Describe what this role can do..."
                  className="w-full rounded-md border p-3 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeRoleModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveRole}
                disabled={
                  actionLoading === "create" ||
                  actionLoading === `update-${editingRole?.id}`
                }
                className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "create" ||
                actionLoading === `update-${editingRole?.id}`
                  ? "Saving..."
                  : editingRole?.id
                    ? "Save Changes"
                    : "Create Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPermissionsModal && roleForPermissions && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Manage Permissions
                </h2>

                <p className="text-sm text-gray-500">
                  Role: {roleForPermissions.name || "Unnamed Role"}
                </p>
              </div>

              <button
                type="button"
                onClick={closePermissionsModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {AVAILABLE_PERMISSIONS.map((permission) => (
                <label
                  key={permission}
                  className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                  />

                  <span className="text-sm font-medium capitalize text-gray-700">
                    {permission}
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-4 rounded-md bg-gray-50 p-3 text-sm text-gray-600">
              Selected permissions: {selectedPermissions.length}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closePermissionsModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={savePermissions}
                disabled={
                  actionLoading ===
                  `permissions-${roleForPermissions.id}`
                }
                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ===
                `permissions-${roleForPermissions.id}`
                  ? "Saving..."
                  : "Save Permissions"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && roleToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <h2 className="text-xl font-bold text-red-700">
              Delete Role
            </h2>

            <p className="mt-3 text-sm text-gray-700">
              Are you sure you want to delete the role{" "}
              <span className="font-semibold">
                {roleToDelete.name || "Unnamed Role"}
              </span>
              ? This action cannot be undone.
            </p>

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
                onClick={confirmDeleteRole}
                disabled={actionLoading === `delete-${roleToDelete.id}`}
                className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `delete-${roleToDelete.id}`
                  ? "Deleting..."
                  : "Delete Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showStatusModal && roleToToggle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <h2 className="text-xl font-bold text-indigo-900">
              {nextRoleStatus === "active" ? "Enable Role" : "Disable Role"}
            </h2>

            <p className="mt-3 text-sm text-gray-700">
              {nextRoleStatus === "active"
                ? `Enable the ${roleToToggle.name || "selected"} role? Users with this role will regain access based on its permissions.`
                : `Disable the ${roleToToggle.name || "selected"} role? Users with this role may lose access to protected features.`}
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeStatusModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmToggleRole}
                disabled={actionLoading === `status-${roleToToggle.id}`}
                className={`rounded-md px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                  nextRoleStatus === "active"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-indigo-700 hover:bg-indigo-800"
                }`}
              >
                {actionLoading === `status-${roleToToggle.id}`
                  ? "Updating..."
                  : nextRoleStatus === "active"
                    ? "Enable Role"
                    : "Disable Role"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RolesManager;