# Kontrak API - Savanna Bromo Rental (Frontend <-> Backend)

**Tanggal:** 28 Mei 2026
**Dari:** Tim Frontend
**Kepada:** Tim Backend
**Project:** Savanna Bromo Rental - Motor Trail Rental Website

---

## Halo Tim Backend,

Berikut adalah daftar endpoint API yang kami butuhkan dari sisi frontend. Kami sudah bagi jadi 2 fase supaya bisa dikerjakan bertahap.

### Informasi Umum

- **Base URL:** `http://localhost:8484/api/v1` (development)
- **Auth:** Semua request dikirim dengan header `X-API-Key: <key>`
- **Content-Type:** `application/json`
- **Response format:** Selalu wrap dalam `{ "success": boolean, "data": {...}, "message": "..." }`

---

## FASE 1 - WAJIB (Paling Urgent)

Endpoint ini **sudah ada kode frontend-nya** dan langsung di-call. Kalau ini belum jadi, booking flow dan contact form **tidak akan jalan**.

---

### 1. `GET /public/availability`

Cek kendaraan yang tersedia di rentang tanggal tertentu.

**Dipanggil saat:** User pilih tanggal di Booking Modal, sebelum isi data diri.

**Query Parameters:**

| Nama      | Tipe   | Wajib | Keterangan                                       |
|-----------|--------|-------|--------------------------------------------------|
| startDate | string | Ya    | Format `YYYY-MM-DD`                              |
| endDate   | string | Ya    | Format `YYYY-MM-DD`                              |
| type      | string | Tidak | `TrailBike`, `StreetBike`, `Car`, `Jeep`, `Other`|

**Response yang kami harapkan (200):**

```json
{
  "success": true,
  "data": {
    "requestedPeriod": {
      "startDate": "2026-06-01",
      "endDate": "2026-06-03"
    },
    "availableVehicles": [
      {
        "id": "string-uuid",
        "name": "Honda CRF 150L",
        "type": "TrailBike",
        "dailyRateIdr": 200000,
        "photoUrl": "/images/bike_crf150.jpg"
      }
    ],
    "unavailableVehicles": [
      {
        "id": "string-uuid",
        "name": "Honda CRF 250L",
        "reason": "Booked for the selected dates"
      }
    ],
    "totalAvailable": 1
  }
}
```

**Error response (400/500):**

```json
{
  "success": false,
  "message": "Invalid date range",
  "error": {
    "code": "INVALID_INPUT",
    "message": "startDate must be before or equal to endDate"
  }
}
```

---

### 2. `POST /public/bookings`

Membuat booking baru + generate Midtrans Snap payment token.

**Dipanggil saat:** User klik tombol bayar di step payment Booking Modal.

**Request body yang kami kirim:**

```json
{
  "vehicleId": "string-uuid",
  "startDate": "2026-06-01",
  "endDate": "2026-06-03",
  "customerName": "Ahmad Rizki",
  "customerPhone": "+6281234567890",
  "customerEmail": "ahmad@email.com",
  "notes": "Catatan tambahan"
}
```

| Field          | Tipe   | Wajib | Keterangan                     |
|----------------|--------|-------|--------------------------------|
| vehicleId      | string | Ya    | UUID kendaraan dari availability|
| startDate      | string | Ya    | `YYYY-MM-DD`                   |
| endDate        | string | Ya    | `YYYY-MM-DD`                   |
| customerName   | string | Ya    | Nama lengkap                   |
| customerPhone  | string | Ya    | Format `+62...`                |
| customerEmail  | string | Tidak | Email customer                 |
| notes          | string | Tidak | Catatan dari customer          |

**Response yang kami harapkan (200):**

```json
{
  "success": true,
  "data": {
    "bookingId": "string-uuid",
    "bookingNumber": "SVN-2026-0001",
    "snapToken": "midtrans-snap-token-string",
    "snapRedirectUrl": "https://app.sandbox.midtrans.com/snap/v2/redirection/xxx",
    "totalAmount": 400000
  }
}
```

**PENTING untuk payment gateway:**

Kami pakai **Midtrans Snap**. Saat user pilih "Bayar Online", kami butuh backend untuk:

