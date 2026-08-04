"""
Generate demo frames for the MOT radial/tangential anisotropy experiment.
"""

from __future__ import annotations

import math
import random
import sys
from dataclasses import dataclass
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Rectangle

# ----------------------------------------------------------------------------
# Demo-figure settings (edit these)
# ----------------------------------------------------------------------------
STYLE = "black"                          # "black" or "color"
SEED = 7                                 # same seed for both conditions
FRAME_TIMES = [0.0, 2.5, 5.0, 7.5, 10.0] # seconds into the tracking phase
DPI = 200
FORMATS = ("png", "svg")                 # export formats
TARGET_RING_COLOR = "red"                # target marker (both styles)
TARGET_RING_WIDTH = 2.5
ELLIPSE_ALPHA = 0.2                      # color style only
DISC_COLORS = plt.cm.tab10.colors        # color style only, one per disc

# (display name, condition string in the experiment code)
CONDITIONS = [
    ("radial", "vertical"),
    ("tangential", "horizontal"),
]
ROW_TITLES = {
    "radial": "weak interference)",
    "tangential": "strong interference)",
}

# ----------------------------------------------------------------------------
# Experiment constants (copied from the PsychoPy implementation)
# ----------------------------------------------------------------------------
N_DOTS = 10
N_TARGETS = 5
TRACKING_SEC = 10.0
PHYSICS_STEP_SEC = 0.05

WIN_SIZE = (900, 900)
BACKGROUND = 0.875  # PsychoPy 0.75 in [-1, 1] space -> 0.875 in [0, 1] RGB

MOT_ELLIPSE_WIDTH = 1.0
MOT_ELLIPSE_HEIGHT = 0.25
MOT_MIN_DIST_CENTER_PERC = 0.20
MOT_MAX_SIZE = 1.0
MOT_MIN_SIZE = 0.0
MOT_SPAWN_IN_CENTER = 0.7
MOT_MAX_DEGREE = 2.0
MOT_DOT_SPEED = 8.0
MOT_DOT_STEP_PIX = round(MOT_DOT_SPEED * WIN_SIZE[0] / 1000)
SPEED_PIX_PER_SEC = MOT_DOT_STEP_PIX / PHYSICS_STEP_SEC


@dataclass
class Dot:
    x: float
    y: float
    vx: float
    vy: float
    deviation: float
    angle: float = 0.0
    target: bool = False
    selected: bool = False


# ----------------------------------------------------------------------------
# Geometry / motion logic (verbatim port of the experiment code)
# ----------------------------------------------------------------------------
def random_velocity() -> tuple[float, float]:
    theta = random.uniform(0, 2 * math.pi)
    return SPEED_PIX_PER_SEC * math.cos(theta), -SPEED_PIX_PER_SEC * math.sin(theta)


def distance(a: tuple[float, float], b: tuple[float, float]) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def max_radius(bounds: tuple[float, float]) -> float:
    half_w, half_h = bounds
    return math.hypot(half_w, half_h)


def original_condition_geometry(condition: str, bounds: tuple[float, float]) -> dict[str, float]:
    mr = max_radius(bounds)
    if condition == "horizontal":
        ellipse_width = mr * MOT_ELLIPSE_HEIGHT / 4 * 0.8
        ellipse_height = mr * MOT_ELLIPSE_WIDTH / 4 * 0.8
    else:
        ellipse_width = mr * MOT_ELLIPSE_WIDTH / 4 * 0.8
        ellipse_height = mr * MOT_ELLIPSE_HEIGHT / 4 * 0.8
    target_diameter = min(ellipse_height, ellipse_width) * MOT_MIN_DIST_CENTER_PERC * 2
    return {
        "ellipse_width": ellipse_width,
        "ellipse_height": ellipse_height,
        "target_diameter": target_diameter,
        "center_exclusion_radius": MOT_MIN_DIST_CENTER_PERC * bounds[0],
    }


def original_outline_size(dot: Dot, condition: str, bounds: tuple[float, float]) -> tuple[float, float]:
    geom = original_condition_geometry(condition, bounds)
    size_modifier = (
        (MOT_MAX_SIZE - MOT_MIN_SIZE) * distance((dot.x, dot.y), (0, 0)) / max_radius(bounds)
        + MOT_MIN_SIZE
    )
    major = max(geom["ellipse_width"], geom["ellipse_height"]) * size_modifier * 4
    minor = min(geom["ellipse_width"], geom["ellipse_height"]) * size_modifier * 4
    return major, minor


