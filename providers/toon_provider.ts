import { HttpRequest, HttpResponse } from '@adonisjs/core/http'
import type { DecodeOptions, EncodeOptions } from '@toon-format/toon'
import { decode, encode } from '../src/toon_encoder.ts'
import type { ApplicationService } from '@adonisjs/core/types'

declare module '@adonisjs/core/http' {
  interface HttpResponse {
    toon(data: unknown, options?: import('@toon-format/toon').EncodeOptions): void
  }

  interface HttpRequest {
    toon<T = unknown>(options?: import('@toon-format/toon').DecodeOptions): T | null
  }
}

export default class ToonProvider {
  constructor(protected app: ApplicationService) {}

  boot() {
    HttpResponse.macro(
      'toon',
      function (this: HttpResponse, data: unknown, options?: EncodeOptions) {
        this.header('Content-Type', 'application/toon; charset=utf8')
        return encode(data, options)
      }
    )

    HttpRequest.macro('toon', function (this: HttpRequest, options?: DecodeOptions) {
      const raw = this.raw()

      if (raw === null) return null

      return decode(raw, options)
    })
  }
}
