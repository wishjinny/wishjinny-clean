// src/utils/api.js
// Wish Jinny - Central Marketplace API Client
// Browser-safe client. Never put private keys, payment secrets, DB credentials,
// or admin-only secrets in this file.

const API_BASE_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_URL) ||
  (typeof process !== "undefined" &&
    process.env &&
    (process.env.REACT_APP_API_URL || process.env.API_URL)) ||
  "http://localhost:5000/api";

const TOKEN_KEY = "wish_jinny_access_token";
const USER_KEY = "wish_jinny_user";
const MOCK_MODE_KEY = "wish_jinny_mock_mode";

const getStoredValue = (key) => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(key) || "";
};

const setStoredValue = (key, value) => {
  if (typeof window === "undefined") {
    return;
  }

  if (value === null || value === undefined || value === "") {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, String(value));
};

const getAuthToken = () => getStoredValue(TOKEN_KEY);

const setAuthToken = (token) => {
  setStoredValue(TOKEN_KEY, token);
};

const setStoredUser = (user) => {
  if (typeof window === "undefined") {
    return;
  }

  if (!user) {
    window.localStorage.removeItem(USER_KEY);
    return;
  }

  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
};

const getStoredUser = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedUser = window.localStorage.getItem(USER_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

const useMockFallback = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return getStoredValue(MOCK_MODE_KEY) === "true";
};

export const setMockMode = (enabled) => {
  setStoredValue(MOCK_MODE_KEY, enabled ? "true" : "");
};

const createQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      value !== "all"
    ) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : "";
};

const isFormData = (value) =>
  typeof FormData !== "undefined" && value instanceof FormData;

const normaliseResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  let data;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = text ? { message: text } : {};
  }

  if (!response.ok) {
    const error = new Error(
      data?.message ||
        data?.error ||
        `Request failed with status ${response.status}`
    );

    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
};

