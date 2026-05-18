"""Replace logo image path with inline base64 in beat_03_cta.html."""
import base64
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOGO = ROOT / "brand" / "logo" / "logo-white.png"
TARGETS = [
    ROOT / "output" / "compositions" / "jeyson_blanco" / "beat_03_cta.html",
    ROOT / "output" / "compositions" / "jeyson_blanco" / "beat_05_outro.html",
]

b64 = base64.b64encode(LOGO.read_bytes()).decode("ascii")
data_uri = f"data:image/png;base64,{b64}"

old_src = '../../../brand/logo/logo-white.png'
for f in TARGETS:
    text = f.read_text(encoding="utf-8")
    text = text.replace(old_src, data_uri)
    f.write_text(text, encoding="utf-8")
    print(f"inlined: {f.name}")
