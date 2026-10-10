// src/admin/AnalyticsManager.jsx

import { useEffect, useMemo, useRef, useState } from "react";

function AnalyticsManager() {
  const [selectedRange, setSelectedRange] = useState("30d");
  const [lastUpdated, setLastUpdated] = useState("Just now");
  const refreshTimer = useRef(null);

  const analyticsByRange = {
    "7d": {
      revenue: 48250,
      orders: 128,
      customers: 94,
      conversion: 3.8,
      revenueChange: 12.4,
      ordersChange: 8.7,
      customersChange: 10.2,
      conversionChange: 0.6,
      chart: [
        { label: "Mon", value: 4200 },
        { label: "Tue", value: 5900 },
        { label: "Wed", value: 5100 },
        { label: "Thu", value: 7200 },
        { label: "Fri", value: 8300 },
        { label: "Sat", value: 9100 },
        { label: "Sun", value: 8450 },
      ],
    },
    "30d": {
      revenue: 198450,
      orders: 586,
      customers: 412,
      conversion: 4.2,
      revenueChange: 18.6,
      ordersChange: 14.8,
      customersChange: 21.3,
      conversionChange: 0.9,
      chart: [
        { label: "Week 1", value: 38600 },
        { label: "Week 2", value: 45750 },
        { label: "Week 3", value: 52400 },
        { label: "Week 4", value: 61700 },
      ],
    },
    "90d": {
      revenue: 562800,
      orders: 1689,
      customers: 1128,
      conversion: 4.5,
      revenueChange: 26.2,
      ordersChange: 23.4,
      customersChange: 29.1,
      conversionChange: 1.1,
      chart: [
        { label: "Month 1", value: 158400 },
        { label: "Month 2", value: 184200 },
        { label: "Month 3", value: 220200 },
      ],
    },
  };

  const categoryPerformance = [
    {
      name: "Beauty & Skincare",
      sales: 64100,
      share: 32,
      color: "from-pink-500 to-rose-500",
    },
    {
      name: "Fashion",
      sales: 49600,
      share: 25,
      color: "from-purple-500 to-violet-600",
    },
    {
      name: "Jewellery",
      sales: 39700,
      share: 20,
      color: "from-amber-400 to-yellow-500",
    },
    {
      name: "Toys & Kids",
      sales: 27300,
      share: 14,
      color: "from-sky-500 to-cyan-500",
    },
    {
      name: "Everyday Essentials",
      sales: 17750,
      share: 9,
      color: "from-indigo-500 to-blue-600",
    },
  ];

  const topProducts = [
    {
      rank: 1,
      name: "Radiance Glow Skincare Kit",
      category: "Beauty & Skincare",
      sold: 142,
      revenue: 28350,
      badge: "Best seller",
    },
    {
      rank: 2,
      name: "Golden Aura Jewellery Set",
      category: "Jewellery",
      sold: 98,
      revenue: 24680,
      badge: "Trending",
    },
    {
      rank: 3,
      name: "Everyday Chic Handbag",
      category: "Fashion",
      sold: 116,
      revenue: 22150,
      badge: "Popular",
    },
    {
      rank: 4,
      name: "Magic Learning Toy Box",
      category: "Toys & Kids",
      sold: 87,
      revenue: 17340,
      badge: "Rising",
    },
  ];

  const recentOrders = [
    {
      id: "#WJ-10852",
      customer: "Aarav Sharma",
      amount: 2499,
      status: "Delivered",
      time: "12 minutes ago",
    },
    {
      id: "#WJ-10851",
      customer: "Priya Mehta",
      amount: 1899,
      status: "Processing",
      time: "28 minutes ago",
    },
    {
      id: "#WJ-10850",
      customer: "Riya Kapoor",
      amount: 3499,
      status: "Shipped",
      time: "46 minutes ago",
    },
    {
      id: "#WJ-10849",
      customer: "Kabir Singh",
      amount: 1299,
      status: "Pending",
      time: "1 hour ago",
    },
    {
      id: "#WJ-10848",
      customer: "Ananya Verma",
      amount: 2799,
      status: "Delivered",
      time: "1 hour ago",
    },
  ];

  const rangeLabel = {
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "90d": "Last 90 days",
  };

  const data = analyticsByRange[selectedRange];

  const maxChartValue = useMemo(() => {
    return Math.max(...data.chart.map((item) => item.value), 1);
  }, [data]);

  useEffect(() => {
    return () => {
      if (refreshTimer.current) {
        window.clearTimeout(refreshTimer.current);
      }
    };
  }, []);

  const formatCurrency = (value) => {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
  };

  const handleRefresh = () => {
    if (refreshTimer.current) {
      window.clearTimeout(refreshTimer.current);
    }

    setLastUpdated("Refreshing...");

    refreshTimer.current = window.setTimeout(() => {
      setLastUpdated("Just now");
      refreshTimer.current = null;
    }, 500);
  };

  const handleViewOrders = () => {
    window.location.href = "/admin/orders";
  };

  const statusClass = (status) => {
    const styles = {
      Delivered: "bg-emerald-100 text-emerald-700",
      Processing: "bg-violet-100 text-violet-700",
      Shipped: "bg-sky-100 text-sky-700",
      Pending: "bg-amber-100 text-amber-700",
    };

    return styles[status] || "bg-slate-100 text-slate-700";
  };

  const stats = [
    {
      title: "Total Revenue",
      value: formatCurrency(data.revenue),
      change: `+${data.revenueChange}%`,
      description: "vs previous period",
      icon: "₹",
      iconClass: "bg-indigo-100 text-indigo-700",
    },
    {
      title: "Total Orders",
      value: data.orders.toLocaleString("en-IN"),
      change: `+${data.ordersChange}%`,
      description: "vs previous period",
      icon: "◫",
      iconClass: "bg-purple-100 text-purple-700",
    },
    {
      title: "New Customers",
      value: data.customers.toLocaleString("en-IN"),
      change: `+${data.customersChange}%`,
      description: "vs previous period",
      icon: "♙",
      iconClass: "bg-pink-100 text-pink-700",
    },
    {
      title: "Conversion Rate",
      value: `${data.conversion}%`,
      change: `+${data.conversionChange}%`,
      description: "vs previous period",
      icon: "%",
      iconClass: "bg-yellow-100 text-amber-700",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-800 to-purple-800 p-6 text-white shadow-xl sm:p-8">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-yellow-300/20 blur-3xl" />
          <div className="absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-fuchsia-400/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-400 text-xl font-black text-indigo-950 shadow-lg">
                  ✦
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-300">
                    Wish Jinny Admin
                  </p>
                  <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                    Analytics Manager
                  </h1>
                </div>
              </div>

              <p className="mt-5 max-w-2xl text-sm leading-6 text-indigo-100 sm:text-base">
                Track sales, orders, customer growth and the wishes becoming
                reality across your magical marketplace.
              </p>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Dashboard updated: {lastUpdated}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex rounded-xl bg-white/10 p-1 backdrop-blur-sm">
                {Object.keys(rangeLabel).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setSelectedRange(range)}
                    className={`rounded-lg px-3 py-2 text-xs font-bold transition sm:px-4 ${
                      selectedRange === range
                        ? "bg-yellow-400 text-indigo-950 shadow"
                        : "text-indigo-100 hover:bg-white/10"
                    }`}
                  >
                    {rangeLabel[range]}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                className="rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
              >
                Refresh Data
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <article
              key={stat.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    {stat.title}
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-900">
                    {stat.value}
                  </p>
                </div>

                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black ${stat.iconClass}`}
                >
                  {stat.icon}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs">
                <span className="font-bold text-emerald-600">{stat.change}</span>
                <span className="text-slate-400">{stat.description}</span>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2 sm:p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-bold text-indigo-700">
                  Revenue Overview
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-900">
                  Sales performance for {rangeLabel[selectedRange].toLowerCase()}
                </h2>
              </div>

              <div className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
                {formatCurrency(data.revenue)} total
              </div>
            </div>

            <div className="mt-8 flex h-64 items-end gap-3 border-b border-slate-200 pb-8 sm:gap-5">
              {data.chart.map((item) => {
                const height = Math.max(
                  (item.value / maxChartValue) * 100,
                  8
                );

                return (
                  <div
                    key={item.label}
                    className="group flex min-w-0 flex-1 flex-col items-center justify-end"
                  >
                    <div className="relative flex h-52 w-full items-end justify-center">
                      <div className="absolute -top-8 hidden rounded-lg bg-indigo-950 px-2 py-1 text-[10px] font-bold text-white shadow-lg group-hover:block">
                        {formatCurrency(item.value)}
                      </div>

                      <div
                        className="w-full max-w-12 rounded-t-xl bg-gradient-to-t from-indigo-700 via-purple-600 to-yellow-400 transition duration-300 group-hover:brightness-110"
                        style={{ height: `${height}%` }}
                      />
                    </div>

                    <p className="mt-3 truncate text-center text-[11px] font-semibold text-slate-500 sm:text-xs">
                      {item.label}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-700" />
                Revenue trend
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                Wish Jinny performance
              </span>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-purple-700">
                  Store Health
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-900">
                  Quick insights
                </h2>
              </div>

              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                Healthy
              </span>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-600">
                    Order fulfillment
                  </span>
                  <span className="font-black text-slate-900">92%</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-600">
                    Customer satisfaction
                  </span>
                  <span className="font-black text-slate-900">4.8/5</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-[96%] rounded-full bg-gradient-to-r from-yellow-400 to-amber-500" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-600">
                    Returning customers
                  </span>
                  <span className="font-black text-slate-900">38%</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-[38%] rounded-full bg-gradient-to-r from-indigo-500 to-purple-600" />
                </div>
              </div>
            </div>

            <div className="mt-7 rounded-2xl bg-gradient-to-br from-yellow-50 to-amber-100 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">
                Genie Insight
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-amber-950">
                Beauty & Skincare is your strongest category. Feature it in the
                next magical offer campaign.
              </p>
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-indigo-700">
                  Category Performance
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-900">
                  Where customers are shopping
                </h2>
              </div>

              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                By revenue
              </span>
            </div>

            <div className="mt-7 space-y-5">
              {categoryPerformance.map((category) => (
                <div key={category.name}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-slate-700">
                      {category.name}
                    </span>
                    <span className="font-black text-slate-900">
                      {formatCurrency(category.sales)}
                    </span>
                  </div>

                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${category.color}`}
                      style={{ width: `${category.share}%` }}
                    />
                  </div>

                  <p className="mt-1 text-xs font-medium text-slate-400">
                    {category.share}% of total revenue
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-purple-700">
                  Top Products
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-900">
                  Best-performing wishes
                </h2>
              </div>

              <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
                Top 4
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {topProducts.map((product) => (
                <div
                  key={product.rank}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 transition hover:border-indigo-100 hover:bg-indigo-50/40"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-700 to-purple-700 text-sm font-black text-white">
                    {product.rank}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-800">
                      {product.name}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {product.category} · {product.sold} sold
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="rounded-full bg-yellow-100 px-2 py-1 text-[10px] font-black text-amber-700">
                      {product.badge}
                    </span>
                    <p className="mt-2 text-sm font-black text-indigo-700">
                      {formatCurrency(product.revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-bold text-indigo-700">
                Recent Orders
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-900">
                Latest Wish Jinny activity
              </h2>
            </div>

            <button
              type="button"
              onClick={handleViewOrders}
              className="rounded-xl border border-indigo-200 px-4 py-2.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
            >
              View All Orders
            </button>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="rounded-l-xl px-4 py-3 font-bold">Order</th>
                  <th className="px-4 py-3 font-bold">Customer</th>
                  <th className="px-4 py-3 font-bold">Amount</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="rounded-r-xl px-4 py-3 font-bold">Time</th>
                </tr>
              </thead>

              <tbody>
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-slate-100 text-sm last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-4 font-black text-indigo-700">
                      {order.id}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-700">
                      {order.customer}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-black text-slate-900">
                      {formatCurrency(order.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                      {order.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

export default AnalyticsManager;