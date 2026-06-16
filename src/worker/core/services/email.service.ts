interface EmailConfig {
  apiKey: string;
  fromEmail: string;
}

interface PaymentEmailData {
  customerName: string;
  customerEmail: string;
  bookingNumber: string;
  vehicleName: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  paymentMethod: string;
  paidAt: string;
}

interface BookingReminderData {
  customerName: string;
  customerEmail: string;
  bookingNumber: string;
  vehicleName: string;
  startDate: string;
  endDate: string;
  pickupTime: string;
  pickupLocation: string;
}

/**
 * Email service using Resend API.
 *
 * Docs: https://resend.com/docs/api-reference/emails/send-email
 *
 * Flow:
 *  1. sendPaymentConfirmation() → called from webhook after payment success
 *  2. sendBookingReminder() → called from admin or scheduled job
 *  3. sendCustomEmail() → called from admin dashboard
 */
export class EmailService {
  private apiKey: string;
  private fromEmail: string;

  constructor(config: EmailConfig) {
    this.apiKey = config.apiKey;
    this.fromEmail = config.fromEmail;
  }

  /**
   * Send payment confirmation email to customer.
   * Called automatically when webhook receives PAID/SETTLED status.
   */
  async sendPaymentConfirmation(data: PaymentEmailData): Promise<boolean> {
    const subject = `✅ Pembayaran Berhasil - Booking ${data.bookingNumber}`;
    const html = this.buildPaymentConfirmationHTML(data);

    return this.sendEmail(data.customerEmail, subject, html);
  }

  /**
   * Send booking reminder email to customer.
   * Called from admin dashboard or scheduled job.
   */
  async sendBookingReminder(data: BookingReminderData): Promise<boolean> {
    const subject = `⏰ Pengingat Booking ${data.bookingNumber} - Savanna Bromo`;
    const html = this.buildBookingReminderHTML(data);

    return this.sendEmail(data.customerEmail, subject, html);
  }

  /**
   * Send custom email from admin to customer.
   * Called from admin dashboard.
   */
  async sendCustomEmail(to: string, subject: string, message: string): Promise<boolean> {
    const html = this.buildCustomMessageHTML(message);

    return this.sendEmail(to, subject, html);
  }

