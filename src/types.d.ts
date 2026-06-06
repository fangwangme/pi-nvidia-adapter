declare module "@earendil-works/pi-ai" {
  export type Api = any;
  export type AssistantMessageEventStream = any;
  export type Context = any;
  export type Model<T> = any;
  export interface SimpleStreamOptions {
    reasoning?: "minimal" | "low" | "medium" | "high" | "xhigh";
    apiKey?: string;
    headers?: Record<string, string>;
    onPayload?: (payload: any, model?: any) => any;
  }
  export function streamSimpleOpenAICompletions(model: any, context: any, options?: any): any;
}

declare module "@earendil-works/pi-coding-agent" {
  export function getAgentDir(): string;
  export interface ExtensionAPI {
    registerProvider(name: string, config: any): void;
    on(event: string, handler: (event: any, ctx: any) => Promise<void>): void;
  }
}
