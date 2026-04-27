import * as questionService from "../services/question.service.js";

export const getAll = async (req, res, next) => {
  try {
    const result = await questionService.getQuestionsForAdmin(req.query);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const result = await questionService.create(req.user.userId, req.body);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const result = await questionService.update(req.params.id, req.body);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const softDelete = async (req, res, next) => {
  try {
    const result = await questionService.softDelete(req.params.id);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const bulkImport = async (req, res, next) => {
  try {
    const result = await questionService.bulkImport(req.user.userId, req.body.questions);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const getByDifficulty = async (req, res, next) => {
  try {
    const result = await questionService.getByDifficulty(req.query.contestId);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const getForContest = async (req, res, next) => {
  try {
    const result = await questionService.getQuestionsForContest(req.params.slug, req.user.userId);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};