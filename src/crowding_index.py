"""
Build the crowding index.

Per trial the script records ONE number:

    crowd_count   how many times, during the 10 s, two discs entered one
                  another's crowding zone (unordered pairs, one count per
                  contiguous encounter)

The crowding zone is the protection zone of the WEAK interference condition:
an ellipse with semi-axes 0.4 x eccentricity and 0.1 x eccentricity. By design a
disc can never enter another disc's crowding zone in the weak condition, so
every weak trial must score exactly zero; strong trials vary freely.

Requires only numpy and pandas. Reads data_clean/paths.parquet if pyarrow is
installed, otherwise falls back to data_clean/paths.csv.gz.

Writes data_clean/crowding_index.csv (one row per trial, merged with behaviour).

Usage:  python src/crowding_index.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

# --------------------------------------------------------------------------- #
# EDIT THIS if you run the script from somewhere unexpected.
# By default it assumes  <project>/src/crowding_index.py  and looks for
# <project>/data_clean/
# --------------------------------------------------------------------------- #
CLEAN = Path(__file__).resolve().parents[1] / "data_clean"

CENTRE = 684.0          # display centre, in the coordinates of the saved paths
N_DOTS = 10

# crowding-zone semi-axes, as multiples of eccentricity
B_LONG = 0.4
B_SHORT = 0.1

# raw log word -> interference condition
CONDITION = {"vertical": "strong", "horizontal": "weak"}


def load_paths() -> pd.DataFrame:
    """paths.parquet if possible, else the gzipped CSV (pandas only)."""
    pq = CLEAN / "paths.parquet"
    cs = CLEAN / "paths.csv.gz"
    if pq.exists():
        try:
            return pd.read_parquet(pq)
        except Exception as exc:                      # pyarrow missing/broken
            print(f"  could not read {pq.name} ({exc.__class__.__name__}); "
                  f"falling back to CSV")
    if cs.exists():
        return pd.read_csv(cs)
    sys.exit(f"ERROR: found neither {pq} nor {cs}")


def trial_crowd_count(X: np.ndarray, Y: np.ndarray) -> int:
    """X, Y: (n_frames, n_dots) dot positions relative to the display centre."""
    ecc = np.hypot(X, Y)
    ecc[ecc < 1] = 1
    ux, uy = X / ecc, Y / ecc                    # unit vector fixation -> disc

    dx = X[:, None, :] - X[:, :, None]           # disc j relative to disc i (dx[f, i, j] 表示在第 f 帧中dot j 相对dot i 的 x 位移。)
    dy = Y[:, None, :] - Y[:, :, None]

    # separation resolved onto disc i's own axes, then scaled by i's eccentricity
    ## 把 i→j 的位移向量旋转到dot i 自己的径向/切向坐标系：u 是径向分量（沿注视点→i 方向），v 是切向分量（垂直方向）。
    ## 再除以 i 的离心率——把物理距离换算成"离心率的倍数"。这一步体现了 Bouma 定律的核心：临界间距随离心率线性放大，所以按离心率归一化后，判别标准就变成了常数。
    u = (dx * ux[:, :, None] + dy * uy[:, :, None]) / ecc[:, :, None]
    v = (-dx * uy[:, :, None] + dy * ux[:, :, None]) / ecc[:, :, None]

    # elliptical distance: 1 on the zone boundary, < 1 inside
    d = np.sqrt((u / B_SHORT) ** 2 + (v / B_LONG) ** 2)

    #inside[f, i, j] = True 表示：dot j 落在dot i 的保护区内（有方向，j 在 i 里面 ≠ i 在 j 里面，因为两者的ecc不同）。
    inside = d < 1.0
    np.einsum("ijj->ij", inside)[:] = False # a disc cannot crowd itself

    # a pair counts as crowded if EITHER disc lies inside the other's zone
    ## 只要任意一方在另一方的保护区内（i 检测到 j，或 j 检测到 i），就记为拥挤。
    contact = inside | inside.transpose(0, 2, 1)

    # each unordered pair once: 45 pairs
    ## 只取上三角（不含对角线），把 10 个dot的 90 个有序对压缩成 45 个无序对——每对只统计一次。
    iu = np.triu_indices(N_DOTS, 1)
    contact = contact[:, iu[0], iu[1]]            # (n_frames, 45)

    # one encounter = one contiguous run of crowded frames, counted at its onset
    prev = np.zeros_like(contact)
    prev[1:] = contact[:-1]
    return int((contact & ~prev).sum()) # 本帧拥挤但上一帧不拥挤.这样，两个dot持续贴在一起 50 帧只记 1 次 encounter


def main() -> None:
    trials_file = CLEAN / "participants_trials.csv"
    trials = pd.read_csv(trials_file)
    trials["cond"] = trials.condition.map(CONDITION)

    paths = load_paths()
    print(f"  loaded {len(paths):,} path rows")

    want = set(zip(trials.participant, trials.trial))
    rows = []
    for (pp, tr), g in paths.groupby(["participant", "trial"], sort=False):
        if (pp, tr) not in want:
            continue                              # participant with no behaviour
        g = g.sort_values(["frame", "dot"])
        X = g.x.values.reshape(-1, N_DOTS) - CENTRE
        Y = g.y.values.reshape(-1, N_DOTS) - CENTRE
        rows.append(dict(participant=pp, trial=tr,
                         crowd_count=trial_crowd_count(X, Y)))

    out = trials.merge(pd.DataFrame(rows), on=["participant", "trial"], how="left")
    out.to_csv(CLEAN / "crowding_index.csv", index=False)

if __name__ == "__main__":
    main()
