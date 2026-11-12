import os
import requests

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "scribbld-people"
_storage_key = None


def init_storage(force: bool = False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": os.environ["EMERGENT_LLM_KEY"]}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def _with_retry(fn):
    try:
        return fn(init_storage())
    except requests.HTTPError as e:
        if e.response is not None and e.response.status_code == 404:
            return fn(init_storage(force=True))
        raise


def put_object(path: str, data: bytes, content_type: str) -> dict:
    def go(key):
        r = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type},
                         data=data, timeout=120)
        r.raise_for_status()
        return r.json()
    return _with_retry(go)


def get_object(path: str) -> tuple[bytes, str]:
    def go(key):
        r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
        r.raise_for_status()
        return r.content, r.headers.get("Content-Type", "application/octet-stream")
    return _with_retry(go)
