
'use server';

import { getDb } from './db';
import type { Event } from '../lib/data';
import { randomUUID } from 'crypto';

export async function addEvent(userId: string, newEventData: Omit<Event, 'id' | 'status' | 'userId'>): Promise<void> {
    const newEvent: Event = {
        ...newEventData,
        id: randomUUID(),
        userId,
        status: 'active',
    };
    const db = await getDb();
    await db.run('INSERT INTO events (id, userId, name, icon, status) VALUES (?, ?, ?, ?, ?)', newEvent.id, newEvent.userId, newEvent.name, newEvent.icon, newEvent.status);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('eventsUpdated'));
    }
}

export async function getAllEvents(userId: string): Promise<Event[]> {
    const db = await getDb();
    return db.all('SELECT * FROM events WHERE userId = ?', userId);
}

export async function updateEvent(userId: string, updatedEvent: Event): Promise<void> {
  const { id, ...eventData } = updatedEvent;
  const db = await getDb();
  await db.run('UPDATE events SET name = ?, icon = ?, status = ? WHERE id = ? AND userId = ?', eventData.name, eventData.icon, eventData.status, id, userId);
  if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('eventsUpdated'));
    }
}

export async function deleteEvent(userId: string, eventId: string): Promise<void> {
    const db = await getDb();
    await db.run('DELETE FROM events WHERE id = ? AND userId = ?', eventId, userId);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('eventsUpdated'));
    }
}
