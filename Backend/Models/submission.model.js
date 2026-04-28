import mongoose from "mongoose";

const submissionAnswerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    answerIndex: { type: Number, required: true },
    answeredAt: { type: Date, default: Date.now },
    answer: { type: String, default: "" },
    isCorrect: { type: Boolean, default: false },
    correctAnswer: { type: String, default: "" },
    submittedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const evaluatedAnswerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    answerIndex: { type: Number, required: true },
    isCorrect: { type: Boolean, default: false },
    correctOptionIndex: { type: Number, required: true }
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    contestId: { type: mongoose.Schema.Types.ObjectId, ref: "Contest", required: true },
    answers: { type: [submissionAnswerSchema], default: [] },
    evaluatedAnswers: { type: [evaluatedAnswerSchema], default: [] },
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["SUBMITTED", "EVALUATING", "EVALUATED", "FAILED"],
      default: "SUBMITTED"
    },
    submittedAt: { type: Date, default: Date.now },
    evaluatedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

submissionSchema.index({ userId: 1, contestId: 1 }, { unique: true });
submissionSchema.index({ contestId: 1, score: -1 });

export const Submission = mongoose.models.Submission || mongoose.model("Submission", submissionSchema);