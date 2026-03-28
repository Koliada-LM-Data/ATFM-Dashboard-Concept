import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type SectorType = 'ACC' | 'APP' | 'TWR';

interface HourlyData {
  hour: number;
  count: number;
}

interface DetailedData {
  timestamp: string; // HH:mm
  count: number;
  minutes: number; // minutes from 00:00
}

interface Sector {
  id: string;
  name: string;
  type: SectorType;
  data: HourlyData[];
  detailedData: DetailedData[];
  capacity: number;
}

// --- Mock Data Generation ---
const generateMockData = (): Sector[] => {
  const sectors: Sector[] = [];
  const types: SectorType[] = ['ACC', 'APP', 'TWR'];
  
  types.forEach((type) => {
    // Generate 20 of each to ensure we have enough for any slicing
    for (let i = 1; i <= 20; i++) {
      // Create a unique profile for each sector
      const baseDemand = Math.random() * 15 + (type === 'ACC' ? 10 : type === 'APP' ? 5 : 2);
      const peakHour1 = Math.floor(Math.random() * 4) + 7; // Morning peak 7-11
      const peakHour2 = Math.floor(Math.random() * 4) + 15; // Evening peak 15-19
      const volatility = Math.random() * 5 + 2;
      
      // Capacity
      const capacity = type === 'ACC' ? 35 + Math.random() * 10 : type === 'APP' ? 25 + Math.random() * 10 : 15 + Math.random() * 10;

      // Hourly Data (for overview)
      const hourlyData: HourlyData[] = Array.from({ length: 24 }, (_, hour) => {
        let count = baseDemand + (Math.random() * volatility);
        if (Math.abs(hour - peakHour1) <= 2) count += (3 - Math.abs(hour - peakHour1)) * (Math.random() * 10 + 5);
        if (Math.abs(hour - peakHour2) <= 2) count += (3 - Math.abs(hour - peakHour2)) * (Math.random() * 10 + 5);
        return { hour, count: Math.max(0, Math.floor(count)) };
      });

      // Detailed Data (10-minute granularity: 144 points)
      const detailedData: DetailedData[] = Array.from({ length: 144 }, (_, index) => {
        const totalMinutes = index * 10;
        const hour = Math.floor(totalMinutes / 60);
        const minute = totalMinutes % 60;
        const timestamp = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Use the hourly count as a base and add some noise
        const baseCount = hourlyData[hour].count;
        const noise = (Math.random() - 0.5) * 6;
        return {
          timestamp,
          minutes: totalMinutes,
          count: Math.max(0, Math.floor(baseCount + noise)),
        };
      });

      sectors.push({
        id: `${type}-${i}`,
        name: `${type} Sector ${i.toString().padStart(2, '0')}`,
        type,
        data: hourlyData,
        detailedData,
        capacity: Math.floor(capacity),
      });
    }
  });

  return sectors;
};

// --- Components ---

