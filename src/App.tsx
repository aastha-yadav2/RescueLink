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
  UserPlus,
  Plus,
  Minus,
  ZoomIn,
  ZoomOut,
  Settings,
  Phone,
  HeartPulse,
  MessageSquare,
  Flame,
  Waves,
  Mountain,
  Navigation,
  Timer,
  Car,
  Zap,
  Wind,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MapContainer, TileLayer, Marker, Popup, useMap, Tooltip, Circle, Polyline } from 'react-leaflet';
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
  fullAddress?: string | null;
  userId: string;
  transcript?: string;
  aiReasoning?: string;
  accepted: boolean;
  acceptedAt?: string;
  resolved?: boolean;
  resolvedAt?: string;
  resolutionType?: 'Resolved' | 'Rejected';
  videoData?: string;
  videoAnalysis?: {
    severity: 'Critical' | 'Medium' | 'Low';
    description: string;
    detectedObjects: string[];
    incidentTime: string;
    reasoning: string;
  };
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
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  className: 'user-pin-pulse'
});

const SafeZoneIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [30, 48],
  iconAnchor: [15, 48],
});

const DangerZoneIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const AccidentIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [35, 56],
  iconAnchor: [17, 56],
  className: 'accident-marker-blink'
});

const AmbulanceIcon = L.divIcon({
  html: `<div class="ambulance-marker"><svg viewBox="0 0 24 24" width="24" height="24" fill="white" stroke="red" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7h2m14 0c0 1.1-.9 2-2 2s-2-.9-2-2m-6 0c0 1.1-.9 2-2 2s-2-.9-2-2M5 17c0 1.1-.9 2-2 2s-2-.9-2-2m11-7V7m-4 3V7M9 10V7M5 10V7"/></svg></div>`,
  className: 'ambulance-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const TRAFFIC_ROADS = [
  { id: 'r1', name: 'Main Street', coords: [[12.9700, 77.5800], [12.9800, 77.6000]] as [number, number][], congestion: 'Heavy' },
  { id: 'r2', name: 'Oak Avenue', coords: [[12.9800, 77.6000], [12.9900, 77.6200]] as [number, number][], congestion: 'Moderate' },
  { id: 'r3', name: 'Bypass Road', coords: [[12.9700, 77.5800], [12.9750, 77.6100]] as [number, number][], congestion: 'Smooth' },
  { id: 'r4', name: 'Central Link', coords: [[12.9750, 77.5900], [12.9850, 77.5900]] as [number, number][], congestion: 'Heavy' },
];

const REROUTE_PATHS = [
  { id: 'p1', name: 'AI Optimized Route A', coords: [[12.9700, 77.5800], [12.9650, 77.5950], [12.9750, 77.6100]] as [number, number][] },
];

const AMBULANCE_PATH = [
  [12.9700, 77.5800], [12.9680, 77.5850], [12.9660, 77.5900], [12.9650, 77.5950], [12.9680, 77.6000], [12.9720, 77.6050], [12.9750, 77.6100]
] as [number, number][];

const RELIEF_CAMPS = [
  { 
    id: 'rc1', 
    name: 'City Relief Camp Alpha', 
    type: 'Flood Shelter', 
    coords: [12.9716, 77.5946] as [number, number],
    capacity: 500,
    available: 120,
    contact: '+91-9876543210'
  },
  { 
    id: 'rc2', 
    name: 'St. Mary Medical Camp', 
    type: 'Medical Camp', 
    coords: [12.9850, 77.6100] as [number, number],
    capacity: 300,
    available: 45,
    contact: '+91-9876543211'
  },
  { 
    id: 'rc3', 
    name: 'North Zone Community Hall', 
    type: 'General Relief', 
    coords: [13.0000, 77.5800] as [number, number],
    capacity: 200,
    available: 0,
    contact: '+91-9876543212'
  },
  { 
    id: 'rc4', 
    name: 'East Side Shelter', 
    type: 'Flood Shelter', 
    coords: [12.9650, 77.6200] as [number, number],
    capacity: 400,
    available: 250,
    contact: '+91-9876543213'
  },
];

const SAFE_ZONES = RELIEF_CAMPS;

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const DANGER_ZONES = [
  { id: 'dz1', name: 'Low Elevation Area', type: 'Flood', coords: [12.9600, 77.5800] as [number, number], radius: 500 },
  { id: 'dz2', name: 'Industrial Fire Zone', type: 'Fire', coords: [12.9900, 77.6200] as [number, number], radius: 400 },
  { id: 'dz3', name: 'Structural Damage Area', type: 'Earthquake', coords: [12.9750, 77.6050] as [number, number], radius: 300 },
];

const CriticalIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'critical-marker-pulse'
});

const ReliefCampIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const ReliefCampFullIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
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

const analyzeVideoEmergency = async (videoBlob: Blob) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    
    // Convert blob to base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(videoBlob);
    });

    // Clean up MIME type (Gemini doesn't like codec parameters)
    const cleanMimeType = videoBlob.type.split(';')[0] || 'video/webm';

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: cleanMimeType,
                data: base64Data
              }
            },
            {
              text: `Analyze this emergency video evidence. 
              1. Describe exactly what is happening in the scene.
              2. Determine the severity (Critical, Medium, Low).
              3. Detect specific objects or hazards (e.g., fire, weapons, car crash, injured persons).
              4. Identify the timing of the incident (when the main event occurs in the video).
              
              Return ONLY valid JSON:
              {
                "severity": "Critical | Medium | Low",
                "description": "detailed description of the incident",
                "detected_objects": ["obj1", "obj2"],
                "incident_time": "timestamp or relative time in video",
                "reasoning": "explanation for severity level"
              }`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            severity: { type: Type.STRING },
            description: { type: Type.STRING },
            detected_objects: { type: Type.ARRAY, items: { type: Type.STRING } },
            incident_time: { type: Type.STRING },
            reasoning: { type: Type.STRING }
          },
          required: ["severity", "description", "detected_objects", "incident_time", "reasoning"]
        }
      }
    });

    const result = JSON.parse(response.text);
    return {
      severity: result.severity as 'Critical' | 'Medium' | 'Low',
      description: result.description,
      detectedObjects: result.detected_objects,
      incidentTime: result.incident_time,
      reasoning: result.reasoning
    };
  } catch (err) {
    console.error("Video Analysis Error:", err);
    return {
      severity: "Medium" as const,
      description: "Video analysis failed.",
      detectedObjects: [],
      incidentTime: "Unknown",
      reasoning: "AI could not process the video data."
    };
  }
};

const detectSignFromFrame = async (base64Image: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            },
            {
              text: "Analyze this image. Is the person showing a 'Help' or 'SOS' sign in sign language? Respond with a JSON object: { 'isHelpSign': boolean, 'confidence': number, 'detectedSign': string }"
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isHelpSign: { type: Type.BOOLEAN },
            confidence: { type: Type.NUMBER },
            detectedSign: { type: Type.STRING }
          },
          required: ["isHelpSign", "confidence", "detectedSign"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (err) {
    console.error("Sign Language Detection Error:", err);
    return { isHelpSign: false, confidence: 0, detectedSign: "Error" };
  }
};

