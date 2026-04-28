import { User } from "../Models/DB.js";

export async function findUserById(userId, projection = null, options = {}) {
  return User.findById(userId, projection, options).lean();
}

export async function findById(userId, projection = null, options = {}) {
  return User.findById(userId, projection, options).lean();
}

export async function findUserByEmail(email, projection = null, options = {}) {
  return User.findOne({ email }, projection, options).lean();
}

export async function findActiveUserByEmail(email, projection = null, options = {}) {
  return User.findOne({ email, isDeleted: false }, projection, options).lean();
}

export async function findUserByFilter(filter, projection = null, options = {}) {
  return User.findOne(filter, projection, options).lean();
}

export async function createUser(payload) {
  const created = await User.create(payload);
  return created.toObject();
}

export async function updateUserById(userId, update, options = {}) {
  return User.findByIdAndUpdate(userId, update, { new: true, ...options }).lean();
}
