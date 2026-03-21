require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { error } = await supabase
        .from('profiles')
        .update({ display_name: 'misu verdi' })
        .eq('id', 'user_39tKuj8vDHTJ0StkI0HRHRapZE5');
    
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('✅ Updated misu test → misu verdi');
    }
}
run();
