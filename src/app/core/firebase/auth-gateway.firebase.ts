import { inject } from '@angular/core';
import {
  GoogleAuthProvider,
  onIdTokenChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { ErrorAuth, PuertaAuth } from '../auth/auth-gateway';
import { SESION_ANONIMA, sesionDesdeClaims } from '../auth/session';
import { FIREBASE_AUTH } from './auth.providers';

/** Traduce los códigos de Firebase a motivos que la interfaz sabe explicar. */
export function traducirErrorAuth(codigo: unknown): ErrorAuth {
  const c = typeof codigo === 'string' ? codigo : '';
  switch (c) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'credenciales-invalidas';
    case 'auth/user-disabled':
      return 'usuario-desactivado';
    case 'auth/too-many-requests':
      return 'demasiados-intentos';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'ventana-cerrada';
    case 'auth/network-request-failed':
      return 'sin-conexion';
    default:
      return 'desconocido';
  }
}

export function crearPuertaAuthFirebase(): PuertaAuth {
  const auth = inject(FIREBASE_AUTH);

  return {
    observar(alCambiar) {
      // onIdTokenChanged y no onAuthStateChanged: el segundo no se entera de que
      // han cambiado los claims, y aquí los claims son todo el sistema de
      // permisos. Sin esto, tras el alta habría que recargar la página a mano.
      return onIdTokenChanged(auth, async (usuario) => {
        if (!usuario) {
          alCambiar(SESION_ANONIMA);
          return;
        }
        const token = await usuario.getIdTokenResult();
        alCambiar(sesionDesdeClaims(usuario.uid, usuario.email, token.claims));
      });
    },

    async entrarConEmail(email, password) {
      await signInWithEmailAndPassword(auth, email, password);
    },

    /**
     * Acceso con Google, en ventana emergente.
     *
     * Emergente y no redirección a propósito: la redirección pierde el estado
     * de la página y, con el bloqueo de cookies de terceros de los navegadores
     * actuales, falla en más sitios de los que arregla.
     *
     * El servidor de desarrollo sirve
     * `Cross-Origin-Opener-Policy: same-origin-allow-popups` (ver
     * `angular.json`). Sin esa cabecera el navegador impide que la página lea
     * `window.closed` de la emergente, que es como el SDK detecta que la han
     * cerrado, y el acceso se queda colgado sin decir nada. En producción hay
     * que servir la misma cabecera.
     */
    async entrarConGoogle() {
      const proveedor = new GoogleAuthProvider();
      // Fuerza el selector de cuenta. Sin esto, quien tenga varias cuentas de
      // Google entra siempre con la última y no entiende por qué no ve su boda.
      proveedor.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, proveedor);
    },

    async enviarRecuperacion(email) {
      await sendPasswordResetEmail(auth, email);
    },

    async salir() {
      await signOut(auth);
    },

    async refrescarClaims() {
      await auth.currentUser?.getIdToken(true);
    },
  };
}
