import QRCode from 'qrcode';

export class QrGenerator {
  /**
   * Generates a base64 Data URL for embedding or web display
   */
  public static async generateDataUrl(text: string): Promise<string> {
    try {
      return await QRCode.toDataURL(text, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 320,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    } catch (err) {
      console.error('Failed to generate QR Data URL:', err);
      throw err;
    }
  }

  /**
   * Generates a PNG Buffer suitable for sending via Telegram ctx.replyWithPhoto({ source: buffer })
   */
  public static async generatePngBuffer(text: string): Promise<Buffer> {
    try {
      return await QRCode.toBuffer(text, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 400,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    } catch (err) {
      console.error('Failed to generate QR Buffer:', err);
      throw err;
    }
  }
}
