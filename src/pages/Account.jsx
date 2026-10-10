// src/pages/Account.jsx
// Wish Jinny - Account, Login, Signup, OTP and Profile Page

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  loginUser,
  signupUser,
  requestOtp,
  verifyOtp,
  logoutUser,
  fetchAccount,
  updateProfile,
  fetchOrders,
} from "../utils/api";

function Account() {
  const navigate = useNavigate();

  const [view, setView] = useState("login");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);

  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const normalizedPhone = useMemo(() => {
    return phone.replace(/[^\d+]/g, "").trim();
  }, [phone]);

  useEffect(() => {
    if (countdown <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setCountdown((previousCount) => previousCount - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    return () => {
      // Kept for future cleanup if timers or abort controllers are added.
    };
  }, []);

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  const createFallbackProfile = () => {
    return {
      name: "",
      email,
      phone: normalizedPhone,
      addresses: [],
    };
  };

  const loadAccountData = async () => {
    setLoadingAccount(true);

    try {
      const [accountResponse, ordersResponse] = await Promise.all([
        fetchAccount(),
        fetchOrders(),
      ]);

      const accountProfile =
        accountResponse?.profile ||
        accountResponse?.user ||
        accountResponse?.data?.profile ||
        accountResponse?.data?.user ||
        createFallbackProfile();

      const orderItems =
        ordersResponse?.items ||
        ordersResponse?.orders ||
        ordersResponse?.data?.items ||
        ordersResponse?.data?.orders ||
        [];

      setProfile({
        ...createFallbackProfile(),
        ...accountProfile,
        addresses: Array.isArray(accountProfile?.addresses)
          ? accountProfile.addresses
          : [],
      });

      setOrders(Array.isArray(orderItems) ? orderItems : []);
    } catch {
      setProfile(createFallbackProfile());
      setOrders([]);
      setNotice(
        "You are logged in, but account details could not be loaded right now."
      );
    } finally {
      setLoadingAccount(false);
    }
  };

  const validateContact = () => {
    if (!email.trim() && !normalizedPhone) {
      setError("Please enter your email address or mobile number.");
      return false;
    }

    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return false;
    }

    if (normalizedPhone && normalizedPhone.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid mobile number.");
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    clearMessages();

    if (!validateContact()) {
      return;
    }

    setLoading(true);

    try {
      const response = await loginUser({
        email: email.trim(),
        phone: normalizedPhone,
      });

      if (response?.success) {
        setView("otp");
        setCountdown(60);
        setNotice("OTP has been sent. Please verify it to continue.");
      } else {
        setError(response?.message || "Login failed. Please try again.");
      }
    } catch {
      setError("Login API error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    clearMessages();

    if (!validateContact()) {
      return;
    }

    setLoading(true);

    try {
      const response = await signupUser({
        email: email.trim(),
        phone: normalizedPhone,
      });

      if (response?.success) {
        setView("otp");
        setCountdown(60);
        setNotice(
          "Your Wish Jinny account has been started. Please verify the OTP."
        );
      } else {
        setError(response?.message || "Signup failed. Please try again.");
      }
    } catch {
      setError("Signup API error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    clearMessages();

    if (!otp.trim()) {
      setError("Please enter the OTP.");
      return;
    }

    setLoading(true);

    try {
      const response = await verifyOtp({
        email: email.trim(),
        phone: normalizedPhone,
        otp: otp.trim(),
      });

      if (!response?.success) {
        setError(
          response?.message || "OTP verification failed. Please try again."
        );
        return;
      }

      setView("account");
      setNotice("Welcome to Wish Jinny!");
      await loadAccountData();
    } catch {
      setError("OTP API error. Please check the OTP and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || loading) {
      return;
    }

    clearMessages();

    if (!validateContact()) {
      return;
    }

    setLoading(true);

    try {
      const response = await requestOtp({
        email: email.trim(),
        phone: normalizedPhone,
      });

      if (response?.success === false) {
        setError(response?.message || "Could not resend OTP.");
        return;
      }

      setCountdown(60);
      setNotice("A new OTP has been sent.");
    } catch {
      setError("Could not resend OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    clearMessages();
    setLoading(true);

    try {
      await logoutUser();
    } catch {
      // Local logout still continues, even if the API is temporarily unavailable.
    } finally {
      setView("login");
      setEmail("");
      setPhone("");
      setOtp("");
      setProfile(null);
      setOrders([]);
      setCountdown(0);
      setLoading(false);
      setNotice("You have been logged out successfully.");
    }
  };

  const handleProfileUpdate = async () => {
    if (!profile) {
      return;
    }

    clearMessages();

    if (!profile.name?.trim()) {
      setError("Please enter your name before saving your profile.");
      return;
    }

    setLoading(true);

    try {
      const response = await updateProfile({
        ...profile,
        name: profile.name.trim(),
      });

      if (response?.success === false) {
        setError(response?.message || "Profile could not be updated.");
        return;
      }

      const updatedProfile =
        response?.profile ||
        response?.user ||
        response?.data?.profile ||
        profile;

      setProfile({
        ...profile,
        ...updatedProfile,
      });

      setNotice("Your profile has been updated successfully.");
    } catch {
      setError("Profile update failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewChange = (nextView) => {
    clearMessages();
    setOtp("");
    setView(nextView);
  };

  const getOrderId = (order, index) => {
    return order?.id || order?._id || order?.order_id || `order-${index}`;
  };

  const getOrderTotal = (order) => {
    const total = Number(
      order?.total ??
        order?.grand_total ??
        order?.total_amount ??
        order?.amount ??
        0
    );

    return Number.isFinite(total)
      ? total.toLocaleString("en-IN", {
          maximumFractionDigits: 0,
        })
      : "0";
  };

  const getAddressText = (address) => {
    if (typeof address === "string") {
      return address;
    }

    if (!address || typeof address !== "object") {
      return "";
    }

    return [
      address.name,
      address.line1 || address.address_line_1 || address.address,
      address.line2 || address.address_line_2,
      address.city,
      address.state,
      address.pincode || address.postal_code,
      address.country,
    ]
      .filter(Boolean)
      .join(", ");
  };

  const SparkleIcon = ({ className = "h-5 w-5" }) => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" />
      <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />
    </svg>
  );

  const ShieldIcon = ({ className = "h-5 w-5" }) => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path d="M12 3 20 7v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Z" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
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
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" strokeLinecap="round" />
    </svg>
  );

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-xl lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-800 to-purple-800 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -left-12 -top-12 h-48 w-48 rounded-full bg-purple-400/20 blur-3xl" />
          <div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-yellow-300/20 blur-3xl" />

          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400 text-indigo-950 shadow-lg">
              <SparkleIcon className="h-7 w-7" />
            </div>

            <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-yellow-300">
              Wish Jinny Account
            </p>

            <h1 className="mt-3 text-4xl font-black leading-tight">
              Your wishes,
              <br />
              all in one place.
            </h1>

            <p className="mt-5 max-w-sm text-base leading-7 text-indigo-100">
              Sign in to track orders, manage your profile, save favourites and
              make your Wish Jinny shopping experience magical.
            </p>
          </div>

          <div className="relative rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-yellow-300">
                <ShieldIcon />
              </span>

              <div>
                <p className="font-bold">Secure OTP sign-in</p>
                <p className="mt-1 text-sm text-indigo-100">
                  Your account is protected with OTP verification.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="p-5 sm:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-md">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-bold text-indigo-700 transition hover:text-purple-700 lg:hidden"
            >
              <SparkleIcon className="h-4 w-4" />
              Wish Jinny
            </Link>

            {view !== "account" && (
              <>
                <div className="mt-6 lg:mt-0">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-purple-600">
                    Welcome to Wish Jinny
                  </p>

                  <h1 className="mt-2 text-3xl font-black text-slate-900">
                    {view === "signup"
                      ? "Create your account"
                      : view === "otp"
                      ? "Verify your OTP"
                      : "Hello again"}
                  </h1>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {view === "signup"
                      ? "Start your magical shopping journey in a few seconds."
                      : view === "otp"
                      ? "Enter the OTP sent to your registered email or mobile number."
                      : "Log in to manage your orders, saved products and profile."}
                  </p>
                </div>

                <div className="mt-7">
                  {(view === "login" || view === "signup") && (
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="account-email"
                          className="mb-2 block text-sm font-bold text-slate-700"
                        >
                          Email address
                        </label>

                        <input
                          id="account-email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          autoComplete="email"
                          disabled={loading}
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="account-phone"
                          className="mb-2 block text-sm font-bold text-slate-700"
                        >
                          Mobile number
                        </label>

                        <input
                          id="account-phone"
                          type="tel"
                          inputMode="tel"
                          placeholder="+91 98765 43210"
                          value={phone}
                          onChange={(event) => setPhone(event.target.value)}
                          autoComplete="tel"
                          disabled={loading}
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                        />
                      </div>

                      <p className="text-xs leading-5 text-slate-500">
                        Enter at least one contact method. An OTP will be sent
                        for secure verification.
                      </p>

                      <button
                        type="button"
                        onClick={
                          view === "signup" ? handleSignup : handleLogin
                        }
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 px-4 py-3 text-sm font-black text-white shadow-lg transition hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <SparkleIcon className="h-4 w-4" />
                        {loading
                          ? "Please wait..."
                          : view === "signup"
                          ? "Create account & get OTP"
                          : "Continue with OTP"}
                      </button>

                      <div className="flex items-center gap-3 py-1">
                        <span className="h-px flex-1 bg-slate-200" />
                        <span className="text-xs font-semibold text-slate-400">
                          OR
                        </span>
                        <span className="h-px flex-1 bg-slate-200" />
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleViewChange(
                            view === "signup" ? "login" : "signup"
                          )
                        }
                        disabled={loading}
                        className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-black text-indigo-700 transition hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:opacity-60"
                      >
                        {view === "signup"
                          ? "Already have an account? Log in"
                          : "New to Wish Jinny? Create an account"}
                      </button>
                    </div>
                  )}

                  {view === "otp" && (
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="account-otp"
                          className="mb-2 block text-sm font-bold text-slate-700"
                        >
                          One-time password
                        </label>

                        <input
                          id="account-otp"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          placeholder="Enter OTP"
                          value={otp}
                          onChange={(event) =>
                            setOtp(event.target.value.replace(/\D/g, ""))
                          }
                          disabled={loading}
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-lg font-black tracking-[0.45em] text-slate-800 outline-none transition placeholder:tracking-normal placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleOtpVerify}
                        disabled={loading || !otp.trim()}
                        className="w-full rounded-xl bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 px-4 py-3 text-sm font-black text-white shadow-lg transition hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? "Verifying..." : "Verify OTP"}
                      </button>

                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={loading || countdown > 0}
                        className="w-full rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm font-black text-amber-800 transition hover:bg-yellow-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {countdown > 0
                          ? `Resend OTP in ${countdown}s`
                          : "Resend OTP"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleViewChange("login")}
                        disabled={loading}
                        className="w-full text-sm font-bold text-slate-500 transition hover:text-indigo-700 disabled:opacity-60"
                      >
                        Change email or mobile number
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {view === "account" && (
              <div>
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-purple-600">
                      My Account
                    </p>

                    <h1 className="mt-2 text-3xl font-black text-slate-900">
                      Hello, {profile?.name?.trim() || "Wish Maker"}!
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                      Manage your profile, saved addresses and order history.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loading}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-black text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100 disabled:opacity-60"
                  >
                    Log out
                  </button>
                </div>

                {loadingAccount ? (
                  <div className="flex min-h-64 items-center justify-center">
                    <div className="text-center">
                      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-700" />
                      <p className="mt-4 text-sm font-bold text-indigo-700">
                        Loading your magical account...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-7 space-y-6">
                    <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-700 text-white">
                          <UserIcon />
                        </span>

                        <div>
                          <h2 className="font-black text-indigo-950">
                            Profile details
                          </h2>
                          <p className="mt-1 text-xs text-indigo-700">
                            Keep your account information up to date.
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 space-y-4">
                        <div>
                          <label
                            htmlFor="profile-name"
                            className="mb-2 block text-sm font-bold text-slate-700"
                          >
                            Full name
                          </label>

                          <input
                            id="profile-name"
                            type="text"
                            value={profile?.name || ""}
                            onChange={(event) =>
                              setProfile((previousProfile) => ({
                                ...(previousProfile || createFallbackProfile()),
                                name: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                          />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-white bg-white px-4 py-3">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                              Email
                            </p>
                            <p className="mt-1 break-all text-sm font-semibold text-slate-700">
                              {profile?.email || email || "Not added"}
                            </p>
                          </div>

                          <div className="rounded-xl border border-white bg-white px-4 py-3">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                              Mobile
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {profile?.phone || normalizedPhone || "Not added"}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleProfileUpdate}
                          disabled={loading}
                          className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {loading ? "Saving..." : "Save profile"}
                        </button>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h2 className="font-black text-slate-900">
                            Saved addresses
                          </h2>
                          <p className="mt-1 text-xs text-slate-500">
                            Your saved delivery locations.
                          </p>
                        </div>

                        <Link
                          to="/addresses"
                          className="text-sm font-black text-indigo-700 transition hover:text-purple-700"
                        >
                          Manage
                        </Link>
                      </div>

                      <div className="mt-4 space-y-3">
                        {Array.isArray(profile?.addresses) &&
                        profile.addresses.length > 0 ? (
                          profile.addresses.map((address, index) => (
                            <div
                              key={address?.id || address?._id || index}
                              className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700"
                            >
                              {getAddressText(address)}
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                            <p className="text-sm font-bold text-slate-600">
                              No saved addresses yet.
                            </p>
                            <Link
                              to="/addresses"
                              className="mt-2 inline-block text-sm font-black text-indigo-700 hover:text-purple-700"
                            >
                              Add an address
                            </Link>
                          </div>
                        )}
                      </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h2 className="font-black text-slate-900">
                            Order history
                          </h2>
                          <p className="mt-1 text-xs text-slate-500">
                            Track and review your Wish Jinny orders.
                          </p>
                        </div>

                        <Link
                          to="/orders"
                          className="text-sm font-black text-indigo-700 transition hover:text-purple-700"
                        >
                          View all
                        </Link>
                      </div>

                      <div className="mt-4 space-y-3">
                        {orders.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                            <p className="text-sm font-bold text-slate-600">
                              No orders yet.
                            </p>

                            <Link
                              to="/shop"
                              className="mt-2 inline-block text-sm font-black text-indigo-700 hover:text-purple-700"
                            >
                              Start shopping
                            </Link>
                          </div>
                        ) : (
                          orders.slice(0, 5).map((order, index) => {
                            const orderId = getOrderId(order, index);
                            const orderStatus =
                              order?.status || order?.order_status || "Placed";

                            return (
                              <article
                                key={orderId}
                                className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div>
                                  <p className="font-black text-slate-800">
                                    Order #{orderId}
                                  </p>
                                  <p className="mt-1 text-xs font-semibold text-slate-500">
                                    Status:{" "}
                                    <span className="text-indigo-700">
                                      {orderStatus}
                                    </span>
                                  </p>
                                  <p className="mt-1 text-sm font-bold text-slate-700">
                                    Total: ₹{getOrderTotal(order)}
                                  </p>
                                </div>

                                <Link
                                  to={`/order/${encodeURIComponent(orderId)}`}
                                  className="shrink-0 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-center text-xs font-black text-indigo-700 transition hover:bg-indigo-50"
                                >
                                  View details
                                </Link>
                              </article>
                            );
                          })
                        )}
                      </div>
                    </section>

                    <section className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => navigate("/wishlist")}
                        className="rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 p-5 text-left text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100"
                      >
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-rose-100">
                          Saved wishes
                        </p>
                        <p className="mt-2 text-lg font-black">My Wishlist</p>
                        <p className="mt-1 text-sm text-rose-100">
                          Revisit products you love.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate("/cart")}
                        className="rounded-2xl bg-gradient-to-br from-indigo-700 to-purple-700 p-5 text-left text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
                      >
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-indigo-100">
                          Ready to checkout
                        </p>
                        <p className="mt-2 text-lg font-black">My Cart</p>
                        <p className="mt-1 text-sm text-indigo-100">
                          Review your selected magical finds.
                        </p>
                      </button>
                    </section>
                  </div>
                )}
              </div>
            )}

            {(error || notice) && (
              <div
                role={error ? "alert" : "status"}
                className={`mt-6 rounded-xl border px-4 py-3 text-sm font-semibold ${
                  error
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {error || notice}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default Account;