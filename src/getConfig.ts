import fs from 'fs'
import path from 'path'

export type Config = {
  type: 'nextjs' | 'nuxtjs' | 'sapper'
  input: string
  staticDir?: string
  output: string
  trailingSlash?: boolean
  basepath?: string
}

const getFrameworkType = (dir: string) => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
  const deps = Object.assign(packageJson.devDependencies ?? {}, packageJson.dependencies ?? {})

  return deps.sapper ? 'sapper' : deps.nuxt ? 'nuxtjs' : 'nextjs'
}

export default async (enableStatic: boolean, dir = process.cwd()): Promise<Config> => {
  const type = getFrameworkType(dir)

  if (type === 'nextjs') {
    const config = await (
      await import('next/dist/next-server/server/config')
    ).default(require('next/constants').PHASE_PRODUCTION_BUILD, dir)
    const srcDir = fs.existsSync(path.posix.join(dir, 'pages')) ? dir : path.posix.join(dir, 'src')
    const utilsPath = path.join(srcDir, 'utils')
    const output = fs.existsSync(utilsPath) ? utilsPath : path.join(srcDir, 'lib')

    if (!fs.existsSync(output)) fs.mkdirSync(output)

    return {
      type,
      input: path.posix.join(srcDir, 'pages'),
      staticDir: enableStatic ? path.posix.join(dir, 'public') : undefined,
      output,
      basepath: config.basePath
    }
  } else if (type === 'nuxtjs') {
    const nuxttsPath = path.join(dir, 'nuxt.config.ts')
    const config = await (
      await import('@nuxt/config')
    ).loadNuxtConfig({
      rootDir: dir,
      configFile: fs.existsSync(nuxttsPath) ? nuxttsPath : undefined
    })
    const srcDir = path.posix.join(dir, config.srcDir ?? '')

    return {
      type,
      input: path.posix.join(srcDir, 'pages'),
      staticDir: enableStatic ? path.posix.join(srcDir, 'static') : undefined,
      output: path.posix.join(srcDir, 'plugins'),
      trailingSlash: config.router?.trailingSlash,
      basepath: config.router?.base
    }
  } else {
    const srcDir = path.posix.join(dir, 'src')

    return {
      type,
      input: path.posix.join(srcDir, 'routes'),
      staticDir: enableStatic ? path.posix.join(dir, 'static') : undefined,
      output: path.join(srcDir, 'node_modules')
    }
  }
}
