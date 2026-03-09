import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { AlertCircle, Check, Image, Video, X } from 'lucide-react'
import { type FormData, type SetFormValue } from '../types'
import { Label } from './FormPrimitives'

interface Props {
  data: FormData
  set: SetFormValue
}

const MAX_PHOTOS = 10
const MAX_PHOTO_SIZE = 10 * 1024 * 1024
const MAX_VIDEO_SIZE = 50 * 1024 * 1024
const OFFICIAL_DOCUMENT_PATTERNS = [
  'cedula',
  'dni',
  'pasaporte',
  'passport',
  'documento',
  'document',
  'identidad',
  'idcard',
  'id_card',
  'licencia',
  'license',
]

function normalizeFileName(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function isOfficialDocumentFileName(name: string) {
  const normalized = normalizeFileName(name)
  return OFFICIAL_DOCUMENT_PATTERNS.some(pattern => normalized.includes(pattern))
}

export function StepFotosVideo({ data, set }: Props) {
  const fotoRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const photoPreviews = useMemo(
    () => data.fotos.map(file => ({ file, url: URL.createObjectURL(file) })),
    [data.fotos]
  )

  useEffect(() => {
    return () => {
      photoPreviews.forEach(item => URL.revokeObjectURL(item.url))
    }
  }, [photoPreviews])

  const addFotos = (files: FileList | null) => {
    if (!files) return

    setMediaError(null)

    const selectedFiles = Array.from(files)
    const safeFiles = selectedFiles.filter(file => !isOfficialDocumentFileName(file.name))
    if (safeFiles.length !== selectedFiles.length) {
      setMediaError('Por seguridad, no se permiten documentos oficiales (cedula, DNI, pasaporte, licencia).')
    }

    const imagesOnly = safeFiles.filter(file => file.type.startsWith('image/'))

    if (imagesOnly.length !== safeFiles.length) {
      setMediaError('Solo se permiten imagenes para las fotos del caso.')
    }

    const validSize = imagesOnly.filter(file => file.size <= MAX_PHOTO_SIZE)
    if (validSize.length !== imagesOnly.length) {
      setMediaError('Algunas fotos superan el limite de 10 MB y fueron descartadas.')
    }

    const remaining = MAX_PHOTOS - data.fotos.length
    if (remaining <= 0) {
      setMediaError(`Ya alcanzaste el maximo de ${MAX_PHOTOS} fotos.`)
      return
    }

    if (validSize.length > remaining) {
      setMediaError(`Solo se agregaron ${remaining} foto(s) para completar el maximo permitido.`)
    }

    const nextPhotos = validSize.slice(0, remaining)
    if (nextPhotos.length > 0) {
      set('fotos', [...data.fotos, ...nextPhotos])
    }
  }

  const removeFoto = (index: number) => {
    const next = [...data.fotos]
    next.splice(index, 1)
    set('fotos', next)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    addFotos(event.dataTransfer.files)
  }

  const handleVideoChange = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const selected = files[0]
    setMediaError(null)

    if (!selected.type.startsWith('video/')) {
      setMediaError('El archivo seleccionado no es un video valido.')
      set('video', null)
      return
    }

    if (selected.size > MAX_VIDEO_SIZE) {
      setMediaError('El video supera el limite de 50 MB.')
      set('video', null)
      return
    }

    if (isOfficialDocumentFileName(selected.name)) {
      setMediaError('No se permiten documentos oficiales en archivos multimedia del caso.')
      set('video', null)
      return
    }

    set('video', selected)
  }

  return (
    <div className="space-y-6">
      <div>
        <Label>
          Fotografias <span className="normal-case font-normal text-text-secondary">(max. {MAX_PHOTOS} fotos)</span>
        </Label>

        <div
          onDrop={handleDrop}
          onDragOver={event => event.preventDefault()}
          onClick={() => fotoRef.current?.click()}
          className="border-2 border-dashed border-border hover:border-primary rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200 hover:bg-primary-soft/30 group"
        >
          <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
            <Image size={22} className="text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-text-primary">Arrastra fotos aqui o haz clic para subir</p>
            <p className="text-xs text-text-secondary mt-1">JPG, PNG, WEBP - hasta 10 MB por foto</p>
          </div>
          <input
            ref={fotoRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={event => addFotos(event.target.files)}
          />
        </div>

        {data.fotos.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
            {photoPreviews.map((preview, index) => (
              <div
                key={`${preview.file.name}-${index}`}
                className="relative group aspect-square rounded-lg overflow-hidden border border-border"
              >
                <img src={preview.url} alt={`foto-${index}`} className="w-full h-full object-cover" />
                {index === 0 && (
                  <span className="absolute bottom-1 left-1 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    Principal
                  </span>
                )}
                <button
                  onClick={event => {
                    event.stopPropagation()
                    removeFoto(index)
                  }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-error text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={11} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label>
          Video <span className="normal-case font-normal text-text-secondary">(opcional, max. 50 MB)</span>
        </Label>

        {!data.video ? (
          <div
            onClick={() => videoRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-primary rounded-xl p-5 flex items-center gap-4 cursor-pointer transition-all duration-200 hover:bg-primary-soft/30 group"
          >
            <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Video size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Subir video</p>
              <p className="text-xs text-text-secondary">MP4, MOV, AVI</p>
            </div>
            <input
              ref={videoRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={event => handleVideoChange(event.target.files)}
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-success/8 border border-success/25 rounded-xl px-4 py-3">
            <Check size={16} className="text-success shrink-0" />
            <p className="text-sm text-text-primary flex-1 truncate">{data.video.name}</p>
            <button onClick={() => set('video', null)} className="text-text-secondary hover:text-error transition-colors">
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {mediaError && (
        <div className="flex items-start gap-2 bg-error/8 border border-error/25 text-error rounded-lg px-3 py-2.5">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <p className="text-xs">{mediaError}</p>
        </div>
      )}

      <div className="flex items-start gap-2 bg-warning/8 border border-warning/25 text-warning rounded-lg px-3 py-2.5">
        <AlertCircle size={15} className="mt-0.5 shrink-0" />
        <p className="text-xs">
          La primera foto sera la imagen principal del caso. No subas cedula, pasaporte u otros documentos oficiales.
        </p>
      </div>
    </div>
  )
}
