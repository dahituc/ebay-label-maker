# Sample Prompts for Orchestrating Development

To continue building this project incrementally, please use the following prompts. Each prompt is designed to correspond with the phases outlined in `task.md`. Let the AI complete each stage before pasting the next prompt.

### Stage 1: Setup & Skeleton (Vite + Architecture)
```text
Please execute Stage 1 from task.md. 
Initialize a React and Vite app in this directory. 
Install `react-router-dom`, `dexie`, `dexie-react-hooks`, `papaparse`, and `lucide-react`. 
Set up the React Router skeleton with placeholder pages for Dashboard, Settings, address Review, and Labels. 
Lay out the global CSS Variables (colors, fonts, sizing) for a premium dark/light modern UI in index.css. 
Once completed, check off the Stage 1 boxes in task.md.
```

### Stage 2: Local Database & Settings Page
```text
Please execute Stage 2 from task.md.
Create `src/db/database.js` mapping out the Dexie tables (`settings`, `daily_usage`, `csv_logs`, `orders`). 
Build the `SettingsPage.jsx` component that allows a user to securely view, enter, and save their Geoapify API key to the `settings` table, and visually displaying their current `daily_usage` count.
Make sure the UI looks highly polished. Mark Stage 2 complete in task.md once done.
```

### Stage 3: CSV Processing Engine & Testing
```text
Please execute Stage 3 from task.md.
Create `src/services/csvParser.js` using PapaParse. Implement the raw eBay CSV logic:
1. Filter out mapped orders featuring "Tracked" shipping rules.
2. Group rows with the same Order ID into custom labels (e.g. `SKU A X Qty 2`).
3. Merge distinct original orders if the `Buyer Username` AND raw destination Address match.
Add a unit test script or integrated test in the app that loads `/test/sample.csv` to assert the CSV logic works. Then complete Stage 3 in task.md.
```

### Stage 4: Address Validation Pipeline & Testing
```text
Please execute Stage 4 from task.md.
Create `src/services/addressValidator.js`. Implement a local JavaScript sanity check that verifies major Australian States against numeric postcode ranges.
Integrate the Geoapify API batch request flow for unverified strings, strictly ensuring it checks the `daily_usage` Dexie limit before making the HTTP fetch call. 
Write a test mapping the parsed data from `/test/sample.csv` through this validation flow to ensure postcodes/details validate properly. Tick off Stage 4 when finished.
```

### Stage 5: Main Application Flow & UI Integration
```text
Please execute Stage 5 from task.md.
Build the actual logic flow in `Dashboard.jsx`:
- User clicks/drops CSV -> triggers CSV parse -> triggers Address validation API pipeline.
- It then prompts the user with clear counts: "Create X Labels" (Valid) / "Review Y Invalid Records".
Build a "Review" page that clearly maps Invalid addresses against their given `Order ID` providing manual edit functionality.
Update task.md once implemented.
```

### Stage 6: Label Output Generation
```text
Please execute Stage 6 from task.md.
Design the `LabelsOutput.jsx` view. 
Map over ONLY the 'valid' grouped orders and render them as actual visual DOM elements scaled via CSS grid and print media queries targeted at a 90mm x 30mm thermal layout. 
Keep CSS structured so switching layouts is easy. Provide a 'Print' button triggering `window.print()`.
Finish Stage 6 in task.md when done.
```
