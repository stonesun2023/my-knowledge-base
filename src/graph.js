/**
 * 超级大脑 - 知识图谱可视化模块
 * 技术：D3.js v7 力导向图（Force-directed graph）
 * 风格：类 Obsidian，节点聚类 + AI相似度连线
 */

const GraphModule = (() => {

  // ============================================================
  // 1. 配置常量
  // ============================================================
  const CONFIG = {
    // 标签颜色映射（与主界面保持一致）
    TAG_COLORS: {
      '编程': '#4f86f7',
      '设计': '#f7a14f',
      'AI':   '#a855f7',
      '学习': '#22c55e',
      '工作': '#ef4444',
      '工具': '#06b6d4',
      '其他': '#94a3b8',
      '__tag_hub__': '#1e293b', // 标签枢纽节点
    },
    // 相似度阈值：低于此值不绘制连线
    SIMILARITY_THRESHOLD: 0.25,
    // 节点半径
    NODE_RADIUS: { link: 8, tag: 18 },
    // 力导向参数
    FORCE: {
      charge:      -120,
      linkDistance: 50,
      collide:      18,
    },
  };

  // ============================================================
  // 2. 相似度计算（无需API，纯本地TF-IDF近似）
  // ============================================================
  function tokenize(text) {
    // 中英文简单分词：按标点/空格切分 + 2-gram 字符
    const clean = (text || '').toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9]/g, ' ');
    const words = clean.split(/\s+/).filter(w => w.length > 1);
    const bigrams = [];
    for (let i = 0; i < clean.replace(/\s/g,'').length - 1; i++) {
      bigrams.push(clean.replace(/\s/g,'').slice(i, i+2));
    }
    return [...new Set([...words, ...bigrams])];
  }

  function buildTfIdf(links) {
    const docs = links.map(l => tokenize(`${l.title} ${l.url} ${l.note || ''} ${l.tag || ''}`));
    const df = {};
    docs.forEach(tokens => {
      [...new Set(tokens)].forEach(t => { df[t] = (df[t] || 0) + 1; });
    });
    const N = docs.length;
    return docs.map(tokens => {
      const tf = {};
      tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
      const vec = {};
      Object.keys(tf).forEach(t => {
        vec[t] = (tf[t] / tokens.length) * Math.log((N + 1) / ((df[t] || 0) + 1));
      });
      return vec;
    });
  }

  function cosineSim(a, b) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let dot = 0, normA = 0, normB = 0;
    keys.forEach(k => {
      const va = a[k] || 0, vb = b[k] || 0;
      dot += va * vb; normA += va * va; normB += vb * vb;
    });
    return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
  }

  function computeSimilarities(links) {
    const vecs = buildTfIdf(links);
    const edges = [];
    for (let i = 0; i < links.length; i++) {
      for (let j = i + 1; j < links.length; j++) {
        const sim = cosineSim(vecs[i], vecs[j]);
        if (sim >= CONFIG.SIMILARITY_THRESHOLD) {
          edges.push({ source: links[i].id, target: links[j].id, weight: sim });
        }
      }
    }
    return edges;
  }

  // ============================================================
  // 3. 构建图数据
  // ============================================================
  function buildGraphData(links) {
    const nodes = [];
    const edgeMap = new Map();

    // 3a. 链接节点
    links.forEach(link => {
      nodes.push({
        id:    link.id,
        label: link.title || link.url,
        url:   link.url,
        tag:   link.tag || '其他',
        type:  'link',
        date:  link.date,
      });
    });

    // 3b. 标签枢纽节点（去重）
    const tags = [...new Set(links.map(l => l.tag || '其他'))];
    tags.forEach(tag => {
      nodes.push({
        id:    `__tag__${tag}`,
        label: tag,
        tag:   tag,
        type:  'tag',
      });
    });

    // 3c. 链接 → 标签枢纽边
    links.forEach(link => {
      const tag = link.tag || '其他';
      const key = `${link.id}--__tag__${tag}`;
      edgeMap.set(key, { source: link.id, target: `__tag__${tag}`, weight: 0.5, type: 'tag' });
    });

    // 3d. AI相似度边
    const simEdges = computeSimilarities(links);
    simEdges.forEach(e => {
      const key = `${e.source}--${e.target}`;
      if (!edgeMap.has(key)) {
        edgeMap.set(key, { ...e, type: 'similarity' });
      }
    });

    return { nodes, edges: [...edgeMap.values()] };
  }

  // ============================================================
  // 4. 渲染图谱
  // ============================================================
  function render(containerId, links) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (!links || links.length === 0) {
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#94a3b8;">
          <div style="font-size:48px;margin-bottom:16px;">🗺️</div>
          <div style="font-size:16px;">暂无数据，先去收藏一些链接吧！</div>
        </div>`;
      return;
    }

    const W = container.clientWidth  || 900;
    const H = container.clientHeight || 600;

    // 加载 D3（如果未加载）
    if (!window.d3) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js';
      script.onload = () => _draw(containerId, links, W, H);
      document.head.appendChild(script);
    } else {
      _draw(containerId, links, W, H);
    }
  }

  function _draw(containerId, links, W, H) {
    const d3 = window.d3;
    const container = document.getElementById(containerId);
    const { nodes, edges } = buildGraphData(links);

    // SVG 画布
    const svg = d3.select(`#${containerId}`)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', [0, 0, W, H])
      .style('background', '#0f172a')
      .style('border-radius', '12px');

    // 缩放支持
    const g = svg.append('g');
    svg.call(d3.zoom()
      .scaleExtent([0.2, 4])
      .on('zoom', e => g.attr('transform', e.transform))
    );

    // 箭头/渐变定义
    const defs = svg.append('defs');
    // 发光滤镜
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // 力导向仿真
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges)
        .id(d => d.id)
        .distance(d => d.type === 'tag' ? 60 : CONFIG.FORCE.linkDistance)
        .strength(d => d.type === 'tag' ? 0.8 : d.weight * 0.5)
      )
      .force('charge', d3.forceManyBody().strength(CONFIG.FORCE.charge))
      .force('center', d3.forceCenter(W / 2, H / 2).strength(0.3))
      .force('x', d3.forceX(W / 2).strength(0.08))
      .force('y', d3.forceY(H / 2).strength(0.08))
      .force('collide', d3.forceCollide(CONFIG.FORCE.collide));

    // 连线
    const link = g.append('g').selectAll('line')
      .data(edges)
      .join('line')
      .attr('stroke', d => d.type === 'tag' ? '#334155' : '#4f86f766')
      .attr('stroke-width', d => d.type === 'tag' ? 1 : Math.max(1, d.weight * 4))
      .attr('stroke-dasharray', d => d.type === 'similarity' ? '4,3' : 'none')
      .attr('opacity', 0.6);

    // 节点组
    const node = g.append('g').selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end',   (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    // 节点圆圈
    node.append('circle')
      .attr('r', d => d.type === 'tag' ? CONFIG.NODE_RADIUS.tag : CONFIG.NODE_RADIUS.link)
      .attr('fill', d => CONFIG.TAG_COLORS[d.tag] || '#94a3b8')
      .attr('opacity', d => d.type === 'tag' ? 1 : 0.85)
      .attr('stroke', '#fff')
      .attr('stroke-width', d => d.type === 'tag' ? 2 : 1)
      .attr('filter', d => d.type === 'tag' ? 'url(#glow)' : 'none');

    // 标签节点图标
    node.filter(d => d.type === 'tag')
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '12px')
      .attr('fill', '#fff')
      .text(d => d.label);

    // 链接节点文字（hover显示）
    node.filter(d => d.type === 'link')
      .append('text')
      .attr('x', 11)
      .attr('y', 4)
      .attr('font-size', '12px')
      .attr('fill', '#f1f5f9')
      .attr('pointer-events', 'none')
      .text(d => d.label.length > 20 ? d.label.slice(0, 20) + '…' : d.label);

    // Tooltip
    const tooltip = d3.select(`#${containerId}`)
      .append('div')
      .style('position', 'absolute')
      .style('background', '#0f172a')
      .style('border', '1px solid #334155')
      .style('border-radius', '8px')
      .style('padding', '10px 14px')
      .style('font-size', '13px')
      .style('color', '#e2e8f0')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('max-width', '260px')
      .style('z-index', '100')
      .style('box-shadow', '0 4px 20px rgba(0,0,0,0.4)');

    node.on('mouseenter', (e, d) => {
        if (d.type === 'link') {
          tooltip.html(`
            <div style="font-weight:600;margin-bottom:4px;">${d.label}</div>
            <div style="color:#94a3b8;font-size:11px;word-break:break-all;">${d.url}</div>
            <div style="margin-top:6px;">
              <span style="background:${CONFIG.TAG_COLORS[d.tag]||'#94a3b8'};padding:2px 8px;border-radius:999px;font-size:11px;">${d.tag}</span>
            </div>
          `).style('opacity', 1);
        } else {
          const count = links.filter(l => (l.tag || '其他') === d.tag).length;
          tooltip.html(`<span style="font-weight:600;"># ${d.label}</span> &nbsp;<span style="color:#94a3b8">${count} 个链接</span>`)
            .style('opacity', 1);
        }
      })
      .on('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        tooltip.style('left', (e.clientX - rect.left + 12) + 'px')
               .style('top',  (e.clientY - rect.top  - 10) + 'px');
      })
      .on('mouseleave', () => tooltip.style('opacity', 0))
      .on('click', (e, d) => {
        if (d.type === 'link' && d.url) window.open(d.url, '_blank');
      });

    // 高亮关联节点
    node.on('mouseenter.highlight', (e, d) => {
      const connectedIds = new Set([d.id]);
      edges.forEach(edge => {
        const s = typeof edge.source === 'object' ? edge.source.id : edge.source;
        const t = typeof edge.target === 'object' ? edge.target.id : edge.target;
        if (s === d.id) connectedIds.add(t);
        if (t === d.id) connectedIds.add(s);
      });
      node.attr('opacity', n => connectedIds.has(n.id) ? 1 : 0.15);
      link.attr('opacity', l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return (s === d.id || t === d.id) ? 1 : 0.05;
      });
    }).on('mouseleave.highlight', () => {
      node.attr('opacity', 1);
      link.attr('opacity', 0.6);
    });

    // 物理仿真 tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // 控制栏（图例 + 操作提示）
    _renderControls(containerId, links);
  }

  function _renderControls(containerId, links) {
    const container = document.getElementById(containerId);
    const tags = [...new Set(links.map(l => l.tag || '其他'))];

    const bar = document.createElement('div');
    bar.style.cssText = `
      position:absolute;top:12px;left:12px;
      display:flex;flex-wrap:wrap;gap:6px;
      pointer-events:none;
    `;
    tags.forEach(tag => {
      const chip = document.createElement('span');
      chip.style.cssText = `
        background:${CONFIG.TAG_COLORS[tag] || '#94a3b8'}33;
        border:1px solid ${CONFIG.TAG_COLORS[tag] || '#94a3b8'}66;
        color:${CONFIG.TAG_COLORS[tag] || '#94a3b8'};
        padding:3px 10px;border-radius:999px;font-size:12px;
        display:inline-flex;align-items:center;gap:4px;
      `;
      const count = links.filter(l => (l.tag||'其他') === tag).length;
      chip.textContent = `${tag} ${count}`;
      bar.appendChild(chip);
    });

    const hint = document.createElement('div');
    hint.style.cssText = `
      position:absolute;bottom:12px;right:14px;
      font-size:11px;color:#475569;
      pointer-events:none;
    `;
    hint.textContent = '拖拽节点 · 滚轮缩放 · 点击打开链接 · 悬停高亮关联';

    container.style.position = 'relative';
    container.appendChild(bar);
    container.appendChild(hint);
  }

  // ============================================================
  // 5. 公开 API
  // ============================================================
  return {
    /**
     * 初始化并渲染图谱
     * @param {string} containerId  - 容器元素的 id
     * @param {Array}  links        - 链接数组（来自 localStorage）
     */
    render,

    /**
     * 重新渲染（数据更新后调用）
     */
    refresh(containerId, links) {
      render(containerId, links);
    },
  };

})();

// 挂载到全局
window.GraphModule = GraphModule;
