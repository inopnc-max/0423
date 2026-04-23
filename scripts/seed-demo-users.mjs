import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

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
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  fileEnv.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  fileEnv.SUPABASE_SERVICE_ROLE_KEY ||
  ''

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing SUPABASE URL or SUPABASE_SECRET_KEY (legacy SUPABASE_SERVICE_ROLE_KEY also works). Add them to .env.local first.'
  )
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const demoUsers = [
  {
    email: 'admin@test.com',
    password: 'test123!',
    role: 'admin',
    name: '관리자',
    company: 'INOPNC',
  },
  {
    email: 'worker@test.com',
    password: 'test123!',
    role: 'worker',
    name: '작업자',
    company: 'INOPNC',
  },
  {
    email: 'manager@test.com',
    password: 'test123!',
    role: 'site_manager',
    name: '현장관리자',
    company: 'INOPNC',
  },
  {
    email: 'customer@test.com',
    password: 'test123!',
    role: 'partner',
    name: '고객담당자',
    company: 'INOPNC',
    affiliation: '고객사',
    title: '담당자',
  },
]

async function findUserByEmail(email) {
  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const users = data.users || []
    const match = users.find(user => user.email?.toLowerCase() === email.toLowerCase())
    if (match) return match
    if (users.length < perPage) return null
    page += 1
  }
}

async function ensureUser(user) {
  const existing = await findUserByEmail(user.email)

  if (!existing) {
    const { data, error } = await admin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        name: user.name,
        company: user.company,
        role: user.role,
        affiliation: user.affiliation,
        title: user.title,
      },
    })

    if (error) throw error
    return data.user
  }

  const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
    password: user.password,
    email_confirm: true,
    user_metadata: {
      ...(existing.user_metadata || {}),
      name: user.name,
      company: user.company,
      role: user.role,
      affiliation: user.affiliation,
      title: user.title,
    },
  })

  if (error) throw error
  return data.user
}

async function upsertWorker(user, authUserId) {
  const { error } = await admin.from('workers').upsert({
    id: authUserId,
    email: user.email,
    name: user.name,
    company: user.company,
    role: user.role,
    affiliation: user.affiliation,
    title: user.title,
  })

  if (error) throw error
}

for (const user of demoUsers) {
  try {
    const authUser = await ensureUser(user)
    console.log(`AUTH_OK ${user.email} (${user.role})`)

    try {
      await upsertWorker(user, authUser.id)
      console.log(`WORKER_OK ${user.email}`)
    } catch (error) {
      console.warn(`WORKER_WARN ${user.email}: ${error.message}`)
    }
  } catch (error) {
    console.error(`FAIL ${user.email}: ${error.message}`)
  }
}
