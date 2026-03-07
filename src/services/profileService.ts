import { supabase } from '../lib/supabase';
import type { Profile, ProfileUpdate } from '../types/database';

/**
 * Profile service — handles profile read/write operations and
 * subscription management on behalf of a user.
 */
export const profileService = {
  /**
   * Fetch a user's profile by their auth UID.
   */
  async getById(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[profileService.getById]', error.message);
      return null;
    }
    return data as Profile;
  },

  /**
   * Update any profile fields for the given user.
   */
  async update(userId: string, updates: ProfileUpdate): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw new Error(error.message);
  },

  /**
   * Activate or extend a premium subscription.
   */
  async activatePremium(
    userId: string,
    opts: {
      endDate: string;
      origin: 'trial' | 'courtesy' | 'paid';
      note?: string;
    }
  ): Promise<void> {
    const { data: profile, error: fetchErr } = await supabase
      .from('profiles')
      .select('subscription_history')
      .eq('id', userId)
      .single();

    if (fetchErr) throw new Error(fetchErr.message);

    const currentHistory = Array.isArray(profile?.subscription_history)
      ? (profile.subscription_history as unknown[])
      : [];

    const historyEntry = {
      id: `h${Date.now()}`,
      plan: 'premium',
      origin: opts.origin,
      startDate: new Date().toISOString().split('T')[0],
      endDate: opts.endDate,
      addedBy: 'system',
      note: opts.note ?? '',
    };

    const { error } = await supabase
      .from('profiles')
      .update({
        plan: 'premium',
        subscription_end_date: opts.endDate,
        subscription_origin: opts.origin,
        subscription_history: [...currentHistory, historyEntry],
      })
      .eq('id', userId);

    if (error) throw new Error(error.message);
  },

  /**
   * Revert a user to the free plan.
   */
  async downgradeToFree(userId: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({
        plan: 'free',
        subscription_end_date: null,
      })
      .eq('id', userId);

    if (error) throw new Error(error.message);
  },

  /**
   * Check if a user's premium subscription is still active.
   */
  async isPremiumActive(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('profiles')
      .select('plan, subscription_end_date')
      .eq('id', userId)
      .single();

    if (error || !data) return false;

    if ((data as any).plan !== 'premium') return false;

    const endDate = (data as any).subscription_end_date;
    if (!endDate) return false;

    return new Date(endDate) > new Date();
  },
};
