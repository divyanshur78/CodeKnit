
import { Router } from "express";
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject
} from "../controllers/projectControllers";

import { authenticateToken } from "../middleware/authMiddleware";
import memberRoutes from "./memberRoutes";

const router = Router();

// All project routes require authentication
router.use(authenticateToken);

// Project operations
router.post("/", createProject);
router.get("/", getProjects);

router.use("/:projectId/members", memberRoutes);

router.get("/:projectId", getProjectById);
router.patch("/:projectId", updateProject);
router.delete("/:projectId", deleteProject);

export default router;