const SectorRow = ({ sector, currentTime, onClick }: { sector: Sector, currentTime: number, onClick: () => void }) => {
  // Base HSL values for each type
  // ACC: Blue (217, 91%, 60%)
  // APP: Emerald (161, 84%, 39%)
  // TWR: Amber (38, 92%, 50%)
  
  const getHsl = (type: SectorType, value: number) => {
    // Normalize value (0-50 range)
    const normalized = Math.min(Math.max(value / 50, 0), 1);
    
    // "Bigger value the darker the color"
    // We decrease the lightness as the value increases
    if (type === 'ACC') {
      const l = 80 - (normalized * 50); // From 80% (light) to 30% (dark)
      return `hsl(217, 91%, ${l}%)`;
    }
    if (type === 'APP') {
      const l = 70 - (normalized * 50); // From 70% to 20%
      return `hsl(161, 84%, ${l}%)`;
    }
    // TWR
    const l = 85 - (normalized * 60); // From 85% to 25%
    return `hsl(38, 92%, ${l}%)`;
  };
  
  return (
    <div 
      className="flex items-center h-full border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors group relative cursor-pointer"
      onClick={onClick}
    >
      <div className="w-24 px-2 flex flex-col justify-center border-r border-zinc-800/50 h-full">
        <span className="text-[8px] font-mono uppercase tracking-wider opacity-50 leading-none mb-0.5">
          {sector.type}
        </span>
        <span className="text-[10px] font-medium truncate leading-none">
          {sector.name}
        </span>
      </div>
      
      <div className="flex-1 h-full py-0.5 px-1 relative">
        {/* Capacity Line Layer (Red) */}
        <div 
          className="absolute left-0 right-0 h-px bg-red-500/60 z-10 pointer-events-none"
          style={{ bottom: `${(sector.capacity / 50) * 100}%` }}
        />

        {/* Time Indicator Line Layer (White) */}
        <div 
          className="absolute top-0 bottom-0 w-px bg-white/40 z-20 pointer-events-none"
          style={{ left: `${(currentTime / 24) * 100}%` }}
        />
        
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sector.data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="hour" hide />
            <YAxis hide domain={[0, 50]} />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-zinc-900 border border-zinc-700 px-1.5 py-0.5 rounded shadow-xl">
                      <p className="text-[9px] font-mono text-zinc-400">
                        {payload[0].payload.hour.toString().padStart(2, '0')}:00 - {payload[0].value} ACFT
                      </p>
                      <p className="text-[8px] font-mono text-red-400">
                        CAPACITY: {sector.capacity}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            />
            <Bar dataKey="count" radius={[1, 1, 0, 0]}>
              {sector.data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getHsl(sector.type, entry.count)} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const DetailedSectorView = ({ sector, currentTime, onBack }: { sector: Sector, currentTime: number, onBack: () => void }) => {
  const color = sector.type === 'ACC' ? 'var(--acc)' : sector.type === 'APP' ? 'var(--app)' : 'var(--twr)';
  
  const getHsl = (value: number) => {
    const normalized = Math.min(Math.max(value / 50, 0), 1);
    if (sector.type === 'ACC') return `hsl(217, 91%, ${80 - (normalized * 50)}%)`;
    if (sector.type === 'APP') return `hsl(161, 84%, ${70 - (normalized * 50)}%)`;
    return `hsl(38, 92%, ${85 - (normalized * 60)}%)`;
  };

  const peakValue = Math.max(...sector.detailedData.map(d => d.count));
  const avgValue = (sector.detailedData.reduce((acc, curr) => acc + curr.count, 0) / 144).toFixed(1);

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">
                {sector.type}
              </span>
              <h2 className="text-2xl font-bold tracking-tight">{sector.name}</h2>
            </div>
            <p className="text-xs text-zinc-500 font-mono">10-MINUTE GRANULARITY TRAFFIC DEMAND ANALYSIS</p>
          </div>
        </div>

        <div className="flex gap-8">
          <div className="text-right">
            <p className="text-[10px] font-mono text-zinc-500 uppercase">Peak Demand</p>
            <p className="text-2xl font-bold text-white">{peakValue} <span className="text-xs font-normal text-zinc-500">ACFT</span></p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono text-zinc-500 uppercase">Avg Demand</p>
            <p className="text-2xl font-bold text-white">{avgValue} <span className="text-xs font-normal text-zinc-500">ACFT</span></p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono text-zinc-500 uppercase">Capacity</p>
            <p className="text-2xl font-bold text-red-500">{sector.capacity} <span className="text-xs font-normal text-zinc-500">ACFT</span></p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-zinc-900/30 border border-zinc-800 rounded-xl p-8 relative">
        {/* X-Axis Labels */}
        <div className="absolute bottom-4 left-20 right-8 flex justify-between text-[10px] font-mono text-zinc-600">
          {Array.from({ length: 25 }, (_, i) => (
            <span key={i}>{i.toString().padStart(2, '0')}</span>
          ))}
        </div>

        {/* Y-Axis Labels */}
        <div className="absolute left-4 top-8 bottom-12 flex flex-col justify-between text-[10px] font-mono text-zinc-600 text-right w-12">
          <span>50</span>
          <span>40</span>
          <span>30</span>
          <span>20</span>
          <span>10</span>
          <span>0</span>
        </div>

        <div className="w-full h-full ml-8 mb-4 relative">
          {/* Capacity Line */}
          <div 
            className="absolute left-0 right-0 h-px bg-red-500/40 z-10 border-t border-dashed border-red-500/20"
            style={{ top: `${(1 - sector.capacity / 50) * 100}%` }}
          >
            <span className="absolute -top-4 right-0 text-[9px] font-mono text-red-500/60 uppercase">Capacity Limit</span>
          </div>

          {/* Time Line */}
          <div 
            className="absolute top-0 bottom-0 w-px bg-white z-20 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
            style={{ left: `${(currentTime / 24) * 100}%` }}
          >
             <div className="absolute -top-2 -left-1 w-2 h-2 bg-white rounded-full" />
             <span className="absolute -top-6 left-2 text-[10px] font-mono text-white whitespace-nowrap bg-zinc-800 px-1.5 py-0.5 rounded">NOW</span>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sector.detailedData} margin={{ top: 10, right: 0, left: 0, bottom: 20 }}>
              <XAxis dataKey="timestamp" hide />
              <YAxis hide domain={[0, 50]} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-zinc-900 border border-zinc-700 p-3 rounded-lg shadow-2xl">
                        <p className="text-xs font-mono text-zinc-400 mb-2">{payload[0].payload.timestamp} UTC</p>
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getHsl(payload[0].value as number) }} />
                          <p className="text-lg font-bold text-white">{payload[0].value} <span className="text-[10px] font-normal text-zinc-500">AIRCRAFT</span></p>
                        </div>
                        <div className="mt-2 pt-2 border-t border-zinc-800">
                          <p className="text-[10px] font-mono text-zinc-500">Utilization: {((payload[0].value as number / sector.capacity) * 100).toFixed(0)}%</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="count">
                {sector.detailedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getHsl(entry.count)} 
                    className="transition-all duration-300 hover:brightness-125"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const Header = () => {
  return (
    <div className="flex items-center h-6 bg-zinc-900/80 border-b border-zinc-700 text-[8px] font-mono uppercase tracking-widest text-zinc-500 sticky top-0 z-10">
      <div className="w-24 px-2 border-r border-zinc-700 h-full flex items-center">
        Sector ID
      </div>
      <div className="flex-1 px-1 flex justify-between h-full items-center">
        {Array.from({ length: 24 }, (_, i) => (
          <span key={i} className="w-full text-center">
            {i.toString().padStart(2, '0')}
          </span>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const sectors = useMemo(() => generateMockData(), []);
  const [now, setNow] = React.useState(new Date());
  const [selectedSectorId, setSelectedSectorId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000); // Update every 30s
    return () => clearInterval(timer);
  }, []);

  const currentTimeValue = now.getHours() + now.getMinutes() / 60;
  
  const selectedSector = useMemo(() => 
    sectors.find(s => s.id === selectedSectorId), 
  [sectors, selectedSectorId]);

  // Split sectors into two columns with specific counts
  const col1 = useMemo(() => {
    const acc = sectors.filter(s => s.type === 'ACC').slice(0, 10);
    const app = sectors.filter(s => s.type === 'APP').slice(0, 3);
    const twr = sectors.filter(s => s.type === 'TWR').slice(0, 2);
    return [...acc, ...app, ...twr];
  }, [sectors]);

  const col2 = useMemo(() => {
    const acc = sectors.filter(s => s.type === 'ACC').slice(10, 19);
    const app = sectors.filter(s => s.type === 'APP').slice(3, 7);
    const twr = sectors.filter(s => s.type === 'TWR').slice(2, 4);
    return [...acc, ...app, ...twr];
  }, [sectors]);

  const renderColumn = (columnSectors: Sector[]) => {
    const acc = columnSectors.filter(s => s.type === 'ACC');
    const app = columnSectors.filter(s => s.type === 'APP');
    const twr = columnSectors.filter(s => s.type === 'TWR');

    return (
      <div className="flex flex-col flex-1 border-r border-zinc-800 last:border-r-0">
        <Header />
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* ACC Group */}
          <div className="border-l-2 border-blue-500/50">
            {acc.map(sector => (
              <div key={sector.id} className="h-[calc((100vh-100px)/15)] min-h-[18px]">
                <SectorRow 
                  sector={sector} 
                  currentTime={currentTimeValue} 
                  onClick={() => setSelectedSectorId(sector.id)}
                />
              </div>
            ))}
          </div>

          {/* APP Group */}
          <div className="border-l-2 border-emerald-500/50">
            {app.map(sector => (
              <div key={sector.id} className="h-[calc((100vh-100px)/15)] min-h-[18px]">
                <SectorRow 
                  sector={sector} 
                  currentTime={currentTimeValue} 
                  onClick={() => setSelectedSectorId(sector.id)}
                />
              </div>
            ))}
          </div>

          {/* TWR Group */}
          <div className="border-l-2 border-amber-500/50">
            {twr.map(sector => (
              <div key={sector.id} className="h-[calc((100vh-100px)/15)] min-h-[18px]">
                <SectorRow 
                  sector={sector} 
                  currentTime={currentTimeValue} 
                  onClick={() => setSelectedSectorId(sector.id)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-black text-zinc-100 overflow-hidden font-sans select-none">
      {/* Top Bar */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center gap-4">
          <h1 className="text-xs font-bold tracking-tighter uppercase flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Air Traffic Monitor
          </h1>
          <div className="h-3 w-px bg-zinc-800" />
          <div className="flex gap-3 text-[9px] font-mono text-zinc-500 uppercase">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-blue-500 opacity-60" /> ACC
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-emerald-500 opacity-60" /> APP
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-amber-500 opacity-60" /> TWR
            </div>
          </div>
        </div>
        <div className="text-[9px] font-mono text-zinc-500">
          {new Date().toISOString().split('T')[1].split('.')[0]} UTC
        </div>
      </div>

      {/* Main Dashboard Area */}
      <div className="flex-1 flex overflow-hidden">
        {selectedSector ? (
          <DetailedSectorView 
            sector={selectedSector} 
            currentTime={currentTimeValue} 
            onBack={() => setSelectedSectorId(null)}
          />
        ) : (
          <>
            {renderColumn(col1)}
            {renderColumn(col2)}
          </>
        )}
      </div>

      {/* Footer Status */}
      <div className="h-5 bg-zinc-950 border-t border-zinc-800 flex items-center px-4 justify-between text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
        <div className="flex gap-4">
          <span>Sectors: 30/30</span>
          <span>Stream: Active</span>
          {selectedSector && <span className="text-zinc-400">View: Detailed ({selectedSector.name})</span>}
        </div>
        <div className="flex gap-4">
          <span>v1.0.6</span>
        </div>
      </div>
    </div>
  );
}
