"""
Scrape logos for UN system entities from Wikimedia Commons via Wikidata.

Strategy: Wikidata P154 (logo image) only — official, structured logo data.
Entities without a P154 claim are skipped (no photo/emblem fallbacks).

Downloads SVG originals where available, plus PNG renders.
Outputs to public/images/light/ (logos are typically dark-on-transparent).
"""

import csv
import hashlib
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

# --- Configuration ---
BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / "public" / "data" / "un-entities.csv"
LIGHT_DIR = BASE_DIR / "public" / "images" / "light"
DARK_DIR = BASE_DIR / "public" / "images" / "dark"
REPORT_PATH = BASE_DIR / "python" / "scrape_report.csv"

# Wikimedia API requires a descriptive User-Agent
USER_AGENT = "UNLogoScraper/1.0 (https://github.com/united-nations/logos; UN logo project)"
# Be polite: wait between API requests
REQUEST_DELAY = 0.5  # seconds

# PNG render size when downloading from Commons thumb endpoint
PNG_RENDER_WIDTH = 1024


def api_get(url: str, retries: int = 3) -> dict:
    """Make a GET request with proper headers and return parsed JSON."""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read())
        except Exception as e:
            if attempt < retries - 1:
                wait = 2 ** (attempt + 1)
                print(f"    ⟳ Retry {attempt + 1}/{retries} after {wait}s: {e}")
                time.sleep(wait)
            else:
                raise


def download_file(url: str, dest: Path, retries: int = 3) -> bool:
    """Download a file from URL to dest. Returns True on success."""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=60) as resp:
                dest.parent.mkdir(parents=True, exist_ok=True)
                with open(dest, "wb") as f:
                    f.write(resp.read())
            return True
        except Exception as e:
            if attempt < retries - 1:
                wait = 2 ** (attempt + 1)
                print(f"    ⟳ Download retry {attempt + 1}/{retries} after {wait}s: {e}")
                time.sleep(wait)
            else:
                print(f"    ✗ Download failed: {e}")
                return False
    return False


def get_wikidata_id(wikipedia_title: str) -> str | None:
    """Get Wikidata item ID from a Wikipedia article title."""
    encoded = urllib.parse.quote(wikipedia_title)
    url = (
        f"https://en.wikipedia.org/w/api.php?action=query"
        f"&titles={encoded}&prop=pageprops&ppprop=wikibase_item&format=json"
    )
    data = api_get(url)
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        return page.get("pageprops", {}).get("wikibase_item")
    return None


def get_wikidata_image(wikidata_id: str, prop: str) -> str | None:
    """Get an image filename from a Wikidata property (P154=logo, P18=image)."""
    url = (
        f"https://www.wikidata.org/w/api.php?action=wbgetclaims"
        f"&entity={wikidata_id}&property={prop}&format=json"
    )
    data = api_get(url)
    claims = data.get("claims", {}).get(prop, [])
    if claims:
        snak = claims[0].get("mainsnak", {})
        dv = snak.get("datavalue", {})
        if dv.get("type") == "string":
            return dv["value"]
    return None


def get_commons_file_info(filename: str) -> dict | None:
    """Get URL and MIME type for a Wikimedia Commons file."""
    encoded = urllib.parse.quote(filename)
    url = (
        f"https://commons.wikimedia.org/w/api.php?action=query"
        f"&titles=File:{encoded}&prop=imageinfo&iiprop=url|mime&format=json"
    )
    data = api_get(url)
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        infos = page.get("imageinfo", [])
        if infos:
            return infos[0]
    return None


def get_commons_png_thumb(filename: str, width: int = PNG_RENDER_WIDTH) -> str | None:
    """Get a PNG thumbnail URL for a Commons file at the specified width."""
    encoded = urllib.parse.quote(filename)
    url = (
        f"https://commons.wikimedia.org/w/api.php?action=query"
        f"&titles=File:{encoded}&prop=imageinfo"
        f"&iiprop=url&iiurlwidth={width}&format=json"
    )
    data = api_get(url)
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        infos = page.get("imageinfo", [])
        if infos:
            return infos[0].get("thumburl")
    return None


