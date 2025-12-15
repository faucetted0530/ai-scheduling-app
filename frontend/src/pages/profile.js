console.log("=== PROFILE.JS LOADED - VERSION 3 ===");

import { getCurrentUser, getCurrentUserPassword } from "./authentication.js";

let currentEditField = null;

export function setupProfilePage() {
  document.addEventListener("show-profile-page", loadProfilePage);
  setupPasswordToggle();
  setupEditModals();
}

function setupPasswordToggle() {
  const toggleBtn = document.querySelector(
    "#page-profile .profile-password-toggle"
  );
  const passwordValue = document.getElementById("profile-password");

  if (!toggleBtn || !passwordValue) return;

  toggleBtn.addEventListener("click", () => {
    const icon = toggleBtn.querySelector(".material-icons");
    const isCurrentlyHidden = icon.textContent === "visibility_off";

    if (isCurrentlyHidden) {
      const password = getCurrentUserPassword();
      if (password) {
        passwordValue.textContent = password;
      } else {
        passwordValue.textContent = "Not available";
      }
      toggleBtn.setAttribute("aria-pressed", "true");
      icon.textContent = "visibility";
    } else {
      passwordValue.textContent = "********";
      toggleBtn.setAttribute("aria-pressed", "false");
      icon.textContent = "visibility_off";
    }
  });
}

function loadProfilePage() {
  console.log("PROFILE PAGE LOADED");

  const user = getCurrentUser();
  if (!user) return;

  document.getElementById("profile-name").textContent = user.name;
  document.getElementById("profile-email").textContent = user.email;

  const initials = user.name
    .split(" ")
    .map((x) => x[0])
    .join("")
    .toUpperCase();
  document.getElementById("profile-avatar").textContent = initials;

  document.getElementById("profile-student-id").textContent =
    user.studentId || "N/A";

  const passwordValue = document.getElementById("profile-password");
  if (passwordValue) {
    passwordValue.textContent = "********";
  }

  document.getElementById("profile-major").textContent = user.major || "N/A";
  document.getElementById("profile-minor").textContent = user.minor || "N/A";

  loadUserSchedule(user.id);
}

