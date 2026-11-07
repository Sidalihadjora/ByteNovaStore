# 🛍️ ByteNova Store | Configurable Algerian E-Commerce

A full-stack, responsive e-commerce platform with bilingual support (**Arabic with native RTL** & **French**), Wilaya and Commune selection from `data.json`, **Cash on Delivery (الدفع عند الاستلام)**, product management, customer accounts, and an Admin Dashboard with order management, stock control, invoice printing, and Excel/CSV export. Public Wilaya and Commune totals are calculated from the source data at runtime.

---

## 🌟 Key Highlights & Algerian Market Features

1. **Algerian Wilaya & Commune Cascading Selection**:
   - Dynamically loaded from `data.json` inside the project folder.
   - Uses all validated Wilaya and Commune entries in `data.json`; names and counts are not hardcoded in the storefront.
   - Dependent dropdown: Selecting a Wilaya dynamically updates the Commune dropdown with matching baladiyas.
   - Tailored delivery fees per Wilaya (e.g. 400 DA for Alger, 500 DA for Central Wilayas, 600-700 DA for North/High Plateaus, 900 DA for Grand Sud).

2. **Cash on Delivery (الدفع عند الاستلام / Paiement à la livraison)**:
   - First-class COD payment flow — no upfront online card required.
   - Delivery agent collection receipt and invoice printing.

3. **Dual Price Display & Strikethrough**:
   - Current price prominently in **Algerian Dinar (DA / د.ج)**.
   - Old price with clear strikethrough and dynamic discount badge (e.g., `-22%`).
   - If no old price is provided, only the current price is displayed.
   - Out of stock state disables purchasing and shows a prominent out-of-stock badge.

4. **Bilingual & Native RTL Support**:
   - Instant toggle between **العربية (RTL)** and **Français (LTR)**.
   - Dynamic text direction flip for all components, modals, cart drawer, and admin dashboard.

5. **Algerian Phone Number Validation**:
   - Supports 10-digit mobile formats (05, 06, 07) and landline formats (02X), as well as `+213` and `00213`.

6. **Anti-Duplicate Order Prevention**:
   - Server-side debounce and idempotency checks to prevent accidental double submissions.

7. **Comprehensive Admin Dashboard**:
   - Statistics KPIs: Total Orders, Pending, Confirmed, Delivered, Products, Customers, Total Revenue in DA.
   - Daily sales & orders SVG visualization charts.
   - Order management table with search, Wilaya filter, status filter, and date filter.
   - Change order status (`Pending`, `Confirmed`, `Processing`, `Shipped`, `Delivered`, `Cancelled`).
   - Permanently delete an order (admin-only, with confirmation); related order items are deleted through the existing SQLite cascade.
   - Permanently delete a customer account (admin-only, with confirmation); historical orders are retained and detached from the deleted account.
   - Printable delivery slips / invoices for Algerian couriers (Yalidine, ZR Express, Procolis).
   - Export orders to **Excel (XLSX)** and **CSV (UTF-8 with BOM)**.
   - Product catalog management with image upload, dual price setting, stock, and active toggle.
   - Customer list and order history.
   - Stock inventory alerts (< 5 units warning) and inline stock adjustments.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite 8, Tailwind CSS v4, Lucide Icons (`lucide-react`), `@react-oauth/google`, `xlsx`.
- **Backend**: Node.js (v22+), Express.js (v5), JWT (`jsonwebtoken`), Password Hashing (`bcryptjs`), Multer (file uploads).
- **Database**: SQLite (Node 22 built-in `node:sqlite` `DatabaseSync`) with foreign keys, indexes, and zero-config native portability.
- **Data Source**: `data.json` is the source of truth for Wilaya and Commune names and public statistics.

---

## 🗄️ Database Structure

The SQLite database file is stored at `server/data/webstore.db` with the following relational tables:

- `users`: Customer & Admin accounts, hashed passwords, Google IDs, avatars, contact information.
- `categories`: Category names (FR & AR), slugs, icons, images, sort order.
- `products`: Product catalog, pricing (numeric in DA), old prices, stock quantities, active flags, bilingual descriptions, ratings.
- `product_images`: Multi-image support for product galleries.
- `wilayas`: Algerian Wilayas loaded dynamically from `data.json` with delivery fees.
- `communes`: Algerian Communes loaded dynamically from `data.json` linked to Wilayas.
- `orders`: Unique order numbers (`DZ-2026-XXXX`), customer info, Wilaya, Commune, address, subtotal, delivery fee, total, status, and timestamps.
- `order_items`: Line items with product snapshot, unit price, quantity, and line total.
- `settings`: Store identity, branding, contact/social links, and free delivery threshold.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js v18+ (Node.js v22 recommended)
- npm or pnpm

