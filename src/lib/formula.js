import { create, all } from 'mathjs'

const math = create(all)

const CONSTANTS = ['pi', 'e', 'PI', 'E', 'tau', 'phi']

/** Normalize what people type: strip "z =" / "f(x,y) =", allow ln, allow unicode minus/·. */
function clean(input) {
  return String(input ?? '')
    .trim()
    .replace(/^\s*[a-z]\s*(\([^)]*\))?\s*=\s*/i, '')
    .replace(/[−–]/g, '-')
    .replace(/[·×]/g, '*')
    .replace(/\bln\s*\(/g, 'log(') // her sheets write ln; math.js calls it log
}

function toTex(node) {
  try {
    return node
      .toTex({ parenthesis: 'auto', implicit: 'hide' })
      .replace(/\\log\\left\(/g, '\\ln\\left(')
      .replace(/\\mathrm\{ln\}/g, '\\ln')
      .replace(/\\mathrm\{t\}/g, 't') // math.js typesets t as the unit "tonne"
      .replace(/~\\(sin|cos|tan|ln)/g, '\\,\\$1')
  } catch {
    return node.toString()
  }
}

function makeFn(node, vars) {
  const code = node.compile()
  const scope = {}
  return (...args) => {
    for (let i = 0; i < vars.length; i++) scope[vars[i]] = args[i]
    try {
      const v = code.evaluate(scope)
      return typeof v === 'number' ? v : NaN // complex (sqrt(-1), ln(-1)) -> gap
    } catch {
      return NaN
    }
  }
}

/**
 * Compile a formula like "x^2 + y^2" into a fast JS function.
 * Never throws: returns { ok: true, fn, tex, node } or { ok: false, error }.
 */
export function compileFormula(input, vars = ['x', 'y']) {
  const text = clean(input)
  if (!text) return { ok: false, error: 'Type a formula, e.g. x^2 + y^2' }

  let node
  try {
    node = math.parse(text)
  } catch (e) {
    return { ok: false, error: `Can't read that formula: ${e.message}` }
  }

  const unknown = new Set()
  node.traverse((n, path, parent) => {
    if (!n.isSymbolNode) return
    if (parent && parent.isFunctionNode && parent.fn === n) return
    if (vars.includes(n.name) || CONSTANTS.includes(n.name)) return
    unknown.add(n.name)
  })
  if (unknown.size) {
    const list = [...unknown].join(', ')
    const glued = [...unknown].find((u) => u.length > 1 && [...u].every((ch) => vars.includes(ch)))
    const hint = glued ? ` To multiply, write ${[...glued].join('*')} instead of ${glued}.` : ''
    return {
      ok: false,
      error: `Unknown variable${unknown.size > 1 ? 's' : ''}: ${list}. Use only ${vars.join(' and ')}.${hint}`,
    }
  }

  try {
    const v = node.compile().evaluate(Object.fromEntries(vars.map((k) => [k, 0.5])))
    if (typeof v !== 'number' && !(v && v.isComplex)) {
      return { ok: false, error: 'The formula must give a single number.' }
    }
  } catch (e) {
    return { ok: false, error: e.message }
  }

  return { ok: true, fn: makeFn(node, vars), tex: toTex(node), node }
}

/**
 * Symbolic partial derivative of a compiled formula node.
 * order: e.g. ['x'] for f_x, ['x','y'] for f_xy (differentiate by x, then by y).
 * Returns { fn, tex } or null if math.js can't differentiate it.
 */
export function partial(node, order, vars = ['x', 'y']) {
  try {
    let d = node
    for (const v of order) d = math.simplify(math.derivative(d, v))
    return { fn: makeFn(d, vars), tex: toTex(d) }
  } catch {
    return null
  }
}

/** Format a number for display: trims noise like 2.0000001 and -0. */
export function fmt(v, digits = 3) {
  if (!Number.isFinite(v)) return 'undefined'
  const r = Number(v.toFixed(digits))
  return String(Object.is(r, -0) ? 0 : r)
}

/**
 * 2D curl of F = (F1, F2) from compiled nodes: ∂F2/∂x − ∂F1/∂y, simplified.
 * Returns { fn, tex, d2x, d1y } (d2x, d1y: { fn, tex } for each partial) or null.
 */
export function curl2D(node1, node2) {
  try {
    const d1 = math.simplify(math.derivative(node1, 'y'))
    const d2 = math.simplify(math.derivative(node2, 'x'))
    const c = math.simplify(new math.OperatorNode('-', 'subtract', [d2, d1]))
    const vars = ['x', 'y']
    // -(2*y) reads better as -2·y
    const neg = c.isOperatorNode && c.fn === 'unaryMinus' ? c.args[0] : null
    const arg = neg?.isParenthesisNode ? neg.content : neg
    const tex = arg?.isOperatorNode && arg.fn === 'multiply' ? `-${toTex(arg)}` : toTex(c)
    return {
      fn: makeFn(c, vars),
      tex,
      d2x: { fn: makeFn(d2, vars), tex: toTex(d2) },
      d1y: { fn: makeFn(d1, vars), tex: toTex(d1) },
    }
  } catch {
    return null
  }
}
