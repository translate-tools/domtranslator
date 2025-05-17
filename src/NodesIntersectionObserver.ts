import { isIntersectableNode } from './utils/isIntersectableNode';

/**
 * @returns Returns the node owner element.
 */
export function getElementOwnedNode(node: Node) {
	return node instanceof Attr ? node.ownerElement : node.parentElement;
}

/**
 * Observes DOM nodes for intersection with the viewport and triggers callbacks when they become visible.
 */
export class NodesIntersectionObserver {
	private readonly intersectionObserver: IntersectionObserver;

	// Store the nodes and his parent element that is under observing for intersection
	private readonly nodesObservedForIntersection = new WeakMap<
		Element,
		{ node: Node; callback: (node: Node) => void }[]
	>();

	constructor(intersectionConfig?: IntersectionObserverInit) {
		this.intersectionObserver = new IntersectionObserver((entries, observer) => {
			entries.forEach((entry) => {
				const node = entry.target;

				// Skip nodes that are not under observation or still is not intersected
				if (!this.nodesObservedForIntersection.has(node) || !entry.isIntersecting)
					return;

				this.triggerChildTextNodes(node);

				// Process the element once and forget it
				// This makes it possible to observe the element again later if needed
				this.nodesObservedForIntersection.delete(node);
				observer.unobserve(node);
			});
		}, intersectionConfig);
	}

	/**
	 * Starts observing the node for intersection.
	 * When the element that owns the node intersects the viewport, the callback is invoked.
	 * Then the owner element and all its tracked nodes are automatically removed from observation.
	 */
	public observe(node: Node, callback: (node: Node) => void) {
		const ownerElement = getElementOwnedNode(node);

		// if node have not parent (virtual node) or not intersecteble calls callback immediately
		if (!ownerElement || !isIntersectableNode(ownerElement)) {
			callback(node);
			return;
		}

		// add observableNode if not exist
		const observedNodes = this.nodesObservedForIntersection.get(ownerElement);
		const entry = { node, callback };
		if (observedNodes) {
			observedNodes?.push(entry);
		} else {
			this.nodesObservedForIntersection.set(ownerElement, [entry]);
		}

		// start observe element for intersection
		this.intersectionObserver.observe(ownerElement);
	}

	/**
	 * Stops observing the node. It is removes from observation.
	 */
	public unobserve(node: Node) {
		const ownerElement = getElementOwnedNode(node);
		if (!ownerElement) return;

		const observedNodes = this.nodesObservedForIntersection.get(ownerElement);

		const filtered = observedNodes?.filter((entry) => entry.node !== node);

		if (filtered && filtered?.length > 0) {
			this.nodesObservedForIntersection.set(ownerElement, filtered);
		} else {
			this.nodesObservedForIntersection.delete(ownerElement);
			this.intersectionObserver.unobserve(ownerElement);
		}
	}

	/**
	 * Calls callback for child text nodes and attributes of target element
	 */
	private triggerChildTextNodes(node: Element) {
		// WARNING: we shall not touch inner nodes, because its may still not intersected
		const intersectedNode = this.nodesObservedForIntersection.get(node);
		intersectedNode?.forEach(({ node, callback }) => {
			callback(node);
		});
	}
}
