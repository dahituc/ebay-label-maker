# eBay Label Maker - Project Overview

## Objective
A robust, local-first React web application built with Vite to process and manipulate eBay `.csv` order exports and format them into consolidated mailing labels. The app functions entirely client-side without any backend database or server, utilizing the browser's IndexedDB capabilities for persistence.

## Core Features & Architecture

1. **Client-Side Data Persistence (Dexie.js)**
   - Uses `Dexie.js` (an IndexedDB wrapper) to store application states securely in the browser.
   - Stores user settings (like the Geoapify API key), CSV processing logs, and batch API daily usage counters to strictly prevent exceeding the 3,000 free batch validations/day threshold.

2. **Intelligent CSV Processing Pipeline (PapaParse)**
   - **Batch Isolation**: Every CSV upload is treated as a distinct "batch," allowing users to manage, review, and print multiple separate files independently.
   - **Order Grouping**: Consolidates multiple items on a single order into uniquely formatted Custom Labels (e.g., `[SKU] x [Quantity]`).
   - **Automatic Merging**: Identifies multiple separate orders bound for the exact same `Buyer Username` and `Address`, merging them into one singular outbound shipping label to cut costs.
   - **Label Splitting**: Automatically splits orders with more than 2 unique items into multiple labels (2 items per label) to maintain readability on small thermal labels.
   - **Shipping Filters**: Automatically flags orders for "Manual" processing if they use shipping services other than "Australia Post Domestic Regular Letter Untracked."

3. **Hybrid Address Validation**
   - **Phase 1: Local Check**: Implements fast, offline JS checks confirming State-to-Postcode range validity (e.g., VIC strictly mapping to `3000-3999`).
   - **Phase 2: Live Standardisation**: Offloads unrecognized or imperfect formats to the Geoapify batch API, strictly obeying usage thresholds stored in the local cache.
   - **Address Switching**: Users can toggle between the original CSV-provided address and the standardized Geoapify address directly on the label preview.

4. **Manual Review & Correction**
   - Features a dedicated Review page that clearly maps invalid addresses against their given `Order ID`.
   - Provides manual edit functionality for users to fix validation errors prior to label generation.

5. **Customizable Label Output**
   - **Dynamic Styling**: Settings page allows users to define custom label dimensions (Width/Height) and choose from a library of Google Fonts, which are applied via CSS variables.
   - **UI & Routing**: React Router manages navigation between Dashboard, Review, Labels, and Settings views.
   - **Print Optimization**: Uses strict thermal label CSS layouts designed using print queries (`@media print` and `@page`) with a dedicated 'Print' button triggering `window.print()`.

## Project File Target Structure

```
├── public/                 // Static assets (like sample.csv)
├── src/
│   ├── assets/             // Internal visuals/svgs
│   ├── components/         // Reusable React functional components
│   ├── db/                 // Dexie instances (e.g., database.js)
│   ├── pages/              // Top-level views (Dashboard, Settings, Labels, Review)
│   ├── services/           // Business logic (csvParser.js, addressValidator.js, fontLoader.js)
│   ├── styles/             // Global variables and main.css
│   ├── App.jsx             // Base component routing
│   └── main.jsx            // Vite entrypoint
```

## AI Agent Development Note
This application aims to look and feel extremely premium out of the box using purely Vanilla CSS. No Tailwind or heavyweight UI libraries should be introduced unless explicitly requested.

