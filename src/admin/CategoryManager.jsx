// src/admin/CategoryManager.jsx

import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 12;

const EMPTY_CATEGORY = {
  name: "",
  description: "",
  image: "",
  displayOrder: "",
  status: "active",
};

const EMPTY_SUBCATEGORY = {
  name: "",
  description: "",
  image: "",
  displayOrder: "",
};

const INITIAL_CATEGORIES = [
  {
    id: "CAT-001",
    name: "Beauty & Skincare",
    description: "Premium skincare, makeup, wellness and beauty essentials.",
    image: "",
    displayOrder: 1,
    status: "active",
    subcategories: [
      {
        id: "SUB-001",
        name: "Face Care",
        description: "Cleansers, serums, moisturizers and masks.",
        image: "",
        displayOrder: 1,
      },
      {
        id: "SUB-002",
        name: "Makeup",
        description: "Lipsticks, foundation, eye makeup and more.",
        image: "",
        displayOrder: 2,
      },
    ],
  },
  {
    id: "CAT-002",
    name: "Fashion",
    description: "Modern fashion, footwear, bags and style accessories.",
    image: "",
    displayOrder: 2,
    status: "active",
    subcategories: [
      {
        id: "SUB-003",
        name: "Women Clothing",
        description: "Dresses, tops, ethnic wear and more.",
        image: "",
        displayOrder: 1,
      },
      {
        id: "SUB-004",
        name: "Men Clothing",
        description: "Shirts, t-shirts, jeans and more.",
        image: "",
        displayOrder: 2,
      },
    ],
  },
  {
    id: "CAT-003",
    name: "Jewellery",
    description: "Elegant jewellery, watches and premium accessories.",
    image: "",
    displayOrder: 3,
    status: "active",
    subcategories: [
      {
        id: "SUB-005",
        name: "Necklaces",
        description: "Statement necklaces and chains.",
        image: "",
        displayOrder: 1,
      },
    ],
  },
  {
    id: "CAT-004",
    name: "Toys & Kids",
    description: "Educational toys, gifts, games and kids essentials.",
    image: "",
    displayOrder: 4,
    status: "inactive",
    subcategories: [],
  },
];

