import { Session } from "../Models/DB.js";

export async function findSessionBySessionId(sessionId, projection = null, options = {}) {
  return Session.findOne({ sessionId }, projection, options).lean();
}

export async function findActiveSessionBySessionId(sessionId, projection = null, options = {}) {
  return Session.findOne({ sessionId, isActive: true }, projection, options).lean();
}

export async function findSessionsByUserId(userId, filter = {}, projection = null, options = {}) {
  return Session.find({ userId, ...filter }, projection, options).lean();
}

export async function createSession(payload) {
  const created = await Session.create(payload);
  return created.toObject();
}

export async function deactivateActiveSessionsByUserId(userId, endedAt = new Date()) {
  return Session.updateMany(
    { userId, isActive: true },
    { $set: { isActive: false, endedAt } }
  );
}

export async function updateSessionBySessionId(sessionId, update, options = {}) {
  return Session.findOneAndUpdate({ sessionId }, update, { new: true, ...options }).lean();
}
