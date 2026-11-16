# Scribbld People API regression tests (auth/domain gate, profile+quiz, matches, connections, admin RBAC, questions)
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
DOMAIN = "wearescribbld.com"


def login(email, name=None):
    s = requests.Session()
    r = s.post(f"{API}/auth/dev-login", json={"email": email, "name": name})
    assert r.status_code == 200, r.text
    return s


def new_email():
    return f"test_{uuid.uuid4().hex[:8]}@{DOMAIN}"


def complete_user(s, name="TEST_User", discoverable=True, answers=None):
    assert s.post(f"{API}/me/name", json={"display_name": name}).status_code == 200
    r = s.put(f"{API}/profile", json={"team": "Design", "fun_fact": "TEST fact", "obsession": "TEST obsession",
                                      "welcome_note": "Hi there this is a TEST note", "step": 34})
    assert r.status_code == 200
    for qid, sel in (answers or {"food": ["food_0", "food_1"], "dessert": ["dessert_1"], "brainstorm": ["brainstorm_0"],
                                 "shows": ["shows_0", "shows_1"], "anime": ["anime_0"]}).items():
        assert s.put(f"{API}/profile/answers/{qid}", json={"selected": sel}).status_code == 200
    r = s.post(f"{API}/profile/complete")
    assert r.status_code == 200, r.text
    assert s.put(f"{API}/profile/visibility", json={"discoverable": discoverable}).status_code == 200
    return s.get(f"{API}/auth/me").json()


@pytest.fixture(scope="module")
def created_sessions():
    lst = []
    yield lst
    for s in lst:  # cleanup: self-delete profile of TEST users we created
        try:
            s.delete(f"{API}/profile")
        except Exception:
            pass


@pytest.fixture(scope="module")
def kajol():
    return login(f"kajol@{DOMAIN}", "Kajol")


# --- Auth / domain gate
class TestAuth:
    def test_config(self):
        r = requests.get(f"{API}/auth/config")
        assert r.status_code == 200
        d = r.json()
        assert d["dev_login"] is True and d["domain"] == DOMAIN

    def test_domain_gate(self):
        r = requests.post(f"{API}/auth/dev-login", json={"email": "someone@gmail.com"})
        assert r.status_code == 403

    def test_me_unauth(self):
        assert requests.get(f"{API}/auth/me").status_code == 401

    def test_new_user_me(self, created_sessions):
        s = login(new_email(), "TEST_New")
        created_sessions.append(s)
        d = s.get(f"{API}/auth/me").json()
        assert d["name_confirmed"] is False and d["admin_role"] is None
        assert "sp_session" in s.cookies.get_dict()


# --- Profile, answers, autosave, archetype
class TestProfile:
    def test_quiz_flow(self, created_sessions):
        s = login(new_email(), "TEST_Quiz")
        created_sessions.append(s)
        qs = s.get(f"{API}/questions").json()
        assert len(qs) == 28 and qs[0]["id"] == "weather"
        area = next(q for q in qs if q["id"] == "area")
        assert area["options"][6]["write_in"] is True
        assert next(q for q in qs if q["id"] == "food")["followup"]
        assert s.post(f"{API}/me/name", json={"display_name": "TEST_Quiz"}).status_code == 200
        # autosave
        r = s.put(f"{API}/profile/answers/area", json={"selected": ["area_6"], "other": "Pune, Baner"})
        assert r.json()["answer"]["other"] == "Pune, Baner"
        r = s.put(f"{API}/profile/answers/dessert", json={"selected": ["dessert_0", "dessert_1"]})
        assert r.json()["answer"]["selected"] == ["dessert_0"]  # single-select trimmed
        s.put(f"{API}/profile", json={"step": 12})
        me = s.get(f"{API}/auth/me").json()
        assert me["profile"]["step"] == 12
        assert me["profile"]["answers"]["area"]["selected"] == ["area_6"]
        # incomplete -> 400
        assert s.post(f"{API}/profile/complete").status_code == 400
        # welcome note > 50 words
        assert s.put(f"{API}/profile", json={"welcome_note": " ".join(["w"] * 51)}).status_code == 400
        assert s.put(f"{API}/profile", json={"fun_fact": "x" * 161}).status_code == 422
        me = complete_user(s, "TEST_Quiz")
        assert me["profile"]["completed_at"] and me["profile"]["archetype"]["name"]
        assert me["profile"]["discoverable"] is True

    def test_photo_upload(self, created_sessions):
        s = login(new_email(), "TEST_Photo")
        created_sessions.append(s)
        s.post(f"{API}/me/name", json={"display_name": "TEST_Photo"})
        # 1x1 png
        png = bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4b30000000049454e44ae426082")
        r = s.post(f"{API}/profile/photo", files={"file": ("p.png", png, "image/png")})
        assert r.status_code == 200, r.text
        url = r.json()["photo_url"]
        assert url
        g = s.get(f"{BASE_URL}{url}")
        assert g.status_code == 200 and g.headers["content-type"].startswith("image/")
        bad = s.post(f"{API}/profile/photo", files={"file": ("p.txt", b"hello", "text/plain")})
        assert bad.status_code == 400


