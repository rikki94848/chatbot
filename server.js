require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Berapa pesan terakhir dari percakapan yang dikirim ke AI sebagai konteks
const MAX_HISTORY = 10;

// Middleware
app.use(express.json());
app.use(cors());

// Agar index.html bisa dibuka otomatis
app.use(express.static(__dirname));

// Membersihkan riwayat kiriman frontend: hanya role yang valid,
// hanya teks, dan dibatasi jumlah serta panjangnya.
function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim() !== "",
    )
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
}

// Endpoint API lokal untuk menerima pesan dari frontend
app.post("/api/chat", async (req, res) => {
  try {
    const { message, systemPrompt, history } = req.body;

    const pastMessages = cleanHistory(history);

    // Permintaan diteruskan ke Groq API secara aman dari server
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: [
            { role: "system", content: systemPrompt },
            ...pastMessages, // percakapan sebelumnya (konteks)
            { role: "user", content: message }, // pertanyaan baru
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      },
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`Server backend berjalan di http://localhost:${PORT}`);
});