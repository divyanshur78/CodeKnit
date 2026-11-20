
import { Router } from "express";
import { register, login } from "../controllers/authController";
import { createWsTicket } from "../controllers/wsTicketController";
import { authenticateToken } from "../middleware/authMiddleware";
import { wsTicketSchema } from "../middleware/wsTicketValidation";

const router = Router();

router.post("/register", register);
router.post("/login", login);

router.post("/ws-ticket", authenticateToken, (req, res, next) => {
  const result = wsTicketSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      message: "Invalid project ID.",
      errors: result.error.issues
    });
    return;
  }

  req.body = result.data;
  next();
}, createWsTicket);

export default router;
