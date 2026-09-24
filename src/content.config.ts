import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    icon: z.enum(['charger', 'keyboard', 'smart-plug', 'speaker', 'powerbank']).default('charger'),
    products: z
      .array(
        z.object({
          name: z.string(),
          href: z.string(),
        })
      )
      .default([]),
  }),
});

export const collections = { blog };
