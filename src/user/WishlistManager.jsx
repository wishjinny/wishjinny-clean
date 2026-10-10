// src/user/WishlistManager.jsx
// Wish Jinny - Advanced Customer Wishlist Manager

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import {
  fetchWishlistItems,
  removeFromWishlist,
  moveWishlistToCart,
  clearWishlist,
  shareWishlist,
} from "../utils/api";

function UserWishlistManager() {
  const navigate = useNavigate();

  const [wishlistItems, setWishlistItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [showClearModal, setShowClearModal] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const toNumber = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  };

  const formatPrice = (price) => {
    return toNumber(price).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    });
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

    if (Array.isArray(response?.products)) {
      return response.products;
    }

    if (Array.isArray(response?.data?.items)) {
      return response.data.items;
    }

    if (Array.isArray(response?.data?.wishlist)) {
      return response.data.wishlist;
    }

    if (Array.isArray(response?.data?.products)) {
      return response.data.products;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    return [];
  };

  const getItemId = (item, index) => {
    return (
      item?.wishlist_item_id ||
      item?.wishlistItemId ||
      item?.id ||
      item?._id ||
      item?.product_id ||
      item?.productId ||
      item?.product?.id ||
      item?.product?._id ||
      `wishlist-${index}`
    );
  };

  const getProductId = (item, index) => {
    return (
      item?.product_id ||
      item?.productId ||
      item?.product?.id ||
      item?.product?._id ||
      item?.id ||
      item?._id ||
      `product-${index}`
    );
  };

  const getProductSource = (item) => {
    return item?.product || item;
  };

  const getProductName = (item) => {
    const product = getProductSource(item);

    return (
      product?.name ||
      product?.title ||
      product?.product_name ||
      "Wish Jinny Product"
    );
  };

  const getPrice = (item) => {
    const product = getProductSource(item);

    return toNumber(
      product?.discount_price ??
        product?.sale_price ??
        product?.selling_price ??
        product?.price ??
        item?.price ??
        0
    );
  };

  const getOriginalPrice = (item) => {
    const product = getProductSource(item);
    const currentPrice = getPrice(item);

    const originalPrice = toNumber(
      product?.original_price ??
        product?.mrp ??
        product?.regular_price ??
        product?.compare_at_price ??
        item?.originalPrice ??
        0
    );

    return originalPrice > currentPrice ? originalPrice : 0;
  };

  const getStock = (item) => {
    const product = getProductSource(item);

    if (
      product?.in_stock === false ||
      product?.available === false ||
      String(product?.status || "").toLowerCase() === "out of stock" ||
      String(product?.status || "").toLowerCase() === "sold out"
    ) {
      return 0;
    }

    const hasStockValue =
      product?.stock !== undefined ||
      product?.quantity !== undefined ||
      product?.inventory !== undefined ||
      product?.stock_quantity !== undefined;

    if (!hasStockValue) {
      return 1;
    }

    return Math.max(
      toNumber(
        product?.stock ??
          product?.quantity ??
          product?.inventory ??
          product?.stock_quantity ??
          0
      ),
      0
    );
  };

  const hasPriceDrop = (item) => {
    const currentPrice = getPrice(item);
    const originalPrice = getOriginalPrice(item);

    return Boolean(
      item?.priceDrop ||
        item?.price_drop ||
        item?.is_price_drop ||
        (originalPrice > 0 && currentPrice > 0 && originalPrice > currentPrice)
    );
  };

  const isBackInStock = (item) => {
    return Boolean(
      item?.backInStock ||
        item?.back_in_stock ||
        item?.is_back_in_stock ||
        (item?.was_out_of_stock && getStock(item) > 0)
    );
  };

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  const loadWishlist = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchWishlistItems();
      const items = getListFromResponse(response);

      setWishlistItems(Array.isArray(items) ? items : []);
    } catch {
      setWishlistItems([]);
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

  const wishlistStats = useMemo(() => {
    const totalValue = wishlistItems.reduce(
      (total, item) => total + getPrice(item),
      0
    );

    const availableItems = wishlistItems.filter(
      (item) => getStock(item) > 0
    ).length;

    const priceDropItems = wishlistItems.filter(hasPriceDrop).length;

    const backInStockItems = wishlistItems.filter(isBackInStock).length;

    return {
      totalItems: wishlistItems.length,
      selectedItems: selectedItems.length,
      totalValue,
      availableItems,
      priceDropItems,
      backInStockItems,
    };
  }, [wishlistItems, selectedItems]);

  const allSelected =
    wishlistItems.length > 0 &&
    selectedItems.length === wishlistItems.length;

  const toggleSelectItem = (itemId) => {
    setSelectedItems((previousSelectedItems) =>
      previousSelectedItems.includes(itemId)
        ? previousSelectedItems.filter((id) => id !== itemId)
        : [...previousSelectedItems, itemId]
    );
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedItems([]);
      return;
    }

    setSelectedItems(
      wishlistItems.map((item, index) => getItemId(item, index))
    );
  };

  const removeItemsFromState = (itemIds) => {
    setWishlistItems((previousItems) =>
      previousItems.filter((item, index) => {
        const itemId = getItemId(item, index);
        return !itemIds.map(String).includes(String(itemId));
      })
    );

    setSelectedItems((previousSelectedItems) =>
      previousSelectedItems.filter(
        (itemId) => !itemIds.map(String).includes(String(itemId))
      )
    );
  };

  const handleRemoveFromWishlist = async (item, index) => {
    const itemId = getItemId(item, index);

    if (actionLoading) {
      return;
    }

    clearMessages();
    setActionLoading(`remove-${itemId}`);

    try {
      const response = await removeFromWishlist(itemId);

      if (response?.success === false) {
        setError(response?.message || "This item could not be removed.");
        return;
      }

      removeItemsFromState([itemId]);
      setNotice(`${getProductName(item)} has been removed from your wishlist.`);
    } catch {
      setError("This item could not be removed. Please try again.");
    } finally {
      setActionLoading("");
    }
  };

  const handleMoveToCart = async (item, index, redirectToCart = true) => {
    const itemId = getItemId(item, index);
    const productId = getProductId(item, index);
    const productName = getProductName(item);

    if (actionLoading) {
      return false;
    }

    if (getStock(item) <= 0) {
      setError(`${productName} is currently out of stock.`);
      return false;
    }

    clearMessages();
    setActionLoading(`cart-${itemId}`);

    try {
      const response = await moveWishlistToCart({
        wishlistItemId: itemId,
        productId,
        quantity: 1,
      });

      if (response?.success === false) {
        setError(
          response?.message ||
            `${productName} could not be moved to your cart.`
        );
        return false;
      }

      removeItemsFromState([itemId]);

      if (redirectToCart) {
        navigate("/cart");
      } else {
        setNotice(`${productName} has been moved to your cart.`);
      }

      return true;
    } catch {
      setError(
        `${productName} could not be moved to your cart. Please try again.`
      );
      return false;
    } finally {
      setActionLoading("");
    }
  };

  const handleMoveSelectedToCart = async () => {
    if (selectedItems.length === 0 || actionLoading) {
      return;
    }

    const selectedProducts = wishlistItems
      .map((item, index) => ({
        item,
        index,
        itemId: getItemId(item, index),
        productId: getProductId(item, index),
      }))
      .filter(({ itemId }) => selectedItems.includes(itemId));

    const availableProducts = selectedProducts.filter(
      ({ item }) => getStock(item) > 0
    );

    if (availableProducts.length === 0) {
      setError("Selected products are currently out of stock.");
      return;
    }

    clearMessages();
    setActionLoading("bulk-cart");

    try {
      const results = await Promise.allSettled(
        availableProducts.map(({ itemId, productId }) =>
          moveWishlistToCart({
            wishlistItemId: itemId,
            productId,
            quantity: 1,
          })
        )
      );

      const movedItemIds = availableProducts
        .filter(({ itemId }, resultIndex) => {
          const result = results[resultIndex];

          return (
            result.status === "fulfilled" &&
            result.value?.success !== false
          );
        })
        .map(({ itemId }) => itemId);

      if (movedItemIds.length > 0) {
        removeItemsFromState(movedItemIds);
      }

      const failedCount = availableProducts.length - movedItemIds.length;
      const outOfStockCount = selectedProducts.length - availableProducts.length;

      if (failedCount > 0 || outOfStockCount > 0) {
        setError(
          `${movedItemIds.length} item${
            movedItemIds.length === 1 ? "" : "s"
          } moved to cart. ${
            failedCount + outOfStockCount
          } selected item(s) could not be moved.`
        );
        return;
      }

      navigate("/cart");
    } catch {
      setError("Selected items could not be moved to cart. Please try again.");
    } finally {
      setActionLoading("");
    }
  };

  const handleClearWishlist = async () => {
    if (actionLoading) {
      return;
    }

    clearMessages();
    setActionLoading("clear");

    try {
      const response = await clearWishlist();

      if (response?.success === false) {
        setError(response?.message || "Your wishlist could not be cleared.");
        return;
      }

      setWishlistItems([]);
      setSelectedItems([]);
      setShowClearModal(false);
      setNotice("Your wishlist has been cleared successfully.");
    } catch {
      setError("Your wishlist could not be cleared. Please try again.");
    } finally {
      setActionLoading("");
    }
  };

  const copyTextToClipboard = async (value) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const temporaryTextArea = document.createElement("textarea");
    temporaryTextArea.value = value;
    temporaryTextArea.style.position = "fixed";
    temporaryTextArea.style.opacity = "0";
    document.body.appendChild(temporaryTextArea);
    temporaryTextArea.select();
    document.execCommand("copy");
    document.body.removeChild(temporaryTextArea);
  };

  const handleShareWishlist = async () => {
    if (wishlistItems.length === 0 || actionLoading) {
      setError("Add products to your wishlist before sharing it.");
      return;
    }

    clearMessages();
    setActionLoading("share");

    try {
      const response = await shareWishlist();

      if (response?.success === false) {
        setError(response?.message || "Your wishlist share link could not be created.");
        return;
      }

      const shareLink =
        response?.shareLink ||
        response?.share_link ||
        response?.url ||
        response?.data?.shareLink ||
        response?.data?.share_link ||
        response?.data?.url ||
        "";

      if (!shareLink) {
        throw new Error("No share link received");
      }

      if (navigator.share) {
        try {
          await navigator.share({
            title: "My Wish Jinny Wishlist",
            text: "Have a look at my Wish Jinny favourites!",
            url: shareLink,
          });

          setNotice("Wishlist share options opened successfully.");
          return;
        } catch (shareError) {
          if (shareError?.name === "AbortError") {
            return;
          }
        }
      }

      await copyTextToClipboard(shareLink);
      setNotice("Your wishlist link has been copied to the clipboard.");
    } catch {
      setError("Your wishlist could not be shared right now. Please try again.");
    } finally {
      setActionLoading("");
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
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
      <path d="M6 7l1 13h10l1-13M9 7V4h6v3" strokeLinejoin="round" />
    </svg>
  );

  const ShareIcon = () => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
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
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-9 w-64 rounded bg-slate-200" />

          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-32 rounded-2xl border border-slate-100 bg-white"
              />
            ))}
          </div>

          <div className="mt-7 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-[28rem] rounded-2xl border border-slate-100 bg-white"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              to="/account"
              className="inline-flex text-sm font-black text-indigo-700 transition hover:text-purple-700"
            >
              ← Back to my account
            </Link>

            <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-rose-600">
              Your saved wishes
            </p>

            <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-indigo-950 sm:text-4xl">
              Wishlist Manager
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-500 shadow-sm">
                <HeartIcon />
              </span>
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Compare, share and move your favourite Wish Jinny discoveries to
              your cart whenever you are ready.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleShareWishlist}
              disabled={Boolean(actionLoading) || wishlistItems.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-black text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShareIcon />
              {actionLoading === "share" ? "Sharing..." : "Share wishlist"}
            </button>

            <button
              type="button"
              onClick={() => {
                clearMessages();
                setShowClearModal(true);
              }}
              disabled={Boolean(actionLoading) || wishlistItems.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <TrashIcon />
              Clear all
            </button>
          </div>
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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Total items
            </p>
            <p className="mt-2 text-3xl font-black text-indigo-700">
              {wishlistStats.totalItems}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Selected
            </p>
            <p className="mt-2 text-3xl font-black text-purple-700">
              {wishlistStats.selectedItems}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Wishlist value
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-700">
              ₹{formatPrice(wishlistStats.totalValue)}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Available now
            </p>
            <p className="mt-2 text-3xl font-black text-amber-700">
              {wishlistStats.availableItems}
            </p>
          </article>
        </section>

        {(wishlistStats.priceDropItems > 0 ||
          wishlistStats.backInStockItems > 0) && (
          <section className="mt-6 grid gap-4 md:grid-cols-2">
            {wishlistStats.priceDropItems > 0 && (
              <article className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5">
                <p className="text-lg font-black text-emerald-900">
                  🎉 Price drops found!
                </p>
                <p className="mt-2 text-sm leading-6 text-emerald-800">
                  {wishlistStats.priceDropItems} wishlisted product
                  {wishlistStats.priceDropItems === 1 ? " is" : "s are"} now
                  available at a better price.
                </p>
              </article>
            )}

            {wishlistStats.backInStockItems > 0 && (
              <article className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-cyan-50 p-5">
                <p className="text-lg font-black text-sky-900">
                  ✨ Back in stock!
                </p>
                <p className="mt-2 text-sm leading-6 text-sky-800">
                  {wishlistStats.backInStockItems} saved product
                  {wishlistStats.backInStockItems === 1 ? " is" : "s are"} ready
                  for your cart again.
                </p>
              </article>
            )}
          </section>
        )}

        {selectedItems.length > 0 && (
          <section className="sticky top-3 z-30 mt-6 rounded-2xl border border-indigo-200 bg-indigo-950 p-4 text-white shadow-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-bold">
                {selectedItems.length} item
                {selectedItems.length === 1 ? "" : "s"} selected
              </p>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setSelectedItems([])}
                  disabled={Boolean(actionLoading)}
                  className="rounded-xl border border-white/25 px-4 py-2.5 text-xs font-black text-white transition hover:bg-white/10 disabled:opacity-50"
                >
                  Clear selection
                </button>

                <button
                  type="button"
                  onClick={handleMoveSelectedToCart}
                  disabled={Boolean(actionLoading)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-xs font-black text-indigo-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CartIcon />
                  {actionLoading === "bulk-cart"
                    ? "Moving selected..."
                    : `Move ${selectedItems.length} to cart`}
                </button>
              </div>
            </div>
          </section>
        )}

        {wishlistItems.length === 0 ? (
          <section className="mt-7 rounded-3xl border border-dashed border-indigo-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-500">
              <HeartIcon />
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-900">
              Your wishlist is waiting for a little magic
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Save products you love, compare your choices and move them to
              your cart whenever the moment feels right.
            </p>

            <Link
              to="/shop"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:shadow-xl"
            >
              Explore products
              <ArrowIcon />
            </Link>
          </section>
        ) : (
          <>
            <section className="mt-7 flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <label className="flex cursor-pointer items-center gap-3 text-sm font-black text-slate-700">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded accent-indigo-700"
                />
                Select all {wishlistItems.length} item
                {wishlistItems.length === 1 ? "" : "s"}
              </label>

              <p className="text-xs font-semibold text-slate-500">
                Select items to move multiple products to cart together.
              </p>
            </section>

            <section className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {wishlistItems.map((item, index) => {
                const itemId = getItemId(item, index);
                const productId = getProductId(item, index);
                const productName = getProductName(item);
                const stock = getStock(item);
                const isOutOfStock = stock <= 0;
                const isSelected = selectedItems.includes(itemId);
                const isRemoving = actionLoading === `remove-${itemId}`;
                const isMoving = actionLoading === `cart-${itemId}`;

                return (
                  <article
                    key={itemId}
                    className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-xl ${
                      isSelected
                        ? "border-indigo-400 ring-2 ring-indigo-100"
                        : "border-indigo-100"
                    }`}
                  >
                    <label className="absolute left-3 top-3 z-20 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/95 shadow-md">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectItem(itemId)}
                        aria-label={`Select ${productName}`}
                        className="h-4 w-4 accent-indigo-700"
                      />
                    </label>

                    {hasPriceDrop(item) && (
                      <span className="absolute right-3 top-3 z-20 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-md">
                        Price Drop
                      </span>
                    )}

                    {isBackInStock(item) && !hasPriceDrop(item) && (
                      <span className="absolute right-3 top-3 z-20 rounded-full bg-sky-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-md">
                        Back in Stock
                      </span>
                    )}

                    <ProductCard
                      product={getProductSource(item)}
                      showVendor
                    />

                    <div className="border-t border-slate-100 bg-white p-3">
                      {isOutOfStock && (
                        <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-center text-xs font-bold text-rose-700">
                          This product is currently out of stock.
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleMoveToCart(item, index)}
                          disabled={isOutOfStock || Boolean(actionLoading)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 px-3 py-2.5 text-xs font-black text-white transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <CartIcon />
                          {isMoving ? "..." : "Move to Cart"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/product/${encodeURIComponent(productId)}`)
                          }
                          className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-xs font-black text-indigo-700 transition hover:bg-indigo-100"
                        >
                          View product
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFromWishlist(item, index)}
                        disabled={Boolean(actionLoading)}
                        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <TrashIcon />
                        {isRemoving ? "Removing..." : "Remove from wishlist"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        )}
      </div>

      {showClearModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-wishlist-title"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <TrashIcon />
            </div>

            <h2
              id="clear-wishlist-title"
              className="mt-5 text-xl font-black text-slate-900"
            >
              Clear your complete wishlist?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              This will remove all {wishlistItems.length} saved item
              {wishlistItems.length === 1 ? "" : "s"} from your Wish Jinny
              wishlist. This action cannot be undone from this page.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={Boolean(actionLoading)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Keep wishlist
              </button>

              <button
                type="button"
                onClick={handleClearWishlist}
                disabled={Boolean(actionLoading)}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "clear" ? "Clearing..." : "Clear wishlist"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default UserWishlistManager;