let morton3Split = (n) => {
    n &= 0x000003FF;                  // ten bits
    n = (n ^ (n << 16)) & 0x030000FF;
    n = (n ^ (n <<  8)) & 0x0300F00F;
    n = (n ^ (n <<  4)) & 0x030C30C3;
    n = (n ^ (n <<  2)) & 0x09249249;
    return n;
}

let mortonFromVec = (x, y, z) => {
    return morton3Split(x) | morton3Split(y) << 1 | morton3Split(z) << 2;
}

let extractInt = (n) => {
    n &= 0x09249249;    
    n = (n ^ (n >>  2)) & 0x030C30C3;
    n = (n ^ (n >>  4)) & 0x0300F00F;
    n = (n ^ (n >>  8)) & 0x030000FF;
    n = (n ^ (n >> 16)) & 0x000003FF;
    return n;
}

let extractToVec = (n) => {
    return {x: extractInt(n), y: extractInt(n >> 1), z: extractInt(n >>2)};
}

let readBitFromInt = (bitNb, i) => {  //n from 0 
    return (Math.pow(2, bitNb) & i) >> bitNb;
}

const mortonCodeFromCentroids = (centroids) => { //array of vector3s
    let temp = BABYLON.Vector3.Zero();
    const minValues = centroids.reduce((a, b) => {
        temp.x = Math.min(a.x, b.x);
        temp.y = Math.min(a.y, b.y);
        temp.z = Math.min(a.z, b.z);
        return temp;
    });
    temp = BABYLON.Vector3.Zero();
    const maxValues = centroids.reduce((a, b) => {
        temp.x = Math.max(a.x, b.x);
        temp.y = Math.max(a.y, b.y);
        temp.z = Math.max(a.z, b.z);
        return temp;
    });
    const multF = Math.pow(2, 10) - 1 ;
    const multX = multF / (maxValues.x - minValues.x);
    const multY = multF / (maxValues.y - minValues.y);
    const multZ = multF / (maxValues.z - minValues.z);
    let x = 0;
    let y = 0;
    let z = 0;
    let mortonCode = 0;
    // map to integers in range 0 to 2 ^ 10
    codes = centroids.map((vec, i) => {
        x = Math.round(multX * (vec.x - minValues.x));
        y = Math.round(multY * (vec.y - minValues.y));
        z = Math.round(multZ * (vec.z - minValues.z));
        mortonCode = mortonFromVec(x, y, z);
        return {code: mortonCode, index: i, mortonIndex: 0, depth: 0}
    })
    codes.sort((a, b) => {
        return a.code > b.code;
    })
    return codes;
}