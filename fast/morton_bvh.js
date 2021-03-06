const splitList = ((centroids) => {
    let data = mortonCodeFromCentroids(centroids);
    const cummulative = [];
    let depth = 0;
    let code = 0;
    let index = 0;
    let mortonIndex = 0;
    for (let i = 0; i < data.length - 1; i++) {
        data[i].depth = Math.floor(Math.log2(data[i].code ^ data[i + 1].code));
        data[i].mortonIndex = i;
        code = data[i].code;
        index = data[i].index;
        mortonIndex = data[i].mortonIndex;
        depth = data[i].depth;

        while (depth > 0) {
            cummulative.push ({code: code, index: index, mortonIndex: mortonIndex, depth: --depth});
        }
    }
    data = data.concat(cummulative);
    data.sort((a, b) => {
        return a.code > b.code;
    });
    data.sort((a, b) => {
        return a.depth < b.depth;
    });
    for (let i = 0; i < data.length; i++) {
        console.log(data[i]);
    }

});

let unionClusters = (clusterA, clusterB) => {
    let cluster = clusterA.concat(clusterB);
    cluster.minX = Math.min(clusterA.minX, clusterB.minX);
    cluster.minY = Math.min(clusterA.minY, clusterB.minY);
    cluster.minZ = Math.min(clusterA.minZ, clusterB.minZ);
    cluster.maxX = Math.max(clusterA.maxX, clusterB.maxX);
    cluster.maxY = Math.max(clusterA.maxY, clusterB.maxY);
    cluster.maxZ = Math.max(clusterA.maxZ, clusterB.maxZ);
    cluster.x = (cluster.minX + cluster.maxX) / 2;
    cluster.y = (cluster.minY + cluster.maxY) / 2;
    cluster.z = (cluster.minZ + cluster.maxZ) / 2;
    return cluster;
}

let dataFromMesh = (mesh) => {
    const bb =  mesh.getBoundingInfo().boundingBox;
	const min = bb.minimum;
    const max = bb.maximum;
    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
	const indices = mesh.getIndices();
	let centroids = [];
	let minAABB = [];
    let maxAABB = [];
	let x = 0;  //vertex x position
	let y = 0;  //vertex y position
	let z = 0;  //vertex z position
	let cx = 0; // for centroid x
	let cy = 0; // for centroid y
	let cz = 0; // for centroid z
	const third = 1 / 3;
	let mnx = 0; //for minimum x
	let mxx = 0; // for maximum x
	let mny = 0; //for minimum y
	let mxy = 0; // for maximum y
	let mnz = 0; //for minimum z
	let mxz = 0; // for maximum z
	let index = [];
	for (let idx = 0; idx < indices.length / 3; idx++) {
		index[0] = indices[3 * idx];
		index[1] = indices[3 * idx + 1];
		index[2] = indices[3 * idx + 2];
		mnx = Infinity;
		mxx = -Infinity;
		mny = Infinity;
		mxy = -Infinity;
		mnz = Infinity;
		mxz = -Infinity;
		cx = 0;
		cy = 0;
		cz = 0;
		for (let v = 0; v < 3; v++) {
			x = positions[3 * index[v]];
			y = positions[3 * index[v] + 1];
			z = positions[3 * index[v] + 2];
			cx += x * third;
			cy += y * third;
			cz += z * third;
			mnx = Math.min(x, mnx);
			mxx = Math.max(x, mxx);
			mny = Math.min(y, mny);
			mxy = Math.max(y, mxy);
			mnz = Math.min(z, mnz);
			mxz = Math.max(z, mxz);
		}
		centroids.push(cx, cy, cz);
		
		minAABB.push(mnx, mny, mnz);
		maxAABB.push(mxx, mxy, mxz);
	}
    
    return {centroids: centroids, minAABB: minAABB, maxAABB: maxAABB, min: min, max: max}
}

