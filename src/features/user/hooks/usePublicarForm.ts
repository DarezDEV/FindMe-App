import { useState } from 'react'
import { publicarCaso } from '../services/publicarCaso'
import { INITIAL_FORM, type FormData } from '../types'

export function usePublicarForm() {
  const [data, setData] = useState<FormData>(INITIAL_FORM)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [caseNumber, setCaseNumber] = useState('')

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setData(prev => ({ ...prev, [key]: value }))

  const canSubmit = (): boolean => {
    return !!(
      data.nombres.trim() &&
      data.apellidos.trim() &&
      data.edad.trim() &&
      data.genero.trim() &&
      data.estatura.trim() &&
      data.descripcion.trim() &&
      data.lugarDesaparicion.trim() &&
      data.fechaDesaparicion &&
      data.lugarUltimaVez.trim() &&
      data.descripcionCircunstancias.trim() &&
      data.aceptaTerminos
    )
  }

  const submit = async () => {
    if (loading) return

    if (!canSubmit()) {
      setError('Completa los campos obligatorios para publicar el caso.')
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
    setSubmitted(false)
    setLoading(false)
    setError(null)
    setCaseNumber('')
  }

  return {
    data,
    set,
    canSubmit,
    submit,
    submitted,
    loading,
    error,
    caseNumber,
    reset,
  }
}
