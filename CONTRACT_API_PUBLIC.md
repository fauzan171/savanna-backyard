# Savanna Bromo Rental — Public API Contract

**Base URL:** `https://savanna-backyard.andifauzan986.workers.dev/api/v1`
**Auth:** Semua request wajib header `X-API-Key: savanna-dev-api-key-2026`
**Content-Type:** `application/json`

---

## Daftar Endpoint

| # | Method | Endpoint | Deskripsi |
|---|--------|----------|-----------|
| 1 | GET | `/public/vehicles` | List semua kendaraan |
| 2 | GET | `/public/vehicles/:id` | Detail satu kendaraan |
| 3 | GET | `/public/availability` | Cek ketersediaan by tanggal |
| 4 | GET | `/public/packages` | List paket tour |
| 5 | GET | `/public/pricing` | List tier harga |
| 6 | GET | `/public/reviews` | List review/testimoni |
| 7 | GET | `/public/trails` | List trail/rute |
| 8 | GET | `/public/trails/:trailId` | Detail trail + blog content |
| 9 | GET | `/public/settings` | Konfigurasi website |
| 10 | POST | `/public/bookings` | Buat booking baru |
| 11 | GET | `/public/bookings/:bookingNumber/status` | Cek status booking |
| 12 | POST | `/public/leads` | Submit inquiry/contact form |

---

## 1. GET `/public/vehicles`

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
      "image": "/images/bike_crf150.jpg",
      "dailyRateIdr": 200000,
      "specs": {
        "engine": "149.15 cc",
        "power": "12.4 HP",
        "weight": "122 kg",
        "seat": "865 mm"
      },
      "description": "A real Indonesian dual-sport favorite. Lightweight, reliable, and perfectly suited for Bromo's volcanic sand terrain.",
      "available": true
    },
    {
      "id": "a1711bfe-d78c-4488-bb8e-e26b622b0e63",
      "name": "Honda CRF 250L",
      "type": "TrailBike",
      "category": "250cc Trail",
      "image": "/images/bike_crf250.jpg",
      "dailyRateIdr": 350000,
      "specs": {
        "engine": "249.6 cc",
        "power": "24.4 HP",
        "weight": "153 kg",
        "seat": "875 mm"
      },
      "description": "More power for experienced riders who want to tackle Bromo's challenging trails with confidence.",
      "available": true
    },
    {
      "id": "46856fa6-74f6-48b1-a111-2c94fcbe67a9",
      "name": "Kawasaki KLX 150",
      "type": "TrailBike",
      "category": "150cc Trail",
      "image": "/images/bike_klx150.jpg",
      "dailyRateIdr": 200000,
      "specs": {
        "engine": "144 cc",
        "power": "11.5 HP",
        "weight": "114 kg",
        "seat": "830 mm"
      },
      "description": "Lightweight and nimble, the KLX 150 is perfect for beginners exploring Bromo for the first time.",
      "available": true
    },
    {
      "id": "697a297f-0cd2-4bb3-81f1-9f7227b5c282",
      "name": "Kawasaki KLX 250",
      "type": "TrailBike",
      "category": "250cc Trail",
      "image": "/images/bike_klx250.jpg",
      "dailyRateIdr": 350000,
      "specs": {
        "engine": "249 cc",
        "power": "23.2 HP",
        "weight": "138 kg",
        "seat": "855 mm"
      },
      "description": "A capable dual-sport machine that handles both on-road and off-road terrain with ease.",
      "available": true
    },
    {
      "id": "c5a1d8f0-9b3e-4f2a-8d7c-1e6f3b5a9c02",
      "name": "Yamaha NMAX",
      "type": "StreetBike",
      "category": "155cc Scooter",
      "image": "/images/bike_nmax.jpg",
      "dailyRateIdr": 150000,
      "specs": {
        "engine": "155 cc",
        "power": "15.4 HP",
        "weight": "131 kg",
        "seat": "765 mm"
      },
      "description": "Comfortable scooter for city riding and easy trips around the Bromo area.",
      "available": true
    },
    {
      "id": "b3e7c2d4-5f8a-4e1b-9c6d-2a7f8e3b1c45",
      "name": "Toyota Avanza",
      "type": "Car",
      "category": "MPV",
      "image": "/images/car_avanza.jpg",
      "dailyRateIdr": 400000,
      "specs": {
        "engine": "1496 cc",
        "power": "104 HP",
        "weight": "1155 kg",
        "seat": "5 seats"
      },
      "description": "Spacious family car perfect for group trips to Bromo with comfort and reliability.",
      "available": true
    }
  ]
}
```

---

## 2. GET `/public/vehicles/:id`

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
    "photoUrl": "/images/bike_crf150.jpg",
    "specifications": {
      "description": null
    }
  }
}
```

