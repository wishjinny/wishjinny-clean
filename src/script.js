// src/utils/api.ts
// Wish Jinny - Frontend API Layer
// Mock data layer for development. Replace mock functions with real backend calls later.

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type ExportFormat = "csv" | "excel" | "pdf";

interface Notification {
  id: string;
  title: string;
  message: string;
  status: "read" | "unread";
  createdAt: string;
}

interface Alert {
  id: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  createdAt: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  customer: string;
  status: "open" | "pending" | "resolved" | "closed";
  createdAt: string;
}

interface Complaint {
  id: string;
  issue: string;
  customer: string;
  status: "open" | "investigating" | "resolved" | "rejected";
  createdAt: string;
}

interface InventoryProduct {
  id: string;
  name: string;
  sku: string;
  stock: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
}

interface Warehouse {
  id: string;
  name: string;
  location: string;
  status: "active" | "inactive" | "maintenance";
  capacity: number;
}

interface Campaign {
  id: string;
  name: string;
  status: "draft" | "active" | "paused" | "completed";
  startDate: string;
  endDate: string;
}

interface Promotion {
  id: string;
  title: string;
  discount: string;
  status: "active" | "inactive";
}

interface Coupon {
  id: string;
  code: string;
  discount: string;
  usage: number;
  status: "active" | "inactive";
}

interface Report {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  status: "pending" | "completed" | "failed";
}

interface Theme {
  id: string;
  name: string;
  settings: Record<string, unknown>;
}

interface Layout {
  id: string;
  name: string;
  settings: Record<string, unknown>;
}

interface AccessibilitySetting {
  id: string;
  name: string;
  enabled: boolean;
}

interface Integration {
  id: string;
  name: string;
  type: string;
  status: "active" | "inactive" | "error";
}

interface AuditLog {
  id: string;
  eventId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  userId: string;
  userName: string;
  userRole: string;
  status: "success" | "failure";
  date: string;
  time: string;
  securitySensitive?: boolean;
  voiceConfirmed?: boolean;
}

interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: "pending" | "completed" | "failed" | "refunded";
  method: string;
  date: string;
}

interface Settlement {
  id: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  status: "pending" | "processed" | "failed";
  date: string;
}

interface Refund {
  id: string;
  orderId: string;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "processed";
  date: string;
}

interface Vendor {
  id: string;
  name: string;
  email: string;
  status: "pending" | "active" | "suspended" | "rejected";
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin" | "vendor" | "customer";
}

interface AISettings {
  chatbotEnabled: boolean;
  recommendationsEnabled: boolean;
  autoResponsesEnabled: boolean;
  [key: string]: unknown;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  vendor: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  paymentMethod: string;
  paymentStatus: "paid" | "unpaid" | "failed";
  status:
    | "pending"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "return_requested"
    | "returned"
    | "refund_requested"
    | "refunded";
  date: string;
  subtotal: number;
  discount: number;
  shippingCharge: number;
  total: number;
  tracking?: string;
  items: OrderItem[];
}

export interface VendorOrder {
  id: string;
  customerName: string;
  amount: number;
  status: string;
  date: string;
}

export interface VendorProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  status: "active" | "draft" | "inactive";
}

export interface VendorDashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  pendingOrders: number;
}

