from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from collections import deque
from time import time
import os, re, json, requests, glob

# ========= Konfigurasi dasar =========
APP_TITLE = "BBSPGL Chatbot API"
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
REQUIRED_MODEL = os.getenv("OLLAMA_MODEL", "gemma2:9b").strip()
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "changeme")  # GANTI di produksi!
KB_OVERRIDE_PATH = os.getenv("KB_OVERRIDE_PATH", "kb_override.json")
STRICT_GROUNDED = (
    os.getenv("STRICT_GROUNDED", "true").lower() == "true"
)  # True: hanya dari CONTEXT (KB/RAG)

# ========= App & CORS =========
app = FastAPI(title=APP_TITLE)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # produksi: batasi ke domain resmi
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========= (Opsional) GeoIP =========
geo_reader = None
try:
    import geoip2.database  # pip install geoip2 (opsional)
except Exception:
    geoip2 = None

if geoip2 is not None:
    try:
        GEOIP_DB = os.path.join(
            os.path.dirname(__file__), "geoip", "GeoLite2-Country.mmdb"
        )
        if os.path.exists(GEOIP_DB):
            geo_reader = geoip2.database.Reader(GEOIP_DB)
    except Exception:
        geo_reader = None


def _country_by_ip(ip: str) -> str | None:
    try:
        if not geo_reader or not ip:
            return None
        return geo_reader.country(ip).country.iso_code
    except Exception:
        return None


# ========= System prompts =========
SYS_PROMPT_ID = (
    "Kamu adalah asisten layanan publik/CS yang sopan, ringkas, dan informatif. "
    "Jawab dalam Bahasa Indonesia jika memungkinkan."
)
SYS_PROMPT_EN = (
    "You are a polite, concise customer service assistant. Prefer English output."
)

# Guard (ketat vs hybrid) + instruksi parafrase saat pakai CONTEXT
GUARD_ID_STRICT = (
    "Jawab HANYA berdasarkan <<CONTEXT>>. Jika <<CONTEXT>> kosong atau tidak relevan, "
    "katakan tidak tahu dan sarankan sumber resmi. "
    "Ringkas & parafrase dengan bahasa natural; JANGAN menyalin mentah teks konteks. "
    "Jika relevan, sebutkan nama dokumen sumber dalam tanda kurung."
)
GUARD_EN_STRICT = (
    "Answer ONLY using <<CONTEXT>>. If <<CONTEXT>> is empty or irrelevant, say you don't know and suggest official sources. "
    "Summarize & paraphrase naturally; do NOT copy raw context text. If relevant, mention the source doc name in parentheses."
)
GUARD_ID_HYBRID = (
    "Utamakan <<CONTEXT>>. Jika tidak ada, boleh jawab umum tanpa klaim spesifik "
    "(alamat/telepon/tanggal/peraturan). Ringkas & parafrase; hindari halusinasi."
)
GUARD_EN_HYBRID = (
    "Prefer <<CONTEXT>>. If absent, you may answer generally without specific claims "
    "(addresses/phone/dates/regulations). Summarize & paraphrase; avoid hallucinations."
)


# ========= Input model =========
class ChatIn(BaseModel):
    message: str
    lang: str | None = None
    session_id: str | None = None
    reset: bool | None = None


# ========= Bahasa default =========
def choose_lang(req: Request) -> str:
    raw_ip = req.headers.get("X-Forwarded-For") or (
        req.client.host if req.client else ""
    )
    client_ip = (raw_ip.split(",")[0] if raw_ip else "").strip()
    cc = _country_by_ip(client_ip)
    if cc == "ID":
        return "id"
    al = (req.headers.get("Accept-Language") or "").lower()
    return "id" if al.startswith("id") else "en"


# ========= Memory per sesi =========
SESSION_HISTORY: dict[str, deque] = {}
SESSION_TOUCH: dict[str, float] = {}
MAX_TURNS = 12
MAX_CHARS = 8000
SESSION_TTL = 60 * 60  # opsional


def _touch_session(sid: str):
    SESSION_TOUCH[sid] = time()


