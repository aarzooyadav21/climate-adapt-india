"""Indian States/UTs reference data with representative centroid lat/lon and metadata.
Used across the climate twin for state-level layers, choropleths, and selectors.
"""
from typing import List, Dict

INDIAN_STATES: List[Dict] = [
    {"code": "AN", "name": "Andaman & Nicobar Islands", "type": "UT", "lat": 11.7401, "lon": 92.6586, "zone": "Islands", "capital": "Port Blair"},
    {"code": "AP", "name": "Andhra Pradesh", "type": "State", "lat": 15.9129, "lon": 79.7400, "zone": "South", "capital": "Amaravati"},
    {"code": "AR", "name": "Arunachal Pradesh", "type": "State", "lat": 28.2180, "lon": 94.7278, "zone": "North-East", "capital": "Itanagar"},
    {"code": "AS", "name": "Assam", "type": "State", "lat": 26.2006, "lon": 92.9376, "zone": "North-East", "capital": "Dispur"},
    {"code": "BR", "name": "Bihar", "type": "State", "lat": 25.0961, "lon": 85.3131, "zone": "East", "capital": "Patna"},
    {"code": "CH", "name": "Chandigarh", "type": "UT", "lat": 30.7333, "lon": 76.7794, "zone": "North", "capital": "Chandigarh"},
    {"code": "CT", "name": "Chhattisgarh", "type": "State", "lat": 21.2787, "lon": 81.8661, "zone": "Central", "capital": "Raipur"},
    {"code": "DN", "name": "Dadra & Nagar Haveli and Daman & Diu", "type": "UT", "lat": 20.1809, "lon": 73.0169, "zone": "West", "capital": "Daman"},
    {"code": "DL", "name": "Delhi", "type": "UT", "lat": 28.7041, "lon": 77.1025, "zone": "North", "capital": "New Delhi"},
    {"code": "GA", "name": "Goa", "type": "State", "lat": 15.2993, "lon": 74.1240, "zone": "West", "capital": "Panaji"},
    {"code": "GJ", "name": "Gujarat", "type": "State", "lat": 22.2587, "lon": 71.1924, "zone": "West", "capital": "Gandhinagar"},
    {"code": "HR", "name": "Haryana", "type": "State", "lat": 29.0588, "lon": 76.0856, "zone": "North", "capital": "Chandigarh"},
    {"code": "HP", "name": "Himachal Pradesh", "type": "State", "lat": 31.1048, "lon": 77.1734, "zone": "North", "capital": "Shimla"},
    {"code": "JK", "name": "Jammu & Kashmir", "type": "UT", "lat": 33.7782, "lon": 76.5762, "zone": "North", "capital": "Srinagar/Jammu"},
    {"code": "JH", "name": "Jharkhand", "type": "State", "lat": 23.6102, "lon": 85.2799, "zone": "East", "capital": "Ranchi"},
    {"code": "KA", "name": "Karnataka", "type": "State", "lat": 15.3173, "lon": 75.7139, "zone": "South", "capital": "Bengaluru"},
    {"code": "KL", "name": "Kerala", "type": "State", "lat": 10.8505, "lon": 76.2711, "zone": "South", "capital": "Thiruvananthapuram"},
    {"code": "LA", "name": "Ladakh", "type": "UT", "lat": 34.1526, "lon": 77.5770, "zone": "North", "capital": "Leh"},
    {"code": "LD", "name": "Lakshadweep", "type": "UT", "lat": 10.5667, "lon": 72.6417, "zone": "Islands", "capital": "Kavaratti"},
    {"code": "MP", "name": "Madhya Pradesh", "type": "State", "lat": 22.9734, "lon": 78.6569, "zone": "Central", "capital": "Bhopal"},
    {"code": "MH", "name": "Maharashtra", "type": "State", "lat": 19.7515, "lon": 75.7139, "zone": "West", "capital": "Mumbai"},
    {"code": "MN", "name": "Manipur", "type": "State", "lat": 24.6637, "lon": 93.9063, "zone": "North-East", "capital": "Imphal"},
    {"code": "ML", "name": "Meghalaya", "type": "State", "lat": 25.4670, "lon": 91.3662, "zone": "North-East", "capital": "Shillong"},
    {"code": "MZ", "name": "Mizoram", "type": "State", "lat": 23.1645, "lon": 92.9376, "zone": "North-East", "capital": "Aizawl"},
    {"code": "NL", "name": "Nagaland", "type": "State", "lat": 26.1584, "lon": 94.5624, "zone": "North-East", "capital": "Kohima"},
    {"code": "OD", "name": "Odisha", "type": "State", "lat": 20.9517, "lon": 85.0985, "zone": "East", "capital": "Bhubaneswar"},
    {"code": "PY", "name": "Puducherry", "type": "UT", "lat": 11.9416, "lon": 79.8083, "zone": "South", "capital": "Puducherry"},
    {"code": "PB", "name": "Punjab", "type": "State", "lat": 31.1471, "lon": 75.3412, "zone": "North", "capital": "Chandigarh"},
    {"code": "RJ", "name": "Rajasthan", "type": "State", "lat": 27.0238, "lon": 74.2179, "zone": "North", "capital": "Jaipur"},
    {"code": "SK", "name": "Sikkim", "type": "State", "lat": 27.5330, "lon": 88.5122, "zone": "North-East", "capital": "Gangtok"},
    {"code": "TN", "name": "Tamil Nadu", "type": "State", "lat": 11.1271, "lon": 78.6569, "zone": "South", "capital": "Chennai"},
    {"code": "TG", "name": "Telangana", "type": "State", "lat": 18.1124, "lon": 79.0193, "zone": "South", "capital": "Hyderabad"},
    {"code": "TR", "name": "Tripura", "type": "State", "lat": 23.9408, "lon": 91.9882, "zone": "North-East", "capital": "Agartala"},
    {"code": "UP", "name": "Uttar Pradesh", "type": "State", "lat": 26.8467, "lon": 80.9462, "zone": "North", "capital": "Lucknow"},
    {"code": "UK", "name": "Uttarakhand", "type": "State", "lat": 30.0668, "lon": 79.0193, "zone": "North", "capital": "Dehradun"},
    {"code": "WB", "name": "West Bengal", "type": "State", "lat": 22.9868, "lon": 87.8550, "zone": "East", "capital": "Kolkata"},
]

