import { logger } from './config';
import { MindMapMain } from './mind-map-main';

export class LayoutProvider {
    opts;
    jm;
    isside;
    bounds = null;
    cache_valid = false;

    constructor(jm, options) {
        this.opts = options;
        this.jm = jm;
        this.isside = (this.opts.mode == 'side');
    }

    init() {
        logger.debug('layout.init');
    }

    reset() {
        logger.debug('layout.reset');
        this.bounds = { n: 0, s: 0, w: 0, e: 0 };
    }

    layout() {
        logger.debug('layout.layout');
        this.layout_direction();
        this.layout_offset();
    }

    layout_direction() {
        this._layout_direction_root();
    }

    _layout_direction_root() {
        const node = this.jm.mind.root;
        // logger.debug(node);
        let layout_data = null;
        if ('layout' in node._data) {
            layout_data = node._data.layout;
        } else {
            layout_data = {};
            node._data.layout = layout_data;
        }
        const children = node.children;
        const children_count = children.length;
        layout_data.direction = MindMapMain.direction.center;
        layout_data.side_index = 0;
        if (this.isside) {
            let i = children_count;
            while (i--) {
                this._layout_direction_side(children[i], MindMapMain.direction.right, i);
            }
        } else {
            let i = children_count;
            let subnode = null;
            while (i--) {
                subnode = children[i];
                if (subnode.direction == MindMapMain.direction.left) {
                    this._layout_direction_side(subnode, MindMapMain.direction.left, i);
                } else {
                    this._layout_direction_side(subnode, MindMapMain.direction.right, i);
                }
            }
            /*
             var boundary = Math.ceil(children_count/2);
             var i = children_count;
             while(i--){
             if(i>=boundary){
             this._layout_direction_side(children[i],jm.direction.left, children_count-i-1);
             }else{
             this._layout_direction_side(children[i],jm.direction.right, i);
             }
             }*/

        }
    }

    _layout_direction_side(node, direction, side_index) {
        let layout_data = null;
        if ('layout' in node._data) {
            layout_data = node._data.layout;
        } else {
            layout_data = {};
            node._data.layout = layout_data;
        }
        let children = node.children;
        const children_count = children.length;

        layout_data.direction = direction;
        layout_data.side_index = side_index;
        let i = children_count;
        while (i--) {
            this._layout_direction_side(children[i], direction, i);
        }
    }

    layout_offset() {
        const node = this.jm.mind.root;
        const layout_data = node._data.layout;
        layout_data.offset_x = 0;
        layout_data.offset_y = 0;
        layout_data.outer_height = 0;
        const children = node.children;
        let i = children.length;
        let left_nodes = [];
        let right_nodes = [];
        let subnode = null;
        while (i--) {
            subnode = children[i];
            if (subnode._data.layout.direction == MindMapMain.direction.right) {
                right_nodes.unshift(subnode);
            } else {
                left_nodes.unshift(subnode);
            }
        }
        layout_data.left_nodes = left_nodes;
        layout_data.right_nodes = right_nodes;
        layout_data.outer_height_left = this._layout_offset_subnodes(left_nodes);
        layout_data.outer_height_right = this._layout_offset_subnodes(right_nodes);
        this.bounds.e = node._data.view.width / 2;
        this.bounds.w = 0 - this.bounds.e;
        //logger.debug(this.bounds.w);
        this.bounds.n = 0;
        this.bounds.s = Math.max(layout_data.outer_height_left, layout_data.outer_height_right);
    }

