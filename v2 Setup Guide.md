# Raj Creations WhatsApp Bot v2: Go-live steps

These new workflows are in n8n:

- **Raj Creations - WhatsApp Lead Funnel v2**: switched **OFF**, ready to go live.
- **Raj Creations - Bot Error Alert v2**: switched on. It does nothing until the v2 funnel hits an error.
- **WhatsApp Bot Inbox**: a small n8n Data Table the bot uses to drop duplicate messages and queue quick back-to-back ones. Rows clear themselves after 24 h.

The old funnel and the old error alert are unchanged and still live.

---

## Step 1: Create the two WhatsApp message templates

> **Automatic since 3 Oct 2026:** you no longer need to create these by hand. The n8n workflow
> **Raj Creations - Template Guardian** checks Meta every 2 hours. If a template is missing, disabled or
> paused, it submits a fresh copy with a date-stamped name (for example `rc_lead_alert_0310261713`) and
> the bot switches to it automatically. The name in use, its status and a change history are in the n8n
> data table **WhatsApp Templates**. A **REJECTED** copy is not recreated automatically; the table's
> `note` column says why. The texts below are what the Guardian submits. Templates must live in the
> **"Raj Creation" (+91 93227 02543)** WhatsApp account.

Go to **WhatsApp Manager → Account tools → Message templates → Create template**, then fill in:

- **Category:** Utility
- **Language:** English (US). The workflows use code `en_US`; if you ever recreate a template as plain English, the code must change to `en`
- **Name:** must match exactly (shown under each template below)

Approval usually takes from a few minutes to a few hours.

> **Updated 3 Oct 2026:** the first two templates (`rc_sales_alert`, `rc_bot_error_alert`) kept disappearing from
> WhatsApp Manager, so the bot now uses two simpler templates with **new names**. Create these two instead.

### Template 1. Name: `rc_lead_alert`

Body (copy exactly):

```
New alert from the Raj Creations WhatsApp assistant.

Reason: {{1}}
Customer: {{2}}
Details: {{3}}

Please reply to this customer from your phone soon. This message was sent automatically by our order assistant.
```

Sample values for the form:

1. New WEBSITE ORDER of Rs 13,671 including GST
2. Priya, +91 98000 00000
3. Business / City: Sharma Fancy Store, Pune | Type: Retailer | Language: Hindi | Items: 322 x35 box

**Buttons** (scroll down to *Buttons* → *Add button* → *Visit website*, twice). Add them in this order; the first one is required:

Button 1 (required):