def _get_history(sid: str) -> deque:
    if sid not in SESSION_HISTORY:
        SESSION_HISTORY[sid] = deque(maxlen=MAX_TURNS * 2)
    _touch_session(sid)
    return SESSION_HISTORY[sid]


def _clear_history(sid: str):
    SESSION_HISTORY.pop(sid, None)
    SESSION_TOUCH.pop(sid, None)


def _total_chars(pairs: deque) -> int:
    return sum(len(t) for _, t in pairs)


def _trim_history(pairs: deque):
    while _total_chars(pairs) > MAX_CHARS and len(pairs) > 2:
        pairs.popleft()


def _strip_think(text: str) -> str:
    return re.sub(r"<think>.*?</think>", "", text or "", flags=re.DOTALL).strip()


def _build_prompt_with_memory(
    lang: str, history: deque, user_msg: str, context: str | None = None
) -> str:
    base_sys = SYS_PROMPT_ID if lang == "id" else SYS_PROMPT_EN
    guard = (
        (GUARD_ID_STRICT if STRICT_GROUNDED else GUARD_ID_HYBRID)
        if lang == "id"
        else (GUARD_EN_STRICT if STRICT_GROUNDED else GUARD_EN_HYBRID)
    )
    sys = base_sys + "\n" + guard
    lines = [f"<<SYSTEM>> {sys}"]
    if context:
        lines.append("<<CONTEXT>>")
        lines.append(context.strip())
    for role, text in history:
        lines.append(("User: " if role == "user" else "Assistant: ") + text)
    lines.append(f"User: {user_msg}")
    lines.append("Assistant:")
    prompt = "\n".join(lines)
    if len(prompt) > int(MAX_CHARS * 1.2):
        prompt = "\n".join(lines[-(MAX_TURNS * 2 + 2) :])[-MAX_CHARS:]
    return prompt


# ========= Mini-KB BBSPGL (dioverride via JSON) =========
KB = {
    "bbspgl": {
        "label": "Balai Besar Survei dan Pemetaan Geologi Kelautan (BBSPGL)",
        "desc": "Unit pelaksana teknis di lingkungan Badan Geologi Kementerian ESDM yang melaksanakan survei dan pemetaan di bidang geologi kelautan.",
        "alamat": {
            "kantor_pusat": "Jl. Dr. Djunjunan No.236, Pasteur (Husein Sastranegara), Kec. Cicendo, Kota Bandung, Jawa Barat 40174",
            "kantor_penunjang": "Jl. Kalijaga No.101, Kota Cirebon 45113",
        },
        "kontak": {
            "telepon": ["(022) 6032020", "(022) 6032201"],
            "email": "bbspgl@esdm.go.id",
            "call_center_esdm": "136",
        },
        "jam": {
            "senin_kamis": "08.00–16.00 WIB",
            "jumat": "08.00–16.30 WIB",
            "libur": "Sabtu/Minggu/Tanggal Merah: Tutup",
        },
        "tautan": {
            "portal_bbspgl": "https://mgi.esdm.go.id/",
            "kontak_bbspgl": "https://mgi.esdm.go.id/kontak-kami/",
            "profil_badan_geologi": "https://geologi.esdm.go.id/bbspgl",
            "ppid_kesdm": "https://ppid.esdm.go.id/",
            "geoservices_badan_geologi": "https://geologi.esdm.go.id/pelayanan-publik/geoservices",
            "instagram_resmi": "https://www.instagram.com/geologi_kelautan/",
            # kanal lain, isi via kb_override.json bila ada:
            "facebook": "",
            "twitter": "",
            "x": "",
            "youtube": "",
            "tiktok": "",
            "linkedin": "",
        },
        "dasar_hukum": {
            "permen_esdm_8_2022": {
                "judul": "Permen ESDM No. 8 Tahun 2022 tentang pembentukan BBSPGL (dari P3GL) di lingkungan Badan Geologi",
                "jdih_esdm": "https://jdih.esdm.go.id/dokumen/view?id=2248",
                "bpk": "https://peraturan.bpk.go.id/Details/215138/permen-esdm-no-8-tahun-2022",
            }
        },
    }
}


