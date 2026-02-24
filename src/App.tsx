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
  LogIn,
  LogOut,
  Archive,
  Video,
  VideoOff,
  Camera,
  History,
  Mail,
  Lock,
  UserPlus
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
  videoData?: string;
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
  className: 'selected-marker-pulse'
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
  className: 'user-pin-pulse'
});

L.Marker.prototype.options.icon = DefaultIcon;

// --- AI Service ---
const classifyUrgency = async (transcript: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an AI Emergency Severity Analyzer used in a real-time rescue system.

Your job is to analyze a spoken emergency transcript from a user and determine how serious the situation is.

Analyze the sentence carefully and classify the emergency into ONE of these levels:
- Critical → Life-threatening, severe injury, fire, accident, violence, unconscious person, medical emergency
- Medium → Possible risk but not life-threatening yet
- Low → Safe situation, testing, or unclear request

Instructions:
1. Understand context, tone, and meaning.
2. Detect urgency signals such as panic words, distress tone, danger keywords.
3. Ignore jokes or testing phrases.
4. If uncertain, choose Medium.
5. If strong danger signals appear, choose Critical.

Also generate a short reasoning explaining WHY you chose that severity.

Return ONLY valid JSON in this format:
{
  "severity": "Critical | Medium | Low",
  "confidence": "0-100%",
  "keywords_detected": ["word1","word2"],
  "reasoning": "short explanation"
}

Transcript to analyze:
"${transcript}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            severity: { type: Type.STRING, description: "Critical, Medium, or Low" },
            confidence: { type: Type.STRING, description: "0-100%" },
            keywords_detected: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of detected danger keywords"
            },
            reasoning: { type: Type.STRING, description: "Short explanation" }
          },
          required: ["severity", "confidence", "keywords_detected", "reasoning"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Classification failed:", error);
    return { 
      severity: "Critical", 
      confidence: "0%", 
      keywords_detected: [], 
      reasoning: "Defaulted to Critical due to analysis error." 
    };
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

const AuthScreen = ({ onLogin }: { onLogin: (user: { name: string, email: string }) => void }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      onLogin({ name: name || email.split('@')[0], email });
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass w-full max-w-md p-10 rounded-[2.5rem] space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-brand-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield size={32} className="text-brand-accent" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter text-white">
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-slate-500 text-sm font-bold">
            {mode === 'signin' ? 'Secure access to RescueLink Command' : 'Join the next generation of emergency response'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-brand-accent/50 transition-all" />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="operator@rescuelink.ai" className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-brand-accent/50 transition-all" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-brand-accent/50 transition-all" />
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="w-full py-4 bg-brand-accent hover:bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition-all disabled:opacity-50">
            {isLoading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <>{mode === 'signin' ? <LogIn size={18} /> : <UserPlus size={18} />} {mode === 'signin' ? 'Sign In' : 'Create Account'}</>}
          </button>
        </form>
        <div className="text-center">
          <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-brand-accent transition-colors">
            {mode === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const UserScreen = ({ onTrigger, onLocationUpdate }: { onTrigger: (data: any) => void, onLocationUpdate: (location: string) => void }) => {
  const [isListening, setIsListening] = useState(false);
  const [location, setLocation] = useState<string>("Locating...");
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [status, setStatus] = useState<string>("System Ready");
  const [isTriggered, setIsTriggered] = useState(false);
  const [aiResult, setAiResult] = useState<{ 
    severity: string, 
    confidence: string, 
    keywords_detected: string[], 
    reasoning: string 
  } | null>(null);
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSignLanguageCameraOpen, setIsSignLanguageCameraOpen] = useState(false);
  const [isDetectingSignLanguage, setIsDetectingSignLanguage] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const signLanguageStreamRef = useRef<MediaStream | null>(null);

  const watchIdRef = useRef<number | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: true 
      });
      streamRef.current = stream;
      
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      videoChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `emergency_recording_${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setStatus("Recording Video Evidence...");
      handleEmergency("Video SOS Signal Triggered");
    } catch (err) {
      console.error("Recording error:", err);
      setStatus("Camera/Mic access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatus("Recording Saved.");
    }
  };

  const startSignLanguageDetection = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      signLanguageStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsSignLanguageCameraOpen(true);
      setStatus("Detecting sign language...");
      setIsDetectingSignLanguage(true);

      // Simulate detection after a few seconds
      setTimeout(() => {
        if (isSignLanguageCameraOpen) { // Only trigger if camera is still open
          handleEmergency("Sign Language SOS Detected");
          setStatus("Sign Language SOS Sent!");
          stopSignLanguageDetection();
        }
      }, 5000); 

    } catch (err) {
      console.error("Sign language camera error:", err);
      setStatus("Camera access denied for sign language detection.");
    }
  };

  const stopSignLanguageDetection = () => {
    if (signLanguageStreamRef.current) {
      signLanguageStreamRef.current.getTracks().forEach(track => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
    setIsSignLanguageCameraOpen(false);
    setIsDetectingSignLanguage(false);
    setStatus("Sign language detection stopped.");
  };

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
      urgency: classification.severity,
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

          {isSignLanguageCameraOpen && (
            <div className="relative w-full max-w-sm h-60 bg-black rounded-xl overflow-hidden shadow-lg border border-white/10">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-lg font-bold">
                {isDetectingSignLanguage ? "Detecting Sign..." : "Camera Ready"}
              </div>
            </div>
          )}

      <div className="relative flex flex-col items-center gap-8">
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

        {/* Distinct SOS Button */}
        <div className="flex flex-col gap-4 w-full max-w-[320px]">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleEmergency("SOS Signal Triggered")}
            className="w-full py-5 bg-white border-[4px] border-brand-accent rounded-[2rem] flex items-center justify-center gap-4 text-brand-accent shadow-[8px_8px_0px_0px_rgba(255,59,48,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
            aria-label="Immediate SOS"
          >
            <span className="text-4xl font-black italic tracking-tighter">SOS</span>
            <div className="h-8 w-[2px] bg-brand-accent/20" />
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-[0.2em] leading-none">Immediate</p>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Silent Signal</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              "w-full py-5 rounded-[2rem] flex items-center justify-center gap-4 border-[4px] transition-all relative",
              isRecording 
                ? "bg-red-600 border-red-400 text-white shadow-[8px_8px_0px_0px_rgba(153,27,27,1)]" 
                : "bg-slate-900 border-slate-800 text-white shadow-[8px_8px_0px_0px_rgba(30,41,59,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
            )}
            aria-label={isRecording ? "Stop Recording" : "Video SOS"}
          >
            {isRecording ? <VideoOff size={32} /> : <Video size={32} />}
            <div className="h-8 w-[2px] bg-white/20" />
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-[0.2em] leading-none">
                {isRecording ? "Stop Recording" : "Video SOS"}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                {isRecording ? "Recording Live..." : "Record Evidence"}
              </p>
            </div>
            {isRecording && (
              <div className="absolute top-4 right-6 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span className="text-[8px] font-black uppercase tracking-widest">REC</span>
              </div>
            )}
          </motion.button>
        </div>

        {/* Sign Language SOS Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isSignLanguageCameraOpen ? stopSignLanguageDetection : startSignLanguageDetection}
          className={cn(
            "w-full max-w-[320px] py-5 rounded-[2rem] flex items-center justify-center gap-4 border-[4px] transition-all",
            isSignLanguageCameraOpen 
              ? "bg-blue-600 border-blue-400 text-white shadow-[8px_8px_0px_0px_rgba(29,78,216,1)]" 
              : "bg-slate-900 border-slate-800 text-white shadow-[8px_8px_0px_0px_rgba(30,41,59,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
          )}
          aria-label={isSignLanguageCameraOpen ? "Stop Sign Language Detection" : "Sign Language SOS"}
        >
          {isSignLanguageCameraOpen ? <VideoOff size={32} /> : <Camera size={32} />}
          <div className="h-8 w-[2px] bg-white/20" />
          <div className="text-left">
            <p className="text-xs font-black uppercase tracking-[0.2em] leading-none">
              {isSignLanguageCameraOpen ? "Stop Detection" : "Sign Language SOS"}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
              {isSignLanguageCameraOpen ? "Detecting..." : "Visual Help"}
            </p>
          </div>
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
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500">{aiResult.confidence} Conf.</span>
                    <StatusBadge status={aiResult.severity as any} />
                  </div>
                </div>
                {aiResult.keywords_detected.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {aiResult.keywords_detected.map((kw, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-white/5 rounded text-[9px] text-slate-400 border border-white/5 uppercase tracking-wider">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
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
  const MapUpdater = ({ coords, zoom }: { coords: [number, number] | null, zoom: number }) => {
    const map = useMap();
    useEffect(() => {
      if (coords) {
        map.setView(coords, zoom);
      }
    }, [coords, zoom, map]);
    return null;
  };

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [severityFilter, setSeverityFilter] = useState<Alert['status'] | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Accepted' | 'Pending'>('All');
  const [showTraffic, setShowTraffic] = useState(false);

  const alertCoords = useMemo(() => {
    if (!selectedAlert) return null;
    const parts = selectedAlert.location.split(',').map(p => parseFloat(p.trim()));
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
    return [parts[0], parts[1]] as [number, number];
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
              key={JSON.stringify(alerts.map(a => a.id + a.location)) + JSON.stringify(Object.keys(activeUsers).map(u => u + activeUsers[u].location))}
            >
              {alertCoords && <MapUpdater coords={alertCoords} zoom={12} />}
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />

              {/* Markers for active users */}
              {Object.entries(activeUsers).map(([userId, userData]) => {
                const parts = userData.location.split(',').map(p => parseFloat(p.trim()));
                if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
                const userCoords = [parts[0], parts[1]] as [number, number];
                return (
                  <Marker key={`user-${userId}`} position={userCoords} icon={UserPinIcon}>
                    <Popup>
                      <div className="font-bold">User: {userId}</div>
                      <div>Last Seen: {new Date(userData.lastSeen).toLocaleTimeString()}</div>
                      <div>Location: {userData.location}</div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Markers for alerts */}
              {alerts.map(alert => {
                const parts = alert.location.split(',').map(p => parseFloat(p.trim()));
                if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
                const alertPosition = [parts[0], parts[1]] as [number, number];
                return (
                  <Marker 
                    key={`alert-${alert.id}`}
                    position={alertPosition}
                    icon={selectedAlert?.id === alert.id ? HighlightedIcon : DefaultIcon}
                    eventHandlers={{
                      click: () => setSelectedAlert(alert),
                    }}
                  >
                    <Popup>
                      <div className="font-bold">Alert ID: {alert.id}</div>
                      <div>User: {alert.userId}</div>
                      <div>Status: {alert.status}</div>
                      <div>Location: {alert.location}</div>
                      <div>Transcript: {alert.transcript}</div>
                      {alert.videoData && (
                        <a href={alert.videoData} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">View Video</a>
                      )}
                    </Popup>
                  </Marker>
                );
              })}
              {showTraffic && (
                <TileLayer
                  url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
                  opacity={0.4}
                  attribution='&copy; Traffic Data via OSM Transport'
                />
              )}
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
                  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
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
                  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
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

            </MapContainer>
            
            {/* Map Overlay UI */}
            <div className="absolute top-6 right-6 z-[1000] flex flex-col gap-2">
              <button
                onClick={() => setShowTraffic(!showTraffic)}
                className={cn(
                  "glass p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  showTraffic ? "bg-brand-accent text-white" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Activity size={14} />
                Traffic: {showTraffic ? 'ON' : 'OFF'}
              </button>
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
  const [view, setView] = useState<'user' | 'admin' | 'auth'>('user');
  const [currentUser, setCurrentUser] = useState<{ name: string, email: string } | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [history, setHistory] = useState<Alert[]>([]);
  const [activeUsers, setActiveUsers] = useState<Record<string, { location: string, lastSeen: string }>>({});
  const [newAlertNotification, setNewAlertNotification] = useState<Alert | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (alerts.length > 0) {
      const latest = alerts[0];
      const isRecent = (Date.now() - new Date(latest.timestamp).getTime()) < 5000;
      if (isRecent && view === 'admin') {
        setNewAlertNotification(latest);
        const timer = setTimeout(() => setNewAlertNotification(null), 8000);
        return () => clearTimeout(timer);
      }
    }
  }, [alerts, view]);

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
          aiReasoning: data.aiReasoning,
          videoData: data.videoData
        }
      }));
    }
  };

  const updateAlertVideo = (alertId: string, videoData: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'UPDATE_ALERT_VIDEO',
        payload: { id: alertId, videoData }
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
          
          <div className="flex items-center gap-4">
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

            <button 
              onClick={() => currentUser ? setCurrentUser(null) : setView('auth')}
              className="w-10 h-10 rounded-xl bg-slate-900/50 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-all"
              title={currentUser ? "Sign Out" : "Sign In"}
            >
              {currentUser ? <LogOut size={20} /> : <LogIn size={20} />}
            </button>
          </div>
        </div>
      </nav>

      <main className="pb-24 pt-20 px-4">
        <div className={cn("mx-auto", view === 'admin' ? "max-w-none" : "max-w-md")}>
          <AnimatePresence mode="wait">
            {view === 'auth' ? (
              <motion.div
                key="auth"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ type: "spring", damping: 20, stiffness: 100 }}
              >
                <AuthScreen onLogin={(user) => {
                  setCurrentUser(user);
                  setView('user');
                }} />
              </motion.div>
            ) : view === 'user' ? (
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
        </div>
      </main>

      {/* Real-time Notification */}
      <AnimatePresence>
        {newAlertNotification && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-24 right-8 z-[2000] glass p-6 rounded-3xl border-l-4 border-l-brand-accent shadow-2xl max-w-sm"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-accent/20 flex items-center justify-center">
                <AlertTriangle className="text-brand-accent animate-pulse" size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">New Emergency Alert</p>
                <p className="text-sm font-black text-white">{newAlertNotification.userId}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 italic mb-4 line-clamp-2">"{newAlertNotification.transcript}"</p>
            <button 
              onClick={() => setNewAlertNotification(null)}
              className="w-full py-2 bg-brand-accent text-white text-[10px] font-black uppercase tracking-widest rounded-xl"
            >
              Acknowledge
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