# --- Matches + connections
class TestMatchesConnections:
    def test_matches_and_say_hi(self, created_sessions):
        a = login(new_email(), "TEST_A")
        created_sessions.append(a)
        complete_user(a, "TEST_A")
        r = a.get(f"{API}/matches")
        assert r.status_code == 200
        ms = r.json()["matches"]
        assert 1 <= len(ms) <= 5
        for m in ms:
            assert m["commonalities"] and len(m["commonalities"]) <= 3
        # riya must be in the pool somewhere; find by refresh if needed
        riya = login(f"riya@{DOMAIN}")
        riya_id = riya.get(f"{API}/auth/me").json()["id"]
        # hide + not now
        target = ms[0]["id"]
        assert a.post(f"{API}/matches/{target}/hide").status_code == 200
        ids = [m["id"] for m in a.get(f"{API}/matches").json()["matches"]]
        assert target not in ids
        if len(ms) > 1:
            t2 = ms[1]["id"]
            a.post(f"{API}/matches/{t2}/not-now")
            assert t2 not in [m["id"] for m in a.get(f"{API}/matches").json()["matches"]]
        assert a.get(f"{API}/matches?refresh=true").status_code == 200
        # say hi to riya (direct)
        r = a.post(f"{API}/connections", json={"recipient_id": riya_id, "message": "TEST hello there"})
        assert r.status_code == 200, r.text
        cid = r.json()["id"]
        assert a.post(f"{API}/connections", json={"recipient_id": riya_id, "message": "again"}).status_code == 409
        assert riya.post(f"{API}/connections", json={"recipient_id": a.get(f"{API}/auth/me").json()['id'], "message": "x"}).status_code in (409, 400)
        out = a.get(f"{API}/connections").json()["outgoing"]
        assert any(c["id"] == cid and c["status"] == "sent" for c in out)
        inc = riya.get(f"{API}/connections").json()["incoming"]
        item = next(c for c in inc if c["id"] == cid)
        assert "email" not in item["person"]
        riya.post(f"{API}/connections/{cid}/seen")
        assert next(c for c in a.get(f"{API}/connections").json()["outgoing"] if c["id"] == cid)["status"] == "seen"
        r = riya.post(f"{API}/connections/{cid}/respond", json={"accept": True})
        assert r.json()["status"] == "accepted"
        assert riya.post(f"{API}/connections/{cid}/respond", json={"accept": False}).status_code == 400
        o = next(c for c in a.get(f"{API}/connections").json()["outgoing"] if c["id"] == cid)
        assert o["status"] == "accepted" and o["person"]["email"] == f"riya@{DOMAIN}"
        # sender cannot respond to own
        assert a.post(f"{API}/connections/{cid}/respond", json={"accept": True}).status_code == 404

    def test_not_discoverable_excluded(self, created_sessions):
        hidden = login(new_email(), "TEST_Hidden")
        created_sessions.append(hidden)
        hme = complete_user(hidden, "TEST_Hidden", discoverable=False)
        a = login(new_email(), "TEST_B")
        created_sessions.append(a)
        complete_user(a, "TEST_B")
        for _ in range(3):
            ids = [m["id"] for m in a.get(f"{API}/matches?refresh=true").json()["matches"]]
            assert hme["id"] not in ids
        r = a.post(f"{API}/connections", json={"recipient_id": hme["id"], "message": "hi"})
        assert r.status_code == 404

    def test_incomplete_cannot_match(self, created_sessions):
        s = login(new_email())
        created_sessions.append(s)
        assert s.get(f"{API}/matches").status_code == 400


