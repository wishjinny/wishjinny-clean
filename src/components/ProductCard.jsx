import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";


function ProductCard({
  product = {},
  onAddToCart,
  onBuyNow,
  language = "en",
  showVendor = true,
  compact = false,
}) {
  const [imageError, setImageError] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isBuying, setIsBuying] = useState(false);


  const navigate = useNavigate();


  const labels = {
    en: {
      viewDetails: "View Details",
      buyNow: "Buy Now",
      addToCart: "Add to Cart",
      outOfStock: "Out of Stock",
      inStock: "In Stock",
      save: "You save",
      bestseller: "Bestseller",
      new: "New",
      soldOut: "Sold Out",
      by: "By",
      reviews: "reviews",
      addWishlist: "Add to wishlist",
      removeWishlist: "Remove from wishlist",
      productImage: "Product image",
    },
    hi: {
      viewDetails: "Details Dekhein",
      buyNow: "Abhi Kharidein",
      addToCart: "Cart Mein Dalein",
      outOfStock: "Stock Mein Nahi",
      inStock: "In Stock",
      save: "Aap bachate hain",
      bestseller: "Bestseller",
      new: "Naya",
      soldOut: "Sold Out",
      by: "By",
      reviews: "reviews",
      addWishlist: "Wishlist Mein Dalein",
      removeWishlist: "Wishlist Se Hatayein",
      productImage: "Product image",
    },
  };


  const text = labels[language] || labels.en;


  const productId = product?.id || product?._id || product?.slug || "";


  const productTitle =
    product?.name ||
    product?.title ||
    product?.product_name ||
    product?.productName ||
    "Unnamed Product";


  const productImage =
    product?.image_url ||
    product?.image ||
    product?.thumbnail ||
    product?.coverImage ||
    product?.cover_image ||
    (Array.isArray(product?.images) && product.images.length > 0
      ? typeof product.images[0] === "string"
        ? product.images[0]
        : product.images[0]?.url || product.images[0]?.image_url
      : "");


  const productCategory =
    product?.category?.name ||
    product?.category ||
    product?.category_name ||
    "General";


  const vendorName =
    product?.vendor?.store_name ||
    product?.vendor?.name ||
    product?.seller?.store_name ||
    product?.seller?.name ||
    product?.store_name ||
    product?.vendor_name ||
    "";


  const toNumber = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  };


  const salePrice = toNumber(
    product?.discount_price ??
      product?.sale_price ??
      product?.selling_price ??
      product?.offer_price ??
      product?.price ??
      0
  );


  const productPrice = toNumber(product?.price ?? 0);


  const originalPrice = toNumber(
    product?.original_price ??
      product?.mrp ??
      product?.regular_price ??
      product?.compare_at_price ??
      (productPrice > salePrice ? productPrice : 0)
  );


  const currentPrice = salePrice || originalPrice || 0;


  const hasDiscount =
    originalPrice > 0 &&
    currentPrice > 0 &&
    originalPrice > currentPrice;


  const discountPercentage = hasDiscount
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;


  const savings = hasDiscount ? originalPrice - currentPrice : 0;


  const rating = Math.min(
    5,
    Math.max(
      0,
      toNumber(product?.rating ?? product?.average_rating ?? product?.ratings)
    )
  );


  const reviewCount = toNumber(
    product?.review_count ?? product?.reviews_count ?? product?.total_reviews
  );


  const productStock = toNumber(
    product?.stock ?? product?.quantity ?? product?.inventory ?? 1
  );


  const isOutOfStock =
    product?.in_stock === false ||
    product?.available === false ||
    product?.status === "Out of Stock" ||
    product?.status === "Sold Out" ||
    productStock <= 0;


  const isBestseller =
    product?.is_bestseller ||
    product?.best_seller ||
    product?.badge === "Bestseller";


  const isNew =
    product?.is_new ||
    product?.new_arrival ||
    product?.badge === "New";


  const productLink = productId
    ? `/product/${encodeURIComponent(productId)}`
    : "/shop";


  const formatPrice = (price) => {
    return toNumber(price).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    });
  };


  const safeImageSource = imageError ? "" : productImage;


  const imageLabel = `${productTitle} ${text.productImage}`;


  const initials = useMemo(() => {
    return productTitle
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }, [productTitle]);


  const handleAddToCart = async () => {
    if (isOutOfStock || isAdding) {
      return;
    }


    if (!onAddToCart) {
      navigate(productLink);
      return;
    }


    try {
      setIsAdding(true);
      await onAddToCart(product);
    } finally {
      setIsAdding(false);
    }
  };


  const handleBuyNow = async () => {
    if (isOutOfStock || isBuying) {
      return;
    }


    try {
      setIsBuying(true);

      if (onBuyNow) {
        await onBuyNow(product);
        return;
      }

      navigate("/cart");
    } finally {
      setIsBuying(false);
    }
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
            <linearGradient id="half-star">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="#e2e8f0" />
            </linearGradient>
          </defs>
          <path
            fill="url(#half-star)"
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
      className="h-4 w-4"
    >
      <path d="M3 3h2l2.4 12.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L21 7H6" />
      <circle cx="10" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  );


  const ArrowIcon = () => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      className="h-4 w-4"
    >
      <path d="M5 12h14" strokeLinecap="round" />
      <path d="m13 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );


  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-2xl ${
        compact ? "rounded-xl" : ""
      }`}
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
          {hasDiscount && (
            <span className="rounded-full bg-yellow-400 px-3 py-1 text-[11px] font-extrabold text-indigo-950 shadow-lg">
              {discountPercentage}% OFF
            </span>
          )}


          {isBestseller && (
            <span className="rounded-full bg-indigo-700 px-3 py-1 text-[11px] font-extrabold text-white shadow-lg">
              {text.bestseller}
            </span>
          )}


          {isNew && !isBestseller && (
            <span className="rounded-full bg-purple-600 px-3 py-1 text-[11px] font-extrabold text-white shadow-lg">
              {text.new}
            </span>
          )}
        </div>


        <button
          type="button"
          onClick={() => setIsWishlisted((previousValue) => !previousValue)}
          aria-label={
            isWishlisted ? text.removeWishlist : text.addWishlist
          }
          className={`absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-200 ${
            isWishlisted
              ? "bg-rose-500 text-white"
              : "bg-white/95 text-slate-600 hover:bg-white hover:text-rose-500"
          }`}
        >
          <HeartIcon active={isWishlisted} />
        </button>


        <Link to={productLink} className="block" aria-label={productTitle}>
          {safeImageSource ? (
            <img
              src={safeImageSource}
              alt={imageLabel}
              onError={() => setImageError(true)}
              className={`w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                compact ? "h-48" : "h-64"
              }`}
              loading="lazy"
            />
          ) : (
            <div
              role="img"
              aria-label={imageLabel}
              className={`flex w-full items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-yellow-100 ${
                compact ? "h-48" : "h-64"
              }`}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/80 text-2xl font-black text-indigo-600 shadow-lg">
                {initials || "WJ"}
              </div>
            </div>
          )}
        </Link>


        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/45 p-4">
            <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-lg">
              {text.soldOut}
            </span>
          </div>
        )}
      </div>


      <div className={`${compact ? "p-3" : "p-4"} flex flex-1 flex-col`}>
        <div className="mb-2 flex items-start justify-between gap-3">
          <span className="max-w-[75%] truncate rounded-full bg-purple-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-purple-700">
            {productCategory}
          </span>


          {!isOutOfStock && (
            <span className="shrink-0 text-[10px] font-bold text-emerald-600">
              {text.inStock}
            </span>
          )}
        </div>


        <Link to={productLink} aria-label={`View ${productTitle}`}>
          <h3
            className={`min-h-[52px] overflow-hidden text-ellipsis text-slate-800 transition-colors duration-300 group-hover:text-indigo-700 ${
              compact
                ? "text-base font-bold leading-6"
                : "text-lg font-bold leading-7"
            }`}
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {productTitle}
          </h3>
        </Link>


        {(rating > 0 || reviewCount > 0) && (
          <div className="mt-3 flex items-center gap-1.5">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((starNumber) => {
                const starValue = starNumber - 0.5;


                return (
                  <StarIcon
                    key={starNumber}
                    filled={rating >= starNumber}
                    half={rating >= starValue && rating < starNumber}
                  />
                );
              })}
            </div>


            <span className="text-xs font-bold text-slate-700">
              {rating > 0 ? rating.toFixed(1) : "New"}
            </span>


            {reviewCount > 0 && (
              <span className="text-xs text-slate-400">
                ({formatPrice(reviewCount)} {text.reviews})
              </span>
            )}
          </div>
        )}


        {showVendor && vendorName && (
          <p className="mt-3 truncate text-xs font-medium text-slate-500">
            {text.by} <span className="font-bold text-indigo-600">{vendorName}</span>
          </p>
        )}


        <div className="mt-4 flex flex-wrap items-end gap-x-2 gap-y-1">
          <span
            className={`font-extrabold text-indigo-700 ${
              compact ? "text-xl" : "text-2xl"
            }`}
          >
            ₹{formatPrice(currentPrice)}
          </span>


          {hasDiscount && (
            <span className="pb-0.5 text-sm font-medium text-slate-400 line-through">
              ₹{formatPrice(originalPrice)}
            </span>
          )}
        </div>


        {hasDiscount && (
          <p className="mt-1 text-xs font-semibold text-emerald-600">
            {text.save} ₹{formatPrice(savings)}
          </p>
        )}


        <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
          <Link
            to={productLink}
            className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-indigo-600 px-3 py-2.5 text-center text-xs font-bold text-indigo-600 transition-all duration-300 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 sm:text-sm"
          >
            {text.viewDetails}
            <ArrowIcon />
          </Link>


          <button
            type="button"
            onClick={handleBuyNow}
            disabled={isOutOfStock || isBuying}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-3 py-2.5 text-center text-xs font-bold text-white shadow-md transition-all duration-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-200 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
          >
            <CartIcon />
            {isBuying ? "..." : text.buyNow}
          </button>
        </div>
      </div>
    </article>
  );
}


export default ProductCard;