const request = async (
  path,
  {
    method = "GET",
    body,
    params,
    headers = {},
    auth = true,
    signal,
  } = {}
) => {
  const token = getAuthToken();
  const requestHeaders = {
    Accept: "application/json",
    ...headers,
  };

  if (auth && token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const requestOptions = {
    method,
    headers: requestHeaders,
    signal,
    credentials: "include",
  };

  if (body !== undefined && body !== null) {
    if (isFormData(body)) {
      requestOptions.body = body;
    } else {
      requestHeaders["Content-Type"] = "application/json";
      requestOptions.body = JSON.stringify(body);
    }
  }

  const response = await fetch(
    `${API_BASE_URL}${path}${createQueryString(params)}`,
    requestOptions
  );

  return normaliseResponse(response);
};

const getList = (response, keys = []) => {
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

const toNumber = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const getCartStorageKey = () => {
  const user = getStoredUser();
  const userId = user?.id || user?._id || user?.email || "guest";
  return `wish_jinny_cart_${userId}`;
};

const getWishlistStorageKey = () => {
  const user = getStoredUser();
  const userId = user?.id || user?._id || user?.email || "guest";
  return `wish_jinny_wishlist_${userId}`;
};

const getAddressStorageKey = () => {
  const user = getStoredUser();
  const userId = user?.id || user?._id || user?.email || "guest";
  return `wish_jinny_addresses_${userId}`;
};

const getReviewStorageKey = () => {
  const user = getStoredUser();
  const userId = user?.id || user?._id || user?.email || "guest";
  return `wish_jinny_reviews_${userId}`;
};

const readLocalArray = (key) => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
};

const writeLocalArray = (key, value) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

const createId = (prefix = "WJ") =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const getProductId = (product) =>
  product?.product_id ||
  product?.productId ||
  product?.product?.id ||
  product?.product?._id ||
  product?.id ||
  product?._id ||
  product?.slug ||
  "";

const getProductPrice = (product) =>
  toNumber(
    product?.discount_price ??
      product?.sale_price ??
      product?.selling_price ??
      product?.offer_price ??
      product?.price ??
      product?.product?.discount_price ??
      product?.product?.sale_price ??
      product?.product?.price ??
      0
  );

const getItemQuantity = (item) =>
  Math.max(
    1,
    Math.floor(toNumber(item?.quantity ?? item?.qty ?? item?.count ?? 1))
  );

const createCartSummary = (items) => {
  const safeItems = Array.isArray(items) ? items : [];

  const subtotal = safeItems.reduce(
    (total, item) => total + getProductPrice(item) * getItemQuantity(item),
    0
  );

  const shipping = safeItems.length > 0 && subtotal < 999 ? 50 : 0;

  return {
    items: safeItems,
    subtotal,
    discount: 0,
    shipping,
    total: subtotal + shipping,
  };
};

const sampleProducts = [
  {
    id: "WJ-BEAUTY-101",
    name: "Radiance Glow Skincare Kit",
    category: "Beauty & Skincare",
    price: 1499,
    discount_price: 999,
    original_price: 1499,
    rating: 4.7,
    review_count: 128,
    stock: 18,
    is_bestseller: true,
    image_url: "",
    description:
      "A curated everyday skincare kit for a fresh, radiant-looking routine.",
    vendor: {
      name: "Aisha Khan",
      store_name: "Glow & Grace Store",
    },
    specifications: [
      "Suitable for everyday skincare",
      "Curated beauty essentials",
      "Gift-ready packaging",
    ],
    delivery_info: "Standard delivery available in 3-7 business days.",
  },
  {
    id: "WJ-JEWEL-202",
    name: "Golden Aura Jewellery Set",
    category: "Jewellery",
    price: 2999,
    discount_price: 2499,
    original_price: 2999,
    rating: 4.8,
    review_count: 86,
    stock: 9,
    is_new: true,
    image_url: "",
    description:
      "An elegant jewellery set made for festive moments and thoughtful gifting.",
    vendor: {
      name: "Meera Shah",
      store_name: "Golden Aura Jewels",
    },
    specifications: [
      "Elegant festive design",
      "Gift-ready set",
      "Lightweight statement style",
    ],
    delivery_info: "Carefully packed delivery available across India.",
  },
  {
    id: "WJ-FASHION-303",
    name: "Everyday Chic Handbag",
    category: "Fashion",
    price: 2199,
    discount_price: 1699,
    original_price: 2199,
    rating: 4.4,
    review_count: 54,
    stock: 12,
    image_url: "",
    description:
      "A versatile handbag designed for everyday errands, work and special plans.",
    vendor: {
      name: "Kavya Patel",
      store_name: "Urban Wish Fashion",
    },
    specifications: [
      "Spacious everyday design",
      "Easy-carry silhouette",
      "Fashion accessory essential",
    ],
    delivery_info: "Delivery estimate is shown during checkout.",
  },
  {
    id: "WJ-KIDS-404",
    name: "Magic Learning Toy Box",
    category: "Toys & Kids",
    price: 1299,
    discount_price: 899,
    original_price: 1299,
    rating: 4.6,
    review_count: 73,
    stock: 25,
    is_bestseller: true,
    image_url: "",
    description:
      "A playful learning box with activities designed for creative young minds.",
    vendor: {
      name: "Rohan Mehta",
      store_name: "Tiny Stars World",
    },
    specifications: [
      "Learning and play activities",
      "Gift-friendly toy box",
      "Suitable for supervised play",
    ],
    delivery_info: "Packed safely for delivery.",
  },
  {
    id: "WJ-HOME-505",
    name: "Moonlight Aroma Gift Set",
    category: "Home & Living",
    price: 1199,
    discount_price: 799,
    original_price: 1199,
    rating: 4.5,
    review_count: 41,
    stock: 7,
    image_url: "",
    description:
      "A calming aroma-inspired gift set to make any corner feel more magical.",
    vendor: {
      name: "Neha Kapoor",
      store_name: "Calm Corners",
    },
    specifications: [
      "Gift set presentation",
      "Home fragrance-inspired",
      "Ideal for celebrations",
    ],
    delivery_info: "Delivery available in eligible service areas.",
  },
  {
    id: "WJ-GIFT-606",
    name: "Personalised Celebration Hamper",
    category: "Gifting",
    price: 1999,
    discount_price: 1499,
    original_price: 1999,
    rating: 4.9,
    review_count: 96,
    stock: 6,
    image_url: "",
    description:
      "A delightful celebration hamper for birthdays, milestones and magical surprises.",
    vendor: {
      name: "Ira Malhotra",
      store_name: "Gifted Wishes",
    },
    specifications: [
      "Thoughtful gifting collection",
      "Celebration-ready presentation",
      "Curated surprise items",
    ],
    delivery_info: "Order early for special occasion delivery.",
  },
];

const sampleCategories = [
  {
    id: "beauty-skincare",
    name: "Beauty & Skincare",
    description: "Glow, care and everyday beauty essentials.",
    subcategories: ["Face Wash", "Skincare Kits", "Makeup", "Hair Care"],
    image_url: "",
  },
  {
    id: "fashion",
    name: "Fashion",
    description: "Everyday style and statement-making finds.",
    subcategories: ["Bags", "Clothing", "Footwear", "Accessories"],
    image_url: "",
  },
  {
    id: "jewellery",
    name: "Jewellery",
    description: "Elegant shine for every special moment.",
    subcategories: ["Necklaces", "Earrings", "Rings", "Bracelets"],
    image_url: "",
  },
  {
    id: "toys-kids",
    name: "Toys & Kids",
    description: "Fun, learning and gifting-friendly products.",
    subcategories: ["Learning Toys", "Games", "Baby Care", "Gifts"],
    image_url: "",
  },
  {
    id: "home-living",
    name: "Home & Living",
    description: "Warm details for a magical space.",
    subcategories: ["Decor", "Kitchen", "Storage", "Lighting"],
    image_url: "",
  },
  {
    id: "gifting",
    name: "Gifting",
    description: "Thoughtful surprises for people you love.",
    subcategories: ["Birthday Gifts", "Festive Gifts", "Personalised", "Gift Sets"],
    image_url: "",
  },
];

const requestWithFallback = async (requestCallback, fallbackCallback) => {
  if (useMockFallback()) {
    return fallbackCallback();
  }

  try {
    return await requestCallback();
  } catch (error) {
    if (
      error?.status === 401 ||
      error?.status === 403 ||
      error?.status === 422
    ) {
      throw error;
    }

    return fallbackCallback(error);
  }
};

// ==================== AUTH & ACCOUNT ====================

export async function loginUser({ email = "", phone = "" } = {}) {
  return requestWithFallback(
    () => request("/auth/login", { method: "POST", body: { email, phone }, auth: false }),
    () => ({
      success: true,
      message: "OTP sent successfully.",
      mock: true,
    })
  );
}

export async function signupUser({ email = "", phone = "" } = {}) {
  return requestWithFallback(
    () => request("/auth/signup", { method: "POST", body: { email, phone }, auth: false }),
    () => ({
      success: true,
      message: "Signup OTP sent successfully.",
      mock: true,
    })
  );
}

export async function requestOtp({ email = "", phone = "" } = {}) {
  return requestWithFallback(
    () => request("/auth/otp/request", { method: "POST", body: { email, phone }, auth: false }),
    () => ({ success: true, message: "OTP sent successfully.", mock: true })
  );
}

export async function verifyOtp({ email = "", phone = "", otp = "" } = {}) {
  return requestWithFallback(
    async () => {
      const response = await request("/auth/otp/verify", {
        method: "POST",
        body: { email, phone, otp },
        auth: false,
      });

      const token =
        response?.token ||
        response?.accessToken ||
        response?.access_token ||
        response?.data?.token ||
        response?.data?.accessToken ||
        "";

      const user =
        response?.user ||
        response?.profile ||
        response?.data?.user ||
        response?.data?.profile ||
        null;

      if (token) {
        setAuthToken(token);
      }

      if (user) {
        setStoredUser(user);
      }

      return response;
    },
    () => {
      const user = {
        id: email || phone || "wish-maker",
        name: "",
        email,
        phone,
        role: "customer",
      };

      setStoredUser(user);

      return {
        success: true,
        user,
        profile: user,
        mock: true,
      };
    }
  );
}

export async function logoutUser() {
  try {
    await request("/auth/logout", { method: "POST" });
  } catch {
    // Local logout must still proceed when the API is unavailable.
  }

  setAuthToken("");
  setStoredUser(null);

  return { success: true };
}

export async function fetchAccount() {
  return requestWithFallback(
    () => request("/account"),
    () => {
      const user = getStoredUser() || {};

      return {
        success: true,
        profile: {
          name: user?.name || "",
          email: user?.email || "",
          phone: user?.phone || "",
          addresses: readLocalArray(getAddressStorageKey()),
        },
        mock: true,
      };
    }
  );
}

export async function updateProfile(profile = {}) {
  return requestWithFallback(
    async () => {
      const response = await request("/account/profile", {
        method: "PUT",
        body: profile,
      });

      const updatedUser =
        response?.profile ||
        response?.user ||
        response?.data?.profile ||
        response?.data?.user ||
        profile;

      setStoredUser({
        ...(getStoredUser() || {}),
        ...updatedUser,
      });

      return response;
    },
    () => {
      const updatedUser = {
        ...(getStoredUser() || {}),
        ...profile,
      };

      setStoredUser(updatedUser);

      return {
        success: true,
        profile: updatedUser,
        mock: true,
      };
    }
  );
}

// ==================== PRODUCT & CATEGORY ====================

export async function fetchProducts(options = {}) {
  const {
    page = 1,
    search = "",
    status = "all",
    type = "",
    id = "",
    category = "",
    subcategory = "",
    vendor = "",
    offer = "",
    discount = "",
  } = options;

  if (useMockFallback() || options.type === "featured" || options.type === "new" || options.type === "all") {
    return productFallback(options);
  }

  try {
    if (id) {
      return await request(`/products/${encodeURIComponent(id)}`, {
        params: { page, search, status },
        auth: false,
      });
    }

    const response = await request("/products", {
      params: {
        page,
        search,
        status,
        type,
        category,
        subcategory,
        vendor,
        offer,
        discount,
      },
      auth: false,
    });

    return response;
  } catch (error) {
    return productFallback(options, error);
  }
}

const productFallback = (options = {}) => {
  const {
    type = "",
    id = "",
    category = "",
    search = "",
    offer = "",
    discount = "",
  } = options;

  if (type === "categories") {
    return sampleCategories;
  }

  if (type === "cart") {
    return createCartSummary(readLocalArray(getCartStorageKey()));
  }

  if (type === "checkout") {
    return createCartSummary(readLocalArray(getCartStorageKey()));
  }

  if (type === "wishlist") {
    return { items: readLocalArray(getWishlistStorageKey()) };
  }

  if (id) {
    const foundProduct =
      sampleProducts.find(
        (product) => String(product.id) === String(id)
      ) || null;

    if (!foundProduct) {
      return null;
    }

    return {
      ...foundProduct,
      media: foundProduct.image_url ? [{ url: foundProduct.image_url }] : [],
      reviews: readLocalArray(getReviewStorageKey()).filter(
        (review) => String(review.productId) === String(foundProduct.id)
      ),
    };
  }

  let products = [...sampleProducts];

  if (category) {
    products = products.filter((product) =>
      String(product.category).toLowerCase().includes(String(category).toLowerCase())
    );
  }

  if (search) {
    const normalizedSearch = String(search).toLowerCase();

    products = products.filter((product) =>
      `${product.name} ${product.category}`.toLowerCase().includes(normalizedSearch)
    );
  }

  if (offer === "true" || discount) {
    products = products.filter(
      (product) => toNumber(product.original_price) > toNumber(product.discount_price)
    );
  }

  if (type === "featured") {
    products = products.filter(
      (product) => product.is_bestseller || product.rating >= 4.7
    );
  }

  if (type === "new") {
    products = products.filter(
      (product) => product.is_new || product.id === "WJ-FASHION-303"
    );
  }

  return { items: products };
};

export async function createProduct(data) {
  return requestWithFallback(
    () => request("/products", { method: "POST", body: data }),
    () => ({ success: true, product: { id: createId("PRD"), ...data }, mock: true })
  );
}

export async function updateProduct({ id, updates } = {}) {
  return requestWithFallback(
    () => request(`/products/${encodeURIComponent(id)}`, { method: "PUT", body: updates }),
    () => ({ success: true, product: { id, ...updates }, mock: true })
  );
}

export async function deleteProduct({ id } = {}) {
  return requestWithFallback(
    () => request(`/products/${encodeURIComponent(id)}`, { method: "DELETE" }),
    () => ({ success: true, id, mock: true })
  );
}

export async function fetchCategories() {
  return requestWithFallback(
    () => request("/categories", { auth: false }),
    () => ({ items: sampleCategories, mock: true })
  );
}

// ==================== CART & CHECKOUT ====================

export async function updateCart({
  productId = "",
  quantity = 1,
  action = "",
} = {}) {
  return requestWithFallback(
    () =>
      request("/cart", {
        method: "PATCH",
        body: { productId, quantity, action },
      }),
    () => {
      const cartKey = getCartStorageKey();
      const currentCart = readLocalArray(cartKey);
      const existingIndex = currentCart.findIndex(
        (item) => String(getProductId(item)) === String(productId)
      );

      if (action === "remove") {
        const nextCart = currentCart.filter(
          (item) => String(getProductId(item)) !== String(productId)
        );

        writeLocalArray(cartKey, nextCart);

        return {
          success: true,
          ...createCartSummary(nextCart),
          mock: true,
        };
      }

      const safeQuantity = Math.max(1, Math.floor(toNumber(quantity)));

      if (existingIndex >= 0) {
        currentCart[existingIndex] = {
          ...currentCart[existingIndex],
          quantity: safeQuantity,
        };
      } else {
        const product =
          sampleProducts.find(
            (sampleProduct) =>
              String(sampleProduct.id) === String(productId)
          ) || {
            id: productId,
            name: "Wish Jinny Product",
            price: 0,
          };

        currentCart.push({
          ...product,
          product_id: productId,
          quantity: safeQuantity,
        });
      }

      writeLocalArray(cartKey, currentCart);

      return {
        success: true,
        ...createCartSummary(currentCart),
        mock: true,
      };
    }
  );
}

export async function applyCoupon({ code = "", subtotal = 0 } = {}) {
  return requestWithFallback(
    () => request("/cart/coupon", { method: "POST", body: { code, subtotal } }),
    () => {
      const normalizedCode = String(code).trim().toUpperCase();
      const safeSubtotal = toNumber(subtotal);

      const couponMap = {
        WISH100: 100,
        WISH150: 150,
        MAGIC10: Math.round(safeSubtotal * 0.1),
        SAVE50: 50,
      };

      const discount = Math.min(couponMap[normalizedCode] || 0, safeSubtotal);

      if (discount <= 0) {
        return {
          success: false,
          message: "Coupon is invalid or not applicable.",
          discount: 0,
          mock: true,
        };
      }

      return {
        success: true,
        discount,
        message: `${normalizedCode} applied successfully.`,
        mock: true,
      };
    }
  );
}

export async function placeOrder(payload = {}) {
  return requestWithFallback(
    () => request("/orders", { method: "POST", body: payload }),
    () => {
      const cartKey = getCartStorageKey();
      const cartItems = readLocalArray(cartKey);
      const summary = createCartSummary(cartItems);
      const orderId = createId("ORD");

      writeLocalArray(cartKey, []);

      return {
        success: true,
        message: "Order placed successfully.",
        order: {
          id: orderId,
          status: "Placed",
          items: cartItems,
          ...summary,
          address: payload.address || "",
          paymentMethod: payload.paymentMethod || "cod",
          paymentStatus:
            payload.paymentMethod === "cod" ? "Pending" : "Initiated",
          created_at: new Date().toISOString(),
        },
        mock: true,
      };
    }
  );
}

// ==================== WISHLIST ====================

export async function fetchWishlistItems() {
  return requestWithFallback(
    () => request("/wishlist"),
    () => ({ items: readLocalArray(getWishlistStorageKey()), mock: true })
  );
}

export async function updateWishlist({
  action = "add",
  productId = "",
} = {}) {
  return requestWithFallback(
    () => request("/wishlist", { method: "PATCH", body: { action, productId } }),
    () => {
      const wishlistKey = getWishlistStorageKey();
      const currentWishlist = readLocalArray(wishlistKey);

      if (action === "remove") {
        const nextWishlist = currentWishlist.filter(
          (item) => String(getProductId(item)) !== String(productId)
        );

        writeLocalArray(wishlistKey, nextWishlist);

        return { success: true, items: nextWishlist, mock: true };
      }

      const alreadyExists = currentWishlist.some(
        (item) => String(getProductId(item)) === String(productId)
      );

      if (!alreadyExists) {
        const product =
          sampleProducts.find(
            (sampleProduct) =>
              String(sampleProduct.id) === String(productId)
          ) || { id: productId, name: "Wish Jinny Product", price: 0 };

        currentWishlist.push(product);
        writeLocalArray(wishlistKey, currentWishlist);
      }

      return { success: true, items: currentWishlist, mock: true };
    }
  );
}

export async function addToWishlist(productId) {
  return updateWishlist({ action: "add", productId });
}

export async function removeFromWishlist(wishlistItemId) {
  return requestWithFallback(
    () =>
      request(`/wishlist/${encodeURIComponent(wishlistItemId)}`, {
        method: "DELETE",
      }),
    () => updateWishlist({ action: "remove", productId: wishlistItemId })
  );
}

export async function moveToCart({ productId = "", quantity = 1 } = {}) {
  return requestWithFallback(
    () =>
      request("/wishlist/move-to-cart", {
        method: "POST",
        body: { productId, quantity },
      }),
    async () => {
      const cartResponse = await updateCart({ productId, quantity });
      await updateWishlist({ action: "remove", productId });

      return {
        ...cartResponse,
        success: true,
        message: "Item moved to cart.",
        mock: true,
      };
    }
  );
}

export async function moveWishlistToCart(payload = {}) {
  const {
    wishlistItemId = "",
    productId = wishlistItemId,
    quantity = 1,
  } = typeof payload === "string"
    ? { wishlistItemId: payload, productId: payload, quantity: 1 }
    : payload;

  return requestWithFallback(
    () =>
      request("/wishlist/move-to-cart", {
        method: "POST",
        body: { wishlistItemId, productId, quantity },
      }),
    async () => {
      const cartResponse = await updateCart({ productId, quantity });
      await removeFromWishlist(wishlistItemId);

      return {
        ...cartResponse,
        success: true,
        message: "Item moved to cart.",
        mock: true,
      };
    }
  );
}

export async function clearWishlist() {
  return requestWithFallback(
    () => request("/wishlist", { method: "DELETE" }),
    () => {
      writeLocalArray(getWishlistStorageKey(), []);
      return { success: true, mock: true };
    }
  );
}

export async function shareWishlist() {
  return requestWithFallback(
    () => request("/wishlist/share", { method: "POST" }),
    () => {
      const shareLink =
        typeof window !== "undefined"
          ? `${window.location.origin}/wishlist/shared/demo`
          : "https://wishjinny.example/wishlist/shared/demo";

      return { success: true, shareLink, mock: true };
    }
  );
}

// ==================== ORDERS ====================

export async function fetchOrders(options = {}) {
  const { page = 1, status = "all", scope = "" } = options;

  return requestWithFallback(
    () => request("/orders", { params: { page, status, scope } }),
    () => ({ items: [], mock: true })
  );
}

export async function fetchRecentOrders() {
  return requestWithFallback(
    () => request("/orders/recent"),
    () => ({ items: [], mock: true })
  );
}

export async function fetchOrder({ orderId = "" } = {}) {
  return requestWithFallback(
    () => request(`/orders/${encodeURIComponent(orderId)}`),
    () => ({
      success: false,
      message: "Order not found in demo mode.",
      mock: true,
    })
  );
}

export async function updateOrderStatus({ id = "", orderId = "", status = "" } = {}) {
  const resolvedOrderId = orderId || id;

  return requestWithFallback(
    () =>
      request(`/orders/${encodeURIComponent(resolvedOrderId)}/status`, {
        method: "PATCH",
        body: { status },
      }),
    () => ({
      success: true,
      order: {
        id: resolvedOrderId,
        status,
      },
      mock: true,
    })
  );
}

export async function cancelOrder({ orderId = "" } = {}) {
  return requestWithFallback(
    () =>
      request(`/orders/${encodeURIComponent(orderId)}/cancel`, {
        method: "POST",
      }),
    () => ({
      success: true,
      order: { id: orderId, status: "Cancelled" },
      message: "Order cancellation request submitted.",
      mock: true,
    })
  );
}

export async function requestReturn({ orderId = "" } = {}) {
  return requestWithFallback(
    () =>
      request(`/orders/${encodeURIComponent(orderId)}/return`, {
        method: "POST",
      }),
    () => ({
      success: true,
      order: { id: orderId, status: "Return Requested" },
      message: "Return request submitted.",
      mock: true,
    })
  );
}

export async function requestRefund({ orderId = "" } = {}) {
  return requestWithFallback(
    () =>
      request(`/orders/${encodeURIComponent(orderId)}/refund`, {
        method: "POST",
      }),
    () => ({
      success: true,
      order: { id: orderId, status: "Refund Requested" },
      message: "Refund request submitted.",
      mock: true,
    })
  );
}

// ==================== ADDRESSES ====================

export async function fetchUserAddresses() {
  return requestWithFallback(
    () => request("/account/addresses"),
    () => ({
      addresses: readLocalArray(getAddressStorageKey()),
      mock: true,
    })
  );
}

export async function addAddress(payload = {}) {
  return requestWithFallback(
    () => request("/account/addresses", { method: "POST", body: payload }),
    () => {
      const addressKey = getAddressStorageKey();
      const currentAddresses = readLocalArray(addressKey);

      const newAddress = {
        id: createId("ADDR"),
        ...payload,
      };

      const nextAddresses = newAddress.isDefault
        ? [
            ...currentAddresses.map((address) => ({
              ...address,
              isDefault: false,
            })),
            newAddress,
          ]
        : [...currentAddresses, newAddress];

      writeLocalArray(addressKey, nextAddresses);

      return { success: true, address: newAddress, mock: true };
    }
  );
}

export async function updateAddress(addressId, payload = {}) {
  return requestWithFallback(
    () =>
      request(`/account/addresses/${encodeURIComponent(addressId)}`, {
        method: "PUT",
        body: payload,
      }),
    () => {
      const addressKey = getAddressStorageKey();
      const currentAddresses = readLocalArray(addressKey);

      const updatedAddress = {
        id: addressId,
        ...payload,
      };

      const nextAddresses = currentAddresses.map((address) => {
        if (String(address.id) === String(addressId)) {
          return updatedAddress;
        }

        if (payload.isDefault) {
          return { ...address, isDefault: false };
        }

        return address;
      });

      writeLocalArray(addressKey, nextAddresses);

      return { success: true, address: updatedAddress, mock: true };
    }
  );
}

export async function deleteAddress(addressId) {
  return requestWithFallback(
    () =>
      request(`/account/addresses/${encodeURIComponent(addressId)}`, {
        method: "DELETE",
      }),
    () => {
      const addressKey = getAddressStorageKey();
      const currentAddresses = readLocalArray(addressKey);
      const nextAddresses = currentAddresses.filter(
        (address) => String(address.id) !== String(addressId)
      );

      writeLocalArray(addressKey, nextAddresses);

      return { success: true, mock: true };
    }
  );
}

export async function setDefaultAddress(addressId) {
  return requestWithFallback(
    () =>
      request(`/account/addresses/${encodeURIComponent(addressId)}/default`, {
        method: "PATCH",
      }),
    () => {
      const addressKey = getAddressStorageKey();
      const currentAddresses = readLocalArray(addressKey);

      const nextAddresses = currentAddresses.map((address) => ({
        ...address,
        isDefault: String(address.id) === String(addressId),
      }));

      writeLocalArray(addressKey, nextAddresses);

      return { success: true, mock: true };
    }
  );
}

// ==================== REVIEWS ====================

export async function fetchUserReviews() {
  return requestWithFallback(
    () => request("/account/reviews"),
    () => ({
      reviews: readLocalArray(getReviewStorageKey()),
      mock: true,
    })
  );
}

export async function fetchEligibleProductsForReview() {
  return requestWithFallback(
    () => request("/account/reviews/eligible-products"),
    () => ({ products: [], mock: true })
  );
}

export async function submitProductReview(productId, payload = {}) {
  return requestWithFallback(
    () =>
      request(`/products/${encodeURIComponent(productId)}/reviews`, {
        method: "POST",
        body: payload,
      }),
    () => {
      const reviewKey = getReviewStorageKey();
      const currentReviews = readLocalArray(reviewKey);

      const product =
        sampleProducts.find(
          (sampleProduct) =>
            String(sampleProduct.id) === String(productId)
        ) || { id: productId, name: "Wish Jinny Product" };

      const review = {
        id: createId("REV"),
        productId,
        product,
        ...payload,
        status: "Published",
        created_at: new Date().toISOString(),
      };

      writeLocalArray(reviewKey, [review, ...currentReviews]);

      return { success: true, review, mock: true };
    }
  );
}

export async function updateProductReview(reviewId, payload = {}) {
  return requestWithFallback(
    () =>
      request(`/account/reviews/${encodeURIComponent(reviewId)}`, {
        method: "PUT",
        body: payload,
      }),
    () => {
      const reviewKey = getReviewStorageKey();
      const currentReviews = readLocalArray(reviewKey);

      let updatedReview = null;

      const nextReviews = currentReviews.map((review) => {
        if (String(review.id) === String(reviewId)) {
          updatedReview = {
            ...review,
            ...payload,
            updated_at: new Date().toISOString(),
          };

          return updatedReview;
        }

        return review;
      });

      writeLocalArray(reviewKey, nextReviews);

      return {
        success: true,
        review: updatedReview || { id: reviewId, ...payload },
        mock: true,
      };
    }
  );
}

export async function deleteProductReview(reviewId) {
  return requestWithFallback(
    () =>
      request(`/account/reviews/${encodeURIComponent(reviewId)}`, {
        method: "DELETE",
      }),
    () => {
      const reviewKey = getReviewStorageKey();
      const currentReviews = readLocalArray(reviewKey);

      writeLocalArray(
        reviewKey,
        currentReviews.filter(
          (review) => String(review.id) !== String(reviewId)
        )
      );

      return { success: true, mock: true };
    }
  );
}

// ==================== USER DASHBOARD ====================

export async function fetchUserDashboardStats() {
  return requestWithFallback(
    () => request("/account/dashboard"),
    () => {
      const cart = readLocalArray(getCartStorageKey());
      const wishlist = readLocalArray(getWishlistStorageKey());
      const user = getStoredUser() || {};

      return {
        stats: {
          totalOrders: 0,
          activeOrders: 0,
          deliveredOrders: 0,
          wishlistItems: wishlist.length,
          walletBalance: 0,
          rewardPoints: 0,
          userName: user.name || "",
          cartItems: cart.length,
        },
        mock: true,
      };
    }
  );
}

export async function fetchRecommendedProducts() {
  return requestWithFallback(
    () => request("/account/recommendations"),
    () => ({ products: sampleProducts.slice(0, 4), mock: true })
  );
}

export async function exportUserDataJSON() {
  return requestWithFallback(
    () => request("/account/export", { method: "POST" }),
    () => {
      const user = getStoredUser() || {};
      const data = {
        exportedAt: new Date().toISOString(),
        user,
        cart: readLocalArray(getCartStorageKey()),
        wishlist: readLocalArray(getWishlistStorageKey()),
        addresses: readLocalArray(getAddressStorageKey()),
        reviews: readLocalArray(getReviewStorageKey()),
      };

      if (typeof window !== "undefined") {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "wish-jinny-my-data.json";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      return {
        success: true,
        message: "Your data export has been downloaded.",
        mock: true,
      };
    }
  );
}

// ==================== VENDOR ONBOARDING ====================

export async function requestVendorOtp({ email = "", phone = "" } = {}) {
  return requestWithFallback(
    () =>
      request("/vendors/onboarding/otp/request", {
        method: "POST",
        body: { email, phone },
        auth: false,
      }),
    () => ({ success: true, message: "Vendor OTP sent.", mock: true })
  );
}

export async function verifyVendorOtp({
  email = "",
  phone = "",
  otp = "",
} = {}) {
  return requestWithFallback(
    () =>
      request("/vendors/onboarding/otp/verify", {
        method: "POST",
        body: { email, phone, otp },
        auth: false,
      }),
    () => ({ success: true, message: "Vendor OTP verified.", mock: true })
  );
}

export async function registerVendor(payload) {
  return requestWithFallback(
    () =>
      request("/vendors/register", {
        method: "POST",
        body: payload,
        auth: false,
      }),
    () => ({
      success: true,
      status: "Pending Approval",
      vendor: {
        id: createId("VND"),
        status: "Pending Approval",
      },
      mock: true,
    })
  );
}

export async function fetchVendorStatus({ email = "" } = {}) {
  return requestWithFallback(
    () => request("/vendors/status", { params: { email } }),
    () => ({
      success: true,
      status: "Pending Approval",
      mock: true,
    })
  );
}

// ==================== SETTINGS ====================

export async function fetchSettings() {
  return requestWithFallback(
    () => request("/admin/settings"),
    () => ({ settings: {}, mock: true })
  );
}

export async function updateSettings(payload = {}) {
  const settings = payload?.settings || payload;

  return requestWithFallback(
    () =>
      request("/admin/settings", {
        method: "PUT",
        body: { settings },
      }),
    () => ({ success: true, settings, mock: true })
  );
}

// ==================== NOTIFICATION MANAGER ====================

export async function fetchSystemNotifications({
  page = 1,
  search = "",
  status = "all",
} = {}) {
  return requestWithFallback(
    () =>
      request("/admin/notifications", {
        params: { page, search, status },
      }),
    () => ({ items: [], mock: true })
  );
}

export async function fetchAlerts() {
  return requestWithFallback(
    () => request("/admin/alerts"),
    () => ({ items: [], mock: true })
  );
}

export async function updateNotificationStatus({ id, status } = {}) {
  return requestWithFallback(
    () =>
      request(`/admin/notifications/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: { status },
      }),
    () => ({ success: true, id, status, mock: true })
  );
}

export async function resendNotification({ id } = {}) {
  return requestWithFallback(
    () =>
      request(`/admin/notifications/${encodeURIComponent(id)}/resend`, {
        method: "POST",
      }),
    () => ({ success: true, id, mock: true })
  );
}

// ==================== SUPPORT MANAGER ====================

export async function fetchSupportTickets({ page = 1, status = "all" } = {}) {
  return requestWithFallback(
    () => request("/admin/support/tickets", { params: { page, status } }),
    () => ({ items: [], mock: true })
  );
}

export async function fetchComplaints({ page = 1, status = "all" } = {}) {
  return requestWithFallback(
    () => request("/admin/support/complaints", { params: { page, status } }),
    () => ({ items: [], mock: true })
  );
}

export async function updateTicketStatus({ id, status } = {}) {
  return requestWithFallback(
    () =>
      request(`/admin/support/tickets/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: { status },
      }),
    () => ({ success: true, id, status, mock: true })
  );
}

export async function updateComplaintStatus({ id, status } = {}) {
  return requestWithFallback(
    () =>
      request(`/admin/support/complaints/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: { status },
      }),
    () => ({ success: true, id, status, mock: true })
  );
}

// ==================== INVENTORY MANAGER ====================

export async function fetchInventoryOverview() {
  return requestWithFallback(
    () => request("/admin/inventory/overview"),
    () => ({
      totalProducts: sampleProducts.length,
      lowStock: sampleProducts.filter((product) => product.stock <= 5).length,
      outOfStock: 0,
      warehouses: 0,
      alerts: [],
      mock: true,
    })
  );
}

export async function fetchLowStockProducts({ page = 1 } = {}) {
  return requestWithFallback(
    () => request("/admin/inventory/low-stock", { params: { page } }),
    () => ({
      items: sampleProducts.filter((product) => product.stock <= 5),
      mock: true,
    })
  );
}

export async function fetchOutOfStockProducts({ page = 1 } = {}) {
  return requestWithFallback(
    () => request("/admin/inventory/out-of-stock", { params: { page } }),
    () => ({ items: [], mock: true })
  );
}

export async function fetchWarehouseStatus() {
  return requestWithFallback(
    () => request("/admin/inventory/warehouses"),
    () => ({ items: [], mock: true })
  );
}

export async function updateStockLevel({ id, stock } = {}) {
  return requestWithFallback(
    () =>
      request(`/admin/inventory/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: { stock },
      }),
    () => ({ success: true, id, stock, mock: true })
  );
}

