var cbs = [];
var immediates = [];
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
var __qin = 0;
var __firsttrigger = Infinity;
function next(cb){
  immediates.push([cb,Array.prototype.slice.call(arguments,1)]);
};
function callIn(cb,timeout){
  if(typeof timeout !== 'number'){
    console.trace();
    console.log('timeout',timeout,'is not a number');
    process.exit(0);
  }
  var cnt = inc();
  __qin ++;
  var trigger = __now+timeout;
  if(trigger<__firsttrigger){
    __firsttrigger=trigger;
  }
  cbs.push([trigger,cb,Array.prototype.slice.call(arguments,2),cnt]);
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
var __qout = 0;
var __dolog = false;
var __longestexec = 0;
var __longestexecfn = '';

__delay.reset();

function execute(fn,paramarry){
  var _s = now();
  fn.apply(null,paramarry);
  var _elaps = now()-_s;
  if(_elaps>__longestexec){
    __longestexec = _elaps;
    __longestexecfn = fn.toString();
  }
}

function fire(){
  __now = now();
  if(__processing){
    process.nextTick(fire);
    return;
  }
  var _start = now();
  __processing = true;
  while(immediates.length){
    var i = immediates.shift();
    execute(i[0],i[1]);
  }
  __processing = false;
  if(__now<__firsttrigger){
    __exectime += (now()-_start);
    process.nextTick(fire);
    return;
  }
  var cursor = 0;
  __firsttrigger = Infinity;
  //console.log('start',cbs.length);
  while(cursor<cbs.length){
    var cb = cbs[cursor];
    var trigger = cb[0];
    var d = __now-trigger;
    if(d>=0){
      /*
      if(d>1000){
        console.log('!#%#',d);
      }
      */
      __delay.add(d);
      if(clears[cb[3]]){
        delete clears[cb[3]];
      }else{
        execute(cb[1],cb[2]);
      }
      cbs.splice(cursor,1);
      __qout++;
    }else{
      if(trigger<__firsttrigger){
        __firsttrigger = trigger;
      }
      cursor++;
    }
  }
  if(__firsttrigger<__now){
    console.log(__firsttrigger-__now,'?!');
  }
  //console.log(cbs.length,cursor);
  //console.log('finally',cbs.length);
  __processing = false;
  __exectime += (now()-_start);
  process.nextTick(fire);
}
process.nextTick(fire);
function metrics(){
  var ms = __metricsstart, et = __exectime, _d = __delay.avg(), qi = __qin, qo = __qout, le = __longestexec, lef = __longestexecfn;
  __metricsstart = now();
  __exectime = 0;
  __qin = 0;
  __qout = 0;
  __delay.reset();
  __longestexec = 0;
  __longestexecfn = '';
  return {nexttriggerin:__firsttrigger-__metricsstart,utilization:~~(100*et/(__metricsstart-ms)),delay:_d,queue:{in:qi,out:qo,current:cbs.length},longest:{time:le,fn:lef}};
}

module.exports = {
  now:now,
  next:next,
  set:callIn,
  clear:clear,
  metrics:metrics
};