function setupEditModals() {
  // Text input modal (name, email, password)
  const textModal = document.getElementById("edit-profile-modal");
  const textForm = document.getElementById("edit-profile-form");
  const textInput = document.getElementById("edit-profile-input");
  const textLabel = document.getElementById("edit-profile-label");
  const textTitle = document.getElementById("edit-profile-title");
  const textClose = document.getElementById("edit-profile-close");
  const textCancel = document.getElementById("edit-profile-cancel");

  // Dropdown modal (major, minor)
  const dropdownModal = document.getElementById("edit-dropdown-modal");
  const dropdownForm = document.getElementById("edit-dropdown-form");
  const dropdownSelect = document.getElementById("edit-dropdown-select");
  const dropdownLabel = document.getElementById("edit-dropdown-label");
  const dropdownTitle = document.getElementById("edit-dropdown-title");
  const dropdownClose = document.getElementById("edit-dropdown-close");
  const dropdownCancel = document.getElementById("edit-dropdown-cancel");

  const majorOptions = [
    "Computer Science",
    "Engineering",
    "Business Administration",
    "Psychology",
    "Biology",
    "Chemistry",
    "Physics",
    "Mathematics",
    "English",
    "History",
    "Political Science",
    "Economics",
    "Sociology",
    "Communication",
    "Art",
    "Music",
    "Nursing",
    "Education",
    "Other",
  ];

  const minorOptions = [
    "None",
    "Computer Science",
    "Engineering",
    "Business Administration",
    "Psychology",
    "Biology",
    "Chemistry",
    "Physics",
    "Mathematics",
    "English",
    "History",
    "Political Science",
    "Economics",
    "Sociology",
    "Communication",
    "Art",
    "Music",
    "Data Science",
    "Statistics",
    "Philosophy",
  ];

  // Setup button click handlers
  document
    .querySelectorAll("#page-profile .profile-edit-btn")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const field = btn.dataset.edit;
        const user = getCurrentUser();
        if (!user) return;

        currentEditField = field;

        if (field === "major" || field === "minor") {
          // Open dropdown modal
          console.log("Opening dropdown modal for", field);

          dropdownTitle.textContent = `Edit ${
            field === "major" ? "Major" : "Minor"
          }`;
          dropdownLabel.textContent = field === "major" ? "Major" : "Minor";

          const options = field === "major" ? majorOptions : minorOptions;
          dropdownSelect.innerHTML = options
            .map((opt) => {
              if (opt === "None") return `<option value="">None</option>`;
              return `<option value="${opt}">${opt}</option>`;
            })
            .join("");

          const currentValue = field === "major" ? user.major : user.minor;
          if (currentValue && currentValue !== "N/A") {
            dropdownSelect.value = currentValue;
          } else if (field === "minor") {
            dropdownSelect.value = "";
          }

          dropdownModal.classList.remove("modal-hidden");
          setTimeout(() => dropdownSelect.focus(), 100);
        } else {
          // Open text input modal
          console.log("Opening text modal for", field);

          const fieldNames = {
            name: "Name",
            email: "Email",
            password: "Password",
          };
          textTitle.textContent = `Edit ${fieldNames[field]}`;
          textLabel.textContent = fieldNames[field];

          if (field === "password") {
            textInput.type = "password";
            textInput.value = "";
            textInput.placeholder = "Enter new password";
          } else {
            textInput.type = "text";
            textInput.placeholder = "";
            textInput.value = field === "name" ? user.name : user.email;
          }

          textModal.classList.remove("modal-hidden");
          setTimeout(() => textInput.focus(), 100);
        }
      });
    });

  // Close handlers for text modal
  if (textClose)
    textClose.addEventListener("click", () => {
      textModal.classList.add("modal-hidden");
      textForm.reset();
    });

  if (textCancel)
    textCancel.addEventListener("click", () => {
      textModal.classList.add("modal-hidden");
      textForm.reset();
    });

  textModal?.addEventListener("click", (e) => {
    if (
      e.target === textModal ||
      e.target.classList.contains("modal-backdrop")
    ) {
      textModal.classList.add("modal-hidden");
      textForm.reset();
    }
  });

  // Close handlers for dropdown modal
  if (dropdownClose)
    dropdownClose.addEventListener("click", () => {
      dropdownModal.classList.add("modal-hidden");
      dropdownForm.reset();
    });

  if (dropdownCancel)
    dropdownCancel.addEventListener("click", () => {
      dropdownModal.classList.add("modal-hidden");
      dropdownForm.reset();
    });

  dropdownModal?.addEventListener("click", (e) => {
    if (
      e.target === dropdownModal ||
      e.target.classList.contains("modal-backdrop")
    ) {
      dropdownModal.classList.add("modal-hidden");
      dropdownForm.reset();
    }
  });

  // Form submit for text modal
  textForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newValue = textInput.value.trim();
    if (!newValue) return;

    const user = getCurrentUser();
    if (!user) return;

    if (currentEditField === "name") {
      await updateName(user, newValue);
    } else if (currentEditField === "email") {
      await updateEmail(user, newValue);
    } else if (currentEditField === "password") {
      await updatePassword(user, newValue);
    }

    textModal.classList.add("modal-hidden");
    textForm.reset();
  });

  // Form submit for dropdown modal
  dropdownForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newValue = dropdownSelect.value;

    const user = getCurrentUser();
    if (!user) return;

    if (currentEditField === "major" || currentEditField === "minor") {
      await updateAcademic(user, currentEditField, newValue);
    }

    dropdownModal.classList.add("modal-hidden");
    dropdownForm.reset();
  });
}

async function updateName(user, newValue) {
  try {
    const res = await fetch("http://localhost:3001/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, name: newValue }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to update name");
      return;
    }

    user.name = newValue;
    localStorage.setItem("currentUser", JSON.stringify(user));

    document.getElementById("profile-name").textContent = newValue;

    const initials = newValue
      .split(" ")
      .map((x) => x[0])
      .join("")
      .toUpperCase();
    document.getElementById("profile-avatar").textContent = initials;

    const profileName = document.querySelector(".profile-btn .profile-name");
    if (profileName) profileName.textContent = newValue;

    const profileImg = document.querySelector(".profile-btn .profile-img");
    if (profileImg) profileImg.textContent = initials;

    const welcomeName = document.querySelector(
      "#page-welcome .welcome-text .text_1"
    );
    if (welcomeName) {
      const firstName = newValue.split(" ")[0] || "there";
      welcomeName.textContent = `Hello, ${firstName}!`;
    }
  } catch (err) {
    console.error("Error updating name:", err);
    alert("Failed to update name");
  }
}

