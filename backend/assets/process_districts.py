"""Process districts GeoJSON into:
1. A lightweight centroids JSON (NAME_2, NAME_1, lat, lon) for fast lookups
2. A simplified GeoJSON of district polygons (<2MB)
"""
import json
import statistics
from pathlib import Path

SRC = Path("/tmp/districts.geojson")
DST_CENTROIDS = Path("/app/backend/assets/india_districts_centroids.json")
DST_GEO = Path("/app/backend/assets/india_districts_simplified.geojson")


def polygon_centroid_simple(rings):
    """Mean of first-ring vertices (good enough for tooltip positioning)."""
    pts = rings[0]
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return [round(statistics.mean(xs), 4), round(statistics.mean(ys), 4)]


def geometry_centroid(geom):
    if geom["type"] == "Polygon":
        return polygon_centroid_simple(geom["coordinates"])
    elif geom["type"] == "MultiPolygon":
        # Use largest polygon
        biggest = max(geom["coordinates"], key=lambda p: len(p[0]))
        return polygon_centroid_simple(biggest)
    return None


def thin_ring(ring, step):
    if len(ring) <= 12:
        return ring
    out = ring[::step]
    if out[-1] != ring[-1]:
        out.append(ring[-1])
    return out


def round_coord(c, ndigits=3):
    return [round(c[0], ndigits), round(c[1], ndigits)]


def process_polygon(poly, step, ndigits):
    return [[round_coord(c, ndigits) for c in thin_ring(ring, step)] for ring in poly]


def process_geometry(geom, step, ndigits):
    if geom["type"] == "Polygon":
        return {"type": "Polygon", "coordinates": process_polygon(geom["coordinates"], step, ndigits)}
    if geom["type"] == "MultiPolygon":
        return {"type": "MultiPolygon", "coordinates": [process_polygon(p, step, ndigits) for p in geom["coordinates"]]}
    return geom


def main():
    print("Loading raw districts geojson...")
    raw = json.loads(SRC.read_text())
    print(f"Features: {len(raw['features'])}")

    centroids = []
    out_features = []
    for f in raw["features"]:
        p = f["properties"]
        district = p.get("NAME_2")
        state = p.get("NAME_1")
        if not district:
            continue
        c = geometry_centroid(f["geometry"])
        if not c:
            continue
        centroids.append({
            "id": f"{state}|{district}",
            "district": district,
            "state": state,
            "lat": c[1],
            "lon": c[0],
        })
        # Simplified geometry for map rendering
        new_geom = process_geometry(f["geometry"], step=15, ndigits=2)
        out_features.append({
            "type": "Feature",
            "properties": {"district": district, "state": state},
            "geometry": new_geom,
        })

    DST_CENTROIDS.write_text(json.dumps(centroids, separators=(",", ":")))
    DST_GEO.write_text(json.dumps({"type": "FeatureCollection", "features": out_features}, separators=(",", ":")))
    print(f"Wrote {len(centroids)} centroids -> {DST_CENTROIDS.stat().st_size / 1024:.1f} KB")
    print(f"Wrote simplified geojson -> {DST_GEO.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
