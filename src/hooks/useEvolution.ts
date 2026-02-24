import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { EvolutionPhoto, Bioimpedance, Measurement } from '../types';
import type { DbEvolutionPhoto, DbBioimpedance, DbMeasurement } from '../types/database';

function dbToPhoto(row: DbEvolutionPhoto): EvolutionPhoto {
  return {
    id: row.id,
    studentId: row.student_id,
    date: new Date(row.date + 'T00:00:00'),
    front: row.front_url || '',
    side: row.side_url || '',
    back: row.back_url || '',
  };
}

function dbToBio(row: DbBioimpedance): Bioimpedance {
  return {
    id: row.id,
    studentId: row.student_id,
    date: new Date(row.date + 'T00:00:00'),
    image: row.image_url || '',
    data: {
      weight: Number(row.weight),
      bodyFatPct: Number(row.body_fat_pct),
      bodyFatKg: Number(row.body_fat_kg),
      muscleMass: Number(row.muscle_mass),
      visceralFat: Number(row.visceral_fat),
      leanMass: Number(row.lean_mass),
      musclePct: Number(row.muscle_pct),
    },
  };
}

function dbToMeasurement(row: DbMeasurement): Measurement {
  return {
    id: row.id,
    studentId: row.student_id,
    date: new Date(row.date + 'T00:00:00'),
    weight: Number(row.weight),
    height: Number(row.height),
    measurements: {
      chest: Number(row.chest),
      waist: Number(row.waist),
      hip: Number(row.hip),
      arm: Number(row.arm),
      thigh: Number(row.thigh),
      calf: Number(row.calf),
    },
    skinfolds: {
      triceps: Number(row.sf_triceps),
      biceps: Number(row.sf_biceps),
      subscapular: Number(row.sf_subscapular),
      suprailiac: Number(row.sf_suprailiac),
      abdominal: Number(row.sf_abdominal),
    },
  };
}

