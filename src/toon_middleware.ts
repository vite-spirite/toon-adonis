import type { NextFn } from '@adonisjs/core/types/http'
import type { HttpContext } from '@adonisjs/core/http'
import { decode } from './toon_encoder.ts'

export default class ToonMiddleware {
  async handle({ request }: HttpContext, next: NextFn) {
    if (request.header('Content-Type')?.includes('application/toon')) {
      const raw = request.raw()

      if (raw) {
        request.updateBody(decode(raw))
      }
    }

    await next()
  }
}
