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
  return (new Date()).getTime();
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
function WindowedAverage(length){
  if(!length){return;}
  this.samples = new Array(length);
  for(var i=0; i<length; i++){
    this.samples[i] = 0;
  }
  this.cursor = 0;
}
WindowedAverage.prototype.add = function(sample){
  this.samples[this.cursor] = sample;
  this.cursor++;
  if(this.cursor>=this.samples.length){
    this.cursor=0;
  }
};
WindowedAverage.prototype.sum = function(){
  var ret = 0;
  for(var i = 0; i<this.samples.length; i++){
    ret+=this.samples[i];
  }
  return ret;
};
WindowedAverage.prototype.avg = function(){
  return this.sum()/this.samples.length;
}


var __processing = false;
var __delay = new WindowedAverage(100);
var __timecursor = 0;
var __metricsstart = now();
var __exectime = 0;
var __interval = 100;
var __intervalhandle = setInterval(fire,__interval);
function fire(){
  __now = now();
  if(__processing){
    return;
  }
  var _start = now();
  __processing = true;
  var cursor = 0;
  //console.log('start',cbs.length);
  while(cursor<cbs.length){
    var cb = cbs[cursor];
    if(cb[0]<__now){
      __delay.add(__now-cb[0]);
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
}
function metrics(){
  var ms = __metricsstart, et = __exectime, _d = __delay.avg()/__interval, _i = __interval, _newinterval = _i;
  __metricsstart = now();
  __exectime = 0;
  if(_d<2){
    _newinterval = ~~(__interval*.8);
  }
  if(_d>2){
    _newinterval = ~~(__interval/.8);
  }
  if(_newinterval>200){
    _newinterval=200;
  }
  if(_newinterval!=_i){
    __interval = _newinterval;
    clearInterval(__intervalhandle);
    __intervalhandle = setInterval(fire,__interval);
  }
  return {utilization:~~(100*et/(__metricsstart-ms)),delay:_d,interval:_i};
}

module.exports = {
  set:callIn,
  clear:clear,
  metrics:metrics
};
