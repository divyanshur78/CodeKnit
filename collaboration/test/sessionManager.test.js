import test from "node:test";
import assert from "node:assert/strict";
import * as Y from "yjs";
import { createCollaborationSession } from "../src/index.js";

function createFakeEditor() {
  return {
    getModel() {
      return {};
    }
  };
}

class FakeMonacoBinding {
  constructor(yText, model, editors, awareness) {
    this.yText = yText;
    this.model = model;
    this.editors = editors;
    this.awareness = awareness;
    this.destroyed = false;
  }

  destroy() {
    this.destroyed = true;
  }
}

test("creates a local collaboration session", async () => {
  const session = await createCollaborationSession({
    projectId: "session-local",
    user: { id: "user-1", name: "User One" },
    persist: false
  });

  try {
    assert.ok(session.doc instanceof Y.Doc);
    assert.equal(session.projectId, "session-local");
    assert.equal(session.getStatus(), "disconnected");
  } finally {
    session.destroy();
  }
});

test("supports shared file operations", async () => {
  const session = await createCollaborationSession({
    projectId: "session-files",
    user: { id: "user-1", name: "User One" },
    persist: false
  });

  try {
    session.addFile({
      id: "file-1",
      name: "main.js",
      language: "javascript",
      content: "const value = 1;"
    });

    assert.equal(session.getFile("file-1").get("name"), "main.js");
    assert.equal(session.getFileContent("file-1"), "const value = 1;");

    session.renameFile("file-1", "app.js");
    assert.equal(session.getFile("file-1").get("name"), "app.js");

    session.deleteFile("file-1");
    assert.equal(session.getFile("file-1"), null);
  } finally {
    session.destroy();
  }
});

test("binds an editor and supports per-user undo", async () => {
  const session = await createCollaborationSession({
    projectId: "session-editor",
    user: { id: "user-1", name: "User One" },
    persist: false,
    MonacoBindingClass: FakeMonacoBinding
  });

  try {
    session.addFile({
      id: "file-1",
      name: "main.js",
      language: "javascript",
      content: ""
    });

    const binding = await session.bindEditor("file-1", createFakeEditor());

    assert.ok(binding instanceof FakeMonacoBinding);
    assert.equal(session.canUndo("file-1"), false);

    session.unbindEditor("file-1");
    assert.equal(binding.destroyed, true);
  } finally {
    session.destroy();
  }
});

test("records revisions and execution snapshots", async () => {
  const session = await createCollaborationSession({
    projectId: "session-history",
    user: { id: "user-1", name: "User One" },
    persist: false
  });

  try {
    session.addFile({
      id: "file-1",
      name: "main.js",
      language: "javascript",
      content: "console.log('hello');"
    });

    const revision = session.recordRevision({
      fileId: "file-1",
      type: "manual",
      description: "Initial version"
    });

    const snapshot = session.recordExecutionSnapshot({
      fileId: "file-1",
      revisionId: revision.id
    });

    assert.equal(session.getRevision(revision.id).fileId, "file-1");
    assert.equal(snapshot.content, "console.log('hello');");
    assert.equal(snapshot.revisionId, revision.id);
  } finally {
    session.destroy();
  }
});

test("observes shared file changes and supports cleanup", async () => {
  const session = await createCollaborationSession({
    projectId: "session-observe",
    user: { id: "user-1", name: "User One" },
    persist: false
  });

  try {
    let changes = 0;
    const unsubscribe = session.observeFiles(() => {
      changes += 1;
    });

    session.addFile({
      id: "file-1",
      name: "main.js",
      content: ""
    });

    assert.ok(changes > 0);
    unsubscribe();
  } finally {
    session.destroy();
  }
});

test("rejects operations after session destruction", async () => {
  const session = await createCollaborationSession({
    projectId: "session-destroy",
    user: { id: "user-1", name: "User One" },
    persist: false
  });

  session.destroy();

  assert.throws(
    () => session.addFile({
      id: "file-1",
      name: "main.js"
    })
  );
});

test("restores offline data before connecting provider", async () => {
  const order = [];

  const session = await createCollaborationSession({
    projectId: "session-order",
    user: { id: "user-1", name: "User One" },
    serverUrl: "ws://localhost:1234",
    ticket: "test-ticket",
    doc: new Y.Doc(),

    persistenceFactory: () => {
      order.push("persistence-created");

      return {
        whenSynced: Promise.resolve(),
        destroy() {
          order.push("persistence-destroy");
        }
      };
    },

    persistenceWaiter: async (persistence) => {
      await persistence.whenSynced;
      order.push("persistence-restored");
    },

    providerFactory: (options) => {
      const fakeProvider = {
        connect() {
          order.push("provider-connect");
        },
        disconnect() {},
        destroy() {},
        getStatus() {
          return "connected";
        },
        isSynced() {
          return true;
        },
        onStatus() {
          return () => {};
        },
        onSync() {
          return () => {};
        }
      };

      if (options.connect) {
        fakeProvider.connect();
      }

      return fakeProvider;
    }
  });

  try {
    assert.deepEqual(order, [
      "persistence-created",
      "persistence-restored",
      "provider-connect"
    ]);
  } finally {
    session.destroy();
  }
});

