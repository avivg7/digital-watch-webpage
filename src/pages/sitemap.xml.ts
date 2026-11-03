import type { APIRoute } from 'astro';
import { SITE } from '../data/site';

// Three content pages and the home page; the 404 is deliberately excluded.
const PATHS = ['', 'legal/', 'privacy/', 'accessibility/'];
export const GET: APIRoute = ({ site }) => {
  const base = new URL(import.meta.env.BASE_URL, site).href;
  const urls = PATHS.map((p) => `  <url><loc>${new URL(p, base).href}</loc><lastmod>${SITE.updatedISO}</lastmod></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
