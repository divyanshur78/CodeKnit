declare module "@codeknit/collaboration" {
  export function createProjectDoc(options?: any): any
  export function addFile(doc: any, file: {
    id: string
    name: string
    language?: string
    content?: string
  }): any
  export function getFile(doc: any, fileId: string): any
  export function getFileContent(doc: any, fileId: string): string | undefined
  export function renameFile(doc: any, fileId: string, newName: string): boolean
  export function updateFileLanguage(doc: any, fileId: string, language: string): boolean
  export function deleteFile(doc: any, fileId: string): boolean
  export function listFiles(doc: any): any[]
  export function createOfflinePersistence(doc: any, projectId: string): any
  export function waitForOfflineSync(persistence: any): Promise<void>
  export function destroyOfflinePersistence(persistence: any): void
}