# Analytics PDF drawn like the page

Goal: the Analytics PDF looks like `/admin/analytics`, with charts, arrows and "New" tags, instead of plain tables.

- Approach: draw with `pdf-lib` (no new packages), in `src/lib/export/analytics-pdf.ts`, from the same `getAnalytics` data. A4 landscape.
- Sections (ticked ones only, page order): summary cards; income/expense bar chart with exact values under the bars; month vs previous cards with the "Additional this month" box; compare two months; expense/income tables with arrows, New tags, shaded selected month and total row; collection tiles with progress bars and chips for flats still to pay in the selected month.
- Amounts show "Rs." (the standard PDF fonts have no rupee sign). Colours are fixed indigo plus the page's teal/rose pair.
- Not changed: Excel export, Monthly and Total Dues PDFs.
- Check: `scripts/check-analytics-pdf.ts` in `npm test`; real PDFs reviewed by eye.
