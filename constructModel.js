function determineModel (nodes, links, previousModel, allGroups, expandedGroups, width, height) {
  // If the group is NOT expanded, we add an extra node, let's call
  // it the 'centerNode'
  // If the group IS expanded, we just draw the regular nodes and delete the
  // aforementioned 'centerNode'

  // TODO add jitter on the addition of the newly rendered nodes
  // TODO size of centerNode is dependend on the size of the group
  //      this can/should be relative to eachother
  // TODO use the checkbox filters at the top of the page to select wheter we
  // display anything regarding the group

  // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  // TODO use the previous "nodes" and "links" instead of building it
  // again from scratch every time we click anything
  // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

  // console.log("determineModel starts with : ")
  // console.log("nodes", nodes)
  // console.log("links", links)
  // console.log("allGroups", allGroups)
  // console.log("expandedGroups", expandedGroups)

  const start = new Date().getTime()

  // -----------------------------------------------------------------------//
  //          Rebuilding the model from previous model                     //
  // -----------------------------------------------------------------------//
  if (previousModel) {
    console.log("we aren't rebuilding the model from scratch")
    // TODO implement this sh!t so we can reuse the already calculated positions
  }

  const nodesResult = []
  const linksResult = []

  // map that links expanded groups to one single "central node" (!= centerNode)
  // TODO use the one with the most values
  const centerCluster = {}
  // map that links nodes to their groups
  const nodeMap = {}
  // map that keeps track of values between two centerNodes
  const centerNodeLinkMap = {}

  let group = null; let node = null; let link = null
  let source = null; let target = null; let sourceGroupExpanded = null
  let centerNode = null; let targetGroupExpanded = null; let groupTarget = null
  let sourceGroup = null; let targetGroup = null

  const numGroups = allGroups.length

  console.log('we are building the model from scratch')
  // -----------------------------------------------------------------------//
  //                  initial model construction                           //
  // -----------------------------------------------------------------------//

  // We add the nodes in the expanded groups
  // We add a node that represents a center for the forceCluster
  // We construct a map so we can easily look up the
  // group of the node by name

  // node structure { id: 'Brujon', group: 'group four' }
  for (let i = 0; i < nodes.length; i++) {
    node = nodes[i]
    group = node.group

    nodeMap[node.id] = group

    if (expandedGroups[group]) {
      // TODO add a name so we can visualise it
      node = {
        id: node.id,
        group: node.group,
        centerNode: false,
        x: Math.cos(i / numGroups * 2 * Math.PI) * 200 + width / 2 + Math.random(),
        y: Math.sin(i / numGroups * 2 * Math.PI) * 200 + height / 2 + Math.random()
      }
      nodesResult.push(node)
      if (!centerCluster[group]) {
        centerCluster[group] = node
      }
    }
  }

  // console.log("linksIput= ")
  // console.log(links)

  // link structure { source: 'Napoleon', target: 'Myriel', value: 1 }
  for (let i = 0; i < links.length; i++) {
    link = links[i]
    source = link.source
    target = link.target

    sourceGroup = nodeMap[source]
    targetGroup = nodeMap[target]

    sourceGroupExpanded = expandedGroups[sourceGroup]
    targetGroupExpanded = expandedGroups[targetGroup]

    // filling up the centerNodeLinkMap
    // TODO use this to define the values in the centerNodeLinks
    // TODO use the values within or don't count them
    // TODO adding up source & destination as one value
    if (centerNodeLinkMap[sourceGroup]) {
      if (centerNodeLinkMap[sourceGroup][targetGroup]) {
        centerNodeLinkMap[sourceGroup][targetGroup] = centerNodeLinkMap[sourceGroup][targetGroup] + link.value
      } else {
        centerNodeLinkMap[sourceGroup][targetGroup] = link.value
      }
    } else {
      centerNodeLinkMap[sourceGroup] = {}
      centerNodeLinkMap[sourceGroup][targetGroup] = link.value
    }

    // TODO here we could probably easily add links to the center node
    // TODO for now we only include links to 2 visible nodes
    if (sourceGroupExpanded && targetGroupExpanded) {
      linksResult.push({ source: source, target: target, value: link.value })
      // we additionally check if the node is present in the data
    } else if (sourceGroupExpanded && nodeMap[target]) {
      linksResult.push({ source: source, target: nodeMap[target], value: 1 })
      // we additionally check if the node is present in the data
    } else if (targetGroupExpanded && nodeMap[source]) {
      linksResult.push({ source: nodeMap[source], target: target, value: 1 })
    }
  }

  // node structure { id: 'Brujon', group: 'group four' }
  for (let i = 0; i < numGroups; i++) {
    group = allGroups[i]
    // add a centernode to represent the group that is not expanded
    if (!expandedGroups[group]) {
      // TODO add a name so we can visualise it
      centerNode = {
        id: group,
        group: group,
        centerNode: true,
        x: Math.cos(i / numGroups * 2 * Math.PI) * 200 + width / 2 + Math.random(),
        y: Math.sin(i / numGroups * 2 * Math.PI) * 200 + height / 2 + Math.random()
      }
      nodesResult.push(centerNode)
    }

    // using the data in the centerNodeLinkMap, we define wheter or not we draw a link between the centers
    // and we define its value based on the traffic between those two groups
    for (let j = 0; j < allGroups.length; j++) {
      if (i < j) {
        groupTarget = allGroups[j]

        sourceGroupExpanded = expandedGroups[group]
        targetGroupExpanded = expandedGroups[groupTarget]
        if (!sourceGroupExpanded && !targetGroupExpanded && centerNodeLinkMap[group][groupTarget]) {
          linksResult.push({ source: group, target: groupTarget, value: centerNodeLinkMap[group][groupTarget], centerLink: true })
        }
      }
    }
  }
  
  // console.log("centerCluster=")
  // console.log(centerCluster)

  // console.log("nodesResult=")
  // console.log(nodesResult)

  // console.log("linksResult=")
  // console.log(linksResult)

  // console.log("nodeMap=")
  // console.log(nodeMap)

  // console.log("centerNodeLinkMap=")
  // console.log(centerNodeLinkMap)

  const end = new Date().getTime()
  console.log('Constructing the model took', end - start, 'ms')

  return { nodesRes: nodesResult, linksRes: linksResult, centerCluster: centerCluster }
}

export default determineModel
