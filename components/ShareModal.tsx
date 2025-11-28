import React, { useState } from 'react';
import { X, Link as LinkIcon, FileText, Check, Copy } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    url: string;
    text: string;
  };
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, data }) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async (text: string, type: 'url' | 'text') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else {
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden ring-1 ring-white/10 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-gradient-to-r from-indigo-900/20 to-slate-900/20">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-indigo-400" />
            Поделиться настройками
          </h3>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          
          {/* URL Section */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
              Ссылка на карту
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  readOnly 
                  value={data.url}
                  className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-indigo-200 focus:outline-none focus:border-indigo-500/50"
                />
                <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none"></div>
              </div>
              <button
                onClick={() => handleCopy(data.url, 'url')}
                className={`p-2.5 rounded-lg border transition-all duration-200 ${
                  copiedUrl 
                    ? 'bg-green-500/20 border-green-500/50 text-green-400' 
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {copiedUrl ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Text Summary Section */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-2">
              <FileText className="w-3 h-3" />
              Текстовый отчет
            </label>
            <div className="relative">
              <textarea 
                readOnly
                value={data.text}
                className="w-full h-32 bg-black/40 border border-white/10 rounded-lg py-3 px-3 text-xs font-mono text-gray-300 focus:outline-none focus:border-indigo-500/50 resize-none custom-scrollbar leading-relaxed"
              />
              <button
                onClick={() => handleCopy(data.text, 'text')}
                className={`absolute top-2 right-2 p-2 rounded-lg border transition-all duration-200 ${
                  copiedText 
                    ? 'bg-green-500/20 border-green-500/50 text-green-400' 
                    : 'bg-slate-800 border-white/10 text-gray-400 hover:bg-slate-700 hover:text-white shadow-lg'
                }`}
              >
                {copiedText ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ShareModal;
