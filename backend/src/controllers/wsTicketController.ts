
import { RequestHandler } from "express";
import { createHash, randomBytes } from "crypto";
import { pool } from "../config/database";

export const createWsTicket: RequestHandler = async (req, res) => {
  try {
    const { projectId } = req.body;
    const userId = res.locals.userId as string;

    // Verify that the authenticated user belongs to this project.
    const membership = await pool.query(
      `SELECT role
       FROM project_members
       WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId]
    );

    if (membership.rows.length === 0) {
      res.status(403).json({
        success: false,
        message: "You do not have access to this project."
      });
      return;
    }

    // Generate a secure, single-use ticket.
    const ticket = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256")
      .update(ticket)
      .digest("hex");

    // Ticket expires after 30 seconds.
    const expiresAt = new Date(Date.now() + 30_000);

    await pool.query(
      `INSERT INTO ws_tickets
       (token_hash, user_id, project_id, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [tokenHash, userId, projectId, expiresAt]
    );

    res.status(201).json({
      success: true,
      ticket,
      expiresIn: 30,
      projectId,
      role: membership.rows[0].role
    });
  } catch (error) {
    console.error("WebSocket ticket creation error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create WebSocket ticket."
    });
  }
};