const generateFamilySMS = async (location: string, severity: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a short, urgent emergency SMS message for family members.
      Format: "Emergency alert triggered at ${location}. Severity: ${severity}. Please respond immediately."
      
      Return ONLY the message text following that exact format.`,
    });
    return response.text.trim();
  } catch (err) {
    console.error("SMS Generation Error:", err);
    return `Emergency alert triggered at ${location}. Severity: ${severity}. Please respond immediately.`;
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

const MapViewToggle = ({ mode, onModeChange }: { mode: 'Normal' | 'Emergency' | 'Traffic', onModeChange: (mode: 'Normal' | 'Emergency' | 'Traffic') => void }) => {
  return (
    <div className="flex bg-slate-900/80 backdrop-blur-md p-1 rounded-2xl border border-white/10 shadow-2xl">
      {[
        { id: 'Normal', label: 'Normal View', icon: LayoutDashboard },
        { id: 'Emergency', label: 'Emergency Mode', icon: AlertTriangle },
        { id: 'Traffic', label: 'Traffic Optimization', icon: Car }
      ].map((item) => (
        <button
          key={item.id}
          onClick={() => onModeChange(item.id as any)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            mode === item.id 
              ? "bg-brand-accent text-white shadow-lg" 
              : "text-slate-500 hover:text-slate-300"
          )}
        >
          <item.icon size={14} />
          <span className="hidden sm:inline">{item.label}</span>
        </button>
      ))}
    </div>
  );
};

const UserScreen = ({ onTrigger, onLocationUpdate, disasterMode, trafficSimulation, mapViewMode, onUpdateMapViewMode }: { 
  onTrigger: (data: any) => void, 
  onLocationUpdate: (location: string, fullAddress: string | null) => void,
  disasterMode: { active: boolean, type: string | null, timestamp: string | null },
  trafficSimulation: { active: boolean, showHeatmap: boolean, showReroutes: boolean, showAmbulance: boolean, accidentLocation: [number, number] },
  mapViewMode: 'Normal' | 'Emergency' | 'Traffic',
  onUpdateMapViewMode: (mode: 'Normal' | 'Emergency' | 'Traffic') => void
}) => {
  const [isListening, setIsListening] = useState(false);
  const [location, setLocation] = useState<string>("Locating...");
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [fullAddress, setFullAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("System Ready");
  
  // Family Contact System State
  const [familyContacts, setFamilyContacts] = useState<string[]>(() => {
    const saved = localStorage.getItem('family_contacts');
    return saved ? JSON.parse(saved) : ["", ""];
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [smsNotification, setSmsNotification] = useState<{ content: string, timestamp: string } | null>(null);

  useEffect(() => {
    localStorage.setItem('family_contacts', JSON.stringify(familyContacts));
  }, [familyContacts]);

  const handleContactChange = (index: number, value: string) => {
    const newContacts = [...familyContacts];
    newContacts[index] = value;
    setFamilyContacts(newContacts);
  };

  // Function to reverse geocode coordinates to a human-readable address
  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    // Throttle: Don't geocode more than once every 10 seconds
    const now = Date.now();
    if (now - lastGeocodeTimeRef.current < 10000 && lastGeocodeCoordsRef.current) {
      // If coordinates haven't changed much (4 decimal places ~11m), return last address
      const dLat = Math.abs(lat - lastGeocodeCoordsRef.current.lat);
      const dLon = Math.abs(lon - lastGeocodeCoordsRef.current.lon);
      if (dLat < 0.0001 && dLon < 0.0001 && fullAddress) {
        return fullAddress;
      }
    }

    try {
      const response = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn("Geocoding API returned error:", response.status, errorData);
        
        if (response.status === 429) {
          return fullAddress || "Address service busy (Rate limited)";
        }
        
        return fullAddress || `Address not found (${response.status})`;
      }

      const data = await response.json();
      if (data && data.display_name) {
        lastGeocodeTimeRef.current = Date.now();
        lastGeocodeCoordsRef.current = { lat, lon };
        return data.display_name;
      } else {
        return fullAddress || "Address not found";
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return fullAddress || "Error retrieving address";
    }
  };

  const [isTriggered, setIsTriggered] = useState(false);
  const [aiAdvisory, setAiAdvisory] = useState<string | null>(null);
  const [isReachedSafeZone, setIsReachedSafeZone] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [reliefAdvisory, setReliefAdvisory] = useState<string | null>(null);

  const nearestCamps = useMemo(() => {
    if (!coords) return [];
    return [...RELIEF_CAMPS]
      .map(camp => ({
        ...camp,
        distance: calculateDistance(coords[0], coords[1], camp.coords[0], camp.coords[1])
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  }, [coords]);

  const nearestAvailableCamp = useMemo(() => {
    return nearestCamps.find(c => c.available > 0) || nearestCamps[0];
  }, [nearestCamps]);

  const fetchAiAdvisory = async (type: string, loc: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a short, location-aware safety advisory for a ${type} in ${loc}. Keep it under 20 words. Focus on immediate action.`,
      });
      setAiAdvisory(response.text || null);
    } catch (error) {
      console.error("Error fetching AI advisory:", error);
      setAiAdvisory(null);
    }
  };

  const fetchReliefAdvisory = async (camp: any) => {
    if (!camp) return;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a short advisory for the nearest relief camp: ${camp.name}. It is ${camp.distance.toFixed(1)} km away with ${camp.available} beds available. Mention estimated arrival time (assume 50km/h). Keep it under 25 words.`,
      });
      setReliefAdvisory(response.text || null);
    } catch (error) {
      console.error("Error fetching relief advisory:", error);
      setReliefAdvisory(null);
    }
  };

  useEffect(() => {
    if (disasterMode.active && disasterMode.type && location) {
      fetchAiAdvisory(disasterMode.type, location);
      setIsReachedSafeZone(false);
      if (nearestAvailableCamp) {
        fetchReliefAdvisory(nearestAvailableCamp);
      }
    } else {
      setAiAdvisory(null);
      setReliefAdvisory(null);
    }
  }, [disasterMode.active, disasterMode.type, location, nearestAvailableCamp]);

  const DISASTER_INSTRUCTIONS: Record<string, { title: string, steps: string[], alert?: string, icon: any }> = {
    'Flood': {
      title: 'Flood Safety Guidelines',
      icon: Waves,
      steps: [
        'Move to higher ground immediately.',
        'Avoid walking or driving through floodwaters.',
        'Turn off electricity if safe to do so.',
        'Keep emergency kit ready.',
        'Follow highlighted green evacuation route.'
      ],
      alert: 'Low elevation zones marked in red.'
    },
    'Fire': {
      title: 'Fire Emergency Guidelines',
      icon: Flame,
      steps: [
        'Evacuate building immediately.',
        'Stay low to avoid smoke inhalation.',
        'Do not use elevators.',
        'Cover nose with cloth if smoke present.',
        'Move toward nearest safe exit route shown in green.'
      ],
      alert: 'Avoid red-marked high-risk fire zones.'
    },
    'Earthquake': {
      title: 'Earthquake Safety Guidelines',
      icon: Mountain,
      steps: [
        'Drop, Cover, and Hold On.',
        'Stay away from windows and heavy objects.',
        'After shaking stops, evacuate calmly.',
        'Avoid damaged roads marked in red.',
        'Proceed to nearest safe open area shown in green.'
      ],
      alert: 'Aftershocks possible. Stay alert.'
    },
    'Cyclone': {
      title: 'Cyclone / Storm Safety Guidelines',
      icon: Wind,
      steps: [
        'Stay indoors and away from windows.',
        'Secure loose objects around you.',
        'Avoid coastal and low-lying areas.',
        'Follow evacuation route if instructed.',
        'Keep emergency contacts informed.'
      ]
    },
    'Generic': {
      title: 'Emergency Preparedness Instructions',
      icon: AlertTriangle,
      steps: [
        'Stay calm.',
        'Follow evacuation route.',
        'Keep phone charged.',
        'Inform family contacts.',
        'Await further instructions.'
      ]
    }
  };

  const currentInstructions = disasterMode.active 
    ? (DISASTER_INSTRUCTIONS[disasterMode.type || 'Generic'] || DISASTER_INSTRUCTIONS['Generic'])
    : DISASTER_INSTRUCTIONS['Generic'];

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
  const [evacuationTimer, setEvacuationTimer] = useState(15); // 15 minutes default
  const videoRef = useRef<HTMLVideoElement>(null);
  const signLanguageStreamRef = useRef<MediaStream | null>(null);
  const signLanguageIntervalRef = useRef<number | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastGeocodeTimeRef = useRef<number>(0);
  const lastGeocodeCoordsRef = useRef<{lat: number, lon: number} | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;

      // Check if audio track exists
      const audioTracks = stream.getAudioTracks();
      console.log(`[Recording] Audio tracks: ${audioTracks.length}`, audioTracks[0]?.label);

      const options = { mimeType: 'video/webm;codecs=vp8,opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.warn(`${options.mimeType} is not supported, falling back to default`);
        delete (options as any).mimeType;
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      videoChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(videoChunksRef.current, { type: options.mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        // Trigger automatic download
        const a = document.createElement('a');
        a.href = url;
        a.download = `emergency_evidence_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setStatus("Analyzing video evidence...");
        const videoAnalysis = await analyzeVideoEmergency(blob);
        
        handleEmergency("Video Evidence Captured", videoAnalysis, url);
        
        stream.getTracks().forEach(track => track.stop());
        if (videoRef.current && !isDetectingSignLanguage) {
          videoRef.current.srcObject = null;
        }
      };

      recorder.start(1000); // Collect data every second
      setIsRecording(true);
      setStatus("Recording Video & Audio Evidence...");
      handleEmergency("Video SOS Signal Triggered (with Audio)");
    } catch (err) {
      console.error("Recording error:", err);
      setStatus("Camera/Mic access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatus("Evidence Saved.");
    }
  };

  const captureFrame = (): string | null => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      }
    }
    return null;
  };

  const startSignLanguageDetection = async () => {
    try {
      // Use front camera (user-facing)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      signLanguageStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsSignLanguageCameraOpen(true);
      setStatus("Detecting sign language (Front Camera)...");
      setIsDetectingSignLanguage(true);

      // Start detection loop
      signLanguageIntervalRef.current = window.setInterval(async () => {
        const frame = captureFrame();
        if (frame) {
          const result = await detectSignFromFrame(frame);
          if (result.isHelpSign && result.confidence > 0.7) {
            handleEmergency(`Sign Language SOS Detected: ${result.detectedSign}`);
            setStatus(`Sign Language SOS Sent: ${result.detectedSign}`);
            stopSignLanguageDetection();
          }
        }
      }, 3000); // Check every 3 seconds

    } catch (err) {
      console.error("Sign language camera error:", err);
      setStatus("Camera access denied for sign language detection.");
    }
  };

  const stopSignLanguageDetection = () => {
    if (signLanguageIntervalRef.current) {
      clearInterval(signLanguageIntervalRef.current);
      signLanguageIntervalRef.current = null;
    }
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
    const initialize = async () => {
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
          async (pos) => {
            const locString = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
            setLocation(locString);
            setCoords([pos.coords.latitude, pos.coords.longitude]);
            const address = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
            setFullAddress(address);
            onLocationUpdate(locString, address);
          },
          (err) => {
            console.error("Location error:", err);
            setLocation("Location Access Denied");
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      }
    };

    initialize();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [onLocationUpdate]);

  // Real Voice Recognition trigger
  const toggleVoiceTrigger = async () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (recognitionRef.current) {
        // Request a fresh location fix when starting voice capture
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(async (pos) => {
            const locString = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
            setLocation(locString);
            setCoords([pos.coords.latitude, pos.coords.longitude]);
            const address = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
            setFullAddress(address);
            onLocationUpdate(locString, address);
          });
        }
        recognitionRef.current.start();
      } else {
        setStatus("Voice recognition not supported in this browser.");
      }
    }
  };

  const handleEmergency = async (text?: string, videoAnalysis?: any, videoUrl?: string) => {
    setIsTriggered(true);
    setStatus("Analyzing situation with AI...");
    
    const finalTranscript = text || "Manual emergency button pressed.";
    setTranscript(finalTranscript);

    let classification;
    if (videoAnalysis) {
      classification = {
        severity: videoAnalysis.severity,
        confidence: "95%",
        keywords_detected: videoAnalysis.detectedObjects,
        reasoning: videoAnalysis.reasoning
      };
    } else {
      classification = await classifyUrgency(finalTranscript);
    }
    
    setAiResult(classification);
    
    // Notify Family
    if (familyContacts.some(c => c.trim() !== "")) {
      const smsContent = await generateFamilySMS(fullAddress || location, classification.severity);
      setSmsNotification({
        content: smsContent,
        timestamp: new Date().toLocaleTimeString()
      });
      setTimeout(() => setSmsNotification(null), 10000);
    }

    setStatus("Alert Sent. Dispatchers notified.");
    onTrigger({
      location,
      fullAddress,
      transcript: finalTranscript,
      urgency: classification.severity,
      aiReasoning: classification.reasoning,
      videoAnalysis: videoAnalysis,
      videoData: videoUrl
    });

    setTimeout(() => {
      setIsTriggered(false);
      // Keep AI result visible for a bit
    }, 8000);
  };

  useEffect(() => {
    if (disasterMode.active) {
      setEvacuationTimer(15);
      const interval = setInterval(() => {
        setEvacuationTimer(prev => Math.max(0, prev - 1));
      }, 60000); // Decrease every minute
      return () => clearInterval(interval);
    }
  }, [disasterMode.active]);

  const nearestSafeZone = useMemo(() => {
    if (!coords) return null;
    return SAFE_ZONES.reduce((prev, curr) => {
      const dPrev = Math.sqrt(Math.pow(prev.coords[0] - coords[0], 2) + Math.pow(prev.coords[1] - coords[1], 2));
      const dCurr = Math.sqrt(Math.pow(curr.coords[0] - coords[0], 2) + Math.pow(curr.coords[1] - coords[1], 2));
      return dCurr < dPrev ? curr : prev;
    });
  }, [coords]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] space-y-8 p-6 relative">
      {/* Disaster/Emergency Banner */}
      <AnimatePresence>
        {(disasterMode.active || mapViewMode === 'Emergency') && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[2000] bg-red-600 text-white py-4 px-8 shadow-2xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-red-500 animate-pulse opacity-50" />
            <div className="relative flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-3 mb-1">
                <AlertTriangle className="animate-bounce" size={24} />
                <h2 className="text-xl font-black uppercase tracking-tighter">
                  🚨 EMERGENCY ALERT ISSUED – {disasterMode.active ? disasterMode.type : 'CRITICAL INCIDENT'}
                </h2>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-90">
                {disasterMode.active ? 'Please follow evacuation instructions immediately.' : 'Emergency Response Active in your area.'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
        
        {/* Status Indicators */}
        <div className="flex justify-center gap-4 mt-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Helpline Ready</span>
          </div>
          {familyContacts.some(c => c.trim() !== "") && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Family Contacts Synced</span>
            </div>
          )}
        </div>
      </div>

      <div className="absolute top-6 right-6 z-50">
        <button 
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="p-3 bg-slate-900/50 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all"
        >
          <Settings size={20} />
        </button>
        
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-64 glass p-6 rounded-[2rem] border border-white/10 shadow-2xl"
            >
              <h3 className="text-xs font-black uppercase tracking-widest text-white mb-4">Family Contacts</h3>
              <div className="space-y-4">
                {familyContacts.map((contact, i) => (
                  <div key={i} className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-500 ml-2">Contact {i + 1}</label>
                    <input 
                      type="tel" 
                      value={contact}
                      onChange={(e) => handleContactChange(i, e.target.value)}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-brand-accent/50 transition-all"
                    />
                  </div>
                ))}
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-full py-2 bg-brand-accent text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  Save Contacts
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SMS Notification */}
      <AnimatePresence>
        {smsNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-sm z-[100] px-6"
          >
            <div className="glass p-4 rounded-3xl border border-emerald-500/30 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-500">
                    <CheckCircle2 size={14} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-500">Family Notified ✔</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">{smsNotification.timestamp}</span>
              </div>
              <div className="bg-slate-900/50 rounded-2xl p-3 border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare size={10} className="text-slate-500" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Simulated SMS Content</span>
                </div>
                <p className="text-[11px] text-slate-300 italic leading-relaxed">
                  "{smsNotification.content}"
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

          {isSignLanguageCameraOpen && (
            <div className="relative w-full max-w-sm h-60 bg-black rounded-xl overflow-hidden shadow-lg border border-white/10">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-lg font-bold pointer-events-none">
                {isDetectingSignLanguage ? "Detecting Sign..." : isRecording ? "Recording Evidence..." : "Camera Ready"}
              </div>
              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Live Recording</span>
                </div>
              )}
              <button 
                onClick={() => isDetectingSignLanguage ? stopSignLanguageDetection() : stopRecording()}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-all"
              >
                <XCircle size={20} />
              </button>
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

        {/* Helpline Buttons */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[320px]">
          <a 
            href="tel:112"
            className="flex flex-col items-center justify-center p-4 bg-slate-900/50 border border-white/5 rounded-3xl hover:bg-red-500/10 hover:border-red-500/20 transition-all group"
          >
            <Phone size={20} className="text-red-500 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">112</span>
            <span className="text-[8px] font-bold text-slate-500 uppercase">Emergency</span>
          </a>
          <a 
            href="tel:102"
            className="flex flex-col items-center justify-center p-4 bg-slate-900/50 border border-white/5 rounded-3xl hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all group"
          >
            <HeartPulse size={20} className="text-emerald-500 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">102</span>
            <span className="text-[8px] font-bold text-slate-500 uppercase">Ambulance</span>
          </a>
          <a 
            href="tel:100"
            className="flex flex-col items-center justify-center p-4 bg-slate-900/50 border border-white/5 rounded-3xl hover:bg-blue-500/10 hover:border-blue-500/20 transition-all group"
          >
            <Shield size={20} className="text-blue-500 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">100</span>
            <span className="text-[8px] font-bold text-slate-500 uppercase">Police</span>
          </a>
        </div>
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
          {/* Dynamic Disaster Instruction Panel */}
          <AnimatePresence>
            {disasterMode.active && !isReachedSafeZone && (
              <motion.div
                initial={{ height: 0, opacity: 0, y: 20 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: 20 }}
                className="overflow-hidden"
              >
                <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 mb-4 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-accent/20 flex items-center justify-center text-brand-accent">
                        <currentInstructions.icon size={24} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">
                          ⚠ Emergency Safety Instructions
                        </h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                          {disasterMode.type} Mode Active
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2 text-red-500 font-mono text-sm font-black">
                        <Timer size={16} />
                        <span>{evacuationTimer}m</span>
                      </div>
                      <p className="text-[8px] font-black text-slate-600 uppercase">Remaining</p>
                    </div>
                  </div>

                  {/* AI Advisory Box */}
                  {aiAdvisory && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-brand-accent/10 border border-brand-accent/20 rounded-2xl p-3 flex items-start gap-3"
                    >
                      <BrainCircuit size={16} className="text-brand-accent shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-brand-accent mb-1">AI Safety Advisory</p>
                        <p className="text-xs text-slate-200 italic leading-relaxed">"{aiAdvisory}"</p>
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-3">
                    <p className="text-xs font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">
                      {currentInstructions.title}
                    </p>
                    <div className="space-y-2.5">
                      {currentInstructions.steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-3 group">
                          <div className="w-5 h-5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:border-brand-accent/50 group-hover:text-brand-accent transition-all shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <p className="text-[11px] text-slate-300 font-medium leading-snug">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {currentInstructions.alert && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 flex items-center gap-2">
                      <Info size={14} className="text-red-500" />
                      <p className="text-[10px] font-bold text-red-400 uppercase tracking-tight">{currentInstructions.alert}</p>
                    </div>
                  )}

                  {/* Nearest Relief Camps Section */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <p className="text-xs font-black text-white uppercase tracking-widest">
                        Nearest Relief Camps
                      </p>
                      <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Live Tracking
                      </span>
                    </div>
                    
                    {reliefAdvisory && (
                      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 flex items-start gap-3">
                        <BrainCircuit size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-slate-300 italic leading-relaxed">"{reliefAdvisory}"</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-2">
                      {nearestCamps.map((camp) => (
                        <div key={camp.id} className={cn(
                          "p-3 rounded-2xl border transition-all flex items-center justify-between",
                          camp.available === 0 ? "bg-red-500/5 border-red-500/20" : "bg-white/5 border-white/10 hover:border-emerald-500/30"
                        )}>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Shield size={12} className={camp.available === 0 ? "text-red-500" : "text-emerald-500"} />
                              <span className="text-[11px] font-black text-white uppercase tracking-tight">{camp.name}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[9px] font-bold text-slate-500 uppercase">
                              <span>{camp.distance.toFixed(1)} km</span>
                              <span>•</span>
                              <span className={camp.available === 0 ? "text-red-400" : "text-emerald-400"}>
                                {camp.available === 0 ? 'FULL' : `${camp.available} beds available`}
                              </span>
                              <span>•</span>
                              <span>~{Math.round(camp.distance * 1.2)} mins</span>
                            </div>
                          </div>
                          <a 
                            href={`tel:${camp.contact}`}
                            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                          >
                            <Phone size={14} />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expandable Sections */}
                  <div className="space-y-2 pt-2">
                    {[
                      { id: 'kit', label: 'Emergency Kit Checklist', icon: Shield, content: ['Water (3L/day)', 'Non-perishable Food', 'First Aid Kit', 'Flashlight & Batteries', 'Whistle', 'Face Mask', 'Offline Map', 'Power Bank'] },
                      { id: 'zones', label: 'Nearby Safe Zones', icon: MapPin, content: SAFE_ZONES.map(sz => `${sz.name} (${sz.type})`) },
                      { id: 'helplines', label: 'Emergency Helplines', icon: Phone, content: ['112 - All-in-one Emergency', '100 - Police', '101 - Fire', '102 - Ambulance', '108 - Disaster Management'] }
                    ].map((section) => (
                      <div key={section.id} className="border border-white/5 rounded-2xl overflow-hidden">
                        <button 
                          onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                          className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-all"
                        >
                          <div className="flex items-center gap-2 text-slate-400">
                            <section.icon size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{section.label}</span>
                          </div>
                          {expandedSection === section.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        <AnimatePresence>
                          {expandedSection === section.id && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="overflow-hidden bg-black/20"
                            >
                              <div className="p-3 grid grid-cols-1 gap-1.5">
                                {section.content.map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-brand-accent" />
                                    <span className="text-[10px] text-slate-400">{item}</span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => setIsReachedSafeZone(true)}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-900/20 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    I Have Reached Safe Zone
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isReachedSafeZone && disasterMode.active && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 mb-4 text-center space-y-2"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 mx-auto mb-2">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">You are Safe</h3>
              <p className="text-xs text-slate-400">Status updated. Emergency services have been notified of your safety.</p>
              <button 
                onClick={() => setIsReachedSafeZone(false)}
                className="text-[10px] font-black uppercase tracking-widest text-emerald-500 underline mt-2"
              >
                View Instructions Again
              </button>
            </motion.div>
          )}

          <div className="h-64 rounded-xl overflow-hidden relative border border-white/5">
            <div className="absolute top-4 right-4 z-[1000]">
              <MapViewToggle mode={mapViewMode} onModeChange={onUpdateMapViewMode} />
            </div>
            
            <div className="absolute bottom-4 left-4 z-[1000] glass px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                mapViewMode === 'Emergency' ? "bg-red-500" : mapViewMode === 'Traffic' ? "bg-emerald-500" : "bg-blue-500"
              )} />
              <span className="text-[8px] font-black uppercase tracking-widest text-white">
                Mode: {mapViewMode === 'Normal' ? 'Normal Monitoring' : mapViewMode === 'Emergency' ? 'Emergency Response Active' : 'AI Traffic Optimization Active'}
              </span>
            </div>

            {coords ? (
              <MapContainer 
                center={coords} 
                zoom={mapViewMode !== 'Normal' ? 16 : 15} 
                style={{ height: '100%', width: '100%', filter: mapViewMode === 'Emergency' ? 'grayscale(0.5) brightness(0.8)' : 'none' }}
                zoomControl={false}
                dragging={mapViewMode === 'Normal'}
                scrollWheelZoom={false}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <Marker position={coords} icon={UserPinIcon} />

                {/* Normal View Elements */}
                {mapViewMode === 'Normal' && (
                  <>
                    {/* Just user markers and standard alerts */}
                  </>
                )}

                {/* Emergency Mode Elements */}
                {mapViewMode === 'Emergency' && (
                  <>
                    {/* Accident Hotspot */}
                    <Marker position={trafficSimulation.accidentLocation} icon={AccidentIcon}>
                      <Circle 
                        center={trafficSimulation.accidentLocation} 
                        radius={300} 
                        pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.1, className: 'emergency-pulse' }} 
                      />
                    </Marker>

                    {/* Relief Camps */}
                    {RELIEF_CAMPS.map(camp => {
                      const isNearest = camp.id === nearestAvailableCamp?.id;
                      const isFull = camp.available === 0;
                      return (
                        <Marker 
                          key={camp.id} 
                          position={camp.coords} 
                          icon={isFull ? ReliefCampFullIcon : ReliefCampIcon}
                        >
                          <Tooltip direction="top" permanent={isNearest}>
                            <div className="p-1">
                              <p className="font-bold text-[8px] uppercase">{camp.name}</p>
                              <p className="text-[7px] text-slate-500">{camp.type} • {isFull ? 'FULL' : `${camp.available} beds`}</p>
                            </div>
                          </Tooltip>
                          <Popup>
                            <div className="p-2 space-y-2 min-w-[150px]">
                              <h4 className="font-black text-[10px] uppercase text-slate-800">{camp.name}</h4>
                              <div className="space-y-1 text-[9px]">
                                <p className="flex justify-between"><span className="text-slate-500">Type:</span> <span className="font-bold">{camp.type}</span></p>
                                {coords && (
                                  <p className="flex justify-between"><span className="text-slate-500">Distance:</span> <span className="font-bold">{calculateDistance(coords[0], coords[1], camp.coords[0], camp.coords[1]).toFixed(1)} km</span></p>
                                )}
                                <p className="flex justify-between"><span className="text-slate-500">Availability:</span> <span className={cn("font-bold", isFull ? "text-red-500" : "text-emerald-500")}>{camp.available}/{camp.capacity}</span></p>
                                <p className="flex justify-between"><span className="text-slate-500">Contact:</span> <span className="font-bold">{camp.contact}</span></p>
                              </div>
                              <button className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest rounded transition-colors">
                                Navigate to Camp
                              </button>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}

                    {/* Evacuation Route to nearest available camp */}
                    {disasterMode.active && nearestAvailableCamp && (
                      <Polyline 
                        positions={[coords, nearestAvailableCamp.coords]} 
                        pathOptions={{ 
                          color: '#10b981', 
                          weight: 6, 
                          opacity: 0.8,
                          dashArray: '10, 10',
                          className: 'evacuation-route-pulse'
                        }} 
                      />
                    )}
                  </>
                )}

                {/* Traffic Optimization Mode Elements */}
                {mapViewMode === 'Traffic' && (
                  <>
                    {/* Traffic Heatmap */}
                    {TRAFFIC_ROADS.map(road => (
                      <Polyline 
                        key={road.id}
                        positions={road.coords}
                        pathOptions={{ 
                          color: road.congestion === 'Heavy' ? '#ef4444' : road.congestion === 'Moderate' ? '#f97316' : '#22c55e',
                          weight: 8,
                          opacity: 0.6,
                          className: road.congestion === 'Smooth' ? 'traffic-flow' : 'traffic-pulse'
                        }}
                      />
                    ))}

                    {/* AI Reroutes */}
                    {REROUTE_PATHS.map(path => (
                      <Polyline 
                        key={path.id}
                        positions={path.coords}
                        pathOptions={{ color: '#10b981', weight: 6, dashArray: '10, 10', className: 'reroute-glow' }} 
                      />
                    ))}

                    {/* Ambulance Corridor */}
                    {trafficSimulation.active && (
                      <Polyline 
                        positions={AMBULANCE_PATH}
                        pathOptions={{ color: '#10b981', weight: 12, opacity: 0.2 }}
                      />
                    )}
                  </>
                )}

                {/* Original Disaster Simulation Map Elements (Legacy support) */}
                {disasterMode.active && mapViewMode === 'Normal' && (
                  <>
                    {/* ... existing disaster logic if needed ... */}
                  </>
                )}

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
  onResolve,
  disasterMode,
  onActivateDisaster,
  onDeactivateDisaster,
  trafficSimulation,
  onUpdateTrafficSim,
  mapViewMode,
  onUpdateMapViewMode
}: { 
  alerts: Alert[], 
  history: Alert[], 
  activeUsers: Record<string, { location: string, fullAddress?: string | null, lastSeen: string }>,
  onAccept: (id: string) => void, 
  onReject: (id: string) => void,
  onResolve: (id: string) => void,
  disasterMode: { active: boolean, type: string | null, timestamp: string | null },
  onActivateDisaster: (type: string) => void,
  onDeactivateDisaster: () => void,
  trafficSimulation: { 
    active: boolean, 
    showHeatmap: boolean, 
    showReroutes: boolean, 
    showAmbulance: boolean,
    accidentLocation: [number, number]
  },
  onUpdateTrafficSim: (payload: any) => void,
  mapViewMode: 'Normal' | 'Emergency' | 'Traffic',
  onUpdateMapViewMode: (mode: 'Normal' | 'Emergency' | 'Traffic') => void
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

  const CustomZoomControl = () => {
    const map = useMap();
    return (
      <div className="absolute top-4 right-4 z-[2000] flex flex-col gap-2 pointer-events-none">
        <button 
          onClick={() => map.zoomIn()}
          className="w-10 h-10 bg-slate-900/90 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center text-white hover:bg-brand-accent transition-all shadow-2xl cursor-pointer pointer-events-auto"
          title="Zoom In"
        >
          <ZoomIn size={20} strokeWidth={3} />
        </button>
        <button 
          onClick={() => map.zoomOut()}
          className="w-10 h-10 bg-slate-900/90 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center text-white hover:bg-brand-accent transition-all shadow-2xl cursor-pointer pointer-events-auto"
          title="Zoom Out"
        >
          <ZoomOut size={20} strokeWidth={3} />
        </button>
      </div>
    );
  };

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [ambulancePosIndex, setAmbulancePosIndex] = useState(0);
  const [dynamicCongestion, setDynamicCongestion] = useState(28);

  useEffect(() => {
    if (mapViewMode === 'Traffic') {
      const interval = setInterval(() => {
        setDynamicCongestion(prev => {
          const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
          return Math.min(45, Math.max(15, prev + change));
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [mapViewMode]);

  useEffect(() => {
    if (trafficSimulation.active && trafficSimulation.showAmbulance) {
      const interval = setInterval(() => {
        setAmbulancePosIndex(prev => (prev + 1) % AMBULANCE_PATH.length);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [trafficSimulation.active, trafficSimulation.showAmbulance]);
  const [severityFilter, setSeverityFilter] = useState<Alert['status'] | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Accepted' | 'Pending'>('All');
  const [showTraffic, setShowTraffic] = useState(false);
  const [highlightedAlertId, setHighlightedAlertId] = useState<string | null>(null);

  // Logic to highlight new alerts for 3 seconds
  useEffect(() => {
    if (alerts.length > 0) {
      const latest = alerts[0];
      const isRecent = (Date.now() - new Date(latest.timestamp).getTime()) < 3000;
      if (isRecent) {
        setHighlightedAlertId(latest.id);
        const timer = setTimeout(() => setHighlightedAlertId(null), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [alerts]);

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
          {disasterMode.active && (
            <div className="glass px-6 py-3 rounded-2xl flex items-center gap-4 border-l-4 border-l-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600 animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-red-600 font-black">Disaster Active</p>
                <p className="text-xl font-black text-white">{disasterMode.type}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Disaster & Traffic Simulation Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-slate-400">
              <Radio size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Disaster Simulation</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {[
              { type: 'Flood', icon: Waves, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { type: 'Fire', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10' },
              { type: 'Earthquake', icon: Mountain, color: 'text-amber-500', bg: 'bg-amber-500/10' },
              { type: 'Cyclone', icon: Wind, color: 'text-cyan-500', bg: 'bg-cyan-500/10' }
            ].map((d) => (
              <button
                key={d.type}
                onClick={() => onActivateDisaster(d.type)}
                disabled={disasterMode.active || trafficSimulation.active}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border transition-all",
                  disasterMode.type === d.type 
                    ? "bg-red-600 border-red-500 text-white" 
                    : "bg-slate-900/50 border-white/5 text-slate-400 hover:border-white/20 disabled:opacity-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", d.bg, d.color)}>
                    <d.icon size={16} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">{d.type} Mode</span>
                </div>
                {!disasterMode.active && <Plus size={14} />}
              </button>
            ))}
            {disasterMode.active && (
              <button
                onClick={onDeactivateDisaster}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all"
              >
                Deactivate Disaster
              </button>
            )}
          </div>
        </div>

        <div className="glass p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-slate-400">
              <Car size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Traffic AI Simulation</span>
            </div>
            <button 
              onClick={() => onUpdateTrafficSim({ active: !trafficSimulation.active })}
              className={cn(
                "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all",
                trafficSimulation.active ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-500"
              )}
            >
              {trafficSimulation.active ? 'Active' : 'Offline'}
            </button>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={() => onUpdateTrafficSim({ active: !trafficSimulation.active })}
              className={cn(
                "w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2",
                trafficSimulation.active 
                  ? "bg-emerald-600 border-emerald-500 text-white" 
                  : "bg-slate-900/50 border-white/5 text-slate-400 hover:border-white/20"
              )}
            >
              <Zap size={14} />
              {trafficSimulation.active ? 'Simulation Running' : 'Activate Traffic AI'}
            </button>

            {trafficSimulation.active && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                {[
                  { label: 'Heatmap', key: 'showHeatmap' },
                  { label: 'Reroutes', key: 'showReroutes' },
                  { label: 'Ambulance', key: 'showAmbulance' }
                ].map((ctrl) => (
                  <button
                    key={ctrl.key}
                    onClick={() => onUpdateTrafficSim({ [ctrl.key]: !trafficSimulation[ctrl.key as keyof typeof trafficSimulation] })}
                    className={cn(
                      "py-2 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all",
                      trafficSimulation[ctrl.key as keyof typeof trafficSimulation]
                        ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                        : "bg-slate-900/50 border-white/5 text-slate-600"
                    )}
                  >
                    {ctrl.label}
                  </button>
                ))}
                <button
                  onClick={() => onUpdateTrafficSim({ active: false })}
                  className="py-2 rounded-lg text-[8px] font-black uppercase tracking-widest border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="glass p-6 rounded-3xl flex flex-col justify-center relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black mb-1">Impact Analytics</p>
            {mapViewMode === 'Traffic' || trafficSimulation.active ? (
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-2xl font-black text-white">{mapViewMode === 'Traffic' ? `${dynamicCongestion}%` : '+18m'}</p>
                    <p className={cn("text-[8px] font-bold uppercase", mapViewMode === 'Traffic' ? "text-emerald-500" : "text-red-500")}>
                      {mapViewMode === 'Traffic' ? 'Avg Congestion' : 'Est. Delay Time'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-white">{mapViewMode === 'Traffic' ? `${(dynamicCongestion * 0.4).toFixed(1)}m` : '142'}</p>
                    <p className="text-[8px] font-bold text-slate-500 uppercase">
                      {mapViewMode === 'Traffic' ? 'Delay Reduction' : 'Vehicles Impacted'}
                    </p>
                  </div>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: mapViewMode === 'Traffic' ? `${dynamicCongestion}%` : '75%' }}
                    className={cn("h-full", mapViewMode === 'Traffic' ? "bg-emerald-500" : "bg-brand-accent")}
                  />
                </div>
                <p className="text-[9px] text-slate-400 leading-tight">
                  <span className="text-emerald-500 font-bold">AI Status:</span> {mapViewMode === 'Traffic' ? 'Optimization active. Flow improved by 14%.' : '3 alternate routes identified. Priority corridor established.'}
                </p>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-4xl font-black text-slate-800">--</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-600 mt-2">Simulation Inactive</p>
              </div>
            )}
          </div>
        </div>

        <div className="glass p-6 rounded-3xl flex flex-col justify-center">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black mb-1">Efficiency Metrics</p>
          {mapViewMode === 'Traffic' || trafficSimulation.active ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xl font-black text-emerald-500">{mapViewMode === 'Traffic' ? '84' : '-24%'}</p>
                <p className="text-[8px] font-bold text-slate-500 uppercase">{mapViewMode === 'Traffic' ? 'Vehicles Rerouted' : 'Response Time'}</p>
              </div>
              <div>
                <p className="text-xl font-black text-emerald-500">{mapViewMode === 'Traffic' ? '18.2L' : '12.5L'}</p>
                <p className="text-[8px] font-bold text-slate-500 uppercase">Fuel Saved</p>
              </div>
              <div>
                <p className="text-xl font-black text-emerald-500">{mapViewMode === 'Traffic' ? '45kg' : '32kg'}</p>
                <p className="text-[8px] font-bold text-slate-500 uppercase">CO2 Reduced</p>
              </div>
              <div>
                <p className="text-xl font-black text-emerald-500">{mapViewMode === 'Traffic' ? '-52%' : '-40%'}</p>
                <p className="text-[8px] font-bold text-slate-500 uppercase">Congestion</p>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <Shield size={32} className="mx-auto text-slate-800 mb-2" />
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Monitoring Active</p>
            </div>
          )}
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
                      highlightedAlertId === alert.id ? "ring-2 ring-brand-accent shadow-[0_0_20px_rgba(255,59,48,0.4)]" : "",
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
                      <div className="flex flex-col gap-1 text-sm text-slate-400">
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-brand-accent shrink-0" />
                          <span className="truncate">{alert.fullAddress || alert.location}</span>
                        </div>
                        {alert.fullAddress && (
                          <span className="text-[10px] text-slate-500 ml-5 leading-tight">{alert.location}</span>
                        )}
                      </div>
                    </div>

                    {alert.videoAnalysis && (
                      <div className="mb-4 p-3 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-accent">
                          <BrainCircuit size={12} />
                          AI Video Analysis
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{alert.videoAnalysis.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {alert.videoAnalysis.detectedObjects.map((obj, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-slate-800 rounded text-[8px] font-bold text-slate-400 uppercase">
                              {obj}
                            </span>
                          ))}
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-white/5">
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Incident Time</span>
                          <span className="text-[9px] font-mono text-brand-accent">{alert.videoAnalysis.incidentTime}</span>
                        </div>
                      </div>
                    )}

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
            <div className="absolute top-6 right-6 z-[1000]">
              <MapViewToggle mode={mapViewMode} onModeChange={onUpdateMapViewMode} />
            </div>

            <div className="absolute bottom-6 left-6 z-[1000] glass px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3">
              <div className={cn(
                "w-2.5 h-2.5 rounded-full animate-pulse",
                mapViewMode === 'Emergency' ? "bg-red-500" : mapViewMode === 'Traffic' ? "bg-emerald-500" : "bg-blue-500"
              )} />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-white">
                  {mapViewMode === 'Normal' ? 'Normal Monitoring' : mapViewMode === 'Emergency' ? 'Emergency Response Active' : 'AI Traffic Optimization Active'}
                </span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">
                  System Status: Operational
                </span>
              </div>
            </div>

            <MapContainer 
              center={[20.5937, 78.9629]} 
              zoom={5} 
              style={{ height: '100%', width: '100%', filter: mapViewMode === 'Emergency' ? 'grayscale(0.5) brightness(0.8)' : 'none' }}
              zoomControl={false}
              key={JSON.stringify(alerts.map(a => a.id + a.location)) + JSON.stringify(Object.keys(activeUsers).map(u => u + activeUsers[u].location))}
            >
              {alertCoords && <MapUpdater coords={alertCoords} zoom={12} />}
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />

              {/* Normal View Elements */}
              {mapViewMode === 'Normal' && (
                <>
                  {/* Standard markers handled by MarkerClusterGroup below */}
                </>
              )}

              {/* Emergency Mode Elements */}
              {mapViewMode === 'Emergency' && (
                <>
                  {/* Accident Hotspot */}
                  <Marker position={trafficSimulation.accidentLocation} icon={AccidentIcon}>
                    <Circle 
                      center={trafficSimulation.accidentLocation} 
                      radius={500} 
                      pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.1, className: 'emergency-pulse' }} 
                    />
                  </Marker>
                  
                  {/* Relief Camps */}
                  {RELIEF_CAMPS.map(camp => (
                    <Marker 
                      key={camp.id} 
                      position={camp.coords} 
                      icon={camp.available === 0 ? ReliefCampFullIcon : ReliefCampIcon}
                    >
                      <Tooltip direction="top">
                        <div className="p-1">
                          <p className="font-bold text-[8px] uppercase">{camp.name}</p>
                          <p className="text-[7px] text-slate-500">{camp.type} • {camp.available === 0 ? 'FULL' : `${camp.available} beds`}</p>
                        </div>
                      </Tooltip>
                    </Marker>
                  ))}
                </>
              )}

              {/* Traffic Optimization Mode Elements */}
              {mapViewMode === 'Traffic' && (
                <>
                  {/* Traffic Heatmap */}
                  {TRAFFIC_ROADS.map(road => (
                    <Polyline 
                      key={road.id}
                      positions={road.coords}
                      pathOptions={{ 
                        color: road.congestion === 'Heavy' ? '#ef4444' : road.congestion === 'Moderate' ? '#f97316' : '#22c55e',
                        weight: 10,
                        opacity: 0.6,
                        className: road.congestion === 'Smooth' ? 'traffic-flow' : 'traffic-pulse'
                      }}
                    />
                  ))}

                  {/* AI Reroutes */}
                  {REROUTE_PATHS.map(path => (
                    <Polyline 
                      key={path.id}
                      positions={path.coords}
                      pathOptions={{ color: '#10b981', weight: 8, dashArray: '10, 10', className: 'reroute-glow' }} 
                    />
                  ))}

                  {/* Ambulance Simulation */}
                  {trafficSimulation.showAmbulance && (
                    <Marker position={AMBULANCE_PATH[ambulancePosIndex]} icon={AmbulanceIcon} />
                  )}
                </>
              )}

              {/* Single Focused Pointer for Selected Alert */}
              {selectedAlert && alertCoords && (
                <Marker position={alertCoords} icon={HighlightedIcon} zIndexOffset={2000}>
                  <Tooltip permanent={false} direction="top" offset={[0, -40]} opacity={1}>
                    <div className="p-3 glass rounded-2xl border border-white/10 min-w-[200px] shadow-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Emergency Focus</span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-[8px] uppercase tracking-tighter text-slate-500 font-bold">User ID</p>
                          <p className="text-xs font-black text-white">{selectedAlert.userId}</p>
                        </div>
                        <div>
                          <p className="text-[8px] uppercase tracking-tighter text-slate-500 font-bold">Address</p>
                          <p className="text-[10px] font-medium text-slate-200 leading-tight">{selectedAlert.fullAddress || 'Resolving...'}</p>
                        </div>
                        <div className="flex justify-between gap-4">
                          <div>
                            <p className="text-[8px] uppercase tracking-tighter text-slate-500 font-bold">Coordinates</p>
                            <p className="text-[9px] font-mono text-slate-400">{selectedAlert.location}</p>
                          </div>
                          <div>
                            <p className="text-[8px] uppercase tracking-tighter text-slate-500 font-bold">Last Seen</p>
                            <p className="text-[9px] font-mono text-slate-400">{new Date(selectedAlert.timestamp).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Tooltip>
                  <Popup>
                    <div className="p-2">
                      <p className="font-bold text-red-500 mb-1">Critical Alert</p>
                      <p className="text-xs text-slate-600 mb-2">{selectedAlert.transcript}</p>
                      {selectedAlert.videoData && (
                        <a href={selectedAlert.videoData} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-xs underline">View Video Evidence</a>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}

              {showTraffic && (
                <TileLayer
                  url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
                  opacity={0.4}
                  attribution='&copy; Traffic Data via OSM Transport'
                />
              )}

              {/* Traffic Simulation Map Elements */}
              {trafficSimulation.active && (
                <>
                  {/* Accident Hotspot */}
                  <Marker position={trafficSimulation.accidentLocation} icon={AccidentIcon}>
                    <Tooltip permanent direction="top" offset={[0, -40]}>
                      <div className="px-2 py-1 bg-red-600 text-white text-[8px] font-black uppercase tracking-widest rounded shadow-xl">
                        Accident Hotspot Detected
                      </div>
                    </Tooltip>
                  </Marker>

                  {/* Traffic Heatmap Simulation */}
                  {trafficSimulation.showHeatmap && (
                    <>
                      <Circle 
                        center={trafficSimulation.accidentLocation} 
                        radius={500} 
                        pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.3, weight: 0 }} 
                      />
                      <Circle 
                        center={trafficSimulation.accidentLocation} 
                        radius={1000} 
                        pathOptions={{ color: 'orange', fillColor: 'orange', fillOpacity: 0.2, weight: 0 }} 
                      />
                      <Circle 
                        center={trafficSimulation.accidentLocation} 
                        radius={1500} 
                        pathOptions={{ color: 'yellow', fillColor: 'yellow', fillOpacity: 0.1, weight: 0 }} 
                      />
                    </>
                  )}

                  {/* Road Network */}
                  {TRAFFIC_ROADS.map(road => (
                    <Polyline 
                      key={road.id}
                      positions={road.coords}
                      pathOptions={{ 
                        color: road.congestion === 'Heavy' ? '#ef4444' : road.congestion === 'Moderate' ? '#f97316' : '#22c55e',
                        weight: road.congestion === 'Heavy' ? 8 : 4,
                        className: road.congestion === 'Heavy' ? 'traffic-pulse' : ''
                      }}
                    >
                      <Tooltip sticky>
                        <div className="text-[8px] font-bold uppercase">{road.name} - {road.congestion} Traffic</div>
                      </Tooltip>
                    </Polyline>
                  ))}

                  {/* AI Optimized Reroutes */}
                  {trafficSimulation.showReroutes && REROUTE_PATHS.map(path => (
                    <Polyline 
                      key={path.id}
                      positions={path.coords}
                      pathOptions={{ 
                        color: '#10b981', 
                        weight: 6, 
                        dashArray: '10, 10',
                        className: 'reroute-glow'
                      }}
                    >
                      <Tooltip sticky>
                        <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">AI Optimized Route</div>
                      </Tooltip>
                    </Polyline>
                  ))}

                  {/* Ambulance Simulation */}
                  {trafficSimulation.showAmbulance && (
                    <motion.div>
                      <Marker 
                        position={AMBULANCE_PATH[ambulancePosIndex]} 
                        icon={AmbulanceIcon}
                      >
                        <Tooltip permanent direction="right" offset={[20, 0]}>
                          <div className="px-2 py-1 bg-emerald-600 text-white text-[8px] font-black uppercase tracking-widest rounded shadow-xl flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            Emergency Vehicle – Priority Lane Active
                          </div>
                        </Tooltip>
                      </Marker>
                      {/* Priority Corridor */}
                      <Polyline 
                        positions={AMBULANCE_PATH}
                        pathOptions={{ color: '#10b981', weight: 12, opacity: 0.2 }}
                      />
                    </motion.div>
                  )}
                </>
              )}

              {/* Disaster Visualization Heatmap */}
              {disasterMode.active && DANGER_ZONES.map(dz => (
                <React.Fragment key={dz.id}>
                  <Circle 
                    center={dz.coords} 
                    radius={dz.radius * 2} 
                    pathOptions={{ 
                      color: 'transparent', 
                      fillColor: 'red', 
                      fillOpacity: 0.1 
                    }} 
                  />
                  <Circle 
                    center={dz.coords} 
                    radius={dz.radius} 
                    pathOptions={{ 
                      color: 'red', 
                      fillColor: 'red', 
                      fillOpacity: 0.2,
                      weight: 1,
                      className: 'danger-zone-pulse'
                    }} 
                  />
                </React.Fragment>
              ))}

              {/* Safe Zones */}
              {disasterMode.active && SAFE_ZONES.map(sz => (
                <Marker key={sz.id} position={sz.coords} icon={SafeZoneIcon}>
                  <Tooltip direction="top">
                    <div className="text-[10px] font-black uppercase tracking-widest">{sz.name}</div>
                  </Tooltip>
                </Marker>
              ))}

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
                      <Tooltip direction="top" offset={[0, -10]}>
                        <div className="p-1 font-bold">User: {uid}</div>
                      </Tooltip>
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
                  const isCritical = alert.status === 'Critical';
                  
                  let icon = DefaultIcon;
                  if (isSelected) {
                    icon = HighlightedIcon;
                  } else if (isCritical) {
                    icon = CriticalIcon;
                  }

                  return (
                    <Marker 
                      key={alert.id} 
                      position={[parts[0], parts[1]]}
                      icon={icon}
                      zIndexOffset={isSelected ? 1000 : (isCritical ? 500 : 0)}
                      eventHandlers={{
                        click: () => setSelectedAlert(alert)
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -20]}>
                        <div className="p-2 space-y-1">
                          <div className="font-black text-red-500 text-[10px]">USER ID: {alert.userId}</div>
                          <div className="text-[9px] font-bold">ADDRESS: {alert.fullAddress || alert.location}</div>
                          <div className="text-[9px] font-mono text-slate-500">COORDS: {alert.location}</div>
                          <div className="text-[9px] text-slate-500">TIME: {new Date(alert.timestamp).toLocaleTimeString()}</div>
                        </div>
                      </Tooltip>
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
              <CustomZoomControl />
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
  const [activeUsers, setActiveUsers] = useState<Record<string, { location: string, fullAddress?: string | null, lastSeen: string }>>({});
  const [newAlertNotification, setNewAlertNotification] = useState<Alert | null>(null);
  const [disasterMode, setDisasterMode] = useState<{ active: boolean, type: string | null, timestamp: string | null }>({ active: false, type: null, timestamp: null });
  const [trafficSimulation, setTrafficSimulation] = useState<{ 
    active: boolean, 
    showHeatmap: boolean, 
    showReroutes: boolean, 
    showAmbulance: boolean,
    accidentLocation: [number, number]
  }>({ 
    active: false, 
    showHeatmap: true, 
    showReroutes: true, 
    showAmbulance: true,
    accidentLocation: [12.9750, 77.5900]
  });
  const [mapViewMode, setMapViewMode] = useState<'Normal' | 'Emergency' | 'Traffic'>('Normal');
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
        if (message.payload.disasterMode) setDisasterMode(message.payload.disasterMode);
        if (message.payload.trafficSimulation) setTrafficSimulation(message.payload.trafficSimulation);
        if (message.payload.mapViewMode) setMapViewMode(message.payload.mapViewMode);
      } else if (message.type === 'ALERT_CREATED') {
        setAlerts(prev => [message.payload, ...prev]);
      } else if (message.type === 'ALERT_UPDATED') {
        setAlerts(prev => prev.map(a => a.id === message.payload.id ? message.payload : a));
      } else if (message.type === 'ALERT_RESOLVED') {
        const { alertId, resolvedAlert } = message.payload;
        setAlerts(prev => prev.filter(a => a.id !== alertId));
        setHistory(prev => [resolvedAlert, ...prev]);
      } else if (message.type === 'USER_LOCATION_UPDATED') {
        const { userId, location, fullAddress, activeUsers: updatedUsers } = message.payload;
        setAlerts(prev => prev.map(a => a.userId === userId ? { ...a, location, fullAddress } : a));
        if (updatedUsers) setActiveUsers(updatedUsers);
      } else if (message.type === 'DISASTER_ACTIVATED') {
        setDisasterMode(message.payload);
      } else if (message.type === 'DISASTER_DEACTIVATED') {
        setDisasterMode(message.payload);
      } else if (message.type === 'TRAFFIC_SIM_UPDATED') {
        setTrafficSimulation(message.payload);
      } else if (message.type === 'MAP_VIEW_MODE_UPDATED') {
        setMapViewMode(message.payload);
      }
    };

    return () => socket.close();
  }, []);

  const [userId] = useState(() => 'User_' + Math.floor(Math.random() * 1000));

  // --- Shared Global State Simulation Logic ---
  // This logic allows the User and Admin panels to communicate in real-time
  // within the same application instance without needing a backend.

  const triggerAlert = (data: any) => {
    const newAlert: Alert = {
      id: 'Alert_' + Date.now(),
      timestamp: new Date().toISOString(),
      status: data.urgency || 'Critical',
      location: data.location,
      fullAddress: data.fullAddress,
      userId: userId,
      transcript: data.transcript,
      aiReasoning: data.aiReasoning,
      accepted: false,
      videoData: data.videoData,
      videoAnalysis: data.videoAnalysis
    };

    // Update local state directly for instant simulation
    setAlerts(prev => [newAlert, ...prev]);

    // Also send via WebSocket if connected
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'NEW_ALERT',
        payload: { 
          location: data.location, 
          fullAddress: data.fullAddress,
          userId: userId,
          transcript: data.transcript,
          urgency: data.urgency,
          aiReasoning: data.aiReasoning,
          videoData: data.videoData,
          videoAnalysis: data.videoAnalysis
        }
      }));
    }
  };

  const updateAlertVideo = (alertId: string, videoData: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, videoData } : a));

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'UPDATE_ALERT_VIDEO',
        payload: { id: alertId, videoData }
      }));
    }
  };

  const updateLocation = (location: string, fullAddress: string | null) => {
    // Update local active users state
    setActiveUsers(prev => ({
      ...prev,
      [userId]: { location, fullAddress, lastSeen: new Date().toISOString() }
    }));

    // Update any active alerts for this user locally
    setAlerts(prev => prev.map(a => a.userId === userId ? { ...a, location, fullAddress } : a));

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'LOCATION_UPDATE',
        payload: { userId, location, fullAddress }
      }));
    }
  };

  const acceptAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, accepted: true, acceptedAt: new Date().toISOString() } : a));

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'ACCEPT_ALERT', payload: { id } }));
    }
  };

  const rejectAlert = (id: string) => {
    const alertToReject = alerts.find(a => a.id === id);
    if (alertToReject) {
      const rejectedAlert: Alert = {
        ...alertToReject,
        resolved: true,
        resolvedAt: new Date().toISOString(),
        resolutionType: 'Rejected'
      };
      setAlerts(prev => prev.filter(a => a.id !== id));
      setHistory(prev => [rejectedAlert, ...prev]);
    }

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'REJECT_ALERT', payload: { id } }));
    }
  };

  const resolveAlert = (id: string) => {
    const alertToResolve = alerts.find(a => a.id === id);
    if (alertToResolve) {
      const resolvedAlert: Alert = {
        ...alertToResolve,
        resolved: true,
        resolvedAt: new Date().toISOString(),
        resolutionType: 'Resolved'
      };
      setAlerts(prev => prev.filter(a => a.id !== id));
      setHistory(prev => [resolvedAlert, ...prev]);
    }

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'RESOLVE_ALERT', payload: { id } }));
    }
  };

  const activateDisaster = (type: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'ACTIVATE_DISASTER', payload: { type } }));
    }
  };

  const deactivateDisaster = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'DEACTIVATE_DISASTER' }));
    }
  };

  const updateTrafficSim = (payload: Partial<typeof trafficSimulation>) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'UPDATE_TRAFFIC_SIM', payload }));
    }
  };

  const updateMapViewMode = (mode: 'Normal' | 'Emergency' | 'Traffic') => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'SET_MAP_VIEW_MODE', payload: mode }));
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
                <UserScreen 
                  onTrigger={triggerAlert} 
                  onLocationUpdate={updateLocation} 
                  disasterMode={disasterMode}
                  trafficSimulation={trafficSimulation}
                  mapViewMode={mapViewMode}
                  onUpdateMapViewMode={updateMapViewMode}
                />
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
                  disasterMode={disasterMode}
                  onActivateDisaster={activateDisaster}
                  onDeactivateDisaster={deactivateDisaster}
                  trafficSimulation={trafficSimulation}
                  onUpdateTrafficSim={updateTrafficSim}
                  mapViewMode={mapViewMode}
                  onUpdateMapViewMode={updateMapViewMode}
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