def visible_outline_ori(dot: Dot, condition: str) -> float:
    radial = math.degrees(math.atan2(dot.y, dot.x))
    if condition == "horizontal":
        return radial + 90
    return radial


def original_collision_angle(dot: Dot) -> float:
    angle = math.degrees(math.atan2(-dot.y, dot.x))
    if angle < 0:
        angle += 360
    return angle


def update_drawn_angle(dot: Dot) -> None:
    dot.angle = original_collision_angle(dot)


def base_ellipse_size(dot: Dot, condition: str, bounds: tuple[float, float]) -> tuple[float, float]:
    geom = original_condition_geometry(condition, bounds)
    size_modifier = (
        (MOT_MAX_SIZE - MOT_MIN_SIZE) * distance((dot.x, dot.y), (0, 0)) / max_radius(bounds)
        + MOT_MIN_SIZE
    )
    return geom["ellipse_width"] * size_modifier, geom["ellipse_height"] * size_modifier


def ellipse_radius_at_angle(width: float, height: float, relative_angle_rad: float) -> float:
    a = width / 2
    b = height / 2
    denom = math.sqrt((b * math.cos(relative_angle_rad)) ** 2 + (a * math.sin(relative_angle_rad)) ** 2)
    if denom == 0:
        return 0
    return (a * b) / denom


def law_of_cosines_angle(a: float, b: float, c: float) -> float:
    if a == 0 or b == 0:
        return 0
    value = (a * a + b * b - c * c) / (2 * a * b)
    value = max(-1, min(1, value))
    return math.degrees(math.acos(value))


def original_two_angles(a: Dot, b: Dot) -> tuple[float, float]:
    first = a
    second = b
    if second.angle < first.angle:
        first, second = second, first
    side_a = distance((second.x, second.y), (0, 0))
    side_b = distance((first.x, first.y), (0, 0))
    side_c = distance((first.x, first.y), (second.x, second.y))
    alpha = law_of_cosines_angle(side_b, side_c, side_a)
    beta = law_of_cosines_angle(side_c, side_a, side_b)
    # In the original code both branches (swapped / not swapped) reduce to
    # this same return value, because the swap is undone by the order in
    # which angle_first/angle_second are returned.
    return 360 - alpha, 360 - beta


def original_min_dist_two_ellipses(a: Dot, b: Dot, condition: str, bounds: tuple[float, float]) -> float:
    angle_a, angle_b = original_two_angles(a, b)
    width_a, height_a = base_ellipse_size(a, condition, bounds)
    width_b, height_b = base_ellipse_size(b, condition, bounds)
    radius_a = ellipse_radius_at_angle(width_a, height_a, math.radians(angle_a))
    radius_b = ellipse_radius_at_angle(width_b, height_b, math.radians(angle_b))
    return radius_a + radius_b


def visible_outline_radius_toward(dot: Dot, other: Dot, condition: str, bounds: tuple[float, float]) -> float:
    width, height = original_outline_size(dot, condition, bounds)
    direction = math.atan2(other.y - dot.y, other.x - dot.x)
    orientation = math.radians(visible_outline_ori(dot, condition))
    return ellipse_radius_at_angle(width, height, direction - orientation)


def visible_outline_polygon(
    dot: Dot,
    condition: str,
    bounds: tuple[float, float],
    n: int = 64,
    pad: float = 2.0,
) -> list[tuple[float, float]]:
    width, height = original_outline_size(dot, condition, bounds)
    width += pad * 2
    height += pad * 2
    angle = math.radians(visible_outline_ori(dot, condition))
    cos_a = math.cos(angle)
    sin_a = math.sin(angle)
    points = []
    for i in range(n):
        theta = 2 * math.pi * i / n
        local_x = (width / 2) * math.cos(theta)
        local_y = (height / 2) * math.sin(theta)
        x = dot.x + local_x * cos_a - local_y * sin_a
        y = dot.y + local_x * sin_a + local_y * cos_a
        points.append((x, y))
    return points


