/**
 * Poner un correo en la cola de envío.
 *
 * Nupcialis **no envía** correos: escribe el correo ya montado en la colección
 * `mail`, y la extensión oficial de Firebase «Trigger Email from Firestore»
 * (`firestore-send-email`) lo manda con el SMTP que se le configure (D-53). Así
 * cambiar de proveedor de correo es cambiar la configuración de la extensión,
 * sin tocar código.
 *
 * Mientras la extensión no esté instalada, los documentos se quedan en `mail`
 * sin enviar: no se pierde nada y el superadmin sigue pudiendo copiar el enlace.
 */

import { FieldValue } from 'firebase-admin/firestore';

import {
  montarCorreo,
  plantillaEfectiva,
  type Datos,
  type IdPlantilla,
  type PlantillaDeCorreo,
} from '../dominio/correos';
import { db } from '../firebase';

/** La plantilla guardada, o la de fábrica si nunca se tocó (o está rota). */
export async function leerPlantilla(id: IdPlantilla): Promise<PlantillaDeCorreo> {
  const doc = await db().doc(`emailTemplates/${id}`).get();
  return plantillaEfectiva(id, doc.data());
}

export interface PedidoDeCorreo {
  readonly para: string;
  readonly plantilla: IdPlantilla;
  readonly datos: Datos;
  readonly weddingId: string | null;
}

/** Encola el correo. **Nunca lanza**: un correo que falla no tumba un alta. */
export async function encolarCorreo(pedido: PedidoDeCorreo): Promise<boolean> {
  try {
    const plantilla = await leerPlantilla(pedido.plantilla);
    const correo = montarCorreo(plantilla, plantilla.boton, pedido.datos);

    await db()
      .collection('mail')
      .add({
        to: [pedido.para],
        message: { subject: correo.asunto, text: correo.texto, html: correo.html },
        // Para saber de dónde salió; la extensión lo ignora. Sin el enlace: da
        // acceso a la cuenta y no tiene por qué quedarse escrito dos veces.
        meta: {
          plantilla: pedido.plantilla,
          weddingId: pedido.weddingId,
          createdAt: FieldValue.serverTimestamp(),
        },
      });
    return true;
  } catch (error) {
    console.error('No se pudo encolar el correo', pedido.plantilla, error);
    return false;
  }
}
