import Papa from 'papaparse';

export const parseEbayCsv = (fileOrString) => {
  return new Promise((resolve, reject) => {
    Papa.parse(fileOrString, {
      skipEmptyLines: 'greedy',
      complete: (results) => {
        try {
          const rawData = results.data;
          
          // Find the actual header row index (eBay CSVs often have empty/junk rows at the top)
          let headerIndex = -1;
          for (let i = 0; i < rawData.length; i++) {
            if (rawData[i][0] === 'Sales Record Number' || rawData[i].includes('Order Number')) {
              headerIndex = i;
              break;
            }
          }

          if (headerIndex === -1) {
            throw new Error('Could not find header row in CSV');
          }

          const headers = rawData[headerIndex];
          const rows = rawData.slice(headerIndex + 1);

          // Build objects
          const items = rows.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header ? header.trim() : `Col${index}`] = row[index] ? row[index].trim() : '';
            });
            return obj;
          });

          // 1. Group by Order Number to establish order baseline and collect all items inside it
          const ordersMap = new Map();

          for (const item of items) {
            const orderNum = item['Order Number'];
            if (!orderNum || orderNum.includes('record(s) downloaded') || orderNum.includes('Seller ID')) continue;

            if (!ordersMap.has(orderNum)) {
              ordersMap.set(orderNum, {
                orderNumber: orderNum,
                buyerUsername: item['Buyer Username'],
                buyerName: item['Buyer Name'],
                postToName: item['Post To Name'],
                address1: item['Post To Address 1'],
                address2: item['Post To Address 2'],
                city: item['Post To City'],
                state: item['Post To State'],
                postcode: item['Post To Postal Code'],
                country: item['Post To Country'],
                postageService: item['Postage Service'] || '',
                items: [],
                buyerNote: item['Buyer Note'],
                // Single-row orders have the item on the same line as the address
                // Multi-row orders have address on first line, items on subsequent lines
              });
            }
            
            const order = ordersMap.get(orderNum);

            // Sometimes the first row of a multi-item order has the postage service, we don't want to overwrite it with empty strings
            if (!order.postageService && item['Postage Service']) {
              order.postageService = item['Postage Service'];
            }
            if (!order.buyerUsername && item['Buyer Username']) {
              order.buyerUsername = item['Buyer Username'];
            }
            if (!order.address1 && item['Post To Address 1']) {
              order.address1 = item['Post To Address 1'];
              order.address2 = item['Post To Address 2'];
              order.city = item['Post To City'];
              order.state = item['Post To State'];
              order.postcode = item['Post To Postal Code'];
              order.postToName = item['Post To Name'];
            }

            const customLabel = item['Custom Label'];
            const quantity = item['Quantity'] ? parseInt(item['Quantity'], 10) : 1;

            if (customLabel) {
              order.items.push({ customLabel, quantity });
            } else if (item['Item Title'] && !item['Item Title'].includes('record(s) downloaded') && !item['Item Title'].includes('Seller ID :')) {
               // Fallback to title if no custom label
               order.items.push({ customLabel: item['Item Title'], quantity });
            }
          }

          // Generate base grouped orders
          let parsedOrders = Array.from(ordersMap.values());

          // 2 & 3: Consolidate items into SKU formats string, and merge distinct orders 
          // if Buyer Username and Address match.
          const consolidatedMap = new Map();
          const resultsArray = [];

          for (const order of parsedOrders) {
             const itemsString = order.items.map(i => `${i.customLabel} X${i.quantity}`).join(' + ');

             if (order.postageService !== "Australia Post Domestic Regular Letter Untracked") {
                resultsArray.push({
                   orderIds: order.orderNumber,
                   buyerUsername: order.buyerUsername,
                   name: order.postToName,
                   address1: order.address1,
                   address2: order.address2,
                   city: order.city,
                   state: order.state,
                   postcode: order.postcode,
                   country: order.country,
                   itemsSummary: itemsString,
                   manualFlag: true,
                   postageService: order.postageService,
                   buyerNote: order.buyerNote,
                });
                continue;
             }

             const rawAddress = [order.address1, order.address2, order.city, order.state, order.postcode].filter(Boolean).join(', ').toLowerCase();
             const mergeKey = `${order.buyerUsername}-${rawAddress}`;

             if (consolidatedMap.has(mergeKey)) {
                const existing = consolidatedMap.get(mergeKey);
                existing.orderNumbers.push(order.orderNumber);
                existing.combinedItems.push(itemsString);
             } else {
                consolidatedMap.set(mergeKey, {
                   orderNumbers: [order.orderNumber],
                   buyerUsername: order.buyerUsername,
                   postToName: order.postToName,
                   address1: order.address1,
                   address2: order.address2,
                   city: order.city,
                   state: order.state,
                   postcode: order.postcode,
                   country: order.country,
                   combinedItems: [itemsString].filter(Boolean),
                   buyerNote: order.buyerNote
                });
             }
          }

          // Final output formatting for consolidated
          for (const [key, merged] of consolidatedMap.entries()) {
             resultsArray.push({
                orderIds: merged.orderNumbers.join(', '), // Could be multiple
                buyerUsername: merged.buyerUsername,
                name: merged.postToName,
                address1: merged.address1,
                address2: merged.address2,
                city: merged.city,
                state: merged.state,
                postcode: merged.postcode,
                country: merged.country,
                itemsSummary: merged.combinedItems.join(' + '),
                buyerNote: merged.buyerNote
             });
          }

          resolve(resultsArray);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};
