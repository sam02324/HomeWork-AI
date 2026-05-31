// Check if any users exist in the users table
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const sql = neon(process.env.DATABASE_URL);
  
  const users = await sql`SELECT id, email, name, role FROM users`;
  console.log('Users in database:', users.length);
  users.forEach(u => console.log(`  - ${u.id} | ${u.email} | ${u.name} | ${u.role}`));
  
  const classrooms = await sql`SELECT * FROM classrooms`;
  console.log('\nClassrooms in database:', classrooms.length);
  classrooms.forEach(c => console.log(`  - ${c.id} | ${c.name} | teacher: ${c.teacher_id}`));
}

check();
