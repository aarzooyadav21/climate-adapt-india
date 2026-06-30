"""
Phase 8 Backend API Test Suite for Bharat Climate Twin
Tests ONLY new Phase 8 features:
- GeoJSON India states endpoint
- Export endpoints (CSV/JSON)
- Saved scenarios CRUD with auth
"""
import requests
import sys
import time
from datetime import datetime
from typing import Dict, Optional

# Base URL from frontend/.env
BASE_URL = "https://climate-adapt-india.preview.emergentagent.com/api"

# Test credentials from seed users
TEST_USERS = {
    "scientist": {"email": "scientist@test.in", "password": "Climate@2025"},
    "farmer": {"email": "farmer@test.in", "password": "Climate@2025"},
}


class Phase8Tester:
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.token = None
        self.user_email = None
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
        check_content_type: Optional[str] = None,
    ) -> tuple[bool, any]:
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
            elif method == "DELETE":
                response = self.session.delete(url, headers=headers, timeout=timeout)
            else:
                raise ValueError(f"Unsupported method: {method}")

            # Check status code
            status_match = response.status_code == expected_status
            
            # Check content type if specified
            content_type_match = True
            if check_content_type:
                actual_ct = response.headers.get("Content-Type", "")
                content_type_match = check_content_type in actual_ct
                if not content_type_match:
                    self.log(f"   Content-Type mismatch: expected {check_content_type}, got {actual_ct}", "WARN")
            
            # Try to parse response
            response_data = None
            if "application/json" in response.headers.get("Content-Type", ""):
                try:
                    response_data = response.json()
                except:
                    response_data = {"raw": response.text[:200]}
            else:
                # For CSV or other formats, return raw text
                response_data = response.text

            # Validate response structure if validator provided
            validation_passed = True
            validation_msg = ""
            if validate_response and status_match:
                validation_passed, validation_msg = validate_response(response_data, response)

            success = status_match and validation_passed and content_type_match

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
                if not content_type_match:
                    error_msg += f" | Content-Type mismatch"
                if not validation_passed:
                    error_msg += f" | Validation: {validation_msg}"
                self.log(error_msg, "FAIL")
                if isinstance(response_data, dict):
                    self.log(f"   Response: {str(response_data)[:200]}", "DEBUG")
                else:
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
            return False, None
        except Exception as e:
            self.tests_failed += 1
            self.log(f"❌ FAILED - {name} | Error: {str(e)}", "FAIL")
            self.failed_tests.append({"name": name, "endpoint": endpoint, "error": str(e)})
            return False, None

    def test_login(self, email: str, password: str):
        """Test POST /api/auth/login"""
        def validate(data, resp):
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
        
        if success and isinstance(response, dict) and response.get("token"):
            self.token = response["token"]
            self.user_email = email
            self.log(f"Token acquired for {email}", "INFO")
        
        return success, response

    # ========== PHASE 8 TESTS ==========

    def test_geo_india_states(self):
        """Test GET /api/geo/india/states - returns GeoJSON FeatureCollection"""
        def validate(data, resp):
            if not isinstance(data, dict):
                return False, "Response is not a JSON object"
            if data.get("type") != "FeatureCollection":
                return False, f"Expected type 'FeatureCollection', got {data.get('type')}"
            features = data.get("features", [])
            if not isinstance(features, list):
                return False, "features is not a list"
            if len(features) < 34 or len(features) > 36:
                return False, f"Expected 34-36 state polygons, got {len(features)}"
            
            # Check first feature structure
            if features:
                feat = features[0]
                if feat.get("type") != "Feature":
                    return False, "Feature type is not 'Feature'"
                props = feat.get("properties", {})
                if "code" not in props or "name" not in props:
                    return False, "Missing properties.code or properties.name"
                geom = feat.get("geometry", {})
                geom_type = geom.get("type")
                if geom_type not in ["Polygon", "MultiPolygon"]:
                    return False, f"Unexpected geometry type: {geom_type}"
            
            return True, f"GeoJSON with {len(features)} state polygons"

        return self.run_test(
            "GeoJSON India States",
            "GET",
            "geo/india/states",
            200,
            validate_response=validate,
            check_content_type="application/json",
        )

    def test_export_snapshot_csv(self, state_code: str = "DL"):
        """Test GET /api/export/snapshot?state_code=DL&fmt=csv"""
        def validate(data, resp):
            if not isinstance(data, str):
                return False, "Response is not text"
            lines = data.strip().split("\n")
            if len(lines) < 2:
                return False, f"Expected at least 2 lines (header + data), got {len(lines)}"
            header = lines[0]
            if "group" not in header or "variable" not in header or "value" not in header:
                return False, f"CSV header missing expected columns: {header}"
            return True, f"CSV with {len(lines)} lines (header + {len(lines)-1} rows)"

        return self.run_test(
            f"Export Snapshot CSV ({state_code})",
            "GET",
            f"export/snapshot?state_code={state_code}&fmt=csv",
            200,
            timeout=15,
            validate_response=validate,
            check_content_type="text/csv",
        )

    def test_export_snapshot_json(self, state_code: str = "DL"):
        """Test GET /api/export/snapshot?state_code=DL&fmt=json"""
        def validate(data, resp):
            if not isinstance(data, dict):
                return False, "Response is not JSON object"
            if "state" not in data:
                return False, "Missing 'state' field"
            if data["state"].get("code") != state_code:
                return False, f"State code mismatch: expected {state_code}, got {data['state'].get('code')}"
            return True, f"JSON snapshot for {data['state'].get('name')}"

        return self.run_test(
            f"Export Snapshot JSON ({state_code})",
            "GET",
            f"export/snapshot?state_code={state_code}&fmt=json",
            200,
            timeout=15,
            validate_response=validate,
            check_content_type="application/json",
        )

    def test_export_historical_csv(self, state_code: str = "MH", days: int = 90):
        """Test GET /api/export/historical?state_code=MH&days=90&fmt=csv"""
        def validate(data, resp):
            if not isinstance(data, str):
                return False, "Response is not text"
            lines = data.strip().split("\n")
            if len(lines) < days - 10:  # Allow some tolerance
                return False, f"Expected ~{days} lines, got {len(lines)}"
            header = lines[0]
            expected_cols = ["date", "t_mean_c", "t_max_c", "t_min_c", "precip_mm"]
            for col in expected_cols:
                if col not in header:
                    return False, f"CSV header missing column: {col}"
            return True, f"CSV with {len(lines)} lines ({days} days historical)"

        return self.run_test(
            f"Export Historical CSV ({state_code}, {days}d)",
            "GET",
            f"export/historical?state_code={state_code}&days={days}&fmt=csv",
            200,
            timeout=20,
            validate_response=validate,
            check_content_type="text/csv",
        )

    def test_export_drought_csv(self):
        """Test GET /api/export/drought?fmt=csv"""
        def validate(data, resp):
            if not isinstance(data, str):
                return False, "Response is not text"
            lines = data.strip().split("\n")
            if len(lines) < 36:  # 36 states + header
                return False, f"Expected at least 36 state rows, got {len(lines)-1}"
            header = lines[0]
            expected_cols = ["code", "name", "zone", "spi", "category"]
            for col in expected_cols:
                if col not in header:
                    return False, f"CSV header missing column: {col}"
            return True, f"CSV with {len(lines)-1} state drought records"

        return self.run_test(
            "Export Drought CSV",
            "GET",
            "export/drought?fmt=csv",
            200,
            timeout=30,
            validate_response=validate,
            check_content_type="text/csv",
        )

    def test_export_monsoon_csv(self):
        """Test GET /api/export/monsoon?fmt=csv"""
        def validate(data, resp):
            if not isinstance(data, str):
                return False, "Response is not text"
            lines = data.strip().split("\n")
            if len(lines) < 14:  # 14 monsoon states + header
                return False, f"Expected at least 14 state rows, got {len(lines)-1}"
            header = lines[0]
            expected_cols = ["code", "name", "zone", "observed_mm", "lpa_mm", "departure_pct", "category"]
            for col in expected_cols:
                if col not in header:
                    return False, f"CSV header missing column: {col}"
            return True, f"CSV with {len(lines)-1} state monsoon records"

        return self.run_test(
            "Export Monsoon CSV",
            "GET",
            "export/monsoon?fmt=csv",
            200,
            timeout=30,
            validate_response=validate,
            check_content_type="text/csv",
        )

    def test_saved_scenarios_create(self):
        """Test POST /api/saved-scenarios (with auth)"""
        def validate(data, resp):
            if not isinstance(data, dict):
                return False, "Response is not JSON object"
            if "id" not in data:
                return False, "Missing 'id' field"
            if "user_id" not in data:
                return False, "Missing 'user_id' field"
            if data.get("label") != "Test Scenario Phase 8":
                return False, f"Label mismatch: {data.get('label')}"
            if data.get("state_code") != "MH":
                return False, f"State code mismatch: {data.get('state_code')}"
            return True, f"Created scenario with id={data['id']}"

        success, response = self.run_test(
            "Create Saved Scenario (with auth)",
            "POST",
            "saved-scenarios",
            200,
            data={
                "label": "Test Scenario Phase 8",
                "state_code": "MH",
                "state_name": "Maharashtra",
                "warming_c": 2.5,
                "horizon_years": 30,
                "rainfall_shift_pct": -10.0,
                "result_summary": {"baseline": {"temp": 25}, "projection": {"temp": 27.5}},
            },
            auth_required=True,
            validate_response=validate,
        )
        
        # Store scenario ID for later tests
        if success and isinstance(response, dict):
            self.saved_scenario_id = response.get("id")
        
        return success, response

    def test_saved_scenarios_list(self):
        """Test GET /api/saved-scenarios (with auth)"""
        def validate(data, resp):
            if not isinstance(data, list):
                return False, "Response is not a list"
            if len(data) < 1:
                return False, "Expected at least 1 saved scenario"
            # Check first scenario structure
            if data:
                scenario = data[0]
                required = ["id", "user_id", "label", "state_code", "warming_c", "horizon_years", "created_at"]
                for field in required:
                    if field not in scenario:
                        return False, f"Missing field: {field}"
            return True, f"Retrieved {len(data)} saved scenario(s)"

        return self.run_test(
            "List Saved Scenarios (with auth)",
            "GET",
            "saved-scenarios",
            200,
            auth_required=True,
            validate_response=validate,
        )

    def test_saved_scenarios_get_one(self, scenario_id: str):
        """Test GET /api/saved-scenarios/{id}"""
        def validate(data, resp):
            if not isinstance(data, dict):
                return False, "Response is not JSON object"
            if data.get("id") != scenario_id:
                return False, f"ID mismatch: expected {scenario_id}, got {data.get('id')}"
            return True, f"Retrieved scenario: {data.get('label')}"

        return self.run_test(
            f"Get Saved Scenario by ID",
            "GET",
            f"saved-scenarios/{scenario_id}",
            200,
            auth_required=True,
            validate_response=validate,
        )

    def test_saved_scenarios_delete(self, scenario_id: str):
        """Test DELETE /api/saved-scenarios/{id}"""
        def validate(data, resp):
            if not isinstance(data, dict):
                return False, "Response is not JSON object"
            if not data.get("deleted"):
                return False, "deleted field is not True"
            return True, "Scenario deleted successfully"

        return self.run_test(
            f"Delete Saved Scenario",
            "DELETE",
            f"saved-scenarios/{scenario_id}",
            200,
            auth_required=True,
            validate_response=validate,
        )

    def test_saved_scenarios_no_auth(self):
        """Test POST /api/saved-scenarios without auth (should return 401)"""
        # Temporarily remove token
        old_token = self.token
        self.token = None
        
        def validate(data, resp):
            # For 401, we expect an error message
            return True, "Correctly rejected unauthenticated request"

        success, response = self.run_test(
            "Create Saved Scenario (no auth - expect 401)",
            "POST",
            "saved-scenarios",
            401,
            data={
                "label": "Should Fail",
                "state_code": "DL",
                "warming_c": 1.0,
                "horizon_years": 10,
            },
            auth_required=False,
            validate_response=validate,
        )
        
        # Restore token
        self.token = old_token
        return success, response

    def test_saved_scenarios_user_isolation(self, other_user_email: str, other_user_password: str):
        """Test that User A cannot access User B's saved scenarios"""
        # First, create a scenario as current user
        self.log("Creating scenario as User A...", "INFO")
        success, resp = self.test_saved_scenarios_create()
        if not success or not hasattr(self, 'saved_scenario_id'):
            self.log("Failed to create scenario for isolation test", "WARN")
            return False, None
        
        user_a_scenario_id = self.saved_scenario_id
        user_a_token = self.token
        
        # Login as User B
        self.log(f"Logging in as User B ({other_user_email})...", "INFO")
        success, _ = self.test_login(other_user_email, other_user_password)
        if not success:
            self.log("Failed to login as User B", "WARN")
            self.token = user_a_token  # Restore
            return False, None
        
        # Try to access User A's scenario as User B (should return 404)
        def validate(data, resp):
            # We expect 404 because User B shouldn't see User A's scenario
            return True, "Correctly returned 404 for other user's scenario"

        success, response = self.run_test(
            "User Isolation Test (User B accessing User A's scenario - expect 404)",
            "GET",
            f"saved-scenarios/{user_a_scenario_id}",
            404,
            auth_required=True,
            validate_response=validate,
        )
        
        # Restore User A's token
        self.token = user_a_token
        self.user_email = TEST_USERS["scientist"]["email"]
        
        return success, response

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("PHASE 8 TEST SUMMARY")
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
    """Run Phase 8 backend tests"""
    tester = Phase8Tester()
    
    print("=" * 80)
    print("BHARAT CLIMATE TWIN - PHASE 8 BACKEND API TEST SUITE")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80 + "\n")

    # Login as scientist
    print("\n--- AUTHENTICATION ---")
    success, _ = tester.test_login(TEST_USERS["scientist"]["email"], TEST_USERS["scientist"]["password"])
    if not success:
        print("❌ CRITICAL: Login failed, cannot proceed with auth-required tests")
        tester.print_summary()
        return 1

    # Test GeoJSON endpoint
    print("\n--- GEOJSON TESTS ---")
    tester.test_geo_india_states()

    # Test Export endpoints
    print("\n--- EXPORT TESTS ---")
    tester.test_export_snapshot_csv("DL")
    tester.test_export_snapshot_json("DL")
    tester.test_export_historical_csv("MH", 90)
    tester.test_export_drought_csv()
    tester.test_export_monsoon_csv()

    # Test Saved Scenarios CRUD
    print("\n--- SAVED SCENARIOS TESTS ---")
    tester.test_saved_scenarios_create()
    tester.test_saved_scenarios_list()
    
    # Test get one scenario (if we have an ID)
    if hasattr(tester, 'saved_scenario_id') and tester.saved_scenario_id:
        tester.test_saved_scenarios_get_one(tester.saved_scenario_id)
    
    # Test no auth (should fail with 401)
    tester.test_saved_scenarios_no_auth()
    
    # Test user isolation
    tester.test_saved_scenarios_user_isolation(
        TEST_USERS["farmer"]["email"],
        TEST_USERS["farmer"]["password"]
    )
    
    # Delete the test scenario (cleanup)
    if hasattr(tester, 'saved_scenario_id') and tester.saved_scenario_id:
        tester.test_saved_scenarios_delete(tester.saved_scenario_id)

    # Print summary
    tester.print_summary()

    # Return exit code
    return 0 if tester.tests_failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
