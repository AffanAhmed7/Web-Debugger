import { record } from 'rrweb';

export class SessionRecorder {
  private events: any[] = [];
  private stopFn: (() => void) | null = null;
  private isRecording: boolean = false;

  public start() {
    if (this.isRecording) return;
    this.events = [];
    this.isRecording = true;
    
    this.stopFn = record({
      emit: (event) => {
        this.events.push(event);
      },
    }) || null;
    
    console.log('⏺️ Session recording started');
  }

  public stop() {
    if (!this.isRecording) return;
    if (this.stopFn) this.stopFn();
    this.isRecording = false;
    console.log(`⏹️ Session recording stopped. Total events: ${this.events.length}`);
    return this.events;
  }

  public getEvents() {
    return this.events;
  }
}
