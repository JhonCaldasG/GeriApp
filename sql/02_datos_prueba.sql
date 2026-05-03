-- ============================================================
-- DATOS DE PRUEBA — Hogar Geriátrico
-- Generado: 2026-05-01
-- Pacientes reales: Rosa Andrea, Camilo, Maria Camila, Julián Andrés
-- Ejecutar en el SQL Editor de Supabase (idempotente con ON CONFLICT DO NOTHING)
-- ============================================================
--
-- IDs de referencia:
--   P1: 34fda2f7-88f8-4232-9913-2b0b675fed09  Rosa Andrea Melano García   (Hab 104)
--   P2: 419de1ba-e4c9-45fa-a668-7c90db326807  Camilo Pérez Maíz           (Hab 103)
--   P3: 24590a06-43a5-4042-98c4-71fc01f3b2b2  Maria Camila Ríos Gómez     (Hab 102)
--   P4: 00f85a61-c233-443f-b749-2ba949d6c4b4  Julián Andrés Sánchez Barreó(Hab 101)
--   ENF1: 05ec53a7-9af0-4f3a-b462-2f528af9e4e5  Juliana Delgado (enfermero)
--   ENF2: c230c084-f18a-4c99-b5b4-41031212987a  Fabian Melo     (enfermero)
--   ADM:  5bd6a20a-a865-4749-a071-db3488010375  Administrator Hogar
--   ASEO: 088b6b2d-e249-42d2-8e96-9e041ab697f5  Adriana Paez    (aseo)
--
--   Medicamentos nuevos: aa000001-1000-0000-0000-00000000000{1..6}
--   Inventario nuevo:    bb000001-0000-0000-0000-00000000000{1..5}
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. MEDICAMENTOS (6 nuevos)
-- ─────────────────────────────────────────────────────────────
INSERT INTO medicamentos (id, paciente_id, nombre, dosis, frecuencia, horario, via_administracion, observaciones, activo) VALUES
  ('aa000001-1000-0000-0000-000000000001', '34fda2f7-88f8-4232-9913-2b0b675fed09',
   'Enalapril',         '5 mg',          'Cada 12 horas', '08:00 y 20:00', 'Oral',
   'Control de hipertensión arterial. Vigilar hipotensión ortostática.', true),
  ('aa000001-1000-0000-0000-000000000002', '34fda2f7-88f8-4232-9913-2b0b675fed09',
   'Lorazepam',         '0.5 mg',        'Una vez al día', '21:00',         'Oral',
   'Ansiolítico. Usar dosis mínima efectiva. Vigilar sedación excesiva.', true),
  ('aa000001-1000-0000-0000-000000000003', '419de1ba-e4c9-45fa-a668-7c90db326807',
   'Atorvastatina',     '20 mg',         'Una vez al día', '20:00',         'Oral',
   'Control de colesterol. Administrar con la cena.', true),
  ('aa000001-1000-0000-0000-000000000004', '419de1ba-e4c9-45fa-a668-7c90db326807',
   'Omeprazol',         '20 mg',         'Una vez al día', '07:30',         'Oral',
   'Protector gástrico. Administrar en ayunas 30 min antes del desayuno.', true),
  ('aa000001-1000-0000-0000-000000000005', '24590a06-43a5-4042-98c4-71fc01f3b2b2',
   'Calcio + Vitamina D','500 mg/400 UI','Cada 12 horas', '08:00 y 20:00', 'Oral',
   'Suplemento óseo. Administrar con alimentos.', true),
  ('aa000001-1000-0000-0000-000000000006', '00f85a61-c233-443f-b749-2ba949d6c4b4',
   'Donepezil',         '10 mg',         'Una vez al día', '21:00',         'Oral',
   'Tratamiento Alzheimer. Vigilar efectos digestivos y agitación nocturna.', true)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 2. INVENTARIO (5 ítems)
-- ─────────────────────────────────────────────────────────────
INSERT INTO inventario (id, nombre, categoria, stock_actual, stock_minimo, unidad, presentation, observaciones) VALUES
  ('bb000001-0000-0000-0000-000000000001','Gasas estériles 10x10 cm', 'material_medico', 80,  20, 'unidad','Caja x 100', 'Para curaciones. Pedido semanal.'),
  ('bb000001-0000-0000-0000-000000000002','Alcohol antiséptico 70°',  'material_medico',  5,   3, 'litro', 'Frasco 1L',  ''),
  ('bb000001-0000-0000-0000-000000000003','Guantes de nitrilo talla M','material_medico',120,  50, 'par',  'Caja x 100', ''),
  ('bb000001-0000-0000-0000-000000000004','Pañales adulto talla G',   'higiene',          40,  15, 'unidad','Pack x 20', 'Marcas admitidas: Tena, Trest.'),
  ('bb000001-0000-0000-0000-000000000005','Jabón líquido antibacterial','limpieza',         6,   2, 'litro', 'Frasco 1L',  '')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 3. SIGNOS VITALES — 3 días (28-30 abril) × 4 pacientes × 2 tomas + hoy tarde
-- Timestamps en UTC (Colombia UTC-5 → mañana 08:30 CO = 13:30 UTC, tarde 14:30 CO = 19:30 UTC)
-- ─────────────────────────────────────────────────────────────
INSERT INTO signos_vitales
  (paciente_id, presion_sistolica, presion_diastolica, frecuencia_cardiaca, temperatura, saturacion_oxigeno, glucosa, peso, registrado_por, toma_nombre, created_at)
