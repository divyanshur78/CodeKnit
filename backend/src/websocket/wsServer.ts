
import { createHash } from "crypto";
import { IncomingMessage, Server } from "http";
import {
  WebSocket,
  WebSocketServer,
  RawData
} from "ws";

import { pool } from "../config/database";
import { createYjsRoom } from "./yjsHandler";
import {
  loadProjectDocument,
  saveProjectUpdate,
  saveProjectSnapshot
} from "./yjsPersistence";

interface AuthenticatedClient extends WebSocket {
  userId: string;
  projectId: string;
}

type ProjectRoom = {
  clients: Set<AuthenticatedClient>;
  handler: Awaited<ReturnType<typeof createYjsRoom>>;
  flushPersistence: () => Promise<void>;
  destroy: () => void;
  pendingConnections: number;
  closing: boolean;
  closedPromise: Promise<void>;
  resolveClosed: () => void;
};

const SNAPSHOT_INTERVAL = 100;

const wss = new WebSocketServer({
  noServer: true,
  maxPayload: 1024 * 1024
});

const rooms = new Map<string, Promise<ProjectRoom>>();

// --------------------------------------------------
// WEBSOCKET TICKET AUTHENTICATION
// --------------------------------------------------

async function consumeTicket(ticket: string) {
  const tokenHash = createHash("sha256")
    .update(ticket)
    .digest("hex");

  const result = await pool.query(
    `UPDATE ws_tickets
     SET used_at = NOW()
     WHERE token_hash = $1
       AND used_at IS NULL
       AND expires_at > NOW()
     RETURNING user_id, project_id`,
    [tokenHash]
  );

  return result.rows[0] ?? null;
}

// --------------------------------------------------
// WEBSOCKET MESSAGE CONVERSION
// --------------------------------------------------

function getRawData(data: RawData): Uint8Array {
  if (Array.isArray(data)) {
    return new Uint8Array(Buffer.concat(data));
  }

  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  return new Uint8Array(data as Buffer);
}

// --------------------------------------------------
// PROJECT ROOM CREATION
// --------------------------------------------------

async function getOrCreateRoom(
  projectId: string
): Promise<ProjectRoom> {
  const existingRoom = rooms.get(projectId);

  if (existingRoom) {
    return existingRoom;
  }

  const roomPromise = (async (): Promise<ProjectRoom> => {
    console.log(`[WS] Creating room for project ${projectId}`);

    const Y = await import("yjs");
    const doc = new Y.Doc();

    // Restore snapshot and incremental updates.
    await loadProjectDocument(projectId, doc);

    console.log(`[WS] Project document restored: ${projectId}`);

    const clients = new Set<AuthenticatedClient>();

    const handler = await createYjsRoom(
      doc,
      (message, except) => {
        for (const client of clients) {
          if (
            client !== except &&
            client.readyState === WebSocket.OPEN
          ) {
            client.send(Buffer.from(message));
          }
        }
      }
    );

    let persistenceQueue: Promise<void> = Promise.resolve();
    let pendingUpdates = 0;

    // Keep updates in FIFO order until PostgreSQL confirms persistence.
    const unsavedUpdates: Buffer[] = [];

    const enqueue = (operation: () => Promise<void>) => {
      const task = persistenceQueue.then(operation);

      persistenceQueue = task.catch((error) => {
        console.error(
          `[WS] Persistence operation failed for ${projectId}:`,
          error
        );
      });

      return task;
    };

    const persistQueuedUpdates = async () => {
      while (unsavedUpdates.length > 0) {
        const update = unsavedUpdates[0];

        if (!update) break;

        await saveProjectUpdate(projectId, update);

        unsavedUpdates.shift();
        pendingUpdates++;
      }
    };

    const createSnapshotIfNeeded = async (force = false) => {
      if (
        pendingUpdates < SNAPSHOT_INTERVAL &&
        !(force && pendingUpdates > 0)
      ) {
        return;
      }

      await saveProjectSnapshot(projectId, doc);

      pendingUpdates = 0;

      console.log(`[WS] Snapshot saved: ${projectId}`);
    };

    const handlePersistence = (update: Uint8Array) => {
      unsavedUpdates.push(Buffer.from(update));

      void enqueue(async () => {
        await persistQueuedUpdates();

        try {
          await createSnapshotIfNeeded();
        } catch (error) {
          console.error(
            `[WS] Snapshot creation failed for ${projectId}:`,
            error
          );
        }
      }).catch(() => {
        // Failed updates remain queued for retry.
      });
    };

    doc.on("update", handlePersistence);

    const flushPersistence = async () => {
      await enqueue(async () => {
        await persistQueuedUpdates();
        await createSnapshotIfNeeded(true);

        console.log(
          `[WS] Final persistence flush completed: ${projectId}`
        );
      });
    };

    let resolveClosed = () => {};

    const closedPromise = new Promise<void>((resolve) => {
      resolveClosed = resolve;
    });

    return {
      clients,
      handler,
      flushPersistence,
      pendingConnections: 0,
      closing: false,
      closedPromise,
      resolveClosed,

      destroy: () => {
        doc.off("update", handlePersistence);
        handler.destroy();
        doc.destroy();
      }
    };
  })();

  rooms.set(projectId, roomPromise);

  try {
    return await roomPromise;
  } catch (error) {
    if (rooms.get(projectId) === roomPromise) {
      rooms.delete(projectId);
    }

    throw error;
  }
}

