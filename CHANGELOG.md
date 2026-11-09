# Changelog

## Unreleased (0.3.0)

- Add `serialize()` and the dependency-free `WithToon` mixin for Lucid models: unwrap via `toJSON()`, preloaded relations included, field filtering with `only`/`except`
- Add `request.wantsToon()` for `Accept: application/toon` content negotiation (exact media-type match, honors `q=0` refusals)
- Document `response.status(code).toon(...)` chaining
- **Breaking (pre-1.0):** remove the `stubsRoot` export and the `stubs/` directory (empty scaffolding, unused by the configure hook); drop the `copy:templates` script and the `copyfiles` dev dependency
- Tests: end-to-end coverage through the real bodyparser, configure hook tests, serializer tests
- CI: weekly Dependabot updates, `npm pack --dry-run` check on the build job

## 0.2.0

- Fix `response.toon()` which set the header but never sent the body (now `send()`s with `charset=utf-8`)
- Middleware and `request.toon()`: invalid TOON payloads are rejected with `400` instead of crashing; empty bodies return `null`
- Populate the previously empty `src/types.ts` (re-exports `EncodeOptions`/`DecodeOptions`)
- Package metadata: description, keywords, repository, bugs, author
- CI/CD: checks run on every push, automatic npm publish (with provenance) on `v*` tags

## 0.1.0

- Initial release: `encode`/`decode` wrappers, `response.toon` and `request.toon` macros, TOON body-parser middleware, `configure` hook
