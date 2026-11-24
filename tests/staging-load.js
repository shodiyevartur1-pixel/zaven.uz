import http from 'k6/http';
import {check, sleep} from 'k6';
import {SharedArray} from 'k6/data';
import {Counter} from 'k6/metrics';
import exec from 'k6/execution';

// Use a loopback reverse proxy to the isolated staging project. The fixture
// contains synthetic customer sessions and a current, receipt-free test cart.
const origin = __ENV.STAGING_PROXY;
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin || '')) throw Error('Set STAGING_PROXY to a local isolated staging proxy');
const users = new SharedArray('synthetic sessions', () => JSON.parse(open(__ENV.FIXTURE)));
const created = new Counter('successful_orders');
export const options = {
  stages: [{duration:'2m',target:100},{duration:'5m',target:1000},{duration:'8m',target:5000},
    {duration:'10m',target:10000},{duration:'30m',target:10000},{duration:'3m',target:0}],
  thresholds:{http_req_failed:['rate<0.005'],'http_req_duration{flow:catalog}':['p(95)<800'],
    'http_req_duration{flow:checkout}':['p(95)<2000'],checks:['rate>0.995']},
};
export function setup(){
  if(!users.length || !__ENV.ANON_KEY || !__ENV.RUN_HEX?.match(/^[0-9a-f]{16}$/i)) throw Error('Provide synthetic sessions, ANON_KEY and a fresh 16-character hexadecimal RUN_HEX');
}
export default function(){
  const lane=exec.vu.idInTest%100;
  const flow=lane<80?'catalog':lane<95?'cart':'checkout';
  const user=users[(exec.vu.idInTest-1)%users.length];
  const params={redirects:0,tags:{flow},headers:{apikey:__ENV.ANON_KEY,
    Authorization:'Bearer '+(lane<95?__ENV.ANON_KEY:user.token),'Content-Type':'application/json'}};
  let response;
  if(flow==='checkout'){
    const number=__ENV.RUN_HEX+exec.scenario.iterationInTest.toString(16).padStart(16,'0');
    response=http.post(origin+'/functions/v1/submit-order-receipt',
      JSON.stringify({order:{...user.order,orderNumber:'ZVN-'+number.toUpperCase()}}),params);
    if(check(response,{'order persisted':r=>r.status===200 && r.json('ok')===true}))created.add(1);
  }else if(flow==='catalog'){
    response=http.post(origin+'/rest/v1/rpc/catalog_page',JSON.stringify({
      category:null,term:'',locale:'uz',min_price:null,max_price:null,discounted:false,
      new_only:false,in_stock:false,sort_key:'popular',page_start:0,page_size:8,
    }),params);
    check(response,{'catalog page returned':r=>r.status===200 && Array.isArray(r.json('rows')) && r.json('rows').length<=8});
  }else{
    // Cart is browser-local. This lane models reloading its product data.
    const query=
      'select=id,price,sale_price,stock&id=eq.'+encodeURIComponent(user.order.items[0].productId);
    response=http.get(origin+'/rest/v1/products?'+query,params);
    check(response,{'product data returned':r=>r.status===200 && Array.isArray(r.json()) && r.json().length>0});
  }
  sleep(3+Math.random()*9);
}
