console.log("Loaded graph.js script")

var allNodes = new Map()
var allLinks = new Map()
var nodeGraph = new Map()
var linkGraph = new Map()

let demParties = new Set(["DEM", "DNL", "DFL", "LBL", "NDP", "THD", "PRO", "PPD"])
let repParties = new Set(["REP", "CRV", "NJC"])
console.log(demParties)
console.log(repParties)
Array.prototype.binarySearch = function (target, comparator) {
    var l = 0,
        h = this.length - 1,
        m, comparison;
    comparator = comparator || function (a, b) {
        return (a < b ? -1 : (a > b ? 1 : 0)); /* default comparison method if one was not provided */
    };
    while (l <= h) {
        m = (l + h) >>> 1; /* equivalent to Math.floor((l + h) / 2) but faster */
        comparison = comparator(this[m], target);
        if (comparison < 0) {
            l = m + 1;
        } else if (comparison > 0) {
            h = m - 1;
        } else {
            return m;
        }
    }
    return~l;
};

var svg = d3.select('svg');
var width = +svg.attr('width');
var height = +svg.attr('height');

var linkScale = d3.scaleLinear().range([3,3]);
var linkColorScale = d3.scaleSequentialSqrt(d3.interpolateGreys);
var selectedNode;

let committees = new Map()
d3.dsv("|", '/data/mini_dataset/committees/cm18.txt').then(function(dataset) {
  //console.log("committee")
  //console.log(dataset)

  dataset.forEach((item, i) => {
    committees.set(item.CMTE_ID, item)
  });
  //console.log(nodeTree)
  console.log(committees)
})
let candidates = new Map()
d3.dsv("|", '/data/mini_dataset/candidates/cn18.txt').then(function(dataset) {
  //console.log("candidate")
  //console.log(dataset)

  dataset.forEach((item, i) => {
    candidates.set(item.CAND_ID, item)
  });
  console.log(candidates)
})

var linkG = svg.append('g')
    .attr('class', 'links-group');

var nodeG = svg.append('g')
    .attr('class', 'nodes-group');
var dummy1 = {
  "id": "Dummy1",
  "group": 2,
  "type": "dummy"
}
var dummy2 = {
  "id": "Dummy2",
  "group": 2,
}
var markers = svg.append('defs').append('marker')
        markers.attrs({'id':'arrowhead',
            'viewBox':'-0 -5 10 10',
            'refX':13,
            'refY':0,
            'orient':'auto',
            'markerWidth':10,
            'markerHeight':10,
            'markerUnits':"userSpaceOnUse",
            'xoverflow':'visible'})
        .append('svg:path')
        .attr('d', 'M 0,-5 L 8 ,0 L 0,5')
        .attr('fill', "#555")
        .attr('stroke-width', 5)
        .attr('opacity', 0.5)
        .style('stroke','none');


function includedNodes() {
  var relevantNodes = extractNodes(immediateLinks());
  relevantNodes.sort(function(x,y){ return x == selectedNode ? -1 : y == selectedNode ? 1 : 0; });
  //console.log("R");
  relevantNodes.unshift(dummy1)
  //relevantNodes.unshift(dummy2)
  //console.log(relevantNodes);
  return relevantNodes;
}

function includedLinks() {
  //console.log(Array.from(linkGraph).some(link => link.source === undefined || link.target === undefined))
  console.log(nodeGraph)
  var testNodes = Array.from(nodeGraph.get(selectedNode.id))
  var testLinks = immediateLinks()
  testNodes.forEach(node => {
    if (node != selectedNode) {
      testLinks = testLinks.concat(Array.from(linkGraph.get(node)))
    }
  });
  testLinks.forEach(link => {
      link.source.type = "far"
      link.target.type = "far"
      link.type = "far"
  })
  testLinks.forEach(link => {
    if (link.source === selectedNode || link.target === selectedNode) {
      link.source.type = "close"
      link.target.type = "close"
      link.type = "close"
    }
  })
  return testLinks
}

function immediateLinks() {
  //console.log(selectedNode)
  var testLinks = Array.from(linkGraph.get(selectedNode.id))
  testLinks.forEach(link => {
    link.type = "close"
    link.source.type = "close"
    link.target.type = "close"
  });
  testLinks.unshift({
    "source": dummy1,
    "target": dummy1,
    "value": 1000,
    "type": "dummy"
  })
  return testLinks
}

