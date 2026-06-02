export interface IVRNode {
  id: string;
  type: 'greeting' | 'menu' | 'gather' | 'http_callback' | 'transfer' | 'goto_flow' | 'timing' | 'hangup';
  label: string;
  config: Record<string, unknown>;
}

export interface IVREdge {
  from: string;
  to: string;
  condition: string;
}

export interface IVRFlowGraph {
  version: number;
  entryNode: string;
  nodes: IVRNode[];
  edges: IVREdge[];
}

export interface IVRContext {
  variables: Record<string, string>;
  callerPhone: string;
  callId: string;
  currentNode: string;
  path: Array<Record<string, string>>;
}

export interface TransferCallbacks {
  onSuccess?: string;
  onNoAnswer?: string;
  onAbandoned?: string;
}