VALUES
  -- ── 2026-04-28 ───────────────────────────────────────────
  ('34fda2f7-88f8-4232-9913-2b0b675fed09','148','90','78','36.8','95','115','62.0','Juliana Delgado','Mañana','2026-04-28 13:30:00+00'),
  ('34fda2f7-88f8-4232-9913-2b0b675fed09','142','88','80','37.0','94','108','62.0','Fabian Melo',   'Tarde', '2026-04-28 19:30:00+00'),
  ('419de1ba-e4c9-45fa-a668-7c90db326807','155','92','72','36.5','93', '98','71.5','Juliana Delgado','Mañana','2026-04-28 13:35:00+00'),
  ('419de1ba-e4c9-45fa-a668-7c90db326807','150','88','74','36.6','94','102','71.5','Fabian Melo',   'Tarde', '2026-04-28 19:35:00+00'),
  ('24590a06-43a5-4042-98c4-71fc01f3b2b2','128','80','70','36.4','97','105','58.0','Juliana Delgado','Mañana','2026-04-28 13:40:00+00'),
  ('24590a06-43a5-4042-98c4-71fc01f3b2b2','130','82','72','36.5','96','110','58.0','Fabian Melo',   'Tarde', '2026-04-28 19:40:00+00'),
  ('00f85a61-c233-443f-b749-2ba949d6c4b4','135','85','76','36.7','97','118','68.0','Juliana Delgado','Mañana','2026-04-28 13:45:00+00'),
  ('00f85a61-c233-443f-b749-2ba949d6c4b4','138','84','78','36.8','96','125','68.0','Fabian Melo',   'Tarde', '2026-04-28 19:45:00+00'),
  -- ── 2026-04-29 (Rosa con SpO2 baja en mañana) ────────────
  ('34fda2f7-88f8-4232-9913-2b0b675fed09','152','92','82','37.2','92','120','62.0','Fabian Melo',   'Mañana','2026-04-29 13:30:00+00'),
  ('34fda2f7-88f8-4232-9913-2b0b675fed09','144','86','79','36.9','95','112','62.0','Juliana Delgado','Tarde', '2026-04-29 19:30:00+00'),
  ('419de1ba-e4c9-45fa-a668-7c90db326807','158','94','70','36.4','92','100','71.3','Fabian Melo',   'Mañana','2026-04-29 13:35:00+00'),
  ('419de1ba-e4c9-45fa-a668-7c90db326807','152','90','73','36.5','93', '95','71.3','Juliana Delgado','Tarde', '2026-04-29 19:35:00+00'),
  ('24590a06-43a5-4042-98c4-71fc01f3b2b2','126','78','68','36.3','98','100','57.8','Fabian Melo',   'Mañana','2026-04-29 13:40:00+00'),
  ('24590a06-43a5-4042-98c4-71fc01f3b2b2','129','81','71','36.4','97','108','57.8','Juliana Delgado','Tarde', '2026-04-29 19:40:00+00'),
  ('00f85a61-c233-443f-b749-2ba949d6c4b4','132','82','74','36.6','97','122','67.8','Fabian Melo',   'Mañana','2026-04-29 13:45:00+00'),
  ('00f85a61-c233-443f-b749-2ba949d6c4b4','136','83','76','36.7','96','128','67.8','Juliana Delgado','Tarde', '2026-04-29 19:45:00+00'),
  -- ── 2026-04-30 ───────────────────────────────────────────
  ('34fda2f7-88f8-4232-9913-2b0b675fed09','145','88','80','37.0','95','110','62.0','Juliana Delgado','Mañana','2026-04-30 13:30:00+00'),
  ('34fda2f7-88f8-4232-9913-2b0b675fed09','140','86','78','36.8','96','106','62.0','Fabian Melo',   'Tarde', '2026-04-30 19:30:00+00'),
  ('419de1ba-e4c9-45fa-a668-7c90db326807','153','90','71','36.5','94', '97','71.4','Juliana Delgado','Mañana','2026-04-30 13:35:00+00'),
  ('419de1ba-e4c9-45fa-a668-7c90db326807','148','88','73','36.6','94', '99','71.4','Fabian Melo',   'Tarde', '2026-04-30 19:35:00+00'),
  ('24590a06-43a5-4042-98c4-71fc01f3b2b2','124','76','67','36.2','98','102','57.9','Juliana Delgado','Mañana','2026-04-30 13:40:00+00'),
  ('24590a06-43a5-4042-98c4-71fc01f3b2b2','127','79','70','36.3','97','106','57.9','Fabian Melo',   'Tarde', '2026-04-30 19:40:00+00'),
  ('00f85a61-c233-443f-b749-2ba949d6c4b4','130','80','75','36.5','98','115','68.0','Juliana Delgado','Mañana','2026-04-30 13:45:00+00'),
  ('00f85a61-c233-443f-b749-2ba949d6c4b4','133','81','77','36.6','97','120','68.0','Fabian Melo',   'Tarde', '2026-04-30 19:45:00+00'),
  -- ── 2026-05-01 hoy — solo Tarde (Noche aún no vence) ─────
  ('34fda2f7-88f8-4232-9913-2b0b675fed09','143','87','79','36.9','95','109','62.0','Fabian Melo',   'Tarde', '2026-05-01 19:30:00+00'),
  ('419de1ba-e4c9-45fa-a668-7c90db326807','150','89','72','36.5','93', '96','71.5','Fabian Melo',   'Tarde', '2026-05-01 19:35:00+00'),
  ('24590a06-43a5-4042-98c4-71fc01f3b2b2','125','77','69','36.3','97','104','57.9','Fabian Melo',   'Tarde', '2026-05-01 19:40:00+00'),
  ('00f85a61-c233-443f-b749-2ba949d6c4b4','131','81','76','36.6','97','117','68.0','Fabian Melo',   'Tarde', '2026-05-01 19:45:00+00');

