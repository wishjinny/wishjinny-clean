// src/admin/AdminData.jsx

import { createContext, useContext, useEffect, useState } from "react";

const ADMIN_PASSWORD = "wishjinny2026";

const defaultData = {
  products: [],
  about: {
    title: "Welcome to Wish Jinny",
    subtitle: "Your wishes, beautifully fulfilled.",
    description:
      "Wish Jinny brings you a carefully selected collection of gifts, beauty, fashion and everyday products.",
    imageUrl: "",
  },
  contact: {
    whatsapp: "",
    phone: "",
    email: "",
    address: "",
    instagram: "",
    facebook: "",
  },
};

const AdminDataContext = createContext(null);

export function AdminDataProvider({ children }) {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem("wishjinny_admin_data");
      return saved ? JSON.parse(saved) : defaultData;
    } catch {
      return defaultData;
    }
  });

  useEffect(() => {
    localStorage.setItem("wishjinny_admin_data", JSON.stringify(data));
  }, [data]);

  const updateAbout = (updates) => {
    setData((current) => ({
      ...current,
      about: { ...current.about, ...updates },
    }));
  };

  const updateContact = (updates) => {
    setData((current) => ({
      ...current,
      contact: { ...current.contact, ...updates },
    }));
  };

  const addProduct = (product) => {
    const newProduct = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: "active",
      ...product,
    };

    setData((current) => ({
      ...current,
      products: [newProduct, ...current.products],
    }));

    return newProduct;
  };

  const updateProduct = (productId, updates) => {
    setData((current) => ({
      ...current,
      products: current.products.map((product) =>
        product.id === productId ? { ...product, ...updates } : product
      ),
    }));
  };

  const deleteProduct = (productId) => {
    setData((current) => ({
      ...current,
      products: current.products.filter(
        (product) => product.id !== productId
      ),
    }));
  };

  const value = {
    data,
    adminPassword: ADMIN_PASSWORD,
    updateAbout,
    updateContact,
    addProduct,
    updateProduct,
    deleteProduct,
  };

  return (
    <AdminDataContext.Provider value={value}>
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  const context = useContext(AdminDataContext);

  if (!context) {
    throw new Error("useAdminData must be used inside AdminDataProvider");
  }

  return context;
}
