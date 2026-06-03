const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data } = await supabase.from('properties').select('*');
  console.log(JSON.stringify(data, null, 2));
}
run();
