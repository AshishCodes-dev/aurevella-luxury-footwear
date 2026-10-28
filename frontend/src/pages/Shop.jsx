import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ShoppingBag, MessageSquare, ArrowUpRight, Check, SlidersHorizontal, Search, X } from 'lucide-react';
import { PRODUCTS, CATEGORIES } from '../data/products.js';
import { fetchProducts, fetchCategories } from '../utils/api.js';
import { useBag } from '../context/BagContext.jsx';
import useDocumentTitle from '../utils/useDocumentTitle.js';

export const Shop = () => {
  useDocumentTitle('Atelier Footwear Catalogue — AUREVELLA');
  const { addToBag } = useBag();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlSearch = searchParams.get('search') || searchParams.get('q') || '';
  const urlCategory = searchParams.get('category') || 'All';

  const [products, setProducts] = useState(PRODUCTS);
  const [categories, setCategories] = useState(CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState(urlCategory);
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [sortBy, setSortBy] = useState('default');
  const [addedProductId, setAddedProductId] = useState(null);
  const searchInputRef = useRef(null);

  // Sync category state from URL if changed externally
  useEffect(() => {
    if (urlCategory && urlCategory !== selectedCategory) {
      setSelectedCategory(urlCategory);
    }
  }, [urlCategory]);

  // Sync search query state from URL if changed externally
  useEffect(() => {
    if (urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
    }
  }, [urlSearch]);

  // Sync search input and category selection to URL parameters
  const updateUrlParams = (newSearch, newCategory) => {
    const nextParams = new URLSearchParams(searchParams);
    if (newSearch && newSearch.trim()) {
      nextParams.set('search', newSearch.trim());
    } else {
      nextParams.delete('search');
      nextParams.delete('q');
    }

    if (newCategory && newCategory !== 'All') {
      nextParams.set('category', newCategory);
    } else {
      nextParams.delete('category');
    }

    setSearchParams(nextParams, { replace: true });
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    updateUrlParams(val, selectedCategory);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    updateUrlParams('', selectedCategory);
    searchInputRef.current?.focus();
  };

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    updateUrlParams(searchQuery, cat);
  };

  // Sync with backend API while retaining graceful client-side fallback
  useEffect(() => {
    let isMounted = true;
    const loadCatalogue = async () => {
      try {
        const [catData, prodData] = await Promise.all([
          fetchCategories().catch(() => null),
          fetchProducts().catch(() => null),
        ]);

        if (!isMounted) return;

        if (catData && Array.isArray(catData.categories) && catData.categories.length > 0) {
          const catNames = ['All', ...catData.categories.map((c) => c.name)];
          setCategories(catNames);
        }

        if (prodData && Array.isArray(prodData.products) && prodData.products.length > 0) {
          setProducts(prodData.products);
        }
      } catch (err) {
        console.warn('Catalogue API unavailable; using local fallback catalogue:', err);
      }
    };

    loadCatalogue();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter products based on active category, search query, and sorting
  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => p.isActive !== false);

    if (selectedCategory !== 'All') {
      list = list.filter((p) => {
        const catName = typeof p.category === 'string' ? p.category : p.category?.name;
        const catSlug = typeof p.category === 'object' ? p.category?.slug : null;
        return (
          catName?.toLowerCase() === selectedCategory.toLowerCase() ||
          catSlug?.toLowerCase() === selectedCategory.toLowerCase()
        );
      });
    }

    if (searchQuery.trim()) {
      const qLower = searchQuery.trim().toLowerCase();
      list = list.filter((p) => {
        const nameMatch = p.name?.toLowerCase().includes(qLower);
        const descMatch = p.description?.toLowerCase().includes(qLower);
        const idMatch = p.id?.toLowerCase().includes(qLower);
        const codeMatch = p.code?.toLowerCase().includes(qLower) || idMatch;
        const slugMatch = p.slug?.toLowerCase().includes(qLower);
        const catName = typeof p.category === 'string' ? p.category : p.category?.name;
        const catSlug = typeof p.category === 'object' ? p.category?.slug : p.categorySlug;
        const catMatch = catName?.toLowerCase().includes(qLower) || catSlug?.toLowerCase().includes(qLower);
        return nameMatch || descMatch || codeMatch || slugMatch || catMatch;
      });
    }

    if (sortBy === 'price-low-high') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high-low') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name-az') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [products, selectedCategory, searchQuery, sortBy]);

  const handleAddToBag = (productId) => {
    const productObj = products.find((p) => p.id === productId || p.code === productId);
    const success = addToBag(productId, 1, productObj);
    if (success) {
      setAddedProductId(productId);
      setTimeout(() => setAddedProductId(null), 1500);
    }
  };

  const getInquireUrl = (product) => {
    const message = `Hello Aurevella Atelier,\nI would like to inquire regarding the ${product.name} (${product.priceText}, ${product.category}).\n\nPlease share availability and sizing advice.`;
    return `https://wa.me/917728060447?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10 animate-fade-in">
      {/* Catalogue Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <span className="text-[11px] sm:text-xs uppercase tracking-[0.28em] text-[#B8AD9A] block font-medium">
          Atelier Footwear Collection
        </span>
        <h1 className="font-serif text-[clamp(2.25rem,5.5vw,4rem)] text-[#FEF5E6] tracking-wide leading-tight">
          Handcrafted Launch Silhouettes
        </h1>
        <p className="text-sm sm:text-base text-[#B8AD9A] max-w-2xl mx-auto leading-relaxed">
          Italian-inspired elegance, handcrafted in India. Explore our three launch models engineered with signature interchangeable heel craftsmanship and bespoke artisan construction.
        </p>
      </div>

      {/* Accessible Search Input Bar */}
      <div className="w-full max-w-2xl mx-auto">
        <div className="relative flex items-center">
          <label htmlFor="catalogue-search-input" className="sr-only">
            Search atelier footwear catalogue by model, silhouette, heel mechanic, or material
          </label>
          <Search size={16} className="absolute left-3.5 text-[#B8AD9A] pointer-events-none" />
          <input
            id="catalogue-search-input"
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by silhouette, heel type, model code (e.g. prod-01), or material..."
            className="w-full bg-[#181210] border border-[#2F1C15] hover:border-[#4A2C26] focus:border-[#FEF5E6] text-xs sm:text-sm text-[#FEF5E6] placeholder-[#B8AD9A]/60 pl-10 pr-10 py-3 transition-subtle outline-none focus:ring-1 focus:ring-[#FEF5E6]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Clear search input"
              className="absolute right-3 text-[#B8AD9A] hover:text-[#FEF5E6] p-1 transition-subtle focus:outline-none focus:ring-1 focus:ring-[#FEF5E6]"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Filter and Sorting Bar */}
      <div className="border-y border-[#2F1C15] py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => {
            const count =
              cat === 'All'
                ? products.length
                : products.filter((p) => {
                    const cName = typeof p.category === 'string' ? p.category : p.category?.name;
                    return cName === cat;
                  }).length;
            const isSelected = selectedCategory === cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryChange(cat)}
                className={`min-h-[40px] px-4 text-xs uppercase tracking-[0.16em] transition-subtle border outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6] ${
                  isSelected
                    ? 'bg-[#FEF5E6] text-[#0F0A09] border-[#FEF5E6] font-semibold'
                    : 'bg-[#181210] text-[#B8AD9A] border-[#2F1C15] hover:text-[#FEF5E6] hover:border-[#FEF5E6]/40'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xs uppercase tracking-widest text-[#B8AD9A] flex items-center gap-1.5">
            <SlidersHorizontal size={14} /> Sort By:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort products"
            className="min-h-[40px] px-3 bg-[#181210] border border-[#2F1C15] text-xs text-[#FEF5E6] uppercase tracking-wider transition-subtle focus:outline-none focus:border-[#FEF5E6] focus:ring-1 focus:ring-[#FEF5E6]"
          >
            <option value="default">Featured Silhouettes</option>
            <option value="price-low-high">Price: Low to High</option>
            <option value="price-high-low">Price: High to Low</option>
            <option value="name-az">Model Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Results Count & Search Active Badges */}
      <div className="text-xs uppercase tracking-widest text-[#B8AD9A] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span>
            Showing {filteredProducts.length} handcrafted {filteredProducts.length === 1 ? 'model' : 'models'}
          </span>
          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#241B18] text-[#FEF5E6] border border-[#2F1C15] text-[11px] normal-case tracking-normal">
              Query: &ldquo;{searchQuery}&rdquo;
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Remove search query filter"
                className="hover:text-amber-300 ml-1"
              >
                <X size={12} />
              </button>
            </span>
          )}
        </div>

        {(selectedCategory !== 'All' || searchQuery) && (
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All');
              setSearchQuery('');
              updateUrlParams('', 'All');
            }}
            className="text-[#FEF5E6] underline underline-offset-4 hover:text-white transition-subtle"
          >
            Reset All Filters
          </button>
        )}
      </div>

      {/* Product Grid or Informative Empty State */}
      {filteredProducts.length === 0 ? (
        <div className="w-full py-16 px-6 text-center border border-[#2F1C15] bg-[#140E0C] space-y-4 max-w-xl mx-auto my-6">
          <Search size={36} className="text-[#B8AD9A]/60 mx-auto" />
          <h2 className="font-serif text-2xl text-[#FEF5E6]">No Atelier Models Found</h2>
          <p className="text-xs sm:text-sm text-[#B8AD9A] leading-relaxed max-w-md mx-auto">
            {searchQuery ? (
              <>
                No footwear models matched your inquiry for{' '}
                <strong className="text-[#FEF5E6]">&ldquo;{searchQuery}&rdquo;</strong>
                {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}.
              </>
            ) : (
              <>No models available in the selected category.</>
            )}
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="min-h-[40px] px-5 text-xs uppercase tracking-wider font-semibold bg-[#FEF5E6] text-[#0F0A09] hover:bg-white transition-subtle"
              >
                Clear Search
              </button>
            )}
            {selectedCategory !== 'All' && (
              <button
                type="button"
                onClick={() => handleCategoryChange('All')}
                className="min-h-[40px] px-5 text-xs uppercase tracking-wider font-medium border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#181210] transition-subtle"
              >
                View All Categories
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center w-full">
        {filteredProducts.map((product) => {
          const isAdded = addedProductId === product.id;

          return (
            <article
              key={product.id}
              className="group bg-[#181210] border border-[#2F1C15] hover:border-[#4A2C26] flex flex-col h-full w-full max-w-[420px] min-w-0 transition-subtle shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
            >
              {/* Aspect Ratio Image Slot */}
              <div
                className="w-full bg-[#120D0C] border-b border-[#2F1C15] overflow-hidden relative aspect-square"
                style={{ aspectRatio: 'var(--product-ratio, 1 / 1)' }}
              >
                <Link
                  to={`/product/${product.id}`}
                  className="block w-full h-full outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#FEF5E6]"
                >
                  <img
                    src={product.image}
                    alt={product.alt}
                    width="500"
                    height="500"
                    loading={product.priority ? 'eager' : 'lazy'}
                    className="w-full h-full aspect-square max-w-full object-cover object-center img-fade-in transition-subtle group-hover:scale-[1.02]"
                  />
                </Link>
              </div>

              {/* Product Info */}
              <div className="p-6 sm:p-7 flex flex-col flex-1 min-w-0 justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.25em] text-[#B8AD9A] mb-2 block truncate">
                    {product.category}
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl text-[#FEF5E6] group-hover:text-white transition-subtle mb-2 break-words leading-snug">
                    <Link
                      to={`/product/${product.id}`}
                      className="outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6] hover:underline underline-offset-4"
                    >
                      {product.name}
                    </Link>
                  </h3>
                  <p className="text-xs text-[#B8AD9A] line-clamp-2 leading-relaxed mb-4">
                    {product.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#2F1C15] space-y-4">
                  {/* Price */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-[#B8AD9A]">Price</span>
                    <span className="text-base font-medium text-[#FEF5E6] tracking-wide">
                      {product.priceText}
                    </span>
                  </div>

                  {/* Actions: Add to Bag + Inquire */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleAddToBag(product.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 text-xs uppercase tracking-[0.16em] bg-[#FEF5E6] text-[#0F0A09] hover:bg-white font-semibold transition-subtle shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-white"
                    >
                      {isAdded ? (
                        <>
                          <Check size={14} /> Added
                        </>
                      ) : (
                        <>
                          <ShoppingBag size={14} /> Add to Bag
                        </>
                      )}
                    </button>

                    <a
                      href={getInquireUrl(product)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 text-xs uppercase tracking-[0.16em] bg-[#0F0A09] border border-[#2F1C15] hover:border-[#FEF5E6]/40 text-[#FEF5E6] hover:bg-[#241B18] transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
                      aria-label={`Inquire on WhatsApp about ${product.name}`}
                    >
                      <MessageSquare size={13} />
                      <span>Inquire</span>
                    </a>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
        </div>
      )}

      {/* Atelier Craftsmanship Hallmarks Strip */}
      <div className="pt-12 border-t border-[#2F1C15] text-center">
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-[10px] sm:text-xs uppercase tracking-[0.22em] text-[#B8AD9A] select-none">
          <span>Handcrafted in India</span>
          <span className="hidden sm:inline text-[#2F1C15]">•</span>
          <span>Interchangeable Mechanics</span>
          <span className="hidden sm:inline text-[#2F1C15]">•</span>
          <span>Zero Mass Production</span>
        </div>
      </div>
    </div>
  );
};

export default Shop;
