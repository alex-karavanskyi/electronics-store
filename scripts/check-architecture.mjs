import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)])
for(const app of ['client','server']) {
 const other=app==='client'?'server':'client'
 const pkg=JSON.parse(fs.readFileSync(path.join(root,app,'package.json'),'utf8'))
 for(const name of Object.keys({...pkg.dependencies,...pkg.devDependencies})) assert.ok(name!=='next'&&!name.startsWith('@next/')&&name!=='eslint-config-next'&&name!=='electronics-store','Forbidden dependency: '+app+'/'+name)
 const lock=JSON.parse(fs.readFileSync(path.join(root,app,'package-lock.json'),'utf8'))
 assert.ok(!Object.keys(lock.packages).some(name=>/(?:^|\/)node_modules\/(next|@next\/[^/]+|eslint-config-next)$/.test(name)),'Next package in '+app+' lock')
 for(const file of walk(path.join(root,app,'src')).filter(file=>/\.[cm]?[jt]sx?$/.test(file))) {
  const text=fs.readFileSync(file,'utf8')
  assert.ok(!/^\s*['"]use (client|server)['"]/m.test(text),'Server/client directive in '+file)
  for(const match of text.matchAll(/(?:from\s*|import\s*\(?|require\s*\()['"]([^'"]+)['"]/g)) {
   const specifier=match[1]
   assert.ok(!/^next(?:\/|$)/.test(specifier),'Next import in '+file)
   const resolved=specifier.startsWith('.')?path.resolve(path.dirname(file),specifier):specifier
   assert.ok(!resolved.startsWith(path.join(root,other)+path.sep)&&!specifier.includes('electronics-store-'+other),'Cross-boundary import in '+file)
  }
 }
}
for(const name of ['src','next.config.mjs','next-env.d.ts','.next']) assert.ok(!fs.existsSync(path.join(root,name)),'Legacy artifact: '+name)
const rootPkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'))
assert.deepEqual(Object.keys(rootPkg.dependencies??{}),[])
console.log('PASS: independent client/server, no Next runtime packages, imports or legacy artifacts')