let dataFromArrayOfMeshes = (meshArray) => {
	let minAABB = meshArray.flatMap((entry) => Object.values(entry.getBoundingInfo().boundingBox.minimum));
    let maxAABB = meshArray.flatMap((entry) => Object.values(entry.getBoundingInfo().boundingBox.maximum));
    let centroids = meshArray.flatMap((entry) => Object.values(entry.position));
    return {centroids: centroids, minAABB: minAABB, maxAABB: maxAABB}
}

let dataFromSPS = (sps) => {
	let minAABB = sps.particles.flatMap((entry) => Object.values(entry._boundingInfo.boundingBox.minimum));
    let maxAABB = meshArray.flatMap((entry) => Object.values(entry._boundingInfo.boundingBox.maximum));
    let centroids = meshArray.flatMap((entry) => Object.values(entry.position));
    return {centroids: centroids, minAABB: minAABB, maxAABB: maxAABB}
}

let codeMapFromObjectMap = (data) => {
	const multF = Math.pow(2, 10);

    let codes = [];
    let mortonToIndexMap = {};    
    for (let i = 0; i < data.centroids.length / 3; i++) {
		x = data.centroids[3 * i];
		y = data.centroids[3 * i + 1];
		z = data.centroids[3 * i + 2];
		// map to integers in range 0 to 2 ^ 10
		x = Math.round(multF * (x - data.min.x) / (data.max.x - data.min.x), 0);
		y = Math.round(multF * (y - data.min.y) / (data.max.y - data.min.y), 0);
		z = Math.round(multF * (z - data.min.z) / (data.max.z - data.min.z), 0);
        mortonCode = mortonFromVec(x, y, z);
        mortonToIndexMap[mortonCode] = i;
        codes.push(mortonCode);
    }
    codes = radixSort(codes);
    const codes32 = new Uint32Array(codes.length);
    codes32.set(codes);
    
    return {codes: codes32, mortonToIndex: mortonToIndexMap}
}

let surfaceAreaMetric = (cluster1, cluster2) => { // really half surface area
    const width = Math.max(cluster1.maxX, cluster2.maxX) - Math.min(cluster1.minX, cluster2.minX);
    const height = Math.max(cluster1.maxY, cluster2.maxY) - Math.min(cluster1.minY, cluster2.minY);
    const depth = Math.max(cluster1.maxZ, cluster2.maxZ) - Math.min(cluster1.minZ, cluster2.minZ);
    return width * height + width * depth + depth * height;
}

let distMetric = (cluster1, cluster2) => { // really square of distance
    let x = cluster1.x - cluster2.x;
    let y = cluster1.y - cluster2.y;
    let z = cluster1.z - cluster2.z;
    return x * x + y * y + z * z;
}

class Cluster extends Array {
    constructor() {
        super();
        this.index;
        this.minX = Infinity;
        this.minY = Infinity;
        this.minZ = Infinity;
        this.maxX = -Infinity;
        this.maxY = -Infinity;
        this.maxZ = -Infinity;
        this.x = 0;
        this.y = 0;
        this.z = 0;
    }

    updateCentroid() {
        this.x = (this.minX + this.maxX) / 2;
        this.y = (this.minY + this.maxY) / 2;
        this.z = (this.minZ + this.maxZ) / 2;
    }
    
    addCluster(c) {
        this.push(c);
        this.minX = Math.min(this.minX, c.minX);
        this.minY = Math.min(this.minY, c.minY);
        this.minZ = Math.min(this.minZ, c.minZ);
        this.maxX = Math.max(this.maxX, c.maxX);
        this.maxY = Math.max(this.maxY, c.maxY);
        this.maxZ = Math.max(this.maxZ, c.maxZ);
        this.updateCentroid();
    }

