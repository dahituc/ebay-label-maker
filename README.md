# eBay Label Maker

A local-first, premium web application for processing eBay order exports into standardized thermal mailing labels. Built with **React**, **Vite**, and **Dexie.js**.

## 🚀 Key Features

- **Batch Processing**: Upload eBay CSVs and manage them as independent batches.
- **Order Merging**: Automatically combines multiple orders for the same buyer to save on postage.
- **Intelligent Validation**: Hybrid address validation using local rules and the **Geoapify API**.
- **Label Customization**: Set custom thermal label dimensions and choose from Google Fonts.
- **Privacy First**: All data is stored locally in your browser (IndexedDB). No backend, no server.
- **Premium Design**: Clean, modern interface with dark mode and smooth transitions.

## 🛠️ Tech Stack

- **Framework**: React 18 (Vite)
- **Database**: Dexie.js (IndexedDB)
- **CSV Parsing**: PapaParse
- **Icons**: Lucide React
- **Validation**: Geoapify Batch API

## 📋 Quick Start

1. **Clone & Install**:
   ```bash
   git clone <repository-url>
   npm install
   ```
2. **Run Dev Server**:
   ```bash
   npm run dev
   ```
3. **Configure API**:
   - Go to **Settings** in the app.
   - Add your [Geoapify API Key](https://www.geoapify.com/geocoding-api) (Free tier supports 3,000 requests/day).
4. **Process Labels**:
   - Upload your eBay CSV to the **Dashboard**.
   - Review any address issues.
   - Print your consolidated labels.

## 🖨️ Label Specifications

Designed for thermal printers (e.g., Dymo, Rollo, Brother).
- **Default Size**: 90mm x 30mm (Customizable in Settings)
- **Font**: Customizable Google Fonts
- **Output**: Native browser print (`window.print`)
