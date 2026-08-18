/**
 * Canonical site identity.
 *
 * `origin` is the one place the deployed domain is written down. Both the
 * ingest step (which bakes absolute asset URLs into the hosted stylesheet) and
 * the site generator (which writes every canonical link, registry URL and
 * llms.txt reference) read it from here, so the two can never disagree.
 *
 * Changing the domain: edit `origin`, then `npm run build`.
 */
export const SITE = {
  name: 'FantasyUIs',
  tagline: 'Ready-to-use UI components for Fantasy & RPG web games',
  origin: 'https://fantasy-u-is.vercel.app',
};

/** Where artwork is served from on the deployed site. */
export const ASSET_BASE = `${SITE.origin}/fui`;