export function useEvolution(studentId?: string) {
  const { currentUser, isAuthenticated } = useAuth();
  const [photos, setPhotos] = useState<EvolutionPhoto[]>([]);
  const [bioimpedance, setBioimpedance] = useState<Bioimpedance[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!isAuthenticated || !currentUser.id) return;
    setLoading(true);
    setError(null);

    const filters = { user_id: currentUser.id, ...(studentId ? { student_id: studentId } : {}) };

    const [photosRes, bioRes, measRes] = await Promise.all([
      supabase
        .from('evolution_photos')
        .select('*')
        .match(filters)
        .order('date', { ascending: false }),
      supabase
        .from('bioimpedance')
        .select('*')
        .match(filters)
        .order('date', { ascending: true }),
      supabase
        .from('measurements')
        .select('*')
        .match(filters)
        .order('date', { ascending: true }),
    ]);

    if (photosRes.error) setError(photosRes.error.message);
    if (bioRes.error) setError(bioRes.error.message);
    if (measRes.error) setError(measRes.error.message);

    setPhotos((photosRes.data as DbEvolutionPhoto[] || []).map(dbToPhoto));
    setBioimpedance((bioRes.data as DbBioimpedance[] || []).map(dbToBio));
    setMeasurements((measRes.data as DbMeasurement[] || []).map(dbToMeasurement));
    setLoading(false);
  }, [currentUser.id, isAuthenticated, studentId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Upload photo to Supabase Storage, retorna URL pública
  const uploadPhoto = useCallback(async (file: File, pathWithoutExt: string): Promise<string> => {
    // Detectar extensão real do arquivo
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fullPath = `${currentUser.id}/${pathWithoutExt}.${ext}`;

    const { data, error: err } = await supabase.storage
      .from('evolution-photos')
      .upload(fullPath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });

    if (err) {
      console.error('[useEvolution] Erro no upload de foto:', err.message);
      throw new Error(err.message);
    }

    const { data: urlData } = supabase.storage
      .from('evolution-photos')
      .getPublicUrl(data.path);

    console.log('[useEvolution] URL pública gerada:', urlData.publicUrl);
    return urlData.publicUrl;
  }, [currentUser.id]);

  const addPhoto = useCallback(async (photo: {
    studentId: string;
    date: string;
    frontFile?: File;
    sideFile?: File;
    backFile?: File;
  }) => {
    if (!currentUser.id) return;

    const timestamp = Date.now();

    // Uploads independentes — um falhar não bloqueia os outros
    const [frontUrl, sideUrl, backUrl] = await Promise.all([
      photo.frontFile
        ? uploadPhoto(photo.frontFile, `${photo.studentId}/${timestamp}-front`).catch(e => { console.error('Front upload failed:', e); return null; })
        : Promise.resolve(null),
      photo.sideFile
        ? uploadPhoto(photo.sideFile, `${photo.studentId}/${timestamp}-side`).catch(e => { console.error('Side upload failed:', e); return null; })
        : Promise.resolve(null),
      photo.backFile
        ? uploadPhoto(photo.backFile, `${photo.studentId}/${timestamp}-back`).catch(e => { console.error('Back upload failed:', e); return null; })
        : Promise.resolve(null),
    ]);

    if (!frontUrl && !sideUrl && !backUrl) {
      throw new Error('Nenhuma foto foi enviada com sucesso. Verifique o bucket de storage do Supabase.');
    }

    const { error: err } = await supabase
      .from('evolution_photos')
      .insert({
        user_id: currentUser.id,
        student_id: photo.studentId,
        date: photo.date,
        front_url: frontUrl,
        side_url: sideUrl,
        back_url: backUrl,
      });

    if (err) throw new Error(err.message);
    await fetchAll();
  }, [currentUser.id, uploadPhoto, fetchAll]);

  const addBioimpedance = useCallback(async (bio: {
    studentId: string;
    date: string;
    imageFile?: File;
    data: Bioimpedance['data'];
  }) => {
    if (!currentUser.id) return;

    let imageUrl: string | null = null;
    if (bio.imageFile) {
      const ext = bio.imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${currentUser.id}/${bio.studentId}/${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('bioimpedance-images')
        .upload(path, bio.imageFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: bio.imageFile.type,
        });

      if (!uploadErr && uploadData) {
        const { data: urlData } = supabase.storage
          .from('bioimpedance-images')
          .getPublicUrl(uploadData.path);
        imageUrl = urlData.publicUrl;
      } else if (uploadErr) {
        console.error('[useEvolution] Erro upload bio:', uploadErr.message);
      }
    }

    const { error: err } = await supabase
      .from('bioimpedance')
      .insert({
        user_id: currentUser.id,
        student_id: bio.studentId,
        date: bio.date,
        image_url: imageUrl,
        weight: bio.data.weight,
        body_fat_pct: bio.data.bodyFatPct,
        body_fat_kg: bio.data.bodyFatKg,
        muscle_mass: bio.data.muscleMass,
        visceral_fat: bio.data.visceralFat,
        lean_mass: bio.data.leanMass,
        muscle_pct: bio.data.musclePct,
      });

    if (err) throw new Error(err.message);
    await fetchAll();
  }, [currentUser.id, fetchAll]);

  const addMeasurement = useCallback(async (m: {
    studentId: string;
    date: string;
    weight: number;
    height: number;
    measurements: Measurement['measurements'];
    skinfolds: Measurement['skinfolds'];
  }) => {
    if (!currentUser.id) return;

    const { error: err } = await supabase
      .from('measurements')
      .insert({
        user_id: currentUser.id,
        student_id: m.studentId,
        date: m.date,
        weight: m.weight,
        height: m.height,
        chest: m.measurements.chest,
        waist: m.measurements.waist,
        hip: m.measurements.hip,
        arm: m.measurements.arm,
        thigh: m.measurements.thigh,
        calf: m.measurements.calf,
        sf_triceps: m.skinfolds.triceps,
        sf_biceps: m.skinfolds.biceps,
        sf_subscapular: m.skinfolds.subscapular,
        sf_suprailiac: m.skinfolds.suprailiac,
        sf_abdominal: m.skinfolds.abdominal,
      });

    if (err) throw new Error(err.message);
    await fetchAll();
  }, [currentUser.id, fetchAll]);

  const deletePhoto = useCallback(async (id: string) => {
    if (!currentUser.id) return;
    const { error } = await supabase.from('evolution_photos').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await fetchAll();
  }, [currentUser.id, fetchAll]);

  const deleteBioimpedance = useCallback(async (id: string) => {
    if (!currentUser.id) return;
    const { error } = await supabase.from('bioimpedance').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await fetchAll();
  }, [currentUser.id, fetchAll]);

  const deleteMeasurement = useCallback(async (id: string) => {
    if (!currentUser.id) return;
    const { error } = await supabase.from('measurements').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await fetchAll();
  }, [currentUser.id, fetchAll]);

  const updateBioimpedance = useCallback(async (id: string, updates: {
    date?: string;
    imageFile?: File | null;
    data?: Partial<Bioimpedance['data']>;
  }) => {
    if (!currentUser.id) return;
    const payload: Record<string, unknown> = {};

    if (updates.date) payload.date = updates.date;
    if (updates.data) {
      if (updates.data.weight     !== undefined) payload.weight        = updates.data.weight;
      if (updates.data.bodyFatPct !== undefined) payload.body_fat_pct  = updates.data.bodyFatPct;
      if (updates.data.bodyFatKg  !== undefined) payload.body_fat_kg   = updates.data.bodyFatKg;
      if (updates.data.muscleMass !== undefined) payload.muscle_mass   = updates.data.muscleMass;
      if (updates.data.visceralFat!== undefined) payload.visceral_fat  = updates.data.visceralFat;
      if (updates.data.leanMass   !== undefined) payload.lean_mass     = updates.data.leanMass;
      if (updates.data.musclePct  !== undefined) payload.muscle_pct    = updates.data.musclePct;
    }
    if (updates.imageFile) {
      const ext = updates.imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${currentUser.id}/bio-update-${Date.now()}.${ext}`;
      const { data: up, error: upErr } = await supabase.storage
        .from('bioimpedance-images')
        .upload(path, updates.imageFile, { upsert: true, contentType: updates.imageFile.type });
      if (!upErr && up) {
        const { data: u } = supabase.storage.from('bioimpedance-images').getPublicUrl(up.path);
        payload.image_url = u.publicUrl;
      }
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
      if (m.measurements.chest  !== undefined) payload.chest  = m.measurements.chest;
      if (m.measurements.waist  !== undefined) payload.waist  = m.measurements.waist;
      if (m.measurements.hip    !== undefined) payload.hip    = m.measurements.hip;
      if (m.measurements.arm    !== undefined) payload.arm    = m.measurements.arm;
      if (m.measurements.thigh  !== undefined) payload.thigh  = m.measurements.thigh;
      if (m.measurements.calf   !== undefined) payload.calf   = m.measurements.calf;
    }
    if (m.skinfolds) {
      if (m.skinfolds.triceps      !== undefined) payload.sf_triceps     = m.skinfolds.triceps;
      if (m.skinfolds.biceps       !== undefined) payload.sf_biceps      = m.skinfolds.biceps;
      if (m.skinfolds.subscapular  !== undefined) payload.sf_subscapular = m.skinfolds.subscapular;
      if (m.skinfolds.suprailiac   !== undefined) payload.sf_suprailiac  = m.skinfolds.suprailiac;
      if (m.skinfolds.abdominal    !== undefined) payload.sf_abdominal   = m.skinfolds.abdominal;
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
