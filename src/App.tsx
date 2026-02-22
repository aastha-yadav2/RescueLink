/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  AlertCircle, 
  Mic, 
  MapPin, 
  Shield, 
  LayoutDashboard, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Radio,
  BrainCircuit,
  XCircle,
  Activity,
  History,
  Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { GoogleGenAI, Type } from "@google/genai";

// --- Utility Functions ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Alert {
  id: string;
  timestamp: string;
  status: 'Critical' | 'Medium' | 'Low';
  location: string;
  userId: string;
  transcript?: string;
  aiReasoning?: string;
  accepted: boolean;
  acceptedAt?: string;
  resolved?: boolean;
  resolvedAt?: string;
  resolutionType?: 'Resolved' | 'Rejected';
}

// --- Leaflet Setup ---
// Fix for default marker icons in Leaflet with React
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const HighlightedIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [35, 56],
  iconAnchor: [17, 56],
});

const UserIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [20, 32],
  iconAnchor: [10, 32],
});

const UserPinIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [30, 48],
  iconAnchor: [15, 48],
});

L.Marker.prototype.options.icon = DefaultIcon;

// --- AI Service ---
const classifyUrgency = async (transcript: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this emergency transcript and classify urgency as Critical, Medium, or Low. Provide a brief reasoning. Transcript: "${transcript}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            urgency: { type: Type.STRING, description: "Critical, Medium, or Low" },
            reasoning: { type: Type.STRING, description: "Brief explanation" }
          },
          required: ["urgency", "reasoning"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Classification failed:", error);
    return { urgency: "Critical", reasoning: "Defaulted to Critical due to analysis error." };
  }
};

// --- Components ---

const StatusBadge = ({ status }: { status: Alert['status'] }) => {
  const colors = {
    Critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    Medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };

  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", colors[status])}>
      {status}
    </span>
  );
};

