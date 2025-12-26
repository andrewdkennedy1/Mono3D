
import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import Viewer3D from './components/Viewer3D';
import { MeshSettings } from './types';
import { processImageData, exportSTL } from './lib/stl-utils';
import { 
  ArrowUpTrayIcon, 
  ArrowDownTrayIcon, 
  VariableIcon, 
  CubeTransparentIcon,
  ScissorsIcon,
  BoltIcon,
  ViewfinderCircleIcon,
  Square2StackIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const DEFAULT_SETTINGS: MeshSettings = {
  heightScale: 10,
  baseThickness: 2.0,
  resolution: 512,
  invert: false,
  smoothing: 0,
  removeBackground: true,
  maskThreshold: 0.15,
  flatTop: true,
  contrast: 8.0,
  simplification: 0.15,
  enableBase: true,
};

const App: React.FC = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pixelData, setPixelData] = useState<Uint8ClampedArray | null>(null);
  const [settings, setSettings] = useState<MeshSettings>(DEFAULT_SETTINGS);
  const [currentMesh, setCurrentMesh] = useState<THREE.Mesh | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  
  const processingRef = useRef(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setImageUrl(url);
      };
      reader.readAsDataURL(file);
    }
  };

  const updatePixelData = useCallback(async () => {
    if (!imageUrl || processingRef.current) return;
    
    processingRef.current = true;
    setIsProcessing(true);
    try {
      const data = await processImageData(imageUrl, settings.resolution);
      setPixelData(data);
    } catch (err) {
      console.error("Error processing image data", err);
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  }, [imageUrl, settings.resolution]);

  useEffect(() => {
    const timeout = setTimeout(updatePixelData, 300);
    return () => clearTimeout(timeout);
  }, [updatePixelData]);

  const handleExport = () => {
    if (currentMesh) {
      const name = settings.flatTop ? 'vector-precision-extrusion' : 'lithophane-mesh';
      exportSTL(currentMesh, `${name}.stl`);
    }
  };

  return (
    <div className="flex h-screen bg-[#020203] text-zinc-100 selection:bg-cyan-500/30 overflow-hidden font-sans">
      <aside className="w-80 border-r border-zinc-800/40 bg-[#08080a] p-6 flex flex-col gap-6 overflow-y-auto shrink-0 z-20 shadow-[20px_0_50px_rgba(0,0,0,0.5)]">
        <header className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-cyan-400 to-indigo-600 rounded-2xl shadow-lg shadow-cyan-500/20 ring-1 ring-white/10">
              <CubeTransparentIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tight leading-none text-white">Mono3D</h1>
              <span className="text-[9px] text-cyan-400 font-mono uppercase tracking-[0.3em] font-black opacity-80">Vector-Mesh v4</span>
            </div>
          </div>
          <button 
            onClick={() => setShowInfo(true)}
            className="p-2 text-zinc-600 hover:text-cyan-400 hover:bg-white/5 rounded-full transition-all"
            title="Workflow Guide"
          >
            <InformationCircleIcon className="w-6 h-6" />
          </button>
        </header>

        <section className="space-y-4">
          <label className="block">
            <div className="relative group cursor-pointer border-2 border-dashed border-zinc-800 hover:border-cyan-500/50 hover:bg-cyan-500/5 rounded-2xl p-5 transition-all duration-300">
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
              <div className="flex flex-col items-center gap-2 text-zinc-500 group-hover:text-zinc-300">
                <ArrowUpTrayIcon className="w-5 h-5" />
                <p className="text-[10px] text-center font-black uppercase tracking-[0.2em]">Import Design</p>
              </div>
            </div>
          </label>
        </section>

        {imageUrl && (
          <section className="space-y-6 flex-1">
            <div className="space-y-3">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Engine Algorithm</span>
              <div className="grid grid-cols-2 p-1.5 bg-zinc-900/50 rounded-xl border border-zinc-800 shadow-inner">
                <button 
                  onClick={() => setSettings(s => ({...s, flatTop: true}))}
                  className={`py-2 text-[10px] font-black uppercase rounded-lg transition-all ${settings.flatTop ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Spline
                </button>
                <button 
                  onClick={() => setSettings(s => ({...s, flatTop: false}))}
                  className={`py-2 text-[10px] font-black uppercase rounded-lg transition-all ${!settings.flatTop ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Litho
                </button>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex justify-between text-[11px] font-black text-zinc-400 uppercase tracking-wider">
                  <label>Detail Scale</label>
                  <span className="text-cyan-400 font-mono">{settings.resolution}px</span>
                </div>
                <input 
                  type="range" min="128" max="1024" step="64" 
                  value={settings.resolution} 
                  onChange={(e) => setSettings(s => ({...s, resolution: parseInt(e.target.value)}))}
                  className="w-full accent-cyan-500 bg-zinc-900 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {settings.flatTop && (
                <div className="space-y-3">
                  <div className="flex justify-between text-[11px] font-black text-zinc-400 uppercase tracking-wider">
                    <label>Path Smoothing</label>
                    <span className="text-cyan-400 font-mono">{settings.simplification}</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.05" 
                    value={settings.simplification} 
                    onChange={(e) => setSettings(s => ({...s, simplification: parseFloat(e.target.value)}))}
                    className="w-full accent-cyan-500 bg-zinc-900 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between text-[11px] font-black text-zinc-400 uppercase tracking-wider">
                  <label>Extrusion Height</label>
                  <span className="text-cyan-400 font-mono">{settings.heightScale}mm</span>
                </div>
                <input 
                  type="range" min="1" max="50" 
                  value={settings.heightScale} 
                  onChange={(e) => setSettings(s => ({...s, heightScale: parseInt(e.target.value)}))}
                  className="w-full accent-cyan-500 bg-zinc-900 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => setSettings(s => ({...s, removeBackground: !s.removeBackground}))}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all shadow-sm ${settings.removeBackground ? 'bg-zinc-800/80 border-cyan-500/50 text-white' : 'bg-transparent border-zinc-800 text-zinc-500'}`}
                >
                  <div className="flex items-center gap-3">
                    <ScissorsIcon className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.1em]">Silhouette Trace</span>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${settings.removeBackground ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'bg-zinc-700'}`} />
                </button>
                
                <button
                  onClick={() => setSettings(s => ({...s, invert: !s.invert}))}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border border-zinc-800/50 text-zinc-400 hover:bg-white/5 transition-all ${settings.invert ? 'bg-cyan-500/5 text-cyan-400 border-cyan-500/20' : ''}`}
                >
                  <BoltIcon className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.1em]">Swap Height/Depth</span>
                </button>

                <button
                  onClick={() => setSettings(s => ({...s, enableBase: !s.enableBase}))}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border border-zinc-800/50 text-zinc-400 hover:bg-white/5 transition-all ${settings.enableBase ? 'bg-cyan-500/5 text-cyan-400 border-cyan-500/20' : ''}`}
                >
                  <Square2StackIcon className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.1em]">Solid Backplate</span>
                </button>
              </div>
            </div>
          </section>
        )}

        <div className="pt-4 mt-auto">
           <button 
            onClick={handleExport}
            disabled={!imageUrl || isProcessing}
            className="group w-full py-5 bg-gradient-to-br from-cyan-500 via-indigo-600 to-purple-700 text-white disabled:from-zinc-900 disabled:to-zinc-900 disabled:text-zinc-700 rounded-2xl flex flex-col items-center justify-center gap-1 font-black transition-all hover:brightness-110 hover:scale-[1.02] active:scale-95 shadow-xl shadow-cyan-950/20 border border-white/5"
          >
            <div className="flex items-center gap-2">
              <ArrowDownTrayIcon className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
              <span className="text-sm uppercase tracking-[0.15em]">Export Manifold STL</span>
            </div>
          </button>
        </div>
      </aside>

      <main className="flex-1 relative flex flex-col bg-black">
        {imageUrl ? (
          <div className="flex-1 relative">
            <Viewer3D 
              pixelData={pixelData} 
              settings={settings} 
              onMeshCreated={setCurrentMesh}
            />
            
            <div className="absolute top-8 left-8 flex flex-col gap-3">
               <div className="flex items-center gap-2 px-5 py-2.5 bg-black/90 backdrop-blur-2xl rounded-2xl border border-white/5 shadow-2xl">
                 <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
                 <span className="text-[11px] font-black text-white uppercase tracking-[0.25em]">Precision Vector: {settings.resolution}px</span>
               </div>
            </div>

            <div className="absolute bottom-8 right-8 flex gap-3 scale-90 sm:scale-100">
               <div className="px-8 py-5 bg-black/90 backdrop-blur-2xl border border-white/5 rounded-[3rem] flex gap-10 items-center shadow-2xl ring-1 ring-white/5">
                  <div>
                    <div className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-1.5">Triangles</div>
                    <div className="text-base font-mono font-black text-white">{(currentMesh?.geometry.attributes.position?.count ? Math.floor(currentMesh.geometry.attributes.position.count / 3) : 0).toLocaleString()}</div>
                  </div>
                  <div className="w-px h-8 bg-zinc-800" />
                  <div>
                    <div className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-1.5">Accuracy</div>
                    <div className="text-base font-mono font-black text-cyan-400">Vector Line</div>
                  </div>
               </div>
            </div>

            {isProcessing && (
              <div className="absolute inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-50">
                <div className="flex flex-col items-center gap-10">
                  <div className="relative">
                    <div className="w-32 h-32 border-2 border-cyan-500/5 rounded-full animate-ping absolute inset-0" />
                    <ViewfinderCircleIcon className="w-32 h-32 text-cyan-500/50 animate-[spin_8s_linear_infinite] absolute inset-0" />
                    <VariableIcon className="w-32 h-32 text-cyan-400 animate-[spin_3s_cubic-bezier(.4,0,.2,1)_infinite]" />
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-lg font-black tracking-[1em] uppercase text-white translate-x-2">Tracing Splines</span>
                    <span className="text-[10px] text-zinc-500 font-mono tracking-[0.3em] uppercase opacity-60">Building watertight manifold volume</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 relative">
            <div className="absolute inset-0 bg-gradient-radial from-cyan-500/5 to-transparent opacity-30" />
            <div className="w-full max-w-3xl space-y-16 relative">
              <div className="relative inline-block">
                <div className="absolute -inset-24 bg-cyan-500/5 blur-[150px] rounded-full animate-pulse" />
                <CubeTransparentIcon className="w-48 h-48 text-zinc-900 relative brightness-75 scale-110" />
              </div>
              <div className="space-y-6">
                <h2 className="text-8xl font-black tracking-tighter text-white drop-shadow-2xl">Vector STL.</h2>
                <p className="text-zinc-500 text-2xl font-semibold max-w-xl mx-auto leading-tight opacity-80">
                  High-fidelity spline extraction engine for perfectly smooth, sharp extrusions from graphic designs.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info Modal */}
        {showInfo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div 
              className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" 
              onClick={() => setShowInfo(false)}
            />
            <div className="relative w-full max-w-2xl bg-[#08080a] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
              {/* Header */}
              <div className="p-6 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-900/50">
                <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <CubeTransparentIcon className="w-6 h-6 text-cyan-400" />
                  Workflow Guide
                </h3>
                <button onClick={() => setShowInfo(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              {/* Scrollable Content */}
              <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
                {/* Section 1 */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-zinc-400 uppercase tracking-widest">Core Functionality</h4>
                  <p className="text-zinc-300 leading-relaxed text-sm">
                    Mono3D converts 2D raster images into manifold 3D geometry using a custom marching-squares algorithm. Unlike standard heightmaps, our <span className="text-cyan-400 font-bold">Spline Engine</span> traces precise vector contours to generate sharp, vertical walls suitable for CAD-like objects.
                  </p>
                </div>

                {/* Grid of features */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-5 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 hover:border-cyan-500/20 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                      <span className="font-bold text-white text-sm">Spline Mode</span>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Best for logos, icons, and text. Extrudes vectors vertically. Use high-contrast inputs for best results.
                    </p>
                  </div>
                  <div className="p-5 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 hover:border-purple-500/20 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.5)]" />
                      <span className="font-bold text-white text-sm">Litho Mode</span>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Best for photos. Creates a topographic relief map where darkness equals height.
                    </p>
                  </div>
                </div>

                {/* Tips List */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-zinc-400 uppercase tracking-widest">Pro Tips</h4>
                  <ul className="space-y-4">
                    {[
                      "Use 'Solid Backplate' for coasters, keychains, or mounting plaques.",
                      "Toggle 'Silhouette Trace' to automatically remove white backgrounds from logos.",
                      "If you see 'Impossible Shape' errors in your slicer, ensure your input image doesn't have single-pixel noise.",
                      "For multi-color prints, pause your printer at the layer height where the extrusion starts."
                    ].map((tip, i) => (
                      <li key={i} className="flex items-start gap-3 text-zinc-400 text-sm">
                        <span className="text-cyan-500/50 font-mono mt-0.5 text-xs">0{i+1}.</span>
                        <span className="leading-relaxed">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              {/* Footer */}
              <div className="p-6 bg-zinc-900/50 border-t border-zinc-800/50">
                <button 
                  onClick={() => setShowInfo(false)}
                  className="w-full py-3 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all text-sm"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;
