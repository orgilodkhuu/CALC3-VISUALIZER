import { useEffect, useMemo, useRef, useState } from 'react'
import { compileFormula } from '../lib/formula.js'
import Tex from './Tex.jsx'

/** Labeled slider with the current value shown large enough for a projector. */
export function Slider({ label, value, min, max, step = 0.1, onChange, format = (v) => v }) {
  return (
    <label className="control">
      <span className="control-row">
        <span>{label}</span>
        <span className="control-value">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

export function Toggle({ label, checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

/**
 * Formula box. Calls onCompiled({ fn, tex }) only for valid input, so the last
 * good surface stays on screen while the professor is mid-typing.
 */
export function FormulaInput({
  label = 'z = f(x, y)',
  prefix = 'z = ',
  value,
  onChange,
  onCompiled,
  vars = ['x', 'y'],
  help = true,
}) {
  const [error, setError] = useState(null)
  const [tex, setTex] = useState('')

  useEffect(() => {
    const r = compileFormula(value, vars)
    if (r.ok) {
      setError(null)
      setTex(r.tex)
      onCompiled(r)
    } else {
      setError(r.error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="control">
      <span className="control-row">
        <span>{label}</span>
      </span>
      <input
        className={`formula ${error ? 'formula-error' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
      />
      {error ? (
        <div className="error-msg">{error}</div>
      ) : (
        <div className="formula-preview">
          <Tex>{`${prefix}${tex}`}</Tex>
        </div>
      )}
      {help && (
      <div className="help">
        Use <code>^</code> for powers, <code>*</code> to multiply (<code>x*y</code>), and functions
        like <code>sin</code>, <code>sqrt</code>, <code>exp</code>, <code>abs</code>, <code>pi</code>.
      </div>
      )}
    </div>
  )
}

/**
 * The Example dropdown, with "Your own…" as the last choice (index = examples.length).
 * Shown whenever a tab has examples; picking "Your own…" shows the scene's custom inputs below it.
 */
export function ExamplePicker({ examples, exampleIndex, onExample, ownLabel = 'Your own…' }) {
  if (!examples || examples.length === 0) return null
  return (
    <label className="control">
      <span className="control-row">Example</span>
      <select value={exampleIndex} onChange={(e) => onExample(Number(e.target.value))}>
        {examples.map((ex, i) => (
          <option key={i} value={i}>
            {ex.name}
          </option>
        ))}
        <option value={examples.length}>{ownLabel}</option>
      </select>
    </label>
  )
}

/** Box that holds the "Your own" inputs, right under the Example dropdown. */
export function CustomBox({ children }) {
  return <div className="custom-box">{children}</div>
}

/**
 * Small number box. Accepts expressions like 2pi or 3/4; ignores input it can't read.
 * Follows `value` when it changes from outside (e.g. dragging), unless you're typing in it.
 */
export function NumBox({ label, value, onChange, width = 72 }) {
  const [text, setText] = useState(String(round(value)))
  const [focus, setFocus] = useState(false)
  useEffect(() => {
    if (focus) return
    const r = compileFormula(text, [])
    if (!(r.ok && Math.abs(r.fn() - value) < 1e-9)) setText(String(round(value)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focus])
  return (
    <label className="numbox">
      {label && <span>{label}</span>}
      <input
        style={{ width }}
        value={text}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onChange={(e) => {
          setText(e.target.value)
          const r = compileFormula(e.target.value, [])
          if (r.ok && Number.isFinite(r.fn())) onChange(r.fn())
        }}
        spellCheck={false}
      />
    </label>
  )
}
const round = (v) => (Number.isFinite(v) ? Number(v.toFixed(4)) : v)

/** A point or vector typed as two numbers: label (a, b). */
export function PairInput({ label, value, onChange }) {
  return (
    <div className="control">
      <span className="control-row">{label}</span>
      <div className="two-nums">
        <NumBox label="(" value={value[0]} onChange={(v) => onChange([v, value[1]])} />
        <NumBox label="," value={value[1]} onChange={(v) => onChange([value[0], v])} />
        <span className="numbox">)</span>
      </div>
    </div>
  )
}

/** View window: x from … to …, y from … to … (only accepts from < to). */
export function RangeInputs({ x, y, onChange }) {
  const ok = (r) => r[0] < r[1]
  return (
    <div className="control">
      <span className="control-row">View</span>
      <div className="two-nums">
        <NumBox label="x from" value={x[0]} onChange={(v) => ok([v, x[1]]) && onChange({ x: [v, x[1]], y })} width={56} />
        <NumBox label="to" value={x[1]} onChange={(v) => ok([x[0], v]) && onChange({ x: [x[0], v], y })} width={56} />
      </div>
      <div className="two-nums">
        <NumBox label="y from" value={y[0]} onChange={(v) => ok([v, y[1]]) && onChange({ x, y: [v, y[1]] })} width={56} />
        <NumBox label="to" value={y[1]} onChange={(v) => ok([y[0], v]) && onChange({ x, y: [y[0], v] })} width={56} />
      </div>
    </div>
  )
}

/**
 * Compile a formula and keep the last one that worked, so the picture stays while someone is
 * mid-typing (FormulaInput shows the error message).
 */
export function useCompiled(text, vars = ['x', 'y']) {
  const last = useRef(null)
  const key = vars.join(',')
  const r = useMemo(() => compileFormula(text, vars), [text, key]) // eslint-disable-line react-hooks/exhaustive-deps
  if (r.ok) last.current = r
  return last.current ?? r
}
