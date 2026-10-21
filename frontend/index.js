(function () {
    const qs = new URLSearchParams(location.search);
    const API = qs.get("api") || "http://localhost:8080";
    const STREAM = qs.get("stream") === "1";

    const btn = document.getElementById("cw-btn");
    const wrap = document.getElementById("cw-wrap");
    const closeBtn = document.getElementById("cw-close");
    const brand = document.getElementById("cw-brand");
    const langSel = document.getElementById("cw-lang");
    const chipsEl = document.getElementById("cw-chips");
    const log = document.getElementById("cw-log");
    const typing = document.getElementById("cw-typing");
    const form = document.getElementById("cw-form");
    const input = document.getElementById("cw-input");
    const sendBtn = document.getElementById("cw-send");

    function getSessionId() {
      const KEY = "cw-session-id";
      let sid = localStorage.getItem(KEY);
      if (!sid) {
        sid = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
          (
            c ^
            (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
          ).toString(16)
        );
        localStorage.setItem(KEY, sid);
      }
      return sid;
    }
    const SESSION_ID = getSessionId();

    function add(text, who = "cw-bot", meta) {
      const row = document.createElement("div");
      row.className = "cw-row " + who;
      const b = document.createElement("div");
      b.className = "cw-b";
      b.textContent = text;
      row.appendChild(b);

      if (meta) {
        const m = document.createElement("div");
        m.className = "cw-meta";
        m.textContent = meta;
        row.appendChild(m);
      }

      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
      return b;
    }

    function setMeta(bubbleEl, metaText) {
      const row = bubbleEl.parentElement;
      let m = row.querySelector(".cw-meta");
      if (!m) {
        m = document.createElement("div");
        m.className = "cw-meta";
        row.appendChild(m);
      }
      m.textContent = metaText;
      log.scrollTop = log.scrollHeight;
    }

    function setTyping(on) {
      typing.style.display = on ? "block" : "none";
      typing.textContent =
        langSel.value === "en" ? "...bot is typing" : "…bot sedang mengetik";
    }

    function syncLang() {
      const en = langSel.value === "en";
      input.placeholder = en ? "Type a message..." : "Tulis pesan...";
      brand.textContent = en ? "Customer Service" : "Layanan Pelanggan";
      sendBtn.textContent = en
        ? STREAM
          ? "Send (Stream)"
          : "Send"
        : STREAM
        ? "Kirim (Stream)"
        : "Kirim";
    }

    const MAP_ID = {
      "Jam Operasional": "jam kerja",
      "Lokasi Kantor": "lokasi kantor",
      "Kontak CS": "kontak",
      Layanan: "layanan",
      Pengaduan: "pengaduan",
    };
    const MAP_EN = {
      "Office Hours": "hours",
      Location: "location",
      Contact: "contact",
      Services: "services",
      Complaints: "complaint",
    };

    function renderChips(labels = []) {
      chipsEl.innerHTML = "";
      for (const t of labels) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "cw-chip";
        b.textContent = t;
        b.onclick = () => {
          const map = langSel.value === "en" ? MAP_EN : MAP_ID;
          input.value = map[t] || t;
          form.requestSubmit();
        };
        chipsEl.appendChild(b);
      }
    }

    btn.addEventListener("click", () => {
      wrap.style.display = wrap.style.display === "flex" ? "none" : "flex";
      if (wrap.style.display === "flex") input.focus();
    });

    closeBtn.addEventListener("click", () => {
      wrap.style.display = "none";
    });

    async function init() {
      try {
        const r = await fetch(API + "/chat-init", {
          headers: { "x-session-id": SESSION_ID },
        });
        const j = await r.json();
        langSel.value = j.lang || "id";
        syncLang();
        renderChips(j.quick_replies || []);
        add(
          j.greeting || (langSel.value === "en" ? "Hello!" : "Halo!"),
          "cw-bot"
        );
      } catch (err) {
        console.log("init() failed, using offline demo:", err.message);
        langSel.value = "id";
        syncLang();
        renderChips(["Jam Operasional", "Lokasi Kantor", "Kontak CS"]);
        add("Halo! (offline demo)", "cw-bot");
      }
    }
    init();

    let currentAbort = null;

    async function sendNormal(msg) {
      const t0 = performance.now();
      const r = await fetch(API + "/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": SESSION_ID,
        },
        body: JSON.stringify({ message: msg, lang: langSel.value }),
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      const t1 = performance.now();

      const serverSecs =
        typeof j.response_time === "number" ? j.response_time : null;
      const clientSecs = (t1 - t0) / 1000;
      const secs = serverSecs ?? clientSecs;

      const reply =
        j.reply ||
        (langSel.value === "en"
          ? "Sorry, no reply."
          : "Maaf, belum ada jawaban.");
      add(reply, "cw-bot", `⏱ ${secs.toFixed(2)}s`);

      if (j.lang && j.lang !== langSel.value) {
        langSel.value = j.lang;
        syncLang();
      }
      if (Array.isArray(j.quick_replies)) renderChips(j.quick_replies);
    }

    async function sendStream(msg) {
      const bubble = add("", "cw-bot");
      const ctrl = new AbortController();
      currentAbort = ctrl;

      const t0 = performance.now();
      let tFirst = null;

      try {
        const r = await fetch(API + "/chat-stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": SESSION_ID,
          },
          body: JSON.stringify({ message: msg, lang: langSel.value }),
          signal: ctrl.signal,
        });
        if (!r.ok || !r.body) throw new Error("HTTP " + (r.status || 0));
        const reader = r.body.getReader();
        const decoder = new TextDecoder();

        let acc = "";
        let lastFlush = 0;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (tFirst === null) tFirst = performance.now();
          acc += decoder.decode(value, { stream: true });
          const now = performance.now();
          if (now - lastFlush > 50) {
            bubble.textContent = acc;
            log.scrollTop = log.scrollHeight;
            lastFlush = now;
          }
        }
        bubble.textContent = acc.trim();
        const total = (performance.now() - t0) / 1000;
        const ttft = tFirst ? (tFirst - t0) / 1000 : total;
        setMeta(
          bubble,
          `⚡ TTFT ${ttft.toFixed(2)}s · ⏱ Total ${total.toFixed(2)}s`
        );
        log.scrollTop = log.scrollHeight;
      } finally {
        currentAbort = null;
      }
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = input.value.trim();
      if (!msg) return;

      add(msg, "cw-me");
      input.value = "";
      setTyping(true);
      sendBtn.disabled = false;
      if (STREAM) {
        sendBtn.textContent = langSel.value === "en" ? "Stop" : "Stop";
        const onClickStop = () => {
          if (currentAbort) currentAbort.abort();
        };
        sendBtn.addEventListener("click", onClickStop, { once: true });
      } else {
        sendBtn.disabled = true;
      }

      try {
        if (STREAM) {
          await sendStream(msg);
        } else {
          await sendNormal(msg);
        }
      } catch (err) {
        add(
          langSel.value === "en"
            ? "Server is busy, please try again."
            : "Server sibuk, coba lagi ya.",
          "cw-bot"
        );
      } finally {
        setTyping(false);
        sendBtn.disabled = false;
        syncLang();
      }
    });

    langSel.addEventListener("change", () => {
      syncLang();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && wrap.style.display === "flex")
        wrap.style.display = "none";
    });
  })();
