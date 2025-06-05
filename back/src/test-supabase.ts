// src/test-supabase.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
  try {
    const { data, error } = await supabase.storage.from('product-images').list();
    console.log('Data:', data);
    if (error) throw error;
  } catch (err) {
    console.error('Error:', err);
  }
}

test();