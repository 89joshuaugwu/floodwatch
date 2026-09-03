export type Severity="normal"|"watch"|"warning"|"danger";
export interface Thresholds {watchCm:number;warningCm:number;dangerCm:number;riseRateThresholdCmPerHour:number}
export interface Reading {waterLevel:number;rainfall:number;timestamp?:{toMillis():number}}
export interface Station {id:string;name:string;riverName:string;location:{lat:number;lng:number};thresholds:Thresholds;currentLevel?:number;rainfall?:number;updatedAt?:string;severity?:Severity}
export interface FloodAlert {id:string;stationId:string;stationName?:string;severity:Exclude<Severity,"normal">;cause:"threshold"|"rising_trend";triggeredAt?:string;resolvedAt?:string|null;acknowledgedBy?:string|null}
