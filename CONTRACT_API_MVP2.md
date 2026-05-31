# API Contract — MVP Phase 2: Operational Features
## Untuk Tim Frontend

**Tanggal:** 1 Juni 2026
**Versi:** 1.0
**Base URL:** `https://savanna-backyard.andifauzan986.workers.dev/api/v1`
**Auth:** Semua endpoint butuh JWT cookie (httpOnly), kecuali yang dicatat
**Format:** `{ success: boolean, data: any, message?: string, error?: { code: string, message: string } }`

---

## Daftar Isi

1. [Inspeksi Kendaraan](#1-inspeksi-kendaraan)
2. [Deposit System](#2-deposit-system)
3. [Penalty / Denda](#3-penalty--denda)
4. [Customer Documents (KTP/SIM)](#4-customer-documents-ktpsim)
5. [Rental Contract](#5-rental-contract)
6. [Notifications](#6-notifications)
7. [Booking Status Check (Public)](#7-booking-status-check-public)
8. [Updated Booking Response](#8-updated-booking-response)
9. [Booking Workflow Guards](#9-booking-workflow-guards)
10. [Enums & Constants](#10-enums--constants)

---

## 1. Inspeksi Kendaraan

### 1.1 Buat Inspeksi Baru

```
POST /bookings/:id/inspections
```

**Request:**
```json
{
  "type": "pre_rental",
  "odometerKm": 12500,
  "fuelLevel": "full",
  "overallCondition": "good",
  "checklist": [
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
      "photoUrl": "/uploads/inspection/2026/06/knalpot_baret.jpg"
    },
    {
      "category": "brake",
      "item": "Rem depan",
      "condition": "good",
      "description": null,
      "photoUrl": null
    },
    {
      "category": "brake",
      "item": "Rem belakang",
      "condition": "good",
      "description": null,
      "photoUrl": null
    },
    {
      "category": "tire",
      "item": "Ban depan",
      "condition": "good",
      "description": null,
      "photoUrl": null
    },
    {
      "category": "tire",
      "item": "Ban belakang",
      "condition": "good",
      "description": null,
      "photoUrl": null
    },
    {
      "category": "engine",
      "item": "Starter",
      "condition": "good",
      "description": null,
      "photoUrl": null
    },
    {
      "category": "engine",
      "item": "Mesin idle",
      "condition": "good",
      "description": null,
      "photoUrl": null
    },
    {
      "category": "engine",
      "item": "Rantai/kampas",
      "condition": "good",
      "description": null,
      "photoUrl": null
    },
    {
      "category": "electrical",
      "item": "Lampu depan",
      "condition": "good",
      "description": null,
      "photoUrl": null
    },
    {
      "category": "electrical",
      "item": "Lampu belakang",
      "condition": "good",
      "description": null,
      "photoUrl": null
    },
    {
      "category": "electrical",
      "item": "Sein",
      "condition": "good",
      "description": null,
      "photoUrl": null
    },
    {
      "category": "electrical",
      "item": "Klakson",
      "condition": "good",
      "description": null,
      "photoUrl": null
    },
    {
      "category": "other",
      "item": "Kunci",
      "condition": "good",
      "description": null,
      "photoUrl": null
    },
    {
      "category": "other",
      "item": "STNK",
      "condition": "good",
      "description": null,
      "photoUrl": null
    },
    {
      "category": "other",
      "item": "Helm",
      "condition": "good",
      "description": null,
      "photoUrl": null
    }
  ],
  "photos": [
    { "label": "Depan", "url": "/uploads/inspection/2026/06/pre_front.jpg" },
    { "label": "Kanan", "url": "/uploads/inspection/2026/06/pre_right.jpg" },
    { "label": "Belakang", "url": "/uploads/inspection/2026/06/pre_rear.jpg" },
    { "label": "Kiri", "url": "/uploads/inspection/2026/06/pre_left.jpg" }
  ],
  "notes": "Kondisi keseluruhan baik, knalpot ada baret lama"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Inspection created",
  "data": {
    "id": "insp-uuid-001",
    "bookingId": "booking-uuid",
    "type": "pre_rental",
    "inspectorId": "staff-uuid",
    "odometerKm": 12500,
    "fuelLevel": "full",
    "overallCondition": "good",
    "checklist": [
      {
        "category": "body",
        "item": "Tangki bensin",
        "condition": "good",
        "description": null,
        "photoUrl": null
      }
    ],
    "photos": [
      { "label": "Depan", "url": "/uploads/inspection/2026/06/pre_front.jpg" }
    ],
    "notes": "Kondisi keseluruhan baik, knalpot ada baret lama",
    "status": "draft",
    "completedAt": null,
    "createdAt": "2026-06-01T08:00:00.000Z",
    "updatedAt": "2026-06-01T08:00:00.000Z"
  }
}
```

### 1.2 List Inspeksi untuk Booking

```
GET /bookings/:id/inspections
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "insp-uuid-001",
      "type": "pre_rental",
      "inspectorId": "staff-uuid",
      "odometerKm": 12500,
      "fuelLevel": "full",
      "overallCondition": "good",
      "status": "completed",
      "completedAt": "2026-06-01T08:15:00.000Z",
      "createdAt": "2026-06-01T08:00:00.000Z"
    },
    {
      "id": "insp-uuid-002",
      "type": "post_rental",
      "inspectorId": "staff-uuid",
      "odometerKm": 12780,
      "fuelLevel": "half",
      "overallCondition": "fair",
      "status": "completed",
      "completedAt": "2026-06-03T17:30:00.000Z",
      "createdAt": "2026-06-03T17:00:00.000Z"
    }
  ]
}
```

### 1.3 Detail Inspeksi

```
GET /bookings/:id/inspections/:inspectionId
```

**Response 200:** Sama seperti response create, lengkap dengan checklist dan photos.

### 1.4 Update Inspeksi (Draft only)

```
PATCH /bookings/:id/inspections/:inspectionId
```

**Request:** Partial update — field yang dikirim aja yang diupdate.
```json
{
  "odometerKm": 12510,
  "notes": "Update catatan"
}
```

**Response 200:** Full inspection object.

### 1.5 Finalisasi Inspeksi

```
POST /bookings/:id/inspections/:inspectionId/complete
```

**Response 200:**
```json
{
  "success": true,
  "message": "Inspection completed",
  "data": {
    "id": "insp-uuid-001",
    "status": "completed",
    "completedAt": "2026-06-01T08:15:00.000Z"
  }
}
```

### 1.6 Compare Pre vs Post Rental

```
GET /bookings/:id/inspections/compare
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "preInspection": {
      "id": "insp-uuid-001",
      "odometerKm": 12500,
      "fuelLevel": "full",
      "overallCondition": "good",
      "checklist": [
        { "category": "body", "item": "Tangki bensin", "condition": "good" }
      ],
      "photos": [
        { "label": "Depan", "url": "/uploads/inspection/2026/06/pre_front.jpg" }
      ]
    },
    "postInspection": {
      "id": "insp-uuid-002",
      "odometerKm": 12780,
      "fuelLevel": "half",
      "overallCondition": "fair",
      "checklist": [
        { "category": "body", "item": "Tangki bensin", "condition": "moderate_damage", "description": "Penyok sisi kiri" }
      ],
      "photos": [
        { "label": "Depan", "url": "/uploads/inspection/2026/06/post_front.jpg" }
      ]
    },
    "changes": {
      "kmDiff": 280,
      "fuelDiff": {
        "pre": "full",
        "post": "half",
        "estimatedLitersShort": 3
      },
      "newDamages": [
        {
          "category": "body",
          "item": "Tangki bensin",
          "preCondition": "good",
          "postCondition": "moderate_damage",
          "description": "Penyok sisi kiri",
          "photoUrl": "/uploads/inspection/2026/06/tangki_penyok.jpg"
        }
      ],
      "resolvedDamages": [],
      "unchangedDamages": [
        {
          "category": "body",
          "item": "Knalpot",
          "condition": "light_damage",
          "description": "Baret kecil sisi kanan"
        }
      ],
      "totalNewDamages": 1
    },
    "suggestedPenalties": [
      {
        "type": "fuel_shortage",
        "description": "BBM berkurang dari full ke half (~3 liter)",
        "estimatedAmount": 49500,
        "source": "auto_detected"
      },
      {
        "type": "damage",
        "description": "Penyok tangki bensin sisi kiri",
        "estimatedAmount": null,
        "source": "auto_detected"
      }
    ]
  }
}
```

---

## 2. Deposit System

### 2.1 Catat Penerimaan Deposit

```
POST /bookings/:id/deposit
```

**Request:**
```json
{
  "amount": 500000,
  "notes": "Cash diterima dari customer"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Deposit collected",
  "data": {
    "id": "deposit-uuid",
    "bookingId": "booking-uuid",
    "amount": 500000,
    "status": "collected",
    "deductions": [],
    "refundedAmount": 0,
    "refundedAt": null,
    "collectedBy": "staff-uuid",
    "processedBy": null,
    "notes": "Cash diterima dari customer",
    "createdAt": "2026-06-01T08:30:00.000Z",
    "updatedAt": "2026-06-01T08:30:00.000Z"
  }
}
```

### 2.2 Lihat Status Deposit

```
GET /bookings/:id/deposit
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "deposit-uuid",
    "bookingId": "booking-uuid",
    "amount": 500000,
    "status": "collected",
    "deductions": [],
    "totalDeductions": 0,
    "refundedAmount": 0,
    "refundedAt": null,
    "notes": "Cash diterima dari customer",
    "createdAt": "2026-06-01T08:30:00.000Z"
  }
}
```

### 2.3 Proses Refund Deposit

```
POST /bookings/:id/deposit/refund
```

**Request:**
```json
{
  "deductions": [
    {
      "type": "damage",
      "description": "Penyok tangki sisi kiri",
      "amount": 150000
    },
    {
      "type": "fuel_shortage",
      "description": "BBM kurang ~3 liter",
      "amount": 49500
    },
    {
      "type": "late_fee",
      "description": "Telat 1 hari",
      "amount": 300000
    }
  ],
  "notes": "Potongan kerusakan + BBM + telat"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Deposit refunded",
  "data": {
    "id": "deposit-uuid",
    "bookingId": "booking-uuid",
    "amount": 500000,
    "status": "partially_refunded",
    "deductions": [
      { "type": "damage", "description": "Penyok tangki sisi kiri", "amount": 150000 },
      { "type": "fuel_shortage", "description": "BBM kurang ~3 liter", "amount": 49500 },
      { "type": "late_fee", "description": "Telat 1 hari", "amount": 300000 }
    ],
    "totalDeductions": 499500,
    "refundedAmount": 500,
    "refundedAt": "2026-06-03T18:00:00.000Z",
    "processedBy": "staff-uuid",
    "notes": "Potongan kerusakan + BBM + telat"
  }
}
```

### 2.4 Tambah Potongan Deposit

```
POST /bookings/:id/deposit/deduction
```

**Request:**
```json
{
  "type": "other",
  "description": "Helm hilang",
  "amount": 250000
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Deduction added",
  "data": {
    "id": "deposit-uuid",
    "amount": 500000,
    "status": "collected",
    "deductions": [
      { "type": "other", "description": "Helm hilang", "amount": 250000 }
    ],
    "totalDeductions": 250000,
    "refundedAmount": 0
  }
}
```

---

## 3. Penalty / Denda

### 3.1 Buat Penalty

```
POST /bookings/:id/penalties
```

**Request:**
```json
{
  "type": "damage",
  "description": "Penyok tangki bensin sisi kiri",
  "amount": 200000
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Penalty created",
  "data": {
    "id": "penalty-uuid",
    "bookingId": "booking-uuid",
    "type": "damage",
    "description": "Penyok tangki bensin sisi kiri",
    "amount": 200000,
    "status": "pending",
    "source": "manual",
    "waivedBy": null,
    "waivedAt": null,
    "waivedReason": null,
    "chargedFrom": null,
    "notes": null,
    "createdBy": "staff-uuid",
    "createdAt": "2026-06-03T17:45:00.000Z",
    "updatedAt": "2026-06-03T17:45:00.000Z"
  }
}
```

### 3.2 List Penalties

```
GET /bookings/:id/penalties
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "penalty-uuid-1",
      "type": "late_return",
      "description": "Terlambat 1 hari",
      "amount": 300000,
      "status": "charged",
      "source": "auto_detected",
      "chargedFrom": "deposit",
      "createdAt": "2026-06-03T17:45:00.000Z"
    },
    {
      "id": "penalty-uuid-2",
      "type": "fuel_shortage",
      "description": "BBM berkurang dari full ke half (~3 liter)",
      "amount": 49500,
      "status": "charged",
      "source": "auto_detected",
      "chargedFrom": "deposit",
      "createdAt": "2026-06-03T17:45:00.000Z"
    },
    {
      "id": "penalty-uuid-3",
      "type": "damage",
      "description": "Penyok tangki sisi kiri",
      "amount": 150000,
      "status": "charged",
      "source": "auto_detected",
      "chargedFrom": "deposit",
      "createdAt": "2026-06-03T17:45:00.000Z"
    }
  ]
}
```

### 3.3 Update Penalty

```
PATCH /bookings/:id/penalties/:penaltyId
```

**Request:**
```json
{
  "amount": 175000,
  "description": "Penyok tangki — estimasi setelah cek bengkel"
}
```

**Response 200:** Full penalty object.

### 3.4 Waive Penalty

```
POST /bookings/:id/penalties/:penaltyId/waive
```

**Request:**
```json
{
  "reason": "Customer pelanggan lama, dimaafkan"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Penalty waived",
  "data": {
    "id": "penalty-uuid-3",
    "status": "waived",
    "waivedBy": "staff-uuid",
    "waivedAt": "2026-06-03T18:00:00.000Z",
    "waivedReason": "Customer pelanggan lama, dimaafkan"
  }
}
```

### 3.5 Auto-Detect Penalties

```
POST /bookings/:id/penalties/auto-detect
```

Tidak butuh body. System cek post-inspection vs pre-inspection + booking dates.

**Response 200:**
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
        "evidence": {
          "endDate": "2026-06-03",
          "actualReturnDate": "2026-06-04",
          "daysLate": 1,
          "dailyRate": 200000,
          "penaltyRate": 1.5
        }
      },
      {
        "type": "fuel_shortage",
        "description": "BBM berkurang dari full ke half (~3 liter)",
        "amount": 49500,
        "source": "auto_detected",
        "evidence": {
          "preFuelLevel": "full",
          "postFuelLevel": "half",
          "estimatedLitersShort": 3,
          "fuelPricePerLiter": 16500
        }
      },
      {
        "type": "damage",
        "description": "Penyok tangki bensin sisi kiri",
        "amount": null,
        "source": "auto_detected",
        "evidence": {
          "category": "body",
          "item": "Tangki bensin",
          "preCondition": "good",
          "postCondition": "moderate_damage",
          "description": "Penyok sisi kiri",
          "photoUrl": "/uploads/inspection/2026/06/tangki_penyok.jpg"
        }
      }
    ],
    "totalAutoDetected": 3,
    "totalWithAmount": 349500,
    "needsManualAmount": 1
  }
}
```

---

## 4. Customer Documents (KTP/SIM)

### 4.1 Upload Dokumen

```
POST /customers/:id/documents
```

**Request:**
```json
{
  "documentType": "ktp",
  "documentNumber": "3507123456780001",
  "photoUrl": "/uploads/docs/2026/06/ktp_ahmad.jpg"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Document uploaded",
  "data": {
    "id": "doc-uuid-001",
    "customerId": "customer-uuid",
    "documentType": "ktp",
    "documentNumber": "3507123456780001",
    "photoUrl": "/uploads/docs/2026/06/ktp_ahmad.jpg",
    "isVerified": false,
    "verifiedBy": null,
    "verifiedAt": null,
    "rejectionReason": null,
    "createdAt": "2026-06-01T07:30:00.000Z",
    "updatedAt": "2026-06-01T07:30:00.000Z"
  }
}
```

### 4.2 List Dokumen Customer

```
GET /customers/:id/documents
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "doc-uuid-001",
      "documentType": "ktp",
      "documentNumber": "3507123456780001",
      "photoUrl": "/uploads/docs/2026/06/ktp_ahmad.jpg",
      "isVerified": true,
      "verifiedBy": "staff-uuid",
      "verifiedAt": "2026-06-01T07:35:00.000Z",
      "rejectionReason": null,
      "createdAt": "2026-06-01T07:30:00.000Z"
    },
    {
      "id": "doc-uuid-002",
      "documentType": "sim_c",
      "documentNumber": "35071234567890",
      "photoUrl": "/uploads/docs/2026/06/simc_ahmad.jpg",
      "isVerified": true,
      "verifiedBy": "staff-uuid",
      "verifiedAt": "2026-06-01T07:36:00.000Z",
      "rejectionReason": null,
      "createdAt": "2026-06-01T07:30:00.000Z"
    }
  ]
}
```

### 4.3 Verify / Reject Dokumen

```
PATCH /customers/:id/documents/:documentId/verify
```

**Verify Request:**
```json
{
  "action": "verify"
}
```

**Reject Request:**
```json
{
  "action": "reject",
  "rejectionReason": "Foto tidak jelas, mohon upload ulang"
}
```

**Response 200 (verify):**
```json
{
  "success": true,
  "message": "Document verified",
  "data": {
    "id": "doc-uuid-001",
    "isVerified": true,
    "verifiedBy": "staff-uuid",
    "verifiedAt": "2026-06-01T07:35:00.000Z",
    "rejectionReason": null
  }
}
```

**Response 200 (reject):**
```json
{
  "success": true,
  "message": "Document rejected",
  "data": {
    "id": "doc-uuid-001",
    "isVerified": false,
    "verifiedBy": null,
    "verifiedAt": null,
    "rejectionReason": "Foto tidak jelas, mohon upload ulang"
  }
}
```

### 4.4 Hapus Dokumen

```
DELETE /customers/:id/documents/:documentId
```

**Response 200:**
```json
{
  "success": true,
  "message": "Document deleted"
}
```

---

## 5. Rental Contract

### 5.1 Generate Kontrak

```
POST /bookings/:id/contract
```

**Request:**
```json
{
  "termsAndConditions": "(optional — kosongkan untuk pakai default dari settings)"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Contract generated",
  "data": {
    "id": "contract-uuid",
    "bookingId": "booking-uuid",
    "contractNumber": "CTR-2026-0001",
    "status": "draft",
    "customerName": "Ahmad Rizki",
    "customerIdNumber": "3507123456780001",
    "customerPhone": "+6281234567890",
    "vehicleName": "Honda CRF 150L",
    "vehiclePlate": "B 1234 SV",
    "startDate": "2026-06-01",
    "endDate": "2026-06-03",
    "dailyRate": 200000,
    "totalAmount": 400000,
    "depositAmount": 500000,
    "termsAndConditions": "1. Penyewa bertanggung jawab penuh atas kendaraan selama masa sewa\n2. Kendaraan harus dikembalikan dalam kondisi yang sama seperti saat diserahkan\n3. Pengembalian melebihi batas waktu dikenakan denda sesuai ketentuan\n4. Penyewa wajib mengembalikan BBM dalam kondisi sama seperti saat pengambilan\n5. Kerusakan yang terjadi selama masa sewa menjadi tanggung jawab penyewa\n6. Penyewa wajib mematuhi peraturan lalu lintas yang berlaku\n7. Deposit dikembalikan setelah pemeriksaan kondisi kendaraan\n8. Kendaraan tidak boleh dipinjamkan kepada pihak lain tanpa izin\n9. Sewa dibatalkan jika dokumen tidak valid atau tidak lengkap\n10. Segala sengketa akan diselesaikan secara musyawarah",
    "customerSignature": null,
    "staffSignature": null,
    "customerSignedAt": null,
    "staffSignedAt": null,
    "pdfUrl": null,
    "createdAt": "2026-06-01T08:35:00.000Z",
    "updatedAt": "2026-06-01T08:35:00.000Z"
  }
}
```

### 5.2 Lihat Kontrak

```
GET /bookings/:id/contract
```

**Response 200:** Sama seperti response generate.

### 5.3 Tanda Tangan Kontrak

```
POST /bookings/:id/contract/sign
```

**Request (Customer sign):**
```json
{
  "party": "customer",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Request (Staff sign):**
```json
{
  "party": "staff",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Response 200 (setelah kedua pihak tanda tangan):**
```json
{
  "success": true,
  "message": "Contract signed",
  "data": {
    "id": "contract-uuid",
    "contractNumber": "CTR-2026-0001",
    "status": "signed",
    "customerSignature": "data:image/png;base64,iVBORw0KGgo...",
    "staffSignature": "data:image/png;base64,iVBORw0KGgo...",
    "customerSignedAt": "2026-06-01T08:40:00.000Z",
    "staffSignedAt": "2026-06-01T08:41:00.000Z"
  }
}
```

### 5.4 Download PDF

```
GET /bookings/:id/contract/pdf
```

**Response:** Binary PDF file dengan header `Content-Type: application/pdf`

---

## 6. Notifications

### 6.1 Kirim Notifikasi Manual

```
POST /notifications/send
```

**Request:**
```json
{
  "recipient": "6281234567890",
  "templateKey": "rental_reminder",
  "bookingId": "booking-uuid",
  "customMessage": null
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Notification sent",
  "data": {
    "id": "notif-uuid",
    "type": "whatsapp",
    "recipient": "6281234567890",
    "templateKey": "rental_reminder",
    "bookingId": "booking-uuid",
    "message": "Halo Ahmad Rizki! ⏰\nReminder: Rental Anda dimulai BESOK...",
    "status": "sent",
    "externalId": "fonnte-msg-123",
    "sentAt": "2026-05-31T18:00:00.000Z",
    "error": null,
    "createdAt": "2026-05-31T18:00:00.000Z"
  }
}
```

### 6.2 List Notification Logs

```
GET /notifications/logs?status=sent&limit=20&offset=0
```

**Query Params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | No | `pending`, `sent`, `failed` |
| `bookingId` | string | No | Filter by booking |
| `templateKey` | string | No | Filter by template |
| `limit` | number | No | Default 20, max 100 |
| `offset` | number | No | Default 0 |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "notif-uuid-1",
      "type": "whatsapp",
      "recipient": "6281234567890",
      "templateKey": "booking_confirmed",
      "bookingId": "booking-uuid",
      "message": "Halo Ahmad Rizki! ...",
      "status": "sent",
      "sentAt": "2026-06-01T09:00:00.000Z",
      "error": null,
      "createdAt": "2026-06-01T09:00:00.000Z"
    },
    {
      "id": "notif-uuid-2",
      "type": "whatsapp",
      "recipient": "6281234567890",
      "templateKey": "rental_started",
      "bookingId": "booking-uuid",
      "message": "Halo Ahmad Rizki! ...",
      "status": "sent",
      "sentAt": "2026-06-01T08:42:00.000Z",
      "error": null,
      "createdAt": "2026-06-01T08:42:00.000Z"
    }
  ],
  "meta": {
    "total": 15,
    "limit": 20,
    "offset": 0
  }
}
```

### 6.3 List Template yang Tersedia

```
GET /notifications/templates
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "key": "booking_confirmed",
      "label": "Booking Confirmed",
      "variables": ["customer_name", "booking_number", "vehicle_name", "start_date", "end_date", "total_amount"],
      "trigger": "auto (booking status → Confirmed)"
    },
    {
      "key": "payment_received",
      "label": "Payment Received",
      "variables": ["customer_name", "booking_number", "amount", "payment_method"],
      "trigger": "auto (payment verified)"
    },
    {
      "key": "rental_reminder",
      "label": "Rental Reminder (H-1)",
      "variables": ["customer_name", "vehicle_name", "start_date"],
      "trigger": "auto (cron H-1)"
    },
    {
      "key": "rental_started",
      "label": "Rental Started",
      "variables": ["customer_name", "booking_number", "vehicle_name", "vehicle_plate", "start_date", "end_date"],
      "trigger": "auto (booking status → Active)"
    },
    {
      "key": "rental_overdue",
      "label": "Rental Overdue",
      "variables": ["customer_name", "booking_number", "end_date", "daily_rate"],
      "trigger": "auto (cron daily)"
    },
    {
      "key": "return_confirmed",
      "label": "Return Confirmed",
      "variables": ["customer_name", "booking_number"],
      "trigger": "auto (booking status → Completed)"
    },
    {
      "key": "deposit_refund",
      "label": "Deposit Refund",
      "variables": ["customer_name", "booking_number", "deposit_amount", "deduction_amount", "refund_amount"],
      "trigger": "auto (deposit refund processed)"
    },
    {
      "key": "penalty_charged",
      "label": "Penalty Charged",
      "variables": ["customer_name", "booking_number", "penalty_type", "penalty_amount", "penalty_description"],
      "trigger": "auto (penalty status → charged)"
    }
  ]
}
```

### 6.4 Test Kirim

```
POST /notifications/test
```

**Request:**
```json
{
  "recipient": "6281234567890",
  "message": "Test notification dari Savanna Bromo Rental"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Test notification sent",
  "data": {
    "id": "notif-uuid",
    "status": "sent",
    "sentAt": "2026-06-01T10:00:00.000Z"
  }
}
```

---

## 7. Booking Status Check (Public)

Endpoint ini sudah ada dari phase 1, tapi response-nya diupdate.

```
GET /public/bookings/:bookingNumber/status
Auth: X-API-Key header
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "bookingNumber": "SVN-2026-0012",
    "status": "Active",
    "paymentStatus": "settlement",
    "vehicleName": "Honda CRF 150L",
    "startDate": "2026-06-01",
    "endDate": "2026-06-03",
    "totalAmount": 400000,
    "paidAt": "2026-06-01T09:00:00.000Z",
    "deposit": {
      "amount": 500000,
      "status": "collected"
    },
    "contract": {
      "contractNumber": "CTR-2026-0001",
      "status": "signed"
    },
    "inspections": {
      "pre": {
        "completedAt": "2026-06-01T08:15:00.000Z",
        "odometerKm": 12500,
        "fuelLevel": "full"
      },
      "post": null
    }
  }
}
```

---

## 8. Updated Booking Response

Booking detail response sekarang include data MVP2:

```
GET /bookings/:id
```

**Response 200 (updated):**
```json
{
  "success": true,
  "data": {
    "id": "booking-uuid",
    "bookingNumber": "SVN-2026-0012",
    "customerId": "customer-uuid",
    "vehicleId": "vehicle-uuid",
    "startDate": "2026-06-01",
    "endDate": "2026-06-03",
    "actualReturnDate": "2026-06-04",
    "startKm": 12500,
    "endKm": 12780,
    "status": "Completed",
    "paymentTerms": "Full_Upfront",
    "paymentStatus": "settlement",
    "paymentMethod": "online",
    "paymentPageUrl": null,
    "paidAt": "2026-06-01T09:00:00.000Z",
    "baseAmount": 400000,
    "addonsAmount": 0,
    "lateFee": 0,
    "totalAmount": 400000,
    "currency": "IDR",
    "notes": null,
    "createdBy": null,
    "cancelledAt": null,
    "createdAt": "2026-06-01T07:00:00.000Z",
    "updatedAt": "2026-06-04T18:00:00.000Z",

    "customer": {
      "id": "customer-uuid",
      "name": "Ahmad Rizki",
      "phone": "+6281234567890",
      "email": "ahmad@email.com",
      "documents": [
        { "documentType": "ktp", "isVerified": true },
        { "documentType": "sim_c", "isVerified": true }
      ]
    },

    "vehicle": {
      "id": "vehicle-uuid",
      "name": "Honda CRF 150L",
      "plateNumber": "B 1234 SV",
      "type": "TrailBike",
      "dailyRateIdr": 200000
    },

    "deposit": {
      "id": "deposit-uuid",
      "amount": 500000,
      "status": "partially_refunded",
      "totalDeductions": 499500,
      "refundedAmount": 500
    },

    "penalties": [
      { "type": "late_return", "amount": 300000, "status": "charged" },
      { "type": "fuel_shortage", "amount": 49500, "status": "charged" },
      { "type": "damage", "amount": 150000, "status": "charged" }
    ],

    "contract": {
      "contractNumber": "CTR-2026-0001",
      "status": "completed",
      "customerSignedAt": "2026-06-01T08:40:00.000Z",
      "staffSignedAt": "2026-06-01T08:41:00.000Z"
    },

    "inspections": {
      "pre": {
        "id": "insp-uuid-001",
        "odometerKm": 12500,
        "fuelLevel": "full",
        "overallCondition": "good",
        "completedAt": "2026-06-01T08:15:00.000Z"
      },
      "post": {
        "id": "insp-uuid-002",
        "odometerKm": 12780,
        "fuelLevel": "half",
        "overallCondition": "fair",
        "completedAt": "2026-06-03T17:30:00.000Z"
      }
    }
  }
}
```

---

## 9. Booking Workflow Guards

Booking status transitions sekarang punya prerequisites:

### `Confirmed` → `Active` (Start Rental)

**Required (all must be true):**
```json
{
  "canStart": true,
  "checks": {
    "paymentVerified": true,
    "documentsVerified": true,
    "preInspectionCompleted": true,
    "depositCollected": true,
    "contractSigned": true
  }
}
```

Frontend harus cek guards sebelum enable tombol "Start Rental":

```
GET /bookings/:id/start-check
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "canStart": false,
    "checks": {
      "paymentVerified": true,
      "documentsVerified": false,
      "preInspectionCompleted": false,
      "depositCollected": false,
      "contractSigned": false
    },
    "missing": [
      "Upload dan verify KTP/SIM customer",
      "Lengkapi pre-rental inspection",
      "Collect deposit",
      "Generate dan sign contract"
    ]
  }
}
```

### `Active` → `Completed` (Complete Rental)

```
GET /bookings/:id/complete-check
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "canComplete": false,
    "checks": {
      "postInspectionCompleted": false,
      "penaltiesSettled": false,
      "depositSettled": false
    },
    "missing": [
      "Lengkapi post-rental inspection",
      "Review dan settle penalties",
      "Process deposit refund"
    ]
  }
}
```

---

## 10. Enums & Constants

### `inspection.type`
```json
["pre_rental", "post_rental"]
```

### `inspection.fuelLevel`
```json
["full", "three_quarter", "half", "quarter", "empty"]
```

### `inspection.overallCondition`
```json
["excellent", "good", "fair", "poor"]
```

### `inspection.checklist[].category`
```json
["body", "brake", "tire", "engine", "electrical", "other"]
```

### `inspection.checklist[].condition`
```json
["good", "light_damage", "moderate_damage", "severe_damage"]
```

### `inspection.status`
```json
["draft", "completed"]
```

### `deposit.status`
```json
["collected", "partially_refunded", "fully_refunded", "forfeited"]
```

### `penalty.type`
```json
["late_return", "damage", "fuel_shortage", "traffic_violation", "other"]
```

### `penalty.status`
```json
["pending", "charged", "waived", "disputed"]
```

### `document.documentType`
```json
["ktp", "sim_a", "sim_c"]
```

### `contract.status`
```json
["draft", "customer_signed", "signed", "completed"]
```

### `notification.templateKey`
```json
["booking_confirmed", "payment_received", "rental_reminder", "rental_started", "rental_overdue", "return_confirmed", "deposit_refund", "penalty_charged"]
```

### `booking.status` (updated full list)
```json
["Pending", "pending_payment", "Confirmed", "Active", "Completed", "Cancelled", "payment_failed", "expired", "refunded"]
```
