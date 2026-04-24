'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'

interface Document {
  id: string
  category: string
  title: string
  file_url: string | null
  created_at: string
}

const CATEGORIES = ['전체', '일지보고서', '사진대지', '도면마킹', '안전서류', '견적서', '시공계획서', '장비계획서', '기타서류', '확인서']

export default function DocumentsPage() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('전체')
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    async function fetchDocs() {
      try {
        let query = supabase.from('documents').select('*').order('created_at', { ascending: false }).limit(100)
        if (category !== '전체') {
          query = query.eq('category', category)
        }
        const { data } = await query
        if (data) setDocuments(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchDocs()
  }, [user, supabase, category])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--color-text-secondary)]">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-[var(--color-navy)] mb-4">문서함</h1>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition ${
              category === cat
                ? 'bg-[var(--color-navy)] text-white'
                : 'bg-white text-[var(--color-text-secondary)] border border-[var(--color-border)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Document List */}
      {documents.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-text-secondary)]">
          문서가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map(doc => (
            <a
              key={doc.id}
              href={doc.file_url || '#'}
              target={doc.file_url ? '_blank' : undefined}
              rel="noopener noreferrer"
              className={`block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition ${
                !doc.file_url ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{doc.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                      {doc.category}
                    </span>
                    <span className="text-xs text-[var(--color-text-tertiary)]">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
