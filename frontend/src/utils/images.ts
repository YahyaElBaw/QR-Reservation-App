export function productImage(url: string, width = 600) {
  return url.includes('res.cloudinary.com/')
    ? url.replace('/upload/', `/upload/c_fill,ar_1:1,w_${width},q_auto,f_auto/`)
    : url
}
export async function squareImage(file: File): Promise<File> {
  const image = await createImageBitmap(file)
  try {
    const side = Math.min(image.width, image.height)
    const size = Math.min(side, 1200)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    if (!context)
      throw new Error('Traitement de l’image indisponible. Essayez un autre navigateur.')
    context.drawImage(
      image,
      (image.width - side) / 2,
      (image.height - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    )
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(new Error('Image invalide. Choisissez un autre fichier.')),
        'image/webp',
        0.86,
      ),
    )
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' })
  } finally {
    image.close()
  }
}
