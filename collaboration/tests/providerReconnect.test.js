import test from "node:test";
import assert from "node:assert/strict";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { createCollaborationProvider } from "../src/provider.js";

test("automatically reconnects after an unexpected WebSocket disconnection", async () => {
  const sockets = [];

  class FakeWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    constructor(url) {
      this.url = url;
      this.readyState = FakeWebSocket.CONNECTING;
      this.CONNECTING = FakeWebSocket.CONNECTING;
      this.OPEN = FakeWebSocket.OPEN;
      this.CLOSING = FakeWebSocket.CLOSING;
      this.CLOSED = FakeWebSocket.CLOSED;
      this.binaryType = "blob";
      this.onopen = null;
      this.onclose = null;
      this.onerror = null;
      this.onmessage = null;

      sockets.push(this);

      queueMicrotask(() => {
        if (this.readyState !== FakeWebSocket.CONNECTING) return;

        this.readyState = FakeWebSocket.OPEN;
        this.onopen?.({});
      });
    }

    send() {}

    close(code = 1000, reason = "") {
      if (this.readyState === FakeWebSocket.CLOSED) return;

      this.readyState = FakeWebSocket.CLOSED;
      queueMicrotask(() => {
        this.onclose?.({ code, reason });
      });
    }

    simulateNetworkDrop() {
      this.readyState = FakeWebSocket.CLOSED;
      this.onclose?.({
        code: 1006,
        reason: "Simulated network interruption"
      });
    }
  }

  class TestWebsocketProvider extends WebsocketProvider {
    constructor(url, room, doc, options) {
      super(url, room, doc, {
        ...options,
        WebSocketPolyfill: FakeWebSocket,
        maxBackoffTime: 100,
        disableBc: true
      });
    }
  }

  const doc = new Y.Doc();

  const session = createCollaborationProvider({
    doc,
    projectId: "automatic-reconnect-test",
    serverUrl: "ws://localhost:3001",
    ticket: "test-ticket",
    ProviderClass: TestWebsocketProvider
  });

  try {
    assert.equal(sockets.length, 1);

    const firstSocket = sockets[0];

    await new Promise(resolve => setImmediate(resolve));

    assert.equal(firstSocket.readyState, FakeWebSocket.OPEN);

    firstSocket.simulateNetworkDrop();

    await new Promise(resolve => setTimeout(resolve, 300));

    assert.equal(
      sockets.length,
      2,
      "A new WebSocket connection should be created automatically"
    );

    assert.equal(sockets[1].url, "ws://localhost:3001/project:automatic-reconnect-test?ticket=test-ticket");
    assert.equal(sockets[1].readyState, FakeWebSocket.OPEN);
  } finally {
    session.destroy();
    doc.destroy();
  }
});

