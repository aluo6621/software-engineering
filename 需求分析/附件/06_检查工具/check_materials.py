# -*- coding: utf-8 -*-
"""Material checks only. Does not execute application or business tests."""
from pathlib import Path
from zipfile import ZipFile
from datetime import datetime
from zoneinfo import ZoneInfo
import re,json,hashlib,xml.etree.ElementTree as ET
B=Path(__file__).resolve().parents[1]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
checks=[]
def require(name,condition,detail):
 checks.append({'check':name,'result':'pass' if condition else 'fail','detail':detail})
s=(B/'需求规格说明书.md').read_text()
for prefix,count,start,end in [('UC',25,'### 2.2','### 2.3'),('BR',23,'### 4.1','### 4.2'),('DC',9,'#### 3.4.2','#### 3.4.3'),('QR',11,'### 6.1','### 6.2'),('AC',18,'### 7.1','### 7.2')]:
 section=s[s.index(start):s.index(end)]
 values=re.findall(r'^\| '+prefix+r'-(\d{2})(?:\s|\|)',section,re.M)
 require(prefix+' declarations',sorted(values)==[f'{i:02d}' for i in range(1,count+1)],f'expect {count} unique sequential IDs; found {len(values)}')
v=(B/'验收场景清单.md').read_text();vt=re.findall(r'^## VT-(\d{2}) ',v,re.M)
require('VT scenarios',vt==[f'{i:02d}' for i in range(1,36)] and v.count('- 状态：未执行')==35,'35 sequential scenarios, all not executed; no behavioral result inferred')
require('report versions',all('V2.0' in (B/p).read_text() for p in ['需求规格说明书.md','A-需求分析质量验证报告.md','B-AI智能体使用验证报告.md','验收场景清单.md']),'Current document versions; does not examine all historical version mentions')
pumls=list((B/'models').glob('M-*.puml'));svgs=list((B/'models').glob('M-*.svg'))
require('model files',len(pumls)==10 and len(svgs)==13,'10 semantic sources and 13 SVG views; no PlantUML compilation')
for p in svgs:
 try:
  r=ET.parse(p).getroot();w,h=float(r.attrib['width']),float(r.attrib['height']);ts=list(r.iter('{http://www.w3.org/2000/svg}text'))
  ok=bool(ts) and all(0<=float(t.attrib['x'])<=w and 0<=float(t.attrib['y'])<=h for t in ts)
  require('SVG '+p.name,ok,'XML and text anchor bounds only; actual glyph extents/edge routing need visual review')
 except Exception as e:require('SVG '+p.name,False,str(e))
# Validate local Markdown evidence links, while known missing originals remain explicitly missing.
for file in ['B-AI智能体使用验证报告.md']:
 links=re.findall(r'\]\(([^)]+)\)',(B/file).read_text())
 require('evidence links',all((B/x).exists() or x in ['evidence/基线文件清单.json','evidence/材料检查结果.json'] for x in links),'Current local evidence inputs exist; two report outputs are produced by this run; E-01 and E-06 remain missing; E-02 acquired')
require('classroom SVG copy',(B.parents[2]/'实验/需求分析课堂材料/02_用例图.svg').read_bytes()==(B/'models/M-03-用例图.svg').read_bytes(),'Current classroom copy matches; historical archive untouched')
zp=B.parents[1]/'校园二手交易与物品流转平台.zip';archive_ok=True;found=set()
with ZipFile(zp) as z:
 for info in z.infolist():
  if info.filename.startswith('__MACOSX/'):continue
  n=info.filename
  if not info.flag_bits&0x800:
   for enc in ['utf-8','gbk']:
    try:n=info.filename.encode('cp437').decode(enc);break
    except (UnicodeEncodeError,UnicodeDecodeError):pass
  targets=['需求规格说明书.md','A-需求分析质量验证报告.md','B-AI智能体使用验证报告.md']
  for name in targets:
   if n.endswith('/docs/history/lyl_V1.1/'+name) or n=='docs/history/lyl_V1.1/'+name:
    found.add(name);archive_ok &= (B/'history/lyl_V1.1'/name).read_bytes()==z.read(info)
require('archive snapshot consistency',archive_ok and len(found)==3,'Three local V1.1 texts equal archived entries inside current ZIP snapshot; does not establish provenance of the originally received ZIP')
current=s.split('## 2026-10-15 范围调整记录')[0]
require('direct exchange offer choice','UD-05' in current and '提供项为空' in current,'User selected no prerequisite publish/review; offer stays order-private')
require('optional offer product association','Product \"0..1\" -- \"0..*\" OrderItem' in (B/'models/M-07-domain-class.puml').read_text(),'Target item has product; direct offer has no product link')
require('no stale double locks',all(x not in (B/'models/tools/build_svgs.py').read_text() for x in ['交换锁 2 件','交换两件物品分别判断']), 'No second product lock or public restoration for direct offer')

# Evidence inventory itself is explicitly excluded from self-hashing.
result={'version':'V2.0','generated_at':datetime.now(ZoneInfo('Asia/Shanghai')).isoformat(),'scope':'mechanical material checks, not independent approval or software tests','checks':checks,'known_missing':['E-01 course original','E-06 complete AI conversation exports'],'business_scenarios':'35 not executed','all_listed_checks_pass':all(c['result']=='pass' for c in checks)}
(B/'evidence/材料检查结果.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
files=[]
for p in sorted(B.rglob('*')):
 if p.is_file() and p.name!='基线文件清单.json' and p.suffix in ['.md','.puml','.svg','.py','.html','.json']:
  files.append({'path':p.relative_to(B).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)})
files.append({'path':'../../校园二手交易与物品流转平台.zip','bytes':zp.stat().st_size,'sha256':sha(zp)})
manifest={'version':'V2.0 review draft','generated_at':result['generated_at'],'meaning':'file identity only; not approval or correctness; regenerate after changes','excluded':['this manifest itself','plantuml.jar rendering dependency','binary preview files and temporary outputs'],'files':files}
(B/'evidence/基线文件清单.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
assert all((B/x).exists() for x in links), 'output evidence links missing after generation'
print(json.dumps({'checks':len(checks),'passed':result['all_listed_checks_pass'],'manifest_files':len(files),'business_scenarios':'35 not executed'},ensure_ascii=False))
raise SystemExit(0 if result['all_listed_checks_pass'] else 1)
