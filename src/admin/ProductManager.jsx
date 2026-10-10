import React, { useMemo, useState } from "react";

function ProductManager() {
  const initialProducts = [
    {
      id: "WJ-1001",
      name: "Radiance Glow Skincare Kit",
      category: "Beauty & Skincare",
      price: 1299,
      originalPrice: 1699,
      stock: 42,
      status: "Active",
      featured: true,
      createdAt: "2026-09-28",
      description: "A complete daily skincare ritual for a soft, radiant glow.",
    },
    {
      id: "WJ-1002",
      name: "Golden Aura Jewellery Set",
      category: "Jewellery",
      price: 2499,
      originalPrice: 3299,
      stock: 18,
      status: "Active",
      featured: true,
      createdAt: "2026-09-26",
      description: "Elegant festive jewellery designed to make every wish shine.",
    },
    {
      id: "WJ-1003",
      name: "Everyday Chic Handbag",
      category: "Fashion",
      price: 1899,
      originalPrice: 2199,
      stock: 8,
      status: "Low Stock",
      featured: false,
      createdAt: "2026-09-21",
      description: "A versatile everyday handbag for effortless style.",
    },
    {
      id: "WJ-1004",
      name: "Magic Learning Toy Box",
      category: "Toys & Kids",
      price: 999,
      originalPrice: 1399,
      stock: 35,
      status: "Active",
      featured: false,
      createdAt: "2026-09-18",
      description: "Fun learning activities packed into one magical toy box.",
    },
    {
      id: "WJ-1005",
      name: "Lavender Dream Home Fragrance",
      category: "Everyday Essentials",
      price: 699,
      originalPrice: 899,
      stock: 0,
      status: "Out of Stock",
      featured: false,
      createdAt: "2026-09-15",
      description: "A calming lavender fragrance for peaceful everyday moments.",
    },
    {
      id: "WJ-1006",
      name: "Silk Bloom Fashion Scarf",
      category: "Fashion",
      price: 849,
      originalPrice: 1099,
      stock: 24,
      status: "Draft",
      featured: false,
      createdAt: "2026-09-11",
      description: "A soft statement scarf with an elegant floral finish.",
    },
  ];

  const emptyProduct = {
    id: "",
    name: "",
    category: "Beauty & Skincare",
    price: "",
    originalPrice: "",
    stock: "",
    status: "Active",
    featured: false,
    description: "",
  };

  const [products, setProducts] = useState(initialProducts);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedStatus, setSelectedStatus] = useState("All Statuses");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedIds, setSelectedIds] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(emptyProduct);
  const [notification, setNotification] = useState("");
  const [viewMode, setViewMode] = useState("table");

  const categories = [
    "Beauty & Skincare",
    "Fashion",
    "Jewellery",
    "Toys & Kids",
    "Everyday Essentials",
  ];

  const showNotification = (message) => {
    setNotification(message);

    window.setTimeout(() => {
      setNotification("");
    }, 3000);
  };

  const formatCurrency = (value) => {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
  };

  const calculateDiscount = (product) => {
    const price = Number(product.price || 0);
    const originalPrice = Number(product.originalPrice || 0);

    if (!price || !originalPrice || originalPrice <= price) {
      return 0;
    }

    return Math.round(((originalPrice - price) / originalPrice) * 100);
  };

  const visibleProducts = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.id.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);

      const matchesCategory =
        selectedCategory === "All Categories" ||
        product.category === selectedCategory;

      const matchesStatus =
        selectedStatus === "All Statuses" ||
        product.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });

    return [...filtered].sort((firstProduct, secondProduct) => {
      if (sortBy === "price-low") {
        return Number(firstProduct.price) - Number(secondProduct.price);
      }

      if (sortBy === "price-high") {
        return Number(secondProduct.price) - Number(firstProduct.price);
      }

      if (sortBy === "stock-low") {
        return Number(firstProduct.stock) - Number(secondProduct.stock);
      }

      if (sortBy === "name") {
        return firstProduct.name.localeCompare(secondProduct.name);
      }

      return (
        new Date(secondProduct.createdAt).getTime() -
        new Date(firstProduct.createdAt).getTime()
      );
    });
  }, [products, searchText, selectedCategory, selectedStatus, sortBy]);

  const totalStock = products.reduce(
    (total, product) => total + Number(product.stock || 0),
    0
  );

  const lowStockCount = products.filter(
    (product) =>
      product.status === "Low Stock" ||
      (Number(product.stock) > 0 && Number(product.stock) <= 10)
  ).length;

  const outOfStockCount = products.filter(
    (product) => Number(product.stock) === 0 || product.status === "Out of Stock"
  ).length;

  const activeProductsCount = products.filter(
    (product) => product.status === "Active"
  ).length;

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData(emptyProduct);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      ...product,
      price: String(product.price),
      originalPrice: String(product.originalPrice),
      stock: String(product.stock),
    });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
    setFormData(emptyProduct);
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSaveProduct = (event) => {
    event.preventDefault();

    const productName = formData.name.trim();
    const price = Number(formData.price);
    const originalPrice = Number(formData.originalPrice || formData.price);
    const stock = Number(formData.stock);

    if (!productName) {
      showNotification("Please enter a product name.");
      return;
    }

    if (Number.isNaN(price) || price <= 0) {
      showNotification("Please enter a valid selling price.");
      return;
    }

    if (Number.isNaN(stock) || stock < 0) {
      showNotification("Please enter a valid stock quantity.");
      return;
    }

    const updatedStatus =
      stock === 0
        ? "Out of Stock"
        : stock <= 10 && formData.status === "Active"
          ? "Low Stock"
          : formData.status;

    const productPayload = {
      ...formData,
      id: editingProduct
        ? editingProduct.id
        : `WJ-${String(Date.now()).slice(-6)}`,
      name: productName,
      price,
      originalPrice: originalPrice >= price ? originalPrice : price,
      stock,
      status: updatedStatus,
      description: formData.description.trim(),
      createdAt: editingProduct
        ? editingProduct.createdAt
        : new Date().toISOString().slice(0, 10),
    };

    if (editingProduct) {
      setProducts((previousProducts) =>
        previousProducts.map((product) =>
          product.id === editingProduct.id ? productPayload : product
        )
      );
      showNotification(`${productName} has been updated.`);
    } else {
      setProducts((previousProducts) => [productPayload, ...previousProducts]);
      showNotification(`${productName} has been added.`);
    }

    handleCloseForm();
  };

  const handleDeleteProduct = (productId) => {
    const product = products.find((item) => item.id === productId);

    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete "${product?.name || "this product"}"?`)
    ) {
      return;
    }

    setProducts((previousProducts) =>
      previousProducts.filter((product) => product.id !== productId)
    );
    setSelectedIds((previousIds) =>
      previousIds.filter((selectedId) => selectedId !== productId)
    );
    showNotification("Product deleted successfully.");
  };

  const handleDuplicateProduct = (product) => {
    const duplicatedProduct = {
      ...product,
      id: `WJ-${String(Date.now()).slice(-6)}`,
      name: `${product.name} Copy`,
      status: "Draft",
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setProducts((previousProducts) => [duplicatedProduct, ...previousProducts]);
    showNotification(`${product.name} has been duplicated as a draft.`);
  };

  const toggleSelectedProduct = (productId) => {
    setSelectedIds((previousIds) =>
      previousIds.includes(productId)
        ? previousIds.filter((id) => id !== productId)
        : [...previousIds, productId]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = visibleProducts.map((product) => product.id);
    const allVisibleSelected =
      visibleIds.length > 0 &&
      visibleIds.every((productId) => selectedIds.includes(productId));

    if (allVisibleSelected) {
      setSelectedIds((previousIds) =>
        previousIds.filter((productId) => !visibleIds.includes(productId))
      );
      return;
    }

    setSelectedIds((previousIds) => [
      ...new Set([...previousIds, ...visibleIds]),
    ]);
  };

  const handleBulkStatusUpdate = (status) => {
    if (selectedIds.length === 0) {
      showNotification("Select at least one product first.");
      return;
    }

    setProducts((previousProducts) =>
      previousProducts.map((product) =>
        selectedIds.includes(product.id) ? { ...product, status } : product
      )
    );

    showNotification(
      `${selectedIds.length} product${
        selectedIds.length === 1 ? "" : "s"
      } updated to ${status}.`
    );
    setSelectedIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) {
      showNotification("Select at least one product first.");
      return;
    }

    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Delete ${selectedIds.length} selected product${
          selectedIds.length === 1 ? "" : "s"
        }?`
      )
    ) {
      return;
    }

    setProducts((previousProducts) =>
      previousProducts.filter((product) => !selectedIds.includes(product.id))
    );

    showNotification(
      `${selectedIds.length} selected product${
        selectedIds.length === 1 ? "" : "s"
      } deleted.`
    );
    setSelectedIds([]);
  };

  const getStatusClass = (status) => {
    const statusStyles = {
      Active: "bg-emerald-100 text-emerald-700",
      Draft: "bg-slate-200 text-slate-700",
      "Low Stock": "bg-amber-100 text-amber-700",
      "Out of Stock": "bg-rose-100 text-rose-700",
    };

    return statusStyles[status] || "bg-slate-100 text-slate-700";
  };

  const allVisibleSelected =
    visibleProducts.length > 0 &&
    visibleProducts.every((product) => selectedIds.includes(product.id));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-800 to-purple-800 p-6 text-white shadow-xl sm:p-8">
          <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-yellow-300/20 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-fuchsia-400/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-400 text-xl font-black text-indigo-950 shadow-lg">
                  ✦
                </span>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-300">
                    Wish Jinny Admin
                  </p>
                  <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                    Product Manager
                  </h1>
                </div>
              </div>

              <p className="mt-5 max-w-2xl text-sm leading-6 text-indigo-100 sm:text-base">
                Create, organize and manage every magical product in your Wish
                Jinny marketplace—from beauty and fashion to jewellery, toys
                and everyday essentials.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-indigo-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-yellow-300"
            >
              <span className="text-lg leading-none">+</span>
              Add New Product
            </button>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">All Products</p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {products.length}
            </p>
            <p className="mt-2 text-xs font-semibold text-indigo-600">
              Your complete catalogue
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Active Products
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-600">
              {activeProductsCount}
            </p>
            <p className="mt-2 text-xs font-semibold text-emerald-600">
              Live and visible to shoppers
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Low Stock</p>
            <p className="mt-2 text-3xl font-black text-amber-600">
              {lowStockCount}
            </p>
            <p className="mt-2 text-xs font-semibold text-amber-600">
              Products needing attention
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Out of Stock
            </p>
            <p className="mt-2 text-3xl font-black text-rose-600">
              {outOfStockCount}
            </p>
            <p className="mt-2 text-xs font-semibold text-rose-600">
              {totalStock.toLocaleString("en-IN")} total units in inventory
            </p>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
            <div className="relative">
              <label htmlFor="product-search" className="sr-only">
                Search products
              </label>
              <input
                id="product-search"
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search by product name, category or product ID..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option>All Categories</option>
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option>All Statuses</option>
              <option>Active</option>
              <option>Draft</option>
              <option>Low Stock</option>
              <option>Out of Stock</option>
            </select>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="newest">Newest first</option>
              <option value="name">Name A–Z</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="stock-low">Stock: low to high</option>
            </select>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-500">
              Showing{" "}
              <span className="font-black text-slate-800">
                {visibleProducts.length}
              </span>{" "}
              of {products.length} products
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {selectedIds.length > 0 && (
                <>
                  <span className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700">
                    {selectedIds.length} selected
                  </span>

                  <button
                    type="button"
                    onClick={() => handleBulkStatusUpdate("Active")}
                    className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50"
                  >
                    Set Active
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBulkStatusUpdate("Draft")}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Set Draft
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50"
                  >
                    Delete Selected
                  </button>
                </>
              )}

              <div className="flex rounded-lg border border-slate-200 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                    viewMode === "table"
                      ? "bg-indigo-700 text-white"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  Table
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                    viewMode === "grid"
                      ? "bg-indigo-700 text-white"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  Grid
                </button>
              </div>
            </div>
          </div>
        </section>

        {viewMode === "table" ? (
          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="w-12 px-4 py-4">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAllVisible}
                        aria-label="Select all visible products"
                        className="h-4 w-4 rounded border-slate-300 text-indigo-700 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-4 py-4 font-bold">Product</th>
                    <th className="px-4 py-4 font-bold">Category</th>
                    <th className="px-4 py-4 font-bold">Price</th>
                    <th className="px-4 py-4 font-bold">Stock</th>
                    <th className="px-4 py-4 font-bold">Status</th>
                    <th className="px-4 py-4 text-right font-bold">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleProducts.length > 0 ? (
                    visibleProducts.map((product) => {
                      const discount = calculateDiscount(product);

                      return (
                        <tr
                          key={product.id}
                          className="border-b border-slate-100 text-sm transition hover:bg-indigo-50/40 last:border-0"
                        >
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(product.id)}
                              onChange={() => toggleSelectedProduct(product.id)}
                              aria-label={`Select ${product.name}`}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-700 focus:ring-indigo-500"
                            />
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 via-purple-100 to-yellow-100 text-sm font-black text-indigo-700">
                                {product.name.charAt(0)}
                              </span>

                              <div className="min-w-0">
                                <p className="max-w-[220px] truncate font-black text-slate-800">
                                  {product.name}
                                </p>
                                <p className="mt-1 text-xs font-medium text-slate-400">
                                  {product.id}
                                  {product.featured ? " · Featured" : ""}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-600">
                            {product.category}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <p className="font-black text-indigo-700">
                              {formatCurrency(product.price)}
                            </p>
                            {discount > 0 && (
                              <p className="mt-1 text-xs font-semibold text-emerald-600">
                                {discount}% off ·{" "}
                                <span className="text-slate-400 line-through">
                                  {formatCurrency(product.originalPrice)}
                                </span>
                              </p>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <span
                              className={`font-black ${
                                Number(product.stock) === 0
                                  ? "text-rose-600"
                                  : Number(product.stock) <= 10
                                    ? "text-amber-600"
                                    : "text-slate-800"
                              }`}
                            >
                              {product.stock}
                            </span>
                            <span className="ml-1 text-xs text-slate-400">
                              units
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <span
                              className={`rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClass(
                                product.status
                              )}`}
                            >
                              {product.status}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(product)}
                                className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDuplicateProduct(product)}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                              >
                                Copy
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(product.id)}
                                className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-14 text-center">
                        <p className="text-lg font-black text-slate-800">
                          No products found
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          Try changing your filters or add a magical new product.
                        </p>
                        <button
                          type="button"
                          onClick={handleOpenCreate}
                          className="mt-5 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-800"
                        >
                          Add Product
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleProducts.length > 0 ? (
              visibleProducts.map((product) => {
                const discount = calculateDiscount(product);

                return (
                  <article
                    key={product.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-100 to-yellow-100">
                      <span className="text-5xl font-black text-indigo-700/70">
                        {product.name.charAt(0)}
                      </span>

                      <input
                        type="checkbox"
                        checked={selectedIds.includes(product.id)}
                        onChange={() => toggleSelectedProduct(product.id)}
                        aria-label={`Select ${product.name}`}
                        className="absolute left-4 top-4 h-4 w-4 rounded border-slate-300 text-indigo-700 focus:ring-indigo-500"
                      />

                      {product.featured && (
                        <span className="absolute right-4 top-4 rounded-full bg-yellow-400 px-3 py-1 text-xs font-black text-indigo-950">
                          Featured
                        </span>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-wide text-purple-600">
                            {product.category}
                          </p>
                          <h2 className="mt-1 truncate text-lg font-black text-slate-900">
                            {product.name}
                          </h2>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${getStatusClass(
                            product.status
                          )}`}
                        >
                          {product.status}
                        </span>
                      </div>

                      <p className="mt-3 line-clamp-2 min-h-[40px] text-sm leading-5 text-slate-500">
                        {product.description || "No description added yet."}
                      </p>

                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xl font-black text-indigo-700">
                            {formatCurrency(product.price)}
                          </p>
                          {discount > 0 && (
                            <p className="text-xs font-semibold text-emerald-600">
                              {discount}% off
                            </p>
                          )}
                        </div>

                        <p className="text-right text-xs font-bold text-slate-500">
                          {product.stock} units
                          <br />
                          <span className="font-medium text-slate-400">
                            {product.id}
                          </span>
                        </p>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(product)}
                          className="rounded-lg border border-indigo-200 px-2 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicateProduct(product)}
                          className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                        >
                          Copy
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(product.id)}
                          className="rounded-lg border border-rose-200 px-2 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="col-span-full rounded-2xl border border-dashed border-indigo-200 bg-indigo-50 p-12 text-center">
                <p className="text-lg font-black text-indigo-950">
                  No products match your filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchText("");
                    setSelectedCategory("All Categories");
                    setSelectedStatus("All Statuses");
                  }}
                  className="mt-4 rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-800"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </section>
        )}

        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="product-form-title"
              className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-600">
                    Wish Jinny Catalogue
                  </p>
                  <h2
                    id="product-form-title"
                    className="mt-1 text-xl font-black text-slate-900"
                  >
                    {editingProduct ? "Edit Product" : "Add New Product"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={handleCloseForm}
                  aria-label="Close product form"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-xl font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="p-5 sm:p-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label
                      htmlFor="product-name"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Product Name
                    </label>
                    <input
                      id="product-name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleFormChange}
                      placeholder="Enter product name"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="product-category"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Category
                    </label>
                    <select
                      id="product-category"
                      name="category"
                      value={formData.category}
                      onChange={handleFormChange}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    >
                      {categories.map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="product-status"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Product Status
                    </label>
                    <select
                      id="product-status"
                      name="status"
                      value={formData.status}
                      onChange={handleFormChange}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option>Active</option>
                      <option>Draft</option>
                      <option>Low Stock</option>
                      <option>Out of Stock</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="product-price"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Selling Price (₹)
                    </label>
                    <input
                      id="product-price"
                      name="price"
                      type="number"
                      min="0"
                      step="1"
                      value={formData.price}
                      onChange={handleFormChange}
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="product-original-price"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Original Price (₹)
                    </label>
                    <input
                      id="product-original-price"
                      name="originalPrice"
                      type="number"
                      min="0"
                      step="1"
                      value={formData.originalPrice}
                      onChange={handleFormChange}
                      placeholder="Optional"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="product-stock"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Stock Quantity
                    </label>
                    <input
                      id="product-stock"
                      name="stock"
                      type="number"
                      min="0"
                      step="1"
                      value={formData.stock}
                      onChange={handleFormChange}
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <label className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-bold text-amber-800">
                    <input
                      name="featured"
                      type="checkbox"
                      checked={formData.featured}
                      onChange={handleFormChange}
                      className="h-4 w-4 rounded border-amber-300 text-indigo-700 focus:ring-indigo-500"
                    />
                    Feature this magical product
                  </label>

                  <div className="md:col-span-2">
                    <label
                      htmlFor="product-description"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Product Description
                    </label>
                    <textarea
                      id="product-description"
                      name="description"
                      rows="4"
                      value={formData.description}
                      onChange={handleFormChange}
                      placeholder="Write a clear, customer-friendly product description..."
                      className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 px-5 py-3 text-sm font-black text-white shadow-md transition hover:from-indigo-800 hover:to-purple-800"
                  >
                    {editingProduct ? "Save Changes" : "Add Product"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {notification && (
          <div
            role="status"
            className="fixed bottom-5 right-5 z-[60] max-w-sm rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-700 shadow-xl"
          >
            {notification}
          </div>
        )}
      </div>
    </main>
  );
}

export default ProductManager;