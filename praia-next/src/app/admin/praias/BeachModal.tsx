'use client';

import { useState, useEffect } from 'react';
import { saveBeach, getAnchors, getCities } from './actions';
import SearchableSelect from '@/components/admin/SearchableSelect';
import { 
    X, 
    Umbrella, 
    MapPin, 
    Wind, 
    FileText, 
    Check, 
    Plus,
    Navigation,
    Info,
    Trash2
} from 'lucide-react';

interface BeachModalProps {
    isOpen: boolean;
    onClose: () => void;
    beach?: any; 
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative z-10 animate-in zoom-in-95 duration-300">
                
                {/* Header */}
                <header className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${beach ? 'bg-blue-50 text-blue-600' : 'bg-blue-600 text-white'}`}>
                            {beach ? <FileText size={24} /> : <Umbrella size={24} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 leading-tight">
                                {beach ? 'Editar Praia' : 'Cadastrar Nova Praia'}
                            </h2>
                            <p className="text-sm font-medium text-slate-400">
                                {beach ? 'Atualize as informações da base de dados.' : 'Preencha os dados para adicionar à rede.'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all border border-transparent hover:border-slate-200"
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-6 space-y-8 custom-scrollbar">
                    
                    {/* Section: Identificação */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Info size={16} className="text-blue-500" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Identificação Básica</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700 ml-1">Nome da Praia</label>
                                <input
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-sm font-semibold focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                                    placeholder="Ex: Praia da Joaquina"
                                />
                                <p className="text-[10px] text-slate-400 font-medium ml-1">* Use o nome exato conforme consta nos laudos do IMA.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <SearchableSelect
                                    label="Cidade / Município"
                                    placeholder="Escolher..."
                                    options={cities.map(c => ({ id: c.id, name: c.name }))}
                                    value={formData.cityId}
                                    onChange={cityId => setFormData({ ...formData, cityId })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700 ml-1">Região da Ilha/Continente</label>
                                <select
                                    required
                                    value={formData.region}
                                    onChange={e => setFormData({ ...formData, region: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-sm font-semibold focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Selecionar...</option>
                                    <option value="NORTH">Norte da Ilha</option>
                                    <option value="NORTH/EXPOSED">Norte (Mar Aberto)</option>
                                    <option value="EAST">Leste da Ilha</option>
                                    <option value="EAST/EXPOSED">Leste (Mar Aberto)</option>
                                    <option value="SOUTH">Sul da Ilha</option>
                                    <option value="SOUTH/EXPOSED">Sul (Mar Aberto)</option>
                                    <option value="MAINLAND">Continente</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Section: Microclima */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Wind size={16} className="text-blue-500" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Microclima & Previsão</h3>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700 ml-1">Ventos Favoráveis</label>
                            <input
                                required
                                value={formData.idealWind}
                                onChange={e => setFormData({ ...formData, idealWind: e.target.value.toUpperCase() })}
                                className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-sm font-semibold focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                placeholder="Ex: S, SE, NW (ou use 'QUALQUER')"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700 ml-1">Ponto de Âncora (Geolocalização)</label>
                            <div className="flex gap-2">
                                <SearchableSelect
                                    placeholder="Usar Ponto Global"
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
                                    className={`px-5 rounded-2xl font-bold text-xs transition-all border shrink-0 flex items-center gap-2 ${showNewAnchor ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'}`}
                                >
                                    {showNewAnchor ? <Trash2 size={16} /> : <Plus size={16} strokeWidth={3} />}
                                    {showNewAnchor ? 'Cancelar' : 'Novo Ponto'}
                                </button>
                            </div>
                        </div>

                        {showNewAnchor && (
                            <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4 animate-in slide-in-from-top-4 duration-500">
                                <p className="text-xs font-bold text-blue-600 uppercase flex items-center gap-2">
                                    <Navigation size={14} /> Novo Ponto de Referência
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        placeholder="Apelido do Ponto"
                                        value={formData.newAnchor.name}
                                        onChange={e => setFormData({ ...formData, newAnchor: { ...formData.newAnchor, name: e.target.value } })}
                                        className="col-span-2 bg-white border border-slate-200 p-3 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 transition-all"
                                    />
                                    <input
                                        placeholder="Latitude (Ex: -27.42)"
                                        value={formData.newAnchor.latitude}
                                        onChange={e => setFormData({ ...formData, newAnchor: { ...formData.newAnchor, latitude: e.target.value } })}
                                        className="bg-white border border-slate-200 p-3 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 transition-all"
                                    />
                                    <input
                                        placeholder="Longitude (Ex: -48.31)"
                                        value={formData.newAnchor.longitude}
                                        onChange={e => setFormData({ ...formData, newAnchor: { ...formData.newAnchor, longitude: e.target.value } })}
                                        className="bg-white border border-slate-200 p-3 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Section: Conteúdo Offline */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText size={16} className="text-blue-500" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Guia & Dicas (App)</h3>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700 ml-1">Descrição Informativa</label>
                            <textarea
                                required
                                value={formData.offlineDesc}
                                onChange={e => setFormData({ ...formData, offlineDesc: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-semibold focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all min-h-[120px] placeholder:text-slate-400"
                                placeholder="Descreva brevemente a praia, acessos ou curiosidades..."
                            />
                        </div>
                    </section>
                </form>

                {/* Footer */}
                <footer className="px-8 py-6 border-t border-slate-100 bg-white flex justify-end gap-4 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 rounded-2xl font-bold text-sm text-slate-500 hover:bg-slate-50 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-10 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-blue-200 transition-all flex items-center gap-3 active:scale-95"
                    >
                        {loading ? 'Processando...' : (
                            <>
                                <Check size={18} strokeWidth={3} />
                                {beach ? 'Salvar Alterações' : 'Concluir Cadastro'}
                            </>
                        )}
                    </button>
                </footer>
            </div >
        </div >
    );
}
