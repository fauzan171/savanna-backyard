export const bookingStatusLabels: Record<string, string> = {
	pending: 'Menunggu',
	pending_payment: 'Menunggu Pembayaran',
	confirmed: 'Terkonfirmasi',
	active: 'Sedang Berjalan',
	completed: 'Selesai',
	cancelled: 'Dibatalkan',
	payment_failed: 'Pembayaran Gagal',
	expired: 'Kedaluwarsa',
	refunded: 'Dana Dikembalikan',
};

export const paymentStatusLabels: Record<string, string> = {
	pending: 'Menunggu',
	verified: 'Terverifikasi',
	settlement: 'Lunas',
	// TC-PAY-003: only the reject flow produces Failed → label it "Ditolak"
	failed: 'Ditolak',
	deny: 'Ditolak',
	expire: 'Kedaluwarsa',
	cancel: 'Dibatalkan',
	refund: 'Dana Dikembalikan',
};

export const vehicleStatusLabels: Record<string, string> = {
	available: 'Tersedia',
	rented: 'Disewa',
	cleaning: 'Dibersihkan',
	maintenance: 'Perawatan',
	inactive: 'Nonaktif',
};

export const leadStatusLabels: Record<string, string> = {
	new: 'Baru',
	contacted: 'Sudah Dihubungi',
	negotiating: 'Negosiasi',
	converted: 'Jadi Booking',
	lost: 'Tidak Lanjut',
};

export const priorityLabels: Record<string, string> = {
	hot: 'Prioritas Tinggi',
	warm: 'Potensial',
	cold: 'Prioritas Rendah',
};

export const vehicleTypeLabels: Record<string, string> = {
	TrailBike: 'Motor Trail',
	StreetBike: 'Motor Jalan Raya',
	Car: 'Mobil',
	Jeep: 'Jeep',
	Other: 'Lainnya',
};

export const paymentMethodLabels: Record<string, string> = {
	QRIS: 'QRIS',
	Gateway: 'Payment Gateway',
	BankTransfer: 'Transfer Bank',
	Bank_Transfer: 'Transfer Bank',
	Cash: 'Tunai',
};

export const periodLabels: Record<string, string> = {
	today: 'Hari Ini',
	week: 'Minggu Ini',
	month: 'Bulan Ini',
	year: 'Tahun Ini',
};

export function labelFromMap(map: Record<string, string>, value: string | null | undefined): string {
	if (!value) return '-';
	return map[value] ?? map[value.toLowerCase()] ?? value;
}
