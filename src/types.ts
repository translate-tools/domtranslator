import { TranslatableNodePredicate } from './TranslationDispatcher';

export interface Config {
	isTranslatableNode?: TranslatableNodePredicate;
	lazyTranslate?: boolean;
}
