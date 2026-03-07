import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { DbEvent, DbEventInsert, DbEventUpdate } from '../types/database';
import type { Event, EventType, EventStatus } from '../types/models';

function dbToEvent(row: DbEvent): Event {
  return {
    id: row.id,
    userId: row.user_id,
    studentId: row.student_id,
    title: row.title,
    description: row.description,
    type: row.type as EventType,
    status: row.status as EventStatus,
    date: new Date(row.date + 'T00:00:00'),
    startTime: row.start_time,
    endTime: row.end_time,
    duration: row.duration,
    isRecurring: row.is_recurring,
    location: row.location,
    notes: row.notes,
    color: row.color,
    categoryIds: [],
  };
}

export function useEvents(options: { date?: string; startDate?: string; endDate?: string } = {}) {
  const { currentUser, isAuthenticated } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!isAuthenticated || !currentUser.id) return;
    setLoading(true);
    setError(null);

    let query = supabase
      .from('events')
      .select('*, event_categories(category_id)')
      .eq('user_id', currentUser.id)
      .is('deleted_at', null)
      .order('date')
      .order('start_time');

    if (options.date) {
      query = query.eq('date', options.date);
    } else {
      if (options.startDate) query = query.gte('date', options.startDate);
      if (options.endDate) query = query.lte('date', options.endDate);
    }

    const { data, error: err } = await query;

    if (err) {
      setError(err.message);
      console.error('[useEvents] Erro ao buscar:', err.message);
    } else {
      setEvents(
        (data || []).map((row: any) => {
          const event = dbToEvent(row as DbEvent);
          event.categoryIds = (row.event_categories || []).map((ec: any) => ec.category_id);
          return event;
        })
      );
    }
    setLoading(false);
  }, [currentUser.id, isAuthenticated, options.date, options.startDate, options.endDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Realtime subscription
  useEffect(() => {
    if (!isAuthenticated || !currentUser.id) return;

    const channel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `user_id=eq.${currentUser.id}`,
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser.id, isAuthenticated, fetchEvents]);

  const addEvent = useCallback(async (
    event: Omit<DbEventInsert, 'user_id'> & { categoryIds?: string[] },
  ): Promise<Event | null> => {
    if (!currentUser.id) return null;

    const { categoryIds, ...rest } = event;

    const insert: DbEventInsert = {
      ...rest,
      user_id: currentUser.id,
    };

    const { data, error: err } = await supabase
      .from('events')
      .insert(insert)
      .select()
      .single();

    if (err) {
      console.error('[useEvents] Erro ao adicionar:', err.message);
      throw new Error(err.message);
    }

    const newEvent = dbToEvent(data as DbEvent);

    // Attach categories
    if (categoryIds && categoryIds.length > 0) {
      const relations = categoryIds.map(cid => ({
        event_id: newEvent.id,
        category_id: cid,
      }));

      const { error: relErr } = await supabase
        .from('event_categories')
        .insert(relations);

      if (relErr) {
        console.error('[useEvents] Erro ao vincular categorias:', relErr.message);
      } else {
        newEvent.categoryIds = categoryIds;
      }
    }

    setEvents(prev => [...prev, newEvent]);

    return newEvent;
  }, [currentUser.id]);

  const updateEvent = useCallback(async (
    id: string,
    updates: DbEventUpdate & { categoryIds?: string[] },
  ): Promise<void> => {
    const { categoryIds, ...rest } = updates;

    const { error: err } = await supabase
      .from('events')
      .update(rest)
      .eq('id', id);

    if (err) {
      console.error('[useEvents] Erro ao atualizar:', err.message);
      throw new Error(err.message);
    }

    // Replace categories if provided
    if (categoryIds !== undefined) {
      await supabase.from('event_categories').delete().eq('event_id', id);

      if (categoryIds.length > 0) {
        const relations = categoryIds.map(cid => ({
          event_id: id,
          category_id: cid,
        }));
        const { error: relErr } = await supabase
          .from('event_categories')
          .insert(relations);
        if (relErr) console.error('[useEvents] Erro ao atualizar categorias:', relErr.message);
      }
    }

    await fetchEvents();
  }, [fetchEvents]);

  const deleteEvent = useCallback(async (id: string, soft = true): Promise<void> => {
    if (soft) {
      const { error: err } = await supabase
        .from('events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (err) {
        console.error('[useEvents] Erro ao deletar (soft):', err.message);
        throw new Error(err.message);
      }
    } else {
      const { error: err } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (err) {
        console.error('[useEvents] Erro ao deletar:', err.message);
        throw new Error(err.message);
      }
    }

    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  return {
    events,
    loading,
    error,
    addEvent,
    updateEvent,
    deleteEvent,
    refetch: fetchEvents,
  };
}
