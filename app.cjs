const express = require('express')
const args = require('./utils/args.cjs')

const { createProxyMiddleware } = require('http-proxy-middleware')

const opts = args.parse()
const scheduler = opts.launcher ? require('./utils/launcher.cjs') : require('./utils/batch.cjs')
const storage = opts.storagePath ? require('./utils/storage-local.cjs') : require('./utils/storage.cjs')

// ----------------------------------------------------------------------------
function router (req) {
  const components = req.url.split('/').filter(e => e)
  if (components.length >= 2) {
    return `http://${components[1]}`
  }
}

const app = express()
app.use(express.json())
app.use('/static', express.static('public/js', { index: false }))
app.use(express.static('public/html'))
app.use('/proxy', createProxyMiddleware({
  changeOrigin: true,
  ws: true,
  router,
  pathRewrite: {
    // remove the '/proxy/host:port' component
    // from the path.
    '^/proxy/[^/]+/': '/'
  }
}))

/// returns a listing of the datasets
app.get('/datasets', async (req, res, next) => {
  try {
    const data = await storage.list(opts)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
})

/// start a new job
app.post('/job', async (req, res, next) => {
  try {
    const job = await scheduler.submit(req.body.datasets, req.body.options, opts)
    res.json({ success: true, job })
  } catch (error) {
    next(error)
  }
})

/// get information about compute node for a job
app.post('/compute_node', async (req, res, next) => {
  try {
    const info = await scheduler.get(req.body.job)
    res.json({ success: true, path: `proxy/${info.host}:${info.port}/` })
  } catch (error) {
    next(error)
  }
})

/// cancel job
app.post('/terminate_job', async (req, res, next) => {
  try {
    await scheduler.terminate(req.body.job, opts)
    res.json({})
  } catch (error) {
    next(error)
  }
})

app.get('/test', async (req, res, next) => {
  try {
    await scheduler.test(opts)
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

// ----------------------------------------------------------------------------
app.use((error, req, res, next) => {
  console.log(`error: ${error.message}`)
  next(error)
})

app.use((error, req, res, next) => {
  res.header('Content-Type', 'application/json')
  res.status(error.status || 400).json({
    message: error.message,
    success: false
  })
})

app.listen(opts.port, () => {
  console.log('Server started')
  console.log(`   - listening on port ${opts.port}`)
})

process.on('SIGTERM', () => {
  console.log('Server shutting down')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('Server shutting down')
  process.exit(0)
})
