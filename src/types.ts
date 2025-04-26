export interface Config {
	isTranslatableNode?: TranslatableNodePredicate;
	lazyTranslate?: boolean;
}
export type TranslatorInterface = (text: string, priority: number) => Promise<string>;
export type TranslatableNodePredicate = (node: Node) => boolean;