const mockOrders: Order[] = [
  {
    id: "WJ-1001",
    customerName: "Aarav Sharma",
    customerEmail: "aarav@example.com",
    customerPhone: "9876543210",
    shippingAddress: "Bandra West, Mumbai, Maharashtra",
    paymentMethod: "UPI",
    paymentStatus: "paid",
    status: "processing",
    date: "2026-10-03",
    subtotal: 2499,
    discount: 250,
    shippingCharge: 0,
    total: 2249,
    items: [
      {
        id: "ITEM-1001",
        name: "Premium Wireless Earbuds",
        quantity: 1,
        price: 2249,
        vendor: "TechNova Store",
      },
    ],
  },
  {
    id: "WJ-1002",
    customerName: "Meera Kapoor",
    customerEmail: "meera@example.com",
    customerPhone: "9988776655",
    shippingAddress: "Indiranagar, Bengaluru, Karnataka",
    paymentMethod: "Card",
    paymentStatus: "paid",
    status: "shipped",
    date: "2026-10-02",
    subtotal: 1899,
    discount: 100,
    shippingCharge: 49,
    total: 1848,
    tracking: "TRK-IND-204810",
    items: [
      {
        id: "ITEM-1002",
        name: "Minimalist Smart Watch Strap",
        quantity: 2,
        price: 899,
        vendor: "Urban Accessories",
      },
    ],
  },
  {
    id: "WJ-1003",
    customerName: "Kabir Singh",
    customerEmail: "kabir@example.com",
    customerPhone: "9123456789",
    shippingAddress: "Sector 62, Noida, Uttar Pradesh",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "unpaid",
    status: "pending",
    date: "2026-10-01",
    subtotal: 1299,
    discount: 0,
    shippingCharge: 99,
    total: 1398,
    items: [
      {
        id: "ITEM-1003",
        name: "Organic Cotton Oversized T-Shirt",
        quantity: 1,
        price: 1299,
        vendor: "StyleNest",
      },
    ],
  },
];

const mockVendorProducts: VendorProduct[] = [
  {
    id: "VP-101",
    name: "Premium Wireless Earbuds",
    price: 2249,
    stock: 42,
    status: "active",
  },
  {
    id: "VP-102",
    name: "Noise Cancelling Headphones",
    price: 3999,
    stock: 18,
    status: "active",
  },
  {
    id: "VP-103",
    name: "USB-C Fast Charging Cable",
    price: 499,
    stock: 0,
    status: "inactive",
  },
];

function delay(ms = 250) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function sanitizeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function downloadFile(
  filename: string,
  content: string,
  mimeType = "text/plain;charset=utf-8"
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function objectsToCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";

  const columns = Array.from(
    rows.reduce((allColumns, row) => {
      Object.keys(row).forEach((key) => allColumns.add(key));
      return allColumns;
    }, new Set<string>())
  );

  const escape = (value: unknown) => {
    const text =
      value === null || value === undefined
        ? ""
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);

    return `"${text.replace(/"/g, '""')}"`;
  };

  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => escape(row[column])).join(",")),
  ].join("\n");
}

async function exportRows(
  baseName: string,
  rows: Record<string, unknown>[],
  format: ExportFormat
) {
  await delay();

  const safeName = sanitizeFileName(baseName);
  const csv = objectsToCsv(rows);

  if (format === "csv") {
    downloadFile(`${safeName}.csv`, csv, "text/csv;charset=utf-8");
    return { success: true };
  }

  if (format === "excel") {
    downloadFile(`${safeName}.xls`, csv, "application/vnd.ms-excel");
    return { success: true };
  }

  const printableText = [
    "Wish Jinny Report",
    baseName,
    "",
    ...rows.map((row) =>
      Object.entries(row)
        .map(([key, value]) => `${key}: ${String(value ?? "")}`)
        .join(" | ")
    ),
  ].join("\n");

  downloadFile(`${safeName}.txt`, printableText);
  return { success: true };
}

function matchesSearch(value: unknown, query: string) {
  return String(value ?? "").toLowerCase().includes(query.toLowerCase());
}

function getPage<T>(items: T[], page = 1, limit = 10) {
  const currentPage = Math.max(page, 1);
  const start = (currentPage - 1) * limit;

  return {
    items: items.slice(start, start + limit),
    total: items.length,
    page: currentPage,
    totalPages: Math.max(1, Math.ceil(items.length / limit)),
  };
}

// ==================== ORDER MANAGER ====================

