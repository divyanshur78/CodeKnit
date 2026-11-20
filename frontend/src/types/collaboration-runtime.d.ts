declare module "@codeknit/collaboration" {
  export function bindYTextToMonaco(options: {
    yText: any
    editor: any
    awareness?: any
    undoManager?: any
  }): Promise<any>

  export function createAwareness(doc: any): any
  export function setLocalUser(awareness: any, user: {
    id: string
    name: string
    color: string
  }): void
  export function setActiveFile(awareness: any, fileId: string): void
  export function clearLocalPresence(awareness: any): void
  export function getConnectedUsers(awareness: any): any[]
  export function observePresence(awareness: any, callback: () => void): () => void

  export function createUserUndoManager(
    doc: any,
    yText: any,
    userId: string
  ): any
}