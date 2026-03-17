export interface LayerGroup {
  title: string;
  nodes: string[];
}

export interface Layer {
  title: string;
  nodes?: string[];
  children?: LayerGroup[];
}

export interface Diagram {
  name: string;
  layers: Layer[];
}
