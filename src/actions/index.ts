import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { modifyDoc } from 'src/modules/docs/generate-doc';

export const server = {
    createCertificate: defineAction({
        accept: 'form',
        input: z.object({ receiver: z.string().min(2, "Se requiere al menos 2 carácteres para el nombre") }),
        handler: async ({ receiver }) => { return await modifyDoc({ receiver }) },
    })
}