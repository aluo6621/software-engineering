import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../src/app.js';

test('JSON异常请求返回400，不修改账号资料或触发登录锁定',async t=>{
 const app=createApp({database:':memory:',adminPassword:'AdminPassword123!'});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 t.after(()=>new Promise(r=>app.server.close(r)));
 const base='http://127.0.0.1:'+app.server.address().port;
 const login=await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'admin',password:'AdminPassword123!'})});
 assert.equal(login.status,200);
 const {csrf}=await login.json(),cookie=login.headers.get('set-cookie').split(';')[0];
 const before={...app.db.prepare('SELECT nickname,bio,failed_attempts,locked_until FROM users WHERE username=?').get('admin')};
 for(const [payload,error] of [['null','请求内容必须为JSON对象'],['[]','请求内容必须为JSON对象'],['"hello"','请求内容必须为JSON对象'],['123','请求内容必须为JSON对象'],['true','请求内容必须为JSON对象'],['false','请求内容必须为JSON对象'],['{','JSON格式错误'],['{"username":','JSON格式错误']]){
  for(const [path,method] of [['/login','POST'],['/register','POST'],['/profile','PUT'],['/profile/avatar','PUT']]){
   const response=await fetch(base+'/api'+path,{method,headers:{'content-type':'application/json',cookie,'x-csrf-token':csrf},body:payload});
   assert.equal(response.status,400,path+' '+payload);assert.deepEqual(await response.json(),{error});
  }
 }
 for(const payload of ['{}','',JSON.stringify({username:null,password:[]})]){
  const response=await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:payload});assert.equal(response.status,400);
 }
 assert.deepEqual({...app.db.prepare('SELECT nickname,bio,failed_attempts,locked_until FROM users WHERE username=?').get('admin')},before);
 assert.equal(app.db.prepare('SELECT COUNT(*) n FROM users').get().n,1);
 assert.equal(app.db.prepare('SELECT COUNT(*) n FROM sessions').get().n,1);
 const valid=await fetch(base+'/api/profile',{method:'PUT',headers:{'content-type':'application/json',cookie,'x-csrf-token':csrf},body:' {"nickname":"正常资料","bio":"依然可以保存"} '});
 assert.equal(valid.status,200);
 assert.equal(app.db.prepare('SELECT nickname FROM users WHERE username=?').get('admin').nickname,'正常资料');
});
