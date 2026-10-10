// src/pages/Wishlist.jsx
// Wish Jinny - Premium Wishlist Page

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { fetchProducts, updateWishlist, moveToCart } from "../utils/api";

function Wishlist() {
  const navigate = useNavigate();

  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const toNumber = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  };

  const getListFromResponse = (response) => {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.items)) {
      return response.items;
    }

    if (Array.isArray(response?.wishlist)) {
      return response.wishlist;
    }

    if (Array.isArray(response?.data?.items)) {
      return response.data.items;
    }

    if (Array.isArray(response?.data?.wishlist)) {
      return response.data.wishlist;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    return [];
  };

  const getProductId = (product, index) => {
    return (
      product?.product_id ||
      product?.productId ||
      product?.product?.id ||
      product?.product?._id ||
      product?.id ||
      product?._id ||
      product?.slug ||
      `wishlist-product-${index}`
    );
  };

  const getProductName = (product) => {
    return (
      product?.name ||
      product?.title ||
      product?.product_name ||
      product?.product?.name ||
      product?.product?.title ||
      "Wish Jinny Product"
    );
  };

  const getStock = (product) => {
    const source = product?.product || product;

    if (
      source?.in_stock === false ||
      source?.available === false ||
      String(source?.status || "").toLowerCase() === "out of stock" ||
      String(source?.status || "").toLowerCase() === "sold out"
    ) {
      return 0;
    }

    const hasStockValue =
      source?.stock !== undefined ||
      source?.quantity !== undefined ||
      source?.inventory !== undefined ||
      source?.stock_quantity !== undefined;

    if (!hasStockValue) {
      return 1;
    }

    return Math.max(
      toNumber(
        source?.stock ??
          source?.quantity ??
          source?.inventory ??
          source?.stock_quantity ??
          0
      ),
      0
    );
  };

  const loadWishlist = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchProducts({ type: "wishlist" });
      const wishlistItems = getListFromResponse(response);

      setWishlist(Array.isArray(wishlistItems) ? wishlistItems : []);
    } catch {
      setWishlist([]);
      setError(
        "Your wishlist could not be loaded right now. Please refresh and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  const availableCount = useMemo(() => {
    return wishlist.filter((product) => getStock(product) > 0).length;
  }, [wishlist]);

  const handleRemove = async (product, index) => {
    const productId = getProductId(product, index);

    if (actionLoadingId) {
      return;
    }

    clearMessages();
    setActionLoadingId(productId);

    try {
      const response = await updateWishlist({
        action: "remove",
        productId,
      });

      if (response?.success === false) {
        setError(response?.message || "This product could not be removed.");
        return;
      }

      setWishlist((previousWishlist) =>
        previousWishlist.filter((wishlistProduct, wishlistIndex) => {
          return (
            String(getProductId(wishlistProduct, wishlistIndex)) !==
            String(productId)
          );
        })
      );

      setNotice(`${getProductName(product)} has been removed from your wishlist.`);
    } catch {
      setError("This product could not be removed. Please try again.");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleMoveToCart = async (product, index) => {
    const productId = getProductId(product, index);
    const productName = getProductName(product);
    const stock = getStock(product);

    if (actionLoadingId) {
      return;
    }

    if (stock <= 0) {
      setError(`${productName} is currently out of stock.`);
      return;
    }

    clearMessages();
    setActionLoadingId(productId);

    try {
      const response = await moveToCart({
        productId,
        quantity: 1,
      });

      if (response?.success === false) {
        setError(
          response?.message ||
            "This product could not be moved to your cart."
        );
        return;
      }

      setWishlist((previousWishlist) =>
        previousWishlist.filter((wishlistProduct, wishlistIndex) => {
          return (
            String(getProductId(wishlistProduct, wishlistIndex)) !==
            String(productId)
          );
        })
      );

      navigate("/cart");
    } catch {
      setError("This product could not be moved to your cart. Please try again.");
    } finally {
      setActionLoadingId("");
    }
  };

  const HeartIcon = () => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
      className="h-7 w-7"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
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

  const TrashIcon = () => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
    >
      <path d="M4 7h16" strokeLinecap="round" />
      <path d="M10 11v6" strokeLinecap="round" />
      <path d="M14 11v6" strokeLinecap="round" />
      <path d="M6 7l1 13h10l1-13" strokeLinejoin="round" />
      <path d="M9 7V4h6v3" strokeLinecap="round" strokeLinejoin="round" />
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

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="animate-pulse overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
              >
                <div className="aspect-square bg-slate-200" />
                <div className="space-y-3 p-4">
                  <div className="h-3 w-1/3 rounded bg-slate-200" />
                  <div className="h-5 rounded bg-slate-200" />
                  <div className="h-5 w-2/3 rounded bg-slate-200" />
                  <div className="h-10 rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-600">
              Your saved wishes
            </p>

            <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-indigo-950 sm:text-4xl">
              My Wishlist
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-500 shadow-sm">
                <HeartIcon />
              </span>
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {wishlist.length > 0
                ? `${wishlist.length} saved product${
                    wishlist.length === 1 ? "" : "s"
                  } · ${availableCount} ready to move to your cart.`
                : "Save products you love and revisit them whenever you wish."}
            </p>
          </div>

          <Link
            to="/shop"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-black text-indigo-700 shadow-sm transition hover:bg-indigo-50"
          >
            Explore products
            <ArrowIcon />
          </Link>
        </div>

        {(error || notice) && (
          <div
            role={error ? "alert" : "status"}
            className={`mb-6 rounded-xl border px-4 py-3 text-sm font-semibold ${
              error
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || notice}
          </div>
        )}

        {wishlist.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-indigo-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-500">
              <HeartIcon />
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-900">
              Your wishlist is waiting for a little magic
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Discover products you love, tap the heart and keep your favourite
              Wish Jinny finds ready for later.
            </p>

            <Link
              to="/shop"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:shadow-xl"
            >
              Discover products
              <ArrowIcon />
            </Link>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {wishlist.map((product, index) => {
              const productId = getProductId(product, index);
              const productName = getProductName(product);
              const stock = getStock(product);
              const isOutOfStock = stock <= 0;
              const isUpdating = actionLoadingId === productId;

              return (
                <article
                  key={productId}
                  className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm transition hover:border-indigo-200 hover:shadow-xl"
                >
                  <ProductCard
                    product={product?.product || product}
                    showVendor
                  />

                  <div className="border-t border-slate-100 bg-white p-3">
                    {isOutOfStock && (
                      <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-center text-xs font-bold text-rose-700">
                        {productName} is currently out of stock.
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleMoveToCart(product, index)}
                        disabled={isOutOfStock || Boolean(actionLoadingId)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 px-3 py-2.5 text-xs font-black text-white transition hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CartIcon />
                        {isUpdating ? "..." : "Move to Cart"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemove(product, index)}
                        disabled={Boolean(actionLoadingId)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-black text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <TrashIcon />
                        {isUpdating ? "..." : "Remove"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

export default Wishlist;