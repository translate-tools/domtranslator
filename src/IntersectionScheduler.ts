import { DOMTranslationScheduler } from './types';
import { NodesIntersectionObserver } from './utils/NodesIntersectionObserver';

/**
 * Scheduler for DOM translation that trigger callbacks only for visible nodes.
 * If node is not visible, callback will be triggered once node will intersect viewport.
 */
export class IntersectionScheduler implements DOMTranslationScheduler {
	private readonly intersectionObserver;
	constructor(intersectionConfig?: IntersectionObserverInit) {
		this.intersectionObserver = new NodesIntersectionObserver(intersectionConfig);
	}

	public add(node: Node, callback: (node: Node) => void): void {
		this.intersectionObserver.observe(node, callback);
	}

	public remove(node: Node): void {
		this.intersectionObserver.unobserve(node);
	}
}
