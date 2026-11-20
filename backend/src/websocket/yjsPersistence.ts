
import type { Doc } from "yjs" with {
  "resolution-mode": "import"
};

import { pool } from "../config/database";

export async function loadProjectDocument(
  projectId: string,
  doc: Doc
) {
  const Y = await import("yjs");

  // Load the latest snapshot, if one exists.
  const snapshot = await pool.query(
    `SELECT snapshot_data
     FROM yjs_snapshots
     WHERE project_id = $1
     ORDER BY id DESC
     LIMIT 1`,
    [projectId]
  );

  if (snapshot.rows.length > 0) {
    Y.applyUpdate(doc, snapshot.rows[0].snapshot_data);
  }

  // Replay stored updates. Yjs updates are idempotent.
  const updates = await pool.query(
    `SELECT update_data
     FROM yjs_updates
     WHERE project_id = $1
     ORDER BY id ASC`,
    [projectId]
  );

  for (const row of updates.rows) {
    Y.applyUpdate(doc, row.update_data);
  }
}

export async function saveProjectUpdate(
  projectId: string,
  update: Uint8Array
) {
  await pool.query(
    `INSERT INTO yjs_updates (project_id, update_data)
     VALUES ($1, $2)`,
    [projectId, Buffer.from(update)]
  );
}
