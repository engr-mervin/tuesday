function tableGenerator(num){
    return function(...args){
        return args.map(arg => num * arg);
    }
}

const tableTwoGenerator = tableGenerator(3);

console.log(tableTwoGenerator(1,2,3));

//[2,4,6,8,10]