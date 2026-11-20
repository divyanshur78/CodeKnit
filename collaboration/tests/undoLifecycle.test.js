import test from "node:test";
import assert from "node:assert/strict";
import * as Y from "yjs";

import {
  createProjectDoc,
  addFile,
  getFileContent,
  createUserUndoManager
} from "../src/index.js";

test("rejects Y.Text belonging to a different document", () => {
  const docA = createProjectDoc();
  const docB = createProjectDoc();

  addFile(docA, {
    id: "file-a",
    name: "a.js",
    content: "A"
  });

  addFile(docB, {
    id: "file-b",
    name: "b.js",
    content: "B"
  });

  const textFromB = getFileContent(docB, "file-b");

  assert.throws(
    () => createUserUndoManager(docA, textFromB, "user-a"),
    /must belong to the supplied Yjs document/
  );

  docA.destroy();
  docB.destroy();
});

test("UndoManager destruction is safe when repeated", () => {
  const doc = createProjectDoc();

  addFile(doc, {
    id: "cleanup-file",
    name: "cleanup.js",
    content: "A"
  });

  const text = getFileContent(doc, "cleanup-file");
  const user = createUserUndoManager(doc, text, "cleanup-user");

  user.transact(() => text.insert(1, "B"));

  assert.equal(user.canUndo(), true);

  user.destroy();
  user.destroy();

  assert.equal(user.canUndo(), false);
  assert.equal(user.canRedo(), false);

  doc.destroy();
});
