export class Annotator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isDrawing: boolean = false;
  private container: HTMLElement;

  constructor(parent: ShadowRoot | HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'annotator-container hidden';
    
    this.canvas = document.createElement('canvas');
    this.refreshCanvasSize();
    this.ctx = this.canvas.getContext('2d')!;
    
    this.container.appendChild(this.canvas);
    parent.appendChild(this.container);

    this.attachListeners();
    window.addEventListener('resize', () => this.refreshCanvasSize());
  }

  private refreshCanvasSize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
  }

  public show(imageDataUrl: string) {
    const img = new Image();
    img.onload = () => {
      this.ctx.drawImage(img, 0, 0);
      this.container.classList.remove('hidden');
    };
    img.src = imageDataUrl;
  }

  private attachListeners() {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDrawing = true;
      this.ctx.beginPath();
      this.ctx.moveTo(e.clientX, e.clientY);
      this.ctx.strokeStyle = '#ff0000';
      this.ctx.lineWidth = 4;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.isDrawing) return;
      this.ctx.lineTo(e.clientX, e.clientY);
      this.ctx.stroke();
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isDrawing = false;
    });
  }

  public hide() {
    this.container.classList.add('hidden');
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
