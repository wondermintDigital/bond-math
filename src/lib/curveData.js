import { useEffect, useState } from 'react';
import { MATURITIES } from './bondMath';

// Published Google Sheet CSV (File → Share → Publish to web → CSV); pulls FRED Treasury yields via IMPORTDATA.
export const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2mTZYUM7WdWmqGaxSD7TnkH7_O5r9egJfG2GdWYBd9x2GHD0eL2KrId_6YxLY4vUt3SnZUnaLipQi/pub?gid=0&single=true&output=csv';

export const SAMPLE_CURVES = [
  { date: '2019-01-02', m1: 2.42, m3: 2.41, m6: 2.51, y1: 2.60, y2: 2.50, y5: 2.49, y7: 2.56, y10: 2.66, y20: 2.83, y30: 2.97 },
  { date: '2020-03-09', m1: 0.57, m3: 0.33, m6: 0.34, y1: 0.38, y2: 0.38, y5: 0.46, y7: 0.56, y10: 0.54, y20: 0.87, y30: 0.99 },
  { date: '2021-06-01', m1: 0.01, m3: 0.02, m6: 0.04, y1: 0.05, y2: 0.14, y5: 0.80, y7: 1.23, y10: 1.62, y20: 2.19, y30: 2.30 },
  { date: '2022-10-03', m1: 2.79, m3: 3.33, m6: 4.06, y1: 4.05, y2: 4.12, y5: 3.92, y7: 3.85, y10: 3.65, y20: 3.97, y30: 3.72 },
  { date: '2023-10-19', m1: 5.57, m3: 5.60, m6: 5.57, y1: 5.44, y2: 5.16, y5: 4.98, y7: 4.98, y10: 4.99, y20: 5.31, y30: 5.10 },
  { date: '2024-05-15', m1: 5.48, m3: 5.46, m6: 5.39, y1: 5.17, y2: 4.72, y5: 4.36, y7: 4.36, y10: 4.35, y20: 4.60, y30: 4.51 },
  { date: '2025-01-15', m1: 4.39, m3: 4.34, m6: 4.30, y1: 4.18, y2: 4.25, y5: 4.47, y7: 4.57, y10: 4.65, y20: 4.93, y30: 4.86 },
  { date: '2026-02-13', m1: 4.36, m3: 4.31, m6: 4.22, y1: 4.05, y2: 3.88, y5: 3.72, y7: 3.78, y10: 3.91, y20: 4.25, y30: 4.34 },
];

// Maps FRED series IDs (from fredgraph.csv via Google Sheets IMPORTDATA) to curve keys.
const CSV_KEY_MAP = {
  date: 'date',
  DATE: 'date',
  observation_date: 'date',
  DGS1MO: 'm1',
  DGS3MO: 'm3',
  DGS6MO: 'm6',
  DGS1: 'y1',
  DGS2: 'y2',
  DGS5: 'y5',
  DGS7: 'y7',
  DGS10: 'y10',
  DGS20: 'y20',
  DGS30: 'y30',
};

// Google Sheets may publish dates as locale strings (1/2/2019) or raw serial numbers (days since 1899-12-30).
function normalizeDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  let parsed;
  if (/^\d{1,6}$/.test(value)) {
    parsed = new Date(Date.UTC(1899, 11, 30) + Number(value) * 86400000);
    return parsed.toISOString().slice(0, 10);
  }
  parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getDate()).padStart(2, '0');
  return `${parsed.getFullYear()}-${mm}-${dd}`;
}

function parseCsv(text) {
  const [headerLine, ...rows] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(',').map((h) => CSV_KEY_MAP[h.trim().replace(/^"|"$/g, '')] || h.trim());
  return rows
    .map((row) => {
      const values = row.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const obj = {};
      headers.forEach((header, index) => {
        const value = values[index];
        // FRED marks missing observations with '.'; Google Sheets publishes them as empty cells.
        obj[header] = header === 'date' ? normalizeDate(value) : (value === '' || value === '.' || value === undefined ? NaN : Number(value));
      });
      return obj;
    })
    .filter((row) => row.date && MATURITIES.every((m) => Number.isFinite(row[m.key])));
}

// Keep the history slider responsive when the feed has years of daily rows.
function thinCurves(rows, maxPoints = 260) {
  if (rows.length <= maxPoints) return rows;
  const step = Math.ceil(rows.length / maxPoints);
  const thinned = rows.filter((_, i) => i % step === 0);
  if (thinned[thinned.length - 1] !== rows[rows.length - 1]) thinned.push(rows[rows.length - 1]);
  return thinned;
}

export function useYieldCurveData() {
  const [curves, setCurves] = useState(SAMPLE_CURVES);
  const [source, setSource] = useState('Sample curve history');

  useEffect(() => {
    if (!GOOGLE_SHEET_CSV_URL) return;
    fetch(GOOGLE_SHEET_CSV_URL)
      .then((response) => response.text())
      .then((csv) => {
        const parsed = thinCurves(parseCsv(csv));
        if (parsed.length) {
          setCurves(parsed);
          setSource('St. Louis Federal Reserve');
        }
      })
      .catch(() => setSource('Sample curve history'));
  }, []);

  return { curves, source };
}
