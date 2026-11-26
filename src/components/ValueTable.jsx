import { useState } from 'react'
import { fmt } from '../lib/formula.js'

/**
 * Table of f(x, y) laid out like the worksheets: x down the side, y across the top.
 * Cells start hidden; click one to reveal it, or reveal all. Hovered cells highlight
 * the matching dot on the 3D surface via onHover.
 */
export default function ValueTable({ fn, xs, ys, onHover, hiddenAtStart = true }) {
  const [shown, setShown] = useState(() => new Set())
  const [all, setAll] = useState(!hiddenAtStart)
  const key = (i, j) => `${i},${j}`
  const toggle = (i, j) =>
    setShown((s) => {
      const n = new Set(s)
      n.has(key(i, j)) ? n.delete(key(i, j)) : n.add(key(i, j))
      return n
    })

  return (
    <figure className="value-table">
      <figcaption>
        Table of f(x, y)
        <button
          className="small"
          onClick={() => {
            setAll((a) => !a)
            setShown(new Set())
          }}
        >
          {all ? 'Hide values' : 'Reveal all'}
        </button>
      </figcaption>
      <table>
        <thead>
          <tr>
            <th className="corner">
              <span className="corner-y">y →</span>
              <span className="corner-x">x ↓</span>
            </th>
            {ys.map((y) => (
              <th key={y}>{fmt(y)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {xs.map((x, i) => (
            <tr key={x}>
              <th>{fmt(x)}</th>
              {ys.map((y, j) => {
                const visible = all || shown.has(key(i, j))
                return (
                  <td
                    key={y}
                    className={visible ? '' : 'hidden-cell'}
                    onClick={() => toggle(i, j)}
                    onMouseEnter={() => onHover?.([x, y])}
                    onMouseLeave={() => onHover?.(null)}
                    title={visible ? '' : 'Click to reveal'}
                  >
                    {visible ? fmt(fn(x, y)) : '?'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="help">Click a cell to reveal it. Hover to find it on the surface.</div>
    </figure>
  )
}
