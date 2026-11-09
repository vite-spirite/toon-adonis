# @vite-spirite/toon-adonis

Serialize and parse [TOON](https://toonformat.dev) (Token-Oriented Object Notation) directly from your AdonisJS controllers, request payloads, and webhooks.

TOON is a compact, LLM-friendly alternative to JSON, designed to reduce token usage when sending structured data to language models. This package wires it natively into AdonisJS's `Response` and `Request` objects, plus an optional middleware for automatic parsing of incoming TOON payloads.

## Why

If your backend talks to LLMs — sending context, RAG results, database query results, or receiving structured webhook payloads from an AI agent — TOON can meaningfully cut down the number of tokens exchanged compared to raw JSON, especially on tabular/homogeneous data (arrays of objects sharing the same keys).

This package does **not** replace JSON as your API's default format. It's an opt-in tool for the specific parts of your app that talk to LLMs.

## Installation

```bash
npm install @vite-spirite/toon-adonis
node ace configure @vite-spirite/toon-adonis
```

The configure command will:
- Register the provider in your `adonisrc.ts`
- Optionally register the TOON parsing middleware on your router

### Manual step: enable the raw body parser

For the middleware to work, AdonisJS needs to be told to expose the raw body for the `application/toon` content type. Add this to your `config/bodyparser.ts`:

```ts
raw: {
  types: ['application/toon'],
  limit: '1mb',
  encoding: 'utf-8',
},
```

## Usage

### Sending TOON from a controller

```ts
router.get('/users', async ({ response }) => {
  const users = await User.all()
  return response.toon(users)
})
```

This sets `Content-Type: application/toon; charset=utf-8` and encodes the payload.

You can pass any [EncodeOptions](https://www.npmjs.com/package/@toon-format/toon) supported by the underlying library:

```ts
return response.toon(users, { indent: 4 })
```

### Serving TOON only when the client asks for it

Use `request.wantsToon()` to check whether the client's `Accept` header includes `application/toon`, and fall back to JSON otherwise:

```ts
router.get('/users', async ({ request, response }) => {
  const users = await User.all()

  if (request.wantsToon()) {
    return response.toon(users)
  }

  return users
})
```

Need a different status code? `response.toon` chains after `response.status` like any other responder:

```ts
return response.status(201).toon(user)
```

### Receiving TOON automatically (middleware)

If the middleware is registered and the incoming request has `Content-Type: application/toon`, the body is parsed automatically — `request.all()` and `request.body()` behave exactly as they would for JSON. Invalid TOON payloads are rejected with a `400 Bad Request` instead of reaching your handler.

```ts
router.post('/webhook', async ({ request }) => {
  const payload = request.all() // already parsed
  // ...
})
```

### Parsing TOON explicitly

Useful as a fallback when a client (an LLM agent, a misconfigured webhook) sends TOON without setting the correct `Content-Type` header:

```ts
router.post('/webhook', async ({ request }) => {
  const payload = request.toon()
  // ...
})
```

`request.toon()` reads the raw body directly, regardless of the `Content-Type` header. It returns `null` when there is no body and throws when the body is not valid TOON.

### Serializing Lucid models

`serialize()` unwraps models and collections through `toJSON()` — preloaded relations included — and applies field filtering:

```ts
import { serialize } from '@vite-spirite/toon-adonis'

router.get('/users', async ({ response }) => {
  const users = await User.query().preload('posts')
  return response.toon(serialize(users, { only: ['id', 'name', 'posts'] }))
})
```

`only` keeps top-level attributes (applied per item on arrays), `except` drops them afterwards. Encoding stays at the response layer: pass the result to `encode()` or `response.toon()`.

Prefer a method on the model? Compose the dependency-free `WithToon` mixin:

```ts
import { compose } from '@adonisjs/core/helpers'
import { WithToon } from '@vite-spirite/toon-adonis'

export default class User extends compose(BaseModel, WithToon) {}

// ...
const user = await User.query().preload('posts').firstOrFail()
return response.toon(user.toToon({ except: ['password'] }))
```

## How much does it actually save?

TOON's efficiency depends heavily on data shape. It performs best on **homogeneous tabular arrays** (same keys across objects) and worse on deeply nested or irregular structures.

On a realistic 10-record tabular payload (gas station data — name, brand, prices, coordinates), TOON produced a **30.3% reduction in tokens** and a **48% reduction in raw character count** compared to equivalent JSON (measured with `gpt-tokenizer`).

**JSON** (476 tokens, 1237 chars):
```json
{"stations":[{"id":1,"name":"Total Villeneuve-d'Ascq","brand":"Total","price_gazole":1.789,"price_sp95":1.859,"lat":50.6293,"lng":3.1345}, ...]}
```

**TOON** (332 tokens, 643 chars):
```
stations[10]{id,name,brand,price_gazole,price_sp95,lat,lng}:
  1,Total Villeneuve-d'Ascq,Total,1.789,1.859,50.6293,3.1345
  2,Leclerc Lille,Leclerc,1.699,1.769,50.6365,3.0635
  ...
```

The gain grows with the number of records (the header `{id,name,brand,...}` is written once, not repeated per row) and shrinks on nested or heterogeneous data.

## API

| Method | Description |
|---|---|
| `response.toon(data, options?)` | Encodes `data` to TOON and sends it with the correct `Content-Type`. Chains after `response.status(code)`. |
| `request.wantsToon()` | Returns `true` when the client's `Accept` header includes `application/toon`. |
| `request.toon(options?)` | Reads the raw request body and decodes it as TOON. Returns `null` if there's no body, throws on invalid TOON. |
| `encode(data, options?)` | Standalone encode function, exported from the package root. |
| `decode<T>(payload, options?)` | Standalone decode function, exported from the package root. |
| `serialize(data, options?)` | Unwraps models/collections via `toJSON()` (preloaded relations included), applies `only`/`except` filtering and returns TOON-ready plain data. |
| `WithToon` | Dependency-free mixin adding a `toToon(options?)` method to Lucid models. |

## Releasing

Releases are fully automated:

1. Bump the version locally with `npm run release` (changelog, commit, tag and GitHub release via release-it — it does not publish to npm).
2. Push the tag (`git push --follow-tags`) — the `release` workflow runs all checks, builds the package, publishes it to npm (with provenance) and creates the GitHub release if one is missing.

## Credits

Built on top of [@toon-format/toon](https://www.npmjs.com/package/@toon-format/toon) by [johannschopplich](https://github.com/johannschopplich).

## License

MIT