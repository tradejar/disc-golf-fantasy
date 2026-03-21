import { clerkClient } from '@clerk/nextjs/server';

async function test() {
  const client = await clerkClient();
  const res = await client.users.getUserList({ userId: ['123'] });
  console.log(res.data[0].imageUrl);
}
test();