def search_wikipedia_images_for_logo(wikipedia_title: str) -> str | None:
    """Scan all images on a Wikipedia page for ones that look like logos."""
    encoded = urllib.parse.quote(wikipedia_title)
    url = (
        f"https://en.wikipedia.org/w/api.php?action=query"
        f"&titles={encoded}&prop=images&imlimit=50&format=json"
    )
    data = api_get(url)
    pages = data.get("query", {}).get("pages", {})

    logo_patterns = re.compile(
        r"(logo|emblem|seal|insignia|coat.of.arms|symbol|badge)", re.IGNORECASE
    )
    # Exclude patterns that are usually not the entity's own logo
    exclude_patterns = re.compile(
        r"(flag|map|commons|wiki|icon.*edit|icon.*link|question.*mark|"
        r"crystal.*clear|nuvola|gnome|tango|edit.this|disambig|ambox|"
        r"wma_button|loudspeaker|folder|people_icon|increase|decrease|"
        r"steady|unbalanced|padlock|wikispecies|wikinews|wikiquote|"
        r"wiktionary|wikisource|wikiversity|wikibooks|wikivoyage|"
        r"united.nations.*emblem|un.*emblem)",
        re.IGNORECASE,
    )

    candidates = []
    for page in pages.values():
        images = page.get("images", [])
        for img in images:
            title = img.get("title", "")
            filename = title.replace("File:", "")
            if logo_patterns.search(filename) and not exclude_patterns.search(filename):
                candidates.append(filename)

    if candidates:
        # Prefer SVG files
        svg = [c for c in candidates if c.lower().endswith(".svg")]
        return svg[0] if svg else candidates[0]
    return None


def download_logo(
    commons_filename: str, entity_code: str, file_info: dict | None = None
) -> dict:
    """Download a logo file in available formats. Returns dict of format->path."""
    results = {}
    entity_lower = entity_code.lower()

    if file_info is None:
        file_info = get_commons_file_info(commons_filename)
    if file_info is None:
        return results

    original_url = file_info.get("url", "")
    mime = file_info.get("mime", "")

    # Download original (SVG or PNG)
    if mime == "image/svg+xml":
        svg_dest = LIGHT_DIR / f"{entity_lower}.svg"
        if download_file(original_url, svg_dest):
            results["svg"] = str(svg_dest)
            print(f"    ✓ SVG saved: {svg_dest.name}")

        # Also get a PNG render
        time.sleep(REQUEST_DELAY)
        thumb_url = get_commons_png_thumb(commons_filename)
        if thumb_url:
            png_dest = LIGHT_DIR / f"{entity_lower}.png"
            if download_file(thumb_url, png_dest):
                results["png"] = str(png_dest)
                print(f"    ✓ PNG saved: {png_dest.name}")
    elif mime and mime.startswith("image/"):
        ext = "png" if "png" in mime else "jpg" if "jpeg" in mime else "png"
        dest = LIGHT_DIR / f"{entity_lower}.{ext}"
        if download_file(original_url, dest):
            results[ext] = str(dest)
            print(f"    ✓ {ext.upper()} saved: {dest.name}")
    else:
        print(f"    ✗ Unsupported MIME type: {mime}")

    return results


def read_entities() -> list[dict]:
    """Read UN entities from CSV."""
    entities = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            entities.append(row)
    return entities


def extract_wiki_title(url: str) -> str | None:
    """Extract the article title from a Wikipedia URL."""
    if not url or "wikipedia.org" not in url:
        return None
    parsed = urllib.parse.urlparse(url)
    path = parsed.path
    if "/wiki/" in path:
        return urllib.parse.unquote(path.split("/wiki/")[-1])
    return None


