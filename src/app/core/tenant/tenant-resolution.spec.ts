import { describe, expect, it } from 'vitest';
import { resolverTenant } from './tenant-resolution';

const RAIZ = 'nupcialis.com';

describe('resolverTenant', () => {
  it('resuelve la boda desde su subdominio', () => {
    expect(resolverTenant('mariaygabriel.nupcialis.com', RAIZ)).toEqual({
      superficie: 'boda',
      slug: 'mariaygabriel',
    });
  });

  it('el dominio raíz y www son la landing', () => {
    expect(resolverTenant('nupcialis.com', RAIZ).superficie).toBe('landing');
    expect(resolverTenant('www.nupcialis.com', RAIZ).superficie).toBe('landing');
  });

  it('admin es el panel de superadmin, no una boda', () => {
    expect(resolverTenant('admin.nupcialis.com', RAIZ)).toEqual({
      superficie: 'superadmin',
      slug: null,
    });
  });

  it('un subdominio reservado no se convierte en boda', () => {
    // Si esto fallara, alguien podría montar una "boda" en soporte.nupcialis.com
    // y suplantar a la plataforma.
    expect(resolverTenant('soporte.nupcialis.com', RAIZ).superficie).toBe('reservado');
    expect(resolverTenant('pagos.nupcialis.com', RAIZ).slug).toBeNull();
  });

  it('no inventa un tenant con subdominios anidados', () => {
    expect(resolverTenant('a.b.nupcialis.com', RAIZ).superficie).toBe('desconocido');
  });

  it('no resuelve hosts ajenos al dominio raíz', () => {
    expect(resolverTenant('mariaygabriel.otrodominio.com', RAIZ).superficie).toBe('desconocido');
    // El caso malicioso: un dominio que TERMINA parecido pero no cuelga del raíz.
    expect(resolverTenant('malonupcialis.com', RAIZ).superficie).toBe('desconocido');
    expect(resolverTenant('nupcialis.com.malo.net', RAIZ).superficie).toBe('desconocido');
  });

  it('ignora mayúsculas, puerto y punto final', () => {
    expect(resolverTenant('MariaYGabriel.Nupcialis.COM', RAIZ).slug).toBe('mariaygabriel');
    expect(resolverTenant('mariaygabriel.nupcialis.com:4200', RAIZ).slug).toBe('mariaygabriel');
    // El punto final es un FQDN válido y algunos clientes lo mandan así.
    expect(resolverTenant('mariaygabriel.nupcialis.com.', RAIZ).slug).toBe('mariaygabriel');
  });

  it('rechaza etiquetas con forma inválida', () => {
    expect(resolverTenant('-maria.nupcialis.com', RAIZ).superficie).toBe('desconocido');
    expect(resolverTenant('ab.nupcialis.com', RAIZ).superficie).toBe('desconocido');
  });

  describe('desarrollo en local', () => {
    it('localhost a secas es la landing', () => {
      expect(resolverTenant('localhost', 'localhost').superficie).toBe('landing');
      expect(resolverTenant('localhost:4200', 'localhost').superficie).toBe('landing');
    });

    it('resuelve la boda en localhost sin tocar el fichero hosts', () => {
      // Los navegadores resuelven *.localhost solos: esto permite probar el
      // multi-tenant en local sin infraestructura ninguna.
      expect(resolverTenant('mariaygabriel.localhost:4200', 'localhost')).toEqual({
        superficie: 'boda',
        slug: 'mariaygabriel',
      });
    });

    it('admin también funciona en local', () => {
      expect(resolverTenant('admin.localhost:4200', 'localhost').superficie).toBe('superadmin');
    });
  });
});
