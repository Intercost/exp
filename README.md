# Exp Supplier Network

## Project Overview
The Exp Supplier Network is a frontend application for managing suppliers, products, and approvals, built to integrate with SharePoint, Power Automate, and Microsoft 365 authentication.

## Integration Notes

### 1. SharePoint Backend
The application is designed to read from and write to SharePoint lists and a document library:
- **Lists**: Suppliers, Products, Categories, Approvals
- **Document Library**: Vendor Documents

Configure the SharePoint site and list names in `js/config.js` under `SHAREPOINT`.

### 2. Power Automate Sync
A Power Automate flow should be set up to sync approved supplier and product data to the marketplace read-only view. The flow trigger URL can be configured in `js/config.js` under `POWER_AUTOMATE_SYNC_FLOW_URL`.

### 3. Microsoft 365 Authentication
For Exp staff login (admin and marketplace), Microsoft 365 SSO (Entra ID) is used:
- Configure `MS365.CLIENT_ID`, `MS365.TENANT_ID`, and `MS365.REDIRECT_URI` in `js/config.js`.

### Backend Readiness
To connect the frontend to a live backend:
1. Set `BACKEND_READY = true` in `js/config.js`
2. Fill in `API_BASE_URL` in `js/config.js`
3. Implement the API endpoints defined in `js/api.js`

## Project Structure
- `/index.html`: Home page
- `/css/styles.css`: Global styles
- `/js/`: Shared JavaScript (config, API layer, app logic)
- `/supplier/`: Supplier portal pages (login, register, dashboard, products, etc.)
- `/admin/`: Admin portal pages (login, dashboard)
- `/marketplace/`: Staff marketplace pages (index, supplier-profile)
- `/assets/`: Images and logos