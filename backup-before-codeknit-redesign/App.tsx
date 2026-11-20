import { useState } from 'react'
import {
  Files, Search, GitBranch, Blocks, Settings, ChevronDown,
  ChevronRight, Plus, Users, Wifi, Sun, Moon, Terminal,
  AlertCircle, Info, Play, MoreHorizontal, FileCode2,
  Folder, FileText, X
} from 'lucide-react'
import './App.css'

const projectFiles = [
  { name: 'src', type: 'folder', children: ['App.tsx', 'App.css', 'main.tsx', 'index.css'] },
  { name: 'public', type: 'folder', children: ['vite.svg'] },
  { name: 'package.json', type: 'file' },
  { name: 'README.md', type: 'file' },
]

const sampleCode: Record<string, string> = {
  'App.tsx': `import { useState } from 'react'

function App() {
  const [message, setMessage] = useState('Hello, CodeKnit!')

  return (
    <main>
      <h1>{message}</h1>
      <button onClick={() => setMessage('Ready to collaborate!')}>
        Get started
      </button>
    </main>
  )
}

export default App`,
  'App.css': `#root {
  min-height: 100vh;
}

main {
  padding: 2rem;
}

h1 {
  font-size: 2rem;
  color: #60a5fa;
}`,
  'main.tsx': `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)`,
  'index.css': `:root {
  font-family: Inter, system-ui, sans-serif;
  color: #d4d4d4;
  background: #1e1e1e;
}`,
  'package.json': `{
  "name": "codeknit",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint ."
  }
}`,
  'README.md': '# CodeKnit\n\nAn offline-first collaborative coding platform.'
}