export async function fetchOrders({
  page = 1,
  limit = 10,
  search = "",
  status = "all",
  payment = "all",
  sort = "date",
}: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  payment?: string;
  sort?: string;
} = {}) {
  await delay();

  let items = [...mockOrders];

  if (search.trim()) {
    const query = search.trim().toLowerCase();

    items = items.filter((order) =>
      [
        order.id,
        order.customerName,
        order.customerEmail,
        order.customerPhone,
      ].some((field) => matchesSearch(field, query))
    );
  }

  if (status !== "all") {
    items = items.filter((order) => order.status === status);
  }

  if (payment !== "all") {
    items = items.filter((order) => order.paymentStatus === payment);
  }

  items.sort((first, second) => {
    if (sort === "customer") {
      return first.customerName.localeCompare(second.customerName);
    }

    if (sort === "status") {
      return first.status.localeCompare(second.status);
    }

    return new Date(second.date).getTime() - new Date(first.date).getTime();
  });

  return getPage(items, page, limit);
}

export async function updateOrderStatus({
  id,
  status,
}: {
  id: string;
  status: Order["status"];
}): Promise<{ success: boolean }> {
  await delay();

  const order = mockOrders.find((item) => item.id === id);

  if (!order) {
    throw new Error("Order not found.");
  }

  order.status = status;
  return { success: true };
}

export async function updateTracking({
  id,
  tracking,
}: {
  id: string;
  tracking: string;
}): Promise<{ success: boolean }> {
  await delay();

  const order = mockOrders.find((item) => item.id === id);

  if (!order) {
    throw new Error("Order not found.");
  }

  order.tracking = tracking;
  return { success: true };
}

export async function processRefund({
  id,
}: {
  id: string;
}): Promise<{ success: boolean }> {
  return updateOrderStatus({ id, status: "refunded" });
}

export async function processReturn({
  id,
}: {
  id: string;
}): Promise<{ success: boolean }> {
  return updateOrderStatus({ id, status: "returned" });
}

// ==================== VENDOR DASHBOARD ====================

export async function fetchVendorDashboardStats(): Promise<VendorDashboardStats> {
  await delay();

  const vendorOrders: VendorOrder[] = mockOrders.map((order) => ({
    id: order.id,
    customerName: order.customerName,
    amount: order.total,
    status: order.status,
    date: order.date,
  }));

  return {
    totalRevenue: vendorOrders
      .filter((order) => order.status !== "cancelled" && order.status !== "refunded")
      .reduce((total, order) => total + order.amount, 0),
    totalOrders: vendorOrders.length,
    totalProducts: mockVendorProducts.length,
    pendingOrders: vendorOrders.filter(
      (order) => order.status === "pending" || order.status === "processing"
    ).length,
  };
}

export async function fetchVendorOrders({
  page = 1,
  limit = 5,
}: {
  page?: number;
  limit?: number;
} = {}) {
  await delay();

  const items: VendorOrder[] = mockOrders.map((order) => ({
    id: order.id,
    customerName: order.customerName,
    amount: order.total,
    status: order.status,
    date: order.date,
  }));

  return getPage(items, page, limit);
}

export async function fetchVendorProducts({
  page = 1,
  limit = 5,
}: {
  page?: number;
  limit?: number;
} = {}) {
  await delay();
  return getPage([...mockVendorProducts], page, limit);
}

export async function exportVendorCSV() {
  const orders = await fetchVendorOrders({ page: 1, limit: 1000 });

  return exportRows(
    "vendor-orders",
    orders.items.map((order) => ({
      orderId: order.id,
      customer: order.customerName,
      amount: order.amount,
      status: order.status,
      date: order.date,
    })),
    "csv"
  );
}

export async function exportVendorExcel() {
  const products = await fetchVendorProducts({ page: 1, limit: 1000 });

  return exportRows(
    "vendor-products",
    products.items.map((product) => ({
      productId: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock,
      status: product.status,
    })),
    "excel"
  );
}

