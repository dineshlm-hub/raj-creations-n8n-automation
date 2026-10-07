# rajcreation.info — Catalogue Website Plan

## Decisions (agreed 2 Oct 2026)
| Topic | Decision |
|---|---|
| Pkt Qty | Counted in **dozens**. Rate is per dozen. Packets can't be broken, so customers buy whole packets only. Example: D-01 = ₹16/dz × 12 dz = ₹192 per packet. |
| Rate list visibility | **Hidden link**: not in the menu and not on Google. The bot sends it to customers. |
| Order cart | **Yes**: the customer builds the order on the site and it is sent to the bot number on WhatsApp. |
| Updating rates | **Google Sheet**: Mahek edits the sheet and the site picks up the change within minutes. |
| Price levels | ₹20,000+ = base rate · ₹15–20k = +10% · ₹10–15k = +15% · ₹5–10k = +20% · below ₹5,000 = not accepted (MOQ). Level is decided by the order total at base rates. Marked-up rates are rounded to the nearest ₹0.50. |
| Hosting | Static site (HTML/CSS/JS, no database) on MilesWeb shared hosting, free SSL. |

## Site structure
- **Home** (`/`): search box, 3 category tiles, WhatsApp button.
- **Category pages:**
  - `/clutchers`
  - `/scrunchies` (Scrunchies / Rubber Band / Hair Bun Donut)
  - `/tie-bow`

  Each page is a grid of item cards: catalogue photo, item code, colour note. Tapping a card opens the full-size photo.
- **Hidden price link** (e.g. `/p/<secret>/`): the rate list plus the order cart. After a customer opens it once, the catalogue pages also show prices and an "Add packet" button for them.
- **Search** (on every page):
  - Ignores case, spaces, dashes, dots and colons, so `D01` = `d 01` = `D-01`.
  - Prefixes are optional: `432` finds "RC: 432".
  - Results show as the customer types.
  - A code that exists in two categories shows both results, each labelled.

## Order cart → WhatsApp
- The customer adds packets.
- The cart shows the total, the current price level, and a nudge such as "add ₹X more for lower rates". It blocks totals under ₹5,000.
- "Send order" opens WhatsApp to the bot number with the order typed out (code, packets, dozens, rate, line total, grand total).
- Bot change needed: recognise these order messages, save them to the leads sheet, thank the customer, and alert Mahek with the order total.

## Bot changes after launch
- Send catalogue links instead of downloading and sending PDFs from Drive.
- Send the hidden rate-list link instead of the rate-list PDF.
- Add a new "website order received" route.

## Data
- Catalogue photos: 105 PDF pages converted to compressed WebP images (thumbnail + full size, about 10 MB total, lazy-loaded).
- Item ↔ rate mapping: **Item code check - please review.xlsx**. Mahek / Raj review and correct it; the corrected sheet becomes the Google Sheet the site reads.

## Open items
1. Review the mapping sheet:
   - 19 items to check, 7 catalogue items with no rate, 34 rate items with no photo.
   - Codes that clash across categories: 300, 400, 100, 511.
   - Duplicate rows: J.J. JUMBO (pkt 1 vs 4), CARTOON, RC-253, TESLA-710, XL 72 PC.
2. Scrunchies PDF page 25 has no item code. Which item is it?
3. MilesWeb: confirm the hosting plan is active and rajcreation.info points to it (nameservers).
4. The catalogue images say "rajcreations.in" (Instagram?) but the domain is rajcreation.info. Fine if intended.