async function updateEmail(user, newValue) {
  try {
    const res = await fetch("http://localhost:3001/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, email: newValue }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to update email");
      return;
    }

    user.email = newValue;
    localStorage.setItem("currentUser", JSON.stringify(user));

    document.getElementById("profile-email").textContent = newValue;

    const profileUsername = document.querySelector(
      ".profile-btn .profile-username"
    );
    if (profileUsername) {
      const username = newValue.includes("@")
        ? newValue.split("@")[0]
        : "student";
      profileUsername.textContent = username;
    }
  } catch (err) {
    console.error("Error updating email:", err);
    alert("Failed to update email");
  }
}

async function updatePassword(user, newValue) {
  try {
    const res = await fetch("http://localhost:3001/api/user/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, password: newValue }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to update password");
      return;
    }

    sessionStorage.setItem("userPasswordSession", newValue);
    alert("Password updated successfully!");
  } catch (err) {
    console.error("Error updating password:", err);
    alert("Failed to update password");
  }
}

async function updateAcademic(user, field, newValue) {
  try {
    const updateData = { userId: user.id };
    updateData[field] = newValue || null;

    const res = await fetch("http://localhost:3001/api/user/academic", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || `Failed to update ${field}`);
      return;
    }

    user[field] = newValue || null;
    localStorage.setItem("currentUser", JSON.stringify(user));

    if (field === "major") {
      document.getElementById("profile-major").textContent = newValue || "N/A";
    } else {
      document.getElementById("profile-minor").textContent = newValue || "N/A";
    }
  } catch (err) {
    console.error(`Error updating ${field}:`, err);
    alert(`Failed to update ${field}`);
  }
}

async function loadUserSchedule(userId) {
  try {
    const res = await fetch(
      `http://localhost:3001/api/schedule?userId=${userId}`
    );
    const data = await res.json();

    console.log("Schedule data received:", data);

    const container = document.getElementById("profile-classes");
    container.innerHTML = "";

    if (!data.classes || data.classes.length === 0) {
      container.innerHTML = "<span class='profile-pill'>No classes yet</span>";
      return;
    }

    data.classes.forEach((cls) => {
      if (typeof cls === "string") {
        const pill = document.createElement("span");
        pill.className = "profile-pill";
        pill.textContent = cls;
        container.appendChild(pill);
        return;
      }

      const pill = document.createElement("span");
      pill.className = "profile-pill";

      const code = cls.id || cls.code || cls.courseId || cls.courseCode || "";
      const name = cls.name || cls.title || cls.courseName || "";

      if (code && name) {
        pill.textContent = `${code} — ${name}`;
      } else if (code || name) {
        pill.textContent = code || name;
      } else {
        pill.textContent = JSON.stringify(cls);
      }

      const details = [];
      if (cls.professor || cls.instructor || cls.teacher) {
        details.push(cls.professor || cls.instructor || cls.teacher);
      }
      if (Array.isArray(cls.days) && cls.days.length) {
        details.push(cls.days.join(", "));
      } else if (typeof cls.days === "string" && cls.days) {
        details.push(cls.days);
      }
      if (cls.start && cls.end) {
        details.push(`${cls.start}—${cls.end}`);
      } else if (cls.time || cls.schedule) {
        details.push(cls.time || cls.schedule);
      }

      if (details.length > 0) {
        pill.title = details.join(" • ");
      }

      container.appendChild(pill);
    });
  } catch (err) {
    console.error("Failed to load schedule:", err);
    const container = document.getElementById("profile-classes");
    container.innerHTML =
      "<span class='profile-pill' style='color: #d00;'>Failed to load classes</span>";
  }
}
