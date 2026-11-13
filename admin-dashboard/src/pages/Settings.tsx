import React from 'react';
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
  Laptop,
  Palette,
  Eye,
  Shield,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { useTheme } from '../components/ThemeContext';

export const Settings: React.FC = () => {
  const { theme, setTheme, reducedMotion, setReducedMotion } = useTheme();

  const paletteColors = [
    { name: 'Soft Pink', hex: '#F8C4DB', desc: 'Primary Surface Tint' },
    { name: 'Rose', hex: '#F4A8CB', desc: 'Secondary Gradient Blend' },
    { name: 'Lavender', hex: '#DCC5FA', desc: 'Interactive Accents' },
    { name: 'Purple', hex: '#BFA1F5', desc: 'Brand Gradient Anchor' },
    { name: 'Peach', hex: '#FFE1CE', desc: 'Warm Highlight' },
    { name: 'Warm White', hex: '#FFFDFE', desc: 'Canvas Base' },
    { name: 'Soft Gray', hex: '#F5F2F7', desc: 'Neutral Surface' },
    { name: 'Deep Text', hex: '#30283C', desc: 'Authoritative Typography' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Settings & Personalization
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Application theme, Master Brand color tokens, accessibility preferences, and operator session configurations
        </p>
      </div>

      {/* Theme Appearance Mode */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
          <Palette className="w-4 h-4 text-brand-500" />
          <span>Interface Appearance Mode</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { id: 'dark', label: 'Dark Mode (Default)', icon: Moon, desc: 'Deep obsidian and purple-tinted night interface' },
            { id: 'light', label: 'Light Mode', icon: Sun, desc: 'Warm white canvas with soft pink and rose tones' },
            { id: 'system', label: 'System Automatic', icon: Laptop, desc: 'Syncs automatically with device OS preference' },
          ].map((mode) => {
            const Icon = mode.icon;
            const isSelected = theme === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setTheme(mode.id as any)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-brand-500 bg-brand-500/10 dark:bg-brand-500/15 shadow-sm'
                    : 'border-slate-200 dark:border-datacore-darkBorder hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-brand-500' : 'text-slate-400'}`} />
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-brand-500" />}
                </div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">{mode.label}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">{mode.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Brand Palette Token Visualizer */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-brand-500" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Master DataCore Design Palette Tokens</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          {paletteColors.map((c) => (
            <div key={c.hex} className="p-3 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder space-y-2">
              <div
                className="w-full h-10 rounded-lg shadow-inner border border-black/5"
                style={{ backgroundColor: c.hex }}
              ></div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{c.name}</p>
                <p className="text-[10px] text-brand-600 dark:text-brand-300 font-semibold">{c.hex}</p>
                <p className="text-[10px] text-slate-400 font-sans mt-0.5">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Accessibility & Reduced Motion */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
          <Eye className="w-4 h-4 text-emerald-500" />
          <span>Accessibility & Motion Preferences</span>
        </h3>

        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-[#151322] border border-slate-200 dark:border-datacore-darkBorder text-xs">
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100">Reduce Motion & Animations</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Disables animated transitions, counters, and decorative movement across charts</p>
          </div>
          <button
            onClick={() => setReducedMotion(!reducedMotion)}
            className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
              reducedMotion ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
              reducedMotion ? 'translate-x-6' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>
    </div>
  );
};
