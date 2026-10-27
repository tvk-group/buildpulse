#!/usr/bin/env python3
"""SKI 1 repo-local, offline, read-only assurance baseline.
No auth, secrets, network access, checkout, browser automation or deployment.
Run: python3 scripts/qa/ski1_repo_release_gate.py [--strict] [--json path]
Output distinguishes source checks from NOT_TESTED runtime/security gates.
"""
import argparse
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.items = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("a", "link") and a.get("href"):
            self.items.append((tag, a["href"]))
        if tag in ("img", "script") and a.get("src"):
            self.items.append((tag, a["src"]))

def run(root):
    package = root / "package.json"
    manifest = {}
    if package.is_file():
        try:
            manifest = json.loads(package.read_text(encoding="utf-8"))
        except (ValueError, UnicodeError):
            pass
    deps = {**manifest.get("dependencies", {}), **manifest.get("devDependencies", {})}
    next_site = "next" in deps
    choices = (
        "src/app/globals.css", "app/globals.css",
        "src/index.css", "src/style.css", "assets/css/site.css",
        "assets/site.css", "assets/css/tvk-master.css",
        "assets/entelekron-trust.css", "styles/globals.css", "style.css"
    )
    css = [root / p for p in choices if (root / p).is_file()]
    html = [root / p for p in ("index.html", "en/index.html", "public/index.html") if (root / p).is_file()]
    has_ui = bool(css or html or any((root / p).is_file() for p in (
        "src/app/page.tsx", "app/page.tsx", "src/pages/index.tsx", "src/App.tsx"
    )))
    role = "frontend" if has_ui else "service-or-library"
    signals = {"focus_visible": any(":focus-visible" in p.read_text(encoding="utf-8", errors="replace") for p in css),
               "reduced_motion": any("prefers-reduced-motion" in p.read_text(encoding="utf-8", errors="replace") for p in css)}
    problems = []
    if has_ui and css and not signals["focus_visible"]:
        problems.append("No :focus-visible selector in recognized entry CSS")
    if has_ui and css and not signals["reduced_motion"]:
        problems.append("No prefers-reduced-motion rule in recognized entry CSS")
    broken = []
    # Root static HTML only: dynamic routers are not assumed to be files.
    if not next_site:
        for source in html:
            body = source.read_text(encoding="utf-8", errors="replace")
            parser = Links()
            parser.feed(body)
            for tag, href in parser.items[:500]:
                uri = urlsplit(href)
                if uri.scheme or uri.netloc or href.startswith(("#", "data:")):
                    continue
                # Reject probes outside repo and skip dynamic/query route references.
                if uri.query or not uri.path or uri.path == "/" or uri.path.startswith("//"):
                    continue
                target = (root / uri.path.lstrip("/")) if uri.path.startswith("/") else (source.parent / uri.path)
                target = target.resolve()
                if not target.is_relative_to(root.resolve()):
                    continue
                variants = (target, Path(str(target) + ".html"), target / "index.html")
                if tag in ("img", "script", "link") or "." in target.name:
                    if not any(p.is_file() for p in variants):
                        broken.append({"source": source.relative_to(root).as_posix(), "target": href})
    if broken:
        problems.append(str(len(broken)) + " unresolved static resource references (source-level; review)")
    return {"schema": "tvk-ski1-repo-gate-v1", "repository_role": role, "framework": "next" if next_site else ("static-or-other" if has_ui else "none-detected"),
            "source_css": [p.relative_to(root).as_posix() for p in css], "static_entrypoints": [p.relative_to(root).as_posix() for p in html],
            "source_signals": signals, "unresolved_static_references": broken[:40], "warnings": problems,
            "source_result": "REVIEW" if problems else "PASS_OR_NOT_APPLICABLE",
            "live_browser": "NOT_TESTED", "accessibility_audit": "NOT_TESTED",
            "penetration_test": "NOT_TESTED", "business_flows": "NOT_TESTED", "railway_deployment": "NOT_TESTED",
            "note": "Source-level heuristics are not a substitute for browser, user journey, legal, or security acceptance."}

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--strict", action="store_true", help="Exit nonzero on source-level warnings")
    p.add_argument("--json", default=None, help="Optional report destination")
    args = p.parse_args()
    root = Path(__file__).resolve().parents[2]
    result = run(root)
    output = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    if args.json:
        dest = Path(args.json)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(output, encoding="utf-8")
    print(output, end="")
    return 1 if args.strict and result["warnings"] else 0

if __name__ == "__main__":
    raise SystemExit(main())
