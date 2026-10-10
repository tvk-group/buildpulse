#!/usr/bin/env python3
"""TVK Labs Dev Team: zero-dependency security workflow guard.

Static heuristics are a first-line guard, not a substitute for CodeQL,
actionlint, branch protection, or independent CI security assessment.
"""
from pathlib import Path
import re
import sys

ROOT = Path(".github/workflows")
ISSUES = []
WARNINGS = []
if not ROOT.is_dir():
    print("No workflow directory")
    sys.exit(0)

for file in sorted(ROOT.glob("*.y*ml")):
    text = file.read_text(encoding="utf-8")
    rel = str(file)
    security = file.name.startswith("tvk-")
    if not security:
        # Existing workflows are inventoried, not automatically modified.
        continue
    checks = [
        (r"(?im)^\s*pull_request_target\s*:", "untrusted pull_request_target trigger"),
        (r"(?im)^\s*workflow_run\s*:", "privilege-crossing workflow_run trigger"),
        (r"(?im)^\s*permissions\s*:\s*write-all\b", "write-all token"),
        (r"(?im)^\s*(?:contents|actions|checks|deployments|id-token|packages|pull-requests|issues|security-events)\s*:\s*write\b", "write-scoped token permission"),
        (r"(?i)(?:curl|wget)[^\n|]*\|\s*(?:sudo\s+)?(?:bash|sh)\b", "remote script execution"),
        (r"(?i)\b(?:eval|exec)\s*\(\s*\$\{\{", "expression execution"),
        (r"(?i)(?:secrets\.|\$\{\{\s*secrets\.)", "secret access in audit workflow"),
        (r"(?i)\b(?:docker\s+run\s+--privileged|--privileged\s+docker)\b", "privileged container"),
    ]
    for pattern, description in checks:
        if re.search(pattern, text):
            ISSUES.append(f"{rel}: {description}")
    for match in re.finditer(r"(?m)^\s*-\s*uses:\s*([^\s#]+)", text):
        ref = match.group(1)
        if ref.startswith("./"):
            continue
        if not re.search(r"@[0-9a-f]{40}$", ref):
            ISSUES.append(f"{rel}: action not pinned to 40-char SHA: {ref}")
    if not re.search(r"(?m)^permissions:\s*$", text):
        ISSUES.append(f"{rel}: missing explicit token permissions")
    if not re.search(r"(?m)^\s+timeout-minutes:\s*\d+\s*$", text):
        WARNINGS.append(f"{rel}: no job timeout")

for item in WARNINGS:
    print("WARNING:", item)
for item in ISSUES:
    print("ERROR:", item)
print(f"TVK security workflow guard: {len(ISSUES)} errors; {len(WARNINGS)} warnings")
sys.exit(1 if ISSUES else 0)
