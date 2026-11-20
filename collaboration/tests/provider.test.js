import test from "node:test";
import assert from "node:assert/strict";
import * as Y from "yjs";
import { createAwareness } from "../src/presence.js";
import { createCollaborationProvider } from "../src/provider.js";

class FakeProvider {
  constructor(url, room, doc, options) {
    this.url = url;
    this.room = room;
    this.doc = doc;
    this.options = options;
    this.listeners = new Map();
    this.connected = false;
    this.destroyed = false;
    FakeProvider.lastInstance = this;
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event, value) {
    for (const callback of this.listeners.get(event) ?? []) {
      callback(value);
    }
  }

  connect() {
    this.connected = true;
  }

  disconnect() {
    this.connected = false;
    this.emit("status", { status: "disconnected" });
  }

  destroy() {
    this.destroyed = true;
  }
}

function setup(options = {}) {
  const doc = new Y.Doc();
  const awareness = createAwareness(doc);

  const session = createCollaborationProvider({
    doc,
    projectId: "test-project",
    serverUrl: "ws://localhost:3001",
    awareness,
    ticket: "test-ticket",
    ProviderClass: FakeProvider,
    ...options
  });

  return { doc, awareness, session, provider: FakeProvider.lastInstance };
}

test("creates provider with project room, document, awareness and ticket", () => {
  const { doc, awareness, session, provider } = setup({
    connect: false
  });

  assert.equal(provider.url, "ws://localhost:3001");
  assert.equal(provider.room, "project:test-project");
  assert.equal(provider.doc, doc);
  assert.equal(provider.options.awareness, awareness);
  assert.deepEqual(provider.options.params, { ticket: "test-ticket" });
  assert.equal(provider.options.connect, false);
  assert.equal(session.getStatus(), "disconnected");

  session.destroy();
  awareness.destroy();
  doc.destroy();
});

test("connects automatically by default and supports manual connection", () => {
  const first = setup();
  assert.equal(first.provider.connected, true);
  first.session.destroy();
  first.awareness.destroy();
  first.doc.destroy();

  const second = setup({ connect: false });
  assert.equal(second.provider.connected, false);

  second.session.connect();
  assert.equal(second.provider.connected, true);

  second.session.disconnect();
  assert.equal(second.provider.connected, false);

  second.session.destroy();
  second.awareness.destroy();
  second.doc.destroy();
});

test("reports status and synchronization events and supports unsubscribe", () => {
  const { doc, awareness, session, provider } = setup({
    connect: false
  });

  const statuses = [];
  const syncStates = [];

  const removeStatus = session.onStatus(value => statuses.push(value));
  const removeSync = session.onSync(value => syncStates.push(value));

  provider.emit("status", { status: "connected" });
  provider.emit("sync", true);
  provider.emit("sync", false);

  assert.deepEqual(statuses, ["connected"]);
  assert.deepEqual(syncStates, [true, false]);
  assert.equal(session.getStatus(), "connected");
  assert.equal(session.isSynced(), false);

  removeStatus();
  removeSync();

  provider.emit("status", { status: "disconnected" });
  provider.emit("sync", true);

  assert.deepEqual(statuses, ["connected"]);
  assert.deepEqual(syncStates, [true, false]);

  session.destroy();
  awareness.destroy();
  doc.destroy();
});

test("validates inputs and destroys provider safely", () => {
  const doc = new Y.Doc();

  assert.throws(
    () => createCollaborationProvider({
      doc,
      projectId: "p",
      serverUrl: "http://localhost:3001",
      ticket: "ticket",
      ProviderClass: FakeProvider
    }),
    /ws:\/\/ or wss:\/\//
  );

  assert.throws(
    () => createCollaborationProvider({
      doc,
      projectId: "p",
      serverUrl: "ws://localhost:3001",
      ticket: "",
      ProviderClass: FakeProvider
    }),
    /authentication ticket/
  );

  const otherDoc = new Y.Doc();
  const wrongAwareness = createAwareness(otherDoc);

  assert.throws(
    () => createCollaborationProvider({
      doc,
      projectId: "p",
      serverUrl: "ws://localhost:3001",
      ticket: "ticket",
      awareness: wrongAwareness,
      ProviderClass: FakeProvider
    }),
    /Awareness must belong/
  );

  wrongAwareness.destroy();
  otherDoc.destroy();

  const awareness = createAwareness(doc);
  const session = createCollaborationProvider({
    doc,
    projectId: "p",
    serverUrl: "ws://localhost:3001",
    ticket: "ticket",
    awareness,
    ProviderClass: FakeProvider,
    connect: false
  });

  const provider = session.provider;
  session.destroy();
  session.destroy();

  assert.equal(provider.destroyed, true);
  assert.throws(() => session.connect(), /destroyed/);

  awareness.destroy();
  doc.destroy();
});

test("destroys internally-created awareness but preserves caller-owned awareness", () => {
  const doc = new Y.Doc();

  const session = createCollaborationProvider({
    doc,
    projectId: "owned-awareness",
    serverUrl: "ws://localhost:3001",
    ticket: "test-ticket",
    ProviderClass: FakeProvider,
    connect: false
  });

  const ownedAwareness = session.provider.options.awareness;
  const originalDestroy = ownedAwareness.destroy.bind(ownedAwareness);
  let ownedDestroyed = false;

  ownedAwareness.destroy = () => {
    ownedDestroyed = true;
    originalDestroy();
  };

  session.destroy();
  assert.equal(ownedDestroyed, true);

  const callerAwareness = createAwareness(doc);
  const callerSession = createCollaborationProvider({
    doc,
    projectId: "caller-awareness",
    serverUrl: "ws://localhost:3001",
    ticket: "test-ticket",
    awareness: callerAwareness,
    ProviderClass: FakeProvider,
    connect: false
  });

  let callerDestroyed = false;
  const callerOriginalDestroy = callerAwareness.destroy.bind(callerAwareness);

  callerAwareness.destroy = () => {
    callerDestroyed = true;
    callerOriginalDestroy();
  };

  callerSession.destroy();
  assert.equal(callerDestroyed, false);

  callerAwareness.destroy();
  doc.destroy();
});
