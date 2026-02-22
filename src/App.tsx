/**
 * FINAL — OLD UI + IMPROVED MAP + SAFE LOCATION
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  AlertCircle, Mic, MapPin, Shield, LayoutDashboard,
  User, Clock, CheckCircle2, AlertTriangle,
  Radio, BrainCircuit, XCircle, Activity, History, Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { GoogleGenAI, Type } from "@google/genai";

/* ---------------- UTIL ---------------- */

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

/* ---------------- TYPES ---------------- */

interface Alert {
  id: string;
  timestamp: string;
  status: 'Critical' | 'Medium' | 'Low';
  location: string;
  userId: string;
  transcript?: string;
  aiReasoning?: string;
  accepted: boolean;
}

/* ---------------- ICONS ---------------- */

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

L.Marker.prototype.options.icon = DefaultIcon;

/* ---------------- AI ---------------- */

const classifyUrgency = async (text: string) => {
  try {
    const key =
      (import.meta as any)?.env?.VITE_GEMINI_API_KEY ||
      (window as any)?.VITE_GEMINI_API_KEY ||
      "";

    if (!key)
      return { urgency: "Medium", reasoning: "Demo AI mode" };

    const ai = new GoogleGenAI({ apiKey: key });

    const res = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Classify emergency urgency: ${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            urgency: { type: Type.STRING },
            reasoning: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(res.text);

  } catch {
    return { urgency: "Critical", reasoning: "Fallback triggered" };
  }
};

/* ---------------- MAP AUTO ZOOM ---------------- */

const MapUpdater = ({ coords }: { coords: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, 18, { duration: 1.5 });
  }, [coords]);
  return null;
};

/* ---------------- USER PANEL ---------------- */

const UserScreen = ({ onTrigger }: any) => {
  const [location, setLocation] = useState("Locating...");
  const [coords, setCoords] = useState<[number, number] | null>(null);

  useEffect(() => {
    navigator.geolocation.watchPosition(pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setLocation(`${lat}, ${lng}`);
      setCoords([lat, lng]);
    });
  }, []);

  const trigger = async () => {
    const ai = await classifyUrgency("Emergency help needed");
    onTrigger({
      location,
      urgency: ai.urgency,
      reasoning: ai.reasoning
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] space-y-8 p-6 text-white">

      <h1 className="text-5xl font-black">RescueLink AI</h1>

      <button
        onClick={trigger}
        className="w-72 h-72 rounded-full bg-red-600 flex flex-col items-center justify-center text-white shadow-2xl hover:scale-105 transition"
      >
        <AlertCircle size={80}/>
        <span className="text-3xl font-black">Emergency</span>
      </button>

      <div className="flex items-center gap-2">
        <MapPin/> {location}
      </div>

    </div>
  );
};

/* ---------------- ADMIN ---------------- */

const AdminDashboard = ({ alerts }: any) => {

  const [selected, setSelected] = useState<any>(null);

  const coords = useMemo(()=>{
    if(!selected) return null;
    const p = selected.location.split(",").map(Number);
    return [p[0],p[1]];
  },[selected]);

  return (
    <div className="p-8 space-y-8 text-white">

      <h1 className="text-4xl font-black">RescueLink Command</h1>

      <div className="grid grid-cols-12 gap-6">

        {/* ALERT LIST */}
        <div className="col-span-4 space-y-3">
          {alerts.map((a:any)=>(
            <div
              key={a.id}
              onClick={()=>setSelected(a)}
              className="glass p-4 rounded-xl cursor-pointer"
            >
              {a.urgency}
              <div className="text-xs opacity-60">{a.location}</div>
            </div>
          ))}
        </div>

        {/* MAP */}
        <div className="col-span-8 h-[500px] rounded-xl overflow-hidden">

          <MapContainer
            center={coords || [20.5937,78.9629]}
            zoom={coords?17:5}
            style={{height:"100%"}}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>

            <MarkerClusterGroup>

              {alerts.map((a:any)=>{
                if(!a.location.includes(",")) return null;

                const [lat,lng]=a.location.split(",").map(Number);
                if(isNaN(lat)||isNaN(lng)) return null;

                const selectedMarker = selected?.id===a.id;

                return (
                  <React.Fragment key={a.id}>

                    <Marker
                      position={[lat,lng]}
                      icon={selectedMarker?HighlightedIcon:DefaultIcon}
                    >
                      <Popup>{a.location}</Popup>
                    </Marker>

                    {/* accuracy circle */}
                    <Circle
                      center={[lat,lng]}
                      radius={25}
                      pathOptions={{color:"red"}}
                    />

                  </React.Fragment>
                );
              })}

            </MarkerClusterGroup>

            <MapUpdater coords={coords}/>

          </MapContainer>

        </div>
      </div>
    </div>
  );
};

/* ---------------- MAIN ---------------- */

export default function App(){
  const [view,setView]=useState("user");
  const [alerts,setAlerts]=useState<any[]>([]);

  const addAlert=(data:any)=>{
    setAlerts(prev=>[
      { id:Math.random()+"", ...data },
      ...prev
    ]);
  };

  return(
    <div className="bg-brand-dark min-h-screen">

      <nav className="flex justify-center gap-6 p-4 text-white">
        <button onClick={()=>setView("user")}><User/></button>
        <button onClick={()=>setView("admin")}><LayoutDashboard/></button>
      </nav>

      {view==="user"
        ? <UserScreen onTrigger={addAlert}/>
        : <AdminDashboard alerts={alerts}/>
      }

    </div>
  );
}
