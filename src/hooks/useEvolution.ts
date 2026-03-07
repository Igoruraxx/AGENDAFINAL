import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDataServices } from '../services';
import { EvolutionPhoto, Bioimpedance, Measurement } from '../types';
import { supabase } from '../lib/supabase';

// ── File upload helpers (Supabase Storage — infrastructure concern) ──────────

async function uploadFile(userId: string, bucket: string, file: File, path: string): Promise<string | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fullPath = `${userId}/${path}.${ext}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fullPath, file, { cacheControl: '3600', upsert: true, contentType: file.type });
  if (error) { console.error(`[upload] ${bucket}:`, error.message); return null; }
  return supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;
}

export function useEvolution(studentId?: string) {
  const { currentUser, isAuthenticated } = useAuth();
  const { evolution: service } = useDataServices();
  const [photos, setPhotos] = useState<EvolutionPhoto[]>([]);
  const [bioimpedance, setBioimpedance] = useState<Bioimpedance[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!isAuthenticated || !currentUser.id) return;
    setLoading(true);
    setError(null);
    try {
      const filters = { userId: currentUser.id, studentId };
      const [p, b, m] = await Promise.all([
        service.getPhotos(filters),
        service.getBioimpedance(filters),
        service.getMeasurements(filters),
      ]);
      setPhotos(p);
      setBioimpedance(b);
      setMeasurements(m);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id, isAuthenticated, studentId, service]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addPhoto = useCallback(async (photo: {
    studentId: string;
    date: string;
    frontFile?: File;
    sideFile?: File;
    backFile?: File;
  }) => {
    if (!currentUser.id) return;
    const ts = Date.now();
    const [frontUrl, sideUrl, backUrl] = await Promise.all([
      photo.frontFile ? uploadFile(currentUser.id, 'evolution-photos', photo.frontFile, `${photo.studentId}/${ts}-front`) : Promise.resolve(null),
      photo.sideFile  ? uploadFile(currentUser.id, 'evolution-photos', photo.sideFile,  `${photo.studentId}/${ts}-side`)  : Promise.resolve(null),
      photo.backFile  ? uploadFile(currentUser.id, 'evolution-photos', photo.backFile,  `${photo.studentId}/${ts}-back`)  : Promise.resolve(null),
    ]);
    if (!frontUrl && !sideUrl && !backUrl) throw new Error('Nenhuma foto enviada com sucesso.');
    await service.addPhoto(currentUser.id, {
      studentId: photo.studentId,
      date: new Date(photo.date + 'T00:00:00'),
      front: frontUrl || '',
      side: sideUrl || '',
      back: backUrl || '',
    });
    await fetchAll();
  }, [currentUser.id, service, fetchAll]);

  const addBioimpedance = useCallback(async (bio: {
    studentId: string;
    date: string;
    imageFile?: File;
    data: Bioimpedance['data'];
  }) => {
    if (!currentUser.id) return;
    let imageUrl = '';
    if (bio.imageFile) {
      const url = await uploadFile(currentUser.id, 'bioimpedance-images', bio.imageFile, `${bio.studentId}/${Date.now()}`);
      imageUrl = url || '';
    }
    await service.addBioimpedance(currentUser.id, {
      studentId: bio.studentId,
      date: new Date(bio.date + 'T00:00:00'),
      image: imageUrl,
      data: bio.data,
    });
    await fetchAll();
  }, [currentUser.id, service, fetchAll]);

  const addMeasurement = useCallback(async (m: {
    studentId: string;
    date: string;
    weight: number;
    height: number;
    measurements: Measurement['measurements'];
    skinfolds: Measurement['skinfolds'];
  }) => {
    if (!currentUser.id) return;
    await service.addMeasurement(currentUser.id, {
      studentId: m.studentId,
      date: new Date(m.date + 'T00:00:00'),
      weight: m.weight,
      height: m.height,
      measurements: m.measurements,
      skinfolds: m.skinfolds,
    });
    await fetchAll();
  }, [currentUser.id, service, fetchAll]);

  const deletePhoto = useCallback(async (id: string) => {
    await service.deletePhoto(id);
    await fetchAll();
  }, [service, fetchAll]);

  const deleteBioimpedance = useCallback(async (id: string) => {
    await service.deleteBioimpedance(id);
    await fetchAll();
  }, [service, fetchAll]);

  const deleteMeasurement = useCallback(async (id: string) => {
    await service.deleteMeasurement(id);
    await fetchAll();
  }, [service, fetchAll]);

  // Keep update helpers for backwards compatibility — they call Supabase directly
  // since complex partial updates aren't in the generic service interface.
  const updateBioimpedance = useCallback(async (id: string, updates: {
    date?: string;
    imageFile?: File | null;
    data?: Partial<Bioimpedance['data']>;
  }) => {
    if (!currentUser.id) return;
    const payload: Record<string, unknown> = {};
    if (updates.date) payload.date = updates.date;
    if (updates.data) {
      if (updates.data.weight      !== undefined) payload.weight        = updates.data.weight;
      if (updates.data.bodyFatPct  !== undefined) payload.body_fat_pct  = updates.data.bodyFatPct;
      if (updates.data.bodyFatKg   !== undefined) payload.body_fat_kg   = updates.data.bodyFatKg;
      if (updates.data.muscleMass  !== undefined) payload.muscle_mass   = updates.data.muscleMass;
      if (updates.data.visceralFat !== undefined) payload.visceral_fat  = updates.data.visceralFat;
      if (updates.data.leanMass    !== undefined) payload.lean_mass     = updates.data.leanMass;
      if (updates.data.musclePct   !== undefined) payload.muscle_pct    = updates.data.musclePct;
    }
    if (updates.imageFile) {
      const url = await uploadFile(currentUser.id, 'bioimpedance-images', updates.imageFile, `bio-update-${Date.now()}`);
      if (url) payload.image_url = url;
    } else if (updates.imageFile === null) {
      payload.image_url = null;
    }
    const { error } = await supabase.from('bioimpedance').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
    await fetchAll();
  }, [currentUser.id, fetchAll]);

  const updateMeasurement = useCallback(async (id: string, m: {
    date?: string;
    weight?: number;
    height?: number;
    measurements?: Partial<Measurement['measurements']>;
    skinfolds?: Partial<Measurement['skinfolds']>;
  }) => {
    if (!currentUser.id) return;
    const payload: Record<string, unknown> = {};
    if (m.date   !== undefined) payload.date   = m.date;
    if (m.weight !== undefined) payload.weight = m.weight;
    if (m.height !== undefined) payload.height = m.height;
    if (m.measurements) {
      if (m.measurements.chest !== undefined) payload.chest = m.measurements.chest;
      if (m.measurements.waist !== undefined) payload.waist = m.measurements.waist;
      if (m.measurements.hip   !== undefined) payload.hip   = m.measurements.hip;
      if (m.measurements.arm   !== undefined) payload.arm   = m.measurements.arm;
      if (m.measurements.thigh !== undefined) payload.thigh = m.measurements.thigh;
      if (m.measurements.calf  !== undefined) payload.calf  = m.measurements.calf;
    }
    if (m.skinfolds) {
      if (m.skinfolds.triceps     !== undefined) payload.sf_triceps     = m.skinfolds.triceps;
      if (m.skinfolds.biceps      !== undefined) payload.sf_biceps      = m.skinfolds.biceps;
      if (m.skinfolds.subscapular !== undefined) payload.sf_subscapular = m.skinfolds.subscapular;
      if (m.skinfolds.suprailiac  !== undefined) payload.sf_suprailiac  = m.skinfolds.suprailiac;
      if (m.skinfolds.abdominal   !== undefined) payload.sf_abdominal   = m.skinfolds.abdominal;
    }
    const { error } = await supabase.from('measurements').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
    await fetchAll();
  }, [currentUser.id, fetchAll]);

  return {
    photos,
    bioimpedance,
    measurements,
    loading,
    error,
    addPhoto,
    addBioimpedance,
    addMeasurement,
    updateBioimpedance,
    updateMeasurement,
    deletePhoto,
    deleteBioimpedance,
    deleteMeasurement,
    refetch: fetchAll,
  };
}

