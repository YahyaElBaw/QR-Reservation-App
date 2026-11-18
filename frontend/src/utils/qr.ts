import QRCode from 'qrcode'

export interface GenerateTableQrOptions {
  url: string
  tableNumber: number
  qrToken: string
  restaurantName?: string
  includeCardBorder?: boolean
}

/**
 * Generates a high-resolution PNG Data URL for a table's QR code.
 * Includes:
 * 1. Bold table title ("TABLE 01") at the top.
 * 2. High-contrast QR code with High Error Correction (30%).
 * 3. An embedded center badge right on the QR code with the table number.
 * 4. Clear customer instructions and table token at the bottom.
 */
export async function generateTableQrCard({
  url,
  tableNumber,
  qrToken,
  restaurantName = 'Medina Restaurant',
}: GenerateTableQrOptions): Promise<string> {
  // 1. Generate base QR code as image with High error correction (H = 30% recovery)
  const qrDataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 650,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  })

  // 2. Load QR into an Image element
  const img = new Image()
  img.src = qrDataUrl
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to load base QR code image'))
  })

  // 3. Create high-resolution Canvas (800 x 1000 px) for crisp printing & downloading
  const width = 800
  const height = 1000
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return qrDataUrl

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Clean white canvas background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // Outer decorative rounded border
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 3
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(24, 24, width - 48, height - 48, 24)
  } else {
    ctx.rect(24, 24, width - 48, height - 48)
  }
  ctx.fill()
  ctx.stroke()

  // Top accent bar
  ctx.fillStyle = '#0284c7'
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(width / 2 - 35, 42, 70, 5, 3)
  } else {
    ctx.rect(width / 2 - 35, 42, 70, 5)
  }
  ctx.fill()

  // Restaurant Name
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillStyle = '#0284c7'
  ctx.fillText(restaurantName.toUpperCase(), width / 2, 78)

  // Table Headline: "TABLE 01"
  ctx.font = '900 50px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillStyle = '#0f172a'
  const tableText = `TABLE ${String(tableNumber).padStart(2, '0')}`
  ctx.fillText(tableText, width / 2, 138)

  // Instruction subtitle
  ctx.font = '500 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillStyle = '#64748b'
  ctx.fillText('Scannez avec votre téléphone pour commander', width / 2, 184)

  // Draw QR code centered
  const qrSize = 560
  const qrX = (width - qrSize) / 2
  const qrY = 220
  ctx.drawImage(img, qrX, qrY, qrSize, qrSize)

  // Center Badge right in the middle of the QR Code with Table Number
  const badgeSize = 114
  const badgeX = (width - badgeSize) / 2
  const badgeY = qrY + (qrSize - badgeSize) / 2
  const radius = 22

  // Badge background + shadow
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.12)'
  ctx.shadowBlur = 12
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, radius)
  } else {
    ctx.rect(badgeX, badgeY, badgeSize, badgeSize)
  }
  ctx.fill()
  ctx.shadowColor = 'transparent'

  // Badge border
  ctx.strokeStyle = '#0284c7'
  ctx.lineWidth = 4
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(badgeX + 2, badgeY + 2, badgeSize - 4, badgeSize - 4, radius - 2)
  } else {
    ctx.rect(badgeX + 2, badgeY + 2, badgeSize - 4, badgeSize - 4)
  }
  ctx.stroke()

  // Badge "TABLE" label
  ctx.fillStyle = '#0284c7'
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText('TABLE', width / 2, badgeY + 34)

  // Badge Table Number (e.g. "1" or "01")
  ctx.fillStyle = '#0f172a'
  ctx.font = '900 46px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText(String(tableNumber), width / 2, badgeY + 76)

  // Footer: Table Token
  ctx.font = '600 16px "SF Mono", Monaco, Consolas, monospace'
  ctx.fillStyle = '#475569'
  ctx.fillText(qrToken, width / 2, 850)

  // Footer: Assistance
  ctx.font = '400 14px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillStyle = '#94a3b8'
  ctx.fillText('Menu interactif · Sans application à installer', width / 2, 890)

  return canvas.toDataURL('image/png')
}
