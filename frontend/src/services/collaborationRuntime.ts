import {
  bindYTextToMonaco,
  createAwareness,
  setLocalUser,
  setActiveFile,
  clearLocalPresence,
  getConnectedUsers,
  observePresence,
  createUserUndoManager
} from "@codeknit/collaboration"

export function createProjectAwareness(
  doc: any,
  user: { id: string; name: string; color: string }
) {
  const awareness = createAwareness(doc)
  setLocalUser(awareness, user)
  return awareness
}

export function activateCollaborativeFile(
  awareness: any,
  fileId: string
) {
  setActiveFile(awareness, fileId)
}

export function watchCollaborators(
  awareness: any,
  callback: (users: any[]) => void
) {
  const update = () => callback(getConnectedUsers(awareness))
  const unsubscribe = observePresence(awareness, update)
  update()
  return unsubscribe
}

export async function attachMonacoToSharedText(
  doc: any,
  yText: any,
  editor: any,
  awareness: any,
  userId: string
) {
  const undo = createUserUndoManager(doc, yText, userId)
  const binding = await bindYTextToMonaco({
    yText,
    editor,
    awareness,
    undoManager: undo.undoManager
  })

  return {
    binding,
    undo,
    dispose() {
      binding.destroy?.()
      undo.destroy?.()
    }
  }
}

export function clearProjectPresence(awareness: any) {
  clearLocalPresence(awareness)
}