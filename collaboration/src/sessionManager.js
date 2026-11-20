import * as Y from "yjs";
import {
  FILES_KEY,
  createProjectDoc,
  addFile,
  getFile,
  getFileContent,
  renameFile,
  updateFileLanguage,
  deleteFile,
  listFiles
} from "./projectDoc.js";
import { bindYTextToMonaco } from "./monacoBinding.js";
import {
  createAwareness,
  setLocalUser,
  setActiveFile,
  clearLocalPresence,
  getConnectedUsers,
  observePresence
} from "./presence.js";
import {
  createOfflinePersistence,
  waitForOfflineSync,
  destroyOfflinePersistence
} from "./persistence.js";
import { createUserUndoManager } from "./undoManager.js";
import { createCollaborationProvider } from "./provider.js";
import {
  recordRevision,
  getRevision,
  listRevisions,
  observeRevisions
} from "./revisions.js";
import {
  recordExecutionSnapshot,
  getExecutionSnapshot,
  listExecutionSnapshots,
  observeExecutionSnapshots
} from "./executionSnapshots.js";

function validateOptions(options) {
  if (!options || typeof options !== "object") {
    throw new Error("Session options are required.");
  }

  if (
    typeof options.projectId !== "string" ||
    !options.projectId.trim()
  ) {
    throw new Error("A valid project ID is required.");
  }

  if (!options.user || typeof options.user !== "object") {
    throw new Error("A collaboration user is required.");
  }

  if (
    typeof options.user.id !== "string" ||
    !options.user.id.trim()
  ) {
    throw new Error("A valid user ID is required.");
  }

  if (
    typeof options.user.name !== "string" ||
    !options.user.name.trim()
  ) {
    throw new Error("A valid user name is required.");
  }

  if (
    options.doc !== undefined &&
    !(options.doc instanceof Y.Doc)
  ) {
    throw new Error("The supplied document must be a Y.Doc.");
  }
}

