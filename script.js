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

    const data = await response.json();
    typing.remove();

    if (!response.ok) {
      addMessage(data.error || "Something went wrong. Please try again.", "bot error");
      return;
    }

    addMessage(data.reply, "bot");
    history.push({ role: "user", text: text });
    history.push({ role: "model", text: data.reply });
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