    // layout both the x and y axis
    _layout_offset_subnodes(nodes) {
        let total_height = 0;
        const nodes_count = nodes.length;
        let i = nodes_count;
        let node = null;
        let node_outer_height = 0;
        let layout_data = null;
        let base_y = 0;
        let pd = null; // parent._data
        while (i--) {
            node = nodes[i];
            layout_data = node._data.layout;
            if (pd == null) {
                pd = node.parent._data;
            }

            node_outer_height = this._layout_offset_subnodes(node.children);
            if (!node.expanded) {
                node_outer_height = 0;
                this.set_visible(node.children, false);
            }
            node_outer_height = Math.max(node._data.view.height, node_outer_height);

            layout_data.outer_height = node_outer_height;
            layout_data.offset_y = base_y - node_outer_height / 2;
            layout_data.offset_x
                = this.opts.hspace * layout_data.direction + pd.view.width * (pd.layout.direction + layout_data.direction) / 2;
            if (!node.parent.isroot) {
                layout_data.offset_x += this.opts.pspace * layout_data.direction;
            }

            base_y = base_y - node_outer_height - this.opts.vspace;
            total_height += node_outer_height;
        }
        if (nodes_count > 1) {
            total_height += this.opts.vspace * (nodes_count - 1);
        }
        i = nodes_count;
        let middle_height = total_height / 2;
        while (i--) {
            node = nodes[i];
            node._data.layout.offset_y += middle_height;
        }
        return total_height;
    }

    // layout the y axis only, for collapse/expand a node
    _layout_offset_subnodes_height(nodes) {
        let total_height = 0;
        const nodes_count = nodes.length;
        let i = nodes_count;
        let node = null;
        let node_outer_height = 0;
        let layout_data = null;
        let base_y = 0;
        let pd = null; // parent._data
        while (i--) {
            node = nodes[i];
            layout_data = node._data.layout;
            if (pd == null) {
                pd = node.parent._data;
            }

            node_outer_height = this._layout_offset_subnodes_height(node.children);
            if (!node.expanded) {
                node_outer_height = 0;
            }
            node_outer_height = Math.max(node._data.view.height, node_outer_height);

            layout_data.outer_height = node_outer_height;
            layout_data.offset_y = base_y - node_outer_height / 2;
            base_y = base_y - node_outer_height - this.opts.vspace;
            total_height += node_outer_height;
        }
        if (nodes_count > 1) {
            total_height += this.opts.vspace * (nodes_count - 1);
        }
        i = nodes_count;
        const middle_height = total_height / 2;
        while (i--) {
            node = nodes[i];
            node._data.layout.offset_y += middle_height;
            //logger.debug(node.topic);
            //logger.debug(node._data.layout.offset_y);
        }
        return total_height;
    }

    get_node_offset(node) {
        const layout_data = node._data.layout;
        let offset_cache = null;
        if (('_offset_' in layout_data) && this.cache_valid) {
            offset_cache = layout_data._offset_;
        } else {
            offset_cache = { x: -1, y: -1 };
            layout_data._offset_ = offset_cache;
        }
        if (offset_cache.x == -1 || offset_cache.y == -1) {
            let x = layout_data.offset_x;
            let y = layout_data.offset_y;
            if (!node.isroot) {
                const offset_p = this.get_node_offset(node.parent);
                x += offset_p.x;
                y += offset_p.y;
            }
            offset_cache.x = x;
            offset_cache.y = y;
        }
        return offset_cache;
    }

    get_node_point(node) {
        const view_data = node._data.view;
        const offset_p = this.get_node_offset(node);
        //logger.debug(offset_p);
        let p = { x: 0, y: 0 };
        p.x = offset_p.x + view_data.width * (node._data.layout.direction - 1) / 2;
        p.y = offset_p.y - view_data.height / 2;
        //logger.debug(p);
        return p;
    }

    get_node_point_in(node) {
        return this.get_node_offset(node);
    }

    get_node_point_out(node) {
        const layout_data = node._data.layout;
        let pout_cache = null;
        if (('_pout_' in layout_data) && this.cache_valid) {
            pout_cache = layout_data._pout_;
        } else {
            pout_cache = { x: -1, y: -1 };
            layout_data._pout_ = pout_cache;
        }
        if (pout_cache.x == -1 || pout_cache.y == -1) {
            if (node.isroot) {
                pout_cache.x = 0;
                pout_cache.y = 0;
            } else {
                const view_data = node._data.view;
                const offset_p = this.get_node_offset(node);
                pout_cache.x = offset_p.x + (view_data.width + this.opts.pspace) * node._data.layout.direction;
                pout_cache.y = offset_p.y;
                //logger.debug('pout');
                //logger.debug(pout_cache);
            }
        }
        return pout_cache;
    }

