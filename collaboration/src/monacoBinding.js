export async function bindYTextToMonaco({
  yText,
  editor,
  awareness = undefined,
  undoManager = undefined
}) {
  const Y = await import("yjs");

  if (!(yText instanceof Y.Text)) {
    throw new Error("A valid Y.Text instance is required.");
  }

  if (!editor || typeof editor.getModel !== "function") {
    throw new Error("A valid Monaco editor instance is required.");
  }

  const model = editor.getModel();

  if (!model) {
    throw new Error("The Monaco editor has no active model.");
  }

  if (
    undoManager !== undefined &&
    (!undoManager || typeof undoManager.trackOrigin !== "function")
  ) {
    throw new Error("A valid user UndoManager wrapper is required.");
  }

  const { MonacoBinding } = await import("y-monaco");

  const binding = new MonacoBinding(
    yText,
    model,
    new Set([editor]),
    awareness
  );

  // y-monaco uses the MonacoBinding instance as its Yjs
  // transaction origin. Register it with this user's UndoManager.
  if (undoManager) {
    undoManager.trackOrigin(binding);
  }

  return binding;
}
