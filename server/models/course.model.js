import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    id: {
      // e.g. "ENGR110"
      type: String,
      required: true,
      unique: true,
    },
    name: { type: String, required: true },
    professor: { type: String, required: true },
    location: { type: String, required: true },

    // which semester this section is offered
    semester: {
      type: String,
      enum: ["Fall 2025", "Winter 2026", "Spring 2026"],
      default: "Fall 2025",
    },

    days: {
      type: [String], // ["Mon", "Wed"]
      default: [],
    },
    start: { type: String, required: true }, // keep as string for now
    end: { type: String, required: true },
  },
  { timestamps: true }
);

const Course = mongoose.model("Course", courseSchema);
export default Course;
