import test from "node:test";
import assert from "node:assert/strict";
import * as Y from "yjs";

import {
  createProjectDoc,
  addFile,
  getFileContent,
  createUserUndoManager
} from "../src/index.js";

test("undo reverses the current user's own edit", () => {
  const doc = createProjectDoc();

  addFile(doc, {
    id: "file-1",
    name: "main.js",
    content: "Hello"
  });

  const text = getFileContent(doc, "file-1");
  const user = createUserUndoManager(doc, text, "user-1");

  user.transact(() => text.insert(5, " World"));

  assert.equal(text.toString(), "Hello World");
  assert.equal(user.canUndo(), true);

  user.undo();

  assert.equal(text.toString(), "Hello");
  assert.equal(user.canRedo(), true);

  user.redo();

  assert.equal(text.toString(), "Hello World");

  user.destroy();
  doc.destroy();
});

test("undo does not remove another user's remote edit", () => {
  const docA = createProjectDoc();
  const docB = createProjectDoc();

  addFile(docA, {
    id: "file-1",
    name: "main.js",
    content: "A"
  });

  Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));

  const textA = getFileContent(docA, "file-1");
  const textB = getFileContent(docB, "file-1");

  const userA = createUserUndoManager(docA, textA, "user-A");
  const userB = createUserUndoManager(docB, textB, "user-B");

  // Both users edit independently.
  userA.transact(() => textA.insert(1, "X"));
  userB.transact(() => textB.insert(1, "Y"));

  // Exchange their changes.
  Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB), "remote-sync");
  Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA), "remote-sync");

  assert.equal(textA.toString(), textB.toString());
  assert.ok(textA.toString().includes("X"));
  assert.ok(textA.toString().includes("Y"));

  // User A undoes only their own insertion.
  userA.undo();

  assert.ok(!textA.toString().includes("X"));
  assert.ok(textA.toString().includes("Y"));

  // Send the undo update to user B.
  Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA), "remote-sync");

  assert.equal(textA.toString(), textB.toString());
  assert.ok(textB.toString().includes("Y"));
  assert.ok(!textB.toString().includes("X"));

  userA.destroy();
  userB.destroy();
  docA.destroy();
  docB.destroy();
});

test("undo and redo availability updates correctly", () => {
  const doc = createProjectDoc();

  addFile(doc, {
    id: "file-1",
    name: "main.js",
    content: "Code"
  });

  const text = getFileContent(doc, "file-1");
  const user = createUserUndoManager(doc, text, "user-1");

  assert.equal(user.canUndo(), false);
  assert.equal(user.canRedo(), false);

  user.transact(() => text.insert(4, "!"));

  assert.equal(user.canUndo(), true);

  user.undo();

  assert.equal(user.canRedo(), true);

  user.redo();

  assert.equal(text.toString(), "Code!");

  user.destroy();
  doc.destroy();
});

test("tracks Monaco binding transactions using the binding as origin", () => {
  const doc = createProjectDoc();

  addFile(doc, {
    id: "monaco-file",
    name: "main.js",
    content: "Hello"
  });

  const text = getFileContent(doc, "monaco-file");
  const user = createUserUndoManager(doc, text, "monaco-user");

  // y-monaco passes its MonacoBinding instance as the transaction origin.
  const bindingOrigin = {};

  user.trackOrigin(bindingOrigin);

  doc.transact(() => {
    text.insert(5, " Monaco");
  }, bindingOrigin);

  assert.equal(text.toString(), "Hello Monaco");
  assert.equal(user.canUndo(), true);

  user.undo();

  assert.equal(text.toString(), "Hello");
  assert.equal(user.canRedo(), true);

  user.redo();

  assert.equal(text.toString(), "Hello Monaco");

  user.destroy();
  doc.destroy();
});

test("separate users track only their own Monaco binding origins", () => {
  const doc = createProjectDoc();

  addFile(doc, {
    id: "shared-file",
    name: "main.js",
    content: "A"
  });

  const text = getFileContent(doc, "shared-file");

  const userA = createUserUndoManager(doc, text, "user-A");
  const userB = createUserUndoManager(doc, text, "user-B");

  const bindingA = {};
  const bindingB = {};

  userA.trackOrigin(bindingA);
  userB.trackOrigin(bindingB);

  doc.transact(() => {
    text.insert(1, "X");
  }, bindingA);

  doc.transact(() => {
    text.insert(2, "Y");
  }, bindingB);

  assert.equal(text.toString(), "AXY");
  assert.equal(userA.canUndo(), true);
  assert.equal(userB.canUndo(), true);

  userA.undo();

  assert.equal(text.toString(), "AY");

  userB.undo();

  assert.equal(text.toString(), "A");

  userA.redo();
  assert.equal(text.toString(), "AX");

  userB.redo();
  assert.equal(text.toString(), "AXY");

  userA.destroy();
  userB.destroy();
  doc.destroy();
});

test("untracked transaction origins do not enter the user's undo history", () => {
  const doc = createProjectDoc();

  addFile(doc, {
    id: "remote-file",
    name: "main.js",
    content: "A"
  });

  const text = getFileContent(doc, "remote-file");
  const user = createUserUndoManager(doc, text, "local-user");

  const remoteOrigin = {};

  doc.transact(() => {
    text.insert(1, "R");
  }, remoteOrigin);

  assert.equal(text.toString(), "AR");
  assert.equal(user.canUndo(), false);

  user.transact(() => {
    text.insert(2, "L");
  });

  assert.equal(text.toString(), "ARL");
  assert.equal(user.canUndo(), true);

  user.undo();

  assert.equal(text.toString(), "AR");

  user.destroy();
  doc.destroy();
});
