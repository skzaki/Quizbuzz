import * as contestService from "../services/contest.service.js";
import { validateContestId, createContestSchema, updateContestSchema, updateStatusSchema, addQuestionsSchema } from "../validators/contest.validator.js";

const parseValidated = (schema, payload) => {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const error = new Error("Validation failed");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    error.details = parsed.error.flatten();
    throw error;
  }

  return parsed.data;
};

export const getAll = async (req, res, next) => {
  try {
    const result = await contestService.getAllContests(req.query);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const dto = parseValidated(createContestSchema, req.body);
    const result = await contestService.createContest(req.user.userId, dto);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    validateContestId(id);
    const result = await contestService.getById(id);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    validateContestId(id);
    const dto = parseValidated(updateContestSchema, req.body);
    const result = await contestService.updateContest(id, dto);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const softDelete = async (req, res, next) => {
  try {
    const { id } = req.params;
    validateContestId(id);
    const result = await contestService.softDelete(id);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    validateContestId(id);
    const { status } = parseValidated(updateStatusSchema, req.body);
    const result = await contestService.updateStatus(id, status);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const addQuestions = async (req, res, next) => {
  try {
    const { id } = req.params;
    validateContestId(id);
    const { questionIds } = parseValidated(addQuestionsSchema, req.body);
    const result = await contestService.addQuestions(id, questionIds);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const getStatistics = async (req, res, next) => {
  try {
    const { id } = req.params;
    validateContestId(id);
    const result = await contestService.getStatistics(id);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const getBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const result = await contestService.getBySlug(slug);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const getQuestions = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const result = await contestService.getContestQuestions(slug);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const submit = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { answers } = req.body;
    const result = await contestService.submitContest(slug, req.user.userId, answers);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const getLeaderboard = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const contest = await contestService.getBySlug(slug);
    const result = await contestService.getContestLeaderboard(contest._id);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

export const getCertificate = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const result = await contestService.getContestCertificate(slug, req.user.userId);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};