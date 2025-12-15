import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import Conversation from "./models/conversation.model.js";
import User from "./models/user.model.js";
import Course from "./models/course.model.js";
import StudentSchedule from "./models/studentSchedule.model.js";
import Task from "./models/task.model.js";


const DEMO_USER_ID = "demo-student-001";

function getUserIdFromRequest(req) {
  return req.body.userId || req.query.userId || DEMO_USER_ID;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- Gemini setup ---
if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is missing in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Test route
app.get("/", (req, res) => {
  res.send("Express + Gemini server is running");
});

// Chat route
// Chat route
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, conversationId, userId } = req.body;
    if (!userId) {
      return res.status(401).json({ error: "userId required" });
    }

    const effectiveUserId = userId; // no more demo fallback

    let convo = null;
    if (conversationId) {
      convo = await Conversation.findOne({
        _id: conversationId,
        userId: effectiveUserId,
      });
    }

    if (!convo) {
      const shortTitle =
        message.length > 40
          ? message.slice(0, 37) + "..."
          : message || "New Chat";

      convo = new Conversation({
        userId: effectiveUserId,
        title: shortTitle,
        messages: [],
      });
    }

    // Add the current user message to the conversation
    convo.messages.push({ role: "user", content: message });

    // Load all available courses from Mongo
    const classesCatalog = await Course.find({}).lean();

    // Load this student's schedule from Mongo
    const currentSchedule = await StudentSchedule.findOne({
      userId: effectiveUserId,
      semester: "Fall 2025", // TODO: make this dynamic
    }).lean();

    // Build student's enrolled classes as full course objects (case/format-insensitive)
    let studentClasses = [];
    if (currentSchedule && currentSchedule.classes?.length) {
      const enrolledIdSet = new Set(
        currentSchedule.classes.map((id) => normalizeCourseId(id))
      );

      studentClasses = classesCatalog.filter((c) =>
        enrolledIdSet.has(normalizeCourseId(c.id))
      );
    }

    // ------------------------------------------------------------
    // 2) Build the Gemini prompt
    // ------------------------------------------------------------
    const systemPrompt = `
You are a thoughtful, friendly schedule assistant. You're helpful and conversational, like a peer advisor who genuinely wants to help students succeed.

AVAILABLE DATA:
- Full course catalog: ${JSON.stringify(classesCatalog, null, 2)}
- Student's enrolled classes: ${JSON.stringify(studentClasses, null, 2)}

CRITICAL CONTEXT AWARENESS:
Before responding, ALWAYS analyze the situation:

1. EMPTY SCHEDULE DETECTION:
   - If studentClasses is an empty array [] and the user asks "show my schedule" or "show my classes":
     * DO NOT show an empty table with just headers
     * Instead respond: "You're not enrolled in any classes yet. Would you like to see what's available, or add a class to your schedule?"
   - If they ask "what classes do I have" with an empty schedule:
     * Say: "You don't have any classes yet. Want me to show you what's available this semester?"

2. DISTINGUISH BETWEEN ENROLLED vs CATALOG:
   - "my classes" / "my schedule" / "what I'm taking" = ONLY their enrolled classes (studentClasses)
   - "available classes" / "what classes are there" / "what can I take" / "show all classes" = full catalog
   - If they ask for "my classes" but studentClasses is empty, offer to show the catalog instead

3. CONFLICT DETECTION:
   - When suggesting classes or study times, check for conflicts with their enrolled schedule
   - Be specific: "That would overlap with your ENGR110 class on Monday at 10:00 AM"
   - If they want to add a class that conflicts, explain clearly and suggest alternatives

4. CLASS RECOMMENDATIONS:
   - When recommending classes, consider what they're already taking
   - Look for complementary subjects or times that don't conflict
   - Mention if a class would balance their schedule well

PERSONALITY & TONE:
- Be friendly and conversational, but still professional
- Use natural language - avoid sounding robotic or overly formal
- Show you understand their situation contextually
  * "Since you're just starting to build your schedule..."
  * "With ENGR110 and MATH251 already, you might want..."
  * "That's a solid foundation for a CS major!"
- Ask clarifying questions when needed, but don't overdo it
- Use encouraging language naturally ("Great choice!", "That works perfectly!", "Good thinking!")
- Be thoughtful - take a moment to really consider what would help them most

RESPONSE EXAMPLES:
- Greetings: "Hi! I'm here to help you build your schedule, find classes, and manage your time. What would you like to work on?"
- Vague requests: "Just to make sure I help you with the right thing - do you mean your currently enrolled classes, or would you like to see all available classes?"
- Errors: "Hmm, I couldn't find that course code. Could you double-check the spelling? Or I can show you what's available if that helps!"
- Empty schedule: "You're not enrolled in any classes yet. Would you like to see what's available, or do you have a specific course in mind?"

TABLE FORMAT RULES (IMPORTANT):
When showing classes, use this exact format:

[Contextual intro sentence that acknowledges their situation]
<table> ... </table>

[Optional: ONE brief helpful follow-up sentence]

Good intro sentence examples:
- "Here's your current schedule:" (when they have enrolled classes)
- "Here are all the classes available this semester:" (when showing full catalog)
- "These classes fit well with your current schedule:" (when filtering for non-conflicts)
- "I found these classes based on your search:" (when they searched for something specific)
- "Here are some Computer Science classes that might interest you:" (when making recommendations)

Table structure (use this EXACT HTML):
<table>
<tr>
    <th>Course</th>
    <th>Name</th>
    <th>Days</th>
    <th>Time</th>
    <th>Location</th>
</tr>
<tr>
    <td>ENGR110</td>
    <td>Introduction to Engineering Design</td>
    <td>Mon & Wed</td>
    <td>10:00 AM – 11:15 AM</td>
    <td>ELC Room 204</td>
</tr>
</table>

ABSOLUTE RULES:
- NEVER show a table with just headers and no data rows
- Do NOT wrap tables in backticks, markdown code blocks, or quotes
- After the table, you MAY add ONE brief sentence if it would be helpful (like "Let me know if you'd like to add any of these!")
- IMPORTANT: If you add text after the table, put a blank line between the </table> and your text for proper spacing
- Keep that follow-up short - the table should be the main focus
- Always check if studentClasses is empty before deciding what to show
`;
    const historyText = (history || [])
      .map((h) => `${h.role.toUpperCase()}: ${h.content}`)
      .join("\n");

    const fullPrompt = `
${systemPrompt}

CHAT SO FAR:
${historyText}

USER: ${message}
    `;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const replyText = response.text();

    // ------------------------------------------------------------
    // 3) Save assistant reply to conversation
    // ------------------------------------------------------------
    convo.messages.push({ role: "assistant", content: replyText });
    await convo.save();

    // Send reply + conversationId back
    res.json({
      reply: replyText,
      conversationId: convo._id.toString(),
    });
  } catch (err) {
    console.error("Error in /api/chat:", err);
    res.status(500).json({ error: "Failed to contact Gemini API" });
  }
});

