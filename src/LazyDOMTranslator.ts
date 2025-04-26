import { TranslatableNodePredicate } from '.';

type IntersectionConfig = {
	root: null | Element;
	rootMargin: string;
	threshold: number;
};

type LazyTranslatorConfig = {
	isTranslatableNode: TranslatableNodePredicate;
	translator: (node: Node) => void;
	intersectionConfig?: Partial<IntersectionConfig>;
};

/**
 * Translates nodes only if they intersect the viewport
 */

export class LazyDOMTranslator {
	private readonly nodesObservedForIntersection = new WeakSet<Node>();
	private intersectionObserver: IntersectionObserver;

	private readonly config: LazyTranslatorConfig;

	constructor(config: LazyTranslatorConfig) {
		this.config = {
			...config,
			intersectionConfig: {
				root: null,
				rootMargin: '0px',
				threshold: 0,
			},
		};

		this.intersectionObserver = new IntersectionObserver((entries, observer) => {
			entries.forEach((entry) => {
				const node = entry.target;

				if (!this.nodesObservedForIntersection.has(node) || !entry.isIntersecting)
					return;

				this.nodesObservedForIntersection.delete(node);
				observer.unobserve(node);

				this.handlerIntersectNode(node);
			});
		}, this.config.intersectionConfig);
	}

	public attach(node: Element) {
		if (this.nodesObservedForIntersection.has(node)) return;
		this.nodesObservedForIntersection.add(node);
		this.intersectionObserver.observe(node);
	}

	public detach(node: Element) {
		this.nodesObservedForIntersection.delete(node);

		this.intersectionObserver.unobserve(node);
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