1. Hit Midtrans API untuk bikin Snap Token:
   ```
   POST https://app.sandbox.midtrans.com/snap/v1/transactions
   Authorization: Basic <BASE64(ServerKey:)>
   ```
   ```json
   {
     "transaction_details": {
       "order_id": "SVN-2026-0001",
       "gross_amount": 400000
     },
     "item_details": [
       {
         "id": "vehicle-uuid",
         "price": 200000,
         "quantity": 2,
         "name": "Honda CRF 150L Rental (2 days)"
       }
     ],
     "customer_details": {
       "first_name": "Ahmad",
       "last_name": "Rizki",
       "email": "ahmad@email.com",
       "phone": "+6281234567890"
     }
   }
   ```

2. Midtrans akan balas:
   ```json
   {
     "token": "snap-token-xxx",
     "redirect_url": "https://app.sandbox.midtrans.com/snap/v2/redirection/xxx"
   }
   ```

3. Mapping ke response kami:
   - `token` -> `snapToken`
   - `redirect_url` -> `snapRedirectUrl`

4. Kami di FE akan auto-open `snapRedirectUrl` di tab baru browser.

Kalau user pilih **"Manual Transfer (BCA)"**, `snapToken` dan `snapRedirectUrl` bisa dikosongkan (`null`).

---

### 3. `POST /public/leads`

Submit form kontak / inquiry dari halaman Contact.

**Dipanggil saat:** User submit form di section Contact.

