-- Eliminar función problemática y sus triggers
DROP FUNCTION IF EXISTS trigger_push_notification() CASCADE;

-- Verificar que se eliminó
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%trigger%';