def _load_kb_override(path: str = KB_OVERRIDE_PATH):
    if not os.path.exists(path):
        return
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if "bbspgl" in data and isinstance(data["bbspgl"], dict):
            for k, v in data["bbspgl"].items():
                KB["bbspgl"][k] = v
    except Exception:
        pass


def lookup_kb(q: str):
    text = (q or "").lower()
    if "bbspgl" in text or "balai besar survei dan pemetaan geologi kelautan" in text:
        return KB.get("bbspgl")
    return None


# ========= Ambiguous intent → default ke BBSPGL + Sosmed =========
AMBIG_KW = (
    "alamat",
    "lokasi",
    "kantor",
    "gedung",
    "map",
    "peta",
    "kontak",
    "telepon",
    "telpon",
    "wa",
    "whatsapp",
    "email",
    "jam",
    "operasional",
    "buka",
    "tutup",
    "tautan",
    "link",
    "situs",
    "portal",
)


SOCIAL_KW = (
    "instagram",
    "instagrram",
    "ig",
    "media sosial",
    "sosmed",
    "facebook",
    "fb",
    "twitter",
    "x",
    "youtube",
    "yt",
    "tiktok",
    "linkedin",
)


def infer_default_entity_for_ambiguous(text: str) -> str | None:
    lower = (text or "").lower()
    if any(k in lower for k in AMBIG_KW) or any(k in lower for k in SOCIAL_KW):
        return "bbspgl"
    return None


# ========= Menu ringkas saat user sebut BBSPGL tanpa intent =========
def _kb_quick_menu(hit: dict, lang: str) -> str:
    if lang == "id":
        lines = [
            f"{hit['label']}",
            "Mau info apa tentang BBSPGL?",
            "- Lokasi/alamat",
            "- Kontak/telepon/email",
            "- Jam operasional",
            "- Tautan/portal/Instagram",
            "- Tugas & fungsi (ringkas)",
        ]
    else:
        lines = [
            f"{hit['label']}",
            "What would you like to know?",
            "- Address/location",
            "- Contact/phone/email",
            "- Opening hours",
            "- Links/portal/Instagram",
            "- Duties & functions (summary)",
        ]
    return "\n".join(lines)


# ========= (Opsional) RAG: FAISS + Sentence-Transformers =========
RAG_READY = False
RAG_DOCS: list[dict] = []
RAG_INDEX = None
RAG_EMB = None
RAG_LAST_ERROR = None


def _rag_load_from_folder(folder: str = "kb_docs"):
    docs = []
    for p in glob.glob(os.path.join(folder, "*.txt")):
        try:
            with open(p, "r", encoding="utf-8") as f:
                txt = f.read().strip()
            if not txt:
                continue
            docs.append(
                {
                    "id": os.path.basename(p),
                    "title": os.path.basename(p),
                    "text": txt,
                    "path": p,
                }
            )
        except Exception:
            continue
    return docs


def _rag_build_index(docs: list[dict]):
    global RAG_INDEX, RAG_EMB, RAG_READY, RAG_LAST_ERROR
    try:
        from sentence_transformers import SentenceTransformer
        import numpy as np
        import faiss

        RAG_LAST_ERROR = None
        chunks, meta = [], []
        for d in docs:
            text = d["text"]
            size, step = 800, 700
            for i in range(0, len(text), step):
                chunk = text[i : i + size].strip()
                if len(chunk) < 50:  # longgarkan agar dokumen pendek tetap terindeks
                    continue
                chunks.append(chunk)
                meta.append({"doc_id": d["id"], "title": d["title"], "path": d["path"]})

        if not chunks:
            RAG_LAST_ERROR = "No chunks (documents too short after chunking)."
            return False

        model_name = os.getenv(
            "RAG_EMB_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
        )
        RAG_EMB = SentenceTransformer(model_name)
        embs = RAG_EMB.encode(chunks, convert_to_numpy=True, normalize_embeddings=True)
        dim = embs.shape[1]
        index = faiss.IndexFlatIP(dim)
        index.add(embs)
        RAG_INDEX = {"index": index, "chunks": chunks, "meta": meta}
        return True
    except Exception as e:
        RAG_LAST_ERROR = str(e)
        return False