### 2. Installation
From the project root:
```bash
# 1. Install backend dependencies
cd server
npm install

# 2. Install frontend dependencies
cd ../client
npm install
```

### 3. Build the Frontend
```bash
cd client
npm run build
```

### 4. Start the Application
From the project root:
```bash
npm start
# OR: node server/server.js
```
The application serves both the REST API and React SPA. It tries port `5000` first, then the next available port if needed; use the URL printed at startup.
The Admin Dashboard uses the `/admin` URL and is restored on refresh for an authenticated administrator.

For development with Vite Hot-Module Replacement (HMR):
```bash
# Terminal 1: Backend API
cd server
node server.js

# Terminal 2: Vite Dev Server
cd client
npm run dev
```
If the backend reports a fallback port (for example `5001`), set the Vite proxy target before starting the dev server:
```powershell
$env:VITE_API_PROXY_TARGET = "http://localhost:5001"
npm run client
```

---

## 🔑 Administrator Setup

New databases do not create demo users, products, categories, or orders. To provision the first administrator, set these values in `server/.env` before the first server start:

```env
INITIAL_ADMIN_EMAIL=admin@your-domain.dz
INITIAL_ADMIN_PASSWORD=use-a-unique-password-of-at-least-12-characters
```

The configured administrator is created only when the database has no admin account. Existing users and admins are never overwritten. Remove these bootstrap variables after the first successful startup.

### Store Settings and Administrator Account

Sign in as an administrator and open **Admin Dashboard → Paramètres du Magasin**. The settings form manages store names, website title, descriptions, slogans, logo/favicon URLs, brand colors, contact details, social links, and the free-delivery threshold. Logo and favicon images can be selected from the device and uploaded (PNG/JPEG/WEBP) or supplied as `/uploads/` or HTTPS URLs; save the settings form after an upload to publish the new URL.

Store settings are saved in SQLite without overwriting existing customized values. The public `/api/settings/public` endpoint exposes only customer-safe settings; reading or changing `/api/settings` and changing the administrator account require an admin token. Administrator account changes require the current password, and new passwords must be at least 8 characters.

Wilaya and Commune names and counts are read from the validated root `data.json`; `/api/wilayas/stats` reports current totals. Delivery fees remain in the existing Wilaya database records.

---

## 🧪 Testing

The existing test scripts use database records and may create or change test orders, stock, and products. Run them only against a disposable test database, never against the live store database:
```bash
npm run test:db
npm run test:http
```

---

## 🌐 Production Deployment

### 1. Environment Configuration
Create or edit `server/.env`:
```env
PORT=5000
NODE_ENV=production
JWT_SECRET=your_production_secret_key_change_me
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
PRODUCT_IMAGE_STORAGE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key
SUPABASE_STORAGE_BUCKET=product-images
# If deploying SQLite, point this at a durable mounted volume:
WEBSTORE_DB_PATH=/var/lib/soukdz/webstore.db
```
The frontend reads the same OAuth client ID at build time. For local development, create `client/.env.local`:
```env
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```
Set `VITE_GOOGLE_CLIENT_ID` in the production build environment before running `npm run build`. Without a valid client ID, password-based sign-in remains available and the Google button is omitted.

Product uploads are stored locally under `server/uploads/products` during development. Production requires Supabase Storage so images survive host restarts and redeployments. Create a **public** bucket matching `SUPABASE_STORAGE_BUCKET`, keep the service-role key only in the server environment, and configure the variables above. Uploaded files are verified as PNG/JPEG/WEBP and limited to 5 MB. Do not set these server secrets as `VITE_*` variables or commit them.
SQLite also requires a durable volume in production; set `WEBSTORE_DB_PATH` to the mounted database file location rather than relying on an ephemeral container filesystem.

### 2. Process Manager (PM2)
```bash
npm install -g pm2
pm2 start server/server.js --name "soukdz"
pm2 save
pm2 startup
```

### 3. Nginx Reverse Proxy Configuration
```nginx
server {
    listen 80;
    server_name yourstore.dz www.yourstore.dz;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 📄 License
MIT License. Crafted with precision for the Algerian E-Commerce Market. 🇩🇿
