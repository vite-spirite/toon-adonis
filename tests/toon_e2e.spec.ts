import { test } from '@japa/runner'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import {
  HttpContextFactory,
  RequestFactory,
  ResponseFactory,
} from '@adonisjs/http-server/factories'
import { BodyParserMiddlewareFactory } from '@adonisjs/bodyparser/factories'
import type { HttpContext } from '@adonisjs/core/http'
import ToonMiddleware from '../src/toon_middleware.ts'
import { encode } from '../src/toon_encoder.ts'

/**
 * Builds a real HttpContext backed by a genuine IncomingMessage carrying
 * the given raw bytes, exactly as Node would deliver them to Adonis.
 */
function createContext(payload: string, contentType: string): HttpContext {
  const req = new IncomingMessage(new Socket())
  req.method = 'POST'
  req.url = '/webhook'
  req.headers = {
    'content-type': contentType,
    'content-length': String(Buffer.byteLength(payload)),
  }
  const res = new ServerResponse(req)

  const request = new RequestFactory().merge({ url: '/webhook', method: 'POST', req, res }).create()
  const response = new ResponseFactory().merge({ req, res, request }).create()

  req.push(payload)
  req.push(null)

  return new HttpContextFactory().merge({ request, response }).create()
}

function bodyParser() {
  return new BodyParserMiddlewareFactory().merge({ raw: { types: ['application/toon'] } }).create()
}

test.group('Toon end to end', () => {
  test('real bodyparser raw body flows through the middleware into request.all()', async ({
    assert,
  }) => {
    const data = { users: [{ id: 1, name: 'Alice' }] }
    const ctx = createContext(encode(data), 'application/toon')

    await bodyParser().handle(ctx, async () => {
      await new ToonMiddleware().handle(ctx, async () => {})
    })

    assert.deepEqual(ctx.request.all(), data)
  })

  test('requests without the TOON content type are left untouched', async ({ assert }) => {
    const ctx = createContext(JSON.stringify({ name: 'Alice' }), 'application/json')

    await bodyParser().handle(ctx, async () => {
      await new ToonMiddleware().handle(ctx, async () => {})
    })

    assert.deepEqual(ctx.request.all(), { name: 'Alice' })
  })

  test('malformed TOON over the wire ends in a 400', async ({ assert }) => {
    const ctx = createContext('users[3]{id,name}:\n  1,Alice\n  2,Bob', 'application/toon')

    let status: number | undefined
    ctx.response.status = (code: number) => {
      status = code
      return ctx.response
    }
    ctx.response.send = () => {}

    await bodyParser().handle(ctx, async () => {
      await new ToonMiddleware().handle(ctx, async () => {
        throw new Error('next should not be called')
      })
    })

    assert.strictEqual(status, 400)
  })
})
