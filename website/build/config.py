"""Site settings. Change and re-run build.py."""

SITE_URL = "https://rajcreation.info"

# Secret part of the rate-list link: https://rajcreation.info/p/<PRICE_TOKEN>/
# Anyone with the link can see prices. To "change the lock", put a new value here,
# rebuild, re-upload and update the link in the WhatsApp bot.
PRICE_TOKEN = "rl-7qk4x9m2"

# Google Sheet → File → Share → Publish to web → sheet "Rates" → CSV → copy link here.
# While empty, the site uses the prices from "Website Rates (for Google Sheet).xlsx" at build time.
RATES_CSV_URL = "https://docs.google.com/spreadsheets/d/1a1nFUrQZUjyx6uZYUQUAbxShWa-fzaKtTPakG3Z1WKM/gviz/tq?tqx=out:csv&sheet=Rates"

# Mahek's order page (rajcreation.info/orders/) talks to this n8n webhook (workflow "RC - Order Portal").
# The page itself holds no secrets: Mahek logs in with a one-time code sent to her WhatsApp.
PORTAL_API = "https://gadaironman.app.n8n.cloud/webhook/rc-portal"

BOT_WHATSAPP = "919322702543"   # orders and the WhatsApp button go to the bot number
PHONE_DISPLAY = "+91 91122 96139"

# Price levels, from highest prices to lowest. A customer starts at the business type they picked in the
# WhatsApp bot (passed to the site in the link) and automatically gets a cheaper "open" level once the
# order meets its minimum (e.g. a reseller ordering Rs 12,000+ gets retailer prices). All levels are shown
# to everyone; the increases themselves are never shown.
# "pct" = % on the base rate, "add" = rupees per dozen on the base rate,
# "mov" = minimum order value (items total, before GST). The wholesaler minimum is 1 carton instead.
BUSINESS_TYPES = [
    {"id": "other", "pct": 30, "mov": 5000},
    {"id": "reseller", "pct": 25, "mov": 5000},
    {"id": "retailer", "pct": 15, "mov": 12000, "open": True},
    {"id": "wholesaler", "add": 3, "carton": True, "open": True},
]
# Wholesale cartons: all boxes (scrunchies, rubber bands, bun donuts) or all packets (other items), never mixed.
# A carton is exactly 90 boxes or exactly 70 packets. Mixed carts or any other quantity go to the sales associate.
CARTON = {"box": {"min": 90, "max": 90}, "packet": {"min": 70, "max": 70}, "fee": 400}
GST_PCT = 5
