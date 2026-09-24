import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('blog');
  return rss({
    title: 'Deskaro',
    description:
      'Ehrliche Kaufberatung für ein besseres Home Office: Bürostühle, Schreibtische, Beleuchtung und mehr.',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `blog/${post.id}/`,
    })),
  });
}
