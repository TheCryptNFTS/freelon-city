/**
 * Single source of truth for the city's lore vocabulary.
 *
 * The /start "lingo" section already defines these terms in one place,
 * but a newcomer hits the words "civilization", "caste", "hex" etc. all
 * over the site long before (or without ever) reaching /start. These
 * short definitions power the inline <GlossaryTerm> tooltip so the jargon
 * explains itself in context — directly addressing the recurring "too
 * complex / overwhelming" feedback without adding any new page surface.
 *
 * Keep each definition to one tight sentence and consistent with the
 * /start lingo block. Keys are lowercase; look-ups are case-insensitive.
 */
export const GLOSSARY: Record<string, string> = {
  hex: "The city's credits (⬡) — earned by being active, spent to name citizens, post, and unlock things. Not money, not redeemable.",
  signal:
    "The city's word for anything that moves: a sale, a post, a transmission, a connected collection.",
  citizen:
    "One of the 4040 Freelon NFTs on Ethereum. Sealed supply — no more will ever be made.",
  civilization:
    "Your tribe. There are ten, each a signal doctrine; your X handle assigns you one when you sync.",
  doctrine:
    "The belief a civilization is built on — its reason for existing inside the city.",
  caste: "A citizen's role inside the city. Seven of them, from Signal Born to The Throne.",
  shape:
    "A citizen's silhouette form — the canonical Freelon geometry, from Geometric Hood to the rarest Sanctum.",
  carrier:
    "Anyone who participates. You don't need to own a citizen to be a carrier.",
  transmission:
    "A small post (image + caption) carriers send to the city wall. Burns 100 ⬡ to send.",
  archive:
    "A connected collection the city recognises: The Crypt, Combat Archives, OOGIES, Emile, SMILES.",
};

export function defineTerm(term: string): string | null {
  return GLOSSARY[term.trim().toLowerCase()] ?? null;
}
