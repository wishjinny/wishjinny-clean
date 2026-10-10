// src/pages/Home.jsx
// Wish Jinny - Premium Marketplace Home Page


import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { fetchProducts, updateCart } from "../utils/api";


const fallbackCategories = [
  {
    id: "beauty-skincare",
    name: "Beauty & Skincare",
    image_url: "",
    description: "Glow with everyday beauty essentials.",
    accent: "from-rose-100 via-pink-50 to-amber-50",
    icon: "sparkle",
  },
  {
    id: "fashion",
    name: "Fashion",
    image_url: "",
    description: "Styles chosen for every mood and moment.",
    accent: "from-indigo-100 via-purple-50 to-fuchsia-50",
    icon: "hanger",
  },
  {
    id: "jewellery",
    name: "Jewellery",
    image_url: "",
    description: "Sparkle for celebrations and gifting.",
    accent: "from-amber-100 via-yellow-50 to-orange-50",
    icon: "gem",
  },
  {
    id: "toys-kids",
    name: "Toys & Kids",
    image_url: "",
    description: "Fun surprises for little dreamers.",
    accent: "from-sky-100 via-cyan-50 to-emerald-50",
    icon: "toy",
  },
];


const heroHighlights = [
  "Beauty, fashion, jewellery, toys and more",
  "Hand-picked products at magical prices",
  "New deals and arrivals every week",
];


const benefitCards = [
  {
    icon: "✨",
    title: "Magical Deals",
    text: "Discover special offers, festive savings and surprise discounts.",
  },
  {
    icon: "🛍️",
    title: "Everything in One Place",
    text: "Shop beauty, fashion, jewellery, toys and everyday essentials together.",
  },
  {
    icon: "💜",
    title: "Made for Your Wishlist",
    text: "Find thoughtful products for yourself, family, friends and every occasion.",
  },
  {
    icon: "🚚",
    title: "Easy Shopping",
    text: "Browse products easily, view details and choose what you love.",
  },
];


