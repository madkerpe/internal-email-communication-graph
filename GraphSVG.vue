<template>
  <div>
    <v-card class="d-inline-block mx-auto">
      <v-card-text>
        <h2 class="title mb-2">Choose which groups we display</h2>

        <v-chip-group
          v-model="checkedGroups"
          column
          multiple
        >
          <v-chip filter outlined v-for="item in groups" v-bind:key="item">
            {{item}}
          </v-chip>
        </v-chip-group>
      </v-card-text>
    </v-card>
    <!--
    <v-card class="d-inline-block mx-auto">
      <v-card-text>
        <h2 class="title mb-2">Choose which data we are using</h2>

        <v-btn v-on:click="useTestData" color="primary">Use test data</v-btn>
        <p v-if="usingTestData">We are using test data</p>
        <p v-else>We are using real data</p>
        <p>Loading the real data can take up to 30 seconds...</p>
        <p>(You can click the button to use test data and load immediately)</p>
      </v-card-text>
    </v-card> -->
  <div id="graph"></div>
  </div>

</template>

<script>

import * as d3 from 'd3'
import gql from 'graphql-tag'
// import * as fc from 'd3-force-cluster'
import determineModel from './constructModel.js'

export default {
  name: 'GraphSVG',
  mounted () {
    if (this.databaseData) {
      this.generateSVG(this.databaseData, this.groups)
    }
  },
  data () {
    return {
      checkedGroups: [],
      groups: null,
      usingTestData: false,
      graphIsDisplayed: false,
      databaseData: null
      /* testData: {
        nodes: [
          { id: 'Phillip Allen', group: 'HR' },
          { id: 'Clement Lau', group: 'HR' },
          { id: 'Jonathan Hoff', group: 'HR' },
          { id: 'Oscar Dalton', group: 'IT' },
          { id: 'Amelia Alder', group: 'IT' },
          { id: 'Mitch Robinson', group: 'IT' },
          { id: 'Benjamin Rogers', group: 'IT' },
          { id: 'Don Miller', group: 'Sales' },
          { id: 'Ron Coker', group: 'Sales' },
          { id: 'Bailey Susan', group: 'Sales' },
          { id: 'Bruce Golden', group: 'Sales' },
          { id: 'Jinsung Myung', group: 'Sales' },
          { id: 'Ross Newlin', group: 'Sales' }
        ],
        links: [
          { source: 'Phillip Allen', target: 'Clement Lau', value: 6 },
          { source: 'Phillip Allen', target: 'Jonathan Hoff', value: 5 },
          { source: 'Phillip Allen', target: 'Benjamin Rogers', value: 4 },
          //{ source: 'Phillip Allen', target: 'Don Miller', value: 5 },
          { source: 'Clement Lau', target: 'Jonathan Hoff', value: 4 },
          { source: 'Benjamin Rogers', target: 'Amelia Alder', value: 4 },
          { source: 'Benjamin Rogers', target: 'Mitch Robinson', value: 5 },
          { source: 'Mitch Robinson', target: 'Amelia Alder', value: 3 },
          { source: 'Benjamin Rogers', target: 'Oscar Dalton', value: 2 },
          { source: 'Don Miller', target: 'Bailey Susan', value: 7 },
          { source: 'Jinsung Myung', target: 'Bailey Susan', value: 2 },
          { source: 'Don Miller', target: 'Jinsung Myung', value: 10 },
          { source: 'Ross Newlin', target: 'Bruce Golden', value: 1 },
          { source: 'Bruce Golden', target: 'Bailey Susan', value: 7 },
          { source: 'Don Miller', target: 'Benjamin Rogers', value: 7 },
          { source: 'Ross Newlin', target: 'Jinsung Myung', value: 10 },
          { source: 'Bruce Golden', target: 'Ron Coker', value: 5 },
          { source: 'Bailey Susan', target: 'Ron Coker', value: 7 },
          { source: 'Oscar Dalton', target: 'Ron Coker', value: 1 },
          { source: 'Jonathan Hoff', target: 'Mitch Robinson', value: 3 }

        ]
      } */
    }
  },
  apollo: {
    graphData: {
      query: gql`query {
        graphData {
          data
        }
      }`,
      update (data) {
        // TODO catch the error when the data doesn't load
        const start = new Date().getTime()

        data = JSON.parse(data.graphData.data)

        const end = new Date().getTime()
        console.log('Parsing this data takes: ', end - start, 'ms')

        if (!this.graphIsDisplayed) {
          this.useRealData(data)
        }
      }
    }
  },

  methods: {
    GetGroupsFromNodes (nodes) {
      // determining the unique group values
      const groupIds = d3.set(nodes.map(n => String(n.group)))
        .values()
        .map(function (groupId) {
          return {
            groupId: groupId,
            count: nodes.filter(n => String(n.group) === String(groupId)).length
          }
        })
        .map(group => group.groupId)

      return groupIds
    },
    /* useTestData (event) {
      if (!this.graphIsDisplayed) {
        this.usingTestData = true
        this.graphIsDisplayed = true
        this.groups = this.GetGroupsFromNodes(this.testData.nodes)
        this.checkedGroups = [...Array(this.groups.length).keys()]
        this.generateSVG(this.testData, this.groups)
      }
    }, */
    useRealData (data) {
      this.databaseData = data
      this.groups = this.GetGroupsFromNodes(data.nodes)
      this.checkedGroups = [...Array(this.groups.length).keys()]
      this.graphIsDisplayed = true
      this.generateSVG(data, this.groups)
    },
    generateSVG (graphData, groupData) {
      // defining the height and width of the SVG element
      const width = 1000
      const height = 1000

      // every group starts out closed
      const expandedGroups = {}
      groupData.forEach(function (groupId) {
        expandedGroups[groupId] = false
      })

      // scale with discrete input and discrete output:
      // numeric value to a discrete color
      // TODO It seems that there are not enough colors in schemePaired
      const color = d3.scaleOrdinal()
        .domain(groupData)
        .range(d3.schemePaired)

      const nodeData = graphData.nodes
      const linkData = graphData.links
      let model

      let simulation

      let node, nodeEnter
      let link, linkEnter

      let node1, node2

      // add a svg element on which we can zoom
      // TODO We can get an error in the console when we translate
      // before the the graph(?) is initialised
      const canvas = d3.select('#graph')
        .append('svg')
        .attr('class', 'svgCanvas')
        .call(
          d3
            .zoom()
            .scaleExtent([1 / 2, 8])
            .on('zoom', zoomed))
        .append('g')

      const linkContainer = canvas
        .append('g')
        .attr('class', 'linkContainer')

      const nodeContainer = canvas
        .append('g')
        .attr('class', 'nodeContainer')

      UpdateVisualisation()

      // ------------------------------------------------------------------- //
      // ------------------------------------------------------------------- //
      // ------------------------------------------------------------------- //
      // ------------------------------------------------------------------- //
      // ------------------------------------------------------------------- //

      function UpdateVisualisation () {
        // construct the model we're visualising
        model = determineModel(nodeData, linkData,
          null, groupData, expandedGroups, width, height)

        // updating the nodes
        node = nodeContainer
          // TODO this is duck-typing
          .selectAll('circle')
          .data(model.nodesRes, d => d.id)
        node
          .exit()
          .remove()
        nodeEnter = node
          .enter()
          .append('circle')
          .attr('class', 'node')
          // TODO add a different radius for a centerNode
          .attr('r', d => (d.centerNode) ? 30 : 15)
          .attr('stroke', '#d3d3d3')
          .attr('stroke-width', 4)
          .attr('fill', d => color(d.group))
          .attr('group', d => d.group)
          .attr('id', d => d.id)
          .attr('centerCluster', findCenterCluster)
          .on('click', function (d) {
            expandedGroups[d.group] = !expandedGroups[d.group]
            // console.log("clicked on: ", d.group);
            UpdateVisualisation()
          })
          .call(
            d3
              .drag()
              .on('start', dragstarted)
              .on('drag', dragged)
              .on('end', dragended))
        node = nodeEnter.merge(node)

        // updating the links
        link = linkContainer
          // TODO this is duck-typing
          .selectAll('line')
          // we identify the links by a unique identifier
          .data(model.linksRes, d => String(d.source) + '&&' + String(d.target))
        link
          .exit()
          .remove()
        linkEnter = link
          .enter()
          .append('line')
          .attr('stroke', 'grey')
          // TODO stroke-opacity based on amount of emails
          .attr('stroke-opacity', 10)
          // TODO stroke-width defined with a more appropriate function
          .attr('stroke-width', d => Math.sqrt(d.value))
          .attr('source', d => d.source)
          .attr('target', d => d.target)
        link = linkEnter.merge(link)

        // creating the force between the links
        // source and target from the same group have a smaller link-length
        // source and target from the same group have attraction, others repulsion
        const forceLink = d3.forceLink(model.linksRes)
          // we identify the links by a unique node identifier
          .id(d => d.id)
          .distance(function (d) {
            node1 = d.source.group
            node2 = d.target.group

            const near = 300
            const far = 1000

            return String(node1) === String(node2) ? near : far
          })
          .strength(function (d) {
            node1 = d.source.group
            node2 = d.target.group

            const near = 0.6
            const far = 0.1

            return String(node1) === String(node2) ? near : far
          })

        const collisionForce = d3.forceCollide()
          .radius(function (d) {
            // TODO this radius should be linked to the
            // one we set on the nodes
            return (d.centerNode) ? 40 : 25
          })
          .strength(0.5)

        // const forceCluster = fc.forceCluster()
        //  .centers(findCenterCluster)
        //  .strength(0.1)
        //  .centerInertia(0.1)

        // simulating physical forces on particles
        // Create a simulation for an array of nodes, and compose
        // the desired forces.
        // Then listen for tick events to render the nodes
        simulation = d3
          .forceSimulation(model.nodesRes)
          .force('link', forceLink)
          .force('charge', d3.forceManyBody())
          // .force('cluster', cluster())
          // .force('cluster', forceCluster)
          .force('center', d3.forceCenter(width / 2, height / 4))
          .force('collision', collisionForce)
          .on('tick', ticked)
      }

      // standard function to allow zooming
      function zoomed () {
        canvas.attr('transform', d3.event.transform)
      }

      // standard fucntions to allow dragging of nodes and links
      function dragstarted (d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      }

      // standard fucntions to allow dragging of nodes and links
      function dragged (d) {
        d.fx = d3.event.x
        d.fy = d3.event.y
      }

      // standard fucntions to allow dragging of nodes and links
      function dragended (d) {
        if (!d3.event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      }

      function findCenterCluster (d) {
        if (model.centerCluster[d.group]) {
          return model.centerCluster[d.group]
        }
        return d
      }

      /*
      // Move d to be adjacent to the cluster node.
      // from: https://bl.ocks.org/mbostock/7881887
      function cluster () {

        let nodes,
          strength = 0.1;

        function force (alpha) {

          // scale + curve alpha value
          alpha *= strength * alpha;

          nodes.forEach(function(d) {
            console.log(d)
            let cluster = findCenterCluster(d);
            if (cluster === d) return;

            let x = d.x - cluster.x,
              y = d.y - cluster.y,
              l = Math.sqrt(x * x + y * y),
              r = d.radius + cluster.radius;

            if (l != r) {
              l = (l - r) / l * alpha;
              d.x -= x *= l;
              d.y -= y *= l;
              cluster.x += x;
              cluster.y += y;
            }
          });

        }

        force.initialize = function (_) {
          nodes = _;
        }

        force.strength = _ => {
          strength = _ == null ? strength : _;
          return force;
        };

        return force;

      }
*/

      // function that is executed every time the "forcesimulation" ticks
      function ticked () {
        node
          // update the positional information of the nodes
          // by translating it
          .attr('cx', d => d.x)
          .attr('cy', d => d.y)

        link
          // update the positional information of the links
          // both source coordinates and target coordinates
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y)
      }
    }
  }
}
</script>
<style>
  svg {
    width: 100vw;
    height: 100vh;
  }
</style>
