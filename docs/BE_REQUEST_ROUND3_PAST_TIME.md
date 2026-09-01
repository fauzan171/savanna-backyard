# Pesan untuk Tim Backend — Round 3 (blokir booking waktu lewat)

> 2026-09-01. Konteks: UX requirement baru — customer tidak boleh booking
> waktu yang sudah lewat. FE sudah menegakkan di kalender & slot jam;
> item di bawah minta enforcement yang sama di BE (source of truth).

---

## 1. [HIGH] Server-side rejection untuk tanggal/jam yang sudah lewat

**Temuan:** `POST /public/bookings` (`public-api.service.ts:330`) hanya
memvalidasi `startDate < endDate` dan konflik availability. **Tidak ada
penolakan untuk tanggal/jam di masa lalu.** Caller yang bypass UI (curl
langsung ke API) bisa membuat booking di masa lalu.

**Minta:**
- Di `createPublicBooking`: jika `startDate < now` → tolak `400`
  (`VALIDATION_ERROR`, pesan jelas: "Start date is in the past").
- Rekomendasi margin kecil: izinkan startDate hingga ~5 menit ke depan dari
  `now` (clock skew ringan), tolak selebihnya.
- Sama untuk `GET /public/availability`: periode yang seluruhnya di masa lalu
  boleh tetap dihitung (untuk riwayat), tapi tidak masalah — yang penting
  create-booking yang menolak.

## 2. [LOW] Kalender bulanan — hari masa lalu tidak perlu dihitung

`getVehicleAvailabilityForMonth` untuk bulan berjalan menghitung semua hari
(ini sudah OK). Catatan saja: FE sudah menandai hari lampau sebagai disabled
(`isBefore(date, startOfDay(now))`), jadi tidak ada kerja BE di sini.

## 3. [CONFIRM] Slot jam diserahkan ke FE — konfirmasi sinkron

Slot 12h fixed saat ini hidup di FE (MotorDetail 4 slot: 12/15/18/21;
BookingModal 9 slot termasuk 00:00 & 23:59). BE menerima ISO datetime
apapun dalam rentang valid. Selama BE menolak `startDate < now`, definition
slot di FE aman. **Tidak perlu perubahan BE** — hanya memastikan poin 1 jalan.

---

## Ringkasan

| # | Item | Dampak |
|---|------|--------|
| 1 | Tolak `startDate` di masa lalu di create-booking (server-side) | Mencegah booking waktu lampau via API langsung |
| 2 | (Catatan) kalender bulanan sudah aman | — |
