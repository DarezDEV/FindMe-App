import { useRef, type DragEvent } from 'react'
import { Image, Video, X, Check, AlertCircle } from 'lucide-react'
import { type FormData, type SetFormValue } from '../types'
import { Label } from './FormPrimitives'

interface Props {
  data: FormData
  set: SetFormValue
}

export function StepFotosVideo({ data, set }: Props) {
  const fotoRef  = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)

  const addFotos = (files: FileList | null) => {
    if (!files) return
    const remaining = 10 - data.fotos.length
    const valid = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .slice(0, remaining)
    set('fotos', [...data.fotos, ...valid])
  }

  const removeFoto = (index: number) => {
    const next = [...data.fotos]
    next.splice(index, 1)
    set('fotos', next)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    addFotos(e.dataTransfer.files)
  }

  return (
    <div className="space-y-6">

      {/* Fotos */}
      <div>
        <Label>
          Fotografías{' '}
          <span className="normal-case font-normal text-text-secondary">(máx. 10 fotos)</span>
        </Label>

        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fotoRef.current?.click()}
          className="border-2 border-dashed border-border hover:border-primary rounded-xl p-8
                     flex flex-col items-center gap-3 cursor-pointer transition-all duration-200
                     hover:bg-primary-soft/30 group"
        >
          <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center
                          group-hover:scale-110 transition-transform duration-200">
            <Image size={22} className="text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-text-primary">
              Arrastra fotos aquí o haz clic para subir
            </p>
            <p className="text-xs text-text-secondary mt-1">JPG, PNG, WEBP — hasta 10 MB por foto</p>
          </div>
          <input
            ref={fotoRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => addFotos(e.target.files)}
          />
        </div>

        {/* Preview grid */}
        {data.fotos.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
            {data.fotos.map((file, i) => (
              <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`foto-${i}`}
                  className="w-full h-full object-cover"
                />
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    Principal
                  </span>
                )}
                <button
                  onClick={e => { e.stopPropagation(); removeFoto(i) }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-error text-white
                             flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={11} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Video */}
      <div>
        <Label>
          Video{' '}
          <span className="normal-case font-normal text-text-secondary">(opcional, máx. 50 MB)</span>
        </Label>

        {!data.video ? (
          <div
            onClick={() => videoRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-primary rounded-xl p-5
                       flex items-center gap-4 cursor-pointer transition-all duration-200
                       hover:bg-primary-soft/30 group"
          >
            <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center shrink-0
                            group-hover:scale-110 transition-transform">
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
              onChange={e => set('video', e.target.files?.[0] ?? null)}
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-success/8 border border-success/25 rounded-xl px-4 py-3">
            <Check size={16} className="text-success shrink-0" />
            <p className="text-sm text-text-primary flex-1 truncate">{data.video.name}</p>
            <button
              onClick={() => set('video', null)}
              className="text-text-secondary hover:text-error transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Tip */}
      <div className="flex items-start gap-2 bg-warning/8 border border-warning/25 text-warning rounded-lg px-3 py-2.5">
        <AlertCircle size={15} className="mt-0.5 shrink-0" />
        <p className="text-xs">
          La primera foto será la imagen principal del caso. Sube fotos recientes y de buena calidad
          para aumentar las probabilidades de identificación.
        </p>
      </div>

    </div>
  )
}