-- ─────────────────────────────────────────────────────────────
-- 4. ADMINISTRACIONES DE MEDICAMENTOS — 3 días × todos los medicamentos activos
-- Timestamps: 08:10 CO = 13:10 UTC, 20:05 CO = 01:05+1d UTC, 07:35 CO = 12:35 UTC
-- ─────────────────────────────────────────────────────────────
INSERT INTO administraciones_medicamento
  (medicamento_id, paciente_id, medicamento_nombre, dosis, firmante, notas, numero_dosis, total_diarias, created_at)
VALUES
  -- Rosa — Enalapril 5mg cada 12h
  ('aa000001-1000-0000-0000-000000000001','34fda2f7-88f8-4232-9913-2b0b675fed09','Enalapril','5 mg','Juliana Delgado','',1,2,'2026-04-28 13:10:00+00'),
  ('aa000001-1000-0000-0000-000000000001','34fda2f7-88f8-4232-9913-2b0b675fed09','Enalapril','5 mg','Fabian Melo',   '',2,2,'2026-04-29 01:10:00+00'),
  ('aa000001-1000-0000-0000-000000000001','34fda2f7-88f8-4232-9913-2b0b675fed09','Enalapril','5 mg','Fabian Melo',   '',1,2,'2026-04-29 13:10:00+00'),
  ('aa000001-1000-0000-0000-000000000001','34fda2f7-88f8-4232-9913-2b0b675fed09','Enalapril','5 mg','Juliana Delgado','',2,2,'2026-04-30 01:10:00+00'),
  ('aa000001-1000-0000-0000-000000000001','34fda2f7-88f8-4232-9913-2b0b675fed09','Enalapril','5 mg','Juliana Delgado','',1,2,'2026-04-30 13:10:00+00'),
  ('aa000001-1000-0000-0000-000000000001','34fda2f7-88f8-4232-9913-2b0b675fed09','Enalapril','5 mg','Fabian Melo',   '',2,2,'2026-05-01 01:10:00+00'),
  -- Rosa — Lorazepam 0.5mg nocturno
  ('aa000001-1000-0000-0000-000000000002','34fda2f7-88f8-4232-9913-2b0b675fed09','Lorazepam','0.5 mg','Fabian Melo','Paciente tranquila post-dosis',1,1,'2026-04-28 02:05:00+00'),
  ('aa000001-1000-0000-0000-000000000002','34fda2f7-88f8-4232-9913-2b0b675fed09','Lorazepam','0.5 mg','Fabian Melo','',1,1,'2026-04-29 02:05:00+00'),
  ('aa000001-1000-0000-0000-000000000002','34fda2f7-88f8-4232-9913-2b0b675fed09','Lorazepam','0.5 mg','Fabian Melo','',1,1,'2026-04-30 02:05:00+00'),
  -- Camilo — Atorvastatina 20mg nocturno
  ('aa000001-1000-0000-0000-000000000003','419de1ba-e4c9-45fa-a668-7c90db326807','Atorvastatina','20 mg','Fabian Melo',   '',1,1,'2026-04-28 01:05:00+00'),
  ('aa000001-1000-0000-0000-000000000003','419de1ba-e4c9-45fa-a668-7c90db326807','Atorvastatina','20 mg','Fabian Melo',   '',1,1,'2026-04-29 01:05:00+00'),
  ('aa000001-1000-0000-0000-000000000003','419de1ba-e4c9-45fa-a668-7c90db326807','Atorvastatina','20 mg','Juliana Delgado','',1,1,'2026-04-30 01:05:00+00'),
  -- Camilo — Omeprazol 20mg mañana
  ('aa000001-1000-0000-0000-000000000004','419de1ba-e4c9-45fa-a668-7c90db326807','Omeprazol','20 mg','Juliana Delgado','',1,1,'2026-04-28 12:35:00+00'),
  ('aa000001-1000-0000-0000-000000000004','419de1ba-e4c9-45fa-a668-7c90db326807','Omeprazol','20 mg','Fabian Melo',   '',1,1,'2026-04-29 12:35:00+00'),
  ('aa000001-1000-0000-0000-000000000004','419de1ba-e4c9-45fa-a668-7c90db326807','Omeprazol','20 mg','Juliana Delgado','',1,1,'2026-04-30 12:35:00+00'),
  -- Maria Camila — Acetaminofen
  ('1f86d681-219b-48ea-b569-5b7ad0274b74','24590a06-43a5-4042-98c4-71fc01f3b2b2','Acetaminofen','1 tableta (100mg)','Juliana Delgado','',1,1,'2026-04-28 13:50:00+00'),
  ('1f86d681-219b-48ea-b569-5b7ad0274b74','24590a06-43a5-4042-98c4-71fc01f3b2b2','Acetaminofen','1 tableta (100mg)','Fabian Melo',   '',1,1,'2026-04-29 13:50:00+00'),
  ('1f86d681-219b-48ea-b569-5b7ad0274b74','24590a06-43a5-4042-98c4-71fc01f3b2b2','Acetaminofen','1 tableta (100mg)','Juliana Delgado','',1,1,'2026-04-30 13:50:00+00'),
  -- Maria Camila — Calcio+VitD cada 12h
  ('aa000001-1000-0000-0000-000000000005','24590a06-43a5-4042-98c4-71fc01f3b2b2','Calcio + Vitamina D','500 mg/400 UI','Juliana Delgado','',1,2,'2026-04-28 13:55:00+00'),
  ('aa000001-1000-0000-0000-000000000005','24590a06-43a5-4042-98c4-71fc01f3b2b2','Calcio + Vitamina D','500 mg/400 UI','Fabian Melo',   '',2,2,'2026-04-29 01:55:00+00'),
  ('aa000001-1000-0000-0000-000000000005','24590a06-43a5-4042-98c4-71fc01f3b2b2','Calcio + Vitamina D','500 mg/400 UI','Fabian Melo',   '',1,2,'2026-04-29 13:55:00+00'),
  ('aa000001-1000-0000-0000-000000000005','24590a06-43a5-4042-98c4-71fc01f3b2b2','Calcio + Vitamina D','500 mg/400 UI','Juliana Delgado','',2,2,'2026-04-30 01:55:00+00'),
  ('aa000001-1000-0000-0000-000000000005','24590a06-43a5-4042-98c4-71fc01f3b2b2','Calcio + Vitamina D','500 mg/400 UI','Juliana Delgado','',1,2,'2026-04-30 13:55:00+00'),
  ('aa000001-1000-0000-0000-000000000005','24590a06-43a5-4042-98c4-71fc01f3b2b2','Calcio + Vitamina D','500 mg/400 UI','Fabian Melo',   '',2,2,'2026-05-01 01:55:00+00'),
  -- Julián — Acetaminofen
  ('2acbfc95-1a25-4329-8bf9-9b0a84aecd5c','00f85a61-c233-443f-b749-2ba949d6c4b4','Acetaminofen','2 tabletas (200mg)','Juliana Delgado','',1,1,'2026-04-28 13:55:00+00'),
  ('2acbfc95-1a25-4329-8bf9-9b0a84aecd5c','00f85a61-c233-443f-b749-2ba949d6c4b4','Acetaminofen','2 tabletas (200mg)','Fabian Melo',   '',1,1,'2026-04-29 13:55:00+00'),
  ('2acbfc95-1a25-4329-8bf9-9b0a84aecd5c','00f85a61-c233-443f-b749-2ba949d6c4b4','Acetaminofen','2 tabletas (200mg)','Juliana Delgado','',1,1,'2026-04-30 13:55:00+00'),
  -- Julián — Donepezil 10mg nocturno
  ('aa000001-1000-0000-0000-000000000006','00f85a61-c233-443f-b749-2ba949d6c4b4','Donepezil','10 mg','Fabian Melo','Paciente algo agitado previo. Dosis administrada sin rechazo.',1,1,'2026-04-28 02:05:00+00'),
  ('aa000001-1000-0000-0000-000000000006','00f85a61-c233-443f-b749-2ba949d6c4b4','Donepezil','10 mg','Fabian Melo','',1,1,'2026-04-29 02:05:00+00'),
  ('aa000001-1000-0000-0000-000000000006','00f85a61-c233-443f-b749-2ba949d6c4b4','Donepezil','10 mg','Juliana Delgado','',1,1,'2026-04-30 02:05:00+00');

