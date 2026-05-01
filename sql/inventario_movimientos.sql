-- Tabla de historial de movimientos de inventario
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS inventario_movimientos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  insumo_id UUID REFERENCES inventario(id) ON DELETE CASCADE NOT NULL,
  insumo_nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  cantidad NUMERIC NOT NULL CHECK (cantidad > 0),
  stock_antes NUMERIC NOT NULL,
  stock_despues NUMERIC NOT NULL,
  usuario_nombre TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inv_mov_insumo ON inventario_movimientos (insumo_id, created_at DESC);

ALTER TABLE inventario_movimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_mov_select" ON inventario_movimientos FOR SELECT USING (true);
CREATE POLICY "inv_mov_insert" ON inventario_movimientos FOR INSERT WITH CHECK (true);
