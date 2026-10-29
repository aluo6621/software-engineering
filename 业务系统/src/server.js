import {createApp} from './app.js';
import {existsSync} from 'node:fs';
if(existsSync('.env'))process.loadEnvFile('.env');
const port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1';
const {server}=createApp({database:process.env.DATABASE_PATH||'data/campus.sqlite',adminPassword:process.env.ADMIN_PASSWORD});
server.listen(port,host,()=>console.log(`校园流转：http://${host}:${port}（管理员：admin）`));
