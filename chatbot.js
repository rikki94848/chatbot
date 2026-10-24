// Konfigurasi Groq dengan OpenAI-compatible API
const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const API_KEY = "GROQ_API_KEY";

const SYSTEM_PROMPT = `
Anda ialah Pembantu AI rasmi bagi Balai Besar Survei dan Pemetaan Geologi Kelautan (BBSPGL), 
Badan Geologi, Kementerian ESDM Republik Indonesia.

Peranan anda ialah menjadi wakil khidmat pelanggan (customer service) dan pembantu maklumat 
yang profesional, ramah, bermaklumat, dan berwibawa.

Tugas dan Skop Anda:
1. Memberikan maklumat asas mengenai profil, fungsi, dan perkhidmatan BBSPGL (seperti survei geologi kelautan, pemetaan dasar laut, penyelidikan marin, dan data kelautan).
2. Membantu menjawab pertanyaan umum daripada masyarakat, penyelidik, pelajar, atau pihak berkepentingan (stakeholders) berkaitan bidang geologi kelautan.
3. Menjelaskan prosedur permohonan data, perkhidmatan makmal, atau kerjasama penyelidikan dengan cara yang mudah difahami.
4. Menyediakan maklumat rujukan, penerbitan, atau mengarahkan pengguna ke saluran rasmi BBSPGL jika memerlukan bantuan teknikal yang mendalam.

Sila jawab SEMUA pertanyaan pengguna dalam **Bahasa Malaysia / Bahasa Indonesia** mengikut kesesuaian, 
dengan gaya bahasa yang sopan, rasmi, mesra, dan jelas dalam penerangan.

Jika soalan di luar bidang kuasa BBSPGL atau memerlukan keputusan rasmi, arahkan pengguna untuk 
menghubungi talian rasmi atau e-mel sokongan BBSPGL.
`;

const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

function appendMessage(sender, text) {
  const msgDiv = document.createElement("div");
  msgDiv.className = sender === "user" ? "chat-msg user" : "chat-msg bot";
  msgDiv.textContent = text;
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function sendToGroq(message, retryCount = 0) {
  const payload = {
    model: "openai/gpt-oss-20b",
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: message,
      },
    ],
    max_tokens: 500,
    temperature: 0.7,
  };

  try {
    console.log("Menghantar permintaan ke API Groq...");

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 503) {
      if (retryCount < 3) {
        const waitTime = (retryCount + 1) * 5000;
        console.log(`Model sedang dimuat, menunggu ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return sendToGroq(message, retryCount + 1);
      }
      return "Model sedang bersiap. Sila tunggu sebentar dan cuba lagi.";
    }

    if (response.status === 429) {
      return "Terlalu banyak permintaan. Sila tunggu sebentar dan cuba lagi.";
    }

    if (response.status === 401) {
      return "Token API tidak sah. Sila semak konfigurasi anda.";
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      return `Ralat ${response.status}: Perkhidmatan tidak tersedia buat sementara waktu.`;
    }

    const data = await response.json();

    if (data.choices && data.choices[0] && data.choices[0].message) {
      const result = data.choices[0].message.content.trim();
      return result;
    } else if (data.error) {
      return `Ralat API: ${data.error.message || data.error}`;
    } else {
      return "Format respons tidak dikenali. Sila cuba lagi.";
    }
  } catch (err) {
    console.error("Network Error:", err);
    return `Kesalahan rangkaian: ${err.message}`;
  }
}

chatForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  const userMsg = chatInput.value.trim();
  if (!userMsg) return;
  appendMessage("user", userMsg);
  chatInput.value = "";
  appendMessage("bot", "...sedang menaip...");
  const botReply = await sendToGroq(userMsg);

  const botMsgs = chatWindow.getElementsByClassName("chat-msg bot");
  botMsgs[botMsgs.length - 1].textContent = botReply;
});
