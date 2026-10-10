// src/pages/ProductDetails.jsx
// Wish Jinny - Premium Product Details Page

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { fetchProducts, updateCart } from "../utils/api";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [selectedImage, setSelectedImage] = useState("");
  const [imageError, setImageError] = useState(false);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewComment, setReviewComment] = useState("");

  const toNumber = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  };

  const formatPrice = (price) => {
    return toNumber(price).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    });
  };

  const getProductId = (productData) => {
    return (
      productData?.id ||
      productData?._id ||
      productData?.product_id ||
      productData?.productId ||
      productData?.slug ||
      id ||
      ""
    );
  };

  const getProductName = (productData) => {
    return (
      productData?.name ||
      productData?.title ||
      productData?.product_name ||
      productData?.productName ||
      "Wish Jinny Product"
    );
  };

  const getProductCategory = (productData) => {
    const category = productData?.category;

    if (typeof category === "object" && category !== null) {
      return (
        category?.name ||
        category?.title ||
        category?.category_name ||
        "General"
      );
    }

    return (
      category ||
      productData?.category_name ||
      productData?.categoryName ||
      "General"
    );
  };

  const getProductCategoryId = (productData) => {
    const category = productData?.category;

    if (typeof category === "object" && category !== null) {
      return (
        category?.id ||
        category?._id ||
        category?.slug ||
        category?.name ||
        ""
      );
    }

    return (
      productData?.category_id ||
      productData?.categoryId ||
      category ||
      productData?.category_name ||
      ""
    );
  };

  const getProductImages = (productData) => {
    const mediaList =
      productData?.media ||
      productData?.images ||
      productData?.gallery ||
      productData?.product_images ||
      [];

    const normalizedMedia = Array.isArray(mediaList)
      ? mediaList
          .map((media) => {
            if (typeof media === "string") {
              return media;
            }

            return media?.url || media?.image_url || media?.src || "";
          })
          .filter(Boolean)
      : [];

    const singleImage =
      productData?.image_url ||
      productData?.image ||
      productData?.thumbnail ||
      productData?.cover_image ||
      "";

    const allImages = [...normalizedMedia];

    if (singleImage && !allImages.includes(singleImage)) {
      allImages.unshift(singleImage);
    }

    return allImages;
  };

  const getProductPrice = (productData) => {
    return toNumber(
      productData?.discount_price ??
        productData?.sale_price ??
        productData?.selling_price ??
        productData?.offer_price ??
        productData?.price ??
        0
    );
  };

  const getOriginalPrice = (productData, currentPrice) => {
    const basePrice = toNumber(
      productData?.original_price ??
        productData?.mrp ??
        productData?.regular_price ??
        productData?.compare_at_price ??
        productData?.price ??
        0
    );

    return basePrice > currentPrice ? basePrice : 0;
  };

  const getStock = (productData) => {
    const stockValue = toNumber(
      productData?.stock ??
        productData?.quantity ??
        productData?.inventory ??
        productData?.stock_quantity ??
        0
    );

    if (
      productData?.in_stock === false ||
      productData?.available === false ||
      String(productData?.status || "").toLowerCase() === "out of stock" ||
      String(productData?.status || "").toLowerCase() === "sold out"
    ) {
      return 0;
    }

    if (
      productData?.stock === undefined &&
      productData?.quantity === undefined &&
      productData?.inventory === undefined &&
      productData?.stock_quantity === undefined
    ) {
      return 1;
    }

    return Math.max(stockValue, 0);
  };

  const getVendor = (productData) => {
    const vendor =
      productData?.vendor ||
      productData?.seller ||
      productData?.store ||
      {};

    if (typeof vendor === "string") {
      return {
        name: vendor,
        storeName: vendor,
        description: "",
      };
    }

    return {
      name:
        vendor?.name ||
        vendor?.owner_name ||
        productData?.vendor_name ||
        productData?.seller_name ||
        "Wish Jinny Seller",
      storeName:
        vendor?.store_name ||
        vendor?.store ||
        vendor?.business_name ||
        productData?.store_name ||
        productData?.vendor_name ||
        "Wish Jinny Store",
      description:
        vendor?.description ||
        vendor?.bio ||
        productData?.vendor_description ||
        "",
    };
  };

  const getSpecifications = (productData) => {
    const specifications =
      productData?.specifications ||
      productData?.features ||
      productData?.details ||
      [];

    if (Array.isArray(specifications)) {
      return specifications
        .map((specification) => {
          if (typeof specification === "string") {
            return {
              label: "",
              value: specification,
            };
          }

          return {
            label:
              specification?.label ||
              specification?.name ||
              specification?.key ||
              "",
            value:
              specification?.value ||
              specification?.text ||
              specification?.description ||
              "",
          };
        })
        .filter((specification) => specification.value);
    }

    if (specifications && typeof specifications === "object") {
      return Object.entries(specifications).map(([label, value]) => ({
        label,
        value: String(value),
      }));
    }

    return [];
  };

  const getListFromResponse = (response, keys = []) => {
    if (Array.isArray(response)) {
      return response;
    }

    for (const key of keys) {
      if (Array.isArray(response?.[key])) {
        return response[key];
      }

      if (Array.isArray(response?.data?.[key])) {
        return response.data[key];
      }
    }

    if (Array.isArray(response?.items)) {
      return response.items;
    }

    if (Array.isArray(response?.data?.items)) {
      return response.data.items;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    return [];
  };

  const normaliseProductResponse = (response) => {
    return (
      response?.product ||
      response?.data?.product ||
      response?.data ||
      response ||
      null
    );
  };

  const loadProduct = async () => {
    if (!id) {
      setError("No product ID was found.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const productResponse = await fetchProducts({ id });
      const productData = normaliseProductResponse(productResponse);

      if (
        !productData ||
        (Array.isArray(productData) && productData.length === 0)
      ) {
        throw new Error("Product not found");
      }

      setProduct(productData);

      const productImages = getProductImages(productData);
      setSelectedImage(productImages[0] || "");
      setImageError(false);

      const productReviews = getListFromResponse(productData, [
        "reviews",
        "customer_reviews",
      ]);

      setReviews(productReviews);

      const category = getProductCategoryId(productData);

      if (category) {
        try {
          const relatedResponse = await fetchProducts({ category });
          const relatedProducts = getListFromResponse(relatedResponse, [
            "products",
            "items",
            "related",
            "relatedProducts",
          ]);

          const currentProductId = String(getProductId(productData));

          setRelated(
            relatedProducts
              .filter(
                (relatedProduct) =>
                  String(getProductId(relatedProduct)) !== currentProductId
              )
              .slice(0, 8)
          );
        } catch {
          setRelated([]);
        }
      } else {
        setRelated([]);
      }
    } catch {
      setProduct(null);
      setRelated([]);
      setError(
        "This product could not be loaded right now. Please return to the shop and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const productId = getProductId(product);
  const productName = getProductName(product);
  const productCategory = getProductCategory(product);
  const productImages = useMemo(() => getProductImages(product), [product]);

  const currentPrice = getProductPrice(product);
  const originalPrice = getOriginalPrice(product, currentPrice);
  const hasDiscount = originalPrice > currentPrice && currentPrice > 0;

  const discountPercentage = hasDiscount
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;

  const savings = hasDiscount ? originalPrice - currentPrice : 0;
  const stock = getStock(product);
  const isOutOfStock = stock <= 0;
  const vendor = getVendor(product);
  const specifications = getSpecifications(product);

  const rating = Math.min(
    5,
    Math.max(
      0,
      toNumber(product?.rating ?? product?.average_rating ?? product?.ratings)
    )
  );

  const reviewCount = toNumber(
    product?.review_count ?? product?.reviews_count ?? reviews.length
  );

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  const handleQuantityChange = (nextValue) => {
    const parsedQuantity = Math.floor(toNumber(nextValue));
    const maxQuantity = stock > 0 ? stock : 1;

    setQuantity(Math.min(Math.max(parsedQuantity || 1, 1), maxQuantity));
  };

  const addProductToCart = async () => {
    if (!productId || isOutOfStock) {
      setError("This product is currently out of stock.");
      return false;
    }

    const response = await updateCart({
      productId,
      quantity,
    });

    if (response?.success === false) {
      throw new Error(response?.message || "Cart update failed.");
    }

    return true;
  };

  const handleAddToCart = async () => {
    if (actionLoading || isOutOfStock) {
      return;
    }

    clearMessages();
    setActionLoading("cart");

    try {
      await addProductToCart();
      setNotice(`${productName} has been added to your cart.`);
    } catch {
      setError(
        "This product could not be added to your cart. Please try again."
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleBuyNow = async () => {
    if (actionLoading || isOutOfStock) {
      return;
    }

    clearMessages();
    setActionLoading("buy");

    try {
      await addProductToCart();
      navigate("/cart");
    } catch {
      setError(
        "This product could not be added to your cart. Please try again."
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleAddToWishlist = () => {
    setIsWishlisted((previousValue) => !previousValue);

    setNotice(
      !isWishlisted
        ? `${productName} has been saved to your wishlist.`
        : `${productName} has been removed from your wishlist.`
    );
  };

  const handleReviewSubmit = (event) => {
    event.preventDefault();
    clearMessages();

    const trimmedComment = reviewComment.trim();
    const selectedRating = Math.min(
      5,
      Math.max(1, Math.floor(toNumber(reviewRating)))
    );

    if (trimmedComment.length < 5) {
      setError("Please write at least a short review before submitting.");
      return;
    }

    const localReview = {
      id: `local-review-${Date.now()}`,
      user: "You",
      rating: selectedRating,
      comment: trimmedComment,
      created_at: new Date().toISOString(),
      pending: true,
    };

    setReviews((previousReviews) => [localReview, ...previousReviews]);
    setReviewComment("");
    setReviewRating("5");
    setNotice(
      "Your review has been added locally. Connect the review API to publish it for all customers."
    );
  };

  const StarIcon = ({ filled = false, half = false }) => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-4 w-4 ${
        filled || half ? "text-yellow-400" : "text-slate-200"
      }`}
      fill="currentColor"
    >
      {half ? (
        <>
          <defs>
            <linearGradient id="product-half-star">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="#e2e8f0" />
            </linearGradient>
          </defs>
          <path
            fill="url(#product-half-star)"
            d="m12 2.5 2.94 5.96 6.58.96-4.76 4.64 1.12 6.56L12 17.53l-5.88 3.09 1.12-6.56L2.48 9.42l6.58-.96L12 2.5Z"
          />
        </>
      ) : (
        <path d="m12 2.5 2.94 5.96 6.58.96-4.76 4.64 1.12 6.56L12 17.53l-5.88 3.09 1.12-6.56L2.48 9.42l6.58-.96L12 2.5Z" />
      )}
    </svg>
  );

  const HeartIcon = ({ active = false }) => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const CartIcon = () => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <path d="M3 3h2l2.4 12.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L21 7H6" />
      <circle cx="10" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  );

  const MinusIcon = () => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="h-4 w-4"
    >
      <path d="M5 12h14" strokeLinecap="round" />
    </svg>
  );

  const PlusIcon = () => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="h-4 w-4"
    >
      <path d="M12 5v14" strokeLinecap="round" />
      <path d="M5 12h14" strokeLinecap="round" />
    </svg>
  );

  const TruckIcon = () => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <path d="M3 6h11v10H3z" />
      <path d="M14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );

  const ShieldIcon = () => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <path d="M12 3 20 7v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Z" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const PlaceholderImage = () => {
    const initials = productName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();

    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-100 via-purple-50 to-yellow-100 text-5xl font-black text-indigo-700">
        {initials || "WJ"}
      </div>
    );
  };

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-5 w-32 rounded bg-slate-200" />

          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <div className="aspect-square rounded-3xl bg-slate-200" />

            <div className="space-y-5">
              <div className="h-5 w-1/4 rounded bg-slate-200" />
              <div className="h-10 w-3/4 rounded bg-slate-200" />
              <div className="h-20 rounded bg-slate-200" />
              <div className="h-9 w-1/3 rounded bg-slate-200" />
              <div className="h-14 rounded bg-slate-200" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-indigo-200 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-2xl">
            ✨
          </div>

          <h1 className="mt-5 text-2xl font-black text-slate-900">
            Product not available
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error ||
              "This magical product could not be found. Please explore the shop for more wishes."}
          </p>

          <Link
            to="/shop"
            className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:shadow-xl"
          >
            Explore products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 text-sm font-bold text-indigo-700 transition hover:text-purple-700"
        >
          ← Back to shop
        </Link>

        {(error || notice) && (
          <div
            role={error ? "alert" : "status"}
            className={`mt-5 rounded-xl border px-4 py-3 text-sm font-semibold ${
              error
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || notice}
          </div>
        )}

        <section className="mt-6 grid gap-8 rounded-3xl border border-indigo-100 bg-white p-5 shadow-xl sm:p-7 lg:grid-cols-2 lg:p-8">
          <div>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50">
              {hasDiscount && (
                <span className="absolute left-4 top-4 z-10 rounded-full bg-yellow-400 px-3 py-1.5 text-xs font-black text-indigo-950 shadow-lg">
                  {discountPercentage}% OFF
                </span>
              )}

              {isOutOfStock && (
                <span className="absolute left-4 top-4 z-10 rounded-full bg-slate-800 px-3 py-1.5 text-xs font-black text-white shadow-lg">
                  Out of stock
                </span>
              )}

              {selectedImage && !imageError ? (
                <img
                  src={selectedImage}
                  alt={productName}
                  onError={() => setImageError(true)}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <PlaceholderImage />
              )}
            </div>

            {productImages.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                {productImages.map((imageUrl, imageIndex) => (
                  <button
                    key={`${imageUrl}-${imageIndex}`}
                    type="button"
                    onClick={() => {
                      setSelectedImage(imageUrl);
                      setImageError(false);
                    }}
                    aria-label={`View image ${imageIndex + 1} of ${productName}`}
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                      selectedImage === imageUrl
                        ? "border-indigo-600 ring-2 ring-indigo-100"
                        : "border-transparent hover:border-indigo-200"
                    }`}
                  >
                    <img
                      src={imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}

            {product?.video_url && (
              <video
                src={product.video_url}
                controls
                playsInline
                className="mt-5 aspect-video w-full rounded-2xl bg-slate-900 shadow-lg"
              >
                Your browser does not support product video playback.
              </video>
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link
                  to={`/shop?category=${encodeURIComponent(productCategory)}`}
                  className="inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-purple-700 transition hover:bg-purple-200"
                >
                  {productCategory}
                </Link>

                <h1 className="mt-4 text-3xl font-black leading-tight text-indigo-950 sm:text-4xl">
                  {productName}
                </h1>
              </div>

              <button
                type="button"
                onClick={handleAddToWishlist}
                aria-label={
                  isWishlisted
                    ? "Remove product from wishlist"
                    : "Add product to wishlist"
                }
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100 ${
                  isWishlisted
                    ? "bg-rose-500 text-white"
                    : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                }`}
              >
                <HeartIcon active={isWishlisted} />
              </button>
            </div>

            {(rating > 0 || reviewCount > 0) && (
              <a
                href="#reviews"
                className="mt-4 flex w-fit items-center gap-2 text-sm transition hover:text-indigo-700"
              >
                <span className="flex items-center">
                  {[1, 2, 3, 4, 5].map((starNumber) => {
                    const halfStarValue = starNumber - 0.5;

                    return (
                      <StarIcon
                        key={starNumber}
                        filled={rating >= starNumber}
                        half={rating >= halfStarValue && rating < starNumber}
                      />
                    );
                  })}
                </span>

                <span className="font-black text-slate-700">
                  {rating > 0 ? rating.toFixed(1) : "New"}
                </span>

                {reviewCount > 0 && (
                  <span className="text-slate-500">
                    ({reviewCount} review{reviewCount === 1 ? "" : "s"})
                  </span>
                )}
              </a>
            )}

            {product?.description && (
              <p className="mt-5 text-sm leading-7 text-slate-600 sm:text-base">
                {product.description}
              </p>
            )}

            <div className="mt-6 rounded-2xl bg-indigo-50 p-5">
              <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                <span className="text-3xl font-black text-indigo-700">
                  ₹{formatPrice(currentPrice)}
                </span>

                {hasDiscount && (
                  <>
                    <span className="pb-1 text-base font-semibold text-slate-400 line-through">
                      ₹{formatPrice(originalPrice)}
                    </span>

                    <span className="mb-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700">
                      Save ₹{formatPrice(savings)}
                    </span>
                  </>
                )}
              </div>

              <p className="mt-3 text-xs font-semibold text-slate-500">
                Inclusive of all taxes. Final pricing is confirmed at checkout.
              </p>
            </div>

            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <p className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-slate-600">
                <span className="font-black text-slate-800">Brand:</span>{" "}
                {product?.brand || "Wish Jinny Collection"}
              </p>

              <p className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-slate-600">
                <span className="font-black text-slate-800">SKU:</span>{" "}
                {product?.sku || "Not available"}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-black ${
                  isOutOfStock
                    ? "bg-rose-100 text-rose-700"
                    : stock <= 5
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {isOutOfStock
                  ? "Out of stock"
                  : stock <= 5
                  ? `Only ${stock} left`
                  : "In stock"}
              </span>

              {!isOutOfStock && (
                <span className="text-xs font-semibold text-slate-500">
                  Ready to be added to your cart.
                </span>
              )}
            </div>

            <div className="mt-6 border-t border-slate-100 pt-6">
              <p className="text-sm font-black text-slate-800">Quantity</p>

              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="inline-flex w-fit items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1 || isOutOfStock}
                    aria-label="Decrease quantity"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <MinusIcon />
                  </button>

                  <input
                    type="number"
                    min="1"
                    max={stock || 1}
                    value={quantity}
                    onChange={(event) =>
                      handleQuantityChange(event.target.value)
                    }
                    disabled={isOutOfStock}
                    aria-label="Product quantity"
                    className="h-9 w-12 border-0 bg-transparent text-center text-sm font-black text-slate-800 outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={isOutOfStock || quantity >= stock}
                    aria-label="Increase quantity"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <PlusIcon />
                  </button>
                </div>

                <p className="text-xs text-slate-500">
                  {isOutOfStock
                    ? "This item is currently unavailable."
                    : `Maximum available quantity: ${stock}`}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock || Boolean(actionLoading)}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-indigo-700 px-4 py-3.5 text-sm font-black text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CartIcon />
                {actionLoading === "cart" ? "Adding..." : "Add to cart"}
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                disabled={isOutOfStock || Boolean(actionLoading)}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-3.5 text-sm font-black text-indigo-950 shadow-lg transition hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "buy" ? "Preparing..." : "Buy now"}
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                <span className="mt-0.5 text-indigo-700">
                  <TruckIcon />
                </span>
                <div>
                  <p className="text-sm font-black text-slate-800">
                    Delivery & shipping
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {product?.delivery_info ||
                      "Standard delivery options will be confirmed during checkout."}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                <span className="mt-0.5 text-emerald-700">
                  <ShieldIcon />
                </span>
                <div>
                  <p className="text-sm font-black text-slate-800">
                    Secure shopping
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Product availability and final total are verified securely
                    at checkout.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            {specifications.length > 0 && (
              <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-2xl font-black text-indigo-950">
                  Specifications
                </h2>

                <div className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
                  {specifications.map((specification, index) => (
                    <div
                      key={`${specification.label}-${index}`}
                      className="grid gap-1 bg-white px-4 py-3 text-sm sm:grid-cols-[10rem_1fr] sm:gap-4"
                    >
                      {specification.label && (
                        <span className="font-black capitalize text-slate-600">
                          {specification.label.replace(/[_-]/g, " ")}
                        </span>
                      )}

                      <span className="text-slate-700">
                        {specification.value}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section
              id="reviews"
              className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-purple-600">
                    Customer thoughts
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-indigo-950">
                    Reviews
                  </h2>
                </div>

                {reviews.length > 0 && (
                  <span className="rounded-full bg-yellow-50 px-3 py-1.5 text-xs font-black text-amber-800">
                    {reviews.length} review{reviews.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              <div className="mt-6 space-y-4">
                {reviews.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                    <p className="text-sm font-bold text-slate-600">
                      No reviews yet. Be the first to share your experience.
                    </p>
                  </div>
                ) : (
                  reviews.map((review, index) => {
                    const reviewRatingValue = Math.min(
                      5,
                      Math.max(
                        0,
                        toNumber(
                          review?.rating ??
                            review?.stars ??
                            review?.score ??
                            0
                        )
                      )
                    );

                    const reviewUser =
                      review?.user?.name ||
                      review?.user_name ||
                      review?.name ||
                      review?.customer ||
                      "Wish Jinny Customer";

                    const reviewText =
                      review?.comment ||
                      review?.review ||
                      review?.text ||
                      "";

                    return (
                      <article
                        key={review?.id || review?._id || `review-${index}`}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="font-black text-slate-800">
                            {reviewUser}
                            {review?.pending && (
                              <span className="ml-2 rounded-full bg-amber-100 px-2 py-1 text-[10px] uppercase tracking-wide text-amber-700">
                                Pending
                              </span>
                            )}
                          </p>

                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((starNumber) => (
                              <StarIcon
                                key={starNumber}
                                filled={reviewRatingValue >= starNumber}
                              />
                            ))}
                          </div>
                        </div>

                        {reviewText && (
                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {reviewText}
                          </p>
                        )}
                      </article>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={handleReviewSubmit}
                className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:p-5"
              >
                <p className="font-black text-indigo-950">Share your review</p>
                <p className="mt-1 text-xs text-slate-500">
                  Your feedback helps other Wish Jinny shoppers.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-[9rem_1fr]">
                  <select
                    value={reviewRating}
                    onChange={(event) => setReviewRating(event.target.value)}
                    aria-label="Your rating"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                  </select>

                  <textarea
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    placeholder="Write your review..."
                    rows={3}
                    className="resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <button
                  type="submit"
                  className="mt-3 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
                >
                  Submit review
                </button>
              </form>
            </section>
          </div>

          <aside className="h-fit rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm lg:sticky lg:top-24">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-purple-600">
              Sold by
            </p>

            <h2 className="mt-2 text-xl font-black text-indigo-950">
              {vendor.storeName}
            </h2>

            <p className="mt-1 text-sm font-semibold text-indigo-700">
              {vendor.name}
            </p>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              {vendor.description ||
                "A trusted Wish Jinny marketplace seller bringing magical finds to your doorstep."}
            </p>

            <Link
              to={`/shop?vendor=${encodeURIComponent(vendor.storeName)}`}
              className="mt-5 inline-flex rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-black text-indigo-700 transition hover:bg-indigo-100"
            >
              Visit seller collection
            </Link>
          </aside>
        </section>

        <section className="mt-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-purple-600">
                More magical finds
              </p>
              <h2 className="mt-2 text-3xl font-black text-indigo-950">
                Related Products
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Explore more from the {productCategory} collection.
              </p>
            </div>

            <Link
              to={`/shop?category=${encodeURIComponent(productCategory)}`}
              className="text-sm font-black text-indigo-700 transition hover:text-purple-700"
            >
              View all in {productCategory} →
            </Link>
          </div>

          {related.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((relatedProduct, index) => (
                <ProductCard
                  key={
                    getProductId(relatedProduct) || `related-product-${index}`
                  }
                  product={relatedProduct}
                  compact
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-indigo-200 bg-white p-7 text-center">
              <p className="text-sm font-bold text-slate-600">
                More related products will appear here soon.
              </p>
              <Link
                to="/shop"
                className="mt-3 inline-block text-sm font-black text-indigo-700 hover:text-purple-700"
              >
                Explore all products
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default ProductDetails;