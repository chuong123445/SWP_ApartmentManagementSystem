const fs=require('node:fs');
function prepareUsernamePatches(users,connection='Username-Password-Authentication'){
  if(!Array.isArray(users))throw Error('Expected an array of source profiles');
  const emails=new Set(),numbers=new Set();
  return users.map(user=>{
    const email=typeof user.email==='string'?user.email.trim().toLowerCase():'';
    const username=user.app_metadata?.vneid?.citizen?.cccd_number;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof username!=='string'||!/^\d{12}$/.test(username))throw Error('Invalid email or 12-digit citizen number');
    if(emails.has(email)||numbers.has(username))throw Error('Duplicate email or citizen number');
    emails.add(email);numbers.add(username);
    return {email,connection,patch:{username}};
  });
}
module.exports={prepareUsernamePatches};
if(require.main===module){
  const [source,output]=process.argv.slice(2);
  if(!source||!output)throw Error('Usage: node prepare-auth0-username-patches.cjs source.json output.json');
  const jobs=prepareUsernamePatches(JSON.parse(fs.readFileSync(source,'utf8').replace(/^\uFEFF/,'')));
  fs.writeFileSync(output,JSON.stringify(jobs,null,2)+'\n');console.log('Prepared '+jobs.length+' username patches; no provider requests sent.');
}
