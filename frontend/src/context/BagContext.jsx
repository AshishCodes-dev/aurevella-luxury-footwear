import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { PRODUCTS_MAP, getProductById, formatPriceINR } from '../data/products.js';

const BagContext = createContext(null);

const STORAGE_KEY = 'aurevella_bag';

export const BagProvider = ({ children }) => {
  // Raw items array stored in localStorage: [{ id: 'prod-01', quantity: 1 }]
  // ONLY product IDs and quantities are stored; NEVER sensitive data or arbitrary prices.
  const [rawItems, setRawItems] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];

      // Validate against trusted product registry
      return parsed
        .filter((item) => item && typeof item.id === 'string' && PRODUCTS_MAP.has(item.id))
        .map((item) => ({
          id: item.id,
          quantity: Math.min(Math.max(1, parseInt(item.quantity, 10) || 1), 10),
        }));
    } catch (_) {
      return [];
    }
  });

  const [isBagOpen, setIsBagOpen] = useState(false);

  // Synchronize raw items with localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rawItems));
    } catch (err) {
      console.warn('Unable to persist shopping bag to localStorage:', err);
    }
  }, [rawItems]);

  // Derive enriched items using only TRUSTED product registry data
  const detailedItems = useMemo(() => {
    return rawItems
      .map((item) => {
        const product = getProductById(item.id);
        if (!product) return null;
        return {
          id: product.id,
          name: product.name,
          category: product.category,
          price: product.price, // Trusted price
          priceText: product.priceText,
          image: product.image,
          alt: product.alt,
          quantity: item.quantity,
          lineTotal: product.price * item.quantity,
          lineTotalText: formatPriceINR(product.price * item.quantity),
        };
      })
      .filter(Boolean);
  }, [rawItems]);

  // Calculate totals
  const totalCount = useMemo(() => {
    return rawItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [rawItems]);

  const subtotal = useMemo(() => {
    return detailedItems.reduce((acc, item) => acc + item.lineTotal, 0);
  }, [detailedItems]);

  const subtotalText = useMemo(() => {
    return formatPriceINR(subtotal);
  }, [subtotal]);

  // Add product to bag (validates against trusted products)
  const addToBag = (productId, quantity = 1) => {
    if (!PRODUCTS_MAP.has(productId)) {
      console.error(`Invalid product ID rejected: ${productId}`);
      return false;
    }

    const validQty = Math.min(Math.max(1, parseInt(quantity, 10) || 1), 10);

    setRawItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.id === productId);
      if (existingIdx > -1) {
        const updated = [...prev];
        const newQty = Math.min(10, updated[existingIdx].quantity + validQty);
        updated[existingIdx] = { ...updated[existingIdx], quantity: newQty };
        return updated;
      }
      return [...prev, { id: productId, quantity: validQty }];
    });

    setIsBagOpen(true);
    return true;
  };

  // Remove product from bag
  const removeFromBag = (productId) => {
    setRawItems((prev) => prev.filter((i) => i.id !== productId));
  };

  // Update item quantity
  const updateQuantity = (productId, newQuantity) => {
    const qty = parseInt(newQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      removeFromBag(productId);
      return;
    }

    const clampedQty = Math.min(Math.max(1, qty), 10);
    setRawItems((prev) =>
      prev.map((i) => (i.id === productId ? { ...i, quantity: clampedQty } : i))
    );
  };

  // Clear entire bag
  const clearBag = () => {
    setRawItems([]);
  };

  const openBag = () => setIsBagOpen(true);
  const closeBag = () => setIsBagOpen(false);
  const toggleBag = () => setIsBagOpen((prev) => !prev);

  const value = {
    items: detailedItems,
    rawItems,
    totalCount,
    subtotal,
    subtotalText,
    isBagOpen,
    addToBag,
    removeFromBag,
    updateQuantity,
    clearBag,
    openBag,
    closeBag,
    toggleBag,
  };

  return <BagContext.Provider value={value}>{children}</BagContext.Provider>;
};

export const useBag = () => {
  const context = useContext(BagContext);
  if (!context) {
    throw new Error('useBag must be used within a BagProvider');
  }
  return context;
};

export default BagContext;
