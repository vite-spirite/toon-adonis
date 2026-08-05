import {
  encode as encoder,
  decode as decoder,
  type EncodeOptions,
  type DecodeOptions,
} from '@toon-format/toon'

export function encode(data: unknown, options?: EncodeOptions): string {
  return encoder(data, options)
}

export function decode<T = unknown>(payload: string, options?: DecodeOptions): T {
  return decoder(payload, options) as T
}
