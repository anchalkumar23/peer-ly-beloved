import random
import sys
import requests

API = sys.argv[1] + "/api"
PEOPLE = [("riya@wearescribbld.com", "Riya Shah", "Design"), ("arjun@wearescribbld.com", "Arjun Mehta", "Copy"),
          ("zoya@wearescribbld.com", "Zoya Khan", "Strategy"), ("dev@wearescribbld.com", "Dev Patel", "Tech")]

for email, name, team in PEOPLE:
    s = requests.Session()
    s.post(f"{API}/auth/dev-login", json={"email": email, "name": name}).raise_for_status()
    s.post(f"{API}/me/name", json={"display_name": name})
    qs = s.get(f"{API}/questions").json()
    for q in qs:
        opts = [o["id"] for o in q["options"] if not o["write_in"]]
        sel = random.sample(opts, k=random.randint(1, 3)) if q["multi"] else [random.choice(opts)]
        s.put(f"{API}/profile/answers/{q['id']}", json={"selected": sel})
    s.put(f"{API}/profile", json={"team": team, "fun_fact": f"{name.split()[0]} can juggle three chai cups",
                                  "obsession": "The new bao place in Bandra", "welcome_note": "Hey! Looks like we'd click. Coffee sometime?", "step": 35})
    s.post(f"{API}/profile/complete").raise_for_status()
    s.put(f"{API}/profile/visibility", json={"discoverable": True})
    print("seeded", email)
