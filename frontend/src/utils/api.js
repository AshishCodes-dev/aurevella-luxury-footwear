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
