require('dotenv').config({ path: '.env.local' });
async function testClerk() {
  const response = await fetch('https://api.clerk.com/v1/users?limit=100', {
      headers: { 'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}` }
  });
  const users = await response.json();
  const misu = users.find(u => u.first_name === 'misu' || (u.email_addresses && u.email_addresses[0].email_address.includes('misu')));
  console.log("Misu user:", misu ? {
      id: misu.id, 
      first_name: misu.first_name, 
      image_url: misu.image_url, 
      has_image: misu.has_image
  } : 'Not found');
}
testClerk();