# --- Admin RBAC
class TestAdmin:
    def test_non_admin_403(self, created_sessions):
        s = login(new_email())
        created_sessions.append(s)
        for p in ("/admin/stats", "/admin/people", "/admin/questions", "/admin/audit"):
            assert s.get(f"{API}{p}").status_code == 403

    def test_full_admin(self, kajol):
        st = kajol.get(f"{API}/admin/stats")
        assert st.status_code == 200 and "completion_rate" in st.json()
        ppl = kajol.get(f"{API}/admin/people", params={"q": "riya"}).json()
        assert any(p["email"] == f"riya@{DOMAIN}" for p in ppl)
        rid = next(p["id"] for p in ppl if p["email"] == f"riya@{DOMAIN}")
        v = kajol.get(f"{API}/admin/people/{rid}/profile")
        assert v.status_code == 200 and isinstance(v.json()["answers"], list)
        assert kajol.get(f"{API}/admin/audit").status_code == 200

    def test_hr_and_viewer(self, created_sessions):
        hr = login(f"hr@{DOMAIN}")
        viewer = login(f"batul@{DOMAIN}")
        rid = next(p["id"] for p in hr.get(f"{API}/admin/people", params={"q": "riya"}).json() if p["email"] == f"riya@{DOMAIN}")
        assert hr.get(f"{API}/admin/people/{rid}/profile").status_code == 403
        assert viewer.get(f"{API}/admin/people/{rid}/profile").status_code == 403
        assert viewer.get(f"{API}/admin/stats").status_code == 200
        assert viewer.put(f"{API}/admin/people/{rid}/pause", json={"paused": True}).status_code == 403
        assert viewer.put(f"{API}/admin/people/{rid}/status", json={"status": "departed"}).status_code == 403
        assert viewer.put(f"{API}/admin/questions/camera", json={"active": False}).status_code == 403
        # hr toggles question off/on
        r = hr.put(f"{API}/admin/questions/camera", json={"active": False})
        assert r.status_code == 200 and r.json()["active"] is False
        try:
            ids = [q["id"] for q in hr.get(f"{API}/questions").json()]
            assert "camera" not in ids
        finally:
            hr.put(f"{API}/admin/questions/camera", json={"active": True})
        assert "camera" in [q["id"] for q in hr.get(f"{API}/questions").json()]

    def test_depart_and_pause(self, kajol, created_sessions):
        email = new_email()
        t = login(email, "TEST_Depart")
        created_sessions.append(t)
        tme = complete_user(t, "TEST_Depart")
        viewer = login(new_email())
        created_sessions.append(viewer)
        complete_user(viewer, "TEST_Viewer")
        # pause
        assert kajol.put(f"{API}/admin/people/{tme['id']}/pause", json={"paused": True}).status_code == 200
        for _ in range(3):
            assert tme["id"] not in [m["id"] for m in viewer.get(f"{API}/matches?refresh=true").json()["matches"]]
        kajol.put(f"{API}/admin/people/{tme['id']}/pause", json={"paused": False})
        # depart
        assert kajol.put(f"{API}/admin/people/{tme['id']}/status", json={"status": "departed"}).status_code == 200
        try:
            assert t.get(f"{API}/auth/me").status_code in (401, 403)
            # dev-login now refuses departed users up front
            r2 = requests.post(f"{API}/auth/dev-login", json={"email": email})
            assert r2.status_code == 403 and "no longer active" in r2.text
            for _ in range(3):
                assert tme["id"] not in [m["id"] for m in viewer.get(f"{API}/matches?refresh=true").json()["matches"]]
            audit = kajol.get(f"{API}/admin/audit").json()
            assert any(a["action"] == "roster.mark_departed" and a["target"] == email for a in audit)
        finally:
            kajol.put(f"{API}/admin/people/{tme['id']}/status", json={"status": "active"})
            created_sessions.append(login(email))


# --- Settings: visibility / hide photo / delete
class TestSettings:
    def test_settings(self, created_sessions):
        s = login(new_email(), "TEST_Set")
        complete_user(s, "TEST_Set")
        r = s.put(f"{API}/profile/visibility", json={"discoverable": False})
        assert r.json()["discoverable"] is False
        r = s.put(f"{API}/profile", json={"photo_hidden": True})
        assert r.json()["photo_hidden"] is True
        assert s.delete(f"{API}/profile").status_code == 200
        me = s.get(f"{API}/auth/me").json()
        assert me["name_confirmed"] is False and me["profile"] is None
