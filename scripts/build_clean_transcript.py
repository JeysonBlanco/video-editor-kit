"""Remap transcript timestamps after cutting 7.819s-8.72s from the source video.

Outputs:
- output/VIDEO_JEYSON_BLANCO_PRUEBA_transcript_clean.json (word list with new timestamps)
- output/edit/edl.json (edit decision list)
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "output" / "edit" / "transcripts" / "VIDEO_JEYSON_BLANCO_PRUEBA.json"
OUT_TRANSCRIPT = ROOT / "output" / "VIDEO_JEYSON_BLANCO_PRUEBA_transcript_clean.json"
OUT_EDL = ROOT / "output" / "edit" / "edl.json"

CUT_START = 7.819
CUT_END = 8.72
CUT_DUR = CUT_END - CUT_START

raw = json.loads(SRC.read_text(encoding="utf-8"))
src_words = raw["words"]

clean_words = []
for w in src_words:
    s, e = w.get("start"), w.get("end")
    if s is None or e is None:
        continue
    # Drop words fully inside the cut
    if s >= CUT_START and e <= CUT_END:
        continue
    # Words straddling boundaries should not exist here (cuts are between words)
    if s < CUT_START and e > CUT_END:
        continue
    if w["type"] == "audio_event":
        continue
    new_s = s if s < CUT_START else s - CUT_DUR
    new_e = e if e < CUT_START else e - CUT_DUR
    clean_words.append({
        "text": w["text"],
        "start": round(new_s, 3),
        "end": round(new_e, 3),
        "type": w["type"],
    })

clean = {
    "language_code": raw.get("language_code"),
    "text": " ".join(w["text"].strip() for w in clean_words if w["type"] == "word"),
    "words": clean_words,
    "duration_seconds": round(raw.get("audio_duration_secs", 11.37) - CUT_DUR, 3),
}
OUT_TRANSCRIPT.parent.mkdir(parents=True, exist_ok=True)
OUT_TRANSCRIPT.write_text(json.dumps(clean, indent=2, ensure_ascii=False), encoding="utf-8")

edl = {
    "source": "input/VIDEO_JEYSON_BLANCO_PRUEBA.mp4",
    "output": "output/VIDEO_JEYSON_BLANCO_PRUEBA_edited.mp4",
    "source_duration": round(raw.get("audio_duration_secs", 11.37), 3),
    "segments": [
        {"in": 0.0, "out": CUT_START, "label": "hook+dolor"},
        {"in": CUT_END, "out": round(raw.get("audio_duration_secs", 11.37), 3), "label": "cta"},
    ],
    "cuts_applied": [
        {"in": CUT_START, "out": CUT_END, "reason": "retake suelto 'Y como dato'"},
    ],
    "output_duration": clean["duration_seconds"],
}
OUT_EDL.parent.mkdir(parents=True, exist_ok=True)
OUT_EDL.write_text(json.dumps(edl, indent=2, ensure_ascii=False), encoding="utf-8")

print(f"clean transcript: {OUT_TRANSCRIPT}")
print(f"  words: {len([w for w in clean_words if w['type'] == 'word'])}")
print(f"  duration: {clean['duration_seconds']}s")
print(f"edl: {OUT_EDL}")
