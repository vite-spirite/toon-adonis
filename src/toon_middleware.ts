import type { NextFn } from '@adonisjs/core/types/http'
import type { HttpContext } from '@adonisjs/core/http'
import { decode } from './toon_encoder.ts'

export default class ToonMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    if (request.header('Content-Type')?.includes('application/toon')) {
      const raw = request.raw()

      if (raw) {
        let decoded: unknown
        try {
          decoded = decode(raw)
        } catch {
          return response.badRequest({ error: 'Invalid TOON payload' })
        }

        if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) {
          return response.badRequest({ error: 'Invalid TOON payload: expected an object' })
        }

        request.updateBody(decoded as Record<string, unknown>)
      }
    }

    await next()
  }
}