def polygons_overlap(poly_a: list[tuple[float, float]], poly_b: list[tuple[float, float]]) -> bool:
    for poly in (poly_a, poly_b):
        for i, p1 in enumerate(poly):
            p2 = poly[(i + 1) % len(poly)]
            edge_x = p2[0] - p1[0]
            edge_y = p2[1] - p1[1]
            axis = (-edge_y, edge_x)
            len_axis = math.hypot(*axis)
            if len_axis == 0:
                continue
            axis = (axis[0] / len_axis, axis[1] / len_axis)
            proj_a = [p[0] * axis[0] + p[1] * axis[1] for p in poly_a]
            proj_b = [p[0] * axis[0] + p[1] * axis[1] for p in poly_b]
            if max(proj_a) < min(proj_b) or max(proj_b) < min(proj_a):
                return False
    return True


def visible_outlines_overlap(a: Dot, b: Dot, condition: str, bounds: tuple[float, float], margin: float = 0.0) -> bool:
    if margin:
        center_distance = distance((a.x, a.y), (b.x, b.y))
        visible_min_distance = (
            visible_outline_radius_toward(a, b, condition, bounds)
            + visible_outline_radius_toward(b, a, condition, bounds)
            + margin
        )
        if center_distance < visible_min_distance:
            return True
    return polygons_overlap(
        visible_outline_polygon(a, condition, bounds, pad=2.0),
        visible_outline_polygon(b, condition, bounds, pad=2.0),
    )


def original_initial_collision(candidate: Dot, dots: list[Dot], condition: str, bounds: tuple[float, float]) -> bool:
    for other in dots:
        if collision_direction(other, candidate, condition, bounds) != "none":
            return True
        if visible_outlines_overlap(other, candidate, condition, bounds, margin=2.0):
            return True
    return False


def visible_overlap_with_any(candidate: Dot, source: Dot, dots: list[Dot], condition: str, bounds: tuple[float, float]) -> bool:
    for other in dots:
        if other is source:
            continue
        if visible_outlines_overlap(other, candidate, condition, bounds, margin=2.0):
            return True
    return False


def rotate_velocity(dot: Dot, degrees: float) -> None:
    set_velocity_angle(dot, velocity_angle(dot) + degrees)


def velocity_angle(dot: Dot) -> float:
    angle = math.degrees(math.atan2(-dot.vy, dot.vx))
    if angle < 0:
        angle += 360
    return angle


def set_velocity_angle(dot: Dot, angle: float) -> None:
    speed = math.hypot(dot.vx, dot.vy)
    radians = math.radians(angle % 360)
    dot.vx = speed * math.cos(radians)
    dot.vy = -speed * math.sin(radians)


def moved_away(dot: Dot) -> bool:
    angle = original_collision_angle(dot)
    vector_angle = velocity_angle(dot)
    if angle <= 40:
        return 90 <= vector_angle <= 270
    if angle <= 50:
        return 135 <= vector_angle <= 315
    if angle <= 130:
        return 180 <= vector_angle <= 360
    if angle <= 140:
        return 225 <= vector_angle <= 360 or 0 <= vector_angle <= 45
    if angle <= 220:
        return vector_angle >= 270 or vector_angle <= 90
    if angle <= 230:
        return 315 <= vector_angle <= 360 or 0 <= vector_angle <= 135
    if angle <= 310:
        return 0 <= vector_angle <= 180
    if angle <= 320:
        return 45 <= vector_angle <= 225
    return 90 <= vector_angle <= 270


def inbounds_direction(dot: Dot, bounds: tuple[float, float], target_radius: float) -> str:
    half_w, half_h = bounds
    x_modifier = target_radius
    y_modifier = target_radius
    if moved_away(dot):
        x_modifier *= 0.9
        y_modifier *= 0.9
    if dot.x + x_modifier > half_w:
        return "right"
    if dot.x - x_modifier < -half_w:
        return "left"
    if dot.y + y_modifier > half_h:
        return "up"
    if dot.y - y_modifier < -half_h:
        return "down"
    return "none"


def bounce_angle(angle: float, direction: str) -> float:
    if direction in ("up", "down"):
        return (360 - angle) % 360
    if direction in ("left", "right"):
        if 0 <= angle <= 180:
            return (180 - angle) % 360
        temp = angle - 180
        return (180 + (180 - temp)) % 360
    return angle


