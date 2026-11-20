
import { WebSocket } from "ws";

import type { Doc } from "yjs" with { "resolution-mode": "import" };

type Broadcast = (
  message: Uint8Array,
  except?: WebSocket
) => void;

type AwarenessChange = {
  added: number[];
  updated: number[];
  removed: number[];
};

export async function createYjsRoom(
  doc: Doc,
  broadcast: Broadcast
) {
  const [
    awarenessProtocol,
    syncProtocol,
    encoding,
    decoding
  ] = await Promise.all([
    import("y-protocols/awareness"),
    import("y-protocols/sync"),
    import("lib0/encoding"),
    import("lib0/decoding")
  ]);

  const MESSAGE_SYNC = 0;
  const MESSAGE_AWARENESS = 1;
  const MESSAGE_QUERY_AWARENESS = 3;

  const awareness = new awarenessProtocol.Awareness(doc);
  const clientAwarenessIds = new WeakMap<WebSocket, Set<number>>();

  awareness.on(
    "update",
    (change: AwarenessChange, origin: unknown) => {
      const { added, updated, removed } = change;
      const changedClients = [...added, ...updated, ...removed];

      if (origin instanceof WebSocket) {
        let ids = clientAwarenessIds.get(origin);

        if (!ids) {
          ids = new Set<number>();
          clientAwarenessIds.set(origin, ids);
        }

        [...added, ...updated].forEach(id => ids!.add(id));
        removed.forEach(id => ids!.delete(id));
      }

      if (changedClients.length === 0) return;

      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          awareness,
          changedClients
        )
      );

      broadcast(
        encoding.toUint8Array(encoder),
        origin instanceof WebSocket ? origin : undefined
      );
    }
  );

  const handleDocUpdate = (update: Uint8Array, origin: unknown) => {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeUpdate(encoder, update);

  broadcast(
    encoding.toUint8Array(encoder),
    origin instanceof WebSocket ? origin : undefined
  );
};

    doc.on("update", handleDocUpdate);

  function sendInitialState(client: WebSocket) {
    const syncEncoder = encoding.createEncoder();
    encoding.writeVarUint(syncEncoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(syncEncoder, doc);

    client.send(Buffer.from(encoding.toUint8Array(syncEncoder)));

    const clients = Array.from(awareness.getStates().keys());

    if (clients.length > 0) {
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(
          awareness,
          clients
        )
      );

      client.send(Buffer.from(encoding.toUint8Array(awarenessEncoder)));
    }
  }

  function handleMessage(client: WebSocket, data: Uint8Array) {
    try {
      const decoder = decoding.createDecoder(data);
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case MESSAGE_SYNC: {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MESSAGE_SYNC);

          syncProtocol.readSyncMessage(
            decoder,
            encoder,
            doc,
            client
          );

          if (encoding.length(encoder) > 1) {
            client.send(Buffer.from(encoding.toUint8Array(encoder)));
          }
          break;
        }

        case MESSAGE_AWARENESS: {
          const update = decoding.readVarUint8Array(decoder);
          awarenessProtocol.applyAwarenessUpdate(
            awareness,
            update,
            client
          );
          break;
        }

        case MESSAGE_QUERY_AWARENESS: {
          const clients = Array.from(awareness.getStates().keys());

          if (clients.length === 0) break;

          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
          encoding.writeVarUint8Array(
            encoder,
            awarenessProtocol.encodeAwarenessUpdate(
              awareness,
              clients
            )
          );

          client.send(Buffer.from(encoding.toUint8Array(encoder)));
          break;
        }

        default:
          client.close(1002, "Unsupported Yjs message type");
      }
    } catch (error) {
      console.error("Yjs message handling error:", error);

      if (client.readyState === WebSocket.OPEN) {
        client.close(1002, "Invalid Yjs message");
      }
    }
  }

  function removeClient(client: WebSocket) {
    const clientIds = clientAwarenessIds.get(client);

    if (clientIds && clientIds.size > 0) {
      awarenessProtocol.removeAwarenessStates(
        awareness,
        Array.from(clientIds),
        client
      );
    }

    clientAwarenessIds.delete(client);
  }

  function destroy() {
    doc.off("update", handleDocUpdate);
    awareness.destroy();
  }

  return {
    doc,
    awareness,
    sendInitialState,
    handleMessage,
    removeClient,
    destroy
  };
}
