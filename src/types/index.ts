export type EstadoFactura = 'pendiente' | 'pagado' | 'parcial';

export interface Factura {
    id: string;
    numero: string;
    cliente: string;
    rut_cliente: string | null;
    monto: number;
    fecha_emision: string;
    descripcion: string | null;
    estado: EstadoFactura;
    fecha_pago: string | null;
    notas: string | null;
    archivo_pdf: string | null;
    created_at: string;
}

export interface Cliente {
    id: string;
    nombre: string;
    rut: string | null;
    email: string | null;
    telefono: string | null;
    direccion: string | null;
    created_at: string;
}
