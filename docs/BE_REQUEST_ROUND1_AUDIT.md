# Pesan untuk Tim Backend (savanna-backyard)

> Dari audit UX customer-side landing page, 2026-09-01.
> Item di bawah tidak bisa dibereskan di frontend karena kontrak/sumber datanya di backend.
> Urutan = prioritas.

---

## 1. [SECURITY] Webhook Xendit pembayaran parsial harus menghasilkan `dp_paid`, bukan `settlement` (BLOKIR RILIS)

Ada kasus booking DP terlihat lunas padahal baru bayar sebagian. FE sudah mengunci pickup sampai
`isFullyPaid`, tapi kalau webhook menandai `settlement` untuk pembayaran parsial, BE yang
menyatakan "lunas" dan FE tidak bisa mencegah pickup.

**Minta (sesuai USER_ACCOUNT_FEATURE.md §3.5):**
- Webhook baca `paid_amount` (`data.paid_amount ?? data.amount`).
- `paid_amount < totalAmount` → `paymentStatus = 'dp_paid'`, simpan `dpAmount`, `remainingAmount`.
- `paid_amount >= totalAmount` → `settlement`.
- `pay-remaining` (pembayaran kedua) harus mengubah status ke `settlement`, bukan menimpa DP.

## 2. [SECURITY] Status endpoint tidak boleh kirim `paymentPageUrl` ke anonymous caller (BLOKIR RILIS)

`GET /public/bookings/:bookingNumber/status?phone=` mengeluarkan `paymentPageUrl`.
Nomor booking + nomor HP mudah diketahui orang lain — mereka bisa membuka link bayar booking
milik orang lain.

**Minta (pilih salah satu, opsi a paling murah):**
- a. `paymentPageUrl` hanya dikirim bila request bawa session (cookie) pemilik booking.
- b. Anonymous boleh lihat status, tapi `paymentPageUrl` dihapus/disamarkan.

## 3. `dp_paid` tidak terdaftar di contract status endpoint (HIGH)

`GET /public/bookings/:bookingNumber/status` di `docs/CONTRACT_API_PUBLIC.md` hanya mendaftar
`paymentStatus`: `pending, settlement, deny, expire, cancel, refund`.
Frontend sudah menerima dan mengandalkan `dp_paid` (dari implementasi DP).

**Minta:**
- Perbarui contract: tambah `dp_paid` (dan konfirmasi `fully_paid` vs `settlement` mana yang final —
  di `ADMIN_BACKYARD_FEATURE.md` ada CHECK constraint `('pending','dp_paid','fully_paid','expired','cancelled')`,
  sedangkan FE menerima `settlement`. Samakan satu istilah).
- Daftarkan field `paymentType`, `dpAmount`, `remainingAmount`, `isFullyPaid`, `isPickupTime`, `id`
  pada response status + `GET /public/me/bookings` — FE sudah mengonsumsi semuanya tapi tidak ada di contract.

## 4. `GET /public/bookings/:bookingNumber/status` wajib kirim `remainingAmount` (HIGH)

Frontend saat ini menebak sisa tagihan:
```
remainingAmount ?? (paymentType === 'dp' ? totalAmount - (dpAmount || 30%) : 0)
```
Kalau BE pernah ubah persentase DP, tampilan FE salah. Kirim `remainingAmount` (dan `isFullyPaid`)
selalu di endpoint status dan summary.

## 5. Nominal pembayaran di response create-booking (MEDIUM)

`POST /public/bookings` hanya mengembalikan `totalAmount` (grand total), tidak ada field
`amountDue` / `paidAmount` / `dpAmount`. Akibatnya receipt FE setelah DP dulu menampilkan grand total.
Sudah ditambal FE dengan `totalAmount - remainingAmount`, tapi mending BE kirim eksplisit:
`paidAmount` (yang sudah dibayar) + `remainingAmount` di response create & status.

## 6. Persentase DP harus dari backend, bukan hardcode FE (MEDIUM)

FE sekarang menghitung DP sendiri: `Math.ceil(total * 0.3)` (BookingModal) dan
`Math.round(subtotal * 0.3)` (PaymentPage) — beda rounding, dan jika BE berbeda lagi
jadi tiga angka berbeda. Tolong:
- Tambahkan `depositPercent` (atau `dpAmount`) ke `GET /public/settings` atau response pricing.
- FE tinggal render; satu sumber kebenaran.

