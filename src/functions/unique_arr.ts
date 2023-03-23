export default function checkUnique(arr1: string[], arr2: string[]): boolean {
    let res = true;

    const hash: { [key: string]: number } = {};

    for (const str of arr1) {
        const key = str.toLocaleLowerCase();

        hash[key] = 1;
    }

    for (const str of arr2) {
        const key = str.toLocaleLowerCase();
        if (hash[key]) {
            res = false;
        }
    }

    return res;
}