function App() {
  const [activeFile, setActiveFile] = useState('App.tsx')
  const [openFiles, setOpenFiles] = useState(['App.tsx', 'App.css'])
  const [activePanel, setActivePanel] = useState('Terminal')
  const [theme, setTheme] = useState('dark')
  const [activeActivity, setActiveActivity] = useState('Explorer')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  function openFile(name: string) {
    setActiveFile(name)
    setOpenFiles(current => current.includes(name) ? current : [...current, name])
  }

  function closeFile(name: string) {
    const remaining = openFiles.filter(file => file !== name)
    setOpenFiles(remaining)
    if (activeFile === name && remaining.length) setActiveFile(remaining[remaining.length - 1])
  }

  return (
    <div className={`app-shell ${theme}`}>
      <header className="titlebar">
        <div className="brand">
          <div className="brand-mark"><span>K</span></div>
          <strong>CodeKnit</strong>
          <span className="brand-divider">/</span>
          <span className="project-name">my-project</span>
          <ChevronDown size={14} />
        </div>
        <div className="titlebar-center">CodeKnit — Collaborative Workspace</div>
        <div className="titlebar-actions">
          <span className="connection"><Wifi size={14} /> Local workspace</span>
          <button className="icon-button" title="Toggle theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button className="icon-button" title="Participants"><Users size={17} /></button>
          <button className="share-button">Invite team</button>
        </div>
      </header>

      <div className="workspace">
        <aside className="activity-bar">
          {[
            { name: 'Explorer', icon: Files },
            { name: 'Search', icon: Search },
            { name: 'Source Control', icon: GitBranch },
            { name: 'Extensions', icon: Blocks },
          ].map(item => (
            <button key={item.name} title={item.name}
              className={`activity-button ${activeActivity === item.name ? 'selected' : ''}`}
              onClick={() => { setActiveActivity(item.name); setSidebarOpen(true) }}>
              <item.icon size={21} strokeWidth={1.7} />
            </button>
          ))}
          <div className="activity-spacer" />
          <button className="activity-button" title="Settings"><Settings size={20} /></button>
        </aside>

        {sidebarOpen && <aside className="sidebar">
          <div className="sidebar-heading">
            <span>{activeActivity.toUpperCase()}</span>
            <MoreHorizontal size={17} />
          </div>
          {activeActivity === 'Explorer' ? <>
            <div className="section-heading"><ChevronDown size={14} /> EXPLORER</div>
            <div className="project-heading"><ChevronDown size={14} /> CODEKNIT</div>
            {projectFiles.map(file => (
              <div key={file.name}>
                <button className="file-row" onClick={() => file.type === 'file' && openFile(file.name)}>
                  {file.type === 'folder' ? <Folder size={15} /> : <FileText size={15} />}
                  <span>{file.name}</span>
                  {file.type === 'folder' && <ChevronRight size={13} />}
                </button>
                {file.type === 'folder' && file.children?.map(child => (
                  <button key={child} className={`file-row nested ${activeFile === child ? 'file-active' : ''}`}
                    onClick={() => openFile(child)}>
                    <FileCode2 size={15} /><span>{child}</span>
                  </button>
                ))}
              </div>
            ))}
          </> : <div className="sidebar-placeholder">
            <p>{activeActivity}</p>
            <span>This panel will be connected in a later milestone.</span>
          </div>}
          <div className="sidebar-bottom">
            <div><ChevronRight size={14} /> OUTLINE</div>
            <div><ChevronRight size={14} /> TIMELINE</div>
          </div>
        </aside>}

        <main className="main-area">
          <div className="editor-toolbar">
            <div className="breadcrumbs">src <ChevronRight size={13} /> {activeFile}</div>
            <div className="editor-actions">
              <span className="sync-label"><span className="status-dot" /> UI prototype</span>
              <button className="icon-button" title="Run (not connected yet)"><Play size={16} /></button>
              <button className="icon-button" title="More actions"><MoreHorizontal size={17} /></button>
            </div>
          </div>

          <div className="tabs">
            {openFiles.map(file => (
              <button key={file} className={`tab ${activeFile === file ? 'tab-active' : ''}`} onClick={() => setActiveFile(file)}>
                <FileCode2 size={14} /><span>{file}</span>
                <span className="tab-close" onClick={event => { event.stopPropagation(); closeFile(file) }}><X size={13} /></span>
              </button>
            ))}
            <button className="new-tab" title="Open package.json" onClick={() => openFile('package.json')}><Plus size={16} /></button>
          </div>

          <section className="editor">
            <div className="editor-content">
              <div className="line-numbers">
                {(sampleCode[activeFile] || '// Select a file from Explorer').split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
              </div>
              <pre className="code-content">{sampleCode[activeFile] || '// Select a file from Explorer'}</pre>
            </div>
            <div className="editor-minimap"><div className="minimap-lines" /></div>
          </section>

          <section className="bottom-panel">
            <div className="panel-tabs">
              {[
                { name: 'Problems', icon: AlertCircle },
                { name: 'Output', icon: Info },
                { name: 'Terminal', icon: Terminal },
              ].map(item => (
                <button key={item.name} className={activePanel === item.name ? 'panel-tab active' : 'panel-tab'}
                  onClick={() => setActivePanel(item.name)}>
                  <item.icon size={14} /> {item.name}
                  {item.name === 'Problems' && <span className="problem-count">0</span>}
                </button>
              ))}
              <div className="panel-spacer" />
              <button className="icon-button" title="New terminal"><Plus size={15} /></button>
            </div>
            <div className="panel-content">
              {activePanel === 'Terminal' ? <><span className="terminal-prompt">PS</span> Welcome to CodeKnit terminal panel. Terminal integration is pending.</> :
                activePanel === 'Problems' ? 'No problems detected in this UI prototype.' : 'Application output will appear here.'}
            </div>
          </section>

          <footer className="statusbar">
            <div><GitBranch size={13} /> main <span>?</span><span>0 errors</span></div>
            <div><span>TypeScript JSX</span><span>UTF-8</span><span>Spaces: 2</span><span>Ln 1, Col 1</span></div>
          </footer>
        </main>
      </div>
    </div>
  )
}

export default App
