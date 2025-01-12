import { DecorateNodes } from './DecorateNodes';
import { IntersectWatcher } from './IntersectWatcher';
import { Nodes } from './NodePrimitive';
import { NodeObserver } from './observerNodesStorage';
import { configureTranslatableNodePredicate } from './utils/nodes';

type TranslatorInterface = (text: string, priority: number) => Promise<string>;

interface InnerConfig {
	isTranslatableNode: (node: Node) => boolean;
	lazyTranslate: boolean;
}

export interface Config {
	isTranslatableNode?: (node: Node) => boolean;
	lazyTranslate?: boolean;
}

// TODO: consider local language definitions (and implement `from`, `to` parameters for translator to specify default or locale languages)
// TODO: scan nodes lazy - defer scan to `requestIdleCallback` instead of instant scan
// TODO: describe nodes life cycle

/**
 * Module for dynamic translate a DOM nodes
 */
export class NodesTranslator {
	// private readonly translateCallback: TranslatorInterface;
	private readonly config: InnerConfig;

	private nodesManager: Nodes;

	public observer: NodeObserver;

	public intersectWatcher: IntersectWatcher;

	constructor(translateCallback: TranslatorInterface, config?: Config) {
		// this.translateCallback = translateCallback;
		this.config = {
			...config,
			isTranslatableNode:
				config?.isTranslatableNode ?? configureTranslatableNodePredicate(),
			lazyTranslate:
				config?.lazyTranslate !== undefined ? config?.lazyTranslate : true,
		};

		this.nodesManager = new Nodes(translateCallback, this.config);

		this.intersectWatcher = new IntersectWatcher(
			this.config.isTranslatableNode,
			this.nodesManager.handleNode,
		);

		this.observer = new NodeObserver(
			new DecorateNodes(this.intersectWatcher, this.nodesManager),
		);
	}

	public observe(node: Element) {
		this.observer.observe(node);
	}

	public unobserve(node: Element) {
		this.observer.unobserve(node);
	}

	public getNodeData(node: Node) {
		this.nodesManager.getNodeData(node);
	}
}
