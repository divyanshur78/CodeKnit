
import { RequestHandler } from "express";
import { pool } from "../config/database";
import {
  addMemberSchema,
  updateMemberRoleSchema
} from "../middleware/memberValidation";

// Add a user to a project (owner only)
export const addMember: RequestHandler = async (req, res) => {
  const validation = addMemberSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.error.flatten().fieldErrors
    });
    return;
  }

  const { projectId } = req.params;
  const ownerId = res.locals.userId;
  const { email, role } = validation.data;

  try {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const ownerCheck = await client.query(
        `SELECT 1 FROM project_members
         WHERE project_id = $1
         AND user_id = $2
         AND role = 'owner'`,
        [projectId, ownerId]
      );

      if (ownerCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(403).json({
          success: false,
          message: "Only the project owner can add members"
        });
        return;
      }

      const userResult = await client.query(
        "SELECT id, email, display_name FROM users WHERE email = $1",
        [email]
      );

      if (userResult.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({
          success: false,
          message: "User account not found. The user must register first."
        });
        return;
      }

      const user = userResult.rows[0];

      const memberResult = await client.query(
        `INSERT INTO project_members (project_id, user_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (project_id, user_id) DO NOTHING
         RETURNING project_id, user_id, role, joined_at`,
        [projectId, user.id, role]
      );

      if (memberResult.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(409).json({
          success: false,
          message: "User is already a project member"
        });
        return;
      }

      await client.query("COMMIT");

      res.status(201).json({
        success: true,
        message: "Member added successfully",
        member: {
          ...memberResult.rows[0],
          email: user.email,
          displayName: user.display_name
        }
      });

    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error("Add member error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to add project member"
    });
  }
};


// List project members
export const getProjectMembers: RequestHandler = async (req, res) => {
  const { projectId } = req.params;
  const userId = res.locals.userId;

  try {
    const result = await pool.query(
      `SELECT
         u.id AS user_id,
         u.email,
         u.display_name,
         pm.role,
         pm.joined_at
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1
       AND EXISTS (
         SELECT 1 FROM project_members access
         WHERE access.project_id = pm.project_id
         AND access.user_id = $2
       )
       ORDER BY
         CASE pm.role WHEN 'owner' THEN 1 WHEN 'editor' THEN 2 ELSE 3 END,
         pm.joined_at ASC`,
      [projectId, userId]
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      members: result.rows
    });

  } catch (error) {
    console.error("Get members error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to retrieve project members"
    });
  }
};


// Change a member's role (owner only)
export const updateMemberRole: RequestHandler = async (req, res) => {
  const validation = updateMemberRoleSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.error.flatten().fieldErrors
    });
    return;
  }

  const { projectId, userId: targetUserId } = req.params;
  const ownerId = res.locals.userId;
  const { role } = validation.data;

  try {
    const result = await pool.query(
      `UPDATE project_members
       SET role = $1
       WHERE project_id = $2
       AND user_id = $3
       AND role <> 'owner'
       AND EXISTS (
         SELECT 1 FROM project_members owner
         WHERE owner.project_id = $2
         AND owner.user_id = $4
         AND owner.role = 'owner'
       )
       RETURNING project_id, user_id, role, joined_at`,
      [role, projectId, targetUserId, ownerId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "Member not found or you do not have permission"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Member role updated successfully",
      member: result.rows[0]
    });

  } catch (error) {
    console.error("Update member role error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to update member role"
    });
  }
};


// Remove a member (owner only)
export const removeMember: RequestHandler = async (req, res) => {
  const { projectId, userId: targetUserId } = req.params;
  const ownerId = res.locals.userId;

  try {
    const result = await pool.query(
      `DELETE FROM project_members pm
       WHERE pm.project_id = $1
       AND pm.user_id = $2
       AND pm.role <> 'owner'
       AND EXISTS (
         SELECT 1 FROM project_members owner
         WHERE owner.project_id = $1
         AND owner.user_id = $3
         AND owner.role = 'owner'
       )
       RETURNING pm.user_id`,
      [projectId, targetUserId, ownerId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "Member not found or you do not have permission"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Member removed successfully"
    });

  } catch (error) {
    console.error("Remove member error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to remove project member"
    });
  }
};


// Leave a project (owner cannot leave)
export const leaveProject: RequestHandler = async (req, res) => {
  const { projectId } = req.params;
  const userId = res.locals.userId;

  try {
    const result = await pool.query(
      `DELETE FROM project_members
       WHERE project_id = $1
       AND user_id = $2
       AND role <> 'owner'
       RETURNING project_id`,
      [projectId, userId]
    );

    if (result.rows.length === 0) {
      res.status(403).json({
        success: false,
        message: "You cannot leave this project, or you are not a member"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "You left the project successfully"
    });

  } catch (error) {
    console.error("Leave project error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to leave project"
    });
  }
};
