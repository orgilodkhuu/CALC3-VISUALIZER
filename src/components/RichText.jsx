import Tex from './Tex.jsx'

/** Plain text with inline math between $...$, e.g. "Cross sections of $f(x,y)=y^3-x^2$". */
export default function RichText({ children }) {
  const parts = String(children ?? '').split('$')
  return parts.map((p, i) => (i % 2 ? <Tex key={i}>{p}</Tex> : <span key={i}>{p}</span>))
}
