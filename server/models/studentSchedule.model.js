import mongoose from "mongoose";

const studentScheduleSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // for now, "demo-student-001"
      required: true,
    },
    semester: {
      type: String, // e.g. "Fall 2025"
      required: true,
    },
    classes: {
      type: [String], // array of course IDs like ["ENGR110", ...]
      default: [],
    },
  },
  { timestamps: true }
);

const StudentSchedule = mongoose.model(
  "StudentSchedule",
  studentScheduleSchema
);
export default StudentSchedule;