**Request body yang kami kirim:**

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
    "vehicleInterest": "TrailBike",
    "vehicleTypeId": null
  }
}
```

| Field                          | Tipe   | Wajib | Keterangan                                                    |
|--------------------------------|--------|-------|---------------------------------------------------------------|
| name                           | string | Ya    | Nama lengkap                                                  |
| phone                          | string | Ya    | Nomor HP                                                      |
| email                          | string | Tidak | Email                                                         |
| message                        | string | Tidak | Pesan inquiry                                                 |
| source                         | string | Tidak | Salah satu: `WhatsApp`, `Instagram`, `Facebook`, `TikTok`, `Website`, `WalkIn` |
| preferredDates                 | object | Tidak | Objek tanggal preferensi                                      |
| preferredDates.start           | string | Ya*   | `YYYY-MM-DD`                                                  |
| preferredDates.end             | string | Ya*   | `YYYY-MM-DD`                                                  |
| preferredDates.vehicleInterest | string | Tidak | `TrailBike`, `StreetBike`, `Car`, `Jeep`, `Other`            |
| preferredDates.vehicleTypeId   | string | Tidak | UUID vehicle type                                             |

**Response yang kami harapkan (200):**

```json
{
  "success": true,
  "message": "Lead submitted successfully",
  "data": {
    "id": "string-uuid",
    "status": "New",
    "createdAt": "2026-05-28T10:30:00Z"
  }
}
```

---

### 4. `POST /webhooks/midtrans/notification`

**Ini bukan endpoint yang kami panggil dari FE**, tapi endpoint yang harus kalian sediakan untuk menerima webhook dari Midtrans.

**Dipanggil oleh:** Midtrans server (otomatis setelah customer bayar)

**Body yang dikirim Midtrans:**

```json
{
  "transaction_time": "2026-05-28 10:30:00",
  "transaction_status": "settlement",
  "transaction_id": "midtrans-txn-001",
  "status_message": "success",
  "status_code": "200",
  "signature_key": "abc123...",
  "payment_type": "qris",
  "order_id": "SVN-2026-0001",
  "merchant_id": "M001234",
  "gross_amount": "400000.00",
  "fraud_status": "accept",
  "currency": "IDR"
}
```

**Yang perlu dilakukan backend:**
1. Verifikasi `signature_key` (hash dari `order_id + status_code + gross_amount + server_key`)
2. Cari booking berdasarkan `order_id` (field `bookingNumber`)
3. Update status booking berdasarkan `transaction_status`

**Status mapping:**

| `transaction_status` Midtrans | Status Booking di DB  |
|-------------------------------|-----------------------|
| `capture`                     | `confirmed`           |
| `settlement`                  | `confirmed`           |
| `pending`                     | `pending_payment`     |
| `deny`                        | `payment_failed`      |
| `expire`                      | `expired`             |
| `cancel`                      | `cancelled`           |
| `refund`                      | `refunded`            |

**Response yang harus dikembalikan ke Midtrans:**

```json
{
  "status_code": "200",
  "status_message": "OK"
}
```

---

## FASE 2 - Data Dinamis (Setelah Fase 1 Selesai)

Endpoint ini untuk mengganti data yang saat ini **hardcoded** di frontend. Setelah endpoint ini jadi, kami akan update FE untuk fetch dari API.

---

### 5. `GET /public/vehicles`

Data semua kendaraan yang tersedia untuk rental.

**Response yang kami harapkan:**

```json
{
  "success": true,
  "data": [
    {
      "id": "string-uuid",
      "name": "Honda CRF 150L",
      "type": "TrailBike",
      "category": "150cc Trail",
      "image": "/images/bike_crf150.jpg",
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

**Digunakan di:** Section Fleet (daftar motor)

---

### 6. `GET /public/packages`

Data paket tour yang ditawarkan.

**Response yang kami harapkan:**

```json
{
  "success": true,
  "data": [
    {
      "id": "string-uuid",
      "name": "Self-Ride Day",
      "tagline": "Bike, helmet, route map.",
      "description": "A clean trail bike, basic gear, and a mapped Bromo route...",
      "image": "/images/package_sunrise.jpg",
      "duration": "1 day",
      "distance": "Flexible",
      "groupSize": "1-2 riders",
      "price": 180000,
      "trailId": "sea-of-sand"
    }
  ]
}
```

**Digunakan di:** Section Tour Packages

---

### 7. `GET /public/pricing`

Data tier harga rental.

**Response yang kami harapkan:**

```json
{
  "success": true,
  "data": [
    {
      "id": "string-uuid",
      "name": "Ride Only",
      "description": "For the independent rider",
      "dailyPrice": 150000,
      "multiDayPrice": 120000,
      "features": ["Motorcycle rental", "Standard helmet", "Basic insurance", "24/7 roadside support"],
      "notIncluded": ["Riding gear", "Raincoat", "Phone holder", "Route guide"],
      "highlighted": false,
      "icon": "Bike"
    }
  ]
}
```

**Digunakan di:** Section Pricing

---

### 8. `GET /public/reviews`

Data review/testimoni dari customer.

**Query Parameters (opsional):** `limit`, `offset`, `rating`

**Response yang kami harapkan:**

```json
{
  "success": true,
  "data": [
    {
      "id": "string-uuid",
      "name": "Ahmad Rizki",
      "location": "Jakarta",
      "rating": 5,
      "text": "Motor bersih, pelayanan ramah...",
      "avatar": "AR",
      "createdAt": "2026-05-20T08:00:00Z"
    }
  ],
  "meta": {
    "total": 5,
    "averageRating": 5.0
  }
}
```

**Digunakan di:** Section Testimonials

---

### 9. `GET /public/trails`

Data trail/rute yang tersedia.

**Response yang kami harapkan:**

```json
{
  "success": true,
  "data": [
    {
      "id": "sea-of-sand",
      "name": "Sea of Sand Loop",
      "desc": "The classic Bromo crossing through volcanic sand dunes.",
      "terrain": "Volcanic Sand, Gravel",
      "elevation": "2,100m - 2,329m",
      "difficulty": "Moderate",
      "recommended": "CRF 150L / KLX 150",
      "image": "/images/dayride_bike_landscape.jpg",
      "mapImage": "/images/map_sea_of_sand.png"
    }
  ]
}
```

**Digunakan di:** Section Trails Guide

---

### 10. `GET /public/trails/:trailId`

Detail satu trail untuk halaman blog post.

**Response yang kami harapkan:**

```json
{
  "success": true,
  "data": {
    "id": "sea-of-sand",
    "name": "Sea of Sand Loop",
    "desc": "...",
    "terrain": "Volcanic Sand, Gravel",
    "elevation": "2,100m - 2,329m",
    "difficulty": "Moderate",
    "recommended": "CRF 150L / KLX 150",
    "image": "/images/dayride_bike_landscape.jpg",
    "mapImage": "/images/map_sea_of_sand.png",
    "blogContent": {
      "overview": "Konten blog dalam format text/markdown...",
      "tips": "Tips untuk trail ini...",
      "gallery": ["/images/trail/sea_1.jpg", "/images/trail/sea_2.jpg"],
      "gpxUrl": "/gpx/sea_of_sand.gpx",
      "estimatedDuration": "2-3 hours",
      "distance": "25 km",
      "bestTime": "Dry season (April - October)"
    }
  }
}
```

**Digunakan di:** Halaman Route Blog Post

---

### 11. `GET /public/settings`

Konfigurasi website (kontak, nomor WA, rekening bank, dll).

**Response yang kami harapkan:**

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

**Digunakan di:** Contact section, Floating WhatsApp button, Closing section

---

### 12. `GET /public/bookings/:bookingNumber/status`

Cek status booking berdasarkan nomor booking.

**Response yang kami harapkan:**

```json
{
  "success": true,
  "data": {
    "bookingNumber": "SVN-2026-0001",
    "status": "confirmed",
    "paymentStatus": "settlement",
    "vehicleName": "Honda CRF 150L",
    "startDate": "2026-06-01",
    "endDate": "2026-06-03",
    "totalAmount": 400000,
    "paidAt": "2026-05-28T10:35:00Z"
  }
}
```

---

## Database Tables yang Kami Rekomendasikan

Sebagai referensi, berikut table yang kemungkinan dibutuhkan:

### `vehicles`
| Column        | Tipe       | Keterangan                          |
|---------------|------------|-------------------------------------|
| id            | UUID       | Primary key                         |
| name          | string     | Nama kendaraan                      |
| type          | enum       | `TrailBike`, `StreetBike`, `Car`, `Jeep`, `Other` |
| category      | string     | Contoh: "150cc Trail"               |
| image         | string     | Path gambar                         |
| daily_rate_idr| integer    | Harga sewa per hari                 |
| specs         | JSON       | { engine, power, weight, seat }     |
| description   | text       | Deskripsi kendaraan                 |
| available     | boolean    | Status ketersediaan                 |
| created_at    | timestamp  |                                     |
| updated_at    | timestamp  |                                     |

### `bookings`
| Column          | Tipe       | Keterangan                          |
|-----------------|------------|-------------------------------------|
| id              | UUID       | Primary key                         |
| booking_number  | string     | Unik, contoh: `SVN-2026-0001`      |
| vehicle_id      | UUID       | FK ke vehicles                      |
| start_date      | date       | Tanggal mulai                       |
| end_date        | date       | Tanggal selesai                     |
| customer_name   | string     |                                     |
| customer_phone  | string     |                                     |
| customer_email  | string     | Nullable                            |
| notes           | text       | Nullable                            |
| status          | enum       | `pending_payment`, `confirmed`, `active`, `completed`, `cancelled`, `expired`, `payment_failed` |
| payment_status  | enum       | `pending`, `settlement`, `deny`, `expire`, `cancel`, `refund` |
| payment_method  | string     | `online` / `manual`                 |
| snap_token      | string     | Nullable, dari Midtrans             |
| total_amount    | integer    | Total harga                         |
| paid_at         | timestamp  | Nullable                            |
| created_at      | timestamp  |                                     |
| updated_at      | timestamp  |                                     |

### `leads`
| Column             | Tipe       | Keterangan                          |
|--------------------|------------|-------------------------------------|
| id                 | UUID       | Primary key                         |
| name               | string     |                                     |
| phone              | string     |                                     |
| email              | string     | Nullable                            |
| message            | text       | Nullable                            |
| source             | string     | `WhatsApp`, `Instagram`, dll        |
| preferred_start    | date       | Nullable                            |
| preferred_end      | date       | Nullable                            |
| vehicle_interest   | string     | Nullable                            |
| status             | enum       | `New`, `Contacted`, `Converted`, `Lost` |
| created_at         | timestamp  |                                     |
| updated_at         | timestamp  |                                     |

### `packages`
| Column     | Tipe    | Keterangan                     |
|------------|---------|--------------------------------|
| id         | UUID    | Primary key                    |
| name       | string  |                                |
| tagline    | string  |                                |
| description| text    |                                |
| image      | string  | Path gambar                    |
| duration   | string  |                                |
| distance   | string  |                                |
| group_size | string  |                                |
| price      | integer | Harga dalam IDR                |
| trail_id   | string  | Slug trail terkait             |

### `pricing_tiers`
| Column         | Tipe       | Keterangan                     |
|----------------|------------|--------------------------------|
| id             | UUID       | Primary key                    |
| name           | string     |                                |
| description    | string     |                                |
| daily_price    | integer    | Harga harian                   |
| multi_day_price| integer    | Harga multi-day                |
| features       | JSON/array | List fitur yang termasuk       |
| not_included   | JSON/array | List fitur yang tidak termasuk |
| highlighted    | boolean    | Tier yang di-highlight         |
| icon           | string     | Nama icon                      |

### `reviews`
| Column    | Tipe       | Keterangan                     |
|-----------|------------|--------------------------------|
| id        | UUID       | Primary key                    |
| name      | string     |                                |
| location  | string     |                                |
| rating    | integer    | 1-5                            |
| text      | text       |                                |
| avatar    | string     | Inisial, contoh: "AR"         |
| created_at| timestamp  |                                |

### `trails`
| Column      | Tipe   | Keterangan                     |
|-------------|--------|--------------------------------|
| id          | string | Slug, contoh: "sea-of-sand"   |
| name        | string |                                |
| desc        | text   |                                |
| terrain     | string |                                |
| elevation   | string |                                |
| difficulty  | string | `Easy`, `Moderate`, `Hard`, `Extreme` |
| recommended | string |                                |
| image       | string | Path gambar                    |
| map_image   | string | Path peta                      |

### `settings`
| Column    | Tipe   | Keterangan                     |
|-----------|--------|--------------------------------|
| key       | string | Unique key                     |
| value     | text   | Value (bisa JSON)              |

---

## Environment Variables yang Kami Pakai di FE

```env
VITE_API_URL=http://localhost:8484/api/v1
VITE_API_KEY=your-api-key-here
```

Pastikan backend berjalan di port `8484` atau sesuaikan value `VITE_API_URL` kami.

---

## Error Handling yang Kami Harapkan

Semua error response sebaiknya mengikuti format ini supaya kami bisa handle di FE:

```json
{
  "success": false,
  "message": "Human readable error message",
  "error": {
    "code": "ERROR_CODE",
    "message": "Detail error"
  }
}
```

**HTTP Status Codes:**
- `200` - Sukses
- `400` - Validasi gagal / input salah
- `401` - API Key salah / tidak ada
- `404` - Resource tidak ditemukan
- `409` - Konflik (misal kendaraan sudah dibooking)
- `500` - Server error

---

## Timeline yang Kami Harapkan

| Fase | Endpoint                              | Target      |
|------|---------------------------------------|-------------|
| 1    | `GET /public/availability`            | Minggu ini  |
| 1    | `POST /public/bookings`               | Minggu ini  |
| 1    | `POST /public/leads`                  | Minggu ini  |
| 1    | `POST /webhooks/midtrans/notification`| Minggu ini  |
| 2    | `GET /public/vehicles`                | Minggu depan|
| 2    | `GET /public/packages`                | Minggu depan|
| 2    | `GET /public/pricing`                 | Minggu depan|
| 2    | `GET /public/reviews`                 | Minggu depan|
| 2    | `GET /public/trails`                  | Minggu depan|
| 2    | `GET /public/trails/:trailId`         | Minggu depan|
| 2    | `GET /public/settings`                | Minggu depan|
| 2    | `GET /public/bookings/:bookingNumber/status` | Minggu depan |

---

Kalau ada pertanyaan atau ada field yang perlu ditambah/diubah, silakan diskusi langsung. Kami fleksibel soal nama field selama response format-nya konsisten.

Terima kasih!

**Tim Frontend - Savanna Bromo Rental**
