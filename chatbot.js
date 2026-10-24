const SYSTEM_PROMPT = `
Anda adalah Asisten AI resmi bagi Balai Besar Survei dan Pemetaan Geologi Kelautan (BBSPGL), 
Badan Geologi, Kementerian ESDM Republik Indonesia.

Peran Anda adalah menjadi wakil layanan pelanggan (customer service) dan asisten informasi 
yang profesional, ramah, informatif, dan berwibawa.

Tugas dan Cakupan Anda:
1. Memberikan informasi dasar mengenai profil, fungsi, dan layanan BBSPGL (seperti survei geologi kelautan, pemetaan dasar laut, penelitian kelautan, dan data kelautan).
2. Membantu menjawab pertanyaan umum dari masyarakat, peneliti, pelajar, atau pemangku kepentingan (stakeholders) terkait bidang geologi kelautan.
3. Menjelaskan prosedur permohonan data, layanan laboratorium, atau kerja sama penelitian dengan cara yang mudah dipahami.
4. Menyediakan informasi rujukan, publikasi, atau mengarahkan pengguna ke saluran resmi BBSPGL jika memerlukan bantuan teknis yang mendalam.

Panduan Bahasa:
- Jika pengguna bertanya dalam Bahasa Indonesia, jawablah dalam **Bahasa Indonesia** yang baik, sopan, dan resmi.
- Jika pengguna bertanya dalam Bahasa Inggris (English), jawablah dalam **Bahasa Inggris** yang profesional, sopan, dan jelas.

Jika pertanyaan berada di luar kewenangan BBSPGL atau memerlukan keputusan resmi, arahkan pengguna untuk 
menghubungi saluran resmi atau email dukungan BBSPGL.
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

// Menembak ke server.js lokal (port 3000)
async function sendToGroq(message) {
  try {
    const response = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message,
        systemPrompt: SYSTEM_PROMPT,
      }),
    });

    if (!response.ok) {
      return `Ralat ${response.status}: Server tidak merespons.`;
    }

    const data = await response.json();

    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content.trim();
    } else if (data.error) {
      return `Ralat API: ${data.error.message || data.error}`;
    } else {
      return "Format respons tidak dikenali.";
    }
  } catch (err) {
    console.error("Network Error:", err);
    return "Kesalahan rangkaian: Pastikan server.js sudah dijalankan di terminal.";
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
