/* ------------------------------------------------------------------------------------------
/* SEMESTER MENU UI SETUP */

import { getCurrentUserId } from "./authentication.js";

const DEFAULT_SEMESTER = "Fall 2025";
let currentSemester = DEFAULT_SEMESTER;

export function getCurrentSemester() {
  return currentSemester;
}


export function setupSemesterMenuUI() {
  const semesterBtn = document.getElementById("semester-btn");
  const semesterMenu = document.getElementById("semester-menu");
  const semesterItems = document.querySelectorAll(".semester-menu-item");
  const semesterBtnLabel = semesterBtn
    ? semesterBtn.querySelector("span")
    : null;

  // Initializing current semester
  if (semesterBtn && semesterBtnLabel && semesterItems.length > 0) {
    let activeItem = Array.from(semesterItems).find(
      (item) => item.textContent.trim() === DEFAULT_SEMESTER
    );

    if (!activeItem) activeItem = semesterItems[0];

    const labelText = activeItem.textContent.trim();
    semesterBtnLabel.textContent = labelText;
    activeItem.classList.add("active");
    currentSemester = labelText; // sync with global
  }

  // Menu open / close
  if (semesterBtn && semesterMenu) {
    semesterBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      semesterMenu.style.display =
        semesterMenu.style.display === "flex" ? "none" : "flex";
    });

    document.addEventListener("click", () => {
      semesterMenu.style.display = "none";
    });

    semesterMenu.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  // Clicking a semester item
  semesterItems.forEach((item) => {
    item.addEventListener("click", async (e) => {
      e.stopPropagation();

      const label = item.textContent.trim();
      currentSemester = label; // 🔴 update global semester

      if (semesterBtnLabel) {
        semesterBtnLabel.textContent = label;
      }

      semesterItems.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");

      // Reload schedule for the newly selected semester
      await loadScheduleCourses();
    });
  });
}




/* ------------------------------------------------------------------------------------------
/* ADD CLASS SETUP */

let addCourseModal = null;
let addCourseForm = null;
let addCourseInput = null;
let addCourseClose = null;
let addCourseCancel = null;
let addCourseSubmit = null;
let addCourseError = null;

export function openAddCourseModal() {
  if (!addCourseModal) return;
  addCourseModal.classList.remove("modal-hidden");

  if (addCourseInput) {
    setTimeout(() => addCourseInput.focus(), 100);
  }
}

function closeAddCourseModal() {
  if (!addCourseModal) return;
  addCourseModal.classList.add("modal-hidden");
  if (addCourseForm) addCourseForm.reset();
  if (addCourseSubmit) addCourseSubmit.disabled = true;

  if (addCourseError) {
    addCourseError.classList.add("hidden");
  }
  if (addCourseInput) {
    addCourseInput.classList.remove("modal-field-input-error");
  }
}

