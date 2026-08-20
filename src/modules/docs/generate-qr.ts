import QRCode, { type QRCodeToBufferOptions } from 'qrcode';

/**
 * Genera un buffer PNG a partir de un texto o parámetro dado.
 * @param text - El texto o parámetro que se quiere codificar en el código QR.
 * @returns Una promesa que resuelve en un Buffer PNG del QR.
 */
export async function generarBufferQR(text: string): Promise<Buffer<ArrayBufferLike>> {
    if (!text) {
        throw new Error('Se requiere un parámetro de texto para generar el código QR.');
    }

    const opciones: QRCodeToBufferOptions = {
        type: 'png',
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 300,
    };

    const buffer: Buffer = await QRCode.toBuffer(text, opciones);
    return buffer;
}