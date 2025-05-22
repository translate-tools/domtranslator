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
 * WARNING: This class works with nodes (Text, Attr, etc.), not directly with Element nodes.
 */
export class NodesIntersectionObserver {
	private readonly intersectionObserver: IntersectionObserver;

	// Stores nodes and their owner element that are being observed for intersection
	private readonly elementNodesMap = new WeakMap<Element, Set<Node>>();
	private readonly nodeCallbacksMap = new WeakMap<Node, Callback>();

	constructor(intersectionConfig?: IntersectionObserverInit) {
		this.intersectionObserver = new IntersectionObserver((entries, observer) => {
			entries.forEach((entry) => {
				const node = entry.target;

				// Skip nodes that are not under observation or still is not intersected
				if (!this.elementNodesMap.has(node) || !entry.isIntersecting) return;

				this.triggerNestedNodes(node);

				// Process the element once and stop observing it
				this.elementNodesMap.delete(node);
				observer.unobserve(node);
			});
		}, intersectionConfig);
	}

	/**
	 * Starts observing the node for intersection.
	 * When the owner element of the node intersects the viewport, the callback is invoked.
	 * Then the owner element and all its tracked nodes are automatically removed from observation.
	 */
	public observe(node: Node, callback: Callback) {
		const ownerElement = getElementOfNode(node);

		// Immediately invoke the callback if the node has no owner or is not intersectable
		if (!ownerElement || !isIntersectableNode(ownerElement)) {
			callback(node);
			return;
		}

		this.nodeCallbacksMap.set(node, callback);

		const observedNodes = this.elementNodesMap.get(ownerElement);
		if (observedNodes) {
			observedNodes.add(node);
		} else {
			this.elementNodesMap.set(ownerElement, new Set<Node>([node]));
			this.intersectionObserver.observe(ownerElement);
		}
	}

	/**
	 *  Stops observing the node and removes it from observation
	 */
	public unobserve(node: Node) {
		const ownerElement = getElementOfNode(node);
		if (!ownerElement) return;
		const observedNodes = this.elementNodesMap.get(ownerElement);
		if (!observedNodes || !observedNodes.has(node)) return;

		// remove only the specified node
		observedNodes.delete(node);
		this.nodeCallbacksMap.delete(node);

		// if no more nodes are tracked under this ownerElement, stop observing it
		if (observedNodes.size === 0) {
			this.elementNodesMap.delete(ownerElement);
			this.intersectionObserver.unobserve(ownerElement);
		}
	}

	/**
	 * Calls callbacks for all nodes associated with the specified element and removes their callbacks from storage
	 */
	private triggerNestedNodes(node: Element) {
		const ownedNodes = this.elementNodesMap.get(node);
		if (ownedNodes) {
			ownedNodes.forEach((node) => {
				const callback = this.nodeCallbacksMap.get(node);
				if (callback) callback(node);

				this.nodeCallbacksMap.delete(node);
			});
		}
	}
}
