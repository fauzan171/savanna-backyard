# Pesan untuk Tim Backend — Round 2 (bookedRanges & follow-up)

> Setelah FE mengadopsi semua perubahan kontrak dari ronde pertama
> (commit `80ac2d7` dan `611b499` di repo savana). FE sudah ter-deploy.

---

## 1. Terima kasih + konfirmasi penerimaan

Semua item di `BE_REQUEST_FROM_FE_AUDIT.md` sudah diverifikasi di kode dan
sudah diadopsi FE:

- `depositPercent` dari `GET /public/settings` → hardcode 30% dihapus dari
  BookingModal, PaymentPage, dan BookingStatusPage. ✅
- `paidAmount` + `bookedRanges` → tipe FE diperbarui. ✅
- `vehicleName` → fallback FE dihapus (request ekstra ke `/vehicles` hilang). ✅
- `paymentPageUrl` ownership guard + webhook `dp_paid` → terverifikasi berjalan. ✅

Soal `paidAmount` di `POST /public/bookings`: **setuju dengan keputusan BE
untuk tidak menambahkannya** — FE menghitung dari `totalAmount - remainingAmount`
yang sudah terkirim.

## 2. bookedRanges — sudah dipakai, satu tindak lanjut (MEDIUM)

FE sekarang merender hari yang "sebagian terisi" (mis. motor keluar 12:00–00:00)
sebagai **hijau "tersedia sebagian"** alih-alih amber "penuh". Slot pagi tetap
bisa dijual; validasi final tetap di exact-range check saat checkout.

**Satu pertanyaan/tindak lanjut:**

`bookedRanges` saat ini difilter `status !== 'Cancelled' && status !== 'expired'`.
Apakah booking `pending_payment` ikut masuk? Idealnya **ikut** — booking pending
(15 menit) juga menahan motor, kalau tidak masuk, dua customer bisa melihat
"tersedia" untuk slot yang sama di detik yang sama. Bukan error (create-booking
yang memutuskan), tapi kalender akan lebih akurat kalau pending ikut terhitung.

## 3. Tidak ada item lain

Kontrak, field, dan endpoint sudah selaras. Terima kasih untuk eksekusi
yang cepat — 800/800 test pass tercatat.
