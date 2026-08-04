"""
Reads   Data/Data/FullParticipantsOnly/<id>-<sex>-<age>.txt
Writes  data_clean/participants_trials.csv        (one row per trial)

"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
N_TRIALS = 60
N_TARGETS = 5

FILENAME_RE = re.compile(r"^(?P<participant>.+)-(?P<sex>[mf])-(?P<age>\d+)\.txt$", re.I)
LINE_RE = re.compile(
    r"^(?P<date>\S+)\s+(?P<time>\S+)\s+(?P<ampm>am|pm)\s+"
    r"(?P<condition>horizontal|vertical)\s+(?P<n_errors>\d+)\s+(?P<picks>.*)$",
    re.I,
)
PICK_RE = re.compile(r"(\d+)=(imp|nimp)")


# for the full geometry table; crowding_axis is the axis along which two dots
# were free to approach each other.
CROWDING_AXIS = {"horizontal": "weak", "vertical": "strong"}


def parse_filename(path: Path) -> dict | None:
    m = FILENAME_RE.match(path.name)
    if m is None:
        return None
    return {
        "participant": m["participant"],
        "age": int(m["age"]),
        "female": 1 if m["sex"].lower() == "f" else 0,
    }


def parse_line(line: str, trial: int, meta: dict) -> dict:
    g = LINE_RE.match(line.replace("\t", " ").strip())
    if g is None:
        raise ValueError(f"unparsed line for {meta['participant']}: {line!r}")

    picks = PICK_RE.findall(g["picks"])
    if len(picks) != N_TARGETS:
        raise ValueError(f"{meta['participant']} trial {trial}: "
                         f"{len(picks)} selections, expected {N_TARGETS}")

    n_errors = int(g["n_errors"])
    n_nimp = sum(1 for _, kind in picks if kind == "nimp")
    if n_errors != n_nimp:
        raise ValueError(f"{meta['participant']} trial {trial}: logged n_errors="
                         f"{n_errors} but {n_nimp} selections tagged 'nimp'")

    row = {
        **meta,
        "trial": trial,
        "date": g["date"],
        "time": f'{g["time"]} {g["ampm"].lower()}',
        "condition": g["condition"].lower(),
        "crowding_axis": CROWDING_AXIS[g["condition"].lower()],
        "n_errors": n_errors,
        "n_hits": N_TARGETS - n_errors,
        "prop_correct": (N_TARGETS - n_errors) / N_TARGETS,
    }
    for i, (dot, kind) in enumerate(picks, start=1):
        row[f"dot{i}"] = int(dot)
        row[f"is_target{i}"] = 1 if kind == "imp" else 0
    return row


def build(input_dir: Path) -> pd.DataFrame:
    rows, dropped = [], []

    for txt in sorted(input_dir.glob("*.txt")):
        meta = parse_filename(txt)
        if meta is None:
            continue

        lines = [l for l in txt.read_text(encoding="utf-8", errors="replace")
                 .replace("\r\n", "\n").split("\n") if l.strip()]

        n_extra = len(lines) - N_TRIALS
        if n_extra < 0:
            raise ValueError(f"{txt.name}: only {len(lines)} trials")
        if n_extra:
            dropped.append((meta["participant"], n_extra))
        lines = lines[n_extra:]                    # keep the final complete run

        for trial, line in enumerate(lines):
            rows.append(parse_line(line, trial, meta))

    if dropped:
        print("  aborted first runs discarded:")
        for pid, k in dropped:
            print(f"    {pid}: {k} trials")

    cols = (["participant", "age", "female", "trial", "date", "time",
             "condition", "crowding_axis", "n_errors", "n_hits", "prop_correct"]
            + [f"{p}{i}" for i in range(1, N_TARGETS + 1) for p in ("dot", "is_target")])
    return pd.DataFrame(rows, columns=cols)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input-dir", type=Path,
                    default=ROOT / "Data" / "Data" / "FullParticipantsOnly")
    ap.add_argument("--output-csv", type=Path,
                    default=ROOT / "data_clean" / "participants_trials.csv")
    args = ap.parse_args()

    df = build(args.input_dir.resolve())
    args.output_csv.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.output_csv, index=False)

    n_pp = df.participant.nunique()
    print(f"\n  participants : {n_pp}")
    print(f"  rows         : {len(df)}  ({len(df) // n_pp} per participant)")
    print(f"  saved        : {args.output_csv}")

    per = df.groupby(["participant", "condition"]).size().unstack()

if __name__ == "__main__":
    main()
