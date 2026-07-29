// Audioaufnahme (MediaRecorder, wählbare Quelle) plus Live-Diktat über die
// Browser-Spracherkennung (Chrome/Edge, de-DE). Die Spracherkennung hört
// technisch bedingt immer auf das System-Standardmikrofon.
import { useCallback, useEffect, useRef, useState } from "react"

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  start: () => void
  stop: () => void
}
type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function useRecorder(onFinalText: (text: string) => void) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState<string>("")
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [interim, setInterim] = useState("")
  const [notice, setNotice] = useState("")
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const chunks = useRef<Blob[]>([])
  const recognition = useRef<SpeechRecognitionLike | null>(null)
  const recognizing = useRef(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const onFinalRef = useRef(onFinalText)
  useEffect(() => {
    onFinalRef.current = onFinalText
  }, [onFinalText])

  const speechSupported = getSpeechRecognition() !== null

  const refreshDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices()
      setDevices(list.filter(d => d.kind === "audioinput" && d.deviceId))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    refreshDevices()
    navigator.mediaDevices?.addEventListener?.("devicechange", refreshDevices)
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", refreshDevices)
  }, [refreshDevices])

  const stop = useCallback(() => {
    recognizing.current = false
    try { recognition.current?.stop() } catch { /* ignore */ }
    recognition.current = null
    setInterim("")
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") mediaRecorder.current.stop()
    if (timer.current) clearInterval(timer.current)
    setRecording(false)
  }, [])

  const start = useCallback(async () => {
    setNotice("")
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      })
    } catch (e) {
      setNotice("Zugriff auf die Audioquelle fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)))
      return
    }
    refreshDevices() // Labels sind nach erster Berechtigung sichtbar

    chunks.current = []
    const mr = new MediaRecorder(stream.current)
    mediaRecorder.current = mr
    mr.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" })
      setAudioUrl(prev => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(blob)
      })
      stream.current?.getTracks().forEach(t => t.stop())
    }
    mr.start()
    setSeconds(0)
    timer.current = setInterval(() => setSeconds(s => s + 1), 1000)
    setRecording(true)

    // Live-Diktat starten (falls unterstützt)
    const SR = getSpeechRecognition()
    if (!SR) {
      setNotice("Live-Transkription wird von diesem Browser nicht unterstützt (Chrome oder Edge verwenden). Die Aufnahme läuft trotzdem.")
      return
    }
    const rec = new SR()
    recognition.current = rec
    recognizing.current = true
    rec.lang = "de-DE"
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = e => {
      let interimText = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) onFinalRef.current(r[0].transcript.trim())
        else interimText += r[0].transcript
      }
      setInterim(interimText)
    }
    rec.onend = () => { if (recognizing.current) { try { rec.start() } catch { /* ignore */ } } }
    rec.onerror = e => {
      if (e.error === "not-allowed") setNotice("Mikrofon-Zugriff für die Spracherkennung verweigert.")
    }
    try { rec.start() } catch { /* ignore */ }
  }, [deviceId, refreshDevices])

  useEffect(() => stop, [stop]) // Cleanup bei Unmount

  return { devices, deviceId, setDeviceId, recording, seconds, interim, notice, audioUrl, start, stop, speechSupported }
}
