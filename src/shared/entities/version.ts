import type { LibraryInfo, ResolvedVersion, Version } from '@xmcl/core'
import { parseVersion, VersionRange } from '../util/mavenVersion'
import { RuntimeVersions } from './instance.schema'
import { requireNonnull } from '/@shared/util/assert'

export type Status = 'remote' | 'local' | 'loading';
export interface PartialVersionResolver {
  (version: Version): string
}

export const resolveForgeVersion: PartialVersionResolver = (v) => filterForgeVersion(v.libraries.find(l => l.name.startsWith('net.minecraftforge:forge:'))
  ?.name.split(':')[2]?.split('-')?.[1] || '')

export const resolveLiteloaderVersion: PartialVersionResolver = (v) => v.libraries.find(l => l.name.startsWith('com.mumfrey:liteloader:'))
  ?.name.split(':')[2] || ''

export const resolveFabricLoaderVersion: PartialVersionResolver = (v) => v.libraries.find(l => l.name.startsWith('net.fabricmc:fabric-loader:'))
  ?.name.split(':')[2] || ''

export const resolveFabricYarnVersion: PartialVersionResolver = (v) => v.libraries.find(l => l.name.startsWith('net.fabricmc:yarn:'))
  ?.name.split(':')[2] || ''

export const resolveMinecraftVersion: PartialVersionResolver = (v) => (v.inheritsFrom ? '' : v.id)

export function isForgeLibrary(lib: LibraryInfo) {
  return lib.groupId === 'net.minecraftforge' && lib.artifactId === 'forge'
}

export function isFabricLoaderLibrary(lib: LibraryInfo) {
  return lib.groupId === 'net.fabricmc' && lib.artifactId === 'fabric-loader'
}
export function isOptifineLibrary(lib: LibraryInfo) {
  return lib.groupId === 'optifine' && lib.artifactId === 'Optifine'
}

export function filterForgeVersion(forgeVersion: string) {
  if (!forgeVersion) return forgeVersion
  const idx = forgeVersion.indexOf('-')
  return forgeVersion.substring(idx + 1)
}
export function filterOptfineVersion(optifineVersion: string) {
  if (!optifineVersion) return optifineVersion
  const idx = optifineVersion.indexOf('_')
  return optifineVersion.substring(idx + 1)
}

export const EMPTY_VERSION: ResolvedVersion = Object.freeze({
  minecraftVersion: '',
  minimumLauncherVersion: 0,
  id: '',
  libraries: [],
  mainClass: '',
  minecraftDirectory: '',
  arguments: { game: [], jvm: [] },
  assetIndex: { totalSize: 0, sha1: '', url: '', size: 0, id: '' },
  assets: '',
  downloads: { client: { sha1: '', url: '', size: 0 }, server: { sha1: '', url: '', size: 0 } },
  releaseTime: '',
  time: '',
  type: '',
  pathChain: [],
  inheritances: []
})
export interface LibrariesRecord {
  org: string;
  name: string;
  version: string;
}

export function resolveRuntimeVersion(partialVersion: Version, runtime: RuntimeVersions) {
  const minecraft = resolveMinecraftVersion(partialVersion)
  const forge = resolveForgeVersion(partialVersion)
  const liteloader = resolveLiteloaderVersion(partialVersion)
  const fabricLoader = resolveFabricLoaderVersion(partialVersion)
  const yarn = resolveFabricYarnVersion(partialVersion)

  runtime.minecraft = runtime.minecraft || minecraft
  runtime.forge = forge || runtime.forge
  runtime.liteloader = liteloader || runtime.liteloader
  runtime.fabricLoader = fabricLoader || runtime.fabricLoader
  runtime.yarn = yarn || runtime.yarn
}

export function isCompatible(range: string, version: string) {
  if (range === '[*]') return true
  const vRange = VersionRange.createFromVersionSpec(range)
  requireNonnull(vRange)
  return vRange.containsVersion(parseVersion(version))
}

export function getExpectVersion({ minecraft, forge, liteloader, fabricLoader: fabric, optifine }: RuntimeVersions) {
  let expectedId = minecraft
  if (typeof forge === 'string' && forge.length > 0) expectedId += `-forge${forge}`
  if (typeof liteloader === 'string' && liteloader.length > 0) expectedId += `-liteloader${liteloader}`
  if (typeof fabric === 'string' && fabric.length > 0) expectedId += `-fabric${fabric}`
  if (typeof optifine === 'string' && optifine.length > 0) expectedId += `-optifine_${optifine}`
  return expectedId
}
export function parseOptifineVersion(version: string): { type: string; patch: string } {
  const index = version.lastIndexOf('_')
  const type = version.substring(0, index)
  const patch = version.substr(index + 1)
  return { type, patch }
}

