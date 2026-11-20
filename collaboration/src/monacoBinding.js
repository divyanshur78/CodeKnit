export async function bindYTextToMonaco({
  yText,
  editor,
  awareness = undefined,
  undoManager = undefined,
  MonacoBindingClass = undefined
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
    (
      !undoManager ||
      typeof undoManager.trackOrigin !== "function" ||
      typeof undoManager.untrackOrigin !== "function"
    )
  ) {
    throw new Error("A valid user UndoManager wrapper is required.");
  }

  const BindingClass = MonacoBindingClass ??
    (await import("y-monaco")).MonacoBinding;

  if (typeof BindingClass !== "function") {
    throw new Error("A valid Monaco binding class is required.");
  }

  const binding = new BindingClass(
    yText,
    model,
    new Set([editor]),
    awareness
  );

  const originalDestroy = binding.destroy.bind(binding);
  let destroyed = false;

  binding.destroy = () => {
    if (destroyed) return;

    destroyed = true;

    try {
      originalDestroy();
    } finally {
      undoManager?.untrackOrigin(binding);
    }
  };

  try {
    undoManager?.trackOrigin(binding);
  } catch (error) {
    binding.destroy();
    throw error;
  }

  return binding;
}