-- ─────────────────────────────────────────────────────────────
-- 5. REGISTROS MÉDICOS (2 por paciente)
-- ─────────────────────────────────────────────────────────────
INSERT INTO registros_medicos (paciente_id, tipo, titulo, descripcion, registrado_por, created_at) VALUES
  ('34fda2f7-88f8-4232-9913-2b0b675fed09','Diagnóstico','Hipertensión arterial estadío 2',
   'Paciente con presión sostenida por encima de 140/90 mmHg. Se ajusta Enalapril 5 mg cada 12 h. Control en 15 días. Restricción de sodio en dieta.',
   'Juliana Delgado','2026-04-15 14:00:00+00'),
  ('34fda2f7-88f8-4232-9913-2b0b675fed09','Observación','Protocolo cambios posturales',
   'Se indica cambio postural cada 2 horas para prevención de úlceras por presión (escala Braden 11). Paciente tolera bien los cambios con asistencia de dos personas.',
   'Fabian Melo','2026-04-22 13:30:00+00'),

  ('419de1ba-e4c9-45fa-a668-7c90db326807','Diagnóstico','Dislipidemia e hipertensión arterial',
   'Perfil lipídico: colesterol total 220 mg/dl, LDL 145 mg/dl. Inicio de atorvastatina 20 mg. Dieta baja en grasas saturadas y restricción de sal.',
   'Juliana Delgado','2026-04-10 14:00:00+00'),
  ('419de1ba-e4c9-45fa-a668-7c90db326807','Nota','Control mensual de signos vitales',
   'Paciente estable. Presión arterial ligeramente elevada en controles matutinos (155/92). Se recomienda reforzar restricción de sal y continuar Omeprazol como protector gástrico.',
   'Fabian Melo','2026-04-25 19:30:00+00'),

  ('24590a06-43a5-4042-98c4-71fc01f3b2b2','Diagnóstico','Displasia de cadera bilateral - seguimiento',
   'Antecedente de displasia de cadera bilateral. Fisioterapia 3 veces por semana. Evitar bipedestación prolongada. Suplemento de Calcio + VitD iniciado.',
   'Juliana Delgado','2026-04-08 14:00:00+00'),
  ('24590a06-43a5-4042-98c4-71fc01f3b2b2','Procedimiento','Curación lesión presión talón derecho',
   'Lesión grado I en talón derecho de 2 cm de diámetro. Curación con apósito hidrocoloide. Próxima revisión en 48 h. Educar a familia sobre prevención.',
   'Fabian Melo','2026-04-27 14:00:00+00'),

  ('00f85a61-c233-443f-b749-2ba949d6c4b4','Diagnóstico','Enfermedad de Alzheimer estadío moderado',
   'Deterioro cognitivo moderado. Desorientación temporal frecuente. Episodios de agitación nocturna. Inicio Donepezil 10 mg/noche. Seguimiento mensual neurología.',
   'Juliana Delgado','2026-04-05 14:00:00+00'),
  ('00f85a61-c233-443f-b749-2ba949d6c4b4','Nota','Evaluación conductual mensual',
   'Episodios de agitación nocturna reducidos desde inicio del tratamiento. Familia informa mejoría en reconocimiento de personas cercanas. Continuar plan actual.',
   'Fabian Melo','2026-04-28 14:00:00+00');