    deleteCluster(c) {
        
        let idx = this.indexOf(c);
        this.splice(idx, 1);
        if (c.minX <= this.minX) {
            this.forEach((item) => {
                this.minX = Math.min(this.minX, item.minX)
            });
        }
        if (c.minY <= this.minY) {
            this.forEach((item) => {
                this.minY = Math.min(this.minY, item.minY)
            });
        }
        if (c.minZ <= this.minZ) {
            this.forEach((item) => {
                this.minZ = Math.min(this.minZ, item.minZ)
            });
        }
        if (c.maxX >= this.maxX) {
            this.forEach((item) => {
                this.maxX = Math.max(this.maxX, item.maxX)
            });
        }
        if (c.maxY >= this.maxY) {
            this.forEach((item) => {
                this.maxY = Math.max(this.maxY, item.maxY)
            });
        }
        if (c.maxZ >= this.maxZ) {
            this.forEach((item) => {
                this.maxZ = Math.max(this.maxZ, item.maxZ)
            });
        }
        this.updateCentroid();
    }
}

let clusterFromLeaf = (leaf, map, data) => {
    let cluster = new Cluster();
    let code = 0;
    let index = 0; 
    for (let i = leaf.start; i < leaf.end + 1; i++) {
        let baseCluster = new Cluster();
        code = map.codes[i];
        index = map.mortonToIndex[code];
        cluster.push(baseCluster);
        baseCluster.index = index;
        baseCluster.minX = data.minAABB[3 * index];
        baseCluster.minY = data.minAABB[3 * index + 1];
        baseCluster.minZ = data.minAABB[3 * index + 2];
        baseCluster.maxX = data.maxAABB[3 * index];
        baseCluster.maxY = data.maxAABB[3 * index + 1];
        baseCluster.maxZ = data.maxAABB[3 * index + 2];
        baseCluster.x = data.centroids[3 * index];
        baseCluster.y = data.centroids[3 * index + 1];
        baseCluster.z = data.centroids[3 * index + 2];    
        cluster.minX = Math.min(cluster.minX, baseCluster.minX);
        cluster.minY = Math.min(cluster.minY, baseCluster.minY);
        cluster.minZ = Math.min(cluster.minZ, baseCluster.minZ);
        cluster.maxX = Math.max(cluster.maxX, baseCluster.maxX);
        cluster.maxY = Math.max(cluster.maxY, baseCluster.maxY);
        cluster.maxZ = Math.max(cluster.maxZ, baseCluster.maxZ);
        cluster.updateCentroid();
    }
    return cluster;
}

let clusterFrom = (left, right) => {
    let cluster = new Cluster();
    cluster.push(left, right)
    cluster.minX = Math.min(left.minX, right.minX);
    cluster.minY = Math.min(left.minY, right.minY);
    cluster.minZ = Math.min(left.minZ, right.minZ);
    cluster.maxX = Math.max(left.maxX, right.maxX);
    cluster.maxY = Math.max(left.maxY, right.maxY);
    cluster.maxZ = Math.max(left.maxZ, right.maxZ);
    cluster.x = (cluster.minX + cluster.maxX) / 2;
    cluster.y = (cluster.minY + cluster.maxY) / 2;
    cluster.z = (cluster.minZ + cluster.maxZ) / 2;
    return cluster; 
}

let combineClusters = (cluster, n) => {
    if (cluster.length === 1) {
       return cluster;
    }
    let dist = Infinity;
    let tempdist = 0;
    for (let i = 0; i < cluster.length; i++) {
        dist = Infinity;
        let element = cluster[i];
        for (let j = 0; j < cluster.length; j++) {
            if (i !== j) {
                tempdist = distMetric(element, cluster[j]);
                if (tempdist < dist) {
                    dist = tempdist;
                    element.closest = cluster[j];
                    element.surfaceAreaWithClosest = surfaceAreaMetric(element, cluster[j]);
                    
                }
            }
        }
    }    
    let best = Infinity;
    let left;
    let right;
    let counter = 0;
    while (cluster.length > n && counter++ < 50) {
        best = Infinity;
        for (let element of cluster) {
            if (element.surfaceAreaWithClosest < best) {
                best = element.surfaceAreaWithClosest;
                left = element;
                right = element.closest;
            }
        }
        let cDash = clusterFrom(left, right);
        cluster.deleteCluster(left);
        cluster.deleteCluster(right);
        cluster.addCluster(cDash);
        for (let i = 0; i < cluster.length; i++) {
            dist = Infinity;
            let element = cluster[i];
            if (element.closest === left || element.closest === right) {
                for (let j = 0; j < cluster.length; j++) {
                    if (i !== j) {
                        tempdist = distMetric(element, cluster[j])
                        if (tempdist < dist) {
                            dist = tempdist;
                            element.closest = cluster[j];
                        }
                    }
                }
            }
        }
    }
    return cluster;
}

