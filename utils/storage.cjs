const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob')
const { DefaultAzureCredential } = require('@azure/identity')
const args = require('./args.cjs')

function getBlobServiceClient (opts) {
  const endpoint = `https://${opts.storageAccount}.blob.core.windows.net`
  if (opts.storageAccountKey) {
    console.log(`using storage account key for ${opts.storageAccount}`)
    const sharedKeyCredential = new StorageSharedKeyCredential(opts.storageAccount, opts.storageAccountKey)
    return new BlobServiceClient(endpoint, sharedKeyCredential)
  } else if (opts.storageConnectionString) {
    console.log(`using storage connection string for ${opts.storageAccount}`)
    return new BlobServiceClient.fromConnectionString(opts.storageConnectionString) // eslint-disable-line new-cap
  } else if (opts.storageSasToken) {
    // since SAS token may or may not include '?' or '/?' prefix, we need to handle all cases
    const suffix = opts.storageSasToken.startsWith('?') ? `${opts.storageSasToken}` : `?${opts.storageSasToken}`
    console.log(`using storage SAS token for ${opts.storageAccount}`)
    return new BlobServiceClient(`${endpoint}${suffix}`)
  } else {
    // uses either MI or CLI credentials (NOTE:CLI credentials doesn't seem to work right now)
    const credentials = new DefaultAzureCredential(opts.managedIdentityClientId
      ? { managedIdentityClientId: opts.managedIdentityClientId }
      : {})
    console.log(`using managed identity for ${opts.storageAccount}`)
    return new BlobServiceClient(endpoint, credentials)
  }
}

/// fetch datasets from storage account
async function listBlob (opts) {
  opts = opts || args.opts()
  const blobServiceClient = getBlobServiceClient(opts)
  console.log(`fetching datasets from ${opts.storageContainer}`)
  const result = []
  const containerClient = blobServiceClient.getContainerClient(opts.storageContainer)
  for await (const blob of containerClient.listBlobsFlat()) {
    result.push({
      name: blob.name,
      container: opts.storageContainer
    })
  }
  return result
}

async function listLocal (opts) {
  opts = opts || args.opts()
  const fs = require('fs')
  const path = require('path')
  const result = []
  const files = fs.readdirSync(opts.storagePath)
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    const p = path.join(opts.storagePath, f)
    if (!fs.statSync(p).isDirectory()) {
      result.push({
        name: f,
        container: opts.storagePath
      })
    }
  }
  return result
}

async function list (opts) {
  opts = opts || args.opts()
  if (opts.storagePath) {
    return listLocal(opts)
  }
  else {
    return listBlob(opts)
  }
}

module.exports.list = list