-- ─────────────────────────────────────────────────────────────
-- 6. NOTAS DE EVOLUCIÓN (6 registros)
-- ─────────────────────────────────────────────────────────────
INSERT INTO notas_evolucion (paciente_id, texto, usuario_id, usuario_nombre, turno, estado_paciente, created_at) VALUES
  ('34fda2f7-88f8-4232-9913-2b0b675fed09',
   'Paciente estable. Toleró bien los cambios posturales. Ingesta de líquidos adecuada: 1 200 ml. Sin quejas de dolor. Piel íntegra en zonas de presión.',
   '05ec53a7-9af0-4f3a-b462-2f528af9e4e5','Juliana Delgado','mañana','estable','2026-04-29 14:00:00+00'),
  ('34fda2f7-88f8-4232-9913-2b0b675fed09',
   'SpO2 en 92% en toma matutina. Se realizó aspiración de secreciones nasofaríngeas. SpO2 mejoró a 95% en 20 minutos. Médico notificado telefónicamente.',
   'c230c084-f18a-4c99-b5b4-41031212987a','Fabian Melo','noche','regular','2026-04-29 07:30:00+00'),

  ('419de1ba-e4c9-45fa-a668-7c90db326807',
   'Paciente orientado en persona. Conversación fluida. Excelente apetito en almuerzo. PA 155/92 en control matutino, se informa al médico. Pendiente ajuste de medicación.',
   '05ec53a7-9af0-4f3a-b462-2f528af9e4e5','Juliana Delgado','mañana','estable','2026-04-30 14:00:00+00'),

  ('24590a06-43a5-4042-98c4-71fc01f3b2b2',
   'Paciente colaboradora. Realizó ejercicios de fisioterapia sin inconvenientes. Lesión en talón con evolución favorable, sin signos de infección. Estado anímico positivo.',
   '05ec53a7-9af0-4f3a-b462-2f528af9e4e5','Juliana Delgado','mañana','estable','2026-04-30 14:05:00+00'),

  ('00f85a61-c233-443f-b749-2ba949d6c4b4',
   'Episodio de agitación nocturna entre 02:00 y 03:00. Paciente desorientado, intentó salir de la habitación. Se acompañó y se utilizó música como intervención no farmacológica. Se calmó progresivamente. Durmió desde las 03:30.',
   'c230c084-f18a-4c99-b5b4-41031212987a','Fabian Melo','noche','regular','2026-04-29 08:00:00+00'),
  ('00f85a61-c233-443f-b749-2ba949d6c4b4',
   'Visita de hija y nietos por la tarde. Paciente reconoció a todos los familiares. Muy buen estado anímico. Acepta medicación sin resistencia. Almuerzo completo.',
   '05ec53a7-9af0-4f3a-b462-2f528af9e4e5','Juliana Delgado','tarde','estable','2026-04-30 19:30:00+00');

-- ─────────────────────────────────────────────────────────────
-- 7. EVALUACIONES CLÍNICAS (Barthel + Braden por paciente)
-- ─────────────────────────────────────────────────────────────
INSERT INTO evaluaciones_clinicas (paciente_id, tipo, puntuacion, items, observaciones, evaluado_por, created_at) VALUES
  -- Rosa — Barthel 25: dependencia severa (sin motricidad)
  ('34fda2f7-88f8-4232-9913-2b0b675fed09','barthel', 25,
   '{"comida":5,"bano":0,"aseo":0,"vestido":5,"intestino":5,"vejiga":5,"deposicion":0,"deambulacion":0,"subir_escaleras":0,"traslado":5}',
   'Dependencia severa. Requiere asistencia total para movilización, aseo y traslados.',
   'Juliana Delgado','2026-04-15 15:00:00+00'),
  -- Rosa — Braden 11: alto riesgo úlceras
  ('34fda2f7-88f8-4232-9913-2b0b675fed09','braden', 11,
   '{"percepcion_sensorial":2,"humedad":2,"actividad":1,"movilidad":1,"nutricion":2,"friccion_cizalla":3}',
   'Alto riesgo de úlceras por presión. Cambios posturales cada 2 h obligatorios. Superficies anti-escaras.',
   'Juliana Delgado','2026-04-15 15:30:00+00'),

  -- Camilo — Barthel 60: dependencia moderada
  ('419de1ba-e4c9-45fa-a668-7c90db326807','barthel', 60,
   '{"comida":10,"bano":0,"aseo":5,"vestido":5,"intestino":10,"vejiga":10,"deposicion":5,"deambulacion":5,"subir_escaleras":5,"traslado":5}',
   'Dependencia moderada. Deambula con bastón. Necesita ayuda parcial para baño y vestido.',
   'Fabian Melo','2026-04-12 15:00:00+00'),
  -- Camilo — Braden 15: riesgo moderado
  ('419de1ba-e4c9-45fa-a668-7c90db326807','braden', 15,
   '{"percepcion_sensorial":3,"humedad":3,"actividad":2,"movilidad":2,"nutricion":3,"friccion_cizalla":2}',
   'Riesgo moderado. Vigilar nutrición e hidratación. Cambios posturales supervisados.',
   'Fabian Melo','2026-04-12 15:30:00+00'),

  -- Maria Camila — Barthel 70: dependencia leve-moderada
  ('24590a06-43a5-4042-98c4-71fc01f3b2b2','barthel', 70,
   '{"comida":10,"bano":5,"aseo":5,"vestido":10,"intestino":10,"vejiga":10,"deposicion":10,"deambulacion":5,"subir_escaleras":5,"traslado":0}',
   'Dependencia leve-moderada. Limitación para desplazamiento autónomo por displasia de cadera.',
   'Juliana Delgado','2026-04-10 15:00:00+00'),
  -- Maria Camila — Braden 18: bajo riesgo
  ('24590a06-43a5-4042-98c4-71fc01f3b2b2','braden', 18,
   '{"percepcion_sensorial":4,"humedad":4,"actividad":3,"movilidad":3,"nutricion":4,"friccion_cizalla":0}',
   'Riesgo bajo. Mantener movilización controlada. Control de lesión en talón.',
   'Juliana Delgado','2026-04-10 15:30:00+00'),

  -- Julián — Barthel 65: dependencia moderada
  ('00f85a61-c233-443f-b749-2ba949d6c4b4','barthel', 65,
   '{"comida":10,"bano":0,"aseo":5,"vestido":10,"intestino":10,"vejiga":5,"deposicion":10,"deambulacion":10,"subir_escaleras":5,"traslado":0}',
   'Dependencia moderada. Deambula solo pero requiere supervisión constante por deterioro cognitivo.',
   'Fabian Melo','2026-04-08 15:00:00+00'),
  -- Julián — Braden 17: riesgo bajo-moderado
  ('00f85a61-c233-443f-b749-2ba949d6c4b4','braden', 17,
   '{"percepcion_sensorial":3,"humedad":3,"actividad":3,"movilidad":3,"nutricion":4,"friccion_cizalla":1}',
   'Riesgo bajo-moderado. Vigilar cambios de conducta. Monitorear presencia de lesiones cutáneas.',
   'Fabian Melo','2026-04-08 15:30:00+00');