function extractNodes(links) {
  var exNodes = new Set();
  links.forEach(link => {
    exNodes.add(link.source)
    exNodes.add(link.target)
  })
  return Array.from(exNodes);
}
console.log(width)
console.log(height)
var simulation;

function toTitleCase(sentence) {
  return sentence.toLowerCase().split(" ").map((word) => {
      return word[0].toUpperCase() + word.substring(1);
    }).join(" ");
}

// Define the div for the tooltip
var node_tip = d3.tip()
      .attr("class", "d3-tip")
      .offset([-8, 0])
      .html(function(d) {
        if (committees.has(d.id)) {
          return toTitleCase(committees.get(d.id).CMTE_NAME);
        } else if (candidates.has(d.id)) {
          return toTitleCase(candidates.get(d.id).CAND_NAME);
        }
        console.log(candidates.get(d.id))
        console.log(committees.get(d.id))
        return "ID: " + d.id
      });
svg.call(node_tip);

// Define the div for the tooltip
var link_tip = d3.tip()
      .attr("class", "d3-tip")
      .offset([-8, 0])
      .html(function(d) {
        const formatter = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2
        })
        return formatter.format(d.value)});
svg.call(link_tip);

//TODO fix selected node at center
d3.dsv("|", '/data/mini_dataset/transactions/agg_cm_trans/cm_trans18.txt').then(function(dataset) {
    //dataset = dataset.slice(0,10)
    //console.log(dataset)

    network = {"links": [], "nodes": []}
    var k = 0
    for (i in dataset) {
      d = dataset[i]
      //console.log(d)
      if(i === "columns") {
        break;
      }
      if (d.TARGET_ID === undefined || d.SRC_ID === undefined || d.SUM === undefined || d.SUM <= 0) {
        continue;
      }
      node1 = allNodes.get(d.SRC_ID)
      if (node1 === undefined) {
        var group = 0;
        if (committees.has(d.SRC_ID)) {
          group = 1;
        } else if (candidates.has(d.SRC_ID)) {
          group = 2
        }
        node1 = {
          "id": d.SRC_ID,
          "group": group,
        }
        allNodes.set(d.SRC_ID, node1)
        network["nodes"].push(node1)
        nodeGraph.set(d.SRC_ID, new Set())
        linkGraph.set(d.SRC_ID, new Set())
      }
      node2 = allNodes.get(d.TARGET_ID)
      if (node2 === undefined) {
        var group = 0;
        if (committees.has(d.TARGET_ID)) {
          group = 1;
        } else if (candidates.has(d.TARGET_ID)) {
          group = 2
        }
        node2 = {
          "id": d.TARGET_ID,
          "group": group,
        }
        allNodes.set(d.TARGET_ID, node2)
        network["nodes"].push(node2)
        nodeGraph.set(d.TARGET_ID, new Set())
        linkGraph.set(d.TARGET_ID, new Set())
      }
      nodeGraph.get(d.SRC_ID).add(d.TARGET_ID)
      nodeGraph.get(d.TARGET_ID).add(d.SRC_ID)

      let value = d.SUM
      var link = allLinks.get(d.SRC_ID + "-" + d.TARGET_ID)
      if (link === undefined) {
        link = {
            "source": node1,
            "target": node2,
            "value": value,
        }
        allLinks.set(d.SRC_ID + "-" + d.TARGET_ID, link)
      } else {
        link.value += value;
        continue;
      }


      linkGraph.get(d.TARGET_ID).add(link)
      linkGraph.get(d.SRC_ID).add(link)
      // function equalLinks(a, b) {
      //   return a.source === b.source && a.target === b.target;
      // }
      // if (network["links"].some(l => equalLinks(l, link))) {
      //   console.log("duplicate")
      // } else {
      //   console.log("no duplicate")
      // }
      network["links"].push(link)
      //console.log("1")
    }
    console.log("done loading")
    console.log(network)
    console.log(linkGraph)

    dataset = network

    // For Testing
    selectedNode = network.nodes[50];
    selectedNode.fx = width / 2;
    selectedNode.fy = height / 2
    //selectedNode.group = 2

    simulation = d3.forceSimulation()
        .force('link', d3.forceLink().id(function(d) { return d.id; }))
        .force('charge', d3.forceManyBody().strength(function(d, i) {
          if (d.type === "dummy") {
            return 0;
          }
          return d === selectedNode ? -50 : -15;
        }))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide(25).radius(function(d, i) {
          if (d.type === "dummy") {
            return 0;
          }
          return 25;
        }))
        .force('radial', d3.forceRadial(60).strength(function(d) {
          if (d.type === "dummy") {
            return .10;
          }
          return 0.1;
        }))

    updateVisualization()
})

