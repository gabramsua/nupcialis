import { describe, expect, it } from 'vitest';

import type { TareaDelPanel } from '../checklist/tareas';
import type { PartidaDelPanel } from '../presupuesto/presupuesto';
import {
  idVigente,
  partidasDeProveedor,
  partidasLibres,
  proponerImportes,
  resolver,
  tareasEnlazadas,
  tareasLibres,
} from './enlaces';

const tarea = (p: Partial<TareaDelPanel> & { id: string }): TareaDelPanel => ({
  title: p.id,
  description: '',
  category: '',
  dueDate: null,
  done: false,
  doneAt: null,
  doneByUid: null,
  doneByEmail: null,
  assignedTo: 'both',
  vendorId: null,
  budgetItemId: null,
  priority: 'normal',
  icon: 'list-checks',
  order: 1,
  ...p,
});

const partida = (p: Partial<PartidaDelPanel> & { id: string }): PartidaDelPanel => ({
  category: 'Lugar',
  concept: p.id,
  estimatedCents: 0,
  actualCents: 0,
  paid: false,
  dueOn: null,
  notes: '',
  vendorId: null,
  order: 1,
  ...p,
});

describe('resolver e idVigente', () => {
  const lista = [{ id: 'a' }, { id: 'b' }];

  it('encuentra el elemento, o devuelve null si falta o no hay id', () => {
    expect(resolver(lista, 'b')).toEqual({ id: 'b' });
    expect(resolver(lista, 'zzz')).toBeNull();
    expect(resolver(lista, null)).toBeNull();
    expect(resolver(lista, '')).toBeNull();
  });

  it('un enlace roto se ve «sin enlace»: es lo que lleva el selector', () => {
    expect(idVigente(lista, 'a')).toBe('a');
    expect(idVigente(lista, 'borrado')).toBe('');
    expect(idVigente(lista, null)).toBe('');
  });
});

describe('tareas enlazadas', () => {
  const tareas = [
    tarea({ id: 'hecha', vendorId: 'v1', done: true }),
    tarea({ id: 'tarde', vendorId: 'v1', dueDate: new Date('2027-05-01T00:00:00Z') }),
    tarea({ id: 'pronto', vendorId: 'v1', dueDate: new Date('2027-03-01T00:00:00Z') }),
    tarea({ id: 'sinfecha', vendorId: 'v1' }),
    tarea({ id: 'otro', vendorId: 'v2' }),
    tarea({ id: 'partida', budgetItemId: 'p1' }),
  ];

  it('las de un proveedor: primero las abiertas, por fecha, y las hechas al final', () => {
    expect(tareasEnlazadas(tareas, 'vendorId', 'v1').map((t) => t.id)).toEqual([
      'pronto',
      'tarde',
      'sinfecha',
      'hecha',
    ]);
  });

  it('las de una partida salen por su propia clave', () => {
    expect(tareasEnlazadas(tareas, 'budgetItemId', 'p1').map((t) => t.id)).toEqual(['partida']);
    expect(tareasEnlazadas(tareas, 'budgetItemId', 'nada')).toEqual([]);
  });

  it('las que se pueden enlazar son las abiertas que no cuelgan de nada por esa clave', () => {
    expect(tareasLibres(tareas, 'vendorId').map((t) => t.id)).toEqual(['partida']);
    expect(tareasLibres(tareas, 'budgetItemId').map((t) => t.id)).not.toContain('partida');
    expect(tareasLibres(tareas, 'budgetItemId').map((t) => t.id)).not.toContain('hecha');
  });
});

describe('partidas de un proveedor', () => {
  const partidas = [
    partida({ id: 'a', vendorId: 'v1' }),
    partida({ id: 'b', vendorId: 'v2' }),
    partida({ id: 'c' }),
  ];

  it('las suyas, y las libres son las que no tienen proveedor', () => {
    expect(partidasDeProveedor(partidas, 'v1').map((p) => p.id)).toEqual(['a']);
    expect(partidasLibres(partidas).map((p) => p.id)).toEqual(['c']);
  });
});

describe('proponerImportes', () => {
  it('ofrece presupuesto y acordado cuando los hay', () => {
    expect(proponerImportes({ quotedCents: 150000, agreedCents: 140000 })).toEqual({
      estimadoCents: 150000,
      realCents: 140000,
    });
  });

  it('un 0 es «sin dato», no «cuesta cero»: no se propone', () => {
    expect(proponerImportes({ quotedCents: 0, agreedCents: 0 })).toEqual({
      estimadoCents: null,
      realCents: null,
    });
    expect(proponerImportes({ quotedCents: 99, agreedCents: 0 })).toEqual({
      estimadoCents: 99,
      realCents: null,
    });
  });
});
