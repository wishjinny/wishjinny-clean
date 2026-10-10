// src/pages/CMSManager.jsx
// Wish Jinny - CMS Manager

import { useMemo, useState } from "react";

const INITIAL_CMS_DATA = {
  branding: {
    siteName: "Wish Jinny",
    tagline: "Make every wish feel magical.",
    logoText: "WJ",
    primaryColor: "#4338ca",
  },
  announcement: {
    text: "Free delivery on premium orders above ₹999.",
    enabled: true,
  },
  header: {
    menuItems: [
      { id: "MENU-001", label: "Home", link: "/" },
      { id: "MENU-002", label: "Shop", link: "/shop" },
      { id: "MENU-003", label: "Categories", link: "/categories" },
      { id: "MENU-004", label: "About", link: "/about" },
    ],
  },
  homepage: {
    heroHeading: "Your Wishes, Beautifully Delivered.",
    heroSubheading:
      "Discover premium beauty, fashion, jewellery, lifestyle and magical everyday essentials at Wish Jinny.",
    heroButtonText: "Shop Now",
    heroButtonLink: "/shop",
    published: true,
  },
  footer: {
    description:
      "Wish Jinny is a premium multi-vendor marketplace designed to make every shopping wish feel special.",
    supportEmail: "support@wishjinny.com",
    copyright: "© 2026 Wish Jinny. All rights reserved.",
  },
  policies: [
    {
      id: "POL-001",
      title: "Privacy Policy",
      content:
        "We protect customer information and use it only to provide a secure shopping experience.",
      published: true,
      updatedAt: "2026-10-04",
    },
    {
      id: "POL-002",
      title: "Terms & Conditions",
      content:
        "By using Wish Jinny, customers and vendors agree to our marketplace terms and service policies.",
      published: true,
      updatedAt: "2026-10-04",
    },
    {
      id: "POL-003",
      title: "Refund Policy",
      content:
        "Eligible refunds are processed according to product category and order status.",
      published: false,
      updatedAt: "2026-10-03",
    },
  ],
  media: [
    {
      id: "MEDIA-001",
      name: "Premium Hero Banner",
      type: "image",
      url: "",
      createdAt: "2026-10-04",
    },
    {
      id: "MEDIA-002",
      name: "Beauty Collection Banner",
      type: "image",
      url: "",
      createdAt: "2026-10-03",
    },
  ],
  seo: {
    title: "Wish Jinny | Premium Multi-Vendor Marketplace",
    description:
      "Shop premium beauty, fashion, jewellery, lifestyle products and more at Wish Jinny.",
    keywords: "Wish Jinny, marketplace, beauty, fashion, jewellery, shopping",
  },
  sitePublished: true,
  updatedAt: "2026-10-04",
};

