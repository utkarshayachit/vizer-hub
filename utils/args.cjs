const { Command } = require('commander')

const program = new Command()
program.name('vizer-hub')
  .description('vizer-hub: landing page for vizer on Azure Batch')
  .version('1.0.0')

program
  .option('-p,--port <number>', 'webserver port number', 8000)
  .option('-i,--managed-identity-client-id <id>', 'user managed identity client id')

// storage account specific options
  .requiredOption('-s,--storage-account <name>', 'storage account name')
  .requiredOption('-c,--storage-container <name>', 'storage container name', 'datasets')
  .option('-k,--storage-account-key <key>', 'storage account key for Shared Key authentication')
  .option('-x,--storage-connection-string <string>', 'storage account connection string')
  .option('-t,--storage-sas-token <token>', 'storage account SAS token ot use SAS authentication')

// batch account specific options
  .requiredOption('-b,--batch-endpoint <url>', 'batch account endpoint (required)')
  .option('-e,--batch-account-key <key>', 'batch account access key for Shared Key authentication')
  .requiredOption('-n,--batch-pool-id <id>', 'batch account pool id', 'linux')
  .option('-r,--batch-mount-path <path>', 'batch account mount relative path, if not specified storage container name will be used')

// container app specific options
  .requiredOption('-a,--container-image <name>', 'container app image name', 'docker.io/utkarshayachit/vizer:osmesa')

// .requiredOption('-s,--blob-storage-endpoint <url>', 'blob storage account endpoint (required)')
// .requiredOption('-c,--container-registry <url>', 'container registry login server (required)')

/**
 * Parses command line arguments
 * @returns parsed command line options
 */
function parse () {
  program.parse()
  return program.opts()
}

function opts () {
  return program.opts()
}

module.exports.parse = parse
module.exports.opts = opts
