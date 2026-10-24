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
const sidebar = document.getElementById("sidebar");
const appBox = document.getElementById("chat-widget");
const sidebarToggle = document.getElementById("sidebar-toggle");
const sessionList = document.getElementById("session-list");

// ===== 1. Data: banyak sesi percakapan =====
// Satu sesi = { id, title, messages: [{sender, text}], updatedAt }
const SESSIONS_KEY = "bbspgl_sessions";
const CURRENT_KEY = "bbspgl_current";
const OLD_KEY = "bbspgl_chat_history"; // riwayat versi lama (satu percakapan)

let sessions = [];
let currentId = null;

function saveSessions() {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    localStorage.setItem(CURRENT_KEY, currentId || "");
  } catch (e) {}
}

function loadSessions() {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSIONS_KEY));
    if (Array.isArray(saved)) return saved;

    // Migrasi: ubah riwayat lama menjadi satu sesi
    const old = JSON.parse(localStorage.getItem(OLD_KEY));
    if (Array.isArray(old) && old.length) {
      const first = old.find((m) => m.sender === "user");
      localStorage.removeItem(OLD_KEY);
      return [
        {
          id: makeId(),
          title: first ? first.text.slice(0, 40) : null,
          messages: old,
          updatedAt: Date.now(),
        },
      ];
    }
  } catch (e) {}
  return [];
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function getSession(id) {
  return sessions.find((s) => s.id === id);
}

function createSession() {
  const s = { id: makeId(), title: null, messages: [], updatedAt: Date.now() };
  sessions.push(s);
  return s;
}

function sessionTitle(s) {
  if (s.title) return s.title;
  return document.documentElement.lang === "en" ? "New chat" : "Percakapan baru";
}

// ===== 2. Tampilan pesan =====
// renderMessage: hanya menggambar di layar (tidak disimpan)
function renderMessage(sender, text) {
  const msgDiv = document.createElement("div");
  msgDiv.className = sender === "user" ? "chat-msg user" : "chat-msg bot";
  msgDiv.dataset.dynamic = "1";
  msgDiv.textContent = text;
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return msgDiv;
}

// addToSession: menyimpan pesan ke sesi tertentu (tidak menggambar)
function addToSession(id, sender, text, isError = false) {
  const s = getSession(id);
  if (!s) return;
  const msg = { sender, text };
  if (isError) msg.error = true; // balasan gagal: jangan dikirim sebagai konteks
  s.messages.push(msg);
  s.updatedAt = Date.now();
  if (sender === "user" && !s.title) s.title = text.slice(0, 40);
  saveSessions();
  renderSidebar();
}

function clearScreen() {
  chatWindow.querySelectorAll("[data-dynamic]").forEach((el) => el.remove());
}

// ===== 3. Sidebar =====
function renderSidebar() {
  sessionList.innerHTML = "";
  const sorted = sessions.slice().sort((a, b) => b.updatedAt - a.updatedAt);

  sorted.forEach((s) => {
    const li = document.createElement("li");
    li.className = "session-item" + (s.id === currentId ? " active" : "");

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "session-open";
    openBtn.textContent = sessionTitle(s);
    openBtn.title = sessionTitle(s);
    openBtn.addEventListener("click", () => openSession(s.id));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "session-delete";
    delBtn.textContent = "✕";
    delBtn.setAttribute("aria-label", "Hapus percakapan");
    delBtn.addEventListener("click", () => deleteSession(s.id));

    li.appendChild(openBtn);
    li.appendChild(delBtn);
    sessionList.appendChild(li);
  });
}

function openSession(id) {
  const s = getSession(id);
  if (!s) return;
  currentId = id;
  saveSessions();
  clearScreen();
  s.messages.forEach((m) => renderMessage(m.sender, m.text));
  renderSidebar();
  closeSidebarOnMobile(); // di HP, sidebar menutup setelah memilih sesi
}

function newChat() {
  const current = getSession(currentId);
  // Kalau sesi sekarang masih kosong, tidak perlu membuat sesi baru
  if (current && current.messages.length === 0) {
    closeSidebarOnMobile();
    chatInput.focus();
    return;
  }
  const s = createSession();
  openSession(s.id);
  chatInput.focus();
}

function deleteSession(id) {
  if (!confirm("Hapus percakapan ini?")) return;
  sessions = sessions.filter((s) => s.id !== id);

  if (id === currentId) {
    if (sessions.length === 0) createSession();
    const latest = sessions.slice().sort((a, b) => b.updatedAt - a.updatedAt)[0];
    openSession(latest.id);
  } else {
    saveSessions();
    renderSidebar();
  }
}

function clearAllSessions() {
  if (!confirm("Hapus semua riwayat percakapan?")) return;
  sessions = [];
  const s = createSession();
  openSession(s.id);

  document.getElementById("menu-dropdown").setAttribute("hidden", "");
  document.getElementById("menu-btn").setAttribute("aria-expanded", "false");
}

