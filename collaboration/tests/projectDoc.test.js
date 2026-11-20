import test from "node:test";
import assert from "node:assert/strict";
import * as Y from "yjs";

import {
  createProjectDoc,
  addFile,
  getFile,
  getFileContent,
  renameFile,
  updateFileLanguage,
  deleteFile,
  listFiles
} from "../src/index.js";

test("creates a shared project document", () => {
  const doc = createProjectDoc();
  assert.ok(doc instanceof Y.Doc);
  assert.ok(doc.getMap("files"));
  assert.ok(doc.getMap("project"));
  doc.destroy();
});

test("adds and retrieves a file", () => {
  const doc = createProjectDoc();
  addFile(doc, { id: "file-1", name: "main.js", language: "javascript", content: 'console.log("Hello");' });
  assert.equal(getFile(doc, "file-1").get("name"), "main.js");
  assert.equal(getFileContent(doc, "file-1").toString(), 'console.log("Hello");');
  doc.destroy();
});

test("renames and changes file language", () => {
  const doc = createProjectDoc();
  addFile(doc, { id: "file-1", name: "main.txt" });
  assert.equal(renameFile(doc, "file-1", "main.py"), true);
  assert.equal(updateFileLanguage(doc, "file-1", "python"), true);
  assert.equal(getFile(doc, "file-1").get("name"), "main.py");
  assert.equal(getFile(doc, "file-1").get("language"), "python");
  doc.destroy();
});

test("rejects duplicate file IDs", () => {
  const doc = createProjectDoc();
  addFile(doc, { id: "file-1", name: "a.js" });
  assert.throws(() => addFile(doc, { id: "file-1", name: "b.js" }), /already exists/);
  doc.destroy();
});

test("lists and deletes files", () => {
  const doc = createProjectDoc();
  addFile(doc, { id: "file-1", name: "main.js", content: "hello" });
  assert.equal(listFiles(doc).length, 1);
  assert.equal(deleteFile(doc, "file-1"), true);
  assert.equal(getFile(doc, "file-1"), null);
  assert.equal(listFiles(doc).length, 0);
  doc.destroy();
});

test("two replicas converge after concurrent edits", () => {
  const userA = createProjectDoc();
  const userB = createProjectDoc();

  addFile(userA, { id: "file-1", name: "main.js", content: "A" });
  Y.applyUpdate(userB, Y.encodeStateAsUpdate(userA));

  const textA = getFileContent(userA, "file-1");
  const textB = getFileContent(userB, "file-1");

  textA.insert(1, "X");
  textB.insert(1, "Y");

  Y.applyUpdate(userA, Y.encodeStateAsUpdate(userB));
  Y.applyUpdate(userB, Y.encodeStateAsUpdate(userA));

  const resultA = textA.toString();
  const resultB = textB.toString();

  assert.equal(resultA, resultB);
  assert.equal(resultA.length, 3);
  assert.ok(resultA.includes("X"));
  assert.ok(resultA.includes("Y"));

  userA.destroy();
  userB.destroy();
});
