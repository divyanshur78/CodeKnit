import test from "node:test";
import assert from "node:assert/strict";
import * as Y from "yjs";

import {
  createProjectDoc,
  recordRevision,
  getRevision,
  listRevisions,
  observeRevisions
} from "../src/index.js";

test("records a revision with user and file attribution", () => {
  const doc = createProjectDoc();

  const revision = recordRevision(doc, {
    userId: "user-a",
    fileId: "file-1",
    type: "edit",
    timestamp: 1000,
    description: "Updated main function"
  });

  assert.equal(revision.userId, "user-a");
  assert.equal(revision.fileId, "file-1");
  assert.equal(revision.type, "edit");
  assert.equal(revision.timestamp, 1000);
  assert.equal(revision.description, "Updated main function");
  assert.ok(revision.id);

  doc.destroy();
});

test("generates distinct revision IDs", () => {
  const doc = createProjectDoc();

  const first = recordRevision(doc, {
    userId: "user-a",
    fileId: "file-1",
    timestamp: 1000
  });

  const second = recordRevision(doc, {
    userId: "user-a",
    fileId: "file-1",
    timestamp: 2000
  });

  assert.notEqual(first.id, second.id);

  doc.destroy();
});

test("retrieves and filters revisions", () => {
  const doc = createProjectDoc();

  const first = recordRevision(doc, {
    userId: "user-a",
    fileId: "file-1",
    type: "edit",
    timestamp: 1000
  });

  recordRevision(doc, {
    userId: "user-b",
    fileId: "file-2",
    type: "rename",
    timestamp: 2000
  });

  assert.equal(getRevision(doc, first.id).userId, "user-a");
  assert.equal(listRevisions(doc).length, 2);
  assert.equal(listRevisions(doc, { userId: "user-a" }).length, 1);
  assert.equal(listRevisions(doc, { fileId: "file-2" })[0].type, "rename");
  assert.equal(listRevisions(doc, { type: "delete" }).length, 0);

  doc.destroy();
});

test("revision history synchronizes between Yjs replicas", () => {
  const first = createProjectDoc();
  const second = createProjectDoc();

  recordRevision(first, {
    userId: "user-a",
    fileId: "file-1",
    type: "edit",
    timestamp: 1000
  });

  Y.applyUpdate(second, Y.encodeStateAsUpdate(first));

  assert.equal(listRevisions(second).length, 1);
  assert.equal(listRevisions(second)[0].userId, "user-a");

  first.destroy();
  second.destroy();
});

test("observes revision changes and supports cleanup", () => {
  const doc = createProjectDoc();
  let calls = 0;
  let latest = [];

  const unsubscribe = observeRevisions(doc, revisions => {
    calls++;
    latest = revisions;
  });

  recordRevision(doc, {
    userId: "user-a",
    fileId: "file-1",
    timestamp: 1000
  });

  assert.equal(calls, 1);
  assert.equal(latest.length, 1);

  unsubscribe();

  recordRevision(doc, {
    userId: "user-b",
    fileId: "file-1",
    timestamp: 2000
  });

  assert.equal(calls, 1);

  doc.destroy();
});

test("rejects invalid revision data", () => {
  const doc = createProjectDoc();

  assert.throws(() => recordRevision(doc, {
    fileId: "file-1"
  }), /user ID/);

  assert.throws(() => recordRevision(doc, {
    userId: "user-a"
  }), /file ID/);

  assert.throws(() => recordRevision(doc, {
    userId: "user-a",
    fileId: "file-1",
    timestamp: NaN
  }), /timestamp/);

  doc.destroy();
});
