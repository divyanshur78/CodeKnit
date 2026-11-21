
import type { Doc } from "yjs" with {
  "resolution-mode": "import"
};

import { pool } from "../config/database";

export async function loadProjectDocument(
  projectId: string,
  doc: Doc
) {
  const Y = await import("yjs");

  const snapshot = await pool.query(
    `SELECT snapshot_data, last_update_id
     FROM yjs_snapshots
     WHERE project_id = $1
     ORDER BY id DESC
     LIMIT 1`,
    [projectId]
  );

  let lastUpdateId = "0";

  if (snapshot.rows.length > 0) {
    const latestSnapshot = snapshot.rows[0];

    Y.applyUpdate(doc, latestSnapshot.snapshot_data);
    lastUpdateId = String(latestSnapshot.last_update_id ?? 0);
  }

  const updates = await pool.query(
    `SELECT update_data
     FROM yjs_updates
     WHERE project_id = $1
       AND id > $2
     ORDER BY id ASC`,
    [projectId, lastUpdateId]
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

/**
 * Save a document snapshot.
 * Call this through the room's serialized persistence queue,
 * after all earlier updates have been persisted.
 */
export async function saveProjectSnapshot(
  projectId: string,
  doc: Doc
) {
  const Y = await import("yjs");

  // Capture the document state synchronously.
  const snapshotData = Y.encodeStateAsUpdate(doc);
  const stateVector = Y.encodeStateVector(doc);

  // Record the latest update already persisted in the database.
  const result = await pool.query(
    `SELECT COALESCE(MAX(id), 0) AS last_update_id
     FROM yjs_updates
     WHERE project_id = $1`,
    [projectId]
  );

  const lastUpdateId = result.rows[0].last_update_id;

  await pool.query(
    `INSERT INTO yjs_snapshots
     (project_id, snapshot_data, state_vector, last_update_id)
     VALUES ($1, $2, $3, $4)`,
    [
      projectId,
      Buffer.from(snapshotData),
      Buffer.from(stateVector),
      lastUpdateId
    ]
  );
}
