import crypto from 'crypto';

export function eventKey(o: {artist?:string; tour?:string; place?:string; date?:string; performance?:string}){
  const key = [o.artist||'', o.tour||'', o.place||'', o.date||'', o.performance||''].join('|').toLowerCase();
  return key;
}
export function checksum(key: string){
  return crypto.createHash('sha1').update(key).digest('hex').slice(0,12);
}