// --------------------------------------------------
// ROOM CONNECTION MANAGEMENT
// --------------------------------------------------

async function acquireRoom(
  projectId: string
): Promise<ProjectRoom> {
  while (true) {
    const room = await getOrCreateRoom(projectId);

    if (room.closing) {
      await room.closedPromise;
      continue;
    }

    room.pendingConnections++;

    return room;
  }
}

function releaseRoomReservation(
  projectId: string,
  room: ProjectRoom
) {
  room.pendingConnections = Math.max(
    0,
    room.pendingConnections - 1
  );

  void closeRoomIfIdle(projectId, room);
}

async function closeRoomIfIdle(
  projectId: string,
  room: ProjectRoom
) {
  if (
    room.clients.size > 0 ||
    room.pendingConnections > 0 ||
    room.closing
  ) {
    return;
  }

  room.closing = true;

  room.closedPromise = new Promise<void>((resolve) => {
    room.resolveClosed = resolve;
  });

  try {
    await room.flushPersistence();

    if (
      room.clients.size === 0 &&
      room.pendingConnections === 0
    ) {
      room.destroy();

      const mappedRoomPromise = rooms.get(projectId);

      if (mappedRoomPromise) {
        const mappedRoom = await mappedRoomPromise;

        if (mappedRoom === room) {
          rooms.delete(projectId);
        }
      }

      console.log(`[WS] Project room safely closed: ${projectId}`);
    }
  } catch (error) {
    console.error(
      `[WS] Unable to flush project ${projectId}. Room retained:`,
      error
    );

    room.closing = false;
  } finally {
    room.resolveClosed();
  }
}

// --------------------------------------------------
// WEBSOCKET SERVER / UPGRADE HANDLER
// --------------------------------------------------

export function attachWebSocketServer(server: Server) {
  server.on(
    "upgrade",
    async (
      request: IncomingMessage,
      socket,
      head
    ) => {
      console.log(
        "[WS DEBUG] Upgrade request:",
        request.url?.split("?")[0]
      );

      let reservedRoom: ProjectRoom | null = null;
      let reservedProjectId: string | null = null;
      let reservationActive = false;

      socket.on("error", (error) => {
        console.error("[WS DEBUG] Raw socket error:", error.message);
      });

      try {
        // Parse incoming URL.
        const requestUrl = new URL(
          request.url ?? "",
          `http://${request.headers.host ?? "localhost"}`
        );

        // Expected path: /project:PROJECT_UUID
        const match = requestUrl.pathname.match(
          /^\/project:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
        );

        if (!match) {
          console.log(
            "[WS DEBUG] Invalid WebSocket URL:",
            requestUrl.pathname
          );

          socket.destroy();
          return;
        }

        const requestedProjectId = match[1];

        if (!requestedProjectId) {
          console.log("[WS DEBUG] Missing project ID");

          socket.destroy();
          return;
        }

        reservedProjectId = requestedProjectId;

        // Validate ticket.
        const ticket = requestUrl.searchParams.get("ticket");

        if (!ticket || ticket.length > 200) {
          console.log("[WS DEBUG] Missing or invalid ticket");

          socket.destroy();
          return;
        }

        console.log("[WS DEBUG] Checking authentication ticket");

        const authenticated = await consumeTicket(ticket);

        console.log(
          "[WS DEBUG] Ticket result:",
          authenticated ? "VALID" : "INVALID"
        );

        if (
          !authenticated ||
          authenticated.project_id !== requestedProjectId
        ) {
          console.log("[WS DEBUG] Ticket/project mismatch");

          socket.destroy();
          return;
        }

        console.log("[WS DEBUG] Authentication successful");

        // Reserve project room.
        reservedRoom = await acquireRoom(requestedProjectId);
        reservationActive = true;

        console.log("[WS DEBUG] Starting WebSocket handshake");

        // Upgrade HTTP connection to WebSocket.
        wss.handleUpgrade(
          request,
          socket,
          head,
          (websocket) => {
            const room = reservedRoom!;

            room.pendingConnections--;
            reservationActive = false;

            const client = websocket as AuthenticatedClient;

            client.userId = authenticated.user_id;
            client.projectId = authenticated.project_id;

            room.clients.add(client);

            console.log(
              `[WS] User ${client.userId} connected to project ${client.projectId}`
            );

            // Send initial Yjs synchronization state.
            room.handler.sendInitialState(client);

            client.on("message", (data: RawData) => {
              room.handler.handleMessage(
                client,
                getRawData(data)
              );
            });

            client.on("close", () => {
              room.handler.removeClient(client);
              room.clients.delete(client);

              console.log(
                `[WS] User ${client.userId} disconnected from project ${client.projectId}`
              );

              void closeRoomIfIdle(
                client.projectId,
                room
              );
            });

            client.on("error", (error) => {
              console.error(
                "[WS] Client connection error:",
                error
              );
            });
          }
        );
      } catch (error) {
        console.error(
          "[WS DEBUG] WebSocket upgrade error:",
          error
        );

        if (
          reservationActive &&
          reservedRoom &&
          reservedProjectId
        ) {
          releaseRoomReservation(
            reservedProjectId,
            reservedRoom
          );
        }

        socket.destroy();
      }
    }
  );

  console.log("[WS] WebSocket upgrade handler attached");
}