function setupAddCourseModal() {
  addCourseModal = document.getElementById("add-course-modal");
  addCourseForm = document.getElementById("add-course-form");
  addCourseInput = document.getElementById("modal-course-id");
  addCourseClose = document.getElementById("add-course-close");
  addCourseCancel = document.getElementById("add-course-cancel");
  addCourseSubmit = document.getElementById("add-course-submit");
  addCourseError = document.getElementById("add-course-error");
  const addClassBtn = document.querySelector(".add-btn");

  if (addCourseSubmit) {
    addCourseSubmit.disabled = true;
  }

  if (addCourseInput && addCourseSubmit) {
    addCourseInput.addEventListener("input", () => {
      const value = addCourseInput.value.trim();
      addCourseSubmit.disabled = value.length === 0;

      if (addCourseError && value.length > 0) {
        addCourseError.classList.add("hidden");
        addCourseInput.classList.remove("modal-field-input-error");
      }
    });
  }

  if (addClassBtn) {
    addClassBtn.addEventListener("click", () => {
      openAddCourseModal();
    });
  }

  if (addCourseClose) {
    addCourseClose.addEventListener("click", closeAddCourseModal);
  }

  if (addCourseCancel) {
    addCourseCancel.addEventListener("click", closeAddCourseModal);
  }

  // Close when clicking backdrop
  if (addCourseModal) {
    addCourseModal.addEventListener("click", (e) => {
      // Only close if they clicked *outside* the dialog
      if (
        e.target === addCourseModal ||
        e.target.classList.contains("modal-backdrop")
      ) {
        closeAddCourseModal();
      }
    });
  }

  // Handle the actual "Add Course" submit
  if (addCourseForm && addCourseInput) {
    addCourseForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      // 1) Take raw input
      const rawValue = addCourseInput.value.trim();
      if (!rawValue) return;

      // 2) Force uppercase here
      const courseId = rawValue.toUpperCase();

      try {
        const userId = getCurrentUserId();
        const semester = currentSemester || DEFAULT_SEMESTER;

        const body = { courseId, semester };
        if (userId) body.userId = userId;

        const res = await fetch("http://localhost:3001/api/schedule/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          let message = "Could not find course.";

          if (data?.error) {
            // Normalize duplicate-course message
            if (
              data.error.toLowerCase().includes("already") ||
              data.error.toLowerCase().includes("exists")
            ) {
              message = "Course already added to your schedule.";
            } else {
              message = data.error;
            }
          }

          if (addCourseError) {
            addCourseError.querySelector(".modal-field-error-text").textContent = message;
            addCourseError.classList.remove("hidden");
          }

          if (addCourseInput) {
            addCourseInput.classList.add("modal-field-input-error");
          }

          return;
        }


        closeAddCourseModal();
        await loadScheduleCourses();

      } catch (err) {
          console.error("addCourse error:", err);
          const fallback = "Sorry, something went wrong adding this course.";

          if (addCourseError) {
            addCourseError
              .querySelector(".modal-field-error-text")
              .textContent = fallback;
            addCourseError.classList.remove("hidden");
          }

          if (addCourseInput) {
            addCourseInput.classList.add("modal-field-input-error");
          }
        }
    });
  }
}



/* ------------------------------------------------------------------------------------------
/* DROP CLASS SETUP */

let dropCourseModal = null;
let dropCourseMessage = null;
let dropCourseClose = null;
let dropCourseCancel = null;
let dropCourseConfirm = null;
let dropCourseCurrentId = null;

function openDropCourseModal(courseId) {
  if (!dropCourseModal) return;
  dropCourseCurrentId = courseId;

  if (dropCourseMessage) {
    dropCourseMessage.innerHTML = `Are you sure you want to drop out off  <strong>'${courseId}'</strong>?`;
  }

  dropCourseModal.classList.remove("modal-hidden");
}

function closeDropCourseModal() {
  dropCourseCurrentId = null;
  if (dropCourseModal) {
    dropCourseModal.classList.add("modal-hidden");
  }
}

async function dropCourse(courseId) {
  if (!courseId) return;

  try {
    const userId = getCurrentUserId();
    const semester = currentSemester || DEFAULT_SEMESTER;

    const body = { courseId, semester };
    if (userId) body.userId = userId;

    const res = await fetch("http://localhost:3001/api/schedule/drop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("Drop failed", await res.text());
      alert("Sorry, something went wrong dropping this course.");
      return;
    }

    await loadScheduleCourses();
  } catch (err) {
    console.error("dropCourse error:", err);
    alert("Sorry, something went wrong dropping this course.");
  }
}

function setupDropCourseModal() {
  dropCourseModal = document.getElementById("drop-course-modal");
  dropCourseMessage = document.getElementById("drop-course-message");
  dropCourseClose = document.getElementById("drop-course-close");
  dropCourseCancel = document.getElementById("drop-course-cancel");
  dropCourseConfirm = document.getElementById("drop-course-confirm");

  if (!dropCourseModal) return;

  // Close button (X)
  if (dropCourseClose) {
    dropCourseClose.addEventListener("click", () => {
      closeDropCourseModal();
    });
  }

  // Cancel button
  if (dropCourseCancel) {
    dropCourseCancel.addEventListener("click", () => {
      closeDropCourseModal();
    });
  }

  // Confirm delete button
  if (dropCourseConfirm) {
    dropCourseConfirm.addEventListener("click", async () => {
      if (!dropCourseCurrentId) {
        closeDropCourseModal();
        return;
      }

      const courseId = dropCourseCurrentId;
      closeDropCourseModal();
      await dropCourse(courseId);
    });
  }

  // Click on backdrop closes modal
  dropCourseModal.addEventListener("click", (e) => {
    if (
      e.target === dropCourseModal ||
      e.target.classList.contains("modal-backdrop")
    ) {
      closeDropCourseModal();
    }
  });
}



