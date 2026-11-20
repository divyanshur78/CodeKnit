import { useEffect, useState } from "react";

type Collaborator = {
  clientId: number;
  id: string;
  name: string;
  color: string;
  activeFileId: string | null;
};

type Props = {
  session: any;
  userName: string;
  activeFileId: string;
};

export default function CollaboratorPresence({
  session,
  userName,
  activeFileId
}: Props) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  // Subscribe to the Awareness instance owned by the collaboration session.
  useEffect(() => {
    if (!session || session.destroyed) {
      setCollaborators([]);
      return;
    }

    const updateCollaborators = () => {
      setCollaborators(
        session.getConnectedUsers() as Collaborator[]
      );
    };

    const unsubscribe = session.observePresence(updateCollaborators);

    // Get the current state immediately.
    updateCollaborators();

    return () => {
      unsubscribe();
    };
  }, [session]);

  // The session itself owns local user identity and Awareness lifecycle.
  useEffect(() => {
    if (!session || session.destroyed || !activeFileId) return;

    try {
      session.setActiveFile(activeFileId);
    } catch (error) {
      console.error("Unable to update active collaboration file:", error);
    }
  }, [session, activeFileId]);

  return (
    <div className="ck-presence" title="Project collaborators">
      <div className="ck-presence-avatars">
        <span className="ck-presence-avatar ck-presence-self">
          {userName.charAt(0).toUpperCase()}
        </span>

        {collaborators.slice(0, 3).map((person) => (
          <span
            className="ck-presence-avatar"
            key={person.clientId}
            style={{ backgroundColor: person.color }}
            title={`${person.name}${person.activeFileId ? ` · ${person.activeFileId}` : ""}`}
          >
            {person.name.charAt(0).toUpperCase()}
          </span>
        ))}
      </div>

      <span className="ck-presence-label">
        {collaborators.length
          ? `${collaborators.length + 1} collaborators`
          : "Only you"}
      </span>
    </div>
  );
}
