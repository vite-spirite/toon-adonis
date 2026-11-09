import { encode } from './toon_encoder.ts'
import type { EncodeOptions } from '@toon-format/toon'

export interface ToonSerializeOptions extends EncodeOptions {
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
 * is unwrapped recursively.
 */
function toPlain(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toPlain)
  }

  if (isToJsonable(value)) {
    return toPlain(value.toJSON())
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toPlain(item)]))
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
 * Serializes Lucid models, collections or plain data to a TOON string.
 * Preloaded relations are included as nested structures.
 *
 * ```ts
 * const users = await User.query().preload('posts')
 * return response.toon(serialize(users, { only: ['id', 'name', 'posts'] }))
 * ```
 */
export function serialize(data: unknown, options?: ToonSerializeOptions): string {
  const { only, except, ...encodeOptions } = options ?? {}
  return encode(filter(toPlain(data), only, except), encodeOptions)
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
    toToon(options?: ToonSerializeOptions): string {
      return serialize(this, options)
    }
  }

  return Toonable
}
