# Project Implementation Tasks

## Stage 1: Setup & Skeleton (Vite + Architecture)

- [x] Initialize a React and Vite app in this directory.
- [x] Install `react-router-dom`, `dexie`, `dexie-react-hooks`, `papaparse`, and `lucide-react`.
- [x] Set up the React Router skeleton with placeholder pages for Dashboard, Settings, address Review, and Labels.
- [x] Lay out the global CSS Variables (colors, fonts, sizing) for a premium dark/light modern UI in index.css.

## Stage 2: Local Database & Settings Page

- [x] Create `src/db/database.js` mapping out the Dexie tables (`settings`, `daily_usage`, `csv_logs`, `orders`).
- [x] Build the `SettingsPage.jsx` component that allows a user to securely view, enter, and save their Geoapify API key to the `settings` table, and visually displaying their current `daily_usage` count.

## Stage 3: CSV Processing Engine & Testing

- [x] Create `src/services/csvParser.js` using PapaParse. Implement the raw eBay CSV logic.
- [x] Filter out mapped orders featuring "Tracked" shipping rules.
- [x] Group rows with the same Order ID into custom labels (e.g. `SKU A X Qty 2`).
- [x] Merge distinct original orders if the `Buyer Username` AND raw destination Address match.
- [x] Add a unit test script or integrated test in the app that loads `/test/sample.csv` to assert the CSV logic works.
- [x] CSV records can have same order on multiple lines when the order contains more than 1 item, consider this while reading the csv file and make corrections as needed.

## Stage 4: Address Validation Pipeline & Testing

- [x] Create `src/services/addressValidator.js`. Implement a local JavaScript sanity check that verifies major Australian States against numeric postcode ranges.
- [x] Integrate the Geoapify API batch request flow for unverified strings, strictly ensuring it checks the `daily_usage` Dexie limit before making the HTTP fetch call.
- [x] Write a test mapping the parsed data from `/test/sample.csv` through this validation flow to ensure postcodes/details validate properly.

## Stage 5: Main Application Flow & UI Integration

- [x] Build the actual logic flow in `Dashboard.jsx`.
- [x] Build a "Review" page that clearly maps Invalid addresses against their given `Order ID` providing manual edit functionality.

## Stage 6: Label Output Generation

- [x] Design the `LabelsOutput.jsx` view.
- [x] Map over ONLY the 'valid' grouped orders and render them as actual visual DOM elements scaled via CSS grid and print media queries targeted at a 90mm x 30mm thermal layout.
- [x] Keep CSS structured so switching layouts is easy. Provide a 'Print' button triggering `window.print()`.
