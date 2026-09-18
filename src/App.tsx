import { useState, useContext, createContext, useCallback, useEffect, useRef } from 'react';
import {
  INITIAL_STUDENTS, INITIAL_DRIVERS, INITIAL_SHUTTLES,
  INITIAL_TRANSACTIONS, INITIAL_ACTIVITY, SHUTTLE_FARE,
  type Role, type Student, type Driver, type Shuttle,
  type Boarding, type Transaction, type TripSession, type ActivityEvent, type TxStatus,
} from './data';

// ── Context ───────────────────────────────────────────────────────────────────

interface AppCtxType {
  students: Student[];
  drivers: Driver[];
  shuttles: Shuttle[];
  boardings: Boarding[];
  transactions: Transaction[];
  tripSessions: TripSession[];
  activity: ActivityEvent[];
  online: boolean;
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
  setShuttles: React.Dispatch<React.SetStateAction<Shuttle[]>>;
  setBoardings: React.Dispatch<React.SetStateAction<Boarding[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  setTripSessions: React.Dispatch<React.SetStateAction<TripSession[]>>;
  setActivity: React.Dispatch<React.SetStateAction<ActivityEvent[]>>;
  setOnline: React.Dispatch<React.SetStateAction<boolean>>;
  addActivity: (msg: string, type: ActivityEvent['type']) => void;
}

const AppCtx = createContext<AppCtxType>(null!);
const useApp = () => useContext(AppCtx);

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9).toUpperCase(); }
function fmt(d: Date) { return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }
function fmtFull(d: Date) {
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Common UI ─────────────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-[#111827] border border-[#1e2d45] rounded-xl p-4 ${className}`}>{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3">{children}</p>;
}

const STATUS_COLORS: Record<TxStatus, string> = {
  COMPLETED:    'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  OUTSTANDING:  'bg-orange-500/15 text-orange-300 border-orange-500/40',
  PENDING_SYNC: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  FAILED:       'bg-red-500/15 text-red-300 border-red-500/40',
  CANCELLED:    'bg-slate-500/15 text-slate-400 border-slate-500/40',
};

function Badge({ status }: { status: TxStatus }) {
  return (
    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${STATUS_COLORS[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function StatCard({ label, value, sub, color = 'text-white' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <Card>
      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-bold font-display ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </Card>
  );
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-[#0a0e1a] border border-[#1e2d45] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600 ${props.className ?? ''}`}
    />
  );
}

function Btn({ children, variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'danger' | 'ghost' | 'success' | 'outline' }) {
  const cls = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    danger:  'bg-red-600/80 hover:bg-red-500 text-white',
    ghost:   'text-slate-400 hover:text-white border border-[#1e2d45] hover:border-slate-600',
    outline: 'border border-blue-500/50 text-blue-400 hover:bg-blue-500/10',
  }[variant];
  return (
    <button {...props} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${cls} ${className}`}>
      {children}
    </button>
  );
}

// ── QR Visual ─────────────────────────────────────────────────────────────────

function QRCode({ payload, size = 110 }: { payload: string; size?: number }) {
  const cells = 21;
  const cell = size / cells;
  const hash = payload.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
  const grid = Array.from({ length: cells }, (_, r) =>
    Array.from({ length: cells }, (_, c) => {
      if (r < 7 && c < 7) return true;
      if (r < 7 && c >= cells - 7) return true;
      if (r >= cells - 7 && c < 7) return true;
      return (((hash * (r + 1) * (c + 1)) >> (r % 5)) & 1) === 1;
    })
  );
  return (
    <div className="inline-block bg-white p-2 rounded-xl shadow-lg shadow-black/50">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {grid.flatMap((row, r) => row.map((on, c) =>
          on ? <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#000" /> : null
        ))}
      </svg>
    </div>
  );
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-28 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-sm bg-gradient-to-t from-blue-700 to-cyan-400 opacity-75 hover:opacity-100 transition-opacity"
            style={{ height: `${Math.max((d.value / max) * 100, 2)}%` }}
            title={`${d.label}: ${d.value}`}
          />
          {i % 3 === 0 && <span className="text-[9px] text-slate-600 whitespace-nowrap">{d.label}</span>}
        </div>
      ))}
    </div>
  );
}

// ── Connection Toggle ─────────────────────────────────────────────────────────

function ConnectionToggle() {
  const { online, setOnline } = useApp();
  return (
    <button
      onClick={() => setOnline(v => !v)}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
        online
          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
          : 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
      {online ? 'ONLINE' : 'OFFLINE'}
      <span className="text-[10px] opacity-50 ml-0.5">(demo)</span>
    </button>
  );
}

// ── Scanner Modal ─────────────────────────────────────────────────────────────

function ScannerModal({
  onClose, onScan, alreadyBoarded,
}: {
  onClose: () => void;
  onScan: (student: Student) => void;
  alreadyBoarded: string[];
}) {
  const { students } = useApp();
  const activeStudents = students.filter(s => s.active);
  const [selected, setSelected] = useState<Student | null>(null);
  const [scanning, setScanning] = useState(false);
  const [verified, setVerified] = useState(false);

  function doScan() {
    if (!selected) return;
    setScanning(true);
    setTimeout(() => { setScanning(false); setVerified(true); }, 1200);
  }

  function confirm() {
    if (selected) { onScan(selected); onClose(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <Card className="w-full max-w-sm border-blue-500/30 shadow-2xl shadow-blue-500/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-display font-bold text-white">Scan VIT ID</p>
            <p className="text-xs text-slate-500">to Board Shuttle</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-lg leading-none">✕</button>
        </div>

        {!verified ? (
          <>
            {/* Scanner viewfinder */}
            <div className="relative bg-[#0a0e1a] rounded-xl h-32 mb-4 flex items-center justify-center overflow-hidden border border-[#1e2d45]">
              <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#3b82f6_2px,#3b82f6_3px)]" />
              {scanning ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-blue-400 font-mono">Scanning…</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-3xl mb-1">📷</p>
                  <p className="text-xs text-slate-500">Demo Mode — Select student below</p>
                </div>
              )}
              {/* Corner marks */}
              {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map(pos => (
                <span key={pos} className={`absolute ${pos} w-4 h-4 border-blue-400 border-2`}
                  style={{ borderRight: pos.includes('left') ? 'none' : undefined, borderLeft: pos.includes('right') ? 'none' : undefined, borderBottom: pos.includes('top') ? 'none' : undefined, borderTop: pos.includes('bottom') ? 'none' : undefined }} />
              ))}
            </div>

            <SectionTitle>Select Demo Student</SectionTitle>
            <div className="space-y-1.5 mb-4">
              {activeStudents.map(s => {
                const boarded = alreadyBoarded.includes(s.id);
                return (
                  <button
                    key={s.id}
                    disabled={boarded}
                    onClick={() => setSelected(s)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                      boarded ? 'opacity-40 cursor-not-allowed border-[#1e2d45]' :
                      selected?.id === s.id ? 'border-blue-500 bg-blue-500/10' : 'border-[#1e2d45] hover:border-blue-500/50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600/40 to-cyan-600/40 flex items-center justify-center text-sm font-bold text-blue-300">
                      {s.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{s.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{s.id} · ₹{s.walletBalance}</p>
                    </div>
                    {boarded && <span className="text-[10px] text-slate-500">ABOARD</span>}
                    {selected?.id === s.id && !boarded && <span className="text-blue-400 text-sm">✓</span>}
                  </button>
                );
              })}
            </div>

            <Btn variant="primary" className="w-full justify-center flex" disabled={!selected || scanning} onClick={doScan}>
              {scanning ? 'Scanning…' : 'Simulate Scan'}
            </Btn>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-display font-bold text-emerald-400 text-lg">Student Verified ✓</p>
            <div className="mt-4 bg-[#0a0e1a] rounded-xl p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Name</span>
                <span className="text-white font-medium">{selected!.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">VIT ID</span>
                <span className="font-mono text-blue-400">{selected!.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Program</span>
                <span className="text-white">{selected!.program}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Wallet</span>
                <span className={selected!.walletBalance >= SHUTTLE_FARE ? 'text-emerald-400' : 'text-orange-400'}>
                  ₹{selected!.walletBalance} {selected!.walletBalance < SHUTTLE_FARE ? '(insufficient)' : ''}
                </span>
              </div>
            </div>
            <p className="text-emerald-400 text-sm font-medium mt-4">
              {selected!.walletBalance >= SHUTTLE_FARE ? 'Fare will be auto-deducted on exit' : 'Will be recorded as Outstanding'}
            </p>
            <div className="flex gap-2 mt-4">
              <Btn variant="ghost" className="flex-1" onClick={() => { setVerified(false); setSelected(null); }}>Back</Btn>
              <Btn variant="success" className="flex-1" onClick={confirm}>Boarded Successfully →</Btn>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Driver Dashboard ──────────────────────────────────────────────────────────

function DriverDashboard({ driver }: { driver: Driver }) {
  const { students, shuttles, setShuttles, boardings, setBoardings,
          transactions, setTransactions, setTripSessions, online, addActivity, setStudents } = useApp();

  const shuttle = shuttles.find(s => s.id === driver.assignedShuttleId);
  const [activeSession, setActiveSession] = useState<{ id: string; startedAt: Date } | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastScan, setLastScan] = useState<{ studentName: string; status: string } | null>(null);

  const myBoardings = boardings.filter(b => shuttle && b.shuttleId === shuttle.id && b.tripSessionId === activeSession?.id);
  const pendingSync = transactions.filter(t => shuttle && t.shuttleId === shuttle.id && !t.synced).length;

  // Auto-sync when connection returns
  useEffect(() => {
    if (!online || pendingSync === 0 || !activeSession) return;
    setSyncing(true);
    const t = setTimeout(() => {
      setTransactions(prev => prev.map(tx =>
        !tx.synced ? { ...tx, synced: true, status: tx.status === 'PENDING_SYNC' ? 'COMPLETED' : tx.status } : tx
      ));
      setSyncing(false);
      addActivity('Offline transactions synchronized ✓', 'system');
    }, 2200);
    return () => clearTimeout(t);
  }, [online, pendingSync]);

  function startTrip() {
    if (!shuttle) return;
    const sessId = 'SESS-' + uid();
    setActiveSession({ id: sessId, startedAt: new Date() });
    setShuttles(prev => prev.map(s => s.id === shuttle.id ? { ...s, status: 'ACTIVE' } : s));
    addActivity(`SH-${shuttle.id.split('-')[1]} trip started by ${driver.name}`, 'trip');
  }

  function endTrip() {
    if (!shuttle || !activeSession) return;
    const now = new Date();
    const sessId = activeSession.id;

    // Settle fares for all passengers
    myBoardings.forEach(b => {
      const student = students.find(s => s.id === b.studentId);
      if (!student) return;
      const hasFunds = student.walletBalance >= SHUTTLE_FARE;
      const status: TxStatus = !online ? 'PENDING_SYNC' : hasFunds ? 'COMPLETED' : 'OUTSTANDING';
      const txn: Transaction = {
        id: 'TXN-' + uid(), studentId: student.id, studentName: student.name,
        shuttleId: shuttle.id, driverId: driver.id, amount: SHUTTLE_FARE,
        timestamp: now, status, tripSessionId: sessId, synced: online && hasFunds,
      };
      setTransactions(prev => [...prev, txn]);

      if (hasFunds) {
        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, walletBalance: s.walletBalance - SHUTTLE_FARE } : s));
        addActivity(`₹${SHUTTLE_FARE} auto-charged to ${student.name} ✓`, 'payment');
      } else {
        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, outstandingDues: s.outstandingDues + SHUTTLE_FARE } : s));
        addActivity(`₹${SHUTTLE_FARE} OUTSTANDING for ${student.name} (insufficient balance)`, 'payment');
      }
    });

    const count = myBoardings.length;
    setTripSessions(prev => [...prev, { id: sessId, shuttleId: shuttle.id, driverId: driver.id, startedAt: activeSession.startedAt, endedAt: now, passengerCount: count }]);
    addActivity(`SH-${shuttle.id.split('-')[1]} trip completed · ${count} passenger${count !== 1 ? 's' : ''}`, 'trip');

    setBoardings(prev => prev.filter(b => b.tripSessionId !== sessId));
    setShuttles(prev => prev.map(s => s.id === shuttle.id ? { ...s, status: 'AVAILABLE' } : s));
    setActiveSession(null);
    setLastScan(null);
  }

  function handleScan(student: Student) {
    if (!shuttle || !activeSession) return;
    const b: Boarding = { id: 'BRD-' + uid(), studentId: student.id, shuttleId: shuttle.id, boardedAt: new Date(), tripSessionId: activeSession.id };
    setBoardings(prev => [...prev, b]);
    addActivity(`${student.name} boarded ${shuttle.id}`, 'boarding');
    setLastScan({ studentName: student.name, status: student.walletBalance >= SHUTTLE_FARE ? 'PAID_ON_EXIT' : 'OUTSTANDING' });
  }

  function removePassenger(boardingId: string, studentName: string) {
    setBoardings(prev => prev.filter(b => b.id !== boardingId));
    addActivity(`${studentName} removed from passenger list`, 'system');
    setLastScan(null);
  }

  if (!shuttle) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold font-display text-white">Driver Dashboard</h2>
        <Card className="text-center py-8 text-slate-500">No shuttle assigned. Contact admin.</Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold font-display text-white">Driver Dashboard</h2>
          <p className="text-sm text-slate-400">{driver.name} · {shuttle.id}</p>
        </div>
        <ConnectionToggle />
      </div>

      {/* Sync banner */}
      {syncing && (
        <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 text-sm text-cyan-300">
          <span className="inline-block animate-spin">⟳</span> Syncing {pendingSync} offline transaction{pendingSync > 1 ? 's' : ''}…
        </div>
      )}
      {!online && myBoardings.length > 0 && !syncing && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-sm text-amber-300">
          <span>📶</span> OFFLINE MODE — Transactions are securely queued · {pendingSync} pending sync
        </div>
      )}

      {/* Shuttle card */}
      <Card className={activeSession ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-[#1e2d45]'}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-display font-bold text-white text-lg">{shuttle.id}</p>
            <p className="text-xs text-slate-400">{shuttle.route}</p>
          </div>
          <span className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border ${
            activeSession ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-500/10 text-slate-400 border-slate-600/40'
          }`}>
            {activeSession ? '● ACTIVE TRIP' : 'AVAILABLE'}
          </span>
        </div>
        {activeSession && (
          <p className="text-xs text-emerald-400 font-mono">Started {fmt(activeSession.startedAt)}</p>
        )}
        {!activeSession ? (
          <Btn variant="success" className="w-full flex justify-center mt-3 py-2.5 text-base" onClick={startTrip}>
            ▶ Start Trip
          </Btn>
        ) : (
          <Btn variant="danger" className="w-full flex justify-center mt-3 py-2.5 text-base" onClick={endTrip}>
            ⏹ End Trip · Settle {myBoardings.length} Fare{myBoardings.length !== 1 ? 's' : ''}
          </Btn>
        )}
      </Card>

      {/* Scan button (only when trip active) */}
      {activeSession && (
        <button
          onClick={() => setShowScanner(true)}
          className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-lg shadow-blue-500/20"
        >
          <span className="text-xl">📷</span>
          <span>Scan Student QR</span>
        </button>
      )}

      {/* Last scan result */}
      {lastScan && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
          <span className="text-xl">✅</span>
          <div>
            <p className="text-sm font-semibold text-emerald-300">Boarded Successfully</p>
            <p className="text-xs text-slate-400">
              {lastScan.studentName} ·{' '}
              {lastScan.status === 'OUTSTANDING' ? (
                <span className="text-orange-400">Fare will be recorded as Outstanding</span>
              ) : (
                <span className="text-emerald-400">Fare Paid Automatically ✓</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Passengers" value={myBoardings.length} />
        <StatCard label="Synced" value={transactions.filter(t => t.shuttleId === shuttle.id && t.synced).length} />
        <StatCard label="Pending" value={pendingSync} color={pendingSync > 0 ? 'text-amber-400' : 'text-white'} />
      </div>

      {/* Passenger list */}
      <Card>
        <SectionTitle>Current Passengers</SectionTitle>
        {myBoardings.length === 0 ? (
          <p className="text-slate-600 text-sm text-center py-6">
            {activeSession ? 'No passengers yet — scan a VIT ID to board' : 'Start a trip to begin boarding'}
          </p>
        ) : (
          <div className="space-y-1">
            {myBoardings.map(b => {
              const student = students.find(s => s.id === b.studentId);
              if (!student) return null;
              const hasFunds = student.walletBalance >= SHUTTLE_FARE;
              return (
                <div key={b.id} className="flex items-center gap-3 py-2.5 border-b border-[#1e2d45] last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-sm font-bold text-blue-400 shrink-0">
                    {student.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{student.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{student.id} · Boarded {fmt(b.boardedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${hasFunds ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-orange-500/10 text-orange-400 border-orange-500/30'}`}>
                      {hasFunds ? 'WILL PAY' : 'OUTSTANDING'}
                    </span>
                    <button
                      onClick={() => removePassenger(b.id, student.name)}
                      className="text-slate-600 hover:text-red-400 text-xs transition-colors px-1"
                      title="Remove"
                    >✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {showScanner && (
        <ScannerModal
          onClose={() => setShowScanner(false)}
          onScan={handleScan}
          alreadyBoarded={myBoardings.map(b => b.studentId)}
        />
      )}
    </div>
  );
}

// ── Student Dashboard ─────────────────────────────────────────────────────────

function StudentDashboard({ student: initialStudent }: { student: Student }) {
  const { students, boardings, transactions, shuttles } = useApp();
  const student = students.find(s => s.id === initialStudent.id) ?? initialStudent;

  const activeBoarding = boardings.find(b => b.studentId === student.id);
  const activeShuttle = activeBoarding ? shuttles.find(s => s.id === activeBoarding.shuttleId) : null;
  const myTxns = transactions.filter(t => t.studentId === student.id);
  const completedToday = myTxns.filter(t => t.status === 'COMPLETED').length;
  const [showQR, setShowQR] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold font-display text-white">{student.name}</h2>
          <p className="text-sm text-slate-400">{student.program} · Year {student.year}</p>
          <p className="text-xs font-mono text-slate-600 mt-0.5">{student.id}</p>
        </div>
        <Btn variant="outline" onClick={() => setShowQR(v => !v)}>🪪 My VIT ID</Btn>
      </div>

      {showQR && (
        <Card className="flex flex-col items-center gap-3 py-5">
          <SectionTitle>Simulated VIT Student ID · Demo Only</SectionTitle>
          <QRCode payload={student.qrPayload} />
          <p className="font-mono text-xs text-slate-500">{student.qrPayload}</p>
          <p className="text-[10px] text-slate-700 italic text-center">Not connected to real VIT systems</p>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Wallet" value={`₹${student.walletBalance}`} color={student.walletBalance >= SHUTTLE_FARE ? 'text-white' : 'text-orange-400'} />
        <StatCard label="Trips Today" value={completedToday} />
        <StatCard label="Outstanding" value={`₹${student.outstandingDues}`} color={student.outstandingDues > 0 ? 'text-orange-400' : 'text-white'} />
      </div>

      {/* Active trip */}
      {activeBoarding && activeShuttle ? (
        <Card className="border-blue-500/40 bg-blue-500/5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-mono text-blue-400">● ACTIVE TRIP</p>
            <span className="text-xs font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded">IN PROGRESS</span>
          </div>
          <p className="font-display font-bold text-white text-lg">{activeShuttle.id}</p>
          <p className="text-sm text-slate-400">{activeShuttle.route}</p>
          <div className="mt-3 pt-3 border-t border-blue-500/20 flex items-center gap-4 text-sm">
            <span className="text-slate-400">Boarded <span className="text-white">{fmt(activeBoarding.boardedAt)}</span></span>
            <span className="text-slate-400">Fare <span className="text-blue-300">₹{SHUTTLE_FARE} — settles on exit</span></span>
          </div>
        </Card>
      ) : (
        <Card className="border-dashed border-[#1e2d45] text-center py-6">
          <p className="text-slate-500 text-sm">No active trip</p>
          <p className="text-slate-600 text-xs mt-1">Board a shuttle — the driver will scan your VIT ID</p>
        </Card>
      )}

      {/* Low balance */}
      {student.walletBalance < SHUTTLE_FARE && (
        <div className="flex gap-2 bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 text-sm text-orange-300">
          <span>⚠️</span>
          <div>
            <span className="font-medium">Low balance.</span> Top up via the VIT Student Portal to avoid outstanding fares.
            <span className="text-orange-600 text-xs block mt-0.5 italic">(Demo: top-up simulated)</span>
          </div>
        </div>
      )}

      {/* Outstanding dues */}
      {student.outstandingDues > 0 && (
        <div className="flex gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-300">
          <span>💸</span>
          <div>
            <span className="font-medium">₹{student.outstandingDues} outstanding dues.</span> Please top up your VIT Wallet to clear dues.
          </div>
        </div>
      )}

      {/* Transactions */}
      <Card>
        <SectionTitle>Recent Transactions</SectionTitle>
        {myTxns.length === 0 ? (
          <p className="text-slate-600 text-sm text-center py-6">No transactions yet</p>
        ) : (
          <div className="space-y-0">
            {[...myTxns].reverse().slice(0, 8).map(t => (
              <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-[#1e2d45] last:border-0">
                <div>
                  <p className="text-sm text-white">{t.shuttleId} <span className="text-slate-600 text-xs font-mono">· {t.id}</span></p>
                  <p className="text-xs text-slate-500">{fmtFull(t.timestamp)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-slate-300">₹{t.amount}</span>
                  <Badge status={t.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Admin: Students Tab ───────────────────────────────────────────────────────

function AdminStudents() {
  const { students, setStudents, transactions } = useApp();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newId, setNewId] = useState('');
  const [newProg, setNewProg] = useState('');

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase())
  );

  function addStudent() {
    if (!newName || !newId) return;
    const s: Student = {
      id: newId, name: newName, program: newProg || 'B.Tech', year: 1,
      walletBalance: 100, qrPayload: `VIT|${newId}|${newName.toUpperCase().split(' ')[0]}|DEMO`,
      active: true, outstandingDues: 0,
    };
    setStudents(prev => [...prev, s]);
    setAdding(false); setNewName(''); setNewId(''); setNewProg('');
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="Search students…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1" />
        <Btn variant="primary" onClick={() => setAdding(v => !v)}>+ Add</Btn>
      </div>

      {adding && (
        <Card className="border-blue-500/30 space-y-3">
          <SectionTitle>Add New Student</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Full Name" value={newName} onChange={e => setNewName(e.target.value)} />
            <Input placeholder="Student ID (e.g. VIT2024001)" value={newId} onChange={e => setNewId(e.target.value)} />
            <Input placeholder="Program (e.g. B.Tech CSE)" value={newProg} onChange={e => setNewProg(e.target.value)} className="col-span-2" />
          </div>
          <div className="flex gap-2">
            <Btn variant="success" onClick={addStudent}>Add Student</Btn>
            <Btn variant="ghost" onClick={() => setAdding(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {filtered.map(s => {
          const trips = transactions.filter(t => t.studentId === s.id && t.status === 'COMPLETED').length;
          return (
            <Card key={s.id} className={!s.active ? 'opacity-50' : ''}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600/30 to-cyan-600/30 flex items-center justify-center font-bold text-blue-400 shrink-0">
                  {s.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{s.name}</p>
                    {!s.active && <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-mono">DEACTIVATED</span>}
                    {s.outstandingDues > 0 && <span className="text-[9px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded font-mono">₹{s.outstandingDues} DUE</span>}
                  </div>
                  <p className="text-xs text-slate-500 font-mono">{s.id} · {s.program} · Wallet ₹{s.walletBalance} · {trips} trips</p>
                </div>
                <Btn
                  variant={s.active ? 'danger' : 'ghost'}
                  className="text-xs"
                  onClick={() => setStudents(prev => prev.map(st => st.id === s.id ? { ...st, active: !st.active } : st))}
                >
                  {s.active ? 'Deactivate' : 'Activate'}
                </Btn>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Admin: Drivers Tab ────────────────────────────────────────────────────────

function AdminDrivers() {
  const { drivers, setDrivers, shuttles } = useApp();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  function addDriver() {
    if (!newName) return;
    const d: Driver = { id: 'DRV-' + uid(), name: newName, phone: newPhone, assignedShuttleId: null, active: true, status: 'OFF_DUTY' };
    setDrivers(prev => [...prev, d]);
    setAdding(false); setNewName(''); setNewPhone('');
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Btn variant="primary" onClick={() => setAdding(v => !v)}>+ Add Driver</Btn>
      </div>

      {adding && (
        <Card className="border-blue-500/30 space-y-3">
          <SectionTitle>Add New Driver</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Full Name" value={newName} onChange={e => setNewName(e.target.value)} />
            <Input placeholder="Phone Number" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Btn variant="success" onClick={addDriver}>Add Driver</Btn>
            <Btn variant="ghost" onClick={() => setAdding(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {drivers.map(d => {
          const shuttle = shuttles.find(s => s.driverId === d.id);
          return (
            <Card key={d.id} className={!d.active ? 'opacity-50' : ''}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600/30 to-teal-600/30 flex items-center justify-center font-bold text-emerald-400 shrink-0">
                  {d.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{d.name}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono border ${d.status === 'ON_DUTY' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-500/10 text-slate-500 border-slate-600/30'}`}>
                      {d.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{d.id} · {d.phone} · {shuttle ? `Assigned: ${shuttle.id}` : 'No shuttle assigned'}</p>
                </div>
                <div className="flex gap-1.5">
                  <select
                    className="bg-[#0a0e1a] border border-[#1e2d45] text-slate-400 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500"
                    value={d.assignedShuttleId ?? ''}
                    onChange={e => setDrivers(prev => prev.map(dr => dr.id === d.id ? { ...dr, assignedShuttleId: e.target.value || null } : dr))}
                  >
                    <option value="">No Shuttle</option>
                    {shuttles.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                  </select>
                  <Btn
                    variant={d.active ? 'danger' : 'ghost'}
                    className="text-xs"
                    onClick={() => setDrivers(prev => prev.map(dr => dr.id === d.id ? { ...dr, active: !dr.active } : dr))}
                  >
                    {d.active ? 'Remove' : 'Restore'}
                  </Btn>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Admin: Shuttles Tab ───────────────────────────────────────────────────────

function AdminShuttles() {
  const { shuttles, setShuttles, drivers } = useApp();
  const [adding, setAdding] = useState(false);
  const [newId, setNewId] = useState('');
  const [newRoute, setNewRoute] = useState('');

  const STATUS_STYLE: Record<string, string> = {
    AVAILABLE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    ACTIVE:    'bg-blue-500/15 text-blue-300 border-blue-500/40',
    OFFLINE:   'bg-slate-500/15 text-slate-400 border-slate-600/40',
  };

  function addShuttle() {
    if (!newId || !newRoute) return;
    const s: Shuttle = { id: newId, route: newRoute, capacity: 40, driverId: null, status: 'AVAILABLE', active: true };
    setShuttles(prev => [...prev, s]);
    setAdding(false); setNewId(''); setNewRoute('');
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Btn variant="primary" onClick={() => setAdding(v => !v)}>+ Add Shuttle</Btn>
      </div>

      {adding && (
        <Card className="border-blue-500/30 space-y-3">
          <SectionTitle>Add New Shuttle</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Shuttle ID (e.g. SH-15)" value={newId} onChange={e => setNewId(e.target.value)} />
            <Input placeholder="Route description" value={newRoute} onChange={e => setNewRoute(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Btn variant="success" onClick={addShuttle}>Add Shuttle</Btn>
            <Btn variant="ghost" onClick={() => setAdding(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {shuttles.map(s => {
          const driver = drivers.find(d => d.id === s.driverId);
          return (
            <Card key={s.id} className={!s.active ? 'opacity-50' : ''}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-display font-bold text-white">{s.id}</p>
                    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${STATUS_STYLE[s.status]}`}>{s.status}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{s.route}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Capacity: {s.capacity} · Driver: {driver?.name ?? 'Unassigned'}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <select
                    className="bg-[#0a0e1a] border border-[#1e2d45] text-slate-400 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500"
                    value={s.driverId ?? ''}
                    onChange={e => setShuttles(prev => prev.map(sh => sh.id === s.id ? { ...sh, driverId: e.target.value || null } : sh))}
                  >
                    <option value="">No Driver</option>
                    {drivers.filter(d => d.active).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <select
                    className="bg-[#0a0e1a] border border-[#1e2d45] text-slate-400 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500"
                    value={s.status}
                    onChange={e => setShuttles(prev => prev.map(sh => sh.id === s.id ? { ...sh, status: e.target.value as Shuttle['status'] } : sh))}
                    disabled={s.status === 'ACTIVE'}
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="OFFLINE">OFFLINE</option>
                    {s.status === 'ACTIVE' && <option value="ACTIVE">ACTIVE</option>}
                  </select>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Admin: Transactions Tab ───────────────────────────────────────────────────

function AdminTransactions() {
  const { transactions, students, shuttles, drivers } = useApp();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="text-[10px] font-mono text-slate-500 border-b border-[#1e2d45] uppercase tracking-wider">
            <th className="text-left py-2 pr-3">TXN ID</th>
            <th className="text-left py-2 pr-3">Student</th>
            <th className="text-left py-2 pr-3">Shuttle</th>
            <th className="text-left py-2 pr-3">Driver</th>
            <th className="text-left py-2 pr-3">Amount</th>
            <th className="text-left py-2 pr-3">Time</th>
            <th className="text-left py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {[...transactions].reverse().map(t => {
            const driver = drivers.find(d => d.id === t.driverId);
            return (
              <tr key={t.id} className="border-b border-[#1e2d45]/50 last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 pr-3 font-mono text-[10px] text-slate-500">{t.id}</td>
                <td className="py-2.5 pr-3 text-white font-medium">{t.studentName}</td>
                <td className="py-2.5 pr-3 text-slate-400">{t.shuttleId}</td>
                <td className="py-2.5 pr-3 text-slate-400">{driver?.name ?? '—'}</td>
                <td className="py-2.5 pr-3 font-mono text-slate-300">₹{t.amount}</td>
                <td className="py-2.5 pr-3 text-slate-500 text-xs whitespace-nowrap">{fmtFull(t.timestamp)}</td>
                <td className="py-2.5"><Badge status={t.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Admin: Overview Tab ───────────────────────────────────────────────────────

function AdminOverview() {
  const { transactions, students, shuttles, activity, tripSessions } = useApp();

  const completed = transactions.filter(t => t.status === 'COMPLETED').length;
  const outstanding = transactions.filter(t => t.status === 'OUTSTANDING').length;
  const revenue = completed * SHUTTLE_FARE;
  const activeShuttles = shuttles.filter(s => s.status === 'ACTIVE').length;

  const ACTIVITY_ICONS: Record<ActivityEvent['type'], string> = {
    boarding: '🚶', trip: '🚌', payment: '💳', system: '⚙️',
  };
  const ACTIVITY_COLORS: Record<ActivityEvent['type'], string> = {
    boarding: 'text-blue-400', trip: 'text-emerald-400', payment: 'text-cyan-400', system: 'text-slate-400',
  };

  // Hourly demand from actual trip sessions + initial data
  const hourlyData = Array.from({ length: 12 }, (_, i) => {
    const h = i + 8;
    const label = h <= 12 ? `${h} AM` : `${h - 12} PM`;
    const count = tripSessions.filter(s => new Date(s.startedAt).getHours() === h).reduce((a, s) => a + s.passengerCount, 0);
    const seed = [12, 28, 18, 9, 22, 31, 14, 11, 38, 44, 29, 16][i];
    return { label, value: count + seed };
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Trips" value={transactions.length} />
        <StatCard label="Fare Collected" value={`₹${revenue}`} color="text-cyan-400" />
        <StatCard label="Active Shuttles" value={activeShuttles} color={activeShuttles > 0 ? 'text-emerald-400' : 'text-white'} />
        <StatCard label="Outstanding" value={`₹${outstanding * SHUTTLE_FARE}`} color={outstanding > 0 ? 'text-orange-400' : 'text-white'} />
      </div>

      <Card>
        <SectionTitle>Passenger Demand · Today</SectionTitle>
        <BarChart data={hourlyData} />
        <p className="text-[10px] text-slate-700 italic mt-2 text-right">Simulated baseline + live data</p>
      </Card>

      <Card>
        <SectionTitle>Live Activity Feed</SectionTitle>
        <div className="space-y-0 max-h-64 overflow-y-auto">
          {[...activity].reverse().map(e => (
            <div key={e.id} className="flex items-start gap-3 py-2.5 border-b border-[#1e2d45] last:border-0">
              <span className="text-base shrink-0">{ACTIVITY_ICONS[e.type]}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${ACTIVITY_COLORS[e.type]}`}>{e.message}</p>
                <p className="text-[10px] text-slate-600 font-mono">{fmtFull(e.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Shuttle Utilization</SectionTitle>
        <div className="space-y-3">
          {shuttles.map(s => {
            const sTxns = transactions.filter(t => t.shuttleId === s.id);
            const success = sTxns.filter(t => t.status === 'COMPLETED').length;
            const rate = sTxns.length > 0 ? Math.round((success / sTxns.length) * 100) : 0;
            return (
              <div key={s.id} className="flex items-center gap-3">
                <span className="font-mono text-sm text-blue-400 w-14 shrink-0">{s.id}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{sTxns.length} passengers</span>
                    <span>{rate}% paid</span>
                  </div>
                  <div className="h-1.5 bg-[#1e2d45] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all" style={{ width: `${rate}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────

function AdminDashboard() {
  type AdminTab = 'overview' | 'students' | 'drivers' | 'shuttles' | 'transactions';
  const [tab, setTab] = useState<AdminTab>('overview');
  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'students', label: 'Students', icon: '🎓' },
    { id: 'drivers', label: 'Drivers', icon: '🚍' },
    { id: 'shuttles', label: 'Shuttles', icon: '🗺' },
    { id: 'transactions', label: 'Transactions', icon: '💳' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold font-display text-white">Admin Dashboard</h2>
        <p className="text-sm text-slate-400">Transportation Control Centre · VIT SmartShuttle</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111827] border border-[#1e2d45] rounded-xl p-1 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.id ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <AdminOverview />}
      {tab === 'students' && <AdminStudents />}
      {tab === 'drivers' && <AdminDrivers />}
      {tab === 'shuttles' && <AdminShuttles />}
      {tab === 'transactions' && <Card><AdminTransactions /></Card>}
    </div>
  );
}

// ── Role Selection ────────────────────────────────────────────────────────────

function RoleSelect({ onSelect }: { onSelect: (role: Role, subId?: string) => void }) {
  const { students } = useApp();
  const [studentId, setStudentId] = useState(students[0].id);
  const [driverView, setDriverView] = useState(false);

  const ROLES = [
    { role: 'student' as Role, icon: '🎓', title: 'Student', desc: 'View wallet, QR ID & trip status', color: 'from-blue-600 to-blue-800' },
    { role: 'driver' as Role, icon: '🚍', title: 'Driver', desc: 'Scan IDs, manage trips & fares', color: 'from-emerald-600 to-emerald-800' },
    { role: 'admin' as Role, icon: '📊', title: 'Admin', desc: 'Control centre — analytics & audit', color: 'from-violet-600 to-violet-800' },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0e1a] px-4 py-12">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center text-2xl shadow-lg shadow-blue-500/30">🚌</div>
          <span className="font-display font-bold text-3xl text-white tracking-tight">VIT SmartShuttle</span>
        </div>
        <p className="text-slate-400 text-sm">Offline-first campus transit fare management</p>
        <p className="text-slate-700 text-xs mt-1 italic">Hackathon prototype · Not connected to real VIT systems</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        {ROLES.map(({ role, icon, title, desc, color }) => (
          <button
            key={role}
            onClick={() => { if (role !== 'student') onSelect(role); }}
            className="group bg-[#111827] border border-[#1e2d45] hover:border-blue-500/40 rounded-2xl p-6 text-left transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10"
            onDoubleClick={() => role !== 'student' && onSelect(role)}
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-2xl mb-4 shadow-md`}>{icon}</div>
            <p className="font-display font-bold text-white text-lg">{title}</p>
            <p className="text-sm text-slate-400 mt-1">{desc}</p>
            {role === 'student' && (
              <div className="mt-3 space-y-2" onClick={e => e.stopPropagation()}>
                <select
                  className="w-full bg-[#0a0e1a] border border-[#1e2d45] text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500"
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                >
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button
                  onClick={() => onSelect('student', studentId)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
                >
                  Enter as Student →
                </button>
              </div>
            )}
            {role !== 'student' && (
              <p className="text-xs text-blue-400 mt-3 font-medium group-hover:text-blue-300">Enter dashboard →</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────

export default function App() {
  const [students, setStudents] = useState(INITIAL_STUDENTS);
  const [drivers, setDrivers] = useState(INITIAL_DRIVERS);
  const [shuttles, setShuttles] = useState(INITIAL_SHUTTLES);
  const [boardings, setBoardings] = useState<Boarding[]>([]);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [tripSessions, setTripSessions] = useState<TripSession[]>([]);
  const [activity, setActivity] = useState(INITIAL_ACTIVITY);
  const [online, setOnline] = useState(true);

  const [role, setRole] = useState<Role | null>(null);
  const [activeStudentId, setActiveStudentId] = useState<string>(INITIAL_STUDENTS[0].id);

  const addActivity = useCallback((msg: string, type: ActivityEvent['type']) => {
    setActivity(prev => [...prev, { id: 'ACT-' + uid(), timestamp: new Date(), message: msg, type }]);
  }, []);

  const ctx: AppCtxType = {
    students, drivers, shuttles, boardings, transactions, tripSessions, activity, online,
    setStudents, setDrivers, setShuttles, setBoardings, setTransactions, setTripSessions, setActivity, setOnline,
    addActivity,
  };

  function handleRoleSelect(r: Role, subId?: string) {
    if (r === 'student' && subId) setActiveStudentId(subId);
    setRole(r);
  }

  const activeStudent = students.find(s => s.id === activeStudentId) ?? students[0];
  const activeDriver = drivers.find(d => d.status === 'ON_DUTY' && d.active) ?? drivers[0];

  return (
    <AppCtx.Provider value={ctx}>
      {!role ? (
        <RoleSelect onSelect={handleRoleSelect} />
      ) : (
        <div className="min-h-screen bg-[#0a0e1a]">
          {/* Topbar */}
          <header className="sticky top-0 z-20 bg-[#0a0e1a]/90 backdrop-blur border-b border-[#1e2d45] px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center text-sm">🚌</div>
              <span className="font-display font-bold text-white">VIT SmartShuttle</span>
              <span className="hidden sm:inline text-slate-600 text-xs">/ {role.charAt(0).toUpperCase() + role.slice(1)}</span>
            </div>
            <div className="flex items-center gap-2">
              {role === 'student' && (
                <select
                  className="bg-[#111827] border border-[#1e2d45] text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500"
                  value={activeStudentId}
                  onChange={e => setActiveStudentId(e.target.value)}
                >
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
              <Btn variant="ghost" className="text-xs" onClick={() => setRole(null)}>Switch Role</Btn>
            </div>
          </header>

          <main className="max-w-3xl mx-auto px-4 py-6">
            {role === 'student' && <StudentDashboard student={activeStudent} />}
            {role === 'driver' && <DriverDashboard driver={activeDriver} />}
            {role === 'admin' && <AdminDashboard />}
          </main>
        </div>
      )}
    </AppCtx.Provider>
  );
}