class bvhNode {
    constructor(start, end, nbBits) {
        this.start = start;
        this.end = end;
        this.nbBits = nbBits;
        this.left = null;
        this.right = null;
        this.parent = null;
        this.sibling = null;
        this.cluster = null;
    }
}

var split = (codes, node) => { // split according to Morton Code
    const nbBits = node.nbBits;
    let mask = Math.pow(2, nbBits) - 1;
    let splitAt = Math.pow(2, nbBits - 1);
    let section = codes.slice(node.start, node.end + 1);
    let left = section.filter((entry) => (entry & mask) < splitAt);
    let right = section.filter((entry) => (entry & mask) > splitAt - 1);
    let leftStart = codes.indexOf(left[0]);
    let leftEnd  = codes.indexOf(left[left.length - 1]);
    let rightStart = codes.indexOf(right[0]);
    let rightEnd  = codes.indexOf(right[right.length - 1]);
    return {ls: leftStart, le: leftEnd, rs: rightStart, re: rightEnd};
}

var splitNode = (node, codes) => {
    if (node.end - node.start < 8) {
        if (node.left === null && node.right === null) {
            switchArray[0].add(node);
            //console.log("add node", node);
            //console.log(switchArray[0]);
        }
        return;
    }
    let partition = split(codes, node);
    if (partition.ls === -1 || partition.rs === -1) {
        node.nbBits--;
        arrayToSplit.push(node);
    }
    else {
        let left = new bvhNode(partition.ls, partition.le, node.nbBits - 1);
        let right = new bvhNode(partition.rs, partition.re, node.nbBits - 1);
        //console.log("node", node);
        //console.log("left", left);
        //console.log("right", right);
        //console.log();
        node.left = left;
        node.right = right;  
        left.parent = node;
        right.parent = node;  
        left.sibling = right;
        right.sibling = left;
        arrayToSplit.push(left);
        arrayToSplit.push(right);
    }
}

let bvhRayIntersect = (ray, bvhTree, mesh) => {
    let bbMin = BABYLON.Vector3.Zero();
    let bbMax = BABYLON.Vector3.Zero();
    let nodes = bvhTree.concat([]);
    //console.log(nodes.length);
    let triIndices = [];

    let tm = new BABYLON.Matrix();
    let tr = new BABYLON.Ray(BABYLON.Vector3.Zero(), BABYLON.Axis.Y);
    
    mesh.computeWorldMatrix();
    mesh.getWorldMatrix().invertToRef(tm);
    //console.log("matrix", tm);
    BABYLON.Ray.TransformToRef(ray, tm, tr);
    //console.log("TEMP RAY", tr);
        


    while (nodes.length > 0) {
        var node = nodes.pop();

        if (tr.intersectsBoxMinMax(bbMin.set(node.minX, node.minY, node.minZ), bbMax.set(node.maxX, node.maxY, node.maxZ), 0.0000001)) {
            if (node.index !== undefined) {
                triIndices.push(node.index);
            }
            else {
                for (let n = 0; n < node.length; n++) {
                    nodes.push(node[n]);
                }
            }
            
        }
    }
//console.log("TRI", triIndices)
    return genInfo(mesh, ray, triIndices);
    
}

