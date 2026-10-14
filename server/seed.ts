import { pathToFileURL } from 'node:url';
import { openDatabase,type DB } from './db.ts';
import { countries } from './domain.ts';
import { hashPassword } from './auth.ts';
export function seed(db:DB,password=process.env.DEMO_PASSWORD??'AssessmentDemo42!'){
  if(Number((db.prepare('SELECT count(*) AS n FROM employees').get() as {n:number}).n)>0)throw new Error('Database already contains employees. Seed refuses to overwrite existing records.');
  if(process.env.NODE_ENV==='production'&&password==='AssessmentDemo42!')throw new Error('Set DEMO_PASSWORD before seeding production.');
  const first=['Aarav','Olivia','Noah','Ishita','James','Emma','Arjun','Sophia','Liam','Amelia','Kabir','Mia','Lucas','Ananya','Ethan','Charlotte','Vihaan','Isabella','Henry','Zara'];
  const last=['Sharma','Patel','Wilson','Chen','Singh','Brown','Taylor','Müller','Wong','Martin','Kumar','Thomas','Anderson','Lee','Gupta','Clark','Walker','Scott','Mehta','Young'];
  const departments=['Engineering','Product','Design','Sales','Marketing','People','Finance','Operations'];
  const titles=['Software Engineer','Product Manager','Product Designer','Account Executive','Marketing Specialist','People Partner','Financial Analyst','Operations Specialist'];
  const countryNames=Object.keys(countries) as (keyof typeof countries)[];const bases=[1800000,110000,65000,72000,95000,90000];let state=42;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  db.exec('BEGIN');try{const statement=db.prepare('INSERT INTO employees(name,email,country,currency,department,job_title,employment_type,salary_minor,joining_date) VALUES(?,?,?,?,?,?,?,?,?)');for(let i=0;i<10000;i++){const c=Math.floor(random()*6),d=Math.floor(random()*8);const name=`${first[Math.floor(random()*first.length)]} ${last[Math.floor(random()*last.length)]}`;const annual=Math.round(bases[c]*(.55+random()*1.1)*(d===0?1.2:1)*(i%211===0?2.8:1));const date=new Date(Date.UTC(2015+Math.floor(random()*11),Math.floor(random()*12),1+Math.floor(random()*28))).toISOString().slice(0,10);statement.run(name,`employee${String(i+1).padStart(5,'0')}@acme.example`,countryNames[c],countries[countryNames[c]],departments[d],titles[d],i%17===0?'Contract':i%23===0?'Part-time':'Full-time',annual*100,date);}
  const user=db.prepare('INSERT INTO users(email,name,password_hash,role) VALUES(?,?,?,?)');user.run('hr@acme.example','Ashif · HR Manager',hashPassword(password),'HR_MANAGER');user.run('viewer@acme.example','Demo Viewer',hashPassword(password),'VIEWER');db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const db=openDatabase();try{seed(db);console.log('Seeded exactly 10,000 synthetic employees and two demo accounts.');}finally{db.close();}}