  /**
   * Core email sending function using Resend API.
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.apiKey) {
      console.error('RESEND_API_KEY not configured');
      return false;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: [to],
          subject,
          html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Resend email error:', response.status, errorText);
        return false;
      }

      const result = await response.json() as { id: string };
      console.log('Email sent successfully:', result.id);
      return true;
    } catch (error) {
      console.error('Resend email exception:', error);
      return false;
    }
  }

  /**
   * Build HTML for payment confirmation email.
   */
  private buildPaymentConfirmationHTML(data: PaymentEmailData): string {
    const formattedAmount = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(data.totalAmount);

    const formattedDate = new Date(data.paidAt).toLocaleString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #16a34a; margin: 0; font-size: 28px; }
    .header p { color: #666; margin: 5px 0 0 0; }
    .success-icon { font-size: 48px; margin-bottom: 10px; }
    .details { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .details table { width: 100%; border-collapse: collapse; }
    .details td { padding: 8px 0; border-bottom: 1px solid #eee; }
    .details td:first-child { color: #666; width: 140px; }
    .details td:last-child { font-weight: 600; }
    .info-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .info-box h3 { margin: 0 0 10px 0; color: #1e40af; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    .footer a { color: #16a34a; text-decoration: none; }
    .btn { display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="success-icon">✅</div>
        <h1>Pembayaran Berhasil!</h1>
        <p>Terima kasih atas pembayaran Anda</p>
      </div>

      <p>Halo <strong>${data.customerName}</strong>,</p>
      <p>Pembayaran untuk booking berikut telah berhasil kami terima:</p>

      <div class="details">
        <table>
          <tr>
            <td>📋 Booking Number</td>
            <td><strong>${data.bookingNumber}</strong></td>
          </tr>
          <tr>
            <td>🏍️ Kendaraan</td>
            <td>${data.vehicleName}</td>
          </tr>
          <tr>
            <td>📅 Tanggal Sewa</td>
            <td>${data.startDate} s/d ${data.endDate}</td>
          </tr>
          <tr>
            <td>💳 Metode Bayar</td>
            <td>${data.paymentMethod}</td>
          </tr>
          <tr>
            <td>💰 Total</td>
            <td><strong>${formattedAmount}</strong></td>
          </tr>
          <tr>
            <td>🕐 Waktu Bayar</td>
            <td>${formattedDate}</td>
          </tr>
        </table>
      </div>

      <div class="info-box">
        <h3>📍 Informasi Pengambilan</h3>
        <p style="margin: 5px 0;"><strong>Lokasi:</strong> Kantor Savanna Bromo Rental</p>
        <p style="margin: 5px 0;"><strong>Jam Operasional:</strong> 08:00 - 17:00 WIB</p>
        <p style="margin: 5px 0;"><strong>Yang perlu dibawa:</strong> KTP asli, booking confirmation ini</p>
      </div>

      <p>Jika ada pertanyaan, jangan ragu untuk menghubungi kami.</p>

      <div class="footer">
        <p>Salam,<br><strong>Tim Savanna Bromo Rental</strong></p>
        <p>🏍️ Sewa Motor Trail Terpercaya di Bromo</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Build HTML for booking reminder email.
   */
  private buildBookingReminderHTML(data: BookingReminderData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #f59e0b; margin: 0; font-size: 28px; }
    .reminder-icon { font-size: 48px; margin-bottom: 10px; }
    .details { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .details table { width: 100%; border-collapse: collapse; }
    .details td { padding: 8px 0; border-bottom: 1px solid #eee; }
    .details td:first-child { color: #666; width: 140px; }
    .details td:last-child { font-weight: 600; }
    .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="reminder-icon">⏰</div>
        <h1>Pengingat Booking</h1>
      </div>

      <p>Halo <strong>${data.customerName}</strong>,</p>
      <p>Kami mengingatkan bahwa Anda memiliki jadwal sewa yang akan dimulai:</p>

      <div class="details">
        <table>
          <tr>
            <td>📋 Booking Number</td>
            <td><strong>${data.bookingNumber}</strong></td>
          </tr>
          <tr>
            <td>🏍️ Kendaraan</td>
            <td>${data.vehicleName}</td>
          </tr>
          <tr>
            <td>📅 Tanggal Sewa</td>
            <td>${data.startDate} s/d ${data.endDate}</td>
          </tr>
          <tr>
            <td>🕐 Jam Pengambilan</td>
            <td>${data.pickupTime}</td>
          </tr>
          <tr>
            <td>📍 Lokasi</td>
            <td>${data.pickupLocation}</td>
          </tr>
        </table>
      </div>

      <div class="info-box">
        <p style="margin: 0;"><strong>📌 Yang perlu dibawa:</strong> KTP asli dan bukti booking ini</p>
      </div>

      <p>Jika ada perubahan rencana, silakan hubungi kami segera.</p>

      <div class="footer">
        <p>Salam,<br><strong>Tim Savanna Bromo Rental</strong></p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Build HTML for custom message from admin.
   */
  private buildCustomMessageHTML(message: string): string {
    // Convert newlines to <br> for HTML
    const htmlMessage = message.replace(/\n/g, '<br>');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #16a34a; padding-bottom: 20px; }
    .header h1 { color: #16a34a; margin: 0; font-size: 24px; }
    .message { padding: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>🏍️ Savanna Bromo Rental</h1>
      </div>

      <div class="message">
        ${htmlMessage}
      </div>

      <div class="footer">
        <p>Pesan ini dikirim oleh admin Savanna Bromo Rental</p>
        <p>Jika ada pertanyaan, silakan balas email ini atau hubungi kami.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }
}
