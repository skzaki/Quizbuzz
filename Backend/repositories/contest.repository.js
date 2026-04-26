import { Contest } from "../Models/DB.js";

export async function findBySlug(slug) {
  return Contest.findOne({ slug, isDeleted: false }).lean();
}

export async function findById(id) {
  return Contest.findOne({ _id: id, isDeleted: false }).lean();
}

export async function create(data) {
  const created = await Contest.create(data);
  return created.toObject();
}

export async function update(id, data) {
  return Contest.findByIdAndUpdate(id, data, { new: true }).lean();
}

export async function softDelete(id) {
  return Contest.findByIdAndUpdate(id, { isDeleted: true }, { new: true }).lean();
}

export async function updateStatus(id, status) {
  return Contest.findByIdAndUpdate(id, { status }, { new: true }).lean();
}

export async function pushQuestions(id, questionIds = []) {
  return Contest.findByIdAndUpdate(
    id,
    { $addToSet: { questionBank: { $each: questionIds } } },
    { new: true }
  ).lean();
}

export async function findPaginated({
  page = 1,
  limit = 10,
  search,
  status,
  sortBy = "createdAt",
  sortOrder = "desc"
} = {}) {
  const pageNum = Number(page) > 0 ? Number(page) : 1;
  const limitNum = Number(limit) > 0 ? Number(limit) : 10;
  const skip = (pageNum - 1) * limitNum;

  const query = { isDeleted: false };

  if (search) {
    query.title = { $regex: search, $options: "i" };
  }

  if (status) {
    query.status = status;
  }

  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  const [contests, total] = await Promise.all([
    Contest.find(query).sort(sort).skip(skip).limit(limitNum).lean(),
    Contest.countDocuments(query)
  ]);

  return { contests, total };
}
