// src/pages/Cart.jsx
// Wish Jinny - Shopping Cart Page

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchProducts, updateCart, applyCoupon } from "../utils/api";

function Cart() {
  const navigate = useNavigate();

  const [cart, setCart] = useState([]);
  const [serverSubtotal, setServerSubtotal] = useState(null);
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [discount, setDiscount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [updatingItemId, setUpdatingItemId] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const getItemId = (item, index) => {
    return (
      item?.id ||
      item?._id ||
      item?.cart_item_id ||
      item?.cartItemId ||
      item?.product_id ||
      item?.productId ||
      `cart-item-${index}`
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

  const toNumber = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  };

  const getItemPrice = (item) => {
    return toNumber(
      item?.discount_price ??
        item?.sale_price ??
        item?.selling_price ??
        item?.price ??
        item?.product?.discount_price ??
        item?.product?.sale_price ??
        item?.product?.price ??
        0
    );
  };

  const getItemQuantity = (item) => {
    const quantity = Math.floor(
      toNumber(item?.quantity ?? item?.qty ?? item?.count ?? 1)
    );

    return quantity > 0 ? quantity : 1;
  };

  const getItemName = (item) => {
    return (
      item?.name ||
      item?.title ||
      item?.product_name ||
      item?.product?.name ||
      item?.product?.title ||
      "Wish Jinny Product"
    );
  };

  const getItemVendor = (item) => {
    return (
      item?.vendor?.store_name ||
      item?.vendor?.name ||
      item?.seller?.store_name ||
      item?.seller?.name ||
      item?.vendor_name ||
      item?.seller_name ||
      item?.product?.vendor?.store_name ||
      item?.product?.vendor?.name ||
      "Wish Jinny Seller"
    );
  };

  const getItemImage = (item) => {
    const images = item?.images || item?.product?.images;

    if (Array.isArray(images) && images.length > 0) {
      const firstImage = images[0];

      if (typeof firstImage === "string") {
        return firstImage;
      }

      return firstImage?.url || firstImage?.image_url || "";
    }

    return (
      item?.image_url ||
      item?.image ||
      item?.thumbnail ||
      item?.product?.image_url ||
      item?.product?.image ||
      item?.product?.thumbnail ||
      ""
    );
  };

  const formatPrice = (price) => {
    return toNumber(price).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    });
  };

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  const calculatedSubtotal = useMemo(() => {
    return cart.reduce((total, item) => {
      return total + getItemPrice(item) * getItemQuantity(item);
    }, 0);
  }, [cart]);

  const subtotal =
    serverSubtotal !== null && serverSubtotal >= 0
      ? serverSubtotal
      : calculatedSubtotal;

  const safeDiscount = Math.min(Math.max(toNumber(discount), 0), subtotal);

  const shipping = useMemo(() => {
    if (cart.length === 0) {
      return 0;
    }

    if (subtotal >= 999) {
      return 0;
    }

    return 50;
  }, [cart.length, subtotal]);

  const total = Math.max(subtotal - safeDiscount + shipping, 0);

  const totalItems = useMemo(() => {
    return cart.reduce((total, item) => total + getItemQuantity(item), 0);
  }, [cart]);

  const loadCart = async () => {
    setLoading(true);
    clearMessages();

    try {
      const response = await fetchProducts({ type: "cart" });

      const items =
        response?.items ||
        response?.cart?.items ||
        response?.cart ||
        response?.data?.items ||
        response?.data?.cart ||
        [];

      const responseSubtotal =
        response?.subtotal ??
        response?.cart?.subtotal ??
        response?.data?.subtotal ??
        null;

      setCart(Array.isArray(items) ? items : []);

      setServerSubtotal(
        responseSubtotal !== null && responseSubtotal !== undefined
          ? toNumber(responseSubtotal)
          : null
      );
    } catch {
      setCart([]);
      setServerSubtotal(null);
      setError(
        "Your cart could not be loaded right now. Please refresh and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const refreshTotalsAfterUpdate = (response, nextCart) => {
    const updatedSubtotal =
      response?.subtotal ??
      response?.cart?.subtotal ??
      response?.data?.subtotal ??
      null;

    if (updatedSubtotal !== null && updatedSubtotal !== undefined) {
      setServerSubtotal(toNumber(updatedSubtotal));
      return;
    }

    setServerSubtotal(
      nextCart.reduce(
        (total, item) => total + getItemPrice(item) * getItemQuantity(item),
        0
      )
    );
  };

  const handleQuantity = async (item, index, nextQuantity) => {
    const itemId = getItemId(item, index);
    const productId = getProductId(item, index);
    const quantity = Math.max(1, Math.floor(toNumber(nextQuantity)));

    if (updatingItemId || quantity === getItemQuantity(item)) {
      return;
    }

    clearMessages();
    setUpdatingItemId(itemId);

    try {
      const response = await updateCart({
        productId,
        quantity,
      });

      if (response?.success === false) {
        setError(response?.message || "Could not update item quantity.");
        return;
      }

      const nextCart = cart.map((cartItem, cartIndex) => {
        const currentId = getItemId(cartItem, cartIndex);

        return currentId === itemId
          ? {
              ...cartItem,
              quantity,
            }
          : cartItem;
      });

      setCart(nextCart);
      refreshTotalsAfterUpdate(response, nextCart);
      setNotice("Cart quantity updated.");
    } catch {
      setError("Could not update the quantity. Please try again.");
    } finally {
      setUpdatingItemId("");
    }
  };

  const handleRemove = async (item, index) => {
    const itemId = getItemId(item, index);
    const productId = getProductId(item, index);

    if (updatingItemId) {
      return;
    }

    clearMessages();
    setUpdatingItemId(itemId);

    try {
      const response = await updateCart({
        productId,
        action: "remove",
      });

      if (response?.success === false) {
        setError(response?.message || "Could not remove this item.");
        return;
      }

      const nextCart = cart.filter((cartItem, cartIndex) => {
        return getItemId(cartItem, cartIndex) !== itemId;
      });

      setCart(nextCart);
      refreshTotalsAfterUpdate(response, nextCart);

      if (appliedCoupon) {
        setDiscount(0);
        setAppliedCoupon("");
        setCoupon("");
      }

      setNotice("Item removed from your cart.");
    } catch {
      setError("Could not remove this item. Please try again.");
    } finally {
      setUpdatingItemId("");
    }
  };

  const handleCoupon = async () => {
    const couponCode = coupon.trim();

    if (!couponCode) {
      setError("Please enter a coupon code.");
      return;
    }

    if (subtotal <= 0) {
      setError("Add products to your cart before applying a coupon.");
      return;
    }

    clearMessages();
    setApplyingCoupon(true);

    try {
      const response = await applyCoupon({
        code: couponCode,
        subtotal,
      });

      if (response?.success === false) {
        setError(response?.message || "This coupon could not be applied.");
        return;
      }

      const nextDiscount = toNumber(
        response?.discount ??
          response?.discount_amount ??
          response?.data?.discount ??
          0
      );

      if (nextDiscount <= 0) {
        setError(
          response?.message ||
            "This coupon is not valid for the products in your cart."
        );
        return;
      }

      setDiscount(Math.min(nextDiscount, subtotal));
      setAppliedCoupon(couponCode.toUpperCase());
      setCoupon(couponCode.toUpperCase());

      setNotice(
        response?.message ||
          `${couponCode.toUpperCase()} applied successfully.`
      );
    } catch {
      setError("Coupon could not be applied. Please try again.");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleProceedToCheckout = () => {
    if (cart.length === 0) {
      navigate("/shop");
      return;
    }

    navigate("/checkout", {
      state: {
        cart,
        subtotal,
        discount: safeDiscount,
        shipping,
        total,
        coupon: appliedCoupon,
      },
    });
  };

  const PlaceholderImage = ({ title }) => {
    const initials = title
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();

    return (
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-50 to-yellow-100 text-xl font-black text-indigo-700 sm:h-28 sm:w-28">
        {initials || "WJ"}
      </div>
    );
  };

  const MinusIcon = () => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M5 12h14" strokeLinecap="round" />
    </svg>
  );

  const PlusIcon = () => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M12 5v14" strokeLinecap="round" />
      <path d="M5 12h14" strokeLinecap="round" />
    </svg>
  );

  const TrashIcon = () => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 7h16" strokeLinecap="round" />
      <path d="M10 11v6" strokeLinecap="round" />
      <path d="M14 11v6" strokeLinecap="round" />
      <path d="M6 7l1 13h10l1-13" strokeLinejoin="round" />
      <path d="M9 7V4h6v3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const CartIcon = () => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 4h2l2.4 11.5a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L21 8H6" />
      <circle cx="10" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  );

  const ArrowIcon = () => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path d="M5 12h14" strokeLinecap="round" />
      <path d="m13 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  if (loading) {
    return (
      <main className="flex min-h-[55vh] items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-700" />
          <p className="mt-4 text-sm font-bold text-indigo-700">
            Loading your magical cart...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-600">
              Wish Jinny Checkout
            </p>

            <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-indigo-950 sm:text-4xl">
              My Cart
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-indigo-950 shadow-md">
                <CartIcon />
              </span>
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {totalItems > 0
                ? `${totalItems} magical item${
                    totalItems === 1 ? "" : "s"
                  } ready for your wish list.`
                : "Your next magical find is waiting in the shop."}
            </p>
          </div>

          <Link
            to="/shop"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-black text-indigo-700 shadow-sm transition hover:bg-indigo-50"
          >
            Continue shopping
            <ArrowIcon />
          </Link>
        </div>

        {(error || notice) && (
          <div
            role={error ? "alert" : "status"}
            className={`mb-5 rounded-xl border px-4 py-3 text-sm font-semibold ${
              error
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || notice}
          </div>
        )}

        {cart.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-indigo-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
              <CartIcon />
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-900">
              Your cart is empty
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Add your favourite beauty, fashion, jewellery or gifting products
              and let Wish Jinny make your shopping magical.
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
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <section className="space-y-4">
              {cart.map((item, index) => {
                const itemId = getItemId(item, index);
                const productId = getProductId(item, index);
                const itemName = getItemName(item);
                const itemPrice = getItemPrice(item);
                const itemQuantity = getItemQuantity(item);
                const itemImage = getItemImage(item);
                const isUpdating = updatingItemId === itemId;

                return (
                  <article
                    key={itemId}
                    className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md sm:p-5"
                  >
                    <div className="flex gap-4">
                      <Link
                        to={`/product/${encodeURIComponent(productId)}`}
                        className="shrink-0"
                        aria-label={`View ${itemName}`}
                      >
                        {itemImage ? (
                          <img
                            src={itemImage}
                            alt={itemName}
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                            className="h-24 w-24 rounded-2xl object-cover sm:h-28 sm:w-28"
                          />
                        ) : (
                          <PlaceholderImage title={itemName} />
                        )}
                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <Link
                              to={`/product/${encodeURIComponent(productId)}`}
                              className="line-clamp-2 text-base font-black leading-6 text-slate-800 transition hover:text-indigo-700 sm:text-lg"
                            >
                              {itemName}
                            </Link>

                            <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                              Sold by{" "}
                              <span className="text-indigo-600">
                                {getItemVendor(item)}
                              </span>
                            </p>
                          </div>

                          <p className="shrink-0 text-lg font-black text-indigo-700">
                            ₹{formatPrice(itemPrice * itemQuantity)}
                          </p>
                        </div>

                        <p className="mt-2 text-sm font-bold text-slate-600">
                          ₹{formatPrice(itemPrice)} each
                        </p>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleQuantity(
                                  item,
                                  index,
                                  itemQuantity - 1
                                )
                              }
                              disabled={itemQuantity <= 1 || isUpdating}
                              aria-label={`Decrease quantity of ${itemName}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <MinusIcon />
                            </button>

                            <span className="min-w-9 px-2 text-center text-sm font-black text-slate-800">
                              {isUpdating ? "..." : itemQuantity}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                handleQuantity(
                                  item,
                                  index,
                                  itemQuantity + 1
                                )
                              }
                              disabled={isUpdating}
                              aria-label={`Increase quantity of ${itemName}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <PlusIcon />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemove(item, index)}
                            disabled={isUpdating}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-black text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <TrashIcon />
                            {isUpdating ? "Updating..." : "Remove"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            <aside className="h-fit rounded-2xl border border-indigo-100 bg-white p-5 shadow-lg lg:sticky lg:top-24">
              <h2 className="text-xl font-black text-indigo-950">
                Order summary
              </h2>

              <div className="mt-5 space-y-3 border-b border-slate-100 pb-5 text-sm">
                <div className="flex items-center justify-between gap-4 text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-800">
                    ₹{formatPrice(subtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-slate-600">
                  <span>Discount</span>
                  <span className="font-bold text-emerald-600">
                    -₹{formatPrice(safeDiscount)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-slate-600">
                  <span>Shipping</span>
                  <span className="font-bold text-slate-800">
                    {shipping === 0 ? "FREE" : `₹${formatPrice(shipping)}`}
                  </span>
                </div>

                {shipping > 0 && subtotal > 0 && (
                  <p className="rounded-lg bg-yellow-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
                    Add products worth ₹{formatPrice(999 - subtotal)} more for
                    free delivery.
                  </p>
                )}

                {appliedCoupon && (
                  <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                    Coupon {appliedCoupon} is applied.
                  </p>
                )}
              </div>

              <div className="flex items-end justify-between gap-4 py-5">
                <span className="text-base font-black text-slate-800">
                  Total amount
                </span>

                <span className="text-2xl font-black text-indigo-700">
                  ₹{formatPrice(total)}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <label
                  htmlFor="coupon-code"
                  className="text-xs font-black uppercase tracking-[0.12em] text-purple-600"
                >
                  Have a coupon?
                </label>

                <div className="mt-2 flex gap-2">
                  <input
                    id="coupon-code"
                    type="text"
                    placeholder="Enter code"
                    value={coupon}
                    onChange={(event) =>
                      setCoupon(event.target.value.toUpperCase())
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleCoupon();
                      }
                    }}
                    disabled={applyingCoupon}
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-bold uppercase text-slate-800 outline-none transition placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                  />

                  <button
                    type="button"
                    onClick={handleCoupon}
                    disabled={applyingCoupon || !coupon.trim()}
                    className="rounded-xl bg-yellow-400 px-3 py-2.5 text-xs font-black text-indigo-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {applyingCoupon ? "..." : "Apply"}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleProceedToCheckout}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 px-4 py-3.5 text-sm font-black text-white shadow-lg transition hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
              >
                Proceed to checkout
                <ArrowIcon />
              </button>

              <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                Secure checkout and final stock confirmation happen on the next
                step.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

export default Cart;