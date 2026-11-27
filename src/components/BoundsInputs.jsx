import { FormulaInput, NumBox } from './Controls.jsx'
import { ORDER_LABELS, num } from '../lib/integrals.js'

/**
 * "Your own" region, typed as iterated-integral bounds (see lib/integrals.js):
 * order of integration, outer limits (numbers; pi allowed), inner limits (formulas in the outer variable).
 * `polar` picks which orders are offered.
 */
export default function BoundsInputs({ bounds, polar = false, onChange }) {
  const B = bounds
  const orders = polar ? ['drdt', 'dtdr'] : ['dydx', 'dxdy']
  const outerVar = { dydx: 'x', dxdy: 'y', drdt: 'θ', dtdr: 'r' }[B.order]
  const innerVar = { dydx: 'y', dxdy: 'x', drdt: 'r', dtdr: 'θ' }[B.order]
  const vars = [{ dydx: 'x', dxdy: 'y', drdt: 'theta', dtdr: 'r' }[B.order]]
  const outerNum = num
  return (
    <>
      <label className="control">
        <span className="control-row">Order of integration</span>
        <select value={B.order} onChange={(e) => onChange({ ...B, order: e.target.value })}>
          {orders.map((o) => (
            <option key={o} value={o}>
              {ORDER_LABELS[o]}
            </option>
          ))}
        </select>
      </label>
      <div className="control">
        <span className="control-row">Outer: {outerVar} from … to …</span>
        <div className="two-nums">
          <NumBox label={`${outerVar} from`} value={outerNum(B.outer[0])} onChange={(v) => onChange({ ...B, outer: [v, B.outer[1]] })} width={64} />
          <NumBox label="to" value={outerNum(B.outer[1])} onChange={(v) => onChange({ ...B, outer: [B.outer[0], v] })} width={64} />
        </div>
      </div>
      <FormulaInput
        label={`Inner: ${innerVar} from (may use ${outerVar})`}
        prefix={`${innerVar} = `}
        vars={vars}
        value={String(B.inner[0])}
        onChange={(v) => onChange({ ...B, inner: [v, B.inner[1]] })}
        onCompiled={() => {}}
        help={false}
      />
      <FormulaInput
        label={`${innerVar} to`}
        prefix={`${innerVar} = `}
        vars={vars}
        value={String(B.inner[1])}
        onChange={(v) => onChange({ ...B, inner: [B.inner[0], v] })}
        onCompiled={() => {}}
        help={false}
      />
    </>
  )
}
