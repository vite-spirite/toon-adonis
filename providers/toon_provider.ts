import { HttpRequest, HttpResponse } from '@adonisjs/core/http'
import type { DecodeOptions, EncodeOptions } from '@toon-format/toon'
import { decode, encode } from '../src/toon_encoder.ts'
import type { ApplicationService } from '@adonisjs/core/types'

declare module '@adonisjs/core/http' {
  interface HttpResponse {
    toon(data: unknown, options?: EncodeOptions): void
  }

  interface HttpRequest {
    /**
     * Reads the raw request body and decodes it as TOON.
     * Returns `null` when there is no body.
     *
     * @throws When the body is not valid TOON
     */
    toon<T = unknown>(options?: DecodeOptions): T | null

    /**
     * Whether the client accepts TOON responses
     * (`Accept` header includes `application/toon`)
     */
    wantsToon(): boolean
  }
}

export default class ToonProvider {
  constructor(protected app: ApplicationService) {}

  boot() {
    HttpResponse.macro(
      'toon',
      function (this: HttpResponse, data: unknown, options?: EncodeOptions) {
        this.header('Content-Type', 'application/toon; charset=utf-8')
        this.send(encode(data, options))
      }
    )

    HttpRequest.macro('toon', function (this: HttpRequest, options?: DecodeOptions) {
      const raw = this.raw()

      if (raw === null || raw === '') {
        return null
      }

      return decode(raw, options)
    })

    HttpRequest.macro('wantsToon', function (this: HttpRequest) {
      const accept = this.header('Accept')

      if (!accept) {
        return false
      }

      return accept
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .some((entry) => {
          const [mediaType, ...params] = entry.split(';').map((part) => part.trim())

          if (mediaType !== 'application/toon') {
            return false
          }

          const quality = params.find((param) => param.startsWith('q='))

          return !quality || Number.parseFloat(quality.slice(2)) > 0
        })
    })
  }
}
