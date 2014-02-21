var cbs = [];
var __cnt = 0;
function inc(){
  __cnt ++;
  if(__cnt>1000000000){
    __cnt = 1;
  }
  return __cnt;
}
function now(){
  var hrt = process.hrtime();
  return hrt[0]*1000 + hrt[1]/1000000;
}
var __now = now();
function callIn(cb,timeout){
  var cnt = inc();
  cbs.push([__now+timeout,cb,Array.prototype.slice.call(arguments,2),cnt]);
  return cnt;
};
var clears = {};
function clear(cnt){
  clears[cnt] = 1;
};

function Sum(){
}
Sum.prototype.reset = function(){
  this.samples = 0;
  this.sum = 0;
};
Sum.prototype.add = function(element){
  this.sum+=element;
  this.samples++;
};
Sum.prototype.avg = function(){
  return this.sum/this.samples;
};

var __processing = false;
var __delay = new Sum();
var __timecursor = 0;
var __metricsstart = now();
var __exectime = 0;

__delay.reset();

function fire(){
  __now = now();
  if(__processing){
    process.nextTick(fire);
    return;
  }
  var _start = now();
  __processing = true;
  var cursor = 0;
  //console.log('start',cbs.length);
  while(cursor<cbs.length){
    var cb = cbs[cursor];
    var d = __now-cb[0];
    if(d>0){
      /*
      if(d>1000){
        console.log('!#%#',d);
      }
      */
      __delay.add(d);
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
  __processing = false;
  __exectime += (now()-_start);
  process.nextTick(fire);
}
process.nextTick(fire);
function metrics(){
  var ms = __metricsstart, et = __exectime, _d = __delay.avg();
  __metricsstart = now();
  __exectime = 0;
  __delay.reset();
  return {utilization:~~(100*et/(__metricsstart-ms)),delay:_d,queue:cbs.length};
}

module.exports = {
  now:now,
  set:callIn,
  clear:clear,
  metrics:metrics
};
