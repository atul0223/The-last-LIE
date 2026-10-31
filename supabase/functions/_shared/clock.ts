import type { Clock } from './types.js';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class MockClock implements Clock {
  private currentTime: Date;

  constructor(initialTime: Date | string = new Date()) {
    this.currentTime = typeof initialTime === 'string' ? new Date(initialTime) : initialTime;
  }

  now(): Date {
    return new Date(this.currentTime.getTime());
  }

  setTime(time: Date | string): void {
    this.currentTime = typeof time === 'string' ? new Date(time) : time;
  }

  advance(ms: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + ms);
  }
}
