import { TranslatableNodePredicate } from './TranslationDispatcher';

/**
 * Observes DOM elements and calls a callback for filtered child nodes when they intersect the viewport.
 */
export class IntersectionObserverWithFilter {
	// Store the nodes that is under observing for intersection
	private readonly nodesObservedForIntersection = new WeakSet<Node>();
	private readonly intersectionObserver: IntersectionObserver;

	private readonly filter;
	private readonly onIntersected;

	constructor({
		filter,
		onIntersected,
		config,
	}: {
		filter: TranslatableNodePredicate;
		onIntersected: (node: Node) => void;
		config?: {
			intersectionConfig?: IntersectionObserverInit;
		};
	}) {
		this.filter = filter;
		this.onIntersected = onIntersected;

		this.intersectionObserver = new IntersectionObserver((entries, observer) => {
			entries.forEach((entry) => {
				const node = entry.target;

				// Skip nodes that are not under observation or still is not intersected
				if (!this.nodesObservedForIntersection.has(node) || !entry.isIntersecting)
					return;

				// Process the node once and forget it
				// This makes it possible to observe the node again later if needed
				this.nodesObservedForIntersection.delete(node);
				observer.unobserve(node);
				this.handlerIntersectNode(node);
			});
		}, config?.intersectionConfig);
	}

	/**
	 * Starts observing the element for intersection.
	 * When the element intersects the viewport, the `onIntersected` callback is invoked,
	 * and the element is automatically removed from observation.
	 */
	public attach(node: Element) {
		if (this.nodesObservedForIntersection.has(node)) return;
		this.nodesObservedForIntersection.add(node);
		this.intersectionObserver.observe(node);
	}

	/**
	 * Stops observing the element. It is removes from observation.
	 */
	public detach(node: Element) {
		this.nodesObservedForIntersection.delete(node);
		this.intersectionObserver.unobserve(node);
	}

	/**
	 * The element may contain nodes that are should not to translate.
	 * These should be filtered before calls onIntersected.
	 */
	private handlerIntersectNode(node: Element) {
		// Translate child text nodes and attributes of target node
		// WARNING: we shall not touch inner nodes, because its may still not intersected
		node.childNodes.forEach((node) => {
			if (node instanceof Element || !this.filter(node)) return;
			this.onIntersected(node);
		});
	}
}
