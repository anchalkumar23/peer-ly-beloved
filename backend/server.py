import asyncio
import hashlib
import logging
import os
import secrets
import uuid
from contextlib import suppress
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from authlib.integrations.starlette_client import OAuth, OAuthError  # noqa: E402
from fastapi import APIRouter, Depends, FastAPI, File, HTTPException, Query, Request, Response, UploadFile  # noqa: E402
from fastapi.responses import RedirectResponse  # noqa: E402
from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402
from pymongo import ASCENDING, DESCENDING, IndexModel  # noqa: E402
from starlette.middleware.cors import CORSMiddleware  # noqa: E402
from starlette.middleware.sessions import SessionMiddleware  # noqa: E402

import emailer  # noqa: E402
import storage  # noqa: E402
from quiz_config import build_questions, compare, compute_archetype  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

PUBLIC_BASE_URL = os.environ["PUBLIC_BASE_URL"].rstrip("/")
SESSION_DAYS = int(os.environ["SESSION_DAYS"])
DOMAIN = os.environ["ALLOWED_EMAIL_DOMAIN"].lower()
COOKIE = "sp_session"


def _emails(key):
    return {e.strip().lower() for e in os.environ.get(key, "").split(",") if e.strip()}


ADMIN_ROLES = {**{e: "viewer" for e in _emails("ADMIN_VIEW_EMAILS")},
               **{e: "hr" for e in _emails("ADMIN_HR_EMAILS")},
               **{e: "full" for e in _emails("ADMIN_FULL_EMAILS")}}

INDEXES = {
    "users": [IndexModel([("id", ASCENDING)], name="id", unique=True),
              IndexModel([("email", ASCENDING)], name="email", unique=True)],
    "sessions": [IndexModel([("token_hash", ASCENDING)], name="token_hash", unique=True),
                 IndexModel([("expires_at", ASCENDING)], name="ttl", expireAfterSeconds=0)],
    "profiles": [IndexModel([("user_id", ASCENDING)], name="user_id", unique=True),
                 IndexModel([("completed_at", ASCENDING), ("discoverable", ASCENDING)], name="matchable")],
    "questions": [IndexModel([("id", ASCENDING)], name="id", unique=True)],
    "match_events": [IndexModel([("user_id", ASCENDING), ("other_id", ASCENDING)], name="pair", unique=True)],
    "connections": [IndexModel([("id", ASCENDING)], name="id", unique=True),
                    IndexModel([("recipient_id", ASCENDING)], name="recipient"),
                    IndexModel([("sender_id", ASCENDING)], name="sender")],
    "audit_logs": [IndexModel([("at", DESCENDING)], name="at_desc")],
}


async def ensure_indexes():
    for coll, models in INDEXES.items():
        for m in models:
            try:
                await db[coll].create_indexes([m])
            except Exception as exc:
                logger.error("ensure_indexes(%s.%s): %s", coll, m.document["name"], exc)


async def seed_questions():
    for q in build_questions():
        options = q.pop("options")
        await db.questions.update_one({"id": q["id"]}, {"$set": {"options": options}, "$setOnInsert": q}, upsert=True)


def now():
    return datetime.now(timezone.utc)


def iso(dt):
    return dt.isoformat() if isinstance(dt, datetime) else dt


def digest(v):
    return hashlib.sha256(v.encode()).hexdigest()


# ---------------- OAuth (Microsoft Entra) ----------------
oauth = OAuth()
_entra_ready = False


def entra_configured():
    return all(os.environ.get(k) for k in ("ENTRA_TENANT_ID", "ENTRA_CLIENT_ID", "ENTRA_CLIENT_SECRET"))


def get_entra():
    global _entra_ready
    if not entra_configured():
        raise HTTPException(503, "Microsoft sign-in is not configured yet")
    if not _entra_ready:
        oauth.register(
            name="entra",
            client_id=os.environ["ENTRA_CLIENT_ID"],
            client_secret=os.environ["ENTRA_CLIENT_SECRET"],
            server_metadata_url=f"https://login.microsoftonline.com/{os.environ['ENTRA_TENANT_ID']}/v2.0/.well-known/openid-configuration",
            client_kwargs={"scope": "openid profile email"},
        )
        _entra_ready = True
    return oauth.entra


app = FastAPI()
api = APIRouter(prefix="/api")


