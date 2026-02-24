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

  // Upload photo to Supabase Storage
  const uploadPhoto = useCallback(async (file: File, path: string): Promise<string> => {
    const { data, error: err } = await supabase.storage
      .from('evolution-photos')
      .upload(`${currentUser.id}/${path}`, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (err) throw new Error(err.message);

    const { data: urlData } = supabase.storage
      .from('evolution-photos')
      .getPublicUrl(data.path);

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
    const [frontUrl, sideUrl, backUrl] = await Promise.all([
      photo.frontFile ? uploadPhoto(photo.frontFile, `${photo.studentId}/${timestamp}-front.jpg`) : Promise.resolve(null),
      photo.sideFile ? uploadPhoto(photo.sideFile, `${photo.studentId}/${timestamp}-side.jpg`) : Promise.resolve(null),
      photo.backFile ? uploadPhoto(photo.backFile, `${photo.studentId}/${timestamp}-back.jpg`) : Promise.resolve(null),
    ]);

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
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('bioimpedance-images')
        .upload(`${currentUser.id}/${bio.studentId}/${Date.now()}.jpg`, bio.imageFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (!uploadErr && uploadData) {
        const { data: urlData } = supabase.storage
          .from('bioimpedance-images')
          .getPublicUrl(uploadData.path);
        imageUrl = urlData.publicUrl;
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

  return {
    photos,
    bioimpedance,
    measurements,
    loading,
    error,
    addPhoto,
    addBioimpedance,
    addMeasurement,
    refetch: fetchAll,
  };
}
