import { Payment } from "../Models/DB.js";

export async function findById(paymentId) {
  return Payment.findById(paymentId)
    .populate("userRef", "firstName lastName email phone registrationId")
    .populate("contestRef", "title slug startTime")
    .lean();
}