const genInfo = (mesh, ray, triIndices) => {
    let results = [];
    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    const indices = mesh.getIndices();
    let tm = new BABYLON.Matrix();
    let tr = new BABYLON.Ray(BABYLON.Vector3.Zero(), BABYLON.Axis.Y);
    
    mesh.computeWorldMatrix();
    mesh.getWorldMatrix().invertToRef(tm);
    BABYLON.Ray.TransformToRef(ray, tm, tr);
    let v0 = BABYLON.Vector3.Zero();
    let v1 = BABYLON.Vector3.Zero();
    let v2 = BABYLON.Vector3.Zero();
    let idx0 = 0;
    let idx1 = 0;
    let idx2 = 0;
    for (let i = 0; i < triIndices.length; i++) {
        idx0 = indices[3 * triIndices[i]];
        idx1 = indices[3 * triIndices[i] + 1];
        idx2 = indices[3 * triIndices[i] + 2];
        v0.set(positions[3 * idx0], positions[3 * idx0 + 1], positions[3 * idx0 + 2]);
        v1.set(positions[3 * idx1], positions[3 * idx1 + 1], positions[3 * idx1 + 2]);
        v2.set(positions[3 * idx2], positions[3 * idx2 + 1], positions[3 * idx2 + 2]);
        let inf = tr.intersectsTriangle(v0, v1, v2);
        if (inf !== null) {
            pickingInfo  = new BABYLON.PickingInfo();
            pickingInfo.hit = true;
            pickingInfo.distance = inf.distance;
            pickingInfo.pickedPoint = ray.origin.add(ray.direction.normalize().scale(inf.distance));
            pickingInfo.pickedMesh = mesh;
            pickingInfo.bu = inf.bu;
            pickingInfo.bv = inf.bv;
            pickingInfo.faceId = triIndices[i];
            pickingInfo.subMeshId = inf.subMeshId;
            results.push(pickingInfo);
        }
    }
    return results;
}

const forwardFaces  = (mesh, direction, density, scene) => { //for icosahedron
    mesh.computeWorldMatrix(true);
    const bb = mesh.getBoundingInfo().boundingSphere;
    const r = bb.radius;
    const c = bb.centerWorld.clone();
    const localNormals = mesh.getFacetLocalNormals();
    let faces = new Set();
    let faceData = [];
    
    let s = BABYLON.MeshBuilder.CreateSphere("", {diameter: 0.2});
    s.material = new BABYLON.StandardMaterial("", scene);
    s.material.diffuseColor = BABYLON.Color3.Green();
    s.position = c;
    
    const plane = BABYLON.Plane.FromPositionAndNormal(c, direction);
    if (direction.x === 0 && direction.y === 0) {
        plane.Xaxis = new BABYLON.Vector3(0, 0, -direction.z).normalize();
    }  
    else {
        plane.Xaxis = new BABYLON.Vector3(-direction.y, direction.x, 0).normalize();
    }
    plane.Yaxis = BABYLON.Vector3.Cross(direction, plane.Xaxis);


    /*let X = new BABYLON.Ray(c, plane.Xaxis, 10)
    BABYLON.RayHelper.CreateAndShow(X, scene, BABYLON.Color3.Blue());
    let Y = new BABYLON.Ray(c, plane.Yaxis, 10)
    BABYLON.RayHelper.CreateAndShow(Y, scene, BABYLON.Color3.Yellow()); */
    let deltaR = 2 * 0.75 * r / density;
    for (let dx = 0; dx < density; dx++) {
        for (let dy = 0; dy <= density; dy++) {
            let point = c.add(plane.Xaxis.scale(-r * 0.75 + dx * deltaR).add(plane.Yaxis.scale(-r * 0.75 + dy * deltaR)));
            let ray = new BABYLON.Ray(point, direction);
            BABYLON.RayHelper.CreateAndShow(ray, scene, BABYLON.Color3.Red());
            let pick = ray.intersectsMesh(mesh);
            //console.log(pick)
            //if(pick.hit) console.log(pick.faceId)
            if (pick.hit) {
                faces.add(pick.faceId);
                if (faces.has(pick.faceId)) {
                    if (faceData[pick.faceId] !== undefined) {
                        faceData[pick.faceId] += 1;
                    }
                    else {
                        faceData[pick.faceId] = 1;
                        let s = BABYLON.MeshBuilder.CreateSphere("", {diameter: 0.2});
                        s.position = mesh.getFacetPosition(pick.faceId); 
                    }
                }
            }
        }
    }
/*    for (var i = 0; i < faceData.length; i++) {
        if (faceData[i] !== undefined) {
            console.log(i, "FD", faceData[i]);
        }
    } */
    return faces;
}

