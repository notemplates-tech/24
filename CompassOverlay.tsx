import React, { useMemo, useState, useRef, useEffect } from 'react';
import { MOUNTAINS } from '../constants';
import { Mountain } from '../types';

interface CompassOverlayProps {
  templateRotation: number; // Rotation for the 24 Mountains ring (fixed or declination)
  facadeRotation: number;   // Rotation for the Red Facade Guide (user controlled)
  onSelectMountain: (m: Mountain, e: React.MouseEvent<SVGGElement, MouseEvent>) => void;
  onFacadeChange?: (rotation: number) => void;
  selectedMountainId?: string;
  isInteractive?: boolean;
  altitudes?: Record<string, number>;
  showAltitudes?: boolean;
}

const CompassOverlay: React.FC<CompassOverlayProps> = ({ 
  templateRotation, 
  facadeRotation,
  onSelectMountain, 
  onFacadeChange,
  selectedMountainId,
  isInteractive = true,
  altitudes,
  showAltitudes = false
}) => {
  const [hoveredMountainId, setHoveredMountainId] = useState<string | null>(null);
  const [isDraggingFacade, setIsDraggingFacade] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Keep track of latest rotation for the event closure to ensure accurate snapping
  const facadeRotationRef = useRef(facadeRotation);
  useEffect(() => {
    facadeRotationRef.current = facadeRotation;
  }, [facadeRotation]);
  
  const radius = 150;
  const center = 150;
  const selectedMountain = MOUNTAINS.find(m => m.id === selectedMountainId);
  const hoveredMountain = MOUNTAINS.find(m => m.id === hoveredMountainId);
  
  // Sort mountains: Selected on top, then Hovered, then others.
  const sortedMountains = useMemo(() => {
    return [...MOUNTAINS].sort((a, b) => {
      if (a.id === selectedMountainId) return 1;
      if (b.id === selectedMountainId) return -1;
      if (a.id === hoveredMountainId) return 1;
      if (b.id === hoveredMountainId) return -1;
      return 0;
    });
  }, [selectedMountainId, hoveredMountainId]);

  const getElementColor = (element: string, isSelected: boolean, isHovered: boolean) => {
    let opacity = 0.25;
    if (isSelected) opacity = 0.6;
    else if (isHovered) opacity = 0.45; // Slightly increased base opacity on hover

    switch (element) {
      case 'Water': return `rgba(14, 165, 233, ${opacity})`;
      case 'Wood':  return `rgba(34, 197, 94, ${opacity})`;
      case 'Fire':  return `rgba(239, 68, 68, ${opacity})`;
      case 'Earth': return `rgba(234, 179, 8, ${opacity})`;
      case 'Metal': return `rgba(148, 163, 184, ${opacity})`;
      default:      return `rgba(255, 255, 255, ${opacity})`;
    }
  };

  const getElementGlowColor = (element: string) => {
    switch (element) {
      case 'Water': return 'rgba(14, 165, 233, 0.9)';
      case 'Wood':  return 'rgba(34, 197, 94, 0.9)';
      case 'Fire':  return 'rgba(239, 68, 68, 0.9)';
      case 'Earth': return 'rgba(234, 179, 8, 0.9)';
      case 'Metal': return 'rgba(148, 163, 184, 0.9)';
      default:      return 'rgba(255, 255, 255, 0.9)';
    }
  };

  const getElementTextColor = (element: string) => {
    switch (element) {
      case 'Water': return 'text-sky-400';
      case 'Wood':  return 'text-green-400';
      case 'Fire':  return 'text-red-400';
      case 'Earth': return 'text-yellow-400';
      case 'Metal': return 'text-slate-300';
      default:      return 'text-white';
    }
  };

  const getRussianDirection = (dir: string) => {
    return dir
      .replace(/N/g, 'С')
      .replace(/S/g, 'Ю')
      .replace(/E/g, 'В')
      .replace(/W/g, 'З');
  };

  // --- Facade Rotation Logic ---
  const handleFacadeDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isInteractive || !onFacadeChange) return;
    e.preventDefault(); // Prevent scroll on touch
    e.stopPropagation(); // Prevent map drag
    
    setIsDraggingFacade(true);
    
    // Initial calculation
    calculateRotation(e);
    
    // Haptic feedback start
    if (navigator.vibrate) navigator.vibrate(20);

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      calculateRotation(moveEvent);
    };

    const handleUp = () => {
      setIsDraggingFacade(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
      
      // Haptic feedback end
      if (navigator.vibrate) navigator.vibrate(10);
      
      // Snap to nearest 0.5 degree on release
      if (onFacadeChange) {
        const currentRot = facadeRotationRef.current;
        const snappedRot = Math.round(currentRot * 2) / 2;
        onFacadeChange(snappedRot);
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
  };

  const calculateRotation = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!containerRef.current || !onFacadeChange) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    const x = clientX - centerX;
    const y = clientY - centerY;

    // Calculate angle in degrees
    // atan2(y, x) gives angle from X axis (3 o'clock). 
    // We want 0 at 12 o'clock.
    // 12 o'clock is -90 degrees in atan2.
    // So deg = atan2(y, x) * 180 / PI + 90
    let angle = (Math.atan2(y, x) * 180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    
    // Check for snap feedback during drag
    const currentRot = facadeRotationRef.current;
    const snapped = Math.round(angle * 2) / 2;
    const prevSnapped = Math.round(currentRot * 2) / 2;
    
    if (snapped !== prevSnapped && navigator.vibrate) {
        navigator.vibrate(5);
    }

    onFacadeChange(angle);
  };
  
  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* 
        Rotated Compass Layer - Controlled by templateRotation 
        This is usually 0 (North Up) or adjusted for Magnetic Declination.
      */}
      <div 
        className="absolute inset-0 w-full h-full pointer-events-none select-none transition-transform duration-300 ease-out will-change-transform"
        style={{ transform: `rotate(${templateRotation}deg)` }}
      >
        <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-2xl overflow-visible">
          {/* Background Circle */}
          <circle cx={center} cy={center} r={radius} fill="rgba(0, 0, 0, 0.2)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <circle cx={center} cy={center} r={radius * 0.3} fill="rgba(0, 0, 0, 0.5)" stroke="rgba(255,255,255,0.1)" />

          {/* Extended Guide Lines for Hovered Mountain */}
          {hoveredMountain && (
            <g className="pointer-events-none opacity-80">
               {[hoveredMountain.startDegree, hoveredMountain.endDegree].map((deg, i) => {
                 const rad = (deg - 90) * (Math.PI / 180);
                 const rStart = radius; 
                 const rEnd = 2000; // Far enough to cover screen
                 const x1 = center + rStart * Math.cos(rad);
                 const y1 = center + rStart * Math.sin(rad);
                 const x2 = center + rEnd * Math.cos(rad);
                 const y2 = center + rEnd * Math.sin(rad);
                 
                 return (
                   <line 
                     key={`guide-${i}`}
                     x1={x1} y1={y1}
                     x2={x2} y2={y2}
                     stroke="#3b82f6" 
                     strokeWidth="2"
                     strokeDasharray="8 8"
                   />
                 );
               })}
            </g>
          )}

          {/* 24 Mountains Segments */}
          {sortedMountains.map((mountain) => {
            const startAngle = (mountain.startDegree - 90) * (Math.PI / 180);
            const endAngle = (mountain.endDegree - 90) * (Math.PI / 180);
            
            const x1 = center + radius * Math.cos(startAngle);
            const y1 = center + radius * Math.sin(startAngle);
            const x2 = center + radius * Math.cos(endAngle);
            const y2 = center + radius * Math.sin(endAngle);

            const innerR = radius * 0.6;
            const xi1 = center + innerR * Math.cos(startAngle);
            const yi1 = center + innerR * Math.sin(startAngle);
            const xi2 = center + innerR * Math.cos(endAngle);
            const yi2 = center + innerR * Math.sin(endAngle);
            
            const pathData = `
              M ${xi1} ${yi1}
              L ${x1} ${y1}
              A ${radius} ${radius} 0 0 1 ${x2} ${y2}
              L ${xi2} ${yi2}
              A ${innerR} ${innerR} 0 0 0 ${xi1} ${yi1}
              Z
            `;

            // Fix for the Zi (North) sector label positioning
            // Logic: if start > end (e.g., 352.5 > 7.5), it wraps around 360.
            // We temporarily add 360 to end degree to find the true middle.
            let s = mountain.startDegree;
            let e = mountain.endDegree;
            if (e < s) {
              e += 360;
            }
            const midDegree = (s + e) / 2;
            const midAngle = (midDegree - 90) * (Math.PI / 180);

            const textR = radius * 0.82; 
            const textX = center + textR * Math.cos(midAngle);
            const textY = center + textR * Math.sin(midAngle);
            const textRot = (midAngle * 180 / Math.PI) + 90;

            const isSelected = selectedMountainId === mountain.id;
            const isHovered = hoveredMountainId === mountain.id && !isSelected;
            const fillColor = getElementColor(mountain.element, isSelected, isHovered);
            const ruDirection = getRussianDirection(mountain.direction);
            
            let filterStyle = 'none';
            if (isSelected) {
               filterStyle = `drop-shadow(0 0 10px ${getElementGlowColor(mountain.element)})`;
            } else if (isHovered) {
               // Increased brightness and saturation for better distinctness
               filterStyle = `drop-shadow(0 0 8px ${getElementGlowColor(mountain.element)}) brightness(1.2) saturate(1.5)`;
            }

            const interactionClass = isInteractive 
              ? "pointer-events-auto cursor-pointer group" 
              : "pointer-events-none opacity-80";

            return (
              <g 
                key={mountain.id} 
                onClick={(e) => isInteractive && onSelectMountain(mountain, e)}
                onMouseEnter={() => isInteractive && setHoveredMountainId(mountain.id)}
                onMouseLeave={() => setHoveredMountainId(null)}
                className={`${interactionClass} transition-all duration-300`}
                style={{
                   zIndex: isSelected ? 20 : (isHovered ? 10 : 1)
                }}
              >
                <path 
                  d={pathData} 
                  fill={fillColor} 
                  stroke={isSelected ? "white" : (isHovered ? "rgba(255,255,255,0.6)" : "transparent")} 
                  strokeWidth={isSelected ? "2.5" : (isHovered ? "1.5" : "0")}
                  className="transition-all duration-200"
                  style={{ filter: filterStyle }}
                />
                
                {/* Chinese Name */}
                <text 
                  x={textX} 
                  y={textY} 
                  dy="-9"
                  fill="white" 
                  fontSize="13" 
                  fontWeight="bold"
                  textAnchor="middle" 
                  alignmentBaseline="middle"
                  transform={`rotate(${textRot}, ${textX}, ${textY})`}
                  className="drop-shadow-md pointer-events-none"
                  style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.8)' }}
                >
                  {mountain.chineseName}
                </text>
                
                {/* Pinyin */}
                <text 
                  x={textX} 
                  y={textY} 
                  dy="2"
                  fill="rgba(255,255,255,0.9)" 
                  fontSize="7" 
                  fontWeight="600"
                  textAnchor="middle" 
                  alignmentBaseline="middle"
                  transform={`rotate(${textRot}, ${textX}, ${textY})`}
                  className="pointer-events-none uppercase tracking-wider"
                  style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.8)' }}
                >
                  {mountain.pinyin}
                </text>

                {/* Russian Direction (e.g. С1) */}
                <text 
                  x={textX} 
                  y={textY} 
                  dy="11"
                  fill="rgba(255,255,255,0.7)" 
                  fontSize="6" 
                  fontWeight="600"
                  textAnchor="middle" 
                  alignmentBaseline="middle"
                  transform={`rotate(${textRot}, ${textX}, ${textY})`}
                  className="pointer-events-none uppercase tracking-wider"
                  style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.8)' }}
                >
                  {ruDirection}
                </text>

                {/* Altitude Display - Only on Hover */}
                {showAltitudes && altitudes && altitudes[mountain.id] !== undefined && hoveredMountainId === mountain.id && (
                  <g transform={`rotate(${textRot}, ${textX}, ${textY}) translate(0, 24)`} className="animate-in fade-in duration-200">
                    <rect x="-11" y="-5" width="22" height="10" rx="4" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                    <text
                      x="0"
                      y="2"
                      textAnchor="middle"
                      fontSize="6"
                      fill="#e2e8f0"
                      fontWeight="600"
                      className="pointer-events-none"
                    >
                      {Math.round(altitudes[mountain.id])} м
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* 
             Dividers Layer
             Solid lines for both cardinal and sector boundaries.
          */}
          <g className="pointer-events-none z-30">
             {MOUNTAINS.map((mountain, index) => {
               const angle = (mountain.endDegree - 90) * (Math.PI / 180);
               // Every 3rd mountain ends a cardinal direction sector
               const isCardinalBoundary = (index + 1) % 3 === 0;
               
               const innerR = radius * 0.6;
               const outerR = radius; // Draw to edge
               
               const x1 = center + innerR * Math.cos(angle);
               const y1 = center + innerR * Math.sin(angle);
               const x2 = center + outerR * Math.cos(angle);
               const y2 = center + outerR * Math.sin(angle);
               
               return (
                 <line 
                    key={`line-${index}`}
                    x1={x1} y1={y1}
                    x2={x2} y2={y2}
                    stroke={isCardinalBoundary ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)"}
                    strokeWidth={isCardinalBoundary ? "2" : "1"}
                    className={isCardinalBoundary ? "drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]" : ""}
                 />
               )
             })}
          </g>
          
          {/* Center Dot - Always visible for anchoring Facade Guide */}
          <circle cx={center} cy={center} r="4" fill="#ef4444" stroke="white" strokeWidth="1.5" className="z-50 pointer-events-none" />

        </svg>
      </div>

      {/* 
        FACADE GUIDE OVERLAY 
        Controlled by facadeRotation (User Input).
        Rotates independently.
      */}
      <div 
        className={`absolute inset-0 z-30 transition-transform ease-out will-change-transform ${isDraggingFacade ? 'duration-0' : 'duration-100'}`}
        style={{ transform: `rotate(${facadeRotation}deg)` }}
      >
        <svg viewBox="0 0 300 300" className="w-full h-full">
           <defs>
             <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
               <path d="M0,0 L6,3 L0,6 L1,3 Z" fill={isDraggingFacade ? "#ff6b6b" : "#ef4444"} />
             </marker>
           </defs>
           
           {/* Interactive Group for Facade Guide */}
           <g 
             className={`${isInteractive ? 'pointer-events-auto cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`}
             onMouseDown={handleFacadeDragStart}
             onTouchStart={handleFacadeDragStart}
           >
             {/* Invisible Hit Area for easier grabbing */}
             <rect x="120" y="0" width="60" height="150" fill="transparent" />

             {/* Facade Line (Center to Top - which rotates) */}
             <line
               x1="150" y1="150"
               x2="150" y2="25"
               stroke={isDraggingFacade ? "#ff6b6b" : "#ef4444"}
               strokeWidth={isDraggingFacade ? "3" : "2"}
               strokeDasharray="4 3"
               markerEnd="url(#arrowhead)"
               className="transition-all duration-200 drop-shadow-md opacity-90"
               style={{ filter: isDraggingFacade ? 'drop-shadow(0 0 3px rgba(255, 107, 107, 0.8))' : 'none' }}
             />
             
             {/* Label Box */}
             <g 
               transform={`translate(150, 15) ${isDraggingFacade ? 'scale(1.1)' : 'scale(1)'}`}
               className="transition-transform duration-200 ease-out origin-center"
             >
                <rect 
                  x="-30" y="-10" 
                  width="60" height="18" 
                  rx="4" 
                  fill={isDraggingFacade ? "rgba(255, 87, 87, 1)" : "rgba(239, 68, 68, 0.9)"}
                  className="drop-shadow-lg transition-colors duration-200" 
                />
                <text x="0" y="2" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" letterSpacing="1" className="select-none">
                  ФАСАД
                </text>
             </g>
           </g>
        </svg>
      </div>

      {/* Stationary Center Overlay for Selected Mountain Info */}
      {selectedMountain && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-200">
             <span className={`text-4xl md:text-5xl font-serif font-bold ${getElementTextColor(selectedMountain.element)} mb-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`}>
               {selectedMountain.chineseName}
             </span>
             <span className="text-sm md:text-base font-bold text-white tracking-widest drop-shadow-md uppercase">
               {selectedMountain.pinyin}
             </span>
             <span className={`text-[10px] uppercase font-bold tracking-[0.2em] mt-1 opacity-90 ${getElementTextColor(selectedMountain.element)}`}>
               {selectedMountain.element}
             </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompassOverlay;