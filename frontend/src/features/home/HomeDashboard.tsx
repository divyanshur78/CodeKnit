import { FolderPlus, Users, Clock3, ArrowRight, Code2, FolderOpen } from 'lucide-react'
import type { UserProfile } from '../../types/auth.types'
import './HomeDashboard.css'

export type RecentProject = {
  id: string
  name: string
  updatedAt: string
  language?: string
}

type HomeDashboardProps = {
  user: UserProfile | null
  projects?: RecentProject[]
  theme: 'dark' | 'light'
  onCreateProject: () => void
  onJoinTeam: () => void
  onOpenProject: (project: RecentProject) => void
}

export function HomeDashboard({
  user,
  projects = [],
  theme,
  onCreateProject,
  onJoinTeam,
  onOpenProject,
}: HomeDashboardProps) {
  const displayName = user?.fullName?.trim().split(' ')[0] || 'there'

  return (
    <main className={`dashboard-page ${theme}`}>
      <section className="dashboard-welcome">
        <div>
          <span className="dashboard-eyebrow">YOUR CREATIVE WORKSPACE</span>
          <h1>Welcome back, {displayName}.</h1>
          <p>What would you like to build today?</p>
        </div>
        <div className="dashboard-welcome-mark"><Code2 size={34} /></div>
      </section>

      <section className="dashboard-actions">
        <button className="dashboard-action-card primary" onClick={onCreateProject}>
          <span className="dashboard-action-icon"><FolderPlus size={23} /></span>
          <span className="dashboard-action-copy">
            <strong>New Project</strong>
            <small>Start something from scratch</small>
          </span>
          <ArrowRight size={19} />
        </button>

        <button className="dashboard-action-card" onClick={onJoinTeam}>
          <span className="dashboard-action-icon"><Users size={23} /></span>
          <span className="dashboard-action-copy">
            <strong>Join a Team</strong>
            <small>Enter an invitation or room code</small>
          </span>
          <ArrowRight size={19} />
        </button>
      </section>

      <section className="dashboard-projects">
        <div className="dashboard-section-heading">
          <div>
            <span className="dashboard-eyebrow">YOUR WORK</span>
            <h2>Recent Projects</h2>
          </div>
          <span className="dashboard-project-count">{projects.length} projects</span>
        </div>

        {projects.length ? (
          <div className="dashboard-project-grid">
            {projects.map(project => (
              <button className="dashboard-project-card" key={project.id} onClick={() => onOpenProject(project)}>
                <span className="dashboard-project-icon"><FolderOpen size={21} /></span>
                <strong>{project.name}</strong>
                <span className="dashboard-project-language">{project.language || 'Project'}</span>
                <span className="dashboard-project-updated"><Clock3 size={13} /> {project.updatedAt}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty">
            <div className="dashboard-empty-icon"><FolderOpen size={27} /></div>
            <strong>No projects yet</strong>
            <p>Your projects will appear here when you create or open them.</p>
            <button onClick={onCreateProject}>Create your first project <ArrowRight size={15} /></button>
          </div>
        )}
      </section>

      <footer className="dashboard-footer">
        <span>CodeKnit</span>
        <span>Build together. Create freely.</span>
      </footer>
    </main>
  )
}