// ==================== MARKETING MANAGER ====================

export async function fetchCampaigns() {
  return requestWithFallback(
    () => request("/admin/marketing/campaigns"),
    () => ({ items: [], mock: true })
  );
}

export async function fetchPromotions() {
  return requestWithFallback(
    () => request("/admin/marketing/promotions"),
    () => ({ items: [], mock: true })
  );
}

export async function fetchCoupons() {
  return requestWithFallback(
    () => request("/admin/marketing/coupons"),
    () => ({ items: [], mock: true })
  );
}

export async function fetchMarketingPerformance() {
  return requestWithFallback(
    () => request("/admin/marketing/performance"),
    () => ({
      campaignsActive: 0,
      campaignsScheduled: 0,
      promotionsActive: 0,
      couponsActive: 0,
      conversionRate: 0,
      revenueImpact: 0,
      mock: true,
    })
  );
}

export async function createCampaign(payload = {}) {
  return requestWithFallback(
    () => request("/admin/marketing/campaigns", { method: "POST", body: payload }),
    () => ({ success: true, campaign: { id: createId("CMP"), ...payload }, mock: true })
  );
}

export async function updateCampaign({ id, updates } = {}) {
  return requestWithFallback(
    () =>
      request(`/admin/marketing/campaigns/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: updates,
      }),
    () => ({ success: true, campaign: { id, ...updates }, mock: true })
  );
}

export async function deleteCampaign({ id } = {}) {
  return requestWithFallback(
    () =>
      request(`/admin/marketing/campaigns/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    () => ({ success: true, id, mock: true })
  );
}

// ==================== REPORTS & ANALYTICS ====================

export async function fetchReports() {
  return requestWithFallback(
    () => request("/admin/reports"),
    () => ({ items: [], mock: true })
  );
}

export async function fetchAnalytics({ dateRange } = {}) {
  return requestWithFallback(
    () => request("/admin/analytics", { params: { dateRange } }),
    () => ({ data: {}, mock: true })
  );
}

export async function fetchDashboardOverview({ dateRange } = {}) {
  return requestWithFallback(
    () => request("/admin/dashboard", { params: { dateRange } }),
    () => ({ data: {}, mock: true })
  );
}

// ==================== UX MANAGER ====================

export async function fetchThemes() {
  return requestWithFallback(
    () => request("/admin/ux/themes"),
    () => ({ items: [], mock: true })
  );
}

export async function updateTheme({ id, settings } = {}) {
  return requestWithFallback(
    () =>
      request(`/admin/ux/themes/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: { settings },
      }),
    () => ({ success: true, id, settings, mock: true })
  );
}

export async function fetchLayouts() {
  return requestWithFallback(
    () => request("/admin/ux/layouts"),
    () => ({ items: [], mock: true })
  );
}

export async function updateLayout({ id, settings } = {}) {
  return requestWithFallback(
    () =>
      request(`/admin/ux/layouts/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: { settings },
      }),
    () => ({ success: true, id, settings, mock: true })
  );
}

