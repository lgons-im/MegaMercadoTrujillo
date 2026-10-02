import { sql } from '../config/neon-config.js';
import { exigirSesion } from '../auth/auth.js';
import { PRODUCTOS, ENVIO_GRATIS_DESDE, COSTO_ENVIO } from '../config/productos.js';
import { leerCarrito, vaciarCarrito } from './carrito.js';
import { leerFormulario, validarPedido, mostrarErrores, formatearMoneda, hoyISO, escapar } from '../config/utils.js';

const usuario = exigirSesion(['cliente']);

export async function guardarRegistro(datos, idUsuario) {
  const codigo = 'COD-' + Date.now().toString().slice(-8);
  const filas = await sql`
    INSERT INTO pedidos_delivery_megamercado
      (codigo_seguimiento, id_usuario, nombre_contacto, telefono, direccion, distrito, referencia,
       sede_atencion, fecha_entrega, franja_horaria, metodo_pago, detalle_pedido, total, estado)
    VALUES
      (${codigo}, ${idUsuario}, ${datos.nombre_contacto}, ${datos.telefono}, ${datos.direccion}, ${datos.distrito}, ${datos.referencia || null},
       ${datos.sede_atencion}, ${datos.fecha_entrega}, ${datos.franja_horaria}, ${datos.metodo_pago}, ${datos.detalle_pedido}, ${datos.total}, 'registrado')
    RETURNING codigo_seguimiento;
  `;
  return filas[0].codigo_seguimiento;
}

const form = document.getElementById('formPedido');
const aviso = document.getElementById('avisoError');
const confirmacion = document.getElementById('confirmacion');
const resumen = document.getElementById('resumenPedido');

form.nombre_contacto.value = usuario.nombre;
form.fecha_entrega.min = hoyISO();
form.fecha_entrega.value = hoyISO();

const carrito = leerCarrito();
const lineas = PRODUCTOS.filter((p) => carrito[p.id]).map((p) => ({ p, n: carrito[p.id] }));
const subtotal = lineas.reduce((a, { p, n }) => a + p.precio * n, 0);
const envio = lineas.length === 0 ? 0 : subtotal >= ENVIO_GRATIS_DESDE ? 0 : COSTO_ENVIO;
const total = subtotal + envio;

if (lineas.length) {
  resumen.innerHTML = `
    <ul>${lineas.map(({ p, n }) => `<li><span>${n} × ${escapar(p.nombre)} <small>${escapar(p.presentacion)}</small></span><span>${formatearMoneda(p.precio * n)}</span></li>`).join('')}</ul>
    <dl>
      <div><dt>Productos</dt><dd>${formatearMoneda(subtotal)}</dd></div>
      <div><dt>Delivery</dt><dd>${envio ? formatearMoneda(envio) : 'Gratis'}</dd></div>
      <div class="total"><dt>Total</dt><dd>${formatearMoneda(total)}</dd></div>
    </dl>
    <small>Delivery gratis desde ${formatearMoneda(ENVIO_GRATIS_DESDE)}.</small>`;
  form.detalle_pedido.value = lineas.map(({ p, n }) => `${n} x ${p.nombre} (${p.presentacion})`).join('; ');
  form.total.value = total.toFixed(2);
} else {
  resumen.innerHTML = `<p class="vacio-msg">Tu pedido está vacío. Agrega productos desde el catálogo o escribe tu lista en el formulario.</p>
    <a class="btn btn--bloque" href="catalogo.html">Ir al catálogo</a>`;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  aviso.hidden = true;
  const datos = leerFormulario(form);
  const errores = validarPedido(datos);
  mostrarErrores(form, errores);
  if (Object.keys(errores).length) return;

  const boton = form.querySelector('button[type="submit"]');
  boton.disabled = true;
  try {
    const codigo = await guardarRegistro(datos, usuario.id);
    vaciarCarrito();
    form.closest('.pedido').hidden = true;
    document.getElementById('codigoGenerado').textContent = codigo;
    confirmacion.hidden = false;
    confirmacion.classList.add('exito'); // animación de confirmación (Semana 5)
    confirmacion.focus();
  } catch (err) {
    console.error(err);
    aviso.textContent = 'No pudimos guardar tu pedido. Revisa tu conexión e inténtalo otra vez.';
    aviso.hidden = false;
    boton.disabled = false;
  }
});
