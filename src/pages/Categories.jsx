// src/pages/Categories.jsx
// Wish Jinny - Magical Product Categories Page

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchProducts } from "../utils/api";

const fallbackCategories = [
  {
    id: "beauty-skincare",
    name: "Beauty & Skincare",
    description: "Glow, care and everyday beauty essentials.",
    subcategories: ["Face Wash", "Skincare Kits", "Makeup", "Hair Care"],
    image_url: "",
    accent: "from-rose-100 via-pink-50 to-amber-50",
    icon: "sparkle",
  },
  {
    id: "fashion",
    name: "Fashion",
    description: "Everyday style and statement-making finds.",
    subcategories: ["Bags", "Clothing", "Footwear", "Accessories"],
    image_url: "",
    accent: "from-indigo-100 via-purple-50 to-fuchsia-50",
    icon: "hanger",
  },
  {
    id: "jewellery",
    name: "Jewellery",
    description: "Elegant shine for every special moment.",
    subcategories: ["Necklaces", "Earrings", "Rings", "Bracelets"],
    image_url: "",
    accent: "from-amber-100 via-yellow-50 to-orange-50",
    icon: "gem",
  },
  {
    id: "toys-kids",
    name: "Toys & Kids",
    description: "Fun, learning and magical gifting ideas.",
    subcategories: ["Learning Toys", "Games", "Baby Care", "Gifts"],
    image_url: "",
    accent: "from-sky-100 via-cyan-50 to-emerald-50",
    icon: "toy",
  },
  {
    id: "home-living",
    name: "Home & Living",
    description: "Warm details to make every space feel special.",
    subcategories: ["Decor", "Kitchen", "Storage", "Lighting"],
    image_url: "",
    accent: "from-emerald-100 via-teal-50 to-lime-50",
    icon: "home",
  },
  {
    id: "gifts",
    name: "Gifting",
    description: "Thoughtful surprises for people you love.",
    subcategories: ["Birthday Gifts", "Festive Gifts", "Personalised", "Gift Sets"],
    image_url: "",
    accent: "from-violet-100 via-purple-50 to-pink-50",
    icon: "gift",
  },
  {
    id: "wellness",
    name: "Wellness",
    description: "Small rituals for a happier everyday routine.",
    subcategories: ["Self Care", "Fitness", "Aromatherapy", "Health"],
    image_url: "",
    accent: "from-green-100 via-emerald-50 to-teal-50",
    icon: "leaf",
  },
  {
    id: "offers",
    name: "Magical Offers",
    description: "Discover special savings across your favourite wishes.",
    subcategories: ["Under ₹499", "Best Deals", "New Arrivals", "Bestsellers"],
    image_url: "",
    accent: "from-yellow-100 via-amber-50 to-orange-50",
    icon: "magic",
  },
];

