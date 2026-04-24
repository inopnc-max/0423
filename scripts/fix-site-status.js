const fs = require('node:fs')
const path = require('node:path')
const https = require('node:https')

const envPath = path.join(process.cwd(), '.env.local')

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return {}

  return Object.fromEntries(
    fs
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .map(line => {
        const idx = line.indexOf('=')
        return [line.slice(0, idx), line.slice(idx + 1)]
      })
  )
}

function normalizeSupabaseUrl(url) {
  if (!url) return ''

  return url.replace(/\/rest\/v1\/?$/, '')
}

const fileEnv = loadEnv(envPath)
const SUPABASE_URL = normalizeSupabaseUrl(
  process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    fileEnv.SUPABASE_URL ||
    fileEnv.NEXT_PUBLIC_SUPABASE_URL ||
    ''
)
const SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  fileEnv.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  fileEnv.SUPABASE_SERVICE_ROLE_KEY ||
  ''

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Missing SUPABASE URL or SUPABASE_SECRET_KEY (legacy SUPABASE_SERVICE_ROLE_KEY also works). Add them to .env.local first.'
  )
  process.exit(1)
}

const supabaseUrl = new URL(SUPABASE_URL)
const basePath = supabaseUrl.pathname === '/' ? '' : supabaseUrl.pathname.replace(/\/$/, '')

function api(restPath, method, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : ''
    const options = {
      hostname: supabaseUrl.hostname,
      path: `${basePath}/rest/v1${restPath}`,
      method: method || 'GET',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': data ? Buffer.byteLength(data) : 0,
        ...(method === 'PATCH' ? { Prefer: 'return=minimal' } : {}),
      },
    }

    const req = https.request(options, res => {
      let responseBody = ''
      res.setEncoding('utf8')
      res.on('data', chunk => {
        responseBody += chunk
      })
      res.on('end', () => resolve({ status: res.statusCode, body: responseBody }))
    })

    req.on('error', reject)

    if (data) req.write(data)
    req.end()
  })
}

async function main() {
  console.log('Loading sites...')
  const { status, body } = await api('/sites?select=id,name,status&order=name&limit=200')

  if (status !== 200) {
    throw new Error(`Failed to fetch sites (${status}): ${body}`)
  }

  const sites = JSON.parse(body)
  console.log(`Fetched ${sites.length} sites`)

  const completeNames = new Set([
    '구리 인창 주택 재건축',
    '송도 A2 신도시 개발',
    '청주 공정 혁신센터',
  ])

  const ongoingNames = new Set([
    'SK하이닉스 Y1 CUB',
    '사수 주거 복합타워',
    '천안 안성 복합시설',
  ])

  let updated = 0
  let skipped = 0

  for (const site of sites) {
    if (site.status !== '예정') {
      skipped += 1
      console.log(`[SKIP] ${site.name} (${site.status})`)
      continue
    }

    let newStatus = '예정'
    if (completeNames.has(site.name)) newStatus = '완료'
    else if (ongoingNames.has(site.name)) newStatus = '진행'

    const result = await api(`/sites?id=eq.${site.id}`, 'PATCH', { status: newStatus })
    const ok = result.status === 200 || result.status === 204

    console.log(`${ok ? '[OK]' : `[FAIL ${result.status}]`} ${site.name} -> ${newStatus}`)

    if (ok) {
      updated += 1
    }
  }

  console.log(`Updated ${updated} sites, skipped ${skipped} sites`)
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
