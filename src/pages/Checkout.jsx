// src/pages/Checkout.jsx
// Wish Jinny - Secure Checkout Page

import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { fetchProducts, placeOrder } from "../utils/api";

function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [checkoutData, setCheckoutData] = useState(null);
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);

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

  const getItemId = (item, index) => {
    return (
      item?.id ||
      item?._id ||
      item?.cart_item_id ||
      item?.cartItemId ||
      item?.product_id ||
      item?.productId ||
      `checkout-item-${index}`
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

  const getItemQuantity = (item) => {
    const quantity = Math.floor(
      toNumber(item?.quantity ?? item?.qty ?? item?.count ?? 1)
    );

    return quantity > 0 ? quantity : 1;
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

  const normaliseCheckoutData = (rawData) => {
    const source = rawData?.checkout || rawData?.data || rawData || {};

    const rawItems =
      source?.items ||
      source?.cart?.items ||
      source?.cart ||
      source?.products ||
      [];

    const items = Array.isArray(rawItems) ? rawItems : [];

    const calculatedSubtotal = items.reduce((total, item) => {
      return total + getItemPrice(item) * getItemQuantity(item);
    }, 0);

    const subtotal =
      source?.subtotal !== undefined && source?.subtotal !== null
        ? toNumber(source.subtotal)
        : calculatedSubtotal;

    const discount = Math.min(
      Math.max(
        toNumber(
          source?.discount ??
            source?.discount_amount ??
            source?.coupon_discount ??
            0
        ),
        0
      ),
      subtotal
    );

    const shipping =
      source?.shipping !== undefined && source?.shipping !== null
        ? Math.max(toNumber(source.shipping), 0)
        : items.length > 0 && subtotal < 999
        ? 50
        : 0;

    const total =
      source?.total !== undefined && source?.total !== null
        ? Math.max(toNumber(source.total), 0)
        : Math.max(subtotal - discount + shipping, 0);

    return {
      items,
      subtotal,
      discount,
      shipping,
      total,
      coupon:
        source?.coupon ||
        source?.appliedCoupon ||
        source?.coupon_code ||
        "",
    };
  };

  const loadCheckoutSummary = async () => {
    setLoadingSummary(true);
    setError("");

    try {
      const response = await fetchProducts({ type: "checkout" });

      const serverData =
        response?.checkout ||
        response?.data?.checkout ||
        response?.data ||
        response;

      const normalized = normaliseCheckoutData(serverData);

      if (normalized.items.length === 0) {
        setCheckoutData(null);
      } else {
        setCheckoutData(normalized);
      }
    } catch {
      setCheckoutData(null);
      setError(
        "Checkout summary could not be loaded. Please return to your cart and try again."
      );
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    const cartState = location.state;

    if (cartState?.cart && Array.isArray(cartState.cart)) {
      const cartCheckoutData = normaliseCheckoutData({
        items: cartState.cart,
        subtotal: cartState.subtotal,
        discount: cartState.discount,
        shipping: cartState.shipping,
        total: cartState.total,
        coupon: cartState.coupon,
      });

      if (cartCheckoutData.items.length > 0) {
        setCheckoutData(cartCheckoutData);
        setLoadingSummary(false);
        return;
      }
    }

    loadCheckoutSummary();
  }, [location.state]);

  const totalItems = useMemo(() => {
    if (!checkoutData?.items) {
      return 0;
    }

    return checkoutData.items.reduce((total, item) => {
      return total + getItemQuantity(item);
    }, 0);
  }, [checkoutData]);

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  const handlePlaceOrder = async () => {
    clearMessages();

    const trimmedAddress = address.trim();

    if (!checkoutData?.items?.length) {
      setError("Your cart is empty. Please add products before checkout.");
      return;
    }

    if (trimmedAddress.length < 12) {
      setError("Please enter a complete delivery address.");
      return;
    }

    if (!["cod", "card", "upi"].includes(paymentMethod)) {
      setError("Please select a valid payment method.");
      return;
    }

    setPlacingOrder(true);

    try {
      const response = await placeOrder({
        address: trimmedAddress,
        paymentMethod,
        coupon: checkoutData.coupon || "",
        items: checkoutData.items.map((item, index) => ({
          productId: getProductId(item, index),
          quantity: getItemQuantity(item),
        })),
      });

      if (response?.success === false) {
        setError(response?.message || "Your order could not be placed.");
        return;
      }

      const orderId =
        response?.order?.id ||
        response?.order?._id ||
        response?.orderId ||
        response?.id ||
        response?.data?.order?.id ||
        response?.data?.orderId ||
        "";

      setNotice("Your magical order has been placed successfully.");

      window.setTimeout(() => {
        if (orderId) {
          navigate(`/order/${encodeURIComponent(orderId)}`, {
            replace: true,
          });
        } else {
          navigate("/account", { replace: true });
        }
      }, 700);
    } catch {
      setError(
        "Order API could not be reached. Please check your connection and try again."
      );
    } finally {
      setPlacingOrder(false);
    }
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
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 via-purple-50 to-yellow-100 text-sm font-black text-indigo-700 sm:h-16 sm:w-16">
        {initials || "WJ"}
      </div>
    );
  };

  const ArrowIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      className="h-4 w-4"
    >
      <path d="M5 12h14" strokeLinecap="round" />
      <path d="m13 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const ShieldIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <path d="M12 3 20 7v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Z" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const LocationIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );

  const CardIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h3" strokeLinecap="round" />
    </svg>
  );

  const CashIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M7 9h.01M17 15h.01" strokeLinecap="round" />
    </svg>
  );

  const UpiIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <path d="M5 7h14M5 12h9M5 17h14" strokeLinecap="round" />
      <path d="m16 10 3 2-3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  if (loadingSummary) {
    return (
      <main className="flex min-h-[55vh] items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-700" />
          <p className="mt-4 text-sm font-bold text-indigo-700">
            Preparing your magical checkout...
          </p>
        </div>
      </main>
    );
  }

  const isEmpty = !checkoutData?.items?.length;

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-600">
              Wish Jinny Secure Checkout
            </p>

            <h1 className="mt-2 text-3xl font-black text-indigo-950 sm:text-4xl">
              Checkout
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {isEmpty
                ? "Add a magical product to begin your order."
                : `${totalItems} item${
                    totalItems === 1 ? "" : "s"
                  } ready to be delivered to you.`}
            </p>
          </div>

          <Link
            to="/cart"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-black text-indigo-700 shadow-sm transition hover:bg-indigo-50"
          >
            Back to cart
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

        {isEmpty ? (
          <section className="rounded-3xl border border-dashed border-indigo-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
              <CardIcon />
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-900">
              Your checkout is waiting
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Your cart is currently empty or the checkout details could not be
              found. Return to the shop and choose something magical.
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
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                    <LocationIcon />
                  </span>

                  <div>
                    <p className="font-black text-slate-900">Delivery address</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Enter the complete address where your order should arrive.
                    </p>
                  </div>
                </div>

                <label htmlFor="shipping-address" className="sr-only">
                  Shipping address
                </label>

                <textarea
                  id="shipping-address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Full name, house/flat number, street, area, city, state and PIN code"
                  rows={5}
                  disabled={placingOrder}
                  className="mt-5 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                />
              </section>

              <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                    <CardIcon />
                  </span>

                  <div>
                    <p className="font-black text-slate-900">Payment method</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Choose how you would like to complete this order.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {[
                    {
                      id: "cod",
                      title: "Cash on Delivery",
                      description: "Pay when your Wish Jinny order arrives.",
                      icon: <CashIcon />,
                    },
                    {
                      id: "upi",
                      title: "UPI",
                      description: "Continue securely with your UPI payment app.",
                      icon: <UpiIcon />,
                    },
                    {
                      id: "card",
                      title: "Credit / Debit Card",
                      description:
                        "Continue through a secure payment provider after placing the order.",
                      icon: <CardIcon />,
                    },
                  ].map((method) => (
                    <label
                      key={method.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                        paymentMethod === method.id
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 bg-white hover:border-indigo-200"
                      } ${placingOrder ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      <input
                        type="radio"
                        name="payment-method"
                        value={method.id}
                        checked={paymentMethod === method.id}
                        onChange={(event) =>
                          setPaymentMethod(event.target.value)
                        }
                        disabled={placingOrder}
                        className="mt-1 h-4 w-4 accent-indigo-700"
                      />

                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-700 shadow-sm">
                        {method.icon}
                      </span>

                      <span>
                        <span className="block text-sm font-black text-slate-800">
                          {method.title}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          {method.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <aside className="h-fit rounded-2xl border border-indigo-100 bg-white p-5 shadow-lg lg:sticky lg:top-24">
              <h2 className="text-xl font-black text-indigo-950">
                Order summary
              </h2>

              <div className="mt-5 max-h-72 space-y-4 overflow-y-auto pr-1">
                {checkoutData.items.map((item, index) => {
                  const itemId = getItemId(item, index);
                  const itemName = getItemName(item);
                  const itemImage = getItemImage(item);
                  const itemQuantity = getItemQuantity(item);
                  const itemPrice = getItemPrice(item);

                  return (
                    <article key={itemId} className="flex gap-3">
                      {itemImage ? (
                        <img
                          src={itemImage}
                          alt={itemName}
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                          className="h-14 w-14 shrink-0 rounded-xl object-cover sm:h-16 sm:w-16"
                        />
                      ) : (
                        <PlaceholderImage title={itemName} />
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-black leading-5 text-slate-800">
                          {itemName}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-500">
                          {getItemVendor(item)}
                        </p>

                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-500">
                            Qty {itemQuantity}
                          </span>

                          <span className="text-sm font-black text-indigo-700">
                            ₹{formatPrice(itemPrice * itemQuantity)}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm">
                <div className="flex items-center justify-between gap-4 text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-800">
                    ₹{formatPrice(checkoutData.subtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-slate-600">
                  <span>Discount</span>
                  <span className="font-bold text-emerald-600">
                    -₹{formatPrice(checkoutData.discount)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-slate-600">
                  <span>Shipping</span>
                  <span className="font-bold text-slate-800">
                    {checkoutData.shipping === 0
                      ? "FREE"
                      : `₹${formatPrice(checkoutData.shipping)}`}
                  </span>
                </div>

                {checkoutData.coupon && (
                  <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                    Coupon {checkoutData.coupon} is applied.
                  </p>
                )}
              </div>

              <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-5">
                <span className="text-base font-black text-slate-800">
                  Total amount
                </span>

                <span className="text-2xl font-black text-indigo-700">
                  ₹{formatPrice(checkoutData.total)}
                </span>
              </div>

              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={placingOrder}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 px-4 py-3.5 text-sm font-black text-white shadow-lg transition hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ShieldIcon />
                {placingOrder
                  ? "Placing your order..."
                  : `Place order · ₹${formatPrice(checkoutData.total)}`}
              </button>

              <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                Your final product availability, coupon eligibility and total
                will be verified securely before order confirmation.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

export default Checkout;