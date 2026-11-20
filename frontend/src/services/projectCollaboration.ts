import {
  createProjectDoc,
  addFile,
  getFile,
  getFileContent,
  renameFile,
  updateFileLanguage,
  deleteFile,
  createOfflinePersistence,
  waitForOfflineSync,
  destroyOfflinePersistence
} from "@codeknit/collaboration"

import {
  loadProjectManifest,
  getStableFileId,
  renameManifestPath,
  removeManifestPath
} from "./projectIdentity"

type DirectoryHandle = any

export type ProjectSession = {
  projectId: string
  doc: any
  persistence: any
  manifest: any
  root: DirectoryHandle
}

export async function openProjectSession(
  root: DirectoryHandle
): Promise<ProjectSession> {
  const manifest = await loadProjectManifest(root)
  const doc = createProjectDoc()
  doc.getMap("project").set("id", manifest.projectId)

  const persistence = createOfflinePersistence(doc, manifest.projectId)
  await waitForOfflineSync(persistence)

  return {
    projectId: manifest.projectId,
    doc,
    persistence,
    manifest,
    root
  }
}

export async function registerProjectFile(
  session: ProjectSession,
  path: string,
  content: string,
  language = "plaintext"
): Promise<string> {
  const id = await getStableFileId(session.root, session.manifest, path)

  if (!getFile(session.doc, id)) {
    addFile(session.doc, { id, name: path, language, content })
  }

  return id
}

export function updateCollaborativeFile(
  session: ProjectSession,
  fileId: string,
  content: string
): void {
  const file = getFile(session.doc, fileId)
  if (!file) throw new Error(`Collaborative file not found: ${fileId}`)

  const text = file.get("content")
  if (!text) throw new Error("Collaborative file has no text content")

  const previous = text.toString()
  if (previous === content) return

  if (previous.length) text.delete(0, previous.length)
  if (content.length) text.insert(0, content)
}

export async function renameCollaborativeFile(
  session: ProjectSession,
  fileId: string,
  oldPath: string,
  newPath: string
): Promise<void> {
  renameFile(session.doc, fileId, newPath)
  await renameManifestPath(session.root, session.manifest, oldPath, newPath)
}

export async function deleteCollaborativeFile(
  session: ProjectSession,
  fileId: string,
  path: string
): Promise<void> {
  deleteFile(session.doc, fileId)
  await removeManifestPath(session.root, session.manifest, path)
}

export function getCollaborativeText(session: ProjectSession, fileId: string): any {
  return getFile(session.doc, fileId)?.get('content') ?? null
}

export function readCollaborativeFile(
  session: ProjectSession,
  fileId: string
): string {
  return getFileContent(session.doc, fileId) ?? ""
}

export function setCollaborativeFileLanguage(
  session: ProjectSession,
  fileId: string,
  language: string
): void {
  updateFileLanguage(session.doc, fileId, language)
}

export async function closeProjectSession(
  session: ProjectSession
): Promise<void> {
  destroyOfflinePersistence(session.persistence)
  session.doc.destroy()
}