# Long Period Average monsoon rainfall (June–Sep) in mm (IMD-style climatology proxy)
STATE_LPA_MM: Dict[str, float] = {
    "AN": 1900, "AP": 560,  "AR": 2500, "AS": 1750, "BR": 1020,
    "CH": 720,  "CT": 1130, "DN": 1900, "DL": 650,  "GA": 2900,
    "GJ": 750,  "HR": 460,  "HP": 740,  "JK": 540,  "JH": 1080,
    "KA": 840,  "KL": 2050, "LA": 220,  "LD": 1600, "MP": 945,
    "MH": 1000, "MN": 1400, "ML": 2800, "MZ": 1700, "NL": 1450,
    "OD": 1140, "PY": 970,  "PB": 490,  "RJ": 415,  "SK": 2200,
    "TN": 320,  "TG": 720,  "TR": 1750, "UP": 760,  "UK": 1230,
    "WB": 1340,
}

MAJOR_CITIES: List[Dict] = [
    {"name": "New Delhi",     "lat": 28.6139, "lon": 77.2090, "state_code": "DL"},
    {"name": "Mumbai",        "lat": 19.0760, "lon": 72.8777, "state_code": "MH"},
    {"name": "Chennai",       "lat": 13.0827, "lon": 80.2707, "state_code": "TN"},
    {"name": "Kolkata",       "lat": 22.5726, "lon": 88.3639, "state_code": "WB"},
    {"name": "Bengaluru",     "lat": 12.9716, "lon": 77.5946, "state_code": "KA"},
    {"name": "Hyderabad",     "lat": 17.3850, "lon": 78.4867, "state_code": "TG"},
    {"name": "Ahmedabad",     "lat": 23.0225, "lon": 72.5714, "state_code": "GJ"},
    {"name": "Pune",          "lat": 18.5204, "lon": 73.8567, "state_code": "MH"},
    {"name": "Jaipur",        "lat": 26.9124, "lon": 75.7873, "state_code": "RJ"},
    {"name": "Lucknow",       "lat": 26.8467, "lon": 80.9462, "state_code": "UP"},
    {"name": "Bhopal",        "lat": 23.2599, "lon": 77.4126, "state_code": "MP"},
    {"name": "Patna",         "lat": 25.5941, "lon": 85.1376, "state_code": "BR"},
    {"name": "Guwahati",      "lat": 26.1445, "lon": 91.7362, "state_code": "AS"},
    {"name": "Bhubaneswar",   "lat": 20.2961, "lon": 85.8245, "state_code": "OD"},
    {"name": "Chandigarh",    "lat": 30.7333, "lon": 76.7794, "state_code": "CH"},
    {"name": "Thiruvananthapuram", "lat": 8.5241, "lon": 76.9366, "state_code": "KL"},
    {"name": "Dehradun",      "lat": 30.3165, "lon": 78.0322, "state_code": "UK"},
    {"name": "Srinagar",      "lat": 34.0837, "lon": 74.7973, "state_code": "JK"},
    {"name": "Visakhapatnam", "lat": 17.6868, "lon": 83.2185, "state_code": "AP"},
    {"name": "Indore",        "lat": 22.7196, "lon": 75.8577, "state_code": "MP"},
    {"name": "Nagpur",        "lat": 21.1458, "lon": 79.0882, "state_code": "MH"},
    {"name": "Surat",         "lat": 21.1702, "lon": 72.8311, "state_code": "GJ"},
    {"name": "Coimbatore",    "lat": 11.0168, "lon": 76.9558, "state_code": "TN"},
    {"name": "Kochi",         "lat": 9.9312,  "lon": 76.2673, "state_code": "KL"},
    {"name": "Leh",           "lat": 34.1526, "lon": 77.5770, "state_code": "LA"},
    {"name": "Port Blair",    "lat": 11.6234, "lon": 92.7265, "state_code": "AN"},
]


def state_by_code(code: str):
    for s in INDIAN_STATES:
        if s["code"] == code:
            return s
    return None
