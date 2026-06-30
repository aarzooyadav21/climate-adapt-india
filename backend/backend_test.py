"""
Comprehensive Backend API Test Suite for Bharat Climate Twin
Tests all endpoints as specified in the review request
"""
import requests
import sys
import time
from datetime import datetime
from typing import Dict, Optional, List

# Base URL from frontend/.env
BASE_URL = "https://climate-adapt-india.preview.emergentagent.com/api"

# Test credentials from seed users
TEST_USERS = {
    "policymaker": {"email": "policymaker@test.in", "password": "Climate@2025"},
    "scientist": {"email": "scientist@test.in", "password": "Climate@2025"},
    "farmer": {"email": "farmer@test.in", "password": "Climate@2025"},
}


class ClimateAPITester:
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failed_tests = []
        self.session = requests.Session()

    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(
        self,
        name: str,
        method: str,
        endpoint: str,
        expected_status: int,
        data: Optional[Dict] = None,
        timeout: int = 10,
        auth_required: bool = False,
        validate_response: Optional[callable] = None,
    ) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if auth_required and self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        self.tests_run += 1
        self.log(f"Testing {name}...", "TEST")

        try:
            if method == "GET":
                response = self.session.get(url, headers=headers, timeout=timeout)
            elif method == "POST":
                response = self.session.post(url, json=data, headers=headers, timeout=timeout)
            elif method == "PUT":
                response = self.session.put(url, json=data, headers=headers, timeout=timeout)
            elif method == "DELETE":
                response = self.session.delete(url, headers=headers, timeout=timeout)
            else:
                raise ValueError(f"Unsupported method: {method}")

            # Check status code
            status_match = response.status_code == expected_status
            
            # Try to parse JSON
            try:
                response_data = response.json()
            except:
                response_data = {"raw": response.text[:200]}

            # Validate response structure if validator provided
            validation_passed = True
            validation_msg = ""
            if validate_response and status_match:
                validation_passed, validation_msg = validate_response(response_data)

            success = status_match and validation_passed

            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - {name} (Status: {response.status_code})", "PASS")
                if validation_msg:
                    self.log(f"   {validation_msg}", "INFO")
            else:
                self.tests_failed += 1
                error_msg = f"❌ FAILED - {name}"
                if not status_match:
                    error_msg += f" | Expected {expected_status}, got {response.status_code}"
                if not validation_passed:
                    error_msg += f" | Validation: {validation_msg}"
                self.log(error_msg, "FAIL")
                self.log(f"   Response: {str(response_data)[:200]}", "DEBUG")
                self.failed_tests.append({
                    "name": name,
                    "endpoint": endpoint,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "validation": validation_msg if not validation_passed else None,
                })

            return success, response_data

        except requests.exceptions.Timeout:
            self.tests_failed += 1
            self.log(f"❌ FAILED - {name} | Timeout after {timeout}s", "FAIL")
            self.failed_tests.append({"name": name, "endpoint": endpoint, "error": "Timeout"})
            return False, {}
        except Exception as e:
            self.tests_failed += 1
            self.log(f"❌ FAILED - {name} | Error: {str(e)}", "FAIL")
            self.failed_tests.append({"name": name, "endpoint": endpoint, "error": str(e)})
            return False, {}

    def test_health(self):
        """Test GET /api/health"""
        def validate(data):
            if data.get("status") != "ok":
                return False, "status is not 'ok'"
            sources = data.get("data_sources", {})
            required = ["nasa_power", "open_meteo", "era5_reanalysis", "imd_style"]
            for src in required:
                if sources.get(src) != "online":
                    return False, f"{src} is not online"
            return True, f"All {len(required)} data sources online"
        
        return self.run_test(
            "Health Check",
            "GET",
            "health",
            200,
            validate_response=validate,
        )

    def test_register(self, email: str, password: str, role: str = "scientist"):
        """Test POST /api/auth/register"""
        def validate(data):
            if not data.get("token"):
                return False, "No token in response"
            if not data.get("user"):
                return False, "No user in response"
            if data["user"].get("role") != role:
                return False, f"Role mismatch: expected {role}, got {data['user'].get('role')}"
            return True, f"User registered with role {role}"

        timestamp = int(time.time())
        test_email = f"test_{timestamp}_{email}"
        
        success, response = self.run_test(
            f"Register User ({role})",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "password": password,
                "full_name": f"Test {role.title()}",
                "role": role,
                "organization": "Test Org",
                "state_code": "DL",
            },
            validate_response=validate,
        )
        return success, response

    def test_login(self, email: str, password: str):
        """Test POST /api/auth/login"""
        def validate(data):
            if not data.get("token"):
                return False, "No token in response"
            if not data.get("user"):
                return False, "No user in response"
            return True, f"Login successful for {data['user'].get('email')}"

        success, response = self.run_test(
            f"Login ({email})",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password},
            validate_response=validate,
        )
        
        if success and response.get("token"):
            self.token = response["token"]
            self.log(f"Token acquired for {email}", "INFO")
        
        return success, response

    def test_me(self):
        """Test GET /api/auth/me"""
        def validate(data):
            if not data.get("id"):
                return False, "No user id in response"
            if not data.get("email"):
                return False, "No email in response"
            return True, f"User: {data.get('email')} ({data.get('role')})"

        return self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200,
            auth_required=True,
            validate_response=validate,
        )

    def test_climate_states(self):
        """Test GET /api/climate/states"""
        def validate(data):
            states = data.get("states", [])
            if len(states) != 36:
                return False, f"Expected 36 states, got {len(states)}"
            # Check first state has required fields
            if states:
                required = ["code", "name", "lat", "lon", "zone"]
                for field in required:
                    if field not in states[0]:
                        return False, f"Missing field: {field}"
            return True, f"Retrieved {len(states)} states/UTs"

        return self.run_test(
            "List States",
            "GET",
            "climate/states",
            200,
            validate_response=validate,
        )

    def test_climate_cities(self):
        """Test GET /api/climate/cities"""
        def validate(data):
            cities = data.get("cities", [])
            if len(cities) < 10:
                return False, f"Expected at least 10 cities, got {len(cities)}"
            return True, f"Retrieved {len(cities)} major cities"

        return self.run_test(
            "List Cities",
            "GET",
            "climate/cities",
            200,
            validate_response=validate,
        )

    def test_climate_snapshot(self, lat: float = 28.6, lon: float = 77.2):
        """Test GET /api/climate/snapshot"""
        def validate(data):
            if "current" not in data:
                return False, "Missing 'current' field"
            if "climatology_30d" not in data:
                return False, "Missing 'climatology_30d' field"
            if "provenance" not in data:
                return False, "Missing 'provenance' field"
            current = data["current"]
            required = ["temperature_c", "humidity", "wind_ms", "precipitation_mm"]
            for field in required:
                if field not in current and field.replace("_c", "_2m") not in current:
                    return False, f"Missing current field: {field}"
            return True, f"Snapshot: {current.get('temperature_c', current.get('temperature_2m'))}°C"

        return self.run_test(
            f"Climate Snapshot (lat={lat}, lon={lon})",
            "GET",
            f"climate/snapshot?lat={lat}&lon={lon}",
            200,
            timeout=15,
            validate_response=validate,
        )

    def test_climate_snapshot_state(self, state_code: str = "DL"):
        """Test GET /api/climate/snapshot/state/{code}"""
        def validate(data):
            if "state" not in data:
                return False, "Missing 'state' field"
            if data["state"].get("code") != state_code:
                return False, f"State code mismatch: expected {state_code}"
            return True, f"State snapshot for {data['state'].get('name')}"

        return self.run_test(
            f"State Snapshot ({state_code})",
            "GET",
            f"climate/snapshot/state/{state_code}",
            200,
            timeout=15,
            validate_response=validate,
        )

    def test_climate_historical(self, lat: float = 28.6, lon: float = 77.2, days: int = 180):
        """Test GET /api/climate/historical"""
        def validate(data):
            if "daily" not in data:
                return False, "Missing 'daily' field"
            daily = data["daily"]
            if "time" not in daily or "temperature_2m_mean" not in daily:
                return False, "Missing time series data"
            time_points = len(daily.get("time", []))
            if time_points < days - 10:  # Allow some tolerance
                return False, f"Expected ~{days} days, got {time_points}"
            return True, f"Historical data: {time_points} days"

        return self.run_test(
            f"Historical Data ({days} days)",
            "GET",
            f"climate/historical?lat={lat}&lon={lon}&days={days}",
            200,
            timeout=20,
            validate_response=validate,
        )

    def test_monsoon_status(self):
        """Test GET /api/monsoon/status"""
        def validate(data):
            required = ["phase", "national_departure_pct", "state_summaries"]
            for field in required:
                if field not in data:
                    return False, f"Missing field: {field}"
            summaries = data.get("state_summaries", [])
            if len(summaries) != 14:
                return False, f"Expected 14 state summaries, got {len(summaries)}"
            return True, f"Monsoon phase: {data['phase']}, departure: {data['national_departure_pct']}%"

        return self.run_test(
            "Monsoon Status",
            "GET",
            "monsoon/status",
            200,
            timeout=30,
            validate_response=validate,
        )

    def test_monsoon_timeseries(self, lat: float = 28.6, lon: float = 77.2, days: int = 180):
        """Test GET /api/monsoon/timeseries"""
        def validate(data):
            required = ["dates", "daily_mm", "cumulative_mm", "climatology_mm"]
            for field in required:
                if field not in data:
                    return False, f"Missing field: {field}"
            if len(data["dates"]) < days - 10:
                return False, f"Expected ~{days} data points"
            return True, f"Timeseries: {len(data['dates'])} days"

        return self.run_test(
            f"Monsoon Timeseries ({days} days)",
            "GET",
            f"monsoon/timeseries?lat={lat}&lon={lon}&days={days}",
            200,
            timeout=20,
            validate_response=validate,
        )

    def test_extremes_alerts(self):
        """Test GET /api/extremes/alerts"""
        def validate(data):
            required = ["total_states_monitored", "states_with_alerts", "states"]
            for field in required:
                if field not in data:
                    return False, f"Missing field: {field}"
            states = data.get("states", [])
            if len(states) < 15:
                return False, f"Expected at least 15 states, got {len(states)}"
            return True, f"Monitoring {data['total_states_monitored']} states, {data['states_with_alerts']} with alerts"

        return self.run_test(
            "Extreme Weather Alerts",
            "GET",
            "extremes/alerts",
            200,
            timeout=30,
            validate_response=validate,
        )

    def test_drought_index(self):
        """Test GET /api/drought/index"""
        def validate(data):
            required = ["states", "count_at_risk"]
            for field in required:
                if field not in data:
                    return False, f"Missing field: {field}"
            states = data.get("states", [])
            if len(states) != 36:
                return False, f"Expected 36 states, got {len(states)}"
            # Check SPI categorization
            if states:
                required_fields = ["code", "name", "spi", "category"]
                for field in required_fields:
                    if field not in states[0]:
                        return False, f"Missing field in state: {field}"
            return True, f"Drought index: {len(states)} states, {data['count_at_risk']} at risk"

        return self.run_test(
            "Drought Index (SPI)",
            "GET",
            "drought/index",
            200,
            timeout=30,
            validate_response=validate,
        )

    def test_scenario_run(self, state_code: str = "MH", warming_c: float = 2.0, horizon_years: int = 20):
        """Test POST /api/scenario/run"""
        def validate(data):
            required = ["state", "input", "baseline", "projection", "chart", "narrative"]
            for field in required:
                if field not in data:
                    return False, f"Missing field: {field}"
            projection = data.get("projection", {})
            if "temperature_c" not in projection or "rainfall_mm" not in projection:
                return False, "Missing projection data"
            if not data.get("narrative"):
                return False, "Missing LLM narrative"
            return True, f"Scenario: {state_code} +{warming_c}°C @ {horizon_years}y"

        return self.run_test(
            f"Scenario Simulation ({state_code})",
            "POST",
            "scenario/run",
            200,
            data={
                "state_code": state_code,
                "warming_c": warming_c,
                "horizon_years": horizon_years,
            },
            timeout=30,
            validate_response=validate,
        )

    def test_sector_dashboard(self, sector: str, state_code: str = "GJ"):
        """Test sector dashboard endpoints"""
        def validate(data):
            required = ["state", "sector", "indicators", "narrative"]
            for field in required:
                if field not in data:
                    return False, f"Missing field: {field}"
            indicators = data.get("indicators", [])
            if len(indicators) < 3:
                return False, f"Expected at least 3 indicators, got {len(indicators)}"
            if not data.get("narrative"):
                return False, "Missing AI narrative"
            return True, f"{sector.title()} dashboard: {len(indicators)} indicators"

        return self.run_test(
            f"Sector Dashboard: {sector.title()} ({state_code})",
            "GET",
            f"sectors/{sector}?state_code={state_code}",
            200,
            timeout=30,
            validate_response=validate,
        )

    def test_advisor_chat(self, message: str = "What is the monsoon state?", state_code: str = "KL"):
        """Test POST /api/advisor/chat"""
        def validate(data):
            required = ["session_id", "reply", "used_context"]
            for field in required:
                if field not in data:
                    return False, f"Missing field: {field}"
            if not data.get("reply"):
                return False, "Empty reply from advisor"
            if len(data["reply"]) < 20:
                return False, "Reply too short"
            return True, f"Advisor replied with {len(data['reply'])} chars"

        return self.run_test(
            f"AI Advisor Chat",
            "POST",
            "advisor/chat",
            200,
            data={
                "message": message,
                "state_code": state_code,
            },
            timeout=30,
            validate_response=validate,
        )

    # ========== PHASE 11: DISTRICT-LEVEL TESTS ==========
    
    def test_districts_centroids(self):
        """Test GET /api/districts/centroids - should return 594 districts"""
        def validate(data):
            if "count" not in data:
                return False, "Missing 'count' field"
            if "centroids" not in data:
                return False, "Missing 'centroids' array"
            count = data.get("count", 0)
            if count != 594:
                return False, f"Expected 594 districts, got {count}"
            centroids = data.get("centroids", [])
            if len(centroids) != 594:
                return False, f"Centroids array length mismatch: {len(centroids)}"
            # Validate first centroid structure
            if centroids:
                required = ["district", "state", "lat", "lon"]
                for field in required:
                    if field not in centroids[0]:
                        return False, f"Missing field in centroid: {field}"
            return True, f"Retrieved {count} district centroids"

        return self.run_test(
            "Districts Centroids (All)",
            "GET",
            "districts/centroids",
            200,
            timeout=10,
            validate_response=validate,
        )

    def test_districts_centroids_filtered(self, state: str = "Maharashtra"):
        """Test GET /api/districts/centroids?state=Maharashtra - should filter correctly"""
        def validate(data):
            if "count" not in data or "centroids" not in data:
                return False, "Missing count or centroids field"
            count = data.get("count", 0)
            centroids = data.get("centroids", [])
            if count != len(centroids):
                return False, f"Count mismatch: count={count}, array length={len(centroids)}"
            # Maharashtra should have ~34 districts
            if state.lower() == "maharashtra" and (count < 30 or count > 40):
                return False, f"Expected ~34 districts for Maharashtra, got {count}"
            # Verify all centroids are from the requested state
            for c in centroids:
                if c.get("state", "").lower() != state.lower():
                    return False, f"Found district from wrong state: {c.get('state')}"
            return True, f"Filtered {count} districts for {state}"

        return self.run_test(
            f"Districts Centroids (Filtered: {state})",
            "GET",
            f"districts/centroids?state={state}",
            200,
            timeout=10,
            validate_response=validate,
        )

    def test_districts_geojson(self):
        """Test GET /api/districts/geojson - should return FeatureCollection with 594 features"""
        def validate(data):
            if data.get("type") != "FeatureCollection":
                return False, "Not a FeatureCollection"
            features = data.get("features", [])
            if len(features) != 594:
                return False, f"Expected 594 features, got {len(features)}"
            # Validate first feature structure
            if features:
                feat = features[0]
                if feat.get("type") != "Feature":
                    return False, "Invalid feature type"
                if "geometry" not in feat or "properties" not in feat:
                    return False, "Missing geometry or properties"
            return True, f"GeoJSON with {len(features)} district polygons"

        return self.run_test(
            "Districts GeoJSON",
            "GET",
            "districts/geojson",
            200,
            timeout=10,
            validate_response=validate,
        )

    def test_districts_grid_temperature(self):
        """Test GET /api/districts/grid?layer=temperature - should return 594 points with °C unit"""
        def validate(data):
            required = ["layer", "unit", "count", "points", "provenance"]
            for field in required:
                if field not in data:
                    return False, f"Missing field: {field}"
            if data.get("layer") != "temperature":
                return False, f"Layer mismatch: expected temperature, got {data.get('layer')}"
            if data.get("unit") != "°C":
                return False, f"Unit mismatch: expected °C, got {data.get('unit')}"
            count = data.get("count", 0)
            points = data.get("points", [])
            # Allow some tolerance (may be slightly less than 594 if some API calls fail)
            if count < 580 or count > 594:
                return False, f"Expected ~594 points, got {count}"
            if len(points) != count:
                return False, f"Points array length mismatch: {len(points)} vs count {count}"
            # Validate first point structure
            if points:
                p = points[0]
                required_fields = ["lat", "lon", "value", "district", "state"]
                for field in required_fields:
                    if field not in p:
                        return False, f"Missing field in point: {field}"
            return True, f"District grid: {count} temperature points"

        return self.run_test(
            "Districts Grid (Temperature)",
            "GET",
            "districts/grid?layer=temperature",
            200,
            timeout=20,  # May take 8-15s on cold cache
            validate_response=validate,
        )

    def test_districts_grid_humidity(self):
        """Test GET /api/districts/grid?layer=humidity - should return 594 points with % unit"""
        def validate(data):
            if data.get("layer") != "humidity":
                return False, f"Layer mismatch: expected humidity, got {data.get('layer')}"
            if data.get("unit") != "%":
                return False, f"Unit mismatch: expected %, got {data.get('unit')}"
            count = data.get("count", 0)
            if count < 580 or count > 594:
                return False, f"Expected ~594 points, got {count}"
            return True, f"District grid: {count} humidity points"

        return self.run_test(
            "Districts Grid (Humidity)",
            "GET",
            "districts/grid?layer=humidity",
            200,
            timeout=20,
            validate_response=validate,
        )

    def test_districts_grid_invalid(self):
        """Test GET /api/districts/grid?layer=invalid - should return 422"""
        return self.run_test(
            "Districts Grid (Invalid Layer)",
            "GET",
            "districts/grid?layer=invalid",
            422,
            timeout=5,
        )

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests Run: {self.tests_run}")
        print(f"✅ Passed: {self.tests_passed}")
        print(f"❌ Failed: {self.tests_failed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n" + "-" * 80)
            print("FAILED TESTS:")
            print("-" * 80)
            for i, test in enumerate(self.failed_tests, 1):
                print(f"{i}. {test['name']}")
                print(f"   Endpoint: {test.get('endpoint', 'N/A')}")
                if 'expected' in test:
                    print(f"   Expected: {test['expected']}, Got: {test['actual']}")
                if 'error' in test:
                    print(f"   Error: {test['error']}")
                if test.get('validation'):
                    print(f"   Validation: {test['validation']}")
        
        print("=" * 80 + "\n")


