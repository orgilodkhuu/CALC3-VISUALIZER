import { useEffect, useState } from 'react'
import { MODULES } from './modules/index.js'

// The URL hash (#surfaces) picks the module, so the professor can bookmark or share a topic.
function useHashModule() {
  const read = () => {
    const id = window.location.hash.slice(1)
    return MODULES.some((m) => m.id === id) ? id : MODULES[0].id
  }
  const [id, setId] = useState(read)
  useEffect(() => {
    const onHash = () => setId(read())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return id
}

export default function App() {
  const activeId = useHashModule()
  const [navOpen, setNavOpen] = useState(() => window.innerWidth > 900)
  const active = MODULES.find((m) => m.id === activeId)
  const Module = active.component

  return (
    <div className={`app ${navOpen ? '' : 'nav-closed'}`}>
      <header className="topbar">
        <button className="nav-toggle" onClick={() => setNavOpen((o) => !o)} title="Show/hide topics">
          ☰
        </button>
        <h1>Calc 3 Visualizer</h1>
        <span className="topbar-topic">{active.title}</span>
      </header>

      <nav className="sidebar">
        <ol>
          {MODULES.map((m) => (
            <li key={m.id}>
              <a
                href={`#${m.id}`}
                className={`${m.id === activeId ? 'active' : ''} ${m.component ? '' : 'soon'}`}
              >
                {m.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <main className="content">
        {Module ? (
          <Module key={active.id} />
        ) : (
          <div className="coming-soon">
            <h2>{active.title}</h2>
            <p>This topic is coming soon.</p>
          </div>
        )}
      </main>
    </div>
  )
}