def rag_retrieve(query: str, top_k: int = 3) -> list[dict]:
    if not RAG_READY or not query.strip():
        return []
    try:
        import numpy as np

        qv = RAG_EMB.encode([query], convert_to_numpy=True, normalize_embeddings=True)
        D, I = RAG_INDEX["index"].search(qv, top_k)
        results = []
        for idx in I[0]:
            if idx == -1:
                continue
            results.append(
                {"text": RAG_INDEX["chunks"][idx], "meta": RAG_INDEX["meta"][idx]}
            )
        return results
    except Exception as e:
        global RAG_LAST_ERROR
        RAG_LAST_ERROR = f"search_error: {e}"
        return []


# ========= Ollama helpers =========
def _ollama_ready(model_name: str) -> bool:
    try:
        r = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=5)
        if r.status_code != 200:
            return False
        if not r.headers.get("content-type", "").startswith("application/json"):
            return False
        tags = r.json().get("models", [])
        available = {(m.get("name") or "").strip() for m in tags if isinstance(m, dict)}
        want = (model_name or "").strip()
        return want in available
    except Exception:
        return False


def ask_llm(full_prompt: str, lang: str) -> str:
    model_name = REQUIRED_MODEL.strip()
    if not _ollama_ready(model_name):
        msg_id = f"AI lokal belum siap. Pastikan Ollama aktif dan model '{model_name}' sudah di-pull:\n  ollama pull {model_name}"
        msg_en = f"Local AI not ready. Ensure Ollama is running and model '{model_name}' is pulled:\n  ollama pull {model_name}"
        return msg_id if lang == "id" else msg_en
    try:
        with requests.post(
            f"{OLLAMA_HOST}/api/generate",
            json={
                "model": model_name,
                "prompt": full_prompt,
                "stream": True,
                "options": {"temperature": 0.4, "num_ctx": 2048},
            },
            timeout=(10, 600),
            stream=True,
        ) as r:
            if r.status_code != 200:
                body = ""
                try:
                    body = r.text
                except Exception:
                    pass
                return (
                    f"Maaf, Ollama {r.status_code}: {body}"
                    if lang == "id"
                    else f"Sorry, Ollama {r.status_code}: {body}"
                )
            text = ""
            for line in r.iter_lines():
                if not line:
                    continue
                data = json.loads(line.decode("utf-8"))
                text += data.get("response", "")
            return _strip_think(text) or (
                "Maaf, tidak ada respons." if lang == "id" else "Sorry, no response."
            )
    except Exception as e:
        return f"Maaf, terjadi kesalahan: {e}" if lang == "id" else f"Sorry, error: {e}"


# ========= Startup & Reload =========
def _reload_all():
    _load_kb_override(KB_OVERRIDE_PATH)
    global RAG_DOCS, RAG_READY
    RAG_DOCS = _rag_load_from_folder("kb_docs")
    RAG_READY = _rag_build_index(RAG_DOCS) if RAG_DOCS else False
    return {
        "kb_ok": bool(KB.get("bbspgl")),
        "rag_ready": RAG_READY,
        "rag_docs": len(RAG_DOCS),
        "rag_last_error": RAG_LAST_ERROR,
    }


@app.on_event("startup")
def startup_event():
    _reload_all()


# ========= Endpoints =========
@app.get("/chat-init")
def chat_init(req: Request):
    lang = choose_lang(req)
    greet = (
        "Halo! Ada yang bisa kami bantu?"
        if lang == "id"
        else "Hi! How can I help you today?"
    )
    quick = (
        [
            "Jam Operasional",
            "Lokasi",
            "Kontak",
            "Layanan",
            "Profil BBSPGL",
            "Apa tugas BBSPGL",
            "Apa fungsi BBSPGL",
            "Cara kerja survei",
            "Contoh hasil survei",
            "Visi dan Misi",
        ]
        if lang == "id"
        else [
            "Hours",
            "Location",
            "Contact",
            "Services",
            "BBSPGL Profile",
            "What are the duties of BBSPGL",
            "What are the functions of BBSPGL",
            "How the survey works",
            "Examples of survey results",
            "Vision and Mission",
        ]
    )
    return {
        "lang": lang,
        "greeting": greet,
        "quick_replies": quick,
        "rag_ready": RAG_READY,
    }


