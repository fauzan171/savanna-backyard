# Savanna Bromo Rental — Landing Page API Documentation

**Base URL:** `https://savanna-backyard.andifauzan986.workers.dev/api/v1`
**Auth:** Semua request wajib header `X-API-Key: savanna-dev-api-key-2026`
**Content-Type:** `application/json`

---

## Daftar Isi

1. [Sistem Sewa 12 Jam (terbaru)](#1-sistem-sewa-12-jam-terbaru)
2. [Daftar Semua Endpoint](#2-daftar-semua-endpoint)
3. [Vehicles — Katalog & Detail Motor](#3-vehicles--katalog--detail-motor)
4. [Availability — Cek Ketersediaan](#4-availability--cek-ketersediaan)
5. [Barcode/QR Vehicle Scan](#5-barcodeqr-vehicle-scan)
6. [Equipment — Katalog Peralatan](#6-equipment--katalog-peralatan)
7. [Booking — Buat Sewa](#7-booking--buat-sewa)
8. [Booking Status — Cek Status Booking](#8-booking-status--cek-status-booking)
9. [Packages, Pricing, Reviews, Trails](#9-packages-pricing-reviews-trails)
10. [Settings — Konfigurasi Website](#10-settings--konfigurasi-website)
11. [Leads — Submit Inquiry](#11-leads--submit-inquiry)
12. [Notifikasi & Alert](#12-notifikasi--alert)
13. [FE Environment Variables](#13-fe-environment-variables)
14. [Contoh Fetch Lengkap](#14-contoh-fetch-lengkap)

---

## 1. Sistem Sewa 12 Jam (terbaru)

**Mulai Juni 2026**, sistem sewa motor di Savanna Bromo sudah berubah dari **harian** menjadi **per-12-jam (block)**.

### Bagaimana cara kerjanya?

| Konsep | Penjelasan |
|---|---|
| **1 Block** | 12 jam |
| **Minimal sewa** | 1 block (12 jam) |
| **Harga** | `dailyRateIdr` sekarang artinya **harga per 12 jam** |
| **Con toh** | Rental 12 jam = `dailyRateIdr × 1`<br>Rental 24 jam = `dailyRateIdr × 2`<br>Rental 36 jam = `dailyRateIdr × 3` |
| **Telat** | Denda per jam = `(dailyRateIdr / 12) × 1.5` |

### Contoh Kasus

**Contoh 1 — Sewa 12 jam:**
```
Motor: Honda CRF 150L
Harga/block: Rp 200.000
Start: 2026-06-28T02:00:00+07:00  (jam 2 pagi)
End:   2026-06-28T14:00:00+07:00  (jam 2 siang)
Durasi: 12 jam = 1 block
Total:  Rp 200.000 × 1 = Rp 200.000
```

**Contoh 2 — Sewa lebih dari 12 jam:**
```
Motor: Honda CRF 150L
Harga/block: Rp 200.000
Start: 2026-06-28T02:00:00+07:00  (jam 2 pagi)
End:   2026-06-29T15:00:00+07:00  (jam 3 sore keesokan hari)
Durasi: 37 jam = ceil(37/12) = 4 blocks
Total:  Rp 200.000 × 4 = Rp 800.000
```

**Contoh 3 — Telat:**
```
Motor: Honda CRF 150L
End seharusnya: 2026-06-28T14:00:00+07:00
Balik aktual:   2026-06-28T17:30:00+07:00  (3.5 jam telat)
Telat: 4 jam
Denda: 4 × (200.000/12) × 1.5 = 4 × Rp 16.667 × 1.5 = Rp 100.000
```

### Format Tanggal di API

Semua endpoint booking sekarang menerima **ISO 8601 datetime string** (termasuk jam):

```
"2026-06-28T02:00:00+07:00"
```

Jika hanya kirim tanggal (tanpa jam), default:
- `startDate`: jam `00:00` UTC
- `endDate`: jam `23:59` UTC

---

## 2. Daftar Semua Endpoint

| # | Method | Endpoint | Deskripsi |
|---|--------|----------|-----------|
| 1 | GET | `/public/vehicles` | List semua kendaraan |
| 2 | GET | `/public/vehicles/:id` | Detail satu kendaraan |
| 3 | GET | `/public/vehicles/by-code/:code` | Detail motor by QR/barcode scan |
| 4 | GET | `/public/vehicles/:id/availability` | Kalender ketersediaan per bulan |
| 5 | GET | `/public/availability` | Cek ketersediaan by tanggal |
| 6 | GET | `/public/equipment` | List semua peralatan |
| 7 | GET | `/public/equipment/:id` | Detail satu peralatan |
| 8 | GET | `/public/packages` | List paket tour |
| 9 | GET | `/public/pricing` | List tier harga |
| 10 | GET | `/public/reviews` | List review/testimoni |
| 11 | GET | `/public/trails` | List trail/rute |
| 12 | GET | `/public/trails/:trailId` | Detail trail + blog content |
| 13 | GET | `/public/settings` | Konfigurasi website |
| 14 | POST | `/public/bookings` | Buat booking baru |
| 15 | GET | `/public/bookings/:bookingNumber/status` | Cek status booking |
| 16 | POST | `/public/leads` | Submit inquiry/contact form |

---

## 3. Vehicles — Katalog & Detail Motor

### 3.1 GET `/public/vehicles`

List semua kendaraan tersedia.

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "6080faa7-44e7-422e-93b2-236c9fa4ab6f",
      "name": "Honda CRF 150L",
      "type": "TrailBike",
      "category": "150cc Trail",
      "image": "https://savanna-backyard.andifauzan986.workers.dev/images/bike_crf150.jpg",
      "dailyRateIdr": 200000,
      "specs": {
        "engine": "149.15 cc",
        "power": "12.4 HP",
        "weight": "122 kg",
        "seat": "865 mm"
      },
      "description": "A real Indonesian dual-sport favorite...",
      "available": true
    }
  ]
}
```

**Catatan:**
- `image` — full URL (absolute), bisa langsung dipakai di `<img src="...">`
- `dailyRateIdr` — harga **per 12 jam** dalam Rupiah
- `available` — `true` kalau motor status `Available`
- `type` — enum: `TrailBike`, `StreetBike`, `Car`, `Jeep`, `Other`

### 3.2 GET `/public/vehicles/:id`

Detail satu kendaraan.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "6080faa7-44e7-422e-93b2-236c9fa4ab6f",
    "name": "Honda CRF 150L",
    "type": "TrailBike",
    "brand": "Honda",
    "model": "CRF 150L",
    "year": 2024,
    "dailyRate": 200000,
    "photoUrl": "https://savanna-backyard.andifauzan986.workers.dev/images/bike_crf150.jpg",
    "specifications": {
      "description": null
    }
  }
}
```

### 3.3 GET `/public/vehicles/:id/availability`

Kalender ketersediaan per bulan untuk satu motor. Cocok untuk **detail page motor** yang menampilkan tanggal mana yang available / booked.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `month` | string | Ya | `YYYY-MM` |

**Contoh:** `GET /public/vehicles/:id/availability?month=2026-07`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "vehicleId": "6080faa7-44e7-422e-93b2-236c9fa4ab6f",
    "month": "2026-07",
    "availableDates": ["2026-07-01","2026-07-02","2026-07-05","2026-07-06"],
    "bookedDates": ["2026-07-03","2026-07-04","2026-07-07"]
  }
}
```

---

## 4. Availability — Cek Ketersediaan

### GET `/public/availability`

Cari motor yang tersedia di rentang tanggal/waktu tertentu.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `startDate` | string | Ya | ISO 8601 datetime, e.g. `2026-06-28T06:00:00+07:00` |
| `endDate` | string | Ya | ISO 8601 datetime |
| `type` | string | Tidak | `TrailBike`, `StreetBike`, `Car`, `Jeep`, `Other` |

**Contoh:** `GET /public/availability?startDate=2026-06-28T02:00:00%2B07:00&endDate=2026-06-28T14:00:00%2B07:00`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "requestedPeriod": {
      "startDate": "2026-06-28T02:00:00+07:00",
      "endDate": "2026-06-28T14:00:00+07:00"
    },
    "availableVehicles": [
      {
        "id": "6080faa7-44e7-422e-93b2-236c9fa4ab6f",
        "name": "Honda CRF 150L",
        "type": "TrailBike",
        "dailyRateIdr": 200000,
        "photoUrl": "https://savanna-backyard.andifauzan986.workers.dev/images/bike_crf150.jpg"
      }
    ],
    "unavailableVehicles": [],
    "totalAvailable": 1
  }
}
```

---

## 5. Barcode/QR Vehicle Scan

### 5.1 GET `/public/vehicles/by-code/:code`

Setiap motor di Savanna Bromo memiliki **QR code stiker** dengan format `SVN:{vehicleId}`.
Endpoint ini digunakan **setelah user/client scan QR code** di landing page untuk melihat identitas motor.

**Cara pakai:**
1. User scan QR code motor → dapat string `SVN:6080faa7-44e7-422e-93b2-236c9fa4ab6f`
2. Panggil `GET /public/vehicles/by-code/SVN:6080faa7-44e7-422e-93b2-236c9fa4ab6f`
3. Tampilkan detail motor + tombol "Book This Motor"

**Contoh:** `GET /public/vehicles/by-code/SVN%3A6080faa7-44e7-422e-93b2-236c9fa4ab6f`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "6080faa7-44e7-422e-93b2-236c9fa4ab6f",
    "name": "Honda CRF 150L",
    "type": "TrailBike",
    "brand": "Honda",
    "model": "CRF 150L",
    "year": 2024,
    "category": "150cc Trail",
    "plateNumber": "N 1234 XY",
    "dailyRateIdr": 200000,
    "image": "https://savanna-backyard.andifauzan986.workers.dev/images/bike_crf150.jpg",
    "specs": {
      "engine": "149.15 cc",
      "power": "12.4 HP",
      "weight": "122 kg"
    },
    "description": "A real Indonesian dual-sport favorite...",
    "available": true,
    "displayName": "Honda CRF 150L"
  }
}
```

**Response 404 (QR tidak dikenal):**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Vehicle not found for this code"
  }
}
```

---

## 6. Equipment — Katalog Peralatan

### 6.1 GET `/public/equipment`

List semua peralatan yang bisa disewa tambahan.

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "equip-uuid-1",
      "name": "Helm Offroad",
      "category": "Safety",
      "description": "Helm full-face standar untuk trail riding",
      "dailyRateIdr": 30000,
      "image": "https://savanna-backyard.andifauzan986.workers.dev/images/helm_offroad.jpg",
      "stock": 15,
      "minRentalDays": 1
    },
    {
      "id": "equip-uuid-2",
      "name": "Sarung Tangan",
      "category": "Safety",
      "description": "Sarung tangan offroad dengan proteksi knuckle",
      "dailyRateIdr": 15000,
      "image": null,
      "stock": 20,
      "minRentalDays": 1
    },
    {
      "id": "equip-uuid-3",
      "name": "Action Camera GoPro",
      "category": "Camera",
      "description": "GoPro Hero 11 dengan mounting",
      "dailyRateIdr": 75000,
      "image": "https://savanna-backyard.andifauzan986.workers.dev/images/gopro.jpg",
      "stock": 5,
      "minRentalDays": 1
    }
  ]
}
```

### 6.2 GET `/public/equipment/:id`

Detail satu peralatan.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "equip-uuid-1",
    "name": "Helm Offroad",
    "category": "Safety",
    "description": "Helm full-face standar untuk trail riding",
    "dailyRateIdr": 30000,
    "image": "https://savanna-backyard.andifauzan986.workers.dev/images/helm_offroad.jpg",
    "stock": 15,
    "minRentalDays": 1
  }
}
```

---

## 7. Booking — Buat Sewa

### POST `/public/bookings`

Buat booking baru dari landing page.

**Request Body:**

```json
{
  "vehicleId": "6080faa7-44e7-422e-93b2-236c9fa4ab6f",
  "startDate": "2026-06-28T02:00:00+07:00",
  "endDate": "2026-06-28T14:00:00+07:00",
  "customerName": "Ahmad Rizki",
  "customerPhone": "+6281234567890",
  "customerEmail": "ahmad@email.com",
  "notes": "Minta full riding gear lengkap"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `vehicleId` | string | Ya | UUID motor |
| `startDate` | string | Ya | ISO 8601 datetime (termasuk jam & timezone) |
| `endDate` | string | Ya | ISO 8601 datetime (harus > startDate, durasi min 1 block/12 jam) |
| `customerName` | string | Ya | Min 2 karakter |
| `customerPhone` | string | Ya | Min 10 karakter |
| `customerEmail` | string | Tidak | Format email valid |
| `notes` | string | Tidak | Max 1000 karakter |

**Response 201:**

```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "bookingId": "8616e081-c40d-480a-be27-3b9d38f04580",
    "bookingNumber": "SM-20260628-XK3M2P",
    "paymentPageUrl": "https://checkout.xendit.co/...",
    "totalAmount": 200000
  }
}
```

**Catatan:**
- `bookingNumber` format: `SM-YYYYMMDD-{6 char random}`
- `paymentPageUrl` — URL halaman pembayaran (Xendit / iFortepay / Midtrans). Redirect user ke URL ini untuk bayar.
- `totalAmount` — harga sudah termasuk kalkulasi 12-jam block.

**Response 400 (motor sudah dibooking):**

```json
{
  "success": false,
  "message": "Vehicle is already booked for the selected dates",
  "error": {
    "code": "CONFLICT_ERROR",
    "message": "Vehicle is not available for the selected dates"
  }
}
```

**Response 400 (tanggal tidak valid):**

```json
{
  "success": false,
  "message": "End date must be after start date",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "End date must be after start date"
  }
}
```

---

## 8. Booking Status — Cek Status Booking

### GET `/public/bookings/:bookingNumber/status`

Digunakan user untuk mengecek status booking-nya (setelah booking dibuat).

**Contoh:** `GET /public/bookings/SM-20260628-XK3M2P/status`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "bookingNumber": "SM-20260628-XK3M2P",
    "status": "Confirmed",
    "paymentStatus": "settlement",
    "vehicleName": "Honda CRF 150L",
    "startDate": "2026-06-28T02:00:00+07:00",
    "endDate": "2026-06-28T14:00:00+07:00",
    "totalAmount": 200000,
    "paidAt": "2026-06-27T22:15:00.000Z"
  }
}
```

**Booking Status Values:**
`Pending`, `Confirmed`, `Active`, `Completed`, `Cancelled`

**Payment Status Values:**
`pending`, `settlement`, `deny`, `expire`, `cancel`, `refund`

---

## 9. Packages, Pricing, Reviews, Trails

Endpoint ini tidak berubah dari dokumentasi sebelumnya. Lihat file `CONTRACT_API_PUBLIC.md` untuk detail lengkap.

- `GET /public/packages` — list paket tour
- `GET /public/pricing` — list tier harga
- `GET /public/reviews` — list review/testimoni
- `GET /public/trails` — list trail/rute
- `GET /public/trails/:trailId` — detail trail + blog

---

## 10. Settings — Konfigurasi Website

### GET `/public/settings`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "contactEmail": "hello@savannabromo.com",
    "contactPhone": "+6281234567890",
    "whatsappNumber": "6281234567890",
    "location": "Malang, East Java",
    "instagramUrl": "https://instagram.com/savannabromorental",
    "bankAccount": {
      "bankName": "BCA",
      "accountNumber": "315 089 1234",
      "accountHolder": "Savanna Bromo Rental"
    },
    "deposit": {
      "amount": 500000,
      "description": "Fully refundable"
    }
  }
}
```

---

## 11. Leads — Submit Inquiry

### POST `/public/leads`

**Request:**

```json
{
  "name": "Sarah Chen",
  "phone": "+6281234567890",
  "email": "sarah@email.com",
  "message": "Saya tertarik rental untuk 2 orang",
  "source": "Website",
  "preferredDates": {
    "start": "2026-06-15",
    "end": "2026-06-15",
    "vehicleInterest": "TrailBike"
  }
}
```

**Response 201:**

```json
{
  "success": true,
  "message": "Lead submitted successfully",
  "data": {
    "id": "52b76a57-bfcb-449f-86a6-91361ffc880f",
    "status": "New",
    "createdAt": "2026-06-01T19:44:31.534Z"
  }
}
```

---

## 12. Notifikasi & Alert

Sistem mengirimkan notifikasi email otomatis ke user:

| Jenis | Trigger | Isi |
|-------|---------|-----|
| **H-1 Reminder** | Setiap jam 05:00 WIB, 1 hari sebelum booking | Waktu pickup, lokasi, nama motor, booking number |
| **H-1 Hour Reminder** | Setiap jam, 1 jam sebelum startDate | Reminder pickup dalam 1 jam |
| **Follow-up** | 1 hari setelah endDate | Ucapan terima kasih + link review |

**Catatan untuk FE:**
- Email dikirim otomatis oleh backend (cron job Cloudflare Workers)
- Tidak perlu handling dari FE kecuali menampilkan pesan di UI "Kamu akan menerima email reminder H-1 sebelum rental dimulai" setelah booking sukses
- Link review: `GET /public/settings` belum mengembalikan `reviewUrl`. Untuk saat ini hardcoded ke `https://savannabromo.com/review?booking={bookingNumber}`

