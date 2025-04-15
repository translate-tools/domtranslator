import { TranslatableNodePredicate } from '.';

type IntersectionConfig = {
	root?: null | Element;
	rootMargin?: string;
	threshold?: number;
};

type LazyTranslatorConfig = {
	isTranslatableNode: TranslatableNodePredicate;
	translator: (node: Node) => void;
	intersectionConfig?: IntersectionConfig;
};

/**
 * Translates nodes only if they intersect the viewport
 */

export class LazyTranslator {
	private readonly intersectStorage = new WeakSet<Node>();
	private intersectionObserver: IntersectionObserver;

	private readonly config: LazyTranslatorConfig;

	constructor(config: LazyTranslatorConfig) {
		this.config = config;

		this.intersectionObserver = new IntersectionObserver((entries, observer) => {
			entries.forEach((entry) => {
				const node = entry.target;

				if (!this.intersectStorage.has(node) || !entry.isIntersecting) return;

				this.intersectStorage.delete(node);
				observer.unobserve(node);

				this.handlerIntersectNode(node);
			});
		}, this.config.intersectionConfig);
	}

	public stopObserving(node: Element) {
		this.intersectStorage.delete(node);

		this.intersectionObserver.unobserve(node);
	}

	public startObserving(node: Element) {
		if (this.intersectStorage.has(node)) return;
		this.intersectStorage.add(node);
		this.intersectionObserver.observe(node);
	}

	private handlerIntersectNode(node: Node) {
		// Translate child text nodes and attributes of target node
		// WARNING: we shall not touch inner nodes, because its may still not intersected
		node.childNodes.forEach((node) => {
			if (node instanceof Element || !this.config.isTranslatableNode(node)) {
				return;
			}
			this.config.translator(node);
		});
	}
}
