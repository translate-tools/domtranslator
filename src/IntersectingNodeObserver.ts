/**
 * Observes DOM nodes and calls a callback when they intersect with the viewport
 */
export class IntersectingNodeObserver {
	// Store the nodes that is under observing for intersection
	private readonly nodesObservedForIntersection = new WeakSet<Node>();
	private readonly intersectionObserver: IntersectionObserver;

	private readonly onIntersected;

	constructor({
		onIntersected,
		config,
	}: {
		onIntersected: (node: Node) => void;
		config?: {
			intersectionConfig?: IntersectionObserverInit;
		};
	}) {
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
	 * Starts observing the node for intersection.
	 * After the callback is called, the node will be removed from observation.
	 */
	public attach(node: Element) {
		if (this.nodesObservedForIntersection.has(node)) return;
		this.nodesObservedForIntersection.add(node);
		this.intersectionObserver.observe(node);
	}

	/**
	 * Stop observing a node.
	 */
	public detach(node: Element) {
		this.nodesObservedForIntersection.delete(node);
		this.intersectionObserver.unobserve(node);
	}

	private handlerIntersectNode(node: Node) {
		// Translate child text nodes and attributes of target node
		// WARNING: we shall not touch inner nodes, because its may still not intersected
		node.childNodes.forEach((node) => {
			if (node instanceof Element) return;
			this.onIntersected(node);
		});
	}
}