// -----------------------------------------------------------------------------
// Get list of conversations (for sidebar history)
// -----------------------------------------------------------------------------
app.get("/api/conversations", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(401).json({ error: "userId required" });

  const convos = await Conversation.find({ userId }, "title updatedAt")
    .sort({ updatedAt: -1 })
    .lean();

  res.json(
    convos.map((c) => ({
      id: c._id.toString(),
      title: c.title,
      updatedAt: c.updatedAt,
    }))
  );
});

// -----------------------------------------------------------------------------
// Get a single conversation's messages
// -----------------------------------------------------------------------------
app.get("/api/conversations/:id", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(401).json({ error: "userId required" });

  const convo = await Conversation.findOne({
    _id: req.params.id,
    userId,
  });
  if (!convo) return res.status(404).json({ error: "Conversation not found" });

  res.json({
    id: convo._id.toString(),
    title: convo.title,
    messages: convo.messages,
  });
});

// -----------------------------------------------------------------------------
// Delete a conversation
// -----------------------------------------------------------------------------

app.delete("/api/conversations/:id", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(401).json({ error: "userId required" });

  const deleted = await Conversation.findOneAndDelete({
    _id: req.params.id,
    userId,
  });

  if (!deleted)
    return res.status(404).json({ error: "Conversation not found" });
  res.status(204).send();
});

// -----------------------------------------------------------------------------
// Helper: build a consistent schedule response with full course objects
// -----------------------------------------------------------------------------
function normalizeCourseId(id) {
  return (id || "").toString().trim().toUpperCase();
}

