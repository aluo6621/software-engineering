import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../src/app.js';

test('管理员读取所有账号和认证历史，普通用户不可访问，凭据不外泄且读取留痕',async t=>{
 const app=createApp({database:':memory:',adminPassword:'AdminPassword123!'});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 t.after(()=>new Promise(r=>app.server.close(r)));
 const base='http://127.0.0.1:'+app.server.address().port+'/api';
 async function request(path,options={}){const r=await fetch(base+path,options);return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const post=data=>({method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
 const registration=await request('/register',post({username:'student_test',password:'StudentPass123'}));
 assert.equal(registration.status,201);
 const id=registration.body.id;
 const student=await request('/login',post({username:'student_test',password:'StudentPass123'}));
 const admin=await request('/login',post({username:'admin',password:'AdminPassword123!'}));
 await request('/certifications',{...post({realName:'测试学生',studentNo:'TEST001'}),headers:{'content-type':'application/json',cookie:student.cookie,'x-csrf-token':student.body.csrf}});
 for(const path of ['/admin/users','/admin/users/'+id]){
  assert.equal((await request(path)).status,401);
  assert.equal((await request(path,{headers:{cookie:student.cookie}})).status,403);
 }
 const list=await request('/admin/users',{headers:{cookie:admin.cookie}});
 assert.equal(list.status,200);assert.equal(list.body.users.length,2);
 assert.ok(list.body.users.some(u=>u.role==='admin'));
 assert.equal(list.body.users.find(u=>u.id===id).certification_status,'pending');
 const detail=await request('/admin/users/'+id,{headers:{cookie:admin.cookie}});
 assert.equal(detail.status,200);assert.equal(detail.body.certifications[0].student_no,'TEST001');
 assert.equal(detail.body.account.username,'student_test');assert.equal(detail.body.passwordSet,true);
 const payload=JSON.stringify([list.body,detail.body]);
 for(const secret of ['password_hash','token_hash','StudentPass123','AdminPassword123!','csrf'])assert.ok(!payload.includes(secret));
 assert.equal((await request('/admin/users/999999',{headers:{cookie:admin.cookie}})).status,404);
 const audits=app.db.prepare("SELECT action,actor_id,target FROM audit WHERE action IN ('read_accounts','read_account') ORDER BY id").all();
 assert.equal(audits.length,2);assert.equal(audits[1].target,String(id));assert.equal(audits[1].actor_id,admin.body.user.id);
});
