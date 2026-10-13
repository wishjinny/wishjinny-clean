// src/App.jsx

import { Component, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import MainLayout from "./layouts/MainLayout";
import Header from "./components/Header";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import JinnyAI from "./components/JinnyAI";
import VoiceAssistant from "./components/VoiceAssistant";

import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Categories from "./pages/Categories";
import ProductDetails from "./pages/ProductDetails";
import Search from "./pages/Search";
import Wishlist from "./pages/Wishlist";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Payment from "./pages/Payment";
import OrderSuccess from "./pages/OrderSuccess";
import Orders from "./pages/Orders";
import OrderDetails from "./pages/OrderDetails";
import Account from "./pages/Account";
import Login from "./pages/Login";
import Register from "./pages/Register";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Refund from "./pages/Refund";
import Shipping from "./pages/Shipping";
import NotFound from "./pages/NotFound";

import { AdminDataProvider, useAdminData } from "./admin/AdminData";
import AdminLogin from "./admin/AdminLogin";
import AdminLayout from "./admin/AdminLayout";
import AdminDashboard from "./admin/AdminDashboard";

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      errorMessage: "",
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || "Something went wrong.",
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Wish Jinny app render error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-amber-50 px-5 py-10">
          <div className="w-full max-w-lg rounded-3xl border border-indigo-100 bg-white p-7 text-center shadow-2xl shadow-indigo-100/60 sm:p-10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-700 to-violet-600 text-4xl shadow-lg">
              🧞
            </div>

            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
              Wish Jinny
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              We need a moment
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Page load karte waqt ek problem aa gayi. Aap Home page par
              wapas ja sakte hain ya page reload kar sakte hain.
            </p>

            {this.state.errorMessage && (
              <p className="mt-5 break-words rounded-xl border border-red-100 bg-red-50 p-3 text-left text-xs leading-5 text-red-700">
                {this.state.errorMessage}
              </p>
            )}

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={this.handleGoHome}
                className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-800 hover:shadow-lg"
              >
                Go to Home
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-900 shadow-md transition hover:bg-amber-300 hover:shadow-lg"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [pathname]);

  return null;
}

function AdminRoutes() {
  const { data } = useAdminData();

  const isLoggedIn =
    localStorage.getItem("wishjinny_admin_logged_in") === "yes";

  if (!isLoggedIn) {
    return <AdminLogin />;
  }

  return (
    <Routes>
      <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="products" element={<AdminDashboard />} />
        <Route path="products/new" element={<AdminDashboard />} />
        <Route path="about" element={<AdminDashboard />} />
        <Route path="contact" element={<AdminDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/admin/dashboard" />} />
    </Routes>
  );
}

function AppRoutes() {
  const { pathname } = useLocation();

  const isAdminRoute = pathname.startsWith("/admin");

  return (
    <>
      <ScrollToTop />

      {isAdminRoute ? (
        <AdminRoutes />
      ) : (
        <MainLayout>
          <Header />
          <Navbar />

          <main className="min-h-[60vh]">
            <Routes>
              <Route path="/" element={<Home />} />

              <Route path="/shop" element={<Shop />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/product/:id" element={<ProductDetails />} />
              <Route path="/search" element={<Search />} />

              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/payment" element={<Payment />} />

              <Route path="/order-success" element={<OrderSuccess />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/:id" element={<OrderDetails />} />

              <Route path="/account" element={<Account />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />

              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/refund" element={<Refund />} />
              <Route path="/shipping" element={<Shipping />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>

          <Footer />

          <JinnyAI />
          <VoiceAssistant />
        </MainLayout>
      )}
    </>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <AdminDataProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AdminDataProvider>
    </AppErrorBoundary>
  );
}

export default App;
