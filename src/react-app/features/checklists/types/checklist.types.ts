// ============================================
// CHECKLIST TYPES
// ============================================

export type ChecklistType = 'pickup' | 'return';

export type ChecklistItems = Record<string, boolean>;

export interface ChecklistResponse {
  id: string;
  bookingId: string;
  vehicleId: string;
  type: ChecklistType;
  items: ChecklistItems;
  kmReading: number;
  fuelLevel: number | null;
  photos: string[];
  notes: string | null;
  damageNotes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistsByBooking {
  pickup: ChecklistResponse | null;
  return: ChecklistResponse | null;
}

// ============================================
// API REQUEST TYPES
// ============================================

export interface CreateChecklistRequest {
  bookingId: string;
  type: ChecklistType;
  items: ChecklistItems;
  kmReading: number;
  fuelLevel?: number | null;
  photos?: string[] | null;
  notes?: string | null;
  damageNotes?: string | null;
}

export interface UpdateChecklistRequest {
  items?: ChecklistItems;
  kmReading?: number;
  fuelLevel?: number | null;
  photos?: string[] | null;
  notes?: string | null;
  damageNotes?: string | null;
}

// ============================================
// CHECKLIST ITEM DEFINITIONS
// ============================================

export const DEFAULT_CHECKLIST_ITEMS = [
  'body_no_scratches',
  'body_no_dents',
  'headlight_working',
  'taillight_working',
  'turn_signals_working',
  'brake_light_working',
  'front_brake_working',
  'rear_brake_working',
  'horn_working',
  'speedometer_working',
  'mirror_left_ok',
  'mirror_right_ok',
  'tire_front_pressure_ok',
  'tire_rear_pressure_ok',
  'tire_front_tread_ok',
  'tire_rear_tread_ok',
  'chain_tension_ok',
  'engine_starts_smoothly',
  'idle_rpm_stable',
  'stnk_present',
  'helmet_provided',
  'raincoat_provided',
  'toolkit_present',
] as const;

export const CHECKLIST_ITEM_LABELS: Record<string, string> = {
  body_no_scratches: 'Body: tidak ada baret',
  body_no_dents: 'Body: tidak ada penyok',
  headlight_working: 'Lampu depan: menyala',
  taillight_working: 'Lampu belakang: menyala',
  turn_signals_working: 'Lampu sein: berfungsi',
  brake_light_working: 'Lampu rem: berfungsi',
  front_brake_working: 'Rem depan: berfungsi',
  rear_brake_working: 'Rem belakang: berfungsi',
  horn_working: 'Klakson: berfungsi',
  speedometer_working: 'Speedometer: berfungsi',
  mirror_left_ok: 'Spion kiri: OK',
  mirror_right_ok: 'Spion kanan: OK',
  tire_front_pressure_ok: 'Ban depan: tekanan OK',
  tire_rear_pressure_ok: 'Ban belakang: tekanan OK',
  tire_front_tread_ok: 'Ban depan: tapak OK',
  tire_rear_tread_ok: 'Ban belakang: tapak OK',
  chain_tension_ok: 'Rantai: tegangan OK',
  engine_starts_smoothly: 'Mesin: hidup lancar',
  idle_rpm_stable: 'RPM idle: stabil',
  stnk_present: 'STNK: ada',
  helmet_provided: 'Helm: diberikan',
  raincoat_provided: 'Jas hujan: diberikan',
  toolkit_present: 'Toolkit: ada',
};

export interface ChecklistCategory {
  label: string;
  items: string[];
}

export const CHECKLIST_CATEGORIES: ChecklistCategory[] = [
  {
    label: 'Body & Exterior',
    items: ['body_no_scratches', 'body_no_dents', 'mirror_left_ok', 'mirror_right_ok'],
  },
  {
    label: 'Lampu & Kelistrikan',
    items: ['headlight_working', 'taillight_working', 'turn_signals_working', 'brake_light_working'],
  },
  {
    label: 'Rem & Ban',
    items: ['front_brake_working', 'rear_brake_working', 'tire_front_pressure_ok', 'tire_rear_pressure_ok', 'tire_front_tread_ok', 'tire_rear_tread_ok'],
  },
  {
    label: 'Mesin & Mekanikal',
    items: ['engine_starts_smoothly', 'idle_rpm_stable', 'chain_tension_ok', 'horn_working', 'speedometer_working'],
  },
  {
    label: 'Aksesoris',
    items: ['stnk_present', 'helmet_provided', 'raincoat_provided', 'toolkit_present'],
  },
];

/** Create default items object with all values set to true */
export function createDefaultItems(): ChecklistItems {
  const items: ChecklistItems = {};
  for (const key of DEFAULT_CHECKLIST_ITEMS) {
    items[key] = true;
  }
  return items;
}
