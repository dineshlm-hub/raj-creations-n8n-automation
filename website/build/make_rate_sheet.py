"""One-time: turn the old rate list Excel into the website rate sheet.

Output: "Website Rates (for Google Sheet).xlsx" in the website folder. That file is
what gets imported into Google Sheets; after that the Google Sheet is the master
and this script is not needed again.
"""
import re
from pathlib import Path

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from catalogue_pages import PAGES

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "RC&RT  MIX (1).xlsx"
OUT = ROOT / "website" / "Website Rates (for Google Sheet).xlsx"

CAT_NAME = {"clutchers": "Clutchers", "scrunchies": "Scrunchies", "tie-bow": "Tie Bow", "other": "Other"}
EXCEL_CAT = {
    "CLUTCHERS": "clutchers",
    "SCRUNCHIES / RUBBER BAND": "scrunchies",
    "HAIR BUN DONUT": "scrunchies",
    "HAIR  TIE  BOW": "tie-bow",
    "CARTON": "other",
}


def norm(s):
    return re.sub(r"[^A-Z0-9]", "", str(s).upper())


def core(s):
    n = norm(s)
    m = re.fullmatch(r"(?:RC|RJ|RAJ|T|RT)?(\d{3,4})", n)
    return m.group(1) if m else n


# Rate-list items whose catalogue page can't be found by matching codes.
# value: (catalogue category, catalogue item code as printed, question for the reviewer)
LINKS = {
    "RC-400 ( FUR CHIMTA)": ("clutchers", "TESLA 400", "Catalogue page says TESLA 400 – same item as RC-400 fur chimta?"),
    "TESLA-RM (712)": ("clutchers", "TESLA 712", "Same item as TESLA-712 (₹72)? If yes, delete one row."),
    "RT-601 TIER RUBED ": ("scrunchies", "RC-601", "Catalogue says RC-601, rate list says RT-601 – same item?"),
    "RC-613 (12 PC) TIER RUBED": ("scrunchies", "T-613", "Catalogue says T-613 – same item?"),
    "RC-614": ("scrunchies", "T-614", "Catalogue says T-614 – same item?"),
    "RC-618": ("scrunchies", "T-618", "Catalogue says T-618 – same item?"),
    "RC-619": ("scrunchies", "T-619", "Catalogue says T-619 – same item?"),
    "J.J. JUMBO": ("scrunchies", "GEORGETTE JUMBO", "Is GEORGETTE JUMBO (catalogue) = J.J. JUMBO? Listed twice: pkt 4 here, pkt 1 in the other row."),
    "J.J.JUMBO": ("scrunchies", "GEORGETTE JUMBO", "Duplicate of J.J. JUMBO but packet 1 instead of 4 – which is right? Delete the wrong row."),
    "MOBILON": ("scrunchies", "MOBILON", "Or is the catalogue MOBILON page RC-610 (MOBILON RUBBER)?"),
    "RAJ 100 ( GIFT BOX )": ("scrunchies", "100 GIFT BOX", ""),
    "XL 30 PC": ("scrunchies", "XL / XXL 30 PC", ""),
    "XXL (30 PC)": ("scrunchies", "XL / XXL 30 PC", ""),
    "RC-504": ("tie-bow", "RC 504", "Old rate list had this under SCRUNCHIES; catalogue has it under tie bows – moved to Tie Bow."),
    "RC-511": ("tie-bow", "RC 511", "Rate list also has a scrunchies item '511' at ₹33 – different item?"),
    "511": (None, None, "Different from RC-511 tie bow (₹96)? No catalogue photo."),
    "300": ("scrunchies", "300", "Not the same as RC-300 fur chimta (clutchers, ₹90)."),
    "RC-300 (FUR CHIMTA)": ("clutchers", "RC 300", "Not the same as scrunchies 300 (₹57)."),
    "400": ("scrunchies", "400", "Not the same as RC-400 fur chimta (clutchers, ₹150)."),
    "RC-202": ("scrunchies", "202", ""),
    "XL(72 PC )": (None, None, "Same as 'XL (72 PC RUBED)'? Same rate and packet – delete one row."),
}
# Rows that should not be shown on the website.
HIDE = {"CARTOON": "Carton charge, not a product. Keep hidden (or tell us if it should be added to orders)."}


def split_code(item):
    """'RC-613 (12 PC) TIER RUBED' -> ('RC-613', '12 PC · TIER RUBED')"""
    s = re.sub(r"\s+", " ", str(item)).strip()
    s = re.sub(r"^RC- ", "RC-", s)
    brackets = re.findall(r"\(([^)]*)\)", s)
    rest = re.sub(r"\([^)]*\)", " ", s).strip()
    if s.startswith("TESLA-RM"):
        return "TESLA-RM 712", "Rubber matt"
    parts = rest.split(" ", 1)
    code = parts[0]
    extra = parts[1].strip() if len(parts) > 1 else ""
    # keep multi-word names together: "36 PC NYLON RUBBER", "MOBILON CARD", "RAJ 100", "XL 30 PC"
    if not re.search(r"\d", code) or extra.upper().startswith(("PC ", "PC", "GM")):
        code, extra = rest, ""
    if code in ("XL", "XXL") and brackets:
        return (code + " " + brackets[0].strip()).upper(), ""
    desc = " · ".join([x.strip() for x in brackets if x.strip()] + ([extra] if extra else []))
    desc = desc.title().replace("Pc", "pc")
    return code, re.sub(r"(\d+)\s*(?:Grm|Gm)\b", r"\1 g", desc)