def main():
    """Run all backend tests"""
    tester = ClimateAPITester()
    
    print("=" * 80)
    print("BHARAT CLIMATE TWIN - BACKEND API TEST SUITE")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80 + "\n")

    # 1. Health Check
    print("\n--- HEALTH CHECK ---")
    tester.test_health()

    # 2. Auth Tests
    print("\n--- AUTHENTICATION TESTS ---")
    
    # Test registration for each role
    for role in ["policymaker", "scientist", "farmer"]:
        tester.test_register(f"{role}@example.com", "TestPass123!", role)
    
    # Test login with seed users
    for role, creds in TEST_USERS.items():
        success, _ = tester.test_login(creds["email"], creds["password"])
        if success and role == "policymaker":
            # Use policymaker token for subsequent tests
            break
    
    # Test /me endpoint
    if tester.token:
        tester.test_me()

    # 3. Climate Data Tests
    print("\n--- CLIMATE DATA TESTS ---")
    tester.test_climate_states()
    tester.test_climate_cities()
    tester.test_climate_snapshot(28.6, 77.2)  # Delhi
    tester.test_climate_snapshot_state("DL")  # Delhi
    tester.test_climate_historical(28.6, 77.2, 180)

    # 4. Monsoon Tests
    print("\n--- MONSOON TESTS ---")
    tester.test_monsoon_status()
    tester.test_monsoon_timeseries(28.6, 77.2, 180)

    # 5. Extreme Weather Tests
    print("\n--- EXTREME WEATHER TESTS ---")
    tester.test_extremes_alerts()

    # 6. Drought Tests
    print("\n--- DROUGHT MONITORING TESTS ---")
    tester.test_drought_index()

    # 7. Scenario Simulation Tests
    print("\n--- SCENARIO SIMULATION TESTS ---")
    tester.test_scenario_run("MH", 2.0, 20)

    # 8. Sector Dashboard Tests
    print("\n--- SECTOR DASHBOARD TESTS ---")
    tester.test_sector_dashboard("agriculture", "GJ")
    tester.test_sector_dashboard("water", "MH")
    tester.test_sector_dashboard("urban", "DL")
    tester.test_sector_dashboard("energy", "RJ")

    # 9. AI Advisor Tests
    print("\n--- AI ADVISOR TESTS ---")
    tester.test_advisor_chat("What is the monsoon state?", "KL")

    # 10. PHASE 11: District-Level Tests
    print("\n--- PHASE 11: DISTRICT-LEVEL TESTS ---")
    tester.test_districts_centroids()
    tester.test_districts_centroids_filtered("Maharashtra")
    tester.test_districts_geojson()
    tester.test_districts_grid_temperature()
    tester.test_districts_grid_humidity()
    tester.test_districts_grid_invalid()

    # Print summary
    tester.print_summary()

    # Return exit code
    return 0 if tester.tests_failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
