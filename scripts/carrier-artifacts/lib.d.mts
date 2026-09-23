export interface CarrierArtifact {
  readonly file: string
  readonly package: string
  readonly version: string
  readonly license: string
  readonly licenseFrom: string
  readonly sha256: string
  readonly bytes: number
  readonly source: { readonly repository: string; readonly commit: string; readonly directory: string }
  readonly toolchain: {
    readonly node: string
    readonly pnpm: string
    readonly declaredPackageManager: string
    readonly command: string
    readonly platform: string
  }
}

export interface CarrierManifest {
  readonly note: string
  readonly packedAtUtc: string
  readonly artifacts: readonly CarrierArtifact[]
}

export interface PinnedSource {
  readonly repository: string
  readonly commit: string
  readonly directory: string
}

export declare const VENDOR_DIR: string
export declare const MANIFEST_PATH: string
export declare const PINNED_SOURCES: Readonly<Record<string, PinnedSource>>
export declare const PINNED_PACKAGES: readonly string[]
export declare const DIRECT_DEPENDENCIES: readonly string[]
export declare const pinnedSourceMismatch: (artifact: unknown) => string | undefined
export declare const CANDIDATE_SWAP_SYMBOL: string
export declare const CANDIDATE_SDK_SYMBOL: string
export declare const sha256: (bytes: Uint8Array) => string
export declare const readTarMember: (archivePath: string, member: string) => string | undefined
export declare const archiveManifest: (archivePath: string) => Record<string, unknown>
export declare const readJson: (path: string) => Record<string, unknown>
export declare const fileSpec: (from: string, filename: string) => string
export declare const readFlatMapping: (yaml: string, key: string) => Record<string, string> | undefined
export declare const isComment: (line: string) => boolean
export declare const BOOTSTRAP: string
export declare const ENVIRONMENT: string
export declare const OPT_OUT: string
export declare const EXEMPT_INSTALLS: number
export declare const isOptOut: (line: string | undefined) => boolean
export declare const dockerfileStages: (lines: readonly string[]) => Map<string, string[]>
export declare const invokesVerify: (line: string) => boolean
export declare const guardedLines: (lines: readonly string[]) => Set<number>
export declare const logicalLines: (
  lines: readonly string[],
) => { readonly text: string; readonly at: number; readonly span: readonly number[] }[]
export declare const unprovenDefaultShell: (yaml: string) => boolean
export declare const heredocBodies: (lines: readonly string[]) => Set<number>
export declare const installsDependencies: (line: string) => boolean
export declare const unverifiedInstall: (lines: readonly string[]) => number | undefined
export declare const workflowJobs: (yaml: string) => Map<string, string[]>
export declare const packageRootFrom: (fromFile: string, name: string) => string
export declare const assertCandidateExport: (packageRoot: string, name: string, symbol: string) => Promise<string>
