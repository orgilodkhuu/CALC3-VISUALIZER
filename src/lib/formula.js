import { parse } from 'mathjs'

/**
 * Compile a formula like "x^2 + y^2" (or "z = x^2 + y^2") into a fast JS function.
 * Never throws: returns { ok: true, fn, tex } or { ok: false, error }.
 *
 * allowedVars: the variables the formula may use, e.g. ['x', 'y'].
 */
export function compileFormula(input, allowedVars = ['x', 'y']) {
  const text = String(input ?? '').trim().replace(/^\s*[a-z]\s*(\([^)]*\))?\s*=\s*/i, '')
  if (!text) return { ok: false, error: 'Type a formula, e.g. x^2 + y^2' }

  let node
  try {
    node = parse(text)
  } catch (e) {
    return { ok: false, error: `Can't read that formula: ${e.message}` }
  }

  // Reject unknown variables up front, with a readable message.
  const unknown = new Set()
  node.traverse((n, path, parent) => {
    if (!n.isSymbolNode) return
    const isFnName = parent && parent.isFunctionNode && parent.fn === n
    if (isFnName) return
    if (allowedVars.includes(n.name)) return
    if (['pi', 'e', 'PI', 'E', 'tau', 'phi'].includes(n.name)) return
    unknown.add(n.name)
  })
  if (unknown.size) {
    const list = [...unknown].join(', ')
    const glued = [...unknown].find((u) => u.length > 1 && [...u].every((ch) => allowedVars.includes(ch)))
    const hint = glued ? ` To multiply, write ${[...glued].join('*')} instead of ${glued}.` : ''
    return {
      ok: false,
      error: `Unknown variable${unknown.size > 1 ? 's' : ''}: ${list}. Use only ${allowedVars.join(' and ')}.${hint}`,
    }
  }

  let code
  try {
    code = node.compile()
  } catch (e) {
    return { ok: false, error: e.message }
  }

  const scope = {}
  const fn = (...args) => {
    for (let i = 0; i < allowedVars.length; i++) scope[allowedVars[i]] = args[i]
    try {
      const v = code.evaluate(scope)
      return typeof v === 'number' ? v : NaN // complex results (e.g. sqrt(-1)) -> gap
    } catch {
      return NaN
    }
  }

  // Test-evaluate once so errors like "unknown function foo" show now, not mid-render.
  try {
    const v = code.evaluate(Object.fromEntries(allowedVars.map((k) => [k, 0.5])))
    if (typeof v !== 'number' && !(v && v.isComplex)) {
      return { ok: false, error: 'The formula must give a single number.' }
    }
  } catch (e) {
    return { ok: false, error: e.message }
  }

  let tex = text
  try {
    tex = node.toTex({ parenthesis: 'auto', implicit: 'hide' })
  } catch {
    /* keep raw text */
  }
  return { ok: true, fn, tex }
}
