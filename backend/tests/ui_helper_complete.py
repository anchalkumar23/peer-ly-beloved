# Helper: complete (or wipe) a profile via API for a given email, used for admin UI testing. usage: python ui_helper_complete.py email [wipe]
import os
import sys
import requests

API = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
email = sys.argv[1]
s = requests.Session()
s.post(f"{API}/auth/dev-login", json={"email": email})
if len(sys.argv) > 2 and sys.argv[2] == "wipe":
    print(s.delete(f"{API}/profile").status_code)
    sys.exit()
s.post(f"{API}/me/name", json={"display_name": email.split("@")[0].title()})
s.put(f"{API}/profile", json={"team": "Ops", "fun_fact": "admin", "obsession": "admin", "welcome_note": "hello", "step": 34})
print(s.post(f"{API}/profile/complete").status_code, s.put(f"{API}/profile/visibility", json={"discoverable": False}).status_code)
