import type { DB } from './db.ts';
import { filterSql, parseQuery } from './employees.ts';
import { summarize,type Role } from './domain.ts';
import { z } from 'zod';
type Row={id:number;name:string;salary:number;department:string;jobTitle:string;country:string;employmentType:string};
export function insights(db:DB,raw:unknown,role:Role){const q=parseQuery(raw,role);const currency=q.currency||'INR';const groupBy=z.object({groupBy:z.enum(['department','country','jobTitle']).default('department')}).parse(raw).groupBy;
  const {where,params}=filterSql({...q,currency});const rows=db.prepare('SELECT id,name,salary_minor AS salary,department,job_title AS jobTitle,country,employment_type AS employmentType FROM employees'+where).all(...params) as Row[];
  const grouped=new Map<string,number[]>();const peers=new Map<string,Row[]>();for(const row of rows){const key=row[groupBy];grouped.set(key,[...(grouped.get(key)??[]),row.salary]);const peerKey=`${row.country}|${row.jobTitle}|${row.employmentType}`;peers.set(peerKey,[...(peers.get(peerKey)??[]),row]);}
  const safe=(values:number[])=>{const s=summarize(values);if(role==='HR_MANAGER')return s;if(s.count<5)return null;const {min:_min,max:_max,...aggregate}=s;return aggregate;};
  const groups=[...grouped].map(([name,values])=>({name,stats:safe(values)})).filter(g=>g.stats!==null).sort((a,b)=>b.stats!.count-a.stats!.count);
  const summary=safe(rows.map(r=>r.salary));const outliers:({id:number;name:string;salary:number;jobTitle:string;country:string;kind:string})[]=[];
  if(role==='HR_MANAGER')for(const group of peers.values()){if(group.length<5)continue;const s=summarize(group.map(r=>r.salary));const iqr=s.p75-s.p25;if(iqr===0)continue;for(const row of group)if(row.salary<s.p25-1.5*iqr||row.salary>s.p75+1.5*iqr)outliers.push({id:row.id,name:row.name,salary:row.salary,jobTitle:row.jobTitle,country:row.country,kind:row.salary<s.median?'Below range':'Above range'});}
  // Fixed edges for each currency avoid revealing individual salaries through bin edges.
  const step=currency==='INR'?100000000:2500000;const bands=Array.from({length:6},(_,i)=>({label:i===5?`${step*i/100}+`:`${step*i/100}–${step*(i+1)/100}`,count:rows.filter(r=>r.salary>=step*i&&(i===5||r.salary<step*(i+1))).length}));
  return {currency,groupBy,summary,groups,bands:role==='HR_MANAGER'?bands:[],outliers:role==='HR_MANAGER'?outliers.slice(0,20):[],outlierCount:role==='HR_MANAGER'?outliers.length:0,filteredHeadcount:rows.length,organizationHeadcount:(db.prepare('SELECT count(*) AS n FROM employees').get() as {n:number}).n};
}
