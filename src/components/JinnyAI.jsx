import React, { useEffect, useMemo, useRef, useState } from "react";

function JinnyAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState("customer");
  const [language, setLanguage] = useState("en");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "welcome-message",
      sender: "jinny",
      text: "Hello! I am Jinny, your Wish Jinny magical assistant. How can I help you today? I can suggest products, offers, categories, cart help, delivery guidance, and more.",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [muted, setMuted] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [notification, setNotification] = useState("");

  const [vendors, setVendors] = useState([
    {
      id: "VND-1001",
      name: "Glow & Grace Store",
      owner: "Aisha Khan",
      category: "Beauty & Skincare",
      email: "hello@glowandgrace.example",
      status: "Pending",
      products: 14,
      joined: "2026-10-01",
    },
    {
      id: "VND-1002",
      name: "Golden Aura Jewels",
      owner: "Meera Shah",
      category: "Jewellery",
      email: "support@goldenaura.example",
      status: "Active",
      products: 32,
      joined: "2026-09-17",
    },
    {
      id: "VND-1003",
      name: "Tiny Stars World",
      owner: "Rohan Mehta",
      category: "Toys & Kids",
      email: "team@tinystars.example",
      status: "Pending",
      products: 9,
      joined: "2026-10-02",
    },
    {
      id: "VND-1004",
      name: "Urban Wish Fashion",
      owner: "Kavya Patel",
      category: "Fashion",
      email: "care@urbanwish.example",
      status: "Suspended",
      products: 21,
      joined: "2026-08-29",
    },
  ]);

  const [products, setProducts] = useState([
    {
      id: "PRD-5001",
      name: "Radiance Glow Skincare Kit",
      vendor: "Glow & Grace Store",
      category: "Beauty & Skincare",
      price: 1299,
      status: "Pending",
      submitted: "2026-10-02",
    },
    {
      id: "PRD-5002",
      name: "Golden Aura Jewellery Set",
      vendor: "Golden Aura Jewels",
      category: "Jewellery",
      price: 2499,
      status: "Approved",
      submitted: "2026-09-27",
    },
    {
      id: "PRD-5003",
      name: "Magic Learning Toy Box",
      vendor: "Tiny Stars World",
      category: "Toys & Kids",
      price: 999,
      status: "Pending",
      submitted: "2026-10-03",
    },
    {
      id: "PRD-5004",
      name: "Everyday Chic Handbag",
      vendor: "Urban Wish Fashion",
      category: "Fashion",
      price: 1899,
      status: "Rejected",
      submitted: "2026-09-30",
    },
  ]);

  const [activityLog, setActivityLog] = useState([
    {
      id: "activity-welcome",
      text: "Jinny AI control center is ready.",
      time: "Just now",
      type: "info",
    },
  ]);

  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const labels = {
    en: {
      customer: "Shop Assistant",
      admin: "Vendor Control",
      hello:
        "Hello! I am Jinny, your Wish Jinny magical assistant. How can I help you today? I can suggest products, offers, categories, cart help, delivery guidance, and more.",
      customerPlaceholder: "Ask about products, offers, orders or your wish...",
      adminPlaceholder: "Ask Jinny about vendors, products or approvals...",
      send: "Send",
      thinking: "Jinny is thinking...",
      listening: "Listening... Jinny is listening.",
      suggestions: "Quick wishes",
      adminSuggestions: "Admin commands",
      customerTitle: "Shopping Magic",
      adminTitle: "Vendor & Product Control",
      openAssistant: "Open Jinny AI assistant",
      closeAssistant: "Close Jinny AI assistant",
    },
    hi: {
      customer: "Shopping Assistant",
      admin: "Vendor Control",
      hello:
        "Hello! Main Jinny hoon, Wish Jinny ki magical assistant. Main aapki kis prakaar sahayata kar sakti hoon? Main aapko products, offers, categories, cart aur delivery ke baare mein help kar sakti hoon.",
      customerPlaceholder:
        "Product, offer, order ya apni wish ke baare mein poochiye...",
      adminPlaceholder:
        "Vendor, product approval ya account ke baare mein poochiye...",
      send: "Bhejein",
      thinking: "Jinny soch rahi hai...",
      listening: "Listening... Jinny sun rahi hai.",
      suggestions: "Quick wishes",
      adminSuggestions: "Admin commands",
      customerTitle: "Shopping Magic",
      adminTitle: "Vendor & Product Control",
      openAssistant: "Jinny AI assistant kholiye",
      closeAssistant: "Jinny AI assistant band kijiye",
    },
  };

  const text = labels[language];

  const vendorSummary = useMemo(() => {
    return {
      total: vendors.length,
      pending: vendors.filter((vendor) => vendor.status === "Pending").length,
      active: vendors.filter((vendor) => vendor.status === "Active").length,
      suspended: vendors.filter((vendor) => vendor.status === "Suspended")
        .length,
    };
  }, [vendors]);

  const productSummary = useMemo(() => {
    return {
      total: products.length,
      pending: products.filter((product) => product.status === "Pending")
        .length,
      approved: products.filter((product) => product.status === "Approved")
        .length,
      rejected: products.filter((product) => product.status === "Rejected")
        .length,
    };
  }, [products]);

  const pendingVendors = useMemo(
    () => vendors.filter((vendor) => vendor.status === "Pending"),
    [vendors]
  );

  const pendingProducts = useMemo(
    () => products.filter((product) => product.status === "Pending"),
    [products]
  );

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return undefined;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language === "hi" ? "hi-IN" : "en-IN";

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setInput(transcript);
      setListening(false);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    setVoiceSupported(true);

    return () => {
      recognition.abort();
    };
  }, [language]);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 120);
    }
  }, [isOpen, mode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isTyping]);

  useEffect(() => {
    const handleKeyboardShortcut = (event) => {
      if (event.key === "Escape" && isOpen) {
        closeAssistant();
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcut);

    return () => {
      window.removeEventListener("keydown", handleKeyboardShortcut);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();

      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const createMessage = (sender, messageText) => ({
    id: `${sender}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sender,
    text: messageText,
  });

  const addActivity = (activityText, type = "info") => {
    setActivityLog((previousActivities) => [
      {
        id: `activity-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        text: activityText,
        time: "Just now",
        type,
      },
      ...previousActivities.slice(0, 5),
    ]);
  };

  const showNotification = (message) => {
    setNotification(message);

    window.setTimeout(() => {
      setNotification("");
    }, 3200);
  };

  const speakResponse = (responseText) => {
    if (muted || !window.speechSynthesis) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(responseText);
    utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
    utterance.rate = 1;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  };

  const getCustomerReply = (question) => {
    const query = question.toLowerCase();

    const isHindi =
      language === "hi" ||
      /[\u0900-\u097f]/.test(question) ||
      query.includes("mujhe") ||
      query.includes("dikhao") ||
      query.includes("kya") ||
      query.includes("hai");

    if (
      query.includes("offer") ||
      query.includes("discount") ||
      query.includes("sale") ||
      query.includes("deal")
    ) {
      return isHindi
        ? "Wish Jinny ke magical offers Shop page par milenge. Aap Offers section explore karke beauty, fashion, jewellery aur gifting products par special savings dekh sakte hain."
        : "You can find magical savings in the Offers section of the Shop page. Explore special deals across beauty, fashion, jewellery, gifting and more.";
    }

    if (
      query.includes("beauty") ||
      query.includes("skin") ||
      query.includes("face wash") ||
      query.includes("makeup") ||
      query.includes("skincare")
    ) {
      return isHindi
        ? "Beauty & Skincare mein face wash, glow kits, makeup aur daily care essentials explore kijiye. Main ₹500 ke andar products, skincare kits ya specific beauty category suggestions bhi de sakti hoon."
        : "Explore Beauty & Skincare for face wash, glow kits, makeup and everyday care essentials. I can also suggest products under a budget or help you choose a specific beauty category.";
    }

    if (
      query.includes("jewellery") ||
      query.includes("jewelry") ||
      query.includes("ring") ||
      query.includes("necklace") ||
      query.includes("earring")
    ) {
      return isHindi
        ? "Jewellery collection mein festive sets, elegant accessories aur gifting-worthy designs milenge. Categories se Jewellery choose karke apni favourite shine find kijiye."
        : "The Jewellery collection has festive sets, elegant accessories and gifting-worthy designs. Choose Jewellery from Categories to discover your favourite sparkle.";
    }

    if (
      query.includes("fashion") ||
      query.includes("bag") ||
      query.includes("dress") ||
      query.includes("style") ||
      query.includes("handbag")
    ) {
      return isHindi
        ? "Fashion section mein stylish everyday finds aur special occasion picks available hain. Aap budget, colour ya product type batayein, main aapko direction de sakti hoon."
        : "The Fashion section includes stylish everyday finds and special-occasion picks. Tell me your budget, colour or product type and I can guide you.";
    }

    if (
      query.includes("toy") ||
      query.includes("kids") ||
      query.includes("kid") ||
      query.includes("baby")
    ) {
      return isHindi
        ? "Toys & Kids section mein fun, learning aur gifting-friendly products milenge. Aap age group ya budget batayein to main better suggestion de sakti hoon."
        : "The Toys & Kids section includes fun, learning and gifting-friendly products. Tell me the age group or budget for a better suggestion.";
    }

    if (
      query.includes("cart") ||
      query.includes("checkout") ||
      query.includes("payment")
    ) {
      return isHindi
        ? "Cart help ke liye product ke View Details page par jaakar item choose kijiye, phir Cart open karke order details review kijiye. Checkout setup final launch flow mein available hoga."
        : "For cart help, choose an item from its View Details page, then open Cart to review your order. The final checkout flow will be available in the launch setup.";
    }

    if (
      query.includes("order") ||
      query.includes("track") ||
      query.includes("delivery") ||
      query.includes("shipping")
    ) {
      return isHindi
        ? "Order aur delivery updates ke liye Track Order ya My Account section use kijiye. Shipping information ke liye footer mein Shipping & Returns bhi check kar sakte hain."
        : "For order and delivery updates, use Track Order or My Account. You can also check Shipping & Returns in the footer for shipping information.";
    }

    if (
      query.includes("return") ||
      query.includes("refund") ||
      query.includes("replace")
    ) {
      return isHindi
        ? "Return aur refund information ke liye footer mein Shipping & Returns page check kijiye. Final policy details website launch ke saath available hongi."
        : "For return and refund information, check Shipping & Returns in the footer. Final policy details will be available with the website launch.";
    }

    if (
      query.includes("hello") ||
      query.includes("hi") ||
      query.includes("help") ||
      query.includes("hello jinny")
    ) {
      return isHindi
        ? "Hello! Main Jinny hoon. Main aapki kis prakaar sahayata kar sakti hoon? Main aapko achhe products, offers, categories, cart aur delivery information ke baare mein guide kar sakti hoon."
        : "Hello! I am Jinny. How can I help you? I can guide you to great products, offers, categories, cart support and delivery information.";
    }

    return isHindi
      ? "Main aapki shopping wish ko easy bana sakti hoon. Aap beauty, fashion, jewellery, toys, offers, cart, order ya delivery ke baare mein pooch sakte hain."
      : "I can make your shopping wish easier. Ask me about beauty, fashion, jewellery, toys, offers, cart support, orders or delivery.";
  };

  const getAdminReply = (question) => {
    const query = question.toLowerCase();
    const isHindi =
      language === "hi" ||
      /[\u0900-\u097f]/.test(question) ||
      query.includes("vendor") ||
      query.includes("approve");

    if (
      query.includes("vendor") &&
      (query.includes("count") ||
        query.includes("kitne") ||
        query.includes("total"))
    ) {
      return isHindi
        ? `Abhi total ${vendorSummary.total} vendors hain: ${vendorSummary.active} active, ${vendorSummary.pending} pending aur ${vendorSummary.suspended} suspended.`
        : `There are currently ${vendorSummary.total} vendors: ${vendorSummary.active} active, ${vendorSummary.pending} pending, and ${vendorSummary.suspended} suspended.`;
    }

    if (
      query.includes("pending vendor") ||
      query.includes("vendor approval") ||
      query.includes("approve vendor")
    ) {
      return isHindi
        ? `Vendor approval queue mein ${vendorSummary.pending} pending vendor account${vendorSummary.pending === 1 ? "" : "s"} hain. Neeche queue se review karke Approve ya Reject action use kijiye.`
        : `There are ${vendorSummary.pending} pending vendor account${vendorSummary.pending === 1 ? "" : "s"} in the approval queue. Review them below and use Approve or Reject.`;
    }

    if (
      query.includes("product") &&
      (query.includes("pending") ||
        query.includes("approve") ||
        query.includes("approval"))
    ) {
      return isHindi
        ? `Product moderation queue mein ${productSummary.pending} pending product${productSummary.pending === 1 ? "" : "s"} hain. Aap unhe review karke Approve ya Reject kar sakte hain.`
        : `There are ${productSummary.pending} pending product${productSummary.pending === 1 ? "" : "s"} in the moderation queue. You can review and approve or reject them.`;
    }

    if (
      query.includes("suspend") ||
      query.includes("activate") ||
      query.includes("account")
    ) {
      return isHindi
        ? "Vendor account controls queue mein available hain. Active vendor ko suspend aur suspended vendor ko activate kiya ja sakta hai. Real account actions ko production mein secure admin permissions aur backend approval logging ke saath connect karna chahiye."
        : "Vendor account controls are available in the queue. Active vendors can be suspended and suspended vendors can be activated. In production, real account actions must be connected to secure admin permissions and backend audit logging.";
    }

    return isHindi
      ? `Hello Admin! Main vendor aur product control mein help kar sakti hoon. Current status: ${vendorSummary.pending} pending vendors aur ${productSummary.pending} pending products. Aap “pending vendors”, “approve products” ya “vendor count” pooch sakte hain.`
      : `Hello Admin! I can help with vendor and product control. Current status: ${vendorSummary.pending} pending vendors and ${productSummary.pending} pending products. Ask about “pending vendors”, “approve products”, or “vendor count”.`;
  };

  const getBackendReply = async (question) => {
    try {
      const response = await fetch("/jinny-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: question,
          mode,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error("Jinny AI service unavailable");
      }

      const data = await response.json();

      if (typeof data?.answer === "string" && data.answer.trim()) {
        return data.answer.trim();
      }

      throw new Error("Invalid Jinny AI response");
    } catch {
      return mode === "admin"
        ? getAdminReply(question)
        : getCustomerReply(question);
    }
  };

  const sendMessage = async () => {
    const question = input.trim();

    if (!question || isTyping) {
      return;
    }

    const userMessage = createMessage("user", question);

    setMessages((previousMessages) => [...previousMessages, userMessage]);
    setInput("");
    setIsTyping(true);

    const response = await getBackendReply(question);
    const jinnyMessage = createMessage("jinny", response);

    setMessages((previousMessages) => [...previousMessages, jinnyMessage]);
    setIsTyping(false);
    speakResponse(response);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  const switchLanguage = () => {
    const nextLanguage = language === "en" ? "hi" : "en";
    setLanguage(nextLanguage);

    const greeting =
      nextLanguage === "hi"
        ? labels.hi.hello
        : labels.en.hello;

    setMessages((previousMessages) => [
      ...previousMessages,
      createMessage("jinny", greeting),
    ]);
  };

  const switchMode = (nextMode) => {
    if (mode === nextMode) {
      return;
    }

    setMode(nextMode);

    const modeMessage =
      nextMode === "admin"
        ? language === "hi"
          ? `Hello Admin! Vendor Control active hai. ${vendorSummary.pending} vendor approvals aur ${productSummary.pending} product approvals pending hain.`
          : `Hello Admin! Vendor Control is active. There are ${vendorSummary.pending} vendor approvals and ${productSummary.pending} product approvals pending.`
        : language === "hi"
          ? "Hello! Shopping Magic active hai. Main aapki kis prakaar sahayata kar sakti hoon?"
          : "Hello! Shopping Magic is active. How can I help you today?";

    setMessages((previousMessages) => [
      ...previousMessages,
      createMessage("jinny", modeMessage),
    ]);
  };

  const startListening = () => {
    if (!recognitionRef.current || listening || isTyping) {
      return;
    }

    try {
      recognitionRef.current.lang = language === "hi" ? "hi-IN" : "en-IN";
      setListening(true);
      recognitionRef.current.start();
    } catch {
      setListening(false);
    }
  };

  const toggleMute = () => {
    setMuted((previousMuted) => {
      const nextMuted = !previousMuted;

      if (nextMuted && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      return nextMuted;
    });
  };

  const closeAssistant = () => {
    setIsOpen(false);
    setListening(false);
    recognitionRef.current?.abort();

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const runVendorAction = (vendorId, action) => {
    const vendor = vendors.find((item) => item.id === vendorId);

    if (!vendor) {
      return;
    }

    const actionToStatus = {
      approve: "Active",
      reject: "Rejected",
      suspend: "Suspended",
      activate: "Active",
    };

    const nextStatus = actionToStatus[action];

    setVendors((previousVendors) =>
      previousVendors.map((item) =>
        item.id === vendorId ? { ...item, status: nextStatus } : item
      )
    );

    const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);
    const message = `${vendor.name} has been ${action === "approve" ? "approved" : action === "activate" ? "activated" : `${action}ed`}.`;

    addActivity(`${actionLabel}: ${vendor.name}`, action === "reject" || action === "suspend" ? "warning" : "success");
    showNotification(message);

    setMessages((previousMessages) => [
      ...previousMessages,
      createMessage(
        "jinny",
        language === "hi"
          ? `${vendor.name} ka vendor account ${nextStatus} kar diya gaya hai.`
          : `${vendor.name}'s vendor account has been set to ${nextStatus}.`
      ),
    ]);
  };

  const runProductAction = (productId, action) => {
    const product = products.find((item) => item.id === productId);

    if (!product) {
      return;
    }

    const nextStatus = action === "approve" ? "Approved" : "Rejected";

    setProducts((previousProducts) =>
      previousProducts.map((item) =>
        item.id === productId ? { ...item, status: nextStatus } : item
      )
    );

    addActivity(
      `${action === "approve" ? "Approved" : "Rejected"} product: ${product.name}`,
      action === "approve" ? "success" : "warning"
    );

    showNotification(
      `${product.name} has been ${
        action === "approve" ? "approved" : "rejected"
      }.`
    );

    setMessages((previousMessages) => [
      ...previousMessages,
      createMessage(
        "jinny",
        language === "hi"
          ? `${product.name} product ko ${nextStatus} kar diya gaya hai.`
          : `${product.name} has been ${nextStatus}.`
      ),
    ]);
  };

  const handleQuickQuestion = (question) => {
    setInput(question);
    inputRef.current?.focus();
  };

  const statusClass = (status) => {
    const statusStyles = {
      Pending: "bg-amber-100 text-amber-700",
      Active: "bg-emerald-100 text-emerald-700",
      Suspended: "bg-rose-100 text-rose-700",
      Rejected: "bg-slate-200 text-slate-700",
      Approved: "bg-emerald-100 text-emerald-700",
    };

    return statusStyles[status] || "bg-slate-100 text-slate-700";
  };

  const LampIcon = ({ className = "h-6 w-6" }) => (
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

  const CloseIcon = ({ className = "h-5 w-5" }) => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={className}
    >
      <path d="m6 6 12 12" strokeLinecap="round" />
      <path d="m18 6-12 12" strokeLinecap="round" />
    </svg>
  );

  const MicrophoneIcon = ({ className = "h-5 w-5" }) => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <rect x="8" y="3" width="8" height="12" rx="4" />
      <path d="M5 11a7 7 0 0 0 14 0" strokeLinecap="round" />
      <path d="M12 18v3" strokeLinecap="round" />
      <path d="M8.5 21h7" strokeLinecap="round" />
    </svg>
  );

  const VolumeOnIcon = ({ className = "h-5 w-5" }) => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path d="M4 10v4h4l5 4V6l-5 4H4Z" strokeLinejoin="round" />
      <path d="M16 9a4 4 0 0 1 0 6" strokeLinecap="round" />
      <path d="M18.5 6.5a7.5 7.5 0 0 1 0 11" strokeLinecap="round" />
    </svg>
  );

  const VolumeOffIcon = ({ className = "h-5 w-5" }) => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path d="M4 10v4h4l5 4V6l-5 4H4Z" strokeLinejoin="round" />
      <path d="m16 9 5 5" strokeLinecap="round" />
      <path d="m21 9-5 5" strokeLinecap="round" />
    </svg>
  );

  const SendIcon = ({ className = "h-5 w-5" }) => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path d="m21 3-7.5 18-3.7-7.8L2 9l19-6Z" strokeLinejoin="round" />
      <path d="M9.8 13.2 21 3" strokeLinecap="round" />
    </svg>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((previousOpen) => !previousOpen)}
        aria-label={
          isOpen ? text.closeAssistant : text.openAssistant
        }
        aria-expanded={isOpen}
        aria-controls="jinny-ai-control-center"
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 text-indigo-950 shadow-xl transition duration-300 hover:-translate-y-1 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-300/60 sm:bottom-6 sm:right-6"
      >
        <LampIcon className="h-7 w-7" />
        <span className="absolute -right-1 -top-1 flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
          <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-purple-600" />
        </span>
      </button>

      {isOpen && (
        <section
          id="jinny-ai-control-center"
          aria-label="Jinny AI assistant and vendor control center"
          className="fixed bottom-24 right-3 z-50 flex h-[min(43rem,calc(100vh-7.5rem))] w-[calc(100vw-1.5rem)] max-w-5xl flex-col overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-2xl sm:bottom-24 sm:right-6"
        >
          <header className="relative overflow-hidden bg-gradient-to-r from-indigo-950 via-indigo-800 to-purple-800 px-5 py-4 text-white">
            <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-yellow-300/20 blur-2xl" />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400 text-indigo-950 shadow-lg">
                  <LampIcon className="h-6 w-6" />
                </span>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-yellow-300">
                    Wish Jinny Magic
                  </p>
                  <h2 className="mt-1 text-lg font-black">
                    Jinny AI Control Center
                  </h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={switchLanguage}
                  className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
                >
                  {language === "en" ? "हिंदी" : "English"}
                </button>

                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={muted ? "Turn Jinny voice on" : "Mute Jinny voice"}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
                >
                  {muted ? <VolumeOffIcon /> : <VolumeOnIcon />}
                </button>

                <button
                  type="button"
                  onClick={closeAssistant}
                  aria-label={text.closeAssistant}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>
          </header>

          <div className="border-b border-indigo-100 bg-white px-4 py-3">
            <div className="grid grid-cols-2 rounded-xl bg-indigo-50 p-1">
              <button
                type="button"
                onClick={() => switchMode("customer")}
                className={`rounded-lg px-3 py-2.5 text-sm font-black transition ${
                  mode === "customer"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-indigo-700"
                }`}
              >
                {text.customer}
              </button>

              <button
                type="button"
                onClick={() => switchMode("admin")}
                className={`rounded-lg px-3 py-2.5 text-sm font-black transition ${
                  mode === "admin"
                    ? "bg-white text-purple-700 shadow-sm"
                    : "text-slate-500 hover:text-purple-700"
                }`}
              >
                {text.admin}
              </button>
            </div>
          </div>

          {mode === "customer" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto bg-gradient-to-b from-indigo-50/60 via-white to-purple-50/50 px-4 py-4">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                          message.sender === "user"
                            ? "rounded-br-md bg-indigo-700 text-white"
                            : "rounded-bl-md border border-yellow-200 bg-yellow-50 text-indigo-950"
                        }`}
                      >
                        {message.text}
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl rounded-bl-md border border-purple-100 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-500" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-purple-500 [animation-delay:150ms]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-yellow-500 [animation-delay:300ms]" />
                          <span className="ml-1 text-xs font-semibold text-slate-500">
                            {text.thinking}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="border-t border-indigo-100 bg-white px-4 py-3">
                <div className="mb-3">
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-purple-600">
                    {text.suggestions}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {[
                      language === "hi"
                        ? "₹500 ke andar beauty products"
                        : "Beauty products under ₹500",
                      language === "hi"
                        ? "Latest jewellery dikhao"
                        : "Show latest jewellery",
                      language === "hi"
                        ? "Best offers kya hain?"
                        : "What are the best offers?",
                      language === "hi" ? "Cart help" : "Cart help",
                    ].map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => handleQuickQuestion(question)}
                        className="rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:border-yellow-300 hover:bg-yellow-100"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="flex items-end gap-2">
                  <label htmlFor="jinny-customer-input" className="sr-only">
                    Ask Jinny a shopping question
                  </label>

                  <input
                    ref={inputRef}
                    id="jinny-customer-input"
                    type="text"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={text.customerPlaceholder}
                    disabled={isTyping}
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                  />

                  {voiceSupported && (
                    <button
                      type="button"
                      onClick={startListening}
                      disabled={listening || isTyping}
                      aria-label={
                        listening ? "Listening for voice input" : "Use voice input"
                      }
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                        listening
                          ? "bg-rose-500 text-white"
                          : "bg-slate-100 text-indigo-700 hover:bg-indigo-100"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <MicrophoneIcon />
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    aria-label={text.send}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 text-white transition hover:from-indigo-800 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <SendIcon />
                  </button>
                </form>

                {listening && (
                  <p className="mt-2 text-xs font-semibold text-rose-600">
                    {text.listening}
                  </p>
                )}

                {!voiceSupported && (
                  <p className="mt-2 text-xs text-slate-500">
                    Voice input is not supported in this browser.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="space-y-4">
                  <section className="rounded-2xl bg-gradient-to-br from-indigo-950 via-indigo-800 to-purple-800 p-5 text-white shadow-lg">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-yellow-300">
                          {text.adminTitle}
                        </p>
                        <h3 className="mt-2 text-xl font-black">
                          Jinny keeps the marketplace magical and trusted.
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-indigo-100">
                          Review new vendors, approve product listings and
                          monitor account status from one smart workspace.
                        </p>
                      </div>

                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-indigo-950">
                        <LampIcon className="h-6 w-6" />
                      </span>
                    </div>
                  </section>

                  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Vendors
                      </p>
                      <p className="mt-2 text-2xl font-black text-slate-900">
                        {vendorSummary.total}
                      </p>
                      <p className="mt-1 text-xs font-bold text-emerald-600">
                        {vendorSummary.active} active
                      </p>
                    </article>

                    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Vendor Queue
                      </p>
                      <p className="mt-2 text-2xl font-black text-amber-600">
                        {vendorSummary.pending}
                      </p>
                      <p className="mt-1 text-xs font-bold text-amber-600">
                        Awaiting review
                      </p>
                    </article>

                    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Products
                      </p>
                      <p className="mt-2 text-2xl font-black text-slate-900">
                        {productSummary.total}
                      </p>
                      <p className="mt-1 text-xs font-bold text-emerald-600">
                        {productSummary.approved} approved
                      </p>
                    </article>

                    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Product Queue
                      </p>
                      <p className="mt-2 text-2xl font-black text-amber-600">
                        {productSummary.pending}
                      </p>
                      <p className="mt-1 text-xs font-bold text-amber-600">
                        Awaiting approval
                      </p>
                    </article>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <p className="text-sm font-black text-indigo-700">
                          Vendor Approval Queue
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Review new partner accounts before marketplace access.
                        </p>
                      </div>

                      <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-700">
                        {pendingVendors.length} pending
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {pendingVendors.length > 0 ? (
                        pendingVendors.map((vendor) => (
                          <article
                            key={vendor.id}
                            className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="truncate font-black text-slate-800">
                                    {vendor.name}
                                  </h4>
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusClass(
                                      vendor.status
                                    )}`}
                                  >
                                    {vendor.status}
                                  </span>
                                </div>

                                <p className="mt-1 text-sm font-semibold text-slate-600">
                                  {vendor.owner} · {vendor.category}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {vendor.products} products · {vendor.email}
                                </p>
                              </div>

                              <div className="flex shrink-0 gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    runVendorAction(vendor.id, "approve")
                                  }
                                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-700"
                                >
                                  Approve
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    runVendorAction(vendor.id, "reject")
                                  }
                                  className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-50"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50 p-5 text-center">
                          <p className="text-sm font-black text-emerald-800">
                            All vendor wishes are reviewed.
                          </p>
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <p className="text-sm font-black text-purple-700">
                          Product Moderation Queue
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Approve trusted listings before customers see them.
                        </p>
                      </div>

                      <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-700">
                        {pendingProducts.length} pending
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {pendingProducts.length > 0 ? (
                        pendingProducts.map((product) => (
                          <article
                            key={product.id}
                            className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="truncate font-black text-slate-800">
                                    {product.name}
                                  </h4>
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusClass(
                                      product.status
                                    )}`}
                                  >
                                    {product.status}
                                  </span>
                                </div>

                                <p className="mt-1 text-sm font-semibold text-slate-600">
                                  {product.vendor} · {product.category}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  ₹{product.price.toLocaleString("en-IN")} ·
                                  Submitted {product.submitted}
                                </p>
                              </div>

                              <div className="flex shrink-0 gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    runProductAction(product.id, "approve")
                                  }
                                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-700"
                                >
                                  Approve
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    runProductAction(product.id, "reject")
                                  }
                                  className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-50"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50 p-5 text-center">
                          <p className="text-sm font-black text-emerald-800">
                            All product wishes are reviewed.
                          </p>
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm font-black text-rose-700">
                      Vendor Account Controls
                    </p>

                    <div className="mt-4 space-y-3">
                      {vendors
                        .filter(
                          (vendor) =>
                            vendor.status === "Active" ||
                            vendor.status === "Suspended"
                        )
                        .map((vendor) => (
                          <div
                            key={vendor.id}
                            className="flex flex-col gap-3 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="font-black text-slate-800">
                                {vendor.name}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {vendor.id} · {vendor.category}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(
                                  vendor.status
                                )}`}
                              >
                                {vendor.status}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  runVendorAction(
                                    vendor.id,
                                    vendor.status === "Active"
                                      ? "suspend"
                                      : "activate"
                                  )
                                }
                                className={`rounded-lg px-3 py-2 text-xs font-black transition ${
                                  vendor.status === "Active"
                                    ? "border border-rose-200 text-rose-700 hover:bg-rose-50"
                                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                                }`}
                              >
                                {vendor.status === "Active"
                                  ? "Suspend"
                                  : "Activate"}
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </section>
                </div>

                <aside className="space-y-4">
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-purple-600">
                      {text.adminSuggestions}
                    </p>

                    <div className="mt-3 flex flex-col gap-2">
                      {[
                        "Show pending vendors",
                        "How many vendors are active?",
                        "Show pending products",
                        "What can Jinny manage?",
                      ].map((command) => (
                        <button
                          key={command}
                          type="button"
                          onClick={() => {
                            setInput(command);
                            setMode("customer");
                            window.setTimeout(() => {
                              inputRef.current?.focus();
                            }, 50);
                          }}
                          className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2.5 text-left text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
                        >
                          {command}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-indigo-600">
                      Jinny Activity
                    </p>

                    <div className="mt-4 space-y-3">
                      {activityLog.map((activity) => (
                        <div
                          key={activity.id}
                          className="border-l-2 border-indigo-200 pl-3"
                        >
                          <p className="text-xs font-bold leading-5 text-slate-700">
                            {activity.text}
                          </p>
                          <p className="mt-1 text-[10px] font-semibold text-slate-400">
                            {activity.time}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-100 p-4">
                    <div className="flex items-center gap-2 text-amber-700">
                      <LampIcon className="h-5 w-5" />
                      <p className="text-xs font-black uppercase tracking-[0.12em]">
                        Security Note
                      </p>
                    </div>

                    <p className="mt-3 text-xs leading-5 text-amber-950">
                      This interface currently demonstrates approval workflows
                      locally. Connect real vendor and product actions only
                      after admin authentication, backend authorization and
                      audit logs are ready.
                    </p>
                  </section>
                </aside>
              </div>
            </div>
          )}

          {mode === "admin" && (
            <div className="border-t border-indigo-100 bg-white px-4 py-3">
              <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <label htmlFor="jinny-admin-input" className="sr-only">
                  Ask Jinny about vendor or product management
                </label>

                <input
                  ref={inputRef}
                  id="jinny-admin-input"
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={text.adminPlaceholder}
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                {voiceSupported && (
                  <button
                    type="button"
                    onClick={startListening}
                    disabled={listening}
                    aria-label="Use voice input"
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                      listening
                        ? "bg-rose-500 text-white"
                        : "bg-slate-100 text-indigo-700 hover:bg-indigo-100"
                    }`}
                  >
                    <MicrophoneIcon />
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  aria-label={text.send}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 text-white transition hover:from-indigo-800 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <SendIcon />
                </button>
              </form>
            </div>
          )}
        </section>
      )}

      {notification && (
        <div
          role="status"
          className="fixed bottom-24 left-4 z-[60] max-w-sm rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-700 shadow-xl sm:left-6"
        >
          {notification}
        </div>
      )}
    </>
  );
}

export default JinnyAI;