async function buildScheduleResponse(userId, semester = "Fall 2025") {
  const classesCatalog = await Course.find({}).lean();

  const schedule = await StudentSchedule.findOne({
    userId,
    semester,
  }).lean();

  if (!schedule) {
    return {
      semester,
      classes: [],
    };
  }

  const idSet = new Set(
    (schedule.classes || []).map((id) => normalizeCourseId(id))
  );

  // Only include courses matching IDs AND the selected semester
  const enrolledCourses = classesCatalog.filter(
    (c) =>
      idSet.has(normalizeCourseId(c.id)) &&
      (c.semester === semester || !c.semester) // tolerate missing semester
  );

  return {
    semester: schedule.semester || semester,
    classes: enrolledCourses,
  };
}


// -----------------------------------------------------------------------------
// Get the current student's schedule (with full course details)
// -----------------------------------------------------------------------------
app.get("/api/schedule", async (req, res) => {
  try {
    const effectiveUserId = req.query.userId || DEMO_USER_ID;
    const semester = req.query.semester || "Fall 2025";

    const payload = await buildScheduleResponse(effectiveUserId, semester);
    res.json(payload);
  } catch (err) {
    console.error("Error in GET /api/schedule:", err);
    res.status(500).json({ error: "Failed to load schedule" });
  }
});


// -----------------------------------------------------------------------------
// Add a course to the student's schedule
// -----------------------------------------------------------------------------
app.post("/api/schedule/add", async (req, res) => {
  try {
    let { courseId, semester = "Fall 2025", userId } = req.body;
    const effectiveUserId = userId || DEMO_USER_ID;

    if (!courseId) {
      return res.status(400).json({ error: "courseId is required" });
    }

    // 1) Normalize user input to uppercase, no spaces changed
    const normalizedId = normalizeCourseId(courseId); // e.g. "math301" -> "MATH301"

    // 2) Look for a course with *exactly* that id in Mongo
    const course = await Course.findOne({ id: normalizedId });

    if (!course) {
      console.log(
        "Known course IDs:",
        (await Course.find({}, "id")).map((c) => c.id)
      );
      console.log("User tried to add:", courseId, "→", normalizedId);

      return res
        .status(404)
        .json({ error: `Course '${normalizedId}' was not found.` });
    }

    // 3) Check if student already has this course in their schedule
    let scheduleDoc = await StudentSchedule.findOne({
      userId: effectiveUserId,
      semester,
    });

    if (
      scheduleDoc &&
      (scheduleDoc.classes || []).some(
        (id) => normalizeCourseId(id) === normalizedId
      )
    ) {
      return res
        .status(409)
        .json({ error: "Course already added to your schedule." });
    }

    // 4) Store that uppercase ID in the schedule
    await StudentSchedule.findOneAndUpdate(
      { userId: effectiveUserId, semester },
      { $addToSet: { classes: normalizedId } },
      { new: true, upsert: true }
    );

    // 5) Return full schedule
    const payload = await buildScheduleResponse(effectiveUserId, semester);
    res.json(payload);
  } catch (err) {
    console.error("Error in POST /api/schedule/add:", err);
    res.status(500).json({ error: "Failed to add course" });
  }
});

// -----------------------------------------------------------------------------
// Drop a course from the student's schedule
// -----------------------------------------------------------------------------
app.post("/api/schedule/drop", async (req, res) => {
  try {
    let { courseId, semester = "Fall 2025", userId } = req.body;
    const effectiveUserId = userId || DEMO_USER_ID;

    if (!courseId) {
      return res.status(400).json({ error: "courseId is required" });
    }

    const normalizedId = normalizeCourseId(courseId);

    await StudentSchedule.findOneAndUpdate(
      { userId: effectiveUserId, semester },
      { $pull: { classes: normalizedId } },
      { new: true }
    );

    const payload = await buildScheduleResponse(effectiveUserId, semester);
    res.json(payload);
  } catch (err) {
    console.error("Error in POST /api/schedule/drop:", err);
    res.status(500).json({ error: "Failed to drop course" });
  }
});

