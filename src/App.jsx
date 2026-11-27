import { useEffect, useState } from 'react'
import { TOPICS } from './topics/index.js'
import FunctionExplorer from './scenes/FunctionExplorer.jsx'
import VectorsScene from './scenes/VectorsScene.jsx'
import FieldScene from './scenes/FieldScene.jsx'
import LineScene from './scenes/LineScene.jsx'
import CurlScene from './scenes/CurlScene.jsx'
import GreenScene from './scenes/GreenScene.jsx'
import BoxesScene from './scenes/BoxesScene.jsx'
import RegionScene from './scenes/RegionScene.jsx'

// Which scene draws a tab (config `scene`); surfaces are the default.
const SCENES = {
  surface: FunctionExplorer,
  vectors: VectorsScene,
  field: FieldScene,
  line: LineScene,
  curl: CurlScene,
  green: GreenScene,
  boxes: BoxesScene,
  region: RegionScene,
}

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
 * and restarts the scene with that setup. The last choice, "Your own…" (index = examples.length),
 * starts as a copy of the example you were on; what you type is kept in `store` (per tab),
 * so you can switch to the worksheet examples and come back to yours.
 */
function ProblemPage({ tab, store, setStore }) {
  const examples = tab.examples ?? []
  const OWN = examples.length
  const ex = Math.min(store.ex ?? 0, OWN)
  const pick = (i) => {
    if (i === OWN && !store.custom) {
      const { name, ...seed } = examples[ex] ?? {} // eslint-disable-line no-unused-vars
      setStore({ ex: i, custom: seed })
    } else setStore({ ex: i })
  }
  const onCustom = (patch) => setStore((s) => ({ custom: { ...s.custom, ...patch } }))
  const problem =
    ex === OWN && examples.length ? { ...tab, ...store.custom, isCustom: true } : { ...tab, ...(examples[ex] ?? {}) }
  const Scene = SCENES[tab.scene ?? 'surface']
  return (
    <Scene
      key={ex}
      problem={problem}
      examples={examples}
      exampleIndex={ex}
      onExample={pick}
      onCustom={onCustom}
      tabState={store}
      setTabState={(patch) => setStore(patch)}
    />
  )
}

const link = (t, p) => `#/${t.n}${p ? `/${encodeURIComponent(p.id)}` : ''}`

export default function App() {
  const { topic, problem } = useRoute()
  const [navOpen, setNavOpen] = useState(false)
  // Per-tab memory while the app is open: chosen example, "Your own" inputs, own path.
  const [stores, setStores] = useState({})
  const storeKey = problem ? `${topic.n}/${problem.id}` : ''
  const setStore = (patch) =>
    setStores((all) => {
      const cur = all[storeKey] ?? {}
      const p = typeof patch === 'function' ? patch(cur) : patch
      return { ...all, [storeKey]: { ...cur, ...p } }
    })

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
          <ProblemPage key={storeKey} tab={problem} store={stores[storeKey] ?? {}} setStore={setStore} />
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
