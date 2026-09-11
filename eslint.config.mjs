// @ts-check
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

// Run `npx @eslint/config-inspector` to inspect the resolved config interactively
export default createConfigForNuxt({
  features: {
    // Rules for module authors
    tooling: true,
    // Rules for formatting
    stylistic: true,
  },
  dirs: {
    src: [
      './playground',
    ],
  },
})
  .append({
    rules: {
      // `import { X } from 'lettermint'; export { X }` makes every consuming app's
      // Nitro (Rollup) build warn UNUSED_EXTERNAL_IMPORT: an export specifier does
      // not count as a use of the import. `export { X } from` has no import to flag.
      'unicorn/prefer-export-from': 'error',
    },
  })
