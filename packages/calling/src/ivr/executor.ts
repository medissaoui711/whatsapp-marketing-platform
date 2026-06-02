import { EventEmitter } from 'events';
import type { IVRFlowGraph, IVRContext, IVRNode, IVREdge, TransferCallbacks } from '../types/ivr';
import type { AudioPlayer } from '../audio-player';

export class IVRExecutor extends EventEmitter {
  private graph: IVRFlowGraph;
  private context: IVRContext;
  private nodeMap: Map<string, IVRNode> = new Map();
  private edgeMap: Map<string, IVREdge[]> = new Map();
  private dtmfBuffer: string[] = [];
  private isRunning = true;

  constructor(graph: IVRFlowGraph, initialContext: IVRContext) {
    super();
    this.graph = graph;
    this.context = initialContext;
    this.buildMaps();
  }

  private buildMaps(): void {
    for (const node of this.graph.nodes) {
      this.nodeMap.set(node.id, node);
    }
    for (const edge of this.graph.edges) {
      if (!this.edgeMap.has(edge.from)) {
        this.edgeMap.set(edge.from, []);
      }
      this.edgeMap.get(edge.from)!.push(edge);
    }
  }

  private getNode(nodeId: string): IVRNode | undefined {
    return this.nodeMap.get(nodeId);
  }

  private resolveEdge(nodeId: string, outcome: string): string | undefined {
    const edges = this.edgeMap.get(nodeId) || [];
    for (const edge of edges) {
      if (edge.condition === outcome || edge.condition === '*') {
        return edge.to;
      }
    }
    return undefined;
  }

  private getConfigInt(config: Record<string, unknown>, key: string, defaultValue: number): number {
    const value = config[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseInt(value, 10) || defaultValue;
    return defaultValue;
  }

  public async execute(player: AudioPlayer): Promise<void> {
    while (this.isRunning) {
      const node = this.getNode(this.context.currentNode);
      if (!node) break;

      let outcome: string | undefined;

      switch (node.type) {
        case 'greeting':
          outcome = await this.executeGreeting(node, player);
          break;
        case 'menu':
          outcome = await this.executeMenu(node, player);
          break;
        case 'gather':
          outcome = await this.executeGather(node, player);
          break;
        case 'http_callback':
          outcome = await this.executeHTTPCallback(node);
          break;
        case 'transfer':
          outcome = await this.executeTransfer(node);
          break;
        case 'goto_flow':
          outcome = await this.executeGotoFlow(node);
          break;
        case 'timing':
          outcome = this.executeTiming(node);
          break;
        case 'hangup':
          await this.executeHangup(node, player);
          return;
        default:
          return;
      }

      const step: Record<string, string> = {
        node: node.id,
        type: node.type,
        label: node.label,
      };
      if (outcome) step.outcome = outcome;
      this.context.path.push(step);

      const nextId = this.resolveEdge(node.id, outcome || 'default');
      if (!nextId) break;
      this.context.currentNode = nextId;
    }

    this.emit('complete', this.context.path);
  }

  private async executeGreeting(node: IVRNode, player: AudioPlayer): Promise<string> {
    const audioFile = node.config.audio_file as string | undefined;
    const interruptible = node.config.interruptible === true;

    if (audioFile) {
      if (interruptible) {
        await this.playInterruptible(player, audioFile);
      } else {
        await player.playFile(audioFile);
      }
    }

    return 'default';
  }

  private async executeMenu(node: IVRNode, player: AudioPlayer): Promise<string> {
    const audioFile = node.config.audio_file as string | undefined;
    const timeoutSecs = this.getConfigInt(node.config, 'timeout_seconds', 10);
    const maxRetries = this.getConfigInt(node.config, 'max_retries', 3);
    const options = (node.config.options || {}) as Record<string, unknown>;

    const validDigits = new Set(Object.keys(options));

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      this.drainDTMF();

      let digit: string | undefined;

      if (audioFile) {
        const playPromise = player.playFile(audioFile);
        const timeoutPromise = this.waitForDTMF(timeoutSecs * 1000);

        const result = await Promise.race([playPromise, timeoutPromise]);
        if (typeof result === 'string') {
          digit = result;
          player.stop();
        }
      } else {
        digit = await this.waitForDTMF(timeoutSecs * 1000);
      }

      if (!digit) continue;

      if (validDigits.size === 0 || validDigits.has(digit)) {
        this.context.variables[`menu_${node.id}`] = digit;
        this.context.variables.last_menu_digit = digit;
        return `digit:${digit}`;
      }
    }

    return 'max_retries';
  }

  private async executeGather(node: IVRNode, player: AudioPlayer): Promise<string> {
    const audioFile = node.config.audio_file as string | undefined;
    const maxDigits = this.getConfigInt(node.config, 'max_digits', 10);
    const terminator = (node.config.terminator as string) || '#';
    const timeoutSecs = this.getConfigInt(node.config, 'timeout_seconds', 10);
    const maxRetries = this.getConfigInt(node.config, 'max_retries', 3);
    const storeAs = node.config.store_as as string | undefined;

    this.drainDTMF();

    if (audioFile) {
      await player.playFile(audioFile);
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const collected = await this.collectDigits(maxDigits, terminator, timeoutSecs * 1000);
      if (collected.length) {
        if (storeAs) {
          this.context.variables[storeAs] = collected;
        }
        return 'default';
      }
    }

    return 'max_retries';
  }