def main():
    cards = {}
    for cat, pages in PAGES.items():
        for _, codes, _ in pages:
            for c in codes:
                cards.setdefault(cat, {})[norm(c)] = c
                cards[cat].setdefault(core(c), c)

    ws_src = openpyxl.load_workbook(SRC, data_only=True).active
    rows, seen = [], set()
    for r in ws_src.iter_rows(min_row=2, values_only=True):
        item, rate, pkt, excel_cat = r[1], r[2], r[3], r[4]
        if item is None:
            continue
        key = (str(item).strip(), float(rate), int(pkt))
        if key in seen:  # exact duplicate row in the old list
            continue
        seen.add(key)
        item_s = str(item)
        cat = EXCEL_CAT.get(str(excel_cat).strip(), "other")
        code, desc = split_code(item_s)
        if cat == "scrunchies" and str(excel_cat).strip() == "HAIR BUN DONUT":
            desc = ("Hair bun donut · " + desc).strip(" ·")
        link_cat, link, note = cat, "", ""
        if item_s in LINKS or item_s.strip() in LINKS:
            link_cat, link, note = LINKS.get(item_s) or LINKS[item_s.strip()]
            link_cat = link_cat or cat
            link = link or ""
        elif code.startswith("RT-") and "TIER" not in item_s:
            link = "BUN DONUT"
        else:
            c = cards.get(cat, {})
            link = c.get(norm(code)) or c.get(core(code)) or ""
        if link_cat != cat and link:
            cat = link_cat
        if not link and not note:
            note = "No catalogue photo yet."
        show = "N" if code in HIDE else "Y"
        note = HIDE.get(code, note)
        rows.append([code, desc, CAT_NAME[cat], float(rate), int(pkt), link, show, note])

    # catalogue items that have no rate at all
    linked = {(r[2], norm(r[5])) for r in rows if r[5]}
    missing = []
    for cat, pages in PAGES.items():
        for _, codes, _ in pages:
            for c in codes:
                if (CAT_NAME[cat], norm(c)) not in linked and (cat, c) not in missing:
                    missing.append((cat, c))

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Rates"
    head = ["Code", "Description", "Category", "Rate per dozen", "Packet (dozen)", "Catalogue item", "Show", "Note"]
    ws.append(head)
    cat_order = {"Clutchers": 0, "Scrunchies": 1, "Tie Bow": 2, "Other": 3}
    rows.sort(key=lambda r: (cat_order[r[2]], r[0]))
    for row in rows:
        ws.append(row)
    for cat, c in missing:
        ws.append(["", "", CAT_NAME[cat], None, None, c, "Y", "Catalogue item with NO rate – fill in Code, Rate and Packet, or leave empty for 'price on request'."])

    yellow = PatternFill("solid", fgColor="FFF2CC")
    red = PatternFill("solid", fgColor="F8CBAD")
    for row in ws.iter_rows(min_row=2):
        note = row[7].value or ""
        if note.startswith("Catalogue item with NO rate"):
            for cell in row:
                cell.fill = red
        elif note and note != "No catalogue photo yet.":
            for cell in row:
                cell.fill = yellow
        row[3].number_format = "0.00"
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="3A2E39")
    ws.freeze_panes = "A2"
    widths = [16, 34, 12, 14, 14, 20, 7, 80]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    for row in ws.iter_rows(min_row=2):
        row[7].alignment = Alignment(wrap_text=True, vertical="top")

    help_ws = wb.create_sheet("How to use")
    for line in [
        "This sheet is the master price list for rajcreation.info.",
        "",
        "Code – item code customers search for (D-01, RC-432, TESLA-712 …). Dashes/spaces don't matter for search.",
        "Description – short text shown under the code.",
        "Category – Clutchers, Scrunchies, Tie Bow or Other.",
        "Rate per dozen – BASE (wholesale ₹20,000+) rate. The website adds +10% / +15% / +20% for smaller orders.",
        "Packet (dozen) – how many dozen in one packet. Customers can only order whole packets.",
        "Catalogue item – the item code exactly as printed on the catalogue photo in the same category. Links the price to the photo. Empty = no photo.",
        "Show – Y to show on the website, N to hide.",
        "Note – for you only, never shown on the website.",
        "",
        "Yellow rows = please check the note. Red rows = catalogue photos that have no price yet.",
    ]:
        help_ws.append([line])
    help_ws.column_dimensions["A"].width = 120
    wb.save(OUT)
    print(f"saved {OUT.name}: {len(rows)} rate rows, {len(missing)} catalogue items without a rate")
    for cat, c in missing:
        print("   no rate:", cat, c)


if __name__ == "__main__":
    main()
