import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { createAwareness } from "./presence.js";

export function createCollaborationProvider({
  doc,
  projectId,
  serverUrl,
  awareness = undefined,
  ticket,
  connect: shouldConnect = true,
  ProviderClass = WebsocketProvider
}) {
  if (!(doc instanceof Y.Doc)) {
    throw new Error("A valid Yjs document is required.");
  }
  if (!projectId || typeof projectId !== "string" || !projectId.trim()) {
    throw new Error("A valid project ID is required.");
  }
  if (!serverUrl || !/^wss?:\/\//i.test(serverUrl)) {
    throw new Error("The server URL must use ws:// or wss://.");
  }
  if (!ticket || typeof ticket !== "string" || !ticket.trim()) {
    throw new Error("A valid authentication ticket is required.");
  }
  if (typeof ProviderClass !== "function") {
    throw new Error("A valid WebSocket provider class is required.");
  }

  const ownsAwareness = awareness === undefined;
  const sharedAwareness = awareness ?? createAwareness(doc);

  if (sharedAwareness.doc !== doc) {
    if (ownsAwareness) sharedAwareness.destroy();
    throw new Error("Awareness must belong to the supplied Yjs document.");
  }

  let status = "disconnected";
  let synced = false;
  let destroyed = false;

  const statusListeners = new Set();
  const syncListeners = new Set();

  let provider;

  try {
    provider = new ProviderClass(
      serverUrl,
      `project:${projectId}`,
      doc,
      {
        awareness: sharedAwareness,
        params: { ticket },
        connect: false
      }
    );
  } catch (error) {
    if (ownsAwareness) sharedAwareness.destroy();
    throw error;
  }

  function handleStatus(event) {
    status = event?.status === "connected" ? "connected" : "disconnected";
    for (const callback of statusListeners) callback(status);
  }

  function handleSync(value) {
    synced = Boolean(value);
    for (const callback of syncListeners) callback(synced);
  }

  provider.on("status", handleStatus);
  provider.on("sync", handleSync);

  function connect() {
    if (destroyed) {
      throw new Error("The collaboration provider has been destroyed.");
    }
    provider.connect();
  }

  function disconnect() {
    if (!destroyed) provider.disconnect();
  }

  function onStatus(callback) {
    if (typeof callback !== "function") {
      throw new Error("A status callback is required.");
    }
    if (destroyed) {
      throw new Error("The collaboration provider has been destroyed.");
    }
    statusListeners.add(callback);
    return () => statusListeners.delete(callback);
  }

  function onSync(callback) {
    if (typeof callback !== "function") {
      throw new Error("A sync callback is required.");
    }
    if (destroyed) {
      throw new Error("The collaboration provider has been destroyed.");
    }
    syncListeners.add(callback);
    return () => syncListeners.delete(callback);
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;

    try {
      provider.off("status", handleStatus);
      provider.off("sync", handleSync);
      provider.destroy();
    } finally {
      if (ownsAwareness) sharedAwareness.destroy();
      status = "disconnected";
      synced = false;
      statusListeners.clear();
      syncListeners.clear();
    }
  }

  const result = {
    provider,
    connect,
    disconnect,
    destroy,
    getStatus: () => status,
    isSynced: () => synced,
    onStatus,
    onSync
  };

  if (shouldConnect) connect();

  return result;
}