const UserScreen = ({ onTrigger, onLocationUpdate }: { onTrigger: (data: any) => void, onLocationUpdate: (location: string) => void }) => {
  const [isListening, setIsListening] = useState(false);
  const [location, setLocation] = useState<string>("Locating...");
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [status, setStatus] = useState<string>("System Ready");
  const [isTriggered, setIsTriggered] = useState(false);
  const [aiResult, setAiResult] = useState<{ urgency: string, reasoning: string } | null>(null);
  const [transcript, setTranscript] = useState("");
  const watchIdRef = useRef<number | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setStatus("Listening for emergency details...");
      };

      recognition.onresult = (event: any) => {
        const currentTranscript = event.results[0][0].transcript;
        setTranscript(currentTranscript);
        handleEmergency(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        setStatus("Voice recognition failed. Try manual trigger.");
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    if ("geolocation" in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const locString = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
          setLocation(locString);
          setCoords([pos.coords.latitude, pos.coords.longitude]);
          onLocationUpdate(locString);
        },
        (err) => {
          console.error("Location error:", err);
          setLocation("Location Access Denied");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [onLocationUpdate]);

  // Real Voice Recognition trigger
  const toggleVoiceTrigger = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (recognitionRef.current) {
        // Request a fresh location fix when starting voice capture
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition((pos) => {
            const locString = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
            setLocation(locString);
            setCoords([pos.coords.latitude, pos.coords.longitude]);
            onLocationUpdate(locString);
          });
        }
        recognitionRef.current.start();
      } else {
        setStatus("Voice recognition not supported in this browser.");
      }
    }
  };

  const handleEmergency = async (text?: string) => {
    setIsTriggered(true);
    setStatus("Analyzing situation with AI...");
    
    const finalTranscript = text || "Manual emergency button pressed.";
    setTranscript(finalTranscript);

    const classification = await classifyUrgency(finalTranscript);
    setAiResult(classification);
    
    setStatus("Alert Sent. Dispatchers notified.");
    onTrigger({
      location,
      transcript: finalTranscript,
      urgency: classification.urgency,
      aiReasoning: classification.reasoning
    });

    setTimeout(() => {
      setIsTriggered(false);
      // Keep AI result visible for a bit
    }, 8000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] space-y-8 p-6">
      <div className="text-center space-y-2">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 text-brand-accent mb-2"
        >
          <Activity size={20} className="animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-[0.2em]">RescueLink AI v2.0</span>
        </motion.div>
        <h1 className="text-5xl font-black tracking-tighter">RescueLink AI</h1>
        <p className="text-slate-400 max-w-xs mx-auto">Intelligent Emergency Response at your fingertips.</p>
      </div>

      <div className="relative">
        <AnimatePresence>
          {isTriggered && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="absolute inset-0 bg-brand-accent rounded-full blur-3xl opacity-20"
            />
          )}
        </AnimatePresence>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleEmergency()}
          aria-label="Trigger Emergency Alert"
          className={cn(
            "relative w-72 h-72 rounded-full bg-brand-accent flex flex-col items-center justify-center text-white shadow-2xl transition-all duration-500",
            isTriggered ? "emergency-pulse scale-110" : "hover:bg-red-500"
          )}
        >
          <AlertCircle size={80} className="mb-2" aria-hidden="true" />
          <span className="text-3xl font-black uppercase tracking-widest">Emergency</span>
          <span className="text-sm font-medium opacity-80">Press for Help</span>
        </motion.button>
      </div>

      <div className="flex flex-col items-center space-y-6 w-full max-w-md">
        <div className="flex gap-4">
          <button 
            onClick={toggleVoiceTrigger}
            aria-label={isListening ? "Stop Voice Recognition" : "Start Voice Recognition"}
            aria-pressed={isListening}
            className={cn(
              "p-5 rounded-full transition-all duration-300 shadow-lg",
              isListening ? "bg-red-500 text-white animate-pulse" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            )}
          >
            <Mic size={32} aria-hidden="true" />
          </button>
        </div>

        <AnimatePresence>
          {aiResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full glass rounded-3xl p-6 border-l-4 border-l-brand-accent"
            >
              <div className="flex items-center gap-3 mb-3">
                <BrainCircuit className="text-brand-accent" size={24} />
                <h3 className="font-bold text-lg">AI Urgency Analysis</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Classification:</span>
                  <StatusBadge status={aiResult.urgency as any} />
                </div>
                <p className="text-sm text-slate-300 italic">"{transcript}"</p>
                <p className="text-xs text-slate-500 leading-relaxed">{aiResult.reasoning}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full glass rounded-2xl p-6 space-y-4">
          <div className="h-48 rounded-xl overflow-hidden relative border border-white/5">
            {coords ? (
              <MapContainer 
                center={coords} 
                zoom={15} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                dragging={false}
                scrollWheelZoom={false}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <Marker position={coords} icon={UserPinIcon} />
                <MapUpdater coords={coords} />
              </MapContainer>
            ) : (
              <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-600 text-xs font-bold uppercase tracking-widest">
                Initializing Satellite Link...
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-slate-300">
              <MapPin size={18} className="text-brand-accent" />
              <span className="text-sm font-medium">{location}</span>
            </div>
            <div className={cn("w-2 h-2 rounded-full", isTriggered ? "bg-red-500 animate-ping" : "bg-emerald-500")} />
          </div>
          <div className="h-px bg-white/5" />
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status:</span>
            <span className="text-sm text-slate-300">{status}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const MapUpdater = ({ coords }: { coords: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo(coords, 15, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [coords, map]);
  return null;
};

const ResponseTimer = ({ acceptedAt }: { acceptedAt: string }) => {
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    const start = new Date(acceptedAt).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [acceptedAt]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-xs font-bold">
      <Clock size={12} className="animate-pulse" />
      {formatTime(elapsed)}
    </div>
  );
};

const AdminDashboard = ({ 
  alerts, 
  history, 
  activeUsers,
  onAccept, 
  onReject, 
  onResolve 
}: { 
  alerts: Alert[], 
  history: Alert[], 
  activeUsers: Record<string, { location: string, lastSeen: string }>,
  onAccept: (id: string) => void, 
  onReject: (id: string) => void,
  onResolve: (id: string) => void
}) => {
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [severityFilter, setSeverityFilter] = useState<Alert['status'] | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Accepted' | 'Pending'>('All');

  const alertCoords = useMemo(() => {
    if (!selectedAlert) return null;
    const parts = selectedAlert.location.split(',').map(p => parseFloat(p.trim()));
    return parts.length === 2 ? [parts[0], parts[1]] as [number, number] : null;
  }, [selectedAlert]);

  const displayAlerts = activeTab === 'active' ? alerts : history;

  const filteredAlerts = useMemo(() => {
    return displayAlerts.filter(alert => {
      const matchesSeverity = severityFilter === 'All' || alert.status === severityFilter;
      const matchesStatus = statusFilter === 'All' || 
        (statusFilter === 'Accepted' && alert.accepted) || 
        (statusFilter === 'Pending' && !alert.accepted);
      return matchesSeverity && matchesStatus;
    });
  }, [displayAlerts, severityFilter, statusFilter]);

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight">RescueLink Command</h1>
          <p className="text-slate-400 flex items-center gap-2 font-medium">
            <Radio size={16} className="text-brand-accent animate-pulse" />
            AI-Enhanced Dispatch Monitoring
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-white/5" role="tablist">
            <button 
              onClick={() => setActiveTab('active')}
              role="tab"
              aria-selected={activeTab === 'active'}
              aria-controls="alerts-panel"
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'active' ? "bg-brand-card text-white shadow-xl border border-white/10" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <Activity size={14} aria-hidden="true" />
              Active
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              role="tab"
              aria-selected={activeTab === 'history'}
              aria-controls="alerts-panel"
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'history' ? "bg-brand-card text-white shadow-xl border border-white/10" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <History size={14} aria-hidden="true" />
              History
            </button>
          </div>
          <div className="glass px-6 py-3 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
              <Clock size={20} className="text-brand-accent" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black">Avg Response</p>
              <p className="text-xl font-mono font-bold">01:12s</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Alerts List */}
        <div className="xl:col-span-4 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
              {activeTab === 'active' ? 'Live Alerts' : 'Incident History'}
            </h2>
            <span className={cn(
              "text-white text-[10px] font-black px-2 py-0.5 rounded-full",
              activeTab === 'active' ? "bg-brand-accent" : "bg-slate-700"
            )}>
              {filteredAlerts.length} {activeTab === 'active' ? 'NEW' : 'TOTAL'}
            </span>
          </div>

          <div className="flex flex-col gap-3 px-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Severity:</span>
              <div className="flex gap-1" role="group" aria-label="Filter by severity">
                {['All', 'Critical', 'Medium', 'Low'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSeverityFilter(s as any)}
                    aria-pressed={severityFilter === s}
                    className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-bold transition-all border",
                      severityFilter === s 
                        ? "bg-brand-accent text-white border-brand-accent" 
                        : "bg-slate-900/50 text-slate-500 border-white/5 hover:border-white/20"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Status:</span>
              <div className="flex gap-1" role="group" aria-label="Filter by status">
                {['All', 'Accepted', 'Pending'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s as any)}
                    aria-pressed={statusFilter === s}
                    className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-bold transition-all border",
                      statusFilter === s 
                        ? "bg-emerald-500 text-white border-emerald-500" 
                        : "bg-slate-900/50 text-slate-500 border-white/5 hover:border-white/20"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div id="alerts-panel" role="tabpanel" className="space-y-4 overflow-y-auto max-h-[700px] pr-2 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {filteredAlerts.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass rounded-3xl p-12 text-center border-dashed border-2 border-white/5"
                >
                  <Shield size={64} className="mx-auto mb-4 text-slate-800" aria-hidden="true" />
                  <p className="text-slate-500 font-bold">
                    {activeTab === 'active' ? 'No matching alerts' : 'No history records'}
                  </p>
                </motion.div>
              ) : (
                filteredAlerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    layout
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    onClick={() => setSelectedAlert(alert)}
                    role="button"
                    aria-pressed={selectedAlert?.id === alert.id}
                    aria-label={`Alert from ${alert.userId} at ${alert.location}`}
                    className={cn(
                      "glass rounded-3xl p-5 transition-all cursor-pointer border-l-4 group",
                      selectedAlert?.id === alert.id ? "ring-2 ring-brand-accent/50" : "hover:bg-white/5",
                      alert.resolved 
                        ? (alert.resolutionType === 'Rejected' ? "border-l-slate-600" : "border-l-emerald-600") 
                        : (alert.accepted 
                            ? "border-l-emerald-500 bg-emerald-500/5" 
                            : (alert.status === 'Critical' 
                                ? "border-l-red-600 bg-red-600/10 animate-pulse-subtle" 
                                : alert.status === 'Medium' 
                                  ? "border-l-amber-500 bg-amber-500/5" 
                                  : "border-l-emerald-500 bg-emerald-500/5"
                              )
                          )
                    )}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-2">
                        <StatusBadge status={alert.status} />
                        {alert.resolved && (
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-black uppercase border",
                            alert.resolutionType === 'Rejected' ? "bg-slate-500/20 text-slate-400 border-slate-500/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          )}>
                            {alert.resolutionType}
                          </span>
                        )}
                        {alert.accepted && !alert.resolved && alert.acceptedAt && (
                          <ResponseTimer acceptedAt={alert.acceptedAt} />
                        )}
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className="space-y-3 mb-5">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                          alert.status === 'Critical' ? "bg-red-500/20 text-red-400" : 
                          alert.status === 'Medium' ? "bg-amber-500/20 text-amber-400" : 
                          "bg-emerald-500/20 text-emerald-400"
                        )}>
                          {alert.status === 'Critical' ? <AlertCircle size={14} /> : 
                           alert.status === 'Medium' ? <AlertTriangle size={14} /> : 
                           <Shield size={14} />}
                        </div>
                        <span className="font-bold text-slate-200">{alert.userId}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <MapPin size={14} className="text-brand-accent" />
                        <span className="truncate">{alert.location}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!alert.resolved ? (
                        !alert.accepted ? (
                          <>
                            <button 
                              onClick={(e) => { e.stopPropagation(); onAccept(alert.id); }}
                              aria-label={`Accept alert ${alert.id}`}
                              className="flex-1 py-2.5 bg-brand-accent hover:bg-red-500 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                            >
                              <CheckCircle2 size={14} aria-hidden="true" />
                              ACCEPT
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); onReject(alert.id); }}
                              aria-label={`Reject alert ${alert.id}`}
                              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition-all"
                            >
                              <XCircle size={18} aria-hidden="true" />
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); onResolve(alert.id); }}
                            aria-label={`Resolve alert ${alert.id}`}
                            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                          >
                            <Archive size={14} aria-hidden="true" />
                            RESOLVE INCIDENT
                          </button>
                        )
                      ) : (
                        <div className="w-full py-2.5 bg-slate-800/50 text-slate-500 rounded-xl text-xs font-black flex items-center justify-center gap-2 border border-white/5 italic">
                          ARCHIVED
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Map & Details */}
        <div className="xl:col-span-8 space-y-6">
          <div className="glass rounded-[2.5rem] h-[500px] relative overflow-hidden">
            <MapContainer 
              center={[20.5937, 78.9629]} 
              zoom={5} 
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={50}
                showCoverageOnHover={false}
              >
                {/* Active Users (Not in Alert) */}
                {Object.entries(activeUsers).map(([uid, data]) => {
                  const hasAlert = alerts.some(a => a.userId === uid);
                  if (hasAlert) return null;
                  const parts = data.location.split(',').map(p => parseFloat(p.trim()));
                  if (parts.length !== 2) return null;
                  return (
                    <Marker key={uid} position={[parts[0], parts[1]]} icon={UserIcon}>
                      <Popup>
                        <div className="text-brand-dark p-1">
                          <p className="font-bold">{uid}</p>
                          <p className="text-[10px] text-slate-500">Active - No Alert</p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {filteredAlerts.map(alert => {
                  const parts = alert.location.split(',').map(p => parseFloat(p.trim()));
                  if (parts.length !== 2) return null;
                  const isSelected = selectedAlert?.id === alert.id;
                  return (
                    <Marker 
                      key={alert.id} 
                      position={[parts[0], parts[1]]}
                      icon={isSelected ? HighlightedIcon : DefaultIcon}
                      zIndexOffset={isSelected ? 1000 : 0}
                      eventHandlers={{
                        click: () => setSelectedAlert(alert)
                      }}
                    >
                      <Popup>
                        <div className="text-brand-dark p-1">
                          <p className="font-bold">{alert.userId}</p>
                          <p className="text-xs">{alert.status} Urgency</p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MarkerClusterGroup>
              <MapUpdater coords={alertCoords} />
            </MapContainer>
            
            {/* Map Overlay UI */}
            <div className="absolute top-6 right-6 z-[1000] flex flex-col gap-2">
              <div className="glass p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400">
                Satellite Link: 98%
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {selectedAlert ? (
              <motion.div
                key={selectedAlert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="glass rounded-[2rem] p-8 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-brand-accent/10 flex items-center justify-center">
                      <BrainCircuit size={28} className="text-brand-accent" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black">AI Incident Analysis</h3>
                      <p className="text-sm text-slate-500">Automated classification for {selectedAlert.userId}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={selectedAlert.status} />
                    {selectedAlert.resolvedAt && (
                      <span className="text-[10px] font-mono text-slate-500">
                        Resolved: {new Date(selectedAlert.resolvedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Voice Transcript</h4>
                    <div className="bg-brand-dark/50 rounded-2xl p-4 border border-white/5 italic text-slate-300 text-sm leading-relaxed">
                      "{selectedAlert.transcript || "No transcript available."}"
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">AI Reasoning</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {selectedAlert.aiReasoning || "Analysis pending..."}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex gap-4">
                  {!selectedAlert.resolved ? (
                    !selectedAlert.accepted ? (
                      <>
                        <button 
                          onClick={() => onAccept(selectedAlert.id)}
                          aria-label={`Accept alert ${selectedAlert.id}`}
                          className="flex-1 py-3 bg-brand-accent hover:bg-red-500 text-white rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                        >
                          <CheckCircle2 size={18} aria-hidden="true" />
                          ACCEPT INCIDENT
                        </button>
                        <button 
                          onClick={() => onReject(selectedAlert.id)}
                          aria-label={`Reject alert ${selectedAlert.id}`}
                          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl transition-all font-black text-sm"
                        >
                          REJECT
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => onResolve(selectedAlert.id)}
                        aria-label={`Resolve alert ${selectedAlert.id}`}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                      >
                        <Archive size={18} aria-hidden="true" />
                        RESOLVE INCIDENT
                      </button>
                    )
                  ) : (
                    <div className="w-full py-3 bg-slate-800/50 text-slate-500 rounded-2xl text-sm font-black flex items-center justify-center gap-2 border border-white/5 italic">
                      INCIDENT ARCHIVED
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="glass rounded-[2rem] p-12 text-center flex flex-col items-center justify-center space-y-4">
                <LayoutDashboard size={48} className="text-slate-800" />
                <p className="text-slate-500 font-bold">Select an alert to view AI analysis and map data</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState<'user' | 'admin'>('user');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [history, setHistory] = useState<Alert[]>([]);
  const [activeUsers, setActiveUsers] = useState<Record<string, { location: string, lastSeen: string }>>({});
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'INIT_DATA') {
        setAlerts(message.payload.alerts);
        setHistory(message.payload.history);
        setActiveUsers(message.payload.activeUsers || {});
      } else if (message.type === 'ALERT_CREATED') {
        setAlerts(prev => [message.payload, ...prev]);
      } else if (message.type === 'ALERT_UPDATED') {
        setAlerts(prev => prev.map(a => a.id === message.payload.id ? message.payload : a));
      } else if (message.type === 'ALERT_RESOLVED') {
        const { alertId, resolvedAlert } = message.payload;
        setAlerts(prev => prev.filter(a => a.id !== alertId));
        setHistory(prev => [resolvedAlert, ...prev]);
      } else if (message.type === 'USER_LOCATION_UPDATED') {
        const { userId, location, activeUsers: updatedUsers } = message.payload;
        setAlerts(prev => prev.map(a => a.userId === userId ? { ...a, location } : a));
        if (updatedUsers) setActiveUsers(updatedUsers);
      }
    };

    return () => socket.close();
  }, []);

  const [userId] = useState(() => 'User_' + Math.floor(Math.random() * 1000));

  const triggerAlert = (data: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'NEW_ALERT',
        payload: { 
          location: data.location, 
          userId: userId,
          transcript: data.transcript,
          urgency: data.urgency,
          aiReasoning: data.aiReasoning
        }
      }));
    }
  };

  const updateLocation = (location: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'LOCATION_UPDATE',
        payload: { userId, location }
      }));
    }
  };

  const acceptAlert = (id: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'ACCEPT_ALERT', payload: { id } }));
    }
  };

  const rejectAlert = (id: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'REJECT_ALERT', payload: { id } }));
    }
  };

  const resolveAlert = (id: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'RESOLVE_ALERT', payload: { id } }));
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark overflow-x-hidden selection:bg-brand-accent/30">
      {/* Navigation */}
      <nav className="border-b border-white/5 bg-brand-dark/80 backdrop-blur-xl sticky top-0 z-[1001]">
        <div className="max-w-[1600px] mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-accent rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
              <Shield size={24} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-xl tracking-tighter leading-none">RescueLink</span>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-accent">AI Command</span>
            </div>
          </div>
          
          <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-white/5" role="tablist">
            <button 
              onClick={() => setView('user')}
              role="tab"
              aria-selected={view === 'user'}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                view === 'user' ? "bg-brand-card text-white shadow-xl border border-white/10" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <User size={14} aria-hidden="true" />
              User Panel
            </button>
            <button 
              onClick={() => setView('admin')}
              role="tab"
              aria-selected={view === 'admin'}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                view === 'admin' ? "bg-brand-card text-white shadow-xl border border-white/10" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <LayoutDashboard size={14} aria-hidden="true" />
              Admin Hub
            </button>
          </div>
        </div>
      </nav>

      <main className="pb-24">
        <AnimatePresence mode="wait">
          {view === 'user' ? (
            <motion.div
              key="user"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ type: "spring", damping: 20, stiffness: 100 }}
            >
              <UserScreen onTrigger={triggerAlert} onLocationUpdate={updateLocation} />
            </motion.div>
          ) : (
            <motion.div
              key="admin"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ type: "spring", damping: 20, stiffness: 100 }}
            >
              <AdminDashboard 
                alerts={alerts} 
                history={history} 
                activeUsers={activeUsers}
                onAccept={acceptAlert} 
                onReject={rejectAlert} 
                onResolve={resolveAlert}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-white/5 bg-brand-dark/90 backdrop-blur-xl px-8 py-3 z-[1001]">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.2em] font-black text-slate-600">
          <div className="flex items-center gap-8">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              AI Core Online
            </span>
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              GPS Uplink Active
            </span>
            <span className="hidden md:inline-block">
              Latency: 24ms
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-brand-accent">Emergency Protocol 4.0</span>
            <span className="opacity-50">© 2026 RescueLink AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
