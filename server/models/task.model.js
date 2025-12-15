// models/task.model.js
import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    courseId: { type: String, required: true }, // e.g. "ENGR110"
    title: { type: String, required: true },    // e.g. "Homework 1"
    type: {
      type: String,
      enum: ["homework", "classwork", "assessment"],
      required: true,
    },
    semester: { type: String, required: true }, // e.g. "Fall 2025"
    dueDate: { type: Date, required: true },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    description: { type: String },
  },
  { timestamps: true }
);

const Task = mongoose.model("Task", taskSchema);
export default Task;
