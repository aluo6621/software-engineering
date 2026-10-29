import {existsSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
if(existsSync('.env'))console.log('已存在.env，保留现有配置。');
else {writeFileSync('.env',`ADMIN_PASSWORD=${randomBytes(18).toString('base64url')}\nPORT=3000\nHOST=127.0.0.1\n`,{mode:0o600});console.log('已创建仅本用户可读的.env。首次管理员用户名：admin，初始密码见该文件。请勿提交或分享.env。');}
