const CHANNELS = {
  chat: {
    name: "∆",
    title: "Ask a question or type a message.",
    subtitle: "This model evaluates responses from 3 different models and selects the best of them.",
    placeholder: "Share your thoughts here…",
    color: "#5eead4",
    colorDim: "rgba(94, 234, 212, 0.14)",
  },
};

const state = {
  active: "chat",
  histories: {
    chat: [],
  },
};

const root = document.documentElement;
const deckTitle = document.getElementById("deck-title");
const deckSubtitle = document.getElementById("deck-subtitle");
const activeLabel = document.getElementById("active-channel-label");
const transcript = document.getElementById("transcript");
const emptyState = document.getElementById("empty-state");
const composer = document.getElementById("composer");
const input = document.getElementById("prompt-input");
const sendBtn = document.getElementById("send-btn");

function applyChannel(id) {
  const cfg = CHANNELS[id];
  state.active = id;
  root.style.setProperty("--active", cfg.color);
  root.style.setProperty("--active-dim", cfg.colorDim);
  deckTitle.textContent = cfg.title;
  deckSubtitle.textContent = cfg.subtitle;
  input.placeholder = cfg.placeholder;

  renderTranscript();
}

function renderTranscript() {
  transcript.innerHTML = "";
  const history = state.histories[state.active];

  if (history.length === 0) {
    transcript.appendChild(emptyState);
    return;
  }

  history.forEach((entry) => {
    transcript.appendChild(buildMessageEl(entry));
  });

  transcript.scrollTop = transcript.scrollHeight;
}

function buildMessageEl({ role, text, pending }) {
  const el = document.createElement("div");
  el.className = `msg ${role === "user" ? "user" : "ai"}${pending ? " pending" : ""}`;

  const tag = document.createElement("span");
  tag.className = "msg-tag";
  tag.textContent = role === "user" ? "you" : CHANNELS[state.active].name;
  el.appendChild(tag);

  const body = document.createElement("span");
  body.textContent = text;
  el.appendChild(body);

  return el;
}


async function getData(apiPath, text, history) {
  const res = await fetch(apiPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: text,
      history: history
        .filter((m) => !m.pending)
        .slice(0, -1)
        .map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.text,
        })),
    }),
  });

  const data = await res.json();
  return "" + data.response
}

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 160) + "px";
});

composer.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  const channel = state.active;
  const history = state.histories[channel];

  history.push({ role: "user", text });
  input.value = "";
  input.style.height = "auto";
  sendBtn.disabled = true;
  input.disabled = true;
  renderTranscript();

  const pendingEntry = { role: "ai", text: "...", pending: true };
  history.push(pendingEntry);
  renderTranscript();

  var output_from_models = `Following are three outputs from 3 different AI models.
    Output 1: ${ await getData("/api/gemini_resp", text, history)}\n
    Output 2: ${ await getData("/api/mistral_resp", text, history)}\n
    Output 3: ${ await getData("/api/openr_resp", text, history)}\n
  `

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        sysP: output_from_models,
        history: history
          .filter((m) => !m.pending)
          .slice(0, -1)
          .map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.text,
          })),
      }),
    });

    const data = await res.json();

    pendingEntry.text = res.ok
      ? data.response
      : `${data.error || "Could not reach the server. Please try again."}`;
  } catch (err) {
    pendingEntry.text = "Could not reach the server. Please try again.";
  } finally {
    pendingEntry.pending = false;
    sendBtn.disabled = false;
    input.disabled = false;
    renderTranscript();
  }
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    composer.requestSubmit();
  }
});

applyChannel("chat");
