
import { Router } from "express";

import {
  addMember,
  getProjectMembers,
  updateMemberRole,
  removeMember,
  leaveProject
} from "../controllers/memberController";

import { authenticateToken } from "../middleware/authMiddleware";

const router = Router({ mergeParams: true });

// Protect all membership routes
router.use(authenticateToken);

router.post("/", addMember);
router.get("/", getProjectMembers);
router.patch("/:userId/role", updateMemberRole);
router.delete("/leave", leaveProject);
router.delete("/:userId", removeMember);

export default router;
