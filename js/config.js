/**
 * EXP SUPPLIER NETWORK — Backend configuration
 * --------------------------------------------------------------------------
 * This file is the single switch the dev wires up when the backend lands.
 * Nothing else in the codebase should hold a URL or endpoint string —
 * everything routes through js/api.js, which reads from EXP_CONFIG below.
 *
 * Intended backend shape (per the integration diagram supplied):
 *   - Supplier portal  -> writes to SharePoint Lists "Suppliers", "Products",
 *                         "Categories" and a Document Library "Vendor Docs"
 *   - Admin portal      -> reads/writes the same Lists, plus an "Approvals"
 *                         queue list driven by a Power Automate flow
 *   - Staff marketplace -> READ-ONLY. Power Automate pushes/syncs verified
 *                         supplier + product records out to whatever the
 *                         marketplace reads from (a Graph/SharePoint REST
 *                         endpoint, or a flattened API your dev exposes)
 *
 * Until BACKEND_READY is set to true, the site runs in "awaiting backend"
 * mode: every screen renders its real, intentional empty/loading state
 * instead of placeholder data.
 */
window.EXP_CONFIG = {
  // Flip this once the API base below is live and responding.
  BACKEND_READY: true,

  // Supabase configuration
  SUPABASE: {
    URL: "https://toygnznfpfniaooivhvo.supabase.co",
    ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRveWduem5mcGZuaWFvb2l2aHZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0ODEyMjUsImV4cCI6MjA5ODA1NzIyNX0.C7NHceRM4mXZ1H4zvj2fV1DD65qdcSIafmoUpSZLNiM"
  },

  // Base URL for the REST/Graph layer in front of SharePoint.
  API_BASE_URL: "", // e.g. "https://api.expagency.biz/v1"

  // Microsoft 365 / Entra ID SSO (EXP staff login — admin + marketplace).
  MS365: {
    CLIENT_ID: "",
    TENANT_ID: "",
    REDIRECT_URI: window.location.origin + "/admin/login.html"
  },

  // SharePoint site + list names the backend should map to 1:1.
  SHAREPOINT: {
    SITE_URL: "",            // e.g. "https://expagency.sharepoint.com/sites/SupplierNetwork"
    LIST_SUPPLIERS: "Suppliers",
    LIST_PRODUCTS: "Products",
    LIST_CATEGORIES: "Categories",
    LIST_APPROVALS: "Approvals",
    LIBRARY_DOCS: "Vendor Documents"
  },

  // Power Automate flow that syncs approved/updated supplier data to the
  // staff marketplace. Exposed here only so the trigger can be referenced
  // or re-fired manually from the admin dashboard once it's built.
  POWER_AUTOMATE_SYNC_FLOW_URL: ""
};