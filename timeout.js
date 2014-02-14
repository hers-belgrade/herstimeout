var cbs = [];
var __cnt = 0;
function inc(){
  __cnt ++;
  if(__cnt>1000000000){
    __cnt = 1;
  }
  return __cnt;
}
var __now = (new Date()).getTime();
function callIn(cb,timeout){
  var cnt = inc();
  cbs.push([__now+timeout,cb,Array.prototype.slice.call(arguments,2),cnt]);
  return cnt;
};
var clears = {};
function clear(cnt){
  clears[cnt] = 1;
};
var __processing = false;
function fire(){
  __now = (new Date()).getTime();
  if(__processing){
    return;
  }
  __processing = true;
  var fordel = [];
  //console.log('start',cbs.length);
  for(var i in cbs){
    var cb = cbs[i];
    if(cb[0]<__now){
      fordel.push(i);
      if(clears[cb[3]]){
        delete clears[cb[3]];
      }else{
        cb[1].apply(null,cb[2]);
      }
    }
  }
  //console.log('end',cbs.length,fordel.length);
  while(fordel.length){
    cbs.splice(fordel.pop(),1);
  }
  //console.log('finally',cbs.length);
  __processing = false;
}
setInterval(fire,100);

module.exports = {
  set:callIn,
  clear:clear
};
