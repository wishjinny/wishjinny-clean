// src/pages/Categories.jsx
// Wish Jinny - Magical Product Categories Page

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const CATEGORIES = [
  {
    name: "Beauty & Cosmetics",
    icon: "💄",
    accent: "from-pink-100 via-rose-50 to-amber-50",
    subcategories: [
      "Face Care",
      "Skin Care",
      "Hair Care",
      "Makeup",
      "Creams & Lotions",
      "Perfumes & Fragrances",
      "Personal Care",
    ],
  },
  {
    name: "Fashion & Garments",
    icon: "👗",
    accent: "from-purple-100 via-indigo-50 to-pink-50",
    subcategories: [
      "Men",
      "Women",
      "Kids",
      "Traditional Wear",
      "Western Wear",
      "Innerwear / Undergarments",
      "Bags & Accessories",
    ],
  },
  {
    name: "Jewellery & Accessories",
    icon: "💍",
    accent: "from-amber-100 via-yellow-50 to-orange-50",
    subcategories: [
      "Gold Jewellery",
      "Silver Jewellery",
      "Fashion Jewellery",
      "Earrings",
      "Necklaces",
      "Rings",
      "Bangles",
      "Watches",
    ],
  },
  {
    name: "Footwear",
    icon: "👟",
    accent: "from-sky-100 via-blue-50 to-indigo-50",
    subcategories: [
      "Men",
      "Women",
      "Kids",
      "Sports Shoes",
      "Casual Shoes",
      "Sandals",
      "Slippers",
    ],
  },
  {
    name: "Toys & Games",
    icon: "🧸",
    accent: "from-yellow-100 via-amber-50 to-rose-50",
    subcategories: [
      "Kids Toys",
      "Educational Toys",
      "Remote Control Toys",
      "Games",
      "Baby Toys",
    ],
  },
  {
    name: "Mobile & Mobile Accessories",
    icon: "📱",
    accent: "from-indigo-100 via-sky-50 to-slate-50",
    subcategories: [
      "Mobile Phones",
      "Mobile Covers",
      "Screen Protectors",
      "Chargers",
      "Cables",
      "Power Banks",
      "Earphones",
      "AirPods / TWS",
      "Smartwatches",
      "Mobile Stands",
      "Other Mobile Accessories",
    ],
  },
  {
    name: "Electronics & Home Gadgets",
    icon: "🔌",
    accent: "from-slate-100 via-indigo-50 to-blue-50",
    subcategories: [
      "Smart Electronics",
      "Speakers",
      "Headphones",
      "Smart Devices",
      "Small Home Gadgets",
      "Kitchen Gadgets",
      "Electronic Appliances",
      "Lighting & Lights",
    ],
  },
  {
    name: "Home & Living",
    icon: "🏠",
    accent: "from-emerald-100 via-teal-50 to-amber-50",
    subcategories: [
      "Furniture",
      "Home Decoration",
      "Wall Decor",
      "Lamps & Lighting",
      "Kitchen & Dining",
      "Storage & Organization",
      "Bedding",
      "Home Furnishing",
    ],
  },
  {
    name: "Kitchen",
    icon: "🍳",
    accent: "from-orange-100 via-amber-50 to-yellow-50",
    subcategories: [
      "Kitchen Gadgets",
      "Cookware",
      "Kitchen Appliances",
      "Utensils",
      "Storage Containers",
      "Dining Accessories",
    ],
  },
  {
    name: "Food & Beverages",
    icon: "🍫",
    accent: "from-rose-100 via-orange-50 to-yellow-50",
    subcategories: [
      "Juices",
      "Packaged Food",
      "Snacks",
      "Beverages",
      "Grocery Essentials",
    ],
  },
  {
    name: "Health & Wellness",
    icon: "🌿",
    accent: "from-emerald-100 via-green-50 to-lime-50",
    subcategories: [
      "Health Products",
      "Wellness Products",
      "Fitness Accessories",
      "Personal Wellness",
      "Healthy Food & Drinks",
    ],
  },
  {
    name: "Baby & Kids",
    icon: "🍼",
    accent: "from-sky-100 via-cyan-50 to-pink-50",
    subcategories: [
      "Baby Clothing",
      "Baby Care",
      "Toys",
      "School Supplies",
      "Kids Accessories",
    ],
  },
  {
    name: "Sports & Fitness",
    icon: "🏋️",
    accent: "from-lime-100 via-emerald-50 to-teal-50",
    subcategories: [
      "Fitness Equipment",
      "Sports Accessories",
      "Outdoor Sports",
      "Yoga & Exercise",
    ],
  },
  {
    name: "Stationery & Books",
    icon: "📚",
    accent: "from-indigo-100 via-violet-50 to-slate-50",
    subcategories: [
      "Books",
      "Notebooks",
      "Pens",
      "School Supplies",
      "Office Supplies",
    ],
  },
  {
    name: "Home Appliances",
    icon: "🧺",
    accent: "from-blue-100 via-indigo-50 to-slate-50",
    subcategories: [
      "Fans",
      "Small Appliances",
      "Kitchen Appliances",
      "Cleaning Appliances",
      "Other Home Appliances",
    ],
  },
  {
    name: "Automotive",
    icon: "🚗",
    accent: "from-slate-100 via-zinc-50 to-blue-50",
    subcategories: [
      "Car Accessories",
      "Bike Accessories",
      "Cleaning & Care",
      "Travel Accessories",
    ],
  },
  {
    name: "Pet Supplies",
    icon: "🐾",
    accent: "from-amber-100 via-orange-50 to-rose-50",
    subcategories: [
      "Pet Food",
      "Pet Accessories",
      "Pet Care",
    ],
  },
  {
    name: "Travel & Luggage",
    icon: "🧳",
    accent: "from-teal-100 via-sky-50 to-indigo-50",
    subcategories: [
      "Suitcases",
      "Backpacks",
      "Travel Bags",
      "Travel Accessories",
    ],
  },
];