def main():
    LIGHT_DIR.mkdir(parents=True, exist_ok=True)
    DARK_DIR.mkdir(parents=True, exist_ok=True)

    entities = read_entities()
    print(f"Loaded {len(entities)} entities from CSV\n")

    report = []
    stats = {"found": 0, "not_found": 0, "error": 0, "skipped": 0}

    for i, entity in enumerate(entities):
        code = entity.get("entity", "").strip()
        name = entity.get("entity_long", "").strip()
        wiki_url = entity.get("entity_wikipedia_page", "").strip()

        if not code:
            continue

        # Skip if logo already exists
        existing_svg = LIGHT_DIR / f"{code.lower()}.svg"
        existing_png = LIGHT_DIR / f"{code.lower()}.png"
        if existing_svg.exists() or existing_png.exists():
            print(f"[{i+1}/{len(entities)}] {code} ({name}) — already exists, skipping")
            stats["skipped"] += 1
            report.append({"entity": code, "status": "skipped", "source": "", "filename": "", "formats": ""})
            continue

        wiki_title = extract_wiki_title(wiki_url)
        if not wiki_title:
            print(f"[{i+1}/{len(entities)}] {code} ({name}) — no Wikipedia page")
            stats["not_found"] += 1
            report.append({"entity": code, "status": "no_wikipedia", "source": "", "filename": "", "formats": ""})
            continue

        print(f"[{i+1}/{len(entities)}] {code} ({name})")

        try:
            time.sleep(REQUEST_DELAY)

            # Step 1: Get Wikidata ID
            wikidata_id = get_wikidata_id(wiki_title)
            if not wikidata_id:
                print(f"    ✗ No Wikidata ID found")
                stats["not_found"] += 1
                report.append({"entity": code, "status": "no_wikidata", "source": "", "filename": "", "formats": ""})
                continue

            # Step 2: Try P154 (official logo) only
            time.sleep(REQUEST_DELAY)
            logo_filename = get_wikidata_image(wikidata_id, "P154")
            source = "wikidata_P154"

            if not logo_filename:
                print(f"    ✗ No logo found via any method")
                stats["not_found"] += 1
                report.append({"entity": code, "status": "no_logo_found", "source": "", "filename": "", "formats": ""})
                continue

            print(f"    Found: {logo_filename} (via {source})")

            # Step 5: Get file info and download
            time.sleep(REQUEST_DELAY)
            file_info = get_commons_file_info(logo_filename)
            if not file_info:
                print(f"    ✗ Could not get file info from Commons")
                stats["error"] += 1
                report.append({"entity": code, "status": "commons_error", "source": source, "filename": logo_filename, "formats": ""})
                continue

            results = download_logo(logo_filename, code, file_info)

            if results:
                stats["found"] += 1
                formats = ",".join(results.keys())
                report.append({"entity": code, "status": "downloaded", "source": source, "filename": logo_filename, "formats": formats})
            else:
                stats["error"] += 1
                report.append({"entity": code, "status": "download_failed", "source": source, "filename": logo_filename, "formats": ""})

        except Exception as e:
            print(f"    ✗ Error: {e}")
            stats["error"] += 1
            report.append({"entity": code, "status": "error", "source": "", "filename": "", "formats": str(e)})

    # Write report
    print(f"\n{'='*60}")
    print(f"Results: {stats['found']} downloaded, {stats['skipped']} skipped, "
          f"{stats['not_found']} not found, {stats['error']} errors")

    with open(REPORT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["entity", "status", "source", "filename", "formats"])
        writer.writeheader()
        writer.writerows(report)
    print(f"Report saved to {REPORT_PATH}")

    # Regenerate available-logos.json from all files currently on disk
    generate_available_json(entities)


def generate_available_json(entities: list[dict]) -> None:
    """Write public/data/available-logos.json with entities that have logo files."""
    available_codes = {f.stem.upper() for f in LIGHT_DIR.iterdir() if f.is_file()}
    entity_map = {e["entity"].upper(): e for e in entities}

    result = []
    for code in sorted(available_codes):
        entity = entity_map.get(code)
        if entity:
            result.append({
                "entity": entity["entity"],
                "entity_long": entity["entity_long"],
                "un_principal_organ": entity.get("un_principal_organ", ""),
                "system_grouping": entity.get("system_grouping", ""),
            })

    json_path = BASE_DIR / "public" / "data" / "available-logos.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(f"available-logos.json updated: {len(result)} entities")


if __name__ == "__main__":
    main()
