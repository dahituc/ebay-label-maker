# eBay Label Maker - Project Overview

## Objective
A robust, local-first React web application built with Vite to process and manipulate eBay `.csv` order exports and format them into consolidated mailing labels. The app functions entirely client-side without any backend database or server, utilizing the browser's IndexedDB capabilities for persistence.

## Core Features & Architecture

1. **Client-Side Data Persistence (Dexie.js)**
   - Uses `Dexie.js` (an IndexedDB wrapper) to store application states securely in the browser.
   - Stores user settings (like the Geoapify API key), CSV processing logs, and batch API daily usage counters to strictly prevent exceeding the 3,000 free batch validations/day threshold.

2. **Intelligent CSV Processing Pipeline (PapaParse)**
   - Inputs standard eBay `.csv` formats directly into browser memory.
   - Filters out orders explicitly marked as tracked.
   - Consolidates multiple items on a single order into uniquely formatted Custom Labels (e.g., `[SKU] x [Quantity]`).
   - Identifies multiple separate orders bound for the exact same `Buyer Username` and `Address`, merging them into one singular outbound shipping label to cut costs.

3. **Hybrid Address Validation**
   - **Phase 1: Local Check**: Implements fast, offline JS checks confirming State-to-Postcode range validity (e.g., VIC strictly mapping to `3000-3999`).
   - **Phase 2: Live Standardisation**: Offloads unrecognized or imperfect formats to the Geoapify batch API, strictly obeying usage thresholds stored in the local cache.

4. **UI & Routing (Vanilla CSS & React Router)**
   - Focus is heavily placed on premium aesthetics without using heavyweight UI framekworks or Tailwind.
   - Features dynamic CSS Variables supporting dark/light variants and strict 90x30mm thermal label CSS layouts designed using print queries (`@media print` and `@page`).

## Project File Target Structure

```
├── public/                 // Static assets (like sample.csv)
├── src/
│   ├── assets/             // Internal visuals/svgs
│   ├── components/         // Reusable React functional components
│   ├── db/                 // Dexie instances (e.g., database.js)
│   ├── pages/              // Top-level views (Dashboard, Settings, Labels, Review)
│   ├── services/           // Business logic (csvParser.js, addressValidator.js)
│   ├── styles/             // Global variables and main.css
│   ├── App.jsx             // Base component routing
│   └── main.jsx            // Vite entrypoint
```

## AI Agent Development Note
This application aims to look and feel extremely premium out of the box using purely Vanilla CSS or Module CSS. Please refer to `prompts.md` for suggested stage-based implementation cycles.
