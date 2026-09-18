export type Role = 'student' | 'driver' | 'admin';
export type TxStatus = 'COMPLETED' | 'OUTSTANDING' | 'PENDING_SYNC' | 'FAILED' | 'CANCELLED';
export type ShuttleStatus = 'AVAILABLE' | 'ACTIVE' | 'OFFLINE';

export interface Student {
  id: string;
  name: string;
  program: string;
  year: number;
  walletBalance: number;
  qrPayload: string;
  active: boolean;
  outstandingDues: number;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  assignedShuttleId: string | null;
  active: boolean;
  status: 'ON_DUTY' | 'OFF_DUTY';
}

export interface Shuttle {
  id: string;
  route: string;
  capacity: number;
  driverId: string | null;
  status: ShuttleStatus;
  active: boolean;
}

export interface Boarding {
  id: string;
  studentId: string;
  shuttleId: string;
  boardedAt: Date;
  tripSessionId: string;
}

export interface Transaction {
  id: string;
  studentId: string;
  studentName: string;
  shuttleId: string;
  driverId: string | null;
  amount: number;
  timestamp: Date;
  status: TxStatus;
  tripSessionId: string;
  synced: boolean;
}

export interface TripSession {
  id: string;
  shuttleId: string;
  driverId: string;
  startedAt: Date;
  endedAt?: Date;
  passengerCount: number;
}

export interface ActivityEvent {
  id: string;
  timestamp: Date;
  message: string;
  type: 'boarding' | 'trip' | 'payment' | 'system';
}

export const SHUTTLE_FARE = 20;

export const INITIAL_STUDENTS: Student[] = [
  { id: 'VIT2021001', name: 'Arjun Sharma', program: 'B.Tech CSE', year: 3, walletBalance: 120, qrPayload: 'VIT|2021001|ARJUN|CSE', active: true, outstandingDues: 0 },
  { id: 'VIT2021056', name: 'Kiran Patel', program: 'B.Tech IT', year: 3, walletBalance: 0, qrPayload: 'VIT|2021056|KIRAN|IT', active: true, outstandingDues: 20 },
  { id: 'VIT2021088', name: 'Priya Nair', program: 'B.Tech ECE', year: 2, walletBalance: 45, qrPayload: 'VIT|2021088|PRIYA|ECE', active: true, outstandingDues: 0 },
  { id: 'VIT2020015', name: 'Rahul Mehta', program: 'M.Tech AI', year: 1, walletBalance: 10, qrPayload: 'VIT|2020015|RAHUL|AI', active: true, outstandingDues: 0 },
  { id: 'VIT2023088', name: 'Sneha Reddy', program: 'B.Tech MECH', year: 1, walletBalance: 200, qrPayload: 'VIT|2023088|SNEHA|MECH', active: true, outstandingDues: 0 },
];

export const INITIAL_DRIVERS: Driver[] = [
  { id: 'DRV-001', name: 'Mohan Kumar', phone: '9876543210', assignedShuttleId: 'SH-07', active: true, status: 'ON_DUTY' },
  { id: 'DRV-002', name: 'Rajan Singh', phone: '9876543211', assignedShuttleId: 'SH-12', active: true, status: 'ON_DUTY' },
  { id: 'DRV-003', name: 'Vijay Das', phone: '9876543212', assignedShuttleId: 'SH-03', active: true, status: 'OFF_DUTY' },
];

export const INITIAL_SHUTTLES: Shuttle[] = [
  { id: 'SH-07', route: 'Main Gate → Tech Tower → Hostel A', capacity: 40, driverId: 'DRV-001', status: 'AVAILABLE', active: true },
  { id: 'SH-12', route: 'Admin Block → Library → Sports Complex', capacity: 35, driverId: 'DRV-002', status: 'AVAILABLE', active: true },
  { id: 'SH-03', route: 'Gate 3 → Academic Block → Cafeteria', capacity: 40, driverId: 'DRV-003', status: 'OFFLINE', active: true },
];

function minsAgo(m: number) { return new Date(Date.now() - m * 60000); }

export const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 'TXN-A001', studentId: 'VIT2021001', studentName: 'Arjun Sharma', shuttleId: 'SH-07', driverId: 'DRV-001', amount: 20, timestamp: minsAgo(90), status: 'COMPLETED', tripSessionId: 'SESS-HIST-1', synced: true },
  { id: 'TXN-A002', studentId: 'VIT2021088', studentName: 'Priya Nair', shuttleId: 'SH-07', driverId: 'DRV-001', amount: 20, timestamp: minsAgo(88), status: 'COMPLETED', tripSessionId: 'SESS-HIST-1', synced: true },
  { id: 'TXN-A003', studentId: 'VIT2021056', studentName: 'Kiran Patel', shuttleId: 'SH-12', driverId: 'DRV-002', amount: 20, timestamp: minsAgo(60), status: 'OUTSTANDING', tripSessionId: 'SESS-HIST-2', synced: true },
];

export const INITIAL_ACTIVITY: ActivityEvent[] = [
  { id: 'ACT-1', timestamp: minsAgo(92), message: 'SH-07 trip started by Mohan Kumar', type: 'trip' },
  { id: 'ACT-2', timestamp: minsAgo(90), message: 'Arjun Sharma boarded SH-07', type: 'boarding' },
  { id: 'ACT-3', timestamp: minsAgo(88), message: 'Priya Nair boarded SH-07', type: 'boarding' },
  { id: 'ACT-4', timestamp: minsAgo(80), message: 'SH-07 trip completed · 2 passengers', type: 'trip' },
  { id: 'ACT-5', timestamp: minsAgo(80), message: '₹20 fare auto-charged to Arjun Sharma', type: 'payment' },
  { id: 'ACT-6', timestamp: minsAgo(80), message: '₹20 fare auto-charged to Priya Nair', type: 'payment' },
  { id: 'ACT-7', timestamp: minsAgo(62), message: 'SH-12 trip started by Rajan Singh', type: 'trip' },
  { id: 'ACT-8', timestamp: minsAgo(60), message: 'Kiran Patel boarded SH-12 · Insufficient balance', type: 'payment' },
  { id: 'ACT-9', timestamp: minsAgo(55), message: 'SH-12 trip completed · ₹20 OUTSTANDING for Kiran Patel', type: 'payment' },
];
