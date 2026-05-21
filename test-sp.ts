import { createClient } from '@supabase/supabase-js';
try {
  createClient('', '');
  console.log('Success');
} catch(e: any) {
  console.error('Error:', e.message);
}
