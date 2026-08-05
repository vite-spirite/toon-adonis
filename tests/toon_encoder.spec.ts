import { test } from '@japa/runner'
import { encode, decode } from '../src/toon_encoder.ts'

test.group('Toon encoder', () => {
  test('encodes a simple homogeneous array', ({ assert }) => {
    const data = {
      users: [
        { id: 1, name: 'Alice', role: 'admin' },
        { id: 2, name: 'Bob', role: 'user' },
      ],
    }

    const result = encode(data)

    assert.include(result, 'users[2]{id,name,role}:')
    assert.include(result, '1,Alice,admin')
    assert.include(result, '2,Bob,user')
  })

  test('decode returns an equivalent object after encode', ({ assert }) => {
    const original = {
      users: [
        { id: 1, name: 'Alice', role: 'admin' },
        { id: 2, name: 'Bob', role: 'user' },
      ],
    }

    const encoded = encode(original)
    const decoded = decode(encoded)

    assert.deepEqual(decoded, original)
  })

  test('handles an empty object', ({ assert }) => {
    const encoded = encode({})
    const decoded = decode(encoded)

    assert.deepEqual(decoded, {})
  })

  test('handles an empty array', ({ assert }) => {
    const encoded = encode({ items: [] })
    const decoded = decode(encoded)

    assert.deepEqual(decoded, { items: [] })
  })

  test('handles null values', ({ assert }) => {
    const original = { name: 'Alice', middleName: null }

    const encoded = encode(original)
    const decoded = decode(encoded)

    assert.deepEqual(decoded, original)
  })

  test('handles a heterogeneous array (objects with different keys)', ({ assert }) => {
    const original = {
      items: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob', extra: 'foo' },
      ],
    }

    const encoded = encode(original)
    const decoded = decode(encoded)

    assert.deepEqual(decoded, original)
  })

  test('handles a deeply nested object', ({ assert }) => {
    const original = {
      user: {
        name: 'Alice',
        address: {
          city: 'Lille',
          coords: { lat: 50.6, lng: 3.05 },
        },
      },
    }

    const encoded = encode(original)
    const decoded = decode(encoded)

    assert.deepEqual(decoded, original)
  })

  test('respects options passed to encode', ({ assert }) => {
    const data = { name: 'Alice' }

    const result = encode(data, { indent: 4 })

    assert.isString(result)
  })

  test('decode throws on an array with an inconsistent count', ({ assert }) => {
    const malformed = 'users[3]{id,name}:\n  1,Alice\n  2,Bob'
    assert.throws(() => decode(malformed))
  })
})
