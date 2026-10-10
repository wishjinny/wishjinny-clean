import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  const navigationLinks = [
    { label: "Home", to: "/" },
    { label: "Shop", to: "/shop" },
    { label: "Categories", to: "/categories" },
    { label: "Offers", to: "/shop?offer=true" },
    { label: "About", to: "/about" },
    { label: "Contact", to: "/contact" },
  ];

  const actionLinks = [
    { label: "Wishlist", to: "/wishlist", icon: "heart" },
    { label: "Cart", to: "/cart", icon: "cart" },
    { label: "Account", to: "/account", icon: "user" },
  ];

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleSearch = (event) => {
    event.preventDefault();

    const query = searchText.trim();

    if (!query) {
      window.location.href = "/shop";
      return;
    }

    window.location.href = `/shop?search=${encodeURIComponent(query)}`;
  };

  const navClass = ({ isActive }) =>
    [
      "relative rounded-lg px-2 py-2 text-sm font-bold transition",
      "after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-0 after:-translate-x-1/2 after:rounded-full after:bg-yellow-400 after:transition-all",
      isActive
        ? "text-indigo-700 after:w-full"
        : "text-slate-700 hover:text-purple-700 hover:after:w-full",
    ].join(" ");

  const actionClass = ({ isActive }) =>
    [
      "relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition",
      isActive
        ? "bg-indigo-100 text-indigo-700"
        : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-700",
    ].join(" ");

  const mobileNavClass = ({ isActive }) =>
    [
      "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold transition",
      isActive
        ? "bg-indigo-100 text-indigo-700"
        : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-700",
    ].join(" ");

  const LampIcon = ({ className = "h-5 w-5" }) => (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      fill="none"
      className={className}
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

  const SearchIcon = ({ className = "h-5 w-5" }) => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" strokeLinecap="round" />
    </svg>
  );

  const HeartIcon = ({ className = "h-5 w-5" }) => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path
        d="M20.8 4.9a5.4 5.4 0 0 0-7.6 0L12 6.1l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.5a5.4 5.4 0 0 0 0-7.6Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const CartIcon = ({ className = "h-5 w-5" }) => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.4L20 8H7" />
      <circle cx="10" cy="20" r="1" />
      <circle cx="17" cy="20" r="1" />
    </svg>
  );

  const UserIcon = ({ className = "h-5 w-5" }) => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c.8-4 3.3-6 7.5-6s6.7 2 7.5 6" strokeLinecap="round" />
    </svg>
  );

  const ArrowIcon = ({ className = "h-4 w-4" }) => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={className}
    >
      <path d="M5 12h14" strokeLinecap="round" />
      <path d="m13 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const getActionIcon = (icon) => {
    if (icon === "heart") {
      return <HeartIcon />;
    }

    if (icon === "cart") {
      return <CartIcon />;
    }

    return <UserIcon />;
  };

  return (
    <>
      <div className="relative z-50 bg-gradient-to-r from-indigo-950 via-purple-900 to-indigo-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-2 text-center text-xs font-semibold sm:px-6 lg:justify-between lg:px-8">
          <p className="flex items-center justify-center gap-2 text-indigo-100">
            <LampIcon className="h-4 w-4 text-yellow-300" />
            <span>Make a wish, find it here — magical deals await.</span>
          </p>

          <div className="hidden items-center gap-5 text-indigo-100 lg:flex">
            <span>Free delivery on selected orders</span>
            <span className="h-3 w-px bg-white/30" />
            <span>Secure checkout</span>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-[76px] items-center justify-between gap-3">
            <NavLink
              to="/"
              aria-label="Wish Jinny home"
              className="flex shrink-0 items-center gap-2 rounded-lg outline-none transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-300 to-amber-400 text-indigo-950 shadow-sm">
                <LampIcon className="h-6 w-6" />
              </span>

              <span className="flex flex-col leading-none">
                <span className="text-xl font-black tracking-tight sm:text-2xl">
                  <span className="text-indigo-950">Wish</span>
                  <span className="ml-1 text-purple-700">Jinny</span>
                </span>

                <span className="mt-1 hidden text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 xl:block">
                  Make a wish. Shop the magic.
                </span>
              </span>
            </NavLink>

            <nav
              aria-label="Main navigation"
              className="hidden items-center gap-4 xl:flex"
            >
              {navigationLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={navClass}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <form
              onSubmit={handleSearch}
              className="hidden min-w-0 flex-1 items-center justify-center px-2 2xl:flex"
            >
              <label htmlFor="navbar-desktop-search" className="sr-only">
                Search Wish Jinny products
              </label>

              <div className="flex w-full max-w-sm items-center overflow-hidden rounded-xl border border-slate-300 bg-white transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                <span className="pl-3 text-slate-400">
                  <SearchIcon className="h-4 w-4" />
                </span>

                <input
                  id="navbar-desktop-search"
                  type="search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search products..."
                  className="min-w-0 flex-1 px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />

                {searchText && (
                  <button
                    type="button"
                    onClick={() => setSearchText("")}
                    aria-label="Clear search"
                    className="px-2 text-sm font-bold text-slate-400 transition hover:text-indigo-700"
                  >
                    ×
                  </button>
                )}

                <button
                  type="submit"
                  className="m-1 rounded-lg bg-gradient-to-r from-indigo-700 to-purple-700 px-4 py-2 text-xs font-extrabold text-white transition hover:from-indigo-800 hover:to-purple-800"
                >
                  Search
                </button>
              </div>
            </form>

            <div className="hidden shrink-0 items-center gap-1 2xl:flex">
              {actionLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  aria-label={link.label}
                  title={link.label}
                  className={
                    link.icon === "user"
                      ? ({ isActive }) =>
                          [
                            "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition",
                            isActive
                              ? "bg-indigo-950 text-white"
                              : "bg-yellow-400 text-indigo-950 hover:bg-yellow-300",
                          ].join(" ")
                      : actionClass
                  }
                >
                  <span className="relative">
                    {getActionIcon(link.icon)}

                    {link.icon === "cart" && (
                      <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-yellow-400 px-1 text-[9px] font-black text-indigo-950">
                        0
                      </span>
                    )}
                  </span>

                  <span>{link.label}</span>
                </NavLink>
              ))}
            </div>

            <button
              type="button"
              aria-label={isOpen ? "Close mobile menu" : "Open mobile menu"}
              aria-expanded={isOpen}
              aria-controls="navbar-mobile-navigation"
              onClick={() => setIsOpen((previousValue) => !previousValue)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-indigo-950 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 2xl:hidden"
            >
              <span>{isOpen ? "Close" : "Menu"}</span>
              <span
                className={`text-lg leading-none transition-transform ${
                  isOpen ? "rotate-45" : ""
                }`}
                aria-hidden="true"
              >
                +
              </span>
            </button>
          </div>
        </div>

        {isOpen && (
          <div
            id="navbar-mobile-navigation"
            className="absolute left-0 right-0 top-full max-h-[calc(100vh-110px)] overflow-y-auto border-t border-slate-200 bg-white shadow-2xl 2xl:hidden"
          >
            <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
              <form
                onSubmit={(event) => {
                  handleSearch(event);
                  closeMenu();
                }}
                className="mb-5 flex items-center overflow-hidden rounded-xl border border-slate-300 bg-white transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100"
              >
                <label htmlFor="navbar-mobile-search" className="sr-only">
                  Search Wish Jinny products
                </label>

                <span className="pl-3 text-slate-400">
                  <SearchIcon className="h-5 w-5" />
                </span>

                <input
                  id="navbar-mobile-search"
                  type="search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search beauty, jewellery, toys and more..."
                  className="min-w-0 flex-1 px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />

                <button
                  type="submit"
                  className="m-1 rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-800"
                >
                  Search
                </button>
              </form>

              <nav aria-label="Mobile main navigation">
                <ul className="space-y-1">
                  {navigationLinks.map((link) => (
                    <li key={link.to}>
                      <NavLink
                        to={link.to}
                        onClick={closeMenu}
                        className={mobileNavClass}
                      >
                        <span>{link.label}</span>
                        <ArrowIcon className="h-4 w-4" />
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="my-5 border-t border-slate-200" />

              <nav aria-label="Mobile account navigation">
                <ul className="space-y-1">
                  {actionLinks.map((link) => (
                    <li key={link.to}>
                      <NavLink
                        to={link.to}
                        onClick={closeMenu}
                        className={mobileNavClass}
                      >
                        <span className="flex items-center gap-3">
                          <span className="relative">
                            {getActionIcon(link.icon)}

                            {link.icon === "cart" && (
                              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-yellow-400 px-1 text-[9px] font-black text-indigo-950">
                                0
                              </span>
                            )}
                          </span>

                          {link.label}
                        </span>

                        <ArrowIcon className="h-4 w-4" />
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="mt-6 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-800 via-purple-700 to-indigo-950 p-5 text-white shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-yellow-300">
                      <LampIcon className="h-5 w-5" />
                      <span className="text-xs font-black uppercase tracking-[0.14em]">
                        Wish Jinny Magic
                      </span>
                    </div>

                    <h3 className="mt-3 text-xl font-black">
                      Your next wish is waiting.
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-indigo-100">
                      Discover beauty, fashion, jewellery, toys, gifting and
                      delightful everyday finds in one magical destination.
                    </p>
                  </div>

                  <LampIcon className="h-12 w-12 shrink-0 text-yellow-300/80" />
                </div>

                <NavLink
                  to="/shop"
                  onClick={closeMenu}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-extrabold text-indigo-950 transition hover:bg-yellow-300"
                >
                  Shop Now
                  <ArrowIcon className="h-4 w-4" />
                </NavLink>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}

export default Navbar;