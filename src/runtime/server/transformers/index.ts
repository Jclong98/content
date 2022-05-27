import { extname } from 'pathe'
import type { ParsedContent, ContentTransformer } from '../../types'
import { getParser, getTransformers } from '#content/virtual/transformers'
import { useNitroApp } from '#imports'
/**
 * Parse content file using registered plugins
 */
export async function parseContent (id: string, content: string) {
  const nitroApp = useNitroApp()

  // Call hook before parsing the file
  const file = { id, content }
  await nitroApp.hooks.callHook('content:file:beforeParse', file)

  const ext = extname(id)
  const plugin: ContentTransformer = getParser(ext)
  if (!plugin) {
    // eslint-disable-next-line no-console
    console.warn(`${ext} files are not supported, "${id}" falling back to raw content`)
    return {
      _id: id,
      body: content
    }
  }

  const parsed: ParsedContent = await plugin.parse!(id, content)

  const transformers = getTransformers(ext)
  const result = await transformers.reduce(async (prev, cur) => {
    const next = (await prev) || parsed

    return cur.transform!(next)
  }, Promise.resolve(parsed))

  // Call hook after parsing the file
  await nitroApp.hooks.callHook('content:file:afterParse', result)

  return result
}
