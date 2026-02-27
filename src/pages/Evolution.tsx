import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Plus, TrendingUp, TrendingDown, ChevronDown, X, User, CalendarDays, CheckCircle2, Pencil } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import FeatureGate from '../components/FeatureGate';
import { usePermissions } from '../hooks/usePermissions';
import { useStudents } from '../hooks/useStudents';
import { useEvolution } from '../hooks/useEvolution';
import { useImageUpload } from '../hooks/useImageUpload';

const EvolutionContent: React.FC = () => {
  const { students: STUDENTS_LIST } = useStudents();
  const { photos: evoPhotos, bioimpedance: evoBio, measurements: evoMeasurements, addPhoto: addEvoPhoto, addBioimpedance, addMeasurement, updateBioimpedance, updateMeasurement, deletePhoto, deleteBioimpedance, deleteMeasurement } = useEvolution();
  const [activeTab, setActiveTab] = useState<'photos' | 'bioimpedance' | 'measurements'>('photos');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoDate, setPhotoDate] = useState('');
  const [bioImageViewer, setBioImageViewer] = useState<string | null>(null);

  const frontRef = useRef<HTMLInputElement>(null);
  const sideRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const bioFileRef = useRef<HTMLInputElement>(null);

  const [showBioModal, setShowBioModal] = useState(false);
  const [showMeasModal, setShowMeasModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingBioId, setEditingBioId] = useState<string | null>(null);
  const [editingMeasId, setEditingMeasId] = useState<string | null>(null);

  // Hooks de upload — cada um gerencia File + previewUrl + cleanup
  const frontUpload  = useImageUpload();
  const sideUpload   = useImageUpload();
  const backUpload   = useImageUpload();
  const bioUpload    = useImageUpload();

  const [bioDate, setBioDate] = useState(new Date().toISOString().split('T')[0]);
  const [bioData, setBioData] = useState({
    weight: 0,
    bodyFatPct: 0,
    bodyFatKg: 0,
    muscleMass: 0,
    visceralFat: 0,
    leanMass: 0,
    musclePct: 0,
  });

  // Cálculo automático de % Massa Muscular
  useEffect(() => {
    const weight = Number(bioData.weight) || 0;
    const muscle = Number(bioData.muscleMass) || 0;
    if (weight > 0) {
      const pct = Number(((muscle / weight) * 100).toFixed(1));
      if (bioData.musclePct !== pct) {
        setBioData(prev => ({ ...prev, musclePct: pct }));
      }
    } else if (bioData.musclePct !== 0) {
      setBioData(prev => ({ ...prev, musclePct: 0 }));
    }
  }, [bioData.weight, bioData.muscleMass, bioData.musclePct]);

  const [measDate, setMeasDate] = useState(new Date().toISOString().split('T')[0]);
  const [measWeight, setMeasWeight] = useState(0);
  const [measHeight, setMeasHeight] = useState(0);
  const [measValues, setMeasValues] = useState({
    chest: 0, waist: 0, hip: 0, arm: 0, thigh: 0, calf: 0
  });
  const [skinfolds, setSkinfolds] = useState({
    triceps: 0, biceps: 0, subscapular: 0, suprailiac: 0, abdominal: 0
  });

  const selectedStudent = STUDENTS_LIST.find(s => s.id === selectedStudentId);

  const photos = evoPhotos;
  const bioimpedanceData = evoBio;
  const measurements = evoMeasurements;

  const filteredPhotos = selectedStudentId ? photos.filter(p => p.studentId === selectedStudentId) : [];
  const filteredBio = selectedStudentId ? bioimpedanceData.filter(b => b.studentId === selectedStudentId) : [];
  const filteredMeasurements = selectedStudentId ? measurements.filter(m => m.studentId === selectedStudentId) : [];
  
  const weightData = filteredMeasurements
    .filter(m => m.weight > 0)
    .map(m => ({ 
      date: m.date.toLocaleDateString('pt-BR', { month: 'short' }), 
      peso: m.weight 
    }));
  
  
  const measurementsChartData = filteredMeasurements
    .filter(m => (m.measurements.waist > 0 || m.measurements.hip > 0 || m.measurements.chest > 0))
    .map(m => ({ 
      date: m.date.toLocaleDateString('pt-BR', { month: 'short' }), 
      cintura: m.measurements.waist > 0 ? m.measurements.waist : null, 
      quadril: m.measurements.hip > 0 ? m.measurements.hip : null, 
      peitoral: m.measurements.chest > 0 ? m.measurements.chest : null 
    }));



  const handleAddPhoto = async () => {
    if (!photoDate || !selectedStudentId) return;
    if (!frontUpload.file && !sideUpload.file && !backUpload.file) {
      alert('Selecione ao menos uma foto antes de salvar.');
      return;
    }
    setSaving(true);
    try {
      await addEvoPhoto({
        studentId: selectedStudentId,
        date: photoDate,
        frontFile: frontUpload.file || undefined,
        sideFile: sideUpload.file || undefined,
        backFile: backUpload.file || undefined,
      });
      setShowPhotoModal(false);
      setPhotoDate('');
      frontUpload.clear();
      sideUpload.clear();
      backUpload.clear();
    } catch (error: any) {
      console.error('Erro ao salvar fotos:', error);
      alert(`Erro ao salvar fotos: ${error?.message || 'Tente novamente.'}`);
    } finally { setSaving(false); }
  };

  const closePhotoModal = () => {
    setShowPhotoModal(false);
    setPhotoDate('');
    frontUpload.clear();
    sideUpload.clear();
    backUpload.clear();
  };

  const handleAddBio = async () => {
    if (!bioDate || !selectedStudentId) return;
    setSaving(true);
    // Garantia final do cálculo antes de salvar
    const weight = Number(bioData.weight) || 0;
    const muscle = Number(bioData.muscleMass) || 0;
    const finalData = { ...bioData };
    if (weight > 0) {
      finalData.musclePct = Number(((muscle / weight) * 100).toFixed(1));
    }

    try {
      if (editingBioId) {
        await updateBioimpedance(editingBioId, {
          date: bioDate,
          imageFile: bioUpload.file ?? (bioUpload.previewUrl ? undefined : null),
          data: finalData,
        });
      } else {
        await addBioimpedance({
          studentId: selectedStudentId,
          date: bioDate,
          imageFile: bioUpload.file || undefined,
          data: finalData,
        });
      }
      setShowBioModal(false);
      setEditingBioId(null);
      bioUpload.clear();
    } catch (error: any) {
      console.error('Erro ao salvar bio:', error);
      alert(`Erro ao salvar: ${error?.message || 'Tente novamente.'}`);
    } finally { setSaving(false); }
  };

  const openEditBio = (bio: typeof evoBio[0]) => {
    setEditingBioId(bio.id);
    setBioDate(bio.date.toISOString().split('T')[0]);
    
    // Forçar cálculo ao abrir para garantir que dados antigos sejam corrigidos na visualização
    const data = { ...bio.data };
    if (data.weight > 0) {
      data.musclePct = Number(((data.muscleMass / data.weight) * 100).toFixed(1));
    }
    setBioData(data);
    
    bioUpload.clear();
    setShowBioModal(true);
  };

  const closeBioModal = () => {
    setShowBioModal(false);
    setEditingBioId(null);
    bioUpload.clear();
    setBioData({ weight: 0, bodyFatPct: 0, bodyFatKg: 0, muscleMass: 0, visceralFat: 0, leanMass: 0, musclePct: 0 });
    setBioDate(new Date().toISOString().split('T')[0]);
  };

  const handleAddMeas = async () => {
    if (!measDate || !selectedStudentId) return;
    setSaving(true);
    try {
      if (editingMeasId) {
        await updateMeasurement(editingMeasId, {
          date: measDate,
          weight: measWeight,
          height: measHeight,
          measurements: measValues,
          skinfolds,
        });
      } else {
        await addMeasurement({
          studentId: selectedStudentId,
          date: measDate,
          weight: measWeight,
          height: measHeight,
          measurements: measValues,
          skinfolds,
        });
      }
      setShowMeasModal(false);
      setEditingMeasId(null);
    } catch (error) {
      console.error('Erro ao salvar medidas:', error);
      alert('Erro ao salvar.');
    } finally { setSaving(false); }
  };

  const openEditMeas = (m: typeof evoMeasurements[0]) => {
    setEditingMeasId(m.id);
    setMeasDate(m.date.toISOString().split('T')[0]);
    setMeasWeight(m.weight);
    setMeasHeight(m.height);
    setMeasValues({ ...m.measurements });
    setSkinfolds({ ...m.skinfolds });
    setShowMeasModal(true);
  };

  const closeMeasModal = () => {
    setShowMeasModal(false);
    setEditingMeasId(null);
    setMeasWeight(0); setMeasHeight(0);
    setMeasValues({ chest: 0, waist: 0, hip: 0, arm: 0, thigh: 0, calf: 0 });
    setSkinfolds({ triceps: 0, biceps: 0, subscapular: 0, suprailiac: 0, abdominal: 0 });
    setMeasDate(new Date().toISOString().split('T')[0]);
  };

  const tabs = [
    { id: 'photos' as const, label: 'Fotos', icon: Camera },
    { id: 'bioimpedance' as const, label: 'Bioimpedancia', icon: Upload },
    { id: 'measurements' as const, label: 'Medidas', icon: TrendingUp },
  ];

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="page-header mb-0">
        <h1 className="text-lg font-extrabold tracking-tight" style={{color:'var(--n-900)'}}>Evolução</h1>
        <p className="text-xs mt-0.5" style={{color:'var(--n-500)'}}>Acompanhe o progresso dos seus clientes</p>
      </div>

      <div className="p-4 sm:p-5">
      <div className="relative mb-4">
        <button onClick={() => setShowStudentDropdown(v => !v)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all touch-manipulation"
          style={selectedStudent ? {background:'var(--accent-light)',border:'1.5px solid var(--accent)'} : {background:'var(--n-0)',border:'1px solid var(--n-200)'}}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={selectedStudent ? {background:'var(--accent)',color:'var(--n-0)'} : {background:'var(--n-100)',color:'var(--n-400)'}}>
            <User size={16} />
          </div>
          <div className="flex-1 text-left min-w-0">
            {selectedStudent ? (
              <><div className="text-sm font-bold truncate" style={{color:'var(--n-900)'}}>{selectedStudent.name}</div><div className="text-xs" style={{color:'var(--accent)'}}>Cliente selecionado</div></>
            ) : (
              <div className="text-sm" style={{color:'var(--n-400)'}}>Selecionar cliente...</div>
            )}
          </div>
          <ChevronDown size={16} className={`transition-transform flex-shrink-0 ${showStudentDropdown ? 'rotate-180' : ''}`} style={{color:'var(--n-400)'}} />
        </button>
        {showStudentDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-xl z-20 overflow-hidden" style={{background:'var(--n-0)',border:'1px solid var(--n-200)',boxShadow:'var(--sh-lg)'}}>
            {STUDENTS_LIST.map(s => (
              <button key={s.id} onClick={() => { setSelectedStudentId(s.id); setShowStudentDropdown(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors touch-manipulation hover:bg-black/[0.02]" style={s.id === selectedStudentId ? {background:'var(--accent-light)'} : {}}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:'var(--accent)',color:'var(--n-0)'}}><span className="text-xs font-bold">{s.name.charAt(0)}</span></div>
                <span className="text-sm font-semibold" style={{color: s.id === selectedStudentId ? 'var(--accent)' : 'var(--n-900)'}}>{s.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!selectedStudentId && (
        <div className="text-center py-14">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{background:'var(--n-100)',border:'1px solid var(--n-200)'}}><User size={24} style={{color:'var(--n-400)'}} /></div>
          <p className="text-sm font-bold" style={{color:'var(--n-900)'}}>Nenhum cliente selecionado</p>
          <p className="text-xs mt-1" style={{color:'var(--n-400)'}}>Selecione um cliente para ver sua evolução</p>
        </div>
      )}

      {selectedStudentId && (<>
        <div className="flex rounded-lg p-0.5 mb-4" style={{background:'var(--n-100)',border:'1px solid var(--n-200)'}}>
          {tabs.map((tab) => { const Icon = tab.icon; return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-semibold transition-all duration-120 touch-manipulation ${
              activeTab === tab.id ? 'bg-white shadow-sm' : ''
            }`} style={{color: activeTab === tab.id ? 'var(--accent)' : 'var(--n-400)'}}>
              <Icon size={14} /><span>{tab.label}</span>
            </button>
          ); })}
        </div>

        {activeTab === 'photos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold" style={{color:'var(--n-900)'}}>Comparativo de Fotos <span className="ml-1 text-xs font-normal" style={{color:'var(--n-400)'}}>{filteredPhotos.length} registros</span></h2>
              <button onClick={() => setShowPhotoModal(true)} className="btn btn-primary text-xs px-3 py-2"><Plus size={14} />Adicionar</button>
            </div>
            {filteredPhotos.length === 0 && (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{background:'var(--accent-light)',border:'1px solid var(--n-200)'}}><Camera size={24} style={{color:'var(--accent)'}} /></div>
                <p className="text-sm font-bold" style={{color:'var(--n-900)'}}>Nenhuma foto registrada</p>
                <p className="text-xs mt-1" style={{color:'var(--n-400)'}}>Adicione fotos para acompanhar a evolução</p>
              </div>
            )}
            <div className="space-y-4">
              {filteredPhotos.map((ps, idx) => (
                <div key={ps.id} className="rounded-xl p-4 relative" style={{background:'var(--n-0)',border:'1px solid var(--n-200)'}}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'var(--accent)',color:'var(--n-0)'}}><Camera size={13} /></div>
                      <div>
                        <div className="text-sm font-bold" style={{color:'var(--n-900)'}}>{ps.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                        {idx === 0 && <span className="text-xs font-semibold" style={{color:'var(--accent)'}}>Mais recente</span>}
                      </div>
                    </div>
                    <button onClick={() => { if(window.confirm('Excluir este comparativo de fotos?')) deletePhoto(ps.id); }} className="w-8 h-8 flex flex-col items-center justify-center rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500 transition-colors">
                      <X size={15} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ label: 'Frente', src: ps.front }, { label: 'Lado', src: ps.side }, { label: 'Costas', src: ps.back }].map(({ label, src }) => (
                      <div key={label}>
                        <div className="text-xs font-semibold mb-1.5 text-center" style={{color:'var(--n-500)'}}>{label}</div>
                        {src ? (
                          <img
                            src={src}
                            alt={label}
                            className="aspect-[3/4] w-full object-cover rounded-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        {(!src) && (
                          <div className="aspect-[3/4] rounded-lg flex items-center justify-center" style={{background:'var(--n-100)',border:'1px dashed var(--n-300)'}}><Camera size={20} style={{color:'var(--n-300)'}} /></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'bioimpedance' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold" style={{color:'var(--n-900)'}}>Bioimpedâncias</h2>
              <button onClick={() => setShowBioModal(true)} className="btn btn-primary text-xs px-3 py-2"><Plus size={14} />Adicionar</button>
            </div>
            {filteredBio.length === 0 && (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{background:'var(--accent-light)',border:'1px solid var(--n-200)'}}><Upload size={24} style={{color:'var(--accent)'}} /></div>
                <p className="text-sm font-medium" style={{color:'var(--n-400)'}}>Nenhuma bioimpedância registrada</p>
              </div>
            )}
            <div className="space-y-4">
              {filteredBio.map((bio, idx) => {
                const prev = filteredBio[idx + 1];
                const metrics = [
                  { label: 'Peso Corporal',       value: bio.data.weight,      unit: 'kg',  prev: prev?.data.weight,      lowerIsBetter: true  },
                  { label: '% Gordura',            value: bio.data.bodyFatPct,  unit: '%',   prev: prev?.data.bodyFatPct,  lowerIsBetter: true  },
                  { label: 'Gordura (kg)',          value: bio.data.bodyFatKg,   unit: 'kg',  prev: prev?.data.bodyFatKg,   lowerIsBetter: true  },
                  { label: 'Massa Muscular',        value: bio.data.muscleMass,  unit: 'kg',  prev: prev?.data.muscleMass,  lowerIsBetter: false },
                  { label: 'Gordura Visceral',      value: bio.data.visceralFat, unit: 'nv',  prev: prev?.data.visceralFat, lowerIsBetter: true  },
                  { label: 'Massa Magra',           value: bio.data.leanMass,    unit: 'kg',  prev: prev?.data.leanMass,    lowerIsBetter: false },
                  { label: '% Massa Muscular',      value: bio.data.musclePct,   unit: '%',   prev: prev?.data.musclePct,   lowerIsBetter: false },
                ];
                return (
                  <div key={bio.id} className="rounded-xl p-4" style={{background:'var(--n-0)',border:'1px solid var(--n-200)'}}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'var(--accent)',color:'var(--n-0)'}}><Upload size={13} /></div>
                        <div>
                          <div className="text-sm font-semibold" style={{color:'var(--n-900)'}}>{bio.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                          {idx === 0 && <span className="text-xs font-medium" style={{color:'var(--accent)'}}>Mais recente</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {bio.image ? (
                          <button onClick={() => setBioImageViewer(bio.image)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors touch-manipulation" style={{background:'var(--accent-light)',color:'var(--accent)'}}>
                            <Camera size={13} />Ver imagem
                          </button>
                        ) : null}
                        <button onClick={() => openEditBio(bio)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 transition-colors" style={{color:'var(--accent)'}} title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => { if(window.confirm('Excluir esta bioimpedância?')) deleteBioimpedance(bio.id); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500 transition-colors">
                          <X size={15} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {metrics.map((m) => {
                        const diff = m.prev !== undefined ? m.value - m.prev : null;
                        const improved = diff !== null && (m.lowerIsBetter ? diff < 0 : diff > 0);
                        const worsened = diff !== null && (m.lowerIsBetter ? diff > 0 : diff < 0);
                        return (
                          <div key={m.label} className="rounded-lg p-2.5" style={{background:'var(--n-50)',border:'1px solid var(--n-200)'}}>
                            <div className="text-xs mb-1 leading-tight" style={{color:'var(--n-500)'}}>{m.label}</div>
                            <div className="text-sm font-bold" style={{color:'var(--n-900)'}}>{m.value}<span className="text-xs font-normal ml-0.5" style={{color:'var(--n-400)'}}>{m.unit}</span></div>
                            {diff !== null && (
                              <div className={`text-xs mt-0.5 flex items-center gap-0.5 font-medium ${improved ? 'text-green-500' : worsened ? 'text-red-500' : 'text-gray-400'}`}>
                                {improved ? <TrendingDown size={10} /> : worsened ? <TrendingUp size={10} /> : null}
                                {diff !== 0 && <span>{diff > 0 ? '+' : ''}{diff.toFixed(1)}</span>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bioimpedance Image Viewer Modal */}
        {bioImageViewer && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setBioImageViewer(null)}>
            <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
              <button onClick={() => setBioImageViewer(null)} className="absolute -top-10 right-0 w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                <X size={16} className="text-white" />
              </button>
              <img src={bioImageViewer} alt="Bioimpedancia" className="w-full rounded-2xl shadow-2xl" />
              <p className="text-center text-white/60 text-xs mt-3">Toque fora para fechar</p>
            </div>
          </div>
        )}

        {activeTab === 'measurements' && (
          <div className="space-y-4 sm:space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold" style={{color:'var(--n-900)'}}>Medidas e Dobras</h2>
              <button onClick={() => setShowMeasModal(true)} className="btn btn-primary text-xs px-3 py-2"><Plus size={14} />Adicionar</button>
            </div>
            {filteredMeasurements.length === 0 && (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{background:'var(--success-light)',border:'1px solid var(--n-200)'}}><TrendingUp size={24} style={{color:'var(--success)'}} /></div>
                <p className="text-sm font-medium" style={{color:'var(--n-400)'}}>Nenhuma medida registrada</p>
              </div>
            )}
            {filteredMeasurements.length > 0 && (<>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {measurementsChartData.length > 0 && (
                  <div className="rounded-xl p-4 sm:col-span-2" style={{background:'var(--n-0)',border:'1px solid var(--n-200)'}}>
                    <h3 className="text-sm font-semibold mb-3" style={{color:'var(--n-700)'}}>Medidas Corporais (cm)</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={measurementsChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '12px' }} formatter={(v: any, n: any) => [`${v ?? ''} cm`, n === 'cintura' ? 'Cintura' : n === 'quadril' ? 'Quadril' : 'Peitoral']} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} formatter={(v: any) => v === 'cintura' ? 'Cintura' : v === 'quadril' ? 'Quadril' : 'Peitoral'} />
                        <Line type="monotone" dataKey="cintura" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 4, fill: '#F59E0B', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} connectNulls />
                        <Line type="monotone" dataKey="quadril" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 4, fill: '#8B5CF6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} connectNulls />
                        <Line type="monotone" dataKey="peitoral" stroke="#06B6D4" strokeWidth={2.5} dot={{ r: 4, fill: '#06B6D4', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {weightData.length > 0 && (
                  <div className="rounded-xl p-4" style={{background:'var(--n-0)',border:'1px solid var(--n-200)'}}>
                    <h3 className="text-sm font-semibold mb-3" style={{color:'var(--n-700)'}}>Evolução do Peso</h3>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={weightData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '12px' }} formatter={(v: any) => [`${v ?? ''} kg`, 'Peso']} />
                        <Line type="monotone" dataKey="peso" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 5, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {filteredMeasurements.map((m, idx) => {
                  const prev = filteredMeasurements[idx + 1];
                  return (
                    <div key={m.id} className="rounded-xl p-4" style={{background:'var(--n-0)',border:'1px solid var(--n-200)'}}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'var(--success)',color:'var(--n-0)'}}><TrendingUp size={13} /></div>
                          <div>
                            <div className="text-sm font-semibold" style={{color:'var(--n-900)'}}>{m.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                            {idx === 0 && <span className="text-xs font-medium" style={{color:'var(--success)'}}>Mais recente</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditMeas(m)} className="w-8 h-8 flex flex-col items-center justify-center rounded-lg hover:bg-blue-50 transition-colors" style={{color:'var(--accent)'}} title="Editar">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => { if(window.confirm('Excluir estas medidas?')) deleteMeasurement(m.id); }} className="w-8 h-8 flex flex-col items-center justify-center rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500 transition-colors">
                            <X size={15} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[
                          { label: 'Peitoral', val: m.measurements.chest, prevVal: prev?.measurements.chest },
                          { label: 'Cintura', val: m.measurements.waist, prevVal: prev?.measurements.waist },
                          { label: 'Quadril', val: m.measurements.hip, prevVal: prev?.measurements.hip },
                          { label: 'Braco', val: m.measurements.arm, prevVal: prev?.measurements.arm },
                          { label: 'Coxa', val: m.measurements.thigh, prevVal: prev?.measurements.thigh },
                          { label: 'Panturr.', val: m.measurements.calf, prevVal: prev?.measurements.calf },
                        ].map(({ label, val, prevVal }) => {
                          if (val === 0) return null;
                          const d = prevVal !== undefined && prevVal > 0 ? val - prevVal : null;
                          return (
                            <div key={label} className="rounded-lg p-2 text-center" style={{background:'var(--n-50)',border:'1px solid var(--n-200)'}}>
                              <div className="text-[10px] mb-0.5 uppercase font-bold" style={{color:'var(--n-500)'}}>{label}</div>
                              <div className="text-sm font-bold" style={{color:'var(--n-900)'}}>{val}<span className="text-[10px] font-normal" style={{color:'var(--n-400)'}}>cm</span></div>
                              {d !== null && d !== 0 && <div className={`text-[10px] font-bold ${d < 0 ? 'text-green-500' : 'text-red-500'}`}>{d > 0 ? '+' : ''}{d.toFixed(1)}</div>}
                            </div>
                          );
                        })}
                      </div>
                      {(m.skinfolds.triceps > 0 || m.skinfolds.abdominal > 0) && (
                        <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-2 pt-3" style={{borderTop:'1px dashed var(--n-200)'}}>
                           {Object.entries(m.skinfolds).map(([key, value]) => {
                             if (value === 0) return null;
                             return (
                               <div key={key} className="text-center">
                                 <div className="text-[9px] uppercase font-bold" style={{color:'var(--n-400)'}}>{key}</div>
                                 <div className="text-xs font-bold" style={{color:'var(--n-600)'}}>{value}mm</div>
                               </div>
                             );
                           })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>)}
          </div>
        )}

        {/* Photo Modal */}
        {showPhotoModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.4)',backdropFilter:'blur(4px)'}}>
            <div className="rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden" style={{background: 'var(--n-0)', border: '1px solid var(--n-200)', boxShadow: 'var(--sh-lg)'}}>
              <div className="flex items-center justify-between p-5 border-b" style={{borderColor: 'var(--n-200)'}}>
                <div>
                  <h3 className="text-base font-bold" style={{color: 'var(--n-900)'}}>Adicionar Fotos</h3>
                  <p className="text-xs mt-0.5" style={{color: 'var(--n-500)'}}>Defina a data antes de enviar as fotos</p>
                </div>
                <button onClick={closePhotoModal} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{background: 'var(--n-100)'}}>
                  <X size={16} style={{color: 'var(--n-500)'}} />
                </button>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{color: 'var(--n-700)'}}>Data do registro <span style={{color: 'var(--error)'}}>*</span></label>
                  <div className="relative">
                    <CalendarDays size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color: 'var(--n-400)'}} />
                    <input type="date" value={photoDate} onChange={e => setPhotoDate(e.target.value)} className="input-base w-full pl-9" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { slot: 'front' as const, label: 'Frente', ref: frontRef, upload: frontUpload },
                    { slot: 'side'  as const, label: 'Lado',   ref: sideRef,  upload: sideUpload },
                    { slot: 'back'  as const, label: 'Costas', ref: backRef,  upload: backUpload },
                  ]).map(({ slot, label, ref, upload }) => (
                    <div key={slot}>
                      <div className="text-xs font-medium mb-1.5 text-center" style={{color: 'var(--n-500)'}}>{label}</div>
                      <button
                        disabled={!photoDate}
                        onClick={() => ref.current?.click()}
                        className={`relative w-full aspect-[3/4] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-all overflow-hidden ${
                          !photoDate ? 'opacity-40 cursor-not-allowed' : ''
                        }`}
                        style={upload.previewUrl
                          ? { borderColor: 'transparent', padding: 0 }
                          : { borderColor: 'var(--n-300)', background: 'var(--n-50)' }
                        }
                      >
                        {upload.compressing ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="spinner" style={{width: 20, height: 20}} />
                            <span className="text-[10px] font-medium" style={{color: 'var(--accent)'}}>Comprimindo...</span>
                          </div>
                        ) : upload.previewUrl ? (
                          <>
                            <img src={upload.previewUrl} alt={label} className="w-full h-full object-cover" />
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{background: 'var(--accent)'}}>
                              <CheckCircle2 size={12} className="text-white" />
                            </div>
                            <div className="absolute bottom-1.5 left-1.5 right-1.5 text-center">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{background: 'rgba(0,0,0,0.5)', color: '#fff'}}>
                                {upload.file ? `${Math.round(upload.file.size / 1024)}KB` : ''}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <Camera size={20} style={{color: 'var(--n-400)'}} />
                            <span className="text-[10px] font-medium" style={{color: 'var(--n-400)'}}>
                              {photoDate ? 'Abrir Galeria' : 'Data primeiro'}
                            </span>
                          </>
                        )}
                      </button>
                      {upload.error && <p className="text-[10px] mt-1 text-center" style={{color: 'var(--error)'}}>{upload.error}</p>}
                      <input
                        ref={ref}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => upload.setFile(e.target.files?.[0])}
                      />
                    </div>
                  ))}
                </div>
                {!photoDate && <p className="text-xs rounded-lg px-3 py-2" style={{color: 'var(--warning)', background: 'var(--warning-light)'}}>Insira a data do registro para habilitar o envio de fotos.</p>}
              </div>
              <div className="flex gap-3 p-5 border-t bg-white" style={{borderColor: 'var(--n-200)'}}>
                <button onClick={closePhotoModal} className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors" style={{border: '1px solid var(--n-200)', color: 'var(--n-600)'}}>Cancelar</button>
                <button
                  onClick={handleAddPhoto}
                  disabled={saving
                    || frontUpload.compressing || sideUpload.compressing || backUpload.compressing
                    || !photoDate
                    || (!frontUpload.file && !sideUpload.file && !backUpload.file)
                  }
                  className="btn btn-primary flex-1 py-2.5 text-sm font-bold disabled:opacity-40"
                >
                  {(frontUpload.compressing || sideUpload.compressing || backUpload.compressing)
                    ? 'Comprimindo...'
                    : saving ? 'Salvando...' : 'Salvar'
                  }
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bioimpedance Modal */}
        {showBioModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8" style={{background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)'}}>
            <div className="rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden" style={{background: 'var(--n-0)', border: '1px solid var(--n-200)', boxShadow: 'var(--sh-lg)'}}>
              {/* Header Fixo */}
              <div className="flex items-center justify-between p-5 border-b" style={{borderColor: 'var(--n-200)'}}>
                <h3 className="text-base font-bold" style={{color: 'var(--n-900)'}}>{editingBioId ? 'Editar Bioimpedância' : 'Nova Bioimpedância'}</h3>
                <button onClick={closeBioModal} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{background: 'var(--n-100)'}}>
                  <X size={16} style={{color: 'var(--n-500)'}} />
                </button>
              </div>

              {/* Conteúdo com Scroll */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold" style={{color: 'var(--n-600)'}}>Data</label>
                    <input type="date" value={bioDate} onChange={e => setBioDate(e.target.value)} className="input-base w-full mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold" style={{color: 'var(--n-600)'}}>Imagem Exame</label>
                    <button
                      onClick={() => bioFileRef.current?.click()}
                      className="input-base w-full mt-1 truncate text-left text-xs flex items-center gap-2"
                    >
                      <Upload size={13} style={{color: 'var(--n-400)'}} />
                      <span className="truncate">{bioUpload.file ? bioUpload.file.name : 'Abrir Galeria...'}</span>
                    </button>
                    <input ref={bioFileRef} type="file" className="hidden" accept="image/*" onChange={e => bioUpload.setFile(e.target.files?.[0])} />
                  </div>
                </div>

                {bioUpload.previewUrl && (
                  <div className="relative rounded-xl overflow-hidden" style={{border: '1px solid var(--n-200)'}}>
                    <img src={bioUpload.previewUrl} alt="Preview bioimpedância" className="w-full max-h-48 object-contain" style={{background: 'var(--n-50)'}} />
                    <button onClick={bioUpload.clear} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{background: 'rgba(0,0,0,0.5)'}}>
                      <X size={13} className="text-white" />
                    </button>
                  </div>
                )}
                {bioUpload.error && <p className="text-xs" style={{color: 'var(--error)'}}>{bioUpload.error}</p>}

                <div className="grid grid-cols-2 gap-3 pb-2">
                  {[
                    { label: 'Peso (kg)', key: 'weight' },
                    { label: '% Gordura', key: 'bodyFatPct' },
                    { label: 'Gordura (kg)', key: 'bodyFatKg' },
                    { label: 'Massa Musc (kg)', key: 'muscleMass' },
                    { label: 'Gord. Visceral', key: 'visceralFat' },
                    { label: 'Massa Magra (kg)', key: 'leanMass' },
                    { label: '% Mas. Musc', key: 'musclePct' },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="text-[10px] font-bold uppercase" style={{color: 'var(--n-500)'}}>{field.label}</label>
                      <input
                        type="number"
                        step="0.1"
                        value={bioData[field.key as keyof typeof bioData] || ''}
                        placeholder="0"
                        onFocus={(e) => field.key !== 'musclePct' && e.target.select()}
                        onChange={e => setBioData({...bioData, [field.key]: e.target.value === '' ? 0 : Number(e.target.value)})}
                        readOnly={field.key === 'musclePct'}
                        className={`input-base w-full mt-1 ${field.key === 'musclePct' ? 'opacity-60 bg-black/[0.03] cursor-not-allowed' : ''}`}
                        title={field.key === 'musclePct' ? 'Calculado automaticamente (Massa Musc / Peso)' : ''}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Rodapé Fixo */}
              <div className="flex gap-3 p-5 border-t bg-white" style={{borderColor: 'var(--n-200)'}}>
                <button onClick={closeBioModal} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{border: '1px solid var(--n-200)', color: 'var(--n-600)'}}>Cancelar</button>
                <button onClick={handleAddBio} disabled={saving} className="btn btn-primary flex-1 py-2.5 text-sm font-bold">{saving ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Measurements Modal */}
        {showMeasModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8" style={{background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)'}}>
            <div className="rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden" style={{background: 'var(--n-0)', border: '1px solid var(--n-200)', boxShadow: 'var(--sh-lg)'}}>
              {/* Header Fixo */}
              <div className="flex items-center justify-between p-5 border-b" style={{borderColor: 'var(--n-200)'}}>
                <h3 className="text-base font-bold" style={{color: 'var(--n-900)'}}>{editingMeasId ? 'Editar Medidas' : 'Novas Medidas'}</h3>
                <button onClick={closeMeasModal} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{background: 'var(--n-100)'}}>
                  <X size={16} style={{color: 'var(--n-500)'}} />
                </button>
              </div>

              {/* Conteúdo com Scroll */}
              <div className="p-5 space-y-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="text-[10px] font-bold" style={{color: 'var(--n-600)'}}>Data</label>
                    <input type="date" value={measDate} onChange={e => setMeasDate(e.target.value)} className="input-base w-full mt-1 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold" style={{color: 'var(--n-600)'}}>Peso (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={measWeight || ''}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={e => setMeasWeight(e.target.value === '' ? 0 : Number(e.target.value))}
                      className="input-base w-full mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold" style={{color: 'var(--n-600)'}}>Altura (cm)</label>
                    <input
                      type="number"
                      value={measHeight || ''}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={e => setMeasHeight(e.target.value === '' ? 0 : Number(e.target.value))}
                      className="input-base w-full mt-1"
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold mb-3 flex items-center gap-2" style={{color: 'var(--accent)'}}><div className="flex-1 h-px" style={{background: 'var(--n-100)'}}></div>Perímetros (cm)<div className="flex-1 h-px" style={{background: 'var(--n-100)'}}></div></h4>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.keys(measValues).map(k => (
                      <div key={k}>
                        <label className="text-[10px] font-bold uppercase" style={{color: 'var(--n-500)'}}>{k === 'chest' ? 'Peito' : k === 'waist' ? 'Cintura' : k === 'hip' ? 'Quadril' : k === 'arm' ? 'Braço' : k === 'thigh' ? 'Coxa' : 'Panturr.'}</label>
                        <input
                          type="number"
                          step="0.1"
                          value={measValues[k as keyof typeof measValues] || ''}
                          placeholder="0"
                          onFocus={(e) => e.target.select()}
                          onChange={e => setMeasValues({...measValues, [k]: e.target.value === '' ? 0 : Number(e.target.value)})}
                          className="input-base w-full mt-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pb-2">
                  <h4 className="text-xs font-bold mb-3 flex items-center gap-2" style={{color: 'var(--error)'}}><div className="flex-1 h-px" style={{background: 'var(--n-100)'}}></div>Dobras (mm)<div className="flex-1 h-px" style={{background: 'var(--n-100)'}}></div></h4>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.keys(skinfolds).map(k => (
                      <div key={k}>
                        <label className="text-[10px] font-bold uppercase" style={{color: 'var(--n-500)'}}>
                          {k === 'triceps' ? 'Triceps' : k === 'biceps' ? 'Biceps' : k === 'subscapular' ? 'Subscap.' : k === 'suprailiac' ? 'Suprail.' : 'Abdom.'}
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={skinfolds[k as keyof typeof skinfolds] || ''}
                          placeholder="0"
                          onFocus={(e) => e.target.select()}
                          onChange={e => setSkinfolds({...skinfolds, [k]: e.target.value === '' ? 0 : Number(e.target.value)})}
                          className="input-base w-full mt-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rodapé Fixo */}
              <div className="flex gap-3 p-5 border-t bg-white" style={{borderColor: 'var(--n-200)'}}>
                <button onClick={() => setShowMeasModal(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{border: '1px solid var(--n-200)', color: 'var(--n-600)'}}>Cancelar</button>
                <button onClick={handleAddMeas} disabled={saving} className="btn btn-primary flex-1 py-2.5 text-sm font-bold">{saving ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </div>
          </div>
        )}
      </>)}
      </div>
    </div>
  );
};

const Evolution: React.FC = () => {
  const { canAccessEvolution } = usePermissions();
  return (
    <FeatureGate
      allowed={canAccessEvolution}
      feature="evolution"
      title="Módulo de Evolução"
      description="Acompanhe fotos de progresso, bioimpedância e medidas dos seus clientes. Disponível no plano Premium."
    >
      <EvolutionContent />
    </FeatureGate>
  );
};

export default Evolution;
