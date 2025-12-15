/* ------------------------------------------------------------------------------------------
/* SIMPLE CLIENT-SIDE AUTH STATE
------------------------------------------------------------------------------------------ */

const STORAGE_KEY = "currentUser";
const PASSWORD_SESSION_KEY = "userPasswordSession";

export function getCurrentUser() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getCurrentUserId() {
  const raw = localStorage.getItem("currentUser");
  if (!raw) return null;
  try {
    return JSON.parse(raw).id || null;
  } catch {
    return null;
  }
}

export function getCurrentUserPassword() {
  // Get password from sessionStorage (only available during current session)
  return sessionStorage.getItem(PASSWORD_SESSION_KEY);
}

function setCurrentUser(user) {
  if (!user) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }
}

function setSessionPassword(password) {
  if (!password) {
    sessionStorage.removeItem(PASSWORD_SESSION_KEY);
  } else {
    sessionStorage.setItem(PASSWORD_SESSION_KEY, password);
  }
}

function applyUserToUI(user) {
  if (!user) return;

  const name = user.name || "User";
  const email = user.email || "";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .slice(0, 2)
    .join("");

  const profileImg = document.querySelector(".profile-btn .profile-img");
  const profileName = document.querySelector(".profile-btn .profile-name");
  const profileUsername = document.querySelector(
    ".profile-btn .profile-username"
  );

  if (profileImg) profileImg.textContent = initials;
  if (profileName) profileName.textContent = name;
  if (profileUsername) {
    const username =
      email && email.includes("@") ? email.split("@")[0] : "student";
    profileUsername.textContent = username;
  }

  const welcomeName = document.querySelector(
    "#page-welcome .welcome-text .text_1"
  );
  if (welcomeName) {
    const firstName = name.split(" ")[0] || "there";
    welcomeName.textContent = `Hello, ${firstName}!`;
  }
}

export function logout() {
  // Clear stored user and password
  setCurrentUser(null);
  setSessionPassword(null);

  // Clear all page content
  clearAllPageData();

  // Flip UI back to auth
  const authContainer = document.getElementById("auth");
  const appContent = document.getElementById("app-content");

  if (authContainer) authContainer.style.display = "flex";
  if (appContent) appContent.classList.add("hidden");

  // Close profile dropdown if it's open
  const profileMenu = document.getElementById("profile-menu");
  if (profileMenu) profileMenu.classList.remove("open");
}

function clearAllPageData() {
  // Clear chat messages
  const chatMessages = document.getElementById("chat-messages");
  if (chatMessages) chatMessages.innerHTML = "";

  // Clear chat history sidebar
  const chatHistoryList = document.querySelector(".chat-history-list");
  if (chatHistoryList) chatHistoryList.innerHTML = "";

  // Clear profile data
  const profileName = document.getElementById("profile-name");
  const profileEmail = document.getElementById("profile-email");
  const profileAvatar = document.getElementById("profile-avatar");
  const profileStudentId = document.getElementById("profile-student-id");
  const profileMajor = document.getElementById("profile-major");
  const profileMinor = document.getElementById("profile-minor");
  const profileClasses = document.getElementById("profile-classes");
  const profilePassword = document.getElementById("profile-password");

  if (profileName) profileName.textContent = "Loading...";
  if (profileEmail) profileEmail.textContent = "Loading...";
  if (profileAvatar) profileAvatar.textContent = "??";
  if (profileStudentId) profileStudentId.textContent = "N/A";
  if (profileMajor) profileMajor.textContent = "N/A";
  if (profileMinor) profileMinor.textContent = "N/A";
  if (profileClasses) profileClasses.innerHTML = "";
  if (profilePassword) profilePassword.textContent = "********";

  // Clear schedule page
  const coursesList = document.getElementById("courses-list");
  if (coursesList) coursesList.innerHTML = "";

  // Reset to welcome page
  const pages = document.querySelectorAll(".page");
  pages.forEach((page) => page.classList.remove("active"));
  const welcomePage = document.getElementById("page-welcome");
  if (welcomePage) welcomePage.classList.add("active");

  // Reset navigation
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((item) => item.classList.remove("active"));
  const chatNav = document.querySelector('.nav-item[data-page="page-chat"]');
  if (chatNav) chatNav.classList.add("active");
}

/* ------------------------------------------------------------------------------------------
/* AUTHENTICATION SETUP
------------------------------------------------------------------------------------------ */

function showError(errorId, message) {
  const errorEl = document.getElementById(errorId);
  if (!errorEl) return;

  const textEl = errorEl.querySelector(".auth-error-text");
  if (textEl) textEl.textContent = message;

  errorEl.classList.remove("hidden");
}

function hideError(errorId) {
  const errorEl = document.getElementById(errorId);
  if (!errorEl) return;
  errorEl.classList.add("hidden");
}