---

## 13. FE Environment Variables

```env
VITE_API_URL=https://savanna-backyard.andifauzan986.workers.dev/api/v1
VITE_API_KEY=savanna-dev-api-key-2026
```

---

## 14. Contoh Fetch Lengkap

### TypeScript Helper

```ts
const API_URL = import.meta.env.VITE_API_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

function apiHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  };
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: apiHeaders() });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  const body = await res.json();
  if (!body.success) throw new Error(body.error?.message ?? body.message);
  return body.data;
}

async function apiPost<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  const body = await res.json();
  if (!body.success) throw new Error(body.error?.message ?? body.message);
  return body.data;
}
```

### 1. List Vehicles

```ts
interface Vehicle {
  id: string;
  name: string;
  type: string;
  category: string;
  image: string;
  dailyRateIdr: number;
  specs: Record<string, string>;
  description: string;
  available: boolean;
}

const vehicles = await apiGet<Vehicle[]>('/public/vehicles');
```

### 2. Cek Availability

```ts
interface AvailabilityResult {
  requestedPeriod: { startDate: string; endDate: string };
  availableVehicles: { id: string; name: string; type: string; dailyRateIdr: number; photoUrl: string }[];
  unavailableVehicles: { id: string; name: string; reason: string }[];
  totalAvailable: number;
}

const avail = await apiGet<AvailabilityResult>(
  `/public/availability?startDate=2026-06-28T02:00:00%2B07:00&endDate=2026-06-28T14:00:00%2B07:00`
);
```

