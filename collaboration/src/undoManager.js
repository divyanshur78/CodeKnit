import * as Y from "yjs";

export function createUserUndoManager(doc, yText, userId) {
  if (!(doc instanceof Y.Doc)) {
    throw new Error("A valid Yjs document is required.");
  }

  if (!(yText instanceof Y.Text)) {
    throw new Error("A valid Y.Text instance is required.");
  }

  if (yText.doc !== doc) {
    throw new Error("The Y.Text must belong to the supplied Yjs document.");
  }

  if (!userId || typeof userId !== "string" || !userId.trim()) {
    throw new Error("A valid user ID is required.");
  }

  const origin = Object.freeze({ userId });
  const trackedOrigins = new Set([origin]);

  const undoManager = new Y.UndoManager(yText, {
    trackedOrigins,
    captureTimeout: 0
  });

  function transact(callback) {
    if (typeof callback !== "function") {
      throw new Error("A transaction callback is required.");
    }

    doc.transact(callback, origin);
  }

  function trackOrigin(transactionOrigin) {
    if (
      transactionOrigin === null ||
      transactionOrigin === undefined
    ) {
      throw new Error("A valid transaction origin is required.");
    }

    trackedOrigins.add(transactionOrigin);
  }

  function untrackOrigin(transactionOrigin) {
    if (transactionOrigin !== origin) {
      trackedOrigins.delete(transactionOrigin);
    }
  }

  let destroyed = false;

  return {
    userId,
    undoManager,
    transact,
    trackOrigin,
    untrackOrigin,

    undo() {
      if (!destroyed) undoManager.undo();
    },

    redo() {
      if (!destroyed) undoManager.redo();
    },

    canUndo() {
      return !destroyed && undoManager.undoStack.length > 0;
    },

    canRedo() {
      return !destroyed && undoManager.redoStack.length > 0;
    },

    stopCapturing() {
      if (!destroyed) undoManager.stopCapturing();
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      undoManager.destroy();
      trackedOrigins.clear();
    }
  };
}