def in_middle(dot: Dot, geom: dict[str, float]) -> bool:
    return distance((dot.x, dot.y), (0, 0)) <= geom["center_exclusion_radius"]


def collision_direction(still: Dot, moving: Dot, condition: str, bounds: tuple[float, float]) -> str:
    if distance((still.x, still.y), (moving.x, moving.y)) >= 4 * original_min_dist_two_ellipses(still, moving, condition, bounds):
        return "none"
    angle = math.degrees(math.atan2(abs(moving.y - still.y), abs(still.x - moving.x)))
    if still.x - moving.x < 0:
        angle *= -1
    if angle < 0:
        angle += 360
    if 45 <= angle <= 135:
        return "up"
    if 135 <= angle <= 225:
        return "left"
    if 225 <= angle <= 315:
        return "down"
    return "right"


def relative_distance_between(a: Dot, b: Dot, condition: str, bounds: tuple[float, float]) -> float:
    dist_modifier = 4 * original_min_dist_two_ellipses(a, b, condition, bounds)
    center_distance = distance((a.x, a.y), (b.x, b.y))
    return center_distance * 2 / dist_modifier if dist_modifier else float("inf")


def legal_position(x: float, y: float, dots: list[Dot], bounds: tuple[float, float], condition: str) -> bool:
    geom = original_condition_geometry(condition, bounds)
    half_w, half_h = bounds
    candidate = Dot(x=x, y=y, vx=0, vy=0, deviation=0.5)
    width, height = base_ellipse_size(candidate, condition, bounds)
    bounds_radius = max(width, height) + 5
    if abs(x) > half_w - bounds_radius or abs(y) > half_h - bounds_radius:
        return False
    if distance((x, y), (0, 0)) <= geom["center_exclusion_radius"] + geom["ellipse_width"] + 2:
        return False
    return not original_initial_collision(candidate, dots, condition, bounds)


def create_dots(condition: str, bounds: tuple[float, float]) -> list[Dot]:
    dots: list[Dot] = []
    half_w, half_h = bounds
    attempts = 0
    while len(dots) < N_DOTS and attempts < 20000:
        attempts += 1
        x = random.uniform(-half_w, half_w)
        y = random.uniform(-half_h, half_h)
        if not legal_position(x, y, dots, bounds, condition):
            continue
        in_inner_region = distance((x, y), (0, 0)) < half_h / 2
        should_be_inner = len(dots) < N_DOTS * MOT_SPAWN_IN_CENTER
        if in_inner_region != should_be_inner:
            continue
        vx, vy = random_velocity()
        dots.append(Dot(x=x, y=y, vx=vx, vy=vy, deviation=(random.random() / 2) + 0.25))

    if len(dots) != N_DOTS:
        raise RuntimeError("Could not place all dots without ellipse overlap.")

    targets: set[int] = set()
    quadrants = [
        lambda d: d.x < 0 and d.y > 0,
        lambda d: d.x > 0 and d.y > 0,
        lambda d: d.x < 0 and d.y < 0,
        lambda d: d.x > 0 and d.y < 0,
    ]
    for q in quadrants:
        candidates = [i for i, d in enumerate(dots) if q(d)]
        if candidates and len(targets) < N_TARGETS:
            targets.add(random.choice(candidates))
    while len(targets) < N_TARGETS:
        targets.add(random.randrange(N_DOTS))
    for i in targets:
        dots[i].target = True

    for i, a in enumerate(dots):
        for b in dots[i + 1:]:
            if (
                original_initial_collision(a, [b], condition, bounds)
                or original_initial_collision(b, [a], condition, bounds)
                or visible_outlines_overlap(a, b, condition, bounds, margin=2.0)
            ):
                return create_dots(condition, bounds)

    return dots


