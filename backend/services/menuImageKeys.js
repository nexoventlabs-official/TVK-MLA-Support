/**
 * FlowImage keys for everything OUTSIDE the per-issue catalog:
 *   - top-level main-menu icons (Your Requests, Events, Raise Issue, Contact MLA, Social, Helplines)
 *   - social media icons
 *   - branch banners + Contact MLA / Helplines headers
 *
 * Per-issue header_* + pdf_* keys live in issueActions.js (allActionImageKeys).
 */

const MAIN_MENU_KEYS = [
  { key: 'icon_main_my_requests',  label: 'Main menu icon: Your Requests',   group: 'main_menu' },
  { key: 'icon_main_events',       label: 'Main menu icon: Upcoming Events', group: 'main_menu' },
  { key: 'icon_main_raise_issue',  label: 'Main menu icon: Raise Issue',     group: 'main_menu' },
  { key: 'icon_main_contact_mla',  label: 'Main menu icon: Contact MLA',     group: 'main_menu' },
  { key: 'icon_main_social',       label: 'Main menu icon: Social Media',    group: 'main_menu' },
  { key: 'icon_main_helplines',    label: 'Main menu icon: Helplines',       group: 'main_menu' },
];

const SOCIAL_KEYS = [
  { key: 'icon_social_facebook',  label: 'Social icon: Facebook',  group: 'social' },
  { key: 'icon_social_instagram', label: 'Social icon: Instagram', group: 'social' },
  { key: 'icon_social_youtube',   label: 'Social icon: YouTube',   group: 'social' },
  { key: 'icon_social_twitter',   label: 'Social icon: Twitter / X', group: 'social' },
];

const CTA_HEADER_KEYS = [
  { key: 'header_contact_mla', label: 'Contact MLA Office message header', group: 'cta_headers' },
  { key: 'header_helplines',   label: 'Helplines message header',          group: 'cta_headers' },
  { key: 'header_social',      label: 'Social Media message header',       group: 'cta_headers' },
  { key: 'header_events',      label: 'Upcoming Events flow banner',       group: 'cta_headers' },
];

function allMenuImageKeys() {
  return [...MAIN_MENU_KEYS, ...SOCIAL_KEYS, ...CTA_HEADER_KEYS];
}

module.exports = {
  MAIN_MENU_KEYS,
  SOCIAL_KEYS,
  CTA_HEADER_KEYS,
  allMenuImageKeys,
};