const forwardRays = (mesh, direction, density, node, scene) => {
    mesh.computeWorldMatrix(true);
    const bb = mesh.getBoundingInfo().boundingSphere;
    const r = bb.radius;
    const c = bb.centerWorld.clone().subtract(direction.normalize().scale(0.5));
    const localNormals = mesh.getFacetLocalNormals();
    let rays = [];
    
    //let s = BABYLON.MeshBuilder.CreateSphere("", {diameter: 0.2});
    
    const plane = BABYLON.Plane.FromPositionAndNormal(c, direction);
    if (direction.x === 0 && direction.y === 0) {
        plane.Xaxis = new BABYLON.Vector3(0, 0, -direction.z).normalize();
    }  
    else {
        plane.Xaxis = new BABYLON.Vector3(-direction.y, direction.x, 0).normalize();
    }
    plane.Yaxis = BABYLON.Vector3.Cross(direction, plane.Xaxis);


    /*let X = new BABYLON.Ray(c, plane.Xaxis, 10)
    BABYLON.RayHelper.CreateAndShow(X, scene, BABYLON.Color3.Blue());
    let Y = new BABYLON.Ray(c, plane.Yaxis, 10)
    BABYLON.RayHelper.CreateAndShow(Y, scene, BABYLON.Color3.Yellow()); */
    let deltaR = 2 * r / density;
    for (let dx = 0; dx < density; dx++) {
        for (let dy = 0; dy < density; dy++) {
            let point = c.add(plane.Xaxis.scale(-r + dx * deltaR).add(plane.Yaxis.scale(-r + dy * deltaR)));
            ray = new BABYLON.Ray(point, direction);
            rays.push(ray);
            let t = bvhRayIntersect(ray, node, mesh);
            for (var i = 0; i < t.length; i++) {
                //s = BABYLON.MeshBuilder.CreateSphere("", {diameter: 0.1});
                //s.position = mesh.getFacetPosition(t[i].faceId);
                if (BABYLON.Vector3.Dot(localNormals[t[i].faceId], direction) > 0) {
                    //s.material = new BABYLON.StandardMaterial("", scene);
                    //s.material.diffuseColor = BABYLON.Color3.Green();
                    ray.origin = mesh.getFacetPosition(t[i].faceId);
                    if(mesh.name === "b") {
                        BABYLON.RayHelper.CreateAndShow(ray, scene, BABYLON.Color3.Red());
                    }

                }
            }
        }
    }
    return rays;
}

const bvhMeshesIntersect = (mesh0, direction0, node0, mesh1, direction1, node1, scene) => {
    let rays0 = forwardRays(mesh0, direction0, 20, node0, scene);
    let rays1 = forwardRays(mesh1, direction1, 20, node1, scene);
    let hit = false;
    let r0 = 0;
    let r1 = 0;
    let d = 0;
    let pickedInfo;
    while (r0 < rays0.length && !hit) {
        pickedInfo = bvhRayIntersect(rays0[r0++], node1, mesh1);
        d = Infinity;
        if (pickedInfo.length > 0) {
            d = pickedInfo.map((item) => item.distance).reduce((a, b) => {
                return Math.min(a, b);
            });
        }
        //console.log("0 to 1", d);
        if (d < 0.1) {
            hit = true
        }
    }
    if (hit) {
        return hit;
    }
    while (r1 < rays1.length && !hit) {
        pickedInfo = bvhRayIntersect(rays1[r1++], node0, mesh0);
        d  = Infinity;
        if (pickedInfo.length > 0) {
            d = pickedInfo.map((item) => item.distance).reduce((a, b) => {
                return Math.min(a, b);
            });
        }
        //console.log("1 to 0", d)
        if (d < 0.1) {
            hit = true
        }
    }
    return hit;
}