test("reconnects session with a new provider and cleans up the previous provider", async () => {
  const providers = [];

  const session = await createCollaborationSession({
    projectId: "session-reconnect",
    user: { id: "user-1", name: "User One" },
    persist: false,
    serverUrl: "ws://localhost:1234",
    ticket: "old-ticket",

    providerFactory: (options) => {
      const listeners = new Map();

      const fakeProvider = {
        options,
        connected: false,
        destroyed: false,

        connect() {
          this.connected = true;
        },

        disconnect() {
          this.connected = false;
        },

        destroy() {
          this.destroyed = true;
        },

        getStatus() {
          return this.connected ? "connected" : "disconnected";
        },

        isSynced() {
          return false;
        },

        onStatus(callback) {
          listeners.set("status", callback);
          return () => listeners.delete("status");
        },

        onSync(callback) {
          listeners.set("sync", callback);
          return () => listeners.delete("sync");
        }
      };

      fakeProvider.emitStatus = (value) => listeners.get("status")?.(value);
      fakeProvider.emitSync = (value) => listeners.get("sync")?.(value);

      if (options.connect !== false) fakeProvider.connect();
      providers.push(fakeProvider);
      return fakeProvider;
    }
  });

  try {
    const firstProvider = session.provider;

    assert.equal(firstProvider.connected, true);

    session.disconnect();
    assert.equal(firstProvider.connected, false);

    session.connect({
      serverUrl: "ws://localhost:5678",
      ticket: "new-ticket"
    });

    const secondProvider = session.provider;

    assert.notEqual(secondProvider, firstProvider);
    assert.equal(firstProvider.destroyed, true);
    assert.equal(secondProvider.connected, true);
    assert.equal(secondProvider.options.serverUrl, "ws://localhost:5678");
    assert.equal(secondProvider.options.ticket, "new-ticket");

    const statuses = [];
    const syncStates = [];

    const unsubscribeStatus = session.onStatus(value => statuses.push(value));
    const unsubscribeSync = session.onSync(value => syncStates.push(value));

    secondProvider.emitStatus("connected");
    secondProvider.emitSync(true);

    assert.deepEqual(statuses, ["connected"]);
    assert.deepEqual(syncStates, [true]);

    unsubscribeStatus();
    unsubscribeSync();
  } finally {
    session.destroy();
  }

  assert.equal(providers.length, 2);
  assert.equal(providers[1].destroyed, true);
});

test("preserves session status and sync listeners across provider replacement", async () => {
  const providers = [];

  const session = await createCollaborationSession({
    projectId: "session-listener-lifecycle",
    user: { id: "user-1", name: "User One" },
    persist: false,
    serverUrl: "ws://localhost:1234",
    ticket: "first-ticket",

    providerFactory: (options) => {
      const listeners = {
        status: new Set(),
        sync: new Set()
      };

      const fakeProvider = {
        options,
        destroyed: false,

        connect() {},
        disconnect() {},

        destroy() {
          this.destroyed = true;
        },

        getStatus() {
          return "disconnected";
        },

        isSynced() {
          return false;
        },

        onStatus(callback) {
          listeners.status.add(callback);
          return () => listeners.status.delete(callback);
        },

        onSync(callback) {
          listeners.sync.add(callback);
          return () => listeners.sync.delete(callback);
        },

        emitStatus(value) {
          for (const callback of listeners.status) callback(value);
        },

        emitSync(value) {
          for (const callback of listeners.sync) callback(value);
        }
      };

      providers.push(fakeProvider);
      return fakeProvider;
    }
  });

  try {
    const statuses = [];
    const syncStates = [];

    const unsubscribeStatus = session.onStatus(value => statuses.push(value));
    const unsubscribeSync = session.onSync(value => syncStates.push(value));

    const firstProvider = session.provider;

    session.connect({
      serverUrl: "ws://localhost:5678",
      ticket: "second-ticket"
    });

    const secondProvider = session.provider;

    assert.equal(firstProvider.destroyed, true);

    secondProvider.emitStatus("connected");
    secondProvider.emitSync(true);

    assert.deepEqual(statuses, ["connected"]);
    assert.deepEqual(syncStates, [true]);

    unsubscribeStatus();
    unsubscribeSync();
  } finally {
    session.destroy();
  }

  assert.equal(providers.length, 2);
  assert.equal(providers[1].destroyed, true);
});
