/**
 * EXP Supplier Network — cache.js
 * Cache layer removed. All data is fetched live from Supabase.
 */
const ExpCache = {
  getApprovedSuppliers: () => ExpAPI.listApprovedSuppliers().then(r => r.ok ? r.data : []),
  getMarketplaceCategories: () => ExpAPI.listMarketplaceCategories().then(r => r.ok ? r.data : []),
  invalidate: () => {}
};