async def upsert_user_and_session(response: Response, *, tid, oid, email, name):
    email = email.lower()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing and existing.get("status") == "departed":
        raise HTTPException(403, "This account is no longer active")
    if existing:
        await db.users.update_one({"email": email}, {"$set": {"tid": tid, "oid": oid, "ms_name": name, "last_seen": iso(now())}})
        uid = existing["id"]
    else:
        uid = str(uuid.uuid4())
        await db.users.insert_one({"id": uid, "tid": tid, "oid": oid, "email": email, "ms_name": name,
                                   "display_name": name, "name_confirmed": False, "status": "active",
                                   "created_at": iso(now()), "last_seen": iso(now())})
    raw = secrets.token_urlsafe(48)
    expires = now() + timedelta(days=SESSION_DAYS)
    await db.sessions.insert_one({"token_hash": digest(raw), "user_id": uid, "created_at": now(), "expires_at": expires})
    response.set_cookie(COOKIE, raw, max_age=SESSION_DAYS * 86400, httponly=True, secure=True, samesite="lax", path="/")


def check_domain(email):
    if not email or not email.lower().endswith("@" + DOMAIN):
        raise HTTPException(403, f"Only @{DOMAIN} accounts can join peer-ly beloved")


@api.get("/auth/config")
async def auth_config():
    return {"microsoft": entra_configured(), "dev_login": os.environ.get("DEV_LOGIN_ENABLED") == "true", "domain": DOMAIN}


@api.get("/auth/login")
async def ms_login(request: Request):
    return await get_entra().authorize_redirect(request, f"{PUBLIC_BASE_URL}/api/auth/callback")


@api.get("/auth/callback")
async def ms_callback(request: Request):
    entra = get_entra()
    try:
        token = await entra.authorize_access_token(request)
        claims = token["userinfo"]
    except (OAuthError, KeyError, ValueError):
        return RedirectResponse(f"{PUBLIC_BASE_URL}/?auth_error=failed")
    tid, oid = str(claims.get("tid", "")), str(claims.get("oid", ""))
    email = (claims.get("email") or claims.get("preferred_username") or "").strip().lower()
    if tid != os.environ["ENTRA_TENANT_ID"] or not oid:
        return RedirectResponse(f"{PUBLIC_BASE_URL}/?auth_error=tenant")
    if not email.endswith("@" + DOMAIN):
        return RedirectResponse(f"{PUBLIC_BASE_URL}/?auth_error=domain")
    resp = RedirectResponse(f"{PUBLIC_BASE_URL}/")
    try:
        await upsert_user_and_session(resp, tid=tid, oid=oid, email=email, name=claims.get("name") or email.split("@")[0])
    except HTTPException:
        return RedirectResponse(f"{PUBLIC_BASE_URL}/?auth_error=departed")
    return resp


class DevLogin(BaseModel):
    email: str
    name: Optional[str] = None


@api.post("/auth/dev-login")
async def dev_login(body: DevLogin, response: Response):
    if os.environ.get("DEV_LOGIN_ENABLED") != "true":
        raise HTTPException(404, "Not found")
    check_domain(body.email)
    name = (body.name or body.email.split("@")[0]).strip()[:60]
    await upsert_user_and_session(response, tid="preview", oid=body.email.lower(), email=body.email, name=name)
    return {"ok": True}


