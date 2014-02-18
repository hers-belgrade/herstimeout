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
var __samplecount = 30
var __idle = new Array(__samplecount);
var __busy = new Array(__samplecount);
for(var i = 0; i<__samplecount; i++){
  __idle[i] = 0;
  __busy[i] = 0;
}
var __timecursor = 0;
function recordtimes(i,b){
  __idle[__timecursor]=i;
  __busy[__timecursor]=b;
  __timecursor++;
  if(__timecursor>=__samplecount){
    __timecursor=0;
  }
}
function fire(){
  var __n = __now;
  __now = (new Date()).getTime();
  var __i = __now-__n;
  __n = __now;
  if(__processing){
    return;
  }
  __processing = true;
  var cursor = 0;
  //console.log('start',cbs.length);
  while(cursor<cbs.length){
    var cb = cbs[cursor];
    if(cb[0]<__now){
      if(clears[cb[3]]){
        delete clears[cb[3]];
      }else{
        cb[1].apply(null,cb[2]);
      }
      cbs.splice(cursor,1);
    }else{
      cursor++;
    }
  }
  //console.log('finally',cbs.length);
  recordtimes(__i,(new Date()).getTime()-__n);
  __processing = false;
}
setInterval(fire,100);
function utilization(){
  var _i = 0, _b = 0;
  for(var i = 0; i<__samplecount; i++){
    _i += __idle[i];
    _b += __busy[i];
  }
  return (~~(100*_b/_i));
}

module.exports = {
  set:callIn,
  clear:clear,
  utilization:utilization
};