    get_expander_point(node) {
        const p = this.get_node_point_out(node);
        const ex_p = { x: 0, y: 0 };
        if (node._data.layout.direction == MindMapMain.direction.right) {
            ex_p.x = p.x - this.opts.pspace;
        } else {
            ex_p.x = p.x;
        }
        ex_p.y = p.y - Math.ceil(this.opts.pspace / 2);
        return ex_p;
    }

    get_min_size() {
        const nodes = this.jm.mind.nodes;
        let node = null;
        let pout = null;
        for (let nodeid in nodes) {
            node = nodes[nodeid];
            pout = this.get_node_point_out(node);
            //logger.debug(pout.x);
            if (pout.x > this.bounds.e) {this.bounds.e = pout.x;}
            if (pout.x < this.bounds.w) {this.bounds.w = pout.x;}
        }
        return {
            w: this.bounds.e - this.bounds.w,
            h: this.bounds.s - this.bounds.n
        }
    }

    toggle_node(node) {
        if (node.isroot) {
            return;
        }
        if (node.expanded) {
            this.collapse_node(node);
        } else {
            this.expand_node(node);
        }
    }

    expand_node(node) {
        node.expanded = true;
        this.part_layout(node);
        this.set_visible(node.children, true);
    }

    collapse_node(node) {
        node.expanded = false;
        this.part_layout(node);
        this.set_visible(node.children, false);
    }

    expand_all() {
        const nodes = this.jm.mind.nodes;
        let c = 0;
        let node;
        for (let nodeid in nodes) {
            node = nodes[nodeid];
            if (!node.expanded) {
                node.expanded = true;
                c++;
            }
        }
        if (c > 0) {
            const root = this.jm.mind.root;
            this.part_layout(root);
            this.set_visible(root.children, true);
        }
    }

    collapse_all() {
        const nodes = this.jm.mind.nodes;
        let c = 0;
        let node;
        for (let nodeid in nodes) {
            node = nodes[nodeid];
            if (node.expanded && !node.isroot) {
                node.expanded = false
                c++;
            }
        }
        if (c > 0) {
            const root = this.jm.mind.root;
            this.part_layout(root);
            this.set_visible(root.children, true);
        }
    }

    expand_to_depth(target_depth, curr_nodes, curr_depth) {
        if (target_depth < 1) {return;}
        const nodes = curr_nodes || this.jm.mind.root.children;
        let depth = curr_depth || 1;
        let i = nodes.length;
        let node = null;
        while (i--) {
            node = nodes[i];
            if (depth < target_depth) {
                if (!node.expanded) {
                    this.expand_node(node);
                }
                this.expand_to_depth(target_depth, node.children, depth + 1);
            }
            if (depth == target_depth) {
                if (node.expanded) {
                    this.collapse_node(node);
                }
            }
        }
    }

    part_layout(node) {
        const root = this.jm.mind.root;
        if (!!root) {
            const root_layout_data = root._data.layout;
            if (node.isroot) {
                root_layout_data.outer_height_right = this._layout_offset_subnodes_height(root_layout_data.right_nodes);
                root_layout_data.outer_height_left = this._layout_offset_subnodes_height(root_layout_data.left_nodes);
            } else {
                if (node._data.layout.direction == MindMapMain.direction.right) {
                    root_layout_data.outer_height_right
                        = this._layout_offset_subnodes_height(root_layout_data.right_nodes);
                } else {
                    root_layout_data.outer_height_left
                        = this._layout_offset_subnodes_height(root_layout_data.left_nodes);
                }
            }
            this.bounds.s = Math.max(root_layout_data.outer_height_left, root_layout_data.outer_height_right);
            this.cache_valid = false;
        } else {
            logger.warn('can not found root node');
        }
    }

    set_visible(nodes, visible) {
        let i = nodes.length;
        let node = null;
        let layout_data = null;
        while (i--) {
            node = nodes[i];
            layout_data = node._data.layout;
            if (node.expanded) {
                this.set_visible(node.children, visible);
            } else {
                this.set_visible(node.children, false);
            }
            if (!node.isroot) {
                node._data.layout.visible = visible;
            }
        }
    }

    is_expand(node) {
        return node.expanded;
    }

    is_visible(node) {
        const layout_data = node._data.layout;
        if (('visible' in layout_data) && !layout_data.visible) {
            return false;
        } else {
            return true;
        }
    }
}
