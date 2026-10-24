require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// 👇 TAMBAHKAN BARIS INI AGAR BISA MEMBUKA INDEX.HTML OTOMATIS
app.use(express.static(__dirname));

// Endpoint API lokal untuk menerima pesan dari frontend
app.post("/api/chat", async (req, res) => {
  try {
    const { message, systemPrompt } = req.body;

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
            { role: "user", content: message },
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
