import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    contestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      required: true,
      index: true
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    razorpayPaymentId: {
      type: String,
      default: null,
      trim: true
    },
    razorpaySignature: {
      type: String,
      default: null,
      trim: true
    },
    // Always stored in paise. Divide by 100 for display. Never store rupees.
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["PENDING", "CAPTURED", "FAILED", "REFUNDED"],
      default: "PENDING",
      set: (value) => (typeof value === "string" ? value.toUpperCase() : value)
    },
    receipt: {
      type: String,
      trim: true,
      maxlength: 40,
      default: ""
    },
    failReason: {
      type: String,
      default: null
    },
    webhookProcessedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

paymentSchema.index({ razorpayOrderId: 1 }, { unique: true });
paymentSchema.index({ userId: 1, contestId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

paymentSchema.virtual("userRef", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true
});

paymentSchema.virtual("contestRef", {
  ref: "Contest",
  localField: "contestId",
  foreignField: "_id",
  justOne: true
});

paymentSchema.virtual("orderId").get(function getOrderId() {
  return this.razorpayOrderId;
}).set(function setOrderId(value) {
  this.razorpayOrderId = value;
});

paymentSchema.virtual("paymentId").get(function getPaymentId() {
  return this.razorpayPaymentId;
}).set(function setPaymentId(value) {
  this.razorpayPaymentId = value;
});

paymentSchema.virtual("signature").get(function getSignature() {
  return this.razorpaySignature;
}).set(function setSignature(value) {
  this.razorpaySignature = value;
});

paymentSchema.set("toJSON", { virtuals: true });
paymentSchema.set("toObject", { virtuals: true });

export const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);