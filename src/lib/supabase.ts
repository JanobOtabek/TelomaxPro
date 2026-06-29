import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ztqzzgxnbyekmmkmnird.supabase.co";
const SUPABASE_KEY = "sb_publishable_BtkMlaFOvHoA4tkeSrnSdQ_I3EYh0R1";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
