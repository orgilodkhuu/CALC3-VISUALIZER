import katex from 'katex'
import 'katex/dist/katex.min.css'

/** Render a LaTeX string. Bad LaTeX shows in red instead of crashing. */
export default function Tex({ children, block = false }) {
  const html = katex.renderToString(String(children ?? ''), {
    displayMode: block,
    throwOnError: false,
  })
  return <span className={block ? 'tex tex-block' : 'tex'} dangerouslySetInnerHTML={{ __html: html }} />
}
