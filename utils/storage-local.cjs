const args = require('./args.cjs')

async function list (opts) {
  opts = opts || args.opts()
  const fs = require('fs')
  const path = require('path')
  const result = []
  const files = fs.readdirSync(opts.storagePath)
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    const p = path.join(opts.storagePath, f)
    if (!fs.statSync(p).isDirectory()) {
      result.push({ name: f, container: opts.storagePath })
    }
  }
  return result
}

module.exports.list = list
