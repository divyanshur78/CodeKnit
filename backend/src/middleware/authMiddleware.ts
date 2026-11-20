
import { RequestHandler } from "express";
import jwt from "jsonwebtoken";

export const authenticateToken: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check whether the Authorization header exists
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Access denied. Authentication token required."
    });
    return;
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env.JWT_SECRET;

  if (!secret || !token) {
    res.status(401).json({
      success: false,
      message: "Invalid authentication token"
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"]
    });

    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string"
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token"
      });
      return;
    }

    // Store authenticated user ID for the next handler
    res.locals.userId = decoded.sub;

    next();

  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token"
    });
  }
};
