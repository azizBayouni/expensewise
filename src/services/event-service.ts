
import { firestore } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
} from 'firebase/firestore';
import type { Event } from '@/lib/data';

const eventsCollection = (userId: string) => collection(firestore, 'users', userId, 'events');

export async function addEvent(userId: string, newEventData: Omit<Event, 'id' | 'status' | 'userId'>): Promise<void> {
    const newEvent: Omit<Event, 'id'> = {
        ...newEventData,
        userId,
        status: 'active',
    };
    await addDoc(eventsCollection(userId), newEvent);
    window.dispatchEvent(new Event('eventsUpdated'));
}

export async function getAllEvents(userId: string): Promise<Event[]> {
    const q = query(eventsCollection(userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
}

export async function updateEvent(userId: string, updatedEvent: Event): Promise<void> {
  const { id, ...eventData } = updatedEvent;
  const docRef = doc(firestore, 'users', userId, 'events', id);
  await updateDoc(docRef, eventData);
  window.dispatchEvent(new Event('eventsUpdated'));
}

export async function deleteEvent(userId: string, eventId: string): Promise<void> {
    const docRef = doc(firestore, 'users', userId, 'events', eventId);
    await deleteDoc(docRef);
    window.dispatchEvent(new Event('eventsUpdated'));
}
