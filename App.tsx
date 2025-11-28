import React, { useState, useRef, useEffect } from 'react';
import { Compass, RotateCw, Sparkles, X, Plus, Minus, Move, Hand, ChevronLeft, ChevronRight, Settings2, Globe, Navigation, Loader2, AlertCircle, Share2, Mic, Lock, Unlock, Layers, Mountain as MountainIcon } from 'lucide-react';
import MapBackground from './components/MapBackground';
import CompassOverlay from './components/CompassOverlay';
import SearchBar from './components/SearchBar';
import ShareModal from './components/ShareModal';
import { Mountain, AnalysisState } from './types';
import { MOUNTAINS } from './constants';
import { analyzeDirection } from './services/geminiService';
import { getDeviceLocation, getMagneticDeclination, reverseGeocode, getBatchAltitudes } from './services/geoService';

export default function App() {
  // --- Initialize State from URL or Defaults ---
  const getSearchParams = () => new URLSearchParams(window.location.search);

  const [facadeRotation, setFacadeRotation] = useState(() => {
    const params = getSearchParams();
    return params.has('rot') ? parseFloat(params.get('rot')!) : 0;
  });

  const [declination, setDeclination] = useState(() => {
    const params = getSearchParams();
    return params.has('dec') ? parseFloat(params.get('dec')!) : 12.0;
  });

  const [useDeclination, setUseDeclination] = useState(() => {
    const params = getSearchParams();
    return params.has('useDec') ? params.get('useDec') === 'true' : true;
  });

  const [initialMapState] = useState(() => {
    const params = getSearchParams();
    const lat = params.has('lat') ? parseFloat(params.get('lat')!) : 55.7539; // Default Moscow
    const lon = params.has('lon') ? parseFloat(params.get('lon')!) : 37.6208;
    const zoom = params.has('z') ? parseInt(params.get('z')!, 10) : 17;
    return { center: [lat, lon] as [number, number], zoom };
  });

  const [selectedMountain, setSelectedMountain] = useState<Mountain | null>(() => {
    const params = getSearchParams();
    const id = params.get('m');
    if (id) {
      return MOUNTAINS.find(m => m.id === id) || null;
    }
    return null;
  });

  const [isDetectingDeclination, setIsDetectingDeclination] = useState(false);
  const [declinationError, setDeclinationError] = useState<string | null>(null);
  
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isMapMode, setIsMapMode] = useState(true); // True = interacting with map, False = interacting with compass
  const [isMapLocked, setIsMapLocked] = useState(false); // Prevents map movement
  const [mapLayer, setMapLayer] = useState<'satellite' | 'terrain'>('satellite'); // Map layer state
  const [showSettings, setShowSettings] = useState(false);
  const [isListeningGlobal, setIsListeningGlobal] = useState(false);
  const [centerAddress, setCenterAddress] = useState<string>('');
  
  // Altitude states
  const [showAltitudes, setShowAltitudes] = useState(false);
  const [mountainAltitudes, setMountainAltitudes] = useState<Record<string, number>>({});
  
  // Share Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState({ url: '', text: '' });
  
  // Map Instance State (Use state instead of Ref to allow effects to depend on it)
  const [mapInstance, setMapInstance] = useState<any>(null);
  
  const compassContainerRef = useRef<HTMLDivElement>(null);
  const altitudeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [analysis, setAnalysis] = useState<AnalysisState>({
    isLoading: false,
    result: null,
    error: null,
  });

  // Map Ready Handler - Called once by MapBackground
  const handleMapReady = (map: any) => {
    setMapInstance(map);
    
    // Initial Reverse Geocode
    const center = map.getCenter();
    reverseGeocode(center[0], center[1]).then(addr => {
        if (addr) setCenterAddress(addr);
    });
  };

  // Logic to attach listeners to map instance
  // This useEffect ensures that 'actionend' listener always has access to the fresh state (like showAltitudes)
  useEffect(() => {
    if (!mapInstance) return;

    const onActionEnd = async () => {
        const c = mapInstance.getCenter();
        const addr = await reverseGeocode(c[0], c[1]);
        if (addr) {
            setCenterAddress(addr);
        }
        
        // Trigger altitude update if mode is enabled
        if (showAltitudes) {
            fetchMountainAltitudes();
        }
    };

    // Attach listener
    mapInstance.events.add('actionend', onActionEnd);

    // Cleanup: Remove listener when dependencies change or component unmounts
    return () => {
        mapInstance.events.remove('actionend', onActionEnd);
    };
  }, [mapInstance, showAltitudes, facadeRotation, useDeclination, declination]); // Re-attach if these change


  const handleZoomIn = () => {
    if (mapInstance) {
      mapInstance.setZoom(mapInstance.getZoom() + 1, { duration: 300 });
    }
  };

  const handleZoomOut = () => {
    if (mapInstance) {
      mapInstance.setZoom(mapInstance.getZoom() - 1, { duration: 300 });
    }
  };

  const toggleMapLock = () => {
    setIsMapLocked(!isMapLocked);
  };
  
  const toggleMapLayer = () => {
    setMapLayer(prev => prev === 'satellite' ? 'terrain' : 'satellite');
  };
  
  const toggleAltitudes = () => {
    const newState = !showAltitudes;
    setShowAltitudes(newState);
    if (newState) {
        fetchMountainAltitudes();
    } else {
        setMountainAltitudes({});
    }
  };

  // Location Selection Handler
  const handleLocationSelect = (lat: number, lon: number, name: string) => {
    setCenterAddress(name); 
    if (mapInstance) {
      mapInstance.setCenter([lat, lon], 19, {
        duration: 1500,
        timingFunction: 'ease-in-out'
      });
    }
  };

  // Handle Facade Rotation (Red Arrow)
  const handleFacadeRotationChange = (val: number) => {
    let newRot = val;
    if (newRot >= 360) newRot -= 360;
    if (newRot < 0) newRot += 360;
    setFacadeRotation(newRot);
  };

  const adjustFacadeRotation = (delta: number) => {
    handleFacadeRotationChange(facadeRotation + delta);
  };

  const handleSelectMountain = (m: Mountain, e?: React.MouseEvent<SVGGElement, MouseEvent>) => {
    setSelectedMountain(m);
    setShowAnalysis(true);
    if (analysis.result) {
        setAnalysis({ isLoading: false, result: null, error: null });
    }

    if (mapInstance && e && !isMapLocked) {
      try {
        const projection = mapInstance.options.get('projection');
        const zoom = mapInstance.getZoom();
        
        const currentGlobalPixelCenter = mapInstance.getGlobalPixelCenter();
        const viewportCenterX = window.innerWidth / 2;
        const viewportCenterY = window.innerHeight / 2;
        const deltaX = e.clientX - viewportCenterX;
        const deltaY = e.clientY - viewportCenterY;
        
        const newGlobalPixelCenter = [
          currentGlobalPixelCenter[0] + deltaX,
          currentGlobalPixelCenter[1] + deltaY
        ];
        
        const newGeoCenter = projection.fromGlobalPixels(newGlobalPixelCenter, zoom);
        
        mapInstance.panTo(newGeoCenter, {
          flying: true,
          duration: 600,
          timingFunction: 'ease-out'
        });
      } catch (err) {
        console.error("Error moving map to sector:", err);
      }
    }
  };

  // Logic for Template Rotation
  const templateRotation = useDeclination ? declination : 0;
  const normalizedTemplateRotation = ((templateRotation % 360) + 360) % 360;

  // Recalculate altitudes when rotation changes, if mode is active
  useEffect(() => {
    if (showAltitudes && altitudeDebounceRef.current === null) {
         altitudeDebounceRef.current = setTimeout(() => {
            fetchMountainAltitudes();
            altitudeDebounceRef.current = null;
         }, 500);
    }
  }, [normalizedTemplateRotation, showAltitudes]);

  const fetchMountainAltitudes = async () => {
    if (!mapInstance || !compassContainerRef.current) return;

    const map = mapInstance;
    const centerGlobal = map.getGlobalPixelCenter();
    const projection = map.options.get('projection');
    const zoom = map.getZoom();

    const rect = compassContainerRef.current.getBoundingClientRect();
    const radius = rect.width / 2 * 0.8; 

    const locations: {lat: number, lon: number, id: string}[] = [];

    MOUNTAINS.forEach(m => {
       let s = m.startDegree;
       let e = m.endDegree;
       if (e < s) e += 360;
       const mid = (s + e) / 2;

       const totalAngle = mid + normalizedTemplateRotation;
       const rad = (totalAngle - 90) * Math.PI / 180;

       const dx = radius * Math.cos(rad);
       const dy = radius * Math.sin(rad);

       const pointGlobal = [
         centerGlobal[0] + dx,
         centerGlobal[1] + dy
       ];

       try {
           const coords = projection.fromGlobalPixels(pointGlobal, zoom);
           locations.push({ lat: coords[0], lon: coords[1], id: m.id });
       } catch (err) {
           // Projection error
       }
    });

    const alts = await getBatchAltitudes(locations);
    const newAltMap: Record<string, number> = {};
    locations.forEach((loc, i) => {
       if (alts[i] !== null) newAltMap[loc.id] = alts[i]!;
    });
    setMountainAltitudes(newAltMap);
  };

  const handleAnalyze = async () => {
    if (!selectedMountain) return;

    setAnalysis({ isLoading: true, result: null, error: null });
    try {
      let center: [number, number] | undefined;
      let zoom: number | undefined;
      
      if (mapInstance) {
        center = mapInstance.getCenter();
        zoom = mapInstance.getZoom();
      }
      
      const result = await analyzeDirection(selectedMountain, normalizedTemplateRotation, center, zoom);
      
      const textResult = typeof result === 'string' ? result : "Получен некорректный ответ от сервиса.";
      setAnalysis({ isLoading: false, result: textResult, error: null });
    } catch (err: any) {
      console.error("Analysis failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Ошибка при вызове ИИ. Проверьте ключ.";
      setAnalysis({ isLoading: false, result: null, error: errorMessage });
    }
  };

  const handleAutoDetectDeclination = async () => {
    setIsDetectingDeclination(true);
    setDeclinationError(null);
    try {
      const position = await getDeviceLocation();
      const { latitude, longitude } = position.coords;
      
      if (mapInstance && !isMapLocked) {
         mapInstance.setCenter([latitude, longitude], 17, { duration: 1000 });
      }

      const magDec = await getMagneticDeclination(latitude, longitude);
      setDeclination(parseFloat(magDec.toFixed(2)));
      setUseDeclination(true);
    } catch (error: any) {
      console.error("Auto-detect failed:", error);
      
      let msg = "Не удалось определить автоматически.";
      if (error instanceof Error) {
        msg = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        msg = String(error.message);
      } else if (typeof error === 'string') {
        msg = error;
      }
      
      setDeclinationError(`${msg} Введите вручную.`);
    } finally {
      setIsDetectingDeclination(false);
    }
  };

  const handleGlobalVoiceCommand = () => {
     if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Ваш браузер не поддерживает голосовой ввод.');
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListeningGlobal(true);
    recognition.onend = () => setIsListeningGlobal(false);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      console.log("Voice Command:", transcript);

      const numberMatch = transcript.match(/(\d+(\.\d+)?)/);
      if (numberMatch) {
         const degree = parseFloat(numberMatch[0]);
         if (!isNaN(degree)) {
            handleFacadeRotationChange(degree);
         }
      }

      const foundMountain = MOUNTAINS.find(m => {
         const searchTerms = [
            m.chineseName.toLowerCase(), 
            m.pinyin.toLowerCase(), 
            m.name.toLowerCase().split(' ')[0],
            m.direction.toLowerCase(), 
            getRussianDirection(m.direction).toLowerCase(),
            ...m.description.toLowerCase().split(', ')
         ];
         return searchTerms.some(term => transcript.includes(term));
      });

      if (foundMountain) {
         handleSelectMountain(foundMountain);
      }
    };
    
    recognition.start();
  };

  const getRussianDirection = (dir: string) => {
    return dir
      .replace(/N/g, 'С')
      .replace(/S/g, 'Ю')
      .replace(/E/g, 'В')
      .replace(/W/g, 'З');
  };

  const handleOpenShare = () => {
    let lat = initialMapState.center[0];
    let lon = initialMapState.center[1];
    let zoom = initialMapState.zoom;

    if (mapInstance) {
      const center = mapInstance.getCenter();
      lat = center[0];
      lon = center[1];
      zoom = mapInstance.getZoom();
    }

    const url = new URL(window.location.href);
    url.searchParams.set('lat', lat.toFixed(6));
    url.searchParams.set('lon', lon.toFixed(6));
    url.searchParams.set('z', zoom.toString());
    url.searchParams.set('rot', facadeRotation.toFixed(2));
    url.searchParams.set('dec', declination.toFixed(2));
    url.searchParams.set('useDec', String(useDeclination));
    
    if (selectedMountain) {
      url.searchParams.set('m', selectedMountain.id);
    } else {
      url.searchParams.delete('m');
    }

    const shareUrl = url.toString();

    const shareText = `Фэн-шуй Анализ 24 Горы
📍 Координаты: ${lat.toFixed(5)}, ${lon.toFixed(5)}
🧭 Фасад: ${facadeRotation.toFixed(1)}°
🧲 Магн. склонение: ${useDeclination ? `${declination > 0 ? '+' : ''}${declination}°` : 'Откл.'}
${selectedMountain ? `⛰️ Выбранная гора: ${selectedMountain.chineseName} (${selectedMountain.pinyin}) - ${selectedMountain.element}` : ''}
    
🔗 Ссылка: ${shareUrl}`;

    setShareData({
      url: shareUrl,
      text: shareText
    });
    setShowShareModal(true);
  };

  return (
    <div className="relative w-full h-[100dvh] bg-gray-900 overflow-hidden font-sans touch-none">
      
      {/* 1. Map Layer (Yandex) */}
      <MapBackground 
        center={initialMapState.center} 
        zoom={initialMapState.zoom} 
        isLocked={isMapLocked}
        mapLayer={mapLayer}
        onMapReady={handleMapReady} 
      />

      {/* 2. Search Bar */}
      <SearchBar onLocationSelect={handleLocationSelect} externalQuery={centerAddress} />

      {/* 3. Central Compass Layer */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10 transition-opacity duration-300 ${isMapMode ? 'opacity-80' : 'opacity-100'}`}>
        {/* Responsive Compass Container */}
        <div ref={compassContainerRef} className="relative w-[85vw] h-[85vw] max-w-[400px] max-h-[400px] md:w-[500px] md:h-[500px]">
          <CompassOverlay 
            templateRotation={normalizedTemplateRotation} 
            facadeRotation={facadeRotation}
            onSelectMountain={handleSelectMountain} 
            onFacadeChange={handleFacadeRotationChange}
            selectedMountainId={selectedMountain?.id}
            isInteractive={!isMapMode}
            altitudes={mountainAltitudes}
            showAltitudes={showAltitudes}
          />
        </div>
        
        {/* Central hairline cross for precision alignment */}
        <div className="absolute w-full h-[1px] bg-red-500/30 pointer-events-none"></div>
        <div className="absolute h-full w-[1px] bg-red-500/30 pointer-events-none"></div>
      </div>

      {/* 4. Zoom, Lock & Layer Controls */}
      <div className="absolute bottom-44 right-4 flex flex-col gap-3 z-20 md:bottom-10 md:right-6">
        
        {/* Layer Toggle (Satellite/Relief) */}
        <button 
          onClick={toggleMapLayer}
          className={`p-3.5 rounded-full border border-white/10 shadow-lg backdrop-blur transition-colors touch-manipulation flex items-center justify-center ${
            mapLayer === 'terrain'
              ? 'bg-green-600/90 text-white hover:bg-green-700 border-green-400/50' 
              : 'bg-slate-900/80 text-gray-300 hover:bg-slate-800 hover:text-white'
          }`}
          aria-label={mapLayer === 'terrain' ? "Show Satellite" : "Show Terrain/Relief"}
          title={mapLayer === 'terrain' ? "Переключить на спутник" : "Показать рельеф (OpenTopoMap)"}
        >
          <Layers className="w-6 h-6" />
        </button>
        
        <div className="h-1"></div>
        
        {/* Altitude Toggle */}
        <button 
          onClick={toggleAltitudes}
          className={`p-3.5 rounded-full border border-white/10 shadow-lg backdrop-blur transition-colors touch-manipulation flex items-center justify-center ${
            showAltitudes 
              ? 'bg-blue-600/90 text-white hover:bg-blue-700 border-blue-400/50' 
              : 'bg-slate-900/80 text-gray-300 hover:bg-slate-800 hover:text-white'
          }`}
          aria-label={showAltitudes ? "Hide Mountain Altitude" : "Show Mountain Altitude"}
          title={showAltitudes ? "Скрыть высоты гор" : "Показать высоты гор (24 точки)"}
        >
          <MountainIcon className="w-6 h-6" />
        </button>

        <div className="h-1"></div>

        {/* Lock Button */}
        <button 
          onClick={toggleMapLock}
          className={`p-3.5 rounded-full border border-white/10 shadow-lg backdrop-blur transition-colors touch-manipulation flex items-center justify-center ${
            isMapLocked 
              ? 'bg-red-500/80 text-white hover:bg-red-600 border-red-400/50' 
              : 'bg-slate-900/80 text-gray-300 hover:bg-slate-800 hover:text-white'
          }`}
          aria-label={isMapLocked ? "Unlock Map" : "Lock Map"}
          title={isMapLocked ? "Разблокировать карту" : "Заблокировать карту"}
        >
          {isMapLocked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
        </button>

        <div className="h-1"></div> {/* Spacer */}

        <button 
          onClick={handleZoomIn}
          className="bg-slate-900/80 backdrop-blur text-white p-3.5 rounded-full border border-white/10 shadow-lg hover:bg-slate-800 active:bg-slate-700 transition-colors touch-manipulation"
          aria-label="Zoom In"
        >
          <Plus className="w-6 h-6" />
        </button>
        <button 
          onClick={handleZoomOut}
          className="bg-slate-900/80 backdrop-blur text-white p-3.5 rounded-full border border-white/10 shadow-lg hover:bg-slate-800 active:bg-slate-700 transition-colors touch-manipulation"
          aria-label="Zoom Out"
        >
          <Minus className="w-6 h-6" />
        </button>
      </div>

      {/* 5. Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 w-full p-4 pb-8 md:pb-6 bg-gradient-to-t from-slate-950/90 via-slate-900/80 to-transparent">
        <div className="max-w-xl mx-auto backdrop-blur-xl bg-slate-900/90 border border-white/10 rounded-2xl p-4 shadow-2xl text-white">
          
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wide text-gray-300">
              <Compass className="w-4 h-4 text-red-400" />
              <span className="hidden xs:inline">Шаблон 24 Горы</span>
            </h1>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleGlobalVoiceCommand}
                    className={`p-2 rounded-lg transition-colors ${isListeningGlobal ? 'bg-red-500/20 text-red-400 animate-pulse ring-1 ring-red-500/50' : 'bg-black/40 text-gray-400 hover:text-white'}`}
                    aria-label="Voice Commands"
                    title='Голосовая команда: "Фасад 150", "Гора Крыса", "Сектор Цзы"'
                >
                    <Mic className="w-5 h-5" />
                </button>

                <button 
                    onClick={handleOpenShare}
                    className="p-2 bg-black/40 text-gray-400 hover:text-white rounded-lg transition-colors active:scale-95"
                    aria-label="Share Settings"
                >
                    <Share2 className="w-5 h-5" />
                </button>

                <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-indigo-600 text-white' : 'bg-black/40 text-gray-400 hover:text-white'}`}
                    aria-label="Toggle Settings"
                >
                    <Settings2 className="w-5 h-5" />
                </button>

                <div className="flex bg-black/40 rounded-lg p-1">
                <button 
                    onClick={() => setIsMapMode(true)}
                    className={`px-3 py-2 rounded-md flex items-center gap-2 text-xs font-medium transition-colors touch-manipulation ${isMapMode ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    <Move className="w-4 h-4" /> Карта
                </button>
                <button 
                    onClick={() => setIsMapMode(false)}
                    className={`px-3 py-2 rounded-md flex items-center gap-2 text-xs font-medium transition-colors touch-manipulation ${!isMapMode ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    <Hand className="w-4 h-4" /> Сектора
                </button>
                </div>
            </div>
          </div>

          {/* Settings Panel (Declination) */}
          {showSettings && (
             <div className="mb-4 p-4 bg-black/40 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                        <Globe className="w-3 h-3" />
                        Магнитное склонение
                    </label>
                    <div className="flex items-center gap-3">
                         <button 
                            onClick={handleAutoDetectDeclination}
                            disabled={isDetectingDeclination}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 text-[10px] font-bold uppercase transition-colors disabled:opacity-50"
                         >
                            {isDetectingDeclination ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                            {isDetectingDeclination ? 'Поиск...' : 'Авто'}
                         </button>
                        
                        <div className="flex items-center gap-2" onClick={() => setUseDeclination(!useDeclination)}>
                           <div className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${useDeclination ? 'bg-indigo-500' : 'bg-gray-600'}`}>
                              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${useDeclination ? 'translate-x-5' : 'translate-x-1'}`}></div>
                           </div>
                        </div>
                    </div>
                </div>
                
                {declinationError && (
                  <div className="mb-3 flex items-center gap-2 text-[10px] text-red-300 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {declinationError}
                  </div>
                )}

                <div className={`transition-all duration-200 ${useDeclination ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                    <div className="flex items-center gap-4">
                         <div className="flex flex-col items-center gap-1 min-w-[3rem]">
                            <span className="text-xl font-mono font-bold text-white tracking-tighter">
                                {declination > 0 ? '+' : ''}{declination.toFixed(1)}°
                            </span>
                         </div>
                        <input 
                            type="range" 
                            min="-45" 
                            max="45" 
                            step="0.1"
                            value={declination}
                            onChange={(e) => setDeclination(parseFloat(e.target.value))}
                            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 touch-none hover:bg-gray-600 transition-colors"
                        />
                    </div>
                    <div className="flex justify-between mt-2 text-[9px] text-gray-500 font-medium uppercase tracking-wide">
                        <span>Запад (W)</span>
                        <span>0° (True North)</span>
                        <span>Восток (E)</span>
                    </div>
                </div>
             </div>
          )}

          {/* Main Controls - CONTROLS FACADE DIRECTION */}
          <div className="flex flex-col gap-4">
            {/* Rotation Controls */}
            <div className="flex items-center gap-3">
               <button 
                onClick={() => adjustFacadeRotation(-0.5)}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 hover:text-white transition-colors active:scale-95 touch-manipulation border border-white/5"
                aria-label="Rotate Facade Left"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <div className="flex-1 px-1">
                <input 
                  type="range" 
                  min="0" 
                  max="360" 
                  step="0.5"
                  value={facadeRotation} 
                  onChange={(e) => handleFacadeRotationChange(Number(e.target.value))}
                  className="w-full h-8 bg-transparent cursor-pointer touch-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-gray-700 [&::-webkit-slider-runnable-track]:rounded-full"
                />
                <div className="flex justify-between mt-1 text-[10px] text-gray-500 font-mono">
                  <span>0°</span>
                  <span className="text-red-300 font-bold text-sm">{facadeRotation.toFixed(1)}°</span>
                  <span>360°</span>
                </div>
              </div>

              <button 
                onClick={() => adjustFacadeRotation(0.5)}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 hover:text-white transition-colors active:scale-95 touch-manipulation border border-white/5"
                aria-label="Rotate Facade Right"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
            
            <p className="hidden sm:flex text-[10px] text-gray-500 text-center items-center justify-center gap-1">
              <RotateCw className="w-3 h-3" />
              Поворачивайте направляющую для указания фасада
            </p>
          </div>
        </div>
      </div>

      {/* 6. Analysis Panel */}
      {selectedMountain && showAnalysis && (
        <div className="fixed top-[72px] left-4 right-4 bottom-auto md:absolute md:top-4 md:right-4 md:left-auto md:bottom-auto md:w-80 z-40 animate-in slide-in-from-bottom-4 md:slide-in-from-right fade-in duration-300 shadow-2xl max-h-[calc(100vh-220px)] md:max-h-[80vh] flex flex-col">
          <div className="backdrop-blur-xl bg-slate-900/95 border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl ring-1 ring-white/10">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-900/40 to-slate-900/40 p-4 border-b border-white/5 flex justify-between items-start shrink-0">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-2xl font-serif text-red-100">{selectedMountain.chineseName}</span>
                  {selectedMountain.name}
                </h2>
                <div className="text-xs text-red-300 font-mono mt-1 opacity-80">
                  {selectedMountain.direction} • {selectedMountain.startDegree}° - {selectedMountain.endDegree}°
                </div>
              </div>
              <button 
                onClick={() => setShowAnalysis(false)} 
                className="text-gray-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10 active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto custom-scrollbar overscroll-contain">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/5 p-3 rounded-lg text-center border border-white/5">
                  <span className="block text-[10px] uppercase text-gray-400 mb-1">Элемент</span>
                  <span className="text-sm font-semibold text-blue-200">{selectedMountain.element}</span>
                </div>
                <div className="bg-white/5 p-3 rounded-lg text-center border border-white/5">
                  <span className="block text-[10px] uppercase text-gray-400 mb-1">Пиньинь</span>
                  <span className="text-sm font-semibold text-gray-200">{selectedMountain.pinyin}</span>
                </div>
              </div>
              
              <p className="text-sm text-gray-300 mb-5 bg-indigo-500/10 p-3 rounded-lg border-l-2 border-indigo-500 leading-relaxed">
                {selectedMountain.description}
              </p>

              {/* AI Analysis Section */}
              <div className="mt-2">
                {!analysis.result && !analysis.isLoading && (
                  <button 
                    onClick={handleAnalyze}
                    className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all shadow-lg shadow-purple-900/20 active:scale-95"
                  >
                    <Sparkles className="w-5 h-5" />
                    Анализ Энергии
                  </button>
                )}

                {analysis.isLoading && (
                  <div className="flex flex-col items-center justify-center py-6 bg-white/5 rounded-xl border border-white/5">
                    <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <span className="text-xs font-medium text-purple-300 animate-pulse">Медитация ИИ...</span>
                  </div>
                )}

                {analysis.result && typeof analysis.result === 'string' && (
                  <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                     <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
                       <Sparkles className="w-4 h-4 text-purple-400" />
                       <span className="text-xs uppercase tracking-widest text-purple-400 font-bold">Ответ Мастера</span>
                     </div>
                     <div className="prose prose-invert prose-sm max-w-none text-gray-300 text-sm leading-relaxed">
                        <div dangerouslySetInnerHTML={{ __html: analysis.result.replace(/\n/g, '<br/>') }} />
                     </div>
                  </div>
                )}
                
                {analysis.error && typeof analysis.error === 'string' && (
                  <div className="mt-2 p-3 bg-red-900/20 border border-red-500/20 rounded-lg text-xs text-red-200 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                    {analysis.error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Share Modal */}
      <ShareModal 
        isOpen={showShareModal} 
        onClose={() => setShowShareModal(false)} 
        data={shareData} 
      />

      {/* 8. Mobile/Desktop Hint */}
      {isMapMode && !isMapLocked && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none transition-opacity duration-500 opacity-0 animate-fade-in-out">
           <div className="bg-black/60 backdrop-blur px-4 py-2 rounded-full text-xs text-white">
             Перемещайте карту
           </div>
        </div>
      )}
      {isMapLocked && (
         <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none transition-opacity duration-300">
           <div className="bg-red-500/80 backdrop-blur px-4 py-2 rounded-full text-xs text-white flex items-center gap-2 shadow-lg">
             <Lock className="w-3 h-3" /> Карта заблокирована
           </div>
        </div>
      )}

    </div>
  );
}