-- ─────────────────────────────────────────────────────────────
-- 8. REGISTROS DE DIETA (6 registros)
-- ─────────────────────────────────────────────────────────────
INSERT INTO registros_dieta (paciente_id, tipo, descripcion, porcentaje_consumido, apetito, liquidos_ml, observaciones, registrado_por, created_at) VALUES
  ('34fda2f7-88f8-4232-9913-2b0b675fed09','almuerzo','Sopa de verduras triturada, puré de papa, flan de vainilla',
   85,'regular',350,'Dificultad leve para tragar sólidos. Se adapta textura a triturada.','Fabian Melo',   '2026-04-30 18:00:00+00'),
  ('419de1ba-e4c9-45fa-a668-7c90db326807','almuerzo','Arroz con pollo, ensalada blanda, fruta de temporada',
   100,'bueno',400,'Excelente apetito. Solicitó más postre.','Juliana Delgado','2026-04-30 18:05:00+00'),
  ('24590a06-43a5-4042-98c4-71fc01f3b2b2','almuerzo','Lentejas, pan blando, compota de manzana',
   90,'bueno',300,'Come bien. Refiere que le gustan las lentejas.','Juliana Delgado','2026-04-30 18:10:00+00'),
  ('00f85a61-c233-443f-b749-2ba949d6c4b4','almuerzo','Caldo de pollo, pollo mechado, arroz blanco',
   70,'regular',250,'Come despacio, requiere supervisión. Rechazó postre. Distraído durante la comida.','Fabian Melo','2026-04-30 18:15:00+00'),
  ('34fda2f7-88f8-4232-9913-2b0b675fed09','desayuno','Avena con leche, galletas blandas',
   75,'regular',200,'Acepta bien la avena. Negó las galletas.','Juliana Delgado','2026-05-01 13:00:00+00'),
  ('419de1ba-e4c9-45fa-a668-7c90db326807','desayuno','Café con leche, tostadas con mantequilla y mermelada',
   100,'bueno',350,'Sin novedades. Come de forma independiente.','Juliana Delgado','2026-05-01 13:05:00+00');

-- ─────────────────────────────────────────────────────────────
-- 9. INCIDENTES (2 registros)
-- ─────────────────────────────────────────────────────────────
INSERT INTO incidentes (paciente_id, tipo, descripcion, lugar, consecuencias, testigos, acciones_tomadas, registrado_por, created_at) VALUES
  ('34fda2f7-88f8-4232-9913-2b0b675fed09','caída',
   'Paciente intentó levantarse de la silla de ruedas sin asistencia y se deslizó hacia el lado izquierdo.',
   'Habitación 104',
   'Hematoma leve en brazo derecho. No requirió sutura ni Rx.',
   'Adriana Paez',
   'Aplicación de hielo 20 minutos. Evaluación de enfermería. Médico notificado. Familia informada. Se reforzó protocolo de supervisión constante.',
   'Fabian Melo','2026-04-25 20:00:00+00'),
  ('00f85a61-c233-443f-b749-2ba949d6c4b4','comportamiento',
   'Paciente salió de la habitación desorientado a las 03:00 intentando forzar la puerta de salida del hogar.',
   'Pasillo principal',
   'Sin lesiones físicas. Paciente angustiado.',
   'Fabian Melo',
   'Acompañamiento de regreso a su habitación. Reorientación verbal. Música ambiental como intervención no farmacológica. Familiar notificado. Se evalúa ajuste de medicación con médico.',
   'Fabian Melo','2026-04-26 08:00:00+00');

