// ================= CHATBOT (frontend) =================
// This file only talks to OUR OWN server function (/api/chat).
// The Gemini API key is NEVER here — it stays hidden on the server.

const toggleBtn   = document.getElementById("chat-toggle");
const heroChatBtn = document.getElementById("open-chat-hero");
const closeBtn    = document.getElementById("chat-close");
const chatWindow  = document.getElementById("chat-window");
const messagesBox = document.getElementById("chat-messages");
const form        = document.getElementById("chat-form");
const input       = document.getElementById("chat-text");
const sendBtn     = form.querySelector("button");
const suggestions = document.getElementById("suggestions");

// Conversation history, so the bot remembers previous questions
const history = [];

// ---------- open / close ----------
function openChat() {
  chatWindow.classList.add("open");
  chatWindow.setAttribute("aria-hidden", "false");
  input.focus();
}
function closeChat() {
  chatWindow.classList.remove("open");
  chatWindow.setAttribute("aria-hidden", "true");
}

toggleBtn.addEventListener("click", () =>
  chatWindow.classList.contains("open") ? closeChat() : openChat()
);
heroChatBtn.addEventListener("click", openChat);
closeBtn.addEventListener("click", closeChat);

// ---------- show a message bubble ----------
function addMessage(text, sender) {
  const div = document.createElement("div");
  div.className = "message " + sender;
  div.textContent = text; // textContent = safe, no HTML injection
  messagesBox.appendChild(div);
  messagesBox.scrollTop = messagesBox.scrollHeight;
  return div;
}

function showTyping() {
  const div = document.createElement("div");
  div.className = "message bot typing";
  div.innerHTML = "<span></span><span></span><span></span>";
  messagesBox.appendChild(div);
  messagesBox.scrollTop = messagesBox.scrollHeight;
  return div;
}

// ---------- send a question ----------
async function sendMessage(text) {
  text = text.trim();
  if (!text) return;

  suggestions.style.display = "none";
  addMessage(text, "user");
  input.value = "";
  input.disabled = true;
  sendBtn.disabled = true;

  const typing = showTyping();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history: history.slice(-10) }),
    });

    // Errors come back as JSON; a normal answer is streamed as plain text.
    const isJson = (response.headers.get("Content-Type") || "").includes("application/json");
    if (!response.ok || isJson || !response.body) {
      const data = await response.json().catch(() => ({}));
      typing.remove();
      addMessage(data.error || "Something went wrong. Please try again.", "bot error");
      return;
    }

    // Show the answer word by word as it arrives
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let reply = "";
    let bubble = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      reply += decoder.decode(value, { stream: true });
      if (!bubble && reply.trim()) {
        typing.remove();
        bubble = addMessage("", "bot");
      }
      if (bubble) {
        bubble.textContent = reply;
        messagesBox.scrollTop = messagesBox.scrollHeight;
      }
    }
    reply = (reply + decoder.decode()).trim();
    typing.remove();

    if (!reply) {
      addMessage("Sorry, I couldn't generate an answer. Please try asking differently.", "bot error");
      return;
    }
    if (bubble) bubble.textContent = reply;
    else addMessage(reply, "bot");

    history.push({ role: "user", text: text });
    history.push({ role: "model", text: reply });
  } catch (err) {
    typing.remove();
    addMessage("Could not reach the server. Please check your connection and try again.", "bot error");
  } finally {
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage(input.value);
});

document.querySelectorAll(".suggestion").forEach((btn) =>
  btn.addEventListener("click", () => sendMessage(btn.textContent))
);
