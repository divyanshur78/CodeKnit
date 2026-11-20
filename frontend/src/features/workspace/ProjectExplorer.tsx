import { useMemo, useState } from 'react'
import {
  ChevronDown, ChevronRight, File, FileCode2, FileJson,
  FileText, Folder, FolderOpen, FolderPlus, FilePlus2,
  Search, Pencil, Trash2, X, FolderOpen as OpenFolder
} from 'lucide-react'

type AnyHandle = any

type FileNode = {
  name: string
  type: 'file' | 'folder'
  handle: AnyHandle
  children?: FileNode[]
}

type Props = {
  onOpenFile: (path: string, content: string, handle: AnyHandle) => void | Promise<void>
  onProjectOpen: (root: AnyHandle) => void | Promise<void>
  onRenamePath: (oldPath: string, newPath: string) => void
  onDeletePath: (path: string) => void
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (['tsx', 'ts', 'jsx', 'js', 'py', 'java', 'cpp', 'cs'].includes(ext || ''))
    return <FileCode2 size={15} className="pe-icon-code" />
  if (['css', 'scss'].includes(ext || ''))
    return <FileCode2 size={15} className="pe-icon-style" />
  if (ext === 'json') return <FileJson size={15} className="pe-icon-json" />
  if (['md', 'txt'].includes(ext || ''))
    return <FileText size={15} className="pe-icon-text" />
  return <File size={15} className="pe-icon-default" />
}

async function readTree(directory: AnyHandle): Promise<FileNode[]> {
  const nodes: FileNode[] = []

  for await (const [name, handle] of directory.entries()) {
    if (name === 'node_modules' || name === '.git' || name === 'dist' || name === '.codeknit')
      continue

    if (handle.kind === 'directory') {
      nodes.push({
        name,
        type: 'folder',
        handle,
        children: await readTree(handle)
      })
    } else {
      nodes.push({ name, type: 'file', handle })
    }
  }

  return nodes.sort((a, b) =>
    a.type !== b.type
      ? a.type === 'folder' ? -1 : 1
      : a.name.localeCompare(b.name)
  )
}

async function copyDirectory(source: AnyHandle, target: AnyHandle) {
  for await (const [name, handle] of source.entries()) {
    if (handle.kind === 'file') {
      const file = await handle.getFile()
      const newFile = await target.getFileHandle(name, { create: true })
      const writer = await newFile.createWritable()
      await writer.write(await file.arrayBuffer())
      await writer.close()
    } else {
      const newFolder = await target.getDirectoryHandle(name, { create: true })
      await copyDirectory(handle, newFolder)
    }
  }
}

