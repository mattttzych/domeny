const express = require('express');
const dns = require('dns');
const path = require('path');
const { promisify } = require('util');

const app = express();
const PORT = 3456;

// Promisify dns.resolve
const dnsResolve = promisify(dns.resolve);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Check domain availability via DNS
async function checkDomainAvailability(domain) {
  try {
    await dnsResolve(domain);
    return { domain, available: false };
  } catch (err) {
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA' || err.code === 'SERVFAIL') {
      return { domain, available: true };
    }
    // For timeout or other errors, mark as unknown
    return { domain, available: 'unknown' };
  }
}

// Generate domain suggestions from keywords
function generateDomainSuggestions(keywords, extensions) {
  const suggestions = new Set();
  const clean = keywords.map(k => k.toLowerCase().trim().replace(/[^a-z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/gi, ''));

  // Polish character replacements for domain names
  function polishToAscii(str) {
    return str
      .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
      .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
      .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
      .replace(/Ą/g, 'A').replace(/Ć/g, 'C').replace(/Ę/g, 'E')
      .replace(/Ł/g, 'L').replace(/Ń/g, 'N').replace(/Ó/g, 'O')
      .replace(/Ś/g, 'S').replace(/Ź/g, 'Z').replace(/Ż/g, 'Z');
  }

  const asciiKeywords = clean.map(polishToAscii);

  // Single keywords
  for (const kw of asciiKeywords) {
    if (kw.length >= 3) {
      for (const ext of extensions) {
        suggestions.add(`${kw}.${ext}`);
      }
    }
  }

  // Two-keyword combinations (all permutations)
  for (let i = 0; i < asciiKeywords.length; i++) {
    for (let j = 0; j < asciiKeywords.length; j++) {
      if (i !== j) {
        const combined = asciiKeywords[i] + asciiKeywords[j];
        const withDash = asciiKeywords[i] + '-' + asciiKeywords[j];
        for (const ext of extensions) {
          if (combined.length <= 63) suggestions.add(`${combined}.${ext}`);
          if (withDash.length <= 63) suggestions.add(`${withDash}.${ext}`);
        }
      }
    }
  }

  // Three-keyword combinations
  if (asciiKeywords.length >= 3) {
    for (let i = 0; i < asciiKeywords.length; i++) {
      for (let j = 0; j < asciiKeywords.length; j++) {
        for (let k = 0; k < asciiKeywords.length; k++) {
          if (i !== j && j !== k && i !== k) {
            const combined = asciiKeywords[i] + asciiKeywords[j] + asciiKeywords[k];
            const withDash = asciiKeywords[i] + '-' + asciiKeywords[j] + '-' + asciiKeywords[k];
            for (const ext of extensions) {
              if (combined.length <= 63) suggestions.add(`${combined}.${ext}`);
              if (withDash.length <= 63) suggestions.add(`${withDash}.${ext}`);
            }
          }
        }
      }
    }
  }

  // With common prefixes
  const prefixes = ['e', 'i', 'my', 'go', 'pro', 'top', 'best', 'get', 'the', 'super', 'mega', 'tu', 'na', 'do', 'jak', 'twoj', 'nasz', 'pan', 'dr'];
  for (const kw of asciiKeywords) {
    for (const prefix of prefixes) {
      for (const ext of extensions) {
        const d = `${prefix}${kw}.${ext}`;
        if (d.length <= 67) suggestions.add(d);
        // Also with dash
        const dDash = `${prefix}-${kw}.${ext}`;
        if (dDash.length <= 67) suggestions.add(dDash);
      }
    }
  }

  // With common suffixes
  const suffixes = ['online', 'app', '24', '365', 'now', 'hub', 'pro', 'net', 'pl', 'go', 'ok', 'med', 'doc', 'plus', 'max', 'top', 'express', 'center', 'punkt', 'portal', 'site', 'info', 'click', 'fast', 'easy', 'smart', 'zone', 'spot', 'web', 'oferta', 'studio', 'group', 'team', 'city', 'local'];
  for (const kw of asciiKeywords) {
    for (const suffix of suffixes) {
      for (const ext of extensions) {
        const d = `${kw}${suffix}.${ext}`;
        if (d.length <= 67) suggestions.add(d);
        // Also with dash
        const dDash = `${kw}-${suffix}.${ext}`;
        if (dDash.length <= 67) suggestions.add(dDash);
      }
    }
  }

  // Two keywords with prefixes/suffixes
  for (let i = 0; i < asciiKeywords.length; i++) {
    for (let j = 0; j < asciiKeywords.length; j++) {
      if (i !== j) {
        const base = asciiKeywords[i] + asciiKeywords[j];
        const baseDash = asciiKeywords[i] + '-' + asciiKeywords[j];
        for (const prefix of prefixes.slice(0, 8)) {
          for (const ext of extensions) {
            suggestions.add(`${prefix}${base}.${ext}`);
            suggestions.add(`${prefix}-${base}.${ext}`);
          }
        }
        for (const suffix of suffixes.slice(0, 12)) {
          for (const ext of extensions) {
            suggestions.add(`${base}${suffix}.${ext}`);
            suggestions.add(`${baseDash}-${suffix}.${ext}`);
          }
        }
      }
    }
  }

  // Vowel removal for short creative names (e.g. lekarz -> lkrz, wizyta -> wzyt)
  function removeVowels(str) {
    return str.replace(/[aeiouy]/gi, '');
  }

  for (const kw of asciiKeywords) {
    const noVowel = removeVowels(kw);
    if (noVowel.length >= 3) {
      for (const ext of extensions) {
        suggestions.add(`${noVowel}.${ext}`);
      }
    }
  }

  // Two keywords with vowel removal
  for (let i = 0; i < asciiKeywords.length; i++) {
    for (let j = 0; j < asciiKeywords.length; j++) {
      if (i !== j) {
        const short1 = removeVowels(asciiKeywords[i]);
        const short2 = removeVowels(asciiKeywords[j]);
        for (const ext of extensions) {
          if (short1.length >= 2 && short2.length >= 2) {
            suggestions.add(`${short1}${short2}.${ext}`);
          }
          // Mix: full + abbreviated
          suggestions.add(`${asciiKeywords[i]}${short2}.${ext}`);
          suggestions.add(`${short1}${asciiKeywords[j]}.${ext}`);
        }
      }
    }
  }

  // First N characters abbreviations (e.g., lek + krak + wiz)
  for (const kw of asciiKeywords) {
    for (const len of [3, 4]) {
      if (kw.length > len) {
        const abbr = kw.slice(0, len);
        for (const ext of extensions) {
          suggestions.add(`${abbr}.${ext}`);
        }
      }
    }
  }

  // Abbreviation combos
  for (let i = 0; i < asciiKeywords.length; i++) {
    for (let j = 0; j < asciiKeywords.length; j++) {
      if (i !== j) {
        for (const len1 of [3, 4]) {
          for (const len2 of [3, 4]) {
            const a = asciiKeywords[i].slice(0, len1);
            const b = asciiKeywords[j].slice(0, len2);
            if (a.length >= 3 && b.length >= 3) {
              for (const ext of extensions) {
                suggestions.add(`${a}${b}.${ext}`);
              }
            }
          }
        }
      }
    }
  }

  // Number substitutions (e.g., lekarz4u, wizyta2go)
  const numberSuffixes = ['4u', '2go', '4you', '247', '360', '1'];
  for (const kw of asciiKeywords) {
    for (const ns of numberSuffixes) {
      for (const ext of extensions) {
        suggestions.add(`${kw}${ns}.${ext}`);
      }
    }
  }

  // "do" + keyword combinations (very Polish: "do lekarza" idea)
  const polishPreps = ['do', 'na', 'po', 'u', 'w'];
  for (const kw of asciiKeywords) {
    for (const prep of polishPreps) {
      for (const ext of extensions) {
        suggestions.add(`${prep}${kw}.${ext}`);
        suggestions.add(`${kw}${prep}.${ext}`);
      }
    }
  }

  return [...suggestions];
}

// Score domain quality (lower is better for sorting)
function scoreDomain(domain) {
  const name = domain.split('.')[0];
  const ext = domain.split('.').slice(1).join('.');
  let score = 0;

  // Shorter is better
  score += name.length * 2;

  // Prefer .pl > .com.pl > .com
  if (ext === 'pl') score -= 5;
  if (ext === 'com.pl') score -= 4;
  if (ext === 'com') score -= 3;

  // Penalize dashes
  if (name.includes('-')) score += 3;

  // Penalize very long names
  if (name.length > 15) score += 10;
  if (name.length > 20) score += 20;

  // Bonus for short memorable names
  if (name.length <= 8) score -= 5;
  if (name.length <= 6) score -= 8;

  return score;
}

// API endpoint to search domains
app.post('/api/search', async (req, res) => {
  const { keywords, extensions = ['pl', 'com'] } = req.body;

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: 'Podaj przynajmniej jedno słowo kluczowe' });
  }

  // Generate suggestions
  let suggestions = generateDomainSuggestions(keywords, extensions);

  // Sort by quality score
  suggestions.sort((a, b) => scoreDomain(a) - scoreDomain(b));

  // Limit to top suggestions to avoid too many DNS lookups
  suggestions = suggestions.slice(0, 200);

  // Check availability in batches
  const batchSize = 20;
  const results = [];

  for (let i = 0; i < suggestions.length; i += batchSize) {
    const batch = suggestions.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(domain => checkDomainAvailability(domain))
    );
    results.push(...batchResults);
  }

  // Sort: available first, then by score
  results.sort((a, b) => {
    if (a.available === true && b.available !== true) return -1;
    if (a.available !== true && b.available === true) return 1;
    return scoreDomain(a.domain) - scoreDomain(b.domain);
  });

  res.json({ results, total: results.length });
});

// Single domain check endpoint
app.post('/api/check', async (req, res) => {
  const { domain } = req.body;
  if (!domain) {
    return res.status(400).json({ error: 'Podaj domenę' });
  }
  const result = await checkDomainAvailability(domain);
  res.json(result);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Domain Finder running at http://0.0.0.0:${PORT}`);
});
