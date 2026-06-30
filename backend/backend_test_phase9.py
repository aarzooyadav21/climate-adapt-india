"""
Phase 9 Backend API Test Suite for Bharat Climate Twin
Tests: Grid endpoints, Lab experiments, Sensitivity sweep, Advisor enhancements
"""
import requests
import sys
import time
from datetime import datetime
from typing import Dict, Optional

# Base URL from frontend/.env
BASE_URL = "https://climate-adapt-india.preview.emergentagent.com/api"

# Test credentials
TEST_USER = {"email": "scientist@test.in", "password": "Climate@2025"}


class Phase9Tester:
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
        params: Optional[Dict] = None,
        timeout: int = 30,
        auth_required: bool = False,
        validate_response: Optional[callable] = None,
    ) -> tuple:
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if auth_required and self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        self.tests_run += 1
        self.log(f"Testing {name}...", "TEST")

        try:
            if method == "GET":
                response = self.session.get(url, headers=headers, params=params, timeout=timeout)
            elif method == "POST":
                response = self.session.post(url, json=data, headers=headers, timeout=timeout)
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
                self.log(f"   Response: {str(response_data)[:300]}", "DEBUG")
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

    def test_login(self):
        """Test login and get token"""
        def validate(data):
            if not data.get("token"):
                return False, "No token in response"
            return True, f"Login successful"

        success, response = self.run_test(
            "Login",
            "POST",
            "auth/login",
            200,
            data=TEST_USER,
            validate_response=validate,
        )
        
        if success and response.get("token"):
            self.token = response["token"]
            self.log(f"Token acquired", "INFO")
        
        return success

    # ===== GRID ENDPOINT TESTS =====
    
    def test_grid_temperature(self):
        """Test GET /api/climate/grid?layer=temperature"""
        def validate(data):
            if data.get("layer") != "temperature":
                return False, f"Layer mismatch: expected temperature, got {data.get('layer')}"
            if data.get("unit") != "°C":
                return False, f"Unit mismatch: expected °C, got {data.get('unit')}"
            points = data.get("points", [])
            if len(points) < 50:
                return False, f"Expected >50 sample points, got {len(points)}"
            # Check point structure
            if points:
                p = points[0]
                required = ["lat", "lon", "value"]
                for field in required:
                    if field not in p:
                        return False, f"Missing field in point: {field}"
            provenance = data.get("provenance", [])
            if not provenance:
                return False, "Missing provenance"
            return True, f"Retrieved {len(points)} temperature points with unit {data.get('unit')}"

        return self.run_test(
            "Grid Temperature",
            "GET",
            "climate/grid",
            200,
            params={"layer": "temperature"},
            timeout=15,
            validate_response=validate,
        )

    def test_grid_humidity(self):
        """Test GET /api/climate/grid?layer=humidity"""
        def validate(data):
            if data.get("layer") != "humidity":
                return False, f"Layer mismatch"
            if data.get("unit") != "%":
                return False, f"Unit mismatch: expected %, got {data.get('unit')}"
            points = data.get("points", [])
            if len(points) < 50:
                return False, f"Expected >50 points, got {len(points)}"
            return True, f"Retrieved {len(points)} humidity points"

        return self.run_test(
            "Grid Humidity",
            "GET",
            "climate/grid",
            200,
            params={"layer": "humidity"},
            timeout=15,
            validate_response=validate,
        )

    def test_grid_precipitation(self):
        """Test GET /api/climate/grid?layer=precipitation"""
        def validate(data):
            if data.get("layer") != "precipitation":
                return False, f"Layer mismatch"
            if data.get("unit") != "mm (7d)":
                return False, f"Unit mismatch: expected 'mm (7d)', got {data.get('unit')}"
            points = data.get("points", [])
            if len(points) < 50:
                return False, f"Expected >50 points, got {len(points)}"
            return True, f"Retrieved {len(points)} precipitation points (7-day cumulative)"

        return self.run_test(
            "Grid Precipitation",
            "GET",
            "climate/grid",
            200,
            params={"layer": "precipitation"},
            timeout=15,
            validate_response=validate,
        )

    def test_grid_drought_spi(self):
        """Test GET /api/climate/grid?layer=drought_spi"""
        def validate(data):
            if data.get("layer") != "drought_spi":
                return False, f"Layer mismatch"
            if data.get("unit") != "SPI":
                return False, f"Unit mismatch: expected 'SPI', got {data.get('unit')}"
            points = data.get("points", [])
            if len(points) < 10:  # State centroids only
                return False, f"Expected at least 10 points, got {len(points)}"
            return True, f"Retrieved {len(points)} drought SPI points"

        return self.run_test(
            "Grid Drought SPI",
            "GET",
            "climate/grid",
            200,
            params={"layer": "drought_spi"},
            timeout=15,
            validate_response=validate,
        )

    def test_grid_rainfall_departure(self):
        """Test GET /api/climate/grid?layer=rainfall_departure"""
        def validate(data):
            if data.get("layer") != "rainfall_departure":
                return False, f"Layer mismatch"
            if data.get("unit") != "% vs LPA":
                return False, f"Unit mismatch: expected '% vs LPA', got {data.get('unit')}"
            points = data.get("points", [])
            if len(points) < 10:
                return False, f"Expected at least 10 points, got {len(points)}"
            return True, f"Retrieved {len(points)} rainfall departure points"

        return self.run_test(
            "Grid Rainfall Departure",
            "GET",
            "climate/grid",
            200,
            params={"layer": "rainfall_departure"},
            timeout=15,
            validate_response=validate,
        )

    def test_grid_invalid_layer(self):
        """Test GET /api/climate/grid?layer=invalid returns 422"""
        return self.run_test(
            "Grid Invalid Layer",
            "GET",
            "climate/grid",
            422,
            params={"layer": "invalid"},
            timeout=10,
        )

    def test_point_query(self):
        """Test GET /api/climate/point?lat=22.5&lon=80"""
        def validate(data):
            required = ["lat", "lon", "temperature_c", "humidity", "wind_ms", "nearest_place"]
            for field in required:
                if field not in data:
                    return False, f"Missing field: {field}"
            if data.get("lat") != 22.5:
                return False, f"Lat mismatch"
            if data.get("lon") != 80.0:
                return False, f"Lon mismatch"
            nearest = data.get("nearest_place")
            if not nearest or "name" not in nearest:
                return False, "Missing nearest_place.name"
            return True, f"Point query: {data.get('temperature_c')}°C, nearest: {nearest.get('name')}"

        return self.run_test(
            "Point Query",
            "GET",
            "climate/point",
            200,
            params={"lat": 22.5, "lon": 80},
            timeout=15,
            validate_response=validate,
        )

    # ===== LAB ENDPOINT TESTS =====

    def test_lab_run_with_narrative(self):
        """Test POST /api/lab/run with 2 experiments and narrative"""
        def validate(data):
            if "experiments" not in data:
                return False, "Missing experiments array"
            exps = data["experiments"]
            if len(exps) != 2:
                return False, f"Expected 2 experiments, got {len(exps)}"
            # Check experiment structure
            for exp in exps:
                required = ["label", "state", "inputs", "baseline", "projection"]
                for field in required:
                    if field not in exp:
                        return False, f"Missing field in experiment: {field}"
            if "summary" not in data:
                return False, "Missing summary"
            if "provenance" not in data:
                return False, "Missing provenance"
            if "narrative" not in data:
                return False, "Missing narrative (include_narrative=true)"
            return True, f"Lab run: {len(exps)} experiments with AI narrative"

        experiments = [
            {
                "label": "Delhi +2°C",
                "inputs": {
                    "state_code": "DL",
                    "warming_c": 2.0,
                    "rainfall_shift_pct": 0,
                    "urbanization_pct": 30,
                    "land_use_change_pct": 0,
                    "horizon_years": 20,
                }
            },
            {
                "label": "Maharashtra +3°C",
                "inputs": {
                    "state_code": "MH",
                    "warming_c": 3.0,
                    "rainfall_shift_pct": -10,
                    "urbanization_pct": 20,
                    "land_use_change_pct": -5,
                    "horizon_years": 30,
                }
            }
        ]

        return self.run_test(
            "Lab Run with Narrative",
            "POST",
            "lab/run",
            200,
            data={"experiments": experiments, "include_narrative": True},
            timeout=30,
            validate_response=validate,
        )

    def test_lab_run_without_narrative(self):
        """Test POST /api/lab/run with include_narrative=false (fast)"""
        def validate(data):
            if "experiments" not in data:
                return False, "Missing experiments array"
            if "narrative" in data and data["narrative"] is not None:
                return False, "Narrative should be skipped when include_narrative=false"
            return True, f"Lab run without narrative (fast mode)"

        experiments = [
            {
                "label": "Test Exp",
                "inputs": {
                    "state_code": "DL",
                    "warming_c": 1.5,
                    "rainfall_shift_pct": 0,
                    "urbanization_pct": 10,
                    "land_use_change_pct": 0,
                    "horizon_years": 15,
                }
            }
        ]

        return self.run_test(
            "Lab Run without Narrative",
            "POST",
            "lab/run",
            200,
            data={"experiments": experiments, "include_narrative": False},
            timeout=15,
            validate_response=validate,
        )

    def test_lab_sensitivity(self):
        """Test POST /api/lab/sensitivity with warming sweep"""
        def validate(data):
            if "state" not in data:
                return False, "Missing state"
            if data.get("variable") != "warming_c":
                return False, f"Variable mismatch"
            if data.get("steps") != 5:
                return False, f"Expected 5 steps, got {data.get('steps')}"
            curve = data.get("curve", [])
            if len(curve) != 5:
                return False, f"Expected 5 curve points, got {len(curve)}"
            # Check curve point structure
            if curve:
                pt = curve[0]
                required = ["variable_value", "projected_temp_c", "projected_rainfall_mm"]
                for field in required:
                    if field not in pt:
                        return False, f"Missing field in curve point: {field}"
            if "baseline" not in data:
                return False, "Missing baseline"
            if "provenance" not in data:
                return False, "Missing provenance"
            return True, f"Sensitivity sweep: {len(curve)} points for {data.get('variable')}"

        return self.run_test(
            "Lab Sensitivity Sweep",
            "POST",
            "lab/sensitivity",
            200,
            data={
                "state_code": "DL",
                "horizon_years": 20,
                "variable": "warming_c",
                "min_value": 0,
                "max_value": 4,
                "steps": 5,
            },
            timeout=20,
            validate_response=validate,
        )

    # ===== ADVISOR ENHANCEMENTS TEST =====

    def test_advisor_grounding(self):
        """Test advisor chat with state_code for richer context"""
        def validate(data):
            if "reply" not in data:
                return False, "Missing reply"
            if "used_context" not in data:
                return False, "Missing used_context"
            ctx = data["used_context"]
            # Check for Phase 9 enhancements
            if "data_certainty" not in ctx:
                return False, "Missing data_certainty in context"
            if ctx.get("data_certainty") != "high":
                return False, f"Expected high certainty with state_code, got {ctx.get('data_certainty')}"
            # Check for richer context fields
            if "era5_last_90d" not in ctx:
                return False, "Missing era5_last_90d (Phase 9 enhancement)"
            if "forecast_daily_7d" not in ctx:
                return False, "Missing forecast_daily_7d (Phase 9 enhancement)"
            reply = data["reply"].lower()
            # Check if reply cites sources (provenance)
            has_source = any(src in reply for src in ["nasa power", "open-meteo", "era5", "source"])
            if not has_source:
                return False, "Reply doesn't cite provenance sources"
            return True, f"Advisor with richer context (era5_last_90d, forecast_daily_7d, data_certainty=high)"

        return self.run_test(
            "Advisor Richer Context",
            "POST",
            "advisor/chat",
            200,
            data={
                "message": "What is the current temperature and rainfall situation?",
                "state_code": "DL",
            },
            timeout=25,
            auth_required=False,
            validate_response=validate,
        )

    def test_advisor_no_hallucination(self):
        """Test advisor strict grounding - should refuse out-of-scope questions"""
        def validate(data):
            if "reply" not in data:
                return False, "Missing reply"
            reply = data["reply"].lower()
            # Should NOT make up data for Mars
            hallucination_indicators = ["mars temperature is", "on mars it is", "mars has a temperature of"]
            if any(ind in reply for ind in hallucination_indicators):
                return False, "HALLUCINATION DETECTED: Advisor made up Mars temperature data"
            # Should indicate insufficient data or refusal
            refusal_indicators = ["insufficient", "don't have", "no data", "cannot provide", "not available", "outside"]
            if not any(ind in reply for ind in refusal_indicators):
                return False, "Advisor should refuse out-of-scope question but didn't"
            return True, "Advisor correctly refused out-of-scope question (no hallucination)"

        return self.run_test(
            "Advisor No Hallucination Test",
            "POST",
            "advisor/chat",
            200,
            data={
                "message": "What is the temperature on Mars?",
            },
            timeout=20,
            auth_required=False,
            validate_response=validate,
        )

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*70)
        print("PHASE 9 TEST SUMMARY")
        print("="*70)
        print(f"Total Tests: {self.tests_run}")
        print(f"✅ Passed: {self.tests_passed}")
        print(f"❌ Failed: {self.tests_failed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n" + "-"*70)
            print("FAILED TESTS:")
            print("-"*70)
            for test in self.failed_tests:
                print(f"❌ {test['name']}")
                print(f"   Endpoint: {test['endpoint']}")
                if 'expected' in test:
                    print(f"   Expected: {test['expected']}, Got: {test['actual']}")
                if 'validation' in test and test['validation']:
                    print(f"   Validation: {test['validation']}")
                if 'error' in test:
                    print(f"   Error: {test['error']}")
                print()
        
        print("="*70)
        return self.tests_failed == 0


