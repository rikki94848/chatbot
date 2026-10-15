🤖 AI Chatbot

Aplikasi chatbot berbasis FastAPI di bagian backend dan antarmuka web sederhana di bagian frontend. Proyek ini dirancang untuk memberikan respons otomatis berdasarkan dokumen pengetahuan (knowledge base) yang telah disediakan.

🛠️ Teknologi yang Digunakan

Backend: Python, FastAPI, Uvicorn, PyTorch / Transformers (AI Engine)

Frontend: HTML, CSS, JavaScript

Manajemen Paket: Pip / requirements.txt

🚀 Panduan Menjalankan Proyek Secara Lokal

Ikuti langkah-langkah di bawah ini untuk mengunduh dan menjalankan proyek chatbot ini di komputer Anda. Pastikan di laptop/PC Anda sudah terinstal Python dan Git.

Langkah 1: Download (Clone) Proyek dari GitHub

Buka Terminal (Command Prompt / PowerShell di Windows, atau Terminal di Mac/Linux).

Pindahkan posisi direktori terminal ke folder tujuan tempat Anda ingin menyimpan proyek ini.

Jalankan perintah berikut untuk meng-clone repository:

git clone https://github.com/rikki94848/chatbot.git


Masuk ke dalam folder proyek yang baru saja terunduh:

cd chatbot


Langkah 2: Buat Virtual Environment Sendiri (.venv)

Virtual environment wajib dibuat agar pustaka Python (libraries) terinstal secara rapi di dalam proyek ini tanpa mengganggu sistem komputer Anda.

Bagi Pengguna Windows (PowerShell):

python -m venv .venv
.\.venv\Scripts\Activate.ps1


(Catatan: Jika muncul error kebijakan script di PowerShell, jalankan dulu Set-ExecutionPolicy Unrestricted -Scope Process lalu ulangi perintah aktivasi).

Bagi Pengguna Mac / Linux:

python3 -m venv .venv
source .venv/bin/activate


Langkah 3: Instal Semua Kebutuhan Library

Setelah virtual environment aktif (biasanya ada tanda (.venv) di sebelah kiri baris terminal Anda), instal semua dependencies secara otomatis menggunakan file requirements.txt:

pip install -r backend/requirements.txt


(Tunggu beberapa saat hingga proses download dan instalasi selesai).

Langkah 4: Menjalankan Server Backend (FastAPI)

Pindahkan posisi terminal ke dalam folder backend:

cd backend


Jalankan server Uvicorn untuk menghidupkan backend chatbot:

uvicorn app:app --reload


Jika berhasil, terminal akan menampilkan tautan server lokal (contoh: http://127.0.0.1:8000). Biarkan terminal ini tetap terbuka selama Anda menggunakan chatbot.

Langkah 5: Membuka Tampilan Chatbot (Frontend)

Buka jendela terminal baru (biarkan terminal server backend di langkah 4 tetap menyala).

Buka folder proyek ini menggunakan aplikasi VS Code.

Buka file index.html yang ada di dalam folder frontend:

Klik dua kali file index.html untuk membukanya langsung via browser (Chrome, Edge, dll).

Atau gunakan ekstensi Live Server di VS Code, klik kanan pada index.html, lalu pilih Open with Live Server.

Selesai! Anda sekarang sudah bisa berinteraksi langsung dengan chatbot.
