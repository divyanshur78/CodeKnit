import { test } from "node:test";
import assert from "node:assert/strict";
import * as Y from "yjs";

import {
  createProjectDoc,
  addFile,
  getFileContent
} from "../src/projectDoc.js";

import {
  recordExecutionSnapshot,
  getExecutionSnapshot,
  listExecutionSnapshots,
  observeExecutionSnapshots
} from "../src/executionSnapshots.js";

function createTestProject() {
  const doc = createProjectDoc();

  addFile(doc, {
    id: "file-1",
    name: "main.js",
    language: "javascript",
    content: "console.log('Hello');"
  });

  return doc;
}

test("captures the exact file content at execution time", () => {
  const doc = createTestProject();

  const snapshot = recordExecutionSnapshot(doc, {
    userId: "user-1",
    fileId: "file-1",
    timestamp: 100
  });

  assert.equal(snapshot.userId, "user-1");
  assert.equal(snapshot.fileId, "file-1");
  assert.equal(snapshot.fileName, "main.js");
  assert.equal(snapshot.language, "javascript");
  assert.equal(snapshot.content, "console.log('Hello');");
  assert.equal(snapshot.timestamp, 100);
  assert.equal(snapshot.revisionId, null);

  doc.destroy();
});

test("snapshot content remains unchanged after the file is edited", () => {
  const doc = createTestProject();

  const snapshot = recordExecutionSnapshot(doc, {
    userId: "user-1",
    fileId: "file-1"
  });

  const content = getFileContent(doc, "file-1");
  content.delete(0, content.length);
  content.insert(0, "console.log('Changed');");

  const saved = getExecutionSnapshot(doc, snapshot.id);

  assert.equal(saved.content, "console.log('Hello');");
  assert.equal(content.toString(), "console.log('Changed');");

  doc.destroy();
});

test("stores an optional revision ID", () => {
  const doc = createTestProject();

  const snapshot = recordExecutionSnapshot(doc, {
    userId: "user-1",
    fileId: "file-1",
    revisionId: "revision-123"
  });

  assert.equal(snapshot.revisionId, "revision-123");

  doc.destroy();
});

test("generates distinct snapshot IDs", () => {
  const doc = createTestProject();

  const first = recordExecutionSnapshot(doc, {
    userId: "user-1",
    fileId: "file-1"
  });

  const second = recordExecutionSnapshot(doc, {
    userId: "user-1",
    fileId: "file-1"
  });

  assert.notEqual(first.id, second.id);

  doc.destroy();
});

test("retrieves and filters execution snapshots", () => {
  const doc = createTestProject();

  addFile(doc, {
    id: "file-2",
    name: "app.py",
    language: "python",
    content: "print('Hi')"
  });

  recordExecutionSnapshot(doc, {
    userId: "user-1",
    fileId: "file-1",
    revisionId: "rev-1",
    timestamp: 100
  });

  recordExecutionSnapshot(doc, {
    userId: "user-2",
    fileId: "file-2",
    revisionId: "rev-2",
    timestamp: 200
  });

  assert.equal(
    listExecutionSnapshots(doc, { userId: "user-1" }).length,
    1
  );

  assert.equal(
    listExecutionSnapshots(doc, { fileId: "file-2" }).length,
    1
  );

  assert.equal(
    listExecutionSnapshots(doc, { revisionId: "rev-1" }).length,
    1
  );

  assert.equal(listExecutionSnapshots(doc).length, 2);

  doc.destroy();
});

test("execution snapshots synchronize between Yjs replicas", () => {
  const first = createTestProject();

  const second = createProjectDoc();

  Y.applyUpdate(second, Y.encodeStateAsUpdate(first));

  recordExecutionSnapshot(first, {
    userId: "user-1",
    fileId: "file-1"
  });

  Y.applyUpdate(second, Y.encodeStateAsUpdate(first));

  const snapshots = listExecutionSnapshots(second);

  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].content, "console.log('Hello');");

  first.destroy();
  second.destroy();
});

test("observes snapshot changes and supports cleanup", () => {
  const doc = createTestProject();
  let observed = 0;

  const stop = observeExecutionSnapshots(doc, snapshots => {
    observed = snapshots.length;
  });

  recordExecutionSnapshot(doc, {
    userId: "user-1",
    fileId: "file-1"
  });

  assert.equal(observed, 1);

  stop();

  recordExecutionSnapshot(doc, {
    userId: "user-1",
    fileId: "file-1"
  });

  assert.equal(observed, 1);

  doc.destroy();
});

test("rejects invalid users, files and timestamps", () => {
  const doc = createTestProject();

  assert.throws(
    () => recordExecutionSnapshot(doc, {
      userId: "",
      fileId: "file-1"
    }),
    /user ID/
  );

  assert.throws(
    () => recordExecutionSnapshot(doc, {
      userId: "user-1",
      fileId: "missing"
    }),
    /File not found/
  );

  assert.throws(
    () => recordExecutionSnapshot(doc, {
      userId: "user-1",
      fileId: "file-1",
      timestamp: NaN
    }),
    /timestamp/
  );

  assert.throws(
    () => recordExecutionSnapshot(doc, {
      userId: "user-1",
      fileId: "file-1",
      revisionId: ""
    }),
    /Revision ID/
  );

  doc.destroy();
});
