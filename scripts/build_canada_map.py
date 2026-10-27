"""Build a small Canada provinces GeoJSON from Natural Earth admin-1 (public domain).

Keeps only Canada, only a `name` property (matching StatCan geography names),
drops tiny islands and simplifies outlines with Ramer-Douglas-Peucker.
Usage: python -I build_canada_map.py <input.geojson> <output.json>
"""
import json
import math
import sys

TOLERANCE = 0.08        # degrees
MIN_RING_AREA = 0.6     # square degrees; smaller islands are dropped
NAME_FIX = {"Québec": "Quebec", "Yukon Territory": "Yukon"}


def rdp(points, eps):
    if len(points) < 3:
        return points
    (x1, y1), (x2, y2) = points[0], points[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = math.hypot(dx, dy) or 1e-12
    dmax, index = 0.0, 0
    for i in range(1, len(points) - 1):
        px, py = points[i]
        d = abs(dy * px - dx * py + x2 * y1 - y2 * x1) / norm
        if d > dmax:
            dmax, index = d, i
    if dmax > eps:
        return rdp(points[: index + 1], eps)[:-1] + rdp(points[index:], eps)
    return [points[0], points[-1]]


def area(ring):
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(ring, ring[1:]))) / 2


def simplify_polygon(polygon):
    rings = []
    for ring in polygon:
        if area(ring) < MIN_RING_AREA:
            continue
        # A closed ring starts and ends on the same point, which RDP can't measure
        # against, so simplify its two halves separately.
        mid = len(ring) // 2
        halves = rdp(ring[: mid + 1], TOLERANCE)[:-1] + rdp(ring[mid:], TOLERANCE)
        simple = [[round(x, 2), round(y, 2)] for x, y in halves]
        if len(simple) >= 4:
            rings.append(simple)
    return rings


src, dst = sys.argv[1], sys.argv[2]
data = json.load(open(src, encoding="utf-8"))
features = []
for f in data["features"]:
    props = f["properties"]
    if props.get("admin") != "Canada":
        continue
    geom = f["geometry"]
    polygons = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
    kept = [p for p in (simplify_polygon(poly) for poly in polygons) if p]
    name = NAME_FIX.get(props["name"], props["name"])
    features.append({
        "type": "Feature",
        "properties": {"name": name},
        "geometry": {"type": "MultiPolygon", "coordinates": kept},
    })

out = {"type": "FeatureCollection", "features": sorted(features, key=lambda f: f["properties"]["name"])}
json.dump(out, open(dst, "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
print(len(features), "features:", [f["properties"]["name"] for f in out["features"]])
