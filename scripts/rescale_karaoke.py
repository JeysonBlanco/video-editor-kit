"""Rescale embedded karaoke timestamps in beat_04_karaoke.html by /1.08 (speed up factor)."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "output" / "compositions" / "jeyson_blanco" / "beat_04_karaoke.html"
SPEED = 1.08

html = TARGET.read_text(encoding="utf-8")

# Find the embedded JSON in the script tag
m = re.search(r'(<script id="words-data" type="application/json">)(.*?)(</script>)', html, re.DOTALL)
if not m:
    raise SystemExit("words-data script tag not found")

words = json.loads(m.group(2))
for w in words:
    w["start"] = round(w["start"] / SPEED, 3)
    w["end"] = round(w["end"] / SPEED, 3)

new_data = "\n" + json.dumps(words, indent=0).replace("\n", "").replace("},{", "},\n  {").replace("[{", "[\n  {").replace("}]", "}\n]") + "\n"
new_html = html.replace(m.group(0), m.group(1) + new_data + m.group(3))

# Also update DURATION = 10.5 to DURATION = 9.722
new_html = re.sub(r"const DURATION = 10\.5", "const DURATION = 9.722", new_html)

TARGET.write_text(new_html, encoding="utf-8")
print(f"updated: {TARGET.name}")
print(f"  new max timestamp: {max(w['end'] for w in words):.3f}s")
