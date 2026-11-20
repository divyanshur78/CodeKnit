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