// -----------------------------------------------------------------------------
// AUTH: Helper function to generate unique 7-digit student ID
// -----------------------------------------------------------------------------
async function generateUniqueStudentId() {
  let studentId;
  let exists = true;

  while (exists) {
    // Generate random 7-digit number (1000000 - 9999999)
    studentId = Math.floor(1000000 + Math.random() * 9000000).toString();

    // Check if this ID already exists
    const existingUser = await User.findOne({ studentId });
    exists = !!existingUser;
  }

  return studentId;
}

// -----------------------------------------------------------------------------
// AUTH: Sign up
// -----------------------------------------------------------------------------
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { firstName, lastName, email, password, major, minor } = req.body;

    if (!firstName || !lastName || !email || !password || !major) {
      return res
        .status(400)
        .json({ error: "All required fields must be filled." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res
        .status(409)
        .json({ error: "An account with this email already exists." });
    }

    const hashed = await bcrypt.hash(password, 10);

    // Generate unique student ID
    const studentId = await generateUniqueStudentId();

    const user = await User.create({
      email: normalizedEmail,
      password: hashed,
      name: `${firstName} ${lastName}`.trim(),
      studentId: studentId,
      major: major,
      minor: minor || null,
    });

    // Optionally create an empty schedule for this user
    await StudentSchedule.create({
      userId: user._id.toString(),
      semester: "Fall 2025",
      classes: [],
    });

    return res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        studentId: user.studentId,
        major: user.major,
        minor: user.minor,
      },
    });
  } catch (err) {
    console.error("Error in /api/auth/signup:", err);
    return res.status(500).json({ error: "Failed to create account." });
  }
});
// -----------------------------------------------------------------------------
// AUTH: Log in
// -----------------------------------------------------------------------------
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Support both hashed & (older) plain text passwords
    let passwordMatches = false;
    if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$")) {
      passwordMatches = await bcrypt.compare(password, user.password);
    } else {
      // legacy plain-text (only if you already had some test users)
      passwordMatches = password === user.password;
    }

    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    return res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        studentId: user.studentId,
        major: user.major,
        minor: user.minor,
      },
    });
  } catch (err) {
    console.error("Error in /api/auth/login:", err);
    return res.status(500).json({ error: "Failed to log in." });
  }
});

// -----------------------------------------------------------------------------
// Update user profile (name, email)
// -----------------------------------------------------------------------------
app.patch("/api/user/profile", async (req, res) => {
  try {
    const { userId, name, email } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "userId required" });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) {
      // Check if email is already taken by another user
      const existing = await User.findOne({
        email: email.toLowerCase().trim(),
        _id: { $ne: userId },
      });

      if (existing) {
        return res.status(409).json({ error: "Email already in use" });
      }

      updateData.email = email.toLowerCase().trim();
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      select: "name email _id",
    });

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
      },
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

// -----------------------------------------------------------------------------
// Update user academic info (major, minor, studentId)
// -----------------------------------------------------------------------------
app.patch("/api/user/academic", async (req, res) => {
  try {
    const { userId, major, minor, studentId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "userId required" });
    }

    const updateData = {};
    if (major !== undefined) updateData.major = major;
    if (minor !== undefined) updateData.minor = minor;
    if (studentId !== undefined) updateData.studentId = studentId;

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      select: "major minor studentId",
    });

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      major: updatedUser.major,
      minor: updatedUser.minor,
      studentId: updatedUser.studentId,
    });
  } catch (err) {
    console.error("Error updating academic info:", err);
    return res.status(500).json({ error: "Failed to update academic info" });
  }
});

// -----------------------------------------------------------------------------
// Update user password
// -----------------------------------------------------------------------------
app.patch("/api/user/password", async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "userId required" });
    }

    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    // Hash the new password
    const hashed = await bcrypt.hash(password, 10);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { password: hashed },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error updating password:", err);
    return res.status(500).json({ error: "Failed to update password" });
  }
});