-- ─────────────────────────────────────────────────────────────
-- 10. LIMPIEZAS (4 registros)
-- ─────────────────────────────────────────────────────────────
INSERT INTO limpiezas (paciente_id, tipo, descripcion, realizado_por, observaciones, created_at) VALUES
  ('34fda2f7-88f8-4232-9913-2b0b675fed09','Habitación',
   'Limpieza completa habitación 104: pisos, superficies, baño y cambio de ropa de cama.',
   'Adriana Paez','','2026-04-30 14:00:00+00'),
  ('419de1ba-e4c9-45fa-a668-7c90db326807','Habitación',
   'Limpieza habitación 103. Cambio de sábanas y almohadas. Desinfección de baño.',
   'Adriana Paez','Se retiró vaso de vidrio roto encontrado bajo la cama.','2026-04-30 14:30:00+00'),
  (NULL,'Zona común',
   'Limpieza y desinfección de sala de estar y comedor. Mesas, sillas y piso.',
   'Adriana Paez','','2026-04-30 15:00:00+00'),
  (NULL,'Baño',
   'Desinfección completa de baño compartido pasillo principal. Reposición de insumos.',
   'Adriana Paez','','2026-05-01 14:00:00+00');

-- ─────────────────────────────────────────────────────────────
-- 11. ACTIVIDADES (4 registros)
-- ─────────────────────────────────────────────────────────────
INSERT INTO actividades (paciente_id, tipo, nombre, descripcion, realizado_por, created_at) VALUES
  ('419de1ba-e4c9-45fa-a668-7c90db326807','Lúdica','Juego de dominó',
   'Participó en partida de dominó con otros residentes. Mostró agilidad mental y buen humor. Ganó 2 de 3 partidas.',
   'Juliana Delgado','2026-04-29 20:00:00+00'),
  ('24590a06-43a5-4042-98c4-71fc01f3b2b2','Física','Sesión de fisioterapia',
   'Movilización de miembro inferior: flexo-extensión de rodilla y cadera. 20 minutos. Tolerancia buena, sin dolor referido.',
   'Juliana Delgado','2026-04-30 15:00:00+00'),
  ('00f85a61-c233-443f-b749-2ba949d6c4b4','Social','Visita familiar',
   'Visita de hija y dos nietos. Duración 2 horas. Paciente reconoció y nombró a todos. Estado anímico muy positivo post-visita.',
   'Fabian Melo','2026-04-30 21:00:00+00'),
  ('34fda2f7-88f8-4232-9913-2b0b675fed09','Cultural','Musicoterapia colombiana',
   'Se reprodujo música colombiana de los años 60-70 durante 45 minutos. Paciente cantó partes de varias canciones. Excelente respuesta emocional y cognitiva.',
   'Fabian Melo','2026-04-29 20:30:00+00');

-- ─────────────────────────────────────────────────────────────
-- 12. MOVIMIENTOS DE INVENTARIO
-- ─────────────────────────────────────────────────────────────
INSERT INTO inventario_movimientos (insumo_id, insumo_nombre, tipo, cantidad, stock_antes, stock_despues, usuario_nombre, patient_name, created_at) VALUES
  ('bb000001-0000-0000-0000-000000000001','Gasas estériles 10x10 cm','entrada',100, 0,100,'Administrator Hogar',NULL,'2026-04-20 14:00:00+00'),
  ('bb000001-0000-0000-0000-000000000001','Gasas estériles 10x10 cm','salida',  20,100, 80,'Fabian Melo','Maria Camila Ríos Gómez','2026-04-27 14:10:00+00'),
  ('bb000001-0000-0000-0000-000000000003','Guantes de nitrilo talla M','entrada',150,  0,150,'Administrator Hogar',NULL,'2026-04-20 14:05:00+00'),
  ('bb000001-0000-0000-0000-000000000003','Guantes de nitrilo talla M','salida',  30,150,120,'Juliana Delgado',NULL,'2026-04-28 13:00:00+00'),
  ('bb000001-0000-0000-0000-000000000004','Pañales adulto talla G',   'salida',  10, 50, 40,'Juliana Delgado','Rosa Andrea Melano García','2026-04-28 13:10:00+00');

-- ─────────────────────────────────────────────────────────────
-- 13. CITAS MÉDICAS (4 registros)
-- ─────────────────────────────────────────────────────────────
INSERT INTO citas_medicas (paciente_id, especialidad, medico, fecha, hora, lugar, observaciones, estado, created_at) VALUES
  ('34fda2f7-88f8-4232-9913-2b0b675fed09','Cardiología',    'Dr. Ramírez Ochoa','2026-05-06','10:00',
   'Clínica Los Cedros — Consultorio 3','Control hipertensión y revisión medicación. Traslado en silla de ruedas.','pendiente','2026-04-28 14:00:00+00'),
  ('419de1ba-e4c9-45fa-a668-7c90db326807','Medicina General','Dr. Vargas',      '2026-04-30','09:00',
   'Hogar — Visita médica','Control mensual de rutina. Revisar PA y lípidos.','realizada','2026-04-25 14:00:00+00'),
  ('24590a06-43a5-4042-98c4-71fc01f3b2b2','Traumatología',  'Dra. Torres',      '2026-05-08','11:30',
   'Clínica San Pedro — Piso 2','Seguimiento displasia de cadera. Traslado en ambulancia. Ayuno previo no requerido.','pendiente','2026-04-29 14:00:00+00'),
  ('00f85a61-c233-443f-b749-2ba949d6c4b4','Neurología',     'Dr. Ospina Ruiz',  '2026-05-10','09:30',
   'Clínica Los Cedros — Neurología','Control Alzheimer y ajuste de Donepezil. Llevar registro de episodios de agitación.','pendiente','2026-04-28 14:00:00+00');

