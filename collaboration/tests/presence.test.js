import test from "node:test";
import assert from "node:assert/strict";
import * as Y from "yjs";

import {
  applyAwarenessUpdate,
  encodeAwarenessUpdate
} from "y-protocols/awareness";

import {
  createAwareness,
  setLocalUser,
  setActiveFile,
  clearLocalPresence,
  getConnectedUsers,
  observePresence
} from "../src/index.js";

test("creates an Awareness instance", () => {
  const doc = new Y.Doc();
  const awareness = createAwareness(doc);

  assert.ok(awareness);
  assert.equal(awareness.doc, doc);

  awareness.destroy();
  doc.destroy();
});

test("sets local user information", () => {
  const doc = new Y.Doc();
  const awareness = createAwareness(doc);

  setLocalUser(awareness, {
    id: "user-1",
    name: "Developer One",
    color: "#ff0000"
  });

  const localState = awareness.getLocalState();

  assert.equal(localState.user.id, "user-1");
  assert.equal(localState.user.name, "Developer One");
  assert.equal(localState.user.color, "#ff0000");

  awareness.destroy();
  doc.destroy();
});

test("sets the active file", () => {
  const doc = new Y.Doc();
  const awareness = createAwareness(doc);

  setActiveFile(awareness, "file-1");

  assert.equal(
    awareness.getLocalState().activeFileId,
    "file-1"
  );

  awareness.destroy();
  doc.destroy();
});

test("shares presence between two clients", () => {
  const docA = new Y.Doc();
  const docB = new Y.Doc();

  const awarenessA = createAwareness(docA);
  const awarenessB = createAwareness(docB);

  setLocalUser(awarenessA, {
    id: "user-1",
    name: "Developer One",
    color: "#ff0000"
  });

  setActiveFile(awarenessA, "file-1");

  const update = encodeAwarenessUpdate(
    awarenessA,
    [docA.clientID]
  );

  applyAwarenessUpdate(
    awarenessB,
    update,
    "test"
  );

  const users = getConnectedUsers(awarenessB);

  assert.equal(users.length, 1);
  assert.equal(users[0].id, "user-1");
  assert.equal(users[0].name, "Developer One");
  assert.equal(users[0].activeFileId, "file-1");

  awarenessA.destroy();
  awarenessB.destroy();
  docA.destroy();
  docB.destroy();
});

test("observes presence changes and supports cleanup", () => {
  const doc = new Y.Doc();
  const awareness = createAwareness(doc);

  let notificationCount = 0;

  const stopObserving = observePresence(awareness, () => {
    notificationCount++;
  });

  setLocalUser(awareness, {
    id: "user-1",
    name: "Developer One"
  });

  assert.ok(notificationCount > 0);

  const previousCount = notificationCount;
  stopObserving();

  setActiveFile(awareness, "file-2");

  assert.equal(notificationCount, previousCount);

  awareness.destroy();
  doc.destroy();
});

test("clears local presence", () => {
  const doc = new Y.Doc();
  const awareness = createAwareness(doc);

  setLocalUser(awareness, {
    id: "user-1",
    name: "Developer One"
  });

  clearLocalPresence(awareness);

  assert.equal(awareness.getLocalState(), null);

  awareness.destroy();
  doc.destroy();
});
