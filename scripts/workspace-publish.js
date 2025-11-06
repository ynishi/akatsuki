#!/usr/bin/env node
/**
 * workspace/ から docs/ へ設計メモ等を移動するユーティリティ
 *
 * 使い方:
 *   npm run workspace:publish -- --file workspace/my-note.md
 *   npm run workspace:publish -- --file workspace/tmp.md --out design/my-note.md
 *
 * オプション:
 *   --file, -f  : 移動対象のファイル (必須)
 *   --out,  -o  : docs/ 以下の出力パス (省略時は元ファイル名)
 *   --force     : 既存ファイルを上書き
 */

import fs from 'fs'
import path from 'path'

const args = process.argv.slice(2)

function parseArgs(argv) {
  const result = {
    file: null,
    out: null,
    force: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    switch (arg) {
      case '--file':
      case '-f':
        result.file = argv[i + 1]
        i += 1
        break
      case '--out':
      case '-o':
        result.out = argv[i + 1]
        i += 1
        break
      case '--force':
        result.force = true
        break
      default:
        if (!result.file) {
          result.file = arg
        }
        break
    }
  }

  return result
}

function ensureWorkspacePath(sourcePath, workspaceRoot) {
  const normalisedSource = path.normalize(sourcePath)
  if (!normalisedSource.startsWith(workspaceRoot + path.sep)) {
    throw new Error(`指定したファイルは workspace/ 配下ではありません: ${sourcePath}`)
  }
}

function main() {
  const { file, out, force } = parseArgs(args)

  if (!file) {
    console.error('エラー: --file で移動したいファイルを指定してください。')
    process.exit(1)
  }

  const repoRoot = process.cwd()
  const workspaceRoot = path.join(repoRoot, 'workspace')
  const docsRoot = path.join(repoRoot, 'docs')

  const sourcePath = path.resolve(repoRoot, file)

  if (!fs.existsSync(sourcePath)) {
    console.error(`エラー: ファイルが見つかりません: ${sourcePath}`)
    process.exit(1)
  }

  ensureWorkspacePath(sourcePath, workspaceRoot)

  const outputPathRelative = out || path.basename(sourcePath)
  const destinationPath = path.resolve(docsRoot, outputPathRelative)
  const destinationDir = path.dirname(destinationPath)

  if (fs.existsSync(destinationPath)) {
    if (!force) {
      console.error(`エラー: 既にファイルが存在します (${destinationPath})。--force を指定すると上書きできます。`)
      process.exit(1)
    }
    fs.rmSync(destinationPath, { force: true })
  }

  fs.mkdirSync(destinationDir, { recursive: true })
  fs.renameSync(sourcePath, destinationPath)

  console.log(`✔ workspace から docs へ移動しました: ${path.relative(repoRoot, destinationPath)}`)
}

try {
  main()
} catch (error) {
    console.error(`エラー: ${error.message}`)
    process.exit(1)
}
