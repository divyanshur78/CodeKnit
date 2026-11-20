import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";

import {
  createProjectDoc,
  addFile,
  getFileContent,
  createOfflinePersistence,
  waitForOfflineSync,
  destroyOfflinePersistence
} from "../src/index.js";

test("saves project data and restores it from IndexedDB", async () => {
  const projectId = `offline-test-${Date.now()}`;

  const firstDoc = createProjectDoc();
  const firstPersistence = createOfflinePersistence(firstDoc, projectId);

  await waitForOfflineSync(firstPersistence);

  addFile(firstDoc, {
    id: "file-1",
    name: "offline.js",
    language: "javascript",
    content: 'console.log("Saved offline");'
  });

  // Allow the IndexedDB transaction to finish.
  await new Promise(resolve => setTimeout(resolve, 100));

  destroyOfflinePersistence(firstPersistence);
  firstDoc.destroy();

  const secondDoc = createProjectDoc();
  const secondPersistence = createOfflinePersistence(secondDoc, projectId);

  await waitForOfflineSync(secondPersistence);

  const restoredContent = getFileContent(secondDoc, "file-1");

  assert.ok(restoredContent);
  assert.equal(
    restoredContent.toString(),
    'console.log("Saved offline");'
  );

  destroyOfflinePersistence(secondPersistence);
  secondDoc.destroy();
});