export async function exportVendorPDF() {
  const stats = await fetchVendorDashboardStats();

  return exportRows(
    "vendor-dashboard-report",
    [
      {
        totalRevenue: stats.totalRevenue,
        totalOrders: stats.totalOrders,
        totalProducts: stats.totalProducts,
        pendingOrders: stats.pendingOrders,
      },
    ],
    "pdf"
  );
}

// ==================== NOTIFICATION MANAGER ====================

const mockNotifications: Notification[] = [
  {
    id: "NOT-1001",
    title: "New Vendor Application",
    message: "A vendor application is ready for review.",
    status: "unread",
    createdAt: "2026-10-03T09:30:00.000Z",
  },
  {
    id: "NOT-1002",
    title: "Low Stock Alert",
    message: "Three products are below their reorder threshold.",
    status: "read",
    createdAt: "2026-10-02T12:15:00.000Z",
  },
];

export async function fetchSystemNotifications({
  page = 1,
  search = "",
  status = "all",
}: {
  page?: number;
  search?: string;
  status?: string;
} = {}): Promise<{ items: Notification[]; total: number }> {
  await delay();

  let items = [...mockNotifications];

  if (search.trim()) {
    items = items.filter((notification) =>
      `${notification.title} ${notification.message}`.toLowerCase().includes(
        search.trim().toLowerCase()
      )
    );
  }

  if (status !== "all") {
    items = items.filter((notification) => notification.status === status);
  }

  const result = getPage(items, page);
  return { items: result.items, total: result.total };
}

export async function fetchAlerts(): Promise<{ items: Alert[] }> {
  await delay();

  return {
    items: [
      {
        id: "ALT-1001",
        message: "Inventory needs attention for 3 products.",
        severity: "high",
        createdAt: "2026-10-03T08:00:00.000Z",
      },
    ],
  };
}

export async function updateNotificationStatus({
  id,
  status,
}: {
  id: string;
  status: "read" | "unread";
}): Promise<{ success: boolean }> {
  await delay();

  const notification = mockNotifications.find((item) => item.id === id);

  if (!notification) {
    throw new Error("Notification not found.");
  }

  notification.status = status;
  return { success: true };
}

export async function resendNotification({
  id,
}: {
  id: string;
}): Promise<{ success: boolean }> {
  await delay();

  if (!mockNotifications.some((item) => item.id === id)) {
    throw new Error("Notification not found.");
  }

  return { success: true };
}

export async function exportNotificationsCSV() {
  return exportRows("system-notifications", mockNotifications, "csv");
}

export async function exportNotificationsExcel() {
  return exportRows("system-notifications", mockNotifications, "excel");
}

export async function exportNotificationsPDF() {
  return exportRows("system-notifications", mockNotifications, "pdf");
}

// ==================== SUPPORT MANAGER ====================

const mockTickets: SupportTicket[] = [
  {
    id: "TKT-1001",
    subject: "Payment confirmation pending",
    customer: "Riya Verma",
    status: "open",
    createdAt: "2026-10-02T11:00:00.000Z",
  },
];

const mockComplaints: Complaint[] = [
  {
    id: "CMP-1001",
    issue: "Received a damaged product",
    customer: "Aditya Rao",
    status: "investigating",
    createdAt: "2026-10-01T10:30:00.000Z",
  },
];

export async function fetchSupportTickets({
  page = 1,
  status = "all",
}: {
  page?: number;
  status?: string;
} = {}): Promise<{ items: SupportTicket[] }> {
  await delay();

  const items =
    status === "all"
      ? mockTickets
      : mockTickets.filter((ticket) => ticket.status === status);

  return { items: getPage(items, page).items };
}

export async function fetchComplaints({
  page = 1,
  status = "all",
}: {
  page?: number;
  status?: string;
} = {}): Promise<{ items: Complaint[] }> {
  await delay();

  const items =
    status === "all"
      ? mockComplaints
      : mockComplaints.filter((complaint) => complaint.status === status);

  return { items: getPage(items, page).items };
}

