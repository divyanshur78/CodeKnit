
import { RequestHandler } from "express";
import { pool } from "../config/database";
import { createProjectSchema, updateProjectSchema} from "../middleware/projectValidation";

// Create a new project
export const createProject: RequestHandler = async (req, res) => {
  const validation = createProjectSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.error.flatten().fieldErrors
    });
    return;
  }

  const userId = res.locals.userId;
  const { name } = validation.data;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const projectResult = await client.query(
      `INSERT INTO projects (name, owner_id)
       VALUES ($1, $2)
       RETURNING id, name, owner_id, created_at, updated_at`,
      [name, userId]
    );

    const project = projectResult.rows[0];

    await client.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [project.id, userId]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      project
    });

  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Project creation error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create project"
    });

  } finally {
    client.release();
  }
};


// Get all projects accessible to the authenticated user
export const getProjects: RequestHandler = async (_req, res) => {
  const userId = res.locals.userId;

  try {
    const result = await pool.query(
      `SELECT
         p.id,
         p.name,
         p.owner_id,
         p.created_at,
         p.updated_at,
         pm.role
       FROM project_members pm
       JOIN projects p ON p.id = pm.project_id
       WHERE pm.user_id = $1
       ORDER BY p.updated_at DESC`,
      [userId]
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      projects: result.rows
    });

  } catch (error) {
    console.error("Get projects error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve projects"
    });
  }
};


// Get details of a specific project
export const getProjectById: RequestHandler = async (req, res) => {
  const userId = res.locals.userId;
  const { projectId } = req.params;

  try {
    const result = await pool.query(
      `SELECT
         p.id,
         p.name,
         p.owner_id,
         p.created_at,
         p.updated_at,
         pm.role
       FROM projects p
       JOIN project_members pm ON pm.project_id = p.id
       WHERE p.id = $1 AND pm.user_id = $2`,
      [projectId, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "Project not found or access denied"
      });
      return;
    }

    res.status(200).json({
      success: true,
      project: result.rows[0]
    });

  } catch (error) {
    console.error("Get project error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve project"
    });
  }
};


// Update project name (owner or editor)
export const updateProject: RequestHandler = async (req, res) => {
  const validation = updateProjectSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.error.flatten().fieldErrors
    });
    return;
  }

  const userId = res.locals.userId;
  const { projectId } = req.params;
  const { name } = validation.data;

  try {
    const result = await pool.query(
      `UPDATE projects p
       SET name = $1, updated_at = NOW()
       WHERE p.id = $2
       AND EXISTS (
         SELECT 1
         FROM project_members pm
         WHERE pm.project_id = p.id
         AND pm.user_id = $3
         AND pm.role IN ('owner', 'editor')
       )
       RETURNING p.id, p.name, p.owner_id, p.created_at, p.updated_at`,
      [name, projectId, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "Project not found or you do not have permission"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Project updated successfully",
      project: result.rows[0]
    });

  } catch (error) {
    console.error("Update project error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update project"
    });
  }
};


// Delete project (owner only)
export const deleteProject: RequestHandler = async (req, res) => {
  const userId = res.locals.userId;
  const { projectId } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM projects
       WHERE id = $1 AND owner_id = $2
       RETURNING id`,
      [projectId, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "Project not found or you are not the owner"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Project deleted successfully"
    });

  } catch (error) {
    console.error("Delete project error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to delete project"
    });
  }
};
