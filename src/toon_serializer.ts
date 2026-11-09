export interface ToonSerializeOptions {
  /**
   * Top-level attributes to keep. Applied to objects and to every
   * item of arrays.
   */
  only?: string[]
  /**
   * Top-level attributes to drop. Applied after `only`.
   */
  except?: string[]
}

type Constructor = new (...args: any[]) => object

function isToJsonable(value: unknown): value is { toJSON: () => unknown } {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as { toJSON?: unknown }).toJSON === 'function'
  )
}

/**
 * Converts Lucid models, collections and plain objects to plain data.
 * Anything exposing `toJSON()` (models, collections, preloaded relations)
 * is unwrapped recursively. Throws on cyclic structures instead of
 * overflowing the stack.
 */
function toPlain(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      throw new Error('Cannot serialize a cyclic structure to TOON')
    }
    seen.add(value)
    const result = value.map((item) => toPlain(item, seen))
    seen.delete(value)
    return result
  }

  if (isToJsonable(value)) {
    return toPlain(value.toJSON(), seen)
  }

  if (value !== null && typeof value === 'object') {
    if (seen.has(value)) {
      throw new Error('Cannot serialize a cyclic structure to TOON')
    }
    seen.add(value)
    const result = Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toPlain(item, seen)])
    )
    seen.delete(value)
    return result
  }

  return value
}

function pick(entry: Record<string, unknown>, only?: string[], except?: string[]) {
  let result = entry

  if (only) {
    result = Object.fromEntries(
      only.filter((key) => key in result).map((key) => [key, result[key]])
    )
  }

  if (except) {
    result = Object.fromEntries(Object.entries(result).filter(([key]) => !except.includes(key)))
  }

  return result
}

function filter(data: unknown, only?: string[], except?: string[]): unknown {
  if (!only && !except) {
    return data
  }

  if (Array.isArray(data)) {
    return data.map((item) =>
      item !== null && typeof item === 'object' && !Array.isArray(item)
        ? pick(item as Record<string, unknown>, only, except)
        : item
    )
  }

  if (data !== null && typeof data === 'object') {
    return pick(data as Record<string, unknown>, only, except)
  }

  return data
}

/**
 * Converts Lucid models, collections or plain data to TOON-ready plain data.
 * Preloaded relations are included as nested structures. Pass the result
 * to `encode()` or `response.toon()`, which own the TOON encoding.
 *
 * ```ts
 * const users = await User.query().preload('posts')
 * return response.toon(serialize(users, { only: ['id', 'name', 'posts'] }))
 * ```
 */
export function serialize(data: unknown, options?: ToonSerializeOptions): unknown {
  const { only, except } = options ?? {}
  return filter(toPlain(data), only, except)
}

/**
 * Mixin adding a `toToon()` method to a Lucid model. Compatible with
 * `compose()` and dependency-free (relies on `toJSON()` duck-typing).
 *
 * ```ts
 * import { compose } from '@adonisjs/core/helpers'
 *
 * export default class User extends compose(BaseModel, WithToon) {}
 *
 * const user = await User.query().preload('posts').firstOrFail()
 * return response.toon(user.toToon({ only: ['id', 'name', 'posts'] }))
 * ```
 */
export function WithToon<TBase extends Constructor>(superclass: TBase) {
  class Toonable extends superclass {
    toToon(options?: ToonSerializeOptions): unknown {
      return serialize(this, options)
    }
  }

  return Toonable
}