- Button text: `Chat with customer`
- URL type: **Dynamic**
- URL: `https://rajcreation.info/chat/?n={{1}}` (Meta doesn't allow wa.me links in buttons; this page on the website forwards to the WhatsApp chat)
- Sample value: `https://rajcreation.info/chat/?n=919800000000`

The bot fills in the customer's number, so Mahek taps the button and their chat opens.

Button 2 (optional):

- Button text: `Open leads sheet`
- URL type: **Static**
- URL: `https://docs.google.com/spreadsheets/d/1W4jmnP3XUVXk7EimIOOjTx4GcfaqHiUAXnaM1bsGiHE/edit`

This button opens the Google Sheet with every customer's details.

### Template 2. Name: `rc_bot_problem`

Body:

```
The Raj Creations WhatsApp assistant had a problem.

Step: {{1}}
Error: {{2}}
Time: {{3}}

A customer may not have received a reply. Please check recent chats and the n8n executions list.
```

Sample values:

1. Send Welcome Message
2. Request timed out
3. 03 Oct 2026, 12:00 PM

**Button** (*Visit website*):

- Button text: `Open n8n`
- URL type: **Static**
- URL: `https://gadaironman.app.n8n.cloud/workflow/OZLCCBDrLeivkkMf/executions`

**If a template is rejected or not approved yet:** alerts fall back to a plain message. That fallback only reaches Mahek if she has messaged the bot number in the last 24 hours. If Meta says the wording is "too many variables for its length", add one more sentence of fixed text and resubmit.

**Cost:** Meta charges for each template message (Utility rate, India). It's free if Mahek has messaged the bot within the last 24 hours.

---

## Step 2: Add two columns to the leads sheet

In the Google Sheet, on tab **Sheet1**, type these two headers in the first empty cells of **row 1**, spelled exactly:

| paused_until | last_alert_at |
|---|---|

Leave the cells below them empty. The bot fills them in.

---

## Step 3: Switch over

1. In n8n, **turn OFF** "Raj Creations - WhatsApp Lead Funnel" (the old one).
2. **Turn ON** "Raj Creations - WhatsApp Lead Funnel v2".

Only one WhatsApp trigger can be live at a time. Switching v2 on moves the Meta webhook to it. To roll back, turn v2 off and turn the old one back on.

**Don't** click "Listen for test event" on the WhatsApp Trigger. It points the webhook at a test URL, and the live bot stops replying until the workflow is switched off and on again.

---

## Step 4: Quick live test (from a spare phone, not Mahek's)

1. Send "Hi". You should get the language list. Pick a language and send a shop name containing "Sales" (e.g. "Krishna Sales, Pune"). The bot should move on to the business-type list.
2. Pick a business type (the list shows each type's minimum order). You should get **one** message with an **Open rate list** button (since 3 Oct 2026). Tap it: the site should be in your chosen language with your shop name and city already in the order form. Place a small order from the site; Mahek should get the **rc_lead_alert** message with the *Chat with customer* button.
   - Then send "hi" again: you should get "Welcome back" with the rate list button (no restart).
   - Send "catalogue": you should get a **View catalogue** button.
   - Send "item 322 price?": the rate list button opens with 322 searched.
3. Send a voice note. You get a thank-you reply and Mahek gets an alert. Send a second one: you get nothing back and Mahek gets no new alert (30-minute limit).
4. From Mahek's phone, send `hi` to the bot number. She should get the console menu with recent customers. Tap the spare number to see its status card.
5. On the alert for the step 2 order, tap **Finalize order**, reply `0` (free shipping) and then **Send to customer**. The spare phone should receive the confirmation PDF.

---

## Mahek's WhatsApp console (since 7 Oct 2026)

Mahek uses the bot number from +91 91122 96139. She rarely needs to type a number.

**Alerts.** Each alert is a message with the customer's details and a **Chat with customer** button. A second message follows with buttons:
- **Finalize order**
- **Pause bot** / **Resume bot**
- **Status**

Website orders are listed item by item, with packets, dozens, GST and total.

**Without typing a number:**
- Tap a button on an alert.
- Or swipe-reply to an alert and type `pause`, `resume`, `status` or `finalize`.
- Or type `pause`, `resume` or `status`: it applies to the customer she opened last (within 6 hours).
- Send `hi` or `menu` for a list of recent customers. Tap one to open their status card.
- Send `orders` for open website orders.
- Send `sheet` for the leads & orders sheet.
- `status 98XXXXXXXX` still works for any number.

**Finalizing an order (PDF confirmation):**
1. Tap **Finalize order**.
2. The bot shows the items and totals. Reply with the shipping cost, e.g. `350`, or tap **Free shipping**.
3. Optional: change an item by replying with its code and packets, e.g. `TESLA-707 3`. Use `0` to remove it.
4. Check the preview and tap **Send to customer**.

The customer gets a PDF with photos, rates, quantities, GST, shipping and the grand total. Mahek gets a copy.

If the customer's 24-hour window is closed, they get the `rc_order_confirmed` template instead. Its **Get confirmation PDF** button sends them the PDF.

**Keep Mahek's window open.** Mahek should message the bot at least once a day; tapping any button counts. Inside that window, alerts are free normal messages with buttons. Outside it, only the approved `rc_mahek_alert` template gets through, and that needs the WhatsApp billing / tax details completed.

**Customers can change their order.** The order thank-you has an **Edit order** button, and typing "change my order" also gets it. Their order opens on the website. Sending it again updates the same Order ID, and Mahek gets the changes (➕ / 🔁 / ➖).

**Where orders are kept:**
- n8n data table **RC Orders**.
- The **Orders** tab of the leads sheet, one row per order.
- Customers are in data table **RC Customers**, which the bot reads (fast), and are still copied to **Sheet1** after each reply.

---

## Later on 7 Oct 2026

1. **The bot never pauses itself.** It keeps replying after a handoff, a website order or a big order. Only Mahek pauses a customer (Pause bot button, or `pause` in her console), and it stays paused until she taps **Resume bot** or for 30 days. If a customer sends another message the bot can't handle within 30 minutes of an alert, it is only logged, so neither the customer nor Mahek gets the same message twice.
2. **New customers always get a reply.** A number that wasn't in the RC Customers table yet stopped the run before the bot could answer. Fixed.
3. **Company name is Raj Creation** (not "Raj Creations") in every bot message in all five languages, Mahek's console and alerts, the PDF file names and the website.
4. **Order confirmation PDF:** says it is only a reference receipt and that the official receipt is given separately. Its logo now reads "RAJ CREATION". The bot downloads that logo from the website, so it shows only after the updated website is uploaded.
5. **Welcome message:** the bun donuts line uses 💇‍♀️ instead of 🍩.

The approved WhatsApp templates (alerts to Mahek, order confirmed) still say "Raj Creations": Meta has to approve any change to their wording.

## Mahek's order page: rajcreation.info/orders/ (from 7 Oct 2026)

A private page where Mahek checks website orders, changes them and tells the customer. It is not linked from the site and is kept out of search engines.

**Open it**
- In WhatsApp, Mahek says *hi* to the bot (or types *page*, *website* or *login*). The reply has a green **Open orders page** button. The *orders* list has the same button.
- Tip: on the page, use the browser menu → **Add to Home screen** to get an app-like icon on her phone.

**Log in**
- On the page, tap **Send code to WhatsApp**. A 6-digit code arrives from the bot within seconds. Type it in.
- The code works for 10 minutes. After 5 wrong tries it stops working. At most 5 codes are sent per hour.
- WhatsApp only lets the bot message Mahek within 24 hours of her last message to it. If no code arrives, send "hi" to the bot first.
- The login lasts 7 days on that phone. **Log out** ends it at once.

**Change an order** (newest 100 orders, filter Open / Confirmed / All, search):
- **− / +** or type a number to change packets or boxes.
- **❌ Out of stock** removes an item, and the customer is told it is out of stock. **🔁 Suggest replacement** or **🔁 Replace** picks another item from the rate list at the customer's price level. The rate can be changed if a different price was agreed.
- **⚠️ Only some** sets a limited quantity, e.g. "only 3 packets available (you ordered 8)".
- **➕ Add an item**, **➖ Remove**, **↩ Undo**.
- Set the shipping cost and an optional note to the customer.

**Send**
- **Review & send** shows the changes, the new total and the exact message in the customer's language, with English below it. Then **Save & send**. Untick the box to save without a message.
- **✅ Confirm & PDF** does the same and then sends the reference-receipt PDF, exactly like Finalize in the WhatsApp console. Mahek gets a copy.
- Customer messaged in the last 24 hours: the update goes as a normal WhatsApp message from the bot.
- Not in the last 24 hours: the update goes as the `rc_order_update` template once Meta approves it. The Template Guardian creates it automatically. Until then, the page shows a **Send from my WhatsApp** button with the message ready to send from Mahek's phone.
- Template messages also fail while Meta's billing issue (error 131042, below) is not fixed. After a template send, the page always offers the same button as a backup.
- The customer's reply reaches Mahek like any other follow-up after an order: the bot alerts her. The bot is never paused automatically.
- If the customer changed the order on the website while Mahek was editing, saving is stopped and the page reloads the new version, so nothing is overwritten.

**Behind it:**
- n8n workflow **RC - Order Portal**, webhook `rc-portal`. It accepts requests only from rajcreation.info.
- Data table **RC Portal Sessions** holds only hashes of the login codes and logins.
- Orders are saved in the same **RC Orders** table and **Orders** sheet tab as the bot and console use. Each change is written to the order's Notes.
- Page files: `website/src/orders.html` and `website/src/assets/orders.js`. The API address is `PORTAL_API` in `website/build/config.py`.

## What changed earlier on 7 Oct 2026

1. **Why alerts stopped:** Meta accepted the alert templates but then failed them with error **131042** ("Business eligibility payment issue"). The bot's WhatsApp account has no tax or payment details since AiSensy was removed. Fix it in **Meta Business → Billing hub**. Until then, alerts only reach Mahek inside her 24-hour window.
2. **Failed deliveries are caught:** when Meta reports that a message failed, the bot resends it as a normal message where it can, and logs it in the **RC Alert Log** data table.
3. **Orders no longer mixed up with handoffs:** the website's 🛒 emoji was arriving garbled, so orders were treated as "talk to sales". Orders are now recognised by their layout (header, numbered items, TOTAL). The website message no longer uses emojis in key lines.
4. **New templates** (created automatically by the Template Guardian):
   - `rc_mahek_alert`: alert with Finalize / Status / Pause buttons, plus Chat with customer and Leads sheet links.
   - `rc_order_confirmed`: customer confirmation with a Get confirmation PDF button.
5. **Language list:** now has a branded header, a friendlier message, and a short description under each language.
6. **Speed:**
   - The bot reads customers from n8n data tables instead of Google Sheets.
   - The sheet is updated after the reply has gone out.
   - The back-to-back wait is now 4 s per earlier message, 20 s max.
   - Alerts are sent in the background.
7. **New sub-workflows:**
   - **RC - Mahek Alerts**
   - **RC - Admin Console**
   - **RC - Order Confirmation** (builds and sends the PDF)

## What changed vs v1

1. **Mahek's alerts:** sent with an approved template, so they arrive even outside the 24-hour window. A plain-text fallback is built in. Each alert includes a `wa.me` tap-to-chat link. Her own number is kept out of the sales flow.
2. **Shop names:** names like "Krishna Sales" or "Owner's Choice" no longer trigger a handoff to Mahek. While the bot is waiting for the shop name, only clear phrases like "talk to someone" or "call me" count as asking for a person.
3. **Customers who come back after a big order:**
   - New messages now alert Mahek (at most once every 30 minutes).
   - "catalogue" or "menu" resends the catalogue.
   - "rate list" resends the rate list.
   - "hi" restarts the flow, as before.
4. **Order values:**
   - Quantities are ignored ("20 pcs" isn't read as ₹20).
   - k / thousand / lakh and Hindi digits are understood.
   - The biggest amount in the message is used.
   - Orders under ₹5,000 get a rate-list caption that mentions the minimum order.
5. **Other message types:**
   - Voice notes, documents, videos, locations, contact cards and cart orders: the customer gets a thank-you and Mahek gets an alert.
   - Reactions and stickers: ignored.
6. **Less spam:**
   - After a handoff, Mahek gets at most one follow-up alert every 30 minutes. (Until 7 Oct 2026 the bot also went quiet for 24 h after a handoff; now only Mahek pauses it.)
   - Small talk like "ok thanks" or "ji sir" doesn't trigger a handoff.
   - The customer message now says "They will contact you shortly" (no more "here", since Mahek replies from her own phone).
7. **Duplicates and bursts:**
   - Repeat deliveries of the same message are dropped.
   - A message that arrives within 10 s of another from the same customer waits 6 s per earlier message (30 s max), so it reads the updated chat step.
8. **Reliability:**
   - Sheets, Drive and WhatsApp steps retry up to 3 times.
   - The Meta API was updated from v21.0 to v24.0.
9. **Catalogue:** customers can type "catalogue" or "menu" at any time after receiving it.

## Settings you can tune

These are at the top of the **Build Context** node:

- `ADMIN_PAUSE_DAYS = 30` (how long Mahek's pause lasts if she doesn't resume)
- `ALERT_COOLDOWN_MIN = 30`
- `BIG_ORDER = 10000`
- `MOQ = 5000`
