import CollaboratorPresence from './features/collaboration/CollaboratorPresence';
import { HomeDashboard, type RecentProject } from './features/home/HomeDashboard'
import { recordRevision, listRevisions } from '@codeknit/collaboration'
import { useEffect, useState, useRef } from 'react'
import { ArrowLeft, Files, Search, GitBranch, Blocks, Settings, ChevronDown, Plus, Users, Wifi, Sun, Moon, Terminal, AlertCircle, Info, Play, MoreHorizontal, FileCode2, Folder, X, Command, Sparkles, Activity, Eye, Clock3, History, Zap, ArrowRight, UserRound, LogOut } from 'lucide-react'
import { AuthPortal } from './components/auth/AuthPortal'
import { authService } from './services/authService'
import type { UserProfile } from './types/auth.types'
import { ProjectExplorer } from './features/workspace/ProjectExplorer'
import { CodeEditor } from './features/workspace/CodeEditor'
import { openProjectSession, registerProjectFile, closeProjectSession } from './services/projectCollaboration'
import type { ProjectSession } from './services/projectCollaboration'
import './App.css'
const navigation = [
  { name: 'Explorer', icon: Files, description: 'Browse project files' },
  { name: 'Search', icon: Search, description: 'Find code and files' },
  { name: 'Source Control', icon: GitBranch, description: 'Track project changes' },
  { name: 'Extensions', icon: Blocks, description: 'Extend your workspace' },
]

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)

  useEffect(() => {
    let mounted = true

    authService.getCurrentUser()
      .then(({ user }) => {
        if (mounted) {
          setCurrentUser(user)
          setAuthenticated(true)
        }
      })
      .catch(() => {
        // No active server session.
      })
      .finally(() => {
        if (mounted) setAuthChecking(false)
      })

    return () => { mounted = false }
  }, [])

  function enterPreview() {
    setPreviewMode(true)
    setCurrentUser(null)
    setAuthenticated(true)
  }

  function handleAuthenticated(user: UserProfile) {
    setCurrentUser(user)
    setPreviewMode(false)
    setAuthenticated(true)
    setHomePanel('home')
    setScreen('home')
  }

  async function handleLogout() {
    await closeActiveProjectSession()
    if (!previewMode) {
      try {
        await authService.logout()
      } catch {
        // Clear the local app session even if the server is unreachable.
      }
    }

    setAuthenticated(false)
    setCurrentUser(null)
    setPreviewMode(false)
    setHomePanel('home')
    setScreen('home')
  }
  const [screen, setScreen] = useState('home')
  const [homePanel, setHomePanel] = useState('home')
  const [projectName, setProjectName] = useState('My Project')
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])
  function createProject() {
    const name = projectName.trim()
    if (!name) return

    const project: RecentProject = {
      id: `local-${Date.now()}`,
      name,
      updatedAt: 'Just now',
      language: 'Project',
    }

    setRecentProjects(current => [
      project,
      ...current.filter(item => item.name.toLowerCase() !== name.toLowerCase()),
    ])
    setProjectName(name)
    setScreen('workspace')
    setHomePanel('home')
  }

  function openRecentProject(project: RecentProject) {
    setProjectName(project.name)
    setScreen('workspace')
    setHomePanel('home')
  }
  const [roomCode, setRoomCode] = useState('')
  const [activeFile, setActiveFile] = useState('src/App.tsx')
  const [openFiles, setOpenFiles] = useState(['src/App.tsx', 'src/App.css'])
  const [fileContents, setFileContents] = useState<Record<string, string>>({})
  const [fileHandles, setFileHandles] = useState<Record<string, any>>({})
  const projectSessionRef = useRef<ProjectSession | null>(null)
  const [fileIds, setFileIds] = useState<Record<string, string>>({})
  async function closeActiveProjectSession() {
    const session = projectSessionRef.current
    projectSessionRef.current = null

    if (session) {
      try {
        await closeProjectSession(session)
      } catch (error) {
        console.error("Could not close collaboration session:", error)
      }
    }

    setFileIds({})
  }
  const [activePanel, setActivePanel] = useState('Terminal')
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [theme, setTheme] = useState('dark')
  const [activeActivity, setActiveActivity] = useState('Explorer')
  const [revisions, setRevisions] = useState<any[]>([])

  function createRevisionCheckpoint() {
    const session = projectSessionRef.current
    const fileId = fileIds[activeFile]

    if (!session || !fileId) {
      window.alert("Open a project file before creating a checkpoint.")
      return
    }

    try {
      recordRevision(session.collaboration.doc, {
        userId: currentUser?.userId || "local-preview-user",
        fileId,
        type: "checkpoint",
        timestamp: Date.now(),
        description: `Checkpoint: ${activeFile}`
      })
      setRevisions(listRevisions(session.collaboration.doc))
    } catch (error) {
      console.error("Could not create revision checkpoint:", error)
      window.alert("Could not create this checkpoint.")
    }
  }
  async function handleProjectOpen(root: any) {
    await closeActiveProjectSession()
    const session = await openProjectSession(root, {
      id: currentUser?.userId ?? "CK-PREVIEW-0001",
      name: currentUser?.fullName ?? "Preview User"
    })
    projectSessionRef.current = session
    setRevisions(listRevisions(session.collaboration.doc))
    setFileIds({})
    console.info("CodeKnit project session ready:", session.projectId)
  }

  async function openFile(path: string, content: string, handle: any) {
    const session = projectSessionRef.current
    if (session) {
      const fileId = await registerProjectFile(session, path, content)
      setFileIds(current => ({ ...current, [path]: fileId }))
    }
    setActiveFile(path)
    setOpenFiles(current => current.includes(path) ? current : [...current, path])
    setFileContents(current => ({ ...current, [path]: content }))
    setFileHandles(current => ({ ...current, [path]: handle }))
  }

  function closeFile(path: string) {
    const index = openFiles.indexOf(path)
    const remaining = openFiles.filter(file => file !== path)
    setOpenFiles(remaining)

    if (activeFile === path) {
      setActiveFile(remaining[Math.max(0, index - 1)] || '')
    }
  }

  function renameOpenPath(oldPath: string, newPath: string) {
    const updatePath = (path: string) =>
      path === oldPath || path.startsWith(`${oldPath}/`)
        ? `${newPath}${path.slice(oldPath.length)}`
        : path

    setOpenFiles(current => current.map(updatePath))
    setActiveFile(current => updatePath(current))
    setFileContents(current => {
      const next: Record<string, string> = {}
      Object.entries(current).forEach(([path, content]) => {
        next[updatePath(path)] = content
      })
      return next
    })
  }

  function deleteOpenPath(deletedPath: string) {
    const isDeleted = (path: string) =>
      path === deletedPath || path.startsWith(`${deletedPath}/`)

    const remaining = openFiles.filter(path => !isDeleted(path))
    setOpenFiles(remaining)

    if (isDeleted(activeFile)) {
      setActiveFile(remaining[remaining.length - 1] || '')
    }

    setFileContents(current =>
      Object.fromEntries(
        Object.entries(current).filter(([path]) => !isDeleted(path))
      )
    )
  }

  const activeFileName = activeFile.split(/[\\/]/).pop() || ''
  const code = activeFile ? fileContents[activeFile] ?? '' : ''
  return (
    <>
      {authChecking ? <div className="auth-loading-screen">Checking session...</div> : !authenticated ? <AuthPortal onPreview={enterPreview} onAuthenticated={handleAuthenticated} /> : <>
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
            <button className="home-settings home-account-button" onClick={() => setHomePanel('account')}>
              <UserRound size={17} />
              <span>Account</span>
            </button>
          </header>

          <main className="home-main">
            {homePanel !== 'home' && (
              <section className="home-welcome">
                <span className="home-eyebrow">YOUR CREATIVE WORKSPACE</span>
                <h1>{homePanel === 'new-project' ? 'Create a project' : homePanel === 'account' ? 'Your CodeKnit account' : 'Join your team'}</h1>
                <p>{homePanel === 'new-project' ? 'Give your workspace a name to get started.' : homePanel === 'account' ? 'Manage your profile and account details.' : 'Enter the invitation code shared by your team.'}</p>
              </section>
            )}

            {homePanel === 'home' ? (
              <HomeDashboard
                user={currentUser}
                projects={recentProjects}
                theme={theme as 'dark' | 'light'}
                onCreateProject={() => setHomePanel('new-project')}
                onJoinTeam={() => setHomePanel('join-team')}
                onOpenProject={openRecentProject}
              />
            ) : homePanel === 'new-project' ? (
              <section className="home-form-card">
                <label htmlFor="new-project-name">Project name</label>
                <input id="new-project-name" value={projectName} onChange={event => setProjectName(event.target.value)} placeholder="e.g. My first project" />
                <p className="home-form-hint">You can configure languages and templates inside your workspace.</p>
                <div className="home-form-actions">
                  <button className="home-back-button" onClick={() => setHomePanel('home')}>Back</button>
                  <button className="home-submit-button" disabled={!projectName.trim()} onClick={createProject}>Open workspace <ArrowRight size={16} /></button>
                </div>
              </section>
            ) : homePanel === 'account' ? (
              <section className="account-card">
                <div className="account-card-heading">
                  <div className="account-avatar"><UserRound size={27} /></div>
                  <div>
                    <strong>{currentUser?.fullName ?? 'Preview User'}</strong>
                    <span>{previewMode ? 'Development preview account' : currentUser?.email}</span>
                  </div>
                </div>

                {previewMode && (
                  <div className="account-preview-warning">
                    <Info size={16} />
                    These are demonstration details, not a registered CodeKnit account.
                  </div>
                )}

                <div className="account-details">
                  <div className="account-detail">
                    <span>Full name</span>
                    <strong>{currentUser?.fullName ?? "Preview User"}</strong>
                  </div>
                  <div className="account-detail">
                    <span>Email address</span>
                    <strong>{currentUser?.email ?? "preview@codeknit.dev"}</strong>
                  </div>
                  <div className="account-detail">
                    <span>Username</span>
                    <strong>{currentUser ? `@${currentUser.username}` : "@preview_user"}</strong>
                  </div>
                  <div className="account-detail">
                    <span>CodeKnit User ID</span>
                    <strong>{currentUser?.userId ?? "CK-PREVIEW-0001"}</strong>
                  </div>
                </div>

                {previewMode && (
                  <div className="account-id-note">
                    <Info size={15} />
                    Your real User ID will be generated by the server after registration.
                  </div>
                )}

                <div className="account-actions">
                  <button className="home-back-button" onClick={() => setHomePanel('home')}>
                    Back to home
                  </button>
                  <button className="account-logout-button" onClick={() => void handleLogout()}>
                    <LogOut size={16} /> Log out
                  </button>
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
      <button
  className="workspace-back-icon"
  onClick={() => {
    void closeActiveProjectSession().finally(() => {
      setScreen('home')
      setHomePanel('home')
    })
  }}
  title="Back to Home"
  aria-label="Back to Home"
>
  <ArrowLeft size={17} />
</button></header>

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
            <ProjectExplorer onOpenFile={openFile} onProjectOpen={handleProjectOpen} onRenamePath={renameOpenPath} onDeletePath={deleteOpenPath} />
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
              <h1>{activeFileName || "No file selected"}</h1>
              <span className="editor-subtitle">{activeFile || "Select a file from Explorer"}</span>
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
                  <span title={file}>{file.split(/[\\/]/).pop()}</span>
                  <span className="tab-close" onClick={event => { event.stopPropagation(); closeFile(file) }}>
                    <X size={13} />
                  </span>
                </button>
              ))}
              <button className="new-tab" title="Select a file in Explorer" onClick={() => setActiveActivity('Explorer')}>
                <Plus size={16} />
              </button>
            </div>
            <span className="tab-context"><Clock3 size={13} /> Recent files</span>
          </div>

          <CollaboratorPresence doc={projectSessionRef.current?.collaboration?.doc} userName={currentUser?.fullName || "You"} userId={String(currentUser?.userId || "local-user")} activeFileId={fileIds[activeFile] || ""} />
          <CodeEditor
            fileName={activeFile}
            collaboration={projectSessionRef.current && fileIds[activeFile] ? {
              session: projectSessionRef.current.collaboration,
              fileId: fileIds[activeFile]
            } : undefined}
            value={code}
            theme={theme}
            onChange={async (value) => {
              setFileContents(previous => ({ ...previous, [activeFile]: value }))

              const handle = fileHandles[activeFile]
              if (handle) {
                try {
                  const writer = await handle.createWritable()
                  await writer.write(value)
                  await writer.close()
                } catch (error) {
                  console.error('Could not save file:', error)
                }
              }
            }}
          />

<section className={`bottom-panel ${isPanelOpen ? 'expanded' : 'collapsed'}`}>
            <div className="panel-tabs">
              {(isPanelOpen
                ? [
                    { name: 'Terminal', icon: Terminal },
                    { name: 'Problems', icon: AlertCircle },
                    { name: 'Output', icon: Info },
                    { name: 'Preview', icon: Eye },
                    { name: 'Revisions', icon: History },
                  ]
                : [{ name: 'Terminal', icon: Terminal }]
              ).map(item => (
                <button
                  key={item.name}
                  className={activePanel === item.name ? 'panel-tab active' : 'panel-tab'}
                  onClick={() => {
                    if (item.name === 'Terminal' && isPanelOpen && activePanel === 'Terminal') {
                      setIsPanelOpen(false)
                    } else {
                      setActivePanel(item.name)
                      setIsPanelOpen(true)
                    }
                  }}
                >
                  <item.icon size={15} />
                  {item.name}
                  {item.name === 'Problems' && <span className="problem-count">0</span>}
                </button>
              ))}
              {isPanelOpen && (
                <button
                  className="subtle-icon panel-close"
                  title="Close bottom panel"
                  onClick={() => setIsPanelOpen(false)}
                >
                  <X size={15} />
                </button>
              )}
            </div>
            {isPanelOpen && (
              <div className="panel-content">
                {activePanel === 'Terminal'
                  ? <><span className="terminal-prompt">PS</span> Welcome to CodeKnit. Terminal integration is pending.</>
                  : activePanel === 'Problems'
                    ? 'No problems detected in this UI prototype.'
                    : activePanel === 'Preview'
                      ? 'Live preview integration will be available in a later milestone.'
                      : activePanel === 'Revisions'
                        ? (
                          <div className="revision-panel">
                            <div className="revision-panel-heading">
                              <div>
                                <strong>Revision checkpoints</strong>
                                <span>Metadata history for this project</span>
                              </div>
                              <button
                                type="button"
                                className="run-button"
                                onClick={createRevisionCheckpoint}
                                disabled={!fileIds[activeFile]}
                              >
                                <Plus size={14} /> Create checkpoint
                              </button>
                            </div>
                            {!fileIds[activeFile] ? (
                              <p>Open a project file to create a checkpoint.</p>
                            ) : revisions.filter(item => item.fileId === fileIds[activeFile]).length === 0 ? (
                              <p>No checkpoints yet. Create one to record this file's current milestone.</p>
                            ) : (
                              <div className="revision-list">
                                {revisions
                                  .filter(item => item.fileId === fileIds[activeFile])
                                  .slice()
                                  .reverse()
                                  .map(item => (
                                    <div className="revision-item" key={item.id}>
                                      <div className="revision-item-icon"><History size={15} /></div>
                                      <div>
                                        <strong>{item.description || "Revision checkpoint"}</strong>
                                        <span>{new Date(item.timestamp).toLocaleString()}</span>
                                        <small>{item.userId} Ãƒâ€šÃ‚Â· {item.type}</small>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        )
                        : 'Application output will appear here.'}
              </div>
            )}
          </section>

          <footer className="statusbar">
            <div><GitBranch size={13} /> main <span className="status-separator" /> <span>0 errors</span></div>
            <div><span>TypeScript JSX</span><span>UTF-8</span><span>Spaces: 2</span><span>Ln 1, Col 1</span></div>
          </footer>
        </main>

        <aside className="pulse-panel workspace-insights-hidden">
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
