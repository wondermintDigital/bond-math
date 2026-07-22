# Bond Math

A React/Vite starter website styled after the attached dark mint/gold finance dashboard, customized for bond math.

## Features included

- Dark premium dashboard UI branded as **Bond Math**
- Historical US Treasury yield curve chart
- Date slider to move across curve history
- Google Sheets CSV adapter placeholder
- Price ↔ Yield calculator
- YTM solver
- Macaulay duration, modified duration, and convexity outputs
- Price/yield inverse relationship chart
- Cash flow timeline visualization
- Reference/SEO content sections for day counts, dirty vs. clean price, glossary, and exam prep

## Run locally

```bash
npm install
npm run dev
```

## Connect Google Sheets

1. Structure your sheet with this exact header row:

```csv
date,m1,m3,m6,y1,y2,y5,y7,y10,y20,y30
```

2. In Google Sheets, choose **File → Share → Publish to web** and publish the tab as CSV.
3. Copy the CSV URL.
4. Open `src/main.jsx` and replace:

```js
const GOOGLE_SHEET_CSV_URL = '';
```

with:

```js
const GOOGLE_SHEET_CSV_URL = 'YOUR_PUBLISHED_CSV_URL_HERE';
```

If the URL is blank or the sheet fails to load, the app automatically falls back to the bundled sample data.

## Suggested next edits

- Add real Treasury curve data from your Google Sheet
- Extend the YTW/YTC card into a full call schedule calculator
- Add an accrued interest module with day count convention toggles
- Add SEO article pages with React Router or a static content folder
- Replace the BM logo mark with your final logo
