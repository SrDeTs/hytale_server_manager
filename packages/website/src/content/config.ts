import { defineCollection, z } from 'astro:content';

const docsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['getting-started', 'features', 'guides']),
    order: z.number(),
  }),
});

export const collections = {
  docs: docsCollection,
};