## 7. `POST /me/bookings/:id/scan-vehicle` + inspections belum ada di contract (MEDIUM)

Endpoint yang dipakai FE:
- `POST /public/me/bookings/:id/scan-vehicle`
- `POST /public/me/bookings/:id/inspection-photos`
- `POST /public/me/bookings/:id/inspections`
- `POST /public/me/bookings/:bookingId/pay-remaining`

Dokumentasikan di `api-contract-public.yaml` + `CONTRACT_API_PUBLIC.md`, termasuk:
- Response `scanCustomerVehicle`: `{ phase, vehicle, booking, checklistItems[], message }`
- `checklistItems[].required` — FE menolak submit sampai semua item required dijawab.
- Validasi server-side: scan pickup hanya boleh jika booking lunas + `isPickupTime` + belum `pickupConfirmed`.

## 8. `webOtp` dikirim ke response `auth/phone/init` (DISENGAJA — stopgap)

> **Konteks: kirim OTP via WhatsApp memang belum tersedia (provider belum ada), jadi OTP
> dikirim via web dulu secara sengaja.** Item ini bukan bug, tapi ada risiko yang perlu
> dicatat dan rencana migrasi.

`POST /public/auth/phone/init` mengembalikan `webOtp` langsung di response JSON
(dipakai FE untuk menampilkan OTP di layar). Konsekuensi: siapa pun yang tahu nomor HP korban
bisa login tanpa punya HP korban. Aman selama:

- [ ] Situs belum dibuka publik / belum ada transaksi nyata.
- [ ] Ada rencana implementasi WA OTP (Fonnte/WABLAS/360dialog) sebelum production.
- [ ] Opsional saat transisi: `webOtp` hanya dikirim untuk nomor di allowlist dev.

## 9. Availability endpoint granularitas jam (LOW)

`GET /public/availability` sudah benar menerima jam (`2026-07-12T18:00:00+07:00`), tapi
`GET /public/vehicles/:id/availability?month=` hanya date-granular. Kalau motor disewa
12:00–00:00, FE menandai SELURUH hari itu "booked" padahal pagi masih bebas.
Kirim `bookedRanges: [{start, end}]` (atau `bookedBlocks`) supaya FE bisa render slot per jam.
Sementara FE sudah mengatasi dengan cek ulang exact-range sebelum checkout — tapi user tetap
melihat hari yang sebenarnya masih bisa disewa jam pagi.

## 10. Booking expiry & konflik (LOW)

- Frontend countdown 15 menit; konfirmasi dengan BE: berapa lama booking `pending_payment`
  dianggap hangus dan di-release? Idealnya sinkron (FE angka tetap 15:00 kalau BE 15 menit).
- Pastikan race condition dua booking bersamaan ditolak (unique constraint / transaction).

## 11. `vehicleName` di `GET /public/me/bookings` (LOW)

FE harus fetch katalog kendaraan untuk mengisi nama. Tambahkan `vehicleName` langsung di
response summary (join sekali di BE) — FE sudah punya fallback, tapi bisa dihapus bila BE mengirim.

---

## Ringkasan prioritas

| # | Item | Dampak |
|---|------|--------|
| 1 | Webhook partial payment → `dp_paid` | **BLOKIR RILIS** |
| 2 | `paymentPageUrl` tidak bocor ke anonymous | **BLOKIR RILIS** |
| 3 | Contract `dp_paid` + field DP di status/summary | Dokumentasi & konsistensi |
| 4 | `remainingAmount`/`isFullyPaid` selalu terkirim | UI pelunasan akurat |
| 5 | `paidAmount` di response create/status | Receipt benar |
| 6 | DP % dari settings | Satu sumber kebenaran |
| 7 | Dokumentasi scan/inspection endpoints | Kontrak jelas |
| 8 | `webOtp` — disengaja sementara, WA provider belum ada | Catat risiko + rencana WA |
| 9 | Availability per-jam | UX kalender |
| 10 | Sinkronisasi expiry booking | UX |
| 11 | `vehicleName` di summary | Mengurangi 1 request FE |
