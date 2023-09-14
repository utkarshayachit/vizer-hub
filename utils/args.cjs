const { Command } = require('commander')

const program = new Command()
program.name('vizer-hub')
  .description('vizer-hub: landing page for vizer on Azure Batch')
  .version('1.0.0')

program
  .option('-p,--port <number>', 'webserver port number', 8000)
  .option('-i,--managed-identity-client-id <id>', 'user managed identity client id')

// storage account specific options
  .option('-s,--storage-account <name>', 'storage account name')
  .option('-c,--storage-container <name>', 'storage container name', 'datasets')
  .option('-k,--storage-account-key <key>', 'storage account key for Shared Key authentication')
  .option('-x,--storage-connection-string <string>', 'storage account connection string')
  .option('-t,--storage-sas-token <token>', 'storage account SAS token ot use SAS authentication')
  
// location storage options
  .option('-d,--storage-path <path>', 'local directory to use for browsing instead of storage account (env: VZ_STORAGE_PATH)',
    process.env.VZ_STORAGE_PATH)

// batch account specific options
  .option('-b,--batch-endpoint <url>', 'batch account endpoint')
  .option('-e,--batch-account-key <key>', 'batch account access key for Shared Key authentication')
  .option('-n,--batch-pool-id <id>', 'batch account pool id', 'linux')
  .option('-r,--batch-mount-path <path>', 'batch account mount relative path, if not specified storage container name will be used')
// container app specific options
  .option('-a,--container-image <name>', 'container app image name', 'docker.io/utkarshayachit/vizer:osmesa-main')


// launcher (instead of batch account) specific options
  .option('-l,--launcher <script>', 'launcher script to use instead of batch account')

program.configureHelp({
  helpWidth: 80,
})

/**
 * Parses command line arguments
 * @returns parsed command line options
 */
function parse () {
  program.parse()

  // validate options
  const opts = program.opts()
  if (!opts.storageAccount && !opts.storagePath) {
    program.error('either storage account (-s, --storage-account) or storage path (-d, --storage-path) must be specified')
  }

  if (opts.storageAccount && opts.storagePath) {
    program.error('only one of storage account (-s, --storage-account) or storage path (-d, --storage-path) can be specified')
  }

  if (opts.storageAccount &&
    (!opts.storageAccountKey && !opts.storageConnectionString && !opts.storageSasToken)) {
    program.error('storage account key (-k, --storage-account-key), connection string (-x, --storage-connection-string), or SAS token (-t, --storage-sas-token) must be specified')
  }

  if (!opts.batchEndpoint && !opts.launcher) {
    program.error('either batch account endpoint (-b, --batch-endpoint) or launcher script (-l, --launcher) must be specified')
  }

  if (opts.batchEndpoint && opts.launcher) {
    program.error('only one of batch account endpoint (-b, --batch-endpoint) or launcher script (-l, --launcher) can be specified')
  }

  return opts
}

function opts () {
  return program.opts()
}

module.exports.parse = parse
module.exports.opts = opts