def update_dots(dots: list[Dot], dt: float, trial_time: float, bounds: tuple[float, float], condition: str) -> None:
    geom = original_condition_geometry(condition, bounds)
    target_radius = geom["target_diameter"] / 2

    for dot in dots:
        moved = Dot(
            x=dot.x + dot.vx * dt,
            y=dot.y + dot.vy * dt,
            vx=dot.vx,
            vy=dot.vy,
            deviation=dot.deviation,
            angle=dot.angle,
            target=dot.target,
            selected=dot.selected,
        )

        can_move = True
        direction = inbounds_direction(moved, bounds, target_radius)
        if direction != "none":
            can_move = False
            set_velocity_angle(dot, bounce_angle(velocity_angle(dot), direction))
        elif in_middle(moved, geom):
            can_move = False
            set_velocity_angle(dot, velocity_angle(dot) + 180)
        else:
            nearest = None
            nearest_distance = float("inf")
            for other in dots:
                if other is dot:
                    continue
                rel_distance = relative_distance_between(other, dot, condition, bounds)
                if rel_distance < nearest_distance:
                    nearest_distance = rel_distance
                    nearest = other
            if nearest is not None:
                angle_diff = abs(nearest.angle - dot.angle)
                if angle_diff < 90 or angle_diff > 270:
                    if collision_direction(nearest, moved, condition, bounds) != "none":
                        can_move = False
                        set_velocity_angle(dot, velocity_angle(dot) + 180)

        if can_move and visible_overlap_with_any(moved, dot, dots, condition, bounds):
            can_move = False
            set_velocity_angle(dot, velocity_angle(dot) + 180)

        if can_move:
            dot.x = moved.x
            dot.y = moved.y

        delta_angle = random.random() * MOT_MAX_DEGREE
        if random.random() <= dot.deviation:
            delta_angle *= -1
        rotate_velocity(dot, delta_angle)
        if (trial_time % 1.0 < dt or trial_time % 1.0 > 1.0 - dt) and random.random() < 0.3:
            dot.deviation = (random.random() / 2) + 0.25


# ----------------------------------------------------------------------------
# Simulation
# ----------------------------------------------------------------------------
def snapshot(dots: list[Dot]) -> list[Dot]:
    return [Dot(d.x, d.y, d.vx, d.vy, d.deviation, d.angle, d.target, d.selected) for d in dots]


def simulate(condition: str, frame_times: list[float], seed: int) -> dict[float, list[Dot]]:
    """Run the tracking phase and capture dot snapshots at the requested times."""
    random.seed(seed)
    bounds = (WIN_SIZE[0] / 2, WIN_SIZE[1] / 2)
    dots = create_dots(condition, bounds)
    for d in dots:
        update_drawn_angle(d)

    frames: dict[float, list[Dot]] = {}
    t = 0.0
    for ft in sorted(frame_times):
        while t < ft - 1e-9:
            update_dots(dots, PHYSICS_STEP_SEC, t, bounds, condition)
            for d in dots:
                update_drawn_angle(d)
            t += PHYSICS_STEP_SEC
        frames[ft] = snapshot(dots)
    return frames


# ----------------------------------------------------------------------------
# Rendering
# ----------------------------------------------------------------------------
def setup_axes(ax: plt.Axes) -> tuple[tuple[float, float], dict[str, float]]:
    bounds = (WIN_SIZE[0] / 2, WIN_SIZE[1] / 2)
    half_w, half_h = bounds
    ax.set_xlim(-half_w, half_w)
    ax.set_ylim(-half_h, half_h)
    ax.set_aspect("equal")
    ax.axis("off")
    # Draw the grey field explicitly: ax.set_facecolor is not rendered once
    # the axis is switched off.
    ax.add_patch(
        Rectangle(
            (-half_w, -half_h),
            2 * half_w,
            2 * half_h,
            facecolor=(BACKGROUND, BACKGROUND, BACKGROUND),
            edgecolor="none",
            zorder=0,
        )
    )
    return bounds


def draw_fixation(ax: plt.Axes) -> None:
    ax.plot([-10, 10], [0, 0], color="red", linewidth=2, zorder=4)
    ax.plot([0, 0], [-10, 10], color="red", linewidth=2, zorder=4)


def draw_frame_black(ax: plt.Axes, dots: list[Dot], condition: str, mark_targets: bool) -> None:
    """First version: everything black, targets ringed only in the cue frame."""
    bounds = setup_axes(ax)
    geom = original_condition_geometry(condition, bounds)

    for d in dots:
        poly = visible_outline_polygon(d, condition, bounds, n=64, pad=0.0)
        xs, ys = zip(*poly)
        ax.plot(xs, ys, color="black", linewidth=1.2, zorder=1)

        r = geom["target_diameter"] / 2
        ax.add_patch(Circle((d.x, d.y), r, facecolor="black", edgecolor="black", zorder=2))
        if mark_targets and d.target:
            ax.add_patch(
                Circle(
                    (d.x, d.y), r + 4, facecolor="none",
                    edgecolor=TARGET_RING_COLOR, linewidth=TARGET_RING_WIDTH, zorder=3,
                )
            )

    draw_fixation(ax)


