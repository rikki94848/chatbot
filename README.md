Berikut adalah file `README.md` yang disempurnakan dengan format **Markdown standar GitHub** (menggunakan *badges*, blok kode yang terstruktur, serta tabel/poin yang ringkas dan profesional).

Anda cukup menekan tombol **Copy** di pojok kanan atas kotak kode berikut, lalu *paste* langsung ke editor GitHub Anda:

```markdown
# 🤖 AI Chatbot Proyek Kerja Praktik

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](#)

Aplikasi chatbot pintar berbasis **FastAPI** (*backend*) dan antarmuka web interaktif (*frontend*). Proyek ini dirancang untuk menyajikan respons otomatis yang cepat dan akurat berdasarkan dokumen pengetahuan (*knowledge base*) terstruktur.

---

## 🛠️ Teknologi yang Digunakan

| Kategori | Teknologi |
| :--- | :--- |
| **Backend** | Python, FastAPI, Uvicorn |
| **AI Engine** | PyTorch, Transformers, HuggingFace |
| **Frontend** | HTML5, CSS3, JavaScript (Fetch API) |
| **Package Manager** | Pip (`requirements.txt`) |

---

## 🚀 Panduan Menjalankan Proyek Secara Lokal

Ikuti langkah-langkah di bawah ini untuk mengunduh dan menjalankan proyek chatbot ini di komputer Anda. 

> **Prasyarat:** Pastikan di komputer Anda sudah terinstal **[Git](https://git-scm.com/)** dan **[Python 3.10+](https://www.python.org/)**.

---

### 1️⃣ Clone Repository
Buka Terminal / PowerShell, lalu pilih folder tujuan dan jalankan:
```bash
git clone [https://github.com/rikki94848/chatbot.git](https://github.com/rikki94848/chatbot.git)
cd chatbot

```

---

### 2️⃣ Buat Virtual Environment (`.venv`)

Isolasi dependensi Python agar tidak mengganggu pustaka bawaan sistem Anda:

* **Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1

```


*(Jika diblokir oleh kebijakan eksekusi PowerShell, jalankan `Set-ExecutionPolicy Unrestricted -Scope Process` lalu ulangi perintah aktivasi).*
* **Mac / Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate

```



---

### 3️⃣ Instal Dependensi Library

Pastikan tanda `(.venv)` sudah aktif di awal baris terminal, lalu jalankan:

```bash
pip install -r backend/requirements.txt

```

---

### 4️⃣ Jalankan Server Backend (FastAPI)

Masuk ke direktori `backend` dan hidupkan server Uvicorn:

```bash
cd backend
uvicorn app:app --reload

```

> 💡 Server backend akan berjalan secara lokal di `http://127.0.0.1:8000`. **Biarkan jendela terminal ini tetap terbuka.**

---

### 5️⃣ Buka Antarmuka Chatbot (Frontend)

1. Buka jendela terminal **baru** (atau buka direktori proyek di **VS Code**).
2. Pilih salah satu cara berikut untuk membuka antarmuka web:
* **Via Browser:** Buka folder `frontend` lalu klik dua kali file **`index.html`**.
* **Via Live Server (VS Code):** Klik kanan file `frontend/index.html` ➔ pilih **Open with Live Server**.


3. Selesai! Chatbot siap digunakan.

```

```
