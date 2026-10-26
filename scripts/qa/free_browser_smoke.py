#!/usr/bin/env python3
"""Free, read-only Playwright/Chromium public-site QA v2 (no paid service).

Requires: python -m pip install playwright
Browser:  chromium (system installed) OR python -m playwright install chromium
Usage: python scripts/qa/free_browser_smoke.py --base-url https://example.com \
  --path / --path /about --output-dir qa-artifacts
For local tests: --base-url http://127.0.0.1:8080 --browser-path /usr/bin/chromium
No authenticated user activity, no payment interaction, no exploit scanning.
"""
import argparse
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

WIDTHS = ((390, 844, "mobile"), (768, 1024, "tablet"), (1440, 900, "desktop"))
MAX_PATHS = 12


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--path", action="append", default=[], help="Public route; repeat as needed")
    parser.add_argument("--output-dir", default="qa-artifacts")
    parser.add_argument("--browser-path", default=None, help="Optional local Chromium binary")
    parser.add_argument("--timeout-ms", type=int, default=15000)
    args = parser.parse_args()

    u = urlparse(args.base_url)
    if u.scheme not in ("https", "http") or not u.netloc:
        parser.error("Use an absolute http(s) base URL")
    if args.timeout_ms < 1000 or args.timeout_ms > 45000:
        parser.error("--timeout-ms must be between 1000 and 45000")
    paths = args.path or ["/"]
    if len(paths) > MAX_PATHS:
        parser.error("At most 12 paths per run; prevent unintentional bulk crawling")
    for path in paths:
        parsed = urlparse(urljoin(args.base_url, path))
        if parsed.netloc != u.netloc:
            parser.error("Only same-origin page paths are allowed")
        if parsed.path.lower().startswith(("/admin", "/api", "/dashboard", "/checkout", "/payment", "/claim")):
            parser.error("Only public non-transactional pages; use isolated fixtures for protected flows")

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Playwright not installed. Run: python -m pip install playwright", file=sys.stderr)
        return 2

    dest = Path(args.output_dir)
    dest.mkdir(parents=True, exist_ok=True)
    results = []
    with sync_playwright() as playwright:
        browser_bin = args.browser_path or next((shutil.which(b) for b in ("chromium", "chromium-browser", "google-chrome") if shutil.which(b)), None)
        launch_args = {"headless": True}
        if browser_bin:
            launch_args["executable_path"] = browser_bin
        browser = playwright.chromium.launch(**launch_args)
        for path in paths:
            for width, height, kind in WIDTHS:
                context = browser.new_context(
                    viewport={"width": width, "height": height},
                    device_scale_factor=1,
                    is_mobile=(kind == "mobile"),
                    has_touch=(kind == "mobile"),
                    reduced_motion="reduce",
                    locale="en-US",
                )
                page = context.new_page()
                errors = []
                page.on("pageerror", lambda exc: errors.append(str(exc)[:600]))
                record = {
                    "url": urljoin(args.base_url.rstrip("/") + "/", path.lstrip("/")),
                    "viewport": kind,
                    "width": width,
                    "height": height,
                    "status": "NOT_TESTED",
                    "checks": {},
                    "js_errors": errors,
                }
                try:
                    response = page.goto(record["url"], wait_until="domcontentloaded", timeout=args.timeout_ms)
                    page.wait_for_timeout(600)
                    record["status_code"] = response.status if response else None
                    record["status"] = "PASS" if response and 200 <= response.status < 400 else "FAIL"
                    record["title"] = page.title()
                    facts = page.evaluate("""() => {
                      const images = [...document.images].filter(x =>
                        x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().height > 0);
                      const links = [...document.querySelectorAll('a[href]')];
                      return {
                        scrollWidth: document.documentElement.scrollWidth,
                        viewportWidth: document.documentElement.clientWidth,
                        h1Count: document.querySelectorAll('h1').length,
                        brokenImages: images.filter(x => x.complete && x.naturalWidth === 0)
                          .map(x => x.currentSrc || x.src).slice(0,20),
                        emptyLinks: links.filter(x => !x.textContent.trim() && !x.getAttribute('aria-label') && !x.querySelector('img[alt]'))
                          .length,
                        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
                        pageLanguage: document.documentElement.getAttribute('lang') || '',
                        canonical: document.querySelector('link[rel="canonical"]')?.href || null,
                        missingImageAlt: images.filter(x => !x.hasAttribute('alt'))
                          .map(x => x.currentSrc || x.src).slice(0,20),
                        unlabelledControls: [...document.querySelectorAll('button, [role="button"], input:not([type="hidden"]), select, textarea')]
                          .filter(el => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0)
                          .filter(el => !(
                            el.getAttribute('aria-label')?.trim() ||
                            el.getAttribute('aria-labelledby')?.trim() ||
                            el.getAttribute('title')?.trim() ||
                            el.labels?.length ||
                            (el.matches('button, [role="button"]') && el.textContent.trim()) ||
                            (el.matches('input[type="submit"], input[type="button"]') && el.value?.trim())
                          )).map(el => el.outerHTML.slice(0,180)).slice(0,20),
                        inertLinks: links.filter(x => !x.getAttribute('href')?.trim() ||
                          x.getAttribute('href')?.trim() === '#').length
                      };
                    }""")
                    record["checks"] = {
                        "no_horizontal_overflow": facts["scrollWidth"] <= facts["viewportWidth"] + 2,
                        "visible_h1_present": facts["h1Count"] >= 1,
                        "images_not_broken": len(facts["brokenImages"]) == 0,
                        "no_unlabelled_links": facts["emptyLinks"] == 0,
                        "reduced_motion_active": facts["reducedMotion"],
                        "document_language_present": bool(facts["pageLanguage"]),
                        "all_visible_images_have_alt": len(facts["missingImageAlt"]) == 0,
                        "all_visible_controls_labelled": len(facts["unlabelledControls"]) == 0,
                    }
                    record["broken_images"] = facts["brokenImages"]
                    record["empty_links"] = facts["emptyLinks"]
                    record["unlabelled_controls"] = facts["unlabelledControls"]
                    record["images_missing_alt"] = facts["missingImageAlt"]
                    record["inert_link_count"] = facts["inertLinks"]
                    record["canonical"] = facts["canonical"]
                    if response and u.scheme == "https":
                        headers = response.headers
                        required = ("strict-transport-security", "x-content-type-options",
                                    "content-security-policy", "referrer-policy")
                        record["security_headers"] = {
                            name: ("PRESENT" if headers.get(name) else "MISSING")
                            for name in required
                        }
                        record["security_header_warnings"] = [
                            name for name in required if not headers.get(name)
                        ]
                    if errors or not all(record["checks"].values()):
                        record["status"] = "FAIL"
                    filename = f"{urlparse(record['url']).path.strip('/').replace('/', '-') or 'home'}-{kind}-{width}.png"
                    page.screenshot(path=str(dest / filename), full_page=True, animations="disabled", timeout=args.timeout_ms)
                    record["screenshot"] = filename
                except Exception as exc:
                    record["status"] = "FAIL"
                    record["error"] = str(exc)[:700]
                finally:
                    results.append(record)
                    context.close()
        browser.close()

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "method": "read-only open-source Playwright + local Chromium; header findings informational; not a penetration test",
        "base_url": args.base_url,
        "tested": len(results),
        "passed": sum(x["status"] == "PASS" for x in results),
        "failed": sum(x["status"] == "FAIL" for x in results),
        "results": results,
    }
    (dest / "qa-report.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in summary.items() if k != "results"}, indent=2))
    print(f"Saved report and screenshots to: {dest}")
    return 0 if summary["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
