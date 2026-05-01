'use client'

import { PreviewCenter } from './PreviewCenter'
import { usePreview } from './PreviewProvider'

export function PreviewHost() {
  const { preview, closePreview } = usePreview()

  if (!preview) return null

  const handleClose = () => {
    try {
      preview.onClose?.()
    } finally {
      closePreview()
    }
  }

  return (
    <PreviewCenter
      mode={preview.mode}
      contentType={preview.contentType}
      title={preview.title}
      subtitle={preview.subtitle}
      showBack={preview.showBack}
      onBack={preview.onBack}
      onClose={handleClose}
      dockMode={preview.dockMode}
      status={preview.status}
      onDownload={preview.onDownload}
      onShare={preview.onShare}
      onSave={preview.onSave}
      onSign={preview.onSign}
      onSubmit={preview.onSubmit}
      onLock={preview.onLock}
      onUnlock={preview.onUnlock}
      onExportPdf={preview.onExportPdf}
      onExportCsv={preview.onExportCsv}
      customActions={preview.customActions}
      showExportMenu={preview.showExportMenu}
      backdropClassName={preview.backdropClassName}
      maxWidth={preview.maxWidth}
    >
      {preview.children}
    </PreviewCenter>
  )
}
