import { isIntersectableNode } from './utils/isIntersectableNode';

/**
 * @returns Returns the node owner element.
 */
export function getElementOwnedNode(node: Node) {
	return node instanceof Attr ? node.ownerElement : node.parentElement;
}

type Callback = (node: Node) => void;

/**
 * Observes DOM nodes for intersection with the viewport and triggers callbacks when they become visible.
 */
export class NodesIntersectionObserver {
	private readonly intersectionObserver: IntersectionObserver;

	private readonly nodeCallbacksMap = new WeakMap<Node, Callback>();
	// Stores the nodes and his owner element that is under observing for intersection
	private readonly elementNodesMap = new WeakMap<Element, Set<Node>>();

	constructor(intersectionConfig?: IntersectionObserverInit) {
		this.intersectionObserver = new IntersectionObserver((entries, observer) => {
			entries.forEach((entry) => {
				const node = entry.target;

				// Skip nodes that are not under observation or still is not intersected
				if (!this.elementNodesMap.has(node) || !entry.isIntersecting) return;

				this.triggerNestedNodes(node);

				// Process the element once and forget it
				// This makes it possible to observe the element again later if needed
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
		const ownerElement = getElementOwnedNode(node);

		// immediately invoke callback if node has no owner or is not intersectable
		if (!ownerElement || !isIntersectableNode(ownerElement)) {
			callback(node);
			return;
		}

		// add node to set only if not exist yet
		const observedNodes = this.elementNodesMap.get(ownerElement);
		if (observedNodes) {
			// set callback for node
			this.nodeCallbacksMap.set(node, callback);

			const isNodeExist = observedNodes.has(node);
			if (!isNodeExist) {
				observedNodes.add(node);
			}
			return;
		}

		this.elementNodesMap.set(ownerElement, new Set<Node>().add(node));
		this.nodeCallbacksMap.set(node, callback);
		this.intersectionObserver.observe(ownerElement);
	}

	/**
	 * Stops observing the node. It is removes from observation.
	 */
	public unobserve(node: Node) {
		const ownerElement = getElementOwnedNode(node);
		if (!ownerElement) return;
		const observedNodes = this.elementNodesMap.get(ownerElement);
		if (!observedNodes) return;

		if (observedNodes.size === 0) {
			// if no more nodes are tracked under this ownerElement, stop observing the ownerElement
			this.elementNodesMap.delete(ownerElement);
			this.nodeCallbacksMap.delete(node);
			this.intersectionObserver.unobserve(ownerElement);
		} else {
			if (observedNodes.has(node)) {
				// delete only the received node
				observedNodes.delete(node);
				this.nodeCallbacksMap.delete(node);
				return;
			}
		}
	}

	/**
	 * Calls callbacks for all observed nodes associated with the specified element
	 */
	private triggerNestedNodes(node: Element) {
		const intersectedNodes = this.elementNodesMap.get(node);
		intersectedNodes?.forEach((node) => {
			const callback = this.nodeCallbacksMap.get(node);
			if (callback) callback(node);
		});
	}
}