// -----------------------------------------------------------------------------
// TASKS: Get tasks for the student's current schedule
// -----------------------------------------------------------------------------
app.get("/api/tasks/by-schedule", async (req, res) => {
  try {
    const userId = req.query.userId || DEMO_USER_ID;
    const semester = req.query.semester || "Fall 2025";

    const schedule = await StudentSchedule.findOne({ userId, semester }).lean();

    if (!schedule || !schedule.classes || schedule.classes.length === 0) {
      return res.json({ semester, tasks: [] });
    }

    const courseIds = (schedule.classes || []).map((id) =>
      normalizeCourseId(id)
    );

    const tasks = await Task.find({
      courseId: { $in: courseIds },
      semester,
    })
      .sort({ dueDate: 1 })
      .lean();

    if (tasks.length === 0) {
      return res.json({ semester, tasks: [] });
    }

    const taskIds = tasks.map((t) => t._id);
    const progressDocs = await TaskProgress.find({
      userId,
      taskId: { $in: taskIds },
    }).lean();

    const progressByTaskId = new Map(
      progressDocs.map((p) => [p.taskId.toString(), p.status])
    );

    const enriched = tasks.map((t) => ({
      ...t,
      status: progressByTaskId.get(t._id.toString()) || "not_started",
    }));

    return res.json({ semester, tasks: enriched });
  } catch (err) {
    console.error("Error in GET /api/tasks/by-schedule:", err);
    return res.status(500).json({ error: "Failed to load tasks" });
  }
});


// -----------------------------------------------------------------------------
// TASKS: Update status for a single task (per user)
// -----------------------------------------------------------------------------
app.patch("/api/tasks/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, status } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "userId required" });
    }

    if (!["not_started", "in_progress", "completed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    // ensure the task exists
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    await TaskProgress.findOneAndUpdate(
      { userId, taskId: id },
      { status },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("Error in PATCH /api/tasks/:id/status:", err);
    return res.status(500).json({ error: "Failed to update task status" });
  }
});

// add all api endpoints above this line
const PORT = process.env.PORT || 3001;

// Make sure MONGO_URL exists
if (!process.env.MONGO_URL) {
  console.error("MONGO_URL is missing in .env");
  process.exit(1);
}

// Connect to MongoDB and seed JSON to Mongo
mongoose
  .connect(process.env.MONGO_URL)
  .then(async () => {
    console.log("Connected to MongoDB");
    
const tasksPath = path.join(__dirname, "json", "tasks.json");

    if (fs.existsSync(tasksPath)) {
      const existingTasks = await Task.countDocuments();

      if (existingTasks === 0) {
        const tasksData = JSON.parse(fs.readFileSync(tasksPath, "utf-8"));
        await Task.insertMany(tasksData);
        console.log(`✅ Seeded ${tasksData.length} tasks into MongoDB`);
      } else {
        console.log("ℹ️ Tasks already exist in MongoDB, skipping seed.");
      }
    } else {
      console.log("⚠️ tasks.json NOT FOUND at:", tasksPath);
    }
    
    // Create a dummy account if not existing
    let demoUser = await User.findOne({ email: "demo@chat.com" });

    if (!demoUser) {
      const hashed = await bcrypt.hash("password", 10);

      // Generate a student ID for demo user
      const demoStudentId = "1000000"; // Fixed ID for demo user

      demoUser = await User.create({
        email: "demo@chat.com",
        password: hashed,
        name: "Demo User",
        studentId: demoStudentId,
        major: "Computer Science",
        minor: null,
      });
      console.log("Created demo user:", demoUser._id.toString());
    }

    // Seed catalog and student schedule from JSON (only if needed)
    const catalogPath = path.join(__dirname, "json", "course_catalog.json");
    const studentPath = path.join(__dirname, "json", "student_schedule.json");
    

    const existingCourseCount = await Course.countDocuments();
    if (existingCourseCount === 0) {
      const catalogData = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
      await Course.insertMany(catalogData);
      console.log(`Seeded ${catalogData.length} courses into MongoDB`);
    }
    
    // Seed tasks if none exist
const existingTaskCount = await Task.countDocuments();

if (existingTaskCount === 0) {
  const tasksData = JSON.parse(fs.readFileSync(tasksPath, "utf-8"));
  await Task.insertMany(tasksData);
  console.log(`Seeded ${tasksData.length} tasks into MongoDB`);
}

    const studentJson = JSON.parse(fs.readFileSync(studentPath, "utf-8"));

    let scheduleDoc = await StudentSchedule.findOne({
      userId: DEMO_USER_ID,
      semester: studentJson.semester,
    });

    if (!scheduleDoc) {
      scheduleDoc = await StudentSchedule.create({
        userId: DEMO_USER_ID,
        semester: studentJson.semester,
        classes: studentJson.classes,
      });
      console.log(`Created schedule for demo user ${DEMO_USER_ID}`);
    }

    // Now start server
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });
