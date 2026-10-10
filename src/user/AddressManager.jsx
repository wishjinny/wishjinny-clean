// src/user/AddressManager.jsx
// Wish Jinny - Premium User Address Manager

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchUserAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../utils/api";

const indianStates = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const emptyAddress = {
  name: "",
  phone: "",
  type: "home",
  street: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  instructions: "",
  isDefault: false,
};

function UserAddressManager() {
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [formData, setFormData] = useState(emptyAddress);
  const [editingAddressId, setEditingAddressId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const getAddressId = (address, index) => {
    return (
      address?.id ||
      address?._id ||
      address?.address_id ||
      address?.addressId ||
      `address-${index}`
    );
  };

  const normalizeAddress = (address) => {
    return {
      ...emptyAddress,
      ...address,
      id:
        address?.id ||
        address?._id ||
        address?.address_id ||
        address?.addressId ||
        "",
      name: address?.name || address?.full_name || address?.fullName || "",
      phone: address?.phone || address?.mobile || address?.mobile_number || "",
      type: String(address?.type || address?.address_type || "home").toLowerCase(),
      street:
        address?.street ||
        address?.address ||
        address?.line1 ||
        address?.address_line_1 ||
        "",
      landmark: address?.landmark || "",
      city: address?.city || "",
      state: address?.state || "",
      pincode:
        address?.pincode ||
        address?.pin_code ||
        address?.postal_code ||
        "",
      instructions:
        address?.instructions ||
        address?.delivery_instructions ||
        address?.note ||
        "",
      isDefault: Boolean(
        address?.isDefault ||
          address?.is_default ||
          address?.default ||
          address?.default_address
      ),
    };
  };

  const getAddressesFromResponse = (response) => {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.addresses)) {
      return response.addresses;
    }

    if (Array.isArray(response?.items)) {
      return response.items;
    }

    if (Array.isArray(response?.data?.addresses)) {
      return response.data.addresses;
    }

    if (Array.isArray(response?.data?.items)) {
      return response.data.items;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    return [];
  };

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  const loadAddresses = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchUserAddresses();
      const loadedAddresses = getAddressesFromResponse(response).map(
        normalizeAddress
      );

      setAddresses(loadedAddresses);
    } catch {
      setAddresses([]);
      setError(
        "Saved addresses could not be loaded right now. Please refresh and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const totalAddresses = useMemo(() => addresses.length, [addresses]);

  const openAddForm = () => {
    clearMessages();
    setFormData({
      ...emptyAddress,
      isDefault: addresses.length === 0,
    });
    setEditingAddressId("");
    setShowForm(true);
  };

  const openEditForm = (address, index) => {
    clearMessages();

    const normalizedAddress = normalizeAddress(address);

    setFormData(normalizedAddress);
    setEditingAddressId(getAddressId(address, index));
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingAddressId("");
    setFormData(emptyAddress);
  };

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;

    let nextValue = type === "checkbox" ? checked : value;

    if (name === "phone" || name === "pincode") {
      nextValue = value.replace(/\D/g, "");
    }

    setFormData((previousFormData) => ({
      ...previousFormData,
      [name]: nextValue,
    }));
  };

  const validateAddress = () => {
    if (!formData.name.trim()) {
      setError("Please enter the recipient's full name.");
      return false;
    }

    if (!/^\d{10}$/.test(formData.phone.trim())) {
      setError("Please enter a valid 10-digit mobile number.");
      return false;
    }

    if (!formData.street.trim()) {
      setError("Please enter flat, house number or street address.");
      return false;
    }

    if (!formData.city.trim()) {
      setError("Please enter your city.");
      return false;
    }

    if (!formData.state.trim()) {
      setError("Please select your state.");
      return false;
    }

    if (!/^\d{6}$/.test(formData.pincode.trim())) {
      setError("Please enter a valid 6-digit PIN code.");
      return false;
    }

    return true;
  };

  const makeAddressPayload = () => {
    return {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      type: formData.type,
      street: formData.street.trim(),
      landmark: formData.landmark.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
      instructions: formData.instructions.trim(),
      isDefault: Boolean(formData.isDefault),
    };
  };

  const handleSaveAddress = async (event) => {
    event.preventDefault();
    clearMessages();

    if (!validateAddress()) {
      return;
    }

    setFormLoading(true);

    try {
      const payload = makeAddressPayload();
      let response;

      if (editingAddressId) {
        response = await updateAddress(editingAddressId, payload);
      } else {
        response = await addAddress(payload);
      }

      if (response?.success === false) {
        setError(
          response?.message ||
            `Address could not be ${
              editingAddressId ? "updated" : "saved"
            }. Please try again.`
        );
        return;
      }

      const returnedAddress =
        response?.address ||
        response?.data?.address ||
        response?.data ||
        response;

      const savedAddress = normalizeAddress({
        ...payload,
        ...(returnedAddress && typeof returnedAddress === "object"
          ? returnedAddress
          : {}),
        id:
          returnedAddress?.id ||
          returnedAddress?._id ||
          returnedAddress?.address_id ||
          returnedAddress?.addressId ||
          editingAddressId ||
          `local-address-${Date.now()}`,
      });

      if (editingAddressId) {
        setAddresses((previousAddresses) =>
          previousAddresses.map((address, index) => {
            const currentId = getAddressId(address, index);

            if (String(currentId) === String(editingAddressId)) {
              return savedAddress;
            }

            if (savedAddress.isDefault) {
              return { ...address, isDefault: false };
            }

            return address;
          })
        );
      } else {
        setAddresses((previousAddresses) => {
          const updatedAddresses = savedAddress.isDefault
            ? previousAddresses.map((address) => ({
                ...address,
                isDefault: false,
              }))
            : previousAddresses;

          return [...updatedAddresses, savedAddress];
        });
      }

      closeForm();
      setNotice(
        editingAddressId
          ? "Your address has been updated successfully."
          : "Your new address has been saved successfully."
      );
    } catch {
      setError(
        `Address could not be ${
          editingAddressId ? "updated" : "saved"
        }. Please check your connection and try again.`
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleSetDefault = async (address, index) => {
    const addressId = getAddressId(address, index);

    if (actionLoadingId || address.isDefault) {
      return;
    }

    clearMessages();
    setActionLoadingId(addressId);

    try {
      const response = await setDefaultAddress(addressId);

      if (response?.success === false) {
        setError(response?.message || "Default address could not be updated.");
        return;
      }

      setAddresses((previousAddresses) =>
        previousAddresses.map((currentAddress, currentIndex) => ({
          ...currentAddress,
          isDefault:
            String(getAddressId(currentAddress, currentIndex)) ===
            String(addressId),
        }))
      );

      setNotice("Your default delivery address has been updated.");
    } catch {
      setError("Default address could not be updated. Please try again.");
    } finally {
      setActionLoadingId("");
    }
  };

  const openDeleteModal = (address, index) => {
    clearMessages();
    setAddressToDelete({
      ...address,
      id: getAddressId(address, index),
    });
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setAddressToDelete(null);
    setShowDeleteModal(false);
  };

  const handleDeleteAddress = async () => {
    const addressId = addressToDelete?.id;

    if (!addressId || actionLoadingId) {
      return;
    }

    clearMessages();
    setActionLoadingId(addressId);

    try {
      const response = await deleteAddress(addressId);

      if (response?.success === false) {
        setError(response?.message || "This address could not be deleted.");
        return;
      }

      const remainingAddresses = addresses.filter((address, index) => {
        return String(getAddressId(address, index)) !== String(addressId);
      });

      const deletedWasDefault = Boolean(addressToDelete?.isDefault);

      setAddresses(
        remainingAddresses.map((address, index) => ({
          ...address,
          isDefault:
            deletedWasDefault && index === 0 ? true : Boolean(address.isDefault),
        }))
      );

      closeDeleteModal();
      setNotice("Address deleted successfully.");
    } catch {
      setError("This address could not be deleted. Please try again.");
    } finally {
      setActionLoadingId("");
    }
  };

  const AddressTypeIcon = ({ type }) => {
    if (type === "work") {
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5"
        >
          <rect x="3" y="7" width="18" height="14" rx="1" />
          <path d="M8 7V4h8v3M9 12h6M12 9v6" strokeLinecap="round" />
        </svg>
      );
    }

    if (type === "other") {
      return (
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
    }

    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-5 w-5"
      >
        <path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9Z" />
        <path d="M9 21v-6h6v6" />
      </svg>
    );
  };

  const LocationIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-7 w-7"
    >
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );

  const PlusIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      className="h-4 w-4"
    >
      <path d="M12 5v14" strokeLinecap="round" />
      <path d="M5 12h14" strokeLinecap="round" />
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

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="h-9 w-56 animate-pulse rounded bg-slate-200" />

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-64 animate-pulse rounded-2xl border border-slate-100 bg-white"
              />
            ))}
          </div>
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
              Wish Jinny Delivery
            </p>

            <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-indigo-950 sm:text-4xl">
              My Addresses
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-indigo-950 shadow-sm">
                <LocationIcon />
              </span>
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {totalAddresses > 0
                ? `${totalAddresses} saved delivery address${
                    totalAddresses === 1 ? "" : "es"
                  }. Choose a default for faster checkout.`
                : "Save delivery addresses to make checkout faster and easier."}
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
          >
            <PlusIcon />
            Add new address
          </button>
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

        {addresses.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-indigo-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
              <LocationIcon />
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-900">
              No addresses saved yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Add your home, work or another delivery location so your Wish
              Jinny orders reach you without any delay.
            </p>

            <button
              type="button"
              onClick={openAddForm}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:shadow-xl"
            >
              <PlusIcon />
              Add your first address
            </button>
          </section>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {addresses.map((address, index) => {
              const addressId = getAddressId(address, index);
              const normalizedAddress = normalizeAddress(address);
              const isUpdating = actionLoadingId === addressId;

              return (
                <article
                  key={addressId}
                  className={`relative flex min-h-72 flex-col overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-lg ${
                    normalizedAddress.isDefault
                      ? "border-indigo-300 ring-2 ring-indigo-100"
                      : "border-slate-200"
                  }`}
                >
                  {normalizedAddress.isDefault && (
                    <span className="absolute right-4 top-4 rounded-full bg-yellow-400 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-950">
                      Default address
                    </span>
                  )}

                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        normalizedAddress.type === "work"
                          ? "bg-purple-100 text-purple-700"
                          : normalizedAddress.type === "other"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      <AddressTypeIcon type={normalizedAddress.type} />
                    </span>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        {normalizedAddress.type || "home"}
                      </p>
                      <h2 className="mt-1 font-black text-slate-800">
                        {normalizedAddress.name}
                      </h2>
                    </div>
                  </div>

                  <div className="mt-5 space-y-1 text-sm leading-6 text-slate-600">
                    <p className="font-semibold text-slate-700">
                      {normalizedAddress.phone}
                    </p>
                    <p>{normalizedAddress.street}</p>
                    {normalizedAddress.landmark && (
                      <p>Near {normalizedAddress.landmark}</p>
                    )}
                    <p>
                      {normalizedAddress.city}, {normalizedAddress.state}{" "}
                      {normalizedAddress.pincode}
                    </p>
                    {normalizedAddress.instructions && (
                      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                        Delivery note: {normalizedAddress.instructions}
                      </p>
                    )}
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-2 border-t border-slate-100 pt-5">
                    <button
                      type="button"
                      onClick={() => openEditForm(address, index)}
                      disabled={Boolean(actionLoadingId)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-xs font-black text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <EditIcon />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => openDeleteModal(address, index)}
                      disabled={Boolean(actionLoadingId)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <TrashIcon />
                      Delete
                    </button>
                  </div>

                  {!normalizedAddress.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(address, index)}
                      disabled={Boolean(actionLoadingId)}
                      className="mt-3 w-full rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 px-3 py-2.5 text-xs font-black text-white transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUpdating ? "Updating..." : "Set as default"}
                    </button>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="address-form-title"
        >
          <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-purple-600">
                  Wish Jinny Delivery
                </p>
                <h2
                  id="address-form-title"
                  className="mt-1 text-xl font-black text-indigo-950"
                >
                  {editingAddressId ? "Edit address" : "Add new address"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={formLoading}
                aria-label="Close address form"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="p-5 sm:p-6">
              <section>
                <h3 className="text-sm font-black text-slate-900">
                  Contact information
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="address-name"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Full name
                    </label>

                    <input
                      id="address-name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Recipient's full name"
                      disabled={formLoading}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="address-phone"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Mobile number
                    </label>

                    <input
                      id="address-phone"
                      name="phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="10-digit mobile number"
                      disabled={formLoading}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </section>

              <section className="mt-7 border-t border-slate-100 pt-6">
                <h3 className="text-sm font-black text-slate-900">
                  Address type
                </h3>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { id: "home", label: "Home" },
                    { id: "work", label: "Work" },
                    { id: "other", label: "Other" },
                  ].map((type) => (
                    <label
                      key={type.id}
                      className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-3 text-center transition ${
                        formData.type === type.id
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 text-slate-600 hover:border-indigo-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="type"
                        value={type.id}
                        checked={formData.type === type.id}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <AddressTypeIcon type={type.id} />
                      <span className="text-xs font-black">{type.label}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="mt-7 border-t border-slate-100 pt-6">
                <h3 className="text-sm font-black text-slate-900">
                  Delivery address
                </h3>

                <div className="mt-4 space-y-4">
                  <div>
                    <label
                      htmlFor="address-street"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Flat, house number, building and street
                    </label>

                    <textarea
                      id="address-street"
                      name="street"
                      rows={3}
                      value={formData.street}
                      onChange={handleInputChange}
                      placeholder="Flat/house number, building, street and locality"
                      disabled={formLoading}
                      className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="address-landmark"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Landmark <span className="text-slate-400">(optional)</span>
                    </label>

                    <input
                      id="address-landmark"
                      name="landmark"
                      type="text"
                      value={formData.landmark}
                      onChange={handleInputChange}
                      placeholder="Near metro station, school, temple..."
                      disabled={formLoading}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="address-city"
                        className="mb-2 block text-sm font-bold text-slate-700"
                      >
                        City
                      </label>

                      <input
                        id="address-city"
                        name="city"
                        type="text"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="City"
                        disabled={formLoading}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="address-state"
                        className="mb-2 block text-sm font-bold text-slate-700"
                      >
                        State
                      </label>

                      <select
                        id="address-state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        disabled={formLoading}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                      >
                        <option value="">Select state</option>
                        {indianStates.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="address-pincode"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      PIN code
                    </label>

                    <input
                      id="address-pincode"
                      name="pincode"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={formData.pincode}
                      onChange={handleInputChange}
                      placeholder="6-digit PIN code"
                      disabled={formLoading}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </section>

              <section className="mt-7 border-t border-slate-100 pt-6">
                <h3 className="text-sm font-black text-slate-900">
                  Delivery instructions
                </h3>

                <div className="mt-4">
                  <label
                    htmlFor="address-instructions"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Help the delivery partner <span className="text-slate-400">(optional)</span>
                  </label>

                  <textarea
                    id="address-instructions"
                    name="instructions"
                    rows={3}
                    value={formData.instructions}
                    onChange={handleInputChange}
                    placeholder="For example: Call before delivery, leave at reception..."
                    disabled={formLoading}
                    className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                  />
                </div>

                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-indigo-50 p-4">
                  <input
                    name="isDefault"
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={handleInputChange}
                    disabled={formLoading}
                    className="mt-0.5 h-4 w-4 accent-indigo-700"
                  />

                  <span className="text-sm leading-6 text-indigo-900">
                    <span className="block font-black">
                      Make this my default address
                    </span>
                    Use this address automatically during checkout.
                  </span>
                </label>
              </section>

              <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={closeForm}
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
                    ? "Saving address..."
                    : editingAddressId
                    ? "Save changes"
                    : "Save address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && addressToDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-address-title"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <TrashIcon />
            </div>

            <h2
              id="delete-address-title"
              className="mt-5 text-xl font-black text-slate-900"
            >
              Delete this address?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              This will remove the address for {addressToDelete.name}. You can
              add it again later if needed.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={Boolean(actionLoadingId)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Keep address
              </button>

              <button
                type="button"
                onClick={handleDeleteAddress}
                disabled={Boolean(actionLoadingId)}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoadingId ? "Deleting..." : "Delete address"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default UserAddressManager;