export async function updateTicketStatus({
  id,
  status,
}: {
  id: string;
  status: SupportTicket["status"];
}): Promise<{ success: boolean }> {
  await delay();

  const ticket = mockTickets.find((item) => item.id === id);

  if (!ticket) {
    throw new Error("Support ticket not found.");
  }

  ticket.status = status;
  return { success: true };
}

export async function updateComplaintStatus({
  id,
  status,
}: {
  id: string;
  status: Complaint["status"];
}): Promise<{ success: boolean }> {
  await delay();

  const complaint = mockComplaints.find((item) => item.id === id);

  if (!complaint) {
    throw new Error("Complaint not found.");
  }

  complaint.status = status;
  return { success: true };
}

export async function exportSupportCSV() {
  return exportRows("support-tickets", mockTickets, "csv");
}

export async function exportSupportExcel() {
  return exportRows("support-tickets", mockTickets, "excel");
}

export async function exportSupportPDF() {
  return exportRows("support-tickets", mockTickets, "pdf");
}

// ==================== INVENTORY MANAGER ====================

const mockInventory: InventoryProduct[] = [
  {
    id: "INV-1001",
    name: "Premium Wireless Earbuds",
    sku: "WJ-EAR-001",
    stock: 42,
    status: "in_stock",
  },
  {
    id: "INV-1002",
    name: "Noise Cancelling Headphones",
    sku: "WJ-HDP-002",
    stock: 4,
    status: "low_stock",
  },
  {
    id: "INV-1003",
    name: "USB-C Fast Charging Cable",
    sku: "WJ-CBL-003",
    stock: 0,
    status: "out_of_stock",
  },
];

const mockWarehouses: Warehouse[] = [
  {
    id: "WH-1001",
    name: "Mumbai Fulfillment Center",
    location: "Bhiwandi, Maharashtra",
    status: "active",
    capacity: 12000,
  },
];

export async function fetchInventoryOverview() {
  await delay();

  return {
    totalProducts: mockInventory.length,
    lowStock: mockInventory.filter((item) => item.status === "low_stock").length,
    outOfStock: mockInventory.filter((item) => item.status === "out_of_stock")
      .length,
    warehouses: mockWarehouses.length,
    alerts: mockInventory
      .filter((item) => item.status !== "in_stock")
      .map((item) => `${item.name} needs stock attention.`),
  };
}

export async function fetchLowStockProducts({
  page = 1,
}: {
  page?: number;
} = {}): Promise<{ items: InventoryProduct[] }> {
  await delay();

  return {
    items: getPage(
      mockInventory.filter((item) => item.status === "low_stock"),
      page
    ).items,
  };
}

export async function fetchOutOfStockProducts({
  page = 1,
}: {
  page?: number;
} = {}): Promise<{ items: InventoryProduct[] }> {
  await delay();

  return {
    items: getPage(
      mockInventory.filter((item) => item.status === "out_of_stock"),
      page
    ).items,
  };
}

export async function fetchWarehouseStatus(): Promise<{ items: Warehouse[] }> {
  await delay();
  return { items: [...mockWarehouses] };
}

export async function updateStockLevel({
  id,
  stock,
}: {
  id: string;
  stock: number;
}): Promise<{ success: boolean }> {
  await delay();

  const item = mockInventory.find((product) => product.id === id);

  if (!item) {
    throw new Error("Inventory product not found.");
  }

  item.stock = Math.max(0, stock);
  item.status =
    item.stock === 0
      ? "out_of_stock"
      : item.stock <= 5
        ? "low_stock"
        : "in_stock";

  return { success: true };
}

export async function exportInventoryCSV() {
  return exportRows("inventory-report", mockInventory, "csv");
}

export async function exportInventoryExcel() {
  return exportRows("inventory-report", mockInventory, "excel");
}

export async function exportInventoryPDF() {
  return exportRows("inventory-report", mockInventory, "pdf");
}

// ==================== MARKETING MANAGER ====================

