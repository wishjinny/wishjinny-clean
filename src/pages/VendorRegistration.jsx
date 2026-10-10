// src/pages/VendorRegistration.jsx
// Wish Jinny - Premium Multi-Vendor Registration & Verification Page

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  registerVendor,
  requestVendorOtp,
  verifyVendorOtp,
  fetchVendorStatus,
} from "../utils/api";

function VendorRegistration() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [businessName, setBusinessName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [businessType, setBusinessType] = useState("individual");
  const [primaryCategory, setPrimaryCategory] = useState("");
  const [website, setWebsite] = useState("");

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");

  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");

  const [documents, setDocuments] = useState([]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [status, setStatus] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sellerSteps = [
    {
      number: 1,
      title: "Verify contact",
      description: "Secure OTP verification",
    },
    {
      number: 2,
      title: "Business details",
      description: "Tell us about your store",
    },
    {
      number: 3,
      title: "Documents & submit",
      description: "Complete marketplace review",
    },
  ];

  const documentTypes = [
    "GST Certificate",
    "PAN Card",
    "Business Registration",
    "Address Proof",
    "Cancelled Cheque",
    "Other Supporting Document",
  ];

  const categoryOptions = [
    "Beauty & Skincare",
    "Fashion",
    "Jewellery",
    "Toys & Kids",
    "Home & Living",
    "Gifting",
    "Wellness",
    "Other",
  ];

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const normalisedPhone = useMemo(() => {
    return phone.replace(/[^\d+]/g, "").trim();
  }, [phone]);

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());
  const validPhone = normalisedPhone.replace(/\D/g, "").length >= 10;

  useEffect(() => {
    if (countdown <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setCountdown((previousCount) => previousCount - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [countdown]);

  const validateContact = () => {
    if (!email.trim() && !normalisedPhone) {
      setError("Please enter your email address or mobile number.");
      return false;
    }

    if (email.trim() && !validEmail) {
      setError("Please enter a valid email address.");
      return false;
    }

    if (normalisedPhone && !validPhone) {
      setError("Please enter a valid 10-digit mobile number.");
      return false;
    }

    return true;
  };

  const handleRequestOtp = async () => {
    clearMessages();

    if (!validateContact()) {
      return;
    }

    setLoading(true);

    try {
      const response = await requestVendorOtp({
        email: email.trim(),
        phone: normalisedPhone,
      });

      if (response?.success === false) {
        setError(response?.message || "OTP could not be sent. Please try again.");
        return;
      }

      setOtpSent(true);
      setOtpVerified(false);
      setCountdown(60);
      setSuccess("OTP sent successfully. Enter it below to verify your contact.");
    } catch {
      setError("OTP service could not be reached. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    clearMessages();

    if (!otp.trim()) {
      setError("Please enter the OTP.");
      return;
    }

    setLoading(true);

    try {
      const response = await verifyVendorOtp({
        email: email.trim(),
        phone: normalisedPhone,
        otp: otp.trim(),
      });

      if (response?.success === false) {
        setError(response?.message || "OTP verification failed.");
        return;
      }

      setOtpVerified(true);
      setStep(2);
      setSuccess("Contact verified successfully. Now complete your business profile.");
    } catch {
      setError("OTP verification service could not be reached. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const validateBusinessDetails = () => {
    if (!businessName.trim()) {
      setError("Please enter your business or store name.");
      return false;
    }

    if (!contactPerson.trim()) {
      setError("Please enter the contact person's name.");
      return false;
    }

    if (!primaryCategory) {
      setError("Please select your primary selling category.");
      return false;
    }

    if (!address.trim() || !city.trim() || !stateName.trim() || !pincode.trim()) {
      setError("Please complete your pickup and business address.");
      return false;
    }

    if (!/^\d{6}$/.test(pincode.trim())) {
      setError("Please enter a valid 6-digit PIN code.");
      return false;
    }

    return true;
  };

  const handleNextToDocuments = () => {
    clearMessages();

    if (!otpVerified) {
      setError("Please verify your contact with OTP before continuing.");
      setStep(1);
      return;
    }

    if (!validateBusinessDetails()) {
      return;
    }

    setStep(3);
  };

  const handleDocumentChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length === 0) {
      return;
    }

    const maxFileSize = 5 * 1024 * 1024;
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    const invalidFile = selectedFiles.find(
      (file) =>
        file.size > maxFileSize ||
        (file.type && !allowedTypes.includes(file.type))
    );

    if (invalidFile) {
      setError(
        "Each document must be a PDF, JPG, PNG or WEBP file and smaller than 5 MB."
      );
      return;
    }

    setDocuments((previousDocuments) => {
      const existingNames = new Set(
        previousDocuments.map((document) => document.file.name)
      );

      const uniqueFiles = selectedFiles.filter(
        (file) => !existingNames.has(file.name)
      );

      return [
        ...previousDocuments,
        ...uniqueFiles.map((file) => ({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          type: "Other Supporting Document",
          file,
        })),
      ].slice(0, 6);
    });

    setError("");
    event.target.value = "";
  };

  const updateDocumentType = (documentId, nextType) => {
    setDocuments((previousDocuments) =>
      previousDocuments.map((document) =>
        document.id === documentId
          ? { ...document, type: nextType }
          : document
      )
    );
  };

  const removeDocument = (documentId) => {
    setDocuments((previousDocuments) =>
      previousDocuments.filter((document) => document.id !== documentId)
    );
  };

  const getFullAddress = () => {
    return [address.trim(), city.trim(), stateName.trim(), pincode.trim()]
      .filter(Boolean)
      .join(", ");
  };

  const handleRegister = async () => {
    clearMessages();

    if (!otpVerified) {
      setError("OTP verification is required before you can submit registration.");
      setStep(1);
      return;
    }

    if (!validateBusinessDetails()) {
      setStep(2);
      return;
    }

    if (!acceptedTerms) {
      setError("Please accept the Seller Terms and Marketplace Policy.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("email", email.trim());
      formData.append("phone", normalisedPhone);
      formData.append("businessName", businessName.trim());
      formData.append("contactPerson", contactPerson.trim());
      formData.append("businessType", businessType);
      formData.append("primaryCategory", primaryCategory);
      formData.append("website", website.trim());
      formData.append("address", getFullAddress());
      formData.append("addressLine", address.trim());
      formData.append("city", city.trim());
      formData.append("state", stateName.trim());
      formData.append("pincode", pincode.trim());
      formData.append("gstin", gstin.trim());
      formData.append("pan", pan.trim());
      formData.append("otpVerified", "true");

      documents.forEach((document, index) => {
        formData.append("documents", document.file);
        formData.append(`documentType_${index}`, document.type);
      });

      const response = await registerVendor(formData);

      if (response?.success === false) {
        setError(
          response?.message ||
            "Your vendor registration could not be submitted. Please try again."
        );
        return;
      }

      const initialStatus =
        response?.status ||
        response?.vendor?.status ||
        response?.data?.status ||
        "Pending Approval";

      setStatus(initialStatus);
      setSuccess(
        "Your registration has been submitted successfully. Wish Jinny Admin will review your store and documents before approving seller access."
      );

      if (email.trim()) {
        try {
          setCheckingStatus(true);
          const statusResponse = await fetchVendorStatus({
            email: email.trim(),
          });

          const fetchedStatus =
            statusResponse?.status ||
            statusResponse?.vendor?.status ||
            statusResponse?.data?.status;

          if (fetchedStatus) {
            setStatus(fetchedStatus);
          }
        } catch {
          // Submission remains successful even if the follow-up status check fails.
        } finally {
          setCheckingStatus(false);
        }
      }
    } catch {
      setError(
        "Registration API could not be reached. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyles = (currentStatus) => {
    const value = String(currentStatus || "").toLowerCase();

    if (value.includes("approved") || value.includes("active")) {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (value.includes("reject") || value.includes("suspend")) {
      return "border-rose-200 bg-rose-50 text-rose-700";
    }

    return "border-amber-200 bg-amber-50 text-amber-800";
  };

  const LampIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      fill="none"
      className="h-8 w-8"
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

  const ShieldIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-6 w-6"
    >
      <path d="M12 3 20 7v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Z" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const StoreIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-6 w-6"
    >
      <path d="M3 10h18v10H3z" />
      <path d="m4 10 1.5-6h13L20 10" strokeLinejoin="round" />
      <path d="M8 20v-6h8v6" />
    </svg>
  );

  const DocumentIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-6 w-6"
    >
      <path d="M6 3h8l4 4v14H6z" strokeLinejoin="round" />
      <path d="M14 3v5h5M9 13h6M9 17h6" strokeLinecap="round" />
    </svg>
  );

  const UploadIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-6 w-6"
    >
      <path d="M12 16V4" strokeLinecap="round" />
      <path d="m7 9 5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20h14" strokeLinecap="round" />
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
      <div className="mx-auto grid w-full max-w-7xl overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-xl lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-800 to-purple-800 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -left-14 -top-12 h-52 w-52 rounded-full bg-purple-400/20 blur-3xl" />
          <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-yellow-300/20 blur-3xl" />

          <div className="relative">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400 text-indigo-950 shadow-lg">
              <LampIcon />
            </span>

            <p className="mt-9 text-xs font-black uppercase tracking-[0.18em] text-yellow-300">
              Sell with Wish Jinny
            </p>

            <h1 className="mt-3 text-4xl font-black leading-tight">
              Turn your store
              <br />
              into a magical marketplace.
            </h1>

            <p className="mt-5 max-w-sm text-base leading-7 text-indigo-100">
              Join a premium multi-vendor marketplace built to help trusted
              sellers showcase, manage and grow their product collections.
            </p>
          </div>

          <div className="relative space-y-4">
            {[
              {
                icon: <StoreIcon />,
                title: "Easy product management",
                text: "Upload products, manage stock and update pricing from one dashboard.",
              },
              {
                icon: <ShieldIcon />,
                title: "Trusted marketplace review",
                text: "Every seller and listing is reviewed to protect customers and brands.",
              },
              {
                icon: <DocumentIcon />,
                title: "Clear approval journey",
                text: "Track your onboarding status before you start selling.",
              },
            ].map((benefit) => (
              <div
                key={benefit.title}
                className="flex gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-yellow-300">
                  {benefit.icon}
                </span>

                <div>
                  <p className="font-black">{benefit.title}</p>
                  <p className="mt-1 text-xs leading-5 text-indigo-100">
                    {benefit.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="p-5 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-2xl">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-black text-indigo-700 transition hover:text-purple-700 lg:hidden"
            >
              <span className="text-yellow-500">
                <LampIcon />
              </span>
              Wish Jinny
            </Link>

            <div className="mt-6 lg:mt-0">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-purple-600">
                Partner Onboarding
              </p>

              <h2 className="mt-2 text-3xl font-black text-slate-900">
                Become a Wish Jinny Seller
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Complete the steps below. Your application will be reviewed by
                the Wish Jinny team before seller access is activated.
              </p>
            </div>

            <div className="mt-7 grid grid-cols-3 gap-2">
              {sellerSteps.map((sellerStep) => {
                const isCurrent = step === sellerStep.number;
                const isComplete = step > sellerStep.number;

                return (
                  <div key={sellerStep.number} className="relative">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-black ${
                        isComplete
                          ? "bg-emerald-600 text-white"
                          : isCurrent
                          ? "bg-indigo-700 text-white"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isComplete ? "✓" : sellerStep.number}
                    </div>

                    <p
                      className={`mt-2 text-xs font-black ${
                        isCurrent || isComplete
                          ? "text-indigo-700"
                          : "text-slate-400"
                      }`}
                    >
                      {sellerStep.title}
                    </p>

                    <p className="mt-1 hidden text-[10px] leading-4 text-slate-400 sm:block">
                      {sellerStep.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {(error || success) && (
              <div
                role={error ? "alert" : "status"}
                className={`mt-6 rounded-xl border px-4 py-3 text-sm font-semibold ${
                  error
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {error || success}
              </div>
            )}

            {status && (
              <div
                className={`mt-5 rounded-xl border p-4 ${getStatusStyles(
                  status
                )}`}
              >
                <p className="text-xs font-black uppercase tracking-[0.12em]">
                  Seller application status
                </p>

                <p className="mt-1 text-lg font-black">{status}</p>

                <p className="mt-1 text-xs leading-5">
                  {checkingStatus
                    ? "Checking latest status..."
                    : "Admin approval is required before products can be published."}
                </p>
              </div>
            )}

            {step === 1 && (
              <section className="mt-7">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                    <ShieldIcon />
                  </span>

                  <div>
                    <h3 className="font-black text-slate-900">
                      Verify your contact details
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      We use OTP verification to secure your seller application.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="vendor-email"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Email address
                    </label>

                    <input
                      id="vendor-email"
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setOtpVerified(false);
                      }}
                      placeholder="seller@example.com"
                      autoComplete="email"
                      disabled={loading || otpVerified}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="vendor-phone"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Mobile number
                    </label>

                    <input
                      id="vendor-phone"
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(event) => {
                        setPhone(event.target.value);
                        setOtpVerified(false);
                      }}
                      placeholder="+91 98765 43210"
                      autoComplete="tel"
                      disabled={loading || otpVerified}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                {!otpSent ? (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={loading}
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Sending OTP..." : "Send OTP"}
                    <ArrowIcon />
                  </button>
                ) : (
                  <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:p-5">
                    <label
                      htmlFor="vendor-otp"
                      className="mb-2 block text-sm font-black text-indigo-950"
                    >
                      Enter OTP
                    </label>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        id="vendor-otp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={otp}
                        onChange={(event) =>
                          setOtp(event.target.value.replace(/\D/g, ""))
                        }
                        placeholder="6-digit OTP"
                        disabled={loading || otpVerified}
                        className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-lg font-black tracking-[0.35em] text-slate-800 outline-none placeholder:tracking-normal placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                      />

                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={loading || otpVerified || !otp.trim()}
                        className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {otpVerified
                          ? "Verified"
                          : loading
                          ? "Verifying..."
                          : "Verify OTP"}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      disabled={loading || countdown > 0 || otpVerified}
                      className="mt-3 text-sm font-black text-indigo-700 transition hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {countdown > 0
                        ? `Resend OTP in ${countdown}s`
                        : "Resend OTP"}
                    </button>
                  </div>
                )}
              </section>
            )}

            {step === 2 && (
              <section className="mt-7">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                    <StoreIcon />
                  </span>

                  <div>
                    <h3 className="font-black text-slate-900">
                      Tell us about your business
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      These details help us verify and set up your seller store.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="business-name"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Business / store name
                    </label>

                    <input
                      id="business-name"
                      type="text"
                      value={businessName}
                      onChange={(event) => setBusinessName(event.target.value)}
                      placeholder="Your store name"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-person"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Contact person
                    </label>

                    <input
                      id="contact-person"
                      type="text"
                      value={contactPerson}
                      onChange={(event) => setContactPerson(event.target.value)}
                      placeholder="Full name"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="business-type"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Business type
                    </label>

                    <select
                      id="business-type"
                      value={businessType}
                      onChange={(event) => setBusinessType(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    >
                      <option value="individual">Individual seller</option>
                      <option value="proprietorship">Proprietorship</option>
                      <option value="partnership">Partnership</option>
                      <option value="company">Private / public company</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="primary-category"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Primary category
                    </label>

                    <select
                      id="primary-category"
                      value={primaryCategory}
                      onChange={(event) =>
                        setPrimaryCategory(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    >
                      <option value="">Choose a category</option>
                      {categoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="seller-website"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Website or social shop link <span className="text-slate-400">(optional)</span>
                    </label>

                    <input
                      id="seller-website"
                      type="url"
                      value={website}
                      onChange={(event) => setWebsite(event.target.value)}
                      placeholder="https://yourstore.example"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-6">
                  <p className="text-sm font-black text-slate-900">
                    Pickup and business address
                  </p>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="business-address"
                        className="mb-2 block text-sm font-bold text-slate-700"
                      >
                        Address line
                      </label>

                      <textarea
                        id="business-address"
                        rows={3}
                        value={address}
                        onChange={(event) => setAddress(event.target.value)}
                        placeholder="Shop/office number, street, locality"
                        className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="vendor-city"
                        className="mb-2 block text-sm font-bold text-slate-700"
                      >
                        City
                      </label>

                      <input
                        id="vendor-city"
                        type="text"
                        value={city}
                        onChange={(event) => setCity(event.target.value)}
                        placeholder="City"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="vendor-state"
                        className="mb-2 block text-sm font-bold text-slate-700"
                      >
                        State
                      </label>

                      <input
                        id="vendor-state"
                        type="text"
                        value={stateName}
                        onChange={(event) => setStateName(event.target.value)}
                        placeholder="State"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="vendor-pincode"
                        className="mb-2 block text-sm font-bold text-slate-700"
                      >
                        PIN code
                      </label>

                      <input
                        id="vendor-pincode"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={pincode}
                        onChange={(event) =>
                          setPincode(event.target.value.replace(/\D/g, ""))
                        }
                        placeholder="6-digit PIN code"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleNextToDocuments}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
                  >
                    Continue
                    <ArrowIcon />
                  </button>
                </div>
              </section>
            )}

            {step === 3 && (
              <section className="mt-7">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-100 text-amber-700">
                    <DocumentIcon />
                  </span>

                  <div>
                    <h3 className="font-black text-slate-900">
                      Documents and final submission
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Upload documents for verification, review your details and
                      submit your seller application.
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/60 p-5 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-indigo-700 shadow-sm">
                    <UploadIcon />
                  </span>

                  <p className="mt-3 font-black text-indigo-950">
                    Upload verification documents
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    PDF, JPG, PNG or WEBP · Up to 5 MB each · Maximum 6 files
                  </p>

                  <label
                    htmlFor="vendor-documents"
                    className="mt-4 inline-flex cursor-pointer rounded-xl bg-indigo-700 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-800 focus-within:ring-4 focus-within:ring-indigo-100"
                  >
                    Choose documents
                  </label>

                  <input
                    id="vendor-documents"
                    type="file"
                    multiple
                    accept=".pdf,image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleDocumentChange}
                    className="sr-only"
                  />
                </div>

                {documents.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {documents.map((document) => (
                      <div
                        key={document.id}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-800">
                            {document.file.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {(document.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>

                        <select
                          value={document.type}
                          onChange={(event) =>
                            updateDocumentType(document.id, event.target.value)
                          }
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                        >
                          {documentTypes.map((documentType) => (
                            <option key={documentType} value={documentType}>
                              {documentType}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => removeDocument(document.id)}
                          className="rounded-lg px-3 py-2 text-xs font-black text-rose-600 transition hover:bg-rose-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="vendor-gstin"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      GSTIN <span className="text-slate-400">(optional)</span>
                    </label>

                    <input
                      id="vendor-gstin"
                      type="text"
                      value={gstin}
                      onChange={(event) =>
                        setGstin(event.target.value.toUpperCase())
                      }
                      placeholder="GST number"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold uppercase text-slate-800 outline-none placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="vendor-pan"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      PAN <span className="text-slate-400">(optional)</span>
                    </label>

                    <input
                      id="vendor-pan"
                      type="text"
                      value={pan}
                      onChange={(event) =>
                        setPan(event.target.value.toUpperCase())
                      }
                      placeholder="PAN number"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold uppercase text-slate-800 outline-none placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) =>
                      setAcceptedTerms(event.target.checked)
                    }
                    className="mt-1 h-4 w-4 accent-indigo-700"
                  />

                  <span className="text-sm leading-6 text-slate-600">
                    I agree to the{" "}
                    <Link
                      to="/seller-terms"
                      className="font-black text-indigo-700 hover:text-purple-700"
                    >
                      Wish Jinny Seller Terms
                    </Link>{" "}
                    and Marketplace Policy. I understand that submitting this
                    application does not automatically permit selling; seller
                    access activates only after Wish Jinny Admin approval.
                  </span>
                </label>

                <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                  <p className="text-sm font-black text-amber-900">
                    What happens after submission?
                  </p>

                  <ol className="mt-2 space-y-1 text-xs leading-5 text-amber-800">
                    <li>1. Jinny records your seller application securely.</li>
                    <li>2. The Wish Jinny team reviews business details and documents.</li>
                    <li>3. You receive approval, rejection or requested changes.</li>
                    <li>4. Approved sellers can access the product upload dashboard.</li>
                  </ol>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={loading}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleRegister}
                    disabled={loading || !acceptedTerms}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Submitting application..." : "Submit seller application"}
                    <ArrowIcon />
                  </button>
                </div>
              </section>
            )}

            {status && (
              <div className="mt-7 text-center">
                <button
                  type="button"
                  onClick={() => navigate("/account")}
                  className="text-sm font-black text-indigo-700 transition hover:text-purple-700"
                >
                  Go to My Account →
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default VendorRegistration;