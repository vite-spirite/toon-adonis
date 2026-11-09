import { test } from '@japa/runner'
import { ResponseFactory } from '@adonisjs/http-server/factories'
import { decode, encode } from '../src/toon_encoder.ts'
import { WithToon, serialize } from '../src/toon_serializer.ts'
import { bootToonForTests } from './helpers.ts'

bootToonForTests()

class Post {
  constructor(
    public id: number,
    public title: string,
    public userId: number
  ) {}

  toJSON() {
    return { id: this.id, title: this.title, userId: this.userId }
  }
}

class User {
  constructor(
    public id: number,
    public name: string,
    public password: string,
    public posts: Post[] = []
  ) {}

  toJSON() {
    return { id: this.id, name: this.name, password: this.password, posts: this.posts }
  }
}

function users() {
  return [
    new User(1, 'Alice', 'secret-1', [new Post(1, 'Hello', 1)]),
    new User(2, 'Bob', 'secret-2', [new Post(2, 'World', 2)]),
  ]
}

test.group('Toon serializer', () => {
  test('serialize unwraps models through toJSON into plain data', ({ assert }) => {
    assert.deepEqual(serialize(users()[0]), {
      id: 1,
      name: 'Alice',
      password: 'secret-1',
      posts: [{ id: 1, title: 'Hello', userId: 1 }],
    })
  })

  test('serialize output round-trips through encode', ({ assert }) => {
    assert.deepEqual(decode(encode(serialize(users()))), [
      {
        id: 1,
        name: 'Alice',
        password: 'secret-1',
        posts: [{ id: 1, title: 'Hello', userId: 1 }],
      },
      {
        id: 2,
        name: 'Bob',
        password: 'secret-2',
        posts: [{ id: 2, title: 'World', userId: 2 }],
      },
    ])
  })

  test('serialize applies only per item on arrays', ({ assert }) => {
    assert.deepEqual(serialize(users(), { only: ['id', 'name'] }), [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ])
  })

  test('serialize applies except after only', ({ assert }) => {
    const plain = serialize(users()[0], { except: ['password'] }) as Record<string, unknown>

    assert.notProperty(plain, 'password')
    assert.strictEqual(plain.id, 1)
  })

  test('serialize passes plain objects through', ({ assert }) => {
    assert.deepEqual(serialize({ a: 1, b: 2 }, { only: ['a'] }), { a: 1 })
  })

  test('WithToon adds a toToon method to models', ({ assert }) => {
    class Admin extends WithToon(User) {}

    const admin = new Admin(3, 'Root', 'secret-3')

    assert.deepEqual(admin.toToon({ except: ['password'] }), { id: 3, name: 'Root', posts: [] })
  })

  test('preloaded relations survive nested', ({ assert }) => {
    assert.deepEqual(serialize(users()[0], { only: ['name', 'posts'] }), {
      name: 'Alice',
      posts: [{ id: 1, title: 'Hello', userId: 1 }],
    })
  })

  test('serialize throws on cyclic structures', ({ assert }) => {
    const cyclic: Record<string, unknown> = { id: 1 }
    cyclic.self = cyclic

    assert.throws(() => serialize(cyclic), 'Cannot serialize a cyclic structure to TOON')
  })

  test('serialize tolerates shared references without cycles', ({ assert }) => {
    const shared = new Post(1, 'Hello', 1)
    const plain = serialize({ a: shared, b: shared }) as {
      a: Record<string, unknown>
      b: Record<string, unknown>
    }

    assert.deepEqual(plain.a, { id: 1, title: 'Hello', userId: 1 })
    assert.deepEqual(plain.b, { id: 1, title: 'Hello', userId: 1 })
  })

  test('response.toon sends serialize output as TOON, not double-encoded', ({ assert }) => {
    const response = new ResponseFactory().create()

    let sent: unknown
    response.send = (body: unknown) => {
      sent = body
    }

    response.toon(serialize(users(), { only: ['id', 'name'] }))

    assert.strictEqual(response.getHeader('Content-Type'), 'application/toon; charset=utf-8')
    assert.deepEqual(decode(sent as string), [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ])
  })
})
