/* ------------------------------------------------------------------------------------------
/* WELCOME SETUP */

const suggestedTasks = [
  { text: "Show my weekly schedule", icon: "event" },
  { text: "Add a new class", icon: "add" },
  { text: "Drop a class", icon: "remove" },
  { text: "Recommend classes", icon: "auto_awesome" },
];

export function setupWelcomePage(onPromptClick) {
    const welcomePage = document.getElementById("page-welcome");
    if (!welcomePage) return;

    const container = document.getElementById("suggested-prompts");
    if (!container) return;

    container.innerHTML = "";

    suggestedTasks.forEach((task) => {
        const btn = document.createElement("button");
        btn.classList.add("suggested-btn");

        btn.innerHTML = `
            <div class="icon-box">
                <span class="material-icons">${task.icon}</span>
            </div>
            <span>${task.text}</span>
        `;

        btn.addEventListener("click", () => {
            if (typeof onPromptClick === "function") {
                onPromptClick(task.text);
            }
        });

        container.appendChild(btn);
    });
}
