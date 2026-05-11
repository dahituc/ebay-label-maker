# DOM-Based Label Splitting Implementation Plan

This plan outlines how to implement a two-pass rendering strategy in React to detect content overflow on your fixed-size thermal labels and automatically split them.

## 1. Architectural Concept: Two-Pass Rendering

Since we need the browser's layout engine to calculate exact text wrapping and height, we cannot know if a label overflows until it is actually rendered in the DOM.

Therefore, the process will be:
1.  **Pass 1 (Measurement Phase):** Render the original orders invisibly.
2.  **Measurement Check:** Use `useLayoutEffect` to measure the rendered DOM nodes. If `scrollHeight > clientHeight` (meaning content is cut off), trigger a split.
3.  **State Update:** Generate a new array of `printableLabels` where overflowing orders are split into two (or more) objects.
4.  **Pass 2 (Final Render):** Render the user-facing grid using the new `printableLabels` array.

---

## 2. Step-by-Step Implementation

### Step 1: Add New State Variables
In `src/pages/Labels.jsx`, you need state to hold the final processed labels and a flag to track if measurement is complete.

```javascript
const [printableLabels, setPrintableLabels] = useState([]);
const [isMeasuring, setIsMeasuring] = useState(true);
const hiddenContainerRef = useRef(null);
```

### Step 2: Create the Invisible Measurement Container
In your JSX, render a hidden container that matches the exact physical layout of your printed labels. This ensures the browser calculates heights using the exact CSS rules (`90mm` x `30mm`).

```jsx
{/* Invisible container for measuring overflow */}
{isMeasuring && (
  <div 
    ref={hiddenContainerRef}
    style={{ position: 'absolute', top: '-9999px', left: '-9999px', visibility: 'hidden' }}
  >
    <div className="labels-grid">
      {validOrders.map(order => (
        <div key={`measure-${order.id}`} data-order-id={order.id} className="label-item">
          {/* Render exact same label content here */}
        </div>
      ))}
    </div>
  </div>
)}
```

### Step 3: Implement the Measurement Logic (`useLayoutEffect`)
When `validOrders` changes, reset the state to trigger the measurement pass. Then, use `useLayoutEffect` (which runs synchronously immediately after the DOM is mutated but before the browser paints the screen) to measure the nodes.

```javascript
// Trigger re-measurement when orders change
useEffect(() => {
  if (validOrders && validOrders.length > 0) {
    setIsMeasuring(true);
  }
}, [validOrders]);

useLayoutEffect(() => {
  if (!isMeasuring || !hiddenContainerRef.current) return;

  const labelNodes = hiddenContainerRef.current.querySelectorAll('.label-item');
  const processedLabels = [];

  labelNodes.forEach(node => {
    const orderId = node.getAttribute('data-order-id');
    const originalOrder = validOrders.find(o => o.id === parseInt(orderId) || o.id === orderId);

    // Check for overflow (30mm height constraint)
    const isOverflowing = node.scrollHeight > node.clientHeight;

    if (isOverflowing) {
       // --- OVERFLOW DETECTED ---
       // Create Label 1: Address Only
       processedLabels.push({
         ...originalOrder,
         isSplitLabel: true,
         splitType: 'address_only',
         itemsSummary: '<i>Items on next label &rarr;</i>', // Override items
         labelKey: `${orderId}-part1`
       });

       // Create Label 2: Items Only
       processedLabels.push({
         ...originalOrder,
         isSplitLabel: true,
         splitType: 'items_only',
         // Hide address data so only name and items render
         address1: '', address2: '', city: '', state: '', postcode: '', geoFormatted: '',
         labelKey: `${orderId}-part2`
       });
    } else {
       // Fits perfectly, keep as is
       processedLabels.push({
         ...originalOrder,
         labelKey: orderId
       });
    }
  });

  setPrintableLabels(processedLabels);
  setIsMeasuring(false); // End measurement phase
}, [isMeasuring, validOrders]);
```

### Step 4: Update the Main Render Loop
Instead of mapping over `validOrders` in your main view, map over `printableLabels`.

```jsx
{/* Replace validOrders.map with printableLabels.map */}
{printableLabels.map(order => (
  <div key={order.labelKey} className="label-item">
     {/* Normal label rendering logic */}
     {/* ... */}
  </div>
))}
```

---

## 3. Important Considerations & Edge Cases

1.  **Item Parsing (`order.itemsSummary`):** 
    In the example above, I took a simple approach: if it overflows, put the Address on Label 1 and the Items on Label 2. 
    If the `itemsSummary` *itself* is so massive that Label 2 *also* overflows, you would need a more advanced splitting algorithm that parses the raw `items` array and distributes them across Label 2, Label 3, etc.
2.  **CSS `overflow` Property:**
    For `scrollHeight > clientHeight` to work correctly, your `.label-item` CSS class **must** have `overflow: hidden;` (which it currently does). If it had `overflow: visible`, `clientHeight` would stretch to fit the content, and the check would fail.
3.  **Loading State:**
    While `isMeasuring` is true, you might want to show a slight loading spinner in the UI instead of the grid, as the UI is calculating the layout. Since it happens in `useLayoutEffect`, the user usually won't even see a flicker, but it's good practice.
