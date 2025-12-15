// models/taskProgress.model.js
import mongoose from "mongoose";

const taskProgressSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
    },
  },
  { timestamps: true }
);

// one progress row per (user, task)
taskProgressSchema.index({ userId: 1, taskId: 1 }, { unique: true });

const TaskProgress = mongoose.model("TaskProgress", taskProgressSchema);
export default TaskProgress;