function updateVisualization() {
    linkScale.domain(d3.extent(immediateLinks().slice(1), function(d){ return d.value;}));
    var extent = d3.extent(immediateLinks().slice(1), function(d){ return parseFloat(d.value);});
    console.log(immediateLinks())
    console.log(extent)
    extent[0] = 0;
    console.log(extent)

    linkColorScale.domain(extent);

    var links = linkG.selectAll('.link')
      .data(immediateLinks(), function(d){
            return d.id;
        })

    var nodes = nodeG.selectAll('.node')
        .data(includedNodes(), function(d){
            return d;
        })

    //links.filter(function (d, i) { return i === 0;}).remove()

    // nodes.enter()
    // .append('defs')
    // .append('pattern')
    // .attrs({
    //   "x": "0",
    //   "y": "0",
    //   "patternUnits":"userSpaceOnUse",
    //   "height": "100",
    //   "width": "100",
    //   "id": "image",
    // })
    // .append('image')
    // .attrs({
    //   "xlink:href": 'https://cdn3.iconfinder.com/data/icons/business-and-finance-icons/512/Briefcase-512.png',
    //   "x": "0",
    //   "y": "0",
    //   "width": "100",
    //   "height": "100"
    // })
    var nodeEnter = nodes.enter()
    .append('circle')
    .attr('class', 'node')

    var linkEnter = links.enter()
      .append('line')
      .attr('class', 'link')

    links.merge(linkEnter)
    .attr('stroke-width', function(d) {
        return linkScale(d.value);
    })
    .style('stroke', function(d) {
        return linkColorScale(d.value);
    })
    .attr('opacity', function(link) {
      if (link.type === "dummy") {
        return 0;
      } else if (link.type === "close") {
        return 0.8;
      } else if (link.type === "far") {
        return 0.1;
      }
    });

    linkEnter.attr('marker-end','url(#arrowhead)')


    nodes.merge(nodeEnter)
    .attr('r', 8)
    .style('fill', function(d) {
        if (committees.has(d.id)) {
          let party = committees.get(d.id).CMTE_PTY_AFFILIATION
          if (demParties.has(party)) {
            return "#0380fc"
          } else if (repParties.has(party)) {
            return "#fc0303"
          } else {
            return "#a103fc"
          }
        } else if (candidates.has(d.id)) {
          let party = candidates.get(d.id).CAND_PTY_AFFILIATION
          if (demParties.has(party)) {
            return "#80c0ff"
          } else if (repParties.has(party)) {
            return "#ff8080"
          } else {
            return "#d080ff"
          }
        }
        return "#80ffa8";
    })
    //.attr('fill', "url(#image)")
    .attr('opacity', function(node) {
      if (node.type === "dummy") {
        return 0;
      } else if (node.type === "close") {
        return 1.0;
      } else if (node.type === "far") {
        return 0.1;
      }
    })




    function tickSimulation() {
      console.log("tick")
      linkEnter
      .attr('x1', function(d) {return d.source.x;})
      .attr('y1', function(d) {return d.source.y;})
      .attr('x2', function(d) { return d.target.x;})
      .attr('y2', function(d) { return d.target.y;});



      nodeEnter
      .attr('cx', function(d) { return d.x;})
      .attr('cy', function(d) { return d.y;});
        //console.log(selectedNode.x, selectedNode.y)
    }

    nodes.exit().remove();
    links.exit().remove();


    simulation
        .nodes(includedNodes().slice(1))
        .on('tick', tickSimulation);

    simulation
        .force('link')
        .links(immediateLinks().slice(1));

    nodeEnter.on('mouseover', node_tip.show)
      .on('mouseout', node_tip.hide);
    linkEnter.on('mouseover', link_tip.show)
      .on('mouseout', link_tip.hide);

    nodeEnter.on('click', function(d) {
      simulation.stop()
      //console.log(simulation.nodes());
      delete selectedNode.fx
      delete selectedNode.fy
      selectedNode.vx = 1
      selectedNode.vy = 1
      selectedNode.index = d.index
      //selectedNode.group = 1
      selectedNode = d;
      //selectedNode.group = 2
      selectedNode.fx = width / 2
      selectedNode.fy = height / 2
      selectedNode.index = 0;
      updateVisualization()
      simulation.alpha(1).restart();
      node_tip.hide()
      link_tip.hide()
      //console.log(simulation.nodes());
    })


    //console.log(network)
}
