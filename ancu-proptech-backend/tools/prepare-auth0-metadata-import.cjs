// Run from backend: node tools/prepare-auth0-metadata-import.cjs [new-output-directory]
// Metadata only: never creates/resets passwords, accounts, contact verification flags or remote data.
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const users=JSON.parse(fs.readFileSync(path.join(root,'docs/samples/auth0/users.json'),'utf8'));
const output=path.resolve(process.argv[2]||'target/auth0-profile-details-2026-11-03-v2');
if(fs.existsSync(output))throw Error('Output already exists; choose a new directory.');
if(users.length!==10||new Set(users.map(u=>u.email)).size!==10)throw Error('Expected exactly ten unique profiles');
const updates=users.map(u=>{
 const c=u.app_metadata?.vneid?.citizen;
 if(!c||!c.document_issue_date||!c.document_issue_place||!c.permanent_address)throw Error('Missing citizen details');
 if(Object.hasOwn(c,'phone_number'))throw Error('Phone belongs to the ordinary account profile, not citizen metadata');
 return {email:u.email,app_metadata:u.app_metadata};
});
fs.mkdirSync(path.join(output,'per-user-app-metadata'),{recursive:true});
fs.writeFileSync(path.join(output,'users-upsert.json'),JSON.stringify(updates,null,2)+'\n');
for(const u of users)fs.writeFileSync(path.join(output,'per-user-app-metadata',u.email.split('@')[0]+'.json'),JSON.stringify(u.app_metadata,null,2)+'\n');
fs.copyFileSync(path.join(root,'docs/setup/vneid-post-login.js'),path.join(output,'vneid-post-login.js'));
fs.copyFileSync(path.join(root,'docs/samples/auth0/IMPORT-PROFILE-DETAILS.md'),path.join(output,'HUONG-DAN.md'));
console.log(JSON.stringify({output,profiles:updates.length,files:13,passwordsIncluded:false,providerWrites:false}));
