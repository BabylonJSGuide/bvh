let moreton3Split = (n) => {
    n &= 0x000003FF;                  // ten bits
    n = (n ^ (n << 16)) & 0x030000FF;
    n = (n ^ (n <<  8)) & 0x0300F00F;
    n = (n ^ (n <<  4)) & 0x030C30C3;
    n = (n ^ (n <<  2)) & 0x09249249;
    return n;
}

let mortonFromVec = (x, y, z) => {
    return moreton3Split(x) | moreton3Split(y) << 1 | moreton3Split(z) << 2;
}

let mortonFromVecString = (x, y, z) => {
    let m = moreton3Split(x) | moreton3Split(y) << 1 | moreton3Split(z) << 2;
    m = m.toString(2);
    const l =  m.length;
    if (l === 30) {
        return m
    }
    else if (l === 31) {
        return m.substring(1)
    }
    else if (l === 32) {
        return m.substring(2)
    }
    else { //must be less than 30
        return m.padStart(30, "0");
    }
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

let readBitFromInt = (n, m) => {  //n from 0 
    return (Math.pow(2, n) & m) >> n;
}