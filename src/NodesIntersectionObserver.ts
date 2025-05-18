import { isIntersectableNode } from './utils/isIntersectableNode';

/**
 * @returns Returns the node owner element.
 */
export function getElementOfNode(node: Node) {
	return node instanceof Attr ? node.ownerElement : node.parentElement;
}

type Callback = (node: Node) => void;

/**
 * Observes DOM nodes for intersection with the viewport and triggers callbacks when they become visible.
 * WARNING: This class works with nodes (Text, Attr, etc.), not directly with elements.
 */
export class NodesIntersectionObserver {
	private readonly intersectionObserver: IntersectionObserver;
	private readonly nodeCallbacksMap = new WeakMap<Node, Callback>();

	// Stores nodes and their owner element that are being observed for intersection
	private readonly elementNodesMap = new WeakMap<Element, Set<Node>>();

	constructor(intersectionConfig?: IntersectionObserverInit) {
		this.intersectionObserver = new IntersectionObserver((entries, observer) => {
			entries.forEach((entry) => {
				const node = entry.target;

				// Skip nodes that are not under observation or still is not intersected
				if (!this.elementNodesMap.has(node) || !entry.isIntersecting) return;

				this.triggerNestedNodes(node);

				// Process the element once and stop observing it
				// This allows re-observing the element later if needed
				this.elementNodesMap.delete(node);
				this.nodeCallbacksMap.delete(node);
				observer.unobserve(node);
			});
		}, intersectionConfig);
	}

	/**
	 * Starts observing the node for intersection.
	 * When the element that owns the node intersects the viewport, the callback is invoked.
	 * Then the owner element and all its tracked nodes are automatically removed from observation.
	 */
	public observe(node: Node, callback: Callback) {
		const ownerElement = getElementOfNode(node);

		// Immediately invoke the callback if the node has no owner or is not intersectable
		if (!ownerElement || !isIntersectableNode(ownerElement)) {
			callback(node);
			return;
		}

		// set the callback for the node
		this.nodeCallbacksMap.set(node, callback);

		// add ownerElement if it doesn't exist in the map
		const observedNodes = this.elementNodesMap.get(ownerElement);
		if (!observedNodes) {
			this.elementNodesMap.set(ownerElement, new Set<Node>().add(node));
			this.intersectionObserver.observe(ownerElement);
			return;
		}

		// add the node to the set of observed nodes
		observedNodes.add(node);
	}

	/**
	 * Stops observing the node. It is removes from observation.
	 */
	public unobserve(node: Node) {
		const ownerElement = getElementOfNode(node);
		if (!ownerElement) return;
		const observedNodes = this.elementNodesMap.get(ownerElement);
		if (!observedNodes || !observedNodes.has(node)) return;

		// delete only the specified node
		observedNodes.delete(node);
		this.nodeCallbacksMap.delete(node);

		// if no more nodes are tracked under this ownerElement, stop observing it
		if (observedNodes.size === 0) {
			this.elementNodesMap.delete(ownerElement);
			this.intersectionObserver.unobserve(ownerElement);
		}
	}

	/**
	 * Calls callbacks for all observed nodes associated with the specified element
	 */
	private triggerNestedNodes(node: Element) {
		const ownedNodes = this.elementNodesMap.get(node);
		ownedNodes?.forEach((node) => {
			const callback = this.nodeCallbacksMap.get(node);
			if (callback) callback(node);
		});
	}
}
