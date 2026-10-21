// src/pages/Shop.jsx
// Wish Jinny - Complete Shop Page

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { fetchProducts, updateCart } from "../utils/api";

const CATEGORIES = [
  "All",
  "Beauty & Skincare",
  "Fashion",
  "Jewellery",
  "Toys & Kids",
  "Everyday Essentials",
];

function Shop() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [cartError, setCartError] = useState("");
  const [cartLoadingId, setCartLoadingId] = useState("");

  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") || ""
  );

  const selectedType = searchParams.get("type") || "";
  const selectedCategory = searchParams.get("category") || "";
  const selectedSearch = searchParams.get("search") || "";
  const selectedOffer = searchParams.get("offer") || "";
  const selectedDiscount = searchParams.get("discount") || "";
  const selectedSort = searchParams.get("sort") || "newest";

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

  const getProductId = (product) =>
    product?.id ||
    product?._id ||
    product?.product_id ||
    product?.productId ||
    product?.slug ||
    "";

  const getProductCategory = (product) =>
    product?.category?.name ||
    product?.category ||
    product?.category_name ||
    product?.categoryName ||
    "";

  const getProductPrice = (product) =>
    Number(
      product?.discount_price ??
        product?.sale_price ??
        product?.selling_price ??
        product?.offer_price ??
        product?.price ??
        0
    ) || 0;

  const getProductOriginalPrice = (product) =>
    Number(
      product?.original_price ??
        product?.mrp ??
        product?.regular_price ??
        product?.compare_at_price ??
        product?.price ??
        0
    ) || 0;

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      setLoading(true);
      setPageError("");

      try {
        const requestParams = {};

        if (selectedType) {
          requestParams.type = selectedType;
        }

        if (selectedCategory) {
          requestParams.category = selectedCategory;
        }

        const response = await fetchProducts(requestParams);

        if (!isMounted) {
          return;
        }

        setProducts(
          getListFromResponse(response, [
            "products",
            "items",
            "featured",
            "featuredProducts",
            "new",
            "newArrivals",
            "new_arrivals",
          ])
        );
      } catch {
        if (isMounted) {
          setProducts([]);
          setPageError(
            "Products could not be loaded right now. Please try again."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, [selectedType, selectedCategory]);

  const visibleProducts = useMemo(() => {
    let list = [...products];

    if (selectedSearch.trim()) {
      const query = selectedSearch.trim().toLowerCase();

      list = list.filter((product) => {
        const name = String(
          product?.name ||
            product?.title ||
            product?.product_name ||
            product?.productName ||
            ""
        ).toLowerCase();

        const description = String(product?.description || "").toLowerCase();

        return name.includes(query) || description.includes(query);
      });
    }

    if (selectedCategory && selectedCategory !== "All") {
      list = list.filter((product) => {
        const productCategory = getProductCategory(product);

        return (
          String(productCategory).toLowerCase() ===
          String(selectedCategory).toLowerCase()
        );
      });
    }

    if (selectedOffer === "true") {
      list = list.filter((product) => {
        const currentPrice = getProductPrice(product);
        const originalPrice = getProductOriginalPrice(product);

        return originalPrice > currentPrice && currentPrice > 0;
      });
    }

    if (selectedDiscount) {
      const minimumDiscount = Number(selectedDiscount) || 0;

      list = list.filter((product) => {
        const currentPrice = getProductPrice(product);
        const originalPrice = getProductOriginalPrice(product);

        if (!originalPrice || originalPrice <= currentPrice) {
          return false;
        }

        const discountPercentage =
          ((originalPrice - currentPrice) / originalPrice) * 100;

        return discountPercentage >= minimumDiscount;
      });
    }

    if (selectedSort === "price-low") {
      list.sort(
        (firstProduct, secondProduct) =>
          getProductPrice(firstProduct) - getProductPrice(secondProduct)
      );
    } else if (selectedSort === "price-high") {
      list.sort(
        (firstProduct, secondProduct) =>
          getProductPrice(secondProduct) - getProductPrice(firstProduct)
      );
    } else if (selectedSort === "name") {
      list.sort((firstProduct, secondProduct) =>
        String(
          firstProduct?.name ||
            firstProduct?.title ||
            firstProduct?.product_name ||
            ""
        ).localeCompare(
          String(
            secondProduct?.name ||
              secondProduct?.title ||
              secondProduct?.product_name ||
              ""
          )
        )
      );
    }

    return list;
  }, [
    products,
    selectedSearch,
    selectedCategory,
    selectedOffer,
    selectedDiscount,
    selectedSort,
  ]);

  const handleAddToCart = async (product) => {
    const productId = getProductId(product);

    if (!productId) {
      setCartError("This product cannot be added to the cart.");
      return;
    }

    setCartError("");
    setCartMessage("");
    setCartLoadingId(`add-${productId}`);

    try {
      const response = await updateCart({
        productId,
        quantity: 1,
      });

      if (response?.success === false) {
        throw new Error(response?.message || "Could not add product to cart.");
      }

      setCartMessage(`${product?.name || "Product"} added to your cart.`);
    } catch (error) {
      setCartError(error?.message || "Could not add product to the cart.");
    } finally {
      setCartLoadingId("");
    }
  };

  const handleBuyNow = async (product) => {
    const productId = getProductId(product);

    if (!productId) {
      setCartError("This product cannot be purchased right now.");
      return;
    }

    setCartError("");
    setCartMessage("");
    setCartLoadingId(`buy-${productId}`);

    try {
      const response = await updateCart({
        productId,
        quantity: 1,
      });

      if (response?.success === false) {
        throw new Error(response?.message || "Could not start checkout.");
      }

      navigate("/cart");
    } catch (error) {
      setCartError(error?.message || "Could not start checkout.");
      setCartLoadingId("");
    }
  };

  const updateSearchParams = (key, value) => {
    const nextParams = new URLSearchParams(searchParams);

    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }

    setSearchParams(nextParams);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    updateSearchParams("search", searchInput.trim());
  };

  const changeCategory = (categoryName) => {
    updateSearchParams(
      "category",
      categoryName === "All" ? "" : categoryName
    );
  };

  const changeSort = (sortValue) => {
    updateSearchParams("sort", sortValue === "newest" ? "" : sortValue);
  };

  const ProductSkeletons = () => (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
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
  );

  return (
    <main className="min-h-screen bg-white text-slate-800">
      <section className="bg-gradient-to-br from-indigo-950 via-indigo-800 to-purple-700 px-5 py-12 text-white sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <p className="mb-4 inline-flex items-center rounded-full border border-yellow-200/40 bg-yellow-300/15 px-4 py-2 text-sm font-semibold text-yellow-100">
            ✨ Wish Jinny Marketplace
          </p>

          <h1 className="text-4xl font-black leading-tight sm:text-5xl">
            Explore Every
            <span className="block text-yellow-300">Magical Wish.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-indigo-100 sm:text-lg">
            Browse beauty, fashion, jewellery, toys and everyday essentials from
            the complete Wish Jinny collection.
          </p>

          <form
            onSubmit={handleSearch}
            className="mt-8 flex max-w-xl flex-col gap-3 rounded-2xl bg-white p-3 shadow-2xl sm:flex-row"
          >
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search products..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />

            <button
              type="submit"
              className="rounded-xl bg-yellow-400 px-6 py-3 text-sm font-extrabold text-indigo-950 transition hover:bg-yellow-300"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="border-b border-indigo-100 bg-indigo-50 px-5 py-5 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((categoryName) => (
              <button
                key={categoryName}
                type="button"
                onClick={() => changeCategory(categoryName)}
                className={`rounded-full px-4 py-2 text-xs font-black transition sm:text-sm ${
                  (selectedCategory || "All") === categoryName
                    ? "bg-indigo-700 text-white shadow-lg"
                    : "border border-indigo-100 bg-white text-indigo-700 hover:bg-indigo-50"
                }`}
              >
                {categoryName}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-purple-600">
                Wish Jinny collection
              </p>

              <h2 className="mt-2 text-3xl font-black text-indigo-950">
                {selectedCategory || "All Products"}
              </h2>

              <p className="mt-2 text-slate-600">
                Showing {visibleProducts.length} product
                {visibleProducts.length === 1 ? "" : "s"}
              </p>
            </div>

            <select
              value={selectedSort}
              onChange={(event) => changeSort(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:w-56"
            >
              <option value="newest">Newest first</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>

          {(pageError || loading) && (
            <div
              className={`mb-6 rounded-xl border px-4 py-3 text-sm font-bold ${
                pageError
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-indigo-100 bg-indigo-50 text-indigo-700"
              }`}
            >
              {pageError || "Loading products..."}
            </div>
          )}

          {loading ? (
            <ProductSkeletons />
          ) : visibleProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleProducts.map((product, index) => (
                <ProductCard
                  key={getProductId(product) || `shop-product-${index}`}
                  product={product}
                  onAddToCart={handleAddToCart}
                  onBuyNow={handleBuyNow}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50 p-10 text-center">
              <p className="text-lg font-bold text-indigo-950">
                No products found
              </p>

              <p className="mt-2 text-sm text-slate-600">
                Try another category or search with a different product name.
              </p>
            </div>
          )}
        </div>
      </section>

      {(cartMessage || cartError || pageError) && (
        <div
          role="status"
          className={`fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg rounded-xl border p-4 text-center text-sm font-medium shadow-xl ${
            cartError
              ? "border-rose-300 bg-rose-50 text-rose-800"
              : "border-emerald-300 bg-emerald-50 text-emerald-800"
          }`}
        >
          {cartError || cartMessage || pageError}
        </div>
      )}
    </main>
  );
}

export default Shop;