def main():
    print("="*70)
    print("BHARAT CLIMATE TWIN - PHASE 9 BACKEND API TESTS")
    print("="*70)
    print(f"Base URL: {BASE_URL}")
    print(f"Test User: {TEST_USER['email']}")
    print("="*70 + "\n")

    tester = Phase9Tester()

    # Login first
    if not tester.test_login():
        print("\n❌ Login failed, cannot proceed with auth-required tests")
        return 1

    print("\n" + "="*70)
    print("TESTING GRID ENDPOINTS")
    print("="*70)
    tester.test_grid_temperature()
    tester.test_grid_humidity()
    tester.test_grid_precipitation()
    tester.test_grid_drought_spi()
    tester.test_grid_rainfall_departure()
    tester.test_grid_invalid_layer()
    tester.test_point_query()

    print("\n" + "="*70)
    print("TESTING LAB ENDPOINTS")
    print("="*70)
    tester.test_lab_run_with_narrative()
    tester.test_lab_run_without_narrative()
    tester.test_lab_sensitivity()

    print("\n" + "="*70)
    print("TESTING ADVISOR ENHANCEMENTS")
    print("="*70)
    tester.test_advisor_grounding()
    tester.test_advisor_no_hallucination()

    # Print summary
    success = tester.print_summary()
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