**Response 404:**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Vehicle not found"
  }
}
```

---

## 3. GET `/public/availability`

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `startDate` | string | Ya | `YYYY-MM-DD` |
| `endDate` | string | Ya | `YYYY-MM-DD` |
| `type` | string | Tidak | `TrailBike`, `StreetBike`, `Car`, `Jeep`, `Other` |

**Contoh:** `GET /public/availability?startDate=2026-06-10&endDate=2026-06-12`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "requestedPeriod": {
      "startDate": "2026-06-10",
      "endDate": "2026-06-12"
    },
    "availableVehicles": [
      {
        "id": "6080faa7-44e7-422e-93b2-236c9fa4ab6f",
        "name": "Honda CRF 150L",
        "type": "TrailBike",
        "dailyRateIdr": 200000,
        "photoUrl": "/images/bike_crf150.jpg"
      },
      {
        "id": "a1711bfe-d78c-4488-bb8e-e26b622b0e63",
        "name": "Honda CRF 250L",
        "type": "TrailBike",
        "dailyRateIdr": 350000,
        "photoUrl": "/images/bike_crf250.jpg"
      }
    ],
    "unavailableVehicles": [
      {
        "id": "some-uuid",
        "name": "Kawasaki KLX 150",
        "reason": "Already booked"
      }
    ],
    "totalAvailable": 2
  }
}
```

**Response 400 (tanggal salah):**

```json
{
  "success": false,
  "message": "Start date must be before or equal to end date",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Start date must be before or equal to end date"
  }
}
```

---

## 4. GET `/public/packages`

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "name": "Self-Ride Day",
      "tagline": "Bike, helmet, route map.",
      "description": "A clean trail bike, basic gear, and a mapped Bromo route. You ride solo, at your own pace, with 24/7 phone support if needed.",
      "image": "/images/package_sunrise.jpg",
      "duration": "1 day",
      "distance": "Flexible",
      "groupSize": "1-2 riders",
      "price": 180000,
      "trailId": "sea-of-sand"
    },
    {
      "id": "uuid-2",
      "name": "Guided Sunrise Tour",
      "tagline": "Guided sunrise, breakfast included.",
      "description": "An expert local guide leads you to Bromo's famous sunrise viewpoint, then across the Sea of Sand. Breakfast at a local warung included.",
      "image": "/images/package_guided.jpg",
      "duration": "1 day",
      "distance": "60 km",
      "groupSize": "2-6 riders",
      "price": 350000,
      "trailId": "sea-of-sand"
    },
    {
      "id": "uuid-3",
      "name": "Multi-Day Adventure",
      "tagline": "3 days, 2 nights, full support.",
      "description": "Explore Bromo, the Whispering Savanna, and hidden waterfalls over 3 days. Accommodation, meals, and full mechanical support included.",
      "image": "/images/package_adventure.jpg",
      "duration": "3 days",
      "distance": "200 km",
      "groupSize": "4-8 riders",
      "price": 750000,
      "trailId": "whispering-savanna"
    },
    {
      "id": "uuid-4",
      "name": "Custom Bromo Trip",
      "tagline": "Tell us your dream trip.",
      "description": "Have something specific in mind? We'll build a custom itinerary just for you — routes, duration, group size, all flexible.",
      "image": "/images/package_custom.jpg",
      "duration": "Flexible",
      "distance": "Custom",
      "groupSize": "Any",
      "price": 0,
      "trailId": null
    }
  ]
}
```

---

## 5. GET `/public/pricing`

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "name": "Ride Only",
      "description": "For the independent rider",
      "dailyPrice": 150000,
      "multiDayPrice": 120000,
      "features": ["Motorcycle rental", "Standard helmet", "Basic insurance", "24/7 roadside support"],
      "notIncluded": ["Riding gear", "Raincoat", "Phone holder", "Route guide"],
      "highlighted": false,
      "icon": "Bike"
    },
    {
      "id": "uuid-2",
      "name": "Ride + Guide",
      "description": "The most popular choice",
      "dailyPrice": 250000,
      "multiDayPrice": 200000,
      "features": ["Motorcycle rental", "Full riding gear", "Insurance included", "Local route guide", "Breakfast & water", "Photo spots tour"],
      "notIncluded": ["Hotel pickup", "Lunch/dinner"],
      "highlighted": true,
      "icon": "Compass"
    },
    {
      "id": "uuid-3",
      "name": "Full Package",
      "description": "All-inclusive adventure",
      "dailyPrice": 400000,
      "multiDayPrice": 350000,
      "features": ["Premium motorcycle", "Full riding gear", "Comprehensive insurance", "Expert guide", "All meals included", "Hotel pickup & drop-off", "Souvenir photo pack"],
      "notIncluded": [],
      "highlighted": false,
      "icon": "Crown"
    }
  ]
}
```

