import React, { useEffect, useState } from 'react';
import { Camera, Activity, TrendingUp, ChevronLeft, ChevronRight, Dumbbell } from 'lucide-react';
import { supabase } from '../lib/supabase';

/* ─── tipos locais ─── */
interface StudentInfo { name: string; }
interface Photo { id: string; date: string; front_url: string | null; side_url: string | null; back_url: string | null; }
interface Bio {
  id: string; date: string; image_url: string | null;
  weight: number; body_fat_pct: number; body_fat_kg: number;
  muscle_mass: number; visceral_fat: number; lean_mass: number; muscle_pct: number;
}
interface Meas {
  id: string; date: string; weight: number; height: number;
  chest: number; waist: number; hip: number; arm: number; thigh: number; calf: number;
}

function fmt(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/* ─── componente principal ─── */
const StudentPortal: React.FC<{ token: string }> = ({ token }) => {
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [bios, setBios] = useState<Bio[]>([]);
  const [meas, setMeas] = useState<Meas[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<'photos' | 'bio' | 'meas'>('photos');
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);

      // 1. Buscar student por share_token
      const { data: st } = await supabase
        .from('students')
        .select('id, name')
        .eq('share_token', token)
        .single();

      if (!st) { setNotFound(true); setLoading(false); return; }
      setStudent({ name: st.name });
      const sid = st.id;

      // 2. Buscar dados
      const [{ data: ph }, { data: bi }, { data: me }] = await Promise.all([
        supabase.from('evolution_photos').select('*').eq('student_id', sid).order('date', { ascending: false }),
        supabase.from('bioimpedance').select('*').eq('student_id', sid).order('date', { ascending: false }),
        supabase.from('measurements').select('*').eq('student_id', sid).order('date', { ascending: false }),
      ]);

      setPhotos((ph ?? []) as Photo[]);
      setBios((bi ?? []) as Bio[]);
      setMeas((me ?? []) as Meas[]);
      setLoading(false);
    }
    load();
  }, [token]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--n-50)' }}>
      <div className="text-center">
        <div className="spinner mx-auto mb-3" style={{ width: 32, height: 32 }} />
        <p className="text-sm font-medium" style={{ color: 'var(--n-600)' }}>Carregando...</p>
      </div>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--n-50)' }}>
      <div className="text-center max-w-xs">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--error-light)' }}>
          <Dumbbell size={28} style={{ color: 'var(--error)' }} />
        </div>
        <h1 className="text-lg font-bold mb-2" style={{ color: 'var(--n-900)' }}>Link inválido</h1>
        <p className="text-sm" style={{ color: 'var(--n-500)' }}>Este link de evolução não existe ou foi revogado.</p>
      </div>
    </div>
  );

  const curPhoto = photos[photoIdx];

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--n-50)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-10 pb-4" style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #6366f1 100%)' }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ background: 'rgba(255,255,255,0.2)' }}>
            {student!.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-xs font-medium text-white/70">Portal de evolução</div>
            <div className="text-base font-bold text-white">{student!.name}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-4 pb-2">
        {([
          { id: 'photos', label: 'Fotos', icon: Camera },
          { id: 'bio',    label: 'Bioimpedância', icon: Activity },
          { id: 'meas',   label: 'Medidas', icon: TrendingUp },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
            style={tab === id
              ? { background: 'var(--accent)', color: '#fff' }
              : { background: 'var(--n-0)', color: 'var(--n-500)', border: '1px solid var(--n-200)' }
            }
          >
            <Icon size={13} className="inline mr-1" />{label}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-4">
        {/* ─── Fotos ─── */}
        {tab === 'photos' && (
          photos.length === 0
            ? <Empty icon={Camera} text="Nenhuma foto registrada ainda" />
            : <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: 'var(--n-500)' }}>{fmt(curPhoto.date)}</span>
                  <div className="flex items-center gap-1">
                    <button disabled={photoIdx >= photos.length - 1} onClick={() => setPhotoIdx(i => i + 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30" style={{ background: 'var(--n-100)' }}>
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-xs font-bold px-2" style={{ color: 'var(--n-600)' }}>{photoIdx + 1}/{photos.length}</span>
                    <button disabled={photoIdx <= 0} onClick={() => setPhotoIdx(i => i - 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30" style={{ background: 'var(--n-100)' }}>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Frente', src: curPhoto.front_url },
                    { label: 'Lado',   src: curPhoto.side_url },
                    { label: 'Costas', src: curPhoto.back_url },
                  ].map(({ label, src }) => (
                    <div key={label}>
                      <div className="text-[10px] font-semibold mb-1 text-center" style={{ color: 'var(--n-500)' }}>{label}</div>
                      {src
                        ? <img src={src} alt={label} className="w-full aspect-[3/4] object-cover rounded-xl" style={{ border: '1px solid var(--n-200)' }} />
                        : <div className="w-full aspect-[3/4] rounded-xl flex items-center justify-center" style={{ background: 'var(--n-100)', border: '1px dashed var(--n-300)' }}>
                            <Camera size={18} style={{ color: 'var(--n-400)' }} />
                          </div>
                      }
                    </div>
                  ))}
                </div>
              </>
        )}

        {/* ─── Bioimpedância ─── */}
        {tab === 'bio' && (
          bios.length === 0
            ? <Empty icon={Activity} text="Nenhuma bioimpedância registrada" />
            : <div className="space-y-4">
                {bios.map((b, i) => (
                  <div key={b.id} className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--n-0)', border: '1px solid var(--n-200)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold" style={{ color: 'var(--n-600)' }}>{fmt(b.date)}</span>
                      {i === 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>Mais recente</span>}
                    </div>
                    {b.image_url && <img src={b.image_url} alt="Exame" className="w-full max-h-48 object-contain rounded-lg" style={{ border: '1px solid var(--n-200)' }} />}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Peso', val: b.weight, unit: 'kg' },
                        { label: '% Gordura', val: b.body_fat_pct, unit: '%' },
                        { label: 'Gordura', val: b.body_fat_kg, unit: 'kg' },
                        { label: 'Musc. (kg)', val: b.muscle_mass, unit: 'kg' },
                        { label: 'Gord. Visc.', val: b.visceral_fat, unit: '' },
                        { label: 'Massa Magra', val: b.lean_mass, unit: 'kg' },
                        { label: '% Musc.', val: b.muscle_pct, unit: '%' },
                      ].filter(x => x.val > 0).map(({ label, val, unit }) => (
                        <div key={label} className="rounded-lg p-2.5 text-center" style={{ background: 'var(--n-50)', border: '1px solid var(--n-200)' }}>
                          <div className="text-[10px] uppercase font-bold mb-0.5" style={{ color: 'var(--n-500)' }}>{label}</div>
                          <div className="text-sm font-bold" style={{ color: 'var(--n-900)' }}>{val}{unit && <span className="text-[10px] font-normal ml-0.5" style={{ color: 'var(--n-400)' }}>{unit}</span>}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
        )}

        {/* ─── Medidas ─── */}
        {tab === 'meas' && (
          meas.length === 0
            ? <Empty icon={TrendingUp} text="Nenhuma medida registrada" />
            : <div className="space-y-4">
                {meas.map((m, i) => {
                  const prev = meas[i + 1];
                  return (
                    <div key={m.id} className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--n-0)', border: '1px solid var(--n-200)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold" style={{ color: 'var(--n-600)' }}>{fmt(m.date)}</span>
                        {i === 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>Mais recente</span>}
                      </div>
                      {(m.weight > 0 || m.height > 0) && (
                        <div className="flex gap-2">
                          {m.weight > 0 && <div className="flex-1 rounded-lg p-2.5 text-center" style={{ background: 'var(--accent-light)', border: '1px solid var(--n-200)' }}>
                            <div className="text-[10px] uppercase font-bold" style={{ color: 'var(--accent)' }}>Peso</div>
                            <div className="text-base font-extrabold" style={{ color: 'var(--accent)' }}>{m.weight}<span className="text-xs font-normal">kg</span></div>
                          </div>}
                          {m.height > 0 && <div className="flex-1 rounded-lg p-2.5 text-center" style={{ background: 'var(--n-50)', border: '1px solid var(--n-200)' }}>
                            <div className="text-[10px] uppercase font-bold" style={{ color: 'var(--n-500)' }}>Altura</div>
                            <div className="text-base font-extrabold" style={{ color: 'var(--n-800)' }}>{m.height}<span className="text-xs font-normal">cm</span></div>
                          </div>}
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Peitoral', cur: m.chest, prv: prev?.chest },
                          { label: 'Cintura',  cur: m.waist, prv: prev?.waist },
                          { label: 'Quadril',  cur: m.hip,   prv: prev?.hip },
                          { label: 'Braço',    cur: m.arm,   prv: prev?.arm },
                          { label: 'Coxa',     cur: m.thigh, prv: prev?.thigh },
                          { label: 'Panturr.', cur: m.calf,  prv: prev?.calf },
                        ].filter(x => x.cur > 0).map(({ label, cur, prv }) => {
                          const diff = prv && prv > 0 ? cur - prv : null;
                          return (
                            <div key={label} className="rounded-lg p-2 text-center" style={{ background: 'var(--n-50)', border: '1px solid var(--n-200)' }}>
                              <div className="text-[9px] uppercase font-bold" style={{ color: 'var(--n-500)' }}>{label}</div>
                              <div className="text-sm font-bold" style={{ color: 'var(--n-900)' }}>{cur}<span className="text-[9px] font-normal" style={{ color: 'var(--n-400)' }}>cm</span></div>
                              {diff !== null && diff !== 0 && <div className={`text-[9px] font-bold ${diff < 0 ? 'text-green-500' : 'text-red-500'}`}>{diff > 0 ? '+' : ''}{diff.toFixed(1)}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
        )}
      </div>

      {/* Rodapé */}
      <div className="text-center py-6 mt-4">
        <p className="text-xs" style={{ color: 'var(--n-400)' }}>
          💪 Acompanhamento de evolução
        </p>
      </div>
    </div>
  );
};

function Empty({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="text-center py-16">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--n-100)' }}>
        <Icon size={24} style={{ color: 'var(--n-400)' }} />
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--n-500)' }}>{text}</p>
    </div>
  );
}

export default StudentPortal;
