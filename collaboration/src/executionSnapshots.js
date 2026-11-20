import * as Y from "yjs";
import { FILES_KEY } from "./projectDoc.js";

export const EXECUTION_SNAPSHOTS_KEY = "executionSnapshots";

function validateDoc(doc) {
  if (!(doc instanceof Y.Doc)) {
    throw new Error("A valid Yjs document is required.");
  }
}

function validateInput({ userId, fileId, timestamp, revisionId }) {
  if (!userId || typeof userId !== "string") {
    throw new Error("A valid user ID is required.");
  }

  if (!fileId || typeof fileId !== "string") {
    throw new Error("A valid file ID is required.");
  }

  if (!Number.isFinite(timestamp)) {
    throw new Error("A valid snapshot timestamp is required.");
  }

  if (
    revisionId !== undefined &&
    revisionId !== null &&
    (typeof revisionId !== "string" || !revisionId)
  ) {
    throw new Error("Revision ID must be a non-empty string or null.");
  }
}

function toSnapshot(snapshot) {
  return Object.fromEntries(snapshot.entries());
}

export function recordExecutionSnapshot(
  doc,
  {
    userId,
    fileId,
    revisionId = null,
    timestamp = Date.now()
  }
) {
  validateDoc(doc);
  validateInput({ userId, fileId, revisionId, timestamp });

  const file = doc.getMap(FILES_KEY).get(fileId);

  if (!file) {
    throw new Error(`File not found: ${fileId}`);
  }

  const content = file.get("content");

  if (!(content instanceof Y.Text)) {
    throw new Error("The file does not contain valid Y.Text content.");
  }

  const snapshots = doc.getArray(EXECUTION_SNAPSHOTS_KEY);
  const prefix = `${doc.clientID}:`;

  let sequence = 0;

  for (const item of snapshots.toArray()) {
    const id = item.get("id");

    if (typeof id === "string" && id.startsWith(prefix)) {
      const value = Number(id.slice(prefix.length));

      if (Number.isSafeInteger(value)) {
        sequence = Math.max(sequence, value);
      }
    }
  }

  const id = `${prefix}${sequence + 1}`;
  const snapshot = new Y.Map();

  snapshot.set("id", id);
  snapshot.set("userId", userId);
  snapshot.set("fileId", fileId);
  snapshot.set("fileName", file.get("name"));
  snapshot.set("language", file.get("language"));
  snapshot.set("content", content.toString());
  snapshot.set("revisionId", revisionId);
  snapshot.set("timestamp", timestamp);

  snapshots.push([snapshot]);

  return getExecutionSnapshot(doc, id);
}

export function getExecutionSnapshot(doc, snapshotId) {
  validateDoc(doc);

  if (!snapshotId || typeof snapshotId !== "string") {
    return null;
  }

  const snapshots = doc.getArray(EXECUTION_SNAPSHOTS_KEY);

  for (const snapshot of snapshots.toArray()) {
    if (snapshot.get("id") === snapshotId) {
      return toSnapshot(snapshot);
    }
  }

  return null;
}

export function listExecutionSnapshots(
  doc,
  { fileId, userId, revisionId } = {}
) {
  validateDoc(doc);

  return doc.getArray(EXECUTION_SNAPSHOTS_KEY)
    .toArray()
    .map(toSnapshot)
    .filter(snapshot =>
      (fileId === undefined || snapshot.fileId === fileId) &&
      (userId === undefined || snapshot.userId === userId) &&
      (revisionId === undefined || snapshot.revisionId === revisionId)
    )
    .sort((a, b) =>
      a.timestamp - b.timestamp || a.id.localeCompare(b.id)
    );
}

export function observeExecutionSnapshots(doc, callback) {
  validateDoc(doc);

  if (typeof callback !== "function") {
    throw new Error("A snapshot callback is required.");
  }

  const snapshots = doc.getArray(EXECUTION_SNAPSHOTS_KEY);

  const observer = () => {
    callback(listExecutionSnapshots(doc));
  };

  snapshots.observe(observer);

  return () => snapshots.unobserve(observer);
}
