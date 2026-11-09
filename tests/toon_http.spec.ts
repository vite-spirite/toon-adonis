import { test } from '@japa/runner'
import type { HttpContext } from '@adonisjs/core/http'
import { RequestFactory, ResponseFactory } from '@adonisjs/http-server/factories'
import ToonMiddleware from '../src/toon_middleware.ts'
import { encode } from '../src/toon_encoder.ts'
import { bootToonForTests } from './helpers.ts'

bootToonForTests()

test.group('Toon provider', () => {
  test('response.toon sends encoded TOON with the correct content type', ({ assert }) => {
    const response = new ResponseFactory().create()

    let sent: unknown
    response.send = (body: unknown) => {
      sent = body
    }

    const data = { users: [{ id: 1, name: 'Alice' }] }
    response.toon(data)

    assert.strictEqual(response.getHeader('Content-Type'), 'application/toon; charset=utf-8')
    assert.strictEqual(sent, encode(data))
  })

  test('request.toon decodes the raw body', ({ assert }) => {
    const request = new RequestFactory().merge({ url: '/webhook', method: 'POST' }).create()
    const payload = encode({ name: 'Alice' })
    request.raw = () => payload

    assert.deepEqual(request.toon(), { name: 'Alice' })
  })

  test('request.toon returns null when there is no body', ({ assert }) => {
    const request = new RequestFactory().merge({ url: '/webhook', method: 'POST' }).create()
    request.raw = () => null

    assert.isNull(request.toon())
  })

  test('request.toon throws on invalid TOON', ({ assert }) => {
    const request = new RequestFactory().merge({ url: '/webhook', method: 'POST' }).create()
    request.raw = () => 'users[3]{id,name}:\n  1,Alice\n  2,Bob'

    assert.throws(() => request.toon())
  })

  test('request.wantsToon reflects the Accept header', ({ assert }) => {
    const request = new RequestFactory().merge({ url: '/users', method: 'GET' }).create()

    request.header = () => 'application/json, application/toon'
    assert.isTrue(request.wantsToon())

    request.header = () => 'application/json'
    assert.isFalse(request.wantsToon())

    request.header = () => 'application/toonx'
    assert.isFalse(request.wantsToon())

    request.header = () => 'application/toon;q=0'
    assert.isFalse(request.wantsToon())

    request.header = () => 'Application/Toon; q=0.5'
    assert.isTrue(request.wantsToon())

    request.header = () => undefined
    assert.isFalse(request.wantsToon())
  })

  test('response.toon can be chained after response.status', ({ assert }) => {
    const response = new ResponseFactory().create()

    let sent: unknown
    response.send = (body: unknown) => {
      sent = body
    }

    const data = { users: [{ id: 1 }] }
    response.status(201).toon(data)

    assert.strictEqual(response.getHeader('Content-Type'), 'application/toon; charset=utf-8')
    assert.strictEqual(sent, encode(data))
  })
})

test.group('Toon middleware', () => {
  test('parses the TOON body and calls next', async ({ assert }) => {
    const request = new RequestFactory().merge({ url: '/webhook', method: 'POST' }).create()
    request.header = () => 'application/toon'
    request.raw = () => encode({ name: 'Alice' })

    const response = new ResponseFactory().create()
    let nextCalled = false

    await new ToonMiddleware().handle({ request, response } as HttpContext, async () => {
      nextCalled = true
    })

    assert.isTrue(nextCalled)
    assert.deepEqual(request.all(), { name: 'Alice' })
  })

  test('ignores requests without the TOON content type', async ({ assert }) => {
    const request = new RequestFactory().merge({ url: '/webhook', method: 'POST' }).create()
    request.header = () => 'application/json'
    request.raw = () => '{"name":"Alice"}'

    const response = new ResponseFactory().create()
    let nextCalled = false

    await new ToonMiddleware().handle({ request, response } as HttpContext, async () => {
      nextCalled = true
    })

    assert.isTrue(nextCalled)
  })

  test('responds with 400 on invalid TOON instead of calling next', async ({ assert }) => {
    const request = new RequestFactory().merge({ url: '/webhook', method: 'POST' }).create()
    request.header = () => 'application/toon'
    request.raw = () => 'users[3]{id,name}:\n  1,Alice\n  2,Bob'

    const response = new ResponseFactory().create()
    let badRequestBody: unknown
    response.badRequest = (body?: unknown) => {
      badRequestBody = body
    }

    let nextCalled = false
    await new ToonMiddleware().handle({ request, response } as HttpContext, async () => {
      nextCalled = true
    })

    assert.isFalse(nextCalled)
    assert.deepEqual(badRequestBody, { error: 'Invalid TOON payload' })
  })

  test('responds with 400 when TOON does not decode to an object', async ({ assert }) => {
    const request = new RequestFactory().merge({ url: '/webhook', method: 'POST' }).create()
    request.header = () => 'application/toon; charset=utf-8'
    request.raw = () => encode(['a', 'b'])

    const response = new ResponseFactory().create()
    let badRequestBody: unknown
    response.badRequest = (body?: unknown) => {
      badRequestBody = body
    }

    let nextCalled = false
    await new ToonMiddleware().handle({ request, response } as HttpContext, async () => {
      nextCalled = true
    })

    assert.isFalse(nextCalled)
    assert.deepEqual(badRequestBody, { error: 'Invalid TOON payload: expected an object' })
  })
})