const mockCampaigns: Campaign[] = [
  {
    id: "CMPGN-1001",
    name: "Diwali Premium Sale",
    status: "active",
    startDate: "2026-10-01",
    endDate: "2026-10-31",
  },
];

const mockPromotions: Promotion[] = [
  {
    id: "PROMO-1001",
    title: "First Order Special",
    discount: "10% OFF",
    status: "active",
  },
];

const mockCoupons: Coupon[] = [
  {
    id: "CPN-1001",
    code: "WISH10",
    discount: "10% OFF",
    usage: 138,
    status: "active",
  },
];

export async function fetchCampaigns(): Promise<{ items: Campaign[] }> {
  await delay();
  return { items: [...mockCampaigns] };
}

export async function fetchPromotions(): Promise<{ items: Promotion[] }> {
  await delay();
  return { items: [...mockPromotions] };
}

export async function fetchCoupons(): Promise<{ items: Coupon[] }> {
  await delay();
  return { items: [...mockCoupons] };
}

export async function fetchMarketingPerformance() {
  await delay();

  return {
    campaignsActive: mockCampaigns.filter((item) => item.status === "active")
      .length,
    campaignsScheduled: mockCampaigns.filter((item) => item.status === "draft")
      .length,
    promotionsActive: mockPromotions.filter((item) => item.status === "active")
      .length,
    couponsActive: mockCoupons.filter((item) => item.status === "active").length,
    conversionRate: 4.8,
    revenueImpact: 245000,
  };
}

export async function createCampaign({
  name,
  startDate,
  endDate,
}: {
  name: string;
  startDate: string;
  endDate: string;
}): Promise<{ success: boolean; id: string }> {
  await delay();

  const id = createId("CMPGN");

  mockCampaigns.unshift({
    id,
    name,
    startDate,
    endDate,
    status: "draft",
  });

  return { success: true, id };
}

export async function updateCampaign({
  id,
  updates,
}: {
  id: string;
  updates: Partial<Campaign>;
}): Promise<{ success: boolean }> {
  await delay();

  const campaign = mockCampaigns.find((item) => item.id === id);

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  Object.assign(campaign, updates);
  return { success: true };
}

export async function deleteCampaign({
  id,
}: {
  id: string;
}): Promise<{ success: boolean }> {
  await delay();

  const index = mockCampaigns.findIndex((item) => item.id === id);

  if (index === -1) {
    throw new Error("Campaign not found.");
  }

  mockCampaigns.splice(index, 1);
  return { success: true };
}

export async function exportMarketingCSV() {
  return exportRows("marketing-campaigns", mockCampaigns, "csv");
}

export async function exportMarketingExcel() {
  return exportRows("marketing-campaigns", mockCampaigns, "excel");
}

export async function exportMarketingPDF() {
  return exportRows("marketing-campaigns", mockCampaigns, "pdf");
}

// ==================== REPORTS MANAGER ====================

const mockReports: Report[] = [
  {
    id: "RPT-1001",
    type: "Sales",
    title: "Monthly Sales Overview",
    description: "Sales and revenue summary for the current month.",
    createdAt: "2026-10-03T08:00:00.000Z",
    status: "completed",
  },
  {
    id: "RPT-1002",
    type: "Inventory",
    title: "Low Stock Monitoring",
    description: "Products that need inventory replenishment.",
    createdAt: "2026-10-02T08:00:00.000Z",
    status: "completed",
  },
];

export async function fetchReports(): Promise<{ items: Report[] }> {
  await delay();
  return { items: [...mockReports] };
}

export async function exportReportsCSV() {
  return exportRows("wish-jinny-reports", mockReports, "csv");
}

export async function exportReportsExcel() {
  return exportRows("wish-jinny-reports", mockReports, "excel");
}

export async function exportReportsPDF() {
  return exportRows("wish-jinny-reports", mockReports, "pdf");
}

// ==================== THEME, LAYOUT AND UX ====================

