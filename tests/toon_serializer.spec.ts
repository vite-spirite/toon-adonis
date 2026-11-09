import { test } from '@japa/runner'
import { decode } from '../src/toon_encoder.ts'
import { WithToon, serialize } from '../src/toon_serializer.ts'

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
  test('serialize unwraps models through toJSON', ({ assert }) => {
    assert.deepEqual(decode(serialize(users()[0])), {
      id: 1,
      name: 'Alice',
      password: 'secret-1',
      posts: [{ id: 1, title: 'Hello', userId: 1 }],
    })
  })

  test('serialize applies only per item on arrays', ({ assert }) => {
    const decoded = decode<{ id: number; name: string }[]>(
      serialize(users(), { only: ['id', 'name'] })
    )

    assert.deepEqual(decoded, [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ])
  })

  test('serialize applies except after only', ({ assert }) => {
    const decoded = decode<{ id: number }>(serialize(users()[0], { except: ['password'] }))

    assert.notProperty(decoded, 'password')
    assert.strictEqual(decoded.id, 1)
  })

  test('serialize passes plain objects through', ({ assert }) => {
    assert.deepEqual(decode(serialize({ a: 1, b: 2 }, { only: ['a'] })), { a: 1 })
  })

  test('WithToon adds a toToon method to models', ({ assert }) => {
    class Admin extends WithToon(User) {}

    const admin = new Admin(3, 'Root', 'secret-3')
    const decoded = decode<{ id: number; name: string }>(admin.toToon({ except: ['password'] }))

    assert.deepEqual(decoded, { id: 3, name: 'Root', posts: [] })
  })

  test('preloaded relations survive nested', ({ assert }) => {
    const decoded = decode<{ posts: { title: string }[] }>(
      serialize(users()[0], { only: ['name', 'posts'] })
    )

    assert.deepEqual(decoded, { name: 'Alice', posts: [{ id: 1, title: 'Hello', userId: 1 }] })
  })
})
