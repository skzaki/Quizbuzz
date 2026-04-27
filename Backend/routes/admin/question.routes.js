import { Router } from "express";
import {
  bulkImport,
  create,
  getAll,
  getByDifficulty,
  softDelete,
  update
} from "../../controllers/question.controller.js";

const router = Router();

router.get("/", getAll);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", softDelete);
router.post("/bulk", bulkImport);
router.get("/by-difficulty", getByDifficulty);

export default router;