const mockThemes: Theme[] = [
  {
    id: "THEME-1001",
    name: "Wish Jinny Premium",
    settings: {
      primaryColor: "#4338ca",
      accentColor: "#fbbf24",
      darkMode: false,
    },
  },
];

const mockLayouts: Layout[] = [
  {
    id: "LAYOUT-1001",
    name: "Marketplace Default",
    settings: {
      headerStyle: "premium",
      productGridColumns: 4,
      stickyHeader: true,
    },
  },
];

const mockAccessibilitySettings: AccessibilitySetting[] = [
  {
    id: "A11Y-1001",
    name: "High contrast mode",
    enabled: false,
  },
  {
    id: "A11Y-1002",
    name: "Keyboard navigation support",
    enabled: true,
  },
];

export async function fetchThemes(): Promise<{ items: Theme[] }> {
  await delay();
  return { items: [...mockThemes] };
}

export async function fetchLayouts(): Promise<{ items: Layout[] }> {
  await delay();
  return { items: [...mockLayouts] };
}

export async function fetchAccessibilitySettings(): Promise<{
  items: AccessibilitySetting[];
}> {
  await delay();
  return { items: [...mockAccessibilitySettings] };
}

export async function updateTheme({
  id,
  settings,
}: {
  id: string;
  settings: Record<string, unknown>;
}): Promise<{ success: boolean }> {
  await delay();

  const theme = mockThemes.find((item) => item.id === id);

  if (!theme) {
    throw new Error("Theme not found.");
  }

  theme.settings = { ...theme.settings, ...settings };
  return { success: true };
}

export async function updateLayout({
  id,
  settings,
}: {
  id: string;
  settings: Record<string, unknown>;
}): Promise<{ success: boolean }> {
  await delay();

  const layout = mockLayouts.find((item) => item.id === id);

  if (!layout) {
    throw new Error("Layout not found.");
  }

  layout.settings = { ...layout.settings, ...settings };
  return { success: true };
}

export async function updateAccessibilitySetting({
  id,
  enabled,
}: {
  id: string;
  enabled: boolean;
}): Promise<{ success: boolean }> {
  await delay();

  const setting = mockAccessibilitySettings.find((item) => item.id === id);

  if (!setting) {
    throw new Error("Accessibility setting not found.");
  }

  setting.enabled = enabled;
  return { success: true };
}

// ==================== INTEGRATIONS ====================

const mockIntegrations: Integration[] = [
  {
    id: "INT-1001",
    name: "Razorpay",
    type: "Payments",
    status: "active",
  },
  {
    id: "INT-1002",
    name: "Shiprocket",
    type: "Shipping",
    status: "active",
  },
  {
    id: "INT-1003",
    name: "Google Analytics",
    type: "Analytics",
    status: "inactive",
  },
];

export async function fetchIntegrations(): Promise<{ items: Integration[] }> {
  await delay();
  return { items: [...mockIntegrations] };
}

export async function updateIntegrationStatus({
  id,
  status,
}: {
  id: string;
  status: Integration["status"];
}): Promise<{ success: boolean }> {
  await delay();

  const integration = mockIntegrations.find((item) => item.id === id);

  if (!integration) {
    throw new Error("Integration not found.");
  }

  integration.status = status;
  return { success: true };
}

// ==================== AUDIT LOGS ====================

const mockAuditLogs: AuditLog[] = [
  {
    id: "AUD-1001",
    eventId: "EVT-9001",
    action: "Vendor approved",
    resourceType: "vendor",
    resourceId: "VEN-1001",
    userId: "USR-1",
    userName: "Super Admin",
    userRole: "super_admin",
    status: "success",
    date: "2026-10-03",
    time: "10:15 AM",
    securitySensitive: true,
    voiceConfirmed: true,
  },
];