export async function fetchAccessibilitySettings() {
  return requestWithFallback(
    () => request("/admin/ux/accessibility"),
    () => ({ items: [], mock: true })
  );
}

export async function updateAccessibility({ id, settings } = {}) {
  return requestWithFallback(
    () =>
      request(`/admin/ux/accessibility/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: { settings },
      }),
    () => ({ success: true, id, settings, mock: true })
  );
}

// ==================== INTEGRATION MANAGER ====================

export async function fetchIntegrations() {
  return requestWithFallback(
    () => request("/admin/integrations"),
    () => ({ items: [], mock: true })
  );
}

export async function addIntegration({ type, config } = {}) {
  return requestWithFallback(
    () =>
      request("/admin/integrations", {
        method: "POST",
        body: { type, config },
      }),
    () => ({ success: true, integration: { id: createId("INT"), type }, mock: true })
  );
}

export async function updateIntegration({ id, config } = {}) {
  return requestWithFallback(
    () =>
      request(`/admin/integrations/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: { config },
      }),
    () => ({ success: true, id, mock: true })
  );
}

export async function deleteIntegration({ id } = {}) {
  return requestWithFallback(
    () =>
      request(`/admin/integrations/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    () => ({ success: true, id, mock: true })
  );
}

export async function testIntegration({ id } = {}) {
  return requestWithFallback(
    () =>
      request(`/admin/integrations/${encodeURIComponent(id)}/test`, {
        method: "POST",
      }),
    () => ({ success: true, id, mock: true })
  );
}

// ==================== AUDIT MANAGER ====================

export async function fetchAuditLogs(options = {}) {
  return requestWithFallback(
    () => request("/admin/audit-logs", { params: options }),
    () => ({ items: [], mock: true })
  );
}

export async function logAuditEvent({
  action,
  details,
  resourceType,
  resourceId,
} = {}) {
  return requestWithFallback(
    () =>
      request("/admin/audit-logs", {
        method: "POST",
        body: { action, details, resourceType, resourceId },
      }),
    () => ({ success: true, mock: true })
  );
}

// ==================== FINANCE MANAGER ====================

export async function fetchPayments({ page = 1, status = "all" } = {}) {
  return requestWithFallback(
    () => request("/admin/finance/payments", { params: { page, status } }),
    () => ({ items: [], mock: true })
  );
}

export async function fetchSettlements({ page = 1, status = "all" } = {}) {
  return requestWithFallback(
    () => request("/admin/finance/settlements", { params: { page, status } }),
    () => ({ items: [], mock: true })
  );
}

export async function fetchRefunds({ page = 1, status = "all" } = {}) {
  return requestWithFallback(
    () => request("/admin/finance/refunds", { params: { page, status } }),
    () => ({ items: [], mock: true })
  );
}

export async function fetchRevenueReports({ dateRange } = {}) {
  return requestWithFallback(
    () => request("/admin/finance/revenue", { params: { dateRange } }),
    () => ({
      totalRevenue: 0,
      netRevenue: 0,
      grossSales: 0,
      refunds: 0,
      taxes: 0,
      commission: 0,
      mock: true,
    })
  );
}

// ==================== VENDOR MANAGER ====================

export async function fetchVendors({
  page = 1,
  search = "",
  status = "all",
} = {}) {
  return requestWithFallback(
    () => request("/admin/vendors", { params: { page, search, status } }),
    () => ({ items: [], mock: true })
  );
}

export async function approveVendor({ id } = {}) {
  return requestWithFallback(
    () =>
      request(`/admin/vendors/${encodeURIComponent(id)}/approve`, {
        method: "POST",
      }),
    () => ({ success: true, vendor: { id, status: "Active" }, mock: true })
  );
}

export async function rejectVendor({ id, reason = "" } = {}) {
  return requestWithFallback(
    () =>
      request(`/admin/vendors/${encodeURIComponent(id)}/reject`, {
        method: "POST",
        body: { reason },
      }),
    () => ({ success: true, vendor: { id, status: "Rejected" }, mock: true })
  );
}

export async function fetchVendorPerformance({ id } = {}) {
  return requestWithFallback(
    () => request(`/admin/vendors/${encodeURIComponent(id)}/performance`),
    () => ({
      totalOrders: 0,
      totalRevenue: 0,
      rating: 0,
      fulfillmentRate: 0,
      mock: true,
    })
  );
}

// ==================== USER MANAGER ====================

export async function fetchUsers({ page = 1, search = "", role = "" } = {}) {
  return requestWithFallback(
    () => request("/admin/users", { params: { page, search, role } }),
    () => ({ items: [], mock: true })
  );
}

export async function fetchCustomers({ page = 1, search = "" } = {}) {
  return requestWithFallback(
    () => request("/admin/customers", { params: { page, search } }),
    () => ({ items: [], mock: true })
  );
}

export async function updateUserRole({ id, role } = {}) {
  return requestWithFallback(
    () =>
      request(`/admin/users/${encodeURIComponent(id)}/role`, {
        method: "PATCH",
        body: { role },
      }),
    () => ({ success: true, user: { id, role }, mock: true })
  );
}

export async function deleteUser({ id } = {}) {
  return requestWithFallback(
    () => request(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
    () => ({ success: true, id, mock: true })
  );
}

// ==================== AI MANAGER ====================

export async function fetchAISettings() {
  return requestWithFallback(
    () => request("/admin/ai/settings"),
    () => ({
      chatbotEnabled: true,
      recommendationsEnabled: true,
      autoResponsesEnabled: false,
      mock: true,
    })
  );
}

export async function updateAISettings({ id, config } = {}) {
  return requestWithFallback(
    () =>
      request("/admin/ai/settings", {
        method: "PUT",
        body: { id, config },
      }),
    () => ({ success: true, mock: true })
  );
}

export async function trainChatbot({ dataset } = {}) {
  return requestWithFallback(
    () =>
      request("/admin/ai/train", {
        method: "POST",
        body: { dataset },
      }),
    () => ({ success: true, mock: true })
  );
}

export async function fetchAIAnalytics() {
  return requestWithFallback(
    () => request("/admin/ai/analytics"),
    () => ({
      totalConversations: 0,
      satisfactionRate: 0,
      avgResponseTime: 0,
      mock: true,
    })
  );
}

// ==================== CMS & ADMIN LOOKUPS ====================

export async function fetchCouponsList() {
  return requestWithFallback(
    () => request("/admin/coupons"),
    () => ({ items: [], mock: true })
  );
}

export async function fetchBanners() {
  return requestWithFallback(
    () => request("/admin/banners"),
    () => ({ items: [], mock: true })
  );
}

export async function fetchShippingMethods() {
  return requestWithFallback(
    () => request("/admin/shipping-methods"),
    () => ({ items: [], mock: true })
  );
}

export async function fetchPaymentMethods() {
  return requestWithFallback(
    () => request("/admin/payment-methods"),
    () => ({ items: [], mock: true })
  );
}

export async function fetchRoles() {
  return requestWithFallback(
    () => request("/admin/roles"),
    () => ({ items: [], mock: true })
  );
}

export async function fetchCMSContent() {
  return requestWithFallback(
    () => request("/admin/cms"),
    () => ({ items: [], mock: true })
  );
}

export async function fetchMedia() {
  return requestWithFallback(
    () => request("/admin/media"),
    () => ({ items: [], mock: true })
  );
}

// ==================== EXPORT HELPERS ====================

const exportFallback = (format, filter = {}) => ({
  success: true,
  format,
  filter,
  message: `${format.toUpperCase()} export is ready in demo mode.`,
  mock: true,
});

const createExportFunction = (path) => {
  return async ({ filter = {} } = {}) =>
    requestWithFallback(
      () =>
        request(path, {
          method: "POST",
          body: { filter },
        }),
      () => exportFallback(path.split("/").pop(), filter)
    );
};

export const exportNotificationsCSV = createExportFunction(
  "/admin/notifications/export/csv"
);
export const exportNotificationsExcel = createExportFunction(
  "/admin/notifications/export/excel"
);
export const exportNotificationsPDF = createExportFunction(
  "/admin/notifications/export/pdf"
);

export const exportSupportCSV = createExportFunction(
  "/admin/support/export/csv"
);
export const exportSupportExcel = createExportFunction(
  "/admin/support/export/excel"
);
export const exportSupportPDF = createExportFunction(
  "/admin/support/export/pdf"
);

export const exportInventoryCSV = createExportFunction(
  "/admin/inventory/export/csv"
);
export const exportInventoryExcel = createExportFunction(
  "/admin/inventory/export/excel"
);
export const exportInventoryPDF = createExportFunction(
  "/admin/inventory/export/pdf"
);

export const exportMarketingCSV = createExportFunction(
  "/admin/marketing/export/csv"
);
export const exportMarketingExcel = createExportFunction(
  "/admin/marketing/export/excel"
);
export const exportMarketingPDF = createExportFunction(
  "/admin/marketing/export/pdf"
);

export const exportReportsCSV = createExportFunction("/admin/reports/export/csv");
export const exportReportsExcel = createExportFunction(
  "/admin/reports/export/excel"
);
export const exportReportsPDF = createExportFunction("/admin/reports/export/pdf");

export const exportUXCSV = createExportFunction("/admin/ux/export/csv");
export const exportUXExcel = createExportFunction("/admin/ux/export/excel");
export const exportUXPDF = createExportFunction("/admin/ux/export/pdf");

export const exportAuditCSV = createExportFunction(
  "/admin/audit-logs/export/csv"
);
export const exportAuditExcel = createExportFunction(
  "/admin/audit-logs/export/excel"
);
export const exportAuditPDF = createExportFunction(
  "/admin/audit-logs/export/pdf"
);

export const exportFinanceCSV = createExportFunction(
  "/admin/finance/export/csv"
);
export const exportFinanceExcel = createExportFunction(
  "/admin/finance/export/excel"
);
export const exportFinancePDF = createExportFunction(
  "/admin/finance/export/pdf"
);

// ==================== API OBJECT ====================

export const api = {
  setMockMode,

  loginUser,
  signupUser,
  requestOtp,
  verifyOtp,
  logoutUser,
  fetchAccount,
  updateProfile,

  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchCategories,

  updateCart,
  applyCoupon,
  placeOrder,

  fetchWishlistItems,
  updateWishlist,
  addToWishlist,
  removeFromWishlist,
  moveToCart,
  moveWishlistToCart,
  clearWishlist,
  shareWishlist,

  fetchOrders,
  fetchRecentOrders,
  fetchOrder,
  updateOrderStatus,
  cancelOrder,
  requestReturn,
  requestRefund,

  fetchUserAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,

  fetchUserReviews,
  fetchEligibleProductsForReview,
  submitProductReview,
  updateProductReview,
  deleteProductReview,

  fetchUserDashboardStats,
  fetchRecommendedProducts,
  exportUserDataJSON,

  requestVendorOtp,
  verifyVendorOtp,
  registerVendor,
  fetchVendorStatus,

  fetchSettings,
  updateSettings,

  fetchSystemNotifications,
  fetchAlerts,
  updateNotificationStatus,
  resendNotification,
  exportNotificationsCSV,
  exportNotificationsExcel,
  exportNotificationsPDF,

  fetchSupportTickets,
  fetchComplaints,
  updateTicketStatus,
  updateComplaintStatus,
  exportSupportCSV,
  exportSupportExcel,
  exportSupportPDF,

  fetchInventoryOverview,
  fetchLowStockProducts,
  fetchOutOfStockProducts,
  fetchWarehouseStatus,
  updateStockLevel,
  exportInventoryCSV,
  exportInventoryExcel,
  exportInventoryPDF,

  fetchCampaigns,
  fetchPromotions,
  fetchCoupons,
  fetchMarketingPerformance,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  exportMarketingCSV,
  exportMarketingExcel,
  exportMarketingPDF,

  fetchReports,
  fetchAnalytics,
  fetchDashboardOverview,
  exportReportsCSV,
  exportReportsExcel,
  exportReportsPDF,

  fetchThemes,
  updateTheme,
  fetchLayouts,
  updateLayout,
  fetchAccessibilitySettings,
  updateAccessibility,
  exportUXCSV,
  exportUXExcel,
  exportUXPDF,

  fetchIntegrations,
  addIntegration,
  updateIntegration,
  deleteIntegration,
  testIntegration,

  fetchAuditLogs,
  logAuditEvent,
  exportAuditCSV,
  exportAuditExcel,
  exportAuditPDF,

  fetchPayments,
  fetchSettlements,
  fetchRefunds,
  fetchRevenueReports,
  exportFinanceCSV,
  exportFinanceExcel,
  exportFinancePDF,

  fetchVendors,
  approveVendor,
  rejectVendor,
  fetchVendorPerformance,

  fetchUsers,
  fetchCustomers,
  updateUserRole,
  deleteUser,

  fetchAISettings,
  updateAISettings,
  trainChatbot,
  fetchAIAnalytics,

  fetchCouponsList,
  fetchBanners,
  fetchShippingMethods,
  fetchPaymentMethods,
  fetchRoles,
  fetchCMSContent,
  fetchMedia,
};

console.info("Wish Jinny API client loaded.");
// ==================== ADMIN PRODUCT EXTENSIONS ====================

export async function fetchProductDetails({ id } = {}) {
  return requestWithFallback(
    () =>
      request(`/products/${encodeURIComponent(id)}`, {
        auth: false,
      }),
    () => {
      const foundProduct = sampleProducts.find(
        (product) => String(product.id) === String(id)
      );

      return foundProduct || null;
    }
  );
}

export async function fetchProductPerformance({ id } = {}) {
  return requestWithFallback(
    () =>
      request(`/products/${encodeURIComponent(id)}/performance`, {
        auth: false,
      }),
    () => ({
      sales: 0,
      returns: 0,
      rating: 0,
      views: 0,
      conversionRate: 0,
      mock: true,
    })
  );
}

export async function approveProduct({ id } = {}) {
  return requestWithFallback(
    () =>
      request(`/products/${encodeURIComponent(id)}/approve`, {
        method: "PATCH",
      }),
    () => ({ success: true, id, status: "approved", mock: true })
  );
}

export async function rejectProduct({ id, reason = "" } = {}) {
  return requestWithFallback(
    () =>
      request(`/products/${encodeURIComponent(id)}/reject`, {
        method: "PATCH",
        body: { reason },
      }),
    () => ({ success: true, id, status: "rejected", mock: true })
  );
}

export async function publishProduct({ id } = {}) {
  return requestWithFallback(
    () =>
      request(`/products/${encodeURIComponent(id)}/publish`, {
        method: "PATCH",
      }),
    () => ({ success: true, id, status: "published", mock: true })
  );
}

export async function unpublishProduct({ id } = {}) {
  return requestWithFallback(
    () =>
      request(`/products/${encodeURIComponent(id)}/unpublish`, {
        method: "PATCH",
      }),
    () => ({ success: true, id, status: "unpublished", mock: true })
  );
}

export async function uploadProductMedia({ id, files = [] } = {}) {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });

  return requestWithFallback(
    () =>
      request(`/products/${encodeURIComponent(id)}/media`, {
        method: "POST",
        body: formData,
      }),
    () => ({ success: true, id, uploaded: files.length, mock: true })
  );
}

export async function updateProductVariants({ id, variants = [] } = {}) {
  return requestWithFallback(
    () =>
      request(`/products/${encodeURIComponent(id)}/variants`, {
        method: "PUT",
        body: { variants },
      }),
    () => ({ success: true, id, variants, mock: true })
  );
}

export async function updateProductCategories({
  id,
  category = "",
  subcategory = "",
} = {}) {
  return requestWithFallback(
    () =>
      request(`/products/${encodeURIComponent(id)}/categories`, {
        method: "PUT",
        body: { category, subcategory },
      }),
    () => ({ success: true, id, category, subcategory, mock: true })
  );
}

export async function bulkUpdateProducts({ ids = [], update = {} } = {}) {
  return requestWithFallback(
    () =>
      request("/products/bulk-update", {
        method: "PATCH",
        body: { ids, update },
      }),
    () => ({ success: true, updated: ids.length, mock: true })
  );
}

export const exportProductsCSV = createExportFunction(
  "/admin/products/export/csv"
);

export const exportProductsExcel = createExportFunction(
  "/admin/products/export/excel"
);

export const exportProductsPDF = createExportFunction(
  "/admin/products/export/pdf"
);