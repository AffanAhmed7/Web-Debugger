import type { Command } from '../types';

export class CommandPalette {
  private el: HTMLDivElement;
  private input: HTMLInputElement;
  private list: HTMLDivElement;
  private commands: Command[] = [];
  private visible: boolean = false;

  constructor(parent: ShadowRoot | HTMLElement) {
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

  private selectedIndex: number = 0;

  private render() {
    const query = this.input.value.toLowerCase();
    const filtered = this.commands.filter(c => c.name.toLowerCase().includes(query));
    
    // Clamp selection
    if (this.selectedIndex >= filtered.length) this.selectedIndex = Math.max(0, filtered.length - 1);

    this.list.innerHTML = filtered.map((c, i) => `
      <div class="palette-item ${i === this.selectedIndex ? 'selected' : ''}" data-id="${c.id}" data-index="${i}">
        <span class="command-name">${c.name}</span>
        ${c.shortcut ? `<span class="command-shortcut">${c.shortcut}</span>` : ''}
      </div>
    `).join('');

    this.list.querySelectorAll('.palette-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        this.executeCommand(id);
      });
    });
  }

  private executeCommand(id: string | null) {
    if (!id) return;
    const cmd = this.commands.find(c => c.id === id);
    if (cmd) {
      cmd.action();
      this.toggle();
    }
  }

  private attachListeners() {
    this.input.addEventListener('input', () => {
      this.selectedIndex = 0;
      this.render();
    });
    
    this.el.addEventListener('keydown', (e) => {
      const query = this.input.value.toLowerCase();
      const filteredCount = this.commands.filter(c => c.name.toLowerCase().includes(query)).length;

      if (e.key === 'Escape') this.toggle();
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex + 1) % filteredCount;
        this.render();
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex - 1 + filteredCount) % filteredCount;
        this.render();
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const selected = this.list.querySelector('.palette-item.selected') as HTMLElement;
        const id = selected?.getAttribute('data-id');
        this.executeCommand(id);
      }
    });

    // Close on click outside
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.toggle();
    });
  }
}
