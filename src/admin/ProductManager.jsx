import React, { useEffect, useMemo, useState } from "react";
import {
  fetchProducts,
  fetchProductDetails,
  createProduct,
  updateProduct,
  deleteProduct,
  publishProduct,
  unpublishProduct,
  uploadProductMedia,
  updateProductVariants,
  updateProductCategories,
  approveProduct,
  rejectProduct,
  fetchProductPerformance,
  bulkUpdateProducts,
  exportProductsCSV,
  exportProductsExcel,
  exportProductsPDF,
  logAuditEvent,
} from "../utils/api";

const PAGE_SIZE = 10;

const emptyProductForm = {
  name: "",
  description: "",
  sku: "",
  category: "",
  subcategory: "",
  price: "",
  discountPrice: "",
  stock: "",
  vendor: "",
  status: "draft",
};

function ProductManager() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [productFormMediaFiles, setProductFormMediaFiles] = useState([]);
  const [productFormMediaPreviews, setProductFormMediaPreviews] = useState([]);

  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("approved");
  const [bulkStock, setBulkStock] = useState("");

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [productToReject, setProductToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [showVariantsModal, setShowVariantsModal] = useState(false);
  const [variantsProduct, setVariantsProduct] = useState(null);
  const [variants, setVariants] = useState([]);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryProduct, setCategoryProduct] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    category: "",
    subcategory: "",
  });

  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaProduct, setMediaProduct] = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      status: statusFilter,
    }),
    [debouncedSearch, statusFilter]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    loadProducts();
  }, [page, filters.search, filters.status]);

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

  const formatNumber = (value) => {
    const number = Number(value);

    if (Number.isNaN(number)) {
      return "0";
    }

    return number.toLocaleString("en-IN");
  };

  const getStatusClass = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (
      normalized === "published" ||
      normalized === "approved" ||
      normalized === "active"
    ) {
      return "bg-green-100 text-green-700";
    }

    if (
      normalized === "rejected" ||
      normalized === "unpublished" ||
      normalized === "disabled"
    ) {
      return "bg-red-100 text-red-700";
    }

    if (normalized === "pending" || normalized === "draft") {
      return "bg-yellow-100 text-yellow-800";
    }

    return "bg-gray-100 text-gray-700";
  };

  const writeAuditLog = async (action, resourceId, details) => {
    try {
      await logAuditEvent({
        action,
        details: details || "",
        resourceType: "product",
        resourceId: resourceId || "",
      });
    } catch {
      // Main product action should not fail only because audit logging fails.
    }
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    setError("");

    try {
      const response = await fetchProducts({
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

      setProducts(items);
      setTotalPages(Math.max(1, receivedTotalPages));
      setTotalProducts(receivedTotal);
    } catch (err) {
      setProducts([]);
      setError(
        err?.message ||
          "⚠️ Products load नहीं हो पाए। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setLoadingProducts(false);
    }
  };

  const refreshProducts = async () => {
    clearMessages();
    await loadProducts();
    setSuccess("✅ Product data refresh हो गया।");
  };

  const openProductDetail = async (product) => {
    clearMessages();
    setActionLoading(`detail-${product.id}`);

    try {
      const [detailResult, performanceResult] = await Promise.allSettled([
        fetchProductDetails({ id: product.id }),
        fetchProductPerformance({ id: product.id }),
      ]);

      const detail =
        detailResult.status === "fulfilled"
          ? detailResult.value
          : product;

      const performance =
        performanceResult.status === "fulfilled"
          ? performanceResult.value || {}
          : detail?.performance || {};

      setSelectedProduct({
        ...product,
        ...(detail || {}),
        images: Array.isArray(detail?.images) ? detail.images : [],
        videos: Array.isArray(detail?.videos) ? detail.videos : [],
        variants: Array.isArray(detail?.variants) ? detail.variants : [],
        performance,
      });

      if (detailResult.status === "rejected") {
        setError(
          "⚠️ पूरी product details load नहीं हो पाईं। उपलब्ध जानकारी दिखाई जा रही है।"
        );
      }
    } catch (err) {
      setSelectedProduct({
        ...product,
        images: [],
        videos: [],
        variants: [],
        performance: {},
      });

      setError(
        err?.message ||
          "⚠️ Product details load नहीं हो पाए। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const closeProductDetail = () => {
    setSelectedProduct(null);
  };

  const openCreateForm = () => {
    clearMessages();
    setEditingProduct(null);
    setProductForm(emptyProductForm);
    setProductFormMediaFiles([]);
    setProductFormMediaPreviews([]);
    setShowProductForm(true);
  };

  const openEditForm = (product) => {
    clearMessages();

    setEditingProduct(product);
    setProductForm({
      name: product.name || "",
      description: product.description || "",
      sku: product.sku || "",
      category: product.category || "",
      subcategory: product.subcategory || "",
      price:
        product.price === undefined || product.price === null
          ? ""
          : String(product.price),
      discountPrice:
        product.discountPrice === undefined || product.discountPrice === null
          ? ""
          : String(product.discountPrice),
      stock:
        product.stock === undefined || product.stock === null
          ? ""
          : String(product.stock),
      vendor: product.vendor || "",
      status: product.status || "draft",
    });
    setProductFormMediaFiles([]);
    setProductFormMediaPreviews([]);

    setShowProductForm(true);
  };

  const closeProductForm = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    setProductForm(emptyProductForm);
    setProductFormMediaFiles([]);
    setProductFormMediaPreviews([]);
  };

  const handleProductFormChange = (field, value) => {
    setProductForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const handleProductFormMediaChange = (event) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    setProductFormMediaFiles(imageFiles);

    const previews = imageFiles.map((file) => URL.createObjectURL(file));
    setProductFormMediaPreviews(previews);
  };

  const clearProductFormMedia = () => {
    setProductFormMediaFiles([]);
    setProductFormMediaPreviews([]);
  };

  const saveProduct = async () => {
    clearMessages();

    if (!productForm.name.trim()) {
      setError("⚠️ Product name जरूरी है।");
      return;
    }

    if (!productForm.sku.trim()) {
      setError("⚠️ Product SKU जरूरी है।");
      return;
    }

    if (!productForm.category.trim()) {
      setError("⚠️ Product category जरूरी है।");
      return;
    }

    const price = Number(productForm.price);
    const stock = Number(productForm.stock);
    const discountPrice =
      productForm.discountPrice === ""
        ? null
        : Number(productForm.discountPrice);

    if (Number.isNaN(price) || price < 0) {
      setError("⚠️ Product price 0 या उससे ज्यादा होना चाहिए।");
      return;
    }

    if (Number.isNaN(stock) || stock < 0) {
      setError("⚠️ Product stock 0 या उससे ज्यादा होना चाहिए।");
      return;
    }

    if (
      discountPrice !== null &&
      (Number.isNaN(discountPrice) || discountPrice < 0)
    ) {
      setError("⚠️ Discount price सही value में डालें।");
      return;
    }

    const payload = {
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      sku: productForm.sku.trim(),
      category: productForm.category.trim(),
      subcategory: productForm.subcategory.trim(),
      price,
      stock,
      vendor: productForm.vendor.trim(),
      status: productForm.status,
      ...(discountPrice !== null ? { discountPrice } : {}),
    };

    setActionLoading(editingProduct ? "update-product" : "create-product");

    try {
      let response;

      if (editingProduct?.id) {
        response = await updateProduct({
          id: editingProduct.id,
          updates: payload,
        });

        await writeAuditLog(
          "UPDATE_PRODUCT",
          editingProduct.id,
          `Updated product: ${payload.name}`
        );

        setSuccess(
          response?.message || "✅ Product successfully update हो गया।"
        );
      } else {
        response = await createProduct(payload);

        await writeAuditLog(
          "CREATE_PRODUCT",
          response?.id || response?.productId || payload.sku,
          `Created product: ${payload.name}`
        );

        setSuccess(
          response?.message || "✅ Product successfully create हो गया।"
        );
      }

      const productId =
        editingProduct?.id ||
        response?.id ||
        response?.productId ||
        response?.data?.id;

      if (productId && productFormMediaFiles.length > 0) {
        try {
          await uploadProductMedia({
            id: productId,
            files: productFormMediaFiles,
          });

          await writeAuditLog(
            "UPLOAD_PRODUCT_MEDIA",
            productId,
            `Uploaded ${productFormMediaFiles.length} image(s) while saving product`
          );

          setSuccess(
            (response?.message ||
              `✅ Product successfully ${
                editingProduct ? "update" : "create"
              } हो गया।`) + " Photo भी upload हो गई।"
          );
        } catch (mediaError) {
          setError(
            mediaError?.message ||
              "⚠️ Product save हो गया, लेकिन photo upload नहीं हो पाई।"
          );
        }
      }

      closeProductForm();
      await loadProducts();
    } catch (err) {
      setError(
        err?.message ||
          `⚠️ Product ${
            editingProduct ? "update" : "create"
          } नहीं हो पाया। कृपया फिर से कोशिश करें।`
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleDeleteProduct = async (product) => {
    clearMessages();
    setActionLoading(`delete-${product.id}`);

    try {
      const response = await deleteProduct({ id: product.id });

      await writeAuditLog(
        "DELETE_PRODUCT",
        product.id,
        `Deleted product: ${product.name || product.id}`
      );

      setSuccess(response?.message || "✅ Product delete हो गया।");

      setSelectedIds((currentIds) =>
        currentIds.filter((id) => id !== product.id)
      );

      if (selectedProduct?.id === product.id) {
        closeProductDetail();
      }

      await loadProducts();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Product delete नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleProductAction = async (product, action) => {
    clearMessages();

    const actionFunctions = {
      publish: publishProduct,
      unpublish: unpublishProduct,
      approve: approveProduct,
    };

    const nextStatus = {
      publish: "published",
      unpublish: "unpublished",
      approve: "approved",
    };

    const requestFunction = actionFunctions[action];

    if (!requestFunction) {
      setError("⚠️ Invalid product action.");
      return;
    }

    setActionLoading(`${action}-${product.id}`);

    try {
      const response = await requestFunction({ id: product.id });

      await writeAuditLog(
        `${action.toUpperCase()}_PRODUCT`,
        product.id,
        `${action.toUpperCase()} product: ${product.name || product.id}`
      );

      setSuccess(
        response?.message ||
          `✅ Product ${
            action === "unpublish" ? "unpublish" : action
          } हो गया।`
      );

      if (selectedProduct?.id === product.id) {
        setSelectedProduct((currentProduct) => ({
          ...currentProduct,
          status: nextStatus[action],
        }));
      }

      await loadProducts();
    } catch (err) {
      setError(
        err?.message ||
          `⚠️ Product ${
            action === "unpublish" ? "unpublish" : action
          } नहीं हो पाया। कृपया फिर से कोशिश करें।`
      );
    } finally {
      setActionLoading("");
    }
  };

  const openRejectModal = (product) => {
    clearMessages();
    setProductToReject(product);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    setProductToReject(null);
    setRejectionReason("");
    setShowRejectModal(false);
  };

  const handleRejectProduct = async () => {
    if (!productToReject?.id) {
      return;
    }

    const reason = rejectionReason.trim();

    if (!reason) {
      setError("⚠️ Product reject करने के लिए reason जरूरी है।");
      return;
    }

    clearMessages();
    setActionLoading(`reject-${productToReject.id}`);

    try {
      const response = await rejectProduct({
        id: productToReject.id,
        reason,
      });

      await writeAuditLog(
        "REJECT_PRODUCT",
        productToReject.id,
        `Rejected product: ${
          productToReject.name || productToReject.id
        }. Reason: ${reason}`
      );

      setSuccess(response?.message || "✅ Product reject हो गया।");

      if (selectedProduct?.id === productToReject.id) {
        setSelectedProduct((currentProduct) => ({
          ...currentProduct,
          status: "rejected",
        }));
      }

      closeRejectModal();
      await loadProducts();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Product reject नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const openVariantsModal = (product) => {
    clearMessages();

    setVariantsProduct(product);
    setVariants(
      Array.isArray(product.variants) && product.variants.length > 0
        ? product.variants.map((variant) => ({
            id: variant.id || `variant-${Date.now()}`,
            name: variant.name || "",
            sku: variant.sku || "",
            stock:
              variant.stock === undefined || variant.stock === null
                ? ""
                : String(variant.stock),
            price:
              variant.price === undefined || variant.price === null
                ? ""
                : String(variant.price),
            color: variant.color || "",
            size: variant.size || "",
          }))
        : [
            {
              id: `variant-${Date.now()}`,
              name: "",
              sku: "",
              stock: "",
              price: "",
              color: "",
              size: "",
            },
          ]
    );

    setShowVariantsModal(true);
  };

  const closeVariantsModal = () => {
    setVariantsProduct(null);
    setVariants([]);
    setShowVariantsModal(false);
  };

  const addVariantRow = () => {
    setVariants((currentVariants) => [
      ...currentVariants,
      {
        id: `variant-${Date.now()}-${currentVariants.length}`,
        name: "",
        sku: "",
        stock: "",
        price: "",
        color: "",
        size: "",
      },
    ]);
  };

  const updateVariantField = (index, field, value) => {
    setVariants((currentVariants) =>
      currentVariants.map((variant, variantIndex) =>
        variantIndex === index
          ? { ...variant, [field]: value }
          : variant
      )
    );
  };

  const removeVariantRow = (index) => {
    setVariants((currentVariants) =>
      currentVariants.filter((_, variantIndex) => variantIndex !== index)
    );
  };

  const saveVariants = async () => {
    if (!variantsProduct?.id) {
      return;
    }

    const cleanedVariants = variants
      .map((variant) => ({
        id: variant.id,
        name: variant.name.trim(),
        sku: variant.sku.trim(),
        stock: Number(variant.stock),
        price: Number(variant.price),
        color: variant.color.trim(),
        size: variant.size.trim(),
      }))
      .filter(
        (variant) =>
          variant.name ||
          variant.sku ||
          variant.color ||
          variant.size ||
          variant.stock ||
          variant.price
      );

    const hasInvalidVariant = cleanedVariants.some(
      (variant) =>
        !variant.name ||
        !variant.sku ||
        Number.isNaN(variant.stock) ||
        variant.stock < 0 ||
        Number.isNaN(variant.price) ||
        variant.price < 0
    );

    if (hasInvalidVariant) {
      setError(
        "⚠️ हर variant में name, SKU, valid stock और valid price जरूरी है।"
      );
      return;
    }

    clearMessages();
    setActionLoading(`variants-${variantsProduct.id}`);

    try {
      const response = await updateProductVariants({
        id: variantsProduct.id,
        variants: cleanedVariants,
      });

      await writeAuditLog(
        "UPDATE_PRODUCT_VARIANTS",
        variantsProduct.id,
        `Updated ${cleanedVariants.length} product variants`
      );

      setSuccess(response?.message || "✅ Product variants update हो गए।");

      if (selectedProduct?.id === variantsProduct.id) {
        setSelectedProduct((currentProduct) => ({
          ...currentProduct,
          variants: cleanedVariants,
        }));
      }

      closeVariantsModal();
      await loadProducts();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Product variants update नहीं हो पाए। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const openCategoryModal = (product) => {
    clearMessages();

    setCategoryProduct(product);
    setCategoryForm({
      category: product.category || "",
      subcategory: product.subcategory || "",
    });

    setShowCategoryModal(true);
  };

  const closeCategoryModal = () => {
    setCategoryProduct(null);
    setCategoryForm({
      category: "",
      subcategory: "",
    });
    setShowCategoryModal(false);
  };

  const saveCategories = async () => {
    const category = categoryForm.category.trim();
    const subcategory = categoryForm.subcategory.trim();

    if (!categoryProduct?.id || !category) {
      setError("⚠️ Main category जरूरी है।");
      return;
    }

    clearMessages();
    setActionLoading(`category-${categoryProduct.id}`);

    try {
      const response = await updateProductCategories({
        id: categoryProduct.id,
        category,
        ...(subcategory ? { subcategory } : {}),
      });

      await writeAuditLog(
        "UPDATE_PRODUCT_CATEGORIES",
        categoryProduct.id,
        `Updated category to ${category}${
          subcategory ? ` > ${subcategory}` : ""
        }`
      );

      setSuccess(response?.message || "✅ Product categories update हो गईं।");

      if (selectedProduct?.id === categoryProduct.id) {
        setSelectedProduct((currentProduct) => ({
          ...currentProduct,
          category,
          subcategory,
        }));
      }

      closeCategoryModal();
      await loadProducts();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Product categories update नहीं हो पाईं।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const openMediaModal = (product) => {
    clearMessages();
    setMediaProduct(product);
    setMediaFiles([]);
    setMediaPreviews([]);
    setShowMediaModal(true);
  };

  const closeMediaModal = () => {
    setMediaProduct(null);
    setMediaFiles([]);
    setMediaPreviews([]);
    setShowMediaModal(false);
  };

  const handleMediaFileChange = (event) => {
    const files = Array.from(event.target.files || []);

    setMediaFiles(files);

    const previews = files
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => URL.createObjectURL(file));

    setMediaPreviews(previews);
  };

  const saveMedia = async () => {
    if (!mediaProduct?.id) {
      return;
    }

    if (mediaFiles.length === 0) {
      setError("⚠️ Upload करने के लिए कम से कम एक media file चुनें।");
      return;
    }

    clearMessages();
    setActionLoading(`media-${mediaProduct.id}`);

    try {
      const response = await uploadProductMedia({
        id: mediaProduct.id,
        files: mediaFiles,
      });

      await writeAuditLog(
        "UPLOAD_PRODUCT_MEDIA",
        mediaProduct.id,
        `Uploaded ${mediaFiles.length} media file(s)`
      );

      setSuccess(response?.message || "✅ Product media upload हो गया।");

      closeMediaModal();

      if (selectedProduct?.id === mediaProduct.id) {
        await openProductDetail(selectedProduct);
      }

      await loadProducts();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Product media upload नहीं हो पाया। कृपया फिर से कोशिश करें।"
      );
    } finally {
      setActionLoading("");
    }
  };

  const toggleProductSelection = (productId) => {
    setSelectedIds((currentIds) =>
      currentIds.includes(productId)
        ? currentIds.filter((id) => id !== productId)
        : [...currentIds, productId]
    );
  };

  const toggleAllProducts = () => {
    const currentPageIds = products.map((product) => product.id).filter(Boolean);

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

  const handleBulkUpdate = async () => {
    clearMessages();

    if (selectedIds.length === 0) {
      setError("⚠️ Bulk update के लिए कम से कम एक product select करें।");
      return;
    }

    const update = {
      status: bulkStatus,
    };

    if (bulkStock !== "") {
      const parsedStock = Number(bulkStock);

      if (Number.isNaN(parsedStock) || parsedStock < 0) {
        setError("⚠️ Bulk stock 0 या उससे ज्यादा होना चाहिए।");
        return;
      }

      update.stock = parsedStock;
    }

    setActionLoading("bulk-update");

    try {
      const response = await bulkUpdateProducts({
        ids: selectedIds,
        update,
      });

      await writeAuditLog(
        "BULK_UPDATE_PRODUCTS",
        selectedIds.join(","),
        `Updated product status to ${bulkStatus}${
          bulkStock !== "" ? ` and stock to ${bulkStock}` : ""
        }`
      );

      setSuccess(
        response?.message ||
          `✅ ${selectedIds.length} products bulk update हो गए।`
      );

      setSelectedIds([]);
      setBulkStock("");
      setShowBulkPanel(false);

      await loadProducts();
    } catch (err) {
      setError(
        err?.message ||
          "⚠️ Bulk product update नहीं हो पाया। कृपया फिर से कोशिश करें।"
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
        csv: exportProductsCSV,
        excel: exportProductsExcel,
        pdf: exportProductsPDF,
      };

      const exportFunction = exportFunctions[format];

      if (!exportFunction) {
        throw new Error("Invalid export format.");
      }

      const response = await exportFunction({
        search: debouncedSearch,
        status: statusFilter,
        ids: selectedIds,
      });

      downloadExportResponse(response, `products-report.${format}`);

      await writeAuditLog(
        `EXPORT_PRODUCTS_${format.toUpperCase()}`,
        "",
        `Exported product report in ${format.toUpperCase()} format`
      );

      setSuccess(
        `✅ Product report ${format.toUpperCase()} में export हो गई।`
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

  const isAllSelected =
    products.length > 0 &&
    products.every((product) => selectedIds.includes(product.id));

  const selectedProductStatus = String(
    selectedProduct?.status || ""
  ).toLowerCase();

  const canApprove =
    selectedProductStatus === "draft" ||
    selectedProductStatus === "pending" ||
    selectedProductStatus === "rejected";

  const canPublish =
    selectedProductStatus === "approved" ||
    selectedProductStatus === "unpublished";

  const canUnpublish = selectedProductStatus === "published";

  return (
    <div className="product-manager px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">
            Super Admin Product Manager 📦
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Products, categories, variants, media, stock और publishing workflow manage करें।
          </p>
        </div>

        <button
          type="button"
          onClick={refreshProducts}
          disabled={loadingProducts || Boolean(actionLoading)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Refresh Products
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
          Filters & Actions
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            type="text"
            placeholder="Search product, SKU, category, vendor..."
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
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
            <option value="unpublished">Unpublished</option>
            <option value="rejected">Rejected</option>
          </select>

          <button
            type="button"
            onClick={openCreateForm}
            disabled={Boolean(actionLoading)}
            className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Create Product
          </button>

          <button
            type="button"
            onClick={() => setShowBulkPanel((visible) => !visible)}
            disabled={Boolean(actionLoading)}
            className="rounded-md bg-yellow-500 px-4 py-2 text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Bulk Update ({selectedIds.length})
          </button>

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

        {showBulkPanel && (
          <div className="mt-4 rounded-md bg-yellow-50 p-4">
            <p className="mb-3 text-sm font-medium text-yellow-900">
              Selected products: {selectedIds.length}
            </p>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <select
                value={bulkStatus}
                onChange={(event) => setBulkStatus(event.target.value)}
                className="rounded-md border px-3 py-2"
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
                <option value="unpublished">Unpublished</option>
                <option value="rejected">Rejected</option>
              </select>

              <input
                type="number"
                min="0"
                placeholder="Optional stock quantity"
                value={bulkStock}
                onChange={(event) => setBulkStock(event.target.value)}
                className="rounded-md border px-3 py-2"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleBulkUpdate}
                disabled={selectedIds.length === 0 || Boolean(actionLoading)}
                className="rounded-md bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "bulk-update"
                  ? "Updating..."
                  : "Apply Bulk Update"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedIds([]);
                  setBulkStock("");
                  setShowBulkPanel(false);
                }}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-indigo-900">
              Product List
            </h2>
            <p className="text-sm text-gray-500">
              Total matching products: {totalProducts}
            </p>
          </div>

          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
        </div>

        {loadingProducts && products.length === 0 ? (
          <p className="py-8 text-center text-indigo-700">
            ✨ Loading products...
          </p>
        ) : products.length === 0 ? (
          <p className="py-8 text-center text-gray-600">
            No products found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1300px] w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-gray-700">
                  <th className="border px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleAllProducts}
                      aria-label="Select all products"
                    />
                  </th>
                  <th className="border px-3 py-2">Product</th>
                  <th className="border px-3 py-2">SKU</th>
                  <th className="border px-3 py-2">Category</th>
                  <th className="border px-3 py-2">Vendor</th>
                  <th className="border px-3 py-2">Price</th>
                  <th className="border px-3 py-2">Stock</th>
                  <th className="border px-3 py-2">Status</th>
                  <th className="border px-3 py-2">Actions</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => {
                  const productStatus = String(
                    product.status || ""
                  ).toLowerCase();

                  const rowCanApprove =
                    productStatus === "draft" ||
                    productStatus === "pending" ||
                    productStatus === "rejected";

                  const rowCanPublish =
                    productStatus === "approved" ||
                    productStatus === "unpublished";

                  const rowCanUnpublish =
                    productStatus === "published";

                  return (
                    <tr
                      key={product.id}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="border px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(product.id)}
                          onChange={() => toggleProductSelection(product.id)}
                          aria-label={`Select product ${product.id}`}
                        />
                      </td>

                      <td className="border px-3 py-2">
                        <p className="font-medium text-indigo-900">
                          {product.name || "Unnamed Product"}
                        </p>
                        <p className="max-w-[260px] truncate text-xs text-gray-500">
                          {product.description || ""}
                        </p>
                      </td>

                      <td className="border px-3 py-2 font-mono text-xs">
                        {product.sku || "—"}
                      </td>

                      <td className="border px-3 py-2">
                        {product.category || "—"}
                        {product.subcategory
                          ? ` > ${product.subcategory}`
                          : ""}
                      </td>

                      <td className="border px-3 py-2">
                        {product.vendor || "—"}
                      </td>

                      <td className="border px-3 py-2">
                        <p>{formatAmount(product.price)}</p>
                        {product.discountPrice !== undefined &&
                          product.discountPrice !== null && (
                            <p className="text-xs text-green-600">
                              Sale: {formatAmount(product.discountPrice)}
                            </p>
                          )}
                      </td>

                      <td className="border px-3 py-2">
                        <span
                          className={
                            Number(product.stock) <= 5
                              ? "font-semibold text-red-600"
                              : ""
                          }
                        >
                          {formatNumber(product.stock)}
                        </span>
                      </td>

                      <td className="border px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                            product.status
                          )}`}
                        >
                          {product.status || "unknown"}
                        </span>
                      </td>

                      <td className="border px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openProductDetail(product)}
                            disabled={actionLoading === `detail-${product.id}`}
                            className="text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionLoading === `detail-${product.id}`
                              ? "Loading..."
                              : "View"}
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditForm(product)}
                            disabled={Boolean(actionLoading)}
                            className="text-indigo-600 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => openMediaModal(product)}
                            disabled={Boolean(actionLoading)}
                            className="font-medium text-gray-700 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Upload Media
                          </button>

                          <button
                            type="button"
                            onClick={() => handleProductAction(product, "approve")}
                            disabled={!rowCanApprove || Boolean(actionLoading)}
                            className="text-green-600 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Approve
                          </button>

                          <button
                            type="button"
                            onClick={() => openRejectModal(product)}
                            disabled={!rowCanApprove || Boolean(actionLoading)}
                            className="text-pink-600 hover:text-pink-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Reject
                          </button>

                          <button
                            type="button"
                            onClick={() => handleProductAction(product, "publish")}
                            disabled={!rowCanPublish || Boolean(actionLoading)}
                            className="text-green-700 hover:text-green-900 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Publish
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleProductAction(product, "unpublish")
                            }
                            disabled={!rowCanUnpublish || Boolean(actionLoading)}
                            className="text-yellow-700 hover:text-yellow-900 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Unpublish
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product)}
                            disabled={Boolean(actionLoading)}
                            className="text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {actionLoading === `delete-${product.id}`
                              ? "Deleting..."
                              : "Delete"}
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
            disabled={page <= 1 || loadingProducts}
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
            disabled={page >= totalPages || loadingProducts}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      </section>

      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Product details"
        >
          <button
            type="button"
            aria-label="Close product details"
            onClick={closeProductDetail}
            className="absolute inset-0 cursor-default"
          />

          <div className="relative z-10 h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  {selectedProduct.name || "Product Detail"}
                </h2>
                <p className="text-sm text-gray-500">
                  ID: {selectedProduct.id || "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeProductDetail}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openEditForm(selectedProduct)}
                disabled={Boolean(actionLoading)}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Edit Product
              </button>

              <button
                type="button"
                onClick={() => openCategoryModal(selectedProduct)}
                disabled={Boolean(actionLoading)}
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Categories
              </button>

              <button
                type="button"
                onClick={() => openVariantsModal(selectedProduct)}
                disabled={Boolean(actionLoading)}
                className="rounded-md bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Variants
              </button>

              <button
                type="button"
                onClick={() => openMediaModal(selectedProduct)}
                disabled={Boolean(actionLoading)}
                className="rounded-md bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Upload Media
              </button>

              <button
                type="button"
                onClick={() => handleProductAction(selectedProduct, "approve")}
                disabled={!canApprove || Boolean(actionLoading)}
                className="rounded-md bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Approve
              </button>

              <button
                type="button"
                onClick={() => openRejectModal(selectedProduct)}
                disabled={!canApprove || Boolean(actionLoading)}
                className="rounded-md bg-pink-600 px-3 py-2 text-sm text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reject
              </button>

              <button
                type="button"
                onClick={() => handleProductAction(selectedProduct, "publish")}
                disabled={!canPublish || Boolean(actionLoading)}
                className="rounded-md bg-green-700 px-3 py-2 text-sm text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Publish
              </button>

              <button
                type="button"
                onClick={() =>
                  handleProductAction(selectedProduct, "unpublish")
                }
                disabled={!canUnpublish || Boolean(actionLoading)}
                className="rounded-md bg-yellow-500 px-3 py-2 text-sm text-indigo-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Unpublish
              </button>

              <button
                type="button"
                onClick={() => handleDeleteProduct(selectedProduct)}
                disabled={Boolean(actionLoading)}
                className="rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Delete
              </button>
            </div>

            <div className="space-y-4">
              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Product Details
                </h3>
                <p className="break-words text-sm"><span className="font-medium">Description:</span> {selectedProduct.description || "—"}</p>
                <p className="text-sm"><span className="font-medium">SKU:</span> {selectedProduct.sku || "—"}</p>
                <p className="text-sm"><span className="font-medium">Category:</span> {selectedProduct.category || "—"}{selectedProduct.subcategory ? ` > ${selectedProduct.subcategory}` : ""}</p>
                <p className="text-sm"><span className="font-medium">Vendor:</span> {selectedProduct.vendor || "—"}</p>
                <p className="text-sm"><span className="font-medium">Price:</span> {formatAmount(selectedProduct.price)}</p>
                <p className="text-sm"><span className="font-medium">Discount Price:</span> {selectedProduct.discountPrice !== undefined && selectedProduct.discountPrice !== null ? formatAmount(selectedProduct.discountPrice) : "—"}</p>
                <p className="text-sm"><span className="font-medium">Stock:</span> {formatNumber(selectedProduct.stock)}</p>
                <p className="text-sm"><span className="font-medium">Status:</span> {selectedProduct.status || "—"}</p>
                <p className="text-sm"><span className="font-medium">Compliance:</span> {selectedProduct.compliance || "—"}</p>
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Variants
                </h3>

                {selectedProduct.variants.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    No variants available.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedProduct.variants.map((variant) => (
                      <div
                        key={variant.id}
                        className="rounded border bg-white p-2 text-sm"
                      >
                        <p className="font-medium">
                          {variant.name || "Unnamed Variant"}
                        </p>
                        <p>SKU: {variant.sku || "—"}</p>
                        <p>Stock: {formatNumber(variant.stock)}</p>
                        <p>Price: {formatAmount(variant.price)}</p>
                        {variant.color && <p>Color: {variant.color}</p>}
                        {variant.size && <p>Size: {variant.size}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Media
                </h3>

                {selectedProduct.images.length === 0 &&
                selectedProduct.videos.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    No media available.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {selectedProduct.images.map((image, index) => (
                      <a
                        key={`image-${index}`}
                        href={image}
                        target="_blank"
                        rel="noreferrer"
                        className="block"
                      >
                        <img
                          src={image}
                          alt={`${selectedProduct.name || "Product"} ${index + 1}`}
                          className="h-20 w-20 rounded-md object-cover"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      </a>
                    ))}

                    {selectedProduct.videos.map((video, index) => (
                      <video
                        key={`video-${index}`}
                        src={video}
                        controls
                        preload="metadata"
                        className="h-24 w-40 rounded-md bg-black object-cover"
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-md border bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold text-indigo-900">
                  Performance
                </h3>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <p><span className="font-medium">Sales:</span> {formatNumber(selectedProduct.performance?.sales)}</p>
                  <p><span className="font-medium">Returns:</span> {formatNumber(selectedProduct.performance?.returns)}</p>
                  <p><span className="font-medium">Rating:</span> {selectedProduct.performance?.rating ?? 0}</p>
                  <p><span className="font-medium">Views:</span> {formatNumber(selectedProduct.performance?.views)}</p>
                  <p><span className="font-medium">Conversion Rate:</span> {selectedProduct.performance?.conversionRate ?? 0}%</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {showProductForm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={editingProduct ? "Edit product" : "Create product"}
        >
          <div className="my-8 w-full max-w-2xl rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  {editingProduct ? "Edit Product" : "Create Product"}
                </h2>
                <p className="text-sm text-gray-500">
                  Product की जरूरी जानकारी भरें।
                </p>
              </div>

              <button
                type="button"
                onClick={closeProductForm}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                type="text"
                placeholder="Product name"
                value={productForm.name}
                onChange={(event) =>
                  handleProductFormChange("name", event.target.value)
                }
                className="rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              />

              <input
                type="text"
                placeholder="SKU"
                value={productForm.sku}
                onChange={(event) =>
                  handleProductFormChange("sku", event.target.value)
                }
                className="rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              />

              <input
                type="text"
                placeholder="Category"
                value={productForm.category}
                onChange={(event) =>
                  handleProductFormChange("category", event.target.value)
                }
                className="rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              />

              <input
                type="text"
                placeholder="Subcategory (optional)"
                value={productForm.subcategory}
                onChange={(event) =>
                  handleProductFormChange("subcategory", event.target.value)
                }
                className="rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              />

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Price"
                value={productForm.price}
                onChange={(event) =>
                  handleProductFormChange("price", event.target.value)
                }
                className="rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              />

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Discount price (optional)"
                value={productForm.discountPrice}
                onChange={(event) =>
                  handleProductFormChange("discountPrice", event.target.value)
                }
                className="rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              />

              <input
                type="number"
                min="0"
                placeholder="Stock"
                value={productForm.stock}
                onChange={(event) =>
                  handleProductFormChange("stock", event.target.value)
                }
                className="rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              />

              <input
                type="text"
                placeholder="Vendor (optional)"
                value={productForm.vendor}
                onChange={(event) =>
                  handleProductFormChange("vendor", event.target.value)
                }
                className="rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              />

              <select
                value={productForm.status}
                onChange={(event) =>
                  handleProductFormChange("status", event.target.value)
                }
                className="rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
                <option value="unpublished">Unpublished</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <textarea
              rows={5}
              placeholder="Product description"
              value={productForm.description}
              onChange={(event) =>
                handleProductFormChange("description", event.target.value)
              }
              className="mt-3 w-full rounded-md border p-3 outline-none focus:border-blue-500"
            />

            <div className="mt-4 rounded-md border bg-gray-50 p-3">
              <label className="mb-2 block text-sm font-semibold text-indigo-900">
                Product Photos
              </label>

              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleProductFormMediaChange}
                className="w-full rounded-md border bg-white p-2"
              />

              {productFormMediaPreviews.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {productFormMediaPreviews.map((preview, index) => (
                    <img
                      key={`product-form-preview-${index}`}
                      src={preview}
                      alt={`Selected product photo ${index + 1}`}
                      className="h-20 w-20 rounded-md border object-cover"
                    />
                  ))}
                </div>
              )}

              {productFormMediaFiles.length > 0 && (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-600">
                    {productFormMediaFiles.length} photo(s) selected
                  </p>

                  <button
                    type="button"
                    onClick={clearProductFormMedia}
                    className="rounded-md border px-3 py-1.5 text-sm text-gray-700 hover:bg-white"
                  >
                    Clear Photos
                  </button>
                </div>
              )}

              <p className="mt-2 text-xs text-gray-500">
                Photo choose करने के बाद product save करें। Photo automatically upload हो जाएगी।
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeProductForm}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveProduct}
                disabled={
                  actionLoading === "create-product" ||
                  actionLoading === "update-product"
                }
                className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "create-product" ||
                actionLoading === "update-product"
                  ? "Saving..."
                  : editingProduct
                    ? "Update Product"
                    : "Create Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && productToReject && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Reject product"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Reject Product
                </h2>
                <p className="text-sm text-gray-500">
                  {productToReject.name || "Product"} को reject करने का कारण लिखें।
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
                onClick={handleRejectProduct}
                disabled={actionLoading === `reject-${productToReject.id}`}
                className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `reject-${productToReject.id}`
                  ? "Rejecting..."
                  : "Reject Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showVariantsModal && variantsProduct && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Manage product variants"
        >
          <div className="my-8 w-full max-w-4xl rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Manage Variants
                </h2>
                <p className="text-sm text-gray-500">
                  {variantsProduct.name || "Product"}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addVariantRow}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
                >
                  Add Variant
                </button>

                <button
                  type="button"
                  onClick={closeVariantsModal}
                  className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="max-h-[55vh] overflow-auto">
              <table className="min-w-[850px] w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="border px-2 py-2">Name</th>
                    <th className="border px-2 py-2">SKU</th>
                    <th className="border px-2 py-2">Stock</th>
                    <th className="border px-2 py-2">Price</th>
                    <th className="border px-2 py-2">Color</th>
                    <th className="border px-2 py-2">Size</th>
                    <th className="border px-2 py-2">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {variants.map((variant, index) => (
                    <tr key={variant.id}>
                      <td className="border p-2">
                        <input
                          value={variant.name}
                          onChange={(event) =>
                            updateVariantField(
                              index,
                              "name",
                              event.target.value
                            )
                          }
                          className="w-full rounded border px-2 py-1"
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          value={variant.sku}
                          onChange={(event) =>
                            updateVariantField(
                              index,
                              "sku",
                              event.target.value
                            )
                          }
                          className="w-full rounded border px-2 py-1"
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="number"
                          min="0"
                          value={variant.stock}
                          onChange={(event) =>
                            updateVariantField(
                              index,
                              "stock",
                              event.target.value
                            )
                          }
                          className="w-full rounded border px-2 py-1"
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={variant.price}
                          onChange={(event) =>
                            updateVariantField(
                              index,
                              "price",
                              event.target.value
                            )
                          }
                          className="w-full rounded border px-2 py-1"
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          value={variant.color}
                          onChange={(event) =>
                            updateVariantField(
                              index,
                              "color",
                              event.target.value
                            )
                          }
                          className="w-full rounded border px-2 py-1"
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          value={variant.size}
                          onChange={(event) =>
                            updateVariantField(
                              index,
                              "size",
                              event.target.value
                            )
                          }
                          className="w-full rounded border px-2 py-1"
                        />
                      </td>
                      <td className="border p-2">
                        <button
                          type="button"
                          onClick={() => removeVariantRow(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeVariantsModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveVariants}
                disabled={actionLoading === `variants-${variantsProduct.id}`}
                className="rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `variants-${variantsProduct.id}`
                  ? "Saving..."
                  : "Save Variants"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && categoryProduct && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Update product categories"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Update Categories
                </h2>
                <p className="text-sm text-gray-500">
                  {categoryProduct.name || "Product"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeCategoryModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Main category"
                value={categoryForm.category}
                onChange={(event) =>
                  setCategoryForm((currentForm) => ({
                    ...currentForm,
                    category: event.target.value,
                  }))
                }
                className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              />

              <input
                type="text"
                placeholder="Subcategory (optional)"
                value={categoryForm.subcategory}
                onChange={(event) =>
                  setCategoryForm((currentForm) => ({
                    ...currentForm,
                    subcategory: event.target.value,
                  }))
                }
                className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeCategoryModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveCategories}
                disabled={actionLoading === `category-${categoryProduct.id}`}
                className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `category-${categoryProduct.id}`
                  ? "Saving..."
                  : "Save Categories"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMediaModal && mediaProduct && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Upload product media"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Upload Product Media
                </h2>
                <p className="text-sm text-gray-500">
                  {mediaProduct.name || "Product"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeMediaModal}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleMediaFileChange}
              className="w-full rounded-md border p-2"
            />

            {mediaPreviews.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-semibold text-indigo-900">
                  Selected Photos
                </p>

                <div className="flex flex-wrap gap-3">
                  {mediaPreviews.map((preview, index) => (
                    <img
                      key={`media-preview-${index}`}
                      src={preview}
                      alt={`Selected media ${index + 1}`}
                      className="h-20 w-20 rounded-md border object-cover"
                    />
                  ))}
                </div>
              </div>
            )}

            {mediaFiles.length > 0 && (
              <p className="mt-3 text-sm text-gray-600">
                Selected files: {mediaFiles.length}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeMediaModal}
                className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveMedia}
                disabled={actionLoading === `media-${mediaProduct.id}`}
                className="rounded-md bg-gray-700 px-4 py-2 text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === `media-${mediaProduct.id}`
                  ? "Uploading..."
                  : "Upload Files"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductManager;