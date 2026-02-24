import { useState } from 'react'
import { INITIAL_FORM, type FormData } from '../types'
import { STEPS } from '../types/constants'

export function usePublicarForm() {
  const [step, setStep]         = useState(1)
  const [data, setData]         = useState<FormData>(INITIAL_FORM)
  const [submitted, setSubmitted] = useState(false)

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setData(prev => ({ ...prev, [key]: value }))

  const canNext = (): boolean => {
    if (step === 1) return !!(data.nombres && data.apellidos && data.edad && data.genero && data.descripcion)
    if (step === 3) return !!data.lugarDesaparicion
    if (step === 4) return !!(data.fechaDesaparicion && data.lugarUltimaVez && data.descripcionCircunstancias)
    if (step === 5) return data.aceptaTerminos
    return true
  }

  const next  = () => setStep(s => Math.min(STEPS.length, s + 1))
  const prev  = () => setStep(s => Math.max(1, s - 1))
  const submit = () => setSubmitted(true)

  const reset = () => {
    setData(INITIAL_FORM)
    setStep(1)
    setSubmitted(false)
  }

  return { step, data, set, canNext, next, prev, submit, submitted, reset }
}
