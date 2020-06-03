let getPosition = (num, place) => {
    return  Math.floor(Math.abs(num)/Math.pow(10,place)) % 10
   }

let radixSort = (arr) => {

    const max = 10; // length of the max number of digits for numbers in the array

    for (let i = 0; i < max; i++) {
        let buckets = Array.from({ length: 10 }, () => [ ])
        for (let j = 0; j < arr.length; j++) {
          buckets[getPosition(arr[ j ], i)].push(arr[ j ]); // pushing into buckets
        }
        arr = [ ].concat(...buckets);
    }
    return arr
}