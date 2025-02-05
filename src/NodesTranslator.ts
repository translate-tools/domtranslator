import { DomTranslationProcessor } from './DomTranslationProcessor';
import { LazyTranslator } from './LazyTranslator';
import { XMutationObserver } from './lib/XMutationObserver';
import { configureTranslatableNodePredicate } from './utils/nodes';

/**
 * Check visibility of element in viewport
 */
export function isInViewport(element: Element, threshold = 0) {
	const { top, left, bottom, right, height, width } = element.getBoundingClientRect();
	const overflows = {
		top,
		left,
		bottom: (window.innerHeight || document.documentElement.clientHeight) - bottom,
		right: (window.innerWidth || document.documentElement.clientWidth) - right,
	};

	if (overflows.top + height * threshold < 0) return false;
	if (overflows.bottom + height * threshold < 0) return false;

	if (overflows.left + width * threshold < 0) return false;
	if (overflows.right + width * threshold < 0) return false;

	return true;
}

export interface InnerConfig {
	isTranslatableNode: (node: Node) => boolean;
	lazyTranslate: boolean;
}

export interface Config {
	isTranslatableNode?: (node: Node) => boolean;
	lazyTranslate?: boolean;
}

export type TranslatorInterface = (text: string, priority: number) => Promise<string>;

// TODO: consider local language definitions (and implement `from`, `to` parameters for translator to specify default or locale languages)
// TODO: scan nodes lazy - defer scan to `requestIdleCallback` instead of instant scan
// TODO: describe nodes life cycle

/**
 * Module for dynamic translate a DOM nodes
 */
export class NodesTranslator {
	private readonly config: InnerConfig;
	private domTranslationProcessor: DomTranslationProcessor;

	constructor(translateCallback: TranslatorInterface, config?: Config) {
		this.config = {
			...config,
			isTranslatableNode:
				config?.isTranslatableNode ?? configureTranslatableNodePredicate(),
			lazyTranslate:
				config?.lazyTranslate !== undefined ? config?.lazyTranslate : true,
		};

		this.domTranslationProcessor = new DomTranslationProcessor(
			this.config,
			new LazyTranslator((node: Node) => {
				this.domTranslationProcessor.handleNode(node);
			}, this.config),
			translateCallback,
		);
	}

	private readonly observedNodesStorage = new Map<Element, XMutationObserver>();
	public observe(node: Element) {
		if (this.observedNodesStorage.has(node)) {
			throw new Error('Node already under observe');
		}

		// Observe node and childs changes
		const observer = new XMutationObserver();
		this.observedNodesStorage.set(node, observer);

		observer.addHandler('elementAdded', ({ target }) =>
			this.domTranslationProcessor.addNode(target),
		);
		observer.addHandler('elementRemoved', ({ target }) =>
			this.domTranslationProcessor.deleteNode(target),
		);
		observer.addHandler('characterData', ({ target }) => {
			this.domTranslationProcessor.updateNode(target);
		});
		observer.addHandler('changeAttribute', ({ target, attributeName }) => {
			if (attributeName === undefined || attributeName === null) return;
			if (!(target instanceof Element)) return;

			const attribute = target.attributes.getNamedItem(attributeName);

			if (attribute === null) return;

			// NOTE: If need delete untracked nodes, we should keep relates like Element -> attributes
			if (!this.domTranslationProcessor.isNodeStorageHas(attribute)) {
				this.domTranslationProcessor.addNode(attribute);
			} else {
				this.domTranslationProcessor.updateNode(attribute);
			}
		});

		observer.observe(node);
		this.domTranslationProcessor.addNode(node);
	}

	public unobserve(node: Element) {
		if (!this.observedNodesStorage.has(node)) {
			throw new Error('Node is not under observe');
		}

		this.domTranslationProcessor.deleteNode(node);
		this.observedNodesStorage.get(node)?.disconnect();
		this.observedNodesStorage.delete(node);
	}

	public getNodeData(node: Node) {
		return this.domTranslationProcessor.getNodeData(node);
	}
}
