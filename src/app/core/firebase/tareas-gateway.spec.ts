import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';

import { aTarea, traducirTarea } from './tareas-gateway.firestore';

describe('aTarea', () => {
  it('lee una tarea sembrada por el servidor', () => {
    const t = aTarea('t1', {
      title: 'Reservar la finca',
      description: '',
      category: 'Lugar',
      dueDate: Timestamp.fromDate(new Date('2027-01-10T00:00:00Z')),
      done: false,
      doneAt: null,
      assignedTo: 'both',
      vendorId: null,
      budgetItemId: null,
      priority: 'high',
      icon: 'tent',
      color: null,
      order: 1,
    });
    expect(t).toMatchObject({
      id: 't1',
      title: 'Reservar la finca',
      priority: 'high',
      icon: 'tent',
      done: false,
    });
    expect(t.dueDate?.toISOString()).toBe('2027-01-10T00:00:00.000Z');
  });

  it('un documento casi vacío no rompe la lista', () => {
    expect(aTarea('x', {})).toMatchObject({
      title: '',
      dueDate: null,
      assignedTo: 'both',
      priority: 'normal',
      icon: 'list-checks',
      done: false,
      order: 0,
    });
  });

  it('valores raros se normalizan', () => {
    const t = aTarea('x', {
      assignedTo: 'otro',
      priority: 'urgente',
      icon: 'no-existe',
      dueDate: 'ayer',
      vendorId: '',
    });
    expect(t).toMatchObject({
      assignedTo: 'both',
      priority: 'normal',
      icon: 'list-checks',
      dueDate: null,
      vendorId: null,
    });
  });
});

describe('traducirTarea', () => {
  it('permiso, red y el resto', () => {
    expect(traducirTarea({ code: 'permission-denied' }).tipo).toBe('sin-permiso');
    expect(traducirTarea({ code: 'unavailable' }).tipo).toBe('red');
    expect(traducirTarea({ message: 'rota' })).toEqual({ tipo: 'error', mensaje: 'rota' });
  });
});
