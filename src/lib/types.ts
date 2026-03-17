export interface LayerGroup {
  title: string;
  children: string[];
}

export interface Layer {
  title: string;
  children: Array<string | LayerGroup>;
}

export interface Diagram {
  name: string;
  layers: Layer[];
}
