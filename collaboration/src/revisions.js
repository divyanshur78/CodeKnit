import * as Y from "yjs";

export const REVISIONS_KEY = "revisions";

function validateDoc(doc) {
  if (!(doc instanceof Y.Doc)) {
    throw new Error("A valid Yjs document is required.");
  }
}

function validateRevision(input) {
  const { userId, fileId, type, timestamp, description } = input;

  if (!userId || typeof userId !== "string") {
    throw new Error("A valid user ID is required.");
  }
  if (!fileId || typeof fileId !== "string") {
    throw new Error("A valid file ID is required.");
  }
  if (!type || typeof type !== "string") {
    throw new Error("A valid revision type is required.");
  }
  if (!Number.isFinite(timestamp)) {
    throw new Error("A valid revision timestamp is required.");
  }
  if (description !== undefined && typeof description !== "string") {
    throw new Error("Revision description must be a string.");
  }
}

export function recordRevision(doc, {
  userId,
  fileId,
  type = "edit",
  timestamp = Date.now(),
  description = ""
}) {
  validateDoc(doc);

  const input = { userId, fileId, type, timestamp, description };
  validateRevision(input);

  const revisions = doc.getArray(REVISIONS_KEY);
  const prefix = `${doc.clientID}:`;

  let sequence = 0;

  for (const item of revisions.toArray()) {
    const id = item.get("id");

    if (typeof id === "string" && id.startsWith(prefix)) {
      const value = Number(id.slice(prefix.length));
      if (Number.isSafeInteger(value)) {
        sequence = Math.max(sequence, value);
      }
    }
  }

  const id = `${prefix}${sequence + 1}`;
  const revision = new Y.Map();

  revision.set("id", id);
  revision.set("userId", userId);
  revision.set("fileId", fileId);
  revision.set("type", type);
  revision.set("timestamp", timestamp);
  revision.set("description", description);

  revisions.push([revision]);

  return getRevision(doc, id);
}

export function getRevision(doc, revisionId) {
  validateDoc(doc);

  if (!revisionId || typeof revisionId !== "string") {
    return null;
  }

  const revisions = doc.getArray(REVISIONS_KEY);

  for (const revision of revisions.toArray()) {
    if (revision.get("id") === revisionId) {
      return Object.fromEntries(revision.entries());
    }
  }

  return null;
}

export function listRevisions(doc, { fileId, userId, type } = {}) {
  validateDoc(doc);

  return doc.getArray(REVISIONS_KEY).toArray()
    .map(revision => Object.fromEntries(revision.entries()))
    .filter(revision =>
      (fileId === undefined || revision.fileId === fileId) &&
      (userId === undefined || revision.userId === userId) &&
      (type === undefined || revision.type === type)
    )
    .sort((a, b) =>
      a.timestamp - b.timestamp || a.id.localeCompare(b.id)
    );
}

export function observeRevisions(doc, callback) {
  validateDoc(doc);

  if (typeof callback !== "function") {
    throw new Error("A revision callback is required.");
  }

  const revisions = doc.getArray(REVISIONS_KEY);

  const observer = () => callback(listRevisions(doc));

  revisions.observe(observer);

  return () => revisions.unobserve(observer);
}
