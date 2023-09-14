const args = require('./args.cjs')
const { spawn } = require('node:child_process')
const { getUniqueId, pickPort } = require('./batch.cjs')

const GLOBALS = {
    JOBS: new Map(),
}

async function submit(datasets, options, opts) {
    opts = opts || args.opts()
    const id = `vizer-${getUniqueId()}`
    const port = pickPort()

    var args = []
    args.push('--timeout')
    args.push(5)
    args.push('--port')
    args.push(port)

    for (const dataset of datasets) {
        args.push('--dataset')
        args.push(`${dataset.container}/${dataset.name}`)
    }

    if (options.use_cropping) {
        args.push('--force-view')
        args.push('crop')
    } else if (options.use_segmentation) {
        args.push('--force-view')
        args.push('segmentation')
    }

    if (options.link_interactions) {
        args.push('--link-views')
    }

    var proc = spawn(opts.launcher, args, {
        // shell: true,
        stdio: ['ignore', 'pipe', 'inherit'],
    })

    let promise = new Promise((resolve, reject) => {
        proc.on('exit', (code, signal) => {
            console.log(`launcher exited with code ${code} and signal ${signal}`)
            reject(code)
        })

        proc.stdout.on('data', (data) => {
            console.log(`${data}`)
            // see if data has "App runing at" in it
            if (data.toString().includes('App running at')) {
                resolve(true)
            }
        })
    })

    const job = {
        id: id,
        port: port,
        proc: proc,
        promise: promise,
    }

    GLOBALS.JOBS.set(id, job)
    return { id: id, port: port}
}

async function get(jobInfo, timeout, opts) {
    opts = opts || args.opts()
    const job = GLOBALS.JOBS.get(jobInfo.id)
    if (!job) {
        throw Error(`job ${jobInfo.id} not found`)
    }

    const port = job.port
    const promise = job.promise

    const ready = await promise
    if (!ready) {
        throw Error(`job ${jobInfo.id} failed to start within ${timeout} seconds`)
    }

    return {
        host: 'localhost',
        port: port
    }
}

async function terminate(jobInfo, opts) {
    opts = opts || args.opts()
    const job = GLOBALS.JOBS.get(jobInfo.id)
    if (!job) {
        throw Error(`job ${jobInfo.id} not found`)
    }

    const proc = job.proc
    proc.kill()
    GLOBALS.JOBS.delete(jobInfo.id)
}

module.exports.submit = submit
module.exports.get = get
module.exports.terminate = terminate