let arrayToSplit = [];
let switchArray = [];
switchArray[0] = new Set();
switchArray[1] = new Set();
let switcher = 0;

let createBVH = (object) => {
    switcher = 0;
    switchArray[0].clear();
    switchArray[1].clear();
    let data;
    if (object.position) {
        data = dataFromMesh(object);
    }
    else if (isArray(object)) {
        data = dataFromArrayOfMeshes(object);
    }
    else if (object.particles) {
        data = dataFromSPS(object);
    }
    const map = codeMapFromObjectMap(data);

    let codeTree = new bvhNode(0, map.codes.length - 1, 30, 0, 0);
    //console.log("CT", codeTree)

    arrayToSplit = [codeTree];
    
    while (arrayToSplit.length > 0) {
        let node = arrayToSplit.pop();
        splitNode(node, map.codes);
    }

    switchArray[0].forEach(function(entry) {
        if (switchArray[0].has(entry.sibling)) {
            switchArray[0].delete(entry.sibling);
        }
    });
    //console.log("base2", switchArray[0]);


    //************************lowest cluster levels****************
    switchArray[switcher].forEach((entry) => {
        switchArray[switcher].delete(entry);
        let cluster = clusterFromLeaf(entry, map, data)
        entry.cluster = combineClusters(cluster, cluster.length / 2);
        if (entry.sibling.left === null && entry.sibling.right === null) {
            let siblingCluster = clusterFromLeaf(entry.sibling, map, data);
            entry.sibling.cluster = combineClusters(siblingCluster, siblingCluster.length / 2);
            entry.parent.cluster = combineClusters(unionClusters(entry.cluster, entry.sibling.cluster), (entry.cluster.length + entry.sibling.cluster) / 2);
            if (!switchArray[(switcher + 1) % 2].has(entry.parent.sibling)) {
                    switchArray[(switcher + 1) % 2].add(entry.parent);
                }
        }
        else {
            switchArray[(switcher + 1) % 2].add(entry);
        }
        
    });

        
    switchArray[switcher].clear();
    switcher++;
    switcher %= 2;
    
    //level++;
    let tooMany = 0;
    let limit = 1000;
    let atRoot = false;
    let treeCluster = [];
    while (!atRoot && tooMany++ < limit) {
        switchArray[switcher].forEach((entry) => {
            if (entry.start === 0 && entry.end === map.codes.length - 1) {
                treeCluster = combineClusters(entry.cluster, 1);
                atRoot = true;
            }
            switchArray[switcher].delete(entry);
            if (entry.sibling && entry.sibling.cluster !== null) {
                entry.parent.cluster = combineClusters(unionClusters(entry.cluster, entry.sibling.cluster), (entry.cluster.length + entry.sibling.cluster.length) / 2);
                if (!switchArray[(switcher + 1) % 2].has(entry.parent.sibling)) {
                    switchArray[(switcher + 1) % 2].add(entry.parent);
                }
            }
            else {
                switchArray[(switcher + 1) % 2].add(entry);
            }
        });
        switchArray[switcher].clear();
        switcher++;
        switcher %= 2;
        //console.log(switchArray[0], switchArray[1]);
    }

    if (!atRoot && tooMany >= limit) {
        console.log("PROBLEM");
        return null;
    }
    else {
        return treeCluster;
    }
    
    
}


