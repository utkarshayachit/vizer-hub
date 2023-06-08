const { BlobServiceClient, StorageSharedKeyCredential }  = require('@azure/storage-blob')
const { DefaultAzureCredential } = require('@azure/identity')
const { BatchServiceClient, BatchSharedKeyCredentials } = require('@azure/batch')
const { AzureCliCredentials, loginWithAppServiceMSI } = require("@azure/ms-rest-nodeauth")
const dayjs = require('dayjs')

const args = require('./args.cjs')

const GLOBALS = {
    TASK_USER_IDENTITY: {
        autoUser: {
            elevationLevel: 'admin',
            scope: 'pool',
        }
    },

    PORTS: new Set(),
    PORTS_RANGE: [8000,9000]
}

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
        let opts = args.opts()
        const credentials = new DefaultAzureCredential(opts.managedIdentityClientId ? {
            managedIdentityClientId: opts.managedIdentityClientId
        } : {})
        return new BlobServiceClient(endpoint, credentials);
    }
}

async function getBatchServiceClient(opts) {
    opts = opts || args.opts()
    if (opts.batchAccountKey) {
        const batchAccountName = opts.batchEndpoint.split('.')[0].split('//')[1]
        const batchCredentials = new BatchSharedKeyCredentials(batchAccountName, opts.batchAccountKey)
        return new BatchServiceClient(batchCredentials, opts.batchEndpoint)
    } else {
        // use MI or CLI credentials
        const credentials = opts.managedIdentityClientId ?
            await loginWithAppServiceMSI({ resource: "https://batch.core.windows.net/", clientId: opts.managedIdentityClientId }) :
            await AzureCliCredentials.create({ resource: "https://batch.core.windows.net/" });
        return new BatchServiceClient(credentials, opts.batchEndpoint)
    }
}
                
/// fetch datasets from blob storage
async function getDatasets(opts) {
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

function getUniqueId() {
    let d = new Date();
    // batch job/task names can only have alphanumerics, -, and _. So we remove
    // : and .
    return d.toISOString().replaceAll(':','-').replaceAll('.','-')
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

function pickPort() {
    /// FIXME: this needs to be made more robust
    for (let attempt=0; attempt < 100; attempt +=1) {
        const p = getRandomInt(GLOBALS.PORTS_RANGE[0], GLOBALS.PORTS_RANGE[1])
        if (!GLOBALS.PORTS.has(p)) {
            GLOBALS.PORTS.add(p)
            return p
        }
    }
    throw Error('failed to find free port!')
}

async function submitJob(datasets, options, opts) {
    const batchServiceClient = await getBatchServiceClient(opts)
    let label = `vizer ${datasets[0].name},... (num_datasets=${datasets.length})`
    const jobConfig = {
        id: `vizer-${getUniqueId()}`,
        displayName: label,
        poolInfo: {
            poolId: opts.batchPoolId
        },
        onAllTasksComplete: 'terminateJob',
        onTaskFailure: 'performExitOptionsJobAction',
        constraints: {
            maxTaskRetryCount: 0,
            // terminate job if it runs longer than 1 hour
            maxWallClockTime: 'PT1H'
        }
    }

    let commandLine = ['--create-on-server-ready',
        '{AZ_BATCH_TASK_WORKING_DIR}/server-ready.txt']

    for (let dataset of datasets) {
        commandLine.push('--dataset')
        commandLine.push(`{AZ_BATCH_NODE_MOUNTS_DIR}/${opts.batchMountPath || opts.storageContainer}/${dataset.name}`)
    }

    if (options.use_cropping) {
        commandLine.push('--force-view')
        commandLine.push('crop')
    }

    if (options.link_interactions) {
        commandLine.push('--link-views')
    }

    const port = pickPort();
    await batchServiceClient.job.add(jobConfig)

    const taskConfig = {
        id: 'task-0',
        displayName: `${label} on ${port}`,
        userIdentity: GLOBALS.TASK_USER_IDENTITY,
        containerSettings: {
            containerRunOptions: `-p ${port}:8080`,
            imageName: `${opts.containerImage}`,
        },
       commandLine: commandLine.join(' '),
    }

    // add task to the job
    await batchServiceClient.task.add(jobConfig.id, taskConfig);

    return {
        poolId: jobConfig.poolInfo.poolId,
        jobId: jobConfig.id,
        taskId: taskConfig.id,
        port: port,
    }
}

async function trameServerReady(batchServiceClient, jobId, taskId, timeout) {
    const expiration = dayjs().add(timeout || 10, 'minute')
    while (dayjs() < expiration) {
        let files = await batchServiceClient.file.listFromTask(jobId, taskId, {
            recursive: true,
            fileListFromTaskOptions: {
                'filter': "startswith(name, 'wd/server-ready.txt')",
            }
        })
        if (files.length > 0) {
            console.log('server is ready!')
            return true;
        }
        await new Promise(r => setTimeout(r, 5000)); // sleep for 5 seconds
    }
    throw Error('trame server ready timedout')
}

async function getComputeNode(jobInfo, timeout) {
    const batchServiceClient = await getBatchServiceClient()

    const expiration = dayjs().add(timeout || 5, 'minute')
    while (dayjs() < expiration) {
        let task = await batchServiceClient.task.get(jobInfo.jobId, jobInfo.taskId)
        if (task.state === 'active' || task.state === 'preparing') {
            await new Promise(r => setTimeout(r, 1000)); // sleep for a second
        } else if (task.state === 'completed') {
            throw Error('task has completed!')
        } else {
            let nodeInfo = await batchServiceClient.computeNode.get(task.nodeInfo.poolId, task.nodeInfo.nodeId)
            await trameServerReady(batchServiceClient, jobInfo.jobId, jobInfo.taskId)
            return {
                host: nodeInfo.ipAddress,
                port: jobInfo.port
            }
        }
    }
    throw Error('task start timed out!')
}

async function terminateJob(jobInfo, opts) {
    const batchServiceClient = await getBatchServiceClient(opts)
    
    // explicitly terminate task to otherwise status doesn't change for active tasks
    // when job is terminated.
    await batchServiceClient.task.terminate(jobInfo.jobId, jobInfo.taskId)
    await batchServiceClient.job.terminate(jobInfo.jobId)
}

async function testBatch() {
    const batchServiceClient = await getBatchServiceClient()
    let pools = await batchServiceClient.pool.list()
    return pools.length
}

module.exports.getDatasets = getDatasets
module.exports.submitJob = submitJob
module.exports.getComputeNode = getComputeNode
module.exports.terminateJob = terminateJob
module.exports.testBatch = testBatch
