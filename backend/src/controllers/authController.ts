
import { RequestHandler } from "express";
import bcrypt from "bcrypt";
import { pool } from "../config/database";
import jwt from "jsonwebtoken";
import { registerSchema, loginSchema } from "../middleware/authValidation";

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


export const login: RequestHandler = async (req, res) => {
  const validation = loginSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.error.flatten().fieldErrors
    });
    return;
  }

  const { email, password } = validation.data;

  try {
    const result = await pool.query(
      `SELECT id, email, display_name, password_hash
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
      return;
    }

    const user = result.rows[0];

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
      return;
    }

    const token = jwt.sign(
      { sub: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: "15m" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name
      }
    });

  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to login"
    });
  }
};
