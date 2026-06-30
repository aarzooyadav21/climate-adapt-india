"""Simplify the India states GeoJSON to a small size for client delivery.
Reduces coordinate precision + thins linearly to make it ~300-500KB.
"""
import json
from pathlib import Path

SRC = Path(__file__).parent / "india_states.geojson"
DST = Path(__file__).parent / "india_states_simplified.geojson"


def thin_ring(ring, step):
    if len(ring) <= 16:
        return ring
    # Keep first + every step + last to close the ring
    out = ring[::step]
    if out[-1] != ring[-1]:
        out.append(ring[-1])
    return out


def round_coord(c, ndigits=3):
    return [round(c[0], ndigits), round(c[1], ndigits)]


def process_polygon(poly, step, ndigits):
    return [[round_coord(c, ndigits) for c in thin_ring(ring, step)] for ring in poly]


def process_geometry(geom, step, ndigits):
    t = geom.get("type")
    if t == "Polygon":
        geom["coordinates"] = process_polygon(geom["coordinates"], step, ndigits)
    elif t == "MultiPolygon":
        geom["coordinates"] = [process_polygon(p, step, ndigits) for p in geom["coordinates"]]
    return geom


# Map from NAME_1 (data attr) -> our state code
NAME_TO_CODE = {
    "Andaman and Nicobar": "AN",
    "Andhra Pradesh": "AP",
    "Arunachal Pradesh": "AR",
    "Assam": "AS",
    "Bihar": "BR",
    "Chandigarh": "CH",
    "Chhattisgarh": "CT",
    "Dadra and Nagar Haveli": "DN",
    "Daman and Diu": "DN",
    "Delhi": "DL",
    "Goa": "GA",
    "Gujarat": "GJ",
    "Haryana": "HR",
    "Himachal Pradesh": "HP",
    "Jammu and Kashmir": "JK",
    "Jharkhand": "JH",
    "Karnataka": "KA",
    "Kerala": "KL",
    "Lakshadweep": "LD",
    "Madhya Pradesh": "MP",
    "Maharashtra": "MH",
    "Manipur": "MN",
    "Meghalaya": "ML",
    "Mizoram": "MZ",
    "Nagaland": "NL",
    "Orissa": "OD",
    "Odisha": "OD",
    "Puducherry": "PY",
    "Punjab": "PB",
    "Rajasthan": "RJ",
    "Sikkim": "SK",
    "Tamil Nadu": "TN",
    "Telangana": "TG",
    "Tripura": "TR",
    "Uttar Pradesh": "UP",
    "Uttarakhand": "UK",
    "Uttaranchal": "UK",
    "West Bengal": "WB",
    "Ladakh": "LA",
}


def main():
    raw = json.loads(SRC.read_text())
    out = {"type": "FeatureCollection", "features": []}
    for f in raw["features"]:
        name = f["properties"].get("NAME_1") or f["properties"].get("name")
        code = NAME_TO_CODE.get(name)
        if not code:
            print(f"Skipping unknown state: {name}")
            continue
        # Keep only what we need
        new_props = {"code": code, "name": name}
        new_geom = process_geometry(f["geometry"], step=10, ndigits=2)
        out["features"].append({
            "type": "Feature",
            "properties": new_props,
            "geometry": new_geom,
        })
    DST.write_text(json.dumps(out, separators=(",", ":")))
    size_kb = DST.stat().st_size / 1024
    print(f"Wrote {DST} ({size_kb:.1f} KB, {len(out['features'])} features)")


if __name__ == "__main__":
    main()
