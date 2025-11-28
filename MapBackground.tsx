import React, { useEffect, useRef, useState } from 'react';
import { Mountain } from 'lucide-react';
import { getAltitude } from '../services/geoService';

// Declaration for the global ymaps object
declare global {
  interface Window {
    ymaps: any;
  }
}

interface MapBackgroundProps {
  center: [number, number];
  zoom: number;
  isLocked?: boolean;
  mapLayer?: 'satellite' | 'terrain';
  onMapReady?: (map: any) => void;
}

const MapBackground: React.FC<MapBackgroundProps> = ({ 
  center, 
  zoom, 
  isLocked = false, 
  mapLayer = 'satellite', 
  onMapReady 
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [altitude, setAltitude] = useState<number | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initMap = () => {
      if (mapInstanceRef.current) return; // Already initialized

      // Create Yandex Map
      // We start with 'yandex#hybrid' (Satellite + Labels) by default for better context
      const map = new window.ymaps.Map(mapContainerRef.current, {
        center: center,
        zoom: zoom,
        controls: [], // Remove standard controls for clean look
        type: 'yandex#hybrid' 
      }, {
        suppressMapOpenBlock: true, // Hide "Open in Yandex Maps"
        yandexMapDisablePoiInteractivity: false
      });

      // Add default behavior options
      map.behaviors.enable(['drag', 'scrollZoom', 'multiTouch']);

      // Altitude fetching logic
      const updateAltitude = async () => {
        const c = map.getCenter();
        const alt = await getAltitude(c[0], c[1]);
        setAltitude(alt);
      };

      // Listen for map movement end to update altitude
      map.events.add('actionend', updateAltitude);
      // Initial fetch
      updateAltitude();

      mapInstanceRef.current = map;
      setIsMapReady(true); // Trigger layer effect
      
      if (onMapReady) {
        onMapReady(map);
      }
    };

    if (window.ymaps) {
      window.ymaps.ready(initMap);
    } else {
      console.error("Yandex Maps API not loaded");
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
        setIsMapReady(false);
      }
    };
  }, []); // Initialize once

  // Handle Layer Switching (Satellite vs Terrain)
  // Depends on isMapReady to ensure map instance exists
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.ymaps || !isMapReady) return;

    if (mapLayer === 'terrain') {
      // Register OpenTopoMap if not already done
      if (!window.ymaps.mapType.storage.get('OpenTopoMap')) {
        // Create the layer
        // OpenTopoMap uses standard Spherical Mercator (3857)
        const layer = new window.ymaps.Layer('https://a.tile.opentopomap.org/%z/%x/%y.png', {
           projection: window.ymaps.projection.sphericalMercator,
           tileTransparent: true
        });
        
        // Define the MapType
        const type = new window.ymaps.MapType('OpenTopoMap', [layer]);
        window.ymaps.mapType.storage.add('OpenTopoMap', type);
      }
      
      map.setType('OpenTopoMap');
    } else {
      map.setType('yandex#hybrid');
    }
  }, [mapLayer, isMapReady]);

  // Handle Locking/Unlocking interactions
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapReady) return;

    const behaviors = ['drag', 'scrollZoom', 'dblClickZoom', 'multiTouch'];

    if (isLocked) {
      map.behaviors.disable(behaviors);
    } else {
      map.behaviors.enable(behaviors);
    }
  }, [isLocked, isMapReady]);

  return (
    <>
      {/* Map Container */}
      <div 
        ref={mapContainerRef} 
        className={`absolute inset-0 z-0 transition-all duration-500 ${
          mapLayer === 'terrain' 
            ? 'contrast-125 saturate-150 brightness-105 hue-rotate-[10deg]' // Enhanced terrain visualization
            : 'grayscale-[20%] contrast-110 brightness-90' // Slight filter for hybrid
        }`}
      />

      {/* Altitude Overlay - Visible Text Label */}
      <div className="absolute top-20 right-4 md:top-6 md:right-6 z-10 pointer-events-none animate-in fade-in duration-500">
         <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/70 backdrop-blur-md border border-white/10 rounded-lg shadow-xl text-xs font-mono text-indigo-100">
             <Mountain className="w-3 h-3 text-indigo-400" />
             <span className="opacity-70 font-semibold tracking-wide">Высота:</span>
             <span className="font-bold text-white tracking-wide">
               {altitude !== null ? `${Math.round(altitude)} м` : '...'}
             </span>
         </div>
      </div>
    </>
  );
};

export default MapBackground;