function Home() {
  const navigate = useNavigate();


  const [featured, setFeatured] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [categories, setCategories] = useState([]);


  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [cartError, setCartError] = useState("");
  const [cartLoadingId, setCartLoadingId] = useState("");


  const [searchQuery, setSearchQuery] = useState("");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const [newsletterError, setNewsletterError] = useState("");


  const [imageErrors, setImageErrors] = useState({});
  const [heroImageError, setHeroImageError] = useState(false);
  const [promoImageError, setPromoImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);


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


  const normaliseCategory = (category, index) => {
    const categoryName =
      category?.name ||
      category?.title ||
      category?.category_name ||
      "Wish Jinny Category";


    const matchingFallback = fallbackCategories.find(
      (fallbackCategory) =>
        fallbackCategory.name.toLowerCase() === categoryName.toLowerCase()
    );


    return {
      id:
        category?.id ||
        category?._id ||
        category?.slug ||
        `category-${index}`,
      name: categoryName,
      description:
        category?.description ||
        category?.short_description ||
        matchingFallback?.description ||
        "Discover magical products for every kind of wish.",
      image_url:
        category?.image_url ||
        category?.image ||
        category?.thumbnail ||
        category?.cover_image ||
        "",
      accent:
        matchingFallback?.accent ||
        "from-indigo-100 via-purple-50 to-yellow-50",
      icon: matchingFallback?.icon || "sparkle",
    };
  };


  useEffect(() => {
    let isMounted = true;


    const loadData = async () => {
      setLoading(true);
      setPageError("");


      try {
        const [featuredResult, newResult, categoriesResult] =
          await Promise.allSettled([
            fetchProducts({ type: "featured" }),
            fetchProducts({ type: "new" }),
            fetchProducts({ type: "categories" }),
          ]);


        if (!isMounted) {
          return;
        }


        const featuredProducts =
          featuredResult.status === "fulfilled"
            ? getListFromResponse(featuredResult.value, [
                "products",
                "featured",
                "featuredProducts",
              ])
            : [];


        const newProducts =
          newResult.status === "fulfilled"
            ? getListFromResponse(newResult.value, [
                "products",
                "new",
                "newArrivals",
                "new_arrivals",
              ])
            : [];


        const categoryList =
          categoriesResult.status === "fulfilled"
            ? getListFromResponse(categoriesResult.value, [
                "categories",
                "categoryList",
              ])
            : [];


        setFeatured(featuredProducts);
        setNewArrivals(newProducts);
        setCategories(categoryList.map(normaliseCategory));


        const hasFailedRequest =
          featuredResult.status === "rejected" ||
          newResult.status === "rejected" ||
          categoriesResult.status === "rejected";


        if (hasFailedRequest) {
          setPageError(
            "Some live collections are temporarily unavailable. You can still explore the Wish Jinny shop."
          );
        }
      } catch {
        if (isMounted) {
          setFeatured([]);
          setNewArrivals([]);
          setCategories([]);
          setPageError(
            "Some products could not be loaded right now. You can still explore the shop."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };


    loadData();


    return () => {
      isMounted = false;
    };
  }, []);


  const displayedCategories = useMemo(() => {
    return categories.length > 0 ? categories.slice(0, 8) : fallbackCategories;
  }, [categories]);


  const getProductId = (product) =>
    product?.id || product?._id || product?.product_id || "";


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


      setCartMessage(
        `${product?.name || "Product"} added to your cart.`
      );
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


  const handleSearch = (event) => {
    event.preventDefault();


    const trimmedQuery = searchQuery.trim();


    if (!trimmedQuery) {
      navigate("/shop");
      return;
    }


    navigate(`/shop?search=${encodeURIComponent(trimmedQuery)}`);
  };


  const handleNewsletterSubmit = (event) => {
    event.preventDefault();


    const email = newsletterEmail.trim();


    setNewsletterMessage("");
    setNewsletterError("");


    if (!email) {
      setNewsletterError("Please enter your email address first.");
      return;
    }


    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setNewsletterError("Please enter a valid email address.");
      return;
    }


    setNewsletterMessage(
      "Thank you! You are now on the Wish Jinny magical offers list."
    );
    setNewsletterEmail("");
  };


  const getCategoryImage = (category) => {
    return (
      category?.image_url ||
      category?.image ||
      category?.thumbnail ||
      ""
    );
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
          <path
            d="m10.2 10.2 3.6 3.6M5.8 5.8 3.5 3.5M18.2 18.2l2.3 2.3"
            strokeLinecap="round"
          />
        </svg>
      );
    }


    return (
      <svg {...commonProps}>
        <path
          d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z"
          strokeLinejoin="round"
        />
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


  const LampIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      fill="none"
      className="h-24 w-24 text-yellow-300 drop-shadow-2xl sm:h-32 sm:w-32"
    >
      <path
        d="M16 39c2-7 9-12 17-12s15 5 17 12c-3 5-10 8-17 8s-14-3-17-8Z"
        fill="currentColor"
      />
      <path
        d="M23 29c-1-6 4-12 10-13 6-1 12 3 14 9-4-2-8-2-12 0-4 2-8 3-12 4Z"
        fill="currentColor"
        opacity="0.8"
      />
      <path
        d="M49 36c7 0 10 4 10 7-4 2-8 1-11-2"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M12 43h42"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M28 11c-3-3-1-7 2-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M36 11c3-3 1-7-2-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );


  const ProductSkeletons = () => (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
  );


  return (
    <main className="min-h-screen bg-white text-slate-800">
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-800 to-purple-700 px-5 py-14 text-white sm:px-8 md:py-20 lg:px-12">
        <div className="absolute -left-24 top-8 h-64 w-64 rounded-full bg-yellow-300/20 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="absolute left-1/2 top-6 h-32 w-32 -translate-x-1/2 rounded-full bg-white/10 blur-2xl" />


        <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
          <div className="max-w-2xl">
            <p className="mb-4 inline-flex items-center rounded-full border border-yellow-200/40 bg-yellow-300/15 px-4 py-2 text-sm font-semibold text-yellow-100">
              ✨ Your magical shopping destination
            </p>


            <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Make Your Wish
              <span className="block text-yellow-300">Come True.</span>
            </h1>


            <p className="mt-6 max-w-xl text-base leading-7 text-indigo-100 sm:text-lg">
              Welcome to Wish Jinny—your one-stop destination for beauty,
              fashion, jewellery, toys, gifting and everyday essentials.
              Discover something magical every time you shop.
            </p>


            <ul className="mt-6 space-y-3 text-sm text-indigo-100 sm:text-base">
              {heroHighlights.map((highlight) => (
                <li key={highlight} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-300 text-xs font-black text-indigo-950">
                    ✓
                  </span>
                  {highlight}
                </li>
              ))}
            </ul>


            <form
              onSubmit={handleSearch}
              className="mt-8 flex max-w-xl flex-col gap-3 rounded-2xl bg-white p-3 shadow-2xl sm:flex-row"
            >
              <label htmlFor="home-search" className="sr-only">
                Search Wish Jinny products
              </label>


              <div className="relative min-w-0 flex-1">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-indigo-600">
                  <SearchIcon />
                </span>


                <input
                  id="home-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search beauty, jewellery, toys and more..."
                  className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>


              <button
                type="submit"
                className="rounded-xl bg-yellow-400 px-6 py-3 text-sm font-extrabold text-indigo-950 transition hover:bg-yellow-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200"
              >
                Search
              </button>
            </form>


            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/shop"
                className="rounded-xl bg-yellow-400 px-6 py-3 text-center text-sm font-extrabold text-indigo-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-yellow-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200"
              >
                Shop Now
              </Link>


              <Link
                to="/categories"
                className="rounded-xl border border-white/50 bg-white/10 px-6 py-3 text-center text-sm font-bold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
              >
                Explore Categories
              </Link>
            </div>
          </div>


          <div className="relative mx-auto flex w-full max-w-lg justify-center">
            <div className="absolute inset-10 rounded-full bg-yellow-300/20 blur-3xl" />


            <div className="relative flex min-h-[340px] w-full items-center justify-center overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-sm sm:min-h-[420px]">
              {!heroImageError ? (
                <img
                  src="/assets/genie.png"
                  alt="Wish Jinny magical genie"
                  onError={() => setHeroImageError(true)}
                  className="mx-auto max-h-[410px] w-full object-contain drop-shadow-2xl"
                />
              ) : (
                <div className="flex flex-col items-center text-center">
                  <LampIcon />
                  <p className="mt-4 text-lg font-black text-yellow-200">
                    Wish Jinny Magic
                  </p>
                  <p className="mt-1 max-w-xs text-sm text-indigo-100">
                    A magical shopping experience created for your wishes.
                  </p>
                </div>
              )}


              <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/95 p-4 text-indigo-950 shadow-lg">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-600">
                  Wish Jinny Special
                </p>
                <p className="mt-1 text-lg font-black">
                  A little magic in every order
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section className="border-b border-indigo-100 bg-indigo-50 px-5 py-4 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center text-sm font-semibold text-indigo-900">
          <span>✨ Curated shopping for every occasion</span>
          <span>💜 New products added regularly</span>
          <span>🎁 Perfect finds for gifting</span>
          <span>🛍️ Shop your wishes in one place</span>
        </div>
      </section>


      <section className="bg-gradient-to-r from-purple-100 via-fuchsia-50 to-yellow-50 px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl items-center gap-8 overflow-hidden rounded-3xl bg-white p-6 shadow-lg md:grid-cols-2 md:p-10">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-purple-600">
              Limited-time magic
            </p>


            <h2 className="mt-3 text-3xl font-black text-indigo-950 sm:text-4xl">
              Magical Offers Await You
            </h2>


            <p className="mt-4 max-w-lg leading-7 text-slate-600">
              Explore exclusive deals, festive gifting ideas and enchanted
              discounts across your favourite Wish Jinny collections.
            </p>


            <Link
              to="/shop?offer=true"
              className="mt-6 inline-flex rounded-xl bg-purple-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-purple-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-200"
            >
              Explore Offers
            </Link>
          </div>


          <div className="flex min-h-[220px] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-purple-200 via-fuchsia-100 to-yellow-100 shadow-md">
            {!promoImageError ? (
              <img
                src="/assets/promo-banner.jpg"
                alt="Wish Jinny promotional offers"
                onError={() => setPromoImageError(true)}
                className="h-full min-h-[220px] w-full object-cover"
              />
            ) : (
              <div className="p-6 text-center">
                <span className="text-6xl">🎁</span>
                <p className="mt-4 text-xl font-black text-purple-800">
                  Magical seasonal offers
                </p>
                <p className="mt-2 text-sm text-purple-700">
                  Discover delightful savings across Wish Jinny.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>


      <section className="bg-yellow-50 px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl items-center gap-8 overflow-hidden rounded-3xl border border-yellow-200 bg-gradient-to-r from-yellow-100 via-amber-50 to-orange-50 p-6 shadow-md lg:grid-cols-2 lg:p-10">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-red-600">
              Flash offer
            </p>


            <h2 className="mt-3 text-4xl font-black text-red-600 sm:text-5xl">
              Up to 50% Off
            </h2>


            <p className="mt-4 max-w-xl text-lg leading-7 text-slate-700">
              Limited-time magical savings on selected beauty, fashion,
              jewellery, toy and lifestyle products.
            </p>


            <Link
              to="/shop?discount=50"
              className="mt-6 inline-flex rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
            >
              Shop Discounted Products
            </Link>
          </div>


          <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-purple-800 to-fuchsia-700 shadow-xl">
            {!videoError ? (
              <video
                src="/assets/discount-offer.mp4"
                autoPlay
                muted
                loop
                playsInline
                onError={() => setVideoError(true)}
                className="h-full w-full object-cover"
              >
                Your browser does not support the offer video.
              </video>
            ) : (
              <div className="relative p-8 text-center text-white">
                <span className="text-6xl">✨</span>
                <p className="mt-4 text-2xl font-black">Wish more. Save more.</p>
                <p className="mt-2 text-sm text-purple-100">
                  Offers selected specially for you.
                </p>
              </div>
            )}


            {!videoError && (
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-indigo-950/45 via-transparent to-transparent" />
            )}
          </div>
        </div>
      </section>


      <section className="px-5 py-14 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-purple-600">
                Hand-picked for you
              </p>
              <h2 className="mt-2 text-3xl font-black text-indigo-950">
                Featured Products
              </h2>
              <p className="mt-2 max-w-2xl text-slate-600">
                Discover popular picks from the Wish Jinny collection.
              </p>
            </div>


            <Link
              to="/shop?type=featured"
              className="text-sm font-bold text-indigo-700 transition hover:text-purple-700"
            >
              View all featured products →
            </Link>
          </div>


          {loading ? (
            <ProductSkeletons />
          ) : featured.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.slice(0, 8).map((product, index) => (
                <ProductCard
                  key={product?.id || product?._id || `featured-${index}`}
                  product={product}
                  onAddToCart={handleAddToCart}
                  onBuyNow={handleBuyNow}
                  isAdding={cartLoadingId === `add-${getProductId(product)}`}
                  isBuying={cartLoadingId === `buy-${getProductId(product)}`}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50 p-8 text-center">
              <p className="text-lg font-bold text-indigo-950">
                Featured products are coming soon.
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Explore the full collection to discover more Wish Jinny finds.
              </p>
              <Link
                to="/shop"
                className="mt-5 inline-flex rounded-lg bg-indigo-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-800"
              >
                Browse Shop
              </Link>
            </div>
          )}
        </div>
      </section>


      <section className="bg-slate-50 px-5 py-14 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-yellow-600">
                Freshly added
              </p>
              <h2 className="mt-2 text-3xl font-black text-indigo-950">
                New Arrivals
              </h2>
              <p className="mt-2 max-w-2xl text-slate-600">
                Be among the first to discover what just arrived.
              </p>
            </div>


            <Link
              to="/shop?type=new"
              className="text-sm font-bold text-indigo-700 transition hover:text-purple-700"
            >
              View all new arrivals →
            </Link>
          </div>


          {loading ? (
            <ProductSkeletons />
          ) : newArrivals.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {newArrivals.slice(0, 8).map((product, index) => (
                <ProductCard
                  key={product?.id || product?._id || `new-arrival-${index}`}
                  product={product}
                  onAddToCart={handleAddToCart}
                  onBuyNow={handleBuyNow}
                  isAdding={cartLoadingId === `add-${getProductId(product)}`}
                  isBuying={cartLoadingId === `buy-${getProductId(product)}`}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-purple-200 bg-white p-8 text-center">
              <p className="text-lg font-bold text-indigo-950">
                New arrivals will appear here soon.
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Meanwhile, visit the shop to explore the available collection.
              </p>
              <Link
                to="/shop"
                className="mt-5 inline-flex rounded-lg bg-purple-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-purple-800"
              >
                Explore Shop
              </Link>
            </div>
          )}
        </div>
      </section>


      <section className="px-5 py-14 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 text-center">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-purple-600">
              Shop by mood
            </p>
            <h2 className="mt-2 text-3xl font-black text-indigo-950">
              Popular Categories
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              From everyday essentials to special surprises, choose a category
              and begin your magical shopping journey.
            </p>
          </div>


          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {displayedCategories.map((category, index) => {
              const categoryId =
                category?.id ||
                category?._id ||
                category?.slug ||
                `category-${index}`;


              const categoryName =
                category?.name || category?.title || "Wish Jinny Category";


              const categoryImage = getCategoryImage(category);
              const hasImageError = imageErrors[categoryId];


              return (
                <Link
                  key={categoryId}
                  to={`/shop?category=${encodeURIComponent(categoryName)}`}
                  className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
                >
                  <div
                    className={`relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br ${
                      category?.accent ||
                      "from-indigo-100 via-purple-50 to-yellow-50"
                    }`}
                  >
                    {categoryImage && !hasImageError ? (
                      <img
                        src={categoryImage}
                        alt={categoryName}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                        onError={() =>
                          setImageErrors((previousErrors) => ({
                            ...previousErrors,
                            [categoryId]: true,
                          }))
                        }
                        loading="lazy"
                      />
                    ) : (
                      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/80 text-indigo-700 shadow-lg transition duration-300 group-hover:rotate-3 group-hover:scale-110 sm:h-20 sm:w-20">
                        <CategoryIcon type={category?.icon} />
                      </span>
                    )}
                  </div>


                  <div className="p-4 text-center">
                    <h3 className="text-sm font-black text-indigo-950 sm:text-base">
                      {categoryName}
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-purple-600">
                      Explore collection →
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>


          <div className="mt-8 text-center">
            <Link
              to="/categories"
              className="inline-flex rounded-xl border-2 border-indigo-700 px-6 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-700 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
            >
              View All Categories
            </Link>
          </div>
        </div>
      </section>


      <section className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 px-5 py-14 text-white sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-yellow-300">
              The Wish Jinny difference
            </p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">
              More than shopping—find a little magic.
            </h2>
            <p className="mt-4 leading-7 text-indigo-100">
              Wish Jinny brings together delightful choices for personal style,
              self-care, gifting and everyday life.
            </p>
          </div>


          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {benefitCards.map((benefit) => (
              <article
                key={benefit.title}
                className="rounded-2xl border border-white/10 bg-white/10 p-6 backdrop-blur-sm"
              >
                <span className="text-3xl">{benefit.icon}</span>
                <h3 className="mt-4 text-lg font-black">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-6 text-indigo-100">
                  {benefit.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>


      <section className="bg-yellow-50 px-5 py-14 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl items-center gap-8 rounded-3xl border border-yellow-200 bg-white p-6 shadow-lg md:grid-cols-2 md:p-10">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-purple-600">
              Stay in the magic
            </p>
            <h2 className="mt-2 text-3xl font-black text-indigo-950">
              Get offers, new arrivals and special surprises.
            </h2>
            <p className="mt-4 max-w-xl leading-7 text-slate-600">
              Join the Wish Jinny list and be the first to know about fresh
              collections, festive offers and magical deals.
            </p>
          </div>


          <form onSubmit={handleNewsletterSubmit} className="w-full">
            <label
              htmlFor="newsletter-email"
              className="mb-2 block text-sm font-bold text-indigo-950"
            >
              Your email address
            </label>


            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="newsletter-email"
                type="email"
                value={newsletterEmail}
                onChange={(event) => setNewsletterEmail(event.target.value)}
                placeholder="you@example.com"
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />


              <button
                type="submit"
                className="rounded-xl bg-indigo-700 px-6 py-3 text-sm font-extrabold text-white transition hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
              >
                Join Now
              </button>
            </div>


            {newsletterError && (
              <p role="alert" className="mt-3 text-sm font-semibold text-rose-600">
                {newsletterError}
              </p>
            )}


            {newsletterMessage && (
              <p role="status" className="mt-3 text-sm font-semibold text-emerald-700">
                {newsletterMessage}
              </p>
            )}
          </form>
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


export default Home;