export async function createCollaborationSession(options) {
  validateOptions(options);

  const {
    projectId,
    user,
    serverUrl,
    ticket,
    doc: suppliedDoc,
    persist = true,
    connect: connectImmediately = true,
    persistenceFactory = createOfflinePersistence,
    persistenceWaiter = waitForOfflineSync,
    providerFactory = createCollaborationProvider,
    MonacoBindingClass
  } = options;

  if (typeof persistenceFactory !== "function") {
    throw new Error("A valid persistence factory is required.");
  }

  if (typeof persistenceWaiter !== "function") {
    throw new Error("A valid persistence waiter is required.");
  }

  if (typeof providerFactory !== "function") {
    throw new Error("A valid provider factory is required.");
  }

  const ownsDoc = suppliedDoc === undefined;
  const doc = suppliedDoc ?? createProjectDoc();
  const awareness = createAwareness(doc);

  let persistence = null;
  let provider = null;
  let destroyed = false;

  const bindings = new Map();
  const undoManagers = new Map();

  const statusListeners = new Set();
  const syncListeners = new Set();

  let unsubscribeProviderStatus = null;
  let unsubscribeProviderSync = null;

  function detachProviderListeners() {
    unsubscribeProviderStatus?.();
    unsubscribeProviderSync?.();
    unsubscribeProviderStatus = null;
    unsubscribeProviderSync = null;
  }

  function attachProviderListeners(nextProvider) {
    unsubscribeProviderStatus = nextProvider.onStatus(status => {
      for (const callback of [...statusListeners]) callback(status);
    });

    unsubscribeProviderSync = nextProvider.onSync(synced => {
      for (const callback of [...syncListeners]) callback(synced);
    });
  }

  function assertActive() {
    if (destroyed) {
      throw new Error("The collaboration session has been destroyed.");
    }
  }

  function requireFile(fileId) {
    const file = getFile(doc, fileId);

    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    return file;
  }

  function unbindEditor(fileId) {
    const binding = bindings.get(fileId);

    if (binding) {
      bindings.delete(fileId);
      binding.destroy();
    }

    const undoManager = undoManagers.get(fileId);

    if (undoManager) {
      undoManagers.delete(fileId);
      undoManager.destroy();
    }
  }

  function disconnect() {
    if (provider) provider.disconnect();
  }

  function connect(connection = {}) {
    assertActive();

    const nextServerUrl = connection.serverUrl ?? serverUrl;
    const nextTicket = connection.ticket ?? ticket;

    if (!nextServerUrl || !nextTicket) {
      throw new Error(
        "A WebSocket server URL and authentication ticket are required."
      );
    }

    if (provider) {
      detachProviderListeners();
      provider.destroy();
      provider = null;
    }

    provider = providerFactory({
      doc,
      projectId,
      serverUrl: nextServerUrl,
      ticket: nextTicket,
      awareness,
      connect: connection.connect ?? true,
      ...(connection.ProviderClass
        ? { ProviderClass: connection.ProviderClass }
        : {})
    });

    attachProviderListeners(provider);

    return provider;
  }

  const session = {
    projectId,
    userId: user.id,
    doc,
    awareness,

    get destroyed() {
      return destroyed;
    },

    get persistence() {
      return persistence;
    },

    get provider() {
      return provider;
    },

    getFiles() {
      assertActive();
      return listFiles(doc);
    },

    getFile(fileId) {
      assertActive();
      return getFile(doc, fileId);
    },

    getFileContent(fileId) {
      assertActive();
      return getFileContent(doc, fileId)?.toString() ?? null;
    },

    addFile(input) {
      assertActive();
      return addFile(doc, input);
    },

    renameFile(fileId, name) {
      assertActive();
      return renameFile(doc, fileId, name);
    },

    updateFileLanguage(fileId, language) {
      assertActive();
      return updateFileLanguage(doc, fileId, language);
    },

    deleteFile(fileId) {
      assertActive();
      unbindEditor(fileId);
      return deleteFile(doc, fileId);
    },

    async bindEditor(fileId, editor, bindingOptions = {}) {
      assertActive();

      const yText = getFileContent(doc, fileId);

      if (!(yText instanceof Y.Text)) {
        throw new Error(`File not found or invalid: ${fileId}`);
      }

      unbindEditor(fileId);

      const undoManager = createUserUndoManager(
        doc,
        yText,
        user.id
      );

      try {
        const binding = await bindYTextToMonaco({
          yText,
          editor,
          awareness,
          undoManager,
          MonacoBindingClass:
            bindingOptions.MonacoBindingClass ?? MonacoBindingClass
        });

        assertActive();

        bindings.set(fileId, binding);
        undoManagers.set(fileId, undoManager);
        setActiveFile(awareness, fileId);

        return binding;
      } catch (error) {
        undoManager.destroy();
        throw error;
      }
    },

    unbindEditor,

    unbindAllEditors() {
      for (const fileId of [...bindings.keys()]) {
        unbindEditor(fileId);
      }

      for (const fileId of [...undoManagers.keys()]) {
        unbindEditor(fileId);
      }
    },

    getUndoManager(fileId) {
      assertActive();
      return undoManagers.get(fileId) ?? null;
    },

    undo(fileId) {
      assertActive();
      undoManagers.get(fileId)?.undo();
    },

    redo(fileId) {
      assertActive();
      undoManagers.get(fileId)?.redo();
    },

    canUndo(fileId) {
      assertActive();
      return undoManagers.get(fileId)?.canUndo() ?? false;
    },

    canRedo(fileId) {
      assertActive();
      return undoManagers.get(fileId)?.canRedo() ?? false;
    },

    setActiveFile(fileId) {
      assertActive();
      requireFile(fileId);
      setActiveFile(awareness, fileId);
    },

    getConnectedUsers() {
      assertActive();
      return getConnectedUsers(awareness);
    },

    observePresence(callback) {
      assertActive();
      return observePresence(awareness, callback);
    },

    observeFiles(callback) {
      assertActive();

      if (typeof callback !== "function") {
        throw new Error("A file observer callback is required.");
      }

      const files = doc.getMap(FILES_KEY);
      const observer = () => callback(listFiles(doc));

      files.observe(observer);

      return () => files.unobserve(observer);
    },

    recordRevision(input) {
      assertActive();

      return recordRevision(doc, {
        ...input,
        userId: input?.userId ?? user.id
      });
    },

    getRevision(revisionId) {
      assertActive();
      return getRevision(doc, revisionId);
    },

    listRevisions(filters) {
      assertActive();
      return listRevisions(doc, filters);
    },

    observeRevisions(callback) {
      assertActive();
      return observeRevisions(doc, callback);
    },

    recordExecutionSnapshot(input) {
      assertActive();

      return recordExecutionSnapshot(doc, {
        ...input,
        userId: input?.userId ?? user.id
      });
    },

    getExecutionSnapshot(snapshotId) {
      assertActive();
      return getExecutionSnapshot(doc, snapshotId);
    },

    listExecutionSnapshots(filters) {
      assertActive();
      return listExecutionSnapshots(doc, filters);
    },

    observeExecutionSnapshots(callback) {
      assertActive();
      return observeExecutionSnapshots(doc, callback);
    },

    connect,
    disconnect,

    getStatus() {
      return provider?.getStatus() ?? "disconnected";
    },

    isSynced() {
      return provider?.isSynced() ?? false;
    },

    onStatus(callback) {
      assertActive();

      if (typeof callback !== "function") {
        throw new Error("A status listener callback is required.");
      }

      statusListeners.add(callback);
      return () => statusListeners.delete(callback);
    },

    onSync(callback) {
      assertActive();

      if (typeof callback !== "function") {
        throw new Error("A sync listener callback is required.");
      }

      syncListeners.add(callback);
      return () => syncListeners.delete(callback);
    },

    destroy() {
      if (destroyed) return;

      destroyed = true;

      try {
        for (const fileId of [
          ...new Set([
            ...bindings.keys(),
            ...undoManagers.keys()
          ])
        ]) {
          unbindEditor(fileId);
        }
      } finally {
        try {
          detachProviderListeners();
          provider?.destroy();
        } finally {
          provider = null;
          statusListeners.clear();
          syncListeners.clear();

          try {
            if (persistence) {
              destroyOfflinePersistence(persistence);
            }
          } finally {
            persistence = null;
            clearLocalPresence(awareness);
            awareness.destroy();

            if (ownsDoc) doc.destroy();
          }
        }
      }
    }
  };

  try {
    setLocalUser(awareness, user);

    // Restore local state before creating a network provider.
    if (persist) {
      persistence = persistenceFactory(doc, projectId);
      await persistenceWaiter(persistence);
    }

    if (serverUrl && ticket && connectImmediately) {
      connect();
    }

    return session;
  } catch (error) {
    session.destroy();
    throw error;
  }
}
