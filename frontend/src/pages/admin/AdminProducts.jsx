import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  X,
  Layers,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import {
  fetchAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  updateAdminProductStock,
  fetchCategories,
} from '../../utils/api.js';

export const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [sortBy, setSortBy] = useState('newest');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Inline Stock Edit State
  const [editingStockId, setEditingStockId] = useState(null);
  const [editingStockVal, setEditingStockVal] = useState('');
  const [stockUpdating, setStockUpdating] = useState(false);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingProduct, setEditingProduct] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Form State
  const [formFields, setFormFields] = useState({
    name: '',
    slug: '',
    code: '',
    categoryId: '',
    priceRupees: '',
    description: '',
    image: '',
    imagesText: '',
    alt: '',
    stockQuantity: 0,
    isActive: true,
    priority: false,
  });

  // Load Categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetchCategories();
        if (res?.categories) {
          setCategories(res.categories);
        }
      } catch (err) {
        console.warn('Could not preload categories:', err.message);
      }
    };
    loadCategories();
  }, []);

  // Fetch Products with filters & pagination
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        limit: 10,
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (selectedCategory) {
        params.category = selectedCategory;
      }
      if (activeFilter === 'active') {
        params.isActive = 'true';
      } else if (activeFilter === 'inactive') {
        params.isActive = 'false';
      }

      if (sortBy === 'price-low-high') params.sort = 'price-low-high';
      if (sortBy === 'price-high-low') params.sort = 'price-high-low';
      if (sortBy === 'stock-low-high') params.sort = 'stock-low-high';
      if (sortBy === 'name-az') params.sort = 'name-az';

      const res = await fetchAdminProducts(params);
      if (res?.status === 'success') {
        setProducts(res.products || []);
        setTotalPages(res.pagination?.pages || 1);
        setTotalProducts(res.pagination?.total || 0);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve products catalogue');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, selectedCategory, activeFilter, sortBy]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Handle Quick Inline Stock Save
  const handleSaveStock = async (productId) => {
    const newStock = parseInt(editingStockVal, 10);
    if (isNaN(newStock) || newStock < 0) {
      setActionSuccess({ type: 'error', message: 'Stock must be a non-negative integer' });
      return;
    }

    setStockUpdating(true);
    try {
      const res = await updateAdminProductStock(productId, newStock);
      if (res?.status === 'success') {
        setProducts((prev) =>
          prev.map((p) => (p._id === productId || p.id === productId ? res.product : p))
        );
        setEditingStockId(null);
        setActionSuccess({ type: 'success', message: res.message || 'Inventory updated' });
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err) {
      setActionSuccess({ type: 'error', message: err.message || 'Failed to update stock' });
    } finally {
      setStockUpdating(false);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingProduct(null);
    setFormFields({
      name: '',
      slug: '',
      code: '',
      categoryId: categories[0]?.id || categories[0]?._id || '',
      priceRupees: '',
      description: '',
      image: '',
      imagesText: '',
      alt: '',
      stockQuantity: 10,
      isActive: true,
      priority: false,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (prod) => {
    setModalMode('edit');
    setEditingProduct(prod);
    setFormFields({
      name: prod.name || '',
      slug: prod.slug || '',
      code: prod.code || '',
      categoryId:
        prod.categoryId ||
        prod.category?._id ||
        prod.category?.id ||
        (categories.find(
          (c) =>
            c.name === prod.category ||
            c.slug === prod.category ||
            c.id === prod.category ||
            c._id === prod.category
        )?.id ||
          categories.find(
            (c) =>
              c.name === prod.category ||
              c.slug === prod.category ||
              c.id === prod.category ||
              c._id === prod.category
          )?._id ||
          ''),
      priceRupees: prod.pricePaise ? (prod.pricePaise / 100).toString() : '',
      description: prod.description || '',
      image: prod.image || '',
      imagesText: Array.isArray(prod.images) ? prod.images.join(', ') : '',
      alt: prod.alt || '',
      stockQuantity: prod.stockQuantity ?? 0,
      isActive: prod.isActive !== undefined ? prod.isActive : true,
      priority: Boolean(prod.priority),
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  // Handle Modal Form Submit
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);

    // Client-side validation
    if (!formFields.name.trim()) {
      setModalError('Product name is required');
      return;
    }
    if (modalMode === 'create' && !formFields.slug.trim()) {
      setModalError('Product slug is required');
      return;
    }
    const priceNum = parseFloat(formFields.priceRupees);
    if (isNaN(priceNum) || priceNum <= 0) {
      setModalError('Valid price in Rupees greater than 0 is required');
      return;
    }
    const stockNum = parseInt(formFields.stockQuantity, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      setModalError('Stock quantity must be a non-negative integer');
      return;
    }
    if (!formFields.categoryId) {
      setModalError('Please select a valid category');
      return;
    }
    if (!formFields.image.trim()) {
      setModalError('Primary image path or URL is required');
      return;
    }

    const pricePaise = Math.round(priceNum * 100);
    const imagesArray = formFields.imagesText
      ? formFields.imagesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [formFields.image.trim()];

    const payload = {
      name: formFields.name.trim(),
      categoryId: formFields.categoryId,
      pricePaise,
      description: formFields.description.trim(),
      image: formFields.image.trim(),
      images: imagesArray.length > 0 ? imagesArray : [formFields.image.trim()],
      alt: formFields.alt.trim() || formFields.name.trim(),
      stockQuantity: stockNum,
      isActive: Boolean(formFields.isActive),
      priority: Boolean(formFields.priority),
    };

    if (modalMode === 'create') {
      payload.slug = formFields.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
      if (formFields.code.trim()) {
        payload.code = formFields.code.trim();
      }
    }

    setModalSaving(true);
    try {
      if (modalMode === 'create') {
        const res = await createAdminProduct(payload);
        if (res?.status === 'success') {
          setIsModalOpen(false);
          setActionSuccess({ type: 'success', message: 'Product created successfully' });
          loadProducts();
        }
      } else {
        const productId = editingProduct._id || editingProduct.id;
        const res = await updateAdminProduct(productId, payload);
        if (res?.status === 'success') {
          setIsModalOpen(false);
          setActionSuccess({ type: 'success', message: 'Product updated successfully' });
          loadProducts();
        }
      }
    } catch (err) {
      setModalError(err.message || 'Operation failed. Please check input values.');
    } finally {
      setModalSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#2F1C15]">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl text-[#FEF5E6]">
            Atelier Products Catalogue
          </h2>
          <p className="text-xs text-[#B8AD9A] mt-1 tracking-wide">
            Manage luxury footwear offerings, stock quantities, and pricing authoritative records.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadProducts}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs uppercase tracking-widest bg-[#181210] border border-[#2F1C15] text-[#B8AD9A] hover:text-[#FEF5E6] hover:bg-[#241B18] transition-subtle disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs uppercase tracking-widest bg-[#FEF5E6] text-[#0F0A09] font-semibold hover:bg-white transition-subtle shadow-sm"
          >
            <Plus size={15} />
            <span>Add Creation</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionSuccess && (
        <div
          className={`p-4 border text-xs tracking-wide flex items-center justify-between ${
            actionSuccess.type === 'error'
              ? 'bg-red-950/40 border-red-800/80 text-red-300'
              : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionSuccess.type === 'error' ? (
              <AlertCircle size={16} />
            ) : (
              <CheckCircle size={16} />
            )}
            <span>{actionSuccess.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-[#B8AD9A] hover:text-[#FEF5E6]"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-[#181210] border border-[#2F1C15] p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search Input */}
        <div className="relative md:col-span-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B8AD9A]" />
          <input
            type="text"
            placeholder="Search name, code, slug..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#0F0A09] border border-[#2F1C15] text-[#FEF5E6] placeholder-[#665B54] focus:outline-none focus:border-[#FEF5E6]/40"
          />
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 text-xs bg-[#0F0A09] border border-[#2F1C15] text-[#FEF5E6] focus:outline-none focus:border-[#FEF5E6]/40"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id || c.slug} value={c._id || c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 text-xs bg-[#0F0A09] border border-[#2F1C15] text-[#FEF5E6] focus:outline-none focus:border-[#FEF5E6]/40"
          >
            <option value="all">All Visibility (Active & Inactive)</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        {/* Sorting Dropdown */}
        <div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-[#0F0A09] border border-[#2F1C15] text-[#FEF5E6] focus:outline-none focus:border-[#FEF5E6]/40"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="price-low-high">Price: Low to High</option>
            <option value="price-high-low">Price: High to Low</option>
            <option value="stock-low-high">Stock: Lowest First</option>
            <option value="name-az">Name: A to Z</option>
          </select>
        </div>
      </div>

      {/* Products Table Container */}
      <div className="bg-[#181210] border border-[#2F1C15] overflow-hidden">
        {loading && products.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center space-y-3">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-[#FEF5E6] border-r-transparent" />
            <p className="text-xs uppercase tracking-[0.2em] text-[#B8AD9A]">
              Loading Products Catalogue...
            </p>
          </div>
        ) : error && products.length === 0 ? (
          <div className="py-16 text-center space-y-4 max-w-md mx-auto px-4">
            <p className="text-sm text-red-400 leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={loadProducts}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs uppercase tracking-widest bg-[#241B18] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#2F1C15]"
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center space-y-4 px-4">
            <Package size={36} className="mx-auto text-[#665B54] stroke-1" />
            <div className="space-y-1">
              <p className="font-serif text-lg text-[#FEF5E6]">No products found</p>
              <p className="text-xs text-[#B8AD9A] max-w-sm mx-auto">
                No luxury footwear matches the specified search or filter criteria.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('');
                setActiveFilter('all');
              }}
              className="px-4 py-2 text-xs uppercase tracking-widest bg-[#241B18] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#2F1C15]"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#2F1C15] bg-[#140E0C] text-[#B8AD9A] uppercase tracking-[0.16em] text-[10px]">
                  <th className="py-3.5 px-4 font-medium">Creation</th>
                  <th className="py-3.5 px-4 font-medium">Code / Slug</th>
                  <th className="py-3.5 px-4 font-medium">Category</th>
                  <th className="py-3.5 px-4 font-medium text-right">Price</th>
                  <th className="py-3.5 px-4 font-medium text-center">Stock</th>
                  <th className="py-3.5 px-4 font-medium text-center">Status</th>
                  <th className="py-3.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2F1C15]/60 text-[#FEF5E6]">
                {products.map((p) => {
                  const isEditingStock = editingStockId === p._id || editingStockId === p.id;
                  const isLowStock = p.stockQuantity !== undefined && p.stockQuantity <= 5;

                  return (
                    <tr
                      key={p._id || p.id}
                      className="hover:bg-[#201613]/50 transition-subtle group"
                    >
                      {/* Product Preview & Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-[#0F0A09] border border-[#2F1C15] overflow-hidden shrink-0 flex items-center justify-center">
                            {p.image ? (
                              <img
                                src={p.image}
                                alt={p.alt || p.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <Package size={18} className="text-[#665B54]" />
                            )}
                          </div>
                          <div>
                            <p className="font-serif text-sm font-medium text-[#FEF5E6]">
                              {p.name}
                            </p>
                            <p className="text-[10px] text-[#B8AD9A] truncate max-w-[180px] sm:max-w-xs">
                              {p.description || 'No description provided'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Code & Slug */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#B8AD9A]">
                        <div>{p.code || '—'}</div>
                        <div className="text-[10px] text-[#665B54] truncate max-w-[120px]">
                          /{p.slug}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider bg-[#241B18] border border-[#2F1C15] text-[#B8AD9A]">
                          {p.category?.name || 'Footwear'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4 text-right font-serif text-sm text-[#FEF5E6]">
                        {p.pricePaise
                          ? `₹${(p.pricePaise / 100).toLocaleString('en-IN')}`
                          : p.price
                          ? `₹${p.price.toLocaleString('en-IN')}`
                          : '—'}
                      </td>

                      {/* Stock with Quick Inline Edit */}
                      <td className="py-3.5 px-4 text-center">
                        {isEditingStock ? (
                          <div className="inline-flex items-center gap-1.5 justify-center">
                            <input
                              type="number"
                              min="0"
                              value={editingStockVal}
                              onChange={(e) => setEditingStockVal(e.target.value)}
                              className="w-14 px-1.5 py-0.5 text-center text-xs bg-[#0F0A09] border border-[#FEF5E6]/40 text-[#FEF5E6]"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveStock(p._id || p.id)}
                              disabled={stockUpdating}
                              className="px-2 py-0.5 text-[10px] uppercase bg-emerald-950/60 border border-emerald-800 text-emerald-300 hover:bg-emerald-900"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingStockId(null)}
                              className="px-1.5 py-0.5 text-[10px] uppercase bg-[#241B18] border border-[#2F1C15] text-[#B8AD9A] hover:text-[#FEF5E6]"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingStockId(p._id || p.id);
                              setEditingStockVal(p.stockQuantity ?? 0);
                            }}
                            className="inline-flex items-center gap-1.5 cursor-pointer group-hover:border-b group-hover:border-[#B8AD9A]/40 pb-0.5"
                            title="Click to quickly adjust stock"
                          >
                            <span
                              className={`font-mono text-xs font-medium ${
                                isLowStock ? 'text-amber-400 font-bold' : 'text-[#FEF5E6]'
                              }`}
                            >
                              {p.stockQuantity ?? 0}
                            </span>
                            {isLowStock && (
                              <span className="text-[9px] uppercase px-1 py-0.2 bg-amber-950/60 border border-amber-800/60 text-amber-300">
                                Low
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Visibility Status */}
                      <td className="py-3.5 px-4 text-center">
                        {p.isActive !== false ? (
                          <span className="inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider bg-emerald-950/40 border border-emerald-800/60 text-emerald-300">
                            Active
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider bg-stone-900 border border-stone-800 text-stone-400">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-wider bg-[#241B18] border border-[#2F1C15] text-[#B8AD9A] hover:text-[#FEF5E6] hover:bg-[#2F1C15] transition-subtle"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#2F1C15] flex items-center justify-between text-xs text-[#B8AD9A]">
            <p>
              Showing page <span className="text-[#FEF5E6]">{currentPage}</span> of{' '}
              <span className="text-[#FEF5E6]">{totalPages}</span> ({totalProducts} creations total)
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || loading}
                className="p-1.5 bg-[#241B18] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#2F1C15] disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || loading}
                className="p-1.5 bg-[#241B18] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#2F1C15] disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Next Page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Add / Edit Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#0F0A09]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-[#181210] border border-[#2F1C15] w-full max-w-2xl my-8 p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#2F1C15]">
              <div>
                <h3 className="font-serif text-xl sm:text-2xl text-[#FEF5E6]">
                  {modalMode === 'create' ? 'Add Luxury Creation' : `Edit: ${editingProduct?.name}`}
                </h3>
                <p className="text-[11px] text-[#B8AD9A] mt-0.5">
                  {modalMode === 'create'
                    ? 'Enter verified catalogue specifications to register a new footwear item.'
                    : 'Modify verified product details and attributes.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#B8AD9A] hover:text-[#FEF5E6] p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Error in Modal */}
            {modalError && (
              <div className="p-3 bg-red-950/40 border border-red-800/80 text-red-300 text-xs">
                {modalError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="uppercase tracking-widest text-[10px] text-[#B8AD9A] font-medium">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Floral Block Heel Sandal"
                    value={formFields.name}
                    onChange={(e) => {
                      const nameVal = e.target.value;
                      setFormFields((prev) => ({
                        ...prev,
                        name: nameVal,
                        slug:
                          modalMode === 'create'
                            ? nameVal
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, '-')
                                .replace(/(^-|-$)/g, '')
                            : prev.slug,
                      }));
                    }}
                    className="w-full px-3 py-2 bg-[#0F0A09] border border-[#2F1C15] text-[#FEF5E6] focus:outline-none focus:border-[#FEF5E6]/40"
                  />
                </div>

                {/* Slug (Only editable on create or locked on edit) */}
                <div className="space-y-1.5">
                  <label className="uppercase tracking-widest text-[10px] text-[#B8AD9A] font-medium">
                    URL Slug * {modalMode === 'edit' && '(Read Only)'}
                  </label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === 'edit'}
                    placeholder="e.g. floral-block-heel-sandal"
                    value={formFields.slug}
                    onChange={(e) =>
                      setFormFields((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-[#0F0A09] border border-[#2F1C15] text-[#FEF5E6] disabled:opacity-50 focus:outline-none focus:border-[#FEF5E6]/40 font-mono text-[11px]"
                  />
                </div>

                {/* Product Code */}
                <div className="space-y-1.5">
                  <label className="uppercase tracking-widest text-[10px] text-[#B8AD9A] font-medium">
                    Catalogue Code {modalMode === 'edit' && '(Read Only)'}
                  </label>
                  <input
                    type="text"
                    disabled={modalMode === 'edit'}
                    placeholder="e.g. prod-04"
                    value={formFields.code}
                    onChange={(e) =>
                      setFormFields((prev) => ({ ...prev, code: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-[#0F0A09] border border-[#2F1C15] text-[#FEF5E6] disabled:opacity-50 focus:outline-none focus:border-[#FEF5E6]/40 font-mono text-[11px]"
                  />
                </div>

                {/* Category Selection */}
                <div className="space-y-1.5">
                  <label className="uppercase tracking-widest text-[10px] text-[#B8AD9A] font-medium">
                    Category *
                  </label>
                  <select
                    required
                    value={formFields.categoryId}
                    onChange={(e) =>
                      setFormFields((prev) => ({ ...prev, categoryId: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-[#0F0A09] border border-[#2F1C15] text-[#FEF5E6] focus:outline-none focus:border-[#FEF5E6]/40"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id || c._id || c.slug} value={c.id || c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price in INR */}
                <div className="space-y-1.5">
                  <label className="uppercase tracking-widest text-[10px] text-[#B8AD9A] font-medium">
                    Price (₹ INR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    placeholder="e.g. 3499"
                    value={formFields.priceRupees}
                    onChange={(e) =>
                      setFormFields((prev) => ({ ...prev, priceRupees: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-[#0F0A09] border border-[#2F1C15] text-[#FEF5E6] focus:outline-none focus:border-[#FEF5E6]/40 font-mono"
                  />
                </div>

                {/* Initial Stock */}
                <div className="space-y-1.5">
                  <label className="uppercase tracking-widest text-[10px] text-[#B8AD9A] font-medium">
                    Inventory Units *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={formFields.stockQuantity}
                    onChange={(e) =>
                      setFormFields((prev) => ({ ...prev, stockQuantity: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-[#0F0A09] border border-[#2F1C15] text-[#FEF5E6] focus:outline-none focus:border-[#FEF5E6]/40 font-mono"
                  />
                </div>

                {/* Alt text */}
                <div className="space-y-1.5">
                  <label className="uppercase tracking-widest text-[10px] text-[#B8AD9A] font-medium">
                    Image Alt Attribute
                  </label>
                  <input
                    type="text"
                    placeholder="Accessible image description"
                    value={formFields.alt}
                    onChange={(e) =>
                      setFormFields((prev) => ({ ...prev, alt: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-[#0F0A09] border border-[#2F1C15] text-[#FEF5E6] focus:outline-none focus:border-[#FEF5E6]/40"
                  />
                </div>

                {/* Primary Image Path */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="uppercase tracking-widest text-[10px] text-[#B8AD9A] font-medium">
                    Primary Image URL or Asset Path *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. /assets/images/products/floral-block-heel-sandal.webp"
                    value={formFields.image}
                    onChange={(e) =>
                      setFormFields((prev) => ({ ...prev, image: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-[#0F0A09] border border-[#2F1C15] text-[#FEF5E6] focus:outline-none focus:border-[#FEF5E6]/40 font-mono text-[11px]"
                  />
                </div>

                {/* Additional Images */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="uppercase tracking-widest text-[10px] text-[#B8AD9A] font-medium">
                    Additional Images (Comma separated URLs)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. /assets/images/products/floral-1.webp, /assets/images/products/floral-2.webp"
                    value={formFields.imagesText}
                    onChange={(e) =>
                      setFormFields((prev) => ({ ...prev, imagesText: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-[#0F0A09] border border-[#2F1C15] text-[#FEF5E6] focus:outline-none focus:border-[#FEF5E6]/40 font-mono text-[11px]"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="uppercase tracking-widest text-[10px] text-[#B8AD9A] font-medium">
                    Artisanal Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter bespoke craftsmanship notes, material details, and styling recommendations."
                    value={formFields.description}
                    onChange={(e) =>
                      setFormFields((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-[#0F0A09] border border-[#2F1C15] text-[#FEF5E6] focus:outline-none focus:border-[#FEF5E6]/40 leading-relaxed"
                  />
                </div>

                {/* Checkboxes: Active & Priority */}
                <div className="sm:col-span-2 flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formFields.isActive}
                      onChange={(e) =>
                        setFormFields((prev) => ({ ...prev, isActive: e.target.checked }))
                      }
                      className="accent-[#FEF5E6]"
                    />
                    <span className="text-[#FEF5E6]">Active on Storefront</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formFields.priority}
                      onChange={(e) =>
                        setFormFields((prev) => ({ ...prev, priority: e.target.checked }))
                      }
                      className="accent-[#FEF5E6]"
                    />
                    <span className="text-[#FEF5E6]">Priority Featured</span>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2F1C15]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs uppercase tracking-widest bg-[#241B18] border border-[#2F1C15] text-[#B8AD9A] hover:text-[#FEF5E6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="px-6 py-2.5 text-xs uppercase tracking-widest bg-[#FEF5E6] text-[#0F0A09] font-semibold hover:bg-white transition-subtle disabled:opacity-50"
                >
                  {modalSaving ? 'Saving...' : modalMode === 'create' ? 'Create Product' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;