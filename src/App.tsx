import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  AlertCircle, MapPin, LayoutDashboard, User
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { GoogleGenAI, Type } from "@google/genai";

/* ---------------- ICONS ---------------- */

const preciseIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:18px;height:18px;background:red;
    border-radius:50%;border:3px solid white;
    box-shadow:0 0 12px red;"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

const selectedIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:24px;height:24px;background:#ff0000;
    border-radius:50%;border:4px solid white;
    box-shadow:0 0 18px red;"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

/* ---------------- AI ---------------- */

const classifyUrgency = async (text: string) => {
  try {

    const key =
      (import.meta as any)?.env?.VITE_GEMINI_API_KEY ||
      (window as any)?.VITE_GEMINI_API_KEY ||
      "";

    if (!key) {
      return {
        urgency: "Medium",
        reasoning: "Demo mode AI"
      };
    }

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
    return {
      urgency: "Critical",
      reasoning: "Fallback triggered"
    };
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

/* ---------------- USER SCREEN ---------------- */

const UserScreen = ({ sendAlert }: any) => {
  const [location, setLocation] = useState("Locating...");
  const [status, setStatus] = useState("Ready");
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [ai, setAI] = useState<any>(null);

  useEffect(() => {
    navigator.geolocation.watchPosition(pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setLocation(`${lat}, ${lng}`);
      setCoords([lat, lng]);
    });
  }, []);

  const trigger = async () => {
    setStatus("Analyzing...");
    const result = await classifyUrgency("User emergency");
    setAI(result);

    sendAlert({
      location,
      urgency: result.urgency,
      reasoning: result.reasoning
    });

    setStatus("Alert sent");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 text-white">

      <button
        onClick={trigger}
        className="w-64 h-64 rounded-full bg-red-600 flex flex-col items-center justify-center text-3xl font-bold shadow-xl hover:scale-105 transition"
      >
        <AlertCircle size={60}/>
        EMERGENCY
      </button>

      <div className="text-sm flex gap-2 items-center">
        <MapPin size={16}/> {location}
      </div>

      <div className="text-xs opacity-70">{status}</div>

      {ai && (
        <div className="bg-black/40 p-4 rounded-xl text-center">
          <div>{ai.urgency}</div>
          <div className="text-xs">{ai.reasoning}</div>
        </div>
      )}
    </div>
  );
};

/* ---------------- ADMIN DASHBOARD ---------------- */

const Dashboard = ({ alerts }: any) => {
  const [selected, setSelected] = useState<any>(null);

  const coords = useMemo(() => {
    if (!selected) return null;
    const p = selected.location.split(",").map(Number);
    return [p[0], p[1]];
  }, [selected]);

  return (
    <div className="grid grid-cols-12 gap-6 p-6 text-white">

      {/* LIST */}
      <div className="col-span-4 space-y-3">
        {alerts.map((a:any) => (
          <div
            key={a.id}
            onClick={()=>setSelected(a)}
            className="bg-black/40 p-4 rounded-xl cursor-pointer"
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
          zoom={coords ? 17 : 5}
          style={{ height:"100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>

          {alerts.map((a:any)=>{
            if(!a.location.includes(",")) return null;

            const [lat,lng]=a.location.split(",").map(Number);
            if(isNaN(lat)) return null;

            const selectedMarker = selected?.id===a.id;

            return (
              <React.Fragment key={a.id}>
                <Marker
                  position={[lat,lng]}
                  icon={selectedMarker?selectedIcon:preciseIcon}
                >
                  <Popup>{a.location}</Popup>
                </Marker>

                <Circle center={[lat,lng]} radius={25}/>
              </React.Fragment>
            );
          })}

          <MapUpdater coords={coords}/>
        </MapContainer>

      </div>
    </div>
  );
};

/* ---------------- MAIN APP ---------------- */

export default function App() {
  const [view,setView]=useState("user");
  const [alerts,setAlerts]=useState<any[]>([]);

  const addAlert=(data:any)=>{
    setAlerts(prev=>[
      { id:Math.random()+"", ...data },
      ...prev
    ]);
  };

  return (
    <div className="bg-black min-h-screen">

      {/* NAV */}
      <div className="flex justify-center gap-6 p-4 text-white">
        <button onClick={()=>setView("user")}><User/></button>
        <button onClick={()=>setView("admin")}><LayoutDashboard/></button>
      </div>

      {view==="user"
        ? <UserScreen sendAlert={addAlert}/>
        : <Dashboard alerts={alerts}/>
      }
    </div>
  );
}
