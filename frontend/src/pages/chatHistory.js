/* ------------------------------------------------------------------------------------------
/* LOADING CHAT HISTORY */
import { getCurrentUserId } from "./authentication.js";

export async function loadChatHistory({
  addMessage,
  showPage,
  getChatHistory,
  getCurrentConversationId,
  setCurrentConversationId,
}) {
  const list = document.querySelector(".chat-history-list");
  if (!list) return;

  const userId = getCurrentUserId();

  // If there's no logged-in user, clear the UI and don't hit the API
  if (!userId) {
    list.innerHTML = "";
    return;
  }

  const query = `?userId=${encodeURIComponent(userId)}`;

  try {
    const res = await fetch(`http://localhost:3001/api/conversations${query}`);

    if (!res.ok) throw new Error("Failed to fetch conversations");

    const conversations = await res.json();
    list.innerHTML = "";

    if (!conversations.length) {
      const empty = document.createElement("div");
      empty.textContent = "No conversations yet";
      empty.classList.add("empty-history");
      list.appendChild(empty);
      return;
    }

    conversations.forEach((c) => {
      const row = document.createElement("div");
      row.classList.add("history-row");
      row.dataset.id = c.id;

      const label = document.createElement("button");
      label.classList.add("history-label");
      label.textContent = c.title || "Untitled chat";

      const delBtn = document.createElement("button");
      delBtn.classList.add("delete-history-btn");
      delBtn.innerHTML = `<span class="material-icons">delete</span>`;

      row.addEventListener("click", () => {
        document
          .querySelectorAll(".history-row")
          .forEach((el) => el.classList.remove("active"));
        row.classList.add("active");

        loadConversation(c.id, c.title, {
          addMessage,
          showPage,
          getChatHistory,
          setCurrentConversationId,
        });
      });

      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();

        openDeleteConvoModal(
          c.id,
          c.title || "Untitled chat",
          async (conversationId) => {
            try {
              const userId = getCurrentUserId();
              const query = userId
                ? `?userId=${encodeURIComponent(userId)}`
                : "";

              const res = await fetch(
                `http://localhost:3001/api/conversations/${conversationId}${query}`,
                { method: "DELETE" }
              );

              if (!res.ok && res.status !== 204) {
                throw new Error("Failed to delete conversation");
              }

              // If we just deleted the active conversation, clear chat UI + state
              if (getCurrentConversationId() === conversationId) {
                setCurrentConversationId(null);
                const history = getChatHistory();
                history.length = 0;
                const msgs = document.getElementById("chat-messages");
                if (msgs) msgs.innerHTML = "";
              }

              // Reload history after delete
              loadChatHistory({
                addMessage,
                showPage,
                getChatHistory,
                getCurrentConversationId,
                setCurrentConversationId,
              });
            } catch (err) {
              console.error("delete conversation error:", err);
              alert("Sorry, something went wrong deleting this chat.");
            }
          }
        );
      });

      row.append(label, delBtn);
      list.appendChild(row);
    });
  } catch (err) {
    console.error("loadChatHistory error:", err);
  }
}

/* ------------------------------------------------------------------------------------------
/* LOADING SELECTED CHAT CONVERSTION */

export async function loadConversation(
  conversationId,
  title,
  { addMessage, showPage, getChatHistory, setCurrentConversationId }
) {
  try {
    const userId = getCurrentUserId();
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";

    const res = await fetch(
      `http://localhost:3001/api/conversations/${conversationId}${query}`
    );
    if (!res.ok) throw new Error("Failed to fetch conversation");

    const convo = await res.json();

    // Update current convo id
    setCurrentConversationId(convo.id);

    // Clear in-memory history
    const history = getChatHistory();
    history.length = 0;

    // Clear UI
    const container = document.getElementById("chat-messages");
    if (container) container.innerHTML = "";

    // Switch to chat page
    showPage("page-chat", title || "Chat");

    document
      .querySelectorAll(".nav-item[data-page]")
      .forEach((i) => i.classList.remove("active"));
    document
      .querySelector('.nav-item[data-page="page-chat"]')
      ?.classList.add("active");

    // Rebuild messages
    (convo.messages || []).forEach((m) => {
      addMessage(m.content, m.role === "assistant" ? "bot" : "user");
    });
  } catch (err) {
    console.error("loadConversation error:", err);
  }
}

/* ------------------------------------------------------------------------------------------
/* DELETE CONVERSATION SETUP */
let deleteConvoModal = null;
let deleteConvoMessage = null;
let deleteConvoClose = null;
let deleteConvoCancel = null;
let deleteConvoConfirm = null;
let deleteConvoCurrentId = null;
let deleteConvoOnConfirm = null;

function openDeleteConvoModal(conversationId, title, onConfirm) {
  if (!deleteConvoModal) return;
  deleteConvoCurrentId = conversationId;
  deleteConvoOnConfirm = onConfirm || null;
  const convoTitle = title || "this conversation";
  if (deleteConvoMessage) {
    deleteConvoMessage.innerHTML = `Are you sure you want to delete <strong>'${convoTitle}'</strong>?`;
  }
  deleteConvoModal.classList.remove("modal-hidden");
}

function closeDeleteConvoModal() {
  deleteConvoCurrentId = null;
  deleteConvoOnConfirm = null;
  if (deleteConvoModal) {
    deleteConvoModal.classList.add("modal-hidden");
  }
}

export function setupDeleteConvoModal() {
  deleteConvoModal = document.getElementById("delete-convo-modal");
  if (!deleteConvoModal) return;

  deleteConvoMessage = document.getElementById("delete-convo-message");
  deleteConvoClose = document.getElementById("delete-convo-close");
  deleteConvoCancel = document.getElementById("delete-convo-cancel");
  deleteConvoConfirm = document.getElementById("delete-convo-confirm");

  // Close (X)
  if (deleteConvoClose) {
    deleteConvoClose.addEventListener("click", closeDeleteConvoModal);
  }

  // Cancel button
  if (deleteConvoCancel) {
    deleteConvoCancel.addEventListener("click", closeDeleteConvoModal);
  }

  // Click on backdrop closes modal
  deleteConvoModal.addEventListener("click", (e) => {
    if (
      e.target === deleteConvoModal ||
      e.target.classList.contains("modal-backdrop")
    ) {
      closeDeleteConvoModal();
    }
  });

  // Confirm delete
  if (deleteConvoConfirm) {
    deleteConvoConfirm.addEventListener("click", async () => {
      if (deleteConvoOnConfirm && deleteConvoCurrentId) {
        await deleteConvoOnConfirm(deleteConvoCurrentId);
      }
      closeDeleteConvoModal();
    });
  }
}
