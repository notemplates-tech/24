import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin, Loader2, Mic } from 'lucide-react';
import { searchAddress, SearchResult } from '../services/geoService';

interface SearchBarProps {
  onLocationSelect: (lat: number, lon: number, name: string) => void;
  externalQuery?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onLocationSelect, externalQuery }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const skipDebounceRef = useRef(false);

  // Sync with external updates (e.g., from map movement)
  useEffect(() => {
    if (externalQuery !== undefined && externalQuery !== query) {
      setQuery(externalQuery);
      skipDebounceRef.current = true; // Skip searching when updating from map
    }
  }, [externalQuery]);

  // Debounce search
  useEffect(() => {
    // If flagged to skip (e.g. from external update), don't search
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return;
    }

    // Flag to handle race conditions
    let active = true;

    const timer = setTimeout(async () => {
      if (query.length >= 3) {
        if (active) setIsLoading(true);
        const data = await searchAddress(query);
        
        if (active) {
          setResults(data);
          setIsLoading(false);
          setIsOpen(true);
        }
      } else {
        if (active) {
          setResults([]);
          setIsOpen(false);
        }
      }
    }, 500);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (result: SearchResult) => {
    // Set flag to prevent immediate re-search of the selected name
    skipDebounceRef.current = true;
    
    const shortName = result.display_name.split(',')[0];
    setQuery(shortName);
    
    onLocationSelect(parseFloat(result.lat), parseFloat(result.lon), result.display_name);
    setIsOpen(false);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Ваш браузер не поддерживает голосовой ввод.');
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'ru-RU';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div ref={wrapperRef} className="absolute top-4 left-4 right-4 z-30 max-w-sm font-sans mx-auto md:mx-0">
      <div className={`relative group shadow-2xl rounded-xl transition-all duration-300 ${isListening ? 'ring-2 ring-red-500 shadow-red-500/20' : ''}`}>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-400 transition-colors" />
          )}
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-20 py-3 border border-white/10 rounded-xl leading-5 bg-slate-900/80 backdrop-blur-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 sm:text-sm shadow-xl transition-all text-ellipsis"
          placeholder={isListening ? "Говорите..." : "Поиск адреса..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
              if (results.length > 0) setIsOpen(true);
          }}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
          {/* Voice Input Button */}
          <button
            onClick={startVoiceInput}
            className={`p-2 rounded-full transition-colors ${isListening ? 'text-red-500 bg-red-500/10 animate-pulse' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
            title="Голосовой ввод адреса"
          >
            <Mic className="h-4 w-4" />
          </button>

          {/* Clear Button */}
          {query && (
            <button 
              onClick={clearSearch}
              className="p-2 text-gray-500 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute mt-2 w-full bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
          <ul className="py-1">
            {results.map((result) => (
              <li key={result.place_id}>
                <button
                  onClick={() => handleSelect(result)}
                  className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-indigo-600/20 hover:text-white flex items-start gap-3 transition-colors border-b border-white/5 last:border-0 active:bg-indigo-600/30"
                >
                  <MapPin className="h-4 w-4 mt-0.5 text-indigo-400 shrink-0" />
                  <span className="line-clamp-2">{result.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchBar;