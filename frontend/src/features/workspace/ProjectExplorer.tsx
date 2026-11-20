import { useMemo, useState } from 'react'
import {
  ChevronDown, ChevronRight, File, FileCode2, FileJson,
  FileText, Folder, FolderOpen, FolderPlus, FilePlus2,
  Search, Pencil, Trash2, X
} from 'lucide-react'

type FileNode = {
  name: string
  type: 'file' | 'folder'
  children?: FileNode[]
}

type Props = {
  onOpenFile: (name: string) => void
}

const initialFiles: FileNode[] = [
  {
    name: 'src',
    type: 'folder',
    children: [
      { name: 'App.tsx', type: 'file' },
      { name: 'App.css', type: 'file' },
      { name: 'main.tsx', type: 'file' },
      { name: 'index.css', type: 'file' }
    ]
  },
  {
    name: 'public',
    type: 'folder',
    children: [{ name: 'vite.svg', type: 'file' }]
  },
  { name: 'package.json', type: 'file' },
  { name: 'README.md', type: 'file' }
]

function updateTree(
  nodes: FileNode[],
  target: string,
  action: 'rename' | 'delete',
  value?: string
): FileNode[] {
  return nodes.flatMap(node => {
    const path = target
    if (node.name === path) {
      if (action === 'delete') return []
      return [{ ...node, name: value || node.name }]
    }

    if (node.children) {
      return [{
        ...node,
        children: updateTree(node.children, target, action, value)
      }]
    }

    return [node]
  })
}

function FileIcon({ name }: { name: string }) {
  const extension = name.split('.').pop()?.toLowerCase()

  if (extension === 'tsx' || extension === 'ts' || extension === 'jsx' || extension === 'js') {
    return <FileCode2 size={15} className="pe-icon-code" />
  }
  if (extension === 'css' || extension === 'scss') {
    return <FileCode2 size={15} className="pe-icon-style" />
  }
  if (extension === 'json') {
    return <FileJson size={15} className="pe-icon-json" />
  }
  if (extension === 'md' || extension === 'txt') {
    return <FileText size={15} className="pe-icon-text" />
  }
  return <File size={15} className="pe-icon-default" />
}

export function ProjectExplorer({ onOpenFile }: Props) {
  const [files, setFiles] = useState<FileNode[]>(initialFiles)
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(['src', 'public'])
  )
  const [query, setQuery] = useState('')

  const filteredFiles = useMemo(() => {
    if (!query.trim()) return files

    const filter = (nodes: FileNode[]): FileNode[] =>
      nodes.flatMap(node => {
        if (node.name.toLowerCase().includes(query.toLowerCase())) {
          return [node]
        }

        if (node.children) {
          const children = filter(node.children)
          return children.length ? [{ ...node, children }] : []
        }

        return []
      })

    return filter(files)
  }, [files, query])

  function addNode(type: 'file' | 'folder', parent?: string) {
    const name = window.prompt(
      type === 'file' ? 'Enter file name:' : 'Enter folder name:'
    )?.trim()

    if (!name) return
    if (name.includes('/') || name.includes('\\')) {
      window.alert('Please enter a name without folder separators.')
      return
    }

    const newNode: FileNode = {
      name,
      type,
      ...(type === 'folder' ? { children: [] } : {})
    }

    if (!parent) {
      setFiles(current => [...current, newNode])
      return
    }

    const insert = (nodes: FileNode[]): FileNode[] =>
      nodes.map(node =>
        node.name === parent && node.type === 'folder'
          ? { ...node, children: [...(node.children || []), newNode] }
          : node.children
            ? { ...node, children: insert(node.children) }
            : node
      )

    setFiles(current => insert(current))
    setExpanded(current => new Set([...current, parent]))
  }

  function renameNode(node: FileNode) {
    const name = window.prompt('Enter the new name:', node.name)?.trim()
    if (!name || name === node.name) return
    if (name.includes('/') || name.includes('\\')) {
      window.alert('Please enter a name without folder separators.')
      return
    }

    setFiles(current => updateTree(current, node.name, 'rename', name))
  }

  function deleteNode(node: FileNode) {
    if (!window.confirm(`Delete "${node.name}" from this Explorer?`)) return
    setFiles(current => updateTree(current, node.name, 'delete'))
  }

  function toggleFolder(path: string) {
    setExpanded(current => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  function renderNodes(nodes: FileNode[], depth = 0): React.ReactNode {
    return nodes.map(node => {
      const isFolder = node.type === 'folder'
      const isExpanded = expanded.has(node.name)
      const hasChildren = Boolean(node.children?.length)

      return (
        <div className="pe-node" key={`${depth}-${node.name}`}>
          <div
            className="pe-row"
            style={{ paddingLeft: `${10 + depth * 17}px` }}
          >
            <button
              className="pe-node-main"
              onClick={() =>
                isFolder ? toggleFolder(node.name) : onOpenFile(node.name)
              }
              title={node.name}
            >
              {isFolder ? (
                <>
                  {isExpanded
                    ? <ChevronDown size={14} />
                    : <ChevronRight size={14} />}
                  {isExpanded
                    ? <FolderOpen size={16} className="pe-icon-folder" />
                    : <Folder size={16} className="pe-icon-folder" />}
                </>
              ) : (
                <FileIcon name={node.name} />
              )}
              <span>{node.name}</span>
            </button>

            <div className="pe-node-actions">
              {isFolder && (
                <>
                  <button title="New file" onClick={() => addNode('file', node.name)}>
                    <FilePlus2 size={13} />
                  </button>
                  <button title="New folder" onClick={() => addNode('folder', node.name)}>
                    <FolderPlus size={13} />
                  </button>
                </>
              )}
              <button title="Rename" onClick={() => renameNode(node)}>
                <Pencil size={13} />
              </button>
              <button title="Delete" onClick={() => deleteNode(node)}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {isFolder && isExpanded && hasChildren && (
            <div className="pe-children">
              {renderNodes(node.children || [], depth + 1)}
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
            placeholder="Search files..."
            aria-label="Search project files"
          />
          {query && (
            <button onClick={() => setQuery('')} title="Clear search">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="pe-create-actions">
          <button onClick={() => addNode('file')} title="New file">
            <FilePlus2 size={15} />
          </button>
          <button onClick={() => addNode('folder')} title="New folder">
            <FolderPlus size={15} />
          </button>
        </div>
      </div>

      <div className="pe-root-label">PROJECT FILES</div>

      <div className="pe-tree">
        {filteredFiles.length
          ? renderNodes(filteredFiles)
          : <div className="pe-empty">No matching files found</div>}
      </div>
    </div>
  )
}