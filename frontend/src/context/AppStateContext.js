import { createContext, useContext, useState } from "react";

const Ctx = createContext(null);

const DEFAULT_STATE = { code: "DL", name: "Delhi", lat: 28.7041, lon: 77.1025 };

export function AppStateProvider({ children }) {
  const [selectedState, setSelectedState] = useState(DEFAULT_STATE);
  const [activeLayer, setActiveLayer] = useState("temperature"); // temperature | rainfall | anomaly | drought
  const [resolution, setResolution] = useState("state"); // state | district

  return (
    <Ctx.Provider value={{ selectedState, setSelectedState, activeLayer, setActiveLayer, resolution, setResolution }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAppState = () => useContext(Ctx);
