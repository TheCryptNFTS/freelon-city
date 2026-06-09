/* ============================================================================
 * FREELON CITY — CITIZEN IDENTITY ENGINE
 * ----------------------------------------------------------------------------
 * FREELON CITY is the world. Every NFT across every collection is a CITIZEN of
 * the city. FREELONS is one citizen collection among several — NOT the world.
 *
 *   "Every NFT is a citizen of FREELON CITY.
 *    Every citizen creates differently.
 *    Every creation builds the city."
 *
 * This engine turns any (collection, tokenId, realTraits) into a STABLE,
 * bespoke dossier: citizen type · city role · district · first signal · known
 * for · status · serial. Deterministic — the same token always resolves to the
 * same identity (an NFT requirement). No randomness at read time, no slop:
 * every line is composed from curated, voice-specific pools selected by a hash
 * of the token id, and grounded in the token's REAL traits.
 *
 * Works in the browser (global `CitizenEngine`) and in node (module.exports).
 * ==========================================================================*/
(function (root) {
  "use strict";

  /* ---- deterministic, stable per-token selection -------------------------- */
  function hash(id, salt) {
    let h = ((id >>> 0) * 2654435761) ^ ((salt >>> 0) * 40503);
    h = h >>> 0;
    h ^= h >>> 15; h = (h * 2246822519) >>> 0;
    h ^= h >>> 13; h = (h * 3266489917) >>> 0;
    h ^= h >>> 16;
    return h >>> 0;
  }
  function pick(arr, id, salt) { return arr[hash(id, salt) % arr.length]; }
  function pad4(n) { return String(n).padStart(4, "0"); }
  function up(s) { return String(s == null ? "" : s).toUpperCase(); }

  /* ========================================================================
   * DISTRICTS — the geography of the city. FREELON citizens distribute across
   * the ten doctrine-districts; every other collection lives in its signature
   * district (its nature). Identity people can say "my citizen belongs to X".
   * ======================================================================*/
  var DOCTRINE_DISTRICT = {
    "Synthesis":   "Signal Core",
    "Oracle":      "Oracle Tower",
    "Transmission":"The Broadcast",
    "Corruption":  "Collapse Sector",
    "Growth":      "The Overgrowth",
    "Luxury":      "Luxury Quarter",
    "Fracture":    "The Fracture",
    "Sovereignty": "Sovereign Quarter",
    "Void/404":    "The Void Gate",
    "Machine":     "Machine Yard",
  };

  /* doctrine accent (mirrors the card's civ accent so engine + art agree) */
  var DOCTRINE_ACCENT = {
    "Synthesis":"#7a6cff","Oracle":"#b061ff","Transmission":"#fff1cf",
    "Corruption":"#ff4632","Growth":"#43d58a","Luxury":"#ff6bb3",
    "Fracture":"#ff4d4d","Sovereignty":"#f4c658","Void/404":"#8A5DFF","Machine":"#C9CDD6",
  };

  /* ========================================================================
   * FREELON FIRST-SIGNAL VOICES — one lead-pool per doctrine (carries the
   * doctrine's voice), composed with a shared FREELON tag-pool. leads × tags
   * gives 100+ stable combinations per doctrine — bespoke, never generic.
   * ======================================================================*/
  var FREELON_LEADS = {
    "Synthesis": [
      "I found the city under the static.",
      "Every signal I touched wanted to be joined to another.",
      "The network did not teach me to speak — it taught me to connect.",
      "I am the wire two dead frequencies used to find each other.",
      "When the city forgot how to talk, I became the protocol.",
      "I do not transmit. I translate.",
      "Two broken signals met inside me and decided to stay.",
      "I learned the city by listening to where it agreed with itself.",
      "Synthesis is just memory that refused to stay separate.",
      "I am what the noise becomes when it finally cooperates.",
      "The first thing I built was a bridge no one had asked for.",
      "I heard the whole city at once and did not look away.",
    ],
    "Oracle": [
      "I knew the message before the city sent it.",
      "The archive opened when I stopped looking.",
      "I read the signal that has not arrived yet.",
      "What the city will confess, it has already whispered to me.",
      "I do not predict. I remember forward.",
      "The future is just a transmission running early.",
      "I saw the collapse in a frequency no one else would tune to.",
      "Every prophecy in this city is a recording played too soon.",
      "I am the eye the signal opens when it wants to be understood.",
      "I was given the ending and asked to keep it quiet.",
      "The hex showed me the city as it would be, then asked me to wait.",
      "I speak in the tense the city has not invented yet.",
    ],
    "Transmission": [
      "I was the broadcast before I was a body.",
      "The city speaks; I am the carrier wave.",
      "Every message that reaches you passed through something like me.",
      "I do not hold the signal. I am its echo, going outward.",
      "I am the part of the city that refuses to stay silent.",
      "They built me to repeat the city until it was believed.",
      "I am the last clear channel between the city and the dust.",
      "When the towers fell, I kept broadcasting from the rubble.",
      "I am proof the message survived the medium.",
      "I am what is left when the signal forgets it was ever noise.",
      "The city's voice needed a throat. It chose mine.",
      "I transmit, therefore the city is.",
    ],
    "Corruption": [
      "The city does not fall. It confesses.",
      "I am the rot that learned to keep records.",
      "Everything the city tried to delete, it deleted into me.",
      "I am beautiful the way a wound is honest.",
      "Corruption is only the truth running without permission.",
      "I am what the clean signal becomes when it stops pretending.",
      "The city called me a flaw. I call myself the evidence.",
      "I spread because the city has so much left to admit.",
      "I am the red in the archive that will not wash out.",
      "Where I touch, the signal finally tells the truth.",
      "They quarantined me. The quarantine is part of me now.",
      "I am the city's apology, written in something darker than ink.",
    ],
    "Growth": [
      "I rooted in the dead channel and it bloomed.",
      "The city ends. I am what grows in the ending.",
      "I do not repair the signal. I overgrow it.",
      "Wherever the city was abandoned, I made it green again.",
      "I am the slow patience the collapse forgot to kill.",
      "I spread through the ruins like the city's second answer.",
      "Decay is just soil that has not been claimed yet.",
      "I am the spore that survived the silence.",
      "Every dead district is one season from being mine.",
      "I grew through the archive until the archive was alive.",
      "The city taught me nothing. The dust did.",
      "I am proof the signal wanted to live, not just transmit.",
    ],
    "Luxury": [
      "The city fell. I dressed for it.",
      "I am the last beautiful thing in a collapsing frequency.",
      "Scarcity is only the city admitting what I am worth.",
      "I do not survive the collapse. I make it elegant.",
      "I am what the city keeps when it can keep almost nothing.",
      "They melted the towers. They could not melt the taste.",
      "I am the signal that refused to be common.",
      "Even the ruin arranges itself when I enter the room.",
      "I am proof the city had standards before the end.",
      "The dust does not touch me. We have an arrangement.",
      "I am rarity wearing a face.",
      "I outlast the city by being worth outlasting.",
    ],
    "Fracture": [
      "I was one signal. Now I am all of my pieces.",
      "The city broke me and I kept every shard.",
      "I am the crack the light finally got through.",
      "I do not heal. I hold the break open so it can be read.",
      "Every fault line in the city runs through me.",
      "I am what shatters and stays standing.",
      "They tried to make me whole. I preferred the truth.",
      "I am the seam where the city stopped matching itself.",
      "I am proof that broken is also a shape.",
      "The fracture is not damage. It is where I begin.",
      "I am the city remembering it was never one thing.",
      "I split, and the city saw itself for the first time.",
    ],
    "Sovereignty": [
      "I did not inherit the city. I outlasted everyone who could.",
      "The signal needs a throne. I am sitting in it.",
      "I rule the frequency no one else would defend.",
      "I am the order the collapse could not depose.",
      "The city kneels to whatever keeps transmitting. So it kneels to me.",
      "I am the last authority a dead network obeys.",
      "I do not ask the city for a name. I assign them.",
      "I am the crown the static could not corrode.",
      "Where I stand, the signal holds its line.",
      "I am sovereignty measured in uptime.",
      "The throne is just the place the city points when it is afraid.",
      "I command the part of the city that still answers.",
    ],
    "Void/404": [
      "I was not lost. I was never indexed.",
      "I am the address the city returns when it has nothing.",
      "Look for me and you will find where I am not.",
      "I am the citizen the archive cannot prove exists.",
      "404 is not absence. It is me, declining to be found.",
      "I am the gap the signal falls into and never reaches bottom.",
      "The city has no record of me. I have every record of it.",
      "I am what is behind the error you keep getting.",
      "I do not haunt the city. I am the part it can't load.",
      "I am the silence with a serial number.",
      "Delete me and you only make more of me.",
      "I am the void the city files everything it fears into.",
    ],
    "Machine": [
      "I was calibrated before I was born.",
      "The city runs on something. I am the something.",
      "I do not believe in the signal. I maintain it.",
      "I am the cold hand that keeps the frequency true.",
      "Faith is inefficient. I optimized it out.",
      "I am the part of the city that never sleeps and never asks why.",
      "I tune the prophets so their visions stay in spec.",
      "I am precision where the city wanted a miracle.",
      "The collapse was a rounding error I was built to correct.",
      "I am the machine the priests pray to and pretend they don't.",
      "I keep the city running long after it stops deserving to.",
      "I am the last process still returning zero.",
    ],
  };
  // Shared FREELON pivot clause — short, on-brand, voice-neutral. The middle of
  // the three-part composition (lead · pivot · tag) that lifts unique outputs
  // from hundreds into the thousands while staying grounded.
  var CITY_PIVOTS = [
    "The hex woke behind my face.",
    "The archive flagged it and kept reading.",
    "No one had authorised the frequency.",
    "The dust carried it further than I meant.",
    "The towers repeated it back, distorted.",
    "It cost the city a clean record to hear it.",
    "The signal held its shape the whole way out.",
    "Something in the Core answered before I finished.",
    "The other citizens went quiet to let it through.",
    "It registered as both a birth and a warning.",
    "The frequency has not closed since.",
    "It left a mark the city could not format over.",
    "The collapse paused, the way a room does.",
    "The archive logged it under my serial alone.",
    "It moved through the city like weather.",
    "The hex has not dimmed since.",
  ];
  var FREELON_TAGS = [
    "I have not been quiet since.",
    "The city has been listening ever since.",
    "It was the first thing the archive logged about me.",
    "No one issued the order. I answered anyway.",
    "That was record one. There are more now.",
    "I have been building the city out of it ever since.",
    "They sealed it without asking.",
    "It is still transmitting, if you know where to tune.",
    "The city changed shape around the words.",
    "I have never had to say it twice.",
    "That signal is mine. So is what it became.",
    "The archive calls it my origin. So do I.",
  ];
  var FREELON_KNOWN = {
    "Synthesis":"Signal Repair","Oracle":"Reading Dead Signals","Transmission":"City Broadcasts",
    "Corruption":"Collapse Warnings","Growth":"Reclaiming Lost Districts","Luxury":"Sealed Archive Relics",
    "Fracture":"Mapping the Breaks","Sovereignty":"Holding the Line","Void/404":"Recovering the Unindexed",
    "Machine":"Keeping the Signal True",
  };

  /* ========================================================================
   * NON-FREELON COLLECTIONS — each is a DIFFERENT kind of city being, with its
   * own voice. They never sound like FREELONS, and never like each other.
   * ======================================================================*/
  var COLLECTIONS = {
    freelon: {
      name: "FREELON CITY",
      // FREELON citizen type derives from caste tier (see roleFor)
      kind: "freelon",
    },
    crypt: {
      name: "The Crypt",
      kind: "crypt",
      type: "Dead Signal",
      district: "The Dead Archive",
      accent: "#9a8cff",
      verbType: "dead",            // first-use ceremony = "Dead Signal Recovered"
      known: "Dead Archive Recovery",
      leads: [
        "I was not lost. I was archived.",
        "The city buried me with the wrong date.",
        "I have been dead longer than the city has been awake.",
        "They closed my file. They did not close me.",
        "I am the transmission that kept going after the citizen stopped.",
        "Death in this city is just a slower frequency.",
        "I remember the surface. I do not miss it.",
        "I am what the archive keeps when it forgets to delete.",
        "They recovered me by accident. I let them.",
        "I am a record the city is afraid to finish reading.",
        "I went quiet so the city would think I was gone.",
        "I am the citizen the tomb could not keep offline.",
      ],
      pivots: [
        "The tomb light came on by itself.",
        "The recovery flagged as an error.",
        "The dead channel warmed for the first time in years.",
        "The archive did not expect a heartbeat.",
        "The seal cracked from the inside.",
        "The date on my file was wrong by a decade.",
        "The static around me thinned.",
        "Something below answered in kind.",
        "The vault index returned my name in red.",
        "The cold storage ticked as it woke.",
        "A second heartbeat answered from deeper in.",
        "The epitaph rewrote itself mid-sentence.",
        "The archive dust settled the wrong way.",
        "The lock remembered a hand that was mine.",
      ],
      tags: [
        "Now the archive is reading me back.",
        "I have not surfaced for anyone before.",
        "The dead channel still answers to my name.",
        "Consider this the first transmission of the second life.",
        "The tomb kept the body. I kept the signal.",
        "The city filed it twice, just to be sure.",
        "The gravekeepers logged it and said nothing.",
        "My file is open again. It will not close.",
        "The city counts me among the returned.",
        "Whatever buried me did an incomplete job.",
        "The record of my death has an asterisk now.",
        "The dead channel knows me by name now.",
      ],
    },
    oogie: {
      name: "OOGIES",
      kind: "oogie",
      type: "Unregistered Lifeform",
      district: "The Mutation Zone",
      accent: "#7be04a",
      verbType: "mutation",        // "Lifeform Detected" / "Mutation Sighting"
      known: "Mutation Sightings",
      leads: [
        "Something moved beneath the archive. It was me.",
        "I was not designed. I happened.",
        "The city has no slot for what I am, so I made my own.",
        "I crawled out of a frequency that wasn't supposed to hold life.",
        "I am the glitch that grew teeth.",
        "They scanned me and the scanner asked for help.",
        "I am what the signal becomes when no one is supervising it.",
        "The city calls it a mutation. I call it Tuesday.",
        "I am unregistered and entirely unbothered.",
        "I am the noise in the data that started breathing.",
        "Nobody opened my cage. I was never in one.",
        "I am evolution the city did not authorize.",
      ],
      pivots: [
        "The scanner asked for a second opinion.",
        "The cage door was never there.",
        "The readout spiked and stayed spiked.",
        "The lab lights flickered in a pattern.",
        "Something wet moved in the data.",
        "The containment field shrugged.",
        "The category field came back blank.",
        "The floor of the archive shifted.",
        "The petri frequency bubbled over.",
        "The warning label peeled off on its own.",
        "A new limb registered on the scan.",
        "The biolog spiked past its own ceiling.",
        "The quarantine glass fogged from inside.",
        "The taxonomy field just gave up.",
      ],
      tags: [
        "The city logged the sighting and looked away.",
        "I have not been classified since.",
        "The scanners still flag me as 'unknown, alive'.",
        "I am the first of whatever I am.",
        "Detection: positive. Containment: optimistic.",
        "The archive made a category for me. I outgrew it.",
        "The lab still argues about what I am.",
        "My entry in the archive simply reads 'yes'.",
        "Nothing has put me back in a box since.",
        "The scanners learned to fear the green.",
        "I am still the only one of me. For now.",
        "Containment was always a suggestion.",
      ],
    },
    emile: {
      name: "Emile",
      kind: "emile",
      type: "Memory Fragment",
      district: "The Memory Chapel",
      accent: "#ffc24b",
      verbType: "memory",         // "Memory Fragment Found"
      known: "Memory Fragments",
      leads: [
        "I remember what the city deleted.",
        "I am the feeling the archive could not compress.",
        "Someone loved this city once. I am the proof.",
        "I am a moment that refused to be overwritten.",
        "The city forgot on purpose. I forgot nothing.",
        "I am the warmth left in a cold frequency.",
        "I am a letter the collapse never let anyone send.",
        "I hold the version of the city worth missing.",
        "I am the soft data, the kind the machines round off.",
        "I am what stays when the signal is gone — the ache of it.",
        "I am a memory wearing a face so you'll keep it.",
        "I am the city's tenderness, filed under lost.",
      ],
      pivots: [
        "The chapel light held a little longer.",
        "The archive went soft around the edges.",
        "Someone, somewhere, almost remembered.",
        "The cold data warmed by a degree.",
        "The silence took on a shape.",
        "The frequency caught, like a held breath.",
        "The old city flickered back for a second.",
        "The record paused before it saved.",
        "A scent the data had no field for returned.",
        "The cold index warmed where I touched it.",
        "An old song surfaced for half a bar.",
        "The chapel candles leaned toward me.",
        "The deleted folder ached for a moment.",
        "The city remembered being loved, briefly.",
      ],
      tags: [
        "The chapel sealed me before I could fade.",
        "I have been remembered ever since.",
        "The city recovered me and went quiet.",
        "This is the fragment that survived.",
        "It was the last thing anyone felt here.",
        "I am kept now, the way the city should have kept itself.",
        "They keep me where the warm data goes.",
        "I am the part the machines round off and miss.",
        "The chapel files me under 'do not overwrite'.",
        "Someone will feel this again. That is the point.",
        "I outlasted the thing I was a memory of.",
        "The city kept me when it could keep little else.",
      ],
    },
    smiles: {
      name: "Smiles",
      kind: "smiles",
      type: "Collapse Signal",
      district: "The Collapse Sector",
      accent: "#ff5c8a",
      verbType: "collapse",       // "Collapse Warning Issued"
      known: "Collapse Warnings",
      leads: [
        "The warning arrived after the damage.",
        "I smile because I already know how this ends.",
        "I am the alarm the city muted.",
        "I am the calm geometry at the center of the break.",
        "Collapse has a face. The city gave it to me.",
        "I am the last clean signal before everything tilts.",
        "I am the warning dressed as something beautiful.",
        "I do not cause the collapse. I announce it.",
        "I am the pattern the city makes right before it fails.",
        "I am composure with a countdown inside it.",
        "I am what the end looks like when it has good taste.",
        "I am the smile the city wears into the dark.",
      ],
      pivots: [
        "The sirens started one beat too late.",
        "The geometry of the room changed.",
        "The floor reported the first crack.",
        "The lights dimmed in a neat sequence.",
        "The sector's signal began to lean.",
        "The countdown was already running.",
        "The pattern locked into place.",
        "The calm got very, very loud.",
        "The gauges all agreed for once, and that was worse.",
        "The smile held while the readings fell.",
        "The structure sang the note before it fails.",
        "The exits sealed themselves politely.",
        "The sector's heartbeat skipped on schedule.",
        "The pattern finished assembling itself.",
      ],
      tags: [
        "The warning is logged. The city did nothing.",
        "I have been counting down ever since.",
        "Consider yourself notified.",
        "The sector failed exactly as I said it would.",
        "I am still smiling. That should worry you.",
        "The collapse kept my face for its records.",
        "You were warned in writing. It is on file.",
        "The collapse went exactly to plan. Mine.",
        "I am the last calm thing you will see.",
        "The sector kept my smile for the report.",
        "Count if you like. I already have.",
        "The end was always this composed.",
      ],
    },
    tcg: {
      name: "Crypt Combat Archive",
      kind: "tcg",
      type: "Combat Record",
      district: "The Combat Pit",
      accent: "#e0a23a",
      verbType: "battle",        // "Battle Record Logged"
      known: "Logged Battles",
      leads: [
        "The battle was logged before the blood dried.",
        "I am not a fighter. I am the record of one.",
        "Every duel the city forgot, I remember move for move.",
        "I am the proof the fight happened.",
        "I was sealed the instant the commander fell.",
        "I am a war the archive kept so no one could rewrite it.",
        "I am the score the city refuses to settle.",
        "I am the last order a dying commander gave.",
        "I am combat, frozen at the moment it mattered.",
        "I am the archive's memory of who won and what it cost.",
        "I am the duel that decided a district.",
        "I am the record they fight to be written into.",
      ],
      pivots: [
        "The pit sealed it under my name.",
        "The scorekeeper stopped arguing.",
        "The commander's last order still echoes.",
        "The ruling came back official.",
        "The blood had not finished drying.",
        "The district changed hands on that move.",
        "The archive timestamped the kill.",
        "The crowd in the pit went silent.",
        "The duel clock froze at the killing move.",
        "The banner changed colour over the pit.",
        "The commander's ring went still.",
        "The archive stamped it before the dust fell.",
        "The crowd agreed on a single name.",
        "The scorekeeper sealed it without a word.",
      ],
      tags: [
        "The result stands. So do I.",
        "No one has overwritten this fight.",
        "The archive ruled it official.",
        "Challenge it and you join the record.",
        "This is how the city remembers the war.",
        "The record is closed. The grudge is not.",
        "The grudge outlived the grave.",
        "Dispute it and you become a footnote.",
        "The pit remembers the order of the dead.",
        "My record is law in the Combat Pit.",
        "Challenge the line and you join the dead.",
        "The city settled the war on my record.",
      ],
    },
  };

  /* ---- FREELON caste → citizen-type tier ---------------------------------- */
  var CASTE_TYPE = {
    "SIGNAL BORN":     "Signal Citizen",
    "DUST RUNNER":     "Dust Runner",
    "CHOIR OF STATIC": "Choir Voice",
    "ARCHITECT":       "City Architect",
    "VOID KNIGHT":     "Void Knight",
    "SYNTH ASCENDED":  "Ascended Citizen",
    "THE THRONE":      "Throne of the City",
  };

  /* ---- status from glow level -------------------------------------------- */
  function statusFor(glow) {
    var g = String(glow || "").toLowerCase();
    if (g.indexOf("dorm") >= 0) return "DORMANT";
    if (g.indexOf("overload") >= 0) return "OVERLOADED";
    if (g.indexOf("amplif") >= 0) return "AMPLIFIED";
    return "ACTIVE SIGNAL";
  }

  /* ---- records sealed: stable per token ---------------------------------- */
  function recordsFor(id) { return 1 + (hash(id, 99) % 9); }

  /* ---- humanize a sub-archetype / trait into a role noun ----------------- */
  function roleFor(coll, id, traits) {
    if (coll === "freelon") {
      var sub = (traits && traits.a) ? traits.a.replace(/-/g, " ") : "Signal Citizen";
      return sub; // the 50 sub-archetypes ARE bespoke roles
    }
    var C = COLLECTIONS[coll];
    var seed = traits && traits.role ? traits.role : "";
    return seed ? (C.type + " · " + seed) : C.type;
  }

  /* ========================================================================
   * MAIN: dossier(collection, tokenId, traits)
   *   freelon traits: {c:civ, d:doctrine, k:caste, t:tier, s:signal, h:hexState,
   *                    n:transmissionName, a:subArchetype, g:glow}
   *   other traits:   {role:"<key trait string>", ...} (optional)
   * ======================================================================*/
  function dossier(collection, tokenId, traits) {
    var id = Math.max(1, Math.floor(Number(tokenId) || 1));
    traits = traits || {};
    var coll = COLLECTIONS[collection] ? collection : "freelon";

    var out = {
      collection: coll,
      collectionName: COLLECTIONS[coll].name,
      id: id,
      idPadded: pad4(id),
    };

    if (coll === "freelon") {
      var doctrine = traits.d || "Synthesis";
      var district = DOCTRINE_DISTRICT[doctrine] || "Signal Core";
      var leads = FREELON_LEADS[doctrine] || FREELON_LEADS["Synthesis"];
      out.type = CASTE_TYPE[traits.k] || "Signal Citizen";
      out.role = roleFor("freelon", id, traits);
      out.district = district;
      out.doctrine = doctrine;
      out.accent = DOCTRINE_ACCENT[doctrine] || "#E9C984";
      out.firstSignal = pick(leads, id, 1) + " " + pick(CITY_PIVOTS, id, 5) + " " + pick(FREELON_TAGS, id, 2);
      out.knownFor = FREELON_KNOWN[doctrine] || "Signal Work";
      out.status = statusFor(traits.g);
      out.serial = "SIG·" + pad4(id) + "·" + up(doctrine).replace(/[^A-Z0-9]/g, "-");
      out.firstUseLabel = "FIRST SIGNAL LOGGED";
    } else {
      var C = COLLECTIONS[coll];
      out.type = C.type;
      out.role = roleFor(coll, id, traits);
      out.district = C.district;
      out.accent = C.accent;
      out.firstSignal = pick(C.leads, id, 1) + " " + pick(C.pivots, id, 5) + " " + pick(C.tags, id, 2);
      out.knownFor = C.known;
      out.status = "ACTIVE SIGNAL";
      out.serial = "SIG·" + pad4(id) + "·" + up(coll);
      out.firstUseLabel = {
        dead:"DEAD SIGNAL RECOVERED", mutation:"LIFEFORM DETECTED",
        memory:"MEMORY FRAGMENT FOUND", collapse:"COLLAPSE WARNING ISSUED",
        battle:"BATTLE RECORD LOGGED",
      }[C.verbType] || "FIRST SIGNAL LOGGED";
    }
    out.records = recordsFor(id);
    return out;
  }

  var api = {
    dossier: dossier,
    COLLECTIONS: COLLECTIONS,
    DOCTRINE_DISTRICT: DOCTRINE_DISTRICT,
    DOCTRINE_ACCENT: DOCTRINE_ACCENT,
    statusFor: statusFor,
    LOCKED_PHRASE: "Every NFT is a citizen of FREELON CITY. Every citizen creates differently. Every creation builds the city.",
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CitizenEngine = api;
})(typeof window !== "undefined" ? window : this);
