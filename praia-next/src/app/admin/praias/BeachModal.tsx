'use client';

import { useState, useEffect } from 'react';
import { saveBeach, getAnchors, getCities } from './actions';
import SearchableSelect from '@/components/admin/SearchableSelect';

interface BeachModalProps {
    isOpen: boolean;
    onClose: () => void;
    beach?: any; // If editing
}

export default function BeachModal({ isOpen, onClose, beach }: BeachModalProps) {
    const [loading, setLoading] = useState(false);
    const [anchors, setAnchors] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);
    const [showNewAnchor, setShowNewAnchor] = useState(false);

    const [formData, setFormData] = useState({
        id: '',
        name: '',
        cityId: '',
        region: '',
        idealWind: '',
        offlineDesc: '',
        anchorId: '',
        newAnchor: {
            name: '',
            latitude: '',
            longitude: '',
            cityId: ''
        }
    });

    useEffect(() => {
        if (isOpen) {
            loadInitialData();
            if (beach) {
                setFormData({
                    id: beach.id || '',
                    name: beach.name || '',
                    cityId: beach.cityId || '',
                    region: beach.region || '',
                    idealWind: beach.idealWind || '',
                    offlineDesc: beach.offlineDesc || '',
                    anchorId: beach.anchorId || '',
                    newAnchor: { name: '', latitude: '', longitude: '', cityId: '' }
                });
            } else {
                setFormData({
                    id: '',
                    name: '',
                    cityId: '',
                    region: '',
                    idealWind: '',
                    offlineDesc: '',
                    anchorId: '',
                    newAnchor: { name: '', latitude: '', longitude: '', cityId: '' }
                });
            }
            setShowNewAnchor(false);
        }
    }, [isOpen, beach]);

    async function loadInitialData() {
        const [anchorData, cityData] = await Promise.all([getAnchors(), getCities()]);
        setAnchors(anchorData);
        setCities(cityData);

        // Set default city for new beach
        if (!beach && cityData.length > 0) {
            setFormData(prev => ({ ...prev, cityId: cityData[0].id }));
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await saveBeach(formData);
            onClose();
        } catch (error) {
            console.error('Erro ao salvar praia:', error);
            alert('Erro ao salvar praia. Verifique os campos.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                <header className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                            <span className="text-rose-500">{beach ? '📝' : '🏖️'}</span> {beach ? 'Editar Praia' : 'Nova Praia'}
                        </h2>
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mt-0.5">Configurações regionais e de microclima</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors group">
                        <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Nome da Praia (Exatamente como no IMA)</label>
                            <input
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                placeholder="Ex: Praia de Jurerê"
                            />
                        </div>

                        <div>
                            <SearchableSelect
                                label="Cidade / Município"
                                placeholder="Selecionar Cidade..."
                                options={cities.map(c => ({ id: c.id, name: c.name }))}
                                value={formData.cityId}
                                onChange={cityId => setFormData({ ...formData, cityId })}
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Região (Tag Interna)</label>
                            <select
                                required
                                value={formData.region}
                                onChange={e => setFormData({ ...formData, region: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all appearance-none"
                            >
                                <option value="">Selecionar...</option>
                                <option value="North">Norte da Ilha</option>
                                <option value="North/Exposed">Norte (Exposta)</option>
                                <option value="East">Leste da Ilha</option>
                                <option value="East/Exposed">Leste (Exposta)</option>
                                <option value="South">Sul da Ilha</option>
                                <option value="South/Exposed">Sul (Exposta)</option>
                                <option value="Mainland">Continente</option>
                            </select>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Ventos Ideais (Separados por vírgula)</label>
                            <input
                                required
                                value={formData.idealWind}
                                onChange={e => setFormData({ ...formData, idealWind: e.target.value.toUpperCase() })}
                                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                placeholder="Ex: S, SW, W"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Ponto de Referência (Microclima)</label>
                            <div className="flex gap-2">
                                <SearchableSelect
                                    placeholder="Nenhum (Usar global)"
                                    options={anchors.map(a => ({
                                        id: a.id,
                                        name: a.name,
                                        subtext: a.city?.name
                                    }))}
                                    value={formData.anchorId}
                                    onChange={anchorId => setFormData({ ...formData, anchorId })}
                                    className="flex-1"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewAnchor(!showNewAnchor)}
                                    className={`px-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all border ${showNewAnchor ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-blue-500 border-blue-200 hover:bg-blue-50'}`}
                                >
                                    {showNewAnchor ? 'Cancelar' : '+ Novo Ponto'}
                                </button>
                            </div>
                        </div>

                        {showNewAnchor && (
                            <div className="col-span-2 p-5 bg-blue-50 rounded-3xl border border-blue-100 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                    <span className="text-base">📍</span> Detalhes do Novo Ponto Geográfico
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <input
                                            placeholder="Apelido do Ponto (Ex: Centro Sul)"
                                            value={formData.newAnchor.name}
                                            onChange={e => setFormData({ ...formData, newAnchor: { ...formData.newAnchor, name: e.target.value } })}
                                            className="w-full bg-white border border-blue-200 p-2.5 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <input
                                        placeholder="Latitude (Ex: -27.44)"
                                        value={formData.newAnchor.latitude}
                                        onChange={e => setFormData({ ...formData, newAnchor: { ...formData.newAnchor, latitude: e.target.value } })}
                                        className="w-full bg-white border border-blue-200 p-2.5 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                                    />
                                    <input
                                        placeholder="Longitude (Ex: -48.49)"
                                        value={formData.newAnchor.longitude}
                                        onChange={e => setFormData({ ...formData, newAnchor: { ...formData.newAnchor, longitude: e.target.value } })}
                                        className="w-full bg-white border border-blue-200 p-2.5 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                                    />
                                    <select
                                        value={formData.newAnchor.cityId || formData.cityId}
                                        onChange={e => setFormData({ ...formData, newAnchor: { ...formData.newAnchor, cityId: e.target.value } })}
                                        className="w-full bg-white border border-blue-200 p-2.5 rounded-xl text-xs font-bold outline-none focus:border-blue-500 appearance-none"
                                    >
                                        <option value="">Cidade do Ponto...</option>
                                        {cities.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <p className="text-[9px] text-blue-400 font-bold leading-relaxed">
                                    * Este ponto servirá de âncora para buscar dados de previsão do tempo e mar para todas as praias vinculadas a ele.
                                </p>
                            </div>
                        )}

                        <div className="col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Descrição Offline (Guia da Praia)</label>
                            <textarea
                                required
                                value={formData.offlineDesc}
                                onChange={e => setFormData({ ...formData, offlineDesc: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all min-h-[100px]"
                                placeholder="Dê uma dica rápida sobre a praia..."
                            />
                        </div>
                    </div>
                </form>

                <footer className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-8 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                    >
                        {loading ? 'Salvando...' : 'Salvar Praia'}
                    </button>
                </footer>
            </div >
        </div >
    );
}
