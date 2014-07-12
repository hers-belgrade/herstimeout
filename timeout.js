var os = require('os');
var cbs = [];
var immediates = [];
var __cnt = 0;


var postpone = process.version.match(/^v\d+\.(\d+)/)[1]>=10 ? function(cb){
  setImmediate(cb);
}:function(cb){
  process.nextTick(cb);
}

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
var __lastMetrics = 0;
var __metrics = {};

function resetMetrics(){
  var ms = __metricsstart, et = __exectime, _d = __delay.avg(), qi = __qin, qo = __qout, le = __longestexec, lef = __longestexecfn;
  __metricsstart = now();
  __metrics = {nexttriggerin:__firsttrigger-__metricsstart,utilization:~~(100*et/(__metricsstart-ms)),delay:_d,queue:{in:qi,out:qo,current:cbs.length},longest:{time:le,fn:lef}};
  __exectime = 0;
  __qin = 0;
  __qout = 0;
  __delay.reset();
  if(__longestexec>300){
    console.log(__longestexec,__longestexecfn);
  }
  __longestexec = 0;
  __longestexecfn = '';
  __lastMetrics = __now;
}

function execute(fn,paramarry){
  var _s = now(),m;
  switch(typeof fn){
    case 'function':
      fn.apply({now:_s},paramarry);
      break;
    case 'object':
      if(!fn){return;}
      m = paramarry.shift();
      fn[m].apply(fn,paramarry);
      break;
  }
  var _elaps = now()-_s;
  /* good for performance monitoring - log the long runners
  if(_elaps>100){
    console.log(_elaps,typeof fn==='function' ? fn.toString() : m);
  }
  */
  if(_elaps>__longestexec){
    __longestexec = _elaps;
    __longestexecfn = typeof fn==='function' ? fn.toString() : m;
  }
}

function fire(){
  var n = now();
  /*
  if(n-__now>100){
    console.log('gc time',n-__now);
  }
  */
  __now = n;
  if(__processing){
    postpone(fire);
    return;
  }
  var _start = now();
  if(global.gc){
    if(os.freemem()/1024/1024<300){
      global.gc();
    }
  }
  __processing = true;
  while(immediates.length){
    var i = immediates.shift();
    execute(i[0],i[1]);
  }
  if(__now<__firsttrigger){
    __exectime += (now()-_start);
    __processing = false;
    postpone(fire);
    return;
  }
  //console.log('start',cbs.length);
  var cbl = cbs.length; //snapshot of cbs at start, we may never end otherwise
  while(true){
    var delay = 0;
    var cursor = -1;
    for(var i=0; i<cbl; i++){
      var _t = cbs[i][0];
      var _d = __now-_t;
      if(_t===__firsttrigger){
        __firsttrigger = Infinity;
      }
      if(_d>delay){
        delay=_d;
        cursor = i;
      }else if(!isFinite(__firsttrigger)){
        __firsttrigger = _t;
      }else if(_t<__firsttrigger){
        __firsttrigger = _t;
      }
    }
    if(!delay){
      break;
    }
    __delay.add(delay);
    var cb = cbs[cursor];
    if(clears[cb[3]]){
      delete clears[cb[3]];
    }else{
      execute(cb[1],cb[2]);
    }
    cbs.splice(cursor,1);
    cbl--;
    __qout++;
  }
  if(__firsttrigger<__now){
    console.log(__firsttrigger-__now,'?!');
  }
  //console.log(cbs.length,cursor);
  //console.log('finally',cbs.length);
  __processing = false;
  __now = now();
  __exectime += (__now-_start);
  if(__now>__lastMetrics+10000){
    resetMetrics();
  }
  postpone(fire);
}
postpone(fire);
function metrics(){
  return __metrics;
}

module.exports = {
  now:now,
  next:next,
  set:callIn,
  clear:clear,
  metrics:metrics
};
