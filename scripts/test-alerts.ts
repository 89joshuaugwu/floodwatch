import assert from "node:assert/strict";
type T={watchCm:number;warningCm:number;dangerCm:number;riseRateThresholdCmPerHour:number}; const t:T={watchCm:35,warningCm:45,dangerCm:50,riseRateThresholdCmPerHour:8};
const severity=(n:number)=>n>=t.dangerCm?"danger":n>=t.warningCm?"warning":n>=t.watchCm?"watch":"normal";
const fast=(start:number,end:number,hours:number)=>hours>0&&(end-start)/hours>=t.riseRateThresholdCmPerHour;
assert.equal(severity(20),"normal");assert.equal(severity(35),"watch");assert.equal(severity(45),"warning");assert.equal(severity(50),"danger");
assert.equal(fast(20,23,1),false);assert.equal(fast(20,30,1),true);assert.equal(fast(30,30,1),false);assert.equal(fast(25,41,2),true);console.log("✓ threshold tiers, slow rise, fast rise, and flat level verified");
