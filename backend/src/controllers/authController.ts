
import { RequestHandler } from "express";
import bcrypt from "bcrypt";
import { pool } from "../config/database";
import { registerSchema } from "../middleware/authValidation";

export const register: RequestHandler = async (req, res) => {
  const validation = registerSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.error.flatten().fieldErrors
    });
    return;
  }

  const { email, displayName, password } = validation.data;

  let client;

  try {
    client = await pool.connect();

    await client.query("BEGIN");

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await client.query(
      `INSERT INTO users (email, display_name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name, created_at`,
      [email, displayName, passwordHash]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: result.rows[0]
    });

  } catch (error: any) {
    if (client) {
      await client.query("ROLLBACK");
    }

    if (error.code === "23505") {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists"
      });
      return;
    }

    console.error("Registration error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create account"
    });

  } finally {
    client?.release();
  }
};
