let bvhRayIntersect = (ray, bvhTree, mesh) => {
    let bbMin = BABYLON.Vector3.Zero();
    let bbMax = BABYLON.Vector3.Zero();
    //console.log(nodes.length);
    let triIndices = [];

    let tm = new BABYLON.Matrix();
    let tr = new BABYLON.Ray(BABYLON.Vector3.Zero(), BABYLON.Axis.Y);
    
    mesh.computeWorldMatrix();
    mesh.getWorldMatrix().invertToRef(tm);
    //console.log("matrix", tm);
    BABYLON.Ray.TransformToRef(ray, tm, tr);
    //console.log("TEMP RAY", tr);
        
    let searchTree = (node) => {
        if (tr.intersectsBoxMinMax(node.minCorner, node.maxCorner, 0.0000001)) {
            if (node.idLeftChild < 0) { //leaf
                triIndices.push(Math.abs(node.idLeftChild + 1));
            }
            else {
                searchTree(bvhTree[node.idLeftChild]);
                searchTree(bvhTree[node.idRightChild]);
            }
        }
    }
    
    searchTree(bvhTree[0]);
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
        //box = BABYLON.MeshBuilder.CreateBox("", {size: 0.1}, scene);
        //box.position = v0.clone()
        //box.material = mat;
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