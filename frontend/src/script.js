/* ------------------------------------------------------------------------------------------
  APP ENTRYPOINT
  - Wires together UI, auth, chat, schedule, tasks, and profile pages
------------------------------------------------------------------------------------------ */

import { showPage, setupNavigation, setupUserMenu } from "./ui.js";

import { setupWelcomePage } from "./pages/welcome.js";
import { loadChatHistory, setupDeleteConvoModal } from "./pages/chatHistory.js";

import {
  sendMessage,
  startVoiceRecognition,
  addMessage,
  getChatHistory,
  getCurrentConversationId,
  setCurrentConversationId,
  setupChatInputHandlers,
  resetChatState,
  setupNewChatView,
} from "./pages/chat.js";

import {
  SchedulePage as setupSchedulePage,
  loadScheduleCourses,
} from "./pages/schedule.js";

import { setupTasksPage, loadTasksForSchedule } from "./pages/tasks.js";

import { setupAuth } from "./pages/authentication.js";
import { setupProfilePage } from "./pages/profile.js";

/* ------------------------------------------------------------------------------------------
  INITIALIZATION
------------------------------------------------------------------------------------------ */

document.addEventListener("DOMContentLoaded", () => {
  // Make showPage accessible to other modules if needed
  window.showAppPage = showPage;

  // 1) Authentication – only show app after user is logged in / signed up
  setupAuth(() => {
    // After auth succeeds, load chat history for this user
    loadChatHistory({
      addMessage,
      showPage,
      getChatHistory,
      getCurrentConversationId,
      setCurrentConversationId,
    });

    // Land the user directly on a fresh New Chat view
    resetChatState();
    setupNewChatView();
    showPage("page-chat", "New Chat");
  });

  // 2) Sidebar navigation (New Chat / Schedule / Tasks / Profile)
  setupNavigation({
    onNewChat: () => {
      resetChatState();
      setupNewChatView();
      showPage("page-chat", "New Chat");
    },

    onSchedulePage: () => {
      loadScheduleCourses();
      showPage("page-schedule", "Weekly Schedule");
    },

    onTasksPage: () => {
      loadTasksForSchedule();
      showPage("page-tasks", "Tasks");
    },

    onProfilePage: () => {
      showPage("page-profile", "My Profile");
    },
  });

  // 3) Global UI helpers
  setupDeleteConvoModal();
  setupUserMenu();

  // 4) Page-specific setup
  setupProfilePage();
  setupSchedulePage();
  setupTasksPage();

  // Welcome page suggested prompts → send as chat messages
  setupWelcomePage((text) => {
    sendMessage(text);
  });

  // Chat input (enter key, send button, mic, etc.)
  setupChatInputHandlers();
});
