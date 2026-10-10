// src/user/ReviewManager.jsx
// Wish Jinny - Premium User Review & Rating Manager

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchUserReviews,
  submitProductReview,
  updateProductReview,
  deleteProductReview,
  fetchEligibleProductsForReview,
} from "../utils/api";

function UserReviewManager() {
  const [reviews, setReviews] = useState([]);
  const [eligibleProducts, setEligibleProducts] = useState([]);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [reviewingProduct, setReviewingProduct] = useState(null);
  const [editingReview, setEditingReview] = useState(null);
  const [reviewToDelete, setReviewToDelete] = useState(null);

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const toNumber = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
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

  const getReviewId = (review, index) => {
    return (
      review?.id ||
      review?._id ||
      review?.review_id ||
      review?.reviewId ||
      `review-${index}`
    );
  };

  const getProductId = (source, index) => {
    return (
      source?.product_id ||
      source?.productId ||
      source?.product?.id ||
      source?.product?._id ||
      source?.id ||
      source?._id ||
      source?.slug ||
      `product-${index}`
    );
  };

  const getProductName = (source) => {
    return (
      source?.product?.name ||
      source?.product?.title ||
      source?.product_name ||
      source?.productName ||
      source?.name ||
      source?.title ||
      "Wish Jinny Product"
    );
  };

  const getProductImage = (source) => {
    const images = source?.product?.images || source?.images;

    if (Array.isArray(images) && images.length > 0) {
      const firstImage = images[0];

      if (typeof firstImage === "string") {
        return firstImage;
      }

      return firstImage?.url || firstImage?.image_url || "";
    }

    return (
      source?.product?.image_url ||
      source?.product?.image ||
      source?.image_url ||
      source?.image ||
      source?.thumbnail ||
      ""
    );
  };

  const normalizeReview = (review, index) => {
    return {
      ...review,
      id: getReviewId(review, index),
      productId: getProductId(review?.product || review, index),
      productName: getProductName(review),
      productImage: getProductImage(review),
      rating: Math.min(
        5,
        Math.max(
          1,
          Math.floor(
            toNumber(review?.rating ?? review?.stars ?? review?.score ?? 5)
          )
        )
      ),
      title: review?.title || review?.headline || "",
      comment: review?.comment || review?.review || review?.text || "",
      createdAt:
        review?.created_at ||
        review?.createdAt ||
        review?.date ||
        review?.submitted_at ||
        "",
      updatedAt: review?.updated_at || review?.updatedAt || "",
      helpfulVotes: toNumber(
        review?.helpful_votes ?? review?.helpfulVotes ?? review?.helpful ?? 0
      ),
      status: review?.status || "Published",
    };
  };

  const normalizeEligibleProduct = (product, index) => {
    return {
      ...product,
      id: getProductId(product, index),
      name: getProductName(product),
      image: getProductImage(product),
      orderId:
        product?.order_id ||
        product?.orderId ||
        product?.order?.id ||
        product?.order?._id ||
        "—",
      deliveryDate:
        product?.delivery_date ||
        product?.deliveryDate ||
        product?.delivered_at ||
        product?.deliveredAt ||
        "",
    };
  };

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  const loadReviewData = async () => {
    setLoading(true);
    setError("");

    try {
      const [reviewsResult, eligibleResult] = await Promise.allSettled([
        fetchUserReviews(),
        fetchEligibleProductsForReview(),
      ]);

      const loadedReviews =
        reviewsResult.status === "fulfilled"
          ? getListFromResponse(reviewsResult.value, [
              "reviews",
              "userReviews",
              "items",
            ]).map(normalizeReview)
          : [];

      const loadedEligibleProducts =
        eligibleResult.status === "fulfilled"
          ? getListFromResponse(eligibleResult.value, [
              "products",
              "eligibleProducts",
              "eligible_products",
              "items",
            ]).map(normalizeEligibleProduct)
          : [];

      setReviews(loadedReviews);
      setEligibleProducts(loadedEligibleProducts);

      if (
        reviewsResult.status === "rejected" ||
        eligibleResult.status === "rejected"
      ) {
        setError(
          "Some review information could not be loaded right now. Please refresh and try again."
        );
      }
    } catch {
      setReviews([]);
      setEligibleProducts([]);
      setError(
        "Your review information could not be loaded right now. Please refresh and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviewData();
  }, []);

  const reviewStats = useMemo(() => {
    const totalReviews = reviews.length;

    const averageRating =
      totalReviews > 0
        ? reviews.reduce((total, review) => total + review.rating, 0) /
          totalReviews
        : 0;

    const helpfulVotes = reviews.reduce(
      (total, review) => total + review.helpfulVotes,
      0
    );

    return {
      totalReviews,
      averageRating,
      pendingReviews: eligibleProducts.length,
      helpfulVotes,
    };
  }, [reviews, eligibleProducts]);

  const formatDate = (value) => {
    if (!value) {
      return "Recently";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const openWriteReview = (product) => {
    clearMessages();
    setReviewingProduct(product);
    setEditingReview(null);
    setRating(5);
    setTitle("");
    setComment("");
    setShowReviewModal(true);
  };

  const openEditReview = (review) => {
    clearMessages();
    setEditingReview(review);
    setReviewingProduct({
      id: review.productId,
      name: review.productName,
      image: review.productImage,
      orderId: review.orderId || "—",
    });
    setRating(review.rating);
    setTitle(review.title);
    setComment(review.comment);
    setShowReviewModal(true);
  };

  const closeReviewModal = () => {
    if (formLoading) {
      return;
    }

    setShowReviewModal(false);
    setReviewingProduct(null);
    setEditingReview(null);
    setRating(5);
    setTitle("");
    setComment("");
  };

  const validateReview = () => {
    if (!reviewingProduct?.id) {
      setError("No product was selected for this review.");
      return false;
    }

    if (rating < 1 || rating > 5) {
      setError("Please select a rating between 1 and 5 stars.");
      return false;
    }

    if (comment.trim().length < 10) {
      setError("Please write at least 10 characters in your review.");
      return false;
    }

    return true;
  };

  const handleSaveReview = async (event) => {
    event.preventDefault();
    clearMessages();

    if (!validateReview()) {
      return;
    }

    setFormLoading(true);

    const payload = {
      rating,
      title: title.trim(),
      comment: comment.trim(),
    };

    try {
      let response;

      if (editingReview) {
        response = await updateProductReview(editingReview.id, payload);
      } else {
        response = await submitProductReview(reviewingProduct.id, payload);
      }

      if (response?.success === false) {
        setError(
          response?.message ||
            `Review could not be ${
              editingReview ? "updated" : "submitted"
            }. Please try again.`
        );
        return;
      }

      const returnedReview =
        response?.review ||
        response?.data?.review ||
        response?.data ||
        response;

      const savedReview = normalizeReview(
        {
          ...payload,
          ...(returnedReview && typeof returnedReview === "object"
            ? returnedReview
            : {}),
          id:
            returnedReview?.id ||
            returnedReview?._id ||
            returnedReview?.review_id ||
            editingReview?.id ||
            `local-review-${Date.now()}`,
          product: {
            id: reviewingProduct.id,
            name: reviewingProduct.name,
            image_url: reviewingProduct.image,
          },
          status:
            returnedReview?.status ||
            (editingReview ? editingReview.status : "Published"),
          created_at:
            returnedReview?.created_at ||
            editingReview?.createdAt ||
            new Date().toISOString(),
        },
        reviews.length
      );

      if (editingReview) {
        setReviews((previousReviews) =>
          previousReviews.map((review) =>
            String(review.id) === String(editingReview.id)
              ? { ...review, ...savedReview, id: review.id }
              : review
          )
        );

        setNotice("Your review has been updated successfully.");
      } else {
        setReviews((previousReviews) => [savedReview, ...previousReviews]);

        setEligibleProducts((previousProducts) =>
          previousProducts.filter(
            (product) => String(product.id) !== String(reviewingProduct.id)
          )
        );

        setNotice("Your review has been submitted successfully.");
      }

      closeReviewModal();
    } catch {
      setError(
        `Review could not be ${
          editingReview ? "updated" : "submitted"
        }. Please check your connection and try again.`
      );
    } finally {
      setFormLoading(false);
    }
  };

  const openDeleteModal = (review) => {
    clearMessages();
    setReviewToDelete(review);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (actionLoadingId) {
      return;
    }

    setShowDeleteModal(false);
    setReviewToDelete(null);
  };

  const handleDeleteReview = async () => {
    if (!reviewToDelete?.id || actionLoadingId) {
      return;
    }

    clearMessages();
    setActionLoadingId(reviewToDelete.id);

    try {
      const response = await deleteProductReview(reviewToDelete.id);

      if (response?.success === false) {
        setError(response?.message || "This review could not be deleted.");
        return;
      }

      setReviews((previousReviews) =>
        previousReviews.filter(
          (review) => String(review.id) !== String(reviewToDelete.id)
        )
      );

      setNotice("Your review has been deleted successfully.");
      setShowDeleteModal(false);
      setReviewToDelete(null);
    } catch {
      setError("This review could not be deleted. Please try again.");
    } finally {
      setActionLoadingId("");
    }
  };

  const StarIcon = ({
    filled = false,
    className = "h-5 w-5",
    onClick,
    interactive = false,
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      aria-label={interactive ? `${filled ? "Remove" : "Set"} star rating` : undefined}
      className={`${
        interactive
          ? "cursor-pointer transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 disabled:cursor-default"
          : "cursor-default"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={`${className} ${
          filled ? "text-yellow-400" : "text-slate-200"
        }`}
        fill="currentColor"
      >
        <path d="m12 2.5 2.94 5.96 6.58.96-4.76 4.64 1.12 6.56L12 17.53l-5.88 3.09 1.12-6.56L2.48 9.42l6.58-.96L12 2.5Z" />
      </svg>
    </button>
  );

  const StarDisplay = ({ value, size = "h-4 w-4" }) => (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon
          key={star}
          filled={value >= star}
          className={size}
        />
      ))}
    </div>
  );

  const ReviewIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-7 w-7"
    >
      <path d="M21 12a8 8 0 0 1-8 8H6l-3 2v-7a8 8 0 1 1 18-3Z" />
      <path d="M8 12h.01M12 12h.01M16 12h.01" strokeLinecap="round" />
    </svg>
  );

  const EditIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
    >
      <path d="M12 20h9" strokeLinecap="round" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5Z" strokeLinejoin="round" />
    </svg>
  );

  const TrashIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
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

  const CloseIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="h-5 w-5"
    >
      <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );

  const ProductPlaceholder = ({ title }) => {
    const initials = title
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();

    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-50 to-yellow-100 text-sm font-black text-indigo-700 sm:h-20 sm:w-20">
        {initials || "WJ"}
      </div>
    );
  };

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="h-9 w-56 rounded bg-slate-200" />

          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-32 rounded-2xl border border-slate-100 bg-white"
              />
            ))}
          </div>

          <div className="mt-6 h-80 rounded-2xl border border-slate-100 bg-white" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              to="/account"
              className="inline-flex text-sm font-black text-indigo-700 transition hover:text-purple-700"
            >
              ← Back to my account
            </Link>

            <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-purple-600">
              Wish Jinny Community
            </p>

            <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-indigo-950 sm:text-4xl">
              My Reviews & Ratings
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-indigo-950 shadow-sm">
                <ReviewIcon />
              </span>
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Share your experience and help other Wish Jinny shoppers find
              products they will love.
            </p>
          </div>

          <Link
            to="/shop"
            className="inline-flex w-fit rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-black text-indigo-700 shadow-sm transition hover:bg-indigo-50"
          >
            Explore products →
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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Total reviews
            </p>
            <p className="mt-2 text-3xl font-black text-indigo-700">
              {reviewStats.totalReviews}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Average rating given
            </p>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-3xl font-black text-amber-600">
                {reviewStats.averageRating.toFixed(1)}
              </p>
              <StarDisplay value={Math.round(reviewStats.averageRating)} />
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Pending reviews
            </p>
            <p className="mt-2 text-3xl font-black text-purple-700">
              {reviewStats.pendingReviews}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Helpful votes
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-700">
              {reviewStats.helpfulVotes}
            </p>
          </article>
        </section>

        {eligibleProducts.length > 0 && (
          <section className="mt-7 rounded-3xl border border-yellow-200 bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">
                  Your feedback matters
                </p>
                <h2 className="mt-1 text-2xl font-black text-amber-950">
                  Write Reviews
                </h2>
                <p className="mt-2 text-sm text-amber-900/80">
                  You have {eligibleProducts.length} delivered product
                  {eligibleProducts.length === 1 ? "" : "s"} waiting for your
                  honest review.
                </p>
              </div>

              <span className="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-black text-amber-800 shadow-sm">
                {eligibleProducts.length} pending
              </span>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {eligibleProducts.map((product, index) => (
                <article
                  key={product.id || `eligible-${index}`}
                  className="flex flex-col gap-4 rounded-2xl border border-yellow-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                        className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                      />
                    ) : (
                      <ProductPlaceholder title={product.name} />
                    )}

                    <div className="min-w-0">
                      <p className="line-clamp-2 font-black text-slate-800">
                        {product.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Order #{product.orderId}
                        {product.deliveryDate
                          ? ` · Delivered ${formatDate(product.deliveryDate)}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openWriteReview(product)}
                    className="shrink-0 rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:shadow-md"
                  >
                    Write review
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="mt-7 rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-purple-600">
                Your product feedback
              </p>
              <h2 className="mt-1 text-2xl font-black text-indigo-950">
                My Reviews
              </h2>
            </div>

            {reviews.length > 0 && (
              <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700">
                {reviews.length} review{reviews.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-yellow-500 shadow-sm">
                <ReviewIcon />
              </div>

              <h3 className="mt-4 text-lg font-black text-indigo-950">
                No reviews written yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Once you receive an eligible product, you can share a rating
                and review here.
              </p>

              <Link
                to="/orders"
                className="mt-5 inline-flex rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-indigo-800"
              >
                View my orders
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {reviews.map((review, index) => {
                const isUpdating = actionLoadingId === review.id;

                return (
                  <article
                    key={getReviewId(review, index)}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      {review.productImage ? (
                        <img
                          src={review.productImage}
                          alt={review.productName}
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                          className="h-16 w-16 shrink-0 rounded-2xl object-cover sm:h-20 sm:w-20"
                        />
                      ) : (
                        <ProductPlaceholder title={review.productName} />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <Link
                              to={`/product/${encodeURIComponent(review.productId)}`}
                              className="line-clamp-2 font-black text-slate-800 transition hover:text-indigo-700"
                            >
                              {review.productName}
                            </Link>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <StarDisplay value={review.rating} />
                              <span className="text-xs font-bold text-slate-600">
                                {review.rating}.0
                              </span>
                              <span className="text-xs text-slate-400">
                                {formatDate(review.createdAt)}
                              </span>
                              {review.status &&
                                review.status.toLowerCase() !== "published" && (
                                  <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700">
                                    {review.status}
                                  </span>
                                )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openEditReview(review)}
                              disabled={Boolean(actionLoadingId)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-50"
                            >
                              <EditIcon />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => openDeleteModal(review)}
                              disabled={Boolean(actionLoadingId)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                            >
                              <TrashIcon />
                              {isUpdating ? "..." : "Delete"}
                            </button>
                          </div>
                        </div>

                        {review.title && (
                          <h3 className="mt-4 text-sm font-black text-slate-800">
                            {review.title}
                          </h3>
                        )}

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {review.comment}
                        </p>

                        {review.helpfulVotes > 0 && (
                          <p className="mt-3 text-xs font-bold text-emerald-700">
                            {review.helpfulVotes} shopper
                            {review.helpfulVotes === 1 ? "" : "s"} found this
                            helpful.
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {showReviewModal && reviewingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
        >
          <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-xl sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-purple-600">
                  Wish Jinny Community
                </p>
                <h2
                  id="review-modal-title"
                  className="mt-1 text-xl font-black text-indigo-950"
                >
                  {editingReview ? "Edit your review" : "Write a review"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeReviewModal}
                disabled={formLoading}
                aria-label="Close review form"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleSaveReview} className="p-5 sm:p-6">
              <div className="flex items-center gap-3 rounded-2xl bg-indigo-50 p-4">
                {reviewingProduct.image ? (
                  <img
                    src={reviewingProduct.image}
                    alt={reviewingProduct.name}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                    className="h-14 w-14 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <ProductPlaceholder title={reviewingProduct.name} />
                )}

                <div className="min-w-0">
                  <p className="line-clamp-2 font-black text-indigo-950">
                    {reviewingProduct.name}
                  </p>
                  {reviewingProduct.orderId && (
                    <p className="mt-1 text-xs text-indigo-700">
                      Order #{reviewingProduct.orderId}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm font-black text-slate-800">
                  Your rating
                </p>

                <div className="mt-3 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarIcon
                      key={star}
                      filled={rating >= star}
                      className="h-9 w-9"
                      interactive
                      onClick={() => setRating(star)}
                    />
                  ))}
                </div>

                <p className="mt-2 text-xs font-semibold text-slate-500">
                  {rating === 5
                    ? "Excellent"
                    : rating === 4
                    ? "Very good"
                    : rating === 3
                    ? "Good"
                    : rating === 2
                    ? "Could be better"
                    : "Not satisfied"}
                </p>
              </div>

              <div className="mt-6">
                <label
                  htmlFor="review-title"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Review title <span className="text-slate-400">(optional)</span>
                </label>

                <input
                  id="review-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Summarise your experience"
                  disabled={formLoading}
                  maxLength={100}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                />
              </div>

              <div className="mt-5">
                <label
                  htmlFor="review-comment"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Your review
                </label>

                <textarea
                  id="review-comment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="What did you like? How was the product quality, fit, packaging or delivery experience?"
                  rows={5}
                  disabled={formLoading}
                  maxLength={1000}
                  className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                />

                <p className="mt-2 text-right text-xs font-semibold text-slate-400">
                  {comment.length}/1000
                </p>
              </div>

              <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-xs leading-5 text-amber-900">
                Please share honest, product-related feedback. Reviews may be
                moderated to protect the Wish Jinny community.
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={closeReviewModal}
                  disabled={formLoading}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="rounded-xl bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {formLoading
                    ? "Saving review..."
                    : editingReview
                    ? "Save changes"
                    : "Submit review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && reviewToDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-review-title"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <TrashIcon />
            </div>

            <h2
              id="delete-review-title"
              className="mt-5 text-xl font-black text-slate-900"
            >
              Delete this review?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              This review for {reviewToDelete.productName} will be removed.
              You may be able to write a new review later according to the
              marketplace review policy.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={Boolean(actionLoadingId)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Keep review
              </button>

              <button
                type="button"
                onClick={handleDeleteReview}
                disabled={Boolean(actionLoadingId)}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoadingId ? "Deleting..." : "Delete review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default UserReviewManager;