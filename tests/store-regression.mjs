import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Exercise the same handlers compiled by Vite, with controlled Auth and DB replies.
const source = readFileSync(new URL('../src/context/StoreContext.tsx', import.meta.url),'utf8');
function getHandler(name, end, bindings) {
  const code = source.slice(source.indexOf('const '+name+' ' ) >= 0
    ? source.indexOf('const '+name+' ') : source.indexOf('const '+name+':'), source.indexOf(end));
  const js = ts.transpile(code, {target:ts.ScriptTarget.ES2022});
  return Function(...Object.keys(bindings), js+';return '+name)(...Object.values(bindings));
}
for (const blocked of [true,false]) {
  test('Auth failure, partial save and retry, blocked='+blocked, async()=>{
    let authFails=true, dbFails=false, profile=!blocked, auth=!blocked, writes=0;
    const supabase={
      functions:{invoke:async()=>{if(authFails)return {error:new Error('test')};auth=blocked;return {data:{ok:true}}}},
      from:()=>({update:()=>({eq:()=>({select:()=>({maybeSingle:async()=>{
        writes++;if(dbFails)return {error:new Error('test')};profile=blocked;return {data:{id:'c'}};
      }})})})})
    };
    const change=getHandler('toggleBlockCustomer','  const setCustomerArchived',{
      customers:[{id:'c',authUserId:'u'}],isSupabaseConfigured:true,supabase,addToast(){},setCustomers(){},currentCustomer:null
    });
    assert.equal(await change('c',blocked),false);assert.equal(writes,0);
    authFails=false;dbFails=true;
    assert.equal(await change('c',blocked),false);assert.equal(auth,blocked);assert.equal(profile,!blocked);
    dbFails=false;assert.equal(await change('c',blocked),true);assert.equal(profile,auth);
  });
}
test('guest and existing customer quantities are combined by product',()=>{
  const merge=getHandler('mergeCartItems','function mapRowToCategory',{});
  assert.deepEqual(merge([{productId:'a',quantity:2}], [{productId:'a',quantity:1},{productId:'b',quantity:1}]),
    [{productId:'a',quantity:3},{productId:'b',quantity:1}]);
});