function Categories() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState(fallbackCategories);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    let isMounted = true;

    const normalizeCategory = (category, index) => {
      const rawSubcategories =
        category?.subcategories ||
        category?.children ||
        category?.sub_categories ||
        category?.items ||
        [];

      const normalizedSubcategories = Array.isArray(rawSubcategories)
        ? rawSubcategories
            .map((subcategory) => {
              if (typeof subcategory === "string") {
                return subcategory;
              }

              return (
                subcategory?.name ||
                subcategory?.title ||
                subcategory?.category_name ||
                ""
              );
            })
            .filter(Boolean)
        : [];

      const fallbackMatch = fallbackCategories.find(
        (fallbackCategory) =>
          fallbackCategory.name.toLowerCase() ===
          String(
            category?.name ||
              category?.title ||
              category?.category_name ||
              ""
          ).toLowerCase()
      );

      return {
        id:
          category?.id ||
          category?._id ||
          category?.slug ||
          `category-${index}`,
        name:
          category?.name ||
          category?.title ||
          category?.category_name ||
          "Wish Jinny Category",
        description:
          category?.description ||
          category?.short_description ||
          fallbackMatch?.description ||
          "Discover magical products curated for your wishes.",
        subcategories:
          normalizedSubcategories.length > 0
            ? normalizedSubcategories
            : fallbackMatch?.subcategories || [],
        image_url:
          category?.image_url ||
          category?.image ||
          category?.thumbnail ||
          category?.cover_image ||
          "",
        accent: fallbackMatch?.accent || "from-indigo-100 via-purple-50 to-yellow-50",
        icon: fallbackMatch?.icon || "sparkle",
      };
    };

    const loadCategories = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetchProducts({ type: "categories" });

        const categoryData =
          response?.categories ||
          response?.items ||
          response?.data?.categories ||
          response?.data?.items ||
          response?.data ||
          response ||
          [];

        if (!Array.isArray(categoryData) || categoryData.length === 0) {
          throw new Error("No categories returned.");
        }

        const normalizedCategories = categoryData.map(normalizeCategory);

        if (isMounted) {
          setCategories(normalizedCategories);
        }
      } catch {
        if (isMounted) {
          setCategories(fallbackCategories);
          setError(
            "Live categories are unavailable right now, so we are showing Wish Jinny's featured categories."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!normalizedSearch) {
      return categories;
    }

    return categories.filter((category) => {
      const categoryName = String(category?.name || "").toLowerCase();
      const categoryDescription = String(
        category?.description || ""
      ).toLowerCase();

      const hasMatchingSubcategory = Array.isArray(category?.subcategories)
        ? category.subcategories.some((subcategory) =>
            String(subcategory).toLowerCase().includes(normalizedSearch)
          )
        : false;

      return (
        categoryName.includes(normalizedSearch) ||
        categoryDescription.includes(normalizedSearch) ||
        hasMatchingSubcategory
      );
    });
  }, [categories, normalizedSearch]);

  const handleCategoryClick = (categoryName) => {
    navigate(`/shop?category=${encodeURIComponent(categoryName)}`);
  };

  const handleSubcategoryClick = (event, categoryName, subcategoryName) => {
    event.preventDefault();
    event.stopPropagation();

    navigate(
      `/shop?category=${encodeURIComponent(
        categoryName
      )}&subcategory=${encodeURIComponent(subcategoryName)}`
    );
  };

  const handleCardKeyDown = (event, categoryName) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCategoryClick(categoryName);
    }
  };

  const CategoryIcon = ({ type }) => {
    const commonProps = {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.8",
      className: "h-9 w-9",
      "aria-hidden": true,
    };

    if (type === "hanger") {
      return (
        <svg {...commonProps}>
          <path d="M12 5a2.5 2.5 0 1 0-2.5-2.5" strokeLinecap="round" />
          <path
            d="m9.5 7.5-6.1 6.1A2.1 2.1 0 0 0 4.9 17h14.2a2.1 2.1 0 0 0 1.5-3.4l-6.1-6.1"
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    if (type === "gem") {
      return (
        <svg {...commonProps}>
          <path d="m5 8 3-4h8l3 4-7 12L5 8Z" strokeLinejoin="round" />
          <path d="m5 8h14M8 4l4 16L16 4" strokeLinejoin="round" />
        </svg>
      );
    }

    if (type === "toy") {
      return (
        <svg {...commonProps}>
          <circle cx="8" cy="8" r="3" />
          <circle cx="16" cy="16" r="3" />
          <path d="m10.2 10.2 3.6 3.6M5.8 5.8 3.5 3.5M18.2 18.2l2.3 2.3" strokeLinecap="round" />
        </svg>
      );
    }

    if (type === "home") {
      return (
        <svg {...commonProps}>
          <path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9Z" strokeLinejoin="round" />
          <path d="M9 21v-6h6v6" strokeLinejoin="round" />
        </svg>
      );
    }

    if (type === "gift") {
      return (
        <svg {...commonProps}>
          <path d="M4 10h16v11H4zM3 6h18v4H3z" strokeLinejoin="round" />
          <path d="M12 6v15M12 6H8.5a2.5 2.5 0 1 1 2.5-2.5V6Zm0 0h3.5A2.5 2.5 0 1 0 13 3.5V6Z" strokeLinejoin="round" />
        </svg>
      );
    }

    if (type === "leaf") {
      return (
        <svg {...commonProps}>
          <path d="M20 4C10 4 5 8 5 15c0 2.5 1.5 4 4 4 7 0 11-5 11-15Z" strokeLinejoin="round" />
          <path d="M4 20c3-4 6-6 11-9" strokeLinecap="round" />
        </svg>
      );
    }

    if (type === "magic") {
      return (
        <svg {...commonProps}>
          <path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" strokeLinejoin="round" />
          <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" strokeLinejoin="round" />
        </svg>
      );
    }

    return (
      <svg {...commonProps}>
        <path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" strokeLinejoin="round" />
        <path d="M5 19h14" strokeLinecap="round" />
      </svg>
    );
  };

  const SearchIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" strokeLinecap="round" />
    </svg>
  );

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

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-indigo-800 to-purple-800 px-6 py-10 text-center text-white shadow-xl sm:px-10">
          <div className="absolute -left-10 top-0 h-36 w-36 rounded-full bg-purple-400/20 blur-3xl" />
          <div className="absolute -right-8 bottom-0 h-40 w-40 rounded-full bg-yellow-300/20 blur-3xl" />

          <div className="relative mx-auto max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-300">
              Wish Jinny Collections
            </p>

            <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
              Explore Magical Categories
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-indigo-100 sm:text-base">
              From everyday beauty to memorable gifts, discover curated
              categories created for every kind of wish.
            </p>

            <div className="relative mx-auto mt-7 max-w-xl">
              <label htmlFor="category-search" className="sr-only">
                Search Wish Jinny categories
              </label>

              <SearchIcon />

              <input
                id="category-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search beauty, fashion, gifts, jewellery..."
                className="w-full rounded-2xl border border-white/20 bg-white px-12 py-4 text-sm font-medium text-slate-800 shadow-lg outline-none transition placeholder:text-slate-400 focus:border-yellow-300 focus:ring-4 focus:ring-yellow-300/30"
              />

              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-indigo-700">
                <SearchIcon />
              </span>
            </div>
          </div>
        </section>

        {error && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-800"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-72 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-700" />
              <p className="mt-4 text-sm font-bold text-indigo-700">
                Loading magical categories...
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-purple-600">
                  Find your wish
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">
                  {normalizedSearch
                    ? `${filteredCategories.length} category${
                        filteredCategories.length === 1 ? "" : "ies"
                      } found`
                    : "Choose a collection"}
                </h2>
              </div>

              {normalizedSearch && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="self-start text-sm font-black text-indigo-700 transition hover:text-purple-700 sm:self-auto"
                >
                  Clear search
                </button>
              )}
            </div>

            {filteredCategories.length === 0 ? (
              <section className="mt-6 rounded-3xl border border-dashed border-indigo-200 bg-white p-8 text-center shadow-sm">
                <h3 className="text-xl font-black text-slate-900">
                  No magical category found
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Try a different word, or browse every product in the Wish
                  Jinny shop.
                </p>

                <Link
                  to="/shop"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:shadow-xl"
                >
                  Browse all products
                  <ArrowIcon />
                </Link>
              </section>
            ) : (
              <section className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredCategories.map((category, index) => {
                  const categoryId = category?.id || `category-${index}`;
                  const categoryName = category?.name || "Wish Jinny Category";
                  const categoryImage = category?.image_url || "";
                  const hasImageError = imageErrors[categoryId];

                  return (
                    <article
                      key={categoryId}
                      role="button"
                      tabIndex={0}
                      aria-label={`Explore ${categoryName}`}
                      onClick={() => handleCategoryClick(categoryName)}
                      onKeyDown={(event) =>
                        handleCardKeyDown(event, categoryName)
                      }
                      className="group cursor-pointer overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
                    >
                      <div
                        className={`relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br ${
                          category?.accent ||
                          "from-indigo-100 via-purple-50 to-yellow-50"
                        }`}
                      >
                        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/40 blur-xl transition duration-500 group-hover:scale-125" />

                        {categoryImage && !hasImageError ? (
                          <img
                            src={categoryImage}
                            alt={categoryName}
                            onError={() =>
                              setImageErrors((previousErrors) => ({
                                ...previousErrors,
                                [categoryId]: true,
                              }))
                            }
                            className="relative z-10 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <span className="relative z-10 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/75 text-indigo-700 shadow-lg transition duration-300 group-hover:rotate-3 group-hover:scale-110">
                            <CategoryIcon type={category?.icon} />
                          </span>
                        )}
                      </div>

                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-lg font-black text-slate-800 transition group-hover:text-indigo-700">
                            {categoryName}
                          </h3>

                          <span className="mt-0.5 text-indigo-600 transition group-hover:translate-x-1">
                            <ArrowIcon />
                          </span>
                        </div>

                        <p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">
                          {category?.description ||
                            "Discover curated products for your wishes."}
                        </p>

                        {Array.isArray(category?.subcategories) &&
                          category.subcategories.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {category.subcategories
                                .slice(0, 4)
                                .map((subcategory, subcategoryIndex) => (
                                  <button
                                    key={`${categoryId}-${subcategory}-${subcategoryIndex}`}
                                    type="button"
                                    onClick={(event) =>
                                      handleSubcategoryClick(
                                        event,
                                        categoryName,
                                        subcategory
                                      )
                                    }
                                    className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 transition hover:bg-indigo-100 hover:text-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                                  >
                                    {subcategory}
                                  </button>
                                ))}
                            </div>
                          )}

                        <p className="mt-5 text-xs font-black uppercase tracking-[0.12em] text-purple-600">
                          Explore collection
                        </p>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default Categories;