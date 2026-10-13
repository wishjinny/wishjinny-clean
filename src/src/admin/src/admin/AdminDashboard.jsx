// src/admin/AdminDashboard.jsx

import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAdminData } from "./AdminData";

export default function AdminDashboard() {
  const { pathname } = useLocation();
  const {
    data,
    updateAbout,
    updateContact,
    addProduct,
    deleteProduct,
  } = useAdminData();

  const [product, setProduct] = useState({
    name: "",
    category: "",
    price: "",
    mrp: "",
    stock: "",
    description: "",
    imageUrl: "",
  });

  const [aboutForm, setAboutForm] = useState(data.about);
  const [contactForm, setContactForm] = useState(data.contact);
  const [message, setMessage] = useState("");

  const activeSection =
    pathname === "/admin/products/new"
      ? "add-product"
      : pathname === "/admin/products"
      ? "products"
      : pathname === "/admin/about"
      ? "about"
      : pathname === "/admin/contact"
      ? "contact"
      : "dashboard";

  const handleProductChange = (event) => {
    const { name, value } = event.target;
    setProduct((current) => ({ ...current, [name]: value }));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setProduct((current) => ({
        ...current,
        imageUrl: reader.result,
      }));
    };

    reader.readAsDataURL(file);
  };

  const handleProductSubmit = (event) => {
    event.preventDefault();

    if (!product.name || !product.price) {
      setMessage("Product name aur price zaroori hain.");
      return;
    }

    addProduct(product);
    setProduct({
      name: "",
      category: "",
      price: "",
      mrp: "",
      stock: "",
      description: "",
      imageUrl: "",
    });

    setMessage("Product successfully add ho gaya.");
  };

  const handleAboutSave = (event) => {
    event.preventDefault();
    updateAbout(aboutForm);
    setMessage("About page update ho gaya.");
  };

  const handleContactSave = (event) => {
    event.preventDefault();
    updateContact(contactForm);
    setMessage("Contact details update ho gayi.");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome to Wish Jinny Admin
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Yahan se products, About page aur Contact details manage karein.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
          {message}
        </div>
      )}

      {activeSection === "dashboard" && (
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Total Products</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {data.products.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">About Status</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {data.about.title ? "Ready" : "Not set"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Contact Status</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {data.contact.whatsapp || data.contact.phone ? "Ready" : "Not set"}
            </p>
          </div>
        </div>
      )}

      {activeSection === "add-product" && (
        <form
          onSubmit={handleProductSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8"
        >
          <h2 className="text-xl font-bold text-slate-900">Add New Product</h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Product Name *
              </label>

              <input
                name="name"
                value={product.name}
                onChange={handleProductChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Category
              </label>

              <input
                name="category"
                value={product.category}
                onChange={handleProductChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Selling Price *
              </label>

              <input
                name="price"
                type="number"
                value={product.price}
                onChange={handleProductChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                MRP
              </label>

              <input
                name="mrp"
                type="number"
                value={product.mrp}
                onChange={handleProductChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Stock
              </label>

              <input
                name="stock"
                type="number"
                value={product.stock}
                onChange={handleProductChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Product Image
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Product Description
              </label>

              <textarea
                name="description"
                rows={5}
                value={product.description}
                onChange={handleProductChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-7 rounded-xl bg-indigo-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-800"
          >
            Save Product
          </button>
        </form>
      )}

      {activeSection === "products" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
          <h2 className="text-xl font-bold text-slate-900">Your Products</h2>

          {data.products.length === 0 ? (
            <p className="mt-5 text-sm text-slate-500">
              Abhi koi product add nahi hua hai.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {data.products.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {item.name}
                    </p>

                    <p className="text-sm text-slate-500">
                      ₹{item.price} • {item.category || "No category"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteProduct(item.id)}
                    className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSection === "about" && (
        <form
          onSubmit={handleAboutSave}
          className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8"
        >
          <h2 className="text-xl font-bold text-slate-900">About Page</h2>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Title
              </label>

              <input
                value={aboutForm.title}
                onChange={(event) =>
                  setAboutForm({
                    ...aboutForm,
                    title: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Subtitle
              </label>

              <input
                value={aboutForm.subtitle}
                onChange={(event) =>
                  setAboutForm({
                    ...aboutForm,
                    subtitle: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Description
              </label>

              <textarea
                rows={6}
                value={aboutForm.description}
                onChange={(event) =>
                  setAboutForm({
                    ...aboutForm,
                    description: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-7 rounded-xl bg-indigo-700 px-6 py-3 text-sm font-semibold text-white"
          >
            Save About Page
          </button>
        </form>
      )}

      {activeSection === "contact" && (
        <form
          onSubmit={handleContactSave}
          className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8"
        >
          <h2 className="text-xl font-bold text-slate-900">Contact Details</h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                WhatsApp Number
              </label>

              <input
                value={contactForm.whatsapp}
                onChange={(event) =>
                  setContactForm({
                    ...contactForm,
                    whatsapp: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Phone Number
              </label>

              <input
                value={contactForm.phone}
                onChange={(event) =>
                  setContactForm({
                    ...contactForm,
                    phone: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>

              <input
                value={contactForm.email}
                onChange={(event) =>
                  setContactForm({
                    ...contactForm,
                    email: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Address
              </label>

              <input
                value={contactForm.address}
                onChange={(event) =>
                  setContactForm({
                    ...contactForm,
                    address: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Instagram Link
              </label>

              <input
                value={contactForm.instagram}
                onChange={(event) =>
                  setContactForm({
                    ...contactForm,
                    instagram: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Facebook Link
              </label>

              <input
                value={contactForm.facebook}
                onChange={(event) =>
                  setContactForm({
                    ...contactForm,
                    facebook: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-7 rounded-xl bg-indigo-700 px-6 py-3 text-sm font-semibold text-white"
          >
            Save Contact Details
          </button>
        </form>
      )}
    </div>
  );
}
