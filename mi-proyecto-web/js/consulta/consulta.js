import { sql } from '../config/neon-config.js';
import { exigirSesion } from '../auth/auth.js';
import { escapar, formatearMoneda, formatearFechaISO } from '../config/utils.js';

const usuario = exigirSesion(['cliente']);

export async function listarMisRegistros() {
  return await sql`
    SELECT id, codigo_seguimiento, nombre_contacto, direccion, distrito, sede_atencion,
           to_char(fecha_entrega, 'YYYY-MM-DD') AS fecha_entrega, franja_horaria, metodo_pago,
           detalle_pedido, total::float AS total, estado,
           to_char(fecha_registro, 'DD/MM/YYYY HH24:MI') AS fecha_txt
    FROM pedidos_delivery_megamercado
    WHERE id_usuario = ${usuario.id}
    ORDER BY fecha_registro DESC, id DESC;
  `;
}

const lista = document.getElementById('listaPedidos');
const filtro = document.getElementById('filtroEstado');
const aviso = document.getElementById('avisoError');
const conteo = document.getElementById('conteo');
let pedidos = [];

function tarjeta(p) {
  const editable = p.estado === 'registrado';
  return `<article class="pedido-card pedido-card--${p.estado}">
    <div>
      <h2>${escapar(p.codigo_seguimiento)} <span class="estado estado--${p.estado}">${escapar(p.estado)}</span></h2>
      <p class="meta">Registrado el ${escapar(p.fecha_txt)} · ${escapar(p.sede_atencion)}</p>
      <p>${escapar(p.detalle_pedido)}</p>
      <p class="meta">Entrega ${formatearFechaISO(p.fecha_entrega)}, ${escapar(p.franja_horaria)} · ${escapar(p.direccion)}, ${escapar(p.distrito)} · Pago: ${escapar(p.metodo_pago)}</p>
    </div>
    <div class="pedido-card__lado">
      <span class="pedido-card__total">${formatearMoneda(p.total)}</span>
      <a class="btn btn--chico ${editable ? '' : 'btn--borde'}" href="actualizar.html?id=${p.id}">${editable ? 'Editar pedido' : 'Ver detalle'}</a>
    </div>
  </article>`;
}

function pintar() {
  const visibles = filtro.value ? pedidos.filter((p) => p.estado === filtro.value) : pedidos;
  conteo.textContent = `${visibles.length} ${visibles.length === 1 ? 'pedido' : 'pedidos'}`;
  if (!visibles.length) {
    lista.innerHTML = `<div class="vacio"><p>${pedidos.length ? 'No tienes pedidos con ese estado.' : 'Todavía no tienes pedidos.'}</p><a class="btn" href="catalogo.html">Hacer mi primer pedido</a></div>`;
    return;
  }
  lista.innerHTML = visibles.map(tarjeta).join('');
}

filtro.addEventListener('change', pintar);
try {
  pedidos = await listarMisRegistros();
  pintar();
} catch (err) {
  console.error(err);
  lista.innerHTML = '';
  aviso.textContent = 'No pudimos cargar tus pedidos. Actualiza la página o inténtalo más tarde.';
  aviso.hidden = false;
}