export function isReleaseVersion(version: string) {
  return version.match(/^[0-9]+\.[0-9]+(\.[0-9]+)?$/g)
}
export function isSnapshotPreview(version: string) {
  return version.match(/^[0-9]+\.[0-9]+((\.[0-9])?-pre[0-9]+)?$/g) ||
    version.match(/^[0-9]+\.[0-9]+(\.[0-9])? Pre-Release [0-9]+$/g) ||
    version.match(/^[0-9]+w[0-9]+[abcd]$/)
}
export function isBetaVersion(version: string) {
  return version.match(/^b[0-9]+\.[0-9]+(\.[0-9])?(_[0-9]+)?$/g)
}
export function isAlphaVersion(version: string) {
  return version.match(/^a[0-9]+\.[0-9]+(\.[0-9])?(_[0-9]+)?$/g)
}
export function isSameForgeVersion(forgeVersion: string, version: string) {
  const i = version.indexOf('-')
  if (i === -1) {
    return forgeVersion === version
  }
  return forgeVersion === version.substring(i + 1)
}
export function isSameOptifineVersion(optifineVersion: string, version: string) {
  const i = version.indexOf('-')
  if (i === -1) {
    return optifineVersion === version
  }
  return optifineVersion === version.substring(i + 1)
}

export function isVersionMatched(version: ResolvedVersion, runtime: RuntimeVersions) {
  // compute version
  if (version.minecraftVersion !== runtime.minecraft) {
    return false
  }
  let lib = version.libraries.find(isForgeLibrary)
  if (runtime.forge && !isSameForgeVersion(runtime.forge, lib?.version ?? '')) {
    // require forge but not forge
    return false
  }
  lib = version.libraries.find(isFabricLoaderLibrary)
  if (runtime.fabricLoader && lib?.version !== runtime.fabricLoader) {
    return false
  }
  lib = version.libraries.find(isOptifineLibrary)
  if (runtime.optifine && isSameOptifineVersion(runtime.optifine, lib?.version ?? '')) {
    return false
  }

  return true
}

export function getResolvedVersion(versions: ResolvedVersion[], runtime: RuntimeVersions, id: string): ResolvedVersion {
  let localVersion: ResolvedVersion | undefined

  localVersion = versions.find(v => v.id === id)
  if (localVersion) {
    return localVersion
  }

  localVersion = versions.find(ver => isVersionMatched(ver, runtime))
  if (localVersion) {
    return localVersion
  }

  return EMPTY_VERSION
}

export function getMinecraftVersionFormat(version: string): 'release' | 'snapshot' | 'beta' | 'alpha' | 'unknown' {
  return isReleaseVersion(version) ? 'release'
    : isSnapshotPreview(version) ? 'snapshot'
      : isBetaVersion(version) ? 'beta'
        : isAlphaVersion(version) ? 'alpha'
          : 'unknown'
}

export function compareRelease(versionA: string, versionB: string): number {
  const [major, minor, patch] = versionA.split('.').map(s => Number.parseInt(s, 10))
  const [majorB, minorB, patchB] = versionB.split('.').map(s => Number.parseInt(s, 10))
  if (major === majorB) {
    if (minor === minorB) {
      if (patch === patchB) {
        return 0
      }
      return patch - patchB
    }
    return minor - minorB
  }
  return major - majorB
}

export function compareSnapshot(versionA: string, versionB: string) {
  const [majorA, restA] = versionA.split('w')
  const [majorB, restB] = versionB.split('w')

  if (majorA === majorB) {
    const minorA = Number.parseInt(restA.slice(0, 2), 10)
    const minorB = Number.parseInt(restB.slice(0, 2), 10)
    if (minorA === minorB) {
      const codeA = restA.slice(2, 3)
      const codeB = restA.slice(2, 3)
      return codeA.localeCompare(codeB)
    }
    return minorA - minorB
  }
  return Number.parseInt(majorA, 10) - Number.parseInt(majorB, 10)
}

export const LATEST_RELEASE = {
  id: '1.16.2',
  type: 'release',
  url: 'https://launchermeta.mojang.com/v1/packages/c847788ace47090745ba174a13eff17a95221c81/1.16.2.json',
  time: '2020-08-24T14:58:49+00:00',
  releaseTime: '2020-08-11T10:13:46+00:00'
}
