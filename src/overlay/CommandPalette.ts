import type { Command } from '../types';

export class CommandPalette {
  private el: HTMLDivElement;
  private input: HTMLInputElement;
  private list: HTMLDivElement;
  private commands: Command[] = [];
  private visible: boolean = false;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'command-palette hidden';
    
    this.el.innerHTML = `
      <div class="palette-container">
        <input type="text" placeholder="Type a command..." class="palette-input" />
        <div class="palette-list"></div>
      </div>
    `;

    this.input = this.el.querySelector('.palette-input')!;
    this.list = this.el.querySelector('.palette-list')!;
    
    parent.appendChild(this.el);
    this.attachListeners();
  }

  public registerCommands(cmds: Command[]) {
    this.commands = [...this.commands, ...cmds];
  }

  public toggle() {
    this.visible = !this.visible;
    this.el.classList.toggle('hidden', !this.visible);
    if (this.visible) {
      this.input.value = '';
      this.input.focus();
      this.render();
    }
  }

  private render() {
    const query = this.input.value.toLowerCase();
    const filtered = this.commands.filter(c => c.name.toLowerCase().includes(query));
    
    this.list.innerHTML = filtered.map(c => `
      <div class="palette-item" data-id="${c.id}">
        <span class="command-name">${c.name}</span>
        ${c.shortcut ? `<span class="command-shortcut">${c.shortcut}</span>` : ''}
      </div>
    `).join('');

    this.list.querySelectorAll('.palette-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        const cmd = this.commands.find(c => c.id === id);
        if (cmd) {
          cmd.action();
          this.toggle();
        }
      });
    });
  }

  private attachListeners() {
    this.input.addEventListener('input', () => this.render());
    
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.toggle();
      if (e.key === 'Enter') {
        const first = this.list.querySelector('.palette-item') as HTMLElement;
        first?.click();
      }
    });

    // Close on click outside
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.toggle();
    });
  }
}
