export type ProjectManifest = {
  projectId: string
  version: 1
  files: Record<string, string>
}

type DirectoryHandle = any

const META_FOLDER = ".codeknit"
const META_FILE = "project.json"

export async function loadProjectManifest(
  root: DirectoryHandle
): Promise<ProjectManifest> {
  const folder = await root.getDirectoryHandle(META_FOLDER, { create: true })
  const file = await folder.getFileHandle(META_FILE, { create: true })
  const existing = await file.getFile()
  let manifest: ProjectManifest

  try {
    const raw = await existing.text()
    manifest = raw.trim()
      ? JSON.parse(raw)
      : { projectId: crypto.randomUUID(), version: 1, files: {} }
  } catch {
    manifest = { projectId: crypto.randomUUID(), version: 1, files: {} }
  }

  if (!manifest.projectId || typeof manifest.projectId !== "string") {
    manifest.projectId = crypto.randomUUID()
  }
  if (!manifest.files || typeof manifest.files !== "object") {
    manifest.files = {}
  }
  manifest.version = 1

  await saveProjectManifest(root, manifest)
  return manifest
}

export async function saveProjectManifest(
  root: DirectoryHandle,
  manifest: ProjectManifest
): Promise<void> {
  const folder = await root.getDirectoryHandle(META_FOLDER, { create: true })
  const file = await folder.getFileHandle(META_FILE, { create: true })
  const writer = await file.createWritable()
  await writer.write(JSON.stringify(manifest, null, 2))
  await writer.close()
}

export async function getStableFileId(
  root: DirectoryHandle,
  manifest: ProjectManifest,
  relativePath: string
): Promise<string> {
  if (!manifest.files[relativePath]) {
    manifest.files[relativePath] = crypto.randomUUID()
    await saveProjectManifest(root, manifest)
  }
  return manifest.files[relativePath]
}

export async function renameManifestPath(
  root: DirectoryHandle,
  manifest: ProjectManifest,
  oldPath: string,
  newPath: string
): Promise<void> {
  const id = manifest.files[oldPath]
  if (id) {
    delete manifest.files[oldPath]
    manifest.files[newPath] = id
    await saveProjectManifest(root, manifest)
  }
}

export async function removeManifestPath(
  root: DirectoryHandle,
  manifest: ProjectManifest,
  path: string
): Promise<void> {
  const prefix = `${path}/`
  for (const existingPath of Object.keys(manifest.files)) {
    if (existingPath === path || existingPath.startsWith(prefix)) {
      delete manifest.files[existingPath]
    }
  }
  await saveProjectManifest(root, manifest)
}