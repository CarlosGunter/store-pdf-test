import { PDFDocument, PDFFont, rgb, StandardFonts } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { tryCatch } from "src/utils/try-catch";
import { generarBufferQR } from "./generate-qr";
import { uploadPdfToSeaweed } from "./upload-seaweed";

interface modifyDocProps {
    receiver: string
}

export async function modifyDoc({ receiver }: modifyDocProps) {
    console.log({ receiver, test: " Iniciando action" });
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    const DOC_PATH = path.join(__dirname, "../../assets/diploma_test.pdf");

    const pdfDocBuffer = await getDoc({ docPath: DOC_PATH });
    if (!pdfDocBuffer) {
        console.error("No se pudo obtener el documento en la ruta:", DOC_PATH);
        return undefined;
    }

    const pdfDoc = await PDFDocument.load(pdfDocBuffer);
    const page = pdfDoc.getPage(0);
    const { width: pageWidth, height: pageHeight } = page.getSize();

    const font = await pdfDoc.embedStandardFont(StandardFonts.Helvetica);
    const maxTextWidth = pageWidth - 30;
    const COORDINATE_Y_NAME = pageHeight - 235;

    const { finalFontSize } = getScaledTextFit({ text: receiver, font, baseFontSize: 24, maxWidth: maxTextWidth });
    const centerCoordinateName = getCenteredX({ text: receiver, font, fontSize: finalFontSize, pageWidth });

    page.drawText(receiver, {
        x: centerCoordinateName,
        y: COORDINATE_Y_NAME,
        font,
        size: finalFontSize,
        color: rgb(0, 0, 0)
    });

    const now = new Date();
    const pad = (num: number) => String(num).padStart(2, '0');
    const month = pad(now.getMonth() + 1); // getMonth() is 0-indexed
    const day = pad(now.getDate());
    const year = now.getFullYear();
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());

    const nowFormatted = `${month}-${day}-${year}-${hours}-${minutes}-${seconds}`;
    const fileName = `diploma_${nowFormatted}_${receiver.replace(/\s+/g, '_')}.pdf`;

    const APP_URL = process.env.APP_URL || "http://localhost:4321";
    const verificationUrl = `${APP_URL}/validar?doc=${encodeURIComponent(fileName)}`;

    const qrBuffer = await generarBufferQR(verificationUrl);
    const qrImage = await pdfDoc.embedPng(qrBuffer);
    const qrDims = qrImage.scale(0.5);

    page.drawImage(qrImage, {
        x: pageWidth - qrDims.width - 50,
        y: 50,
        width: qrDims.width,
        height: qrDims.height
    });

    const pdfResultBuffer = await pdfDoc.save();

    const seaweedResult = await uploadPdfToSeaweed({
        pdfBuffer: pdfResultBuffer,
        fileName,
    });

    return {
        success: seaweedResult.success,
        fileName,
        receiver,
        verificationUrl,
        seaweed: seaweedResult,
    };
}

async function getDoc({ docPath }: { docPath: string }) {
    const { data: pdfDocBuffer, error } = await tryCatch(readFile(docPath));
    if (error) {
        console.error("Detalle del error al leer el archivo:", error);
        return null;
    }

    return pdfDocBuffer;
}

interface getCenteredXProps {
    text: string;
    font: PDFFont;
    fontSize: number;
    pageWidth: number;
}

function getCenteredX({ text, font, fontSize, pageWidth }: getCenteredXProps) {
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const centerX = (pageWidth - textWidth) / 2;
    return centerX;
}

interface getScaledTextFitProps {
    text: string;
    font: PDFFont;
    baseFontSize: number;
    maxWidth: number;
}

function getScaledTextFit({ text, font, baseFontSize, maxWidth }: getScaledTextFitProps) {
    const currentWidth = font.widthOfTextAtSize(text, baseFontSize);
    let finalFontSize = baseFontSize;

    if (currentWidth > maxWidth) {
        finalFontSize = baseFontSize * (maxWidth / currentWidth);
    }

    const textWidth = font.widthOfTextAtSize(text, finalFontSize);

    return {
        finalFontSize,
        textWidth
    };
}