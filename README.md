# 🤖 AI Chatbot

Aplikasi chatbot berbasis FastAPI di bagian *backend* dan antarmuka web sederhana di bagian *frontend*. Proyek ini dirancang untuk memberikan respons otomatis berdasarkan dokumen pengetahuan (*knowledge base*) yang telah disediakan.

---

## 🛠️ Teknologi yang Digunakan
* **Backend:** Python, FastAPI, Uvicorn
* **Frontend:** HTML, CSS, JavaScript
* **Manajemen Paket:** Pip / Requirements.txt

---

## 📖 Panduan Menjalankan Proyek (Untuk Rekan Tim)

Ikuti langkah-langkah di bawah ini untuk mengunduh dan menjalankan proyek chatbot ini di komputer Anda. Pastikan di laptop Anda sudah terinstal **Python** dan **Git**.

### Langkah 1: Download (Clone) Proyek dari GitHub
1. Buka **Terminal** (Command Prompt atau PowerShell di Windows, atau Terminal di Mac/Linux).
2. Pindahkan posisi direktori terminal ke folder tujuan tempat Anda ingin menyimpan proyek ini.
3. Jalankan perintah berikut untuk meng-clone repository:
   ```bash
   git clone [https://github.com/rikki94848/chatbot.git](https://github.com/rikki94848/chatbot.git)

```

4. Masuk ke dalam folder proyek yang baru saja terunduh:
```bash
cd chatbot

```



### Langkah 2: Buat Virtual Environment Sendiri (`.venv`)

*Virtual environment* wajib dibuat agar pustaka Python (*libraries*) terinstal secara rapi di dalam proyek ini tanpa mengganggu sistem komputer Anda.

* **Bagi Pengguna Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1

```


*(Catatan: Jika muncul error kebijakan script di PowerShell, jalankan dulu `Set-ExecutionPolicy Unrestricted -Scope Process` lalu ulangi perintah aktivasi).*
* **Bagi Pengguna Mac / Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate

```



### Langkah 3: Instal Semua Kebutuhan Library

Setelah virtual environment aktif (terdapat tanda `(.venv)` di sebelah kiri baris terminal Anda), instal semua *dependencies* secara otomatis menggunakan file `requirements.txt`:

```bash
pip install -r backend/requirements.txt

```

### Langkah 4: Menjalankan Server Backend (FastAPI)

1. Pindahkan posisi terminal ke dalam folder `backend`:
```bash
cd backend

```


2. Jalankan server Uvicorn untuk menghidupkan *backend* chatbot:
```bash
uvicorn app:app --reload

```


3. Jika berhasil, terminal akan menampilkan tautan server lokal (contoh: `http://127.0.0.1:8000`). **Biarkan terminal ini tetap terbuka** selama Anda menggunakan chatbot.

### Langkah 5: Membuka Tampilan Chatbot (Frontend)

1. Buka jendela terminal **baru** (biarkan terminal server backend di langkah 4 tetap menyala).
2. Buka folder proyek ini menggunakan aplikasi **VS Code**.
3. Buka file **`index.html`** yang ada di dalam folder `frontend` (Anda bisa menggunakan ekstensi *Live Server* di VS Code atau klik dua kali untuk membukanya langsung via browser).
4. Selesai! Anda sekarang sudah bisa berinteraksi langsung dengan chatbot.

```

```
