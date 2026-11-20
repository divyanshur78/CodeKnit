import { IndexeddbPersistence } from "y-indexeddb";

export function createOfflinePersistence(doc, projectId) {
  if (!doc) {
    throw new Error("A Yjs document is required.");
  }

  if (typeof projectId !== "string" || !projectId.trim()) {
    throw new Error("A valid project ID is required.");
  }

  const databaseName = `codeknit-${projectId}`;

  return new IndexeddbPersistence(databaseName, doc);
}

export async function waitForOfflineSync(persistence) {
  if (!persistence || !persistence.whenSynced) {
    throw new Error("A valid IndexedDB persistence instance is required.");
  }

  await persistence.whenSynced;
}

export function destroyOfflinePersistence(persistence) {
  if (persistence) {
    persistence.destroy();
  }
}
