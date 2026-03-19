create table facturas (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  cliente text not null,
  rut_cliente text,
  monto integer not null,  -- en pesos, sin decimales
  fecha_emision date not null,
  descripcion text,
  estado text default 'pendiente' check (estado in ('pendiente','pagado','parcial')),
  fecha_pago date,
  notas text,
  archivo_pdf text,
  created_at timestamptz default now()
);

create table clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  rut text,
  email text,
  telefono text,
  direccion text,
  created_at timestamptz default now()
);

-- Habilitar Row Level Security (RLS)
alter table facturas enable row level security;
alter table clientes enable row level security;

-- Crear políticas para usuario autenticado (solo el dueño)
create policy "Permitir todo a usuarios autenticados" on facturas for all to authenticated using (true);
create policy "Permitir todo a usuarios autenticados" on clientes for all to authenticated using (true);