@app.post("/chat")
def chat(payload: ChatIn, req: Request):
    lang = (payload.lang or choose_lang(req))[:2]
    user = (payload.message or "").strip()
    sid = (
        payload.session_id or (req.headers.get("X-Session-Id") or "")
    ).strip() or "default"

    if payload.reset:
        _clear_history(sid)

    if not user:
        msg = (
            "Silakan ketik pertanyaan Anda."
            if lang == "id"
            else "Please type your question."
        )
        return {
            "reply": msg,
            "lang": lang,
            "quick_replies": [],
            "session_id": sid,
            "rag_used": False,
            "kb_used": False,
        }

    # ===== PRIORITAS 1: Mini-KB =====
    hit = lookup_kb(user)
    if not hit:
        ent = infer_default_entity_for_ambiguous(user)
        if ent and ent in KB:
            hit = KB[ent]

    if hit:
        lower = user.lower()

        # INTENTLESS: user sebut "bbspgl" tapi tanpa kata kunci → tampilkan MENU
        NO_INTENT_KEYS = (
            *AMBIG_KW,
            *SOCIAL_KW,
            "tugas",
            "fungsi",
            "profil",
            "prosedur",
            "permohonan",
            "alur",
            "sop",
            "visi",
            "misi",
            "kegiatan",
            "program",
            "layanan",
            "survei",
            "cara kerja",
            "metode",
            "metodologi",
            "hasil survei",
            "contoh hasil",
            "apa itu",
            "kepanjangan",
            "singkatan",
            "arti",
            "kepanjangan dari",
            "what is",
            "meaning",
            "stand for",
        )
        if (
            "bbspgl" in lower
            or "balai besar survei dan pemetaan geologi kelautan" in lower
        ) and not any(k in lower for k in NO_INTENT_KEYS):
            reply = _kb_quick_menu(hit, lang)
            hist = _get_history(sid)
            hist.append(("user", user))
            hist.append(("assistant", reply))
            return {
                "reply": reply,
                "lang": lang,
                "quick_replies": [],
                "session_id": sid,
                "rag_used": False,
                "kb_used": True,
            }

        # Bypass KB → RAG untuk topik konten/prosedur agar lebih kaya
        SPECIAL_TO_RAG = (
            "tugas",
            "fungsi",
            "profil",
            "prosedur",
            "permohonan",
            "alur",
            "sop",
            "visi",
            "misi",
            "kegiatan",
            "program",
            "layanan",
            "survei",
            "cara kerja",
            "metode",
            "metodologi",
            "hasil survei",
            "contoh hasil",
            "laporan",
        )
        if any(k in lower for k in SPECIAL_TO_RAG):
            hit = None  # loncat ke RAG
        else:
            reply_lines = [hit["label"]]
            used_specific = False

            # alamat / lokasi
            if (
                ("alamat" in lower)
                or ("lokasi" in lower)
                or ("kantor" in lower)
                or ("gedung" in lower)
            ) and hit.get("alamat"):
                used_specific = True
                for k, v in hit["alamat"].items():
                    reply_lines.append(f"{k.replace('_',' ').title()}: {v}")

            # kontak
            if (
                ("kontak" in lower)
                or ("telepon" in lower)
                or ("telpon" in lower)
                or ("whatsapp" in lower)
                or ("wa" in lower)
                or ("email" in lower)
            ) and hit.get("kontak"):
                used_specific = True
                kontak = hit["kontak"]
                telp = kontak.get("telepon")
                email = kontak.get("email")
                if telp:
                    reply_lines.append(
                        f"Telepon: {', '.join(telp) if isinstance(telp, list) else telp}"
                    )
                if email:
                    reply_lines.append(f"Email: {email}")
                if kontak.get("call_center_esdm"):
                    reply_lines.append(
                        f"Call Center ESDM: {kontak['call_center_esdm']}"
                    )

            # jam operasional
            if (
                ("jam" in lower)
                or ("operasional" in lower)
                or ("buka" in lower)
                or ("tutup" in lower)
            ) and hit.get("jam"):
                used_specific = True
                for k, v in hit["jam"].items():
                    reply_lines.append(f"{k.replace('_',' ').title()}: {v}")

            # media sosial
            if (
                any(k in lower for k in SOCIAL_KW) or "instagram_resmi" in lower
            ) and hit.get("tautan"):
                used_specific = True
                links = hit["tautan"]
                ordered = [
                    ("instagram_resmi", "Instagram"),
                    ("facebook", "Facebook"),
                    ("twitter", "X (Twitter)"),
                    ("x", "X (Twitter)"),
                    ("youtube", "YouTube"),
                    ("tiktok", "TikTok"),
                    ("linkedin", "LinkedIn"),
                ]
                shown = False
                for key, label in ordered:
                    if key in links and links[key]:
                        reply_lines.append(f"{label}: {links[key]}")
                        shown = True
                if not shown:
                    reply_lines.append(
                        "Tidak ada kanal media sosial yang tercatat di data."
                    )

            # portal & tautan umum
            if "portal" in lower and hit.get("tautan", {}).get("portal_bbspgl"):
                used_specific = True
                reply_lines.append(f"Portal BBSPGL: {hit['tautan']['portal_bbspgl']}")

            if (
                ("tautan" in lower) or ("link" in lower) or ("situs" in lower)
            ) and hit.get("tautan"):
                used_specific = True
                for k, v in hit["tautan"].items():
                    if not v:
                        continue
                    label = (
                        "Instagram"
                        if k == "instagram_resmi"
                        else (
                            "Geoservices Badan Geologi"
                            if k == "geoservices_badan_geologi"
                            else k.replace("_", " ").title()
                        )
                    )
                    reply_lines.append(f"{label}: {v}")

            if not used_specific:
                reply_lines = [f"{hit['label']} — {hit['desc']}"]

            reply = "\n".join(reply_lines)
            hist = _get_history(sid)
            hist.append(("user", user))
            hist.append(("assistant", reply))
            return {
                "reply": reply,
                "lang": lang,
                "quick_replies": [],
                "session_id": sid,
                "rag_used": False,
                "kb_used": True,
            }

    # ===== PRIORITAS 2: RAG =====
    rag_used, context = False, None
    if RAG_READY:
        hits = rag_retrieve(user, top_k=3)
        if hits:
            rag_used = True
            # Siapkan context blok + sebutkan nama dokumen agar bisa dirujuk singkat
            ctx_blocks = []
            for h in hits:
                title = h["meta"].get("title", "")
                path = h["meta"].get("path", "")
                ctx_blocks.append(
                    f"[{title}] {h['text']}\n(Sumber: {os.path.basename(path)})"
                )
            context = "\n\n".join(ctx_blocks)

    # Build prompt + panggil LLM (akan parafrase sesuai GUARD)
    hist = _get_history(sid)
    _trim_history(hist)
    full_prompt = _build_prompt_with_memory(lang, hist, user, context=context)
    ai_reply = ask_llm(full_prompt, lang)

    # Simpan history
    hist.append(("user", user))
    hist.append(("assistant", ai_reply))

    return {
        "reply": ai_reply,
        "lang": lang,
        "quick_replies": [],
        "session_id": sid,
        "rag_used": rag_used,
        "kb_used": False,
    }


@app.post("/admin/reload")
def admin_reload(req: Request):
    token = req.headers.get("X-Admin-Token", "")
    if token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")
    status = _reload_all()
    return {"ok": True, "status": status}


@app.get("/healthz")
def healthz():
    return {
        "ok": True,
        "ollama_ready": _ollama_ready(REQUIRED_MODEL),
        "model": {"ollama": REQUIRED_MODEL},
        "memory": {
            "sessions": len(SESSION_HISTORY),
            "max_turns": MAX_TURNS,
            "max_chars": MAX_CHARS,
        },
        "rag": {
            "ready": RAG_READY,
            "docs": len(RAG_DOCS),
            "last_error": RAG_LAST_ERROR,
        },
        "kb": {"has_bbspgl": bool(KB.get("bbspgl")), "override_path": KB_OVERRIDE_PATH},
    }
