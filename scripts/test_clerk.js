// A basic script to query Clerk directly using their API key
require('dotenv').config({ path: '.env.local' });

async function testClerk() {
  try {
    const response = await fetch('https://api.clerk.com/v1/users', {
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`
      }
    });
    const users = await response.json();
    console.log("Found", users.length, "users directly in Clerk.");
    
    // Check if any of them have images
    const usersWithImages = users.filter(u => u.has_image || u.image_url);
    console.log(`Users with images in Clerk: ${usersWithImages.length}`);
    
    usersWithImages.slice(0, 10).forEach(u => {
        console.log(`- ${u.first_name || u.username}: ${u.image_url}`);
    });

  } catch (err) {
    console.error("Clerk fetch error:", err);
  }
}

testClerk();