  private async executeHTTPCallback(node: IVRNode): Promise<string> {
    const url = node.config.url as string;
    const method = (node.config.method as string) || 'GET';
    const timeoutSecs = this.getConfigInt(node.config, 'timeout_seconds', 10);
    const responseStoreAs = node.config.response_store_as as string | undefined;

    const headers: Record<string, string> = {};
    const rawHeaders = (node.config.headers || {}) as Record<string, string>;
    for (const [key, value] of Object.entries(rawHeaders)) {
      headers[key] = this.interpolate(String(value));
    }

    const interpolatedUrl = this.interpolate(url);
    const body = this.interpolate((node.config.body_template as string) || '');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutSecs * 1000);

    try {
      const response = await fetch(interpolatedUrl, {
        method,
        headers,
        body: body || undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseBody = await response.text();

      if (responseStoreAs) {
        this.context.variables[responseStoreAs] = responseBody;
      }

      return response.ok ? 'http:2xx' : 'http:non2xx';
    } catch {
      clearTimeout(timeoutId);
      return 'http:non2xx';
    }
  }

  private async executeTransfer(node: IVRNode): Promise<string> {
    const teamId = node.config.team_id as string | undefined;

    const callbacks: TransferCallbacks = {
      onSuccess: node.config.on_success as string | undefined,
      onNoAnswer: node.config.on_no_answer as string | undefined,
      onAbandoned: node.config.on_abandoned as string | undefined,
    };

    this.emit('transfer', { teamId, callbacks, context: this.context });

    return new Promise((resolve) => {
      this.once('transfer_complete', (outcome: string) => {
        resolve(outcome);
      });
    });
  }

  private async executeGotoFlow(node: IVRNode): Promise<string> {
    const flowId = node.config.flow_id as string | undefined;
    this.emit('goto_flow', { flowId, context: this.context });
    return 'goto_flow';
  }

  private executeTiming(node: IVRNode): string {
    const now = new Date();
    const dayName = this.getDayName(now);
    const schedule = (node.config.schedule || []) as Array<{
      day?: string;
      enabled?: boolean;
      start_time?: string;
      end_time?: string;
    }>;

    for (const entry of schedule) {
      if (entry.day?.toLowerCase() !== dayName) continue;
      if (!entry.enabled) return 'out_of_hours';

      const [startHour, startMin] = (entry.start_time || '00:00').split(':').map(Number);
      const [endHour, endMin] = (entry.end_time || '23:59').split(':').map(Number);

      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (nowMinutes >= startMinutes && nowMinutes < endMinutes) {
        return 'in_hours';
      }
      return 'out_of_hours';
    }

    return 'out_of_hours';
  }

  private async executeHangup(node: IVRNode, player: AudioPlayer): Promise<void> {
    const audioFile = node.config.audio_file as string | undefined;
    if (audioFile) {
      await player.playFile(audioFile);
    }
    this.emit('hangup');
    this.stop();
  }

  private async playInterruptible(player: AudioPlayer, audioFile: string): Promise<void> {
    const playPromise = player.playFile(audioFile);
    const digitPromise = this.waitForDTMF(0);

    const result = await Promise.race([playPromise, digitPromise]);
    if (typeof result === 'string') {
      player.stop();
    }
  }

  private waitForDTMF(timeoutMs: number): Promise<string | undefined> {
    return new Promise((resolve) => {
      if (this.dtmfBuffer.length > 0) {
        resolve(this.dtmfBuffer.shift());
        return;
      }

      const timeout = timeoutMs > 0
        ? setTimeout(() => resolve(undefined), timeoutMs)
        : null;

      this.once('dtmf', (digit: string) => {
        if (timeout) clearTimeout(timeout);
        resolve(digit);
      });
    });
  }

  private collectDigits(maxDigits: number, terminator: string, timeoutMs: number): Promise<string> {
    return new Promise((resolve) => {
      let digits: string[] = [];
      const timeout = setTimeout(() => resolve(digits.join('')), timeoutMs);

      const handler = (digit: string) => {
        if (digit === terminator) {
          clearTimeout(timeout);
          this.off('dtmf', handler);
          resolve(digits.join(''));
        } else {
          digits.push(digit);
          if (digits.length >= maxDigits) {
            clearTimeout(timeout);
            this.off('dtmf', handler);
            resolve(digits.join(''));
          }
        }
      };

      this.on('dtmf', handler);
    });
  }

  private drainDTMF(): void {
    this.dtmfBuffer = [];
  }

  private interpolate(template: string): string {
    let result = template;
    for (const [key, value] of Object.entries(this.context.variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    result = result.replace(/\{\{caller_phone\}\}/g, this.context.callerPhone);
    result = result.replace(/\{\{call_id\}\}/g, this.context.callId);
    return result;
  }

  private getDayName(date: Date): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  public pushDTMF(digit: string): void {
    this.emit('dtmf', digit);
  }

  public stop(): void {
    this.isRunning = false;
  }
}


