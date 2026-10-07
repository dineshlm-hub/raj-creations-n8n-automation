# rajcreation.info: How to go live

## What's in this folder
| File / folder | What it is |
|---|---|
| `rajcreation.info - upload to public_html.zip` | The finished website. Upload this. |
| `Website Rates (for Google Sheet).xlsx` | The master price list (139 items). Review it, then import it into Google Sheets. |
| `public/` | The same website, unzipped (used for previewing). |
| `src/`, `build/` | The source files and build script. Needed only when the site changes. |

**Secret rate-list link:** `https://rajcreation.info/p/rl-7qk4x9m2/`

The WhatsApp bot will send this link to customers. Anyone who opens it once also sees prices and the "Add" buttons on the catalogue pages.

---

## Step 1: Review the price list
Open **Website Rates (for Google Sheet).xlsx**. It replaces the earlier "Item code check" file.
- **Yellow rows:** read the Note column and fix anything that's wrong.
- **Red rows:** catalogue photos that have no price yet (RC 200, 968, 959, RC 307, RC 271, RC 262). Fill in Code, Rate per dozen and Packet (dozen). Leave them empty if they should show "Price on request".
- **To hide an item:** set **Show** to `N`.
- **Catalogue item** links a price to its photo. Type the code exactly as it's printed on the catalogue photo.

## Step 2: Put the price list in Google Sheets
1. Upload the xlsx to Google Drive, right-click it and choose **Open with → Google Sheets**. Then use **File → Save as Google Sheets**. The yellow and red colours are kept. Keep the tab name **Rates** and keep the column headings unchanged. You can do this before reviewing and fix the rows later in the Google Sheet itself.
2. In Google Sheets: **File → Share → Publish to web**. Choose the sheet **Rates** and the format **Comma-separated values (.csv)**, then click **Publish**.
3. Copy the link it shows and send it to me. I'll connect it and rebuild the zip.

From then on, Mahek edits prices in this Google Sheet and the website updates within about 5 minutes.

## Step 3: Upload to MilesWeb
1. Log in to the MilesWeb **cPanel** for rajcreation.info and open **File Manager → public_html**.
2. Click **Upload** and choose `rajcreation.info - upload to public_html.zip`.
3. Back in public_html, right-click the zip → **Extract** into `public_html`, then delete the zip.
4. Check that `.htaccess` is there. It's a hidden file, so use **Settings → Show Hidden Files** to see it.
5. Turn on HTTPS: in cPanel, open **SSL/TLS Status** → **Run AutoSSL**. This can take a few minutes after the domain starts pointing to MilesWeb.

## Step 4: Test it
- Open https://rajcreation.info on your phone. Search `D01`, `432` and `tesla 712`, and open an item.
- Open the secret rate-list link, add a few packets, and press **Send order on WhatsApp**. WhatsApp should open with the order typed out.

## Step 5: Switch the WhatsApp bot to website links
The bot is already updated:
- **Website orders are live.** A `🛒 NEW ORDER` message is saved to the leads sheet. The customer gets a thank-you in their language, and Mahek gets an alert with the total and the items.
- **Website links are ready but switched off.** The bot still sends the PDFs for now.

Once rajcreation.info opens in the browser:
1. In n8n, open **Raj Creations - WhatsApp Lead Funnel v2** → node **Build Context**.
2. Near the top, change `const SITE_LIVE = false;` to `const SITE_LIVE = true;`.
3. Save, then **Publish**. Or just ask me to do it.

From then on:
- The catalogue is sent as 3 category links.
- The rate list is sent as the secret link.
- Big-order customers also get the rate-list link.
- Every link opens the site in the customer's language (`?lang=hi`, `ta`, `te` or `en`).

## Languages
The site works in English, हिंदी, தமிழ் and తెలుగு. Customers switch with the 🌐 picker at the top. Links from the bot open in the language the customer chose in WhatsApp.

Item codes stay as printed. Item notes like "4 colour range available" are translated. The order message sent to WhatsApp stays in English so the bot can read it.

---

## Changing things later
| Change | What to do |
|---|---|
| Prices, packets, hide/show an item | Edit the Google Sheet. Nothing else needed. |
| New catalogue PDF pages | Update `build/catalogue_pages.py`, run `python build.py --images`, then upload the new zip. |
| New secret link (e.g. it got shared too widely) | Change `PRICE_TOKEN` in `build/config.py`, rebuild, upload, and update the link in the bot. |
| Business types (increase, minimum order), carton sizes, ₹400 carton fee, GST % | Edit `BUSINESS_TYPES`, `CARTON`, `GST_PCT` in `build/config.py`, rebuild, upload. The bot texts (minimums in the list and messages) live in the n8n "Build Context" node. |
