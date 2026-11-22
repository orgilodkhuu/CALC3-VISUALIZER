import { useEffect, useState } from 'react'
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
      <div className="help">
        Use <code>^</code> for powers, <code>*</code> to multiply (<code>x*y</code>), and functions
        like <code>sin</code>, <code>sqrt</code>, <code>exp</code>, <code>abs</code>, <code>pi</code>.
      </div>
    </div>
  )
}