export function ProjectExplorer({
  onOpenFile,
  onProjectOpen,
  onRenamePath,
  onDeletePath
}: Props) {
  const [root, setRoot] = useState<AnyHandle>(null)
  const [rootName, setRootName] = useState('')
  const [files, setFiles] = useState<FileNode[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')

  async function refresh() {
    if (root) setFiles(await readTree(root))
  }

  async function chooseFolder() {
    try {
      const picker = (window as any).showDirectoryPicker
      if (!picker) {
        window.alert('Folder access requires desktop Chrome or Edge.')
        return
      }
      const directory = await picker({ mode: 'readwrite' })
      await onProjectOpen(directory)
      setRoot(directory)
      setRootName(directory.name)
      setExpanded(new Set())
      setFiles(await readTree(directory))
    } catch (error: any) {
      if (error?.name !== 'AbortError')
        window.alert(error?.message || 'Could not open this folder.')
    }
  }

  const filteredFiles = useMemo(() => {
    if (!query.trim()) return files
    const filter = (nodes: FileNode[]): FileNode[] =>
      nodes.flatMap(node => {
        if (node.name.toLowerCase().includes(query.toLowerCase()))
          return [node]
        const children = node.children ? filter(node.children) : []
        return children.length ? [{ ...node, children }] : []
      })
    return filter(files)
  }, [files, query])

  function findHandle(path: string): AnyHandle | null {
    let nodes = files
    let found: AnyHandle = root
    for (const part of path.split('/')) {
      const node = nodes.find(item => item.name === part)
      if (!node) return null
      found = node.handle
      nodes = node.children || []
    }
    return found
  }

  function findParent(path: string) {
    const parts = path.split('/')
    const name = parts.pop()!
    const parentPath = parts.join('/')
    return {
      name,
      parentPath,
      parent: parentPath ? findHandle(parentPath) : root
    }
  }

  async function openFile(path: string, handle: AnyHandle) {
    try {
      const file = await handle.getFile()
      await onOpenFile(path, await file.text(), handle)
    } catch (error: any) {
      window.alert(error?.message || 'Could not read this file.')
    }
  }

  async function addNode(type: 'file' | 'folder', parentPath = '') {
    if (!root) return
    const name = window.prompt(
      type === 'file' ? 'Enter file name:' : 'Enter folder name:'
    )?.trim()
    if (!name) return
    if (/[\\/]/.test(name) || name === '.' || name === '..') {
      window.alert('Enter a valid name without folder separators.')
      return
    }

    try {
      const parent = parentPath ? findHandle(parentPath) : root
      if (!parent) throw new Error('Parent folder not found.')

      if (type === 'file') {
        const handle = await parent.getFileHandle(name, { create: true })
        const writer = await handle.createWritable()
        await writer.write('')
        await writer.close()
      } else {
        await parent.getDirectoryHandle(name, { create: true })
      }

      await refresh()
      if (parentPath)
        setExpanded(current => new Set([...current, parentPath]))
      if (type === 'file') {
        const path = parentPath ? `${parentPath}/${name}` : name
        const handle = type === 'file'
          ? await parent.getFileHandle(name)
          : null
        await openFile(path, handle)
      }
    } catch (error: any) {
      window.alert(error?.message || 'Could not create this item.')
    }
  }

  async function renameNode(path: string, oldName: string) {
    const name = window.prompt('Enter the new name:', oldName)?.trim()
    if (!name || name === oldName) return
    if (/[\\/]/.test(name) || name === '.' || name === '..') {
      window.alert('Enter a valid name.')
      return
    }

    const { parent, parentPath } = findParent(path)
    const source = findHandle(path)
    if (!parent || !source) return

    try {
      const existing = source.kind === 'file'
        ? await parent.getFileHandle(name).catch(() => null)
        : await parent.getDirectoryHandle(name).catch(() => null)
      if (existing) {
        window.alert('An item with that name already exists.')
        return
      }

      if (source.kind === 'file') {
        const file = await source.getFile()
        const target = await parent.getFileHandle(name, { create: true })
        const writer = await target.createWritable()
        await writer.write(await file.arrayBuffer())
        await writer.close()
      } else {
        const target = await parent.getDirectoryHandle(name, { create: true })
        await copyDirectory(source, target)
      }

      await parent.removeEntry(oldName, { recursive: true })
      const nextPath = parentPath ? `${parentPath}/${name}` : name
      onRenamePath(path, nextPath)
      await refresh()
    } catch (error: any) {
      window.alert(error?.message || 'Could not rename this item.')
    }
  }

  async function deleteNode(path: string, name: string) {
    if (!window.confirm(`Permanently delete "${name}" from your project folder?`))
      return

    const { parent } = findParent(path)
    if (!parent) return

    try {
      await parent.removeEntry(name, { recursive: true })
      onDeletePath(path)
      await refresh()
    } catch (error: any) {
      window.alert(error?.message || 'Could not delete this item.')
    }
  }

  function toggleFolder(path: string) {
    setExpanded(current => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  function renderNodes(nodes: FileNode[], parentPath = '', depth = 0): React.ReactNode {
    return nodes.map(node => {
      const path = parentPath ? `${parentPath}/${node.name}` : node.name
      const isFolder = node.type === 'folder'
      const isExpanded = expanded.has(path)

      return (
        <div className="pe-node" key={path}>
          <div className="pe-row" style={{ paddingLeft: `${10 + depth * 17}px` }}>
            <button
              type="button"
              className="pe-node-main"
              title={path}
              onClick={() => isFolder
                ? toggleFolder(path)
                : openFile(path, node.handle)}
            >
              {isFolder ? (
                <>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  {isExpanded
                    ? <FolderOpen size={16} className="pe-icon-folder" />
                    : <Folder size={16} className="pe-icon-folder" />}
                </>
              ) : <FileIcon name={node.name} />}
              <span>{node.name}</span>
            </button>

            <div className="pe-node-actions">
              {isFolder && (
                <>
                  <button type="button" title="New file" onClick={() => addNode('file', path)}>
                    <FilePlus2 size={13} />
                  </button>
                  <button type="button" title="New folder" onClick={() => addNode('folder', path)}>
                    <FolderPlus size={13} />
                  </button>
                </>
              )}
              <button type="button" title="Rename" onClick={() => renameNode(path, node.name)}>
                <Pencil size={13} />
              </button>
              <button type="button" title="Delete" onClick={() => deleteNode(path, node.name)}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {isFolder && isExpanded && Boolean(node.children?.length) && (
            <div className="pe-children">
              {renderNodes(node.children || [], path, depth + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  return (
    <div className="project-explorer">
      <div className="pe-toolbar">
        <div className="pe-search">
          <Search size={14} />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search project files..."
            aria-label="Search project files"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} title="Clear search">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="pe-create-actions">
          <button type="button" onClick={() => addNode('file')} title="New file" disabled={!root}>
            <FilePlus2 size={15} />
          </button>
          <button type="button" onClick={() => addNode('folder')} title="New folder" disabled={!root}>
            <FolderPlus size={15} />
          </button>
        </div>
      </div>

      <div className="pe-root-label">PROJECT FILES</div>
      <div className="pe-tree">
        {!root ? (
          <div className="pe-empty">
            <p>Connect your actual project folder.</p>
            <button type="button" onClick={chooseFolder}>
              <OpenFolder size={15} /> Open Folder
            </button>
          </div>
        ) : (
          <>
            <div className="pe-root-name">
              <FolderOpen size={15} /> {rootName}
              <button type="button" title="Refresh files" onClick={refresh}>↻</button>
            </div>
            {filteredFiles.length
              ? renderNodes(filteredFiles)
              : <div className="pe-empty">No matching files found</div>}
          </>
        )}
      </div>
    </div>
  )
}