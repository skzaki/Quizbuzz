import slugify from "slugify";
import mongoose from "mongoose";

const CONTEST_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "UPCOMING",
  "LIVE",
  "COMPLETED",
  "CANCELLED"
];

const contestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, immutable: true, trim: true },
    description: { type: String, default: "" },
    details: { type: String },
    topics: [{ type: String }],
    topicRefs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Domain" }],
    domainDistribution: [
      {
        name: { type: String, required: true },
        domainRef: { type: mongoose.Schema.Types.ObjectId, ref: "Domain" },
        percentage: { type: Number, required: true, min: 1, max: 100 },
        difficulty: {
          easy: { type: Number, required: true, min: 0, max: 100, default: 40 },
          medium: { type: Number, required: true, min: 0, max: 100, default: 40 },
          hard: { type: Number, required: true, min: 0, max: 100, default: 20 }
        }
      }
    ],
    rules: [{ type: String }],
    questionBank: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question", alias: "QuestionBank" }],
    registerFee: { type: Number, required: true, min: 0 },
    maxParticipants: { type: Number, min: 0, default: 100 },
    duration: { type: Number, required: true, min: 1 },
    cutOff: { type: Number, min: 0 },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true, alias: "deadline" },
    status: {
      type: String,
      enum: CONTEST_STATUSES,
      default: "DRAFT",
      index: true,
      set: (value) => (typeof value === "string" ? value.toUpperCase() : value)
    },
    prizes: [
      {
        rankFrom: { type: Number, required: true },
        rankTo: { type: Number, required: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: "INR" },
        benefits: [{ type: String }]
      }
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

contestSchema.index({ slug: 1 }, { unique: true });
contestSchema.index({ startTime: 1, isDeleted: 1 });
contestSchema.index({ endTime: 1, isDeleted: 1 });
contestSchema.index({ status: 1, isDeleted: 1 });
contestSchema.index({ topicRefs: 1, isDeleted: 1 });
contestSchema.index({ "domainDistribution.domainRef": 1, isDeleted: 1 });
contestSchema.index({ isDeleted: 1, createdAt: -1 });
contestSchema.index({ isDeleted: 1, status: 1, startTime: 1 });

contestSchema.pre("validate", async function () {
  if (!this.title || this.slug) return;

  const baseSlug = slugify(this.title, { lower: true, strict: true }) || "contest";
  let nextSlug = baseSlug;
  let suffix = 2;

  while (await this.constructor.exists({ slug: nextSlug, _id: { $ne: this._id } })) {
    nextSlug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  this.slug = nextSlug;
});

export const Contest = mongoose.models.Contest || mongoose.model("Contest", contestSchema);