export function setupAuth(onAuthComplete) {
  const authContainer = document.getElementById("auth");
  const appContent = document.getElementById("app-content");

  const signupSection = document.getElementById("auth-signup");
  const loginSection = document.getElementById("auth-login");

  if (!authContainer || !appContent || !signupSection || !loginSection) {
    return;
  }

  // HOOK SIGN OUT BUTTON (this menu is in the sidebar)
  const signOutBtn = document.querySelector(
    "#profile-menu .profile-menu-item:last-child"
  );
  if (signOutBtn) {
    signOutBtn.addEventListener("click", () => {
      logout();
    });
  }

  const existing = getCurrentUser();
  // If we already have a stored user, skip auth screens
  if (existing) {
    applyUserToUI(existing);
    authContainer.style.display = "none";
    appContent.classList.remove("hidden");

    if (typeof onAuthComplete === "function") {
      onAuthComplete(existing);
    }
    return;
  }

  function showSection(mode) {
    const isSignup = mode === "signup";
    signupSection.classList.toggle("active", isSignup);
    loginSection.classList.toggle("active", !isSignup);
  }

  const switchButtons = authContainer.querySelectorAll("[data-switch]");
  switchButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.switch;
      if (!mode) return;
      showSection(mode);
      // Clear errors when switching forms
      hideError("login-error");
      hideError("signup-error");
    });
  });

  // Show login by default
  showSection("login");

  // Password visibility toggles
  const passwordWrappers = authContainer.querySelectorAll(".password-field");

  passwordWrappers.forEach((wrapper) => {
    const input = wrapper.querySelector(".password-input");
    const toggleBtn = wrapper.querySelector(".password-toggle");

    if (!input || !toggleBtn) return;

    toggleBtn.addEventListener("click", () => {
      const isHidden = input.type === "password";
      const newType = isHidden ? "text" : "password";

      input.type = newType;
      const isNowVisible = newType === "text";

      toggleBtn.setAttribute("aria-pressed", String(isNowVisible));
      toggleBtn.querySelector(".material-icons").textContent = isNowVisible
        ? "visibility"
        : "visibility_off";
    });
  });

  function completeAuth(user, password) {
    if (user) {
      setCurrentUser(user);
      applyUserToUI(user);
      // Store password in sessionStorage for this session only
      if (password) {
        setSessionPassword(password);
      }
    }
    authContainer.style.display = "none";
    appContent.classList.remove("hidden");

    // Force refresh all pages with new user data
    refreshAllPages();

    // normal login / signup
    if (typeof onAuthComplete === "function") {
      onAuthComplete(user);
    }
  }

  function refreshAllPages() {
    // Trigger profile page to load new user data
    document.dispatchEvent(new Event("show-profile-page"));

    // Reset to welcome page
    const pages = document.querySelectorAll(".page");
    pages.forEach((page) => page.classList.remove("active"));
    const welcomePage = document.getElementById("page-welcome");
    if (welcomePage) welcomePage.classList.add("active");

    // Hide topbar on welcome page
    const topbar = document.querySelector(".topbar");
    if (topbar) topbar.classList.add("hidden");

    // Reset navigation to "New Chat"
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((item) => item.classList.remove("active"));
    const chatNav = document.querySelector('.nav-item[data-page="page-chat"]');
    if (chatNav) chatNav.classList.add("active");
  }

  // SIGN UP
  const createForm = signupSection.querySelector("#create-form");
  if (createForm) {
    const firstNameInput = document.getElementById("signup-firstname");
    const lastNameInput = document.getElementById("signup-lastname");
    const emailInput = document.getElementById("signup-email");
    const passwordInput = document.getElementById("signup-password");
    const majorSelect = document.getElementById("signup-major");
    const minorSelect = document.getElementById("signup-minor");

    createForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!firstNameInput || !lastNameInput || !emailInput || !passwordInput)
        return;

      const firstName = firstNameInput.value.trim();
      const lastName = lastNameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const major = majorSelect.value;
      const minor = minorSelect.value || null;

      console.log("Signup data:", {
        firstName,
        lastName,
        email,
        password,
        major,
        minor,
      });

      if (!firstName || !lastName || !email || !password || !major) {
        showError("signup-error", "All required fields must be filled.");
        return;
      }

      // Clear any previous errors
      hideError("signup-error");

      try {
        const res = await fetch("http://localhost:3001/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            password,
            major,
            minor,
          }),
        });

        const data = await res.json();
        console.log("Server response:", data);

        if (!res.ok) {
          showError("signup-error", data.error || "Failed to create account.");
          return;
        }

        completeAuth(data.user, password);
      } catch (err) {
        console.error("Signup error:", err);
        showError(
          "signup-error",
          "Sorry, something went wrong creating your account."
        );
      }
    });
  }

  // LOGIN
  const loginForm = loginSection.querySelector("#login-form");
  if (loginForm) {
    const loginEmail = loginSection.querySelector('input[type="email"]');
    const loginPassword = loginSection.querySelector("#login-password");

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!loginEmail || !loginPassword) return;

      const email = loginEmail.value.trim();
      const password = loginPassword.value;

      if (!email || !password) return;

      // Clear any previous errors
      hideError("login-error");

      try {
        const res = await fetch("http://localhost:3001/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok) {
          showError("login-error", data.error || "Invalid email or password.");
          return;
        }

        completeAuth(data.user, password);
      } catch (err) {
        console.error("Login error:", err);
        showError("login-error", "Sorry, something went wrong logging you in.");
      }
    });
  }
}
