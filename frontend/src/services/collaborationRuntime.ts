export async function attachMonacoToSession(
  session: any,
  fileId: string,
  editor: any
) {
  const binding = await session.bindEditor(fileId, editor)

  return {
    binding,
    dispose() {
      session.unbindEditor(fileId)
    }
  }
}

export function watchSessionCollaborators(
  session: any,
  callback: (users: any[]) => void
) {
  const unsubscribe = session.observePresence(callback)
  callback(session.getConnectedUsers())
  return unsubscribe
}

export function activateSessionFile(
  session: any,
  fileId: string
) {
  session.setActiveFile(fileId)
}
