"""
Phase 10 Backend API Test Suite - Role-Based Experience
Tests farmer and policymaker endpoints with AI-generated content
"""
import requests
import sys
import time
from datetime import datetime

BASE_URL = "https://climate-adapt-india.preview.emergentagent.com/api"

TEST_USERS = {
    "farmer": {"email": "farmer@test.in", "password": "Climate@2025"},
    "policymaker": {"email": "policymaker@test.in", "password": "Climate@2025"},
    "scientist": {"email": "scientist@test.in", "password": "Climate@2025"},
}


class Phase10Tester:
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failed_tests = []
        self.session = requests.Session()

    def log(self, message: str, level: str = "INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(
        self,
        name: str,
        method: str,
        endpoint: str,
        expected_status: int,
        data=None,
        timeout: int = 30,
        validate_response=None,
    ):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        self.tests_run += 1
        self.log(f"Testing {name}...", "TEST")

        try:
            if method == "GET":
                response = self.session.get(url, headers=headers, timeout=timeout)
            elif method == "POST":
                response = self.session.post(url, json=data, headers=headers, timeout=timeout)
            else:
                raise ValueError(f"Unsupported method: {method}")

            status_match = response.status_code == expected_status
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw": response.text[:200]}

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

    def test_login(self, email: str, password: str):
        """Test login and get token"""
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
            timeout=10,
            validate_response=validate,
        )
        
        if success and response.get("token"):
            self.token = response["token"]
            self.log(f"Token acquired for {email}", "INFO")
        
        return success, response

    def test_farmer_advisory_valid(self, state_code: str = "GJ"):
        """Test GET /api/farmer/advisory?state_code=GJ"""
        def validate(data):
            # Check for required fields
            if "cards" not in data:
                return False, "Missing 'cards' field"
            if "advice_text" not in data:
                return False, "Missing 'advice_text' field"
            if "provenance" not in data:
                return False, "Missing 'provenance' field"
            
            cards = data.get("cards", [])
            if len(cards) != 6:
                return False, f"Expected 6 cards, got {len(cards)}"
            
            # Check card structure
            required_card_fields = ["icon", "title", "big", "sub", "status"]
            for i, card in enumerate(cards):
                for field in required_card_fields:
                    if field not in card:
                        return False, f"Card {i} missing field: {field}"
            
            # Check advice_text (AI-generated, can be None if LLM fails)
            advice = data.get("advice_text")
            if advice and len(advice) < 20:
                return False, f"advice_text too short: {len(advice)} chars"
            
            # Check provenance
            prov = data.get("provenance", [])
            if len(prov) < 2:
                return False, f"Expected at least 2 provenance sources, got {len(prov)}"
            
            advice_status = "present" if advice else "None (LLM may have failed)"
            return True, f"6 cards, advice_text: {advice_status}, {len(prov)} sources"

        return self.run_test(
            f"Farmer Advisory (state_code={state_code})",
            "GET",
            f"farmer/advisory?state_code={state_code}",
            200,
            timeout=30,  # LLM can take 8-20s
            validate_response=validate,
        )

    def test_farmer_advisory_invalid(self):
        """Test GET /api/farmer/advisory?state_code=INVALID (should return 404)"""
        return self.run_test(
            "Farmer Advisory (invalid state_code)",
            "GET",
            "farmer/advisory?state_code=INVALID",
            404,
            timeout=10,
        )

    def test_policymaker_brief_valid(self, state_code: str = "MH"):
        """Test GET /api/policymaker/brief?state_code=MH"""
        def validate(data):
            # Check for required fields
            required = ["risk_cards", "brief_text", "national_summary", "top_priority_states", "provenance"]
            for field in required:
                if field not in data:
                    return False, f"Missing field: {field}"
            
            risk_cards = data.get("risk_cards", [])
            if len(risk_cards) != 6:
                return False, f"Expected 6 risk_cards, got {len(risk_cards)}"
            
            # Check risk card structure
            required_card_fields = ["label", "big", "sub", "severity"]
            for i, card in enumerate(risk_cards):
                for field in required_card_fields:
                    if field not in card:
                        return False, f"Risk card {i} missing field: {field}"
            
            # Check brief_text (AI-generated, can be None if LLM fails)
            brief = data.get("brief_text")
            if brief and len(brief) < 50:
                return False, f"brief_text too short: {len(brief)} chars"
            
            # Check national_summary structure
            ns = data.get("national_summary", {})
            ns_required = ["monsoon_phase", "monsoon_departure_pct", "states_in_drought", "states_with_warnings"]
            for field in ns_required:
                if field not in ns:
                    return False, f"national_summary missing field: {field}"
            
            # Check top_priority_states
            priority = data.get("top_priority_states", [])
            if not isinstance(priority, list):
                return False, "top_priority_states should be a list"
            
            # Check provenance
            prov = data.get("provenance", [])
            if len(prov) < 3:
                return False, f"Expected at least 3 provenance sources, got {len(prov)}"
            
            brief_status = "present" if brief else "None (LLM may have failed)"
            return True, f"6 risk cards, brief_text: {brief_status}, {len(priority)} priority states, {len(prov)} sources"

        return self.run_test(
            f"Policymaker Brief (state_code={state_code})",
            "GET",
            f"policymaker/brief?state_code={state_code}",
            200,
            timeout=30,  # LLM can take 8-20s
            validate_response=validate,
        )

    def test_policymaker_brief_invalid(self):
        """Test GET /api/policymaker/brief?state_code=INVALID (should return 404)"""
        return self.run_test(
            "Policymaker Brief (invalid state_code)",
            "GET",
            "policymaker/brief?state_code=INVALID",
            404,
            timeout=10,
        )

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("PHASE 10 TEST SUMMARY")
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
    """Run Phase 10 backend tests"""
    tester = Phase10Tester()
    
    print("=" * 80)
    print("BHARAT CLIMATE TWIN - PHASE 10 BACKEND TEST SUITE")
    print("Role-Based Experience: Farmer & Policymaker Endpoints")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80 + "\n")

    # Login as farmer (for auth token)
    print("\n--- AUTHENTICATION ---")
    tester.test_login(TEST_USERS["farmer"]["email"], TEST_USERS["farmer"]["password"])

    # Test Farmer Advisory endpoints
    print("\n--- FARMER ADVISORY ENDPOINTS ---")
    tester.test_farmer_advisory_valid("GJ")  # Gujarat
    tester.test_farmer_advisory_invalid()

    # Test Policymaker Brief endpoints
    print("\n--- POLICYMAKER BRIEF ENDPOINTS ---")
    tester.test_policymaker_brief_valid("MH")  # Maharashtra
    tester.test_policymaker_brief_invalid()

    # Print summary
    tester.print_summary()

    # Return exit code
    return 0 if tester.tests_failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