/* ------------------------------------------------------------------------------------------
/* CALENDAR SETUP */

export function generateCalendar() {
  const container = document.getElementById("calendar-grid");

  if (!container) return;

  // Days of week as the header
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Times (7:00 AM → 11:00 PM)
  const times = [];
  for (let hour = 7; hour <= 23; hour++) {
    let suffix = hour >= 12 ? "PM" : "AM";
    let displayHour = hour % 12 || 12;
    times.push(`${displayHour}:00 ${suffix}`);
  }

  // Build header row
  let headerHTML = `
        <div class="calendar-header">
            <div class="corner-cell"></div>
            ${days.map((day) => `<div class="day-cell">${day}</div>`).join("")}
        </div>
    `;

  // Build time rows
  let rowsHTML = times
    .map((time) => {
      return `
                <div class="time-row">
                    <div class="time-cell">${time}</div>
                    ${days
                      .map(
                        (day) =>
                          `<div class="slot-cell" data-day="${day.toLowerCase()}" data-time="${time}"></div>`
                      )
                      .join("")}
                </div>
            `;
    })
    .join("");

  container.innerHTML = headerHTML + rowsHTML;
}



/* ------------------------------------------------------------------------------------------
/* COURSE CALENDAR BLOCKS */

const COURSE_COLORS = [
  "course-color-1",
  "course-color-2",
  "course-color-3",
  "course-color-4",
  "course-color-5",
  "course-color-6",
  "course-color-7",
  "course-color-8",
  "course-color-9",
  "course-color-10",
];