-- ─────────────────────────────────────────────────────────────
-- 14. HANDOVER — traspaso de turno (3 registros)
-- ─────────────────────────────────────────────────────────────
INSERT INTO handover (usuario_id, usuario_nombre, turno, fecha, novedades, medicamentos_eventos, pendientes_proximo_turno, created_at) VALUES
  ('05ec53a7-9af0-4f3a-b462-2f528af9e4e5','Juliana Delgado','mañana','2026-04-30',
   'Rosa Andrea con SpO2 95 estable luego de aspiración nocturna. Camilo con PA elevada 155/92, médico informado. Maria Camila toleró fisioterapia sin dolor. Julián cooperativo y tranquilo.',
   'Todos los medicamentos del turno mañana administrados sin inconvenientes.',
   'Verificar SpO2 de Rosa en toma de tarde. Pendiente segunda curación talón Maria Camila. Vigilar conducta de Julián en noche.',
   '2026-04-30 18:00:00+00'),
  ('c230c084-f18a-4c99-b5b4-41031212987a','Fabian Melo','tarde','2026-04-30',
   'Turno sin novedades mayores. SpO2 Rosa 96 en toma de tarde. Camilo tranquilo y comió bien. Cena completa para todos. Visita familiar a Julián.',
   'Dosis nocturnas pendientes: Lorazepam (Rosa), Atorvastatina (Camilo), Donepezil (Julián).',
   'Julián puede presentar agitación nocturna según patrón. Vigilar. Rosa requiere cambio postural 22:00.',
   '2026-05-01 01:00:00+00'),
  ('c230c084-f18a-4c99-b5b4-41031212987a','Fabian Melo','noche','2026-05-01',
   'Julián agitado 02:00-03:00. Se intervino con música. Se calmó solo. Rosa durmió bien, cambios posturales realizados. Camilo y Maria Camila sin novedades.',
   'Dosis nocturnas administradas: Lorazepam 0.5mg (Rosa 21:05), Atorvastatina 20mg (Camilo 21:00), Donepezil 10mg (Julián 21:10).',
   'Continuar monitoreo signos vitales toma Mañana para los 4 pacientes. Revisar PA de Camilo.',
   '2026-05-01 13:00:00+00');

-- ─────────────────────────────────────────────────────────────
-- 15. MENSAJES INTERNOS (3 registros)
-- ─────────────────────────────────────────────────────────────
INSERT INTO mensajes_internos (autor_id, autor_nombre, titulo, cuerpo, para_rol, created_at) VALUES
  ('5bd6a20a-a865-4749-a071-db3488010375','Administrator Hogar',
   'Citas médicas mayo — coordinación transporte',
   'Esta semana hay 3 citas programadas. Confirmar transporte: Rosa Andrea (Cardiología 6/5, silla de ruedas), Maria Camila (Traumatología 8/5, ambulancia), Julián Andrés (Neurología 10/5, acompañante familiar). Comunicar a familias con 2 días de anticipación.',
   'enfermero','2026-04-28 14:00:00+00'),
  ('5bd6a20a-a865-4749-a071-db3488010375','Administrator Hogar',
   'Protocolo de insumos — pañales talla G',
   'A partir de esta semana los pañales talla G son exclusivos para habitaciones 101 y 104. Registrar consumo diario en el parte de turno. Stock actual: 40 unidades.',
   'todos','2026-04-25 14:00:00+00'),
  ('05ec53a7-9af0-4f3a-b462-2f528af9e4e5','Juliana Delgado',
   'Actualización curación Maria Camila — Hab 102',
   'Lesión en talón derecho con evolución favorable. Sin signos de infección. Segunda curación programada para mañana 09:00. Dejar preparados: gasas 10x10, apósito hidrocoloide 5x5 y solución salina.',
   'enfermero','2026-04-28 19:00:00+00');

-- ─────────────────────────────────────────────────────────────
-- 16. AUDITORÍA (6 registros)
-- ─────────────────────────────────────────────────────────────
INSERT INTO auditoria (usuario_id, usuario_nombre, accion, entidad, entidad_id, detalle, created_at) VALUES
  ('05ec53a7-9af0-4f3a-b462-2f528af9e4e5','Juliana Delgado','crear','signos_vitales',NULL,
   'Registro toma Mañana — Rosa Andrea Melano García','2026-04-30 13:32:00+00'),
  ('c230c084-f18a-4c99-b5b4-41031212987a','Fabian Melo','crear','signos_vitales',NULL,
   'Registro toma Tarde — Camilo Pérez Maíz','2026-04-30 19:37:00+00'),
  ('05ec53a7-9af0-4f3a-b462-2f528af9e4e5','Juliana Delgado','crear','registros_medicos',NULL,
   'Nuevo procedimiento: Curación lesión talón — Maria Camila Ríos Gómez','2026-04-27 14:05:00+00'),
  ('5bd6a20a-a865-4749-a071-db3488010375','Administrator Hogar','crear','citas_medicas',NULL,
   'Nueva cita Cardiología — Rosa Andrea Melano García — 06/05/2026','2026-04-28 14:02:00+00'),
  ('05ec53a7-9af0-4f3a-b462-2f528af9e4e5','Juliana Delgado','crear','incidentes',NULL,
   'Caída registrada — Rosa Andrea Melano García — Hab 104','2026-04-25 20:05:00+00'),
  ('5bd6a20a-a865-4749-a071-db3488010375','Administrator Hogar','crear','inventario',NULL,
   'Ingreso 100 unidades — Gasas estériles 10x10 cm','2026-04-20 14:01:00+00');