---

## 6. GET `/public/reviews`

**Query Parameters (opsional):**

| Param | Type | Description |
|-------|------|-------------|
| `limit` | number | Default 10, max 100 |
| `offset` | number | Default 0 |
| `rating` | number | Filter rating 1-5 |

**Contoh:** `GET /public/reviews?limit=5&offset=0`

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "name": "Ahmad Rizki",
      "location": "Jakarta",
      "rating": 5,
      "text": "Motor bersih, pelayanan ramah, rutenya jelas. Pengalaman pertama naik trail di Bromo dan sangat memuaskan!",
      "avatar": "AR",
      "createdAt": "2026-05-29T00:00:00.000Z"
    },
    {
      "id": "uuid-2",
      "name": "Sarah Chen",
      "location": "Singapore",
      "rating": 5,
      "text": "Amazing experience! The bike was in perfect condition and the guide knew all the best spots. Will definitely come back.",
      "avatar": "SC",
      "createdAt": "2026-05-29T00:00:00.000Z"
    },
    {
      "id": "uuid-3",
      "name": "Budi Santoso",
      "location": "Surabaya",
      "rating": 4,
      "text": "Trailnya seru, tapi agak menantang buat pemula. Untung guide-nya sabar dan sangat membantu. Recommended!",
      "avatar": "BS",
      "createdAt": "2026-05-29T00:00:00.000Z"
    },
    {
      "id": "uuid-4",
      "name": "Lisa Wijaya",
      "location": "Bandung",
      "rating": 5,
      "text": "Sewa motor trail terbaik di Bromo! Harga reasonable, motor terawat, dan tim-nya super helpful.",
      "avatar": "LW",
      "createdAt": "2026-05-29T00:00:00.000Z"
    },
    {
      "id": "uuid-5",
      "name": "Tom Miller",
      "location": "Australia",
      "rating": 4,
      "text": "Great value for money. The KLX 150 was perfect for the terrain. Just wish there were more trail options.",
      "avatar": "TM",
      "createdAt": "2026-05-29T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 5,
    "averageRating": 4.6
  }
}
```

---

## 7. GET `/public/trails`

**Response 200:**

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
    },
    {
      "id": "whispering-savanna",
      "name": "Whispering Savanna",
      "desc": "Gentle rolling hills with stunning views of the caldera.",
      "terrain": "Grassland, Dirt Track",
      "elevation": "2,000m - 2,200m",
      "difficulty": "Easy",
      "recommended": "Any trail bike",
      "image": "/images/trail_savanna.jpg",
      "mapImage": "/images/map_whispering_savanna.png"
    },
    {
      "id": "caldera-rim",
      "name": "Caldera Rim Trail",
      "desc": "Challenging ride along the volcanic caldera edge.",
      "terrain": "Rocky, Steep inclines, Volcanic ash",
      "elevation": "2,200m - 2,700m",
      "difficulty": "Hard",
      "recommended": "CRF 250L / KLX 250",
      "image": "/images/trail_caldera.jpg",
      "mapImage": "/images/map_caldera_rim.png"
    }
  ]
}
```

---

