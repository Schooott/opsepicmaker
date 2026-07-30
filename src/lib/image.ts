// Verkleinert einen Screenshot proportional für den KI-Aufruf und liefert
// Base64 (ohne Daten-URL-Präfix) — hält Requests klein bei lesbarem Inhalt.
export async function imageToAiBase64(file: File, maxSide = 1400): Promise<{ data: string; mediaType: string; preview: string }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas wird nicht unterstützt.")
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85)
  return { data: dataUrl.slice(dataUrl.indexOf(",") + 1), mediaType: "image/jpeg", preview: dataUrl }
}

// Verkleinert ein Bild clientseitig auf ein quadratisches JPEG —
// hält Avatare klein und einheitlich.
export async function downscaleToJpeg(file: File, size = 256): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - side) / 2
  const sy = (bitmap.height - side) / 2

  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas wird nicht unterstützt.")
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size)
  bitmap.close()

  return await new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error("Bild konnte nicht konvertiert werden."))), "image/jpeg", 0.85)
  })
}
