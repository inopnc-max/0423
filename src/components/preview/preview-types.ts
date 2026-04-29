import type { DockAction } from './PreviewActionDock'
import type { Role } from '@/lib/roles'

export type PreviewMode = 'modal' | 'fullscreen'
export type PreviewContentType = 'report' | 'media' | 'file'
export type PreviewDockMode = 'readonly' | 'edit' | 'signature'
export type PreviewStatus = 'draft' | 'pending' | 'approved' | 'locked' | 'rejected'

export interface PreviewConfig {
  title: string
  subtitle?: string
  mode?: PreviewMode
  contentType?: PreviewContentType
  dockMode?: PreviewDockMode
  status?: PreviewStatus
  children: React.ReactNode
  showBack?: boolean
  onBack?: () => void
  onClose?: () => void
  onDownload?: () => void
  onShare?: () => void
  onSave?: () => void
  onSign?: () => void
  onSubmit?: () => void
  customActions?: DockAction[]
  backdropClassName?: string
  maxWidth?: string
}

export interface PreviewContextValue {
  preview: PreviewConfig | null
  role?: Role
  openPreview: (config: PreviewConfig) => void
  closePreview: () => void
}

