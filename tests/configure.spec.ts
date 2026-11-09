import { test } from '@japa/runner'
import type Configure from '@adonisjs/core/commands/configure'
import { configure } from '../configure.ts'

function fakeCommand(confirmMiddleware: boolean) {
  const addedProviders: string[] = []
  const registeredMiddleware: unknown[] = []

  const command = {
    createCodemods: async () => ({
      updateRcFile: async (callback: (rcFile: { addProvider: (path: string) => void }) => void) => {
        callback({
          addProvider: (path: string) => {
            addedProviders.push(path)
          },
        })
      },
      registerMiddleware: async (...args: unknown[]) => {
        registeredMiddleware.push(args)
      },
    }),
    prompt: {
      confirm: async () => confirmMiddleware,
    },
  }

  return { command: command as unknown as Configure, addedProviders, registeredMiddleware }
}

test.group('Configure hook', () => {
  test('registers the provider and the middleware when confirmed', async ({ assert }) => {
    const { command, addedProviders, registeredMiddleware } = fakeCommand(true)

    await configure(command)

    assert.deepEqual(addedProviders, ['@vite-spirite/toon-adonis/toon_provider'])
    assert.strictEqual(registeredMiddleware.length, 1)
  })

  test('registers only the provider when the middleware is declined', async ({ assert }) => {
    const { command, addedProviders, registeredMiddleware } = fakeCommand(false)

    await configure(command)

    assert.deepEqual(addedProviders, ['@vite-spirite/toon-adonis/toon_provider'])
    assert.deepEqual(registeredMiddleware, [])
  })
})
