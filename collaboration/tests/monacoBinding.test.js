import test from "node:test";
import assert from "node:assert/strict";

import {
  createProjectDoc,
  addFile,
  getFileContent,
  createUserUndoManager,
  bindYTextToMonaco
} from "../src/index.js";

class FakeMonacoBinding {
  constructor(yText, model, editors, awareness) {
    this.yText = yText;
    this.model = model;
    this.editors = editors;
    this.awareness = awareness;
    this.destroyCount = 0;
  }

  destroy() {
    this.destroyCount += 1;
  }
}

function setup() {
  const doc = createProjectDoc();

  addFile(doc, {
    id: "binding-file",
    name: "main.js",
    content: "Hello"
  });

  const yText = getFileContent(doc, "binding-file");
  const undoManager = createUserUndoManager(
    doc,
    yText,
    "binding-user"
  );

  const model = {};
  const editor = {
    getModel: () => model
  };

  return { doc, yText, undoManager, model, editor };
}

test("registers Monaco binding as a user undo origin", async () => {
  const state = setup();

  const binding = await bindYTextToMonaco({
    yText: state.yText,
    editor: state.editor,
    undoManager: state.undoManager,
    MonacoBindingClass: FakeMonacoBinding
  });

  state.doc.transact(() => {
    state.yText.insert(5, " World");
  }, binding);

  assert.equal(state.yText.toString(), "Hello World");
  assert.equal(state.undoManager.canUndo(), true);

  binding.destroy();
  state.undoManager.destroy();
  state.doc.destroy();
});

test("destroys Monaco binding and unregisters its undo origin", async () => {
  const state = setup();

  const binding = await bindYTextToMonaco({
    yText: state.yText,
    editor: state.editor,
    undoManager: state.undoManager,
    MonacoBindingClass: FakeMonacoBinding
  });

  const originalDestroy = binding.destroyCount;

  binding.destroy();

  assert.equal(binding.destroyCount, originalDestroy + 1);

  // Destroying twice must not call the underlying cleanup twice.
  binding.destroy();

  assert.equal(binding.destroyCount, originalDestroy + 1);

  // The disposed binding must no longer create undo history.
  state.doc.transact(() => {
    state.yText.insert(5, "!");
  }, binding);

  assert.equal(state.undoManager.canUndo(), false);

  state.undoManager.destroy();
  state.doc.destroy();
});

test("cleans up Monaco binding even if its destroy method throws", async () => {
  const state = setup();

  class FailingBinding extends FakeMonacoBinding {
    destroy() {
      throw new Error("Simulated cleanup failure");
    }
  }

  const binding = await bindYTextToMonaco({
    yText: state.yText,
    editor: state.editor,
    undoManager: state.undoManager,
    MonacoBindingClass: FailingBinding
  });

  assert.throws(() => binding.destroy(), /Simulated cleanup failure/);

  // The origin is unregistered in finally, even after an error.
  state.doc.transact(() => {
    state.yText.insert(5, "!");
  }, binding);

  assert.equal(state.undoManager.canUndo(), false);

  state.undoManager.destroy();
  state.doc.destroy();
});

test("rejects an editor without an active model", async () => {
  const state = setup();

  await assert.rejects(
    bindYTextToMonaco({
      yText: state.yText,
      editor: { getModel: () => null },
      MonacoBindingClass: FakeMonacoBinding
    }),
    /no active model/
  );

  state.undoManager.destroy();
  state.doc.destroy();
});
