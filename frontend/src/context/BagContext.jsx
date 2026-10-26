import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { PRODUCTS_MAP, getProductById, formatPriceINR } from '../data/products.js';
import { fetchProducts } from '../utils/api.js';

const BagContext = createContext(null);

const STORAGE_KEY = 'aurevella_bag';
const DYNAMIC_STORAGE_KEY = 'aurevella_bag_dynamic_meta';

export const BagProvider = ({ children }) => {
  // Raw items array stored in localStorage: [{ id: 'prod-01', quantity: 1 }]
  // ONLY product IDs and quantities are stored; NEVER sensitive data or arbitrary prices.
  const [rawItems, setRawItems] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((item) => item && typeof item.id === 'string' && item.id.trim().length > 0)
        .map((item) => ({
          id: item.id.trim(),
          quantity: Math.min(Math.max(1, parseInt(item.quantity, 10) || 1), 10),
        }));
    } catch (_) {
      return [];
    }
  });

  // Dynamic products registry initialized from localStorage cache (for instant offline/reload render)
  const [dynamicCatalogue, setDynamicCatalogue] = useState(() => {
    const map = new Map();
    try {
      const cached = localStorage.getItem(DYNAMIC_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          parsed.forEach((p) => {
            if (p && (p.id || p.code || p._id)) {
              const key = p.code || p.id || p._id;
              map.set(key, p);
              if (p.slug) map.set(p.slug, p);
            }
          });
        }
      }
    } catch (_) {}
    return map;
  });

  const [isBagOpen, setIsBagOpen] = useState(false);

  // Synchronize dynamic catalogue with backend products API on mount
  useEffect(() => {
    let isMounted = true;
    fetchProducts()
      .then((data) => {
        if (!isMounted || !data || !Array.isArray(data.products)) return;
        setDynamicCatalogue((prev) => {
          const next = new Map(prev);
          const metaList = [];
          data.products.forEach((p) => {
            if (p && (p.id || p.code || p._id)) {
              const key = p.code || p.id || p._id;
              next.set(key, p);
              if (p.slug) next.set(p.slug, p);
              metaList.push(p);
            }
          });
          try {
            localStorage.setItem(DYNAMIC_STORAGE_KEY, JSON.stringify(metaList));
          } catch (_) {}
          return next;
        });
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Synchronize raw items with localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rawItems));
    } catch (err) {
      console.warn('Unable to persist shopping bag to localStorage:', err);
    }
  }, [rawItems]);

  // Derive enriched items using only TRUSTED launch catalogue first, then verified dynamic catalogue
  const detailedItems = useMemo(() => {
    return rawItems
      .map((item) => {
        // 1. Authoritative check: Local launch catalogue for canonical models (strictly locks price & media)
        const launchProduct = getProductById(item.id);
        if (launchProduct) {
          return {
            id: launchProduct.id,
            name: launchProduct.name,
            category: launchProduct.category,
            price: launchProduct.price, // Trusted launch price
            priceText: launchProduct.priceText,
            image: launchProduct.image,
            alt: launchProduct.alt,
            quantity: item.quantity,
            lineTotal: launchProduct.price * item.quantity,
            lineTotalText: formatPriceINR(launchProduct.price * item.quantity),
            isLaunchProduct: true,
          };
        }

        // 2. Dynamic catalogue check (from backend API or verified dynamic cache)
        const dynamicProduct = dynamicCatalogue.get(item.id);
        if (dynamicProduct && dynamicProduct.isActive !== false) {
          const price =
            typeof dynamicProduct.price === 'number'
              ? dynamicProduct.price
              : Math.round((dynamicProduct.pricePaise || 0) / 100);
          const resolvedId = dynamicProduct.code || dynamicProduct.id || dynamicProduct._id;
          return {
            id: resolvedId,
            name: dynamicProduct.name,
            category:
              typeof dynamicProduct.category === 'object'
                ? dynamicProduct.category.name
                : dynamicProduct.category || 'Atelier',
            price,
            priceText: dynamicProduct.priceText || formatPriceINR(price),
            image: dynamicProduct.image || '',
            alt: dynamicProduct.alt || dynamicProduct.name,
            quantity: item.quantity,
            lineTotal: price * item.quantity,
            lineTotalText: formatPriceINR(price * item.quantity),
            isLaunchProduct: false,
          };
        }

        // 3. Item is unknown, deleted, or deactivated
        return null;
      })
      .filter(Boolean);
  }, [rawItems, dynamicCatalogue]);

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

  // Detect if any items in rawItems cannot be resolved
  const hasUnavailableItems = useMemo(() => {
    return rawItems.length > detailedItems.length;
  }, [rawItems.length, detailedItems.length]);

  const removeUnavailableItems = () => {
    const validIds = new Set(detailedItems.map((i) => i.id));
    setRawItems((prev) => prev.filter((i) => validIds.has(i.id)));
  };

  // Add product to bag (validates against trusted launch models and verified dynamic catalogue)
  const addToBag = (productId, quantity = 1, productData = null) => {
    if (!productId || typeof productId !== 'string') {
      console.error(`Invalid product ID rejected: ${productId}`);
      return false;
    }

    const trimmedId = productId.trim();

    // Check if it's an authorized launch product
    const isLaunch = PRODUCTS_MAP.has(trimmedId) || getProductById(trimmedId) !== null;

    // Check if known dynamic product
    let isDynamic = dynamicCatalogue.has(trimmedId);

    // If productData passed (from Shop or ProductDetail), register into dynamic catalogue
    if (productData && typeof productData === 'object') {
      const matchKey = productData.code || productData.id || productData._id;
      if (matchKey === trimmedId || productData.slug === trimmedId) {
        isDynamic = true;
        setDynamicCatalogue((prev) => {
          const next = new Map(prev);
          next.set(trimmedId, productData);
          if (productData.code) next.set(productData.code, productData);
          if (productData.id) next.set(productData.id, productData);
          if (productData._id) next.set(productData._id, productData);
          if (productData.slug) next.set(productData.slug, productData);
          try {
            // Deduplicate unique product objects for local persistence
            const uniqueProds = Array.from(new Set(next.values()));
            localStorage.setItem(DYNAMIC_STORAGE_KEY, JSON.stringify(uniqueProds));
          } catch (_) {}
          return next;
        });
      }
    }

    if (!isLaunch && !isDynamic) {
      console.error(`Invalid or unavailable product ID rejected: ${productId}`);
      return false;
    }

    const validQty = Math.min(Math.max(1, parseInt(quantity, 10) || 1), 10);

    setRawItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.id === trimmedId);
      if (existingIdx > -1) {
        const updated = [...prev];
        const newQty = Math.min(10, updated[existingIdx].quantity + validQty);
        updated[existingIdx] = { ...updated[existingIdx], quantity: newQty };
        return updated;
      }
      return [...prev, { id: trimmedId, quantity: validQty }];
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
    hasUnavailableItems,
    removeUnavailableItems,
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
