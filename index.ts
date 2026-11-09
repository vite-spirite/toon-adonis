/*
|--------------------------------------------------------------------------
| Package entrypoint
|--------------------------------------------------------------------------
|
| Export values from the package entrypoint as you see fit.
|
*/

export { encode, decode } from './src/toon_encoder.ts'
export { serialize, WithToon } from './src/toon_serializer.ts'
export type { ToonSerializeOptions } from './src/toon_serializer.ts'
export * from './src/types.ts'

export { configure } from './configure.ts'
