# Chatbot Kesehatan AI - Asisten Perawat Virtual

Chatbot AI yang dirancang khusus untuk memberikan informasi kesehatan dasar dan dukungan edukasi dalam bidang keperawatan. Menggunakan teknologi AI untuk menjawab pertanyaan dalam **Bahasa Indonesia** dengan pendekatan yang empatik dan informatif.

## 🚀 Fitur Utama

- ✅ **100% GRATIS** - Menggunakan Hugging Face API tanpa biaya
- 🏥 **Fokus Kesehatan** - Khusus untuk pertanyaan keperawatan dan kesehatan
- �� **Bahasa Indonesia** - Semua respons dalam Bahasa Indonesia yang mudah dipahami
- 💬 **Interface Ramah** - UI yang bersih dan responsif
- 🔒 **Peringatan Etika** - Tidak memberikan diagnosis atau resep langsung

## 📋 Kebutuhan Sistem

- Browser web modern (Chrome, Firefox, Safari, Edge)
- Koneksi internet yang stabil
- Akun Hugging Face (gratis)

## 🛠️ Setup & Installation

### Langkah 1: Clone Repository
```bash
git clone https://github.com/afinmh/MistalAPI.git
cd BasicLLM
```

### Langkah 2: Dapatkan API Key Hugging Face

1. **Daftar akun Hugging Face:**
   - Kunjungi [huggingface.co/join](https://huggingface.co/join)
   - Buat akun gratis dengan email Anda

2. **Buat API Token:**
   - Setelah login, kunjungi [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
   - Klik **"New token"**
   - Beri nama: `chatbot-kesehatan`
   - Pilih role: **"Read"**
   - Klik **"Generate a token"**
   - **COPY dan SIMPAN** token tersebut (format: `hf_xxxxxxxxxx`)


### Langkah 4: Jalankan Aplikasi

1. **Cara 1: Buka langsung di browser**
   ```
   Buka file chat.html di browser Anda
   ```

2. **Cara 2: Menggunakan Live Server (disarankan)**
   ```bash
   # Jika menggunakan VS Code dengan Live Server extension
   # Klik kanan pada chat.html > "Open with Live Server"
   ```

3. **Cara 3: HTTP Server sederhana**
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js
   npx http-server
   
   # Kemudian buka: http://localhost:8000/chat.html
   ```

## 📁 Struktur File

```
BasicLLM/
├── chat.html              # Interface chatbot
├── chatbot.js             # Logic utama & API calls
├── chatbot-groq.js        # Alternative dengan Groq API
├── chatbot-together.js    # Alternative dengan Together AI
├── alternative-models.js  # Daftar model alternatif
└── README.md             # Panduan ini
```

## 🎯 Cara Penggunaan

1. **Buka chat.html** di browser
2. **Tunggu loading** (model mungkin butuh beberapa detik untuk warm-up)
3. **Ketik pertanyaan** dalam Bahasa Indonesia
4. **Tekan Enter** atau klik "Kirim"

### Contoh Pertanyaan Yang Baik:
- "Apa itu tekanan darah tinggi?"
- "Bagaimana cara merawat luka kecil?"
- "Tips untuk tidur yang berkualitas"
- "Tanda-tanda dehidrasi"
- "Cara mengelola stres"

## 🔧 Troubleshooting

### Error: "Token API tidak valid"
```
✅ Solusi: Periksa token di chatbot.js
✅ Pastikan token dimulai dengan 'hf_'
✅ Generate token baru jika perlu
```

### Error: "Model sedang loading"
```
✅ Solusi: Tunggu 30-60 detik dan coba lagi
✅ Model HuggingFace butuh warm-up time
✅ Normal untuk panggilan pertama
```

### Error: "Terlalu banyak permintaan"
```
✅ Solusi: Tunggu beberapa menit
✅ Rate limit untuk akun gratis
✅ Coba model yang berbeda
```

### Respons tidak sesuai/aneh
```
✅ Coba pertanyaan yang lebih spesifik
✅ Gunakan Bahasa Indonesia yang jelas
✅ Periksa console browser (F12) untuk errors
```

## ⚙️ Konfigurasi Lanjutan

### Mengganti Model AI

Edit file `chatbot.js`, cari baris:
```javascript
model: "microsoft/DialoGPT-large"
```

Ganti dengan model lain:
```javascript
// Pilihan model:
"microsoft/DialoGPT-medium"    // Lebih cepat
"facebook/blenderbot-400M"     // Chatbot khusus
"google/flan-t5-large"         // Instruction following
```

### Menyesuaikan Respons AI

```javascript
// Dalam fungsi sendToHuggingFace, sesuaikan:
max_tokens: 500,        // Panjang maksimum respons
temperature: 0.7,       // Kreativitas (0.1-1.0)
```

## 🔄 API Alternatif

Jika Hugging Face tidak stabil, ada alternatif:

### 1. Groq API (Cepat & Gratis)
```javascript
// Gunakan chatbot-groq.js
// Daftar di: console.groq.com
```

### 2. Together AI (Stabil & Gratis)
```javascript
// Gunakan chatbot-together.js  
// Daftar di: together.ai
```

### 3. OpenAI (Berbayar tapi berkualitas)
```javascript
// Setup billing diperlukan
// API key dari: platform.openai.com
```

## ⚠️ Amaran Penting

- ❌ **Jangan gunakan untuk diagnosis perubatan**
- ❌ **Jangan gantikan nasihat doktor**
- ✅ **Hanya untuk maklumat umum dan pendidikan**
- ✅ **Selalu rujuk profesional kesihatan untuk masalah serius**

## 🤝 Sokongan

Jika menghadapi masalah:

1. **Check browser console** (F12) untuk error details
2. **Verify API token** di Hugging Face settings
3. **Cuba model alternatif** dalam fail alternative-models.js
4. **Restart browser** dan cuba lagi

## 📞 Hubungi

- **GitHub Issues**: [Report masalah disini](https://github.com/afinmh/MistalAPI/issues)
- **Repository**: [MistalAPI](https://github.com/afinmh/MistalAPI)

## 📜 Lesen

Projek ini adalah open source. Gunakan dengan bebas untuk tujuan pendidikan dan bukan komersial.

---

**Dicipta dengan ❤️ untuk membantu pendidikan kesihatan dalam Bahasa Malaysia**
