import { useState } from 'react'
import {
  Files, Search, GitBranch, Blocks, Settings, ChevronDown,
  Plus, Users, Wifi, Sun, Moon, Terminal,
  AlertCircle, Info, Play, MoreHorizontal, FileCode2,
  Folder, FileText, X, Command, Sparkles, Activity,
  Eye, Clock3, Zap, ArrowRight, LayoutDashboard
} from 'lucide-react'
import { AuthPortal } from './components/auth/AuthPortal'
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

const navigation = [
  { name: 'Explorer', icon: Files, description: 'Browse project files' },
  { name: 'Search', icon: Search, description: 'Find code and files' },
  { name: 'Source Control', icon: GitBranch, description: 'Track project changes' },
  { name: 'Extensions', icon: Blocks, description: 'Extend your workspace' },
]

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [screen, setScreen] = useState('home')
  const [homePanel, setHomePanel] = useState('home')
  const [projectName, setProjectName] = useState('My Project')
  const [roomCode, setRoomCode] = useState('')
  const [workspaceMode, setWorkspaceMode] = useState('minimal')
  const [activeFile, setActiveFile] = useState('App.tsx')
  const [openFiles, setOpenFiles] = useState(['App.tsx', 'App.css'])
  const [activePanel, setActivePanel] = useState('Terminal')
  const [theme, setTheme] = useState('dark')
  const [activeActivity, setActiveActivity] = useState('Explorer')

  function openFile(name: string) {
    setActiveFile(name)
    setOpenFiles(current => current.includes(name) ? current : [...current, name])
  }

  function closeFile(name: string) {
    const remaining = openFiles.filter(file => file !== name)
    setOpenFiles(remaining)
    if (activeFile === name && remaining.length) {
      setActiveFile(remaining[remaining.length - 1])
    }
  }

  const code = sampleCode[activeFile] || '// Select a file from Explorer'

  return (
    <>
      {!authenticated ? <AuthPortal onPreview={() => setAuthenticated(true)} /> : <>
      {screen !== 'workspace' ? (
        <div className={`home-shell ${theme}`}>
          <header className="home-header">
            <div className="home-brand">
              <div className="home-brand-mark">K</div>
              <div><strong>CodeKnit</strong><span>COLLABORATIVE WORKSPACE</span></div>
            </div>
            <button className="home-settings" title="Settings" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span>Appearance</span>
            </button>
          </header>

          <main className="home-main">
            <section className="home-welcome">
              <span className="home-eyebrow">YOUR CREATIVE WORKSPACE</span>
              <h1>{homePanel === 'home' ? 'What would you like to build?' : homePanel === 'new-project' ? 'Create a project' : 'Join your team'}</h1>
              <p>{homePanel === 'home' ? 'A simple place to create, code and collaborate.' : homePanel === 'new-project' ? 'Give your workspace a name to get started.' : 'Enter the invitation code shared by your team.'}</p>
            </section>

            {homePanel === 'home' ? (
              <>
                <section className="home-actions">
                  <button className="home-action-card primary-action" onClick={() => setHomePanel('new-project')}>
                    <span className="home-action-icon"><Plus size={22} /></span>
                    <strong>New Project</strong>
                    <span>Start something from scratch</span>
                    <ArrowRight size={17} className="home-action-arrow" />
                  </button>
                  <button className="home-action-card" onClick={() => setHomePanel('join-team')}>
                    <span className="home-action-icon"><Users size={22} /></span>
                    <strong>Join Team</strong>
                    <span>Continue with your collaborators</span>
                    <ArrowRight size={17} className="home-action-arrow" />
                  </button>
                </section>

                <section className="home-recent">
                  <div className="home-section-heading">
                    <div><h2>Recent projects</h2><p>Pick up where you left off</p></div>
                    <span className="home-section-label">YOUR WORK</span>
                  </div>
                  <button className="home-project-row" onClick={() => setScreen('workspace')}>
                    <span className="home-project-icon"><Folder size={19} /></span>
                    <span className="home-project-info"><strong>{projectName}</strong><small>Personal workspace · Local preview</small></span>
                    <ArrowRight size={17} />
                  </button>
                </section>

                <section className="home-mode">
                  <div><strong>Workspace experience</strong><p>Choose how much you want to see.</p></div>
                  <div className="home-mode-options">
                    <button className={workspaceMode === 'minimal' ? 'selected' : ''} onClick={() => setWorkspaceMode('minimal')}>
                      <Eye size={16} /><span>Minimal</span>
                    </button>
                    <button className={workspaceMode === 'studio' ? 'selected' : ''} onClick={() => setWorkspaceMode('studio')}>
                      <LayoutDashboard size={16} /><span>Studio</span>
                    </button>
                  </div>
                </section>
              </>
            ) : homePanel === 'new-project' ? (
              <section className="home-form-card">
                <label htmlFor="new-project-name">Project name</label>
                <input id="new-project-name" value={projectName} onChange={event => setProjectName(event.target.value)} placeholder="e.g. My first project" />
                <p className="home-form-hint">You can configure languages and templates inside your workspace.</p>
                <div className="home-form-actions">
                  <button className="home-back-button" onClick={() => setHomePanel('home')}>Back</button>
                  <button className="home-submit-button" disabled={!projectName.trim()} onClick={() => setScreen('workspace')}>Open workspace <ArrowRight size={16} /></button>
                </div>
              </section>
            ) : (
              <section className="home-form-card">
                <label htmlFor="team-room-code">Invitation or room code</label>
                <input id="team-room-code" value={roomCode} onChange={event => setRoomCode(event.target.value)} placeholder="Enter your team code" />
                <p className="home-form-hint">Team connection will be enabled when the collaboration backend is integrated.</p>
                <div className="home-form-actions">
                  <button className="home-back-button" onClick={() => setHomePanel('home')}>Back</button>
                  <button className="home-submit-button" disabled={!roomCode.trim()} onClick={() => setRoomCode('')}>Clear code</button>
                </div>
                <div className="home-pending-note"><Info size={15} /> Team joining is awaiting backend integration.</div>
              </section>
            )}
          </main>

          <footer className="home-footer">
            <span>CodeKnit</span>
            <span>Built for focused work and collaboration</span>
            <span>Offline-ready interface</span>
          </footer>
        </div>
      ) : (
        <div className={`app-shell ${theme}`}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">K</div>
          <div className="brand-copy">
            <strong>CodeKnit</strong>
            <span>COLLABORATIVE STUDIO</span>
          </div>
        </div>

        <div className="project-switch">
          <div className="project-switch-icon"><Folder size={16} /></div>
          <div>
            <strong>{projectName}</strong>
            <span>Personal workspace</span>
          </div>
          <ChevronDown size={15} />
        </div>

        <button className="global-search" onClick={() => setActiveActivity('Search')}>
          <Search size={16} />
          <span>Search your workspace...</span>
          <kbd><Command size={11} /> K</kbd>
        </button>

        <div className="topbar-actions">
          <div className="connection"><span className="connection-dot" /><Wifi size={14} /> Offline-ready</div>
          <button className="icon-button" title="Toggle theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button className="team-button"><Users size={15} /> Team</button>
          <button className="invite-button">Invite <Plus size={14} /></button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="sidebar-intro">
            <div>
              <span className="eyebrow">YOUR WORKSPACE</span>
              <h2>Workspace</h2>
            </div>
            <span className="local-badge"><span /> LOCAL</span>
          </div>

          <div className="navigation-grid">
            {navigation.map(item => (
              <button
                key={item.name}
                title={item.description}
                className={`navigation-card ${activeActivity === item.name ? 'navigation-active' : ''}`}
                onClick={() => setActiveActivity(item.name)}
              >
                <item.icon size={19} />
                <span>{item.name === 'Source Control' ? 'Changes' : item.name}</span>
              </button>
            ))}
          </div>

          <div className="explorer-heading">
            <div>
              <span className="eyebrow">{activeActivity === 'Explorer' ? 'PROJECT CONTENT' : 'WORKSPACE TOOL'}</span>
              <h3>{activeActivity === 'Explorer' ? 'Project files' : activeActivity}</h3>
            </div>
            {activeActivity === 'Explorer' && (
              <button className="subtle-icon" title="Add file"><Plus size={17} /></button>
            )}
          </div>

          {activeActivity === 'Explorer' ? (
            <div className="file-explorer">
              <div className="project-card">
                <div className="project-card-icon"><Folder size={19} /></div>
                <div className="project-card-copy">
                  <strong>CODEKNIT</strong>
                  <span>Project root</span>
                </div>
                <MoreHorizontal size={17} />
              </div>

              <div className="tree-label">FILES & FOLDERS</div>
              {projectFiles.map(file => (
                <div key={file.name}>
                  <button className="file-row" onClick={() => file.type === 'file' && openFile(file.name)}>
                    {file.type === 'folder' ? <Folder size={16} /> : <FileText size={16} />}
                    <span>{file.name}</span>
                    {file.type === 'folder' && <ChevronDown className="folder-chevron" size={13} />}
                  </button>
                  {file.type === 'folder' && file.children?.map(child => (
                    <button
                      key={child}
                      className={`file-row nested ${activeFile === child ? 'file-active' : ''}`}
                      onClick={() => openFile(child)}
                    >
                      <FileCode2 size={15} />
                      <span>{child}</span>
                      {activeFile === child && <span className="active-file-dot" />}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="tool-placeholder">
              <div className="placeholder-icon"><Sparkles size={22} /></div>
              <strong>{activeActivity}</strong>
              <p>This workspace tool will be connected in a later integration milestone.</p>
            </div>
          )}

          <div className="sidebar-footer">
            <div className="sidebar-footer-icon"><Activity size={16} /></div>
            <div><strong>Workspace status</strong><span>Running locally</span></div>
            <span className="footer-status-dot" />
          </div>
          <button className="settings-link"><Settings size={16} /> Workspace settings</button>
        </aside>

        <main className="main-area">
          <div className="editor-heading">
            <div className="editor-heading-copy">
              <span className="eyebrow">CODE WORKSPACE / SRC</span>
              <h1>{activeFile}</h1>
              <span className="editor-subtitle">Editing project source</span>
            </div>
            <div className="editor-actions">
              <span className="prototype-label"><span /> UI prototype</span>
              <button className="run-button" title="Run (not connected yet)"><Play size={15} fill="currentColor" /> Run</button>
              <button className="icon-button" title="More actions"><MoreHorizontal size={18} /></button>
            </div>
          </div>

          <div className="tabs">
            <div className="tabs-track">
              {openFiles.map(file => (
                <button
                  key={file}
                  className={`tab ${activeFile === file ? 'tab-active' : ''}`}
                  onClick={() => setActiveFile(file)}
                >
                  <FileCode2 size={15} />
                  <span>{file}</span>
                  <span className="tab-close" onClick={event => { event.stopPropagation(); closeFile(file) }}>
                    <X size={13} />
                  </span>
                </button>
              ))}
              <button className="new-tab" title="Open package.json" onClick={() => openFile('package.json')}>
                <Plus size={16} />
              </button>
            </div>
            <span className="tab-context"><Clock3 size={13} /> Recent files</span>
          </div>

          <section className="editor">
            <div className="editor-content">
              <div className="line-numbers">
                {code.split('\n').map((_, i) => <div key={i}>{String(i + 1).padStart(2, '0')}</div>)}
              </div>
              <pre className="code-content">{code}</pre>
            </div>
            <div className="editor-minimap"><div className="minimap-lines" /></div>
          </section>

          <section className="bottom-panel">
            <div className="dock-heading">
              <div>
                <span className="eyebrow">DEVELOPMENT TOOLS</span>
                <strong>Workspace dock</strong>
              </div>
              <button className="subtle-icon" title="More tools"><MoreHorizontal size={17} /></button>
            </div>
            <div className="panel-tabs">
              {[
                { name: 'Terminal', icon: Terminal },
                { name: 'Problems', icon: AlertCircle },
                { name: 'Output', icon: Info },
                { name: 'Preview', icon: Eye },
              ].map(item => (
                <button
                  key={item.name}
                  className={activePanel === item.name ? 'panel-tab active' : 'panel-tab'}
                  onClick={() => setActivePanel(item.name)}
                >
                  <item.icon size={15} />
                  {item.name}
                  {item.name === 'Problems' && <span className="problem-count">0</span>}
                </button>
              ))}
            </div>
            <div className="panel-content">
              {activePanel === 'Terminal'
                ? <><span className="terminal-prompt">PS</span> Welcome to CodeKnit. Terminal integration is pending.</>
                : activePanel === 'Problems'
                  ? 'No problems detected in this UI prototype.'
                  : activePanel === 'Preview'
                    ? 'Live preview integration will be available in a later milestone.'
                    : 'Application output will appear here.'}
            </div>
          </section>

          <footer className="statusbar">
            <div><GitBranch size={13} /> main <span className="status-separator" /> <span>0 errors</span></div>
            <div><span>TypeScript JSX</span><span>UTF-8</span><span>Spaces: 2</span><span>Ln 1, Col 1</span></div>
          </footer>
        </main>

        <aside className="pulse-panel">
          <div className="pulse-heading">
            <span className="eyebrow">CODEKNIT INSIGHTS</span>
            <h3>Project pulse</h3>
            <p>A quick view of your workspace.</p>
          </div>

          <div className="pulse-card">
            <div className="pulse-card-heading"><span className="pulse-icon violet"><Zap size={16} /></span><span>Workspace mode</span></div>
            <strong>Offline-ready</strong>
            <p>Your project workspace is available locally.</p>
            <div className="pulse-progress"><span /></div>
            <span className="pulse-footnote">Sync engine integration pending</span>
          </div>

          <div className="pulse-card">
            <div className="pulse-card-heading"><span className="pulse-icon teal"><FileCode2 size={16} /></span><span>Current file</span></div>
            <strong>{activeFile}</strong>
            <p>Selected in your project explorer.</p>
            <span className="file-type-chip">SOURCE FILE</span>
          </div>

          <div className="pulse-card collaboration-card">
            <div className="pulse-card-heading"><span className="pulse-icon blue"><Users size={16} /></span><span>Collaboration</span></div>
            <strong>Build together</strong>
            <p>Live presence, shared editing and team activity will connect through the collaboration engine.</p>
            <span className="integration-note">INTEGRATION PENDING</span>
          </div>

          <div className="pulse-tip">
            <Sparkles size={16} />
            <div><strong>CodeKnit tip</strong><p>Your workspace is designed to keep coding available even when connectivity is interrupted.</p></div>
          </div>
        </aside>
      </div>
        </div>
      )}
      </>}
    </>
  )
}

export default App
