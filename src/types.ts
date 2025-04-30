import { TranslatableNodePredicate } from './TranslationDispatcher';

export interface Config {
	isTranslatableNode?: TranslatableNodePredicate;
	lazyTranslate?: boolean;
}
export type TranslatorInterface = (text: string, priority: number) => Promise<string>;
