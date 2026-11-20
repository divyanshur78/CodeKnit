import { useEffect, useState } from "react";
import {
  createAwareness,
  setLocalUser,
  setActiveFile,
  clearLocalPresence,
  observePresence
} from "@codeknit/collaboration";

type Collaborator = {
  clientId: number;
  id: string;
  name: string;
  color: string;
  activeFileId: string | null;
};

type Props = {
  doc: any;
  userName: string;
  userId: string;
  activeFileId: string;
};

export default function CollaboratorPresence({
  doc,
  userName,
  userId,
  activeFileId
}: Props) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  useEffect(() => {
    if (!doc) {
      setCollaborators([]);
      return;
    }

    const awareness = createAwareness(doc);

    setLocalUser(awareness, {
      id: userId,
      name: userName,
      color: "#4F46E5"
    });

    if (activeFileId) {
      setActiveFile(awareness, activeFileId);
    }

    const unsubscribe = observePresence(awareness, setCollaborators);

    return () => {
      unsubscribe();
      clearLocalPresence(awareness);
      awareness.destroy();
    };
  }, [doc, userName, userId, activeFileId]);

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
