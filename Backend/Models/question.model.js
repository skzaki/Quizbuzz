import mongoose from "mongoose";

const questionOptionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    index: { type: Number, required: true, min: 0, max: 3 }
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    questionText: { type: String, required: true, trim: true },
    domain: { type: String, trim: true, index: true },
    domainRef: { type: mongoose.Schema.Types.ObjectId, ref: "Domain", index: true, default: null },
    options: {
      type: [questionOptionSchema],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length === 4;
        },
        message: "options must contain exactly 4 items"
      }
    },
    correctOptionIndex: { type: Number, required: true, min: 0, max: 3 },
    correctOptionText: { type: String, trim: true },
    difficulty: {
      type: String,
      enum: ["EASY", "MEDIUM", "HARD"],
      default: "MEDIUM",
      set: (value) => String(value || "MEDIUM").toUpperCase()
    },
    tags: { type: [String], default: [] },
    hint: { type: String, default: "" },
    explanation: { type: String, default: "" },
    contestId: { type: mongoose.Schema.Types.ObjectId, ref: "Contest", default: null, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    isDeleted: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

questionSchema.index({ difficulty: 1 });
questionSchema.index({ domain: 1, difficulty: 1, isDeleted: 1 });
questionSchema.index({ domainRef: 1, difficulty: 1, isDeleted: 1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ contestId: 1 });
questionSchema.index({ isDeleted: 1 });
questionSchema.index({ questionText: "text", hint: "text", explanation: "text", tags: "text" });

const normalizeDifficultyFilter = (query) => {
  if (query?.difficulty && typeof query.difficulty === "string") {
    query.difficulty = query.difficulty.toUpperCase();
  }

  return query;
};

questionSchema.pre(["find", "findOne", "findOneAndUpdate", "countDocuments", "updateMany", "updateOne"], function (next) {
  normalizeDifficultyFilter(this.getQuery());
  next();
});

questionSchema.pre("validate", function (next) {
  if (!Array.isArray(this.options) || this.options.length !== 4) {
    return next(new Error("options must contain exactly 4 items"));
  }

  const normalizedOptions = this.options.map((option, index) => ({
    text: typeof option === "string" ? option : option?.text,
    index: typeof option === "object" && option !== null && option.index !== undefined ? option.index : index
  }));

  this.options = normalizedOptions;

  if (this.correctOptionIndex < 0 || this.correctOptionIndex > 3) {
    return next(new Error("correctOptionIndex must be between 0 and 3"));
  }

  const correctOption = this.options[this.correctOptionIndex];
  if (correctOption) {
    this.correctOptionText = correctOption.text;
  }

  next();
});

export const Question = mongoose.models.Question || mongoose.model("Question", questionSchema);