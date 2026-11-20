// Public legal pages, hosted on the website (apps/website).
// TERMS_URL stays null until a Terms page exists, and the sign-in screens only link what exists,
// so they never point people at a page that isn't there.
export const PRIVACY_URL: string | null = "https://getlumora.site/privacy";
export const TERMS_URL: string | null = null;

export interface LegalPart {
  text: string;
  url: string | null;
}

/** The pieces of "By continuing, you agree to our Terms and Privacy Policy." with a link where one exists. */
export function legalParts(terms: string | null = TERMS_URL, privacy: string | null = PRIVACY_URL): LegalPart[] {
  return [
    { text: "By continuing, you agree to our ", url: null },
    { text: "Terms", url: terms },
    { text: " and ", url: null },
    { text: "Privacy Policy", url: privacy },
    { text: ".", url: null },
  ];
}
