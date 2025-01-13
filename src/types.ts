export type TranslatorInterface = (text: string, priority: number) => Promise<string>;

export interface InnerConfig {
	isTranslatableNode: (node: Node) => boolean;
	lazyTranslate: boolean;
}

export interface Config {
	isTranslatableNode?: (node: Node) => boolean;
	lazyTranslate?: boolean;
}
