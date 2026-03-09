export interface FormData {
  // Step 1 – Datos personales
  nombres: string
  apellidos: string
  edad: string
  genero: string
  estatura: string
  peso: string
  colorPiel: string
  colorCabello: string
  colorOjos: string
  senasParticulares: string
  descripcion: string

  // Step 2 – Fotos y video
  fotos: File[]
  video: File | null

  // Step 3 – Ubicación
  lugarDesaparicion: string
  coordenadas: { lat: number; lng: number } | null

  // Step 4 – Último avistamiento
  fechaDesaparicion: string
  horaDesaparicion: string
  lugarUltimaVez: string
  descripcionCircunstancias: string
  ropaDescripcion: string

  // Step 5 – Preferencias
  idioma: string
  visibilidadContacto: 'publico' | 'autoridades' | 'privado'
  telefonoContacto: string
  emailContacto: string
  aceptaTerminos: boolean
}

export const INITIAL_FORM: FormData = {
  nombres: '', apellidos: '', edad: '', genero: '',
  estatura: '', peso: '', colorPiel: '', colorCabello: '',
  colorOjos: '', senasParticulares: '', descripcion: '',
  fotos: [], video: null,
  lugarDesaparicion: '', coordenadas: null,
  fechaDesaparicion: '', horaDesaparicion: '',
  lugarUltimaVez: '', descripcionCircunstancias: '', ropaDescripcion: '',
  idioma: 'es', visibilidadContacto: 'publico',
  telefonoContacto: '', emailContacto: '', aceptaTerminos: false,
}

export interface StepMeta {
  id: number
  label: string
}

export type SetFormValue = <K extends keyof FormData>(key: K, value: FormData[K]) => void
