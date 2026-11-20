import { getFile } from "@codeknit/collaboration"
import * as collaborationPackage from "@codeknit/collaboration"

const createCollaborationSession =
  (collaborationPackage as any).createCollaborationSession

import {
  loadProjectManifest,
  getStableFileId,
  renameManifestPath,
  removeManifestPath
} from "./projectIdentity"

type DirectoryHandle = any

export type ProjectSession = {
  projectId: string
  collaboration: any
  manifest: any
  root: DirectoryHandle
}

export type CollaborationUser = {
  id: string
  name: string
  color?: string
}

function getLanguage(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase()

  const languages: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
    sql: "sql",
    xml: "xml",
    yml: "yaml",
    yaml: "yaml",
    java: "java",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    go: "go",
    rs: "rust",
    php: "php",
    rb: "ruby"
  }

  return languages[extension || ""] || "plaintext"
}

export async function openProjectSession(
  root: DirectoryHandle,
  user: CollaborationUser
): Promise<ProjectSession> {
  const manifest = await loadProjectManifest(root)

  const collaboration = await createCollaborationSession({
    projectId: manifest.projectId,
    user: {
      id: user.id,
      name: user.name,
      color: user.color || "#4f8cff"
    },
    persist: true,
    connect: false
  })

  collaboration.doc.getMap("project").set("id", manifest.projectId)

  return {
    projectId: manifest.projectId,
    collaboration,
    manifest,
    root
  }
}

export async function registerProjectFile(
  session: ProjectSession,
  path: string,
  content: string,
  language = getLanguage(path)
): Promise<string> {
  const id = await getStableFileId(
    session.root,
    session.manifest,
    path
  )

  if (!session.collaboration.getFile(id)) {
    session.collaboration.addFile({
      id,
      name: path,
      language,
      content
    })
  }

  return id
}

export async function renameCollaborativeFile(
  session: ProjectSession,
  fileId: string,
  oldPath: string,
  newPath: string
): Promise<void> {
  session.collaboration.renameFile(fileId, newPath)

  await renameManifestPath(
    session.root,
    session.manifest,
    oldPath,
    newPath
  )
}

export async function deleteCollaborativeFile(
  session: ProjectSession,
  fileId: string,
  path: string
): Promise<void> {
  session.collaboration.deleteFile(fileId)

  await removeManifestPath(
    session.root,
    session.manifest,
    path
  )
}

export function getCollaborativeText(
  session: ProjectSession,
  fileId: string
): any {
  return getFile(session.collaboration.doc, fileId)?.get("content") ?? null
}

export function readCollaborativeFile(
  session: ProjectSession,
  fileId: string
): string {
  return session.collaboration.getFileContent(fileId) ?? ""
}

export function setCollaborativeFileLanguage(
  session: ProjectSession,
  fileId: string,
  language: string
): void {
  session.collaboration.updateFileLanguage(fileId, language)
}

export async function closeProjectSession(
  session: ProjectSession
): Promise<void> {
  session.collaboration.destroy()
}


export function updateCollaborativeFile(
  session: ProjectSession,
  fileId: string,
  content: string
) {
  const file = getFile(session.collaboration.doc, fileId)
  if (!file) return

  const yText = file.get("content")
  if (!yText) return

  const nextContent = String(content ?? "")

  if (yText.toString() === nextContent) return

  session.collaboration.doc.transact(() => {
    yText.delete(0, yText.length)
    if (nextContent.length > 0) {
      yText.insert(0, nextContent)
    }
  })
}
