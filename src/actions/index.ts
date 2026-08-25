import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { modifyDoc } from 'src/modules/docs/generate-doc';
import { getPresignedPdfUrl } from 'src/modules/docs/upload-seaweed';

export const server = {
    createCertificate: defineAction({
        accept: 'form',
        input: z.object({ receiver: z.string().min(2, "Se requiere al menos 2 carácteres para el nombre") }),
        handler: async ({ receiver }) => { return await modifyDoc({ receiver }) },
    }),
    getPresignedUrl: defineAction({
        accept: 'json',
        input: z.object({
            key: z.string().min(1, "Nombre del archivo requerido"),
            expiresIn: z.number().min(5).max(86400).optional().default(300),
        }),
        handler: async ({ key, expiresIn }) => {
            return await getPresignedPdfUrl({ key, expiresIn });
        },
    }),
}