def draw_frame_color(ax: plt.Axes, dots: list[Dot], condition: str) -> None:
    """Color version: black discs, one semi-transparent color per ellipse,
    targets ringed in every frame."""
    bounds = setup_axes(ax)
    geom = original_condition_geometry(condition, bounds)

    for i, d in enumerate(dots):
        color = DISC_COLORS[i % len(DISC_COLORS)]

        poly = visible_outline_polygon(d, condition, bounds, n=64, pad=0.0)
        xs, ys = zip(*poly)
        ax.plot(xs, ys, color=color, alpha=ELLIPSE_ALPHA, linewidth=1.4, zorder=1)

        r = geom["target_diameter"] / 2
        ax.add_patch(Circle((d.x, d.y), r, facecolor="black", edgecolor="black", zorder=2))
        if d.target:
            ax.add_patch(
                Circle(
                    (d.x, d.y), r + 4, facecolor="none",
                    edgecolor=TARGET_RING_COLOR, linewidth=TARGET_RING_WIDTH, zorder=3,
                )
            )

    draw_fixation(ax)


def draw_frame(ax: plt.Axes, dots: list[Dot], condition: str, style: str, frame_time: float) -> None:
    if style == "color":
        draw_frame_color(ax, dots, condition)
    else:
        draw_frame_black(ax, dots, condition, mark_targets=(frame_time == 0.0))


# ----------------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------------
def main() -> None:
    style = STYLE
    if len(sys.argv) > 1:
        style = sys.argv[1].lower()
    if style not in ("black", "color"):
        raise SystemExit(f"Unknown style '{style}'. Use 'black' or 'color'.")

    out_dir = Path(__file__).resolve().parent / f"demo_frames_{style}"
    out_dir.mkdir(exist_ok=True)
    print(f"Style: {style} -> {out_dir.name}/")

    # One simulation run, used for whichever style is selected. Same seed for
    # both conditions and both styles, so all figure variants are directly
    # comparable.
    all_frames: dict[str, dict[float, list[Dot]]] = {}
    for name, condition in CONDITIONS:
        print(f"Simulating {name} condition (code: '{condition}') ...")
        all_frames[name] = simulate(condition, FRAME_TIMES, SEED)

    # Individual frames
    for name, condition in CONDITIONS:
        for ft, dots in all_frames[name].items():
            fig, ax = plt.subplots(figsize=(5, 5))
            fig.patch.set_facecolor((BACKGROUND, BACKGROUND, BACKGROUND))
            draw_frame(ax, dots, condition, style, ft)
            for ext in FORMATS:
                fname = out_dir / f"{name}_t{ft:g}s.{ext}"
                fig.savefig(fname, dpi=DPI, bbox_inches="tight", facecolor=fig.get_facecolor())
                print(f"  saved {fname.name}")
            plt.close(fig)

    # Combined condition x time grid
    n_cols = len(FRAME_TIMES)
    fig, axes = plt.subplots(2, n_cols, figsize=(3.2 * n_cols, 3.2 * 2 + 0.6))
    fig.patch.set_facecolor("white")
    for row, (name, condition) in enumerate(CONDITIONS):
        for col, ft in enumerate(sorted(FRAME_TIMES)):
            ax = axes[row, col] if n_cols > 1 else axes[row]
            draw_frame(ax, all_frames[name][ft], condition, style, ft)
            if row == 0:
                ax.set_title(f"t = {ft:g} s", fontsize=12)
        axes[row, 0].annotate(
            ROW_TITLES[name],
            xy=(-0.12, 0.5),
            xycoords="axes fraction",
            rotation=90,
            ha="center",
            va="center",
            fontsize=12,
        )

    fig.tight_layout()
    for ext in FORMATS:
        grid_path = out_dir / f"demo_grid.{ext}"
        fig.savefig(grid_path, dpi=DPI, bbox_inches="tight", facecolor="white")
        print(f"  saved {grid_path.name}")
    plt.close(fig)


if __name__ == "__main__":
    main()
