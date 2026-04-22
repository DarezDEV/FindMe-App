-- Tabla para almacenar suscripciones push de usuarios
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Habilitar RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios solo vean sus propias suscripciones
CREATE POLICY "Users can manage own subscriptions"
ON push_subscriptions
FOR ALL
USING (auth.uid() = user_id);

-- Tabla para almacenar dispositivos de usuarios (alternativa)
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fcm_token TEXT,
  platform TEXT DEFAULT 'web',
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Habilitar RLS
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios solo vean sus propios dispositivos
CREATE POLICY "Users can manage own devices"
ON user_devices
FOR ALL
USING (auth.uid() = user_id);