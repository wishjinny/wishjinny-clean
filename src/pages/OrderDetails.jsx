// src/pages/OrderDetails.jsx
// Wish Jinny - Premium Order Details, Tracking and Support Page

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  fetchOrder,
  cancelOrder,
  requestReturn,
  requestRefund,
} from "../utils/api";

function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
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

  const getOrderId = (orderData) => {
    return (
      orderData?.id ||
      orderData?._id ||
      orderData?.order_id ||
      orderData?.orderId ||
      id ||
      "—"
    );
  };

  const getOrderItems = (orderData) => {
    const items =
      orderData?.items ||
      orderData?.products ||
      orderData?.order_items ||
      orderData?.orderItems ||
      [];

    return Array.isArray(items) ? items : [];
  };

  const getItemId = (item, index) => {
    return (
      item?.id ||
      item?._id ||
      item?.order_item_id ||
      item?.orderItemId ||
      item?.product_id ||
      item?.productId ||
      `order-item-${index}`
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

  const normaliseStatus = (statusValue) => {
    const rawStatus = String(statusValue || "Placed")
      .trim()
      .toLowerCase()
      .replace(/[_-]/g, " ");

    const statusMap = {
      pending: "Pending",
      placed: "Placed",
      confirmed: "Confirmed",
      processing: "Processing",
      packed: "Packed",
      shipped: "Shipped",
      dispatched: "Shipped",
      outfordelivery: "Out for Delivery",
      "out for delivery": "Out for Delivery",
      delivered: "Delivered",
      cancelled: "Cancelled",
      canceled: "Cancelled",
      returned: "Returned",
      returnrequested: "Return Requested",
      "return requested": "Return Requested",
      refunded: "Refunded",
      refundrequested: "Refund Requested",
      "refund requested": "Refund Requested",
      refundeligible: "Refund Eligible",
      "refund eligible": "Refund Eligible",
      failed: "Failed",
    };

    return statusMap[rawStatus] || String(statusValue || "Placed");
  };

  const normaliseOrder = (rawOrder) => {
    const source = rawOrder?.order || rawOrder?.data?.order || rawOrder?.data || rawOrder || {};

    const items = getOrderItems(source);

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
      source?.shippingCharge !== undefined && source?.shippingCharge !== null
        ? Math.max(toNumber(source.shippingCharge), 0)
        : source?.shipping_charge !== undefined &&
          source?.shipping_charge !== null
        ? Math.max(toNumber(source.shipping_charge), 0)
        : source?.shipping !== undefined && source?.shipping !== null
        ? Math.max(toNumber(source.shipping), 0)
        : 0;

    const total =
      source?.total !== undefined && source?.total !== null
        ? Math.max(toNumber(source.total), 0)
        : source?.grand_total !== undefined && source?.grand_total !== null
        ? Math.max(toNumber(source.grand_total), 0)
        : Math.max(subtotal - discount + shipping, 0);

    const shippingAddress =
      source?.address ||
      source?.shipping_address ||
      source?.shippingAddress ||
      source?.delivery_address ||
      "";

    const paymentMethod =
      source?.paymentMethod ||
      source?.payment_method ||
      source?.payment?.method ||
      "Not available";

    const paymentStatus =
      source?.paymentStatus ||
      source?.payment_status ||
      source?.payment?.status ||
      "Pending";

    const orderDate =
      source?.date ||
      source?.created_at ||
      source?.createdAt ||
      source?.order_date ||
      "";

    const tracking =
      source?.tracking ||
      source?.tracking_number ||
      source?.trackingNumber ||
      source?.shipment?.tracking_number ||
      "";

    const shippingInfo =
      source?.shippingInfo ||
      source?.shipping_info ||
      source?.shipment?.carrier ||
      source?.courier ||
      "";

    return {
      ...source,
      id: getOrderId(source),
      items,
      status: normaliseStatus(
        source?.status || source?.order_status || source?.orderStatus
      ),
      subtotal,
      discount,
      shipping,
      total,
      address: shippingAddress,
      paymentMethod,
      paymentStatus,
      date: orderDate,
      tracking,
      shippingInfo,
    };
  };

  const loadOrder = async ({ showLoader = true } = {}) => {
    if (!id) {
      setOrder(null);
      setError("No order ID was found.");
      setLoading(false);
      return;
    }

    if (showLoader) {
      setLoading(true);
    }

    setError("");

    try {
      const response = await fetchOrder({ orderId: id });
      const normalizedOrder = normaliseOrder(response);

      if (!normalizedOrder?.id || normalizedOrder.id === "—") {
        throw new Error("Order not found.");
      }

      setOrder(normalizedOrder);
    } catch {
      setOrder(null);
      setError(
        "This order could not be loaded right now. Please check the order ID or try again."
      );
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadOrder();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const orderStatus = order?.status || "Placed";

  const orderItems = useMemo(() => {
    return Array.isArray(order?.items) ? order.items : [];
  }, [order]);

  const totalItems = useMemo(() => {
    return orderItems.reduce(
      (total, item) => total + getItemQuantity(item),
      0
    );
  }, [orderItems]);

  const isCancellationAvailable = [
    "Pending",
    "Placed",
    "Confirmed",
    "Processing",
  ].includes(orderStatus);

  const isReturnAvailable =
    orderStatus === "Delivered" &&
    order?.returnEligible !== false &&
    order?.return_eligible !== false;

  const isRefundAvailable =
    ["Refund Eligible", "Cancelled", "Returned"].includes(orderStatus) &&
    order?.refundEligible !== false &&
    order?.refund_eligible !== false;

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  const runOrderAction = async (action) => {
    if (!id || actionLoading) {
      return;
    }

    clearMessages();
    setActionLoading(action);

    try {
      let response;

      if (action === "cancel") {
        response = await cancelOrder({ orderId: id });
      }

      if (action === "return") {
        response = await requestReturn({ orderId: id });
      }

      if (action === "refund") {
        response = await requestRefund({ orderId: id });
      }

      if (response?.success === false) {
        setError(
          response?.message ||
            "This request could not be completed. Please try again."
        );
        return;
      }

      const actionMessages = {
        cancel: "Your order cancellation request has been submitted.",
        return: "Your return request has been submitted successfully.",
        refund: "Your refund request has been submitted successfully.",
      };

      setNotice(response?.message || actionMessages[action]);

      const responseOrder =
        response?.order || response?.data?.order || response?.data;

      if (responseOrder && typeof responseOrder === "object") {
        setOrder(normaliseOrder(responseOrder));
      } else {
        await loadOrder({ showLoader: false });
      }
    } catch {
      setError(
        "The request could not be completed right now. Please try again later."
      );
    } finally {
      setActionLoading("");
    }
  };

  const formatDate = (value) => {
    if (!value) {
      return "Not available";
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return String(value);
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatPaymentMethod = (method) => {
    const paymentMap = {
      cod: "Cash on Delivery",
      upi: "UPI",
      card: "Credit / Debit Card",
      online: "Online Payment",
    };

    const normalizedMethod = String(method || "").toLowerCase();

    return paymentMap[normalizedMethod] || method || "Not available";
  };

  const getStatusStyles = (status) => {
    const styles = {
      Pending: "bg-amber-100 text-amber-800 border-amber-200",
      Placed: "bg-indigo-100 text-indigo-800 border-indigo-200",
      Confirmed: "bg-indigo-100 text-indigo-800 border-indigo-200",
      Processing: "bg-purple-100 text-purple-800 border-purple-200",
      Packed: "bg-violet-100 text-violet-800 border-violet-200",
      Shipped: "bg-sky-100 text-sky-800 border-sky-200",
      "Out for Delivery": "bg-cyan-100 text-cyan-800 border-cyan-200",
      Delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
      Cancelled: "bg-rose-100 text-rose-800 border-rose-200",
      Returned: "bg-orange-100 text-orange-800 border-orange-200",
      "Return Requested": "bg-orange-100 text-orange-800 border-orange-200",
      Refunded: "bg-emerald-100 text-emerald-800 border-emerald-200",
      "Refund Requested": "bg-pink-100 text-pink-800 border-pink-200",
      "Refund Eligible": "bg-pink-100 text-pink-800 border-pink-200",
      Failed: "bg-rose-100 text-rose-800 border-rose-200",
    };

    return styles[status] || "bg-slate-100 text-slate-700 border-slate-200";
  };

  const getTrackingSteps = () => {
    const progression = [
      "Placed",
      "Confirmed",
      "Processing",
      "Packed",
      "Shipped",
      "Out for Delivery",
      "Delivered",
    ];

    const currentIndex = progression.indexOf(orderStatus);

    if (
      ["Cancelled", "Returned", "Refunded", "Return Requested", "Refund Requested"].includes(
        orderStatus
      )
    ) {
      return progression.slice(0, 2).map((step, index) => ({
        label: step,
        complete: index <= 1,
        current: false,
      }));
    }

    return progression.map((step, index) => ({
      label: step,
      complete: currentIndex >= index,
      current: currentIndex === index,
    }));
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
      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-50 to-yellow-100 text-lg font-black text-indigo-700 sm:h-24 sm:w-24">
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

  const PackageIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-6 w-6"
    >
      <path d="m3 7 9-4 9 4-9 4-9-4Z" strokeLinejoin="round" />
      <path d="M3 7v10l9 4 9-4V7" strokeLinejoin="round" />
      <path d="M12 11v10" />
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

  const TruckIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
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

  if (loading) {
    return (
      <main className="flex min-h-[55vh] items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-700" />
          <p className="mt-4 text-sm font-bold text-indigo-700">
            Loading your magical order...
          </p>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-indigo-200 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
            <PackageIcon />
          </div>

          <h1 className="mt-5 text-2xl font-black text-slate-900">
            Order not available
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error ||
              "We could not find the order you requested. Please check your order history."}
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/orders"
              className="rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:shadow-xl"
            >
              View my orders
            </Link>

            <Link
              to="/shop"
              className="rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-black text-indigo-700 transition hover:bg-indigo-50"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const trackingSteps = getTrackingSteps();

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              to="/orders"
              className="inline-flex items-center gap-2 text-sm font-bold text-indigo-700 transition hover:text-purple-700"
            >
              ← Back to my orders
            </Link>

            <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-purple-600">
              Wish Jinny Order
            </p>

            <h1 className="mt-2 text-3xl font-black text-indigo-950 sm:text-4xl">
              Order #{order.id}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Placed on {formatDate(order.date)} · {totalItems} item
              {totalItems === 1 ? "" : "s"}
            </p>
          </div>

          <span
            className={`w-fit rounded-full border px-4 py-2 text-sm font-black ${getStatusStyles(
              orderStatus
            )}`}
          >
            {orderStatus}
          </span>
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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <TruckIcon />
                </span>

                <div>
                  <h2 className="font-black text-slate-900">Order tracking</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Follow your magical delivery journey.
                  </p>
                </div>
              </div>

              <div className="mt-7 overflow-x-auto pb-2">
                <div className="flex min-w-[600px] items-start justify-between">
                  {trackingSteps.map((step, index) => (
                    <div
                      key={step.label}
                      className="relative flex flex-1 flex-col items-center text-center"
                    >
                      {index < trackingSteps.length - 1 && (
                        <span
                          className={`absolute left-1/2 top-4 h-1 w-full ${
                            step.complete && trackingSteps[index + 1].complete
                              ? "bg-indigo-600"
                              : "bg-slate-200"
                          }`}
                        />
                      )}

                      <span
                        className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-black ${
                          step.complete
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-slate-200 bg-white text-slate-400"
                        }`}
                      >
                        {step.complete ? "✓" : index + 1}
                      </span>

                      <p
                        className={`mt-3 px-1 text-xs font-bold ${
                          step.current
                            ? "text-indigo-700"
                            : step.complete
                            ? "text-slate-700"
                            : "text-slate-400"
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {order.tracking && (
                <div className="mt-6 rounded-xl bg-sky-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-sky-700">
                    Tracking number
                  </p>
                  <p className="mt-1 break-all text-sm font-black text-sky-900">
                    {order.tracking}
                  </p>
                  {order.shippingInfo && (
                    <p className="mt-1 text-xs text-sky-700">
                      Courier: {order.shippingInfo}
                    </p>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-black text-slate-900">Items in your order</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Your selected Wish Jinny finds.
                  </p>
                </div>

                <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700">
                  {totalItems} item{totalItems === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {orderItems.length > 0 ? (
                  orderItems.map((item, index) => {
                    const itemId = getItemId(item, index);
                    const itemName = getItemName(item);
                    const itemImage = getItemImage(item);
                    const itemQuantity = getItemQuantity(item);
                    const itemPrice = getItemPrice(item);
                    const productId = getProductId(item, index);

                    return (
                      <article
                        key={itemId}
                        className="flex gap-4 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:p-4"
                      >
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
                              className="h-20 w-20 rounded-2xl object-cover sm:h-24 sm:w-24"
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
                                className="line-clamp-2 font-black leading-6 text-slate-800 transition hover:text-indigo-700"
                              >
                                {itemName}
                              </Link>

                              <p className="mt-1 truncate text-xs text-slate-500">
                                Sold by{" "}
                                <span className="font-bold text-indigo-600">
                                  {getItemVendor(item)}
                                </span>
                              </p>
                            </div>

                            <p className="shrink-0 text-base font-black text-indigo-700">
                              ₹{formatPrice(itemPrice * itemQuantity)}
                            </p>
                          </div>

                          <p className="mt-3 text-sm font-semibold text-slate-600">
                            ₹{formatPrice(itemPrice)} × {itemQuantity}
                          </p>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                    <p className="text-sm font-bold text-slate-600">
                      Order items are not available right now.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
            <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                  <LocationIcon />
                </span>

                <div>
                  <h2 className="font-black text-slate-900">Delivery details</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Shipping address and courier information.
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                  {order.address || "Delivery address is not available."}
                </p>
              </div>

              {order.shippingInfo && !order.tracking && (
                <p className="mt-3 text-sm font-semibold text-indigo-700">
                  {order.shippingInfo}
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <CardIcon />
                </span>

                <div>
                  <h2 className="font-black text-slate-900">Payment</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Payment method and current status.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Method</span>
                  <span className="text-right font-black text-slate-800">
                    {formatPaymentMethod(order.paymentMethod)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Payment status</span>
                  <span className="text-right font-black text-emerald-700">
                    {order.paymentStatus}
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-lg">
              <h2 className="text-xl font-black text-indigo-950">
                Order summary
              </h2>

              <div className="mt-5 space-y-3 border-b border-slate-100 pb-5 text-sm">
                <div className="flex items-center justify-between gap-4 text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-800">
                    ₹{formatPrice(order.subtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-slate-600">
                  <span>Discount</span>
                  <span className="font-bold text-emerald-600">
                    -₹{formatPrice(order.discount)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-slate-600">
                  <span>Shipping</span>
                  <span className="font-bold text-slate-800">
                    {order.shipping === 0
                      ? "FREE"
                      : `₹${formatPrice(order.shipping)}`}
                  </span>
                </div>
              </div>

              <div className="flex items-end justify-between py-5">
                <span className="text-base font-black text-slate-800">
                  Total paid
                </span>

                <span className="text-2xl font-black text-indigo-700">
                  ₹{formatPrice(order.total)}
                </span>
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-5">
                {isCancellationAvailable && (
                  <button
                    type="button"
                    onClick={() => runOrderAction("cancel")}
                    disabled={Boolean(actionLoading)}
                    className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === "cancel"
                      ? "Submitting cancellation..."
                      : "Cancel order"}
                  </button>
                )}

                {isReturnAvailable && (
                  <button
                    type="button"
                    onClick={() => runOrderAction("return")}
                    disabled={Boolean(actionLoading)}
                    className="w-full rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm font-black text-amber-800 transition hover:bg-yellow-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === "return"
                      ? "Submitting return..."
                      : "Request a return"}
                  </button>
                )}

                {isRefundAvailable && (
                  <button
                    type="button"
                    onClick={() => runOrderAction("refund")}
                    disabled={Boolean(actionLoading)}
                    className="w-full rounded-xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-black text-pink-700 transition hover:bg-pink-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === "refund"
                      ? "Submitting refund..."
                      : "Request a refund"}
                  </button>
                )}

                {!isCancellationAvailable &&
                  !isReturnAvailable &&
                  !isRefundAvailable && (
                    <p className="rounded-xl bg-slate-50 px-4 py-3 text-center text-xs leading-5 text-slate-500">
                      No self-service changes are available for this order right
                      now. Contact Wish Jinny support if you need help.
                    </p>
                  )}

                <button
                  type="button"
                  onClick={() => navigate("/shop")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 px-4 py-3 text-sm font-black text-white shadow-md transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
                >
                  Continue shopping
                  <ArrowIcon />
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default OrderDetails;