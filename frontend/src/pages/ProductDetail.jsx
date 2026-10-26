import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShoppingBag,
  ArrowLeft,
  Check,
  ShieldCheck,
  Truck,
  MessageSquare,
  AlertCircle,
  Plus,
  Minus,
} from 'lucide-react';
import { getProductById } from '../data/products.js';
import { fetchProductByIdOrSlug } from '../utils/api.js';
import { useBag } from '../context/BagContext.jsx';
import useDocumentTitle from '../utils/useDocumentTitle.js';

export const ProductDetail = () => {
  const { id } = useParams();
  const { addToBag } = useBag();

  // Initialize with local registry match immediately to avoid layout flicker
  const [product, setProduct] = useState(() => getProductById(id));
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Set accessible document title based on product resolution
  const pageTitle = product
    ? `${product.name} — AUREVELLA Atelier`
    : loading
    ? 'Loading Silhouette — AUREVELLA'
    : 'Model Not Found — AUREVELLA Atelier';
  useDocumentTitle(pageTitle);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const loadProduct = async () => {
      // 1. Check local launch catalogue first (authoritative single source of truth for launch models)
      const localMatch = getProductById(id);
      if (localMatch && isMounted) {
        setProduct(localMatch);
      }

      // 2. Query backend API safely
      try {
        const res = await fetchProductByIdOrSlug(id);
        if (!isMounted) return;

        const apiProd = res?.product;
        if (apiProd && typeof apiProd === 'object') {
          if (localMatch) {
            // Local launch catalogue is strictly authoritative for identity, price, and media.
            // Backend responses must NEVER overwrite trusted local launch data or canonical ID.
            const matchesLocal =
              (apiProd.code && apiProd.code.toLowerCase() === localMatch.id.toLowerCase()) ||
              (apiProd.id && apiProd.id.toLowerCase() === localMatch.id.toLowerCase()) ||
              (apiProd.slug && localMatch.slug && apiProd.slug.toLowerCase() === localMatch.slug.toLowerCase());

            if (matchesLocal) {
              // Merge only safe supplemental attributes, locking canonical local identity and pricing
              setProduct({
                ...localMatch,
                id: localMatch.id, // Strictly preserve canonical launch ID ('prod-01', etc.)
                name: localMatch.name,
                price: localMatch.price,
                priceText: localMatch.priceText,
                category: localMatch.category,
                image: localMatch.image,
                alt: localMatch.alt,
                slug: localMatch.slug,
                link: localMatch.link,
                description: localMatch.description,
                ...(typeof apiProd.stockQuantity === 'number' ? { stockQuantity: apiProd.stockQuantity } : {}),
                ...(typeof apiProd.inStock === 'boolean' ? { inStock: apiProd.inStock } : {}),
              });
            } else {
              // Mismatched backend product: preserve localMatch without overwrite
              setProduct(localMatch);
            }
          } else {
            // No local launch product: normalize backend product if valid
            const rawId = apiProd.code || apiProd.id || apiProd._id;
            if (rawId && apiProd.name && (apiProd.price || apiProd.pricePaise)) {
              const price = apiProd.price || Math.round(apiProd.pricePaise / 100);
              const priceText =
                apiProd.priceText || `₹${price.toLocaleString('en-IN')}`;
              setProduct({
                id: String(rawId),
                name: apiProd.name,
                slug: apiProd.slug || String(rawId),
                category: typeof apiProd.category === 'object' ? apiProd.category.name : apiProd.category || 'Atelier',
                price,
                priceText,
                image: apiProd.image || '',
                alt: apiProd.alt || apiProd.name,
                description: apiProd.description || '',
                ...(typeof apiProd.stockQuantity === 'number' ? { stockQuantity: apiProd.stockQuantity } : {}),
                ...(typeof apiProd.inStock === 'boolean' ? { inStock: apiProd.inStock } : {}),
              });
            } else {
              setProduct(null);
            }
          }
        } else if (!localMatch) {
          setProduct(null);
        }
      } catch (err) {
        // Retain local match if API call fails (offline resilience)
        if (!localMatch && isMounted) {
          setProduct(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => Math.min(10, Math.max(1, prev + delta)));
  };

  const handleAddToBag = () => {
    if (!product) return;
    const success = addToBag(product.id, quantity);
    if (success) {
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    }
  };

  const getInquireUrl = (prod) => {
    const message = `Hello Aurevella Atelier,\nI would like to inquire regarding the ${prod.name} (${prod.priceText}, ${prod.category}).\n\nPlease share availability and sizing advice.`;
    return `https://wa.me/917728060447?text=${encodeURIComponent(message)}`;
  };

  // Not Found State for Invalid Product IDs
  if (!loading && !product) {
    return (
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-20 sm:py-32 flex flex-col items-center justify-center text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-[#181210] border border-[#2F1C15] flex items-center justify-center mb-6 text-[#B8AD9A]">
          <AlertCircle size={28} />
        </div>
        <span className="text-xs uppercase tracking-[0.25em] text-[#B8AD9A] mb-2 block font-medium">
          Catalogue Notice
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#FEF5E6] mb-4">
          Footwear Silhouette Not Found
        </h1>
        <p className="text-sm sm:text-base text-[#B8AD9A] max-w-md mx-auto mb-8 leading-relaxed">
          The requested footwear model does not exist or may have been retired from the active atelier collection.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center justify-center gap-2 min-h-[48px] px-8 text-xs uppercase tracking-[0.2em] bg-[#FEF5E6] text-[#0F0A09] hover:bg-white font-semibold transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-white"
        >
          <ArrowLeft size={14} />
          <span>Return to Catalogue</span>
        </Link>
      </div>
    );
  }

  // Loading State placeholder
  if (loading && !product) {
    return (
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-[#FEF5E6] border-r-transparent" />
          <p className="text-xs uppercase tracking-[0.2em] text-[#B8AD9A]">
            Retrieving Atelier Silhouette...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-10 animate-fade-in">
      {/* Back to Catalogue Navigation */}
      <nav aria-label="Breadcrumb">
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle min-h-[44px] outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
        >
          <ArrowLeft size={14} />
          <span>Back to Footwear Catalogue</span>
        </Link>
      </nav>

      {/* Main Product Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
        {/* Left Column: 1:1 Aspect Ratio Client Product Photography */}
        <div className="w-full flex justify-center">
          <div
            className="w-full max-w-[560px] bg-[#120D0C] border border-[#2F1C15] overflow-hidden relative shadow-lg aspect-square"
            style={{ aspectRatio: 'var(--product-ratio, 1 / 1)' }}
          >
            <img
              src={product.image}
              alt={product.alt || product.name}
              width="560"
              height="560"
              loading="eager"
              onLoad={() => setImageLoaded(true)}
              className={`w-full h-full aspect-square max-w-full object-cover object-center img-fade-in transition-subtle ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </div>
        </div>

        {/* Right Column: Model Information & Commerce Controls */}
        <div className="space-y-8 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[11px] sm:text-xs uppercase tracking-[0.25em] text-[#B8AD9A] block font-medium">
                {product.category}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[#B8AD9A]/70">
                Ref: {product.id}
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#FEF5E6] leading-tight tracking-wide">
              {product.name}
            </h1>

            <div className="pt-2">
              <span className="text-2xl sm:text-3xl font-medium text-[#FEF5E6] tracking-wide">
                {product.priceText}
              </span>
              <span className="text-[11px] uppercase tracking-wider text-[#B8AD9A] block mt-1">
                Inclusive of all taxes • Complimentary standard delivery
              </span>
            </div>

            {/* Atelier Craftsmanship Hallmarks Strip */}
            <div className="py-3 border-y border-[#2F1C15] flex flex-wrap items-center gap-4 text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-[#B8AD9A]">
              <span>Handcrafted in India</span>
              <span className="text-[#2F1C15]">•</span>
              <span>Italian-Inspired Design</span>
              <span className="text-[#2F1C15]">•</span>
              <span>Artisan Construction</span>
            </div>

            {/* Exact Product Description */}
            <div className="pt-2">
              <h2 className="text-xs uppercase tracking-[0.2em] text-[#FEF5E6] mb-2 font-medium">
                Atelier Notes & Silhouettes
              </h2>
              <p className="text-sm sm:text-base text-[#B8AD9A] leading-relaxed">
                {product.description}
              </p>
            </div>
          </div>

          {/* Add-to-Bag Controls */}
          <div className="pt-6 border-t border-[#2F1C15] space-y-6">
            {/* Quantity Selector */}
            <div className="flex items-center gap-4">
              <span className="text-xs uppercase tracking-widest text-[#B8AD9A] min-w-[70px]">
                Quantity:
              </span>
              <div className="inline-flex items-center border border-[#2F1C15] bg-[#181210]">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  className="w-11 h-11 inline-flex items-center justify-center text-[#FEF5E6] hover:bg-[#241B18] disabled:opacity-30 disabled:hover:bg-transparent transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span className="w-12 text-center text-sm font-medium text-[#FEF5E6] select-none">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= 10}
                  className="w-11 h-11 inline-flex items-center justify-center text-[#FEF5E6] hover:bg-[#241B18] disabled:opacity-30 disabled:hover:bg-transparent transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>
              <span className="text-[11px] text-[#B8AD9A] tracking-wider">
                (Max 10 pairs per order)
              </span>
            </div>

            {/* Actions: Add to Bag + Inquire */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                type="button"
                onClick={handleAddToBag}
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 min-h-[50px] px-6 text-xs uppercase tracking-[0.2em] bg-[#FEF5E6] text-[#0F0A09] hover:bg-white font-semibold transition-subtle shadow-md outline-none focus-visible:ring-1 focus-visible:ring-white"
              >
                {isAdded ? (
                  <>
                    <Check size={16} /> Added to Bag
                  </>
                ) : (
                  <>
                    <ShoppingBag size={16} /> Add to Bag
                  </>
                )}
              </button>

              <a
                href={getInquireUrl(product)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[50px] px-6 text-xs uppercase tracking-[0.2em] bg-[#181210] border border-[#2F1C15] hover:border-[#FEF5E6]/40 text-[#FEF5E6] hover:bg-[#241B18] transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6] shrink-0"
                aria-label={`Inquire on WhatsApp about ${product.name}`}
              >
                <MessageSquare size={15} />
                <span>Concierge Fit Advice</span>
              </a>
            </div>

            {/* Atelier Service Badges */}
            <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[#2F1C15]/60 text-xs text-[#B8AD9A]">
              <div className="flex items-start gap-2.5">
                <Truck size={16} className="text-[#FEF5E6] shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-[#FEF5E6] block">Complimentary Shipping</span>
                  <span className="text-[11px] text-[#B8AD9A]">All-India atelier delivery</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-[#FEF5E6] shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-[#FEF5E6] block">Artisanal Craft</span>
                  <span className="text-[11px] text-[#B8AD9A]">Handcrafted in India</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MessageSquare size={16} className="text-[#FEF5E6] shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-[#FEF5E6] block">Concierge Guidance</span>
                  <span className="text-[11px] text-[#B8AD9A]">Direct sizing and fit advisory</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