async def current_user(request: Request):
    raw = request.cookies.get(COOKIE)
    if not raw:
        raise HTTPException(401, "Not signed in")
    sess = await db.sessions.find_one({"token_hash": digest(raw), "expires_at": {"$gt": now()}})
    if not sess:
        raise HTTPException(401, "Session expired")
    user = await db.users.find_one({"id": sess["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "Account not found")
    if user.get("status") == "departed":
        raise HTTPException(403, "This account is no longer active")
    user["admin_role"] = ADMIN_ROLES.get(user["email"])
    return user


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    raw = request.cookies.get(COOKIE)
    if raw:
        await db.sessions.delete_one({"token_hash": digest(raw)})
    response.delete_cookie(COOKIE, path="/")
    return {"ok": True}


# ---------------- helpers ----------------
async def get_questions(active_only=True):
    q = {"active": True} if active_only else {}
    return await db.questions.find(q, {"_id": 0}).sort("order", 1).to_list(200)


def public_question(q):
    return {"id": q["id"], "order": q["order"], "section": q["section"], "prompt": q["prompt"], "multi": q["multi"],
            "followup": q.get("followup"),
            "options": [{"id": o["id"], "label": o["label"], "emoji": o["emoji"], "write_in": o["write_in"], "image": o.get("image")} for o in q["options"]]}


async def get_profile(uid):
    return await db.profiles.find_one({"user_id": uid}, {"_id": 0})


def photo_url(p):
    if p and p.get("photo_path") and not p.get("photo_hidden"):
        return f"/api/photos/{p['user_id']}?v={p.get('photo_ver', 1)}"
    return None


def own_profile_view(p):
    if not p:
        return None
    out = {k: p.get(k) for k in ("display_name", "team", "fun_fact", "obsession", "welcome_note", "photo_hidden",
                                 "discoverable", "consent_at", "answers", "step", "completed_at", "archetype", "admin_paused")}
    out["has_photo"] = bool(p.get("photo_path"))
    out["photo_url"] = f"/api/photos/{p['user_id']}?v={p.get('photo_ver', 1)}" if p.get("photo_path") else None
    return out


def card_view(user, p):
    arch = p.get("archetype") or {}
    return {"id": user["id"], "display_name": p.get("display_name") or user.get("display_name"), "team": p.get("team"),
            "photo_url": photo_url(p), "fun_fact": p.get("fun_fact"), "obsession": p.get("obsession"),
            "archetype": {"id": arch.get("id"), "name": arch.get("name")} if arch else None}


async def audit(actor, action, target=None, details=None):
    await db.audit_logs.insert_one({"id": str(uuid.uuid4()), "actor_email": actor["email"], "actor_role": actor.get("admin_role"),
                                    "action": action, "target": target, "details": details or {}, "at": iso(now())})


async def matchable_user_ids():
    users = await db.users.find({"status": "active"}, {"_id": 0, "id": 1}).to_list(5000)
    return {u["id"] for u in users}


# ---------------- me / profile ----------------
@api.get("/auth/me")
async def me(user=Depends(current_user)):
    p = await get_profile(user["id"])
    unread = await db.connections.count_documents({"recipient_id": user["id"], "status": "sent"})
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_seen": iso(now())}})
    return {"id": user["id"], "email": user["email"], "ms_name": user.get("ms_name"), "display_name": user.get("display_name"),
            "name_confirmed": user.get("name_confirmed", False), "admin_role": user["admin_role"],
            "profile": own_profile_view(p), "unread_requests": unread}


class NameIn(BaseModel):
    display_name: str = Field(min_length=1, max_length=40)


@api.post("/me/name")
async def confirm_name(body: NameIn, user=Depends(current_user)):
    name = body.display_name.strip()
    await db.users.update_one({"id": user["id"]}, {"$set": {"display_name": name, "name_confirmed": True}})
    await db.profiles.update_one({"user_id": user["id"]},
                                 {"$set": {"display_name": name, "updated_at": iso(now())},
                                  "$setOnInsert": {"user_id": user["id"], "answers": {}, "step": 0, "discoverable": False,
                                                   "created_at": iso(now())}}, upsert=True)
    return {"ok": True}


@api.get("/questions")
async def list_questions(user=Depends(current_user)):
    return [public_question(q) for q in await get_questions()]


class ProfilePatch(BaseModel):
    display_name: Optional[str] = Field(None, max_length=40)
    team: Optional[str] = Field(None, max_length=60)
    fun_fact: Optional[str] = Field(None, max_length=160)
    obsession: Optional[str] = Field(None, max_length=160)
    welcome_note: Optional[str] = Field(None, max_length=400)
    photo_hidden: Optional[bool] = None
    step: Optional[int] = Field(None, ge=0, le=100)


@api.put("/profile")
async def update_profile(body: ProfilePatch, user=Depends(current_user)):
    data = {k: (v.strip() if isinstance(v, str) else v) for k, v in body.model_dump(exclude_none=True).items()}
    if "welcome_note" in data and len(data["welcome_note"].split()) > 50:
        raise HTTPException(400, "Welcome note can be up to 50 words")
    data["updated_at"] = iso(now())
    await db.profiles.update_one({"user_id": user["id"]},
                                 {"$set": data, "$setOnInsert": {"user_id": user["id"], "answers": {}, "discoverable": False,
                                                                 "created_at": iso(now())}}, upsert=True)
    if data.get("display_name"):
        await db.users.update_one({"id": user["id"]}, {"$set": {"display_name": data["display_name"]}})
    return own_profile_view(await get_profile(user["id"]))


class AnswerIn(BaseModel):
    selected: List[str] = []
    other: Optional[str] = Field(None, max_length=80)
    followup: Optional[str] = Field(None, max_length=60)
    skipped: bool = False


@api.put("/profile/answers/{qid}")
async def save_answer(qid: str, body: AnswerIn, user=Depends(current_user)):
    q = await db.questions.find_one({"id": qid}, {"_id": 0})
    if not q:
        raise HTTPException(404, "Question not found")
    valid = {o["id"] for o in q["options"]}
    sel = [s for s in dict.fromkeys(body.selected) if s in valid]
    if not q["multi"] and len(sel) > 1:
        sel = sel[:1]
    ans = {"selected": sel, "other": (body.other or "").strip() or None, "followup": (body.followup or "").strip() or None,
           "skipped": body.skipped and not sel, "updated_at": iso(now())}
    await db.profiles.update_one({"user_id": user["id"]},
                                 {"$set": {f"answers.{qid}": ans, "updated_at": iso(now())},
                                  "$setOnInsert": {"user_id": user["id"], "discoverable": False, "created_at": iso(now())}},
                                 upsert=True)
    return {"ok": True, "answer": ans}


ALLOWED_IMG = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


@api.post("/profile/photo")
async def upload_photo(file: UploadFile = File(...), user=Depends(current_user)):
    if file.content_type not in ALLOWED_IMG:
        raise HTTPException(400, "Please upload a JPG, PNG or WebP image")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "Photo must be under 5 MB")
    path = f"{storage.APP_NAME}/photos/{user['id']}/{uuid.uuid4()}.{ALLOWED_IMG[file.content_type]}"
    try:
        result = await asyncio.to_thread(storage.put_object, path, data, file.content_type)
    except Exception as e:
        logger.error("photo upload failed: %s", e)
        raise HTTPException(502, "Photo upload failed, please try again")
    p = await get_profile(user["id"]) or {}
    await db.profiles.update_one({"user_id": user["id"]},
                                 {"$set": {"photo_path": result["path"], "photo_type": file.content_type,
                                           "photo_ver": (p.get("photo_ver") or 0) + 1, "photo_hidden": False, "updated_at": iso(now())},
                                  "$setOnInsert": {"user_id": user["id"], "answers": {}, "discoverable": False, "created_at": iso(now())}},
                                 upsert=True)
    return own_profile_view(await get_profile(user["id"]))


@api.delete("/profile/photo")
async def remove_photo(user=Depends(current_user)):
    await db.profiles.update_one({"user_id": user["id"]}, {"$set": {"photo_path": None, "updated_at": iso(now())}})
    return own_profile_view(await get_profile(user["id"]))


_photo_cache: dict = {}


@api.get("/photos/{user_id}")
async def get_photo(user_id: str, user=Depends(current_user)):
    p = await get_profile(user_id)
    if not p or not p.get("photo_path"):
        raise HTTPException(404, "No photo")
    if user_id != user["id"] and not user["admin_role"]:
        target = await db.users.find_one({"id": user_id}, {"_id": 0, "status": 1})
        if p.get("photo_hidden") or not target or target.get("status") != "active":
            raise HTTPException(404, "No photo")
    path = p["photo_path"]
    if path not in _photo_cache:
        try:
            data, ctype = await asyncio.to_thread(storage.get_object, path)
        except Exception:
            raise HTTPException(404, "No photo")
        if len(_photo_cache) > 200:
            _photo_cache.clear()
        _photo_cache[path] = (data, p.get("photo_type") or ctype)
    data, ctype = _photo_cache[path]
    return Response(content=data, media_type=ctype, headers={"Cache-Control": "private, max-age=86400"})


@api.post("/profile/complete")
async def complete_profile(user=Depends(current_user)):
    p = await get_profile(user["id"])
    if not p:
        raise HTTPException(400, "Start your profile first")
    missing = [k for k in ("display_name", "team", "fun_fact", "obsession", "welcome_note") if not p.get(k)]
    if missing:
        raise HTTPException(400, f"Missing: {', '.join(missing)}")
    arch = compute_archetype(await get_questions(), p.get("answers") or {})
    await db.profiles.update_one({"user_id": user["id"]},
                                 {"$set": {"archetype": arch, "completed_at": p.get("completed_at") or iso(now()), "updated_at": iso(now())}})
    return own_profile_view(await get_profile(user["id"]))


class VisibilityIn(BaseModel):
    discoverable: bool


@api.put("/profile/visibility")
async def set_visibility(body: VisibilityIn, user=Depends(current_user)):
    upd = {"discoverable": body.discoverable, "updated_at": iso(now())}
    if body.discoverable:
        upd["consent_at"] = iso(now())
    await db.profiles.update_one({"user_id": user["id"]}, {"$set": upd,
                                 "$setOnInsert": {"user_id": user["id"], "answers": {}, "created_at": iso(now())}}, upsert=True)
    return own_profile_view(await get_profile(user["id"]))


async def wipe_profile(uid):
    await db.profiles.delete_one({"user_id": uid})
    await db.match_events.delete_many({"$or": [{"user_id": uid}, {"other_id": uid}]})
    await db.connections.delete_many({"$or": [{"sender_id": uid}, {"recipient_id": uid}]})
    await db.users.update_one({"id": uid}, {"$set": {"name_confirmed": False}})


@api.delete("/profile")
async def delete_profile(user=Depends(current_user)):
    await wipe_profile(user["id"])
    await db.audit_logs.insert_one({"id": str(uuid.uuid4()), "actor_email": user["email"], "actor_role": "self",
                                    "action": "profile.self_delete", "target": user["email"], "details": {}, "at": iso(now())})
    return {"ok": True}


# ---------------- matching ----------------
@api.get("/matches")
async def get_matches(refresh: bool = False, user=Depends(current_user)):
    me_p = await get_profile(user["id"])
    if not me_p or not me_p.get("completed_at"):
        raise HTTPException(400, "Finish your profile to meet people")
    active_ids = await matchable_user_ids()
    cands = await db.profiles.find({"completed_at": {"$ne": None}, "discoverable": True, "admin_paused": {"$ne": True},
                                    "user_id": {"$ne": user["id"]}}, {"_id": 0}).to_list(5000)
    cands = [c for c in cands if c["user_id"] in active_ids]
    events = {e["other_id"]: e for e in await db.match_events.find({"user_id": user["id"]}, {"_id": 0}).to_list(5000)}
    cur = now()
    pool = []
    for c in cands:
        ev = events.get(c["user_id"], {})
        if ev.get("hidden"):
            continue
        if ev.get("not_now_until") and ev["not_now_until"] > iso(cur):
            continue
        pool.append(c)
    last_batch = set(user.get("last_matches") or [])
    if refresh and len([c for c in pool if c["user_id"] not in last_batch]) >= 2:
        pool = [c for c in pool if c["user_id"] not in last_batch]
    questions = await get_questions()
    scored = []
    for c in pool:
        score, comps, commons = compare(questions, me_p.get("answers") or {}, c.get("answers") or {})
        penalty = 0.03 * min(events.get(c["user_id"], {}).get("shown_count", 0), 5)
        scored.append((score - penalty, score, comps, commons, c))
    scored.sort(key=lambda s: -s[0])
    top = scored[:5]
    users = {u["id"]: u for u in await db.users.find({"id": {"$in": [t[4]["user_id"] for t in top]}}, {"_id": 0}).to_list(10)}
    conns = await db.connections.find({"$or": [{"sender_id": user["id"]}, {"recipient_id": user["id"]}]}, {"_id": 0}).to_list(1000)
    conn_by = {}
    for cn in conns:
        other = cn["recipient_id"] if cn["sender_id"] == user["id"] else cn["sender_id"]
        conn_by[other] = {"id": cn["id"], "status": cn["status"], "outgoing": cn["sender_id"] == user["id"]}
    out = []
    for _, score, comps, commons, c in top:
        u = users.get(c["user_id"])
        if not u:
            continue
        commons = commons[:3] or ["are both new to peer-ly beloved, so plenty to discover"]
        out.append({**card_view(u, c), "score": round(score * 100), "components": {k: round(v * 100) for k, v in comps.items()},
                    "commonalities": commons, "connection": conn_by.get(u["id"])})
        await db.match_events.update_one({"user_id": user["id"], "other_id": u["id"]},
                                         {"$inc": {"shown_count": 1}, "$set": {"last_shown_at": iso(cur)},
                                          "$setOnInsert": {"hidden": False}}, upsert=True)
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_matches": [m["id"] for m in out]}})
    return {"matches": out, "pool_size": len(cands)}


@api.post("/matches/{other_id}/hide")
async def hide_match(other_id: str, user=Depends(current_user)):
    await db.match_events.update_one({"user_id": user["id"], "other_id": other_id},
                                     {"$set": {"hidden": True, "hidden_at": iso(now())}}, upsert=True)
    return {"ok": True}


@api.post("/matches/{other_id}/not-now")
async def not_now(other_id: str, user=Depends(current_user)):
    await db.match_events.update_one({"user_id": user["id"], "other_id": other_id},
                                     {"$set": {"not_now_until": iso(now() + timedelta(days=7))}}, upsert=True)
    return {"ok": True}


# ---------------- connections ----------------
class ConnectionIn(BaseModel):
    recipient_id: str
    message: str = Field(min_length=1, max_length=400)


@api.post("/connections")
async def send_connection(body: ConnectionIn, user=Depends(current_user)):
    msg = body.message.strip()
    if len(msg.split()) > 50:
        raise HTTPException(400, "Keep it to 50 words")
    if body.recipient_id == user["id"]:
        raise HTTPException(400, "You can't say hi to yourself (nice try)")
    me_p = await get_profile(user["id"])
    if not me_p or not me_p.get("completed_at"):
        raise HTTPException(400, "Finish your profile first")
    rec_u = await db.users.find_one({"id": body.recipient_id, "status": "active"}, {"_id": 0})
    rec_p = await get_profile(body.recipient_id)
    if not rec_u or not rec_p or not rec_p.get("discoverable") or not rec_p.get("completed_at") or rec_p.get("admin_paused"):
        raise HTTPException(404, "This person isn't available right now")
    existing = await db.connections.find_one({"$or": [{"sender_id": user["id"], "recipient_id": body.recipient_id},
                                                      {"sender_id": body.recipient_id, "recipient_id": user["id"]}]}, {"_id": 0})
    if existing:
        raise HTTPException(409, "You've already said hi to each other")
    day_ago = iso(now() - timedelta(days=1))
    if await db.connections.count_documents({"sender_id": user["id"], "sent_at": {"$gt": day_ago}}) >= 15:
        raise HTTPException(429, "That's a lot of hellos for one day. Try again tomorrow")
    doc = {"id": str(uuid.uuid4()), "sender_id": user["id"], "recipient_id": body.recipient_id, "message": msg,
           "status": "sent", "sent_at": iso(now()), "seen_at": None, "responded_at": None, "email_sent": False}
    await db.connections.insert_one(doc)

    async def notify():
        eid = await emailer.send_hello_email(to=rec_u["email"], recipient_name=rec_p.get("display_name") or rec_u.get("display_name"),
                                             sender_name=me_p.get("display_name") or user.get("display_name"), app_url=PUBLIC_BASE_URL)
        if eid:
            await db.connections.update_one({"id": doc["id"]}, {"$set": {"email_sent": True}})
    asyncio.create_task(notify())
    doc.pop("_id", None)
    return doc


@api.get("/connections")
async def list_connections(user=Depends(current_user)):
    conns = await db.connections.find({"$or": [{"sender_id": user["id"]}, {"recipient_id": user["id"]}]}, {"_id": 0}).sort("sent_at", -1).to_list(500)
    ids = {c["sender_id"] for c in conns} | {c["recipient_id"] for c in conns}
    users = {u["id"]: u for u in await db.users.find({"id": {"$in": list(ids)}}, {"_id": 0}).to_list(1000)}
    profs = {p["user_id"]: p for p in await db.profiles.find({"user_id": {"$in": list(ids)}}, {"_id": 0}).to_list(1000)}
    incoming, outgoing = [], []
    for c in conns:
        incoming_flag = c["recipient_id"] == user["id"]
        oid = c["sender_id"] if incoming_flag else c["recipient_id"]
        ou = users.get(oid)
        if not ou:
            continue
        person = card_view(ou, profs.get(oid) or {})
        if c["status"] == "accepted":
            person["email"] = ou["email"]
        item = {"id": c["id"], "status": c["status"], "message": c["message"], "sent_at": c["sent_at"],
                "seen_at": c.get("seen_at"), "responded_at": c.get("responded_at"), "person": person}
        (incoming if incoming_flag else outgoing).append(item)
    return {"incoming": incoming, "outgoing": outgoing}


@api.post("/connections/{cid}/seen")
async def mark_seen(cid: str, user=Depends(current_user)):
    await db.connections.update_one({"id": cid, "recipient_id": user["id"], "status": "sent"},
                                    {"$set": {"status": "seen", "seen_at": iso(now())}})
    return {"ok": True}


class RespondIn(BaseModel):
    accept: bool


@api.post("/connections/{cid}/respond")
async def respond(cid: str, body: RespondIn, user=Depends(current_user)):
    c = await db.connections.find_one({"id": cid, "recipient_id": user["id"]}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Request not found")
    if c["status"] in ("accepted", "declined"):
        raise HTTPException(400, "Already answered")
    status = "accepted" if body.accept else "declined"
    await db.connections.update_one({"id": cid}, {"$set": {"status": status, "responded_at": iso(now()),
                                                           "seen_at": c.get("seen_at") or iso(now())}})
    return {"ok": True, "status": status}


# ---------------- admin ----------------
def require_admin(*roles):
    async def dep(user=Depends(current_user)):
        if not user["admin_role"] or (roles and user["admin_role"] not in roles):
            raise HTTPException(403, "Admin role required")
        return user
    return dep


def progress_of(p, total_steps):
    if not p:
        return "not_started", 0
    if p.get("completed_at"):
        return "completed", 100
    step = p.get("step") or 0
    if step == 0 and not p.get("answers"):
        return "not_started", 0
    return "in_progress", min(99, round(step / total_steps * 100))


@api.get("/admin/stats")
async def admin_stats(user=Depends(require_admin())):
    users = await db.users.find({}, {"_id": 0}).to_list(5000)
    profs = {p["user_id"]: p for p in await db.profiles.find({}, {"_id": 0, "answers": 0}).to_list(5000)}
    total_steps = len(await get_questions()) + 7
    counts = {"completed": 0, "in_progress": 0, "not_started": 0}
    teams = {}
    active = [u for u in users if u.get("status") == "active"]
    for u in active:
        p = profs.get(u["id"])
        st, _ = progress_of(p, total_steps)
        counts[st] += 1
        team = ((p or {}).get("team") or "No team yet").strip()
        t = teams.setdefault(team, {"team": team, "total": 0, "completed": 0})
        t["total"] += 1
        t["completed"] += st == "completed"
    small = {"team": "Smaller teams (under 3)", "total": 0, "completed": 0}
    team_rows = []
    for t in teams.values():
        if t["total"] < 3:
            small["total"] += t["total"]
            small["completed"] += t["completed"]
        else:
            team_rows.append(t)
    if small["total"]:
        team_rows.append(small)
    for t in team_rows:
        t["rate"] = round(t["completed"] / t["total"] * 100) if t["total"] else 0
    sent = await db.connections.count_documents({})
    accepted = await db.connections.count_documents({"status": "accepted"})
    opt_ins = sum(1 for u in active if (profs.get(u["id"]) or {}).get("discoverable"))
    return {"total": len(users), "active": len(active), "departed": len(users) - len(active), **counts,
            "completion_rate": round(counts["completed"] / len(active) * 100) if active else 0,
            "opt_ins": opt_ins, "requests_sent": sent, "requests_accepted": accepted,
            "teams": sorted(team_rows, key=lambda t: -t["total"])}


@api.get("/admin/people")
async def admin_people(q: str = Query("", max_length=80), user=Depends(require_admin())):
    users = await db.users.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)
    profs = {p["user_id"]: p for p in await db.profiles.find({}, {"_id": 0, "answers": 0}).to_list(5000)}
    total_steps = len(await get_questions()) + 7
    ql = q.lower().strip()
    out = []
    for u in users:
        p = profs.get(u["id"])
        name = (p or {}).get("display_name") or u.get("display_name") or ""
        if ql and ql not in name.lower() and ql not in u["email"]:
            continue
        st, pct = progress_of(p, total_steps)
        out.append({"id": u["id"], "email": u["email"], "display_name": name, "team": (p or {}).get("team"),
                    "status": u.get("status", "active"), "progress": st, "progress_pct": pct,
                    "discoverable": bool((p or {}).get("discoverable")), "paused": bool((p or {}).get("admin_paused")),
                    "consent_at": (p or {}).get("consent_at"), "last_seen": u.get("last_seen"),
                    "admin_role": ADMIN_ROLES.get(u["email"])})
    return out


class StatusIn(BaseModel):
    status: str = Field(pattern="^(active|departed)$")


@api.put("/admin/people/{uid}/status")
async def admin_status(uid: str, body: StatusIn, user=Depends(require_admin("hr", "full"))):
    target = await db.users.find_one({"id": uid}, {"_id": 0})
    if not target:
        raise HTTPException(404, "Not found")
    if uid == user["id"]:
        raise HTTPException(400, "You can't change your own status")
    if ADMIN_ROLES.get(target["email"]) == "full" and user["admin_role"] != "full":
        raise HTTPException(403, "Only a full admin can change a full admin's status")
    await db.users.update_one({"id": uid}, {"$set": {"status": body.status, "status_changed_at": iso(now())}})
    if body.status == "departed":
        await db.sessions.delete_many({"user_id": uid})
    await audit(user, f"roster.mark_{body.status}", target["email"])
    return {"ok": True}


class PauseIn(BaseModel):
    paused: bool


@api.put("/admin/people/{uid}/pause")
async def admin_pause(uid: str, body: PauseIn, user=Depends(require_admin("hr", "full"))):
    target = await db.users.find_one({"id": uid}, {"_id": 0})
    if not target:
        raise HTTPException(404, "Not found")
    await db.profiles.update_one({"user_id": uid}, {"$set": {"admin_paused": body.paused}})
    await audit(user, "profile.pause" if body.paused else "profile.unpause", target["email"])
    return {"ok": True}


@api.delete("/admin/people/{uid}/profile")
async def admin_remove(uid: str, user=Depends(require_admin("hr", "full"))):
    target = await db.users.find_one({"id": uid}, {"_id": 0})
    if not target:
        raise HTTPException(404, "Not found")
    await wipe_profile(uid)
    await audit(user, "profile.remove", target["email"])
    return {"ok": True}


@api.get("/admin/people/{uid}/profile")
async def admin_view_profile(uid: str, user=Depends(require_admin("full"))):
    target = await db.users.find_one({"id": uid}, {"_id": 0})
    p = await get_profile(uid)
    if not target or not p:
        raise HTTPException(404, "No profile")
    qs = {q["id"]: q for q in await get_questions(False)}
    answers = []
    for qid, a in (p.get("answers") or {}).items():
        q = qs.get(qid)
        if not q:
            continue
        labels = [o["label"] for o in q["options"] if o["id"] in (a.get("selected") or [])]
        answers.append({"order": q["order"], "prompt": q["prompt"], "answer": labels, "other": a.get("other"), "skipped": a.get("skipped")})
    answers.sort(key=lambda a: a["order"])
    await audit(user, "profile.view_individual", target["email"])
    return {**card_view(target, p), "email": target["email"], "welcome_note": p.get("welcome_note"),
            "archetype_full": p.get("archetype"), "answers": answers, "consent_at": p.get("consent_at")}


@api.get("/admin/questions")
async def admin_questions(user=Depends(require_admin())):
    return await get_questions(False)


class QuestionPatch(BaseModel):
    active: Optional[bool] = None
    prompt: Optional[str] = Field(None, min_length=3, max_length=200)


@api.put("/admin/questions/{qid}")
async def admin_update_question(qid: str, body: QuestionPatch, user=Depends(require_admin("hr", "full"))):
    q = await db.questions.find_one({"id": qid}, {"_id": 0})
    if not q:
        raise HTTPException(404, "Not found")
    data = body.model_dump(exclude_none=True)
    await db.questions.update_one({"id": qid}, {"$set": data})
    await audit(user, "question.update", qid, {"before": {k: q.get(k) for k in data}, "after": data})
    return await db.questions.find_one({"id": qid}, {"_id": 0})


@api.get("/admin/audit")
async def admin_audit(user=Depends(require_admin())):
    return await db.audit_logs.find({}, {"_id": 0}).sort("at", -1).to_list(200)


app.include_router(api)
app.add_middleware(SessionMiddleware, secret_key=os.environ["SESSION_SECRET"], https_only=True, same_site="lax",
                   session_cookie="sp_oauth_state")
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
                   allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def startup():
    app.state.index_task = asyncio.create_task(ensure_indexes())
    await seed_questions()
    try:
        await asyncio.to_thread(storage.init_storage)
        logger.info("Storage initialized")
    except Exception as e:
        logger.error("Storage init failed: %s", e)


@app.on_event("shutdown")
async def shutdown():
    app.state.index_task.cancel()
    with suppress(asyncio.CancelledError):
        await app.state.index_task
    client.close()
