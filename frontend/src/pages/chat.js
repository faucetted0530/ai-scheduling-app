import { showPage } from "../ui.js";
import { loadChatHistory } from "./chatHistory.js";
import { getCurrentUserId } from "./authentication.js";

let CHAT_HISTORY = [];
let CURRENT_CONVERSATION_ID = null;

export function getChatHistory() {
  return CHAT_HISTORY;
}

export function getCurrentConversationId() {
  return CURRENT_CONVERSATION_ID;
}

export function setCurrentConversationId(id) {
  CURRENT_CONVERSATION_ID = id;
}

/* ------------------------------------------------------------------------------------------
/* SETUP CHAT INPUT */

export function setupChatInputHandlers() {
  // Enter key
  document.querySelectorAll(".chat-input input").forEach((input) => {
    input.addEventListener("keypress", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
      }
    });
  });

  // Send button
  document.querySelectorAll(".chat-input .send").forEach((btn) => {
    btn.addEventListener("click", () => sendMessage());
  });

  // Mic button
  document.querySelectorAll(".chat-input .mic").forEach((btn) => {
    btn.addEventListener("click", () => startVoiceRecognition());
  });
}

/* ------------------------------------------------------------------------------------------
/* HELPER */

function getActiveInput() {
  const activePage = document.querySelector(".page.active");
  if (!activePage) return null;
  return activePage.querySelector(".chat-input input");
}

/* ------------------------------------------------------------------------------------------
/* VOICE RECOGNITION */

export function startVoiceRecognition() {
  if (!("webkitSpeechRecognition" in window)) {
    alert(
      "Your browser does not support speech recognition. Please use Google Chrome."
    );
    return;
  }

  const recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript;
    const input = getActiveInput();
    if (input) input.value = transcript;
  };

  recognition.start();
}

/* ------------------------------------------------------------------------------------------
/* SEND MESSAGE */

export async function sendMessage(text) {
  const activePage = document.querySelector(".page.active");
  const isWelcome = activePage && activePage.id === "page-welcome";

  let input = getActiveInput();
  let message = text != null ? text : input ? input.value.trim() : "";

  if (!message) return;

  if (isWelcome && window.showAppPage) {
    const navItems = document.querySelectorAll(".nav-item[data-page]");
    const chatNav = document.querySelector('.nav-item[data-page="page-chat"]');
    navItems.forEach((item) => item.classList.remove("active"));
    if (chatNav) chatNav.classList.add("active");

    window.showAppPage("page-chat", "New Chat");

    input = document.querySelector("#page-chat .chat-input input");
  }

  if (input) input.value = "";
  if (input) input.value = "";

  addMessage(message, "user");

  const container = document.getElementById("chat-messages");
  const thinkingBubble = document.createElement("div");
  thinkingBubble.classList.add("chat-message", "bot");
  thinkingBubble.textContent = "Thinking...";
  container.appendChild(thinkingBubble);
  container.scrollTop = container.scrollHeight;

  const userId = getCurrentUserId();

  try {
    const res = await fetch("http://localhost:3001/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        history: CHAT_HISTORY,
        conversationId: CURRENT_CONVERSATION_ID,
        userId,
      }),
    });

    if (!res.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await res.json();
    const reply = data.reply || "Sorry, I couldn't generate a response.";

    if (data.conversationId) {
      CURRENT_CONVERSATION_ID = data.conversationId;
    }

    thinkingBubble.innerHTML = reply;

    CHAT_HISTORY.push({
      role: "assistant",
      content: reply,
    });
  } catch (err) {
    console.error("Chat error:", err);
    thinkingBubble.textContent = "Error: I couldn't reach the AI server.";
  }

  loadChatHistory({
    addMessage,
    showPage,
    getChatHistory,
    getCurrentConversationId,
    setCurrentConversationId,
  });
}

/* ------------------------------------------------------------------------------------------
/* ADDING MESSAGE TO UI AND CHAT HISTORY */

export function addMessage(text, sender = "user") {
  const container = document.getElementById("chat-messages");
  if (!container) return;

  const bubble = document.createElement("div");
  bubble.classList.add("chat-message", sender);
  bubble.innerHTML = text;

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;

  // store in history for the backend
  CHAT_HISTORY.push({
    role: sender === "user" ? "user" : "assistant",
    content: text,
  });
}

/* ------------------------------------------------------------------------------------------
/* NEW CHAT */

export function resetChatState() {
  CURRENT_CONVERSATION_ID = null;
  CHAT_HISTORY.length = 0;
}

/* ------------------------------------------------------------------------------------------
/* SUGGESTED PROMPTS */

// Suggested tasks reused for "New Chat" in the chat page
const suggestedTasks = [
  { text: "Show my weekly schedule" },
  { text: "Add a new class" },
  { text: "Drop a class" },
  { text: "Recommend classes" },
];

function clearChatSuggestedPrompts() {
  const container = document.getElementById("chat-suggested-prompts");
  if (container) {
    container.innerHTML = "";
  }
}

function renderChatSuggestedPrompts() {
  const container = document.getElementById("chat-suggested-prompts");
  if (!container) return;

  container.innerHTML = "";

  suggestedTasks.forEach((task) => {
    const btn = document.createElement("button");
    btn.classList.add("suggested-btn");

    btn.textContent = task.text;

    btn.addEventListener("click", () => {
      // Remove prompts immediately
      clearChatSuggestedPrompts();

      // when a suggestion is clicked, send it as a message
      sendMessage(task.text);
    });

    container.appendChild(btn);
  });
}

// Called whenever we start a completely fresh "New Chat"
export function setupNewChatView() {
  const container = document.getElementById("chat-messages");
  if (container) {
    container.innerHTML = "";
  }

  // Bot greeting
  addMessage("Hi! How can I help you?", "bot");

  // Show suggested prompts under the greeting
  renderChatSuggestedPrompts();
}
