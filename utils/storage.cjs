const { BlobServiceClient, StorageSharedKeyCredential }  = require('@azure/storage-blob')
const { DefaultAzureCredential } = require('@azure/identity')
const args = require('./args.cjs')

function getBlobServiceClient(opts) {
    const endpoint = `https://${opts.storageAccount}.blob.core.windows.net`
    if (opts.storageAccountKey) {
        const sharedKeyCredential = new StorageSharedKeyCredential(opts.storageAccount, opts.storageAccountKey)
        return new BlobServiceClient(endpoint, sharedKeyCredential);
    } else if (opts.storageConnectionString) {
        return new BlobServiceClient.fromConnectionString(opts.storageConnectionString)
    } else if (opts.storageSasToken) {
        return new BlobServiceClient(`${endpoint}${opts.storageSasToken}`)
    } else {
        // uses either MI or CLI credentials (NOTE:CLI credentials doesn't seem to work right now)
        const credentials = new DefaultAzureCredential(opts.managedIdentityClientId ? 
            { managedIdentityClientId: opts.managedIdentityClientId } : {});
        return new BlobServiceClient(endpoint, credentials);
    }
}

/// fetch datasets from storage account
async function list(opts) {
    opts = opts || args.opts()
    const blobServiceClient = getBlobServiceClient(opts)
    console.log(`fetching datasets from ${opts.storageContainer}`)
    let result = []
    const containerClient = blobServiceClient.getContainerClient(opts.storageContainer)
    for await (const blob of containerClient.listBlobsFlat()) {
        result.push({
            name: blob.name,
            container: opts.storageContainer
        })
    }
    return result
}

module.exports.list = list
