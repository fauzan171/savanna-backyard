# MVP Phase 2: Fitur Operasional Rental
## Product Requirements Document

**Tanggal:** 1 Juni 2026
**Versi:** 1.0
**Status:** Ready for Implementation
**Priority:** MVP — Core Operational Features

---

## Daftar Isi

1. [Overview](#1-overview)
2. [Fitur 1: Inspeksi Kendaraan](#2-inspeksi-kendaraan)
3. [Fitur 2: Deposit System](#3-deposit-system)
4. [Fitur 3: Penalty / Denda](#4-penalty--denda)
5. [Fitur 4: Verifikasi KTP/SIM](#5-verifikasi-ktpsim)
6. [Fitur 5: Surat Perjanjian Sewa](#6-surat-perjanjian-sewa)
7. [Fitur 6: Notifikasi WhatsApp](#7-notifikasi-whatsapp)
8. [Database Schema](#8-database-schema)
9. [API Endpoints](#9-api-endpoints)
10. [CMS Frontend](#10-cms-frontend)
11. [Business Flow End-to-End](#11-business-flow-end-to-end)
12. [Implementation Order](#12-implementation-order)
13. [Environment Variables](#13-environment-variables)

---

## 1. Overview

Dokumen ini mendefinisikan 6 fitur operasional yang menjadi MVP Phase 2 untuk Savanna Bromo Rental. Fitur-fitur ini mengisi gap antara booking creation dan rental completion yang saat ini belum tertangani.

### Masalah yang Dipecahkan

| Masalah | Solusi |
|---------|--------|
| Tidak ada dokumentasi kondisi kendaraan sebelum & sesudah rental | Inspeksi Kendaraan dengan foto + checklist |
| Deposit tidak tertrack, refund manual | Deposit System otomatis |
| Kerusakan, telat, BBM kurang tidak bisa di-charge | Penalty Management |
| Customer tidak terverifikasi identitasnya | Verifikasi KTP/SIM |
| Tidak ada surat perjanjian resmi | Contract Generator + Digital Signature |
| Tidak ada notifikasi ke customer | WhatsApp Notification |

### Booking Lifecycle (Updated)

```
Lead → Booking → Payment → Inspeksi Pre-Rental → Kontrak TTD → Rental Start
                                                                          │
                                                                  Rental Period
                                                                          │
Return → Inspeksi Post-Rental → Compare → Penalty (jika ada) → Deposit Refund → Complete
```

---

## 2. Inspeksi Kendaraan

### 2.1 Deskripsi

Staff mendokumentasikan kondisi kendaraan sebelum diserahkan ke customer (pre-rental) dan setelah dikembalikan (post-rental). Setiap inspeksi mencakup checklist kondisi, foto dokumentasi, KM, dan level BBM.

### 2.2 Tipe Inspeksi

| Tipe | Kapan | Siapa | Tujuan |
|------|-------|-------|--------|
| `pre_rental` | Sebelum kendaraan diserahkan | Staff | Dokumentasi kondisi awal |
| `post_rental` | Setelah kendaraan dikembalikan | Staff | Bandingkan dengan kondisi awal |

### 2.3 Checklist Kategori

Setiap inspeksi punya checklist item per kategori:

| Kategori | Item yang Dicek |
|----------|-----------------|
| **Body** | Tangki, knalpot, spion, jok, fairing, fender, swing arm |
| **Rem** | Rem depan, rem belakang |
| **Ban** | Ban depan (tekanan & kondisi), ban belakang |
| **Mesin** | Starter, mesin idle, rantai/kampas, kopling |
| **Listrik** | lampu depan, lampu belakang, sein, klakson, speedometer |
| **Lainnya** | Kunci, STNK, helm, tool kit |

### 2.4 Kondisi Item

| Kondisi | Warna | Arti |
|---------|-------|------|
| `good` | Hijau | Tidak ada masalah |
| `light_damage` | Kuning | Baret kecil, lecet — tidak mempengaruhi fungsi |
| `moderate_damage` | Orange | Penyok, retak — perlu perhatian tapi masih bisa dipakai |
| `severe_damage` | Merah | Rusak, tidak berfungsi — harus diperbaiki sebelum rental |

### 2.5 Foto Dokumentasi

Setiap inspeksi wajib punya minimal 4 foto:
1. Sisi depan
2. Sisi belakang
3. Sisi kanan
4. Sisi kiri

Plus foto detail untuk setiap item yang tidak `good`.

### 2.6 Data yang Dicatat

| Field | Pre-Rental | Post-Rental |
|-------|-----------|-------------|
| Kilometer (KM) | Wajib | Wajib |
| Level BBM (`full`, `3/4`, `1/2`, `1/4`, `empty`) | Wajib | Wajib |
| Checklist kondisi per item | Wajib | Wajib |
| Foto 4 sisi | Wajib | Wajib |
| Catatan umum | Opsional | Opsional |

### 2.7 Comparison

Saat post-rental selesai, system otomatis membandingkan dengan pre-rental:
- Item yang berubah kondisi (misal pre: `good` → post: `moderate_damage`) di-flag sebagai **new damage**
- KM bertambah dihitung
- BBM berkurang dihitung
- Flag otomatis masuk ke Penalty jika ada kerusakan baru

---

## 3. Deposit System

### 3.1 Deskripsi

Customer membayar deposit (jaminan) sebelum rental dimulai. Deposit di-hold dan hanya dikembalikan setelah post-rental inspection selesai dan tidak ada masalah.

### 3.2 Alur Deposit

```
Booking Confirmed → Deposit Collected (cash/transfer) → Hold
                                                            │
                                          Post-Inspection Complete
                                                            │
                                              ┌─────────────┼──────────────┐
                                              │             │              │
                                        Kondisi OK    Ada Kerusakan   Telat Kembali
                                              │             │              │
                                        Full Refund   Potong dari      Potong dari
                                                      deposit          deposit
                                              │             │              │
                                              └─────────────┼──────────────┘
                                                            │
                                                      Settled
```

### 3.3 Deposit Amount

- Default: Rp 500.000 (configurable di Settings)
- Bisa override per booking
- Dicatat terpisah dari rental payment

### 3.4 Status Deposit

| Status | Arti |
|--------|------|
| `collected` | Deposit sudah diterima dari customer |
| `partially_refunded` | Sebagian dikembalikan (ada potongan) |
| `fully_refunded` | Seluruhnya dikembalikan |
| `forfeited` | Deposit tidak dikembalikan (kerusakan parah) |

### 3.5 Deduction

Setiap potongan deposit dicatat:

| Field | Contoh |
|-------|--------|
| Tipe | `damage`, `fuel_shortage`, `late_fee`, `other` |
| Deskripsi | "Baret tangki sisi kiri" |
| Amount | Rp 150.000 |

### 3.6 Perhitungan Settlement

```
Total Deposit:     Rp 500.000
Deductions:
  - Baret tangki:  Rp 150.000
  - BBM kurang:     Rp 50.000
Total Deductions:  Rp 200.000
Refund Amount:     Rp 300.000
```

---

## 4. Penalty / Denda

### 4.1 Deskripsi

System untuk mencatat dan menghitung denda terhadap customer berdasarkan hasil post-rental inspection, keterlambatan pengembalian, dan violation lainnya.

### 4.2 Tipe Penalty

| Tipe | Trigger | Kalkulasi |
|------|---------|-----------|
| `late_return` | Kendaraan dikembalikan lewat endDate | `(jumlah hari telat) × (daily_rate × 1.5)` |
| `damage` | Kerusakan baru terdeteksi di post-inspection | Diisi manual oleh staff berdasarkan estimasi perbaikan |
| `fuel_shortage` | BBM post-rental < BBM pre-rental | `(litra kurang) × (harga BBM per liter)` |
| `traffic_violation` | Customer kena tilang pas rental | Diisi manual sesuai nilai tilang |
| `other` | Lainnya | Diisi manual |

### 4.3 Status Penalty

| Status | Arti |
|--------|------|
| `pending` | Baru dicatat, belum di-charge |
| `charged` | Sudah dibayar / dipotong dari deposit |
| `waived` | Dihapus / dimaafkan oleh admin |
| `disputed` | Customer menolak / dispute |

### 4.4 Auto-Detection

System otomatis mendeteksi dan mengusulkan penalty:

| Deteksi Otomatis | Dari |
|-------------------|------|
| Telat kembali | `actualReturnDate > endDate` pada booking |
| Kerusakan baru | Comparison pre vs post inspection |
| BBM kurang | `fuelLevel post < fuelLevel pre` |

Staff bisa accept, modify, atau reject setiap proposed penalty.

### 4.5 Relasi dengan Deposit

Penalty bisa dibayar dari:
1. **Potong deposit** — otomatis saat settlement
2. **Pembayaran terpisah** — customer bayar cash/transfer tambahan
3. **Waived** — admin memaafkan

---

## 5. Verifikasi KTP/SIM

### 5.1 Deskripsi

Sebelum rental dimulai, customer wajib menyerahkan fotokopi/ foto KTP dan SIM (sesuai jenis kendaraan). Data ini disimpan di system untuk keamanan dan kebutuhan hukum.

### 5.2 Tipe Dokumen

| Tipe | Keterangan |
|------|------------|
| `ktp` | Kartu Tanda Penduduk — wajib untuk semua rental |
| `sim_a` | SIM A — untuk rental mobil |
| `sim_c` | SIM C — untuk rental motor |

### 5.3 Alur Verifikasi

```
Customer Datang → Staff foto KTP/SIM → Upload ke System
                                              │
                                    Staff cek keaslian
                                              │
                                    ┌─────────┼─────────┐
                                    │                   │
                                  Valid              Tidak Valid
                                    │                   │
                              isVerified: true    Reject + Catat alasan
                                    │
                              Customer boleh lanjut rental
```

### 5.4 Data yang Disimpan

| Field | Keterangan |
|-------|------------|
| Tipe dokumen | KTP / SIM A / SIM C |
| Nomor dokumen | NIK (KTP) atau nomor SIM |
| Foto dokumen | URL gambar |
| Status verifikasi | `pending` / `verified` / `rejected` |
| Diverifikasi oleh | Staff ID |
| Tanggal verifikasi | Timestamp |

### 5.5 Aturan

- KTP wajib untuk semua rental
- SIM C wajib untuk rental motor
- SIM A wajib untuk rental mobil
- Customer yang sudah pernah verified tidak perlu upload ulang (tapi bisa diminta lagi jika dokumen sudah lama)
- Jika dokumen rejected, booking tidak bisa di-start

---

## 6. Surat Perjanjian Sewa

### 6.1 Deskripsi

Generate surat perjanjian sewa (rental agreement) otomatis dari data booking. Kontrak berisi data penyewa, data kendaraan, jangka waktu, biaya, syarat & ketentuan. Ditandatangani secara digital oleh customer dan staff.

### 6.2 Isi Kontrak

| Bagian | Isi |
|--------|-----|
| **Header** | Logo, nama perusahaan, alamat |
| **Pihak 1 (Penyewa)** | Nama, KTP, alamat, telepon |
| **Pihak 2 (Pemilik)** | Nama perusahaan, alamat |
| **Objek Sewa** | Jenis kendaraan, nomor polisi, warna |
| **Jangka Waktu** | Tanggal mulai - tanggal selesai |
| **Biaya** | Tarif harian, total, deposit |
| **Syarat & Ketentuan** | Template T&C (editable di settings) |
| **Tanda Tangan** | Customer + Staff |

### 6.3 Alur Kontrak

```
Booking Confirmed → Documents Verified → Generate Contract (auto-fill data)
                                                       │
                                              Tampilkan ke customer
                                                       │
                                    ┌──────────────────┼──────────────────┐
                                    │                                     │
                            Customer TTD Digital                  Customer TTD Kertas
                            (tablet/screen capture)               (scan/upload foto)
                                    │                                     │
                                    └──────────────┬──────────────────────┘
                                                   │
                                           Staff TTD
                                                   │
                                          Contract Signed
                                                   │
                                        Rental bisa Start
```

### 6.4 Status Kontrak

| Status | Arti |
|--------|------|
| `draft` | Digenerate tapi belum ditandatangani |
| `customer_signed` | Customer sudah tanda tangan |
| `signed` | Kedua pihak sudah tanda tangan |
| `completed` | Rental selesai, kontrak closed |

### 6.5 Template Syarat & Ketentuan

Default T&C (bisa diedit di Settings):

> 1. Penyewa bertanggung jawab penuh atas kendaraan selama masa sewa
> 2. Kendaraan harus dikembalikan dalam kondisi yang sama seperti saat diserahkan
> 3. Pengembalian melebihi batas waktu dikenakan denda sesuai ketentuan
> 4. Penyewa wajib mengembalikan BBM dalam kondisi sama seperti saat pengambilan
> 5. Kerusakan yang terjadi selama masa sewa menjadi tanggung jawab penyewa
> 6. Penyewa wajib mematuhi peraturan lalu lintas yang berlaku
> 7. Deposit dikembalikan setelah pemeriksaan kondisi kendaraan
> 8. Kendaraan tidak boleh dipinjamkan kepada pihak lain tanpa izin
> 9. Sewa dibatalkan jika dokumen tidak valid atau tidak lengkap
> 10. Segala sengketa akan diselesaikan secara musyawarah

---

## 7. Notifikasi WhatsApp

### 7.1 Deskripsi

System mengirim notifikasi otomatis ke customer via WhatsApp pada event-event tertentu. Menggunakan WhatsApp Business API atau provider pihak ketiga (Fonnte, Wablas, dll).

### 7.2 Event & Template

| Event | Trigger | Template Key |
|-------|---------|-------------|
| Booking Confirmed | Booking status → `Confirmed` | `booking_confirmed` |
| Payment Received | Payment status → `Verified` | `payment_received` |
| Rental Reminder | H-1 sebelum startDate | `rental_reminder` |
| Rental Started | Booking status → `Active` | `rental_started` |
| Rental Overdue | Melewati endDate, status masih `Active` | `rental_overdue` |
| Return Confirmed | Booking status → `Completed` | `return_confirmed` |
| Deposit Refund | Deposit status → `fully_refunded` / `partially_refunded` | `deposit_refund` |
| Penalty Charged | Penalty status → `charged` | `penalty_charged` |

### 7.3 Template Pesan

**`booking_confirmed`:**
```
Halo {customer_name}! 🏍️
Booking Anda telah dikonfirmasi.

📋 Detail Booking:
No: {booking_number}
Kendaraan: {vehicle_name}
Tanggal: {start_date} - {end_date}
Total: Rp {total_amount}

Mohon datang ke lokasi kami pada tanggal {start_date} dengan membawa KTP dan SIM asli.

Terima kasih! - Savanna Bromo Rental
```

**`payment_received`:**
```
Halo {customer_name}! ✅
Pembayaran Anda telah kami terima.

No Booking: {booking_number}
Jumlah: Rp {amount}
Metode: {payment_method}

Status booking Anda: CONFIRMED.

Terima kasih! - Savanna Bromo Rental
```

**`rental_reminder`:**
```
Halo {customer_name}! ⏰
Reminder: Rental Anda dimulai BESOK.

📋 Detail:
Kendaraan: {vehicle_name}
Tanggal ambil: {start_date}

Jangan lupa bawa KTP & SIM asli ya!

Savanna Bromo Rental
```

**`rental_overdue`:**
```
Halo {customer_name}! ⚠️
Kendaraan yang Anda sewa belum dikembalikan.

No Booking: {booking_number}
Batas pengembalian: {end_date}
Denda keterlambatan: Rp {daily_rate} × 1.5 per hari

Mohon segera kembalikan kendaraan ke lokasi kami.

Savanna Bromo Rental
```

**`deposit_refund`:**
```
Halo {customer_name}! 💰
Deposit Anda telah diproses.

No Booking: {booking_number}
Deposit: Rp {deposit_amount}
Potongan: Rp {deduction_amount}
Refund: Rp {refund_amount}

Terima kasih telah menyewa di Savanna Bromo Rental! 🙏
```

### 7.4 Provider Integration

Menggunakan REST API call ke WhatsApp provider. Contoh dengan Fonnte:

```
POST https://api.fonnte.com/send
Headers: Authorization: {api_key}
Body: {
  "target": "6281234567890",
  "message": "template content...",
  "countryCode": "62"
}
```

### 7.5 Auto vs Manual

| Mode | Kapan |
|------|-------|
| **Auto** | Booking confirmed, payment received, overdue |
| **Manual** | Staff klik "Send Reminder", custom message |

### 7.6 Notification Log

Setiap pengiriman dicatat:
- Recipient, template, data
- Status: pending / sent / failed
- External ID (dari provider)
- Error message (jika gagal)
- Timestamp

---

## 8. Database Schema

### 8.1 Tabel Baru

#### `vehicle_inspections`

```sql
CREATE TABLE vehicle_inspections (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  type TEXT NOT NULL CHECK(type IN ('pre_rental', 'post_rental')),
  inspector_id TEXT REFERENCES users(id),
  odometer_km REAL,
  fuel_level TEXT CHECK(fuel_level IN ('full', 'three_quarter', 'half', 'quarter', 'empty')),
  overall_condition TEXT CHECK(overall_condition IN ('excellent', 'good', 'fair', 'poor')),
  checklist TEXT NOT NULL DEFAULT '[]',   -- JSON: [{category, item, condition, description, photoUrl}]
  photos TEXT NOT NULL DEFAULT '[]',      -- JSON: [{label, url}]
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'completed')),
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_inspections_booking ON vehicle_inspections(booking_id);
CREATE INDEX idx_inspections_type ON vehicle_inspections(type);
```

**Checklist JSON format:**
```json
[
  {
    "category": "body",
    "item": "Tangki bensin",
    "condition": "good",
    "description": null,
    "photoUrl": null
  },
  {
    "category": "body",
    "item": "Knalpot",
    "condition": "light_damage",
    "description": "Baret kecil sisi kanan",
    "photoUrl": "/uploads/inspection/baret_knalpot.jpg"
  }
]
```

**Photos JSON format:**
```json
[
  { "label": "Depan", "url": "/uploads/inspection/pre_front.jpg" },
  { "label": "Belakang", "url": "/uploads/inspection/pre_rear.jpg" },
  { "label": "Kanan", "url": "/uploads/inspection/pre_right.jpg" },
  { "label": "Kiri", "url": "/uploads/inspection/pre_left.jpg" }
]
```

#### `customer_documents`

```sql
CREATE TABLE customer_documents (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  document_type TEXT NOT NULL CHECK(document_type IN ('ktp', 'sim_a', 'sim_c')),
  document_number TEXT,
  photo_url TEXT,
  is_verified INTEGER NOT NULL DEFAULT 0,
  verified_by TEXT REFERENCES users(id),
  verified_at TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_documents_customer ON customer_documents(customer_id);
CREATE INDEX idx_documents_type ON customer_documents(document_type);
```

#### `booking_deposits`

```sql
CREATE TABLE booking_deposits (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'collected' CHECK(status IN ('collected', 'partially_refunded', 'fully_refunded', 'forfeited')),
  deductions TEXT DEFAULT '[]',           -- JSON: [{type, description, amount}]
  refunded_amount REAL DEFAULT 0,
  refunded_at TEXT,
  collected_by TEXT REFERENCES users(id),
  processed_by TEXT REFERENCES users(id),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_deposits_booking ON booking_deposits(booking_id);
```

**Deductions JSON format:**
```json
[
  { "type": "damage", "description": "Baret tangki sisi kiri", "amount": 150000 },
  { "type": "fuel_shortage", "description": "BBM kurang 3 liter", "amount": 45000 }
]
```

#### `booking_penalties`

```sql
CREATE TABLE booking_penalties (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  type TEXT NOT NULL CHECK(type IN ('late_return', 'damage', 'fuel_shortage', 'traffic_violation', 'other')),
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'charged', 'waived', 'disputed')),
  source TEXT CHECK(source IN ('auto_detected', 'manual')),
  waived_by TEXT REFERENCES users(id),
  waived_at TEXT,
  waived_reason TEXT,
  charged_from TEXT CHECK(charged_from IN ('deposit', 'separate_payment')),
  notes TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_penalties_booking ON booking_penalties(booking_id);
CREATE INDEX idx_penalties_status ON booking_penalties(status);
```

#### `rental_contracts`

```sql
CREATE TABLE rental_contracts (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  contract_number TEXT NOT NULL UNIQUE,
  terms_and_conditions TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_id_number TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  vehicle_name TEXT NOT NULL,
  vehicle_plate TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  daily_rate REAL NOT NULL,
  total_amount REAL NOT NULL,
  deposit_amount REAL DEFAULT 0,
  customer_signature TEXT,               -- base64 atau URL gambar tanda tangan
  staff_signature TEXT,
  customer_signed_at TEXT,
  staff_signed_at TEXT,
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'customer_signed', 'signed', 'completed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_contracts_booking ON rental_contracts(booking_id);
```

#### `notification_logs`

```sql
CREATE TABLE notification_logs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'whatsapp' CHECK(type IN ('whatsapp', 'sms', 'email')),
  recipient TEXT NOT NULL,
  template_key TEXT NOT NULL,
  booking_id TEXT REFERENCES bookings(id),
  message TEXT NOT NULL,
  data TEXT,                              -- JSON: template variables
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed')),
  external_id TEXT,
  sent_at TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_notifications_booking ON notification_logs(booking_id);
CREATE INDEX idx_notifications_status ON notification_logs(status);
```

### 8.2 Modifikasi Tabel Existing

#### `bookings` — Tambah kolom

```sql
ALTER TABLE bookings ADD COLUMN payment_page_url TEXT;
-- Note: payment_page_url already added in migration 0004

-- New columns needed:
ALTER TABLE bookings ADD COLUMN fuel_level_start TEXT CHECK(fuel_level_start IN ('full', 'three_quarter', 'half', 'quarter', 'empty'));
ALTER TABLE bookings ADD COLUMN fuel_level_end TEXT CHECK(fuel_level_end IN ('full', 'three_quarter', 'half', 'quarter', 'empty'));
```

### 8.3 System Configuration Keys (Baru)

| Key | Value Default | Keterangan |
|-----|---------------|------------|
| `deposit_amount` | `500000` | Sudah ada |
| `late_return_penalty_rate` | `1.5` | Pengali daily rate untuk denda telat per hari |
| `fuel_price_per_liter` | `16500` | Harga BBM per liter untuk kalkulasi kekurangan BBM |
| `rental_terms_and_conditions` | *(template default)* | Syarat & ketentuan default untuk kontrak |
| `whatsapp_api_url` | *(kosong)* | URL endpoint WhatsApp provider |
| `whatsapp_api_key` | *(kosong)* | API key WhatsApp provider |
| `contract_company_name` | `Savanna Bromo Rental` | Nama perusahaan untuk kontrak |
| `contract_company_address` | `Malang, East Java, Indonesia` | Alamat untuk kontrak |

### 8.4 Entity Relationship Diagram (Updated)

```
users ─────────────────────────────────────────────────────────────┐
  │                                                                 │
  ▼                                                                 │
customers ──┐    vehicles ──┐                                       │
            │               │                                       │
            ▼               ▼                                       │
        bookings ──────► booking_addons                             │
          │ │ │                                                   │
          │ │ └──► booking_deposits                               │
          │ │                                                     │
          │ └────► booking_penalties                              │
          │                                                       │
          └──────► vehicle_inspections (pre + post)               │
          │                                                       │
          └──────► rental_contracts                               │
          │                                                       │
          └──────► notification_logs                              │
                                                                  │
customers ──► customer_documents (KTP/SIM)                        │
                                                                  │
system_configuration ─────────────────────────────────────────────┘
```

---

## 9. API Endpoints

### 9.1 Inspeksi Kendaraan

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/v1/bookings/:id/inspections` | Buat inspeksi baru (pre atau post) |
| `GET` | `/api/v1/bookings/:id/inspections` | List inspeksi untuk booking |
| `GET` | `/api/v1/bookings/:id/inspections/:inspectionId` | Detail inspeksi |
| `PATCH` | `/api/v1/bookings/:id/inspections/:inspectionId` | Update inspeksi (draft) |
| `POST` | `/api/v1/bookings/:id/inspections/:inspectionId/complete` | Finalisasi inspeksi |
| `GET` | `/api/v1/bookings/:id/inspections/compare` | Compare pre vs post rental |

**POST /bookings/:id/inspections — Request:**
```json
{
  "type": "pre_rental",
  "odometerKm": 12500,
  "fuelLevel": "full",
  "checklist": [
    { "category": "body", "item": "Tangki bensin", "condition": "good" },
    { "category": "body", "item": "Knalpot", "condition": "light_damage", "description": "Baret kecil" }
  ],
  "photos": [
    { "label": "Depan", "url": "/uploads/insp_001_front.jpg" },
    { "label": "Kanan", "url": "/uploads/insp_001_right.jpg" },
    { "label": "Belakang", "url": "/uploads/insp_001_rear.jpg" },
    { "label": "Kiri", "url": "/uploads/insp_001_left.jpg" }
  ],
  "notes": "Kondisi keseluruhan baik"
}
```

**GET /bookings/:id/inspections/compare — Response:**
```json
{
  "success": true,
  "data": {
    "preInspection": { "id": "...", "odometerKm": 12500, "fuelLevel": "full" },
    "postInspection": { "id": "...", "odometerKm": 12780, "fuelLevel": "half" },
    "changes": {
      "kmDiff": 280,
      "fuelDiff": "half",
      "newDamages": [
        { "category": "body", "item": "Tangki bensin", "preCondition": "good", "postCondition": "moderate_damage", "description": "Penyok sisi kiri" }
      ],
      "totalNewDamages": 1
    },
    "suggestedPenalties": [
      { "type": "fuel_shortage", "description": "BBM berkurang setengah tangki (~3 liter)", "estimatedAmount": 49500 },
      { "type": "damage", "description": "Penyok tangki sisi kiri", "estimatedAmount": null }
    ]
  }
}
```

### 9.2 Deposit

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/v1/bookings/:id/deposit` | Catat penerimaan deposit |
| `GET` | `/api/v1/bookings/:id/deposit` | Lihat status deposit |
| `POST` | `/api/v1/bookings/:id/deposit/refund` | Proses refund deposit |
| `POST` | `/api/v1/bookings/:id/deposit/deduction` | Tambah potongan deposit |

**POST /bookings/:id/deposit — Request:**
```json
{
  "amount": 500000,
  "notes": "Cash diterima dari customer"
}
```

**POST /bookings/:id/deposit/refund — Request:**
```json
{
  "deductions": [
    { "type": "damage", "description": "Baret tangki", "amount": 150000 },
    { "type": "fuel_shortage", "description": "BBM kurang", "amount": 50000 }
  ],
  "notes": "Potongan kerusakan + BBM"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "bookingId": "uuid",
    "amount": 500000,
    "deductions": [
      { "type": "damage", "description": "Baret tangki", "amount": 150000 },
      { "type": "fuel_shortage", "description": "BBM kurang", "amount": 50000 }
    ],
    "totalDeductions": 200000,
    "refundedAmount": 300000,
    "status": "partially_refunded"
  }
}
```

### 9.3 Penalty

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/v1/bookings/:id/penalties` | Buat penalty baru |
| `GET` | `/api/v1/bookings/:id/penalties` | List penalty untuk booking |
| `PATCH` | `/api/v1/bookings/:id/penalties/:penaltyId` | Update penalty |
| `POST` | `/api/v1/bookings/:id/penalties/:penaltyId/waive` | Waive (hapus) penalty |
| `POST` | `/api/v1/bookings/:id/penalties/auto-detect` | Auto-detect penalties dari inspection |

**POST /bookings/:id/penalties — Request:**
```json
{
  "type": "damage",
  "description": "Penyok tangki bensin sisi kiri",
  "amount": 200000
}
```

**POST /bookings/:id/penalties/auto-detect — Response:**
```json
{
  "success": true,
  "data": {
    "detected": [
      {
        "type": "late_return",
        "description": "Terlambat 1 hari",
        "amount": 300000,
        "source": "auto_detected",
        "evidence": { "endDate": "2026-06-05", "actualReturnDate": "2026-06-06" }
      },
      {
        "type": "fuel_shortage",
        "description": "BBM berkurang dari full ke half (~3 liter)",
        "amount": 49500,
        "source": "auto_detected",
        "evidence": { "preFuelLevel": "full", "postFuelLevel": "half" }
      },
      {
        "type": "damage",
        "description": "Penyok tangki sisi kiri",
        "amount": null,
        "source": "auto_detected",
        "evidence": { "preCondition": "good", "postCondition": "moderate_damage" }
      }
    ]
  }
}
```

### 9.4 Customer Documents (KTP/SIM)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/v1/customers/:id/documents` | Upload dokumen KTP/SIM |
| `GET` | `/api/v1/customers/:id/documents` | List dokumen customer |
| `PATCH` | `/api/v1/customers/:id/documents/:documentId/verify` | Verify / reject dokumen |
| `DELETE` | `/api/v1/customers/:id/documents/:documentId` | Hapus dokumen |

**POST /customers/:id/documents — Request:**
```json
{
  "documentType": "ktp",
  "documentNumber": "3507123456780001",
  "photoUrl": "/uploads/docs/ktp_ahmad.jpg"
}
```

**PATCH /customers/:id/documents/:documentId/verify — Request:**
```json
{
  "action": "verify"
}
```
atau:
```json
{
  "action": "reject",
  "rejectionReason": "Foto tidak jelas, mohon upload ulang"
}
```

### 9.5 Rental Contract

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/v1/bookings/:id/contract` | Generate kontrak baru |
| `GET` | `/api/v1/bookings/:id/contract` | Lihat kontrak |
| `POST` | `/api/v1/bookings/:id/contract/sign` | Tanda tangan kontrak |
| `GET` | `/api/v1/bookings/:id/contract/pdf` | Download PDF |

**POST /bookings/:id/contract — Request:**
```json
{
  "termsAndConditions": "(optional, kalau kosong pakai default dari settings)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "contractNumber": "CTR-2026-0001",
    "status": "draft",
    "customerName": "Ahmad Rizki",
    "customerIdNumber": "3507123456780001",
    "vehicleName": "Honda CRF 150L",
    "vehiclePlate": "B 1234 SV",
    "startDate": "2026-06-01",
    "endDate": "2026-06-03",
    "dailyRate": 200000,
    "totalAmount": 400000,
    "depositAmount": 500000,
    "termsAndConditions": "...",
    "customerSignature": null,
    "staffSignature": null
  }
}
```

**POST /bookings/:id/contract/sign — Request:**
```json
{
  "party": "customer",
  "signature": "data:image/png;base64,iVBOR..."
}
```
atau:
```json
{
  "party": "staff",
  "signature": "data:image/png;base64,iVBOR..."
}
```

### 9.6 Notifications

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/v1/notifications/send` | Kirim notifikasi manual |
| `GET` | `/api/v1/notifications/logs` | List notification logs |
| `GET` | `/api/v1/notifications/templates` | List template yang tersedia |
| `POST` | `/api/v1/notifications/test` | Test kirim ke nomor tertentu |
| `PATCH` | `/api/v1/settings` | Update WhatsApp config (sudah ada) |

**POST /notifications/send — Request:**
```json
{
  "recipient": "6281234567890",
  "templateKey": "rental_reminder",
  "bookingId": "uuid",
  "customMessage": "(optional, override template)"
}
```

**GET /notifications/logs?status=sent&limit=20 — Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "whatsapp",
      "recipient": "6281234567890",
      "templateKey": "booking_confirmed",
      "status": "sent",
      "sentAt": "2026-06-01T10:00:00Z",
      "bookingId": "uuid"
    }
  ]
}
```

---

## 10. CMS Frontend

### 10.1 Halaman Baru

| Halaman | Path | Deskripsi |
|---------|------|-----------|
| Booking Inspection | `/bookings/:id/inspection` | Form inspeksi pre/post rental dengan checklist + upload foto |
| Inspection Compare | `/bookings/:id/inspection/compare` | Side-by-side pre vs post |
| Deposit Management | Dalam booking detail tab | Tab deposit di halaman booking detail |
| Penalty Management | Dalam booking detail tab | Tab penalties di halaman booking detail |
| Customer Documents | `/customers/:id` section | Section upload & verifikasi KTP/SIM |
| Contract View | `/bookings/:id/contract` | Preview kontrak + signature pad |
| Notification Logs | `/notifications` | List log notifikasi + kirim manual |
| Notification Settings | Dalam Settings | Config WhatsApp API |

### 10.2 Modifikasi Halaman Existing

| Halaman | Perubahan |
|---------|-----------|
| **Booking Detail** | Tambah tab: Inspection, Deposit, Penalties, Contract |
| **Booking List** | Tambah kolom: Deposit status, Penalty count |
| **Booking Workflow** | Pre-inspection wajib sebelum Start; Post-inspection wajib sebelum Complete |
| **Customer Detail** | Tambah section: Documents (KTP/SIM) |
| **Settings** | Tambah section: WhatsApp config, Contract T&C, Penalty rates |

### 10.3 Booking Workflow (Updated)

Status transitions yang baru:

```
Pending → pending_payment → Confirmed → [Pre-Inspection] → [Contract Signed] → Active → [Post-Inspection] → [Penalties Settled] → [Deposit Refunded] → Completed
```

Guards:
- **Confirmed → Active**: Requires completed pre-rental inspection + signed contract + verified documents
- **Active → Completed**: Requires completed post-rental inspection + deposit settled

---

## 11. Business Flow End-to-End

### 11.1 Happy Path

```
1. Customer booking via Landing Page
   → POST /public/bookings → status: pending_payment
   → iFortePay Payment Page → customer bayar

2. Payment confirmed (webhook)
   → Booking status: Confirmed
   → WhatsApp: "Booking confirmed" ke customer

3. Customer datang ke lokasi
   → Staff cek KTP/SIM → Upload & Verify
   → Status dokumen: verified

4. Pre-Rental Inspection
   → Staff isi checklist + foto 4 sisi
   → Catat KM awal, BBM level
   → Status: completed

5. Contract Signing
   → Generate kontrak dari data booking
   → Customer tanda tangan (tablet)
   → Staff tanda tangan
   → Status: signed

6. Rental Start
   → Booking status: Active
   → WhatsApp: "Rental started" ke customer
   → Kendaraan diserahkan

7. H-1 sebelum endDate (jika masih Active)
   → WhatsApp: "Rental reminder" ke customer

8. Customer kembalikan kendaraan
   → Post-Rental Inspection
   → Staff isi checklist + foto 4 sisi
   → Catat KM akhir, BBM level
   → System compare pre vs post

9. Auto-detect penalties (jika ada)
   → Kerusakan baru → penalty type: damage
   → Telat → penalty type: late_return
   → BBM kurang → penalty type: fuel_shortage
   → Staff review & confirm penalties

10. Deposit Settlement
    → Deductions = total penalties from deposit
    → Refund = deposit - deductions
    → WhatsApp: "Deposit refund" ke customer

11. Complete
    → Booking status: Completed
    → WhatsApp: "Return confirmed" ke customer
```

### 11.2 Overdue Path

```
Melewati endDate, status masih Active:
  → Cron/Scheduler check daily
  → WhatsApp: "Rental overdue" ke customer
  → Auto-create penalty: late_return
  → Repeat daily until returned
```

---

## 12. Implementation Order

### Sprint 7: Customer Documents + Database Setup

1. Create migration SQL (6 tabel baru)
2. Create Drizzle schema files
3. Customer documents module (upload, verify, list)

### Sprint 8: Vehicle Inspection

1. Inspection module (create, update, complete)
2. Pre-rental inspection form
3. Post-rental inspection form
4. Comparison endpoint
5. CMS: Inspection page + compare view

### Sprint 9: Deposit + Penalty

1. Deposit module (collect, refund, deduction)
2. Penalty module (create, auto-detect, waive)
3. CMS: Deposit tab + Penalty tab in booking detail
4. Integration with inspection comparison

### Sprint 10: Rental Contract

1. Contract generation (auto-fill from booking data)
2. Digital signature (signature pad component)
3. Contract number generation: `CTR-YYYY-NNNN`
4. CMS: Contract page with signature pad
5. PDF generation (optional, bisa phase 2)

### Sprint 11: WhatsApp Notifications

1. WhatsApp provider integration
2. Template engine (variable substitution)
3. Auto-send on events (booking confirmed, payment, reminder)
4. Notification log module
5. CMS: Notification logs page + manual send
6. Cron job for overdue detection

---

## 13. Environment Variables

Tambahkan ke `wrangler.toml`:

```toml
# WhatsApp Provider
WHATSAPP_API_URL = "https://api.fonnte.com/send"
# WHATSAPP_API_KEY → set via `wrangler secret put`

# File Upload (jika menggunakan external storage)
# UPLOAD_ENDPOINT = ""
# UPLOAD_API_KEY → set via `wrangler secret put`
```

Tambahkan ke secrets:
```bash
npx wrangler secret put WHATSAPP_API_KEY
```

---

## Appendix: Drizzle Schema Files Structure

```
src/worker/core/database/schema/
├── bookings.ts          # (modified — add fuelLevel columns)
├── vehicle-inspections.ts  # NEW
├── customer-documents.ts   # NEW
├── booking-deposits.ts     # NEW
├── booking-penalties.ts    # NEW
├── rental-contracts.ts     # NEW
├── notification-logs.ts    # NEW
└── index.ts              # (modified — export new schemas)

src/worker/modules/
├── inspections/          # NEW
│   ├── inspections.dto.ts
│   ├── inspections.repository.ts
│   ├── inspections.service.ts
│   └── inspections.routes.ts
├── deposits/             # NEW
│   ├── deposits.dto.ts
│   ├── deposits.repository.ts
│   ├── deposits.service.ts
│   └── deposits.routes.ts
├── penalties/            # NEW
│   ├── penalties.dto.ts
│   ├── penalties.repository.ts
│   ├── penalties.service.ts
│   └── penalties.routes.ts
├── documents/            # NEW
│   ├── documents.dto.ts
│   ├── documents.repository.ts
│   ├── documents.service.ts
│   └── documents.routes.ts
├── contracts/            # NEW
│   ├── contracts.dto.ts
│   ├── contracts.repository.ts
│   ├── contracts.service.ts
│   └── contracts.routes.ts
└── notifications/        # NEW
    ├── notifications.dto.ts
    ├── notifications.repository.ts
    ├── notifications.service.ts
    └── notifications.routes.ts

src/react-app/features/
├── inspections/          # NEW
│   ├── api/inspections.ts
│   ├── components/InspectionForm.tsx
│   ├── components/InspectionCompare.tsx
│   ├── hooks/useInspections.ts
│   └── pages/InspectionPage.tsx
├── deposits/             # NEW
├── penalties/            # NEW
├── documents/            # NEW
├── contracts/            # NEW
└── notifications/        # NEW
```
