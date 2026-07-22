import { apiFetch } from '@shared/utils/apiClient';

export const apiService = {
  // Auth & Seller Registration
  login: (credentials: any) => apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ ...credentials, role: 'seller' }) }),
  registerSeller: (sellerData: any) => apiFetch('/api/sellers/register', { method: 'POST', body: JSON.stringify(sellerData) }),
  getProfile: () => apiFetch('/api/auth/me'),

  // Products & Inventory
  getSellerProducts: () => apiFetch('/api/products'),
  createProduct: (productData: any) => apiFetch('/api/products', { method: 'POST', body: JSON.stringify(productData) }),
  updateProduct: (id: string | number, data: any) => apiFetch(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string | number) => apiFetch(`/api/products/${id}`, { method: 'DELETE' }),

  // Orders
  getSellerOrders: (sellerId: string) => apiFetch(`/api/orders?sellerId=${sellerId}`),
  updateOrderStatus: (id: string | number, statusData: any) => apiFetch(`/api/orders/${id}`, { method: 'PUT', body: JSON.stringify(statusData) }),

  // Support & Pickup Locations
  getPickupLocations: (sellerId: string) => apiFetch(`/api/sellers/pickup-locations/${sellerId}`),
  createSupportTicket: (ticketData: any) => apiFetch('/api/sellers/support-tickets', { method: 'POST', body: JSON.stringify(ticketData) }),
};
