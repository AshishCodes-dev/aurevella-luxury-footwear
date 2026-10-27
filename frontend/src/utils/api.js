const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = {
    ...(options.headers || {}),
  };

  const method = (options.method || 'GET').toUpperCase();
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  // Automatically attach custom CSRF header on mutating requests
  if (mutatingMethods.includes(method)) {
    headers['X-Aurevella-Request'] = '1';
  }

  // If body is an object and not FormData, stringify and set Content-Type
  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const fetchOptions = {
    ...options,
    method,
    headers,
    body,
    credentials: 'include', // Ensure cookies are sent with cross-origin requests
  };

  const response = await fetch(url, fetchOptions);

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    const errorMessage =
      data?.message || `Request failed with status ${response.status} (${response.statusText})`;
    throw new ApiError(errorMessage, response.status, data);
  }

  return data;
};

// Catalogue API Helpers
export const fetchProducts = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.category && params.category !== 'All') {
    query.set('category', params.category);
  }
  if (params.sort) {
    query.set('sort', params.sort);
  }
  if (params.search && typeof params.search === 'string' && params.search.trim()) {
    query.set('search', params.search.trim());
  }
  const queryString = query.toString();
  const endpoint = queryString ? `/api/products?${queryString}` : '/api/products';
  return apiFetch(endpoint);
};

export const fetchCategories = async () => {
  return apiFetch('/api/categories');
};

export const fetchProductByIdOrSlug = async (idOrSlug) => {
  return apiFetch(`/api/products/${idOrSlug}`);
};

// Customer Address API Helpers
export const fetchUserAddresses = async () => {
  return apiFetch('/api/users/addresses');
};

export const createUserAddress = async (addressData) => {
  return apiFetch('/api/users/addresses', {
    method: 'POST',
    body: addressData,
  });
};

export const updateUserAddress = async (id, addressData) => {
  return apiFetch(`/api/users/addresses/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: addressData,
  });
};

export const deleteUserAddress = async (id) => {
  return apiFetch(`/api/users/addresses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
};

export const setDefaultUserAddress = async (id) => {
  return apiFetch(`/api/users/addresses/${encodeURIComponent(id)}/default`, {
    method: 'PATCH',
  });
};

// Order & Checkout API Helpers
export const fetchOrderQuote = async ({ items, addressId = null }) => {
  return apiFetch('/api/orders/quote', {
    method: 'POST',
    body: { items, addressId },
  });
};

export const createOrder = async ({ items, addressId, notes = '', idempotencyKey }) => {
  return apiFetch('/api/orders', {
    method: 'POST',
    body: { items, addressId, notes, idempotencyKey },
  });
};

export const fetchUserOrders = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  const qs = query.toString();
  return apiFetch(qs ? `/api/orders?${qs}` : '/api/orders');
};

export const fetchOrderByIdOrNumber = async (idOrNumber) => {
  return apiFetch(`/api/orders/${encodeURIComponent(idOrNumber)}`);
};

// Payment API Helpers (Razorpay Test Mode)
export const createPaymentOrder = async (orderId) => {
  return apiFetch('/api/payments/create-order', {
    method: 'POST',
    body: { orderId },
  });
};

export const verifyPayment = async ({
  orderId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) => {
  return apiFetch('/api/payments/verify', {
    method: 'POST',
    body: {
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    },
  });
};

// Admin Dashboard API Helpers
export const fetchAdminPing = async () => {
  return apiFetch('/api/admin/ping');
};

export const fetchAdminStats = async () => {
  return apiFetch('/api/admin/stats');
};

export const fetchAdminProducts = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.search) query.set('search', params.search);
  if (params.category) query.set('category', params.category);
  if (params.isActive !== undefined) query.set('isActive', params.isActive);
  if (params.sort) query.set('sort', params.sort);
  const qs = query.toString();
  return apiFetch(qs ? `/api/admin/products?${qs}` : '/api/admin/products');
};

export const fetchAdminProduct = async (idOrSlug) => {
  return apiFetch(`/api/admin/products/${encodeURIComponent(idOrSlug)}`);
};

export const createAdminProduct = async (productData) => {
  return apiFetch('/api/admin/products', {
    method: 'POST',
    body: productData,
  });
};

export const updateAdminProduct = async (id, productData) => {
  return apiFetch(`/api/admin/products/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: productData,
  });
};

export const updateAdminProductStock = async (id, stockQuantity) => {
  return apiFetch(`/api/admin/products/${encodeURIComponent(id)}/stock`, {
    method: 'PATCH',
    body: { stockQuantity },
  });
};

export const fetchAdminOrders = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  const qs = query.toString();
  return apiFetch(qs ? `/api/admin/orders?${qs}` : '/api/admin/orders');
};

export const fetchAdminOrder = async (idOrNumber) => {
  return apiFetch(`/api/admin/orders/${encodeURIComponent(idOrNumber)}`);
};

export const updateAdminOrderFulfillment = async (idOrNumber, { status, notes }) => {
  return apiFetch(`/api/admin/orders/${encodeURIComponent(idOrNumber)}/fulfillment`, {
    method: 'PATCH',
    body: { status, notes },
  });
};
