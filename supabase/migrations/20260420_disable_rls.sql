-- Desactivar RLS en casos (temporalmente para debugging)
ALTER TABLE cases DISABLE ROW LEVEL SECURITY;
ALTER TABLE persons DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- O si prefieres, Eliminar todas las policies de todas las tablas
-- DROP POLICY IF EXISTS "Allow all for cases" ON cases;
-- DROP POLICY IF EXISTS "Allow all for persons" ON persons;
-- DROP POLICY IF EXISTS "Allow all for profiles" ON profiles;

fetch('https://vjxydailrsazyomfwyuu.supabase.co/functions/v1/send-push/test', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqeHlkYWlscnNhenlvbWZ3eXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MzgxNzYsImV4cCI6MjA4NzIxNDE3Nn0.TnIu9ssgWrY-yT-Gwc_SllaIFva_WoBNtBdECXIc56s'
  },
  body: JSON.stringify({
    userId: '8fa17707-40dd-429e-8e21-c837f8ad9014',
    title: 'Test Push FindMe',
    body: 'Funciona! 🎉'
  })
})




