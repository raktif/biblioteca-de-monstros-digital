// Equivalente ESM de fast-deep-equal usado pelos validadores standalone do Ajv.
export default function equal(left, right) {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (left.constructor !== right.constructor) return false;
  if (Array.isArray(left)) {
    if (left.length !== right.length) return false;
    for (let index = left.length - 1; index >= 0; index -= 1) if (!equal(left[index], right[index])) return false;
    return true;
  }
  if (left.constructor === RegExp) return left.source === right.source && left.flags === right.flags;
  if (left.valueOf !== Object.prototype.valueOf) return left.valueOf() === right.valueOf();
  if (left.toString !== Object.prototype.toString) return left.toString() === right.toString();
  const leftKeys = Object.keys(left);
  if (leftKeys.length !== Object.keys(right).length) return false;
  for (let index = leftKeys.length - 1; index >= 0; index -= 1) {
    const key = leftKeys[index];
    if (!Object.prototype.hasOwnProperty.call(right, key) || !equal(left[key], right[key])) return false;
  }
  return true;
}
