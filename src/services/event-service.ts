
'use server';

import db from './db';
import type { Event } from '../lib/data';
import { randomUUID } from 'crypto';


export async function addEvent(userId: string, newEventData: Omit<Event, 'id' | 'status' | 'userId'>): Promise<void> {
    const newEvent: Event = {
        ...newEventData,
        id: randomUUID(),
        userId,
        status: 'active',
    };
    const stmt = db.prepare('INSERT INTO events (id, userId, name, icon, status) VALUES (?, ?, ?, ?, ?)');
    stmt.run(newEvent.id, newEvent.userId, newEvent.name, newEvent.icon, newEvent.status);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('eventsUpdated'));
    }
}

export async function getAllEvents(userId: string): Promise<Event[]> {
    const stmt = db.prepare('SELECT * FROM events WHERE userId = ?');
    return stmt.all(userId) as Event[];
}

export async function updateEvent(userId: string, updatedEvent: Event): Promise<void> {
  const { id, ...eventData } = updatedEvent;
  const stmt = db.prepare('UPDATE events SET name = ?, icon = ?, status = ? WHERE id = ? AND userId = ?');
  stmt.run(eventData.name, eventData.icon, eventData.status, id, userId);
  if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('eventsUpdated'));
    }
}

export async function deleteEvent(userId: string, eventId: string): Promise<void> {
    const stmt = db.prepare('DELETE FROM events WHERE id = ? AND userId = ?');
    stmt.run(eventId, userId);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('eventsUpdated'));
    }
}
