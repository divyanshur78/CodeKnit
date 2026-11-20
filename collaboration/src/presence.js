import { Awareness } from "y-protocols/awareness";

export function createAwareness(doc) {
  if (!doc) {
    throw new Error("A Yjs document is required.");
  }

  return new Awareness(doc);
}

export function setLocalUser(awareness, user) {
  if (!user || typeof user !== "object") {
    throw new Error("Valid user information is required.");
  }

  if (!user.name || typeof user.name !== "string") {
    throw new Error("A user name is required.");
  }

  awareness.setLocalStateField("user", {
    id: String(user.id ?? awareness.clientID),
    name: user.name,
    color: user.color ?? "#4F46E5"
  });
}

export function setActiveFile(awareness, fileId) {
  if (typeof fileId !== "string" || !fileId) {
    throw new Error("A valid file ID is required.");
  }

  awareness.setLocalStateField("activeFileId", fileId);
}

export function clearLocalPresence(awareness) {
  awareness.setLocalState(null);
}

export function getConnectedUsers(awareness) {
  return Array.from(awareness.getStates().entries())
    .filter(([clientId, state]) => (
      clientId !== awareness.clientID && state.user
    ))
    .map(([clientId, state]) => ({
      clientId,
      ...state.user,
      activeFileId: state.activeFileId ?? null
    }));
}

export function observePresence(awareness, callback) {
  if (typeof callback !== "function") {
    throw new Error("A callback function is required.");
  }

  const handler = () => {
    callback(getConnectedUsers(awareness));
  };

  awareness.on("change", handler);

  return () => {
    awareness.off("change", handler);
  };
}
