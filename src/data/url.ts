// BASE_URL is '/digital-watch-webpage/' on GitHub Pages (a project site) and '/' in dev if the base is changed; always ends with '/'.
export const u = (p = ''): string => import.meta.env.BASE_URL + p.replace(/^\//, '');