### 3. Scan QR Motor

```ts
interface VehicleDetail {
  id: string;
  name: string;
  type: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  plateNumber: string;
  dailyRateIdr: number;
  image: string;
  specs: Record<string, string> | null;
  description: string | null;
  available: boolean;
  displayName: string;
}

// Setelah user scan QR, dapat string "SVN:6080faa7-44e7-422e-93b2-236c9fa4ab6f"
const qrCode = "SVN:6080faa7-44e7-422e-93b2-236c9fa4ab6f";
const vehicle = await apiGet<VehicleDetail>(`/public/vehicles/by-code/${encodeURIComponent(qrCode)}`);

// Tampilkan detail motor, lalu tombol "Book This Motor" mengarah ke booking
```

### 4. List Equipment

```ts
interface Equipment {
  id: string;
  name: string;
  category: string;
  description: string | null;
  dailyRateIdr: number;
  image: string | null;
  stock: number;
  minRentalDays: number;
}

const equipment = await apiGet<Equipment[]>('/public/equipment');
```

### 5. Create Booking

```ts
interface BookingResult {
  bookingId: string;
  bookingNumber: string;
  paymentPageUrl: string | null;
  totalAmount: number;
}

const startDate = '2026-06-28T02:00:00+07:00'; // jam 2 pagi
const endDate = '2026-06-28T14:00:00+07:00';   // jam 2 siang (12 jam = 1 block)

const booking = await apiPost<BookingResult>('/public/bookings', {
  vehicleId: '6080faa7-44e7-422e-93b2-236c9fa4ab6f',
  startDate,
  endDate,
  customerName: 'Ahmad Rizki',
  customerPhone: '+6281234567890',
  customerEmail: 'ahmad@email.com',
  notes: 'Minta helm size M',
});

// Redirect user ke paymentPageUrl
window.location.href = booking.paymentPageUrl;
```

