import express from "express";
import Task from "../models/task.model.js";

const router = express.Router();

// TEMP DEMO USER (replace with req.user.id when auth is wired)
const DEMO_USER_ID = "demo-user-001";

/**
 * GET all tasks for logged in user
 * /api/tasks
 */
router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find({ userId: DEMO_USER_ID }).sort({ dueDate: 1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

/**
 * GET tasks by course
 * /api/tasks/course/:courseId
 */
router.get("/course/:courseId", async (req, res) => {
  try {
    const tasks = await Task.find({
      userId: DEMO_USER_ID,
      courseId: req.params.courseId,
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch course tasks" });
  }
});

/**
 * POST create new task
 * /api/tasks
 */
router.post("/", async (req, res) => {
  try {
    const newTask = await Task.create({
      ...req.body,
      userId: DEMO_USER_ID,
    });

    res.status(201).json(newTask);
  } catch (err) {
    res.status(400).json({ error: "Failed to create task" });
  }
});

/**
 * PATCH update task
 * /api/tasks/:id
 */
router.patch("/:id", async (req, res) => {
  try {
    const updated = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: "Failed to update task" });
  }
});

/**
 * DELETE task
 * /api/tasks/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Failed to delete task" });
  }
});

export default router;