function toMinutes(timeStr) {
    if (!timeStr) return null;
    const [time, meridiem] = timeStr.split(" "); 
    const [hourStr, minuteStr] = time.split(":");

    let hour = parseInt(hourStr, 10);
    let minutes = parseInt(minuteStr || "0", 10);

    if (meridiem === "PM" && hour !== 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;

    return hour * 60 + minutes;
}


// Convert 24h hour -> "10:00 AM"
function hourToLabel(hour) {
  let suffix = hour >= 12 ? "PM" : "AM";
  let displayHour = hour % 12 || 12;
  return `${displayHour}:00 ${suffix}`;
}

function clearCalendarCourses() {
    document
      .querySelectorAll(".calendar-course")
      .forEach((el) => el.remove());
}

// Render courses on calendar
function renderCoursesOnCalendar(classes = []) {
  const calendar = document.getElementById("calendar-grid");
  if (!calendar) return;

  clearCalendarCourses();

  const CAL_START_HOUR = 7
  const CAL_END_HOUR = 23;
  const CAL_START_MIN = CAL_START_HOUR * 60;
  const CAL_END_MIN = CAL_END_HOUR * 60;

  classes.forEach((course, idx) => {
    const { id, days, start, end } = course;
    if (!days || !start || !end) return;

    const colorClass = COURSE_COLORS[idx % COURSE_COLORS.length];

    const startMin = toMinutes(start);
    const endMin = toMinutes(end);
    if (startMin == null || endMin == null || endMin <= startMin) return;

    const fromMin = Math.max(startMin, CAL_START_MIN);
    const toMin = Math.min(endMin, CAL_END_MIN);
    if (toMin <= fromMin) return;

    days.forEach((day) => {
    const dayKey = day.toLowerCase();
    const totalDuration = toMin - fromMin;

    for (let h = CAL_START_HOUR; h < CAL_END_HOUR; h++) {
        const rowStart = h * 60;
        const rowEnd = (h + 1) * 60;

        const overlapStart = Math.max(fromMin, rowStart);
        const overlapEnd = Math.min(toMin, rowEnd);
        if (overlapEnd <= overlapStart) continue;

        const isFirstRowForCourse = fromMin >= rowStart && fromMin < rowEnd;
        const isLastRowForCourse  = toMin > rowStart && toMin <= rowEnd;

        let segmentType = "middle";
        if (isFirstRowForCourse && isLastRowForCourse) {
            segmentType = "single";
        } 
        else if (isFirstRowForCourse) {
            segmentType = "start";
        } 
        else if (isLastRowForCourse) {
            segmentType = "end";
        }

        if (segmentType !== "start" && segmentType !== "single") {
            continue;
        }

        const localStart = fromMin - rowStart;
        const topPct = (localStart / 60) * 100;

        const heightPct = (totalDuration / 60) * 100;

        const labelHour = h % 12 || 12;
        const meridiem = h >= 12 ? "PM" : "AM";
        const label = `${labelHour}:00 ${meridiem}`;

        const cell = calendar.querySelector(
            `.slot-cell[data-day="${dayKey}"][data-time="${label}"]`
        );
        if (!cell) continue;

        const inner = document.createElement("div");
        inner.className = `calendar-course ${colorClass}`;

        inner.style.top = `${topPct}%`;
        inner.style.height = `${heightPct}%`;
        inner.style.left = "3px";
        inner.style.right = "3px";

        inner.innerHTML = `
            <div class="calendar-course-id">${id || ""}</div>
            <div class="calendar-course-time">${start} – ${end}</div>
        `;

        cell.appendChild(inner);
    }
    });

  });
}



/* ------------------------------------------------------------------------------------------
/* COURSE CARD UI SETUP */

export function setupCourseCardUI (course, colorIndex = 0) {

    const colorClass = COURSE_COLORS[colorIndex % COURSE_COLORS.length];

  const { id, name, professor, location, days, start, end } = course;

  const daysText = Array.isArray(days) ? days.join(" & ") : days || "";

  return `
        <div class="course-card">
        <span class="course-color ${colorClass}"></span>

        <div class="course-content">
            <div class="course-header">
            <div>
                <div class="course-number">${id || ""}</div>
                <div class="course-name">${name || ""}</div>
            </div>

            <!-- X button (not wired to drop yet) -->
            <button class="course-remove-btn" data-course-id="${id || ""}">
                <span class="material-icons">close</span>
            </button>
            </div>

            <div class="course-details">
            <div class="details">
                <div class="detail-item">
                <span class="material-icons detail-icon">person</span>
                <span class="detail-text">${professor || ""}</span>
                </div>

                <div class="detail-item">
                <span class="material-icons detail-icon">access_time</span>
                <span class="detail-text">${start || ""} – ${end || ""}</span>
                </div>
            </div>

            <div class="details">
                <div class="detail-item">
                <span class="material-icons detail-icon">location_on</span>
                <span class="detail-text">${location || ""}</span>
                </div>

                <div class="detail-item">
                <span class="material-icons detail-icon">calendar_today</span>
                <span class="detail-text">${daysText}</span>
                </div>
            </div>
            </div>
        </div>
        </div>
    `;
}



/* ------------------------------------------------------------------------------------------
/* LOAD SCHEDULED COURSES */

export async function loadScheduleCourses() {
  const container = document.getElementById("courses-list");
  const titleEl = document.getElementById("courses-title");
  if (!container) return;

  container.innerHTML = "<p class='empty-courses'>Loading your courses...</p>";

  try {
    const userId = getCurrentUserId();
    const semester = currentSemester || DEFAULT_SEMESTER;

    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);
    if (semester) params.set("semester", semester);

    const res = await fetch(
      `http://localhost:3001/api/schedule?${params.toString()}`
    );
    if (!res.ok) throw new Error("Failed to fetch schedule");

    const data = await res.json();
    const { classes } = data;

    if (titleEl && semester) {
      titleEl.textContent = `${semester} Courses`;
    }

    if (!classes || !classes.length) {
      container.innerHTML =
        "<p class='empty-courses'>You don't have any courses in your schedule yet.</p>";
      clearCalendarCourses();
      return;
    }

    const cardsHTML = classes
      .map((course, idx) => setupCourseCardUI(course, idx))
      .join("");

    container.innerHTML = cardsHTML;

    const removeButtons = container.querySelectorAll(".course-remove-btn");
    removeButtons.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const courseId = btn.dataset.courseId;
        if (!courseId) return;

        openDropCourseModal(courseId);
      });
    });

    renderCoursesOnCalendar(classes);
  } catch (err) {
    console.error("loadScheduleCourses error:", err);
    container.innerHTML =
      "<p class='empty-courses'>Sorry, we couldn't load your courses.</p>";
  }
}




/* ------------------------------------------------------------------------------------------
/* EXPORTING SCHEDULE PAGE */

export function SchedulePage() {
  generateCalendar();
  setupSemesterMenuUI();
  setupAddCourseModal();
  setupDropCourseModal();
}
