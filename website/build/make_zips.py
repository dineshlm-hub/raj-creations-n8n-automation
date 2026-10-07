"""Packs website/public/ into the two upload zips (run after build.py).

    rajcreation.info - upload to public_html.zip   the whole site, photos included
    rajcreation.info - UPDATE (no photos).zip      everything except the big catalogue photos, for quick updates

Upload to public_html, extract, then delete the zip from the server.
"""
import zipfile
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
OUT = SITE / "public"


def pack(name, skip_photos):
    def photo(f):  # the catalogue photos (…-t / …-f.webp); the small copies (…-s / …-m.webp, …-p.jpg) are always included
        return f.relative_to(OUT).parts[0] == "img" and not f.stem.endswith(("-s", "-m", "-p"))
    files = sorted(f for f in OUT.rglob("*") if f.is_file() and not (skip_photos and photo(f)))
    with zipfile.ZipFile(SITE / name, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for f in files:
            z.write(f, f.relative_to(OUT).as_posix())
    print(f"{name}: {len(files)} files, {(SITE / name).stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    pack("rajcreation.info - upload to public_html.zip", skip_photos=False)
    pack("rajcreation.info - UPDATE (no photos).zip", skip_photos=True)