// ===== Show / hide sidebar =====
const SIDEBAR_KEY = "bbspgl_sidebar_open";
const mobileQuery = window.matchMedia("(max-width: 640px)");

function setSidebar(open, save = true) {
  appBox.classList.toggle("sidebar-open", open);
  sidebarToggle.setAttribute("aria-expanded", String(open));

  const en = document.documentElement.lang === "en";
  const label = open
    ? en ? "Hide history" : "Sembunyikan riwayat"
    : en ? "Show history" : "Tampilkan riwayat";
  sidebarToggle.setAttribute("aria-label", label);
  sidebarToggle.title = label;

  // Pilihan hanya diingat untuk tampilan desktop
  if (save && !mobileQuery.matches) {
    try { localStorage.setItem(SIDEBAR_KEY, open ? "1" : "0"); } catch (e) {}
  }
}

function isSidebarOpen() {
  return appBox.classList.contains("sidebar-open");
}

function closeSidebarOnMobile() {
  if (mobileQuery.matches) setSidebar(false);
}

// Desktop: terbuka (kecuali pengguna pernah menyembunyikannya). HP: tertutup.
function defaultSidebarState() {
  if (mobileQuery.matches) return false;
  try { return localStorage.getItem(SIDEBAR_KEY) !== "0"; } catch (e) { return true; }
}

// Menyusun konteks percakapan untuk dikirim ke server
// (dipanggil SETELAH pesan user baru disimpan, jadi pesan terakhir dibuang)
const MAX_HISTORY = 10;
function buildHistory(sid) {
  const s = getSession(sid);
  if (!s) return [];
  return s.messages
    .slice(0, -1) // buang pesan user yang baru saja dikirim
    .filter((m) => !m.error) // buang balasan error
    .slice(-MAX_HISTORY)
    .map((m) => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.text,
    }));
}

// Menembak ke server.js lokal (port 3000)
// Mengembalikan { ok, text } supaya error bisa dikenali
async function sendToGroq(message, history) {
  try {
    const response = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message,
        history: history,
        systemPrompt: SYSTEM_PROMPT,
      }),
    });

    if (!response.ok) {
      return { ok: false, text: `Ralat ${response.status}: Server tidak merespons.` };
    }

    const data = await response.json();

    if (data.choices && data.choices[0] && data.choices[0].message) {
      return { ok: true, text: data.choices[0].message.content.trim() };
    } else if (data.error) {
      return { ok: false, text: `Ralat API: ${data.error.message || data.error}` };
    } else {
      return { ok: false, text: "Format respons tidak dikenali." };
    }
  } catch (err) {
    console.error("Network Error:", err);
    return {
      ok: false,
      text: "Kesalahan rangkaian: Pastikan server.js sudah dijalankan di terminal.",
    };
  }
}

// ===== 4. Kirim pesan =====
chatForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  const userMsg = chatInput.value.trim();
  if (!userMsg) return;

  // Ingat sesi mana yang dipakai saat pesan dikirim,
  // supaya balasan tidak "nyasar" kalau pengguna pindah sesi.
  const sid = currentId;

  addToSession(sid, "user", userMsg);
  renderMessage("user", userMsg);
  chatInput.value = "";

  const typingDiv = renderMessage("bot", "...sedang menaip...");
  const result = await sendToGroq(userMsg, buildHistory(sid));

  typingDiv.remove();
  addToSession(sid, "bot", result.text, !result.ok);
  if (sid === currentId) renderMessage("bot", result.text);
});

// ===== 5. Tombol-tombol =====
document.getElementById("new-chat").addEventListener("click", newChat);
document.getElementById("clear-history").addEventListener("click", clearAllSessions);
sidebarToggle.addEventListener("click", () => setSidebar(!isSidebarOpen()));
document.getElementById("sidebar-backdrop").addEventListener("click", () => setSidebar(false));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && mobileQuery.matches && isSidebarOpen()) setSidebar(false);
});
// pindah ukuran layar (desktop <-> HP): kembali ke keadaan bawaan
mobileQuery.addEventListener("change", () => setSidebar(defaultSidebarState(), false));
// judul "Percakapan baru" ikut berganti bahasa
document.getElementById("lang-toggle").addEventListener("click", () => {
  renderSidebar();
  setSidebar(isSidebarOpen(), false); // perbarui label tombol sesuai bahasa
});

// ===== 6. Mulai =====
// Atur sidebar tanpa animasi saat pertama dimuat
appBox.classList.add("no-transition");
setSidebar(defaultSidebarState(), false);
requestAnimationFrame(() =>
  requestAnimationFrame(() => appBox.classList.remove("no-transition")),
);

sessions = loadSessions();
if (sessions.length === 0) createSession();

let savedCurrent = null;
try { savedCurrent = localStorage.getItem(CURRENT_KEY); } catch (e) {}
const startId = getSession(savedCurrent)
  ? savedCurrent
  : sessions.slice().sort((a, b) => b.updatedAt - a.updatedAt)[0].id;
openSession(startId);