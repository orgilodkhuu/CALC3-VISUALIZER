import { useEffect, useState } from 'react'
import { TOPICS } from './topics/index.js'
import FunctionExplorer from './scenes/FunctionExplorer.jsx'

/** URL: #/<topic>/<problem>, e.g. #/2/3a, so the professor can bookmark a problem. */
function parseHash() {
  const [, t, p] = window.location.hash.split('/')
  const topic = TOPICS.find((x) => String(x.n) === t) ?? TOPICS.find((x) => x.problems)
  const problem = topic.problems?.find((x) => x.id === decodeURIComponent(p ?? '')) ?? topic.problems?.[0]
  return { topic, problem }
}

function useRoute() {
  const [route, setRoute] = useState(parseHash)
  useEffect(() => {
    const on = () => setRoute(parseHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

/**
 * A tab plus its examples: picking an example merges its fields over the tab's defaults
 * and restarts the scene with that setup.
 */
function ProblemPage({ tab }) {
  const [ex, setEx] = useState(0)
  const examples = tab.examples ?? []
  const problem = { ...tab, ...(examples[ex] ?? {}) }
  return (
    <FunctionExplorer
      key={ex}
      problem={problem}
      examples={examples}
      exampleIndex={ex}
      onExample={setEx}
    />
  )
}

const link = (t, p) => `#/${t.n}${p ? `/${encodeURIComponent(p.id)}` : ''}`

export default function App() {
  const { topic, problem } = useRoute()
  const [navOpen, setNavOpen] = useState(false)

  // Close the topic drawer after choosing a topic.
  useEffect(() => setNavOpen(false), [topic.n])

  return (
    <div className="app">
      <header className="topbar">
        <button className="nav-toggle" onClick={() => setNavOpen((o) => !o)} title="All topics">
          ☰
        </button>
        <span className="topic-num">{topic.n}.</span>
        <h1>{topic.title}</h1>
        {topic.problems?.length > 1 && (
          <nav className="tabs" aria-label="Ideas in this topic">
            {topic.problems.map((p) => (
              <a key={p.id} href={link(topic, p)} className={p.id === problem?.id ? 'active' : ''}>
                {p.title}
              </a>
            ))}
          </nav>
        )}
      </header>

      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}
      <nav className={`drawer ${navOpen ? 'open' : ''}`} aria-label="Topics">
        <div className="drawer-title">MATH 260 topics</div>
        <ol>
          {TOPICS.map((t) => (
            <li key={t.n} value={t.n}>
              <a href={link(t)} className={`${t.n === topic.n ? 'active' : ''} ${t.problems ? '' : 'soon'}`}>
                {t.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <main className="content">
        {problem ? (
          <ProblemPage key={`${topic.n}/${problem.id}`} tab={problem} />
        ) : (
          <div className="coming-soon">
            <h2>
              {topic.n}. {topic.title}
            </h2>
            <p>This topic is coming soon.</p>
          </div>
        )}
      </main>
    </div>
  )
}
