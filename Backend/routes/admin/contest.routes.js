import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.js";
import {
  addQuestions,
  create,
  getAll,
  getById,
  getStatistics,
  softDelete,
  update,
  updateStatus
} from "../../controllers/contest.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/", getAll);
router.post("/", create);
router.get("/:id", getById);
router.put("/:id", update);
router.delete("/:id", softDelete);
router.patch("/:id/status", updateStatus);
router.post("/:id/questions", addQuestions);
router.get("/:id/stats", getStatistics);

export default router;