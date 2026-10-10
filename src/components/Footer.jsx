import React, { useState } from "react";
import { NavLink } from "react-router-dom";

function Footer() {
  const [email, setEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const quickLinks = [
    { label: "Home", to: "/" },
    { label: "Shop", to: "/shop" },
    { label: "Categories", to: "/categories" },
    { label: "About Us", to: "/about" },
    { label: "Contact", to: "/contact" },
  ];

  const shopCategories = [
    { label: "Beauty", to: "/shop?category=beauty" },
    { label: "Fashion", to: "/shop?category=fashion" },
    { label: "Jewellery", to: "/shop?category=jewellery" },
    { label: "Toys & Kids", to: "/shop?category=toys" },
  ];

  const customerCare = [
    { label: "My Account", to: "/account" },
    { label: "My Wishlist", to: "/wishlist" },
    { label: "Track Order", to: "/track-order" },
    { label: "Help & Support", to: "/contact" },
  ];

  const socialLinks = [
    { label: "Facebook", href: "#" },
    { label: "Instagram", href: "#" },
    { label: "YouTube", href: "#" },
  ];

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setSuccessMessage("Please enter a valid email address.");
      return;
    }

    setSuccessMessage(
      "✨ Thank you for subscribing to Wish Jinny magical updates!"
    );
    setEmail("");
  };

  return (
    <footer className="bg-gradient-to-br from-indigo-950 via-purple-950 to-indigo-900 text-white">
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <h2 className="text-3xl font-black text-yellow-300">
              Wish Jinny
            </h2>

            <p className="mt-4 max-w-md text-sm leading-7 text-indigo-100">
              Your magical shopping destination for beauty, fashion,
              jewellery, toys, gifting and everyday essentials. Discover
              delightful products and make every wish come true.
            </p>

            <NavLink
              to="/shop"
              className="mt-6 inline-flex rounded-xl bg-yellow-400 px-6 py-3 text-sm font-bold text-indigo-950 transition hover:bg-yellow-300"
            >
              Shop Now
            </NavLink>

            <div className="mt-8 flex flex-wrap gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={`Visit Wish Jinny on ${social.label}`}
                  className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-yellow-300 hover:bg-yellow-300 hover:text-indigo-950"
                >
                  {social.label}
                </a>
              ))}
            </div>
          </div>

          <nav aria-label="Quick Links">
            <h3 className="mb-4 text-lg font-bold text-yellow-300">
              Quick Links
            </h3>

            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    className="text-sm text-indigo-100 transition hover:text-yellow-300"
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Shop Categories">
            <h3 className="mb-4 text-lg font-bold text-yellow-300">
              Shop Categories
            </h3>

            <ul className="space-y-3">
              {shopCategories.map((category) => (
                <li key={category.to}>
                  <NavLink
                    to={category.to}
                    className="text-sm text-indigo-100 transition hover:text-yellow-300"
                  >
                    {category.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <nav aria-label="Customer Care">
              <h3 className="mb-4 text-lg font-bold text-yellow-300">
                Customer Care
              </h3>

              <ul className="space-y-3">
                {customerCare.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className="text-sm text-indigo-100 transition hover:text-yellow-300"
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-8">
              <h3 className="mb-4 text-lg font-bold text-yellow-300">
                Newsletter
              </h3>

              <form onSubmit={handleSubmit} className="space-y-3">
                <label htmlFor="footer-email" className="sr-only">
                  Email address
                </label>

                <input
                  id="footer-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-indigo-200 focus:border-yellow-300 focus:ring-2 focus:ring-yellow-300/30"
                />

                <button
                  type="submit"
                  className="w-full rounded-xl bg-yellow-400 px-4 py-3 text-sm font-bold text-indigo-950 transition hover:bg-yellow-300"
                >
                  Subscribe
                </button>
              </form>

              {successMessage && (
                <p
                  className="mt-3 text-xs font-medium text-green-300"
                  role="status"
                >
                  {successMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 text-center md:flex-row">
          <p className="text-sm text-indigo-200">
            © 2026 Wish Jinny. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <NavLink
              to="/privacy"
              className="text-indigo-200 transition hover:text-yellow-300"
            >
              Privacy Policy
            </NavLink>

            <NavLink
              to="/terms"
              className="text-indigo-200 transition hover:text-yellow-300"
            >
              Terms & Conditions
            </NavLink>

            <NavLink
              to="/shipping&returns"
              className="text-indigo-200 transition hover:text-yellow-300"
            >
              Shipping & Returns
            </NavLink>
          </div>
        </div>
      </section>
    </footer>
  );
}

export default Footer;