function CMSManager() {
  const [cmsData, setCmsData] = useState(INITIAL_CMS_DATA);
  const [loading, setLoading] = useState(false);
  const [savingSection, setSavingSection] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("branding");

  const tabs = useMemo(
    () => [
      { id: "branding", label: "Branding" },
      { id: "homepage", label: "Homepage" },
      { id: "navigation", label: "Navigation" },
      { id: "footer", label: "Footer" },
      { id: "policies", label: "Policies" },
      { id: "media", label: "Media" },
      { id: "seo", label: "SEO" },
      { id: "publish", label: "Publish" },
    ],
    []
  );

  const updateData = (section, data) => {
    setCmsData((currentData) => ({
      ...currentData,
      [section]: data,
      updatedAt: new Date().toLocaleDateString("en-CA"),
    }));
  };

  const handleSave = (section, message = "Changes saved successfully.") => {
    setSavingSection(section);
    setSuccess("");
    setError("");

    window.setTimeout(() => {
      setCmsData((currentData) => ({
        ...currentData,
        updatedAt: new Date().toLocaleDateString("en-CA"),
      }));

      setSuccess(message);
      setSavingSection("");
    }, 400);
  };

  const handlePublish = (section) => {
    setLoading(true);
    setSuccess("");
    setError("");

    window.setTimeout(() => {
      if (section === "site") {
        setCmsData((currentData) => ({
          ...currentData,
          sitePublished: true,
          updatedAt: new Date().toLocaleDateString("en-CA"),
        }));
        setSuccess("Website published successfully.");
      }

      if (section === "homepage") {
        setCmsData((currentData) => ({
          ...currentData,
          homepage: {
            ...currentData.homepage,
            published: true,
          },
          updatedAt: new Date().toLocaleDateString("en-CA"),
        }));
        setSuccess("Homepage published successfully.");
      }

      setLoading(false);
    }, 450);
  };

  const handleUnpublish = (section) => {
    setLoading(true);
    setSuccess("");
    setError("");

    window.setTimeout(() => {
      if (section === "site") {
        setCmsData((currentData) => ({
          ...currentData,
          sitePublished: false,
          updatedAt: new Date().toLocaleDateString("en-CA"),
        }));
        setSuccess("Website unpublished successfully.");
      }

      if (section === "homepage") {
        setCmsData((currentData) => ({
          ...currentData,
          homepage: {
            ...currentData.homepage,
            published: false,
          },
          updatedAt: new Date().toLocaleDateString("en-CA"),
        }));
        setSuccess("Homepage unpublished successfully.");
      }

      setLoading(false);
    }, 450);
  };

  const updateMenuItem = (index, field, value) => {
    const updatedItems = [...cmsData.header.menuItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

    updateData("header", {
      ...cmsData.header,
      menuItems: updatedItems,
    });
  };

  const addMenuItem = () => {
    updateData("header", {
      ...cmsData.header,
      menuItems: [
        ...cmsData.header.menuItems,
        {
          id: `MENU-${Date.now()}`,
          label: "New Menu Item",
          link: "/",
        },
      ],
    });
  };

  const removeMenuItem = (index) => {
    updateData("header", {
      ...cmsData.header,
      menuItems: cmsData.header.menuItems.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    });
  };

  const updatePolicy = (index, field, value) => {
    const policies = [...cmsData.policies];
    policies[index] = {
      ...policies[index],
      [field]: value,
      updatedAt: new Date().toLocaleDateString("en-CA"),
    };

    updateData("policies", policies);
  };

  const addPolicy = () => {
    updateData("policies", [
      ...cmsData.policies,
      {
        id: `POL-${Date.now()}`,
        title: "New Policy",
        content: "",
        published: false,
        updatedAt: new Date().toLocaleDateString("en-CA"),
      },
    ]);
  };

  const removePolicy = (index) => {
    updateData(
      "policies",
      cmsData.policies.filter((_, policyIndex) => policyIndex !== index)
    );
  };

  const togglePolicyPublish = (index) => {
    const policies = [...cmsData.policies];
    policies[index] = {
      ...policies[index],
      published: !policies[index].published,
      updatedAt: new Date().toLocaleDateString("en-CA"),
    };

    updateData("policies", policies);
    setSuccess(
      `Policy ${policies[index].published ? "published" : "unpublished"} successfully.`
    );
  };

  const handleUploadMedia = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError("Please choose an image or video file.");
      return;
    }

    const fileUrl = URL.createObjectURL(file);

    updateData("media", [
      {
        id: `MEDIA-${Date.now()}`,
        name: file.name,
        type: file.type.startsWith("video/") ? "video" : "image",
        url: fileUrl,
        createdAt: new Date().toLocaleDateString("en-CA"),
      },
      ...cmsData.media,
    ]);

    event.target.value = "";
    setSuccess("Media uploaded successfully.");
  };

  const handleDeleteMedia = (id) => {
    const mediaItem = cmsData.media.find((item) => item.id === id);

    if (mediaItem?.url?.startsWith("blob:")) {
      URL.revokeObjectURL(mediaItem.url);
    }

    updateData(
      "media",
      cmsData.media.filter((item) => item.id !== id)
    );

    setSuccess("Media deleted successfully.");
  };

  const renderBranding = () => (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
          Store Identity
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          Website Branding
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Set the premium identity customers see across Wish Jinny.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Website Name
          </label>
          <input
            type="text"
            value={cmsData.branding.siteName}
            onChange={(event) =>
              updateData("branding", {
                ...cmsData.branding,
                siteName: event.target.value,
              })
            }
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Logo Text
          </label>
          <input
            type="text"
            value={cmsData.branding.logoText}
            onChange={(event) =>
              updateData("branding", {
                ...cmsData.branding,
                logoText: event.target.value,
              })
            }
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Primary Color
          </label>
          <input
            type="color"
            value={cmsData.branding.primaryColor}
            onChange={(event) =>
              updateData("branding", {
                ...cmsData.branding,
                primaryColor: event.target.value,
              })
            }
            className="h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Brand Tagline
          </label>
          <input
            type="text"
            value={cmsData.branding.tagline}
            onChange={(event) =>
              updateData("branding", {
                ...cmsData.branding,
                tagline: event.target.value,
              })
            }
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => handleSave("branding", "Branding saved successfully.")}
        disabled={savingSection === "branding"}
        className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {savingSection === "branding" ? "Saving..." : "Save Branding"}
      </button>
    </section>
  );

  const renderHomepage = () => (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
          Landing Experience
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          Homepage Manager
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Edit the hero section and publishing state of your main storefront.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Hero Heading
        </label>
        <input
          type="text"
          value={cmsData.homepage.heroHeading}
          onChange={(event) =>
            updateData("homepage", {
              ...cmsData.homepage,
              heroHeading: event.target.value,
            })
          }
          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Hero Subheading
        </label>
        <textarea
          value={cmsData.homepage.heroSubheading}
          onChange={(event) =>
            updateData("homepage", {
              ...cmsData.homepage,
              heroSubheading: event.target.value,
            })
          }
          rows={4}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Hero Button Text
          </label>
          <input
            type="text"
            value={cmsData.homepage.heroButtonText}
            onChange={(event) =>
              updateData("homepage", {
                ...cmsData.homepage,
                heroButtonText: event.target.value,
              })
            }
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Hero Button Link
          </label>
          <input
            type="text"
            value={cmsData.homepage.heroButtonLink}
            onChange={(event) =>
              updateData("homepage", {
                ...cmsData.homepage,
                heroButtonLink: event.target.value,
              })
            }
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() =>
            handleSave("homepage", "Homepage changes saved successfully.")
          }
          disabled={savingSection === "homepage"}
          className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingSection === "homepage" ? "Saving..." : "Save Homepage"}
        </button>

        <button
          type="button"
          onClick={() => handlePublish("homepage")}
          disabled={loading || cmsData.homepage.published}
          className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Publish Homepage
        </button>

        <button
          type="button"
          onClick={() => handleUnpublish("homepage")}
          disabled={loading || !cmsData.homepage.published}
          className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Unpublish Homepage
        </button>
      </div>
    </section>
  );

  const renderNavigation = () => (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
            Customer Navigation
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Header Manager
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Control the main navigation links visible to customers.
          </p>
        </div>

        <button
          type="button"
          onClick={addMenuItem}
          className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-800"
        >
          Add Menu Item
        </button>
      </div>

      <div className="space-y-3">
        {cmsData.header.menuItems.map((item, index) => (
          <div
            key={item.id}
            className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto]"
          >
            <input
              type="text"
              value={item.label}
              onChange={(event) =>
                updateMenuItem(index, "label", event.target.value)
              }
              placeholder="Menu label"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />

            <input
              type="text"
              value={item.link}
              onChange={(event) =>
                updateMenuItem(index, "link", event.target.value)
              }
              placeholder="/shop"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />

            <button
              type="button"
              onClick={() => removeMenuItem(index)}
              className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => handleSave("navigation", "Header menu saved successfully.")}
        disabled={savingSection === "navigation"}
        className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {savingSection === "navigation" ? "Saving..." : "Save Header"}
      </button>
    </section>
  );

  const renderFooter = () => (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
          Store Footer
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          Footer Manager
        </h2>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Footer Description
        </label>
        <textarea
          value={cmsData.footer.description}
          onChange={(event) =>
            updateData("footer", {
              ...cmsData.footer,
              description: event.target.value,
            })
          }
          rows={4}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Support Email
          </label>
          <input
            type="email"
            value={cmsData.footer.supportEmail}
            onChange={(event) =>
              updateData("footer", {
                ...cmsData.footer,
                supportEmail: event.target.value,
              })
            }
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Copyright Text
          </label>
          <input
            type="text"
            value={cmsData.footer.copyright}
            onChange={(event) =>
              updateData("footer", {
                ...cmsData.footer,
                copyright: event.target.value,
              })
            }
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => handleSave("footer", "Footer saved successfully.")}
        disabled={savingSection === "footer"}
        className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {savingSection === "footer" ? "Saving..." : "Save Footer"}
      </button>
    </section>
  );

  const renderPolicies = () => (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
            Legal Content
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Website Policies
          </h2>
        </div>

        <button
          type="button"
          onClick={addPolicy}
          className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-800"
        >
          Add Policy
        </button>
      </div>

      <div className="space-y-5">
        {cmsData.policies.map((policy, index) => (
          <article
            key={policy.id}
            className="rounded-2xl border border-slate-100 bg-slate-50 p-5"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  policy.published
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {policy.published ? "Published" : "Draft"}
              </span>

              <span className="text-xs text-slate-500">
                Last updated: {policy.updatedAt}
              </span>
            </div>

            <input
              type="text"
              value={policy.title}
              onChange={(event) =>
                updatePolicy(index, "title", event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg font-semibold outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />

            <textarea
              value={policy.content}
              onChange={(event) =>
                updatePolicy(index, "content", event.target.value)
              }
              rows={5}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  handleSave(`policy-${policy.id}`, "Policy saved successfully.")
                }
                disabled={savingSection === `policy-${policy.id}`}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingSection === `policy-${policy.id}` ? "Saving..." : "Save"}
              </button>

              <button
                type="button"
                onClick={() => togglePolicyPublish(index)}
                className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-800"
              >
                {policy.published ? "Unpublish" : "Publish"}
              </button>

              <button
                type="button"
                onClick={() => removePolicy(index)}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );

  const renderMedia = () => (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
          Asset Library
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          Media Management
        </h2>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50 px-6 py-10 text-center transition hover:border-indigo-400 hover:bg-indigo-100">
        <span className="text-3xl">↑</span>
        <span className="mt-3 font-semibold text-indigo-900">
          Upload image or video
        </span>
        <span className="mt-1 text-sm text-indigo-700">
          Choose a media file from your device
        </span>
        <input
          type="file"
          accept="image/*,video/*"
          onChange={handleUploadMedia}
          className="hidden"
        />
      </label>

      {cmsData.media.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-10 text-center text-slate-500">
          No media uploaded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {cmsData.media.map((media) => (
            <article
              key={media.id}
              className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
            >
              {media.url ? (
                media.type === "video" ? (
                  <video
                    src={media.url}
                    controls
                    className="h-44 w-full bg-slate-900 object-cover"
                  />
                ) : (
                  <img
                    src={media.url}
                    alt={media.name}
                    className="h-44 w-full object-cover"
                  />
                )
              ) : (
                <div className="flex h-44 items-center justify-center bg-gradient-to-br from-indigo-100 via-violet-50 to-amber-50 text-4xl">
                  {media.type === "video" ? "▶" : "✦"}
                </div>
              )}

              <div className="p-4">
                <p className="truncate font-semibold text-slate-900">
                  {media.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {media.type} · {media.createdAt}
                </p>

                <button
                  type="button"
                  onClick={() => handleDeleteMedia(media.id)}
                  className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
                >
                  Delete Media
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );

  const renderSEO = () => (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
          Search Visibility
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          SEO Settings
        </h2>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          SEO Title
        </label>
        <input
          type="text"
          value={cmsData.seo.title}
          onChange={(event) =>
            updateData("seo", {
              ...cmsData.seo,
              title: event.target.value,
            })
          }
          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Meta Description
        </label>
        <textarea
          value={cmsData.seo.description}
          onChange={(event) =>
            updateData("seo", {
              ...cmsData.seo,
              description: event.target.value,
            })
          }
          rows={4}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Keywords
        </label>
        <input
          type="text"
          value={cmsData.seo.keywords}
          onChange={(event) =>
            updateData("seo", {
              ...cmsData.seo,
              keywords: event.target.value,
            })
          }
          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        />
      </div>

      <button
        type="button"
        onClick={() => handleSave("seo", "SEO settings saved successfully.")}
        disabled={savingSection === "seo"}
        className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {savingSection === "seo" ? "Saving..." : "Save SEO Settings"}
      </button>
    </section>
  );

  const renderPublish = () => (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
          Release Control
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          Draft & Publish System
        </h2>
      </div>

      <div
        className={`rounded-3xl border p-6 ${
          cmsData.sitePublished
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <p
          className={`text-sm font-bold uppercase tracking-[0.14em] ${
            cmsData.sitePublished ? "text-emerald-700" : "text-amber-700"
          }`}
        >
          Current Website Status
        </p>

        <h3
          className={`mt-2 text-3xl font-bold ${
            cmsData.sitePublished ? "text-emerald-900" : "text-amber-900"
          }`}
        >
          {cmsData.sitePublished ? "Published & Live" : "Draft / Unpublished"}
        </h3>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Last content update: {cmsData.updatedAt}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => handleSave("draft", "Draft saved successfully.")}
          disabled={savingSection === "draft"}
          className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingSection === "draft" ? "Saving..." : "Save Draft"}
        </button>

        <button
          type="button"
          onClick={() => handlePublish("site")}
          disabled={loading || cmsData.sitePublished}
          className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Publish Website
        </button>

        <button
          type="button"
          onClick={() => handleUnpublish("site")}
          disabled={loading || !cmsData.sitePublished}
          className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Unpublish Website
        </button>
      </div>
    </section>
  );

  const renderActiveTab = () => {
    if (activeTab === "branding") return renderBranding();
    if (activeTab === "homepage") return renderHomepage();
    if (activeTab === "navigation") return renderNavigation();
    if (activeTab === "footer") return renderFooter();
    if (activeTab === "policies") return renderPolicies();
    if (activeTab === "media") return renderMedia();
    if (activeTab === "seo") return renderSEO();
    return renderPublish();
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-800 to-violet-700 p-6 text-white shadow-xl sm:p-8">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-yellow-300/20 blur-3xl" />
          <div className="absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-fuchsia-400/20 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-300">
                Wish Jinny Content Studio
              </p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                CMS Manager
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-indigo-100">
                Control your premium marketplace content, pages, media,
                navigation, SEO and publishing experience.
              </p>
            </div>

            <div
              className={`rounded-2xl px-5 py-4 text-center shadow-lg ${
                cmsData.sitePublished
                  ? "bg-emerald-400 text-emerald-950"
                  : "bg-amber-300 text-amber-950"
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-[0.14em]">
                Website Status
              </p>
              <p className="mt-1 text-lg font-black">
                {cmsData.sitePublished ? "Live" : "Draft"}
              </p>
            </div>
          </div>
        </section>

        {success && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
            {success}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        <section className="mt-6 grid gap-6 lg:grid-cols-[230px_1fr]">
          <aside className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
            <p className="px-3 pb-3 pt-2 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
              Content Controls
            </p>

            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "bg-indigo-700 text-white shadow-sm"
                      : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
            {renderActiveTab()}
          </section>
        </section>
      </div>
    </main>
  );
}

export default CMSManager;