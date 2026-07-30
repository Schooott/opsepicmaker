// Datei-Anhänge für die KI-Vorbefüllung: Bilder und PDFs gehen als
// Base64-Blöcke direkt an die API, Office-/Textdateien werden clientseitig
// zu Text extrahiert und in den Prompt übernommen.
import JSZip from "jszip"

import type { AiAttachment } from "./ai"
import { imageToAiBase64 } from "./image"

const MAX_FILE_MB = 10
const MAX_TEXT_CHARS = 30000

async function fileToBase64(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer())
  let bin = ""
  const chunk = 0x8000
  for (let i = 0; i < buf.length; i += chunk) {
    bin += String.fromCharCode(...buf.subarray(i, i + chunk))
  }
  return btoa(bin)
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
}

/** word/document.xml → Fließtext (Absätze als Zeilen) */
async function extractDocxText(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file)
  const xml = await zip.file("word/document.xml")?.async("string")
  if (!xml) throw new Error("Kein Word-Dokumentinhalt gefunden.")
  return decodeXmlEntities(
    xml
      .replace(/<w:tab[^>]*\/>/g, "\t")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** xlsx: sharedStrings + Zellwerte je Blatt als grobe Textzeilen */
async function extractXlsxText(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file)
  const shared: string[] = []
  const sharedXml = await zip.file("xl/sharedStrings.xml")?.async("string")
  if (sharedXml) {
    for (const m of sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      shared.push(decodeXmlEntities(m[1].replace(/<[^>]+>/g, "")))
    }
  }
  const parts: string[] = []
  const sheetFiles = Object.keys(zip.files).filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()
  for (const name of sheetFiles) {
    const xml = await zip.file(name)?.async("string")
    if (!xml) continue
    const rows: string[] = []
    for (const rowMatch of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells: string[] = []
      for (const cell of rowMatch[1].matchAll(/<c[^>]*?(?:t="(\w+)")?[^>]*>[\s\S]*?<v>([\s\S]*?)<\/v>/g)) {
        const [, t, v] = cell
        cells.push(t === "s" ? shared[Number(v)] ?? "" : decodeXmlEntities(v))
      }
      if (cells.some(c => c.trim())) rows.push(cells.join("\t"))
    }
    if (rows.length) parts.push(rows.join("\n"))
  }
  const text = parts.join("\n\n").trim()
  if (!text) throw new Error("Keine Inhalte in der Excel-Datei gefunden.")
  return text
}

function truncate(text: string): string {
  return text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) + "\n… (gekürzt)" : text
}

/** Wandelt eine Datei in einen KI-Anhang um; wirft bei nicht unterstützten Formaten. */
export async function fileToAttachment(file: File): Promise<AiAttachment> {
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    throw new Error(`„${file.name}“ ist größer als ${MAX_FILE_MB} MB.`)
  }
  const name = file.name
  const ext = name.toLowerCase().split(".").pop() ?? ""

  if (file.type.startsWith("image/")) {
    const img = await imageToAiBase64(file)
    return { kind: "image", name, data: img.data, mediaType: img.mediaType, preview: img.preview }
  }
  if (file.type === "application/pdf" || ext === "pdf") {
    return { kind: "pdf", name, data: await fileToBase64(file) }
  }
  if (ext === "docx") {
    return { kind: "text", name, text: truncate(await extractDocxText(file)) }
  }
  if (ext === "xlsx") {
    return { kind: "text", name, text: truncate(await extractXlsxText(file)) }
  }
  if (ext === "doc") {
    throw new Error(`„${name}“: Altes Word-Format (.doc) wird nicht unterstützt – bitte als .docx oder PDF speichern.`)
  }
  if (file.type.startsWith("text/") || ["txt", "md", "csv", "json"].includes(ext)) {
    const text = (await file.text()).trim()
    if (!text) throw new Error(`„${name}“ ist leer.`)
    return { kind: "text", name, text: truncate(text) }
  }
  throw new Error(`„${name}“: Format wird nicht unterstützt (Bilder, PDF, DOCX, XLSX, TXT/MD/CSV/JSON).`)
}
