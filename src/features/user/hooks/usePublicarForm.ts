import { useState } from 'react'
import { publicarCaso } from '../services/publicarCaso'
import { INITIAL_FORM, type FormData } from '../types'
import { STEPS } from '../types/constants'

export function usePublicarForm() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<FormData>(INITIAL_FORM)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [caseNumber, setCaseNumber] = useState('')

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setData(prev => ({ ...prev, [key]: value }))

  const canNext = (): boolean => {
    if (step === 1) {
      return !!(
        data.nombres.trim() &&
        data.apellidos.trim() &&
        data.edad.trim() &&
        data.genero.trim() &&
        data.descripcion.trim()
      )
    }

    if (step === 3) return !!data.lugarDesaparicion.trim()

    if (step === 4) {
      return !!(
        data.fechaDesaparicion &&
        data.lugarUltimaVez.trim() &&
        data.descripcionCircunstancias.trim()
      )
    }

    if (step === 5) {
      const visibilidadValida =
        data.visibilidadContacto === 'publico' || data.visibilidadContacto === 'autoridades'
      return data.aceptaTerminos && visibilidadValida
    }

    return true
  }

  const next = () => setStep(current => Math.min(STEPS.length, current + 1))
  const prev = () => setStep(current => Math.max(1, current - 1))

  const submit = async () => {
    if (loading) return

    if (!canNext()) {
      setError('Completa los campos obligatorios de este paso para publicar el caso.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await publicarCaso(data)
      setCaseNumber(result.caseNumber)
      setSubmitted(true)
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Error inesperado al publicar el caso.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setData(INITIAL_FORM)
    setStep(1)
    setSubmitted(false)
    setLoading(false)
    setError(null)
    setCaseNumber('')
  }

  return {
    step,
    data,
    set,
    canNext,
    next,
    prev,
    submit,
    submitted,
    loading,
    error,
    caseNumber,
    reset,
  }
}