const shopLink = (categoryName) =>
  `/shop?category=${encodeURIComponent(categoryName)}`;

export default function Categories() {
  const [search, setSearch] = useState("");

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return CATEGORIES;
    }

    return CATEGORIES.filter((category) => {
      const categoryMatch = category.name.toLowerCase().includes(query);
      const subcategoryMatch = category.subcategories.some((subcategory) =>
        subcategory.toLowerCase().includes(query)
      );

      return categoryMatch || subcategoryMatch;
    });
  }, [search]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-3xl border border-indigo-100 bg-white/80 p-6 shadow-sm backdrop-blur-sm sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-600">
            ✨ Wish Jinny Collection
          </p>

          <h1 className="mt-3 text-3xl font-black leading-tight text-indigo-950 sm:text-4xl lg:text-5xl">
            Shop by Category
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Explore magical collections across beauty, fashion, jewellery,
            electronics, home, kids and much more. Choose a category and
            discover products made for every wish.
          </p>

          <div className="mt-7 max-w-xl">
            <label htmlFor="category-search" className="sr-only">
              Search categories
            </label>

            <div className="flex items-center overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm transition focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100">
              <span className="pl-4 text-lg text-slate-400" aria-hidden="true">
                🔍
              </span>

              <input
                id="category-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search categories or subcategories..."
                className="min-w-0 flex-1 px-4 py-3.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="px-4 text-lg font-bold text-slate-400 transition hover:text-indigo-700"
                  aria-label="Clear category search"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </section>

        {filteredCategories.length === 0 ? (
          <section className="mt-10 rounded-3xl border border-dashed border-indigo-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-3xl">
              🔍
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-900">
              No categories found
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              We could not find a category matching “{search}”. Try a different
              name or explore all categories.
            </p>

            <button
              type="button"
              onClick={() => setSearch("")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:shadow-xl"
            >
              View all categories
            </button>
          </section>
        ) : (
          <section className="mt-10">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-2xl font-black text-indigo-950">
                {filteredCategories.length}{" "}
                {filteredCategories.length === 1 ? "Category" : "Categories"}
              </h2>

              <p className="text-sm font-semibold text-slate-500">
                Tap any category to explore its products
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredCategories.map((category) => (
                <Link
                  key={category.name}
                  to={shopLink(category.name)}
                  className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-2xl"
                >
                  <div
                    className={`flex h-32 items-center justify-center bg-gradient-to-br ${category.accent}`}
                  >
                    <span className="text-5xl transition-transform duration-300 group-hover:scale-110">
                      {category.icon}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-lg font-black leading-6 text-indigo-950 transition-colors group-hover:text-indigo-700">
                      {category.name}
                    </h3>

                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-purple-600">
                      {category.subcategories.length} subcategories
                    </p>

                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {category.subcategories.slice(0, 4).map((subcategory) => (
                        <li
                          key={subcategory}
                          className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700"
                        >
                          {subcategory}
                        </li>
                      ))}

                      {category.subcategories.length > 4 && (
                        <li className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                          +{category.subcategories.length - 4} more
                        </li>
                      )}
                    </ul>

                    <span className="mt-auto pt-5 text-sm font-black text-indigo-700 transition group-hover:text-purple-700">
                      Explore collection →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}