### 6. Cek Status Booking

```ts
interface BookingStatus {
  bookingNumber: string;
  status: 'Pending' | 'Confirmed' | 'Active' | 'Completed' | 'Cancelled';
  paymentStatus: 'pending' | 'settlement' | 'deny' | 'expire' | 'cancel' | 'refund';
  vehicleName: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  paidAt: string | null;
}

const status = await apiGet<BookingStatus>(`/public/bookings/SM-20260628-XK3M2P/status`);
```

### 7. Submit Lead/Inquiry

```ts
interface LeadResult {
  id: string;
  status: string;
  createdAt: string;
}

const lead = await apiPost<LeadResult>('/public/leads', {
  name: 'Sarah Chen',
  phone: '+6281234567890',
  email: 'sarah@email.com',
  message: 'Saya tertarik rental untuk 2 orang',
  source: 'Website',
  preferredDates: {
    start: '2026-06-15',
    end: '2026-06-15',
    vehicleInterest: 'TrailBike',
  },
});
```

---

## Error Response Format

```json
{
  "success": false,
  "message": "Human readable error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Detail error"
  }
}
```

**HTTP Status Codes:**
| Code | Arti |
|------|------|
| 200 | Sukses |
| 201 | Created |
| 400 | Validasi gagal |
| 401 | API Key salah / tidak ada |
| 404 | Resource tidak ditemukan |
| 409 | Konflik |
| 500 | Server error |

---

## Alur Booking di Landing Page

```
1. User buka landing page → GET /public/vehicles (tampilkan katalog)
2. User klik motor → GET /public/vehicles/:id (tampilkan detail)
   → GET /public/vehicles/:id/availability?month=2026-07 (kalender)
   → GET /public/equipment (opsional: tampilkan add-on equipment)
3. User pilih tanggal & jam → POST /public/bookings
4. User diarahkan ke paymentPageUrl (Xendit/iFortepay/Midtrans)
5. Setelah bayar, user cek status → GET /public/bookings/:bookingNumber/status
6. User terima email H-1 reminder (otomatis dari backend)
7. User datang ke lokasi pickup tepat waktu

Alur QR Scan:
1. User scan QR code di motor (pakai kamera HP)
2. GET /public/vehicles/by-code/{code}
3. Tampilkan detail motor + tombol "Book This Motor"
4. Lanjut ke step 3 di atas
```
