'use client'

import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type UploadType = 'workers' | 'sites'

interface UploadResult {
  success: boolean
  email?: string
  site_name?: string
  error?: string
}

export default function CsvUploadPage() {
  const [uploadType, setUploadType] = useState<UploadType>('workers')
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<UploadResult[]>([])
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const supabase = createClient()

  const downloadTemplate = useCallback(() => {
    if (uploadType === 'workers') {
      const csv = 'email,name,role,company,phone,daily,affiliation,title,site_ids\n'
        + 'test@example.com,홍길동,worker,이노피앤씨,010-0000-0000,150000,팀원,작업자,'
      downloadFile(csv, 'workers_template.csv', 'text/csv')
    } else {
      const csv = 'name,company,affiliation,allowed_companies,address,manager,manager_phone,safety_manager,safety_phone\n'
        + '테스트현장,이노피앤씨,본사,이노피앤씨,서울시 강남구,김관리,010-0000-0000,이상호,010-0000-0000'
      downloadFile(csv, 'sites_template.csv', 'text/csv')
    }
  }, [uploadType])

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const rows: Record<string, string>[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      const row: Record<string, string> = {}
      headers.forEach((header, idx) => {
        row[header] = values[idx] || ''
      })
      rows.push(row)
    }

    return rows
  }

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true)
    setError('')
    setResults([])

    try {
      const text = await file.text()
      const rows = parseCSV(text)

      if (rows.length === 0) {
        setError('CSV 파일을 읽을 수 없습니다.')
        return
      }

      if (uploadType === 'workers') {
        const { data, error: rpcError } = await supabase.rpc('csv_upload_workers', {
          p_rows: rows,
        })

        if (rpcError) {
          setError(`업로드 실패: ${rpcError.message}`)
        } else if (data) {
          setResults(data)
        }
      } else {
        const { data, error: rpcError } = await supabase.rpc('csv_upload_sites', {
          p_rows: rows,
        })

        if (rpcError) {
          setError(`업로드 실패: ${rpcError.message}`)
        } else if (data) {
          setResults(data)
        }
      }
    } catch (err) {
      setError('파일을 처리하는 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
    }
  }, [uploadType, supabase])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) {
      handleUpload(file)
    } else {
      setError('CSV 파일만 업로드 가능합니다.')
    }
  }, [handleUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }, [handleUpload])

  const successCount = results.filter(r => r.success).length
  const errorCount = results.filter(r => !r.success).length

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-navy)] mb-6">CSV 대량 업로드</h1>

      {/* Upload Type Selector */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => { setUploadType('workers'); setResults([]); setError(''); }}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            uploadType === 'workers'
              ? 'bg-[var(--color-navy)] text-white'
              : 'bg-white text-[var(--color-text)] border border-[var(--color-border)]'
          }`}
        >
          작업자 업로드
        </button>
        <button
          onClick={() => { setUploadType('sites'); setResults([]); setError(''); }}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            uploadType === 'sites'
              ? 'bg-[var(--color-navy)] text-white'
              : 'bg-white text-[var(--color-text)] border border-[var(--color-border)]'
          }`}
        >
          현장 업로드
        </button>
      </div>

      {/* Template Download */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-4">1. 템플릿 다운로드</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          {uploadType === 'workers'
            ? '작업자 일괄 등록용 CSV 템플릿을 다운로드하세요.'
            : '현장 일괄 등록용 CSV 템플릿을 다운로드하세요.'}
        </p>
        <button
          onClick={downloadTemplate}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          템플릿 다운로드
        </button>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-4">2. 파일 업로드</h2>

        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`border border-dashed rounded-xl p-8 text-center transition ${
            dragging
              ? 'border-[var(--form-border-focus)] bg-[var(--form-surface-selected)]'
              : 'border-[var(--form-dashed-border)] bg-[var(--form-surface-soft)]'
          }`}
        >
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-[var(--color-text-secondary)] mb-4">
            CSV 파일을 드래그하거나 클릭하여 선택하세요
          </p>
          <label className="inline-block">
            <span className="px-4 py-2 bg-[var(--color-navy)] text-white rounded-lg cursor-pointer hover:bg-[var(--color-navy-hover)] transition">
              파일 선택
            </span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        {uploading && (
          <div className="mt-4 text-center text-[var(--color-accent)]">
            업로드 중...
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">3. 결과</h2>

          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-sm">성공: {successCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-sm">실패: {errorCount}</span>
            </div>
          </div>

          {errorCount > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-red-600 mb-2">실패 항목:</h3>
              <div className="max-h-48 overflow-y-auto border border-red-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="px-3 py-2 text-left">항목</th>
                      <th className="px-3 py-2 text-left">오류</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {results.filter(r => !r.success).map((r, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2">{r.email || r.site_name}</td>
                        <td className="px-3 py-2 text-red-600">{r.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
