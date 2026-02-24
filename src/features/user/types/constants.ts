import { User, Camera, MapPin, Clock, Globe } from 'lucide-react'

export const STEPS = [
  { id: 1, label: 'Datos personales',    Icon: User   },
  { id: 2, label: 'Fotos y video',       Icon: Camera },
  { id: 3, label: 'Ubicación',           Icon: MapPin },
  { id: 4, label: 'Último avistamiento', Icon: Clock  },
  { id: 5, label: 'Preferencias',        Icon: Globe  },
]

export const GENEROS  = ['Masculino', 'Femenino', 'No binario', 'Prefiero no decir']
export const PIELES   = ['Clara', 'Media', 'Oliva', 'Morena', 'Oscura']
export const CABELLOS = ['Negro', 'Castaño', 'Rubio', 'Rojo', 'Gris', 'Blanco', 'Otro']
export const OJOS     = ['Negros', 'Cafés', 'Verdes', 'Azules', 'Grises', 'Miel']

export const IDIOMAS = [
  { code: 'es', label: 'Español'    },
  { code: 'en', label: 'English'    },
  { code: 'pt', label: 'Português'  },
  { code: 'fr', label: 'Français'   },
  { code: 'de', label: 'Deutsch'    },
]