function CategoryManager() {
  const [allCategories, setAllCategories] = useState(INITIAL_CATEGORIES);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("order");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCategories, setTotalCategories] = useState(0);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY);

  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [parentCategory, setParentCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [subcategoryForm, setSubcategoryForm] = useState(EMPTY_SUBCATEGORY);

  const [showDeleteCategoryModal, setShowDeleteCategoryModal] =
    useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const [showDeleteSubcategoryModal, setShowDeleteSubcategoryModal] =
    useState(false);
  const [subcategoryToDelete, setSubcategoryToDelete] = useState(null);
  const [subcategoryParent, setSubcategoryParent] = useState(null);

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      status: filterStatus,
      sort: sortBy,
    }),
    [debouncedSearch, filterStatus, sortBy]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    loadCategories();
  }, [allCategories, page, filters.search, filters.status, filters.sort]);

  const createId = (prefix) => {
    return `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;
  };

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const getSubcategories = (category) => {
    return Array.isArray(category?.subcategories)
      ? category.subcategories
      : [];
  };

  const getStatusClass = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (normalized === "active") {
      return "bg-emerald-100 text-emerald-700";
    }

    if (normalized === "inactive") {
      return "bg-rose-100 text-rose-700";
    }

    return "bg-slate-100 text-slate-700";
  };

  const formatOrder = (value) => {
    return value === undefined || value === null || value === ""
      ? "Not set"
      : value;
  };

  const loadCategories = () => {
    setLoadingCategories(true);

    window.setTimeout(() => {
      let items = [...allCategories];

      if (filters.search) {
        const query = filters.search.toLowerCase();

        items = items.filter((category) => {
          const categoryMatches = [
            category.name,
            category.description,
          ].some((value) => String(value || "").toLowerCase().includes(query));

          const subcategoryMatches = getSubcategories(category).some(
            (subcategory) =>
              [subcategory.name, subcategory.description].some((value) =>
                String(value || "").toLowerCase().includes(query)
              )
          );

          return categoryMatches || subcategoryMatches;
        });
      }

      if (filters.status !== "all") {
        items = items.filter(
          (category) => category.status === filters.status
        );
      }

      items.sort((first, second) => {
        if (filters.sort === "name") {
          return first.name.localeCompare(second.name);
        }

        if (filters.sort === "status") {
          return first.status.localeCompare(second.status);
        }

        return (
          Number(first.displayOrder || 0) - Number(second.displayOrder || 0)
        );
      });

      const total = items.length;
      const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const safePage = Math.min(page, pages);
      const start = (safePage - 1) * PAGE_SIZE;

      if (safePage !== page) {
        setPage(safePage);
      }

      setCategories(items.slice(start, start + PAGE_SIZE));
      setTotalCategories(total);
      setTotalPages(pages);
      setLoadingCategories(false);
    }, 180);
  };

  const refreshCategories = () => {
    clearMessages();
    loadCategories();
    setSuccess("Categories refreshed successfully.");
  };

  const openCreateCategoryModal = () => {
    clearMessages();
    setEditingCategory(null);
    setCategoryForm(EMPTY_CATEGORY);
    setShowCategoryModal(true);
  };

  const openEditCategoryModal = (category) => {
    clearMessages();
    setEditingCategory(category);

    setCategoryForm({
      name: category?.name || "",
      description: category?.description || "",
      image: category?.image || "",
      displayOrder:
        category?.displayOrder === undefined ||
        category?.displayOrder === null
          ? ""
          : String(category.displayOrder),
      status: category?.status || "active",
    });

    setShowCategoryModal(true);
  };

  const closeCategoryModal = () => {
    setEditingCategory(null);
    setCategoryForm(EMPTY_CATEGORY);
    setShowCategoryModal(false);
  };

  const validateCategory = () => {
    if (!categoryForm.name.trim()) {
      return "Category name is required.";
    }

    if (
      categoryForm.displayOrder &&
      (!Number.isInteger(Number(categoryForm.displayOrder)) ||
        Number(categoryForm.displayOrder) < 0)
    ) {
      return "Display order must be a whole number.";
    }

    return "";
  };

  const saveCategory = () => {
    const validationError = validateCategory();

    if (validationError) {
      setError(validationError);
      return;
    }

    clearMessages();

    const loadingKey = editingCategory?.id
      ? `update-category-${editingCategory.id}`
      : "add-category";

    setActionLoading(loadingKey);

    const payload = {
      name: categoryForm.name.trim(),
      description: categoryForm.description.trim(),
      image: categoryForm.image.trim(),
      displayOrder: categoryForm.displayOrder
        ? Number(categoryForm.displayOrder)
        : 0,
      status: categoryForm.status || "active",
    };

    window.setTimeout(() => {
      if (editingCategory?.id) {
        setAllCategories((currentCategories) =>
          currentCategories.map((category) =>
            category.id === editingCategory.id
              ? {
                  ...category,
                  ...payload,
                }
              : category
          )
        );

        setSuccess("Category updated successfully.");
      } else {
        setAllCategories((currentCategories) => [
          {
            id: createId("CAT"),
            ...payload,
            subcategories: [],
          },
          ...currentCategories,
        ]);

        setSuccess("Category added successfully.");
      }

      closeCategoryModal();
      setActionLoading("");
    }, 350);
  };

  const openDeleteCategoryModal = (category) => {
    clearMessages();
    setCategoryToDelete(category);
    setShowDeleteCategoryModal(true);
  };

  const closeDeleteCategoryModal = () => {
    setCategoryToDelete(null);
    setShowDeleteCategoryModal(false);
  };

  const confirmDeleteCategory = () => {
    if (!categoryToDelete?.id) return;

    clearMessages();
    setActionLoading(`delete-category-${categoryToDelete.id}`);

    window.setTimeout(() => {
      setAllCategories((currentCategories) =>
        currentCategories.filter(
          (category) => category.id !== categoryToDelete.id
        )
      );

      closeDeleteCategoryModal();
      setSuccess("Category deleted successfully.");
      setActionLoading("");
    }, 350);
  };

  const toggleCategoryStatus = (category) => {
    if (!category?.id) return;

    clearMessages();
    setActionLoading(`status-category-${category.id}`);

    const nextStatus = category.status === "active" ? "inactive" : "active";

    window.setTimeout(() => {
      setAllCategories((currentCategories) =>
        currentCategories.map((item) =>
          item.id === category.id
            ? {
                ...item,
                status: nextStatus,
              }
            : item
        )
      );

      setSuccess(
        `Category ${
          nextStatus === "active" ? "activated" : "deactivated"
        } successfully.`
      );
      setActionLoading("");
    }, 300);
  };

  const openAddSubcategoryModal = (category) => {
    clearMessages();
    setParentCategory(category);
    setEditingSubcategory(null);
    setSubcategoryForm(EMPTY_SUBCATEGORY);
    setShowSubcategoryModal(true);
  };

  const openEditSubcategoryModal = (category, subcategory) => {
    clearMessages();
    setParentCategory(category);
    setEditingSubcategory(subcategory);

    setSubcategoryForm({
      name: subcategory?.name || "",
      description: subcategory?.description || "",
      image: subcategory?.image || "",
      displayOrder:
        subcategory?.displayOrder === undefined ||
        subcategory?.displayOrder === null
          ? ""
          : String(subcategory.displayOrder),
    });

    setShowSubcategoryModal(true);
  };

  const closeSubcategoryModal = () => {
    setParentCategory(null);
    setEditingSubcategory(null);
    setSubcategoryForm(EMPTY_SUBCATEGORY);
    setShowSubcategoryModal(false);
  };

  const validateSubcategory = () => {
    if (!subcategoryForm.name.trim()) {
      return "Subcategory name is required.";
    }

    if (
      subcategoryForm.displayOrder &&
      (!Number.isInteger(Number(subcategoryForm.displayOrder)) ||
        Number(subcategoryForm.displayOrder) < 0)
    ) {
      return "Display order must be a whole number.";
    }

    return "";
  };

  const saveSubcategory = () => {
    if (!parentCategory?.id) return;

    const validationError = validateSubcategory();

    if (validationError) {
      setError(validationError);
      return;
    }

    clearMessages();

    const loadingKey = editingSubcategory?.id
      ? `update-subcategory-${editingSubcategory.id}`
      : `add-subcategory-${parentCategory.id}`;

    setActionLoading(loadingKey);

    const payload = {
      name: subcategoryForm.name.trim(),
      description: subcategoryForm.description.trim(),
      image: subcategoryForm.image.trim(),
      displayOrder: subcategoryForm.displayOrder
        ? Number(subcategoryForm.displayOrder)
        : 0,
    };

    window.setTimeout(() => {
      setAllCategories((currentCategories) =>
        currentCategories.map((category) => {
          if (category.id !== parentCategory.id) {
            return category;
          }

          const currentSubcategories = getSubcategories(category);

          if (editingSubcategory?.id) {
            return {
              ...category,
              subcategories: currentSubcategories.map((subcategory) =>
                subcategory.id === editingSubcategory.id
                  ? {
                      ...subcategory,
                      ...payload,
                    }
                  : subcategory
              ),
            };
          }

          return {
            ...category,
            subcategories: [
              ...currentSubcategories,
              {
                id: createId("SUB"),
                ...payload,
              },
            ],
          };
        })
      );

      setSuccess(
        editingSubcategory?.id
          ? "Subcategory updated successfully."
          : "Subcategory added successfully."
      );

      closeSubcategoryModal();
      setActionLoading("");
    }, 350);
  };

  const openDeleteSubcategoryModal = (category, subcategory) => {
    clearMessages();
    setSubcategoryParent(category);
    setSubcategoryToDelete(subcategory);
    setShowDeleteSubcategoryModal(true);
  };

  const closeDeleteSubcategoryModal = () => {
    setSubcategoryParent(null);
    setSubcategoryToDelete(null);
    setShowDeleteSubcategoryModal(false);
  };

  const confirmDeleteSubcategory = () => {
    if (!subcategoryParent?.id || !subcategoryToDelete?.id) return;

    clearMessages();
    setActionLoading(`delete-subcategory-${subcategoryToDelete.id}`);

    window.setTimeout(() => {
      setAllCategories((currentCategories) =>
        currentCategories.map((category) =>
          category.id === subcategoryParent.id
            ? {
                ...category,
                subcategories: getSubcategories(category).filter(
                  (subcategory) => subcategory.id !== subcategoryToDelete.id
                ),
              }
            : category
        )
      );

      closeDeleteSubcategoryModal();
      setSuccess("Subcategory deleted successfully.");
      setActionLoading("");
    }, 350);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setFilterStatus("all");
    setSortBy("order");
    setPage(1);
  };

  const updateCategoryForm = (field, value) => {
    setCategoryForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const updateSubcategoryForm = (field, value) => {
    setSubcategoryForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
              Wish Jinny Catalog
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-950">
              Category Manager
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Manage premium product categories, subcategories, display order
              and marketplace visibility.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openCreateCategoryModal}
              disabled={Boolean(actionLoading)}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add Category
            </button>

            <button
              type="button"
              onClick={refreshCategories}
              disabled={loadingCategories || Boolean(actionLoading)}
              className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingCategories ? "Refreshing..." : "Refresh"}
            </button>
          </div>
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
              Search & Filters
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Find and organize categories for your marketplace.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input
              type="search"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />

            <select
              value={filterStatus}
              onChange={(event) => {
                setFilterStatus(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="order">Display Order</option>
              <option value="name">Name A-Z</option>
              <option value="status">Status</option>
            </select>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Clear Filters
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Categories</h2>
              <p className="mt-1 text-sm text-slate-500">
                Total matching categories: {totalCategories}
              </p>
            </div>

            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              Page {page} of {totalPages}
            </span>
          </div>

          {loadingCategories && categories.length === 0 ? (
            <p className="py-10 text-center text-indigo-700">
              Loading categories...
            </p>
          ) : categories.length === 0 ? (
            <p className="py-10 text-center text-slate-500">
              No categories found.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {categories.map((category) => {
                const subcategories = getSubcategories(category);
                const isActive = category.status === "active";

                return (
                  <article
                    key={category.id}
                    className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md"
                  >
                    {category.image ? (
                      <img
                        src={category.image}
                        alt={category.name || "Category"}
                        className="h-44 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-44 items-center justify-center bg-gradient-to-br from-indigo-100 via-violet-50 to-amber-50 text-4xl">
                        ✦
                      </div>
                    )}

                    <div className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-bold text-slate-900">
                            {category.name || "Unnamed Category"}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {category.description || "No description provided."}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                            category.status
                          )}`}
                        >
                          {category.status || "inactive"}
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-medium text-slate-500">
                            Display Order
                          </p>
                          <p className="mt-1 text-lg font-bold text-slate-800">
                            {formatOrder(category.displayOrder)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-medium text-slate-500">
                            Subcategories
                          </p>
                          <p className="mt-1 text-lg font-bold text-slate-800">
                            {subcategories.length}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h4 className="font-bold text-slate-800">
                            Subcategories
                          </h4>

                          <button
                            type="button"
                            onClick={() => openAddSubcategoryModal(category)}
                            disabled={Boolean(actionLoading)}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Add Subcategory
                          </button>
                        </div>

                        {subcategories.length === 0 ? (
                          <p className="mt-4 text-sm text-slate-500">
                            No subcategories added.
                          </p>
                        ) : (
                          <div className="mt-4 space-y-2">
                            {subcategories.map((subcategory) => (
                              <div
                                key={subcategory.id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-3"
                              >
                                <div>
                                  <p className="font-semibold text-slate-800">
                                    {subcategory.name || "Unnamed Subcategory"}
                                  </p>
                                  {subcategory.description && (
                                    <p className="mt-1 text-xs text-slate-500">
                                      {subcategory.description}
                                    </p>
                                  )}
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditSubcategoryModal(
                                        category,
                                        subcategory
                                      )
                                    }
                                    disabled={Boolean(actionLoading)}
                                    className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openDeleteSubcategoryModal(
                                        category,
                                        subcategory
                                      )
                                    }
                                    disabled={Boolean(actionLoading)}
                                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEditCategoryModal(category)}
                          disabled={Boolean(actionLoading)}
                          className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Edit Category
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleCategoryStatus(category)}
                          disabled={Boolean(actionLoading)}
                          className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isActive ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          type="button"
                          onClick={() => openDeleteCategoryModal(category)}
                          disabled={Boolean(actionLoading)}
                          className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Delete Category
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="mt-7 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() =>
                setPage((currentPage) => Math.max(1, currentPage - 1))
              }
              disabled={page <= 1 || loadingCategories}
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
              disabled={page >= totalPages || loadingCategories}
              className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </section>
      </div>

      {showCategoryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Category form"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-indigo-600">
                  Catalog Management
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  {editingCategory ? "Edit Category" : "Add Category"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeCategoryModal}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Category Name
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(event) =>
                    updateCategoryForm("name", event.target.value)
                  }
                  placeholder="Electronics"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Display Order
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={categoryForm.displayOrder}
                  onChange={(event) =>
                    updateCategoryForm("displayOrder", event.target.value)
                  }
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Status
                </label>
                <select
                  value={categoryForm.status}
                  onChange={(event) =>
                    updateCategoryForm("status", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Image URL
                </label>
                <input
                  type="url"
                  value={categoryForm.image}
                  onChange={(event) =>
                    updateCategoryForm("image", event.target.value)
                  }
                  placeholder="https://example.com/image.jpg"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={(event) =>
                    updateCategoryForm("description", event.target.value)
                  }
                  rows={4}
                  placeholder="Short category description..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeCategoryModal}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveCategory}
                disabled={Boolean(actionLoading)}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? "Saving..." : "Save Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSubcategoryModal && parentCategory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Subcategory form"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-indigo-600">
                  {parentCategory.name}
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  {editingSubcategory ? "Edit Subcategory" : "Add Subcategory"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeSubcategoryModal}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Subcategory Name
                </label>
                <input
                  type="text"
                  value={subcategoryForm.name}
                  onChange={(event) =>
                    updateSubcategoryForm("name", event.target.value)
                  }
                  placeholder="Mobile Phones"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Display Order
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={subcategoryForm.displayOrder}
                  onChange={(event) =>
                    updateSubcategoryForm("displayOrder", event.target.value)
                  }
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Image URL
                </label>
                <input
                  type="url"
                  value={subcategoryForm.image}
                  onChange={(event) =>
                    updateSubcategoryForm("image", event.target.value)
                  }
                  placeholder="https://example.com/subcategory-image.jpg"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description
                </label>
                <textarea
                  value={subcategoryForm.description}
                  onChange={(event) =>
                    updateSubcategoryForm("description", event.target.value)
                  }
                  rows={4}
                  placeholder="Short subcategory description..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeSubcategoryModal}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveSubcategory}
                disabled={Boolean(actionLoading)}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? "Saving..." : "Save Subcategory"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteCategoryModal && categoryToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Delete category confirmation"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-rose-600">
              Permanent Action
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              Delete Category?
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Delete <strong>{categoryToDelete.name}</strong> and all its
              subcategories? This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteCategoryModal}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteCategory}
                disabled={Boolean(actionLoading)}
                className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? "Deleting..." : "Delete Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteSubcategoryModal &&
        subcategoryParent &&
        subcategoryToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Delete subcategory confirmation"
          >
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-rose-600">
                Permanent Action
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Delete Subcategory?
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Delete <strong>{subcategoryToDelete.name}</strong> from{" "}
                <strong>{subcategoryParent.name}</strong>? This action cannot
                be undone.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeDeleteSubcategoryModal}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmDeleteSubcategory}
                  disabled={Boolean(actionLoading)}
                  className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? "Deleting..." : "Delete Subcategory"}
                </button>
              </div>
            </div>
          </div>
        )}
    </main>
  );
}

export default CategoryManager;