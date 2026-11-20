
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
  saveProjectUpdate
} from "./yjsPersistence";

interface AuthenticatedClient extends WebSocket {
  userId: string;
  projectId: string;
}

type ProjectRoom = {
  clients: Set<AuthenticatedClient>;
  handler: Awaited<ReturnType<typeof createYjsRoom>>;
  destroy: () => void;
};

const wss = new WebSocketServer({
  noServer: true,
  maxPayload: 1024 * 1024
});

const rooms = new Map<string, Promise<ProjectRoom>>();

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

function getRawData(data: RawData): Uint8Array {
  if (Array.isArray(data)) {
    return new Uint8Array(Buffer.concat(data));
  }

  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  return new Uint8Array(data as Buffer);
}

async function getOrCreateRoom(
  projectId: string
): Promise<ProjectRoom> {
  const existingRoom = rooms.get(projectId);

  if (existingRoom) {
    return existingRoom;
  }

  const roomPromise = (async (): Promise<ProjectRoom> => {
    const Y = await import("yjs");
    const doc = new Y.Doc();

    // Restore the saved document before accepting connections.
    await loadProjectDocument(projectId, doc);

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

    // Persist every incremental Yjs update.
    const handlePersistence = (update: Uint8Array) => {
      void saveProjectUpdate(projectId, update).catch((error) => {
        console.error(
          `Yjs persistence error for project ${projectId}:`,
          error
        );
      });
    };

    doc.on("update", handlePersistence);

    return {
      clients,
      handler,
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
    rooms.delete(projectId);
    throw error;
  }
}

export function attachWebSocketServer(server: Server) {
  server.on(
    "upgrade",
    async (
      request: IncomingMessage,
      socket,
      head
    ) => {
      try {
        const requestUrl = new URL(
          request.url ?? "",
          `http://${request.headers.host ?? "localhost"}`
        );

        // Expected path: /project:<projectId>
        const match = requestUrl.pathname.match(
          /^\/project:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
        );

        if (!match) {
          socket.destroy();
          return;
        }

        const requestedProjectId = match[1];

        if (!requestedProjectId) {
          socket.destroy();
          return;
        }

        const ticket = requestUrl.searchParams.get("ticket");

        if (!ticket || ticket.length > 200) {
          socket.destroy();
          return;
        }

        // Validate and consume the single-use authentication ticket.
        const authenticated = await consumeTicket(ticket);

        if (
          !authenticated ||
          authenticated.project_id !== requestedProjectId
        ) {
          socket.destroy();
          return;
        }

        const room = await getOrCreateRoom(requestedProjectId);

        wss.handleUpgrade(
          request,
          socket,
          head,
          (websocket) => {
            const client = websocket as AuthenticatedClient;

            client.userId = authenticated.user_id;
            client.projectId = authenticated.project_id;

            room.clients.add(client);

            console.log(
              `User ${client.userId} connected to project ${client.projectId}`
            );

            // Send existing document and awareness state.
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
                `User ${client.userId} disconnected from project ${client.projectId}`
              );

              // Destroy the in-memory room when nobody remains.
              if (room.clients.size === 0) {
                room.destroy();
                rooms.delete(client.projectId);
              }
            });

            client.on("error", (error) => {
              console.error("WebSocket client error:", error);
            });
          }
        );
      } catch (error) {
        console.error("WebSocket upgrade error:", error);
        socket.destroy();
      }
    }
  );
}
