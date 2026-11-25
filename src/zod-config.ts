/**
 * Zod 4 probes `new Function` to pick a faster parser; this page's CSP forbids eval, so the
 * probe would log a policy violation. Imported first in main.tsx, before any schema module.
 */
import { z } from 'zod';

z.config({ jitless: true });