## 8. GET `/public/trails/:trailId`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "sea-of-sand",
    "name": "Sea of Sand Loop",
    "desc": "The classic Bromo crossing through volcanic sand dunes.",
    "terrain": "Volcanic Sand, Gravel",
    "elevation": "2,100m - 2,329m",
    "difficulty": "Moderate",
    "recommended": "CRF 150L / KLX 150",
    "image": "/images/dayride_bike_landscape.jpg",
    "mapImage": "/images/map_sea_of_sand.png",
    "blogContent": {
      "overview": "The Sea of Sand is Bromo's most iconic landscape — a vast, otherworldly plain of volcanic sand stretching between the caldera walls. This loop takes you across the sandy basin, up to the crater rim, and back through local village trails.\n\nThe terrain is mostly soft sand with some gravel sections, making it perfect for trail bikes. The total loop covers about 25km and takes 2-3 hours at a comfortable pace.",
      "tips": "- Start early (4-5 AM) for sunrise views from the crater rim\n- Carry extra water — there are no shops on the trail\n- Lower your tire pressure slightly for better sand traction\n- Wear a dust mask or bandana over your nose and mouth\n- The sand can be deep in some sections — maintain momentum",
      "gallery": [
        "/images/trail/sea_1.jpg",
        "/images/trail/sea_2.jpg",
        "/images/trail/sea_3.jpg"
      ],
      "gpxUrl": "/gpx/sea_of_sand.gpx",
      "estimatedDuration": "2-3 hours",
      "distance": "25 km",
      "bestTime": "Dry season (April - October)"
    }
  }
}
```

**Response 404:**

```json
{
  "success": false,
  "message": "Trail not found",
  "error": {
    "code": "NOT_FOUND",
    "message": "Trail not found"
  }
}
```

---

## 9. GET `/public/settings`

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

## 10. POST `/public/bookings`

**Request:**

```json
{
  "vehicleId": "6080faa7-44e7-422e-93b2-236c9fa4ab6f",
  "startDate": "2026-06-15",
  "endDate": "2026-06-17",
  "customerName": "Ahmad Rizki",
  "customerPhone": "+6281234567890",
  "customerEmail": "ahmad@email.com",
  "notes": "Catatan tambahan (opsional)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `vehicleId` | string | Ya | Ambil dari `GET /public/vehicles` atau `GET /public/availability` |
| `startDate` | string | Ya | `YYYY-MM-DD` |
| `endDate` | string | Ya | `YYYY-MM-DD` (harus setelah startDate) |
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
    "bookingNumber": "SVN-2026-0001",
    "paymentPageUrl": null,
    "totalAmount": 400000
  }
}
```

> `paymentPageUrl` akan terisi URL payment page kalau iFortePay sudah dikonfigurasi. Saat ini `null` karena belum ada credential.

**Response 400 (validasi gagal):**

```json
{
  "success": false,
  "message": "Vehicle is already booked for the selected dates",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Vehicle is already booked for the selected dates"
  }
}
```

---

## 11. GET `/public/bookings/:bookingNumber/status`

**Contoh:** `GET /public/bookings/SVN-2026-0001/status`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "bookingNumber": "SVN-2026-0001",
    "status": "pending_payment",
    "paymentStatus": "pending",
    "vehicleName": "Honda CRF 150L",
    "startDate": "2026-06-15",
    "endDate": "2026-06-17",
    "totalAmount": 400000,
    "paidAt": null
  }
}
```

**Possible `status` values:**
`pending_payment`, `Confirmed`, `Active`, `Completed`, `Cancelled`, `payment_failed`, `expired`

**Possible `paymentStatus` values:**
`pending`, `settlement`, `deny`, `expire`, `cancel`, `refund`

**Response 404:**

```json
{
  "success": false,
  "message": "Booking not found",
  "error": {
    "code": "NOT_FOUND",
    "message": "Booking not found"
  }
}
```

---

## 12. POST `/public/leads`

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

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Ya | Min 2 karakter |
| `phone` | string | Ya | Min 10 karakter |
| `email` | string | Tidak | Format email valid |
| `message` | string | Tidak | Max 1000 karakter |
| `source` | string | Tidak | `WhatsApp`, `Instagram`, `Facebook`, `TikTok`, `Website`, `WalkIn` |
| `preferredDates` | object | Tidak | Objek tanggal preferensi |
| `preferredDates.start` | string | Ya* | `YYYY-MM-DD` |
| `preferredDates.end` | string | Ya* | `YYYY-MM-DD` |
| `preferredDates.vehicleInterest` | string | Tidak | `TrailBike`, `StreetBike`, `Car`, `Jeep`, `Other` |

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

## Error Response Format

Semua error mengikuti format ini:

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
- `200` — Sukses
- `201` — Created
- `400` — Validasi gagal
- `401` — API Key salah / tidak ada
- `404` — Resource tidak ditemukan
- `409` — Konflik
- `500` — Server error

---

## FE Environment Variables

```env
VITE_API_URL=https://savanna-backyard.andifauzan986.workers.dev/api/v1
VITE_API_KEY=savanna-dev-api-key-2026
```

---

## Contoh Fetch (JavaScript)

```js
const API_URL = import.meta.env.VITE_API_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
};

// GET request
const res = await fetch(`${API_URL}/public/vehicles`, { headers });
const { success, data } = await res.json();

// POST request (booking)
const res = await fetch(`${API_URL}/public/bookings`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    vehicleId: '6080faa7-44e7-422e-93b2-236c9fa4ab6f',
    startDate: '2026-06-15',
    endDate: '2026-06-17',
    customerName: 'Ahmad Rizki',
    customerPhone: '+6281234567890',
    customerEmail: 'ahmad@email.com',
  }),
});
const { success, data } = await res.json();
```
