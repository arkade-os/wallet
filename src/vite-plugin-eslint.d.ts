declare module 'vite-plugin-eslint' {
  import type { PluginOption } from 'vite'

  export interface VitePluginESLintOptions {
    include?: string | string[]
    exclude?: string | string[]
    cache?: boolean
    [key: string]: unknown
  }

  export default function eslint(options?: VitePluginESLintOptions): PluginOption
}