export async function fetchAuditLogs({
  page = 1,
  search = "",
}: {
  page?: number;
  search?: string;
} = {}): Promise<{ items: AuditLog[]; total: number }> {
  await delay();

  const items = search.trim()
    ? mockAuditLogs.filter((log) =>
        `${log.action} ${log.userName} ${log.resourceType}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      )
    : mockAuditLogs;

  const result = getPage(items, page);
  return { items: result.items, total: result.total };
}

export async function exportAuditLogsCSV() {
  return exportRows("audit-logs", mockAuditLogs, "csv");
}

export async function exportAuditLogsExcel() {
  return exportRows("audit-logs", mockAuditLogs, "excel");
}

export async function exportAuditLogsPDF() {
  return exportRows("audit-logs", mockAuditLogs, "pdf");
}

// ==================== PAYMENTS, SETTLEMENTS AND REFUNDS ====================

const mockPayments: Payment[] = [
  {
    id: "PAY-1001",
    orderId: "WJ-1001",
    amount: 2249,
    status: "completed",
    method: "UPI",
    date: "2026-10-03",
  },
];

const mockSettlements: Settlement[] = [
  {
    id: "SET-1001",
    vendorId: "VEN-1001",
    vendorName: "TechNova Store",
    amount: 18420,
    status: "pending",
    date: "2026-10-03",
  },
];

const mockRefunds: Refund[] = [
  {
    id: "REF-1001",
    orderId: "WJ-0995",
    amount: 1299,
    reason: "Damaged item",
    status: "pending",
    date: "2026-10-01",
  },
];

export async function fetchPayments(): Promise<{ items: Payment[] }> {
  await delay();
  return { items: [...mockPayments] };
}

export async function fetchSettlements(): Promise<{ items: Settlement[] }> {
  await delay();
  return { items: [...mockSettlements] };
}

export async function fetchRefunds(): Promise<{ items: Refund[] }> {
  await delay();
  return { items: [...mockRefunds] };
}

export async function updateRefundStatus({
  id,
  status,
}: {
  id: string;
  status: Refund["status"];
}): Promise<{ success: boolean }> {
  await delay();

  const refund = mockRefunds.find((item) => item.id === id);

  if (!refund) {
    throw new Error("Refund not found.");
  }

  refund.status = status;
  return { success: true };
}

// ==================== VENDOR AND USER MANAGEMENT ====================

const mockVendors: Vendor[] = [
  {
    id: "VEN-1001",
    name: "TechNova Store",
    email: "support@technova.example",
    status: "active",
    createdAt: "2026-09-20",
  },
  {
    id: "VEN-1002",
    name: "StyleNest",
    email: "hello@stylenest.example",
    status: "pending",
    createdAt: "2026-10-02",
  },
];

const mockUsers: User[] = [
  {
    id: "USR-1001",
    name: "Aarav Sharma",
    email: "aarav@example.com",
    role: "customer",
  },
  {
    id: "USR-1002",
    name: "Meera Kapoor",
    email: "meera@example.com",
    role: "customer",
  },
];

export async function fetchVendors(): Promise<{ items: Vendor[] }> {
  await delay();
  return { items: [...mockVendors] };
}

export async function updateVendorStatus({
  id,
  status,
}: {
  id: string;
  status: Vendor["status"];
}): Promise<{ success: boolean }> {
  await delay();

  const vendor = mockVendors.find((item) => item.id === id);

  if (!vendor) {
    throw new Error("Vendor not found.");
  }

  vendor.status = status;
  return { success: true };
}

export async function fetchUsers(): Promise<{ items: User[] }> {
  await delay();
  return { items: [...mockUsers] };
}

// ==================== AI SETTINGS ====================

let aiSettings: AISettings = {
  chatbotEnabled: true,
  recommendationsEnabled: true,
  autoResponsesEnabled: false,
};

export async function fetchAISettings(): Promise<AISettings> {
  await delay();
  return { ...aiSettings };
}

export async function updateAISettings({
  settings,
}: {
  settings: Partial<AISettings>;
}): Promise<{ success: boolean }> {
  await delay();
  aiSettings = { ...aiSettings, ...settings };
  return { success: true };
}

export { API_BASE_URL };